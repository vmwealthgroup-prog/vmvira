/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Users,
  Compass,
  AlertCircle,
  Newspaper,
  DollarSign
} from "lucide-react";
import { CompanyMetadata } from "../types";
import { MarketSummaryResponse } from "../services/apiService";

interface DashboardProps {
  marketData: MarketSummaryResponse;
  stocks: CompanyMetadata[];
  onSelectStock: (ticker: string) => void;
}

export default function Dashboard({ marketData, stocks, onSelectStock }: DashboardProps) {
  // Sort gainers and losers
  const sortedStocks = [...stocks].sort((a, b) => b.changePct - a.changePct);
  const topGainers = sortedStocks.slice(0, 4);
  const topLosers = sortedStocks.slice(-4).reverse();
  const mostActive = [...stocks].sort((a, b) => b.volume - a.volume).slice(0, 4);

  // Compute stats
  const totalAdvances = marketData.advances;
  const totalDeclines = marketData.declines;
  const totalVolume = stocks.reduce((sum, s) => sum + s.volume, 0);

  // Fear & Greed simulation level
  const fearGreedVal = 62; // Greed
  const fearGreedText = "Greed";

  return (
    <div className="p-4 space-y-4 font-mono text-xs select-none">
      {/* Top Welcome Title Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-terminal-border pb-3">
        <div>
          <h1 className="text-lg font-extrabold text-white tracking-tight uppercase">VM ALGO // CAPITAL MARKETS HUD</h1>
          <p className="text-[#a0a0a0] text-[10px]">REAL-TIME HIGH-FREQUENCY INDEX DATA & INSTITUTIONAL FLOW TRACKING</p>
        </div>
        <div className="mt-2 md:mt-0 flex items-center space-x-2 text-[10px]">
          <span className="text-terminal-muted">MARKET SYSTEM STATUS:</span>
          <span className="text-terminal-success font-bold bg-terminal-success/10 px-2 py-0.5 rounded border border-terminal-success/20">NORMAL_FLOW</span>
        </div>
      </div>

      {/* Bento Grid Row 1: Indices and Market Breadth */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Indices Panel */}
        <div className="bg-terminal-card border border-terminal-border rounded p-3">
          <div className="flex items-center justify-between border-b border-terminal-border pb-1.5 mb-2">
            <span className="font-bold text-white uppercase tracking-wider text-[10px] flex items-center">
              <Activity className="w-3.5 h-3.5 text-terminal-accent mr-1.5" /> Core Indices
            </span>
            <span className="text-[9px] text-terminal-muted">UPDATED T-0s</span>
          </div>
          <div className="space-y-2">
            {marketData.indices.map((ind, idx) => {
              const isUp = ind.change >= 0;
              return (
                <div key={idx} className="flex items-center justify-between border-b border-terminal-border/30 pb-1">
                  <span className="text-[#a0a0a0] text-[10px]">{ind.name}</span>
                  <div className="flex items-center space-x-3">
                    <span className="font-bold text-white font-mono">{ind.value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    <span className={`font-bold w-16 text-right ${isUp ? "text-terminal-success" : "text-terminal-danger"}`}>
                      {isUp ? "+" : ""}{ind.changePct}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Market Breadth & Advances / Declines */}
        <div className="bg-terminal-card border border-terminal-border rounded p-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-terminal-border pb-1.5 mb-2">
              <span className="font-bold text-white uppercase tracking-wider text-[10px] flex items-center">
                <Compass className="w-3.5 h-3.5 text-terminal-warning mr-1.5" /> Market Breadth
              </span>
              <span className="text-[9px] text-terminal-muted">NSE ALL STOCKS</span>
            </div>

            {/* Advances Declines Stats */}
            <div className="flex items-center justify-between font-bold mb-2">
              <div className="text-terminal-success flex flex-col">
                <span className="text-[9px] text-terminal-muted uppercase">Advances</span>
                <span className="text-base font-extrabold">{totalAdvances}</span>
              </div>
              <div className="text-terminal-muted text-[10px]">VS</div>
              <div className="text-terminal-danger flex flex-col items-end">
                <span className="text-[9px] text-terminal-muted uppercase">Declines</span>
                <span className="text-base font-extrabold">{totalDeclines}</span>
              </div>
            </div>

            {/* Breadth Bar */}
            <div className="w-full bg-terminal-danger/20 h-2.5 rounded-full overflow-hidden flex mb-3 border border-terminal-border">
              <div
                className="bg-terminal-success h-full transition-all duration-500"
                style={{ width: `${(totalAdvances / (totalAdvances + totalDeclines)) * 100}%` }}
              />
            </div>
          </div>

          <div className="p-2 bg-terminal-bg/50 border border-terminal-border rounded text-[10px] text-terminal-muted leading-relaxed">
            Market sentiment is <span className="text-terminal-success font-bold">Positive</span> with an advance-to-decline ratio of <span className="text-white">{(totalAdvances / Math.max(1, totalDeclines)).toFixed(2)}</span>. Delivery volume is currently averaging <span className="text-white">55.1%</span> of total volume.
          </div>
        </div>

        {/* Fear & Greed Index */}
        <div className="bg-terminal-card border border-terminal-border rounded p-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-terminal-border pb-1.5 mb-2">
              <span className="font-bold text-white uppercase tracking-wider text-[10px] flex items-center">
                <Compass className="w-3.5 h-3.5 text-terminal-accent mr-1.5" /> Capital Fear & Greed
              </span>
              <span className="text-[9px] text-terminal-muted">SENTIMENT MATRIX</span>
            </div>

            <div className="flex items-center justify-center space-x-6 py-1">
              {/* Dial Gauge */}
              <div className="relative w-20 h-20 flex items-center justify-center rounded-full border-4 border-dashed border-terminal-border">
                <div className="text-center">
                  <span className="text-lg font-extrabold text-terminal-warning">{fearGreedVal}</span>
                  <span className="block text-[8px] text-terminal-muted uppercase tracking-wider">{fearGreedText}</span>
                </div>
              </div>

              <div className="space-y-1 text-[9px] text-terminal-muted flex-1">
                <div className="flex justify-between border-b border-terminal-border/20 pb-0.5">
                  <span>Extreme Fear:</span> <span className="text-terminal-danger">0 - 25</span>
                </div>
                <div className="flex justify-between border-b border-terminal-border/20 pb-0.5">
                  <span>Neutral:</span> <span className="text-terminal-muted">45 - 55</span>
                </div>
                <div className="flex justify-between border-b border-terminal-border/20 pb-0.5">
                  <span>Greed:</span> <span className="text-terminal-success font-bold">56 - 75</span>
                </div>
              </div>
            </div>
          </div>

          <div className="text-[9.5px] leading-relaxed text-[#bbb] bg-[#1c1c1c]/10 p-1.5 rounded border border-terminal-border/40">
            <span className="text-terminal-accent font-bold">INSIDER ANALYTICS:</span> Equity derivatives build-up shows steady Call writing at the Nifty 24,500 strike, with firm Put support at 24,000. Recommend active trailing buy halts.
          </div>
        </div>
      </div>

      {/* Row 2: Top Movers Panels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Top Gainers */}
        <div className="bg-terminal-card border border-terminal-border rounded p-3">
          <div className="flex items-center justify-between border-b border-terminal-border pb-1.5 mb-2">
            <span className="font-bold text-terminal-success uppercase tracking-wider text-[10px] flex items-center">
              <TrendingUp className="w-3.5 h-3.5 mr-1.5" /> TOP OUTPERFORMERS
            </span>
            <span className="text-[8px] text-terminal-success bg-terminal-success/10 px-1 py-0.5 rounded font-bold">BULLISH_SIGNAL</span>
          </div>
          <div className="space-y-1">
            {topGainers.map((stock) => (
              <button
                key={stock.ticker}
                onClick={() => onSelectStock(stock.ticker)}
                className="w-full flex items-center justify-between p-1.5 hover:bg-terminal-card-hover rounded border-b border-terminal-border/20 text-left transition-all"
              >
                <div className="flex flex-col">
                  <span className="font-bold text-terminal-accent">{stock.ticker}</span>
                  <span className="text-[8.5px] text-[#888] truncate max-w-[120px]">{stock.name}</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-white">₹{stock.price}</span>
                  <span className="block text-[9px] font-bold text-terminal-success">+{stock.changePct}%</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Top Losers */}
        <div className="bg-terminal-card border border-terminal-border rounded p-3">
          <div className="flex items-center justify-between border-b border-terminal-border pb-1.5 mb-2">
            <span className="font-bold text-terminal-danger uppercase tracking-wider text-[10px] flex items-center">
              <TrendingDown className="w-3.5 h-3.5 mr-1.5" /> TOP UNDERPERFORMERS
            </span>
            <span className="text-[8px] text-terminal-danger bg-terminal-danger/10 px-1 py-0.5 rounded font-bold">BEARISH_SIGNAL</span>
          </div>
          <div className="space-y-1">
            {topLosers.map((stock) => (
              <button
                key={stock.ticker}
                onClick={() => onSelectStock(stock.ticker)}
                className="w-full flex items-center justify-between p-1.5 hover:bg-terminal-card-hover rounded border-b border-terminal-border/20 text-left transition-all"
              >
                <div className="flex flex-col">
                  <span className="font-bold text-terminal-accent">{stock.ticker}</span>
                  <span className="text-[8.5px] text-[#888] truncate max-w-[120px]">{stock.name}</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-white">₹{stock.price}</span>
                  <span className="block text-[9px] font-bold text-terminal-danger">{stock.changePct}%</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Most Active by Volume */}
        <div className="bg-terminal-card border border-terminal-border rounded p-3">
          <div className="flex items-center justify-between border-b border-terminal-border pb-1.5 mb-2">
            <span className="font-bold text-white uppercase tracking-wider text-[10px] flex items-center">
              <Activity className="w-3.5 h-3.5 text-terminal-accent mr-1.5" /> HIGH VOLUME VOLATILITY
            </span>
            <span className="text-[9px] text-terminal-muted">SHARES TRADED</span>
          </div>
          <div className="space-y-1">
            {mostActive.map((stock) => (
              <button
                key={stock.ticker}
                onClick={() => onSelectStock(stock.ticker)}
                className="w-full flex items-center justify-between p-1.5 hover:bg-terminal-card-hover rounded border-b border-terminal-border/20 text-left transition-all"
              >
                <div className="flex flex-col">
                  <span className="font-bold text-terminal-accent">{stock.ticker}</span>
                  <span className="text-[8.5px] text-[#888] truncate max-w-[120px]">{stock.name}</span>
                </div>
                <div className="text-right font-mono">
                  <span className="font-bold text-white">₹{stock.price}</span>
                  <span className="block text-[9px] text-[#a0a0a0]">{(stock.volume / 100000).toFixed(1)}L Qty</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: Institutional FII / DII Flows & Block Deals */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* FII/DII flow list */}
        <div className="bg-terminal-card border border-terminal-border rounded p-3">
          <div className="flex items-center justify-between border-b border-terminal-border pb-1.5 mb-2">
            <span className="font-bold text-white uppercase tracking-wider text-[10px] flex items-center">
              <Users className="w-3.5 h-3.5 text-terminal-accent mr-1.5" /> FII / DII DAILY NET FLOWS (INR Cr)
            </span>
            <span className="text-[9px] text-terminal-muted">PROVISIONAL DATA</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-terminal-border text-terminal-muted text-[9px] uppercase font-bold">
                  <th className="py-1">Trade Date</th>
                  <th className="py-1 text-right">FII Net Buy/Sell</th>
                  <th className="py-1 text-right">DII Net Buy/Sell</th>
                  <th className="py-1 text-right">Net Flow Cr</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-terminal-border/25">
                {marketData.fiiDiiFlow.slice(0, 4).map((flow, idx) => {
                  const netSum = flow.fiiNet + flow.diiNet;
                  return (
                    <tr key={idx} className="hover:bg-terminal-card-hover/20">
                      <td className="py-1.5 font-bold text-white">{flow.date}</td>
                      <td className={`py-1.5 text-right font-bold ${flow.fiiNet >= 0 ? "text-terminal-success" : "text-terminal-danger"}`}>
                        {flow.fiiNet >= 0 ? "+" : ""}{flow.fiiNet.toLocaleString("en-IN", { minimumFractionDigits: 1 })}
                      </td>
                      <td className={`py-1.5 text-right font-bold ${flow.diiNet >= 0 ? "text-terminal-success" : "text-terminal-danger"}`}>
                        {flow.diiNet >= 0 ? "+" : ""}{flow.diiNet.toLocaleString("en-IN", { minimumFractionDigits: 1 })}
                      </td>
                      <td className={`py-1.5 text-right font-bold ${netSum >= 0 ? "text-terminal-success" : "text-terminal-danger"}`}>
                        {netSum >= 0 ? "+" : ""}{netSum.toLocaleString("en-IN", { minimumFractionDigits: 1 })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Market Intel / Sentiments & Recent News Headlines */}
        <div className="bg-terminal-card border border-terminal-border rounded p-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-terminal-border pb-1.5 mb-2">
              <span className="font-bold text-white uppercase tracking-wider text-[10px] flex items-center">
                <Newspaper className="w-3.5 h-3.5 text-terminal-accent mr-1.5" /> Market News Intelligence
              </span>
              <span className="text-[9px] text-terminal-muted">LIVE BROADCAST</span>
            </div>
            <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
              {marketData.news.slice(0, 4).map((n) => (
                <div key={n.id} className="border-b border-terminal-border/20 pb-1.5">
                  <div className="flex items-center justify-between text-[8px] text-terminal-muted font-bold mb-0.5">
                    <span>{n.time} // {n.source}</span>
                    <span className={`px-1 rounded text-[7px] ${n.sentiment === "Bullish" ? "bg-terminal-success/10 text-terminal-success border border-terminal-success/20" : n.sentiment === "Bearish" ? "bg-terminal-danger/10 text-terminal-danger border border-terminal-danger/20" : "bg-terminal-border text-terminal-muted"}`}>
                      {n.sentiment.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-[10px] text-white">
                    <button
                      onClick={() => onSelectStock(n.ticker)}
                      className="text-terminal-accent font-bold hover:underline mr-1"
                    >
                      [{n.ticker}]
                    </button>
                    {n.headline}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-2 bg-terminal-accent/5 rounded border border-terminal-accent/20 flex items-start space-x-2 mt-2">
            <AlertCircle className="w-3.5 h-3.5 text-terminal-accent shrink-0 mt-0.5" />
            <div className="text-[9px] leading-relaxed text-[#eee]">
              <span className="font-bold text-terminal-accent">VM ALGO CORE SIGNAL:</span> Momentum aggregates show rotation entering <span className="text-terminal-accent font-bold">Information Technology</span> and <span className="text-terminal-accent font-bold">Banking</span>. Broad-based consolidation around key support targets indices for potential breakout above Nifty 24,400.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
