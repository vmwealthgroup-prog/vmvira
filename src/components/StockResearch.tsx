/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Calendar,
  Activity,
  Award,
  ChevronRight,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Table,
  Users
} from "lucide-react";
import {
  CompanyMetadata,
  InstitutionalReport,
  RecommendationType,
  SidebarView,
  QuarterlyFinancial,
  AnnualFinancial,
  BalanceSheet,
  PeerComparison
} from "../types";
import {
  fetchStockDetail,
  fetchOptionsChain,
  fetchTechnicals,
  triggerAICoreResearch,
  StockDetailResponse
} from "../services/apiService";

interface StockResearchProps {
  selectedTicker: string;
  onViewChange: (view: SidebarView) => void;
}

export default function StockResearch({ selectedTicker, onViewChange }: StockResearchProps) {
  const [activeTab, setActiveTab] = useState<"financials" | "technicals" | "options" | "ai_report">("financials");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data States
  const [profileData, setProfileData] = useState<StockDetailResponse | null>(null);
  const [optionsData, setOptionsData] = useState<any | null>(null);
  const [technicalsData, setTechnicalsData] = useState<any | null>(null);

  // AI Report States
  const [aiReport, setAiReport] = useState<InstitutionalReport | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiLogs, setAiLogs] = useState<string[]>([]);

  // Fetch stock profile
  useEffect(() => {
    async function loadStockData() {
      if (!selectedTicker) return;
      setLoading(true);
      setError(null);
      try {
        const [prof, opt, tech] = await Promise.all([
          fetchStockDetail(selectedTicker),
          fetchOptionsChain(selectedTicker),
          fetchTechnicals(selectedTicker)
        ]);
        setProfileData(prof);
        setOptionsData(opt);
        setTechnicalsData(tech);
        setAiReport(null); // Reset report for new ticker context
      } catch (err: any) {
        setError(err.message || "Failed to load stock analytics");
      } finally {
        setLoading(false);
      }
    }
    loadStockData();
  }, [selectedTicker]);

  // Trigger Gemini AI Core Engine analysis
  const runAIAnalysis = async () => {
    if (!profileData) return;
    setAiLoading(true);
    setAiReport(null);
    setAiLogs([]);

    const logMessages = [
      "INITIATING VM ALGO AI CORE REASONING ENGINE...",
      "FETCHING SECURE DATASET INTEGRATIONS FOR " + selectedTicker + "...",
      "NORMALIZING QUARTERLY FINANCIALS AND INTRINSIC HISTORIES...",
      "CALCULATING DERIVATIVE MAX PAIN AND PCR COEFFICIENTS...",
      "EXECUTING SERVER-SIDE GOOGLE SEARCH GROUNDING CHANNELS...",
      "RETRIEVING LATEST REGULATORY AND BROKER CONSENSUS UPDATES...",
      "CONSTRUCTING SWOT VECTOR CORRELATIONS...",
      "CALCULATING WEIGHTED FUNDAMENTAL & MOMENTUM GRADES...",
      "SYNTHESIZING INVESTMENT THESIS SUMMARY...",
      "COMPILING INSTITUTIONAL EVALUATION REPORT..."
    ];

    // Simulate ticking log output
    let logIdx = 0;
    const interval = setInterval(() => {
      if (logIdx < logMessages.length) {
        setAiLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${logMessages[logIdx]}`]);
        logIdx++;
      } else {
        clearInterval(interval);
      }
    }, 450);

    try {
      const report = await triggerAICoreResearch(profileData.metadata.ticker);
      // Wait slightly to finish printing logs before showing report
      setTimeout(() => {
        setAiReport(report);
        setAiLoading(false);
      }, 4800);
    } catch (err: any) {
      clearInterval(interval);
      setAiLogs(prev => [...prev, `[ERROR] Reasoning engine aborted: ${err.message}`]);
      setAiLoading(false);
      setError("AI analysis failed to execute. Fallback report generated.");
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center space-y-3 h-96 font-mono text-xs">
        <RefreshCw className="w-8 h-8 text-terminal-accent animate-spin" />
        <span className="text-terminal-muted uppercase tracking-widest animate-pulse">ESTABLISHING FEED CHANNELS...</span>
      </div>
    );
  }

  if (error || !profileData) {
    return (
      <div className="p-8 flex flex-col items-center justify-center space-y-4 text-center h-96 font-mono text-xs">
        <AlertTriangle className="w-8 h-8 text-terminal-danger" />
        <p className="text-white font-bold">{error || "Equity profile not found"}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-3 py-1.5 bg-terminal-accent/10 border border-terminal-accent text-terminal-accent font-bold rounded uppercase hover:bg-terminal-accent/20 transition-colors"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const { metadata, quarterlyFinancials, annualFinancials, balanceSheet, peers } = profileData;
  const isUp = metadata.change >= 0;

  return (
    <div className="p-4 space-y-4 font-mono text-xs select-none">
      {/* 1. Overview Header Panel */}
      <div className="bg-terminal-card border border-terminal-border rounded p-3 flex flex-col md:flex-row md:items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-extrabold text-white tracking-tight uppercase">{metadata.name}</h2>
            <span className="text-[10px] bg-terminal-accent/15 text-terminal-accent border border-terminal-accent/20 px-1.5 py-0.5 rounded font-bold">{metadata.ticker}</span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[9.5px] text-terminal-muted">
            <span>ISIN: <span className="text-white font-semibold">{metadata.isin}</span></span>
            <span>SECTOR: <span className="text-white font-semibold">{metadata.sector}</span></span>
            <span>INDUSTRY: <span className="text-white font-semibold">{metadata.industry}</span></span>
            <span>MCAP: <span className="text-white font-semibold">₹{(metadata.marketCap / 1000).toFixed(1)}K Cr ({metadata.marketCapType})</span></span>
          </div>
        </div>

        <div className="mt-3 md:mt-0 flex items-center space-x-6 text-right">
          <div>
            <span className="block text-[8px] text-terminal-muted uppercase tracking-wider">LTP (NSE)</span>
            <span className="text-lg font-black text-white">₹{metadata.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
          </div>
          <div>
            <span className="block text-[8px] text-terminal-muted uppercase tracking-wider">NET CHANGE</span>
            <span className={`text-sm font-black flex items-center justify-end ${isUp ? "text-terminal-success" : "text-terminal-danger"}`}>
              {isUp ? "▲ +" : "▼ "}{metadata.change.toFixed(2)} ({isUp ? "+" : ""}{metadata.changePct}%)
            </span>
          </div>
          <div className="hidden sm:block">
            <span className="block text-[8px] text-terminal-muted uppercase tracking-wider">DELIVERY %</span>
            <span className="text-sm font-bold text-white">{metadata.deliveryPct}%</span>
          </div>
        </div>
      </div>

      {/* Tab Selectors */}
      <div className="flex border-b border-terminal-border">
        {[
          { id: "financials", label: "Fundamental Financials", icon: BarChart3 },
          { id: "technicals", label: "Technical Levels", icon: Activity },
          { id: "options", label: "Options Analytics", icon: Table },
          { id: "ai_report", label: "AI Institutional Thesis", icon: Sparkles },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-4 py-2 border-b-2 font-bold transition-all text-[10px] uppercase tracking-wider ${isActive ? "border-terminal-accent text-terminal-accent bg-terminal-accent/5 font-extrabold" : "border-transparent text-terminal-muted hover:text-white"}`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 2. Tab Content Display */}

      {/* Financials Tab */}
      {activeTab === "financials" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Quarterly Results */}
          <div className="bg-terminal-card border border-terminal-border rounded p-3">
            <h3 className="font-bold text-white uppercase text-[10px] border-b border-terminal-border pb-1.5 mb-2 flex items-center">
              <Calendar className="w-3.5 h-3.5 text-terminal-accent mr-1.5" /> Quarterly Reporting History (INR Cr)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-terminal-border text-terminal-muted text-[8.5px] uppercase">
                    <th className="py-1">Quarter</th>
                    <th className="py-1 text-right">Revenue</th>
                    <th className="py-1 text-right">Net Profit</th>
                    <th className="py-1 text-right">EPS (₹)</th>
                    <th className="py-1 text-right">OPM %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-terminal-border/25">
                  {quarterlyFinancials.map((q, idx) => (
                    <tr key={idx} className="hover:bg-terminal-card-hover/20">
                      <td className="py-1.5 font-bold text-white">{q.quarter}</td>
                      <td className="py-1.5 text-right font-bold text-white">{q.revenue.toLocaleString()}</td>
                      <td className="py-1.5 text-right font-bold text-terminal-success">{q.netProfit.toLocaleString()}</td>
                      <td className="py-1.5 text-right text-[#ccc]">{q.eps.toFixed(2)}</td>
                      <td className="py-1.5 text-right font-bold text-terminal-accent">{q.operatingMargin}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Annual Results */}
          <div className="bg-terminal-card border border-terminal-border rounded p-3">
            <h3 className="font-bold text-white uppercase text-[10px] border-b border-terminal-border pb-1.5 mb-2 flex items-center">
              <BarChart3 className="w-3.5 h-3.5 text-terminal-accent mr-1.5" /> Annual Financial Summary
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-terminal-border text-terminal-muted text-[8.5px] uppercase">
                    <th className="py-1">Year</th>
                    <th className="py-1 text-right">Revenue</th>
                    <th className="py-1 text-right">Net Profit</th>
                    <th className="py-1 text-right">ROE %</th>
                    <th className="py-1 text-right">ROCE %</th>
                    <th className="py-1 text-right">D/E</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-terminal-border/25">
                  {annualFinancials.map((a, idx) => (
                    <tr key={idx} className="hover:bg-terminal-card-hover/20">
                      <td className="py-1.5 font-bold text-white">{a.year}</td>
                      <td className="py-1.5 text-right font-bold text-white">{a.revenue.toLocaleString()}</td>
                      <td className="py-1.5 text-right font-bold text-terminal-success">{a.netProfit.toLocaleString()}</td>
                      <td className="py-1.5 text-right text-white font-bold">{a.roe}%</td>
                      <td className="py-1.5 text-right text-terminal-accent font-bold">{a.roce}%</td>
                      <td className="py-1.5 text-right text-terminal-warning">{a.debtToEquity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Balance Sheet */}
          <div className="bg-terminal-card border border-terminal-border rounded p-3">
            <h3 className="font-bold text-white uppercase text-[10px] border-b border-terminal-border pb-1.5 mb-2 flex items-center">
              <Table className="w-3.5 h-3.5 text-terminal-accent mr-1.5" /> Balance Sheet Profile (INR Cr)
            </h3>
            <div className="space-y-1.5">
              {balanceSheet.map((bs, idx) => (
                <div key={idx} className="border border-terminal-border/40 p-2.5 rounded bg-terminal-bg/50">
                  <div className="text-[#a0a0a0] font-bold border-b border-terminal-border/30 pb-1 mb-2 flex justify-between">
                    <span>REPORT YEAR: {bs.year}</span>
                    <span className="text-white">Liabilities = Assets Balance</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-[9px]">
                    <div className="space-y-1">
                      <div className="flex justify-between"><span>Share Capital:</span> <span className="text-white font-semibold">{bs.shareCapital}</span></div>
                      <div className="flex justify-between"><span>Reserves:</span> <span className="text-white font-semibold">{bs.reserves}</span></div>
                      <div className="flex justify-between"><span>Borrowings (Debt):</span> <span className="text-terminal-danger font-semibold">{bs.borrowings}</span></div>
                      <div className="flex justify-between border-t border-terminal-border/30 pt-0.5 font-bold text-white"><span>Total Liab:</span> <span>{bs.totalLiabilities}</span></div>
                    </div>
                    <div className="space-y-1 border-l border-terminal-border/30 pl-3">
                      <div className="flex justify-between"><span>Fixed Assets:</span> <span className="text-white font-semibold">{bs.fixedAssets}</span></div>
                      <div className="flex justify-between"><span>Other Assets:</span> <span className="text-white font-semibold">{bs.otherAssets}</span></div>
                      <div className="flex justify-between border-t border-terminal-border/30 pt-0.5 font-bold text-white"><span>Total Assets:</span> <span>{bs.totalAssets}</span></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Peer Comparisons */}
          <div className="bg-terminal-card border border-terminal-border rounded p-3">
            <h3 className="font-bold text-white uppercase text-[10px] border-b border-terminal-border pb-1.5 mb-2 flex items-center">
              <Users className="w-3.5 h-3.5 text-terminal-accent mr-1.5" /> Competitor Peer Comparison
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-terminal-border text-terminal-muted text-[8px] uppercase">
                    <th className="py-1">Ticker</th>
                    <th className="py-1 text-right">LTP (₹)</th>
                    <th className="py-1 text-right">P/E</th>
                    <th className="py-1 text-right">P/B</th>
                    <th className="py-1 text-right">EV/EBITDA</th>
                    <th className="py-1 text-right">ROE %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-terminal-border/25">
                  {peers.map((p, idx) => {
                    const isSelf = p.ticker === metadata.ticker;
                    return (
                      <tr key={idx} className={`hover:bg-terminal-card-hover/20 ${isSelf ? "bg-terminal-accent/5 font-extrabold" : ""}`}>
                        <td className={`py-1.5 ${isSelf ? "text-terminal-accent font-black" : "text-[#ccc]"}`}>
                          {p.ticker} {isSelf && " (SEC)"}
                        </td>
                        <td className="py-1.5 text-right text-white">₹{p.price}</td>
                        <td className="py-1.5 text-right font-mono text-white">{p.peRatio}</td>
                        <td className="py-1.5 text-right text-[#a0a0a0]">{p.pbRatio}</td>
                        <td className="py-1.5 text-right text-[#a0a0a0]">{p.evToEbitda}</td>
                        <td className="py-1.5 text-right text-terminal-success">{p.roe}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Technicals Tab */}
      {activeTab === "technicals" && technicalsData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Signal Gauge & Summary */}
          <div className="bg-terminal-card border border-terminal-border rounded p-3 flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-white uppercase text-[10px] border-b border-terminal-border pb-1.5 mb-2">
                Technical Summary Gauge
              </h3>
              <div className="flex flex-col items-center py-4">
                <span className="text-[10px] text-terminal-muted uppercase tracking-widest font-bold">Consensus Signal</span>
                <span className={`text-xl font-extrabold mt-1 uppercase tracking-tight ${technicalsData.trendSignal.includes("Buy") ? "text-terminal-success" : "text-terminal-danger"}`}>
                  {technicalsData.trendSignal}
                </span>

                {/* Simulated RSI bar */}
                <div className="w-full bg-terminal-border h-4 rounded-full mt-6 overflow-hidden flex relative items-center justify-between border border-terminal-border/80 text-[8px] font-bold px-3">
                  <div
                    className="absolute bg-terminal-accent/30 top-0 bottom-0 left-0 transition-all duration-500"
                    style={{ width: `${technicalsData.rsi}%` }}
                  />
                  <span className="z-10 text-white font-bold">RSI (14)</span>
                  <span className="z-10 text-white font-extrabold">{technicalsData.rsi}</span>
                </div>
                <div className="flex justify-between w-full text-[8.5px] text-terminal-muted mt-1 px-1">
                  <span>Oversold (30)</span>
                  <span>Neutral (50)</span>
                  <span>Overbought (70)</span>
                </div>
              </div>
            </div>

            <div className="p-2 bg-terminal-bg/50 border border-terminal-border rounded space-y-1.5">
              <div className="flex justify-between text-[9px]">
                <span>EMA (20):</span> <span className="font-bold text-white">₹{technicalsData.ema20}</span>
              </div>
              <div className="flex justify-between text-[9px]">
                <span>EMA (50):</span> <span className="font-bold text-white">₹{technicalsData.ema50}</span>
              </div>
              <div className="flex justify-between text-[9px]">
                <span>EMA (200):</span> <span className="font-bold text-[#f87171]">₹{technicalsData.ema200}</span>
              </div>
            </div>
          </div>

          {/* Pivot Points */}
          <div className="bg-terminal-card border border-terminal-border rounded p-3 col-span-2">
            <h3 className="font-bold text-white uppercase text-[10px] border-b border-terminal-border pb-1.5 mb-2">
              Fibonacci Pivot Points & Support/Resistance Levels (₹)
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <span className="text-[9px] text-terminal-muted uppercase font-bold tracking-widest block border-b border-terminal-border/20 pb-0.5">Resistance Bands</span>
                <div className="flex justify-between text-[10px]">
                  <span className="text-terminal-danger">R3 (Target Peak):</span>
                  <span className="font-bold text-white">{technicalsData.pivots.resistance3}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-terminal-danger">R2 (Major Resistance):</span>
                  <span className="font-bold text-white">{technicalsData.pivots.resistance2}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-terminal-danger">R1 (Minor Resistance):</span>
                  <span className="font-bold text-white">{technicalsData.pivots.resistance1}</span>
                </div>
                <div className="flex justify-between text-[10px] border-t border-terminal-border/30 pt-1 font-bold">
                  <span className="text-terminal-accent">PIVOT POINT:</span>
                  <span className="text-terminal-accent">{technicalsData.pivots.pivotPoint}</span>
                </div>
              </div>

              <div className="space-y-1.5 border-l border-terminal-border/30 pl-4">
                <span className="text-[9px] text-terminal-muted uppercase font-bold tracking-widest block border-b border-terminal-border/20 pb-0.5">Support Clusters</span>
                <div className="flex justify-between text-[10px]">
                  <span className="text-terminal-success">S1 (Minor Support):</span>
                  <span className="font-bold text-white">{technicalsData.pivots.support1}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-terminal-success">S2 (Major Support):</span>
                  <span className="font-bold text-white">{technicalsData.pivots.support2}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-terminal-success">S3 (Target Floor):</span>
                  <span className="font-bold text-white">{technicalsData.pivots.support3}</span>
                </div>
              </div>
            </div>
            <div className="p-2 bg-terminal-bg/50 border border-terminal-border rounded text-[9.5px] leading-relaxed text-[#999] mt-4">
              <span className="text-white font-bold uppercase mr-1">MACD Indicators:</span>
              Histogram at <span className="text-terminal-success font-bold">{technicalsData.macd.histogram}</span> with a line crossover reading of <span className="text-white font-semibold">{technicalsData.macd.line}</span>. Overall signal is diagnosed as <span className="text-white font-bold">{technicalsData.macd.text}</span>.
            </div>
          </div>
        </div>
      )}

      {/* Options Tab */}
      {activeTab === "options" && optionsData && (
        <div className="space-y-4">
          {/* Options Chain Stats Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-terminal-card border border-terminal-border rounded p-2.5">
              <span className="block text-[8px] text-terminal-muted uppercase tracking-wider">Put-Call Ratio (PCR)</span>
              <span className="text-sm font-black text-white">{optionsData.pcr}</span>
              <span className={`block text-[8px] font-bold ${optionsData.pcr >= 1.0 ? "text-terminal-success" : "text-terminal-danger"}`}>
                {optionsData.sentiment.toUpperCase()} SENTIMENT
              </span>
            </div>
            <div className="bg-terminal-card border border-terminal-border rounded p-2.5">
              <span className="block text-[8px] text-terminal-muted uppercase tracking-wider">Calculated Max Pain</span>
              <span className="text-sm font-black text-terminal-accent">₹{optionsData.maxPain}</span>
              <span className="block text-[8px] text-terminal-muted">STRIKE PRICE TARGET</span>
            </div>
            <div className="bg-terminal-card border border-terminal-border rounded p-2.5">
              <span className="block text-[8px] text-terminal-muted uppercase tracking-wider">Implied Volatility</span>
              <span className="text-sm font-black text-white">{optionsData.impliedVolatility}%</span>
              <span className="block text-[8px] text-terminal-muted">IV RANK: {optionsData.ivRank}</span>
            </div>
            <div className="bg-terminal-card border border-terminal-border rounded p-2.5">
              <span className="block text-[8px] text-terminal-muted uppercase tracking-wider">Expected 30D Move</span>
              <span className="text-sm font-black text-terminal-warning">±₹{optionsData.expectedMove}</span>
              <span className="block text-[8px] text-terminal-muted">DERIVATIVES BOUND</span>
            </div>
          </div>

          {/* Options Chain Grid */}
          <div className="bg-terminal-card border border-terminal-border rounded p-3">
            <h3 className="font-bold text-white uppercase text-[10px] border-b border-terminal-border pb-1.5 mb-2">
              Derivatives Options Chain Matrix - Expiry July 2026
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-[9px]">
                <thead>
                  <tr className="border-b border-terminal-border text-terminal-muted text-center uppercase font-bold">
                    <th colSpan={3} className="py-1 border-r border-terminal-border text-terminal-success bg-terminal-success/5">CALL OPTIONS</th>
                    <th className="py-1 bg-terminal-card font-extrabold text-white">STRIKE</th>
                    <th colSpan={3} className="py-1 border-l border-terminal-border text-terminal-danger bg-terminal-danger/5">PUT OPTIONS</th>
                  </tr>
                  <tr className="border-b border-terminal-border text-terminal-muted text-[8px] uppercase">
                    <th className="py-1 text-right bg-terminal-success/5">OI Qty</th>
                    <th className="py-1 text-right bg-terminal-success/5">OI Chg</th>
                    <th className="py-1 text-right border-r border-terminal-border bg-terminal-success/5">LTP</th>
                    <th className="py-1 text-center font-black text-white">Strike Price</th>
                    <th className="py-1 text-left border-l border-terminal-border bg-terminal-danger/5">LTP</th>
                    <th className="py-1 text-left bg-terminal-danger/5">OI Chg</th>
                    <th className="py-1 text-left bg-terminal-danger/5">OI Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-terminal-border/25">
                  {optionsData.chain.map((item: any, idx: number) => {
                    const isATM = Math.abs(item.strikePrice - metadata.price) < 25;
                    return (
                      <tr key={idx} className={`hover:bg-terminal-card-hover/25 ${isATM ? "bg-terminal-accent/10" : ""}`}>
                        {/* Calls */}
                        <td className="py-1.5 text-right text-terminal-success pr-2 font-semibold bg-terminal-success/5">
                          {item.callOI.toLocaleString()}
                        </td>
                        <td className={`py-1.5 text-right pr-2 bg-terminal-success/5 ${item.callOIChange >= 0 ? "text-terminal-success" : "text-terminal-danger"}`}>
                          {item.callOIChange >= 0 ? "+" : ""}{item.callOIChange}
                        </td>
                        <td className="py-1.5 text-right pr-2 border-r border-terminal-border font-bold text-white bg-terminal-success/5">
                          ₹{item.callLtp}
                        </td>

                        {/* Strike Center */}
                        <td className="py-1.5 text-center font-black text-white">
                          {item.strikePrice}
                        </td>

                        {/* Puts */}
                        <td className="py-1.5 text-left pl-2 border-l border-terminal-border font-bold text-white bg-terminal-danger/5">
                          ₹{item.putLtp}
                        </td>
                        <td className={`py-1.5 text-left pl-2 bg-terminal-danger/5 ${item.putOIChange >= 0 ? "text-terminal-success" : "text-terminal-danger"}`}>
                          {item.putOIChange >= 0 ? "+" : ""}{item.putOIChange}
                        </td>
                        <td className="py-1.5 text-left pl-2 text-terminal-danger font-semibold bg-terminal-danger/5">
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

      {/* AI Report Tab */}
      {activeTab === "ai_report" && (
        <div className="space-y-4">
          {/* Action Box to Trigger AI Core */}
          {!aiReport && !aiLoading && (
            <div className="bg-terminal-card border border-terminal-border p-6 rounded text-center space-y-4 max-w-xl mx-auto">
              <Sparkles className="w-8 h-8 text-terminal-accent mx-auto animate-pulse" />
              <div className="space-y-1">
                <h4 className="text-sm font-black text-white uppercase">UNIFIED AI CORE EQUITY REPORT ENGINE</h4>
                <p className="text-[#a0a0a0] text-[10px]">
                  Synthesizes fundamental statements, technical levels, option pain, and live market sentiment through a unified reasoning model with active Google Search Grounding.
                </p>
              </div>
              <button
                onClick={runAIAnalysis}
                className="px-5 py-2.5 bg-terminal-accent text-white font-bold rounded uppercase tracking-wider hover:bg-terminal-accent/90 transition-all shadow-lg shadow-terminal-accent/15"
              >
                Assemble AI Institutional Report
              </button>
            </div>
          )}

          {/* Real-time Loading System Logs Console */}
          {aiLoading && (
            <div className="bg-black border border-terminal-border rounded p-4 font-mono text-[9px] text-terminal-success space-y-1.5 h-60 overflow-y-auto">
              <div className="flex items-center space-x-2 border-b border-terminal-border pb-1 mb-2">
                <span className="w-2 h-2 rounded-full bg-terminal-success animate-ping" />
                <span className="font-bold text-white uppercase">REASONING SYSTEM ACTIVE // OUTPUTSTREAM STREAM_01</span>
              </div>
              {aiLogs.map((log, idx) => (
                <div key={idx} className="leading-relaxed">
                  {log}
                </div>
              ))}
              <div className="cursor-blink border-r-2 h-3.5 w-1 inline-block mt-1 border-terminal-success" />
            </div>
          )}

          {/* Compiled Institutional Report Display */}
          {aiReport && !aiLoading && (
            <div className="space-y-4">
              {/* Score Header Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Grade and Confidence Panel */}
                <div className="bg-terminal-card border border-terminal-border p-3 rounded flex items-center justify-between">
                  <div>
                    <span className="block text-[8px] text-terminal-muted uppercase tracking-wider">AI RECOMMENDATION GRADE</span>
                    <span className="text-2xl font-black text-terminal-success tracking-tighter">{aiReport.scores.grade}</span>
                    <span className="block text-[8px] text-white font-bold">{aiReport.thesis.recommendation.toUpperCase()}</span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[8px] text-terminal-muted uppercase tracking-wider">CONFIDENCE</span>
                    <span className="text-xl font-extrabold text-white">{aiReport.scores.confidenceScore}%</span>
                    <span className="block text-[8.5px] text-terminal-muted">MODEL ALIGNED</span>
                  </div>
                </div>

                {/* Score breakdown metrics */}
                <div className="bg-terminal-card border border-terminal-border p-3 rounded col-span-2 grid grid-cols-3 gap-2">
                  <div className="space-y-1 border-r border-terminal-border/40 pr-2">
                    <div className="flex justify-between text-[9px] text-terminal-muted">
                      <span>Fundamental:</span> <span className="font-bold text-white">{aiReport.scores.fundamentalScore}/100</span>
                    </div>
                    <div className="w-full bg-terminal-border h-1.5 rounded-full overflow-hidden">
                      <div className="bg-terminal-success h-full" style={{ width: `${aiReport.scores.fundamentalScore}%` }} />
                    </div>
                    <div className="flex justify-between text-[9px] text-terminal-muted">
                      <span>Technical:</span> <span className="font-bold text-white">{aiReport.scores.technicalScore}/100</span>
                    </div>
                    <div className="w-full bg-terminal-border h-1.5 rounded-full overflow-hidden">
                      <div className="bg-terminal-accent h-full" style={{ width: `${aiReport.scores.technicalScore}%` }} />
                    </div>
                  </div>

                  <div className="space-y-1 border-r border-terminal-border/40 px-2">
                    <div className="flex justify-between text-[9px] text-terminal-muted">
                      <span>Growth Score:</span> <span className="font-bold text-white">{aiReport.scores.growthScore}/100</span>
                    </div>
                    <div className="w-full bg-terminal-border h-1.5 rounded-full overflow-hidden">
                      <div className="bg-terminal-accent h-full" style={{ width: `${aiReport.scores.growthScore}%` }} />
                    </div>
                    <div className="flex justify-between text-[9px] text-terminal-muted">
                      <span>Valuation Score:</span> <span className="font-bold text-white">{aiReport.scores.valuationScore}/100</span>
                    </div>
                    <div className="w-full bg-terminal-border h-1.5 rounded-full overflow-hidden">
                      <div className="bg-terminal-warning h-full" style={{ width: `${aiReport.scores.valuationScore}%` }} />
                    </div>
                  </div>

                  <div className="space-y-1 pl-2">
                    <div className="flex justify-between text-[9px] text-terminal-muted">
                      <span>Risk Rating:</span> <span className="font-bold text-white">{aiReport.scores.riskScore}/100</span>
                    </div>
                    <div className="w-full bg-terminal-border h-1.5 rounded-full overflow-hidden">
                      <div className="bg-terminal-danger h-full" style={{ width: `${aiReport.scores.riskScore}%` }} />
                    </div>
                    <div className="flex justify-between text-[9px] text-terminal-muted">
                      <span>Institutional:</span> <span className="font-bold text-white">{aiReport.scores.institutionalScore}/100</span>
                    </div>
                    <div className="w-full bg-terminal-border h-1.5 rounded-full overflow-hidden">
                      <div className="bg-terminal-accent h-full" style={{ width: `${aiReport.scores.institutionalScore}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Business Overview */}
              <div className="bg-terminal-card border border-terminal-border p-3 rounded">
                <span className="block text-[8px] text-terminal-muted uppercase tracking-widest font-bold mb-1 border-b border-terminal-border/30 pb-0.5">Business Profile & Institutional Moat</span>
                <p className="text-[#eee] text-[10px] leading-relaxed">{aiReport.businessSummary}</p>
              </div>

              {/* Thesis Bull / Bear case grids */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Bull Case */}
                <div className="bg-[#14532d]/10 border border-terminal-success/30 p-3 rounded space-y-2">
                  <span className="text-terminal-success font-black text-[9.5px] uppercase flex items-center">
                    <Flame className="w-3.5 h-3.5 mr-1.5" /> Institutional Bull Case & Tailwinds
                  </span>
                  <ul className="space-y-1.5 text-[#ddd] text-[9.5px] list-none">
                    {aiReport.thesis.bullCase.map((item, idx) => (
                      <li key={idx} className="flex items-start">
                        <CheckCircle2 className="w-3.5 h-3.5 text-terminal-success shrink-0 mr-1.5 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Bear Case */}
                <div className="bg-[#7f1d1d]/10 border border-terminal-danger/30 p-3 rounded space-y-2">
                  <span className="text-terminal-danger font-black text-[9.5px] uppercase flex items-center">
                    <AlertTriangle className="w-3.5 h-3.5 mr-1.5" /> Regulatory Risks & Bear Headwinds
                  </span>
                  <ul className="space-y-1.5 text-[#ddd] text-[9.5px] list-none">
                    {aiReport.thesis.bearCase.map((item, idx) => (
                      <li key={idx} className="flex items-start">
                        <AlertTriangle className="w-3.5 h-3.5 text-terminal-danger shrink-0 mr-1.5 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* SWOT Analysis & Value Targets */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Valuation Intrinsic Targets */}
                <div className="bg-terminal-card border border-terminal-border p-3 rounded space-y-2 col-span-1">
                  <span className="block text-[8px] text-terminal-muted uppercase tracking-widest font-bold border-b border-terminal-border/30 pb-0.5">DCF Valuation & Intrinsic Targets</span>
                  <div className="space-y-2 text-[10px]">
                    <div className="flex justify-between border-b border-terminal-border/20 pb-1">
                      <span>LTP (Current price):</span> <span className="font-bold text-white">₹{metadata.price}</span>
                    </div>
                    <div className="flex justify-between border-b border-terminal-border/20 pb-1">
                      <span>Intrinsic Fair Value:</span> <span className="font-bold text-terminal-success">₹{aiReport.valuationDCF.intrinsicValue}</span>
                    </div>
                    <div className="flex justify-between border-b border-terminal-border/20 pb-1">
                      <span>12M Analyst Target:</span> <span className="font-bold text-terminal-accent">₹{aiReport.thesis.targetPrice}</span>
                    </div>
                    <div className="flex justify-between border-b border-terminal-border/20 pb-1">
                      <span>Model Upside %:</span> <span className="font-bold text-terminal-success">+{aiReport.valuationDCF.upsidePct}%</span>
                    </div>
                    <div className="flex justify-between border-b border-terminal-border/20 pb-1">
                      <span>Expected 3Y CAGR:</span> <span className="font-bold text-white">{aiReport.thesis.expectedCagr}%</span>
                    </div>
                    <div className="text-[8px] text-terminal-muted text-center pt-1">
                      DCF model assumes {aiReport.valuationDCF.discountRateUsed}% WACC / {aiReport.valuationDCF.growthRateUsed}% terminal growth
                    </div>
                  </div>
                </div>

                {/* SWOT Analysis Box */}
                <div className="bg-terminal-card border border-terminal-border p-3 rounded col-span-2 space-y-2">
                  <span className="block text-[8px] text-terminal-muted uppercase tracking-widest font-bold border-b border-terminal-border/30 pb-0.5">SWOT Analysis Quadrant</span>
                  <div className="grid grid-cols-2 gap-3 text-[9px] text-[#ddd]">
                    <div className="space-y-1">
                      <span className="text-terminal-success font-bold uppercase block text-[8px]">Strengths</span>
                      {aiReport.swot.strengths.slice(0, 2).map((s, i) => <div key={i} className="bg-terminal-bg/50 p-1.5 rounded border border-terminal-border/20">• {s}</div>)}
                    </div>
                    <div className="space-y-1">
                      <span className="text-terminal-danger font-bold uppercase block text-[8px]">Weaknesses</span>
                      {aiReport.swot.weaknesses.slice(0, 2).map((w, i) => <div key={i} className="bg-terminal-bg/50 p-1.5 rounded border border-terminal-border/20">• {w}</div>)}
                    </div>
                    <div className="space-y-1">
                      <span className="text-terminal-warning font-bold uppercase block text-[8px]">Opportunities</span>
                      {aiReport.swot.opportunities.slice(0, 2).map((o, i) => <div key={i} className="bg-terminal-bg/50 p-1.5 rounded border border-terminal-border/20">• {o}</div>)}
                    </div>
                    <div className="space-y-1">
                      <span className="text-terminal-muted font-bold uppercase block text-[8px]">Threats</span>
                      {aiReport.swot.threats.slice(0, 2).map((t, i) => <div key={i} className="bg-terminal-bg/50 p-1.5 rounded border border-terminal-border/20">• {t}</div>)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Catalysts block */}
              <div className="bg-[#1c1c1c]/30 border border-terminal-border/80 p-3 rounded">
                <span className="block text-[8px] text-terminal-muted uppercase tracking-widest font-bold mb-1 border-b border-terminal-border/30 pb-0.5">Upcoming Value Catalysts</span>
                <div className="flex flex-col md:flex-row gap-4">
                  {aiReport.thesis.catalysts.map((cat, idx) => (
                    <div key={idx} className="flex-1 bg-terminal-bg/50 p-2 rounded border border-terminal-border/30 text-[#ddd] text-[9.5px]">
                      {idx + 1}. {cat}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
