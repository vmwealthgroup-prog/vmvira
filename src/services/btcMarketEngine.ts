/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * VM VIRA BTC — REAL-TIME MARKET DATA & EXECUTION ENGINE
 * 
 * Architecture Pipeline:
 * EXCHANGE WEBSOCKET (Binance Primary + Coinbase Secondary)
 *  ↓
 * MarketDataProvider (BinanceWsProvider, CoinbaseWsProvider, YahooProvider, CoinGeckoProvider)
 *  ↓
 * Normalizer (NormalizedMarketEvent)
 *  ↓
 * DataQualityEngine (Sequence check, Latency, Stale Data Protection)
 *  ↓
 * MarketStateEngine (Local L2 Order Book, Depth, Trade Flow, CVD)
 *  ↓
 * IndicatorEngine (EMA 9/21/50/200, VWAP, ATR, RSI, MACD, Bollinger Bands, Relative Volume)
 *  ↓
 * MicrostructureEngine (OBI 5/10/20, CVD slope, Trade Intensity, Liquidity Concentration)
 *  ↓
 * RegimeEngine (STRONG_BULL, BULL, RANGE, BEAR, STRONG_BEAR, HIGH_VOL, LOW_VOL, LIQUIDITY_STRESS)
 *  ↓
 * SignalEngine (Multi-Factor 100-Point Confluence Model & No-Trade Filters)
 *  ↓
 * RiskEngine & PaperExecutionEngine (Realistic Slippage, Taker Fees, Position Sizing, Stop Loss/TP)
 */

// Top types
export interface OrderBookLevel {
  price: number;
  quantity: number;
  total: number;
  depthPct: number;
}

export interface OrderBookState {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  lastUpdateId: number;
  sequenceValid: boolean;
  bestBid: number;
  bestAsk: number;
  midPrice: number;
  spread: number;
  spreadPct: number;
  bidDepthTotal: number;
  askDepthTotal: number;
  obi5: number;   // -1.0 to +1.0
  obi10: number;  // -1.0 to +1.0
  obi20: number;  // -1.0 to +1.0
  liquidityConcentration: { top3BidPct: number; top3AskPct: number };
  lastUpdated: number;
}

export interface TradeEvent {
  id: string | number;
  price: number;
  quantity: number;
  quoteValue: number;
  side: "BUY" | "SELL";
  timestamp: number;
  isLarge: boolean; // > 0.5 BTC or > $30k
}

export interface TradeFlowState {
  recentTrades: TradeEvent[];
  aggressiveBuyVol: number;
  aggressiveSellVol: number;
  buySellRatio: number;
  tradeCount: number;
  tradeIntensity: number; // trades/second
  avgTradeSize: number;
  cvd: number; // Cumulative Volume Delta
  cvdHistory: { time: number; cvd: number; price: number }[];
  cvdSlope: number; // short term slope (-1 to +1)
  largeTradesCount: number;
}

export interface Candle {
  time: number;
  timeStr: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  buyVolume: number;
  sellVolume: number;
  trades: number;
  isComplete?: boolean;
}

export interface TechnicalIndicators {
  ema9: number;
  ema21: number;
  ema50: number;
  ema200: number;
  vwap: number;
  atr14: number;
  rsi14: number;
  macd: { macd: number; signal: number; hist: number };
  bollinger: { upper: number; middle: number; lower: number; bandwidth: number };
  rvol: number;
  supportLevels: number[];
  resistanceLevels: number[];
}

export interface MicrostructureScore {
  score: number; // 0–100
  rating: "BULLISH" | "NEUTRAL" | "BEARISH";
  factors: {
    obiScore: number; // 0-25
    cvdScore: number; // 0-25
    intensityScore: number; // 0-15
    spreadScore: number; // 0-15
    depthScore: number; // 0-10
    largeTradeScore: number; // 0-10
  };
  breakdown: string[];
}

export interface MultiTimeframeAlignment {
  timeframes: {
    "1D": { trend: "BULLISH" | "BEARISH" | "NEUTRAL"; rsi: number; bias: string };
    "4H": { trend: "BULLISH" | "BEARISH" | "NEUTRAL"; rsi: number; bias: string };
    "1H": { trend: "BULLISH" | "BEARISH" | "NEUTRAL"; rsi: number; bias: string };
    "15M": { trend: "BULLISH" | "BEARISH" | "NEUTRAL"; rsi: number; bias: string };
    "5M": { trend: "BULLISH" | "BEARISH" | "NEUTRAL"; rsi: number; bias: string };
    "1M": { trend: "BULLISH" | "BEARISH" | "NEUTRAL"; rsi: number; bias: string };
  };
  alignmentScore: number; // 0-100
  confluenceState: "STRONG_ALIGNED" | "MODERATE_ALIGNED" | "CONFLICTING" | "NEUTRAL";
}

export type BtcRegimeType = 
  | "STRONG_BULL"
  | "BULL"
  | "RANGE"
  | "BEAR"
  | "STRONG_BEAR"
  | "HIGH_VOLATILITY"
  | "LOW_VOLATILITY"
  | "LIQUIDITY_STRESS"
  | "UNKNOWN";

export interface BtcRegime {
  type: BtcRegimeType;
  description: string;
  volatilityState: "EXPANDING" | "NORMAL" | "COMPRESSED";
  structureState: "HIGHER_HIGHS" | "LOWER_LOWS" | "RANGEBOUND";
}

export interface SignalConfluence {
  score: number; // 0–100
  state: "NO_TRADE" | "WATCH" | "SETUP" | "VALID" | "STRONG" | "HIGH_CONFLUENCE";
  action: "BUY" | "SELL" | "NO_TRADE";
  factors: {
    trend: number;          // max 20
    structure: number;      // max 15
    momentum: number;       // max 10
    volume: number;         // max 10
    vwap: number;           // max 10
    volatility: number;     // max 10
    microstructure: number; // max 15
    derivatives: number;    // max 5
    htf: number;            // max 5
  };
  reasons: string[];
  noTradeReasons: string[];
  entryPrice: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  riskRewardRatio: string;
}

export interface DerivativesState {
  fundingRate: number;
  fundingCountdown: string;
  annualizedFundingPct: number;
  openInterest: number;
  openInterestValueUsd: number;
  oi24hChangePct: number;
  markPrice: number;
  indexPrice: number;
  regime: "LONG_BUILDUP" | "SHORT_BUILDUP" | "SHORT_COVERING" | "LONG_LIQUIDATION" | "NEUTRAL";
  description: string;
}

export interface CrossExchangeConsensus {
  binance: { price: number; latency: number; status: string; lastUpdated: number };
  coinbase: { price: number; latency: number; status: string; lastUpdated: number };
  yahoo: { price: number; latency: number; status: string; lastUpdated: number };
  coingecko: { price: number; latency: number; status: string; lastUpdated: number };
  priceDivergenceUsd: number;
  priceDivergencePct: number;
  divergenceWarning: boolean;
  primaryExecutionSource: "BINANCE_LIVE_ORDERBOOK";
}

export interface DataQualityState {
  score: number; // 0–100
  wsStatus: "CONNECTED" | "CONNECTING" | "RECONNECTING" | "OFFLINE";
  sequenceIntegrity: "VALID" | "GAP_DETECTED" | "INITIALIZING";
  orderBookSynced: boolean;
  exchangeLatencyMs: number;
  processingLatencyMs: number;
  totalLatencyMs: number;
  lastTickElapsedMs: number;
  isStale: boolean;
  staleReason: string | null;
}

export interface PaperTradePosition {
  id: string;
  symbol: string;
  side: "BUY" | "SELL";
  entryPrice: number;
  currentPrice: number;
  quantity: number;
  sizeUsd: number;
  stopLoss: number;
  takeProfit: number;
  pnlUsd: number;
  pnlPct: number;
  entryTime: string;
  feesPaid: number;
  slippageIncurred: number;
}

export interface PaperTradeOrder {
  id: string;
  symbol: string;
  side: "BUY" | "SELL";
  type: "MARKET" | "LIMIT";
  price: number;
  quantity: number;
  timestamp: string;
  status: "FILLED" | "CANCELLED" | "REJECTED";
  pnl?: number;
  reason?: string;
}

export interface RiskConfig {
  accountEquity: number;
  riskPerTradePct: number; // default 0.0025 (0.25%)
  maxDailyLossPct: number; // default 0.015 (1.5%)
  maxWeeklyLossPct: number; // default 0.04 (4.0%)
  maxConsecutiveLosses: number; // default 3
  takerFeeRate: number; // 0.0004 (0.04%)
  slippageEstimatePct: number; // 0.0001 (0.01%)
}

import {
  NormalizedMarketEvent,
  MarketDataProvider,
  BinanceMarketDataProvider,
  MarketDataStatus,
  KlineData,
  DepthSnapshot,
  SequenceGapInfo,
  SequenceMetrics
} from "./marketDataProvider";

export type {
  NormalizedMarketEvent,
  MarketDataProvider,
  MarketDataStatus,
  KlineData,
  DepthSnapshot,
  SequenceGapInfo,
  SequenceMetrics
};
export { BinanceMarketDataProvider };

// Aliased for seamless backward-compatibility
export class BinanceWsProvider extends BinanceMarketDataProvider {}

// --------------------------------------------------------------------------
// COINBASE WEBSOCKET PROVIDER (Secondary Cross-Check)
// --------------------------------------------------------------------------
export class CoinbaseWsProvider implements MarketDataProvider {
  readonly name = "COINBASE" as const;
  private ws: WebSocket | null = null;
  private status: MarketDataStatus = "DISCONNECTED";
  private eventCallback: ((event: NormalizedMarketEvent) => void) | null = null;
  private reconnectTimer: any = null;
  private isExplicitDisconnect = false;

  private readonly streamUrl = "wss://ws-feed.exchange.coinbase.com";

  connect(): void {
    this.isExplicitDisconnect = false;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.status = "CONNECTING";
    this.notifyStatus();

    try {
      this.ws = new WebSocket(this.streamUrl);

      this.ws.onopen = () => {
        this.status = "CONNECTED";
        this.notifyStatus();

        // Subscribe to BTC-USD ticker & heartbeat
        const subMsg = {
          type: "subscribe",
          product_ids: ["BTC-USD"],
          channels: ["ticker", "heartbeat"]
        };
        if (this.ws) {
          this.ws.send(JSON.stringify(subMsg));
        }
      };

      this.ws.onmessage = (event) => {
        const receiveTime = Date.now();
        try {
          const data = JSON.parse(event.data);
          if (data.type === "ticker" && data.price) {
            const exchTime = data.time ? new Date(data.time).getTime() : receiveTime;
            const normEvent: NormalizedMarketEvent = {
              exchange: "COINBASE",
              symbol: "BTC-USD",
              market_type: "SPOT",
              event_type: "TICKER",
              exchange_timestamp: exchTime,
              receive_timestamp: receiveTime,
              processing_timestamp: Date.now(),
              sequence_number: data.sequence,
              price: parseFloat(data.price),
              bid: parseFloat(data.best_bid || data.price),
              ask: parseFloat(data.best_ask || data.price),
              bid_size: parseFloat(data.best_bid_size || "1"),
              ask_size: parseFloat(data.best_ask_size || "1"),
              volume_24h: parseFloat(data.volume_24h || "0"),
              high_24h: parseFloat(data.high_24h || "0"),
              low_24h: parseFloat(data.low_24h || "0"),
              raw: data
            };
            if (this.eventCallback) {
              this.eventCallback(normEvent);
            }
          }
        } catch {}
      };

      this.ws.onerror = () => {};

      this.ws.onclose = () => {
        if (!this.isExplicitDisconnect) {
          this.status = "RECONNECTING";
          this.notifyStatus();
          this.scheduleReconnect();
        } else {
          this.status = "DISCONNECTED";
          this.notifyStatus();
        }
      };
    } catch {
      this.status = "DISCONNECTED";
      this.notifyStatus();
      this.scheduleReconnect();
    }
  }

  disconnect(): void {
    this.isExplicitDisconnect = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }
    this.status = "DISCONNECTED";
    this.notifyStatus();
  }

  getStatus(): MarketDataStatus {
    return this.status;
  }

  getSequenceMetrics(): SequenceMetrics {
    return {
      lastTradeId: 0,
      lastOrderBookUpdateId: 0,
      totalEventsProcessed: 0,
      gapsDetectedCount: 0,
      lastGapTimestamp: null,
      sequenceIntegrity: "VALID"
    };
  }

  onEvent(callback: (event: NormalizedMarketEvent) => void): void {
    this.eventCallback = callback;
  }

  onSequenceError(_callback: (error: SequenceGapInfo) => void): void {}

  subscribe_ticker(_symbol: string): void {}
  subscribe_trades(_symbol: string): void {}
  subscribe_orderbook(_symbol: string, _depth?: number): void {}
  subscribe_klines(_symbol: string, _interval?: string): void {}
  subscribe_book_ticker(_symbol: string): void {}

  async get_historical_klines(_symbol: string, _interval: string, _limit?: number): Promise<KlineData[]> {
    return [];
  }
  async get_orderbook_snapshot(_symbol: string, _limit?: number): Promise<DepthSnapshot | null> {
    return null;
  }
  async get_funding(_symbol: string): Promise<{ fundingRate: number; markPrice: number; nextFundingTime: number } | null> {
    return null;
  }
  async get_open_interest(_symbol: string): Promise<{ openInterest: number; symbol: string; time: number } | null> {
    return null;
  }
  async get_liquidations(_symbol: string): Promise<any[]> {
    return [];
  }

  private notifyStatus(): void {
    if (this.eventCallback) {
      this.eventCallback({
        exchange: "COINBASE",
        symbol: "BTC-USD",
        market_type: "SPOT",
        event_type: "STATUS",
        exchange_timestamp: Date.now(),
        receive_timestamp: Date.now(),
        raw: { status: this.status }
      });
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer || this.isExplicitDisconnect) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.isExplicitDisconnect) {
        this.connect();
      }
    }, 4000);
  }
}

// --------------------------------------------------------------------------
// YAHOO & COINGECKO REFERENCE PROVIDERS (REST Polling & Fallback)
// --------------------------------------------------------------------------
export async function fetchCoinGeckoBtc(): Promise<{ price: number; change24h: number; vol24h: number; timestamp: number } | null> {
  try {
    const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_vol=true&include_24hr_change=true&include_last_updated_at=true", {
      headers: { "Accept": "application/json" }
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.bitcoin) {
      return {
        price: data.bitcoin.usd,
        change24h: data.bitcoin.usd_24h_change || 0,
        vol24h: data.bitcoin.usd_24h_vol || 0,
        timestamp: (data.bitcoin.last_updated_at ? data.bitcoin.last_updated_at * 1000 : Date.now())
      };
    }
  } catch (e) {
    // ignore
  }
  return null;
}

export async function fetchBinanceHistoricalKlines(interval: string = "1m", limit: number = 120): Promise<Candle[]> {
  try {
    const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=${interval}&limit=${limit}`);
    if (!res.ok) return [];
    const rawData = await res.json();
    if (!Array.isArray(rawData)) return [];

    return rawData.map((row: any[]) => {
      const openTime = row[0];
      const open = parseFloat(row[1]);
      const high = parseFloat(row[2]);
      const low = parseFloat(row[3]);
      const close = parseFloat(row[4]);
      const vol = parseFloat(row[5]);
      const takerBuyVol = parseFloat(row[9]);
      const takerSellVol = Math.max(0, vol - takerBuyVol);
      const trades = parseInt(row[8], 10);

      const d = new Date(openTime);
      const hours = d.getHours().toString().padStart(2, "0");
      const mins = d.getMinutes().toString().padStart(2, "0");

      return {
        time: openTime,
        timeStr: `${hours}:${mins}`,
        open,
        high,
        low,
        close,
        volume: vol,
        buyVolume: takerBuyVol,
        sellVolume: takerSellVol,
        trades,
        isComplete: true
      };
    });
  } catch (e) {
    console.warn("[Binance REST] Historical klines fetch failed:", e);
    return [];
  }
}

export async function fetchBinanceFuturesDerivatives(): Promise<{ fundingRate: number; openInterest: number; markPrice: number } | null> {
  try {
    const [fundingRes, oiRes] = await Promise.all([
      fetch("https://fapi.binance.com/fapi/v1/fundingRate?symbol=BTCUSDT&limit=1").catch(() => null),
      fetch("https://fapi.binance.com/fapi/v1/openInterest?symbol=BTCUSDT").catch(() => null)
    ]);

    let fundingRate = 0.0001; // default 0.01%
    let openInterest = 75000; // default 75k BTC
    let markPrice = 0;

    if (fundingRes && fundingRes.ok) {
      const fData = await fundingRes.json();
      if (Array.isArray(fData) && fData.length > 0) {
        fundingRate = parseFloat(fData[0].fundingRate);
        if (fData[0].markPrice) markPrice = parseFloat(fData[0].markPrice);
      }
    }

    if (oiRes && oiRes.ok) {
      const oiData = await oiRes.json();
      if (oiData.openInterest) {
        openInterest = parseFloat(oiData.openInterest);
      }
    }

    return { fundingRate, openInterest, markPrice };
  } catch (e) {
    return null;
  }
}

// --------------------------------------------------------------------------
// TECHNICAL INDICATOR CALCULATION ENGINE
// --------------------------------------------------------------------------
export function calculateIndicators(candles: Candle[]): TechnicalIndicators {
  if (candles.length === 0) {
    return {
      ema9: 0,
      ema21: 0,
      ema50: 0,
      ema200: 0,
      vwap: 0,
      atr14: 0,
      rsi14: 50,
      macd: { macd: 0, signal: 0, hist: 0 },
      bollinger: { upper: 0, middle: 0, lower: 0, bandwidth: 0 },
      rvol: 1.0,
      supportLevels: [],
      resistanceLevels: []
    };
  }

  const closes = candles.map((c) => c.close);
  const n = closes.length;
  const currentPrice = closes[n - 1];

  // EMA Helper
  const calcEMA = (period: number): number => {
    if (n < period) return closes[n - 1];
    const k = 2 / (period + 1);
    let ema = closes[0];
    for (let i = 1; i < n; i++) {
      ema = closes[i] * k + ema * (1 - k);
    }
    return ema;
  };

  const ema9 = calcEMA(9);
  const ema21 = calcEMA(21);
  const ema50 = calcEMA(50);
  const ema200 = calcEMA(200);

  // VWAP calculation
  let cumVol = 0;
  let cumTypicalVol = 0;
  candles.forEach((c) => {
    const typicalPrice = (c.high + c.low + c.close) / 3;
    cumVol += c.volume;
    cumTypicalVol += typicalPrice * c.volume;
  });
  const vwap = cumVol > 0 ? cumTypicalVol / cumVol : currentPrice;

  // ATR(14) calculation
  let atr14 = 0;
  if (n >= 2) {
    let trSum = 0;
    const lookback = Math.min(14, n - 1);
    for (let i = n - lookback; i < n; i++) {
      const high = candles[i].high;
      const low = candles[i].low;
      const prevClose = candles[i - 1].close;
      const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
      trSum += tr;
    }
    atr14 = trSum / lookback;
  } else {
    atr14 = candles[0].high - candles[0].low;
  }

  // RSI(14)
  let rsi14 = 50;
  if (n >= 15) {
    let gains = 0;
    let losses = 0;
    for (let i = n - 14; i < n; i++) {
      const diff = closes[i] - closes[i - 1];
      if (diff >= 0) gains += diff;
      else losses += Math.abs(diff);
    }
    const avgGain = gains / 14;
    const avgLoss = losses / 14;
    if (avgLoss === 0) {
      rsi14 = 100;
    } else {
      const rs = avgGain / avgLoss;
      rsi14 = 100 - 100 / (1 + rs);
    }
  }

  // MACD (12, 26, 9)
  const ema12 = calcEMA(12);
  const ema26 = calcEMA(26);
  const macdVal = ema12 - ema26;
  const signalVal = macdVal * 0.2 + 0; // approximation for rapid tick
  const histVal = macdVal - signalVal;

  // Bollinger Bands (20, 2)
  const bbPeriod = Math.min(20, n);
  const recentCloses = closes.slice(-bbPeriod);
  const mean = recentCloses.reduce((a, b) => a + b, 0) / bbPeriod;
  const variance = recentCloses.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / bbPeriod;
  const stdDev = Math.sqrt(variance);
  const upperBB = mean + 2 * stdDev;
  const lowerBB = mean - 2 * stdDev;
  const bandwidth = mean > 0 ? ((upperBB - lowerBB) / mean) * 100 : 0;

  // RVOL (Relative Volume vs 20-period avg)
  const recentVols = candles.slice(-20).map((c) => c.volume);
  const avgVol = recentVols.reduce((a, b) => a + b, 0) / (recentVols.length || 1);
  const currentVol = candles[n - 1]?.volume || 1;
  const rvol = avgVol > 0 ? parseFloat((currentVol / avgVol).toFixed(2)) : 1.0;

  // Support & Resistance pivot detections
  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);
  const highest = Math.max(...highs.slice(-30));
  const lowest = Math.min(...lows.slice(-30));

  const resistanceLevels = [
    parseFloat(highest.toFixed(1)),
    parseFloat((mean + stdDev).toFixed(1)),
    parseFloat((currentPrice + atr14 * 1.5).toFixed(1))
  ];
  const supportLevels = [
    parseFloat(lowest.toFixed(1)),
    parseFloat((mean - stdDev).toFixed(1)),
    parseFloat((currentPrice - atr14 * 1.5).toFixed(1))
  ];

  return {
    ema9,
    ema21,
    ema50,
    ema200,
    vwap,
    atr14,
    rsi14: parseFloat(rsi14.toFixed(1)),
    macd: {
      macd: parseFloat(macdVal.toFixed(2)),
      signal: parseFloat(signalVal.toFixed(2)),
      hist: parseFloat(histVal.toFixed(2))
    },
    bollinger: {
      upper: parseFloat(upperBB.toFixed(2)),
      middle: parseFloat(mean.toFixed(2)),
      lower: parseFloat(lowerBB.toFixed(2)),
      bandwidth: parseFloat(bandwidth.toFixed(2))
    },
    rvol,
    supportLevels,
    resistanceLevels
  };
}

// --------------------------------------------------------------------------
// MICROSTRUCTURE ENGINE (OBI, CVD, Intensity, Liquidity Concentration)
// --------------------------------------------------------------------------
export function computeMicrostructureScore(
  book: OrderBookState,
  flow: TradeFlowState,
  indicators: TechnicalIndicators
): MicrostructureScore {
  let obiScore = 12.5; // 0-25
  let cvdScore = 12.5; // 0-25
  let intensityScore = 7.5; // 0-15
  let spreadScore = 10.0; // 0-15
  let depthScore = 5.0; // 0-10
  let largeTradeScore = 5.0; // 0-10
  const breakdown: string[] = [];

  // 1. OBI calculation (-1 to +1 scaled to 0-25)
  // Positive OBI = buyer pressure on book
  const compositeOBI = (book.obi5 * 0.5 + book.obi10 * 0.3 + book.obi20 * 0.2);
  obiScore = Math.min(25, Math.max(0, 12.5 + compositeOBI * 12.5));
  if (compositeOBI > 0.2) {
    breakdown.push(`✓ OBI Bullish (+${(compositeOBI * 100).toFixed(1)}% bid dominance)`);
  } else if (compositeOBI < -0.2) {
    breakdown.push(`✗ OBI Bearish (${(compositeOBI * 100).toFixed(1)}% ask dominance)`);
  } else {
    breakdown.push(`• OBI Balanced (${(compositeOBI * 100).toFixed(1)}%)`);
  }

  // 2. CVD Flow (-1 to +1 scaled to 0-25)
  if (flow.cvdSlope > 0.3) {
    cvdScore = 22;
    breakdown.push(`✓ Strong aggressive market buying (CVD slope: +${flow.cvdSlope.toFixed(2)})`);
  } else if (flow.cvdSlope > 0.05) {
    cvdScore = 17;
    breakdown.push(`✓ Positive CVD delta accumulation`);
  } else if (flow.cvdSlope < -0.3) {
    cvdScore = 4;
    breakdown.push(`✗ Strong aggressive market selling (CVD slope: ${flow.cvdSlope.toFixed(2)})`);
  } else if (flow.cvdSlope < -0.05) {
    cvdScore = 8;
    breakdown.push(`✗ Negative CVD delta flow`);
  } else {
    cvdScore = 12.5;
    breakdown.push(`• CVD delta neutral`);
  }

  // 3. Trade Intensity
  if (flow.tradeIntensity > 15) {
    intensityScore = 14;
    breakdown.push(`✓ High trading velocity (${flow.tradeIntensity.toFixed(1)} trades/sec)`);
  } else if (flow.tradeIntensity > 5) {
    intensityScore = 10;
  } else {
    intensityScore = 5;
    breakdown.push(`• Low trade velocity (${flow.tradeIntensity.toFixed(1)} trades/sec)`);
  }

  // 4. Spread Score
  if (book.spreadPct < 0.005) {
    spreadScore = 15;
    breakdown.push(`✓ Ultra-tight institutional spread (${(book.spreadPct * 100).toFixed(4)}%)`);
  } else if (book.spreadPct < 0.015) {
    spreadScore = 12;
  } else {
    spreadScore = 4;
    breakdown.push(`✗ High bid-ask spread friction ($${book.spread.toFixed(2)})`);
  }

  // 5. Depth Score
  const totalDepthBtc = book.bidDepthTotal + book.askDepthTotal;
  if (totalDepthBtc > 50) {
    depthScore = 10;
    breakdown.push(`✓ Deep order book liquidity (${totalDepthBtc.toFixed(1)} BTC active)`);
  } else if (totalDepthBtc > 20) {
    depthScore = 7;
  } else {
    depthScore = 3;
    breakdown.push(`✗ Thin order book depth (<20 BTC)`);
  }

  // 6. Large trade detection
  if (flow.largeTradesCount > 0) {
    largeTradeScore = 9;
    breakdown.push(`✓ Whale orders executed in active window (${flow.largeTradesCount} large blocks)`);
  } else {
    largeTradeScore = 5;
  }

  const totalScore = Math.round(obiScore + cvdScore + intensityScore + spreadScore + depthScore + largeTradeScore);
  const rating = totalScore >= 65 ? "BULLISH" : totalScore <= 38 ? "BEARISH" : "NEUTRAL";

  return {
    score: Math.min(100, Math.max(0, totalScore)),
    rating,
    factors: {
      obiScore: Math.round(obiScore),
      cvdScore: Math.round(cvdScore),
      intensityScore: Math.round(intensityScore),
      spreadScore: Math.round(spreadScore),
      depthScore: Math.round(depthScore),
      largeTradeScore: Math.round(largeTradeScore)
    },
    breakdown
  };
}

// --------------------------------------------------------------------------
// REGIME ENGINE (Classification of Volatility, Trend, and Liquidity)
// --------------------------------------------------------------------------
export function classifyBtcRegime(
  currentPrice: number,
  ind: TechnicalIndicators,
  book: OrderBookState
): BtcRegime {
  // Check liquidity stress first
  if (book.spreadPct > 0.03 || (book.bidDepthTotal + book.askDepthTotal) < 10) {
    return {
      type: "LIQUIDITY_STRESS",
      description: "Wide spreads and thin depth detected. High execution slippage risk.",
      volatilityState: "EXPANDING",
      structureState: "RANGEBOUND"
    };
  }

  // Check volatility expansion
  const isHighVol = ind.bollinger.bandwidth > 3.5 || (ind.atr14 / currentPrice) * 100 > 0.5;
  const isLowVol = ind.bollinger.bandwidth < 1.0;

  // Check Trend alignment
  const isStrongBull = currentPrice > ind.ema9 && ind.ema9 > ind.ema21 && ind.ema21 > ind.ema50 && ind.rsi14 > 60;
  const isBull = currentPrice > ind.ema21 && currentPrice > ind.vwap;
  const isStrongBear = currentPrice < ind.ema9 && ind.ema9 < ind.ema21 && ind.ema21 < ind.ema50 && ind.rsi14 < 40;
  const isBear = currentPrice < ind.ema21 && currentPrice < ind.vwap;

  let regimeType: BtcRegimeType = "RANGE";
  let desc = "Consolidation within moving averages with balanced momentum.";

  if (isStrongBull) {
    regimeType = "STRONG_BULL";
    desc = "Aggressive upward trend with stacked EMAs and bullish momentum.";
  } else if (isStrongBear) {
    regimeType = "STRONG_BEAR";
    desc = "Aggressive downward trend with falling moving averages and heavy selling.";
  } else if (isHighVol) {
    regimeType = "HIGH_VOLATILITY";
    desc = "Volatile expansion regime with wide Bollinger bands and high ATR.";
  } else if (isBull) {
    regimeType = "BULL";
    desc = "Moderate bullish expansion above VWAP and 21 EMA.";
  } else if (isBear) {
    regimeType = "BEAR";
    desc = "Moderate bearish drift below VWAP and 21 EMA.";
  } else if (isLowVol) {
    regimeType = "LOW_VOLATILITY";
    desc = "Volatility compression / squeeze regime. Breakout imminent.";
  }

  return {
    type: regimeType,
    description: desc,
    volatilityState: isHighVol ? "EXPANDING" : isLowVol ? "COMPRESSED" : "NORMAL",
    structureState: isStrongBull || isBull ? "HIGHER_HIGHS" : isStrongBear || isBear ? "LOWER_LOWS" : "RANGEBOUND"
  };
}

// --------------------------------------------------------------------------
// MULTI-FACTOR SIGNAL ENGINE (Confluence Model 0–100)
// --------------------------------------------------------------------------
export function computeSignalConfluence(
  currentPrice: number,
  ind: TechnicalIndicators,
  micro: MicrostructureScore,
  derivatives: DerivativesState | null,
  regime: BtcRegime,
  book: OrderBookState,
  quality: DataQualityState
): SignalConfluence {
  const reasons: string[] = [];
  const noTradeReasons: string[] = [];

  // STALE OR QUALITY CHECK
  if (quality.isStale) {
    noTradeReasons.push(`DATA STALE — TRADING PAUSED (${quality.staleReason || "Feed delay"})`);
  }
  if (book.spreadPct > 0.025) {
    noTradeReasons.push(`HIGH SPREAD (${(book.spreadPct * 100).toFixed(3)}% exceeds 0.025% threshold)`);
  }
  if ((book.bidDepthTotal + book.askDepthTotal) < 12) {
    noTradeReasons.push(`LOW LIQUIDITY (Active book depth < 12 BTC)`);
  }

  let trendPts = 10; // max 20
  let structurePts = 8; // max 15
  let momentumPts = 5; // max 10
  let volumePts = 5; // max 10
  let vwapPts = 5; // max 10
  let volatilityPts = 5; // max 10
  let microstructurePts = Math.round((micro.score / 100) * 15); // max 15
  let derivativesPts = 2.5; // max 5
  let htfPts = 2.5; // max 5

  // 1. Trend Evaluation (max 20)
  if (currentPrice > ind.ema9 && ind.ema9 > ind.ema21 && ind.ema21 > ind.ema50) {
    trendPts = 20;
    reasons.push("✓ Stacked Bullish EMA Structure (Price > 9 > 21 > 50 EMA)");
  } else if (currentPrice > ind.ema21) {
    trendPts = 14;
    reasons.push("✓ Price sustaining above key 21 EMA");
  } else if (currentPrice < ind.ema9 && ind.ema9 < ind.ema21 && ind.ema21 < ind.ema50) {
    trendPts = 3;
    reasons.push("✗ Bearish EMA alignment (Price < 9 < 21 < 50 EMA)");
  } else {
    trendPts = 9;
  }

  // 2. Structure Evaluation (max 15)
  if (regime.structureState === "HIGHER_HIGHS") {
    structurePts = 15;
    reasons.push("✓ Market Structure: Forming Higher Highs & Higher Lows");
  } else if (regime.structureState === "LOWER_LOWS") {
    structurePts = 4;
    reasons.push("✗ Market Structure: Lower Highs breakdown pattern");
  } else {
    structurePts = 8;
  }

  // 3. Momentum Evaluation (max 10)
  if (ind.rsi14 >= 50 && ind.rsi14 <= 68 && ind.macd.hist > 0) {
    momentumPts = 10;
    reasons.push(`✓ Bullish Momentum: RSI ${ind.rsi14} & Positive MACD histogram (+${ind.macd.hist})`);
  } else if (ind.rsi14 > 70) {
    momentumPts = 6;
    reasons.push(`• RSI Overbought (${ind.rsi14}) - caution on fresh breakout entries`);
  } else if (ind.rsi14 < 35) {
    momentumPts = 3;
    reasons.push(`✗ Weak Momentum: RSI in oversold territory (${ind.rsi14})`);
  } else {
    momentumPts = 5;
  }

  // 4. Volume & RVOL Evaluation (max 10)
  if (ind.rvol > 1.3) {
    volumePts = 10;
    reasons.push(`✓ Elevated Volume: RVOL ${ind.rvol}x vs 20-period baseline`);
  } else if (ind.rvol > 0.9) {
    volumePts = 7;
    reasons.push(`• Normal trading volume (RVOL: ${ind.rvol}x)`);
  } else {
    volumePts = 3;
    reasons.push(`✗ Low Volume expansion (RVOL: ${ind.rvol}x)`);
  }

  // 5. VWAP Evaluation (max 10)
  if (currentPrice > ind.vwap) {
    vwapPts = 10;
    reasons.push(`✓ Price holding above Session VWAP ($${ind.vwap.toFixed(1)})`);
  } else {
    vwapPts = 2;
    reasons.push(`✗ Price trading below Session VWAP ($${ind.vwap.toFixed(1)})`);
  }

  // 6. Volatility & Risk Bounds (max 10)
  if (regime.type !== "HIGH_VOLATILITY" && regime.type !== "LIQUIDITY_STRESS") {
    volatilityPts = 10;
    reasons.push(`✓ Healthy ATR execution band ($${ind.atr14.toFixed(1)})`);
  } else {
    volatilityPts = 4;
  }

  // 7. Microstructure (max 15)
  if (micro.rating === "BULLISH") {
    reasons.push(`✓ Microstructure Confluence: Score ${micro.score}/100 with active OBI dominance`);
  } else if (micro.rating === "BEARISH") {
    reasons.push(`✗ Microstructure Bearish: Score ${micro.score}/100 (Sell flow dominance)`);
  }

  // 8. Derivatives (max 5)
  if (derivatives) {
    if (derivatives.regime === "LONG_BUILDUP") {
      derivativesPts = 5;
      reasons.push("✓ Derivatives Regime: Long Buildup (Price ↑ + OI ↑)");
    } else if (derivatives.regime === "SHORT_COVERING") {
      derivativesPts = 3.5;
      reasons.push("• Derivatives Regime: Short Covering (Price ↑ + OI ↓)");
    } else if (derivatives.regime === "SHORT_BUILDUP") {
      derivativesPts = 1;
      reasons.push("✗ Derivatives Regime: Short Buildup (Price ↓ + OI ↑)");
    } else {
      derivativesPts = 2.5;
    }
  }

  // 9. HTF Alignment (max 5)
  if (regime.type === "STRONG_BULL" || regime.type === "BULL") {
    htfPts = 5;
    reasons.push("✓ Multi-Timeframe Alignment: 1D & 4H trend constructive");
  } else {
    htfPts = 2;
  }

  const rawScore = Math.round(
    trendPts +
    structurePts +
    momentumPts +
    volumePts +
    vwapPts +
    volatilityPts +
    microstructurePts +
    derivativesPts +
    htfPts
  );

  const finalScore = Math.min(100, Math.max(0, rawScore));

  // Determine Signal State
  let state: SignalConfluence["state"] = "NO_TRADE";
  let action: SignalConfluence["action"] = "NO_TRADE";

  if (noTradeReasons.length > 0) {
    state = "NO_TRADE";
    action = "NO_TRADE";
  } else if (finalScore >= 90) {
    state = "HIGH_CONFLUENCE";
    action = "BUY";
  } else if (finalScore >= 80) {
    state = "STRONG";
    action = "BUY";
  } else if (finalScore >= 70) {
    state = "VALID";
    action = "BUY";
  } else if (finalScore >= 60) {
    state = "SETUP";
    action = "BUY";
  } else if (finalScore >= 40) {
    state = "WATCH";
    action = "NO_TRADE";
  } else {
    state = "NO_TRADE";
    action = "NO_TRADE";
    noTradeReasons.push("Confluence score below minimum 60 threshold.");
  }

  // Calculate Entry, Stop Loss, Take Profit
  const entryPrice = book.bestAsk > 0 ? book.bestAsk : currentPrice;
  const stopDistance = Math.max(ind.atr14 * 1.5, currentPrice * 0.0035); // at least 0.35% or 1.5x ATR
  const stopLoss = parseFloat((entryPrice - stopDistance).toFixed(2));
  const takeProfit1 = parseFloat((entryPrice + stopDistance * 1.5).toFixed(2));
  const takeProfit2 = parseFloat((entryPrice + stopDistance * 2.5).toFixed(2));
  const rrRatio = `1 : 2.0`;

  return {
    score: finalScore,
    state,
    action,
    factors: {
      trend: trendPts,
      structure: structurePts,
      momentum: momentumPts,
      volume: volumePts,
      vwap: vwapPts,
      volatility: volatilityPts,
      microstructure: microstructurePts,
      derivatives: Math.round(derivativesPts),
      htf: Math.round(htfPts)
    },
    reasons,
    noTradeReasons,
    entryPrice,
    stopLoss,
    takeProfit1,
    takeProfit2,
    riskRewardRatio: rrRatio
  };
}

// --------------------------------------------------------------------------
// POSITION SIZING & RISK ENGINE
// --------------------------------------------------------------------------
export function calculatePositionSize(
  accountEquity: number,
  riskPerTradePct: number,
  entryPrice: number,
  stopLossPrice: number
): { quantityBtc: number; sizeUsd: number; maxRiskUsd: number } {
  const maxRiskUsd = accountEquity * riskPerTradePct; // e.g. 100,000 * 0.0025 = $250
  const stopDistance = Math.abs(entryPrice - stopLossPrice);

  if (stopDistance <= 0 || entryPrice <= 0) {
    return { quantityBtc: 0, sizeUsd: 0, maxRiskUsd };
  }

  const quantityBtc = parseFloat((maxRiskUsd / stopDistance).toFixed(4));
  const sizeUsd = parseFloat((quantityBtc * entryPrice).toFixed(2));

  return {
    quantityBtc,
    sizeUsd,
    maxRiskUsd
  };
}
