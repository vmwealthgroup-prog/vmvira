/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Search, Bell, Shield, Server, RefreshCw, Sun, Moon, ShieldAlert, Power } from "lucide-react";
import { CompanyMetadata } from "../types";
import { isKillSwitchEngaged, getKillSwitchConfig } from "../services/killSwitchService";
import KillSwitchModal from "./KillSwitchModal";

interface HeaderProps {
  indices: Array<{ name: string; value: number; change: number; changePct: number }>;
  source?: string;
  onSearchStock: (ticker: string) => void;
  stocks: CompanyMetadata[];
  onRefresh: () => void;
  isRefreshing: boolean;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onOpenOrders?: () => void;
}

export default function Header({ indices, source, onSearchStock, stocks, onRefresh, isRefreshing, theme, onToggleTheme, onOpenOrders }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [currentTime, setCurrentTime] = useState("");
  const [isKillActive, setIsKillActive] = useState(isKillSwitchEngaged());
  const [showKillModal, setShowKillModal] = useState(false);

  useEffect(() => {
    const handleUpdate = () => {
      setIsKillActive(isKillSwitchEngaged());
    };
    window.addEventListener("vm_algo_kill_switch_updated", handleUpdate);
    const interval = setInterval(handleUpdate, 2000);
    return () => {
      window.removeEventListener("vm_algo_kill_switch_updated", handleUpdate);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString("en-US", { hour12: false }) + " IST");
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const filteredStocks = searchQuery
    ? stocks.filter(
        s =>
          s.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const handleSelectStock = (ticker: string) => {
    onSearchStock(ticker);
    setSearchQuery("");
    setShowDropdown(false);
  };

  return (
    <header className="bg-terminal-bg border-b border-terminal-border h-12 flex items-center justify-between px-4 select-none z-50 sticky top-0 font-mono text-xs">
      {/* Ticker Ribbon */}
      <div className="flex items-center space-x-4 overflow-x-auto scrollbar-none flex-1 max-w-4xl">
        <div className="flex items-center space-x-2 pr-3 border-r border-terminal-border shrink-0">
          <span className="text-terminal-accent font-bold">VM ALGO</span>
          <span className="text-[8px] px-2 py-0.5 rounded uppercase font-bold tracking-widest flex items-center space-x-1.5 text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block mr-1"></span>
            <span>LIVE REAL-TIME FEED (NSE/BSE & BINANCE)</span>
          </span>
        </div>

        <div className="flex items-center space-x-4">
          {indices.map((ind, idx) => {
            const isUp = ind.change >= 0;
            return (
              <div key={idx} className="flex items-center space-x-1 whitespace-nowrap">
                <span className="text-[#a0a0a0] font-medium">{ind.name}:</span>
                <span className="font-bold text-white">{ind.value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <span className={`font-semibold text-[10px] ${isUp ? "text-terminal-success" : "text-terminal-danger"}`}>
                  {isUp ? "▲" : "▼"}{Math.abs(ind.changePct)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Operations (Search & Meta) */}
      <div className="flex items-center space-x-4 ml-4">
        {/* Search */}
        <div className="relative">
          <div className="flex items-center bg-terminal-card border border-terminal-border rounded h-7 px-2 w-56 focus-within:border-terminal-accent transition-colors">
            <Search className="w-3.5 h-3.5 text-terminal-muted mr-1.5" />
            <input
              type="text"
              placeholder="SEARCH EQUITY (e.g. RELIANCE)"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              className="bg-transparent text-white w-full focus:outline-none placeholder-terminal-muted text-[10px] uppercase font-bold"
            />
          </div>

          {/* Autocomplete Dropdown */}
          {showDropdown && filteredStocks.length > 0 && (
            <div className="absolute right-0 top-8 bg-terminal-card border border-terminal-border rounded-md shadow-2xl w-64 max-h-60 overflow-y-auto z-50 text-[10px]">
              <div className="p-2 border-b border-terminal-border text-terminal-muted font-bold text-[9px] uppercase">
                Matching NSE Equities
              </div>
              {filteredStocks.map((stock) => (
                <button
                  key={stock.ticker}
                  onClick={() => handleSelectStock(stock.ticker)}
                  className="w-full text-left p-2 hover:bg-terminal-card-hover border-b border-terminal-border/50 flex items-center justify-between text-white transition-colors"
                >
                  <div className="flex flex-col">
                    <span className="font-bold text-terminal-accent">{stock.ticker}</span>
                    <span className="text-[9px] text-[#888] truncate max-w-[140px]">{stock.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold">₹{stock.price}</span>
                    <span className={`block text-[8px] font-bold ${stock.change >= 0 ? "text-terminal-success" : "text-terminal-danger"}`}>
                      {stock.change >= 0 ? "+" : ""}{stock.changePct}%
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
          {showDropdown && searchQuery && filteredStocks.length === 0 && (
            <div className="absolute right-0 top-8 bg-terminal-card border border-terminal-border rounded-md p-3 text-terminal-muted text-center w-64 z-50">
              No matching equities in universe
            </div>
          )}
        </div>

        {/* Kill Switch Global Quick Control */}
        <button
          onClick={() => setShowKillModal(true)}
          className={`px-2.5 py-1 rounded border flex items-center space-x-1.5 font-mono text-[9px] font-black uppercase tracking-wider transition-all shadow-sm ${
            isKillActive
              ? "bg-red-600 hover:bg-red-500 text-white border-red-400 shadow-red-950 animate-pulse"
              : "bg-terminal-card hover:bg-red-950/40 text-red-400 hover:text-red-300 border-red-500/40"
          }`}
          title={isKillActive ? "EMERGENCY KILL SWITCH ACTIVE (Click to Disarm)" : "EMERGENCY KILL SWITCH (Click to Halt All)"}
        >
          <Power className={`w-3.5 h-3.5 ${isKillActive ? "text-white" : "text-red-400"}`} />
          <span className="hidden sm:inline">
            {isKillActive ? "KILL SWITCH ACTIVE" : "KILL SWITCH"}
          </span>
        </button>

        {/* Refresh button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className={`p-1.5 rounded border border-terminal-border bg-terminal-card hover:bg-terminal-card-hover transition-colors text-white ${isRefreshing ? "animate-spin text-terminal-accent" : ""}`}
          title="Manual Fetch/Simulation trigger"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>

        {/* Theme Toggle Single Switch */}
        <button
          onClick={onToggleTheme}
          className="p-1.5 rounded border border-terminal-border bg-terminal-card hover:bg-terminal-card-hover transition-colors text-white flex items-center space-x-1.5"
          title={`Switch to ${theme === "light" ? "Dark" : "Light"} Theme`}
        >
          {theme === "light" ? (
            <>
              <Moon className="w-3.5 h-3.5 text-terminal-accent" />
              <span className="text-[9px] uppercase font-black tracking-wider hidden lg:inline">DARK MODE</span>
            </>
          ) : (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-[9px] uppercase font-black tracking-wider hidden lg:inline">LIGHT MODE</span>
            </>
          )}
        </button>

        {/* Server Clock & User details */}
        <div className="hidden md:flex items-center space-x-3 text-terminal-muted border-l border-terminal-border pl-3 text-[10px]">
          <span className="flex items-center">
            <Server className="w-3 h-3 text-terminal-accent mr-1" />
            <span className="text-[#a0a0a0]">CON:</span>
            <span className="text-white ml-1 font-bold">NSE_SECURE</span>
          </span>
          <span className="text-white font-bold whitespace-nowrap">{currentTime}</span>
        </div>
      </div>

      <KillSwitchModal
        isOpen={showKillModal}
        onClose={() => setShowKillModal(false)}
        stocks={stocks}
        onSuccess={() => setIsKillActive(isKillSwitchEngaged())}
      />
    </header>
  );
}
