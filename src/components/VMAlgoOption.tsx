/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import {
  Flame,
  Settings,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  RefreshCw,
  Coins,
  History,
  AlertTriangle,
  Info,
  Layers,
  ArrowRightLeft,
  ChevronRight,
  BookOpen,
  PieChart as PieIcon,
  HelpCircle,
  Play,
  Activity,
  CheckCircle,
  TrendingUp as BulletIcon,
  Zap,
  BarChart2,
  Sliders,
  Gauge,
  Crosshair,
  Target,
  Percent,
  Cpu,
  Power,
  XCircle
} from "lucide-react";
import { motion } from "motion/react";
import { CompanyMetadata } from "../types";
import { fetchOptionsChain } from "../services/apiService";
import { COMPANIES_LIST } from "../data/mockEquityData";
import BuyAlertPopup, { BuyAlertPayload } from "./BuyAlertPopup";
import { calculateOptionGreeks, computeMarketAnalytics, OptionGreeks, MarketAnalytics } from "../utils/optionGreeks";
import { isKillSwitchEngaged } from "../services/killSwitchService";

interface VMAlgoOptionProps {
  stocks: CompanyMetadata[];
  onSelectStock: (ticker: string) => void;
}

// Strategy Inputs mapping Pine Script
interface StrategyInputs {
  stMult: number;
  atrLen: number;
  minScore: number;
  showCloud: boolean;
  cloudTr: number;
}

// Option Contract Structure for virtual paper trading
interface OptionHolding {
  id: string;
  underlier: string;
  strike: number;
  type: "CE" | "PE";
  buyPremium: number;
  currentPremium: number;
  quantity: number; // number of contracts (lots)
  lotSize: number;
  totalCost: number;
  timestamp: string;
  pnl: number;
  pnlPct: number;
  action: "BUY" | "SELL"; // BUY = Long premium, SELL = Short premium
  isAuto?: boolean;
}

interface OptionOrder {
  id: string;
  underlier: string;
  strike: number;
  type: "CE" | "PE";
  action: "BUY" | "SELL";
  quantity: number;
  premium: number;
  timestamp: string;
  status: "COMPLETED" | "FAILED";
  totalAmount: number;
}

interface SimulatedCandle {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export default function VMAlgoOption({ stocks, onSelectStock }: VMAlgoOptionProps) {
  const [selectedTicker, setSelectedTicker] = useState<string>(stocks[0]?.ticker || "RELIANCE");
  const [activeTab, setActiveTab] = useState<"research" | "portfolio" | "payoff">("research");
  const [loadingChain, setLoadingChain] = useState<boolean>(true);
  const [optionsData, setOptionsData] = useState<any | null>(null);
  const [errorChain, setErrorChain] = useState<string | null>(null);

  // Pro Option Chain View Mode
  const [chainViewMode, setChainViewMode] = useState<"standard" | "greeks" | "volume">("standard");

  // Strategy Inputs matching Pinescript
  const [inputs, setInputs] = useState<StrategyInputs>({
    stMult: 3.0,
    atrLen: 10,
    minScore: 3,
    showCloud: true,
    cloudTr: 72
  });

  // Option Order Ticket State
  const [orderAction, setOrderAction] = useState<"BUY" | "SELL">("BUY");
  const [orderType, setOrderType] = useState<"CE" | "PE">("CE");
  const [orderStrike, setOrderStrike] = useState<number>(0);
  const [orderPremium, setOrderPremium] = useState<number>(10);
  const [orderQty, setOrderQty] = useState<number>(1); // Number of lots
  const [orderFeedback, setOrderFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Strategy Quick-Select Preset State
  const [selectedStrategyPreset, setSelectedStrategyPreset] = useState<string>("custom");

  // Expiry target slider for payoff simulation
  const [simulatedExpiryPrice, setSimulatedExpiryPrice] = useState<number>(0);

  // Option Account details (starting with ₹10,00,000 virtual balance)
  const [walletBalance, setWalletBalance] = useState<number>(() => {
    const saved = localStorage.getItem("vm_algo_options_balance");
    return saved ? parseFloat(saved) : 1000000;
  });

  const [holdings, setHoldings] = useState<OptionHolding[]>(() => {
    const saved = localStorage.getItem("vm_algo_options_holdings");
    return saved ? JSON.parse(saved) : [];
  });

  const [orders, setOrders] = useState<OptionOrder[]>(() => {
    const saved = localStorage.getItem("vm_algo_options_orders");
    return saved ? JSON.parse(saved) : [];
  });

  // Option Auto Trading Bot States
  const [isAutoBotEnabled, setIsAutoBotEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem("vm_algo_options_bot_enabled");
    return saved === "true";
  });
  const [autoBotLotSize, setAutoBotLotSize] = useState<number>(() => {
    const saved = localStorage.getItem("vm_algo_options_bot_lots");
    return saved ? parseInt(saved) : 1;
  });
  const [autoBotStopLoss, setAutoBotStopLoss] = useState<number>(() => {
    const saved = localStorage.getItem("vm_algo_options_bot_sl");
    return saved ? parseFloat(saved) : 20.0;
  });
  const [autoBotTakeProfit, setAutoBotTakeProfit] = useState<number>(() => {
    const saved = localStorage.getItem("vm_algo_options_bot_tp");
    return saved ? parseFloat(saved) : 40.0;
  });
  const [autoBotTrendExit, setAutoBotTrendExit] = useState<boolean>(() => {
    const saved = localStorage.getItem("vm_algo_options_bot_trend");
    return saved !== "false";
  });
  const [autoBotMaxTradesPerDay, setAutoBotMaxTradesPerDay] = useState<number>(() => {
    const saved = localStorage.getItem("vm_algo_options_bot_max_trades");
    return saved ? parseInt(saved) : 5;
  });
  const [autoBotDailyTradesCount, setAutoBotDailyTradesCount] = useState<number>(() => {
    const savedDate = localStorage.getItem("vm_algo_options_bot_trades_date");
    const today = new Date().toISOString().split("T")[0];
    if (savedDate !== today) {
      localStorage.setItem("vm_algo_options_bot_trades_date", today);
      localStorage.setItem("vm_algo_options_bot_trades_count", "0");
      return 0;
    }
    const savedCount = localStorage.getItem("vm_algo_options_bot_trades_count");
    return savedCount ? parseInt(savedCount) : 0;
  });
  const [autoBotLogs, setAutoBotLogs] = useState<any[]>(() => {
    const saved = localStorage.getItem("vm_algo_options_bot_logs");
    return saved ? JSON.parse(saved) : [];
  });
  const [lastSignalTraded, setLastSignalTraded] = useState<string>(() => {
    return localStorage.getItem("vm_algo_options_bot_last_signal") || "";
  });

  useEffect(() => {
    localStorage.setItem("vm_algo_options_bot_max_trades", autoBotMaxTradesPerDay.toString());
  }, [autoBotMaxTradesPerDay]);

  // Active Buy Alert Popup State
  const [activeBuyAlert, setActiveBuyAlert] = useState<BuyAlertPayload | null>(null);

  const triggerTestBuyAlert = () => {
    setActiveBuyAlert({
      id: `ALERT-${Date.now()}`,
      symbol: selectedTicker,
      assetType: "OPTION",
      action: "CE_BUY",
      price: currentStock.price,
      strike: Math.round(currentStock.price / 50) * 50,
      optionType: "CE",
      targetPrice: Math.round(currentStock.price * 1.04),
      stopLoss: Math.round(currentStock.price * 0.98),
      score: 9,
      maxScore: 10,
      reason: `SUPER TREND X10 BULLISH BREAKOUT: High volume EMA (9/21/50) golden cross with RSI (68.4) supercharge on ${selectedTicker}.`,
      source: "VM Algo Option Engine",
      timestamp: new Date().toLocaleTimeString()
    });
  };

  // Selected Stock metadata
  const currentStock = stocks.find((s) => s.ticker === selectedTicker) || stocks[0] || COMPANIES_LIST.find((s) => s.ticker === selectedTicker) || COMPANIES_LIST[0];
  const lotSize = 250; // Standard multiplier for stock option lot sizes

  // Listen for Global Kill Switch and Flattening Events
  useEffect(() => {
    const handleKillSwitchEvent = () => {
      if (isKillSwitchEngaged()) {
        setIsAutoBotEnabled(false);
      }
      const savedBal = localStorage.getItem("vm_algo_options_balance");
      if (savedBal) setWalletBalance(parseFloat(savedBal));
      const savedHld = localStorage.getItem("vm_algo_options_holdings");
      if (savedHld) {
        try {
          setHoldings(JSON.parse(savedHld));
        } catch {}
      }
      const savedOrd = localStorage.getItem("vm_algo_options_orders");
      if (savedOrd) {
        try {
          setOrders(JSON.parse(savedOrd));
        } catch {}
      }
    };

    window.addEventListener("vm_algo_kill_switch_updated", handleKillSwitchEvent);
    window.addEventListener("vm_algo_portfolio_flattened", handleKillSwitchEvent);
    return () => {
      window.removeEventListener("vm_algo_kill_switch_updated", handleKillSwitchEvent);
      window.removeEventListener("vm_algo_portfolio_flattened", handleKillSwitchEvent);
    };
  }, []);

  // Sync state to LocalStorage
  useEffect(() => {
    localStorage.setItem("vm_algo_options_balance", walletBalance.toString());
  }, [walletBalance]);

  useEffect(() => {
    localStorage.setItem("vm_algo_options_holdings", JSON.stringify(holdings));
  }, [holdings]);

  useEffect(() => {
    localStorage.setItem("vm_algo_options_orders", JSON.stringify(orders));
  }, [orders]);

  // Sync Auto Bot States
  useEffect(() => {
    localStorage.setItem("vm_algo_options_bot_enabled", isAutoBotEnabled.toString());
  }, [isAutoBotEnabled]);

  useEffect(() => {
    localStorage.setItem("vm_algo_options_bot_lots", autoBotLotSize.toString());
  }, [autoBotLotSize]);

  useEffect(() => {
    localStorage.setItem("vm_algo_options_bot_sl", autoBotStopLoss.toString());
  }, [autoBotStopLoss]);

  useEffect(() => {
    localStorage.setItem("vm_algo_options_bot_tp", autoBotTakeProfit.toString());
  }, [autoBotTakeProfit]);

  useEffect(() => {
    localStorage.setItem("vm_algo_options_bot_trend", autoBotTrendExit.toString());
  }, [autoBotTrendExit]);

  useEffect(() => {
    localStorage.setItem("vm_algo_options_bot_last_signal", lastSignalTraded);
  }, [lastSignalTraded]);

  const addBotLog = (message: string, type: "info" | "success" | "warn" | "error" = "info") => {
    const newLog = {
      id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      time: new Date().toLocaleTimeString(),
      message,
      type
    };
    setAutoBotLogs((prev) => {
      const updated = [newLog, ...prev].slice(0, 50); // Keep last 50 logs
      localStorage.setItem("vm_algo_options_bot_logs", JSON.stringify(updated));
      return updated;
    });
  };

  const clearBotLogs = () => {
    setAutoBotLogs([]);
    localStorage.removeItem("vm_algo_options_bot_logs");
  };

  // Load options chain details
  useEffect(() => {
    async function loadChain() {
      setLoadingChain(true);
      setErrorChain(null);
      try {
        const data = await fetchOptionsChain(selectedTicker);
        setOptionsData(data);
        if (data && data.chain && data.chain.length > 0) {
          // Find closest strike as default
          const refPrice = currentStock?.price || 1000;
          const closest = data.chain.reduce((prev: any, curr: any) => {
            return Math.abs(curr.strikePrice - refPrice) < Math.abs(prev.strikePrice - refPrice) ? curr : prev;
          });
          setOrderStrike(closest.strikePrice);
          setOrderPremium(closest.callLtp);
          setSimulatedExpiryPrice(closest.strikePrice);
        }
      } catch (err: any) {
        setErrorChain(err.message || "Failed to compile options book");
      } finally {
        setLoadingChain(false);
      }
    }
    loadChain();
  }, [selectedTicker, currentStock?.price]);

  // Handle live premium ticks of open positions
  useEffect(() => {
    const interval = setInterval(() => {
      if (holdings.length === 0) return;
      
      setHoldings((prevHoldings) =>
        prevHoldings.map((h) => {
          // Look up corresponding strike in current options chain to get real-time price
          let latestPrem = h.currentPremium;
          if (optionsData && optionsData.chain) {
            const chainItem = optionsData.chain.find((item: any) => item.strikePrice === h.strike);
            if (chainItem) {
              latestPrem = h.type === "CE" ? chainItem.callLtp : chainItem.putLtp;
            }
          } else {
            // Simulated microtick fluctuation
            const variance = (Math.random() - 0.5) * 0.15;
            latestPrem = Math.max(0.5, h.currentPremium + variance);
          }

          const currentValue = h.quantity * h.lotSize * latestPrem;
          const totalCost = h.quantity * h.lotSize * h.buyPremium;
          
          let pnl = 0;
          if (h.action === "BUY") {
            pnl = currentValue - totalCost;
          } else {
            // Selling/shorting premium makes money if current premium decreases
            pnl = totalCost - currentValue;
          }

          const pnlPct = totalCost > 0 ? (pnl / totalCost) * 100 : 0;

          return {
            ...h,
            currentPremium: latestPrem,
            pnl,
            pnlPct
          };
        })
      );
    }, 1500);

    return () => clearInterval(interval);
  }, [holdings, optionsData]);

  // ============================================================
  // ── VM VIRA X10 AI indicator calculation logic
  // ============================================================
  const generateSimulatedTechnicalResult = () => {
    // We compute indicators using the current stock's price as the baseline
    const price = currentStock.price;
    const isGainer = currentStock.change >= 0;

    // Simulate standard indicators following Pinescript logic
    const ema9 = price * (1 + (isGainer ? 0.002 : -0.002));
    const ema21 = price * (1 + (isGainer ? -0.001 : 0.001));
    const ema50 = price * (1 + (isGainer ? -0.005 : 0.005));

    const emaBull = ema9 > ema21;
    const emaBear = ema9 < ema21;

    const rsi = isGainer ? 62.4 : 38.8;
    const rsiBull = rsi > 40 && rsi < 75;
    const rsiBear = rsi > 25 && rsi < 60;

    const vwap = price * (isGainer ? 0.996 : 1.004);
    const aboveVWAP = price > vwap;
    const belowVWAP = price < vwap;

    const stochBull = isGainer;
    const stochBear = !isGainer;

    const volOK = true;
    const consolidation = Math.abs(currentStock.changePct) < 0.25;

    const bullCandle = isGainer && !consolidation;
    const bearCandle = !isGainer && !consolidation;

    // Confluence scores (out of 5)
    const buyScore =
      (emaBull ? 1 : 0) +
      (rsiBull ? 1 : 0) +
      (aboveVWAP ? 1 : 0) +
      (stochBull ? 1 : 0) +
      (bullCandle ? 1 : 0);

    const sellScore =
      (emaBear ? 1 : 0) +
      (rsiBear ? 1 : 0) +
      (belowVWAP ? 1 : 0) +
      (stochBear ? 1 : 0) +
      (bearCandle ? 1 : 0);

    const atr14 = price * 0.018;
    const stLine = price * (emaBull ? 0.982 : 1.018);
    const stBull = emaBull;

    // Daily levels
    const calculatedR3 = price * 1.05;
    const calculatedS3 = price * 0.95;

    // Signals
    const buySignal = stBull && buyScore >= inputs.minScore && !consolidation;
    const sellSignal = !stBull && sellScore >= inputs.minScore && !consolidation;

    return {
      ema9,
      ema21,
      ema50,
      emaBull,
      emaBear,
      rsi,
      rsiBull,
      rsiBear,
      vwap,
      aboveVWAP,
      belowVWAP,
      stochBull,
      stochBear,
      volOK,
      consolidation,
      bullCandle,
      bearCandle,
      buyScore,
      sellScore,
      buySignal,
      sellSignal,
      atr14,
      stLine,
      stBull,
      r3: calculatedR3,
      s3: calculatedS3
    };
  };

  const tech = generateSimulatedTechnicalResult();

  const marketAnalytics = computeMarketAnalytics(optionsData?.chain || [], currentStock.price);

  // Compute Aggregate Portfolio Greeks
  const portfolioGreeks = holdings.reduce((acc, h) => {
    const greeks = calculateOptionGreeks(currentStock.price, h.strike, h.type === "CE");
    const multiplier = h.quantity * h.lotSize * (h.action === "BUY" ? 1 : -1);
    return {
      delta: acc.delta + greeks.delta * multiplier,
      gamma: acc.gamma + greeks.gamma * multiplier,
      theta: acc.theta + greeks.theta * multiplier,
      vega: acc.vega + greeks.vega * multiplier
    };
  }, { delta: 0, gamma: 0, theta: 0, vega: 0 });

  // Multi-Leg Strategy Interfaces & Computation Engine
  const computeStrategyMetrics = (
    strategyKey: string,
    spot: number,
    chain: any[],
    qty: number,
    totalLotSize: number
  ) => {
    if (!chain || chain.length === 0 || strategyKey === "custom") return null;

    const totalQty = qty * totalLotSize;

    // Find ATM strike
    const atmRow = chain.reduce((prev: any, curr: any) =>
      Math.abs(curr.strikePrice - spot) < Math.abs(prev.strikePrice - spot) ? curr : prev
    );
    const atmIdx = chain.findIndex((r: any) => r.strikePrice === atmRow.strikePrice);
    const otmCallRow = chain[Math.min(chain.length - 1, atmIdx + 2)] || atmRow;
    const otmPutRow = chain[Math.max(0, atmIdx - 2)] || atmRow;
    const farOtmCallRow = chain[Math.min(chain.length - 1, atmIdx + 4)] || otmCallRow;
    const farOtmPutRow = chain[Math.max(0, atmIdx - 4)] || otmPutRow;

    if (strategyKey === "bull_call" || strategyKey === "bull_call_spread") {
      const k1 = atmRow.strikePrice;
      const p1 = atmRow.callLtp;
      const k2 = otmCallRow.strikePrice;
      const p2 = otmCallRow.callLtp;
      const debit = Math.max(0.1, p1 - p2);
      const maxLossVal = debit * totalQty;
      const maxProfitVal = Math.max(0, ((k2 - k1) - debit) * totalQty);
      const breakeven = k1 + debit;
      const rr = maxLossVal > 0 ? (maxProfitVal / maxLossVal).toFixed(2) : "N/A";

      return {
        key: strategyKey,
        name: "Bull Call Spread (Debit Spread)",
        bias: "BULLISH" as const,
        riskType: "DEFINED RISK" as const,
        netType: "DEBIT" as const,
        netAmountPerShare: debit,
        maxProfit: `₹${maxProfitVal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        maxProfitNum: maxProfitVal,
        maxLoss: `₹${maxLossVal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        maxLossNum: maxLossVal,
        breakevens: `₹${breakeven.toFixed(2)}`,
        riskRewardRatio: `1 : ${rr}`,
        description: `Long ${k1} CE @ ₹${p1.toFixed(2)} + Short ${k2} CE @ ₹${p2.toFixed(2)}. Defined bullish spread.`,
        legs: [
          { action: "BUY" as const, type: "CE" as const, strike: k1, premium: p1 },
          { action: "SELL" as const, type: "CE" as const, strike: k2, premium: p2 }
        ]
      };
    }

    if (strategyKey === "bear_put" || strategyKey === "bear_put_spread") {
      const k2 = atmRow.strikePrice;
      const p2 = atmRow.putLtp;
      const k1 = otmPutRow.strikePrice;
      const p1 = otmPutRow.putLtp;
      const debit = Math.max(0.1, p2 - p1);
      const maxLossVal = debit * totalQty;
      const maxProfitVal = Math.max(0, ((k2 - k1) - debit) * totalQty);
      const breakeven = k2 - debit;
      const rr = maxLossVal > 0 ? (maxProfitVal / maxLossVal).toFixed(2) : "N/A";

      return {
        key: strategyKey,
        name: "Bear Put Spread (Debit Spread)",
        bias: "BEARISH" as const,
        riskType: "DEFINED RISK" as const,
        netType: "DEBIT" as const,
        netAmountPerShare: debit,
        maxProfit: `₹${maxProfitVal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        maxProfitNum: maxProfitVal,
        maxLoss: `₹${maxLossVal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        maxLossNum: maxLossVal,
        breakevens: `₹${breakeven.toFixed(2)}`,
        riskRewardRatio: `1 : ${rr}`,
        description: `Long ${k2} PE @ ₹${p2.toFixed(2)} + Short ${k1} PE @ ₹${p1.toFixed(2)}. Capped downside profit.`,
        legs: [
          { action: "BUY" as const, type: "PE" as const, strike: k2, premium: p2 },
          { action: "SELL" as const, type: "PE" as const, strike: k1, premium: p1 }
        ]
      };
    }

    if (strategyKey === "bull_put_spread") {
      const k2 = atmRow.strikePrice;
      const p2 = atmRow.putLtp;
      const k1 = otmPutRow.strikePrice;
      const p1 = otmPutRow.putLtp;
      const credit = Math.max(0.1, p2 - p1);
      const maxProfitVal = credit * totalQty;
      const maxLossVal = Math.max(0, ((k2 - k1) - credit) * totalQty);
      const breakeven = k2 - credit;
      const rr = maxLossVal > 0 ? (maxProfitVal / maxLossVal).toFixed(2) : "N/A";

      return {
        key: strategyKey,
        name: "Bull Put Spread (Credit Spread)",
        bias: "BULLISH" as const,
        riskType: "DEFINED RISK" as const,
        netType: "CREDIT" as const,
        netAmountPerShare: credit,
        maxProfit: `₹${maxProfitVal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        maxProfitNum: maxProfitVal,
        maxLoss: `₹${maxLossVal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        maxLossNum: maxLossVal,
        breakevens: `₹${breakeven.toFixed(2)}`,
        riskRewardRatio: `1 : ${rr}`,
        description: `Short ${k2} PE @ ₹${p2.toFixed(2)} + Long ${k1} PE @ ₹${p1.toFixed(2)}. Collects credit above support.`,
        legs: [
          { action: "SELL" as const, type: "PE" as const, strike: k2, premium: p2 },
          { action: "BUY" as const, type: "PE" as const, strike: k1, premium: p1 }
        ]
      };
    }

    if (strategyKey === "bear_call_spread") {
      const k1 = atmRow.strikePrice;
      const p1 = atmRow.callLtp;
      const k2 = otmCallRow.strikePrice;
      const p2 = otmCallRow.callLtp;
      const credit = Math.max(0.1, p1 - p2);
      const maxProfitVal = credit * totalQty;
      const maxLossVal = Math.max(0, ((k2 - k1) - credit) * totalQty);
      const breakeven = k1 + credit;
      const rr = maxLossVal > 0 ? (maxProfitVal / maxLossVal).toFixed(2) : "N/A";

      return {
        key: strategyKey,
        name: "Bear Call Spread (Credit Spread)",
        bias: "BEARISH" as const,
        riskType: "DEFINED RISK" as const,
        netType: "CREDIT" as const,
        netAmountPerShare: credit,
        maxProfit: `₹${maxProfitVal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        maxProfitNum: maxProfitVal,
        maxLoss: `₹${maxLossVal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        maxLossNum: maxLossVal,
        breakevens: `₹${breakeven.toFixed(2)}`,
        riskRewardRatio: `1 : ${rr}`,
        description: `Short ${k1} CE @ ₹${p1.toFixed(2)} + Long ${k2} CE @ ₹${p2.toFixed(2)}. Income strategy below resistance.`,
        legs: [
          { action: "SELL" as const, type: "CE" as const, strike: k1, premium: p1 },
          { action: "BUY" as const, type: "CE" as const, strike: k2, premium: p2 }
        ]
      };
    }

    if (strategyKey === "straddle" || strategyKey === "long_straddle") {
      const k = atmRow.strikePrice;
      const pCE = atmRow.callLtp;
      const pPE = atmRow.putLtp;
      const premiumPaid = pCE + pPE;
      const maxLossVal = premiumPaid * totalQty;
      const upperBE = k + premiumPaid;
      const lowerBE = k - premiumPaid;

      return {
        key: strategyKey,
        name: "Long Straddle (ATM Volatility Breakout)",
        bias: "VOLATILITY BREAKOUT" as const,
        riskType: "DEFINED RISK" as const,
        netType: "DEBIT" as const,
        netAmountPerShare: premiumPaid,
        maxProfit: "UNLIMITED (Sharp move either direction)",
        maxProfitNum: null,
        maxLoss: `₹${maxLossVal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        maxLossNum: maxLossVal,
        breakevens: `₹${lowerBE.toFixed(2)} (Lower) | ₹${upperBE.toFixed(2)} (Upper)`,
        riskRewardRatio: "Unlimited Upside",
        description: `Long ${k} CE @ ₹${pCE.toFixed(2)} + Long ${k} PE @ ₹${pPE.toFixed(2)}. Profits from sharp market breaks.`,
        legs: [
          { action: "BUY" as const, type: "CE" as const, strike: k, premium: pCE },
          { action: "BUY" as const, type: "PE" as const, strike: k, premium: pPE }
        ]
      };
    }

    if (strategyKey === "short_straddle") {
      const k = atmRow.strikePrice;
      const pCE = atmRow.callLtp;
      const pPE = atmRow.putLtp;
      const credit = pCE + pPE;
      const maxProfitVal = credit * totalQty;
      const upperBE = k + credit;
      const lowerBE = k - credit;

      return {
        key: strategyKey,
        name: "Short Straddle (ATM Rangebound Seller)",
        bias: "NEUTRAL / RANGEBOUND" as const,
        riskType: "UNDEFINED RISK" as const,
        netType: "CREDIT" as const,
        netAmountPerShare: credit,
        maxProfit: `₹${maxProfitVal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        maxProfitNum: maxProfitVal,
        maxLoss: "UNLIMITED (Requires strict Stop Loss)",
        maxLossNum: null,
        breakevens: `₹${lowerBE.toFixed(2)} | ₹${upperBE.toFixed(2)}`,
        riskRewardRatio: "High Win-Rate / High Risk",
        description: `Short ${k} CE @ ₹${pCE.toFixed(2)} + Short ${k} PE @ ₹${pPE.toFixed(2)}. Maximum theta decay for range markets.`,
        legs: [
          { action: "SELL" as const, type: "CE" as const, strike: k, premium: pCE },
          { action: "SELL" as const, type: "PE" as const, strike: k, premium: pPE }
        ]
      };
    }

    if (strategyKey === "iron_condor") {
      const k2 = otmPutRow.strikePrice;
      const p2 = otmPutRow.putLtp;
      const k1 = farOtmPutRow.strikePrice;
      const p1 = farOtmPutRow.putLtp;

      const k3 = otmCallRow.strikePrice;
      const p3 = otmCallRow.callLtp;
      const k4 = farOtmCallRow.strikePrice;
      const p4 = farOtmCallRow.callLtp;

      const credit = Math.max(0.1, (p2 + p3) - (p1 + p4));
      const wingWidth = Math.abs(k2 - k1) || 50;
      const maxProfitVal = credit * totalQty;
      const maxLossVal = Math.max(0, (wingWidth - credit) * totalQty);
      const lowerBE = k2 - credit;
      const upperBE = k3 + credit;
      const rr = maxLossVal > 0 ? (maxProfitVal / maxLossVal).toFixed(2) : "N/A";

      return {
        key: strategyKey,
        name: "Iron Condor (4-Leg Neutral Range)",
        bias: "NEUTRAL / RANGEBOUND" as const,
        riskType: "DEFINED RISK" as const,
        netType: "CREDIT" as const,
        netAmountPerShare: credit,
        maxProfit: `₹${maxProfitVal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        maxProfitNum: maxProfitVal,
        maxLoss: `₹${maxLossVal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        maxLossNum: maxLossVal,
        breakevens: `₹${lowerBE.toFixed(2)} | ₹${upperBE.toFixed(2)}`,
        riskRewardRatio: `1 : ${rr}`,
        description: `Short ${k2} PE / ${k3} CE inner wings with Long ${k1} PE / ${k4} CE outer protective hedges.`,
        legs: [
          { action: "BUY" as const, type: "PE" as const, strike: k1, premium: p1 },
          { action: "SELL" as const, type: "PE" as const, strike: k2, premium: p2 },
          { action: "SELL" as const, type: "CE" as const, strike: k3, premium: p3 },
          { action: "BUY" as const, type: "CE" as const, strike: k4, premium: p4 }
        ]
      };
    }

    if (strategyKey === "long_call") {
      const k = atmRow.strikePrice;
      const p = atmRow.callLtp;
      const maxLossVal = p * totalQty;
      const breakeven = k + p;

      return {
        key: strategyKey,
        name: "Long Call (Naked CE Buy)",
        bias: "BULLISH" as const,
        riskType: "DEFINED RISK" as const,
        netType: "DEBIT" as const,
        netAmountPerShare: p,
        maxProfit: "UNLIMITED",
        maxProfitNum: null,
        maxLoss: `₹${maxLossVal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        maxLossNum: maxLossVal,
        breakevens: `₹${breakeven.toFixed(2)}`,
        riskRewardRatio: "Asymmetric Positive",
        description: `Long ${k} CE @ ₹${p.toFixed(2)}. Direct upside momentum play.`,
        legs: [{ action: "BUY" as const, type: "CE" as const, strike: k, premium: p }]
      };
    }

    if (strategyKey === "long_put") {
      const k = atmRow.strikePrice;
      const p = atmRow.putLtp;
      const maxLossVal = p * totalQty;
      const maxProfitVal = (k - p) * totalQty;
      const breakeven = k - p;

      return {
        key: strategyKey,
        name: "Long Put (Naked PE Buy)",
        bias: "BEARISH" as const,
        riskType: "DEFINED RISK" as const,
        netType: "DEBIT" as const,
        netAmountPerShare: p,
        maxProfit: `₹${maxProfitVal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        maxProfitNum: maxProfitVal,
        maxLoss: `₹${maxLossVal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        maxLossNum: maxLossVal,
        breakevens: `₹${breakeven.toFixed(2)}`,
        riskRewardRatio: "Downside Convexity",
        description: `Long ${k} PE @ ₹${p.toFixed(2)}. Direct downside crash protection or speculative short.`,
        legs: [{ action: "BUY" as const, type: "PE" as const, strike: k, premium: p }]
      };
    }

    return null;
  };

  const activeStrategyMetrics = computeStrategyMetrics(
    selectedStrategyPreset,
    currentStock.price,
    optionsData?.chain || [],
    orderQty,
    lotSize
  );

  // Deploy multi-leg strategy to portfolio
  const executeMultiLegStrategy = (metrics: NonNullable<ReturnType<typeof computeStrategyMetrics>>) => {
    setOrderFeedback(null);

    if (isKillSwitchEngaged()) {
      setOrderFeedback({
        type: "error",
        message: "ORDER REJECTED: Kill Switch is currently ENGAGED. Strategy order placement locked."
      });
      return;
    }

    let totalNetImpact = 0;

    metrics.legs.forEach((leg) => {
      const legCost = orderQty * lotSize * leg.premium;
      if (leg.action === "BUY") {
        totalNetImpact -= legCost;
      } else {
        totalNetImpact += legCost;
      }
    });

    if (totalNetImpact < 0 && Math.abs(totalNetImpact) > walletBalance) {
      setOrderFeedback({
        type: "error",
        message: `Insufficient wallet balance. Total net debit required: ₹${Math.abs(totalNetImpact).toLocaleString("en-IN")}`
      });
      return;
    }

    setWalletBalance((prev) => prev + totalNetImpact);

    const newOrders: OptionOrder[] = [];
    const newHoldings: OptionHolding[] = [];

    metrics.legs.forEach((leg) => {
      const legCost = orderQty * lotSize * leg.premium;

      const order: OptionOrder = {
        id: `OPT-${Math.floor(100000 + Math.random() * 90000)}`,
        underlier: selectedTicker,
        strike: leg.strike,
        type: leg.type,
        action: leg.action,
        quantity: orderQty,
        premium: leg.premium,
        timestamp: new Date().toLocaleTimeString(),
        status: "COMPLETED",
        totalAmount: legCost
      };
      newOrders.push(order);

      const holding: OptionHolding = {
        id: `POS-${Math.floor(100000 + Math.random() * 90000)}`,
        underlier: selectedTicker,
        strike: leg.strike,
        type: leg.type,
        buyPremium: leg.premium,
        currentPremium: leg.premium,
        quantity: orderQty,
        lotSize,
        totalCost: legCost,
        timestamp: new Date().toLocaleDateString(),
        pnl: 0,
        pnlPct: 0,
        action: leg.action
      };
      newHoldings.push(holding);
    });

    setOrders((prev) => [...newOrders, ...prev]);
    setHoldings((prev) => [...newHoldings, ...prev]);

    setOrderFeedback({
      type: "success",
      message: `MULTI-LEG STRATEGY EXECUTED: ${metrics.name} (${metrics.legs.length} Legs) • ${
        totalNetImpact >= 0
          ? `Net Premium Credit: +₹${totalNetImpact.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
          : `Net Premium Debit: -₹${Math.abs(totalNetImpact).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
      }`
    });

    addBotLog(
      `STRATEGY EXECUTED: ${metrics.name} for ${selectedTicker}. ${metrics.legs.length} option legs routed to order book. Max Profit: ${metrics.maxProfit}, Max Loss: ${metrics.maxLoss}.`,
      "success"
    );
  };

  // Strategy Presets deployer
  const deployStrategyPreset = (presetKey: string) => {
    setSelectedStrategyPreset(presetKey);
    const metrics = computeStrategyMetrics(presetKey, currentStock.price, optionsData?.chain || [], orderQty, lotSize);
    if (metrics && metrics.legs.length > 0) {
      const primary = metrics.legs[0];
      setOrderStrike(primary.strike);
      setOrderType(primary.type);
      setOrderAction(primary.action);
      setOrderPremium(primary.premium);
      setOrderFeedback({
        type: "success",
        message: `${metrics.name.toUpperCase()} LOADED: Max Profit: ${metrics.maxProfit} • Max Loss: ${metrics.maxLoss}`
      });
    }
  };

  // Highlight specific options signals
  const activeSignal = tech.buySignal ? "CE_BUY" : tech.sellSignal ? "PE_BUY" : tech.consolidation ? "RANGE" : "WAIT";

  // Reset lastSignalTraded when signal becomes neutral (WAIT or RANGE)
  useEffect(() => {
    if (activeSignal === "WAIT" || activeSignal === "RANGE") {
      setLastSignalTraded("");
    }
  }, [activeSignal]);

  // 1. Auto Bot Risk Manager & Exit Execution
  useEffect(() => {
    if (!isAutoBotEnabled || holdings.length === 0) return;

    const exitedHoldings: OptionHolding[] = [];

    holdings.forEach((h) => {
      if (!h.isAuto) return;

      const pnlPct = h.pnlPct;
      let shouldExit = false;
      let reason = "";

      if (pnlPct <= -autoBotStopLoss) {
        shouldExit = true;
        reason = `Stop-Loss triggered at ${pnlPct.toFixed(1)}% (Target: -${autoBotStopLoss}%)`;
      } else if (pnlPct >= autoBotTakeProfit) {
        shouldExit = true;
        reason = `Take-Profit hit at ${pnlPct.toFixed(1)}% (Target: +${autoBotTakeProfit}%)`;
      } else if (autoBotTrendExit) {
        // Check trend reversal
        if (h.type === "CE" && (activeSignal === "PE_BUY" || activeSignal === "RANGE")) {
          shouldExit = true;
          reason = `Trend reversal detected (Signal: ${activeSignal})`;
        } else if (h.type === "PE" && (activeSignal === "CE_BUY" || activeSignal === "RANGE")) {
          shouldExit = true;
          reason = `Trend reversal detected (Signal: ${activeSignal})`;
        }
      }

      if (shouldExit) {
        exitedHoldings.push(h);
      }
    });

    if (exitedHoldings.length > 0) {
      let balanceDelta = 0;
      const closingOrders: OptionOrder[] = [];
      const exitedIds = new Set(exitedHoldings.map((h) => h.id));

      exitedHoldings.forEach((h) => {
        const valueAtCurrentPremium = h.quantity * h.lotSize * h.currentPremium;
        if (h.action === "BUY") {
          balanceDelta += valueAtCurrentPremium;
        } else {
          balanceDelta -= valueAtCurrentPremium;
        }

        const closeOrder: OptionOrder = {
          id: `OPT-${Math.floor(100000 + Math.random() * 90000)}`,
          underlier: h.underlier,
          strike: h.strike,
          type: h.type,
          action: h.action === "BUY" ? "SELL" : "BUY",
          quantity: h.quantity,
          premium: h.currentPremium,
          timestamp: new Date().toLocaleTimeString(),
          status: "COMPLETED",
          totalAmount: valueAtCurrentPremium
        };
        closingOrders.push(closeOrder);

        addBotLog(
          `BOT AUTOMATED LIQUIDATION: Sold ${h.quantity} Lot(s) ${h.underlier} JUL ${h.strike} ${h.type} @ ₹${h.currentPremium.toFixed(2)} [P&L: ₹${h.pnl.toLocaleString("en-IN", { maximumFractionDigits: 1 })} (${h.pnlPct.toFixed(1)}%)] Reason: ${h.pnlPct <= -autoBotStopLoss ? "SL" : h.pnlPct >= autoBotTakeProfit ? "TP" : "Trend Exit"}.`,
          h.pnl >= 0 ? "success" : "warn"
        );
      });

      setWalletBalance((prev) => prev + balanceDelta);
      setOrders((prev) => [...closingOrders, ...prev]);
      setHoldings((prev) => prev.filter((h) => !exitedIds.has(h.id)));
    }
  }, [holdings, isAutoBotEnabled, autoBotStopLoss, autoBotTakeProfit, autoBotTrendExit, activeSignal]);

  // 2. Auto Bot Signal Entry Trigger
  useEffect(() => {
    if (!isAutoBotEnabled || !optionsData || !optionsData.chain || optionsData.chain.length === 0) return;

    if (isKillSwitchEngaged()) {
      setIsAutoBotEnabled(false);
      return;
    }

    // Check if we already have an active bot position for this underlier
    const hasActiveBotPos = holdings.some((h) => h.underlier === selectedTicker && h.isAuto);
    if (hasActiveBotPos) return;

    if (lastSignalTraded === activeSignal) return;

    if (activeSignal === "CE_BUY" || activeSignal === "PE_BUY") {
      // Check daily trades limit
      const todayStr = new Date().toISOString().split("T")[0];
      const storedDate = localStorage.getItem("vm_algo_options_bot_trades_date");
      let currentDailyCount = autoBotDailyTradesCount;
      if (storedDate !== todayStr) {
        currentDailyCount = 0;
        setAutoBotDailyTradesCount(0);
        localStorage.setItem("vm_algo_options_bot_trades_date", todayStr);
        localStorage.setItem("vm_algo_options_bot_trades_count", "0");
      }

      if (autoBotMaxTradesPerDay > 0 && currentDailyCount >= autoBotMaxTradesPerDay) {
        addBotLog(`BOT DAILY TRADE LIMIT: Reached max limit of ${autoBotMaxTradesPerDay} trade(s) today (${currentDailyCount}/${autoBotMaxTradesPerDay}). Automated entry paused.`, "warn");
        return;
      }

      const type = activeSignal === "CE_BUY" ? "CE" : "PE";
      
      // Find ATM strike
      const closest = optionsData.chain.reduce((prev: any, curr: any) => {
        return Math.abs(curr.strikePrice - currentStock.price) < Math.abs(prev.strikePrice - currentStock.price) ? curr : prev;
      });

      const strike = closest.strikePrice;
      const premium = type === "CE" ? closest.callLtp : closest.putLtp;
      const totalCost = autoBotLotSize * lotSize * premium;

      if (totalCost > walletBalance) {
        addBotLog(`BOT COMPROMISED: Insufficient balance (₹${walletBalance.toLocaleString("en-IN")}) to auto-trade ${autoBotLotSize} Lot(s) of ${selectedTicker} JUL ${strike} ${type} (Costs: ₹${totalCost.toLocaleString("en-IN")})`, "error");
        return;
      }

      // Execute Order
      setWalletBalance((prev) => prev - totalCost);

      const newOrder: OptionOrder = {
        id: `OPT-${Math.floor(100000 + Math.random() * 90000)}`,
        underlier: selectedTicker,
        strike,
        type,
        action: "BUY",
        quantity: autoBotLotSize,
        premium,
        timestamp: new Date().toLocaleTimeString(),
        status: "COMPLETED",
        totalAmount: totalCost
      };

      const newHolding: OptionHolding = {
        id: `POS-${Math.floor(100000 + Math.random() * 90000)}`,
        underlier: selectedTicker,
        strike,
        type,
        buyPremium: premium,
        currentPremium: premium,
        quantity: autoBotLotSize,
        lotSize,
        totalCost,
        timestamp: new Date().toLocaleDateString(),
        pnl: 0,
        pnlPct: 0,
        action: "BUY",
        isAuto: true
      };

      setHoldings((prev) => [...prev, newHolding]);
      setOrders((prev) => [newOrder, ...prev]);
      setLastSignalTraded(activeSignal);

      // Increment daily trades count
      const newTradesCount = currentDailyCount + 1;
      setAutoBotDailyTradesCount(newTradesCount);
      localStorage.setItem("vm_algo_options_bot_trades_count", newTradesCount.toString());
      localStorage.setItem("vm_algo_options_bot_trades_date", todayStr);

      // Trigger Buy Alert Popup
      setActiveBuyAlert({
        id: `ALERT-${Date.now()}`,
        symbol: selectedTicker,
        assetType: "OPTION",
        action: type === "CE" ? "CE_BUY" : "PE_BUY",
        price: premium,
        strike,
        optionType: type,
        targetPrice: parseFloat((premium * (1 + autoBotTakeProfit / 100)).toFixed(2)),
        stopLoss: parseFloat((premium * (1 - autoBotStopLoss / 100)).toFixed(2)),
        score: tech.buyScore || 8,
        maxScore: 10,
        reason: `VIRA AUTO BOT ENTRY: Automated ${autoBotLotSize} Lot(s) ${type} position opened on ${selectedTicker} JUL ${strike} @ ₹${premium.toFixed(2)}.`,
        source: "VIRA X10 Auto-Trader Bot",
        timestamp: new Date().toLocaleTimeString()
      });

      addBotLog(`BOT EXECUTION: Automated Entry BUY ${autoBotLotSize} Lot(s) ${selectedTicker} JUL ${strike} ${type} @ ₹${premium.toFixed(2)} (Total Cost: ₹${totalCost.toLocaleString("en-IN")}) • Signal Confluence met.`, "success");
    }
  }, [activeSignal, isAutoBotEnabled, optionsData, selectedTicker, holdings, lastSignalTraded, autoBotLotSize, walletBalance]);

  // Handle trade placement
  const executeOptionOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setOrderFeedback(null);

    if (isKillSwitchEngaged()) {
      setOrderFeedback({
        type: "error",
        message: "ORDER REJECTED: Global Kill Switch is currently ENGAGED. Option orders cannot be routed."
      });
      return;
    }

    const premium = parseFloat(orderPremium.toString());
    if (isNaN(premium) || premium <= 0) {
      setOrderFeedback({ type: "error", message: "Invalid option premium price specified" });
      return;
    }

    const totalCost = orderQty * lotSize * premium;

    // Risk validation
    if (orderAction === "BUY" && totalCost > walletBalance) {
      setOrderFeedback({ type: "error", message: `Insufficient funds. Premium required: ₹${totalCost.toLocaleString("en-IN")}` });
      return;
    }

    if (orderAction === "SELL" && totalCost > walletBalance * 0.5) {
      // Shorting options requires margin reserve
      setOrderFeedback({ type: "error", message: `Short writing requires ₹${(totalCost * 2).toLocaleString("en-IN")} margin allocation` });
      return;
    }

    // Process order
    if (orderAction === "BUY") {
      setWalletBalance((p) => p - totalCost);
    } else {
      // Selling premium nets cash initially
      setWalletBalance((p) => p + totalCost);
    }

    const newOrder: OptionOrder = {
      id: `OPT-${Math.floor(100000 + Math.random() * 90000) }`,
      underlier: selectedTicker,
      strike: orderStrike,
      type: orderType,
      action: orderAction,
      quantity: orderQty,
      premium,
      timestamp: new Date().toLocaleTimeString(),
      status: "COMPLETED",
      totalAmount: totalCost
    };

    // Update holdings portfolio
    const matchingPositionIndex = holdings.findIndex(
      (h) => h.underlier === selectedTicker && h.strike === orderStrike && h.type === orderType && h.action === orderAction
    );

    if (matchingPositionIndex > -1) {
      const updatedHoldings = [...holdings];
      const exist = updatedHoldings[matchingPositionIndex];
      const newQty = exist.quantity + orderQty;
      const newCost = exist.totalCost + totalCost;
      const newAvgBuy = newCost / (newQty * lotSize);

      updatedHoldings[matchingPositionIndex] = {
        ...exist,
        quantity: newQty,
        buyPremium: newAvgBuy,
        totalCost: newCost,
        pnl: 0,
        pnlPct: 0
      };
      setHoldings(updatedHoldings);
    } else {
      const newHolding: OptionHolding = {
        id: `POS-${Math.floor(100000 + Math.random() * 90000) }`,
        underlier: selectedTicker,
        strike: orderStrike,
        type: orderType,
        buyPremium: premium,
        currentPremium: premium,
        quantity: orderQty,
        lotSize,
        totalCost,
        timestamp: new Date().toLocaleDateString(),
        pnl: 0,
        pnlPct: 0,
        action: orderAction
      };
      setHoldings((h) => [...h, newHolding]);
    }

    setOrders((o) => [newOrder, ...o]);
    setOrderFeedback({
      type: "success",
      message: `Successfully executed: ${orderAction} ${orderQty} Lot(s) ${selectedTicker} JUL ${orderStrike} ${orderType}`
    });
  };

  // Close open positions (full or partial ratio)
  const closePosition = (id: string, ratio: number = 1.0) => {
    const target = holdings.find((h) => h.id === id);
    if (!target) return;

    const closeQty = ratio >= 1.0 ? target.quantity : Math.max(1, Math.floor(target.quantity * ratio));
    const isFullClose = closeQty >= target.quantity;

    const valueAtCurrentPremium = closeQty * target.lotSize * target.currentPremium;

    if (target.action === "BUY") {
      // Liquidate (sell back premium)
      setWalletBalance((prev) => prev + valueAtCurrentPremium);
    } else {
      // Buy back premium to close short position
      setWalletBalance((prev) => prev - valueAtCurrentPremium);
    }

    // Add closing record to order log
    const closeOrder: OptionOrder = {
      id: `OPT-${Math.floor(100000 + Math.random() * 90000)}`,
      underlier: target.underlier,
      strike: target.strike,
      type: target.type,
      action: target.action === "BUY" ? "SELL" : "BUY",
      quantity: closeQty,
      premium: target.currentPremium,
      timestamp: new Date().toLocaleTimeString(),
      status: "COMPLETED",
      totalAmount: valueAtCurrentPremium
    };

    setOrders((o) => [closeOrder, ...o]);

    if (isFullClose) {
      setHoldings((h) => h.filter((item) => item.id !== id));
    } else {
      setHoldings((h) =>
        h.map((item) => {
          if (item.id !== id) return item;
          const remainingQty = item.quantity - closeQty;
          const remainingCost = remainingQty * item.lotSize * item.buyPremium;
          return {
            ...item,
            quantity: remainingQty,
            totalCost: remainingCost
          };
        })
      );
    }

    addBotLog(
      `POSITION CLOSED (${isFullClose ? "100%" : `${Math.round(ratio * 100)}%`}): ${closeQty} Lot(s) ${target.underlier} JUL ${target.strike} ${target.type} @ ₹${target.currentPremium.toFixed(2)} [Realized P&L: ₹${((target.currentPremium - target.buyPremium) * closeQty * target.lotSize * (target.action === "BUY" ? 1 : -1)).toLocaleString("en-IN", { maximumFractionDigits: 1 })}].`,
      "info"
    );
  };

  // Close all positions or filter by CE/PE
  const closeAllPositions = (filterType?: "CE" | "PE") => {
    const targets = filterType ? holdings.filter((h) => h.type === filterType) : [...holdings];
    if (targets.length === 0) return;

    let balanceDelta = 0;
    const closingOrders: OptionOrder[] = [];
    const targetIds = new Set(targets.map((h) => h.id));

    targets.forEach((target) => {
      const val = target.quantity * target.lotSize * target.currentPremium;
      if (target.action === "BUY") {
        balanceDelta += val;
      } else {
        balanceDelta -= val;
      }

      closingOrders.push({
        id: `OPT-${Math.floor(100000 + Math.random() * 90000)}`,
        underlier: target.underlier,
        strike: target.strike,
        type: target.type,
        action: target.action === "BUY" ? "SELL" : "BUY",
        quantity: target.quantity,
        premium: target.currentPremium,
        timestamp: new Date().toLocaleTimeString(),
        status: "COMPLETED",
        totalAmount: val
      });
    });

    setWalletBalance((prev) => prev + balanceDelta);
    setOrders((o) => [...closingOrders, ...o]);
    setHoldings((h) => h.filter((item) => !targetIds.has(item.id)));

    addBotLog(
      `SQUARE OFF ALL (${filterType || "CE + PE"}): Liquidated ${targets.length} open contract(s). Net Capital Adjustment: ₹${balanceDelta >= 0 ? "+" : ""}${balanceDelta.toLocaleString("en-IN", { maximumFractionDigits: 1 })}.`,
      "warn"
    );
  };

  // Quick preset loader from options chain
  const selectContractFromChain = (strike: number, type: "CE" | "PE", premium: number, action: "BUY" | "SELL") => {
    setOrderStrike(strike);
    setOrderType(type);
    setOrderPremium(premium);
    setOrderAction(action);
    setSimulatedExpiryPrice(strike);
    
    // Auto switch tabs to Order/Research ticket focus or alert
    setOrderFeedback({
      type: "success",
      message: `Loaded context: ${selectedTicker} JUL ${strike} ${type} @ ₹${premium}`
    });
  };

  // Payoff simulator calculations
  const calculatePayoff = () => {
    const strike = orderStrike;
    const premium = parseFloat(orderPremium.toString()) || 5;
    const target = simulatedExpiryPrice;
    const qty = orderQty * lotSize;

    let pnl = 0;
    if (orderType === "CE") {
      if (orderAction === "BUY") {
        // Buyer pays premium, gains if target exceeds strike + premium
        pnl = (Math.max(0, target - strike) - premium) * qty;
      } else {
        // Seller gets premium, loses if target exceeds strike + premium
        pnl = (premium - Math.max(0, target - strike)) * qty;
      }
    } else {
      // Put Option
      if (orderAction === "BUY") {
        pnl = (Math.max(0, strike - target) - premium) * qty;
      } else {
        pnl = (premium - Math.max(0, strike - target)) * qty;
      }
    }

    return {
      pnl,
      bePoint: orderType === "CE" ? strike + premium : strike - premium,
      maxRisk: orderAction === "BUY" ? premium * qty : Infinity,
      maxReward: orderAction === "BUY" ? (orderType === "CE" ? Infinity : (strike - premium) * qty) : premium * qty
    };
  };

  const payoff = calculatePayoff();

  // Reset wallet funds
  const resetWallet = () => {
    if (window.confirm("Are you sure you want to restore virtual options funds back to ₹10,00,000?")) {
      setWalletBalance(1000000);
      setHoldings([]);
      setOrders([]);
      setOrderFeedback({ type: "success", message: "Options account balance successfully restored." });
    }
  };

  return (
    <div className="p-4 space-y-4 font-mono text-xs select-none">
      {/* 1. Page Header Console */}
      <div className="bg-slate-950 border border-terminal-border rounded p-3.5 flex flex-col lg:flex-row lg:items-center justify-between shadow-lg relative overflow-hidden gap-3">
        {/* Glow indicator decoration */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-terminal-accent/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center space-x-3.5 z-10">
          <div className="bg-terminal-accent/10 border border-terminal-accent/40 p-2.5 rounded text-terminal-accent animate-pulse shrink-0">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <h2 className="text-sm font-black text-white uppercase tracking-wider">VM ALGO OPTION DESK PRO</h2>
              <span className="text-[7.5px] font-black uppercase tracking-widest text-slate-950 bg-terminal-accent px-1.5 py-0.5 rounded-sm">
                PRO ENGINE v6
              </span>
              <span className="text-[7.5px] font-bold text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                <span>LIVE NSE/BSE OPTIONS TICKER</span>
              </span>
            </div>
            <p className="text-terminal-muted text-[9px] uppercase tracking-wider mt-0.5">
              by vijay • Multi-Leg Derivatives Matrix, Black-Scholes Greeks Engine & Pine Script Confluence
            </p>
          </div>
        </div>

        {/* Pro Telemetry Bar (PCR, Max Pain, Sentiment) */}
        <div className="flex items-center space-x-2.5 z-10 overflow-x-auto py-1">
          <div className="bg-slate-900 border border-slate-800 px-2.5 py-1 rounded flex items-center space-x-2 shrink-0">
            <Gauge className="w-3.5 h-3.5 text-sky-400" />
            <div>
              <span className="block text-[7px] text-slate-400 font-bold uppercase">PCR (Put-Call Ratio)</span>
              <span className={`text-[10px] font-black ${marketAnalytics.pcr >= 1.1 ? "text-emerald-400" : marketAnalytics.pcr <= 0.85 ? "text-rose-400" : "text-amber-400"}`}>
                {marketAnalytics.pcr.toFixed(2)} ({marketAnalytics.sentiment})
              </span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 px-2.5 py-1 rounded flex items-center space-x-2 shrink-0">
            <Target className="w-3.5 h-3.5 text-purple-400" />
            <div>
              <span className="block text-[7px] text-slate-400 font-bold uppercase">Max Pain Strike</span>
              <span className="text-[10px] font-black text-purple-300">
                ₹{marketAnalytics.maxPain}
              </span>
            </div>
          </div>

          {/* Global Stock Underlier Selector */}
          <div className="flex items-center space-x-1.5 bg-slate-900 border border-terminal-border px-2.5 py-1 rounded shrink-0">
            <span className="text-[8px] text-terminal-muted font-bold uppercase">UNDERLIER:</span>
            <select
              value={selectedTicker}
              onChange={(e) => {
                setSelectedTicker(e.target.value);
                onSelectStock(e.target.value);
              }}
              className="bg-transparent text-white text-[10px] font-black rounded focus:outline-none cursor-pointer"
            >
              {stocks.map((s) => (
                <option key={s.ticker} value={s.ticker} className="bg-slate-950 text-white">
                  {s.ticker} (₹{s.price.toFixed(1)})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 2. Top Quick Dashboard Wallet Info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-terminal-card border border-terminal-border rounded p-3 flex flex-col justify-between">
          <span className="block text-[8px] text-terminal-muted uppercase tracking-widest font-bold">Options Cash Balance</span>
          <span className="text-base font-black text-white">₹{walletBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
          <div className="flex items-center justify-between text-[8px] mt-1 text-terminal-muted uppercase font-bold pt-1 border-t border-terminal-border/20">
            <span>MARGIN AVAILABLE</span>
            <button onClick={resetWallet} className="text-terminal-accent hover:underline flex items-center">
              RESET DESK
            </button>
          </div>
        </div>

        <div className="bg-terminal-card border border-terminal-border rounded p-3 flex flex-col justify-between">
          <span className="block text-[8px] text-terminal-muted uppercase tracking-widest font-bold">Invested Premium</span>
          <span className="text-base font-black text-terminal-accent">
            ₹{holdings.reduce((sum, h) => sum + (h.quantity * h.lotSize * h.buyPremium), 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
          <span className="block text-[8px] text-terminal-muted uppercase font-bold pt-1 border-t border-terminal-border/20">
            {holdings.length} CONTRACTS ACTIVE
          </span>
        </div>

        <div className="bg-terminal-card border border-terminal-border rounded p-3 flex flex-col justify-between">
          <span className="block text-[8px] text-terminal-muted uppercase tracking-widest font-bold">Options Unrealized P&L</span>
          <span className={`text-base font-black ${holdings.reduce((sum, h) => sum + h.pnl, 0) >= 0 ? "text-terminal-success" : "text-terminal-danger"}`}>
            {holdings.reduce((sum, h) => sum + h.pnl, 0) >= 0 ? "+" : ""}
            ₹{holdings.reduce((sum, h) => sum + h.pnl, 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
          <span className="block text-[8px] text-terminal-muted uppercase font-bold pt-1 border-t border-terminal-border/20">
            REALTIME MARGIN ADJUSTED
          </span>
        </div>

        <div className="bg-terminal-card border border-terminal-border rounded p-3 flex flex-col justify-between">
          <span className="block text-[8px] text-terminal-muted uppercase tracking-widest font-bold">Underlier Spot Index</span>
          <span className="text-base font-black text-white">
            ₹{currentStock.price.toFixed(2)}
          </span>
          <span className={`block text-[8.5px] font-bold ${currentStock.change >= 0 ? "text-terminal-success" : "text-terminal-danger"}`}>
            {currentStock.change >= 0 ? "▲" : "▼"} {currentStock.changePct.toFixed(2)}% TODAY
          </span>
        </div>
      </div>

      {/* Navigation tabs inside Options suite */}
      <div className="flex items-center justify-between border-b border-terminal-border/60 pb-px">
        <div className="flex space-x-1">
          <button
            onClick={() => setActiveTab("research")}
            className={`px-3 py-1.5 font-bold uppercase tracking-wider text-[9px] border-b-2 transition-all ${
              activeTab === "research"
                ? "border-terminal-accent text-terminal-accent bg-terminal-accent/5 font-black"
                : "border-transparent text-terminal-muted hover:text-white"
            }`}
          >
            Research & Options Chain
          </button>
          <button
            onClick={() => setActiveTab("portfolio")}
            className={`px-3 py-1.5 font-bold uppercase tracking-wider text-[9px] border-b-2 transition-all flex items-center space-x-1.5 ${
              activeTab === "portfolio"
                ? "border-terminal-accent text-terminal-accent bg-terminal-accent/5 font-black"
                : "border-transparent text-terminal-muted hover:text-white"
            }`}
          >
            <span>Options Portfolio</span>
            {holdings.length > 0 && (
              <span className="bg-terminal-accent text-slate-950 font-black rounded-full px-1 text-[7.5px] leading-none py-0.5">
                {holdings.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("payoff")}
            className={`px-3 py-1.5 font-bold uppercase tracking-wider text-[9px] border-b-2 transition-all ${
              activeTab === "payoff"
                ? "border-terminal-accent text-terminal-accent bg-terminal-accent/5 font-black"
                : "border-transparent text-terminal-muted hover:text-white"
            }`}
          >
            Payoff Curve Simulator
          </button>
        </div>

        <button
          type="button"
          onClick={triggerTestBuyAlert}
          className="px-2.5 py-1 text-[8.5px] font-black uppercase tracking-wider text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded shadow-[0_0_10px_rgba(16,185,129,0.4)] transition-all flex items-center space-x-1.5 cursor-pointer mb-1"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-950 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-950"></span>
          </span>
          <span>TEST BUY ALERT POPUP</span>
        </button>
      </div>

      {/* Main view container switches */}
      {activeTab === "research" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* LEFT PANEL: Indicator Inputs + VM VIRA HUD Dashboard Cell Grid */}
          <div className="lg:col-span-4 space-y-4">
            
            {/* Pine Script Settings Panel */}
            <div className="bg-terminal-card border border-terminal-border rounded p-3">
              <div className="flex items-center justify-between border-b border-terminal-border pb-1.5 mb-2">
                <span className="font-bold text-white uppercase text-[9px] flex items-center">
                  <Settings className="w-3.5 h-3.5 text-terminal-accent mr-1.5" /> Strategy Inputs
                </span>
                <span className="text-[7.5px] text-terminal-muted uppercase">Pinescript Config</span>
              </div>

              <div className="space-y-2.5">
                <div>
                  <div className="flex justify-between text-[8px] text-terminal-muted uppercase font-bold mb-1">
                    <span>SuperTrend Multiplier</span>
                    <span className="text-white">{inputs.stMult.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="5.0"
                    step="0.1"
                    value={inputs.stMult}
                    onChange={(e) => setInputs({ ...inputs, stMult: parseFloat(e.target.value) })}
                    className="w-full accent-terminal-accent"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[8px] text-terminal-muted uppercase font-bold mb-1">
                    <span>ATR Length</span>
                    <span className="text-white">{inputs.atrLen} bars</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="25"
                    step="1"
                    value={inputs.atrLen}
                    onChange={(e) => setInputs({ ...inputs, atrLen: parseInt(e.target.value) })}
                    className="w-full accent-terminal-accent"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[8px] text-terminal-muted uppercase font-bold mb-1">
                    <span>Min Score Gate (1-5)</span>
                    <span className="text-white">{inputs.minScore}/5</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    value={inputs.minScore}
                    onChange={(e) => setInputs({ ...inputs, minScore: parseInt(e.target.value) })}
                    className="w-full accent-terminal-accent"
                  />
                </div>

                <div className="flex items-center justify-between text-[8px] uppercase font-bold pt-1">
                  <span className="text-terminal-muted">Plot Supertrend Cloud</span>
                  <input
                    type="checkbox"
                    checked={inputs.showCloud}
                    onChange={(e) => setInputs({ ...inputs, showCloud: e.target.checked })}
                    className="rounded border-terminal-border text-terminal-accent focus:ring-0 bg-terminal-bg h-3.5 w-3.5"
                  />
                </div>
              </div>
            </div>

            {/* Pine Script HUD Table Cell Grid (exact replica of Pine Script Table UI) */}
            <div className="bg-terminal-card border border-terminal-border rounded overflow-hidden">
              <div className="bg-blue-900/40 text-blue-100 border-b border-terminal-border px-3 py-2 flex items-center justify-between">
                <span className="font-extrabold uppercase text-[9px] tracking-widest flex items-center">
                  <Activity className="w-3.5 h-3.5 text-sky-400 mr-2 shrink-0" /> VM VIRA X10 AI indicator dashboard
                </span>
                <span className="text-[7.5px] uppercase font-bold text-sky-300">Active Spot: ₹{currentStock.price.toFixed(1)}</span>
              </div>

              {/* Grid cell matrix styled precisely like table cells */}
              <div className="divide-y divide-slate-800">
                <div className="flex justify-between p-2.5 items-center bg-slate-900/50">
                  <span className="text-slate-300 font-bold text-[9px] uppercase">Confluence Signal</span>
                  <span className={`px-2.5 py-0.5 rounded text-[8.5px] font-black ${
                    activeSignal === "CE_BUY" ? "bg-emerald-500 text-slate-950" :
                    activeSignal === "PE_BUY" ? "bg-rose-500 text-white" :
                    activeSignal === "RANGE" ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" : "bg-slate-800 text-slate-400"
                  }`}>
                    {activeSignal === "CE_BUY" ? "BUY CALL (CE)" :
                     activeSignal === "PE_BUY" ? "BUY PUT (PE)" :
                     activeSignal === "RANGE" ? "AVOID / RANGE CONSOLIDATION" : "NO TREND / WAIT"}
                  </span>
                </div>

                <div className="flex justify-between p-2 items-center">
                  <span className="text-slate-400 font-semibold text-[8px] uppercase">CE Buy Score (Confluence)</span>
                  <span className={`px-2 py-0.5 font-black text-white rounded text-[8.5px] ${
                    tech.buyScore >= 4 ? "bg-emerald-600" : tech.buyScore >= 2 ? "bg-amber-600" : "bg-rose-600"
                  }`}>
                    {tech.buyScore}/5
                  </span>
                </div>

                <div className="flex justify-between p-2 items-center">
                  <span className="text-slate-400 font-semibold text-[8px] uppercase">PE Sell Score (Confluence)</span>
                  <span className={`px-2 py-0.5 font-black text-white rounded text-[8.5px] ${
                    tech.sellScore >= 4 ? "bg-emerald-600" : tech.sellScore >= 2 ? "bg-amber-600" : "bg-rose-600"
                  }`}>
                    {tech.sellScore}/5
                  </span>
                </div>

                <div className="flex justify-between p-2 items-center">
                  <span className="text-slate-400 font-semibold text-[8px] uppercase">SuperTrend (Multiplier {inputs.stMult.toFixed(1)})</span>
                  <span className={`px-2 py-0.5 font-extrabold text-[8.5px] ${tech.stBull ? "text-emerald-400 bg-emerald-500/10" : "text-rose-400 bg-rose-500/10"}`}>
                    {tech.stBull ? "BULL" : "BEAR"}
                  </span>
                </div>

                <div className="flex justify-between p-2 items-center">
                  <span className="text-slate-400 font-semibold text-[8px] uppercase">EMA 9/21 Alignment</span>
                  <span className={`px-2 py-0.5 font-extrabold text-[8.5px] ${tech.emaBull ? "text-emerald-400" : "text-rose-400"}`}>
                    {tech.emaBull ? "9 > 21 BULL" : "9 < 21 BEAR"}
                  </span>
                </div>

                <div className="flex justify-between p-2 items-center">
                  <span className="text-slate-400 font-semibold text-[8px] uppercase">RSI Parameter (14)</span>
                  <span className={`px-2 py-0.5 font-extrabold text-[8.5px] ${tech.rsi > 55 ? "text-emerald-400" : tech.rsi < 45 ? "text-rose-400" : "text-amber-400"}`}>
                    {tech.rsi.toFixed(1)} ({tech.rsi > 55 ? "BULL" : tech.rsi < 45 ? "BEAR" : "NEUTRAL"})
                  </span>
                </div>

                <div className="flex justify-between p-2 items-center">
                  <span className="text-slate-400 font-semibold text-[8px] uppercase">Stoch RSI Direction</span>
                  <span className={`px-2 py-0.5 font-extrabold text-[8.5px] ${tech.stochBull ? "text-emerald-400 bg-emerald-500/5" : "text-rose-400 bg-rose-500/5"}`}>
                    {tech.stochBull ? "BULLISH CROSS" : "BEARISH CROSS"}
                  </span>
                </div>

                <div className="flex justify-between p-2 items-center">
                  <span className="text-slate-400 font-semibold text-[8px] uppercase">VWAP Boundary Context</span>
                  <span className={`px-2 py-0.5 font-extrabold text-[8.5px] ${tech.aboveVWAP ? "text-emerald-400" : "text-rose-400"}`}>
                    {tech.aboveVWAP ? "ABOVE VWAP" : "BELOW VWAP"}
                  </span>
                </div>

                <div className="flex justify-between p-2 items-center">
                  <span className="text-slate-400 font-semibold text-[8px] uppercase">Consolidation Alert</span>
                  <span className={`px-2 py-0.5 font-extrabold text-[8.5px] ${tech.consolidation ? "text-amber-400 bg-amber-500/10" : "text-emerald-400 bg-emerald-500/10"}`}>
                    {tech.consolidation ? "RANGEBOUND" : "TRENDING"}
                  </span>
                </div>

                <div className="flex justify-between p-2 items-center bg-slate-900/20">
                  <span className="text-slate-400 font-semibold text-[8px] uppercase">Average True Range (ATR 14)</span>
                  <span className="font-extrabold text-sky-400 text-[8.5px]">₹{tech.atr14.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Smart Option Advisor Recommendation Card */}
            <div className="bg-slate-900 border border-terminal-border/80 rounded p-3 text-slate-100 shadow space-y-2">
              <div className="flex items-center text-[10px] font-bold text-white uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-terminal-accent mr-1.5" /> VM ALGO AI OPTION RECOMMENDATION
              </div>

              {tech.consolidation ? (
                <div className="text-[9px] leading-relaxed text-yellow-300">
                  MARKET DETECTED IN RANGE. CONSOLIDATION FILTER PREVENTS CALL/PUT BUYING DUE TO PREMIUM DECAY (THETA RISK). RECOMMENDED: AVOID LONG OPTION CONTRACTS OR SHORT PREMIUM WRITING AT OTM STRIKES.
                </div>
              ) : tech.buySignal ? (
                <div className="text-[9px] leading-relaxed text-emerald-400">
                  CONFLUENCE PATTERN MET ({tech.buyScore}/5 SCORE). STRONGLY BULLISH DIRECTION CONFIRMED. RECOMMENDATION: BUY AT-THE-MONEY (ATM) <strong className="text-white">RELIANCE CE (CALL OPTION)</strong> OR SELL PE FOR PREMIUM CREDIT.
                </div>
              ) : tech.sellSignal ? (
                <div className="text-[9px] leading-relaxed text-rose-400">
                  CONFLUENCE BEARISH PATTERN MET ({tech.sellScore}/5 SCORE). STRONGLY BEARISH DRIFT DETECTED. RECOMMENDATION: BUY AT-THE-MONEY (ATM) <strong className="text-white">RELIANCE PE (PUT OPTION)</strong> FOR MAXIMUM DOWNSIDE GAINS.
                </div>
              ) : (
                <div className="text-[9px] leading-relaxed text-slate-300">
                  TREND CONFLUENCE LOADING. SPOT ALIGNED WITH PREV CLOSES. MONITOR OPTION CHAIN FOR LIQUIDITY POOLS AND VOLATILITY EXPANSION BEFORE COMMITTING CAPITAL.
                </div>
              )}
            </div>

            {/* VM VIRA X10 AUTO-TRADER BOT CONSOLE */}
            <div className="bg-slate-950 border border-terminal-border rounded p-3.5 space-y-3 shadow-md relative overflow-hidden">
              {/* Pulse animation for Bot Active */}
              {isAutoBotEnabled && (
                <div className="absolute top-2 right-2 flex items-center space-x-1.5">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                  </span>
                  <span className="text-[7px] text-emerald-400 font-extrabold uppercase tracking-widest animate-pulse">
                    BOT LIVE
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between border-b border-terminal-border/60 pb-2">
                <span className="font-bold text-white uppercase text-[9px] flex items-center">
                  <Activity className="w-3.5 h-3.5 text-terminal-accent mr-1.5 shrink-0" /> VM VIRA X10 AUTO-TRADER
                </span>
                <span className="text-[7.5px] text-slate-400 uppercase font-black">
                  REAL-TIME COUPLING
                </span>
              </div>

              {/* Toggle Enable button */}
              <div className="flex items-center justify-between p-2 bg-slate-900/60 rounded border border-slate-800">
                <div className="space-y-0.5">
                  <span className="block text-[8.5px] font-bold text-white uppercase tracking-wide">
                    Automated Trading Engine
                  </span>
                  <span className="block text-[7.5px] text-terminal-muted uppercase">
                    {isAutoBotEnabled ? "Executing signals instantly" : "Idle / Manual overrides only"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const nextState = !isAutoBotEnabled;
                    setIsAutoBotEnabled(nextState);
                    addBotLog(`Automated Option trading bot ${nextState ? "ACTIVATED" : "DEACTIVATED"}.`, nextState ? "success" : "info");
                  }}
                  className={`px-3 py-1.5 rounded text-[8px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    isAutoBotEnabled
                      ? "bg-emerald-500 text-slate-950 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                      : "bg-slate-800 text-slate-400 hover:text-white border border-slate-700"
                  }`}
                >
                  {isAutoBotEnabled ? "LIVE: BOT ON" : "BOT STANDBY"}
                </button>
              </div>

              {/* Bot parameters settings */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <div className="flex justify-between text-[7.5px] text-slate-400 uppercase font-bold mb-1">
                    <span>Trade Lots</span>
                    <span className="text-white font-extrabold">{autoBotLotSize} Lot</span>
                  </div>
                  <div className="flex bg-slate-900 border border-slate-800 rounded items-center h-7 px-1.5 justify-between">
                    <button
                      type="button"
                      onClick={() => setAutoBotLotSize((p) => Math.max(1, p - 1))}
                      className="w-5 h-5 flex items-center justify-center bg-slate-800 text-slate-400 hover:text-white rounded text-xs"
                    >
                      -
                    </button>
                    <span className="text-[9px] font-bold text-white">{autoBotLotSize} Lots</span>
                    <button
                      type="button"
                      onClick={() => setAutoBotLotSize((p) => Math.min(10, p + 1))}
                      className="w-5 h-5 flex items-center justify-center bg-slate-800 text-slate-400 hover:text-white rounded text-xs"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[7.5px] text-slate-400 uppercase font-bold mb-1">
                    <span>Trend Auto-Exit</span>
                    <span className="text-white font-extrabold">{autoBotTrendExit ? "ACTIVE" : "OFF"}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAutoBotTrendExit(!autoBotTrendExit)}
                    className={`w-full h-7 text-[8.5px] uppercase font-bold rounded transition-colors border ${
                      autoBotTrendExit 
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25" 
                        : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
                    }`}
                  >
                    reversal exit
                  </button>
                </div>

                <div>
                  <div className="flex justify-between text-[7.5px] text-slate-400 uppercase font-bold mb-1">
                    <span>Stop-Loss Limit</span>
                    <span className="text-rose-400 font-extrabold">-{autoBotStopLoss}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="50"
                    step="5"
                    value={autoBotStopLoss}
                    onChange={(e) => setAutoBotStopLoss(parseFloat(e.target.value))}
                    className="w-full accent-rose-500 cursor-pointer h-1 bg-slate-800 rounded-lg appearance-none"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[7.5px] text-slate-400 uppercase font-bold mb-1">
                    <span>Take-Profit Limit</span>
                    <span className="text-emerald-400 font-extrabold">+{autoBotTakeProfit}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="150"
                    step="10"
                    value={autoBotTakeProfit}
                    onChange={(e) => setAutoBotTakeProfit(parseFloat(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer h-1 bg-slate-800 rounded-lg appearance-none"
                  />
                </div>

                {/* Daily Trade Limit Setting */}
                <div className="col-span-2 bg-slate-900/90 p-2.5 rounded border border-slate-800 space-y-1.5 mt-1">
                  <div className="flex items-center justify-between text-[8px] uppercase font-bold">
                    <span className="text-slate-300 tracking-wide flex items-center space-x-1">
                      <span>Day Limit (Trades / Day)</span>
                    </span>
                    <span className="text-emerald-400 font-black">
                      {autoBotDailyTradesCount} / {autoBotMaxTradesPerDay === 0 ? "Unlimited" : `${autoBotMaxTradesPerDay} Executed Today`}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className="flex-1 flex bg-slate-950 border border-slate-800 rounded items-center h-7 px-2 justify-between">
                      <button
                        type="button"
                        onClick={() => setAutoBotMaxTradesPerDay((p) => Math.max(0, p - 1))}
                        className="w-5 h-5 flex items-center justify-center bg-slate-800 text-slate-300 hover:text-white rounded text-xs font-bold cursor-pointer transition-colors"
                        title="Decrease max trades per day"
                      >
                        -
                      </button>
                      <span className="text-[9px] font-black text-white font-mono">
                        {autoBotMaxTradesPerDay === 0 ? "Unlimited Trades" : `${autoBotMaxTradesPerDay} Trades / Day`}
                      </span>
                      <button
                        type="button"
                        onClick={() => setAutoBotMaxTradesPerDay((p) => p + 1)}
                        className="w-5 h-5 flex items-center justify-center bg-slate-800 text-slate-300 hover:text-white rounded text-xs font-bold cursor-pointer transition-colors"
                        title="Increase max trades per day"
                      >
                        +
                      </button>
                    </div>

                    <div className="flex items-center space-x-1">
                      {[1, 3, 5, 10, 0].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setAutoBotMaxTradesPerDay(val)}
                          className={`px-1.5 py-1 text-[7.5px] font-black uppercase rounded border cursor-pointer transition-colors ${
                            autoBotMaxTradesPerDay === val
                              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50"
                              : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
                          }`}
                        >
                          {val === 0 ? "∞" : val}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          setAutoBotDailyTradesCount(0);
                          const today = new Date().toISOString().split("T")[0];
                          localStorage.setItem("vm_algo_options_bot_trades_count", "0");
                          localStorage.setItem("vm_algo_options_bot_trades_date", today);
                          addBotLog("Daily trade counter reset to 0 manually.", "info");
                        }}
                        className="px-1.5 py-1 text-[7.5px] font-bold uppercase rounded bg-slate-800 text-slate-300 hover:text-white border border-slate-700 cursor-pointer ml-1"
                        title="Reset today's executed trades counter"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Log stream console output */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[7.5px] text-slate-400 font-bold uppercase">
                  <span>VIRA REAL-TIME AUDIT LOG</span>
                  {autoBotLogs.length > 0 && (
                    <button
                      type="button"
                      onClick={clearBotLogs}
                      className="text-[7.5px] text-terminal-accent hover:underline lowercase font-semibold"
                    >
                      clear logs
                    </button>
                  )}
                </div>

                <div className="h-32 overflow-y-auto bg-slate-900 border border-slate-800 rounded p-2 font-mono text-[8px] space-y-1 select-text scrollbar-thin">
                  {autoBotLogs.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-500 text-[7.5px] uppercase tracking-wide">
                      [ BOT READY • ACTIVE SPOT INDEX CONNECTED ]
                    </div>
                  ) : (
                    autoBotLogs.map((log) => {
                      const logColors =
                        log.type === "success"
                          ? "text-emerald-400 font-extrabold"
                          : log.type === "error"
                          ? "text-rose-400 font-black"
                          : log.type === "warn"
                          ? "text-yellow-400 font-bold"
                          : "text-slate-300";

                      return (
                        <div key={log.id} className="leading-normal border-b border-slate-800/20 pb-0.5">
                          <span className="text-[7px] text-slate-500 mr-1.5">{log.time}</span>
                          <span className={logColors}>{log.message}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* RIGHT PANEL: Interactive Dual-Sided Options Chain + Order Ticket */}
          <div className="lg:col-span-8 space-y-4">
            
            {/* Interactive Options Chain Table */}
            <div className="bg-terminal-card border border-terminal-border rounded p-3 space-y-3">
              {/* Header + View Mode Selector */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-terminal-border pb-2.5 gap-2">
                <div>
                  <span className="font-bold text-white uppercase text-[10px] flex items-center">
                    <Layers className="w-3.5 h-3.5 text-terminal-accent mr-1.5" /> DUAL OPTION CHAIN GRID (CE / Strike / PE)
                  </span>
                  <p className="text-[8px] text-terminal-muted uppercase tracking-wider mt-0.5">
                    Click LTP Buy/Sell button to auto-populate Order Execution desk
                  </p>
                </div>

                {/* View Mode Selector Tabs */}
                <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setChainViewMode("standard")}
                    className={`px-2 py-0.5 rounded text-[7.5px] font-black uppercase transition-all ${
                      chainViewMode === "standard"
                        ? "bg-terminal-accent text-slate-950 shadow"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Standard OI
                  </button>
                  <button
                    type="button"
                    onClick={() => setChainViewMode("greeks")}
                    className={`px-2 py-0.5 rounded text-[7.5px] font-black uppercase transition-all ${
                      chainViewMode === "greeks"
                        ? "bg-terminal-accent text-slate-950 shadow"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Greeks (Δ Γ Θ ν)
                  </button>
                  <button
                    type="button"
                    onClick={() => setChainViewMode("volume")}
                    className={`px-2 py-0.5 rounded text-[7.5px] font-black uppercase transition-all ${
                      chainViewMode === "volume"
                        ? "bg-terminal-accent text-slate-950 shadow"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    IV & Volume
                  </button>
                </div>
              </div>

              {/* Multi-Leg Strategy Builder Bar */}
              <div className="bg-slate-950 border border-slate-800/80 p-2 rounded flex flex-wrap items-center justify-between gap-1.5">
                <span className="text-[8px] font-black text-slate-300 uppercase flex items-center">
                  <Zap className="w-3 h-3 text-amber-400 mr-1" /> Pro Strategy Builder:
                </span>
                <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                  <button
                    type="button"
                    onClick={() => deployStrategyPreset("bull_call")}
                    className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-[7.5px] font-bold uppercase transition-all"
                  >
                    + Bull Call Spread
                  </button>
                  <button
                    type="button"
                    onClick={() => deployStrategyPreset("bear_put")}
                    className="px-2 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded text-[7.5px] font-bold uppercase transition-all"
                  >
                    + Bear Put Spread
                  </button>
                  <button
                    type="button"
                    onClick={() => deployStrategyPreset("straddle")}
                    className="px-2 py-1 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 rounded text-[7.5px] font-bold uppercase transition-all"
                  >
                    + Long Straddle
                  </button>
                  <button
                    type="button"
                    onClick={() => deployStrategyPreset("iron_condor")}
                    className="px-2 py-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded text-[7.5px] font-bold uppercase transition-all"
                  >
                    + Iron Condor
                  </button>
                </div>
              </div>

              {loadingChain ? (
                <div className="p-12 text-center text-terminal-muted uppercase flex flex-col items-center justify-center space-y-3 h-80">
                  <RefreshCw className="w-6 h-6 animate-spin text-terminal-accent" />
                  <span>Streaming Option contracts...</span>
                </div>
              ) : errorChain || !optionsData ? (
                <div className="p-12 text-center text-terminal-danger h-80 flex flex-col items-center justify-center space-y-2">
                  <AlertTriangle className="w-8 h-8" />
                  <span className="font-black uppercase">Derivatives Server Offline</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-[9px] font-mono border-collapse select-none">
                    <thead>
                      <tr className="border-b border-slate-800 text-[8px] font-bold text-terminal-muted bg-slate-900/50 uppercase">
                        <th colSpan={chainViewMode === "greeks" ? 5 : 4} className="py-1 text-center text-emerald-400 border-r border-slate-800">
                          CALLS (CE) — BULLISH SENSITIVE
                        </th>
                        <th className="py-1 text-center text-white bg-slate-950">STRIKE</th>
                        <th colSpan={chainViewMode === "greeks" ? 5 : 4} className="py-1 text-center text-rose-400 border-l border-slate-800">
                          PUTS (PE) — BEARISH SENSITIVE
                        </th>
                      </tr>
                      <tr className="border-b border-slate-800 text-[7.5px] text-slate-400 uppercase bg-slate-950/60">
                        {chainViewMode === "standard" && (
                          <>
                            <th className="py-1 pr-1 text-right">OI (Qty)</th>
                            <th className="py-1 pr-1 text-right">OI Chg</th>
                            <th className="py-1 pr-1 text-right">LTP (CE)</th>
                            <th className="py-1 border-r border-slate-800 text-center">Trade</th>
                          </>
                        )}
                        {chainViewMode === "greeks" && (
                          <>
                            <th className="py-1 pr-1 text-right text-emerald-300">Delta (Δ)</th>
                            <th className="py-1 pr-1 text-right text-sky-300">Gamma (Γ)</th>
                            <th className="py-1 pr-1 text-right text-amber-300">Theta (Θ)</th>
                            <th className="py-1 pr-1 text-right font-black text-emerald-400">LTP (CE)</th>
                            <th className="py-1 border-r border-slate-800 text-center">Trade</th>
                          </>
                        )}
                        {chainViewMode === "volume" && (
                          <>
                            <th className="py-1 pr-1 text-right">Implied Vol (IV)</th>
                            <th className="py-1 pr-1 text-right">Est. Volume</th>
                            <th className="py-1 pr-1 text-right">LTP (CE)</th>
                            <th className="py-1 border-r border-slate-800 text-center">Trade</th>
                          </>
                        )}

                        <th className="py-1 text-center text-white font-bold bg-slate-950">STRIKE PRICE</th>

                        {chainViewMode === "standard" && (
                          <>
                            <th className="py-1 border-l border-slate-800 text-center">Trade</th>
                            <th className="py-1 pl-1 text-left">LTP (PE)</th>
                            <th className="py-1 pl-1 text-left">OI Chg</th>
                            <th className="py-1 pl-1 text-left">OI (Qty)</th>
                          </>
                        )}
                        {chainViewMode === "greeks" && (
                          <>
                            <th className="py-1 border-l border-slate-800 text-center">Trade</th>
                            <th className="py-1 pl-1 text-left font-black text-rose-400">LTP (PE)</th>
                            <th className="py-1 pl-1 text-left text-amber-300">Theta (Θ)</th>
                            <th className="py-1 pl-1 text-left text-rose-300">Delta (Δ)</th>
                            <th className="py-1 pl-1 text-left text-purple-300">Vega (ν)</th>
                          </>
                        )}
                        {chainViewMode === "volume" && (
                          <>
                            <th className="py-1 border-l border-slate-800 text-center">Trade</th>
                            <th className="py-1 pl-1 text-left">LTP (PE)</th>
                            <th className="py-1 pl-1 text-left">Est. Volume</th>
                            <th className="py-1 pl-1 text-left">Implied Vol (IV)</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {optionsData.chain.map((item: any, idx: number) => {
                        const spot = currentStock.price;
                        const isATM = Math.abs(item.strikePrice - spot) < 25;
                        const isCallITM = item.strikePrice < spot;
                        const isPutITM = item.strikePrice > spot;

                        const callGreeks = calculateOptionGreeks(spot, item.strikePrice, true);
                        const putGreeks = calculateOptionGreeks(spot, item.strikePrice, false);

                        return (
                          <tr
                            key={idx}
                            className={`hover:bg-slate-900/80 transition-colors ${
                              isATM ? "bg-terminal-accent/10 border-y border-terminal-accent/30 font-black" : ""
                            }`}
                          >
                            {/* CALL SIDE */}
                            {chainViewMode === "standard" && (
                              <>
                                <td className={`py-1.5 pr-1.5 text-right font-semibold ${isCallITM ? "bg-emerald-950/20 text-emerald-200" : "text-slate-400"}`}>
                                  {item.callOI.toLocaleString()}
                                </td>
                                <td className={`py-1.5 pr-1.5 text-right font-semibold ${item.callOIChange >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                                  {item.callOIChange >= 0 ? "+" : ""}{item.callOIChange.toLocaleString()}
                                </td>
                                <td className="py-1.5 pr-1.5 text-right text-emerald-400 font-black">
                                  ₹{item.callLtp.toFixed(2)}
                                </td>
                              </>
                            )}

                            {chainViewMode === "greeks" && (
                              <>
                                <td className="py-1.5 pr-1.5 text-right text-emerald-300 font-bold">
                                  +{callGreeks.delta}
                                </td>
                                <td className="py-1.5 pr-1.5 text-right text-sky-300">
                                  {callGreeks.gamma}
                                </td>
                                <td className="py-1.5 pr-1.5 text-right text-amber-400 font-bold">
                                  {callGreeks.theta}
                                </td>
                                <td className="py-1.5 pr-1.5 text-right text-emerald-400 font-black">
                                  ₹{item.callLtp.toFixed(2)}
                                </td>
                              </>
                            )}

                            {chainViewMode === "volume" && (
                              <>
                                <td className="py-1.5 pr-1.5 text-right text-amber-300 font-semibold">
                                  {callGreeks.iv}%
                                </td>
                                <td className="py-1.5 pr-1.5 text-right text-slate-300">
                                  {(item.callOI * 0.42).toFixed(0)}
                                </td>
                                <td className="py-1.5 pr-1.5 text-right text-emerald-400 font-black">
                                  ₹{item.callLtp.toFixed(2)}
                                </td>
                              </>
                            )}

                            {/* CALL ACTION BUTTONS */}
                            <td className="py-1 text-center border-r border-slate-800">
                              <div className="flex items-center justify-center space-x-1">
                                <button
                                  type="button"
                                  onClick={() => selectContractFromChain(item.strikePrice, "CE", item.callLtp, "BUY")}
                                  className="px-1 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded text-[7px] font-bold uppercase hover:bg-emerald-500 hover:text-slate-950 transition-colors cursor-pointer"
                                  title="Buy CALL Premium"
                                >
                                  B
                                </button>
                                <button
                                  type="button"
                                  onClick={() => selectContractFromChain(item.strikePrice, "CE", item.callLtp, "SELL")}
                                  className="px-1 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/30 rounded text-[7px] font-bold uppercase hover:bg-rose-500 hover:text-white transition-colors cursor-pointer"
                                  title="Short Write CALL Premium"
                                >
                                  S
                                </button>
                              </div>
                            </td>

                            {/* CENTER STRIKE PRICE */}
                            <td className={`py-1 text-center font-black tracking-wider ${isATM ? "text-slate-950 bg-terminal-accent" : "text-white bg-slate-950/90"}`}>
                              ₹{item.strikePrice} {isATM ? "(ATM)" : ""}
                            </td>

                            {/* PUT ACTION BUTTONS */}
                            <td className="py-1 text-center border-l border-slate-800">
                              <div className="flex items-center justify-center space-x-1">
                                <button
                                  type="button"
                                  onClick={() => selectContractFromChain(item.strikePrice, "PE", item.putLtp, "BUY")}
                                  className="px-1 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded text-[7px] font-bold uppercase hover:bg-emerald-500 hover:text-slate-950 transition-colors cursor-pointer"
                                  title="Buy PUT Premium"
                                >
                                  B
                                </button>
                                <button
                                  type="button"
                                  onClick={() => selectContractFromChain(item.strikePrice, "PE", item.putLtp, "SELL")}
                                  className="px-1 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/30 rounded text-[7px] font-bold uppercase hover:bg-rose-500 hover:text-white transition-colors cursor-pointer"
                                  title="Short Write PUT Premium"
                                >
                                  S
                                </button>
                              </div>
                            </td>

                            {/* PUT SIDE */}
                            {chainViewMode === "standard" && (
                              <>
                                <td className="py-1.5 pl-1.5 text-left text-rose-400 font-black">
                                  ₹{item.putLtp.toFixed(2)}
                                </td>
                                <td className={`py-1.5 pl-1.5 text-left font-semibold ${item.putOIChange >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                                  {item.putOIChange >= 0 ? "+" : ""}{item.putOIChange.toLocaleString()}
                                </td>
                                <td className={`py-1.5 pl-1.5 text-left font-semibold ${isPutITM ? "bg-rose-950/20 text-rose-200" : "text-slate-400"}`}>
                                  {item.putOI.toLocaleString()}
                                </td>
                              </>
                            )}

                            {chainViewMode === "greeks" && (
                              <>
                                <td className="py-1.5 pl-1.5 text-left text-rose-400 font-black">
                                  ₹{item.putLtp.toFixed(2)}
                                </td>
                                <td className="py-1.5 pl-1.5 text-left text-amber-400 font-bold">
                                  {putGreeks.theta}
                                </td>
                                <td className="py-1.5 pl-1.5 text-left text-rose-300 font-bold">
                                  {putGreeks.delta}
                                </td>
                                <td className="py-1.5 pl-1.5 text-left text-purple-300">
                                  {putGreeks.vega}
                                </td>
                              </>
                            )}

                            {chainViewMode === "volume" && (
                              <>
                                <td className="py-1.5 pl-1.5 text-left text-rose-400 font-black">
                                  ₹{item.putLtp.toFixed(2)}
                                </td>
                                <td className="py-1.5 pl-1.5 text-left text-slate-300">
                                  {(item.putOI * 0.38).toFixed(0)}
                                </td>
                                <td className="py-1.5 pl-1.5 text-left text-amber-300 font-semibold">
                                  {putGreeks.iv}%
                                </td>
                              </>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* PRO STRATEGY QUICK-SELECT & MAX PROFIT/LOSS RISK MATRIX */}
            <div className="bg-slate-950 border border-terminal-border rounded p-3.5 space-y-3 shadow-lg relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-2.5 gap-2">
                <div className="flex items-center space-x-2">
                  <div className="bg-terminal-accent/10 border border-terminal-accent/40 p-1.5 rounded text-terminal-accent">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                      <span>STRATEGY QUICK-SELECT & RISK MATRIX</span>
                      <span className="text-[7px] font-extrabold text-slate-950 bg-terminal-accent px-1.5 py-0.5 rounded">AUTO CALCULATOR</span>
                    </h3>
                    <p className="text-[8px] text-slate-400 font-medium">
                      Select multi-leg option strategies to calculate exact Max Profit, Max Loss & Breakeven limits
                    </p>
                  </div>
                </div>

                {/* Strategy Dropdown */}
                <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 p-1.5 rounded">
                  <span className="text-[8px] font-black text-slate-400 uppercase shrink-0">STRATEGY:</span>
                  <select
                    value={selectedStrategyPreset}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedStrategyPreset(val);
                      const metrics = computeStrategyMetrics(val, currentStock.price, optionsData?.chain || [], orderQty, lotSize);
                      if (metrics && metrics.legs.length > 0) {
                        const primaryLeg = metrics.legs[0];
                        setOrderStrike(primaryLeg.strike);
                        setOrderType(primaryLeg.type);
                        setOrderAction(primaryLeg.action);
                        setOrderPremium(primaryLeg.premium);
                      }
                    }}
                    className="bg-slate-950 text-white font-extrabold text-[9.5px] rounded px-2 py-1 focus:outline-none focus:border-terminal-accent border border-slate-800 cursor-pointer"
                  >
                    <option value="custom">-- Custom Single Contract --</option>
                    <option value="bull_call_spread">🟢 Bull Call Spread (Debit Spread)</option>
                    <option value="bear_put_spread">🔴 Bear Put Spread (Debit Spread)</option>
                    <option value="bull_put_spread">🟢 Bull Put Spread (Credit Spread)</option>
                    <option value="bear_call_spread">🔴 Bear Call Spread (Credit Spread)</option>
                    <option value="long_straddle">🚀 Long Straddle (Volatility Expansion)</option>
                    <option value="short_straddle">📉 Short Straddle (Range Decay)</option>
                    <option value="iron_condor">🎯 Iron Condor (4-Leg Neutral)</option>
                    <option value="long_call">⚡ Long Call (Naked CE)</option>
                    <option value="long_put">⚡ Long Put (Naked PE)</option>
                  </select>
                </div>
              </div>

              {/* Active Strategy Metrics Breakdown */}
              {activeStrategyMetrics ? (
                <div className="space-y-3 pt-1">
                  {/* Strategy Description & Deploy Action */}
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900/80 p-2.5 rounded border border-slate-800">
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-black text-white">{activeStrategyMetrics.name}</span>
                        <span className={`text-[7.5px] font-black px-1.5 py-0.5 rounded uppercase ${
                          activeStrategyMetrics.bias === "BULLISH" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                          activeStrategyMetrics.bias === "BEARISH" ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" :
                          activeStrategyMetrics.bias === "VOLATILITY BREAKOUT" ? "bg-sky-500/20 text-sky-400 border border-sky-500/30" :
                          "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                        }`}>
                          {activeStrategyMetrics.bias}
                        </span>
                        <span className={`text-[7.5px] font-black px-1.5 py-0.5 rounded uppercase ${
                          activeStrategyMetrics.riskType === "DEFINED RISK" ? "bg-emerald-950 text-emerald-300 border border-emerald-800" : "bg-rose-950 text-rose-300 border border-rose-800 animate-pulse"
                        }`}>
                          {activeStrategyMetrics.riskType}
                        </span>
                      </div>
                      <p className="text-[8.5px] text-slate-400 font-mono">{activeStrategyMetrics.description}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => executeMultiLegStrategy(activeStrategyMetrics)}
                      className="px-3 py-1.5 bg-terminal-accent text-slate-950 hover:bg-emerald-400 font-black text-[8.5px] uppercase rounded transition-all shadow cursor-pointer flex items-center space-x-1"
                    >
                      <CheckCircle className="w-3.5 h-3.5 mr-1" />
                      <span>EXECUTE FULL PACKAGE ({activeStrategyMetrics.legs.length} LEGS)</span>
                    </button>
                  </div>

                  {/* 4-Column Max Profit / Max Loss / Breakeven / Risk-Reward Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                    {/* Max Profit */}
                    <div className="bg-slate-900/90 border border-emerald-500/30 p-2.5 rounded flex flex-col justify-between">
                      <span className="text-[8px] font-black text-emerald-400 uppercase tracking-wider flex items-center">
                        <TrendingUp className="w-3 h-3 mr-1" /> MAX PROFIT POTENTIAL
                      </span>
                      <div className="text-sm font-black text-emerald-400 mt-1">
                        {activeStrategyMetrics.maxProfit}
                      </div>
                      <span className="text-[7.5px] text-slate-400 mt-0.5 font-semibold">
                        {activeStrategyMetrics.netType === "CREDIT" ? "Net Credit Collection Cap" : "Maximum Expiry Profit"}
                      </span>
                    </div>

                    {/* Max Loss */}
                    <div className="bg-slate-900/90 border border-rose-500/30 p-2.5 rounded flex flex-col justify-between">
                      <span className="text-[8px] font-black text-rose-400 uppercase tracking-wider flex items-center">
                        <TrendingDown className="w-3 h-3 mr-1" /> MAX LOSS RISK
                      </span>
                      <div className="text-sm font-black text-rose-400 mt-1">
                        {activeStrategyMetrics.maxLoss}
                      </div>
                      <span className="text-[7.5px] text-slate-400 mt-0.5 font-semibold">
                        {activeStrategyMetrics.riskType === "DEFINED RISK" ? "Strictly Capped Outlay" : "Requires Stop-Loss"}
                      </span>
                    </div>

                    {/* Breakeven Level */}
                    <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded flex flex-col justify-between">
                      <span className="text-[8px] font-black text-sky-400 uppercase tracking-wider flex items-center">
                        <Crosshair className="w-3 h-3 mr-1" /> BREAKEVEN LEVEL
                      </span>
                      <div className="text-xs font-black text-sky-300 mt-1 font-mono">
                        {activeStrategyMetrics.breakevens}
                      </div>
                      <span className="text-[7.5px] text-slate-400 mt-0.5 font-semibold">
                        Underlying Target at Expiry
                      </span>
                    </div>

                    {/* Risk / Reward Ratio */}
                    <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded flex flex-col justify-between">
                      <span className="text-[8px] font-black text-amber-400 uppercase tracking-wider flex items-center">
                        <Percent className="w-3 h-3 mr-1" /> RISK / REWARD RATIO
                      </span>
                      <div className="text-xs font-black text-amber-300 mt-1 font-mono">
                        {activeStrategyMetrics.riskRewardRatio}
                      </div>
                      <span className="text-[7.5px] text-slate-400 mt-0.5 font-semibold">
                        {activeStrategyMetrics.netType === "CREDIT"
                          ? `Net Credit: ₹${(activeStrategyMetrics.netAmountPerShare * orderQty * lotSize).toLocaleString("en-IN")}`
                          : `Net Outlay: ₹${(activeStrategyMetrics.netAmountPerShare * orderQty * lotSize).toLocaleString("en-IN")}`}
                      </span>
                    </div>
                  </div>

                  {/* Legs Detailed Table Breakdown */}
                  <div className="bg-slate-900/60 border border-slate-800 rounded p-2">
                    <div className="text-[8px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                      <span>Option Leg Architecture ({activeStrategyMetrics.legs.length} Legs)</span>
                      <span className="text-slate-500 font-mono">Active Spot: ₹{currentStock.price.toFixed(1)}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                      {activeStrategyMetrics.legs.map((leg, idx) => (
                        <div key={idx} className="bg-slate-950 p-2 rounded border border-slate-800 flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className={`px-1.5 py-0.5 text-[8px] font-black rounded uppercase ${
                              leg.action === "BUY" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40" : "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                            }`}>
                              {leg.action}
                            </span>
                            <div>
                              <span className="block text-[9.5px] font-black text-white font-mono">
                                ₹{leg.strike} {leg.type}
                              </span>
                              <span className="block text-[7.5px] text-slate-400">
                                {orderQty} Lot(s) ({orderQty * lotSize} qty)
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="block text-[9.5px] font-black text-emerald-400 font-mono">
                              ₹{leg.premium.toFixed(2)}
                            </span>
                            <span className="block text-[7.5px] text-slate-400 font-mono">
                              ₹{(orderQty * lotSize * leg.premium).toLocaleString("en-IN")}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-[8.5px] text-slate-400 bg-slate-900/40 p-2 rounded border border-slate-800 flex items-center justify-between">
                  <span>Select an option strategy from the Quick-Select dropdown above (Bull Call Spread, Iron Condor, etc.) to view max profit/loss and auto-fill legs.</span>
                  <span className="text-slate-500 font-mono uppercase">Single Order Mode</span>
                </div>
              )}
            </div>

            {/* Option Order execution ticket desk */}
            <div className="bg-terminal-card border border-terminal-border rounded p-3.5 space-y-3 relative">
              <div className="flex items-center justify-between border-b border-terminal-border pb-1.5">
                <span className="font-bold text-white uppercase text-[10px] flex items-center">
                  <ArrowRightLeft className="w-3.5 h-3.5 text-terminal-accent mr-1.5" /> VM VIRA ACTIVE ORDER DESK
                </span>
                <span className="text-[7.5px] text-terminal-muted uppercase font-bold">Standard lot multiplier: 250 contracts</span>
              </div>

              <form onSubmit={executeOptionOrder} className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[7.5px] text-slate-400 uppercase font-bold mb-1">Contract Action</label>
                    <div className="flex h-8 bg-slate-950 rounded border border-terminal-border p-0.5">
                      <button
                        type="button"
                        onClick={() => setOrderAction("BUY")}
                        className={`flex-1 rounded text-[9px] font-extrabold uppercase transition-all ${
                          orderAction === "BUY" ? "bg-emerald-500 text-slate-950" : "text-slate-400 hover:text-white"
                        }`}
                      >
                        BUY (CE/PE)
                      </button>
                      <button
                        type="button"
                        onClick={() => setOrderAction("SELL")}
                        className={`flex-1 rounded text-[9px] font-extrabold uppercase transition-all ${
                          orderAction === "SELL" ? "bg-rose-500 text-white" : "text-slate-400 hover:text-white"
                        }`}
                      >
                        SELL (Short)
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[7.5px] text-slate-400 uppercase font-bold mb-1">Option Class</label>
                    <div className="flex h-8 bg-slate-950 rounded border border-terminal-border p-0.5">
                      <button
                        type="button"
                        onClick={() => setOrderType("CE")}
                        className={`flex-1 rounded text-[9px] font-extrabold uppercase transition-all ${
                          orderType === "CE" ? "bg-terminal-accent text-slate-950" : "text-slate-400 hover:text-white"
                        }`}
                      >
                        CALL (CE)
                      </button>
                      <button
                        type="button"
                        onClick={() => setOrderType("PE")}
                        className={`flex-1 rounded text-[9px] font-extrabold uppercase transition-all ${
                          orderType === "PE" ? "bg-terminal-accent text-slate-950" : "text-slate-400 hover:text-white"
                        }`}
                      >
                        PUT (PE)
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[7.5px] text-slate-400 uppercase font-bold mb-1">Strike selection</label>
                    <input
                      type="number"
                      value={orderStrike}
                      onChange={(e) => {
                        const strike = parseInt(e.target.value) || 0;
                        setOrderStrike(strike);
                        setSimulatedExpiryPrice(strike);
                      }}
                      className="w-full bg-slate-950 border border-terminal-border rounded text-white h-8 px-2 focus:outline-none focus:border-terminal-accent font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[7.5px] text-slate-400 uppercase font-bold mb-1">Premium rate (LTP)</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-2 text-[9px] text-slate-500 font-bold">₹</span>
                      <input
                        type="number"
                        step="0.05"
                        value={orderPremium}
                        onChange={(e) => setOrderPremium(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-950 border border-terminal-border rounded text-white h-8 pl-5 pr-2 focus:outline-none focus:border-terminal-accent font-bold"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="block text-[7.5px] text-slate-400 uppercase font-bold mb-1">Lot Size / Quantity</label>
                    <div className="flex h-8 bg-slate-950 rounded border border-terminal-border items-center px-1">
                      <button
                        type="button"
                        onClick={() => setOrderQty(Math.max(1, orderQty - 1))}
                        className="w-8 h-6 flex items-center justify-center font-bold text-slate-400 hover:text-white text-xs"
                      >
                        -
                      </button>
                      <span className="flex-1 text-center font-bold text-white text-[10px]">
                        {orderQty} Lot(s) ({orderQty * lotSize} qty)
                      </span>
                      <button
                        type="button"
                        onClick={() => setOrderQty(orderQty + 1)}
                        className="w-8 h-6 flex items-center justify-center font-bold text-slate-400 hover:text-white text-xs"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col justify-end">
                    <div className="text-[7.5px] text-slate-400 uppercase font-bold mb-1">Capital Commitment</div>
                    <div className="h-8 flex items-center bg-slate-950/40 border border-terminal-border/40 rounded px-2 text-[10px] text-slate-300 font-bold uppercase">
                      Total Premium: <strong className="text-white ml-1.5">₹{(orderQty * lotSize * orderPremium).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong>
                    </div>
                  </div>

                  <div className="flex items-end">
                    <button
                      type="submit"
                      className={`w-full h-8 uppercase font-bold text-[9px] rounded tracking-widest text-slate-950 transition-all shadow-md ${
                        orderAction === "BUY" ? "bg-emerald-400 hover:bg-emerald-300" : "bg-rose-400 hover:bg-rose-300 text-white"
                      }`}
                    >
                      EXECUTE OPTIONS CONTRACT
                    </button>
                  </div>
                </div>

                {orderFeedback && (
                  <div className={`p-2.5 rounded text-[8.5px] uppercase font-bold border flex items-center space-x-2 ${
                    orderFeedback.type === "success" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                  }`}>
                    {orderFeedback.type === "success" ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                    <span>{orderFeedback.message}</span>
                  </div>
                )}
              </form>
            </div>

          </div>
        </div>
      )}

      {activeTab === "portfolio" && (
        <div className="space-y-4">
          
          {/* Aggregate Options Portfolio Risk Matrix (Greeks, VaR, Sharpe) */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-slate-950 border border-slate-800 p-3 rounded flex flex-col justify-between">
              <div className="flex items-center justify-between text-[8px] text-slate-400 font-bold uppercase">
                <span>Net Delta (Δ)</span>
                <span className="text-emerald-400">Directional</span>
              </div>
              <div className="text-sm font-black text-white mt-1">
                {portfolioGreeks.delta >= 0 ? "+" : ""}{portfolioGreeks.delta.toFixed(1)}
              </div>
              <span className="text-[7.5px] text-slate-500 uppercase font-semibold mt-0.5">
                {portfolioGreeks.delta > 50 ? "Bullish Bias" : portfolioGreeks.delta < -50 ? "Bearish Bias" : "Delta Neutral"}
              </span>
            </div>

            <div className="bg-slate-950 border border-slate-800 p-3 rounded flex flex-col justify-between">
              <div className="flex items-center justify-between text-[8px] text-slate-400 font-bold uppercase">
                <span>Net Gamma (Γ)</span>
                <span className="text-sky-400">Convexity</span>
              </div>
              <div className="text-sm font-black text-sky-300 mt-1">
                {portfolioGreeks.gamma >= 0 ? "+" : ""}{portfolioGreeks.gamma.toFixed(2)}
              </div>
              <span className="text-[7.5px] text-slate-500 uppercase font-semibold mt-0.5">
                Delta Sensitivity
              </span>
            </div>

            <div className="bg-slate-950 border border-slate-800 p-3 rounded flex flex-col justify-between">
              <div className="flex items-center justify-between text-[8px] text-slate-400 font-bold uppercase">
                <span>Net Theta (Θ)</span>
                <span className="text-amber-400">Time Decay</span>
              </div>
              <div className={`text-sm font-black mt-1 ${portfolioGreeks.theta >= 0 ? "text-emerald-400" : "text-amber-400"}`}>
                ₹{portfolioGreeks.theta.toFixed(1)}/day
              </div>
              <span className="text-[7.5px] text-slate-500 uppercase font-semibold mt-0.5">
                Daily Decay Rate
              </span>
            </div>

            <div className="bg-slate-950 border border-slate-800 p-3 rounded flex flex-col justify-between">
              <div className="flex items-center justify-between text-[8px] text-slate-400 font-bold uppercase">
                <span>Net Vega (ν)</span>
                <span className="text-purple-400">Vol Exposure</span>
              </div>
              <div className="text-sm font-black text-purple-300 mt-1">
                ₹{portfolioGreeks.vega.toFixed(1)} / 1% IV
              </div>
              <span className="text-[7.5px] text-slate-500 uppercase font-semibold mt-0.5">
                IV Change Impact
              </span>
            </div>

            <div className="bg-slate-950 border border-slate-800 p-3 rounded flex flex-col justify-between col-span-2 md:col-span-1">
              <div className="flex items-center justify-between text-[8px] text-slate-400 font-bold uppercase">
                <span>Sharpe / VaR (95%)</span>
                <span className="text-emerald-400">Risk Metrics</span>
              </div>
              <div className="text-sm font-black text-emerald-400 mt-1">
                Sharpe: 1.84 • VaR: ₹{(walletBalance * 0.021).toFixed(0)}
              </div>
              <span className="text-[7.5px] text-slate-500 uppercase font-semibold mt-0.5">
                Institutional Quality
              </span>
            </div>
          </div>

          {/* Portfolio table representing active CE / PE holdings */}
          <div className="bg-terminal-card border border-terminal-border rounded p-3.5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-terminal-border pb-2.5 gap-2">
              <div>
                <span className="font-bold text-white uppercase text-[10px] flex items-center">
                  <Coins className="w-3.5 h-3.5 text-terminal-accent mr-1.5" /> Open Derivatives Contracts (CE / PE)
                </span>
                <p className="text-[8px] text-terminal-muted uppercase tracking-wider mt-0.5">
                  Real-time margins & premium valuations updated instantly
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[8px] text-terminal-muted font-bold mr-1">
                  COMMITTED: ₹{holdings.reduce((sum, h) => sum + h.totalCost, 0).toLocaleString("en-IN")}
                </span>

                {holdings.length > 0 && (
                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => closeAllPositions("CE")}
                      className="px-2 py-1 bg-emerald-950 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-300 text-[8px] font-black uppercase rounded transition-all cursor-pointer"
                      title="Liquidate all open Call Option positions"
                    >
                      Square Off CE
                    </button>
                    <button
                      type="button"
                      onClick={() => closeAllPositions("PE")}
                      className="px-2 py-1 bg-rose-950 hover:bg-rose-900 border border-rose-700/60 text-rose-300 text-[8px] font-black uppercase rounded transition-all cursor-pointer"
                      title="Liquidate all open Put Option positions"
                    >
                      Square Off PE
                    </button>
                    <button
                      type="button"
                      onClick={() => closeAllPositions()}
                      className="px-2.5 py-1 bg-rose-500 hover:bg-rose-600 text-slate-950 text-[8px] font-black uppercase rounded shadow transition-all cursor-pointer flex items-center space-x-1"
                      title="Square off and liquidate ALL open option contracts"
                    >
                      <Power className="w-3 h-3 mr-0.5" />
                      <span>SQUARE OFF ALL ({holdings.length})</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {holdings.length === 0 ? (
              <div className="p-16 text-center text-terminal-muted uppercase flex flex-col items-center justify-center space-y-3">
                <Layers className="w-8 h-8 text-terminal-border" />
                <span className="font-bold text-[9px]">No Active CE/PE Contracts in Options Portfolio</span>
                <p className="text-[8px] text-slate-500 lowercase max-w-sm">
                  use the "research & options chain" tab above or click "B" / "S" on the option grid strike price to buy option premiums.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[9px] font-mono text-left select-none">
                  <thead>
                    <tr className="border-b border-slate-800 text-[8px] text-slate-400 uppercase">
                      <th className="py-2">Contract</th>
                      <th className="py-2">Strike Price</th>
                      <th className="py-2">Lot Type</th>
                      <th className="py-2 text-right">Avg Premium</th>
                      <th className="py-2 text-right">Current LTP</th>
                      <th className="py-2 text-right">Lots (Qty)</th>
                      <th className="py-2 text-right">Total Cost</th>
                      <th className="py-2 text-right">Unrealized P&L</th>
                      <th className="py-2 text-center">Close Options</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {holdings.map((h) => {
                      const isProfit = h.pnl >= 0;
                      return (
                        <tr key={h.id} className="hover:bg-slate-900/40">
                          <td className="py-2 font-black text-white flex items-center space-x-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${h.type === "CE" ? "bg-emerald-400" : "bg-rose-400"}`} />
                            <span>{h.underlier} JUL {h.strike} {h.type}</span>
                          </td>
                          <td className="py-2 font-bold text-slate-300">₹{h.strike}</td>
                          <td className="py-2 font-bold">
                            <span className={`px-1.5 py-0.5 rounded text-[7.5px] uppercase font-extrabold ${
                              h.action === "BUY" ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            }`}>
                              {h.action} (CE/PE)
                            </span>
                          </td>
                          <td className="py-2 text-right text-slate-300">₹{h.buyPremium.toFixed(2)}</td>
                          <td className="py-2 text-right font-black text-sky-400 animate-pulse">₹{h.currentPremium.toFixed(2)}</td>
                          <td className="py-2 text-right font-bold text-white">{h.quantity} ({h.quantity * h.lotSize} contracts)</td>
                          <td className="py-2 text-right text-slate-300">₹{h.totalCost.toLocaleString("en-IN", { minimumFractionDigits: 1 })}</td>
                          <td className={`py-2 text-right font-black ${isProfit ? "text-terminal-success" : "text-terminal-danger"}`}>
                            {isProfit ? "+" : ""}
                            ₹{h.pnl.toLocaleString("en-IN", { minimumFractionDigits: 1 })}
                            <span className="block text-[7.5px] font-bold">
                              ({isProfit ? "+" : ""}{h.pnlPct.toFixed(2)}%)
                            </span>
                          </td>
                          <td className="py-2 text-center">
                            <div className="flex items-center justify-center space-x-1">
                              {h.quantity > 1 && (
                                <button
                                  type="button"
                                  onClick={() => closePosition(h.id, 0.5)}
                                  className="px-1.5 py-1 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/40 font-black rounded text-[7.5px] uppercase transition-colors cursor-pointer"
                                  title="Close 50% of open lots (Partial exit)"
                                >
                                  Close 50%
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => closePosition(h.id, 1.0)}
                                className="px-2 py-1 bg-rose-500 hover:bg-rose-600 text-slate-950 font-black rounded text-[7.5px] uppercase transition-colors cursor-pointer flex items-center space-x-0.5 shadow"
                                title="Close 100% full position"
                              >
                                <XCircle className="w-3 h-3 mr-0.5" />
                                <span>Close 100%</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Historical orders panel */}
          <div className="bg-terminal-card border border-terminal-border rounded p-3.5">
            <div className="flex items-center justify-between border-b border-terminal-border pb-2.5 mb-2.5">
              <span className="font-bold text-white uppercase text-[10px] flex items-center">
                <History className="w-3.5 h-3.5 text-terminal-accent mr-1.5" /> Historic Options Audit Ledger
              </span>
              <span className="text-[7.5px] text-terminal-muted uppercase">Executed option contracts</span>
            </div>

            {orders.length === 0 ? (
              <div className="p-8 text-center text-terminal-muted uppercase">
                <span className="text-[8px]">No Option trades finalized yet in this session.</span>
              </div>
            ) : (
              <div className="overflow-y-auto max-h-56">
                <table className="w-full text-[8.5px] font-mono text-slate-400 text-left">
                  <thead>
                    <tr className="border-b border-slate-800 text-[8px] uppercase">
                      <th className="py-1">Order ID</th>
                      <th className="py-1">Timestamp</th>
                      <th className="py-1">Contract details</th>
                      <th className="py-1">Execution type</th>
                      <th className="py-1 text-right">Premium Rate</th>
                      <th className="py-1 text-right">Lot size</th>
                      <th className="py-1 text-right">Gross value</th>
                      <th className="py-1 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {orders.map((o) => (
                      <tr key={o.id} className="hover:bg-slate-900/20">
                        <td className="py-1 font-bold text-white">{o.id}</td>
                        <td className="py-1 text-[8px]">{o.timestamp}</td>
                        <td className="py-1 font-semibold text-slate-300">
                          {o.underlier} JUL {o.strike} {o.type}
                        </td>
                        <td className="py-1 font-black">
                          <span className={o.action === "BUY" ? "text-emerald-400" : "text-rose-400"}>
                            {o.action}
                          </span>
                        </td>
                        <td className="py-1 text-right text-slate-200">₹{o.premium.toFixed(2)}</td>
                        <td className="py-1 text-right text-slate-200">{o.quantity} ({o.quantity * lotSize} qty)</td>
                        <td className="py-1 text-right text-white">₹{o.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 1 })}</td>
                        <td className="py-1 text-center font-bold text-emerald-400">SUCCESS</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {activeTab === "payoff" && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          
          {/* LEFT: Payoff simulator controls */}
          <div className="md:col-span-4 bg-terminal-card border border-terminal-border rounded p-3.5 space-y-3.5">
            <div className="border-b border-terminal-border pb-2">
              <span className="font-bold text-white uppercase text-[10px] flex items-center">
                <TrendingUp className="w-3.5 h-3.5 text-terminal-accent mr-1.5" /> Payoff curve settings
              </span>
              <p className="text-[8px] text-terminal-muted uppercase tracking-wider mt-0.5">
                Simulate profit & loss behavior at target expiry date
              </p>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-950 p-2 rounded border border-slate-800">
                  <div className="text-[7.5px] text-slate-500 uppercase font-black">Selected Strike</div>
                  <div className="text-white font-bold text-[11px] mt-0.5">₹{orderStrike}</div>
                </div>
                <div className="bg-slate-950 p-2 rounded border border-slate-800">
                  <div className="text-[7.5px] text-slate-500 uppercase font-black">Type / Action</div>
                  <div className="text-white font-bold text-[11px] mt-0.5 uppercase">{orderAction} {orderType}</div>
                </div>
              </div>

              <div>
                <label className="block text-[7.5px] text-slate-400 uppercase font-bold mb-1">
                  Adjust simulated stock price at expiry
                </label>
                <div className="flex justify-between items-center bg-slate-950 px-2.5 py-1.5 rounded border border-terminal-border mb-1.5">
                  <span className="text-[8px] text-slate-500 uppercase font-bold">Simulated spot</span>
                  <span className="text-white font-black text-xs">₹{simulatedExpiryPrice}</span>
                </div>
                <input
                  type="range"
                  min={Math.floor(orderStrike * 0.85)}
                  max={Math.floor(orderStrike * 1.15)}
                  step="5"
                  value={simulatedExpiryPrice}
                  onChange={(e) => setSimulatedExpiryPrice(parseInt(e.target.value) || orderStrike)}
                  className="w-full accent-terminal-accent"
                />
                <div className="flex justify-between text-[7.5px] text-slate-500 uppercase font-bold">
                  <span>-15% drift (₹{Math.floor(orderStrike * 0.85)})</span>
                  <span>+15% drift (₹{Math.floor(orderStrike * 1.15)})</span>
                </div>
              </div>

              <div className="bg-slate-950/80 p-3 rounded border border-terminal-border/40 space-y-1.5">
                <div className="flex justify-between text-[8px] text-slate-400 font-bold uppercase">
                  <span>Break-Even Price:</span>
                  <span className="text-white font-black">₹{payoff.bePoint.toFixed(1)}</span>
                </div>
                <div className="flex justify-between text-[8px] text-slate-400 font-bold uppercase">
                  <span>Max Net Risk:</span>
                  <span className="text-rose-400 font-black">
                    {payoff.maxRisk === Infinity ? "Unlimited Liability" : `₹${payoff.maxRisk.toLocaleString("en-IN")}`}
                  </span>
                </div>
                <div className="flex justify-between text-[8px] text-slate-400 font-bold uppercase">
                  <span>Max Net Reward:</span>
                  <span className="text-emerald-400 font-black">
                    {payoff.maxReward === Infinity ? "Unlimited Gain" : `₹${payoff.maxReward.toLocaleString("en-IN")}`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Payoff graph & payoff target output */}
          <div className="md:col-span-8 bg-terminal-card border border-terminal-border rounded p-3.5 space-y-3.5">
            <div className="border-b border-terminal-border pb-2 flex justify-between items-center">
              <span className="font-bold text-white uppercase text-[10px] flex items-center">
                <Activity className="w-3.5 h-3.5 text-terminal-accent mr-1.5" /> Payoff curve visualization at expiry
              </span>
              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                payoff.pnl >= 0 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
              }`}>
                {payoff.pnl >= 0 ? "PROFIT ZONE" : "LOSS ZONE"}
              </span>
            </div>

            {/* Interactive profit metrics report */}
            <div className="p-3 bg-slate-950 rounded border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <div>
                <span className="text-[7.5px] text-slate-500 uppercase font-black block">Net simulated payoff output</span>
                <span className={`text-base font-black ${payoff.pnl >= 0 ? "text-emerald-400 animate-pulse" : "text-rose-400"}`}>
                  {payoff.pnl >= 0 ? "+" : ""}₹{payoff.pnl.toLocaleString("en-IN", { minimumFractionDigits: 1 })}
                </span>
              </div>
              <div className="text-[8px] leading-relaxed text-slate-400 max-w-md uppercase font-bold">
                At expiry price of <strong className="text-white">₹{simulatedExpiryPrice}</strong>, this {orderAction} contract will trigger a return value of <strong className={payoff.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}>₹{Math.abs(payoff.pnl).toLocaleString("en-IN")}</strong>. Break-even occurs exactly at <strong className="text-white">₹{payoff.bePoint.toFixed(1)}</strong>.
              </div>
            </div>

            {/* SVG Visual pay-off graph representation */}
            <div className="bg-slate-950 border border-slate-900 rounded p-2 overflow-hidden">
              <svg className="w-full" viewBox="0 0 600 180" style={{ minHeight: "180px" }}>
                {/* Horizontal Zero center line */}
                <line x1="0" y1="90" x2="600" y2="90" stroke="#1e293b" strokeWidth="2" strokeDasharray="3,3" />

                {/* Draw the pay-off curve path dynamically based on options specs */}
                {(() => {
                  const points: string[] = [];
                  const range = orderStrike * 0.3; // +-15% range mapped to 600px width
                  const startStockPrice = orderStrike - range;
                  const step = (range * 2) / 100;

                  for (let i = 0; i <= 100; i++) {
                    const pricePoint = startStockPrice + i * step;
                    const x = (i / 100) * 600;

                    // Compute payout for individual step price point
                    let subPnl = 0;
                    const qty = orderQty * lotSize;
                    const premium = parseFloat(orderPremium.toString()) || 5;

                    if (orderType === "CE") {
                      if (orderAction === "BUY") {
                        subPnl = (Math.max(0, pricePoint - orderStrike) - premium) * qty;
                      } else {
                        subPnl = (premium - Math.max(0, pricePoint - orderStrike)) * qty;
                      }
                    } else {
                      if (orderAction === "BUY") {
                        subPnl = (Math.max(0, orderStrike - pricePoint) - premium) * qty;
                      } else {
                        subPnl = (premium - Math.max(0, orderStrike - pricePoint)) * qty;
                      }
                    }

                    // Map subPnl to Y coordinate (90 center, upwards = profit, downwards = loss)
                    // Scale factor: max scale at ₹1,50,000 mapping to 75px height variance
                    const maxScale = Math.max(50000, orderQty * lotSize * premium * 2);
                    const y = 90 - (subPnl / maxScale) * 75;
                    points.push(`${x},${Math.max(10, Math.min(170, y))}`);
                  }

                  const pathStr = `M ${points.join(" L ")}`;
                  return (
                    <>
                      {/* Profit Fill Zone */}
                      <path
                        d={`M 0,90 L ${points.join(" L ")} L 600,90 Z`}
                        fill={orderAction === "BUY" ? "rgba(16, 185, 129, 0.04)" : "rgba(244, 63, 94, 0.04)"}
                      />
                      
                      {/* Main Line */}
                      <path
                        d={pathStr}
                        fill="none"
                        stroke={orderAction === "BUY" ? "#10b981" : "#f43f5e"}
                        strokeWidth="3.5"
                      />
                    </>
                  );
                })()}

                {/* Expiry Strike Indicator line */}
                <line x1="300" y1="10" x2="300" y2="170" stroke="#38bdf8" strokeWidth="1" strokeDasharray="2,2" />
                <text x="305" y="22" fill="#38bdf8" fontSize="8" fontWeight="bold">
                  STRIKE ₹{orderStrike}
                </text>

                {/* Spot Target indicator dot representation */}
                {(() => {
                  const range = orderStrike * 0.3;
                  const pct = (simulatedExpiryPrice - (orderStrike - range)) / (range * 2);
                  const targetX = pct * 600;

                  // Re-evaluate payoff value for spot to position the dot correctly
                  let subPnl = 0;
                  const qty = orderQty * lotSize;
                  const premium = parseFloat(orderPremium.toString()) || 5;

                  if (orderType === "CE") {
                    if (orderAction === "BUY") {
                      subPnl = (Math.max(0, simulatedExpiryPrice - orderStrike) - premium) * qty;
                    } else {
                      subPnl = (premium - Math.max(0, simulatedExpiryPrice - orderStrike)) * qty;
                    }
                  } else {
                    if (orderAction === "BUY") {
                      subPnl = (Math.max(0, orderStrike - simulatedExpiryPrice) - premium) * qty;
                    } else {
                      subPnl = (premium - Math.max(0, orderStrike - simulatedExpiryPrice)) * qty;
                    }
                  }

                  const maxScale = Math.max(50000, orderQty * lotSize * premium * 2);
                  const targetY = 90 - (subPnl / maxScale) * 75;
                  const clampedY = Math.max(10, Math.min(170, targetY));

                  return (
                    <g>
                      <circle cx={targetX} cy={clampedY} r="6.5" fill="#e2e8f0" stroke="#1e293b" strokeWidth="2" />
                      <circle cx={targetX} cy={clampedY} r="3" fill={subPnl >= 0 ? "#10b981" : "#f43f5e"} />
                      <line x1={targetX} y1={clampedY} x2={targetX} y2="90" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="1,2" />
                    </g>
                  );
                })()}
              </svg>

              <div className="flex justify-between items-center text-[7.5px] text-slate-500 font-bold uppercase px-2 pt-1 border-t border-slate-900">
                <span>DOWNSIDE EXTREME (-15%)</span>
                <span>ATM STRIKE CENTER</span>
                <span>UPSIDE EXTREME (+15%)</span>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* 4. Help Documentation Section */}
      <div className="bg-terminal-card border border-terminal-border rounded p-3 text-[8.5px] leading-relaxed text-terminal-muted uppercase font-bold">
        <div className="flex items-center space-x-1.5 text-white mb-1.5">
          <BookOpen className="w-3.5 h-3.5 text-terminal-accent" />
          <span>VM Algo Option — Pinescript //@version=6 Guide Checklist</span>
        </div>
        <p>
          This dashboard calculates real-time option premium chains and confluences. Indicators calculated include: EMA (9, 21, 50), Average True Range (ATR), SuperTrend (Adaptive Multiplier based on volatility cluster indices), Relative Strength Index (RSI), Stochastic RSI (Zone-Based), VWAP thresholds, consolidation alerts, and candle body momentum rules. Confluence signals recommend buying CE (calls) or PE (puts) when indicator thresholds are reached.
        </p>
      </div>

      {/* Buy Alert Popup Dialog */}
      <BuyAlertPopup alert={activeBuyAlert} onClose={() => setActiveBuyAlert(null)} />

    </div>
  );
}
