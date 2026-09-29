/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  KillSwitchConfig,
  KillSwitchLog,
  UnifiedOrder,
  AssetCategory,
  OrderExecutionType,
  CompanyMetadata,
  PaperAccount,
  PaperOrder
} from "../types";

const KILL_SWITCH_STORAGE_KEY = "vm_algo_kill_switch_config";
const UNIFIED_ORDERS_STORAGE_KEY = "vm_algo_unified_orders";

const DEFAULT_KILL_SWITCH_CONFIG: KillSwitchConfig = {
  isEngaged: false,
  engagedAt: undefined,
  reason: undefined,
  haltAllBots: true,
  blockManualOrders: true,
  autoCancelPendingOrders: true,
  autoSquareOffPositions: false,
  maxDailyLossLimit: 50000,
  maxDailyLossActive: false,
  maxDrawdownPct: 5.0,
  maxDrawdownActive: false,
  maxOrderValue: 500000,
  maxOrderValueActive: false,
  killSwitchLogs: [
    {
      id: "LOG-INIT",
      timestamp: new Date().toLocaleTimeString(),
      action: "DISARMED",
      details: "Risk management system initialized. Kill Switch armed and monitoring active."
    }
  ]
};

export function getKillSwitchConfig(): KillSwitchConfig {
  try {
    const saved = localStorage.getItem(KILL_SWITCH_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_KILL_SWITCH_CONFIG, ...parsed };
    }
  } catch (e) {
    console.error("Error reading kill switch config", e);
  }
  return DEFAULT_KILL_SWITCH_CONFIG;
}

export function saveKillSwitchConfig(config: KillSwitchConfig): void {
  try {
    localStorage.setItem(KILL_SWITCH_STORAGE_KEY, JSON.stringify(config));
    window.dispatchEvent(new CustomEvent("vm_algo_kill_switch_updated", { detail: config }));
  } catch (e) {
    console.error("Error saving kill switch config", e);
  }
}

export function isKillSwitchEngaged(): boolean {
  const config = getKillSwitchConfig();
  return Boolean(config.isEngaged);
}

/**
 * Trigger Emergency Kill Switch Protocol
 */
export function triggerKillSwitch(
  reason: string,
  squareOffAllPositions: boolean = false,
  stocks?: CompanyMetadata[]
): { flattenedCounts: { stocks: number; options: number; crypto: number }; cancelledOrders: number } {
  const currentConfig = getKillSwitchConfig();
  const timestamp = new Date().toLocaleTimeString();

  // 1. Halt all automated trading bots immediately
  try {
    localStorage.setItem("vm_algo_auto_active", "false");
    localStorage.setItem("vm_algo_options_bot_enabled", "false");
  } catch (err) {
    console.error("Failed to halt trading bots in localStorage", err);
  }

  // 2. Cancel all open/pending orders
  const cancelledOrders = cancelAllPendingOrders();

  // 3. Flatten positions if requested or configured
  let flattenedCounts = { stocks: 0, options: 0, crypto: 0 };
  if (squareOffAllPositions || currentConfig.autoSquareOffPositions) {
    flattenedCounts = emergencyFlattenAllPositions(stocks);
  }

  // 4. Log the action
  const newLog: KillSwitchLog = {
    id: `KILL-${Date.now().toString().slice(-6)}`,
    timestamp,
    action: "ENGAGED",
    details: `EMERGENCY KILL SWITCH ENGAGED: ${reason}. Automated bots halted. ${cancelledOrders} open orders cancelled.${
      squareOffAllPositions
        ? ` Flattened ${flattenedCounts.stocks} equities, ${flattenedCounts.options} options, ${flattenedCounts.crypto} crypto positions.`
        : ""
    }`
  };

  const updatedConfig: KillSwitchConfig = {
    ...currentConfig,
    isEngaged: true,
    engagedAt: new Date().toISOString(),
    reason,
    killSwitchLogs: [newLog, ...currentConfig.killSwitchLogs].slice(0, 50)
  };

  saveKillSwitchConfig(updatedConfig);

  // Sync with backend API if available
  try {
    fetch("/api/v1/trading/kill-switch/engage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason, timestamp })
    }).catch(() => {});
  } catch {}

  return { flattenedCounts, cancelledOrders };
}

/**
 * Disarm / Deactivate Kill Switch
 */
export function disarmKillSwitch(notes: string = "Manual clearance by trader"): void {
  const currentConfig = getKillSwitchConfig();
  const timestamp = new Date().toLocaleTimeString();

  const newLog: KillSwitchLog = {
    id: `DISARM-${Date.now().toString().slice(-6)}`,
    timestamp,
    action: "DISARMED",
    details: `Kill switch disarmed. Trading locks released. Notes: ${notes}`
  };

  const updatedConfig: KillSwitchConfig = {
    ...currentConfig,
    isEngaged: false,
    engagedAt: undefined,
    reason: undefined,
    killSwitchLogs: [newLog, ...currentConfig.killSwitchLogs].slice(0, 50)
  };

  saveKillSwitchConfig(updatedConfig);

  try {
    fetch("/api/v1/trading/kill-switch/disarm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes, timestamp })
    }).catch(() => {});
  } catch {}
}

/**
 * Update Kill Switch Configuration parameters
 */
export function updateKillSwitchSettings(partial: Partial<KillSwitchConfig>): KillSwitchConfig {
  const current = getKillSwitchConfig();
  const updated = { ...current, ...partial };
  saveKillSwitchConfig(updated);
  return updated;
}

// ---------------------------------------------------------------------------
// UNIFIED ORDER BOOK ENGINE
// ---------------------------------------------------------------------------

export function getUnifiedOrders(): UnifiedOrder[] {
  try {
    const saved = localStorage.getItem(UNIFIED_ORDERS_STORAGE_KEY);
    if (saved) {
      const orders: UnifiedOrder[] = JSON.parse(saved);
      return orders;
    }
  } catch (e) {
    console.error("Error reading unified orders", e);
  }

  // If unified orders not yet populated, aggregate from existing sub-stores
  const aggregated: UnifiedOrder[] = [];

  // 1. Stock paper trading orders
  try {
    const ptData = localStorage.getItem("vm_algo_paper_trading");
    if (ptData) {
      const pt: PaperAccount = JSON.parse(ptData);
      if (Array.isArray(pt.orders)) {
        pt.orders.forEach(o => {
          aggregated.push({
            id: o.id,
            ticker: o.ticker,
            symbol: o.ticker,
            name: o.companyName || o.ticker,
            assetCategory: "EQUITY",
            side: o.type,
            orderType: o.orderType || "MARKET",
            quantity: o.quantity,
            price: o.price,
            limitPrice: o.limitPrice,
            value: o.value,
            status: o.status === "FAILED" ? "REJECTED" : o.status === "PENDING" ? "OPEN" : "COMPLETED",
            timestamp: o.timestamp,
            source: o.id.startsWith("VM-") ? "VM_ALGO_STOCK" : "MANUAL",
            filledQuantity: o.quantity,
            filledPrice: o.price
          });
        });
      }
    }
  } catch {}

  // 2. Options orders
  try {
    const optOrders = localStorage.getItem("vm_algo_options_orders");
    if (optOrders) {
      const parsed = JSON.parse(optOrders);
      if (Array.isArray(parsed)) {
        parsed.forEach((o: any) => {
          aggregated.push({
            id: o.id,
            ticker: o.underlier,
            symbol: `${o.underlier} ${o.strike} ${o.type}`,
            name: `${o.underlier} ${o.strike} ${o.type}`,
            assetCategory: "OPTION",
            side: o.action,
            orderType: "MARKET",
            quantity: o.quantity,
            price: o.premium,
            value: o.totalAmount,
            status: o.status === "FAILED" ? "REJECTED" : "COMPLETED",
            timestamp: o.timestamp,
            source: o.id.startsWith("AUTO-") ? "VM_ALGO_OPTION" : "MANUAL",
            filledQuantity: o.quantity,
            filledPrice: o.premium,
            strike: o.strike,
            optionType: o.type
          });
        });
      }
    }
  } catch {}

  // 3. Crypto orders
  try {
    const cryptoOrders = localStorage.getItem("vm_algo_crypto_orders");
    if (cryptoOrders) {
      const parsed = JSON.parse(cryptoOrders);
      if (Array.isArray(parsed)) {
        parsed.forEach((o: any) => {
          aggregated.push({
            id: o.id,
            ticker: o.coin,
            symbol: `${o.coin}/USDT`,
            name: `${o.coin} Perpetual`,
            assetCategory: "CRYPTO",
            side: o.type,
            orderType: "MARKET",
            quantity: o.amount,
            price: o.price,
            value: o.total,
            status: "COMPLETED",
            timestamp: o.timestamp,
            source: "VM_ALGO_CRYPTO",
            filledQuantity: o.amount,
            filledPrice: o.price
          });
        });
      }
    }
  } catch {}

  if (aggregated.length > 0) {
    try {
      localStorage.setItem(UNIFIED_ORDERS_STORAGE_KEY, JSON.stringify(aggregated));
    } catch {}
  }

  return aggregated;
}

export function saveUnifiedOrders(orders: UnifiedOrder[]): void {
  try {
    localStorage.setItem(UNIFIED_ORDERS_STORAGE_KEY, JSON.stringify(orders));
    window.dispatchEvent(new CustomEvent("vm_algo_orders_updated", { detail: orders }));
  } catch (e) {
    console.error("Error saving unified orders", e);
  }
}

/**
 * Submit an order through the unified execution gateway
 */
export function placeUnifiedOrder(
  orderInput: {
    ticker: string;
    name?: string;
    assetCategory: AssetCategory;
    side: "BUY" | "SELL";
    orderType: OrderExecutionType;
    quantity: number;
    price: number;
    limitPrice?: number;
    triggerPrice?: number;
    source?: "MANUAL" | "VM_ALGO_STOCK" | "VM_ALGO_OPTION" | "VM_ALGO_CRYPTO" | "API";
    strike?: number;
    optionType?: "CE" | "PE";
  },
  stocks?: CompanyMetadata[]
): { success: boolean; order?: UnifiedOrder; error?: string } {
  const config = getKillSwitchConfig();

  // 1. Check Kill Switch lock
  if (config.isEngaged) {
    const reason = `ORDER REJECTED: Kill Switch is currently ENGAGED (${config.reason || "Risk Lock Active"}). Order routing halted.`;
    
    // Log rejected order attempt
    const rejectedOrder: UnifiedOrder = {
      id: `REJ-${Date.now().toString().slice(-6)}`,
      ticker: orderInput.ticker,
      symbol: orderInput.strike ? `${orderInput.ticker} ${orderInput.strike} ${orderInput.optionType}` : orderInput.ticker,
      name: orderInput.name || orderInput.ticker,
      assetCategory: orderInput.assetCategory,
      side: orderInput.side,
      orderType: orderInput.orderType,
      quantity: orderInput.quantity,
      price: orderInput.price,
      limitPrice: orderInput.limitPrice,
      triggerPrice: orderInput.triggerPrice,
      value: (orderInput.limitPrice || orderInput.price) * orderInput.quantity,
      status: "REJECTED",
      timestamp: new Date().toLocaleTimeString(),
      source: orderInput.source || "MANUAL",
      rejectReason: reason,
      strike: orderInput.strike,
      optionType: orderInput.optionType
    };

    const currentOrders = getUnifiedOrders();
    saveUnifiedOrders([rejectedOrder, ...currentOrders]);

    return { success: false, error: reason, order: rejectedOrder };
  }

  // 2. Circuit Breaker Check: Max Order Value
  const orderPrice = orderInput.orderType === "LIMIT" && orderInput.limitPrice ? orderInput.limitPrice : orderInput.price;
  const orderValue = orderPrice * orderInput.quantity;

  if (config.maxOrderValueActive && orderValue > config.maxOrderValue) {
    const reason = `CIRCUIT BREAKER: Order value (₹${orderValue.toLocaleString("en-IN")}) exceeds max order limit (₹${config.maxOrderValue.toLocaleString("en-IN")}).`;
    return { success: false, error: reason };
  }

  const timestamp = new Date().toLocaleTimeString();
  const orderId = `ORD-${Date.now().toString().slice(-6)}`;
  const isMarket = orderInput.orderType === "MARKET";

  const newOrder: UnifiedOrder = {
    id: orderId,
    ticker: orderInput.ticker,
    symbol: orderInput.strike ? `${orderInput.ticker} ${orderInput.strike} ${orderInput.optionType}` : orderInput.ticker,
    name: orderInput.name || orderInput.ticker,
    assetCategory: orderInput.assetCategory,
    side: orderInput.side,
    orderType: orderInput.orderType,
    quantity: orderInput.quantity,
    price: orderPrice,
    limitPrice: orderInput.limitPrice,
    triggerPrice: orderInput.triggerPrice,
    value: orderValue,
    status: isMarket ? "COMPLETED" : "OPEN",
    timestamp,
    source: orderInput.source || "MANUAL",
    filledQuantity: isMarket ? orderInput.quantity : 0,
    filledPrice: isMarket ? orderPrice : undefined,
    strike: orderInput.strike,
    optionType: orderInput.optionType
  };

  // If Market order, execute immediately in corresponding sub-system
  if (isMarket) {
    if (orderInput.assetCategory === "EQUITY") {
      executeEquityTrade(orderInput.ticker, orderInput.side, orderInput.quantity, orderPrice, orderId, stocks);
    } else if (orderInput.assetCategory === "OPTION" && orderInput.strike && orderInput.optionType) {
      executeOptionTrade(orderInput.ticker, orderInput.strike, orderInput.optionType, orderInput.side, orderInput.quantity, orderPrice, orderId);
    } else if (orderInput.assetCategory === "CRYPTO") {
      executeCryptoTrade(orderInput.ticker, orderInput.side, orderInput.quantity, orderPrice, orderId);
    }
  }

  const currentOrders = getUnifiedOrders();
  saveUnifiedOrders([newOrder, ...currentOrders]);

  return { success: true, order: newOrder };
}

/**
 * Cancel a specific pending order
 */
export function cancelUnifiedOrder(orderId: string): boolean {
  const currentOrders = getUnifiedOrders();
  const idx = currentOrders.findIndex(o => o.id === orderId);
  if (idx === -1) return false;

  const target = currentOrders[idx];
  if (target.status !== "OPEN") return false;

  target.status = "CANCELLED";
  target.rejectReason = "Cancelled by user";
  saveUnifiedOrders([...currentOrders]);
  return true;
}

/**
 * Cancel all currently pending/open orders
 */
export function cancelAllPendingOrders(): number {
  const currentOrders = getUnifiedOrders();
  let count = 0;

  const updated = currentOrders.map(o => {
    if (o.status === "OPEN") {
      count++;
      return {
        ...o,
        status: "CANCELLED" as const,
        rejectReason: "Cancelled by Kill Switch Emergency Protocol"
      };
    }
    return o;
  });

  if (count > 0) {
    saveUnifiedOrders(updated);
  }

  return count;
}

/**
 * Emergency Flatten / Liquidate all positions across Equities, Options, and Crypto
 */
export function emergencyFlattenAllPositions(
  stocks?: CompanyMetadata[]
): { stocks: number; options: number; crypto: number } {
  let stockCount = 0;
  let optionCount = 0;
  let cryptoCount = 0;

  // 1. Flatten Equities (PaperTrading)
  try {
    const ptData = localStorage.getItem("vm_algo_paper_trading");
    if (ptData) {
      const pt: PaperAccount = JSON.parse(ptData);
      if (Array.isArray(pt.holdings) && pt.holdings.length > 0) {
        stockCount = pt.holdings.length;
        let liquidatedCash = 0;
        const squareOffOrders: PaperOrder[] = [];

        pt.holdings.forEach(h => {
          const matchingStock = stocks?.find(s => s.ticker === h.ticker);
          const currentPrice = matchingStock ? matchingStock.price : h.currentPrice || h.avgBuyPrice;
          const val = h.quantity * currentPrice;
          liquidatedCash += val;

          squareOffOrders.push({
            id: `KILL-EQ-${Date.now().toString().slice(-5)}`,
            ticker: h.ticker,
            companyName: h.companyName,
            type: "SELL",
            quantity: h.quantity,
            price: currentPrice,
            timestamp: new Date().toLocaleTimeString(),
            value: val,
            orderType: "MARKET",
            status: "COMPLETED"
          });
        });

        pt.balance += liquidatedCash;
        pt.holdings = [];
        pt.holdingsValue = 0;
        pt.totalEquity = pt.balance;
        pt.totalPnl = pt.totalEquity - pt.initialBalance;
        pt.totalPnlPct = (pt.totalPnl / pt.initialBalance) * 100;
        pt.orders = [...squareOffOrders, ...pt.orders];

        localStorage.setItem("vm_algo_paper_trading", JSON.stringify(pt));
      }
    }
  } catch (err) {
    console.error("Error flattening equity holdings:", err);
  }

  // 2. Flatten Options
  try {
    const optData = localStorage.getItem("vm_algo_options_holdings");
    if (optData) {
      const holdings = JSON.parse(optData);
      if (Array.isArray(holdings) && holdings.length > 0) {
        optionCount = holdings.length;
        let liquidatedOptCash = 0;

        holdings.forEach((h: any) => {
          const prem = h.currentPremium || h.buyPremium;
          liquidatedOptCash += prem * h.quantity * (h.lotSize || 50);
        });

        const currentBal = parseFloat(localStorage.getItem("vm_algo_options_balance") || "1000000");
        localStorage.setItem("vm_algo_options_balance", (currentBal + liquidatedOptCash).toString());
        localStorage.setItem("vm_algo_options_holdings", JSON.stringify([]));
      }
    }
  } catch (err) {
    console.error("Error flattening option holdings:", err);
  }

  // 3. Flatten Crypto
  try {
    const cryptoData = localStorage.getItem("vm_algo_crypto_holdings");
    if (cryptoData) {
      const holdings = JSON.parse(cryptoData);
      if (Array.isArray(holdings) && holdings.length > 0) {
        cryptoCount = holdings.length;
        let liquidatedCrypto = 0;

        holdings.forEach((h: any) => {
          const val = h.amount * (h.currentPrice || h.buyPrice);
          liquidatedCrypto += val;
        });

        const currentBal = parseFloat(localStorage.getItem("vm_algo_crypto_balance") || "100000");
        localStorage.setItem("vm_algo_crypto_balance", (currentBal + liquidatedCrypto).toString());
        localStorage.setItem("vm_algo_crypto_holdings", JSON.stringify([]));
      }
    }
  } catch (err) {
    console.error("Error flattening crypto holdings:", err);
  }

  // Trigger global notifications
  window.dispatchEvent(new CustomEvent("vm_algo_portfolio_flattened"));

  return { stocks: stockCount, options: optionCount, crypto: cryptoCount };
}

// ---------------------------------------------------------------------------
// SUB-ROUTINE EXECUTION HELPERS
// ---------------------------------------------------------------------------

function executeEquityTrade(
  ticker: string,
  side: "BUY" | "SELL",
  quantity: number,
  price: number,
  orderId: string,
  stocks?: CompanyMetadata[]
) {
  try {
    const saved = localStorage.getItem("vm_algo_paper_trading");
    let account: PaperAccount;
    if (saved) {
      account = JSON.parse(saved);
    } else {
      account = {
        balance: 1000000,
        initialBalance: 1000000,
        totalEquity: 1000000,
        holdingsValue: 0,
        totalPnl: 0,
        totalPnlPct: 0,
        holdings: [],
        orders: []
      };
    }

    const tradeVal = price * quantity;
    const stockInfo = stocks?.find(s => s.ticker === ticker);
    const companyName = stockInfo ? stockInfo.name : ticker;

    if (side === "BUY") {
      account.balance = Math.max(0, account.balance - tradeVal);
      const existingIdx = account.holdings.findIndex(h => h.ticker === ticker);
      if (existingIdx !== -1) {
        const prev = account.holdings[existingIdx];
        const nextQty = prev.quantity + quantity;
        const nextCost = prev.totalCost + tradeVal;
        account.holdings[existingIdx] = {
          ...prev,
          quantity: nextQty,
          totalCost: nextCost,
          avgBuyPrice: parseFloat((nextCost / nextQty).toFixed(2)),
          currentPrice: price,
          currentValue: nextQty * price,
          pnl: nextQty * price - nextCost,
          pnlPct: ((nextQty * price - nextCost) / nextCost) * 100
        };
      } else {
        account.holdings.push({
          ticker,
          companyName,
          quantity,
          avgBuyPrice: price,
          currentPrice: price,
          currentValue: tradeVal,
          totalCost: tradeVal,
          pnl: 0,
          pnlPct: 0
        });
      }
    } else {
      const existingIdx = account.holdings.findIndex(h => h.ticker === ticker);
      if (existingIdx !== -1) {
        const prev = account.holdings[existingIdx];
        const remainingQty = Math.max(0, prev.quantity - quantity);
        account.balance += tradeVal;
        if (remainingQty === 0) {
          account.holdings = account.holdings.filter(h => h.ticker !== ticker);
        } else {
          const propCost = prev.totalCost * (remainingQty / prev.quantity);
          account.holdings[existingIdx] = {
            ...prev,
            quantity: remainingQty,
            totalCost: propCost,
            currentValue: remainingQty * price,
            pnl: remainingQty * price - propCost,
            pnlPct: ((remainingQty * price - propCost) / propCost) * 100
          };
        }
      }
    }

    const holdingsVal = account.holdings.reduce((sum, h) => sum + h.currentValue, 0);
    account.holdingsValue = holdingsVal;
    account.totalEquity = account.balance + holdingsVal;
    account.totalPnl = account.totalEquity - account.initialBalance;
    account.totalPnlPct = (account.totalPnl / account.initialBalance) * 100;

    const paperOrder: PaperOrder = {
      id: orderId,
      ticker,
      companyName,
      type: side,
      quantity,
      price,
      timestamp: new Date().toLocaleTimeString(),
      value: tradeVal,
      orderType: "MARKET",
      status: "COMPLETED"
    };

    account.orders = [paperOrder, ...account.orders];
    localStorage.setItem("vm_algo_paper_trading", JSON.stringify(account));
  } catch (e) {
    console.error("Error executing equity trade:", e);
  }
}

function executeOptionTrade(
  underlier: string,
  strike: number,
  type: "CE" | "PE",
  action: "BUY" | "SELL",
  quantity: number,
  premium: number,
  orderId: string
) {
  try {
    const lotSize = underlier === "BANKNIFTY" ? 15 : 50;
    const totalAmount = premium * quantity * lotSize;
    const balance = parseFloat(localStorage.getItem("vm_algo_options_balance") || "1000000");

    let holdings: any[] = [];
    const savedHoldings = localStorage.getItem("vm_algo_options_holdings");
    if (savedHoldings) holdings = JSON.parse(savedHoldings);

    let orders: any[] = [];
    const savedOrders = localStorage.getItem("vm_algo_options_orders");
    if (savedOrders) orders = JSON.parse(savedOrders);

    if (action === "BUY") {
      localStorage.setItem("vm_algo_options_balance", Math.max(0, balance - totalAmount).toString());
      holdings.push({
        id: `OPT-${Date.now().toString().slice(-6)}`,
        underlier,
        strike,
        type,
        buyPremium: premium,
        currentPremium: premium,
        quantity,
        lotSize,
        totalCost: totalAmount,
        timestamp: new Date().toLocaleTimeString(),
        pnl: 0,
        pnlPct: 0,
        action: "BUY"
      });
    } else {
      localStorage.setItem("vm_algo_options_balance", (balance + totalAmount).toString());
      // Remove or reduce matching holding
      const idx = holdings.findIndex(h => h.underlier === underlier && h.strike === strike && h.type === type);
      if (idx !== -1) {
        holdings.splice(idx, 1);
      }
    }

    orders.unshift({
      id: orderId,
      underlier,
      strike,
      type,
      action,
      quantity,
      premium,
      timestamp: new Date().toLocaleTimeString(),
      status: "COMPLETED",
      totalAmount
    });

    localStorage.setItem("vm_algo_options_holdings", JSON.stringify(holdings));
    localStorage.setItem("vm_algo_options_orders", JSON.stringify(orders));
  } catch (e) {
    console.error("Error executing option trade:", e);
  }
}

function executeCryptoTrade(
  ticker: string,
  side: "BUY" | "SELL",
  amount: number,
  price: number,
  orderId: string
) {
  try {
    const total = amount * price;
    const balance = parseFloat(localStorage.getItem("vm_algo_crypto_balance") || "100000");

    let holdings: any[] = [];
    const savedH = localStorage.getItem("vm_algo_crypto_holdings");
    if (savedH) holdings = JSON.parse(savedH);

    let orders: any[] = [];
    const savedO = localStorage.getItem("vm_algo_crypto_orders");
    if (savedO) orders = JSON.parse(savedO);

    if (side === "BUY") {
      localStorage.setItem("vm_algo_crypto_balance", Math.max(0, balance - total).toString());
      const existing = holdings.find(h => h.coin === ticker);
      if (existing) {
        const nextAmt = existing.amount + amount;
        const nextTotal = existing.totalCost + total;
        existing.amount = nextAmt;
        existing.totalCost = nextTotal;
        existing.buyPrice = nextTotal / nextAmt;
        existing.currentPrice = price;
      } else {
        holdings.push({
          coin: ticker,
          amount,
          buyPrice: price,
          currentPrice: price,
          totalCost: total
        });
      }
    } else {
      localStorage.setItem("vm_algo_crypto_balance", (balance + total).toString());
      const idx = holdings.findIndex(h => h.coin === ticker);
      if (idx !== -1) {
        holdings.splice(idx, 1);
      }
    }

    orders.unshift({
      id: orderId,
      coin: ticker,
      type: side,
      amount,
      price,
      total,
      timestamp: new Date().toLocaleTimeString()
    });

    localStorage.setItem("vm_algo_crypto_holdings", JSON.stringify(holdings));
    localStorage.setItem("vm_algo_crypto_orders", JSON.stringify(orders));
  } catch (e) {
    console.error("Error executing crypto trade:", e);
  }
}
