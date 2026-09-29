/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * VM VIRA BTC — MARKET DATA PROVIDER SERVICE
 * Production-grade WebSocket service for Binance Market Data feeds (Spot & Futures).
 * 
 * Core Components:
 * 1. NormalizedMarketEvent data structure
 * 2. MarketDataProvider interface contract
 * 3. BinanceMarketDataProvider implementation:
 *    - Real-time multiplexed WebSocket stream management
 *    - Dynamic subscription / unsubscription
 *    - Strict Sequence Number Validation & Gap Detection
 *    - Order Book Snapshot synchronization & buffer management
 *    - Heartbeat watchdog & automatic exponential-backoff reconnect
 *    - Cross-exchange data normalization
 */

// ============================================================================
// 1. NORMALIZED DATA STRUCTURE
// ============================================================================

export type ExchangeId = "BINANCE" | "COINBASE" | "YAHOO" | "COINGECKO";
export type MarketType = "SPOT" | "FUTURES";

export type EventType =
  | "TICKER"
  | "TRADE"
  | "DEPTH"
  | "KLINE"
  | "BOOK_TICKER"
  | "FUNDING"
  | "OPEN_INTEREST"
  | "LIQUIDATION"
  | "STATUS"
  | "GAP_DETECTED";

export type MarketDataStatus =
  | "CONNECTED"
  | "CONNECTING"
  | "RECONNECTING"
  | "DISCONNECTED"
  | "STALE"
  | "ERROR";

export interface NormalizedMarketEvent {
  exchange: ExchangeId;
  symbol: string; // e.g. "BTCUSDT" or "BTC-USD"
  market_type: MarketType;
  event_type: EventType;
  exchange_timestamp: number;
  receive_timestamp: number;
  processing_timestamp?: number;
  sequence_number?: number;
  
  // Price / Ticker / Trade fields
  price?: number;
  quantity?: number;
  side?: "BUY" | "SELL";
  is_buyer_maker?: boolean;
  
  // Best Bid / Ask (BBO)
  bid?: number;
  ask?: number;
  bid_size?: number;
  ask_size?: number;
  
  // 24h Stats
  volume_24h?: number;
  quote_volume_24h?: number;
  change_24h?: number;
  change_24h_pct?: number;
  high_24h?: number;
  low_24h?: number;
  
  // Derivatives / Futures fields
  funding_rate?: number;
  annualized_funding_pct?: number;
  funding_time?: number;
  open_interest?: number;
  open_interest_usd?: number;
  mark_price?: number;
  index_price?: number;
  liquidation_side?: "BUY" | "SELL";
  liquidation_quantity?: number;
  liquidation_price?: number;
  
  // Raw payload preservation
  raw?: any;
}

export interface KlineData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  quoteVolume: number;
  trades: number;
  buyVolume: number;
  isComplete: boolean;
}

export interface DepthLevel {
  price: number;
  quantity: number;
}

export interface DepthSnapshot {
  lastUpdateId: number;
  bids: DepthLevel[];
  asks: DepthLevel[];
  timestamp: number;
}

export interface SequenceGapInfo {
  exchange: ExchangeId;
  symbol: string;
  streamType: string;
  expectedSequence: number;
  receivedSequence: number;
  gapSize: number;
  timestamp: number;
}

export interface SequenceMetrics {
  lastTradeId: number;
  lastOrderBookUpdateId: number;
  totalEventsProcessed: number;
  gapsDetectedCount: number;
  lastGapTimestamp: number | null;
  sequenceIntegrity: "VALID" | "GAP_DETECTED" | "INITIALIZING";
}

// ============================================================================
// 2. MARKET DATA PROVIDER INTERFACE
// ============================================================================

export interface MarketDataProvider {
  readonly name: ExchangeId;
  
  // Connection lifecycle
  connect(): void;
  disconnect(): void;
  getStatus(): MarketDataStatus;
  getSequenceMetrics(): SequenceMetrics;
  
  // Event callbacks
  onEvent(callback: (event: NormalizedMarketEvent) => void): void;
  onSequenceError(callback: (error: SequenceGapInfo) => void): void;
  
  // Subscriptions
  subscribe_ticker(symbol: string): void;
  subscribe_trades(symbol: string): void;
  subscribe_orderbook(symbol: string, depth?: number): void;
  subscribe_klines(symbol: string, interval?: string): void;
  subscribe_book_ticker(symbol: string): void;
  subscribe_derivatives?(symbol: string): void;
  
  // REST Query helpers
  get_historical_klines(symbol: string, interval: string, limit?: number): Promise<KlineData[]>;
  get_orderbook_snapshot(symbol: string, limit?: number): Promise<DepthSnapshot | null>;
  get_funding(symbol: string): Promise<{ fundingRate: number; markPrice: number; nextFundingTime: number } | null>;
  get_open_interest(symbol: string): Promise<{ openInterest: number; symbol: string; time: number } | null>;
  get_liquidations(symbol: string): Promise<any[]>;
}

// ============================================================================
// 3. BINANCE WEBSOCKET PROVIDER IMPLEMENTATION
// ============================================================================

export interface BinanceProviderOptions {
  symbol?: string; // Default: "BTCUSDT"
  enableFutures?: boolean; // Connect to fstream.binance.com for futures metrics
  heartbeatTimeoutMs?: number; // Default: 8000ms
  baseReconnectDelayMs?: number; // Default: 1000ms
  maxReconnectDelayMs?: number; // Default: 10000ms
  enableSequenceValidation?: boolean; // Default: true
}

export class BinanceMarketDataProvider implements MarketDataProvider {
  readonly name: ExchangeId = "BINANCE";

  private symbol: string;
  private enableFutures: boolean;
  private heartbeatTimeoutMs: number;
  private baseReconnectDelayMs: number;
  private maxReconnectDelayMs: number;
  private enableSequenceValidation: boolean;

  // WebSockets
  private spotWs: WebSocket | null = null;
  private futuresWs: WebSocket | null = null;
  
  // Connection State
  private status: MarketDataStatus = "DISCONNECTED";
  private isExplicitDisconnect = false;
  private reconnectAttempts = 0;
  private reconnectTimer: any = null;
  private heartbeatTimer: any = null;
  private lastMessageTimestamp = 0;

  // Active Subscriptions
  private subscriptions: Set<string> = new Set();
  
  // Callbacks
  private eventCallback: ((event: NormalizedMarketEvent) => void) | null = null;
  private sequenceErrorCallback: ((error: SequenceGapInfo) => void) | null = null;

  // Sequence Validation State
  private sequenceMetrics: SequenceMetrics = {
    lastTradeId: 0,
    lastOrderBookUpdateId: 0,
    totalEventsProcessed: 0,
    gapsDetectedCount: 0,
    lastGapTimestamp: null,
    sequenceIntegrity: "INITIALIZING"
  };

  // Order Book Snapshot Buffer
  private depthBuffer: any[] = [];
  private isDepthSnapshotSynced = false;
  private isFetchingSnapshot = false;

  constructor(options?: BinanceProviderOptions) {
    this.symbol = (options?.symbol || "BTCUSDT").toUpperCase();
    this.enableFutures = options?.enableFutures ?? true;
    this.heartbeatTimeoutMs = options?.heartbeatTimeoutMs || 8000;
    this.baseReconnectDelayMs = options?.baseReconnectDelayMs || 1000;
    this.maxReconnectDelayMs = options?.maxReconnectDelayMs || 10000;
    this.enableSequenceValidation = options?.enableSequenceValidation ?? true;

    // Default primary streams
    const symLower = this.symbol.toLowerCase();
    this.subscriptions.add(`${symLower}@ticker`);
    this.subscriptions.add(`${symLower}@trade`);
    this.subscriptions.add(`${symLower}@depth20@100ms`);
    this.subscriptions.add(`${symLower}@kline_1m`);
    this.subscriptions.add(`${symLower}@bookTicker`);
  }

  // --------------------------------------------------------------------------
  // CONNECTION LIFECYCLE
  // --------------------------------------------------------------------------

  connect(): void {
    this.isExplicitDisconnect = false;
    if (this.spotWs && (this.spotWs.readyState === WebSocket.OPEN || this.spotWs.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.setStatus(this.reconnectAttempts > 0 ? "RECONNECTING" : "CONNECTING");
    this.connectSpotStream();

    if (this.enableFutures) {
      this.connectFuturesStream();
    }
  }

  disconnect(): void {
    this.isExplicitDisconnect = true;
    this.stopHeartbeat();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.spotWs) {
      try {
        this.spotWs.close();
      } catch {}
      this.spotWs = null;
    }

    if (this.futuresWs) {
      try {
        this.futuresWs.close();
      } catch {}
      this.futuresWs = null;
    }

    this.setStatus("DISCONNECTED");
  }

  getStatus(): MarketDataStatus {
    return this.status;
  }

  getSequenceMetrics(): SequenceMetrics {
    return { ...this.sequenceMetrics };
  }

  onEvent(callback: (event: NormalizedMarketEvent) => void): void {
    this.eventCallback = callback;
  }

  onSequenceError(callback: (error: SequenceGapInfo) => void): void {
    this.sequenceErrorCallback = callback;
  }

  // --------------------------------------------------------------------------
  // SUBSCRIPTION MANAGEMENT
  // --------------------------------------------------------------------------

  subscribe_ticker(symbol: string = this.symbol): void {
    this.addSubscription(`${symbol.toLowerCase()}@ticker`);
  }

  subscribe_trades(symbol: string = this.symbol): void {
    this.addSubscription(`${symbol.toLowerCase()}@trade`);
  }

  subscribe_orderbook(symbol: string = this.symbol, depth: number = 20): void {
    this.addSubscription(`${symbol.toLowerCase()}@depth${depth}@100ms`);
  }

  subscribe_klines(symbol: string = this.symbol, interval: string = "1m"): void {
    this.addSubscription(`${symbol.toLowerCase()}@kline_${interval}`);
  }

  subscribe_book_ticker(symbol: string = this.symbol): void {
    this.addSubscription(`${symbol.toLowerCase()}@bookTicker`);
  }

  subscribe_derivatives(symbol: string = this.symbol): void {
    const sym = symbol.toLowerCase();
    this.addSubscription(`${sym}@markPrice@1s`, true);
    this.addSubscription(`${sym}@forceOrder`, true);
  }

  private addSubscription(streamName: string, isFutures: boolean = false): void {
    this.subscriptions.add(streamName);
    const targetWs = isFutures ? this.futuresWs : this.spotWs;
    if (targetWs && targetWs.readyState === WebSocket.OPEN) {
      const subMsg = {
        method: "SUBSCRIBE",
        params: [streamName],
        id: Date.now()
      };
      targetWs.send(JSON.stringify(subMsg));
    }
  }

  // --------------------------------------------------------------------------
  // SPOT WEBSOCKET STREAM
  // --------------------------------------------------------------------------

  private connectSpotStream(): void {
    try {
      const streamParams = Array.from(this.subscriptions)
        .filter((s) => !s.includes("@markPrice") && !s.includes("@forceOrder"))
        .join("/");
      
      const endpoint = `wss://data-stream.binance.vision/stream?streams=${streamParams}`;
      this.spotWs = new WebSocket(endpoint);

      this.spotWs.onopen = () => {
        this.setStatus("CONNECTED");
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        this.syncOrderBookSnapshot();
      };

      this.spotWs.onmessage = (msgEvent) => {
        const receiveTime = Date.now();
        this.lastMessageTimestamp = receiveTime;
        try {
          const payload = JSON.parse(msgEvent.data);
          this.handleSpotMessage(payload, receiveTime);
        } catch (e) {
          console.warn("[BinanceMarketDataProvider] JSON parse error:", e);
        }
      };

      this.spotWs.onerror = (err) => {
        console.warn("[BinanceMarketDataProvider] Spot WS Error:", err);
      };

      this.spotWs.onclose = () => {
        this.stopHeartbeat();
        if (!this.isExplicitDisconnect) {
          this.setStatus("RECONNECTING");
          this.scheduleReconnect();
        } else {
          this.setStatus("DISCONNECTED");
        }
      };
    } catch (e) {
      console.error("[BinanceMarketDataProvider] Spot connect error:", e);
      this.scheduleReconnect();
    }
  }

  // --------------------------------------------------------------------------
  // FUTURES WEBSOCKET STREAM (Derivatives, Mark Price, Liquidations)
  // --------------------------------------------------------------------------

  private connectFuturesStream(): void {
    try {
      const sym = this.symbol.toLowerCase();
      const endpoint = `wss://fstream.binance.com/stream?streams=${sym}@markPrice@1s/${sym}@forceOrder`;
      this.futuresWs = new WebSocket(endpoint);

      this.futuresWs.onopen = () => {
        // Futures connected
      };

      this.futuresWs.onmessage = (msgEvent) => {
        const receiveTime = Date.now();
        try {
          const payload = JSON.parse(msgEvent.data);
          this.handleFuturesMessage(payload, receiveTime);
        } catch (e) {}
      };

      this.futuresWs.onerror = () => {};
      this.futuresWs.onclose = () => {
        if (!this.isExplicitDisconnect && this.enableFutures) {
          setTimeout(() => this.connectFuturesStream(), 3000);
        }
      };
    } catch (e) {
      // Gracefully continue without futures if restricted
    }
  }

  // --------------------------------------------------------------------------
  // MESSAGE NORMALIZATION & DISPATCH
  // --------------------------------------------------------------------------

  private handleSpotMessage(payload: any, receiveTime: number): void {
    if (!this.eventCallback) return;

    const stream = payload.stream as string | undefined;
    const data = payload.data || payload;
    if (!data) return;

    this.sequenceMetrics.totalEventsProcessed++;

    // 1. 24h Ticker Stream
    if (stream?.includes("@ticker") || data.e === "24hrTicker") {
      const normEvent: NormalizedMarketEvent = {
        exchange: "BINANCE",
        symbol: data.s || this.symbol,
        market_type: "SPOT",
        event_type: "TICKER",
        exchange_timestamp: data.E || Date.now(),
        receive_timestamp: receiveTime,
        processing_timestamp: Date.now(),
        price: parseFloat(data.c),
        quantity: parseFloat(data.v),
        change_24h: parseFloat(data.p),
        change_24h_pct: parseFloat(data.P),
        high_24h: parseFloat(data.h),
        low_24h: parseFloat(data.l),
        volume_24h: parseFloat(data.v),
        quote_volume_24h: parseFloat(data.q),
        bid: parseFloat(data.b),
        bid_size: parseFloat(data.B),
        ask: parseFloat(data.a),
        ask_size: parseFloat(data.A),
        raw: data
      };
      this.eventCallback(normEvent);
      return;
    }

    // 2. Individual Trade Stream with Sequence Tracking
    if (stream?.includes("@trade") || data.e === "trade") {
      const tradeId = data.t;
      if (this.enableSequenceValidation && tradeId) {
        this.validateTradeSequence(tradeId, data.E);
      }

      const normEvent: NormalizedMarketEvent = {
        exchange: "BINANCE",
        symbol: data.s || this.symbol,
        market_type: "SPOT",
        event_type: "TRADE",
        exchange_timestamp: data.T || data.E || Date.now(),
        receive_timestamp: receiveTime,
        processing_timestamp: Date.now(),
        sequence_number: tradeId,
        price: parseFloat(data.p),
        quantity: parseFloat(data.q),
        side: data.m ? "SELL" : "BUY", // isBuyerMaker: true => Taker Sell, false => Taker Buy
        is_buyer_maker: !!data.m,
        raw: data
      };
      this.eventCallback(normEvent);
      return;
    }

    // 3. Order Book Depth Stream with Sequence Validation
    if (stream?.includes("@depth") || data.e === "depthUpdate" || (data.bids && data.asks)) {
      const updateId = data.u || data.lastUpdateId;
      const firstUpdateId = data.U;

      if (this.enableSequenceValidation && updateId) {
        this.validateOrderBookSequence(updateId, firstUpdateId);
      }

      const normEvent: NormalizedMarketEvent = {
        exchange: "BINANCE",
        symbol: data.s || this.symbol,
        market_type: "SPOT",
        event_type: "DEPTH",
        exchange_timestamp: data.E || Date.now(),
        receive_timestamp: receiveTime,
        processing_timestamp: Date.now(),
        sequence_number: updateId,
        raw: data
      };
      this.eventCallback(normEvent);
      return;
    }

    // 4. Kline / Candlestick Stream
    if (stream?.includes("@kline") || data.e === "kline") {
      const k = data.k;
      if (k) {
        const normEvent: NormalizedMarketEvent = {
          exchange: "BINANCE",
          symbol: data.s || this.symbol,
          market_type: "SPOT",
          event_type: "KLINE",
          exchange_timestamp: k.T || data.E || Date.now(),
          receive_timestamp: receiveTime,
          processing_timestamp: Date.now(),
          price: parseFloat(k.c),
          quantity: parseFloat(k.v),
          raw: k
        };
        this.eventCallback(normEvent);
        return;
      }
    }

    // 5. Best Order Book Ticker (BBO)
    if (stream?.includes("@bookTicker") || (data.u && data.b && data.a)) {
      const normEvent: NormalizedMarketEvent = {
        exchange: "BINANCE",
        symbol: data.s || this.symbol,
        market_type: "SPOT",
        event_type: "BOOK_TICKER",
        exchange_timestamp: Date.now(),
        receive_timestamp: receiveTime,
        processing_timestamp: Date.now(),
        sequence_number: data.u,
        bid: parseFloat(data.b),
        bid_size: parseFloat(data.B),
        ask: parseFloat(data.a),
        ask_size: parseFloat(data.A),
        raw: data
      };
      this.eventCallback(normEvent);
      return;
    }
  }

  private handleFuturesMessage(payload: any, receiveTime: number): void {
    if (!this.eventCallback) return;
    const stream = payload.stream as string | undefined;
    const data = payload.data || payload;
    if (!data) return;

    // Mark Price & Funding Rate Stream
    if (stream?.includes("@markPrice") || data.e === "markPriceUpdate") {
      const fundingRate = parseFloat(data.r || "0");
      const normEvent: NormalizedMarketEvent = {
        exchange: "BINANCE",
        symbol: data.s || this.symbol,
        market_type: "FUTURES",
        event_type: "FUNDING",
        exchange_timestamp: data.E || Date.now(),
        receive_timestamp: receiveTime,
        processing_timestamp: Date.now(),
        funding_rate: fundingRate,
        annualized_funding_pct: parseFloat((fundingRate * 3 * 365 * 100).toFixed(2)),
        funding_time: data.T || 0,
        mark_price: parseFloat(data.p || "0"),
        index_price: parseFloat(data.i || "0"),
        raw: data
      };
      this.eventCallback(normEvent);
      return;
    }

    // Forced Order / Liquidation Stream
    if (stream?.includes("@forceOrder") || data.e === "forceOrder") {
      const o = data.o;
      if (o) {
        const normEvent: NormalizedMarketEvent = {
          exchange: "BINANCE",
          symbol: o.s || this.symbol,
          market_type: "FUTURES",
          event_type: "LIQUIDATION",
          exchange_timestamp: data.E || Date.now(),
          receive_timestamp: receiveTime,
          processing_timestamp: Date.now(),
          liquidation_side: o.S === "BUY" ? "BUY" : "SELL",
          liquidation_quantity: parseFloat(o.q || "0"),
          liquidation_price: parseFloat(o.p || "0"),
          price: parseFloat(o.ap || o.p || "0"),
          raw: o
        };
        this.eventCallback(normEvent);
      }
    }
  }

  // --------------------------------------------------------------------------
  // SEQUENCE VALIDATION & GAP DETECTION ENGINE
  // --------------------------------------------------------------------------

  private validateTradeSequence(tradeId: number, timestamp: number): void {
    const lastId = this.sequenceMetrics.lastTradeId;
    if (lastId > 0 && tradeId > lastId + 1) {
      const gap = tradeId - (lastId + 1);
      this.sequenceMetrics.gapsDetectedCount++;
      this.sequenceMetrics.lastGapTimestamp = Date.now();
      this.sequenceMetrics.sequenceIntegrity = "GAP_DETECTED";

      const gapInfo: SequenceGapInfo = {
        exchange: "BINANCE",
        symbol: this.symbol,
        streamType: "TRADE",
        expectedSequence: lastId + 1,
        receivedSequence: tradeId,
        gapSize: gap,
        timestamp: timestamp || Date.now()
      };

      if (this.sequenceErrorCallback) {
        this.sequenceErrorCallback(gapInfo);
      }

      if (this.eventCallback) {
        this.eventCallback({
          exchange: "BINANCE",
          symbol: this.symbol,
          market_type: "SPOT",
          event_type: "GAP_DETECTED",
          exchange_timestamp: timestamp || Date.now(),
          receive_timestamp: Date.now(),
          sequence_number: tradeId,
          raw: gapInfo
        });
      }
    } else {
      if (this.sequenceMetrics.sequenceIntegrity === "INITIALIZING") {
        this.sequenceMetrics.sequenceIntegrity = "VALID";
      }
    }
    this.sequenceMetrics.lastTradeId = tradeId;
  }

  private validateOrderBookSequence(updateId: number, firstUpdateId?: number): void {
    const lastId = this.sequenceMetrics.lastOrderBookUpdateId;
    if (lastId > 0 && firstUpdateId && firstUpdateId > lastId + 1) {
      const gap = firstUpdateId - (lastId + 1);
      this.sequenceMetrics.gapsDetectedCount++;
      this.sequenceMetrics.lastGapTimestamp = Date.now();
      this.sequenceMetrics.sequenceIntegrity = "GAP_DETECTED";

      const gapInfo: SequenceGapInfo = {
        exchange: "BINANCE",
        symbol: this.symbol,
        streamType: "DEPTH",
        expectedSequence: lastId + 1,
        receivedSequence: firstUpdateId,
        gapSize: gap,
        timestamp: Date.now()
      };

      if (this.sequenceErrorCallback) {
        this.sequenceErrorCallback(gapInfo);
      }

      // Re-synchronize snapshot upon depth sequence gap
      this.syncOrderBookSnapshot();
    }
    this.sequenceMetrics.lastOrderBookUpdateId = updateId;
  }

  // --------------------------------------------------------------------------
  // ORDER BOOK SNAPSHOT RECOVERY & REST API
  // --------------------------------------------------------------------------

  private async syncOrderBookSnapshot(): Promise<void> {
    if (this.isFetchingSnapshot) return;
    this.isFetchingSnapshot = true;

    try {
      const snapshot = await this.get_orderbook_snapshot(this.symbol, 50);
      if (snapshot && this.eventCallback) {
        this.sequenceMetrics.lastOrderBookUpdateId = snapshot.lastUpdateId;
        this.sequenceMetrics.sequenceIntegrity = "VALID";
        this.isDepthSnapshotSynced = true;

        this.eventCallback({
          exchange: "BINANCE",
          symbol: this.symbol,
          market_type: "SPOT",
          event_type: "DEPTH",
          exchange_timestamp: snapshot.timestamp,
          receive_timestamp: Date.now(),
          sequence_number: snapshot.lastUpdateId,
          raw: {
            lastUpdateId: snapshot.lastUpdateId,
            bids: snapshot.bids.map((b) => [b.price.toString(), b.quantity.toString()]),
            asks: snapshot.asks.map((a) => [a.price.toString(), a.quantity.toString()]),
            isSnapshot: true
          }
        });
      }
    } catch (err) {
      console.warn("[BinanceMarketDataProvider] Order book snapshot sync warning:", err);
    } finally {
      this.isFetchingSnapshot = false;
    }
  }

  async get_orderbook_snapshot(symbol: string = this.symbol, limit: number = 50): Promise<DepthSnapshot | null> {
    try {
      const res = await fetch(`https://api.binance.com/api/v3/depth?symbol=${symbol.toUpperCase()}&limit=${limit}`);
      if (!res.ok) return null;
      const data = await res.json();

      return {
        lastUpdateId: data.lastUpdateId,
        bids: (data.bids || []).map((b: any[]) => ({ price: parseFloat(b[0]), quantity: parseFloat(b[1]) })),
        asks: (data.asks || []).map((a: any[]) => ({ price: parseFloat(a[0]), quantity: parseFloat(a[1]) })),
        timestamp: Date.now()
      };
    } catch (e) {
      return null;
    }
  }

  async get_historical_klines(symbol: string = this.symbol, interval: string = "1m", limit: number = 100): Promise<KlineData[]> {
    try {
      const res = await fetch(
        `https://api.binance.com/api/v3/klines?symbol=${symbol.toUpperCase()}&interval=${interval}&limit=${limit}`
      );
      if (!res.ok) return [];
      const data = await res.json();

      return data.map((k: any[]) => ({
        time: k[0],
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[5]),
        quoteVolume: parseFloat(k[7]),
        trades: k[8],
        buyVolume: parseFloat(k[9]),
        isComplete: true
      }));
    } catch {
      return [];
    }
  }

  async get_funding(symbol: string = this.symbol): Promise<{ fundingRate: number; markPrice: number; nextFundingTime: number } | null> {
    try {
      const res = await fetch(`https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${symbol.toUpperCase()}`);
      if (!res.ok) return null;
      const data = await res.json();

      return {
        fundingRate: parseFloat(data.lastFundingRate || "0"),
        markPrice: parseFloat(data.markPrice || "0"),
        nextFundingTime: data.nextFundingTime || 0
      };
    } catch {
      return null;
    }
  }

  async get_open_interest(symbol: string = this.symbol): Promise<{ openInterest: number; symbol: string; time: number } | null> {
    try {
      const res = await fetch(`https://fapi.binance.com/fapi/v1/openInterest?symbol=${symbol.toUpperCase()}`);
      if (!res.ok) return null;
      const data = await res.json();

      return {
        openInterest: parseFloat(data.openInterest || "0"),
        symbol: data.symbol,
        time: data.time || Date.now()
      };
    } catch {
      return null;
    }
  }

  async get_liquidations(symbol: string = this.symbol): Promise<any[]> {
    try {
      const res = await fetch(`https://fapi.binance.com/fapi/v1/allForceOrders?symbol=${symbol.toUpperCase()}&limit=20`);
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  }

  // --------------------------------------------------------------------------
  // HEARTBEAT & RECONNECT WATCHDOG
  // --------------------------------------------------------------------------

  private setStatus(newStatus: MarketDataStatus): void {
    if (this.status === newStatus) return;
    this.status = newStatus;
    if (this.eventCallback) {
      this.eventCallback({
        exchange: "BINANCE",
        symbol: this.symbol,
        market_type: "SPOT",
        event_type: "STATUS",
        exchange_timestamp: Date.now(),
        receive_timestamp: Date.now(),
        raw: { status: newStatus }
      });
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.spotWs && this.spotWs.readyState === WebSocket.OPEN) {
        const now = Date.now();
        if (now - this.lastMessageTimestamp > this.heartbeatTimeoutMs) {
          console.warn("[BinanceMarketDataProvider] Heartbeat timeout. Tearing down stale socket.");
          try {
            this.spotWs.close();
          } catch {}
        }
      }
    }, Math.floor(this.heartbeatTimeoutMs / 2));
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer || this.isExplicitDisconnect) return;
    this.reconnectAttempts++;

    // Exponential backoff with random jitter: delay = min(base * 1.5^n + jitter, max)
    const jitter = Math.floor(Math.random() * 500);
    const delay = Math.min(
      this.baseReconnectDelayMs * Math.pow(1.5, Math.min(this.reconnectAttempts, 8)) + jitter,
      this.maxReconnectDelayMs
    );

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.isExplicitDisconnect) {
        this.connect();
      }
    }, delay);
  }
}
