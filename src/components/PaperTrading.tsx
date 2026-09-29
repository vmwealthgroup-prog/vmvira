/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  Briefcase,
  Layers,
  History,
  Coins,
  ShieldCheck,
  ShieldAlert,
  RotateCcw,
  PlusCircle,
  ChevronRight,
  BookOpen
} from "lucide-react";
import { CompanyMetadata, PaperAccount, PaperHolding, PaperOrder } from "../types";
import PortfolioRiskMetrics from "./PortfolioRiskMetrics";
import { isKillSwitchEngaged } from "../services/killSwitchService";

interface PaperTradingProps {
  stocks: CompanyMetadata[];
  onSelectStock: (ticker: string) => void;
}

const DEFAULT_ACCOUNT: PaperAccount = {
  balance: 1000000.00,
  initialBalance: 1000000.00,
  totalEquity: 1000000.00,
  holdingsValue: 0.00,
  totalPnl: 0.00,
  totalPnlPct: 0.00,
  holdings: [],
  orders: []
};

export default function PaperTrading({ stocks, onSelectStock }: PaperTradingProps) {
  const [account, setAccount] = useState<PaperAccount>(() => {
    const saved = localStorage.getItem("vm_algo_paper_trading");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return DEFAULT_ACCOUNT;
  });

  const [selectedTicker, setSelectedTicker] = useState<string>(stocks[0]?.ticker || "RELIANCE");
  const [orderType, setOrderType] = useState<"BUY" | "SELL">("BUY");
  const [orderExecution, setOrderExecution] = useState<"MARKET" | "LIMIT">("MARKET");
  const [limitPrice, setLimitPrice] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(10);
  const [orderFeedback, setOrderFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"holdings" | "risk" | "orders" | "insights">("holdings");
  const [prevPrices, setPrevPrices] = useState<Record<string, number>>({});
  const [tickChanges, setTickChanges] = useState<Record<string, "up" | "down" | null>>({});
  const [isKillActive, setIsKillActive] = useState(isKillSwitchEngaged());

  useEffect(() => {
    const handleKillSwitch = () => {
      setIsKillActive(isKillSwitchEngaged());
      const saved = localStorage.getItem("vm_algo_paper_trading");
      if (saved) {
        try {
          setAccount(JSON.parse(saved));
        } catch {}
      }
    };
    window.addEventListener("vm_algo_kill_switch_updated", handleKillSwitch);
    window.addEventListener("vm_algo_portfolio_flattened", handleKillSwitch);
    return () => {
      window.removeEventListener("vm_algo_kill_switch_updated", handleKillSwitch);
      window.removeEventListener("vm_algo_portfolio_flattened", handleKillSwitch);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("vm_algo_paper_trading", JSON.stringify(account));
  }, [account]);

  // High Frequency pricing sync ticking at 1s intervals
  useEffect(() => {
    const nextTickChanges: Record<string, "up" | "down" | null> = {};
    let priceChanged = false;

    stocks.forEach(stk => {
      const prev = prevPrices[stk.ticker];
      if (prev !== undefined && prev !== stk.price) {
        nextTickChanges[stk.ticker] = stk.price > prev ? "up" : "down";
        priceChanged = true;
      }
    });

    if (priceChanged) {
      setTickChanges(prev => ({ ...prev, ...nextTickChanges }));
      const timeout = setTimeout(() => setTickChanges({}), 800);

      const prices: Record<string, number> = {};
      stocks.forEach(stk => { prices[stk.ticker] = stk.price; });
      setPrevPrices(prices);

      setAccount(prev => {
        const updatedHoldings = prev.holdings.map(h => {
          const currentStock = stocks.find(s => s.ticker === h.ticker);
          if (!currentStock) return h;
          const currentValue = h.quantity * currentStock.price;
          const pnl = currentValue - h.totalCost;
          const pnlPct = h.totalCost > 0 ? (pnl / h.totalCost) * 100 : 0;
          return {
            ...h,
            currentPrice: currentStock.price,
            currentValue,
            pnl,
            pnlPct
          };
        });

        const holdingsValue = updatedHoldings.reduce((sum, h) => sum + h.currentValue, 0);
        const totalEquity = prev.balance + holdingsValue;
        const totalPnl = totalEquity - prev.initialBalance;
        const totalPnlPct = (totalPnl / prev.initialBalance) * 100;

        return {
          ...prev,
          holdings: updatedHoldings,
          holdingsValue,
          totalEquity,
          totalPnl,
          totalPnlPct
        };
      });

      return () => clearTimeout(timeout);
    } else {
      const prices: Record<string, number> = {};
      stocks.forEach(stk => { prices[stk.ticker] = stk.price; });
      setPrevPrices(prices);
    }
  }, [stocks]);

  const currentStock = stocks.find(s => s.ticker === selectedTicker) || stocks[0];
  const executionPrice = orderExecution === "LIMIT" ? parseFloat(limitPrice) || currentStock.price : currentStock.price;
  const estimatedValue = executionPrice * quantity;

  const executeOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setOrderFeedback(null);

    if (isKillSwitchEngaged()) {
      setOrderFeedback({
        type: "error",
        message: "ORDER REJECTED: Kill Switch is currently ENGAGED. Order placement is locked across all terminals."
      });
      return;
    }

    if (quantity <= 0) {
      setOrderFeedback({ type: "error", message: "Order quantity must be greater than zero." });
      return;
    }

    if (orderExecution === "LIMIT" && (!limitPrice || parseFloat(limitPrice) <= 0)) {
      setOrderFeedback({ type: "error", message: "Valid limit price required." });
      return;
    }

    const tradePrice = orderExecution === "LIMIT" ? parseFloat(limitPrice) : currentStock.price;
    const orderCost = tradePrice * quantity;

    if (orderType === "BUY") {
      if (account.balance < orderCost) {
        setOrderFeedback({
          type: "error",
          message: `Marginal shortage: Order requires ₹${orderCost.toLocaleString("en-IN")} but you only hold ₹${account.balance.toLocaleString("en-IN")} cash.`
        });
        return;
      }

      const newOrder: PaperOrder = {
        id: `ORD-${Date.now().toString().slice(-6)}`,
        ticker: currentStock.ticker,
        companyName: currentStock.name,
        type: "BUY",
        quantity,
        price: tradePrice,
        timestamp: new Date().toLocaleTimeString(),
        value: orderCost,
        orderType: orderExecution,
        limitPrice: orderExecution === "LIMIT" ? parseFloat(limitPrice) : undefined,
        status: "COMPLETED"
      };

      setAccount(prev => {
        const holdings = [...prev.holdings];
        const existingIdx = holdings.findIndex(h => h.ticker === currentStock.ticker);

        if (existingIdx !== -1) {
          const prevHolding = holdings[existingIdx];
          const combinedQty = prevHolding.quantity + quantity;
          const combinedCost = prevHolding.totalCost + orderCost;
          const avgPrice = combinedCost / combinedQty;
          
          holdings[existingIdx] = {
            ...prevHolding,
            quantity: combinedQty,
            totalCost: combinedCost,
            avgBuyPrice: parseFloat(avgPrice.toFixed(2)),
            currentPrice: currentStock.price,
            currentValue: combinedQty * currentStock.price,
            pnl: (combinedQty * currentStock.price) - combinedCost,
            pnlPct: ((combinedQty * currentStock.price - combinedCost) / combinedCost) * 100
          };
        } else {
          holdings.push({
            ticker: currentStock.ticker,
            companyName: currentStock.name,
            quantity,
            avgBuyPrice: tradePrice,
            currentPrice: currentStock.price,
            currentValue: orderCost,
            totalCost: orderCost,
            pnl: 0,
            pnlPct: 0
          });
        }

        const nextBalance = prev.balance - orderCost;
        const nextHoldingsValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
        const nextEquity = nextBalance + nextHoldingsValue;

        return {
          ...prev,
          balance: nextBalance,
          holdings,
          orders: [newOrder, ...prev.orders],
          holdingsValue: nextHoldingsValue,
          totalEquity: nextEquity,
          totalPnl: nextEquity - prev.initialBalance,
          totalPnlPct: ((nextEquity - prev.initialBalance) / prev.initialBalance) * 100
        };
      });

      setOrderFeedback({
        type: "success",
        message: `Routing Match: Executed BUY ${quantity} ${currentStock.ticker} at ₹${tradePrice.toFixed(2)}.`
      });
    } else {
      const holding = account.holdings.find(h => h.ticker === currentStock.ticker);
      if (!holding || holding.quantity < quantity) {
        setOrderFeedback({
          type: "error",
          message: `Rejected: Insufficient inventory. You hold ${holding ? holding.quantity : 0} shares of ${currentStock.ticker}.`
        });
        return;
      }

      const newOrder: PaperOrder = {
        id: `ORD-${Date.now().toString().slice(-6)}`,
        ticker: currentStock.ticker,
        companyName: currentStock.name,
        type: "SELL",
        quantity,
        price: tradePrice,
        timestamp: new Date().toLocaleTimeString(),
        value: orderCost,
        orderType: orderExecution,
        limitPrice: orderExecution === "LIMIT" ? parseFloat(limitPrice) : undefined,
        status: "COMPLETED"
      };

      setAccount(prev => {
        const holdings = prev.holdings.map(h => {
          if (h.ticker !== currentStock.ticker) return h;
          const remainingQty = h.quantity - quantity;
          const proportionCost = h.totalCost * (remainingQty / h.quantity);
          const val = remainingQty * currentStock.price;
          return {
            ...h,
            quantity: remainingQty,
            totalCost: proportionCost,
            currentValue: val,
            pnl: val - proportionCost,
            pnlPct: proportionCost > 0 ? ((val - proportionCost) / proportionCost) * 100 : 0
          };
        }).filter(h => h.quantity > 0);

        const nextBalance = prev.balance + orderCost;
        const nextHoldingsValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
        const nextEquity = nextBalance + nextHoldingsValue;

        return {
          ...prev,
          balance: nextBalance,
          holdings,
          orders: [newOrder, ...prev.orders],
          holdingsValue: nextHoldingsValue,
          totalEquity: nextEquity,
          totalPnl: nextEquity - prev.initialBalance,
          totalPnlPct: ((nextEquity - prev.initialBalance) / prev.initialBalance) * 100
        };
      });

      setOrderFeedback({
        type: "success",
        message: `Routing Match: Executed SELL ${quantity} ${currentStock.ticker} at ₹${tradePrice.toFixed(2)}.`
      });
    }
  };

  const squareOffHolding = (ticker: string) => {
    const holding = account.holdings.find(h => h.ticker === ticker);
    const stockInfo = stocks.find(s => s.ticker === ticker);
    if (!holding || !stockInfo) return;

    const currentPrice = stockInfo.price;
    const saleValue = currentPrice * holding.quantity;

    const newOrder: PaperOrder = {
      id: `SQF-${Date.now().toString().slice(-6)}`,
      ticker,
      companyName: holding.companyName,
      type: "SELL",
      quantity: holding.quantity,
      price: currentPrice,
      timestamp: new Date().toLocaleTimeString(),
      value: saleValue,
      orderType: "MARKET",
      status: "COMPLETED"
    };

    setAccount(prev => {
      const holdings = prev.holdings.filter(h => h.ticker !== ticker);
      const nextBalance = prev.balance + saleValue;
      const nextHoldingsValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
      const nextEquity = nextBalance + nextHoldingsValue;

      return {
        ...prev,
        balance: nextBalance,
        holdings,
        orders: [newOrder, ...prev.orders],
        holdingsValue: nextHoldingsValue,
        totalEquity: nextEquity,
        totalPnl: nextEquity - prev.initialBalance,
        totalPnlPct: ((nextEquity - prev.initialBalance) / prev.initialBalance) * 100
      };
    });
  };

  const addLiquidity = () => {
    setAccount(prev => {
      const nextBalance = prev.balance + 500000;
      return {
        ...prev,
        balance: nextBalance,
        totalEquity: nextBalance + prev.holdingsValue,
        initialBalance: prev.initialBalance + 500000
      };
    });
    setOrderFeedback({ type: "success", message: "Added ₹5,00,000 cash margin." });
  };

  const resetAccount = () => {
    if (confirm("Confirm soft portfolio reset? This clears active inventory and transactions history.")) {
      setAccount(DEFAULT_ACCOUNT);
      localStorage.removeItem("vm_algo_paper_trading");
      setOrderFeedback({ type: "success", message: "Account reset to default ₹10 Lakhs state." });
    }
  };

  const totalAssetsSum = account.balance + account.holdingsValue;
  const cashPct = totalAssetsSum > 0 ? (account.balance / totalAssetsSum) * 100 : 100;
  const holdingsPct = totalAssetsSum > 0 ? (account.holdingsValue / totalAssetsSum) * 100 : 0;
  const circumference = 2 * Math.PI * 35;
  const cashOffset = circumference * (1 - cashPct / 100);
  const holdingsOffset = circumference * (1 - holdingsPct / 100);

  return (
    <div className="p-4 space-y-4 font-mono text-xs">
      {/* Platform Title Banner */}
      <div className="border border-terminal-border bg-terminal-card p-3 rounded flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <div className="flex items-center space-x-2 text-terminal-accent">
            <Coins className="w-4 h-4 animate-pulse" />
            <h1 className="text-sm font-black tracking-wider uppercase font-display">
              VIRTUAL PAPER TRADING SIMULATION PANEL
            </h1>
          </div>
          <p className="text-[9px] text-terminal-muted uppercase tracking-wider mt-0.5">
            Real-time Exchange Matching Engine • Indian Equities (NSE) Live Feed
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={addLiquidity}
            className="px-2.5 py-1.5 bg-terminal-success/15 border border-terminal-success/30 hover:border-terminal-success text-terminal-success rounded text-[9px] uppercase font-bold tracking-wider flex items-center space-x-1 transition-all cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Add Margin</span>
          </button>
          <button
            onClick={resetAccount}
            className="px-2.5 py-1.5 bg-terminal-danger/15 border border-terminal-danger/30 hover:border-terminal-danger text-terminal-danger rounded text-[9px] uppercase font-bold tracking-wider flex items-center space-x-1 transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Portfolio</span>
          </button>
        </div>
      </div>

      {/* Account Balance Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="border border-terminal-border bg-terminal-card p-3 rounded">
          <span className="text-[8px] text-terminal-muted uppercase tracking-widest font-bold">Total Equity (NAV)</span>
          <div className="text-sm md:text-base font-black text-white mt-1">
            ₹{account.totalEquity.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="flex items-center space-x-1 mt-1 text-[8px] text-terminal-muted font-bold">
            <ShieldCheck className="w-3 h-3 text-terminal-accent" />
            <span className="uppercase">100% Margin Collateral</span>
          </div>
        </div>

        <div className="border border-terminal-border bg-terminal-card p-3 rounded">
          <span className="text-[8px] text-terminal-muted uppercase tracking-widest font-bold">Liquid Cash Balance</span>
          <div className="text-sm md:text-base font-black text-[#e5e5e5] mt-1">
            ₹{account.balance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[8px] text-terminal-success font-bold mt-1 uppercase">
            ● READY FOR DEPLOYMENT
          </div>
        </div>

        <div className="border border-terminal-border bg-terminal-card p-3 rounded">
          <span className="text-[8px] text-terminal-muted uppercase tracking-widest font-bold">Active Stocks Value</span>
          <div className="text-sm md:text-base font-black text-white mt-1">
            ₹{account.holdingsValue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[8px] text-terminal-muted uppercase mt-1">
            {account.holdings.length} Positions Open
          </div>
        </div>

        <div className="border border-terminal-border bg-terminal-card p-3 rounded">
          <span className="text-[8px] text-terminal-muted uppercase tracking-widest font-bold">Portfolio Yield (P&L)</span>
          <div className={`text-sm md:text-base font-black mt-1 flex items-center space-x-1 ${account.totalPnl >= 0 ? "text-terminal-success" : "text-terminal-danger"}`}>
            {account.totalPnl >= 0 ? "+" : ""}
            ₹{account.totalPnl.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className={`text-[8px] font-bold uppercase mt-1 flex items-center space-x-1 ${account.totalPnl >= 0 ? "text-terminal-success" : "text-terminal-danger"}`}>
            {account.totalPnl >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            <span>{account.totalPnlPct.toFixed(2)}% PnL</span>
          </div>
        </div>

        <div className="border border-terminal-border bg-terminal-card p-3 rounded col-span-2 lg:col-span-1 flex items-center justify-between lg:justify-center gap-3">
          <div className="relative w-10 h-10 shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="35" fill="transparent" stroke="#1f2229" strokeWidth="14" />
              <circle
                cx="50"
                cy="50"
                r="35"
                fill="transparent"
                stroke="#38bdf8"
                strokeWidth="14"
                strokeDasharray={circumference}
                strokeDashoffset={cashOffset}
                strokeLinecap="round"
              />
              <circle
                cx="50"
                cy="50"
                r="35"
                fill="transparent"
                stroke="#10b981"
                strokeWidth="14"
                strokeDasharray={circumference}
                strokeDashoffset={circumference - holdingsOffset}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-[7px] text-terminal-muted font-bold">
              CAP
            </div>
          </div>
          <div className="space-y-0.5 text-left text-[8px] uppercase">
            <div className="flex items-center space-x-1">
              <span className="w-1.5 h-1.5 bg-terminal-accent rounded-full inline-block" />
              <span className="text-terminal-muted">Cash:</span>
              <span className="font-bold text-white">{cashPct.toFixed(0)}%</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="w-1.5 h-1.5 bg-terminal-success rounded-full inline-block" />
              <span className="text-terminal-muted">Stock:</span>
              <span className="font-bold text-white">{holdingsPct.toFixed(0)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Terminal Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
        {/* Order Ticket */}
        <div className="border border-terminal-border bg-terminal-card p-3 rounded lg:col-span-4 space-y-3">
          <div className="border-b border-terminal-border pb-2 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-terminal-accent flex items-center space-x-1">
              <Layers className="w-3.5 h-3.5 text-terminal-accent" />
              <span>Exchange execution order</span>
            </span>
            <span className="text-[8px] bg-terminal-border px-1.5 py-0.5 rounded text-terminal-muted font-bold font-mono">
              LEVEL 1
            </span>
          </div>

          <form onSubmit={executeOrder} className="space-y-3">
            <div>
              <label className="text-[8px] text-terminal-muted uppercase tracking-widest font-bold block mb-1">Stock Selection</label>
              <select
                value={selectedTicker}
                onChange={(e) => {
                  setSelectedTicker(e.target.value);
                  setOrderFeedback(null);
                }}
                className="w-full bg-terminal-bg border border-terminal-border rounded h-9 px-2 text-white font-mono focus:border-terminal-accent outline-none text-[10px]"
              >
                {stocks.map(s => (
                  <option key={s.ticker} value={s.ticker}>
                    {s.ticker} — {s.name} (₹{s.price.toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setOrderType("BUY")}
                className={`py-1.5 text-[9px] font-black uppercase tracking-wider rounded border text-center transition-all cursor-pointer ${
                  orderType === "BUY" ? "bg-terminal-success text-white border-terminal-success" : "bg-terminal-bg text-terminal-muted border-terminal-border"
                }`}
              >
                BUY / LONG
              </button>
              <button
                type="button"
                onClick={() => setOrderType("SELL")}
                className={`py-1.5 text-[9px] font-black uppercase tracking-wider rounded border text-center transition-all cursor-pointer ${
                  orderType === "SELL" ? "bg-terminal-danger text-white border-terminal-danger" : "bg-terminal-bg text-terminal-muted border-terminal-border"
                }`}
              >
                SELL / SHORT
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setOrderExecution("MARKET")}
                className={`py-1 text-[8px] font-bold uppercase rounded border text-center cursor-pointer ${
                  orderExecution === "MARKET" ? "bg-terminal-accent/15 text-terminal-accent border-terminal-accent" : "bg-terminal-bg text-terminal-muted border-terminal-border"
                }`}
              >
                MARKET ORDER
              </button>
              <button
                type="button"
                onClick={() => setOrderExecution("LIMIT")}
                className={`py-1 text-[8px] font-bold uppercase rounded border text-center cursor-pointer ${
                  orderExecution === "LIMIT" ? "bg-terminal-accent/15 text-terminal-accent border-terminal-accent" : "bg-terminal-bg text-terminal-muted border-terminal-border"
                }`}
              >
                LIMIT ORDER
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[8px] text-terminal-muted uppercase tracking-widest font-bold block mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 0))}
                  className="w-full bg-terminal-bg border border-terminal-border rounded h-8 px-2 text-white font-mono focus:border-terminal-accent outline-none text-[10px]"
                />
              </div>

              <div>
                <label className="text-[8px] text-terminal-muted uppercase tracking-widest font-bold block mb-1">
                  {orderExecution === "MARKET" ? "LTP (INR)" : "Limit Price (INR)"}
                </label>
                {orderExecution === "MARKET" ? (
                  <div className="w-full bg-terminal-bg/50 border border-terminal-border/50 rounded h-8 px-2 text-terminal-muted font-mono flex items-center text-[10px]">
                    ₹{currentStock?.price.toFixed(2)}
                  </div>
                ) : (
                  <input
                    type="number"
                    step="0.05"
                    value={limitPrice}
                    placeholder={currentStock?.price.toString()}
                    onChange={(e) => setLimitPrice(e.target.value)}
                    className="w-full bg-terminal-bg border border-terminal-border rounded h-8 px-2 text-white font-mono focus:border-terminal-accent outline-none text-[10px]"
                  />
                )}
              </div>
            </div>

            <div className="bg-terminal-bg/60 p-2.5 rounded border border-terminal-border/60 text-[9px] space-y-1">
              <div className="flex justify-between">
                <span className="text-terminal-muted uppercase">Estimated cost:</span>
                <span className="text-white font-bold">
                  ₹{estimatedValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-terminal-muted uppercase">Brokerage (Tax):</span>
                <span className="text-terminal-success uppercase font-bold">₹0.00 (Zero Fee)</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isKillActive}
              className={`w-full py-2.5 rounded font-bold uppercase tracking-widest text-[9px] shadow transition-all ${
                isKillActive
                  ? "bg-red-950/60 border border-red-500/40 text-red-400 cursor-not-allowed"
                  : orderType === "BUY"
                  ? "bg-terminal-success hover:bg-terminal-success/90 text-white cursor-pointer"
                  : "bg-terminal-danger hover:bg-terminal-danger/90 text-white cursor-pointer"
              }`}
            >
              {isKillActive ? "ORDER ROUTING LOCKED (KILL SWITCH ACTIVE)" : `TRANSMIT ${orderType} POSITION`}
            </button>
          </form>

          {orderFeedback && (
            <div className={`p-2 rounded text-[8px] uppercase tracking-wide font-bold border ${
              orderFeedback.type === "success" ? "bg-terminal-success/10 border-terminal-success/30 text-terminal-success" : "bg-terminal-danger/10 border-terminal-danger/30 text-terminal-danger"
            }`}>
              {orderFeedback.type === "success" ? "✓ APPROVED: " : "⚠ REJECTED: "}
              {orderFeedback.message}
            </div>
          )}

          <div className="bg-terminal-bg/30 border border-terminal-border/50 rounded p-2 text-[9px] space-y-1">
            <span className="text-[8px] text-terminal-muted font-bold uppercase block mb-1">Contract Spec Detail</span>
            <div className="flex justify-between">
              <span className="text-terminal-muted">ISIN Code:</span>
              <span className="text-[#eee]">{currentStock?.isin}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-terminal-muted">52-Week H / L:</span>
              <span className="text-terminal-muted">₹{currentStock?.fiftyTwoWeekHigh} / ₹{currentStock?.fiftyTwoWeekLow}</span>
            </div>
            <button
              type="button"
              onClick={() => onSelectStock(currentStock.ticker)}
              className="text-terminal-accent uppercase text-[8px] font-bold hover:underline flex items-center space-x-1 pt-1.5 border-t border-terminal-border/40 mt-1 cursor-pointer w-full text-left bg-transparent border-0"
            >
              <span>Verify stock models in terminal</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Positions Drawer */}
        <div className="lg:col-span-8 border border-terminal-border bg-terminal-card rounded flex flex-col min-h-[440px]">
          <div className="border-b border-terminal-border flex justify-between items-center bg-terminal-bg/40 px-3">
            <div className="flex space-x-1 pt-2">
              <button
                onClick={() => setActiveTab("holdings")}
                className={`px-3 py-2 text-[9px] uppercase font-bold tracking-widest border-t-2 transition-all cursor-pointer ${
                  activeTab === "holdings" ? "border-terminal-accent text-white bg-terminal-card" : "border-transparent text-terminal-muted hover:text-white"
                }`}
              >
                <div className="flex items-center space-x-1.5">
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>Open Positions ({account.holdings.length})</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab("risk")}
                className={`px-3 py-2 text-[9px] uppercase font-bold tracking-widest border-t-2 transition-all cursor-pointer ${
                  activeTab === "risk" ? "border-terminal-accent text-white bg-terminal-card" : "border-transparent text-terminal-muted hover:text-white"
                }`}
              >
                <div className="flex items-center space-x-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Portfolio Risk & VaR</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab("orders")}
                className={`px-3 py-2 text-[9px] uppercase font-bold tracking-widest border-t-2 transition-all cursor-pointer ${
                  activeTab === "orders" ? "border-terminal-accent text-white bg-terminal-card" : "border-transparent text-terminal-muted hover:text-white"
                }`}
              >
                <div className="flex items-center space-x-1.5">
                  <History className="w-3.5 h-3.5" />
                  <span>Trade History ({account.orders.length})</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab("insights")}
                className={`px-3 py-2 text-[9px] uppercase font-bold tracking-widest border-t-2 transition-all cursor-pointer ${
                  activeTab === "insights" ? "border-terminal-accent text-white bg-terminal-card" : "border-transparent text-terminal-muted hover:text-white"
                }`}
              >
                <div className="flex items-center space-x-1.5">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Desk Commandments</span>
                </div>
              </button>
            </div>
            <span className="text-[8px] text-terminal-muted font-bold hidden md:inline">SECURE BROKER MATCH ENTRANCE</span>
          </div>

          <div className="flex-1 p-3 overflow-x-auto">
            {activeTab === "risk" && (
              <PortfolioRiskMetrics account={account} stocks={stocks} />
            )}

            {activeTab === "holdings" && (
              <div>
                {account.holdings.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
                    <Briefcase className="w-8 h-8 text-terminal-muted/30" />
                    <p className="text-[10px] font-bold uppercase text-terminal-muted">No Open Portfolio Holdings</p>
                    <p className="text-[8px] text-terminal-muted/70 max-w-xs">Transmit BUY orders on the left panel to open long positions and start tracking P&L.</p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse min-w-[500px]">
                    <thead>
                      <tr className="border-b border-terminal-border/80 text-[8px] text-terminal-muted uppercase">
                        <th className="pb-2">TICKER</th>
                        <th className="pb-2">QTY</th>
                        <th className="pb-2">AVG COST</th>
                        <th className="pb-2">LTP</th>
                        <th className="pb-2">NET VALUE</th>
                        <th className="pb-2 text-right">UNREALIZED P&L</th>
                        <th className="pb-2 text-right">ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-terminal-border/40 text-[9px]">
                      {account.holdings.map((h) => {
                        const tickType = tickChanges[h.ticker];
                        return (
                          <tr key={h.ticker} className="hover:bg-terminal-card-hover/40 transition-all">
                            <td className="py-2 font-bold text-white">
                              <span className="text-terminal-accent cursor-pointer hover:underline" onClick={() => onSelectStock(h.ticker)}>
                                {h.ticker}
                              </span>
                              <span className="text-[7px] text-terminal-muted font-normal block max-w-[110px] truncate">{h.companyName}</span>
                            </td>
                            <td className="py-2 font-bold">{h.quantity}</td>
                            <td className="py-2">₹{h.avgBuyPrice.toFixed(2)}</td>
                            <td className={`py-2 font-bold transition-all duration-300 ${
                              tickType === "up" ? "text-terminal-success scale-102 font-black" :
                              tickType === "down" ? "text-terminal-danger scale-102 font-black" : "text-white"
                            }`}>
                              ₹{h.currentPrice.toFixed(2)}
                            </td>
                            <td className="py-2">₹{h.currentValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                            <td className={`py-2 text-right font-bold ${h.pnl >= 0 ? "text-terminal-success" : "text-terminal-danger"}`}>
                              {h.pnl >= 0 ? "+" : ""}₹{h.pnl.toLocaleString("en-IN", { minimumFractionDigits: 2 })} ({h.pnlPct.toFixed(2)}%)
                            </td>
                            <td className="py-2 text-right">
                              <button
                                onClick={() => squareOffHolding(h.ticker)}
                                className="px-2 py-1 bg-terminal-danger/10 hover:bg-terminal-danger border border-terminal-danger/30 text-terminal-danger hover:text-white rounded text-[8px] uppercase font-bold transition-all cursor-pointer"
                              >
                                SQUARE OFF
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {activeTab === "orders" && (
              <div>
                {account.orders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <History className="w-8 h-8 text-terminal-muted/30" />
                    <p className="text-[10px] font-bold uppercase text-terminal-muted mt-2">Zero Transactions Recorded</p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse min-w-[500px]">
                    <thead>
                      <tr className="border-b border-terminal-border/80 text-[8px] text-terminal-muted uppercase">
                        <th className="pb-2">ORDER ID</th>
                        <th className="pb-2">TIME</th>
                        <th className="pb-2">ASSET</th>
                        <th className="pb-2">TYPE</th>
                        <th className="pb-2">QTY</th>
                        <th className="pb-2">PRICE</th>
                        <th className="pb-2">TOTAL</th>
                        <th className="pb-2 text-right">STATUS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-terminal-border/40 text-[9px] font-mono">
                      {account.orders.map((o) => (
                        <tr key={o.id} className="hover:bg-terminal-card-hover/20">
                          <td className="py-2 text-terminal-muted">{o.id}</td>
                          <td className="py-2 text-terminal-muted">{o.timestamp}</td>
                          <td className="py-2 text-white font-bold">{o.ticker}</td>
                          <td className="py-2">
                            <span className={`px-1 py-0.5 rounded text-[7px] font-bold ${
                              o.type === "BUY" ? "bg-terminal-success/15 text-terminal-success" : "bg-terminal-danger/15 text-terminal-danger"
                            }`}>{o.type}</span>
                          </td>
                          <td className="py-2 font-bold">{o.quantity}</td>
                          <td className="py-2">₹{o.price.toFixed(2)}</td>
                          <td className="py-2">₹{o.value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                          <td className="py-2 text-right text-terminal-success font-bold">● SUCCESS</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {activeTab === "insights" && (
              <div className="space-y-4 max-w-2xl mx-auto p-4 border border-terminal-border/60 bg-terminal-bg/50 rounded">
                <div className="flex items-center space-x-2 text-terminal-accent border-b border-terminal-border pb-1.5">
                  <ShieldCheck className="w-4 h-4 text-terminal-accent" />
                  <h3 className="font-bold text-[9px] uppercase tracking-wider font-display">20-Year Trading Vet commandments</h3>
                </div>

                <div className="space-y-3 text-[9px] text-terminal-muted uppercase">
                  <div>
                    <span className="text-white font-bold">1. Positional sizing preserves margin:</span>
                    <p className="text-[8.5px] lowercase normal-case mt-0.5 leading-relaxed">
                      "Floor pros never look for quick jackpot markup. They focus on positional allocation. Keep active equity layout under 10% on highly volatile segments."
                    </p>
                  </div>
                  <div>
                    <span className="text-white font-bold">2. Pre-define your stop losses:</span>
                    <p className="text-[8.5px] lowercase normal-case mt-0.5 leading-relaxed">
                      "Always establish your exit parameters before routing a BUY trade. Stop-losses are not optional guidelines, they are life insurance."
                    </p>
                  </div>
                  <div>
                    <span className="text-white font-bold">3. Trade liquid assets:</span>
                    <p className="text-[8.5px] lowercase normal-case mt-0.5 leading-relaxed">
                      "Stick strictly to the top index majors (Reliance, TCS, HDFC Bank) which are seeded here. They offer deep order book liquidity and the tightest spreads."
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
