/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Layers, RefreshCw, Table, AlertTriangle, TrendingUp, TrendingDown, HelpCircle } from "lucide-react";
import { CompanyMetadata } from "../types";
import { fetchOptionsChain } from "../services/apiService";

interface OptionsAnalyticsProps {
  stocks: CompanyMetadata[];
  selectedTicker: string;
  onSelectStock: (ticker: string) => void;
}

export default function OptionsAnalytics({ stocks, selectedTicker, onSelectStock }: OptionsAnalyticsProps) {
  const [ticker, setTicker] = useState(selectedTicker || "RELIANCE");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [optionsData, setOptionsData] = useState<any | null>(null);

  useEffect(() => {
    async function loadOptions() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchOptionsChain(ticker);
        setOptionsData(data);
      } catch (err: any) {
        setError(err.message || "Failed to load options chain");
      } finally {
        setLoading(false);
      }
    }
    loadOptions();
  }, [ticker]);

  const activeStock = stocks.find(s => s.ticker === ticker) || stocks[0];

  return (
    <div className="p-4 space-y-4 font-mono text-xs select-none">
      {/* Search Header */}
      <div className="bg-terminal-card border border-terminal-border rounded p-3 flex flex-col md:flex-row md:items-center justify-between">
        <div className="flex items-center space-x-3">
          <Layers className="w-5 h-5 text-terminal-accent shrink-0" />
          <div>
            <h2 className="text-sm font-black text-white uppercase">NSE DERIVATIVES DESK (OPTIONS CHAINS)</h2>
            <p className="text-terminal-muted text-[9px] uppercase">OPEN INTEREST GRIDS, VOLATILITY INDEX & MAX PAIN METRICS</p>
          </div>
        </div>

        {/* Stock Selector Dropdown */}
        <div className="mt-3 md:mt-0 flex items-center space-x-2">
          <span className="text-[10px] text-terminal-muted font-bold">SELECT CONTEXT:</span>
          <select
            value={ticker}
            onChange={(e) => {
              setTicker(e.target.value);
              onSelectStock(e.target.value);
            }}
            className="bg-terminal-card border border-terminal-border text-white text-[10px] font-bold rounded p-1.5 focus:outline-none focus:border-terminal-accent h-8 w-44"
          >
            {stocks.map((s) => (
              <option key={s.ticker} value={s.ticker}>
                {s.ticker} ({s.name.slice(0, 15)}...)
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="p-8 flex flex-col items-center justify-center space-y-3 h-96 font-mono text-xs">
          <RefreshCw className="w-6 h-6 text-terminal-accent animate-spin" />
          <span className="text-terminal-muted uppercase tracking-widest animate-pulse">COMPILING DERIVATIVES BOOK...</span>
        </div>
      ) : error || !optionsData ? (
        <div className="p-8 flex flex-col items-center justify-center space-y-4 text-center h-96">
          <AlertTriangle className="w-8 h-8 text-terminal-danger" />
          <p className="text-white font-bold">{error || "Options details unavailable"}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Dashboard Summary row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-terminal-card border border-terminal-border rounded p-3">
              <span className="block text-[8px] text-terminal-muted uppercase tracking-wider">PCR Volume Ratio</span>
              <span className="text-lg font-black text-white">{optionsData.pcr}</span>
              <span className={`block text-[8.5px] font-extrabold ${optionsData.pcr >= 1.0 ? "text-terminal-success" : "text-terminal-danger"}`}>
                {optionsData.sentiment.toUpperCase()} BUILD-UP
              </span>
            </div>

            <div className="bg-terminal-card border border-terminal-border rounded p-3">
              <span className="block text-[8px] text-terminal-muted uppercase tracking-wider">Calculated Max Pain</span>
              <span className="text-lg font-black text-terminal-accent">₹{optionsData.maxPain}</span>
              <span className="block text-[8.5px] text-terminal-muted">LIQUIDATION CLUSTER</span>
            </div>

            <div className="bg-terminal-card border border-terminal-border rounded p-3">
              <span className="block text-[8px] text-terminal-muted uppercase tracking-wider">Implied Volatility (IV)</span>
              <span className="text-lg font-black text-white">{optionsData.impliedVolatility}%</span>
              <span className="block text-[8.5px] text-terminal-muted">IV RANKING: {optionsData.ivRank}</span>
            </div>

            <div className="bg-terminal-card border border-terminal-border rounded p-3">
              <span className="block text-[8px] text-terminal-muted uppercase tracking-wider">LTP Stock Target</span>
              <span className="text-lg font-black text-white">₹{activeStock.price}</span>
              <span className={`block text-[8.5px] font-bold ${activeStock.change >= 0 ? "text-terminal-success" : "text-terminal-danger"}`}>
                {activeStock.change >= 0 ? "+" : ""}{activeStock.changePct}% CHANGE
              </span>
            </div>
          </div>

          {/* Options Grid Chain layout */}
          <div className="bg-terminal-card border border-terminal-border rounded p-3">
            <div className="flex items-center justify-between border-b border-terminal-border pb-1.5 mb-2">
              <span className="font-bold text-white uppercase text-[10px] flex items-center">
                <Table className="w-3.5 h-3.5 text-terminal-accent mr-1.5" /> Call / Put Strike Price Chain Details
              </span>
              <span className="text-[9px] text-terminal-muted">JULY Expiry</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-[9px] select-text">
                <thead>
                  <tr className="border-b border-terminal-border text-terminal-muted text-center uppercase font-bold">
                    <th colSpan={3} className="py-1 border-r border-terminal-border text-terminal-success bg-terminal-success/5">CALL OPTIONS (NSE)</th>
                    <th className="py-1 bg-terminal-card font-extrabold text-white">STRIKE</th>
                    <th colSpan={3} className="py-1 border-l border-terminal-border text-terminal-danger bg-terminal-danger/5">PUT OPTIONS (NSE)</th>
                  </tr>
                  <tr className="border-b border-terminal-border text-terminal-muted text-[8px] uppercase">
                    <th className="py-1 text-right bg-terminal-success/5 pr-2">OI Qty</th>
                    <th className="py-1 text-right bg-terminal-success/5 pr-2">OI Chg</th>
                    <th className="py-1 text-right border-r border-terminal-border bg-terminal-success/5 pr-2">LTP</th>
                    <th className="py-1 text-center font-black text-white">Strike Price</th>
                    <th className="py-1 text-left border-l border-terminal-border bg-terminal-danger/5 pl-2">LTP</th>
                    <th className="py-1 text-left bg-terminal-danger/5 pl-2">OI Chg</th>
                    <th className="py-1 text-left bg-terminal-danger/5 pl-2">OI Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-terminal-border/25">
                  {optionsData.chain.map((item: any, idx: number) => {
                    const isATM = Math.abs(item.strikePrice - activeStock.price) < 25;
                    return (
                      <tr key={idx} className={`hover:bg-terminal-card-hover/20 ${isATM ? "bg-terminal-accent/10" : ""}`}>
                        {/* Calls */}
                        <td className="py-1 text-right text-terminal-success pr-2 font-semibold bg-terminal-success/5">
                          {item.callOI.toLocaleString()}
                        </td>
                        <td className={`py-1 text-right pr-2 bg-terminal-success/5 ${item.callOIChange >= 0 ? "text-terminal-success" : "text-terminal-danger"}`}>
                          {item.callOIChange >= 0 ? "+" : ""}{item.callOIChange}
                        </td>
                        <td className="py-1 text-right pr-2 border-r border-terminal-border font-bold text-white bg-terminal-success/5">
                          ₹{item.callLtp}
                        </td>

                        {/* Center Strike */}
                        <td className="py-1 text-center font-black text-white bg-terminal-card/80">
                          {item.strikePrice}
                        </td>

                        {/* Puts */}
                        <td className="py-1 text-left pl-2 border-l border-terminal-border font-bold text-white bg-terminal-danger/5">
                          ₹{item.putLtp}
                        </td>
                        <td className={`py-1 text-left pl-2 bg-terminal-danger/5 ${item.putOIChange >= 0 ? "text-terminal-success" : "text-terminal-danger"}`}>
                          {item.putOIChange >= 0 ? "+" : ""}{item.putOIChange}
                        </td>
                        <td className="py-1 text-left pl-2 text-terminal-danger font-semibold bg-terminal-danger/5">
                          {item.putOI.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
