/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  ClipboardList,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Power,
  Flame,
  CheckCircle,
  XCircle,
  RotateCcw,
  Search,
  Filter,
  Download,
  PlusCircle,
  TrendingUp,
  TrendingDown,
  Layers,
  Coins,
  Bitcoin,
  Sliders,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  CompanyMetadata,
  UnifiedOrder,
  UnifiedOrderStatus,
  AssetCategory,
  OrderExecutionType,
  KillSwitchConfig
} from "../types";
import {
  getUnifiedOrders,
  saveUnifiedOrders,
  placeUnifiedOrder,
  cancelUnifiedOrder,
  cancelAllPendingOrders,
  emergencyFlattenAllPositions,
  getKillSwitchConfig,
  updateKillSwitchSettings,
  isKillSwitchEngaged
} from "../services/killSwitchService";
import KillSwitchModal from "./KillSwitchModal";

interface OrdersAndKillSwitchProps {
  stocks: CompanyMetadata[];
  onSelectStock: (ticker: string) => void;
}

export default function OrdersAndKillSwitch({ stocks, onSelectStock }: OrdersAndKillSwitchProps) {
  const [activeTab, setActiveTab] = useState<"orderbook" | "positions" | "new_order" | "risk_settings">("orderbook");
  const [orders, setOrders] = useState<UnifiedOrder[]>([]);
  const [killSwitchConfig, setKillSwitchConfig] = useState<KillSwitchConfig>(getKillSwitchConfig());
  const [isKillModalOpen, setIsKillModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"ALL" | UnifiedOrderStatus>("ALL");
  const [assetFilter, setAssetFilter] = useState<"ALL" | AssetCategory>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [orderFeedback, setOrderFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // New Order Ticket State
  const [ticketCategory, setTicketCategory] = useState<AssetCategory>("EQUITY");
  const [ticketTicker, setTicketTicker] = useState<string>(stocks[0]?.ticker || "RELIANCE");
  const [ticketSide, setTicketSide] = useState<"BUY" | "SELL">("BUY");
  const [ticketOrderType, setTicketOrderType] = useState<OrderExecutionType>("MARKET");
  const [ticketQuantity, setTicketQuantity] = useState<number>(10);
  const [ticketLimitPrice, setTicketLimitPrice] = useState<string>("");
  const [ticketStrike, setTicketStrike] = useState<number>(2400);
  const [ticketOptionType, setTicketOptionType] = useState<"CE" | "PE">("CE");

  // Load orders & config
  const refreshData = () => {
    setOrders(getUnifiedOrders());
    setKillSwitchConfig(getKillSwitchConfig());
  };

  useEffect(() => {
    refreshData();

    const handleKillSwitchChange = () => {
      setKillSwitchConfig(getKillSwitchConfig());
      setOrders(getUnifiedOrders());
    };

    const handleOrdersChange = () => {
      setOrders(getUnifiedOrders());
    };

    window.addEventListener("vm_algo_kill_switch_updated", handleKillSwitchChange);
    window.addEventListener("vm_algo_orders_updated", handleOrdersChange);
    window.addEventListener("vm_algo_portfolio_flattened", refreshData);

    const interval = setInterval(refreshData, 3000);

    return () => {
      window.removeEventListener("vm_algo_kill_switch_updated", handleKillSwitchChange);
      window.removeEventListener("vm_algo_orders_updated", handleOrdersChange);
      window.removeEventListener("vm_algo_portfolio_flattened", refreshData);
      clearInterval(interval);
    };
  }, []);

  const isEngaged = killSwitchConfig.isEngaged;

  // Working positions extraction
  const getEquityHoldings = () => {
    try {
      const saved = localStorage.getItem("vm_algo_paper_trading");
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.holdings || [];
      }
    } catch {}
    return [];
  };

  const getOptionHoldings = () => {
    try {
      const saved = localStorage.getItem("vm_algo_options_holdings");
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  };

  const getCryptoHoldings = () => {
    try {
      const saved = localStorage.getItem("vm_algo_crypto_holdings");
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  };

  const equityHoldings = getEquityHoldings();
  const optionHoldings = getOptionHoldings();
  const cryptoHoldings = getCryptoHoldings();
  const totalOpenPositionsCount = equityHoldings.length + optionHoldings.length + cryptoHoldings.length;

  // Filtered orders list
  const filteredOrders = orders.filter(o => {
    const matchesStatus = statusFilter === "ALL" || o.status === statusFilter;
    const matchesAsset = assetFilter === "ALL" || o.assetCategory === assetFilter;
    const matchesSearch =
      !searchQuery ||
      o.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesAsset && matchesSearch;
  });

  const openOrdersCount = orders.filter(o => o.status === "OPEN").length;
  const completedOrdersCount = orders.filter(o => o.status === "COMPLETED").length;
  const cancelledOrdersCount = orders.filter(o => o.status === "CANCELLED" || o.status === "REJECTED").length;

  // Handlers
  const handleCancelOrder = (orderId: string) => {
    const success = cancelUnifiedOrder(orderId);
    if (success) {
      setOrderFeedback({ type: "success", message: `Order ${orderId} cancelled successfully.` });
      refreshData();
    } else {
      setOrderFeedback({ type: "error", message: `Unable to cancel order ${orderId}.` });
    }
  };

  const handleCancelAll = () => {
    if (openOrdersCount === 0) {
      setOrderFeedback({ type: "error", message: "No open orders to cancel." });
      return;
    }
    const count = cancelAllPendingOrders();
    setOrderFeedback({ type: "success", message: `Cancelled ${count} working orders.` });
    refreshData();
  };

  const handleFlattenAll = () => {
    if (confirm("EMERGENCY FLATTEN CONFIRMATION: Liquidate all equity, option, and crypto positions immediately at market?")) {
      const result = emergencyFlattenAllPositions(stocks);
      setOrderFeedback({
        type: "success",
        message: `Emergency flattened ${result.stocks} equities, ${result.options} options, and ${result.crypto} crypto positions.`
      });
      refreshData();
    }
  };

  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setOrderFeedback(null);

    if (ticketQuantity <= 0) {
      setOrderFeedback({ type: "error", message: "Order quantity must be positive." });
      return;
    }

    let tradePrice = 0;
    let tickerName = ticketTicker;

    if (ticketCategory === "EQUITY") {
      const stk = stocks.find(s => s.ticker === ticketTicker);
      tradePrice = stk ? stk.price : 1000;
      tickerName = stk ? stk.name : ticketTicker;
    } else if (ticketCategory === "OPTION") {
      tradePrice = ticketOptionType === "CE" ? 85.5 : 92.0;
      tickerName = `${ticketTicker} ${ticketStrike} ${ticketOptionType}`;
    } else {
      tradePrice = ticketTicker === "BTC" ? 64280 : ticketTicker === "ETH" ? 3480 : 168;
      tickerName = `${ticketTicker} Perpetual`;
    }

    const limitP = ticketOrderType === "LIMIT" ? parseFloat(ticketLimitPrice) : undefined;
    if (ticketOrderType === "LIMIT" && (!limitP || limitP <= 0)) {
      setOrderFeedback({ type: "error", message: "Valid limit price required for LIMIT order." });
      return;
    }

    const result = placeUnifiedOrder(
      {
        ticker: ticketTicker,
        name: tickerName,
        assetCategory: ticketCategory,
        side: ticketSide,
        orderType: ticketOrderType,
        quantity: ticketQuantity,
        price: tradePrice,
        limitPrice: limitP,
        strike: ticketCategory === "OPTION" ? ticketStrike : undefined,
        optionType: ticketCategory === "OPTION" ? ticketOptionType : undefined,
        source: "MANUAL"
      },
      stocks
    );

    if (result.success) {
      setOrderFeedback({
        type: "success",
        message: `Order submitted: ${ticketSide} ${ticketQuantity} ${tickerName} (${result.order?.id}).`
      });
      refreshData();
      setActiveTab("orderbook");
    } else {
      setOrderFeedback({
        type: "error",
        message: result.error || "Order rejected."
      });
    }
  };

  const handleExportCSV = () => {
    if (orders.length === 0) return;
    const headers = ["ID", "Timestamp", "Asset", "Symbol", "Side", "Type", "Qty", "Price", "Value", "Status", "Source"];
    const rows = orders.map(o => [
      o.id,
      o.timestamp,
      o.assetCategory,
      o.symbol,
      o.side,
      o.orderType,
      o.quantity,
      o.price,
      o.value,
      o.status,
      o.source
    ]);
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `VM_ALGO_ORDERS_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 space-y-4 font-mono select-none">
      {/* Top Banner if Kill Switch is Engaged */}
      <AnimatePresence>
        {isEngaged && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3 bg-red-950/80 border-2 border-red-500 rounded-lg text-white shadow-xl shadow-red-900/40 flex flex-col md:flex-row items-center justify-between gap-3 animate-pulse"
          >
            <div className="flex items-center space-x-3">
              <ShieldAlert className="w-6 h-6 text-red-400 shrink-0" />
              <div>
                <span className="font-black text-xs text-red-400 uppercase tracking-widest block">
                  EMERGENCY KILL SWITCH ENGAGED — ORDER EXECUTION LOCKED
                </span>
                <p className="text-[10px] text-red-200">
                  All automated algorithmic bots are halted. New orders are blocked from execution.
                  Reason: <em>"{killSwitchConfig.reason || "High risk protocol triggered"}"</em>
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 shrink-0">
              <button
                onClick={() => setIsKillModalOpen(true)}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-black text-[10px] uppercase tracking-wider rounded shadow transition-all flex items-center space-x-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Disarm Kill Switch</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Control Header */}
      <div className="border border-terminal-border bg-terminal-card p-4 rounded-lg flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <ClipboardList className="w-5 h-5 text-terminal-accent" />
            <span className="font-bold text-sm text-white uppercase tracking-wider">
              ORDER BOOK & KILL SWITCH DESK
            </span>
            <span className={`text-[9px] px-2 py-0.5 rounded font-black tracking-widest uppercase border ${
              isEngaged
                ? "bg-red-500/20 text-red-400 border-red-500/40 animate-pulse"
                : "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
            }`}>
              ● {isEngaged ? "KILL SWITCH ENGAGED" : "KILL SWITCH ARMED"}
            </span>
          </div>
          <p className="text-[10px] text-terminal-muted uppercase tracking-wider mt-1">
            Real-time multi-asset order routing, working order cancellation, and emergency risk controls
          </p>
        </div>

        {/* Global Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Emergency Kill Switch Trigger / Disarm Button */}
          {!isEngaged ? (
            <button
              onClick={() => setIsKillModalOpen(true)}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded uppercase font-black text-[10px] tracking-widest shadow-md shadow-red-950 flex items-center space-x-1.5 transition-all"
              title="Emergency Kill Switch: Halts all bots & locks trading"
            >
              <Power className="w-3.5 h-3.5" />
              <span>EMERGENCY KILL SWITCH</span>
            </button>
          ) : (
            <button
              onClick={() => setIsKillModalOpen(true)}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-black rounded uppercase font-black text-[10px] tracking-widest shadow-md flex items-center space-x-1.5 transition-all"
              title="Disarm Kill Switch: Clear locks and resume trading"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>DISARM KILL SWITCH</span>
            </button>
          )}

          {/* Quick Cancel All Orders */}
          <button
            onClick={handleCancelAll}
            disabled={openOrdersCount === 0}
            className="px-3 py-1.5 bg-terminal-card border border-terminal-border hover:bg-terminal-card-hover text-terminal-muted hover:text-white rounded uppercase font-bold text-[9px] tracking-wider transition-colors disabled:opacity-40"
          >
            Cancel All Open ({openOrdersCount})
          </button>

          {/* Quick Flatten All Positions */}
          <button
            onClick={handleFlattenAll}
            disabled={totalOpenPositionsCount === 0}
            className="px-3 py-1.5 bg-red-950/40 border border-red-500/40 text-red-300 hover:bg-red-900/50 rounded uppercase font-bold text-[9px] tracking-wider transition-colors flex items-center space-x-1 disabled:opacity-40"
          >
            <Flame className="w-3 h-3 text-amber-500" />
            <span>Flatten Positions ({totalOpenPositionsCount})</span>
          </button>

          {/* Refresh */}
          <button
            onClick={refreshData}
            className="p-1.5 bg-terminal-card border border-terminal-border hover:bg-terminal-card-hover rounded text-terminal-muted hover:text-white transition-colors"
            title="Refresh Order Book"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 bg-terminal-card border border-terminal-border rounded">
          <span className="text-[9px] text-terminal-muted uppercase tracking-wider block">Working Orders</span>
          <div className="flex items-baseline space-x-2 mt-0.5">
            <span className="text-base font-bold text-terminal-accent">{openOrdersCount}</span>
            <span className="text-[9px] text-terminal-muted">Pending routing</span>
          </div>
        </div>

        <div className="p-3 bg-terminal-card border border-terminal-border rounded">
          <span className="text-[9px] text-terminal-muted uppercase tracking-wider block">Executed Today</span>
          <div className="flex items-baseline space-x-2 mt-0.5">
            <span className="text-base font-bold text-terminal-success">{completedOrdersCount}</span>
            <span className="text-[9px] text-terminal-muted">Filled trades</span>
          </div>
        </div>

        <div className="p-3 bg-terminal-card border border-terminal-border rounded">
          <span className="text-[9px] text-terminal-muted uppercase tracking-wider block">Cancelled / Rejected</span>
          <div className="flex items-baseline space-x-2 mt-0.5">
            <span className="text-base font-bold text-terminal-danger">{cancelledOrdersCount}</span>
            <span className="text-[9px] text-terminal-muted">Risk protected</span>
          </div>
        </div>

        <div className="p-3 bg-terminal-card border border-terminal-border rounded">
          <span className="text-[9px] text-terminal-muted uppercase tracking-wider block">Active Open Inventory</span>
          <div className="flex items-baseline space-x-2 mt-0.5">
            <span className="text-base font-bold text-white">{totalOpenPositionsCount}</span>
            <span className="text-[9px] text-terminal-muted">Across all desks</span>
          </div>
        </div>
      </div>

      {/* Feedback message banner */}
      {orderFeedback && (
        <div
          className={`p-3 rounded border text-[10px] font-bold flex items-center justify-between ${
            orderFeedback.type === "success"
              ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
              : "bg-red-950/40 border-red-500/40 text-red-300"
          }`}
        >
          <div className="flex items-center space-x-2">
            {orderFeedback.type === "success" ? (
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-400" />
            )}
            <span>{orderFeedback.message}</span>
          </div>
          <button
            onClick={() => setOrderFeedback(null)}
            className="text-terminal-muted hover:text-white text-xs px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* View Tabs */}
      <div className="flex border-b border-terminal-border space-x-2 text-[10px] font-bold uppercase">
        <button
          onClick={() => setActiveTab("orderbook")}
          className={`pb-2 px-3 transition-colors border-b-2 ${
            activeTab === "orderbook"
              ? "border-terminal-accent text-terminal-accent"
              : "border-transparent text-terminal-muted hover:text-white"
          }`}
        >
          Order Book ({orders.length})
        </button>
        <button
          onClick={() => setActiveTab("positions")}
          className={`pb-2 px-3 transition-colors border-b-2 ${
            activeTab === "positions"
              ? "border-terminal-accent text-terminal-accent"
              : "border-transparent text-terminal-muted hover:text-white"
          }`}
        >
          Active Positions ({totalOpenPositionsCount})
        </button>
        <button
          onClick={() => setActiveTab("new_order")}
          className={`pb-2 px-3 transition-colors border-b-2 flex items-center space-x-1.5 ${
            activeTab === "new_order"
              ? "border-terminal-accent text-terminal-accent"
              : "border-transparent text-terminal-muted hover:text-white"
          }`}
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>Place Order</span>
        </button>
        <button
          onClick={() => setActiveTab("risk_settings")}
          className={`pb-2 px-3 transition-colors border-b-2 flex items-center space-x-1.5 ${
            activeTab === "risk_settings"
              ? "border-terminal-accent text-terminal-accent"
              : "border-transparent text-terminal-muted hover:text-white"
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Circuit Breakers & Audit Log</span>
        </button>
      </div>

      {/* TAB 1: ORDER BOOK */}
      {activeTab === "orderbook" && (
        <div className="space-y-3">
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-terminal-card p-3 border border-terminal-border rounded">
            {/* Status Filter Chips */}
            <div className="flex items-center space-x-1.5 overflow-x-auto">
              {(["ALL", "OPEN", "COMPLETED", "CANCELLED", "REJECTED"] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded text-[9px] font-bold uppercase tracking-wider transition-colors ${
                    statusFilter === st
                      ? "bg-terminal-accent text-white"
                      : "bg-terminal-bg text-terminal-muted hover:text-white border border-terminal-border"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Asset Category & Search */}
            <div className="flex items-center space-x-2">
              <select
                value={assetFilter}
                onChange={(e) => setAssetFilter(e.target.value as any)}
                className="bg-terminal-bg border border-terminal-border rounded px-2 py-1 text-white text-[9px] uppercase font-bold focus:outline-none"
              >
                <option value="ALL">All Asset Classes</option>
                <option value="EQUITY">Equities (NSE)</option>
                <option value="OPTION">Options (Derivatives)</option>
                <option value="CRYPTO">Crypto Assets</option>
              </select>

              <div className="relative">
                <input
                  type="text"
                  placeholder="Filter Symbol / ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-terminal-bg border border-terminal-border rounded pl-6 pr-2 py-1 text-[9px] text-white focus:outline-none focus:border-terminal-accent w-36 uppercase font-bold"
                />
                <Search className="w-3 h-3 text-terminal-muted absolute left-1.5 top-2" />
              </div>

              <button
                onClick={handleExportCSV}
                className="p-1.5 bg-terminal-bg border border-terminal-border hover:bg-terminal-card-hover rounded text-terminal-muted hover:text-white transition-colors"
                title="Export Order Book to CSV"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Orders Table */}
          <div className="border border-terminal-border bg-terminal-card rounded overflow-x-auto">
            <table className="w-full text-left text-[10px] whitespace-nowrap">
              <thead className="bg-terminal-bg border-b border-terminal-border text-terminal-muted uppercase text-[8px] tracking-wider">
                <tr>
                  <th className="p-2.5">Time</th>
                  <th className="p-2.5">Order ID</th>
                  <th className="p-2.5">Instrument</th>
                  <th className="p-2.5">Category</th>
                  <th className="p-2.5">Side</th>
                  <th className="p-2.5">Type</th>
                  <th className="p-2.5 text-right">Quantity</th>
                  <th className="p-2.5 text-right">Price</th>
                  <th className="p-2.5 text-right">Total Value</th>
                  <th className="p-2.5 text-center">Status</th>
                  <th className="p-2.5">Source</th>
                  <th className="p-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-terminal-border/50">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="p-8 text-center text-terminal-muted">
                      No orders match the current filters.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => {
                    const isBuy = order.side === "BUY";
                    return (
                      <tr key={order.id} className="hover:bg-terminal-card-hover/50 transition-colors">
                        <td className="p-2.5 text-terminal-muted">{order.timestamp}</td>
                        <td className="p-2.5 font-bold text-terminal-accent">{order.id}</td>
                        <td className="p-2.5">
                          <span className="font-bold text-white">{order.symbol}</span>
                          {order.name && order.name !== order.symbol && (
                            <span className="block text-[8px] text-terminal-muted truncate max-w-[120px]">
                              {order.name}
                            </span>
                          )}
                        </td>
                        <td className="p-2.5">
                          <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase ${
                            order.assetCategory === "EQUITY"
                              ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                              : order.assetCategory === "OPTION"
                              ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                              : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          }`}>
                            {order.assetCategory}
                          </span>
                        </td>
                        <td className="p-2.5">
                          <span className={`font-black text-[9px] px-1.5 py-0.5 rounded ${
                            isBuy ? "bg-terminal-success/20 text-terminal-success" : "bg-terminal-danger/20 text-terminal-danger"
                          }`}>
                            {order.side}
                          </span>
                        </td>
                        <td className="p-2.5 text-terminal-muted font-bold">{order.orderType}</td>
                        <td className="p-2.5 text-right font-bold text-white">{order.quantity}</td>
                        <td className="p-2.5 text-right font-bold text-white">
                          ₹{order.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-2.5 text-right font-bold text-terminal-accent">
                          ₹{order.value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-2.5 text-center">
                          <span className={`text-[8px] px-2 py-0.5 rounded font-black uppercase tracking-wider ${
                            order.status === "COMPLETED"
                              ? "bg-terminal-success/20 text-terminal-success border border-terminal-success/30"
                              : order.status === "OPEN"
                              ? "bg-blue-500/20 text-blue-400 border border-blue-500/30 animate-pulse"
                              : order.status === "CANCELLED"
                              ? "bg-terminal-muted/20 text-terminal-muted border border-terminal-border"
                              : "bg-terminal-danger/20 text-terminal-danger border border-terminal-danger/30"
                          }`}>
                            {order.status}
                          </span>
                          {order.rejectReason && (
                            <span className="block text-[8px] text-red-400 truncate max-w-[140px] mt-0.5" title={order.rejectReason}>
                              {order.rejectReason}
                            </span>
                          )}
                        </td>
                        <td className="p-2.5">
                          <span className="text-[8px] text-terminal-muted uppercase">
                            {order.source}
                          </span>
                        </td>
                        <td className="p-2.5 text-right">
                          {order.status === "OPEN" ? (
                            <button
                              onClick={() => handleCancelOrder(order.id)}
                              className="px-2 py-1 bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white rounded text-[8px] font-bold uppercase transition-colors"
                            >
                              Cancel
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setTicketCategory(order.assetCategory);
                                setTicketTicker(order.ticker);
                                setTicketSide(order.side);
                                setTicketQuantity(order.quantity);
                                setActiveTab("new_order");
                              }}
                              className="px-2 py-1 bg-terminal-card border border-terminal-border hover:bg-terminal-card-hover text-terminal-muted hover:text-white rounded text-[8px] font-bold uppercase transition-colors"
                            >
                              Repeat
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: ACTIVE POSITIONS */}
      {activeTab === "positions" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-terminal-card p-3 border border-terminal-border rounded">
            <div>
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Multi-Asset Consolidated Portfolio Inventory
              </span>
              <p className="text-[9px] text-terminal-muted">
                Active positions held in Equities (NSE), Options Derivatives, and Crypto perpetual desks
              </p>
            </div>
            <button
              onClick={handleFlattenAll}
              disabled={totalOpenPositionsCount === 0}
              className="px-3 py-1.5 bg-red-950/40 border border-red-500/40 text-red-300 hover:bg-red-900/50 rounded uppercase font-bold text-[9px] tracking-wider transition-colors flex items-center space-x-1.5 disabled:opacity-40"
            >
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              <span>Emergency Flatten All ({totalOpenPositionsCount})</span>
            </button>
          </div>

          {/* Equities table */}
          <div className="border border-terminal-border bg-terminal-card rounded overflow-hidden">
            <div className="p-2.5 bg-terminal-bg border-b border-terminal-border font-bold text-[10px] text-terminal-accent uppercase flex items-center space-x-2">
              <Coins className="w-3.5 h-3.5" />
              <span>NSE Equities Desk Holdings ({equityHoldings.length})</span>
            </div>
            <table className="w-full text-left text-[10px] whitespace-nowrap">
              <thead className="bg-terminal-bg/50 border-b border-terminal-border text-terminal-muted uppercase text-[8px]">
                <tr>
                  <th className="p-2.5">Ticker</th>
                  <th className="p-2.5 text-right">Quantity</th>
                  <th className="p-2.5 text-right">Avg Price</th>
                  <th className="p-2.5 text-right">LTP</th>
                  <th className="p-2.5 text-right">Current Value</th>
                  <th className="p-2.5 text-right">Unrealized P&L</th>
                  <th className="p-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-terminal-border/40">
                {equityHoldings.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-4 text-center text-terminal-muted">
                      No open equity holdings.
                    </td>
                  </tr>
                ) : (
                  equityHoldings.map((h: any) => {
                    const isProfit = h.pnl >= 0;
                    return (
                      <tr key={h.ticker} className="hover:bg-terminal-card-hover/50">
                        <td className="p-2.5 font-bold text-white">{h.ticker}</td>
                        <td className="p-2.5 text-right font-bold">{h.quantity}</td>
                        <td className="p-2.5 text-right">₹{h.avgBuyPrice?.toFixed(2)}</td>
                        <td className="p-2.5 text-right font-bold text-white">₹{h.currentPrice?.toFixed(2)}</td>
                        <td className="p-2.5 text-right font-bold text-terminal-accent">
                          ₹{h.currentValue?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className={`p-2.5 text-right font-bold ${isProfit ? "text-terminal-success" : "text-terminal-danger"}`}>
                          {isProfit ? "+" : ""}₹{h.pnl?.toFixed(2)} ({isProfit ? "+" : ""}{h.pnlPct?.toFixed(2)}%)
                        </td>
                        <td className="p-2.5 text-right">
                          <button
                            onClick={() => {
                              const stk = stocks.find(s => s.ticker === h.ticker);
                              placeUnifiedOrder(
                                {
                                  ticker: h.ticker,
                                  name: h.companyName || h.ticker,
                                  assetCategory: "EQUITY",
                                  side: "SELL",
                                  orderType: "MARKET",
                                  quantity: h.quantity,
                                  price: stk ? stk.price : h.currentPrice,
                                  source: "MANUAL"
                                },
                                stocks
                              );
                              refreshData();
                            }}
                            className="px-2 py-0.5 bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white rounded text-[8px] font-bold uppercase transition-colors"
                          >
                            Square Off
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Options holdings table */}
          <div className="border border-terminal-border bg-terminal-card rounded overflow-hidden">
            <div className="p-2.5 bg-terminal-bg border-b border-terminal-border font-bold text-[10px] text-purple-400 uppercase flex items-center space-x-2">
              <Layers className="w-3.5 h-3.5" />
              <span>Options Derivatives Desk Holdings ({optionHoldings.length})</span>
            </div>
            <table className="w-full text-left text-[10px] whitespace-nowrap">
              <thead className="bg-terminal-bg/50 border-b border-terminal-border text-terminal-muted uppercase text-[8px]">
                <tr>
                  <th className="p-2.5">Contract</th>
                  <th className="p-2.5 text-right">Lots</th>
                  <th className="p-2.5 text-right">Buy Premium</th>
                  <th className="p-2.5 text-right">Current Premium</th>
                  <th className="p-2.5 text-right">Total Exposure</th>
                  <th className="p-2.5 text-right">P&L</th>
                  <th className="p-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-terminal-border/40">
                {optionHoldings.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-4 text-center text-terminal-muted">
                      No open options contracts.
                    </td>
                  </tr>
                ) : (
                  optionHoldings.map((h: any) => (
                    <tr key={h.id || `${h.underlier}-${h.strike}-${h.type}`} className="hover:bg-terminal-card-hover/50">
                      <td className="p-2.5 font-bold text-white">
                        {h.underlier} {h.strike} {h.type}
                      </td>
                      <td className="p-2.5 text-right font-bold">{h.quantity} lots</td>
                      <td className="p-2.5 text-right">₹{h.buyPremium?.toFixed(2)}</td>
                      <td className="p-2.5 text-right font-bold text-white">₹{h.currentPremium?.toFixed(2)}</td>
                      <td className="p-2.5 text-right font-bold text-purple-400">
                        ₹{(h.totalCost || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-2.5 text-right font-bold text-terminal-muted">
                        ₹{(h.pnl || 0).toFixed(2)}
                      </td>
                      <td className="p-2.5 text-right">
                        <button
                          onClick={() => {
                            placeUnifiedOrder(
                              {
                                ticker: h.underlier,
                                assetCategory: "OPTION",
                                side: "SELL",
                                orderType: "MARKET",
                                quantity: h.quantity,
                                price: h.currentPremium || h.buyPremium,
                                strike: h.strike,
                                optionType: h.type,
                                source: "MANUAL"
                              },
                              stocks
                            );
                            refreshData();
                          }}
                          className="px-2 py-0.5 bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white rounded text-[8px] font-bold uppercase transition-colors"
                        >
                          Exit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Crypto holdings table */}
          <div className="border border-terminal-border bg-terminal-card rounded overflow-hidden">
            <div className="p-2.5 bg-terminal-bg border-b border-terminal-border font-bold text-[10px] text-amber-400 uppercase flex items-center space-x-2">
              <Bitcoin className="w-3.5 h-3.5" />
              <span>Crypto Perpetual Inventory ({cryptoHoldings.length})</span>
            </div>
            <table className="w-full text-left text-[10px] whitespace-nowrap">
              <thead className="bg-terminal-bg/50 border-b border-terminal-border text-terminal-muted uppercase text-[8px]">
                <tr>
                  <th className="p-2.5">Asset</th>
                  <th className="p-2.5 text-right">Amount</th>
                  <th className="p-2.5 text-right">Entry Price</th>
                  <th className="p-2.5 text-right">Mark Price</th>
                  <th className="p-2.5 text-right">Notional Value</th>
                  <th className="p-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-terminal-border/40">
                {cryptoHoldings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-terminal-muted">
                      No open crypto positions.
                    </td>
                  </tr>
                ) : (
                  cryptoHoldings.map((h: any) => (
                    <tr key={h.coin} className="hover:bg-terminal-card-hover/50">
                      <td className="p-2.5 font-bold text-white">{h.coin}/USDT</td>
                      <td className="p-2.5 text-right font-bold">{h.amount}</td>
                      <td className="p-2.5 text-right">${h.buyPrice?.toFixed(2)}</td>
                      <td className="p-2.5 text-right font-bold text-white">${h.currentPrice?.toFixed(2)}</td>
                      <td className="p-2.5 text-right font-bold text-amber-400">
                        ${(h.totalCost || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-2.5 text-right">
                        <button
                          onClick={() => {
                            placeUnifiedOrder(
                              {
                                ticker: h.coin,
                                assetCategory: "CRYPTO",
                                side: "SELL",
                                orderType: "MARKET",
                                quantity: h.amount,
                                price: h.currentPrice || h.buyPrice,
                                source: "MANUAL"
                              },
                              stocks
                            );
                            refreshData();
                          }}
                          className="px-2 py-0.5 bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white rounded text-[8px] font-bold uppercase transition-colors"
                        >
                          Close
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: PLACE ORDER TICKET */}
      {activeTab === "new_order" && (
        <div className="max-w-2xl mx-auto bg-terminal-card border border-terminal-border rounded-lg p-5 space-y-4">
          <div className="border-b border-terminal-border pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                Multi-Asset Institutional Order Placement Ticket
              </h2>
              <p className="text-[9px] text-terminal-muted">
                Direct execution gateway with pre-trade risk checks and circuit protection
              </p>
            </div>
            {isEngaged && (
              <span className="text-[9px] px-2 py-1 bg-red-500/20 border border-red-500/40 text-red-400 font-bold uppercase animate-pulse rounded">
                ⚠️ KILL SWITCH ACTIVE: ORDER BLOCKED
              </span>
            )}
          </div>

          <form onSubmit={handlePlaceOrder} className="space-y-4">
            {/* Asset Class Selector */}
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-terminal-muted uppercase">Asset Class:</label>
              <div className="grid grid-cols-3 gap-2">
                {(["EQUITY", "OPTION", "CRYPTO"] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setTicketCategory(cat)}
                    className={`py-2 px-3 rounded text-[10px] font-black uppercase tracking-wider border transition-all ${
                      ticketCategory === cat
                        ? "bg-terminal-accent/20 border-terminal-accent text-terminal-accent"
                        : "bg-terminal-bg border-terminal-border text-terminal-muted hover:text-white"
                    }`}
                  >
                    {cat === "EQUITY" ? "NSE Equity" : cat === "OPTION" ? "Options Chain" : "Crypto Perp"}
                  </button>
                ))}
              </div>
            </div>

            {/* Instrument Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-terminal-muted uppercase">Instrument / Symbol:</label>
                {ticketCategory === "EQUITY" ? (
                  <select
                    value={ticketTicker}
                    onChange={(e) => setTicketTicker(e.target.value)}
                    className="w-full bg-terminal-bg border border-terminal-border rounded px-2.5 py-1.5 text-white font-bold text-[10px] focus:outline-none focus:border-terminal-accent"
                  >
                    {stocks.map((s) => (
                      <option key={s.ticker} value={s.ticker}>
                        {s.ticker} - {s.name} (₹{s.price})
                      </option>
                    ))}
                  </select>
                ) : ticketCategory === "OPTION" ? (
                  <select
                    value={ticketTicker}
                    onChange={(e) => setTicketTicker(e.target.value)}
                    className="w-full bg-terminal-bg border border-terminal-border rounded px-2.5 py-1.5 text-white font-bold text-[10px] focus:outline-none focus:border-terminal-accent"
                  >
                    <option value="NIFTY">NIFTY 50 Index</option>
                    <option value="BANKNIFTY">BANKNIFTY Index</option>
                    <option value="RELIANCE">RELIANCE Options</option>
                    <option value="HDFCBANK">HDFCBANK Options</option>
                  </select>
                ) : (
                  <select
                    value={ticketTicker}
                    onChange={(e) => setTicketTicker(e.target.value)}
                    className="w-full bg-terminal-bg border border-terminal-border rounded px-2.5 py-1.5 text-white font-bold text-[10px] focus:outline-none focus:border-terminal-accent"
                  >
                    <option value="BTC">BTC / USDT</option>
                    <option value="ETH">ETH / USDT</option>
                    <option value="SOL">SOL / USDT</option>
                    <option value="BNB">BNB / USDT</option>
                  </select>
                )}
              </div>

              {ticketCategory === "OPTION" && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-terminal-muted uppercase">Strike:</label>
                    <input
                      type="number"
                      value={ticketStrike}
                      onChange={(e) => setTicketStrike(parseInt(e.target.value) || 0)}
                      className="w-full bg-terminal-bg border border-terminal-border rounded px-2 py-1.5 text-white text-[10px]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-terminal-muted uppercase">Contract:</label>
                    <div className="flex rounded border border-terminal-border overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setTicketOptionType("CE")}
                        className={`flex-1 py-1.5 text-[9px] font-bold uppercase ${
                          ticketOptionType === "CE" ? "bg-terminal-success text-white" : "bg-terminal-bg text-terminal-muted"
                        }`}
                      >
                        CE (Call)
                      </button>
                      <button
                        type="button"
                        onClick={() => setTicketOptionType("PE")}
                        className={`flex-1 py-1.5 text-[9px] font-bold uppercase ${
                          ticketOptionType === "PE" ? "bg-terminal-danger text-white" : "bg-terminal-bg text-terminal-muted"
                        }`}
                      >
                        PE (Put)
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Side & Order Type */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-terminal-muted uppercase">Transaction Side:</label>
                <div className="flex rounded border border-terminal-border overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setTicketSide("BUY")}
                    className={`flex-1 py-2 text-[10px] font-black uppercase ${
                      ticketSide === "BUY" ? "bg-terminal-success text-white" : "bg-terminal-bg text-terminal-muted hover:text-white"
                    }`}
                  >
                    BUY (Long)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTicketSide("SELL")}
                    className={`flex-1 py-2 text-[10px] font-black uppercase ${
                      ticketSide === "SELL" ? "bg-terminal-danger text-white" : "bg-terminal-bg text-terminal-muted hover:text-white"
                    }`}
                  >
                    SELL (Short)
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-terminal-muted uppercase">Execution Type:</label>
                <select
                  value={ticketOrderType}
                  onChange={(e) => setTicketOrderType(e.target.value as any)}
                  className="w-full bg-terminal-bg border border-terminal-border rounded px-2.5 py-2 text-white font-bold text-[10px] focus:outline-none"
                >
                  <option value="MARKET">Market Execution</option>
                  <option value="LIMIT">Limit Order</option>
                  <option value="STOP_LOSS">Stop Loss Order</option>
                </select>
              </div>
            </div>

            {/* Quantity & Price */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-terminal-muted uppercase">
                  {ticketCategory === "OPTION" ? "Contracts / Lots:" : "Quantity (Shares/Units):"}
                </label>
                <input
                  type="number"
                  min="1"
                  value={ticketQuantity}
                  onChange={(e) => setTicketQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-terminal-bg border border-terminal-border rounded px-2.5 py-1.5 text-white font-bold text-[10px] focus:outline-none focus:border-terminal-accent"
                />
              </div>

              {ticketOrderType === "LIMIT" && (
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-terminal-muted uppercase">Limit Price (₹):</label>
                  <input
                    type="number"
                    step="0.05"
                    placeholder="Enter limit price"
                    value={ticketLimitPrice}
                    onChange={(e) => setTicketLimitPrice(e.target.value)}
                    className="w-full bg-terminal-bg border border-terminal-border rounded px-2.5 py-1.5 text-white font-bold text-[10px] focus:outline-none focus:border-terminal-accent"
                  />
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isEngaged}
                className={`w-full py-2.5 rounded font-black text-xs uppercase tracking-widest transition-all ${
                  isEngaged
                    ? "bg-red-950/60 border border-red-500/40 text-red-400 cursor-not-allowed"
                    : ticketSide === "BUY"
                    ? "bg-terminal-success hover:bg-terminal-success/90 text-white shadow-lg shadow-emerald-900/30"
                    : "bg-terminal-danger hover:bg-terminal-danger/90 text-white shadow-lg shadow-red-900/30"
                }`}
              >
                {isEngaged ? "ORDER ROUTING LOCKED (KILL SWITCH ACTIVE)" : `EXECUTE ${ticketSide} ORDER`}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 4: RISK SETTINGS & CIRCUIT BREAKERS */}
      {activeTab === "risk_settings" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Circuit Breaker Controls */}
            <div className="bg-terminal-card border border-terminal-border rounded-lg p-4 space-y-3">
              <div className="flex items-center space-x-2 border-b border-terminal-border pb-2">
                <ShieldAlert className="w-4 h-4 text-terminal-accent" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Automated Circuit Breakers & Risk Thresholds
                </h3>
              </div>

              <div className="space-y-3 text-[10px]">
                {/* Max Daily Loss */}
                <div className="p-2.5 bg-terminal-bg border border-terminal-border rounded flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white uppercase">Max Daily Loss Tripwire</span>
                    <p className="text-[9px] text-terminal-muted">
                      Auto-engages Kill Switch if day's portfolio loss reaches threshold
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      step="5000"
                      value={killSwitchConfig.maxDailyLossLimit}
                      onChange={(e) =>
                        updateKillSwitchSettings({ maxDailyLossLimit: parseFloat(e.target.value) || 50000 })
                      }
                      className="w-24 bg-terminal-card border border-terminal-border rounded px-2 py-1 text-white text-[9px] text-right font-bold"
                    />
                    <input
                      type="checkbox"
                      checked={killSwitchConfig.maxDailyLossActive}
                      onChange={(e) =>
                        updateKillSwitchSettings({ maxDailyLossActive: e.target.checked })
                      }
                      className="w-4 h-4 accent-terminal-accent rounded"
                    />
                  </div>
                </div>

                {/* Max Drawdown */}
                <div className="p-2.5 bg-terminal-bg border border-terminal-border rounded flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white uppercase">Max Drawdown Ceiling (%)</span>
                    <p className="text-[9px] text-terminal-muted">
                      Auto-trips if peak-to-trough drawdown exceeds limit
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      step="0.5"
                      value={killSwitchConfig.maxDrawdownPct}
                      onChange={(e) =>
                        updateKillSwitchSettings({ maxDrawdownPct: parseFloat(e.target.value) || 5.0 })
                      }
                      className="w-20 bg-terminal-card border border-terminal-border rounded px-2 py-1 text-white text-[9px] text-right font-bold"
                    />
                    <input
                      type="checkbox"
                      checked={killSwitchConfig.maxDrawdownActive}
                      onChange={(e) =>
                        updateKillSwitchSettings({ maxDrawdownActive: e.target.checked })
                      }
                      className="w-4 h-4 accent-terminal-accent rounded"
                    />
                  </div>
                </div>

                {/* Max Single Order Value */}
                <div className="p-2.5 bg-terminal-bg border border-terminal-border rounded flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white uppercase">Single Order Value Cap (₹)</span>
                    <p className="text-[9px] text-terminal-muted">
                      Fat-finger guard: rejects single orders exceeding maximum value
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      step="50000"
                      value={killSwitchConfig.maxOrderValue}
                      onChange={(e) =>
                        updateKillSwitchSettings({ maxOrderValue: parseFloat(e.target.value) || 500000 })
                      }
                      className="w-24 bg-terminal-card border border-terminal-border rounded px-2 py-1 text-white text-[9px] text-right font-bold"
                    />
                    <input
                      type="checkbox"
                      checked={killSwitchConfig.maxOrderValueActive}
                      onChange={(e) =>
                        updateKillSwitchSettings({ maxOrderValueActive: e.target.checked })
                      }
                      className="w-4 h-4 accent-terminal-accent rounded"
                    />
                  </div>
                </div>

                {/* Auto Flatten checkbox */}
                <div className="p-2.5 bg-terminal-bg border border-terminal-border rounded flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white uppercase">Auto-Flatten on Kill Switch</span>
                    <p className="text-[9px] text-terminal-muted">
                      Automatically square off open positions when Kill Switch is engaged
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={killSwitchConfig.autoSquareOffPositions}
                    onChange={(e) =>
                      updateKillSwitchSettings({ autoSquareOffPositions: e.target.checked })
                    }
                    className="w-4 h-4 accent-terminal-accent rounded"
                  />
                </div>
              </div>
            </div>

            {/* Active Bot Status Safeguards */}
            <div className="bg-terminal-card border border-terminal-border rounded-lg p-4 space-y-3">
              <div className="flex items-center space-x-2 border-b border-terminal-border pb-2">
                <Power className="w-4 h-4 text-terminal-accent" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Algorithmic Engine Risk Linkages
                </h3>
              </div>

              <div className="space-y-2 text-[10px]">
                <div className="p-2.5 bg-terminal-bg border border-terminal-border rounded flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white">VM Algo Stock Bot</span>
                    <span className="block text-[8px] text-terminal-muted">Automated Supertrend & Pinescript Stock Trader</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                    isEngaged
                      ? "bg-red-500/20 text-red-400 border border-red-500/30"
                      : localStorage.getItem("vm_algo_auto_active") === "true"
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-terminal-muted/20 text-terminal-muted"
                  }`}>
                    {isEngaged ? "HALTED" : localStorage.getItem("vm_algo_auto_active") === "true" ? "ACTIVE" : "IDLE"}
                  </span>
                </div>

                <div className="p-2.5 bg-terminal-bg border border-terminal-border rounded flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white">VM Algo Options Bot</span>
                    <span className="block text-[8px] text-terminal-muted">Delta-Neutral & Gamma Scalp Options Engine</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                    isEngaged
                      ? "bg-red-500/20 text-red-400 border border-red-500/30"
                      : localStorage.getItem("vm_algo_options_bot_enabled") === "true"
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-terminal-muted/20 text-terminal-muted"
                  }`}>
                    {isEngaged ? "HALTED" : localStorage.getItem("vm_algo_options_bot_enabled") === "true" ? "ACTIVE" : "IDLE"}
                  </span>
                </div>

                <div className="p-2.5 bg-terminal-bg border border-terminal-border rounded flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white">VM VIRA BTC Engine</span>
                    <span className="block text-[8px] text-terminal-muted">Microstructure Orderbook & Tradeflow Engine</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                    isEngaged ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  }`}>
                    {isEngaged ? "HALTED" : "ACTIVE"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Audit Log Table */}
          <div className="border border-terminal-border bg-terminal-card rounded-lg overflow-hidden">
            <div className="p-3 bg-terminal-bg border-b border-terminal-border flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Risk Management Audit Trail & Event Logs
              </span>
              <span className="text-[9px] text-terminal-muted uppercase">
                Tamper-evident system execution log
              </span>
            </div>
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-left text-[10px] whitespace-nowrap">
                <thead className="bg-terminal-bg/50 border-b border-terminal-border text-terminal-muted uppercase text-[8px]">
                  <tr>
                    <th className="p-2.5">Time</th>
                    <th className="p-2.5">Action</th>
                    <th className="p-2.5">Details & Justification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-terminal-border/40">
                  {killSwitchConfig.killSwitchLogs.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-4 text-center text-terminal-muted">
                        No audit events recorded yet.
                      </td>
                    </tr>
                  ) : (
                    killSwitchConfig.killSwitchLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-terminal-card-hover/50">
                        <td className="p-2.5 text-terminal-muted">{log.timestamp}</td>
                        <td className="p-2.5 font-bold">
                          <span className={`px-1.5 py-0.5 rounded text-[8px] uppercase ${
                            log.action === "ENGAGED" || log.action === "ORDER_BLOCKED"
                              ? "bg-red-500/20 text-red-400"
                              : log.action === "DISARMED"
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-amber-500/20 text-amber-400"
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="p-2.5 text-white max-w-md truncate">{log.details}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Kill Switch Modal */}
      <KillSwitchModal
        isOpen={isKillModalOpen}
        onClose={() => setIsKillModalOpen(false)}
        stocks={stocks}
        onSuccess={refreshData}
      />
    </div>
  );
}
