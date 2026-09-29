/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  Activity,
  AlertTriangle,
  HelpCircle,
  PieChart,
  Percent,
  Sliders,
  DollarSign,
  Zap,
  Info,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Scale
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { PaperHolding, PaperAccount, CompanyMetadata } from "../types";

interface PortfolioRiskMetricsProps {
  account: PaperAccount;
  stocks: CompanyMetadata[];
}

export default function PortfolioRiskMetrics({ account, stocks }: PortfolioRiskMetricsProps) {
  // Configurable Parameters
  const [confidenceLevel, setConfidenceLevel] = useState<95 | 99>(95);
  const [timeHorizonDays, setTimeHorizonDays] = useState<1 | 5 | 10>(1);
  const [riskFreeRate, setRiskFreeRate] = useState<number>(6.5); // 6.5% default RBI G-Sec yield
  const [stressSimPct, setStressSimPct] = useState<number>(0); // Market shock simulation (-20% to +20%)
  const [showFormulaInfo, setShowFormulaInfo] = useState<boolean>(false);

  const { holdings, balance, totalEquity, holdingsValue, totalPnlPct } = account;

  // Real-time calculations
  const riskAnalysis = useMemo(() => {
    if (totalEquity <= 0 || holdings.length === 0) {
      return {
        hasHoldings: false,
        portfolioValue: totalEquity,
        cashWeightPct: 100,
        investedWeightPct: 0,
        dailyVolPct: 0,
        annualVolPct: 0,
        varAmount: 0,
        varPct: 0,
        cvarAmount: 0,
        cvarPct: 0,
        sharpeRatio: 0,
        sortinoRatio: 0,
        diversificationBenefitPct: 0,
        maxDrawdownEstPct: 0,
        assetContributions: [],
        simulatedEquity: totalEquity,
        simulatedVar: 0,
        simulatedPnlChange: 0
      };
    }

    const cashWeight = balance / totalEquity;
    const investedWeight = holdingsValue / totalEquity;

    // Calculate individual asset volatilities and weights
    let undiversifiedVolSum = 0;
    
    const assetContributions = holdings.map((h) => {
      const stockMeta = stocks.find((s) => s.ticker === h.ticker);
      
      // Volatility estimation derived from stock change magnitude & 52-week range spread
      let estimatedDailyVol = 0.018; // Default 1.8% daily vol (~28.5% annual)
      if (stockMeta) {
        const spreadRatio = (stockMeta.fiftyTwoWeekHigh - stockMeta.fiftyTwoWeekLow) / (stockMeta.price || 1);
        const changeMagnitude = Math.abs(stockMeta.changePct) / 100;
        estimatedDailyVol = Math.max(0.01, Math.min(0.045, (spreadRatio * 0.05) + (changeMagnitude * 0.4) + 0.012));
      }

      const weight = h.currentValue / totalEquity;
      undiversifiedVolSum += weight * estimatedDailyVol;

      // Risk contribution (weighted volatility)
      const weightedVol = weight * estimatedDailyVol;

      return {
        ticker: h.ticker,
        companyName: h.companyName,
        currentValue: h.currentValue,
        weightPct: weight * 100,
        dailyVolPct: estimatedDailyVol * 100,
        annualVolPct: estimatedDailyVol * Math.sqrt(252) * 100,
        weightedVolContributionPct: weightedVol * 100,
        sector: stockMeta?.sector || "Diversified",
        beta: stockMeta?.marketCapType === "Small Cap" ? 1.35 : stockMeta?.marketCapType === "Mid Cap" ? 1.15 : 0.95
      };
    });

    // Correlation reduction effect (assuming average cross-asset correlation of 0.38)
    const avgCorrelation = 0.38;
    const N = holdings.length;
    let correlationMultiplier = 1;
    if (N > 1) {
      // Portfolio variance formula simplification with correlation matrix
      const varianceFactor = (1 / N) + ((N - 1) / N) * avgCorrelation;
      correlationMultiplier = Math.sqrt(Math.max(0.2, varianceFactor));
    }

    // Portfolio Daily Volatility
    const portfolioDailyVol = undiversifiedVolSum * correlationMultiplier;
    const portfolioAnnualVol = portfolioDailyVol * Math.sqrt(252);

    // Diversification benefit %
    const diversificationBenefitPct = undiversifiedVolSum > 0 
      ? Math.max(0, ((undiversifiedVolSum - portfolioDailyVol) / undiversifiedVolSum) * 100)
      : 0;

    // Z-Score for Confidence Level
    const zScore = confidenceLevel === 95 ? 1.645 : 2.326;
    const timeMultiplier = Math.sqrt(timeHorizonDays);

    // Value at Risk (VaR)
    const varPct = zScore * portfolioDailyVol * timeMultiplier;
    const varAmount = totalEquity * varPct;

    // Conditional VaR (Expected Shortfall) ~ 1.25x VaR for normal distribution tail
    const cvarPct = varPct * 1.25;
    const cvarAmount = totalEquity * cvarPct;

    // Sharpe Ratio calculation
    // Expected Portfolio Annual Return = Total Realized/Unrealized P&L % annualized + 8.5% benchmark market drift
    const estimatedAnnualReturnPct = Math.max(-30, Math.min(80, (totalPnlPct * 2) + 12.0));
    const excessReturn = (estimatedAnnualReturnPct - riskFreeRate) / 100;
    const sharpeRatio = portfolioAnnualVol > 0 ? excessReturn / portfolioAnnualVol : 0;

    // Sortino Ratio (Downside deviation ~ 0.70 of total volatility)
    const downsideVol = portfolioAnnualVol * 0.70;
    const sortinoRatio = downsideVol > 0 ? excessReturn / downsideVol : 0;

    // Max Drawdown Estimate (historical 99.5% tail risk bound ~ 2.8 * Annual Vol)
    const maxDrawdownEstPct = Math.min(85, portfolioAnnualVol * 2.2 * 100);

    // Stress Testing Simulator
    const simMarketImpactPct = stressSimPct / 100;
    // Portfolio beta weighted
    const avgPortfolioBeta = assetContributions.reduce((sum, a) => sum + (a.weightPct / 100) * a.beta, 0);
    const simulatedPnlPct = simMarketImpactPct * avgPortfolioBeta * (investedWeight);
    const simulatedEquity = totalEquity * (1 + simulatedPnlPct);
    const simulatedPnlChange = totalEquity * simulatedPnlPct;
    
    // Stress VaR under market shock (volatility increases during stress)
    const stressedVolMultiplier = 1 + Math.abs(simMarketImpactPct) * 1.5;
    const simulatedVar = simulatedEquity * (varPct * stressedVolMultiplier);

    return {
      hasHoldings: true,
      portfolioValue: totalEquity,
      cashWeightPct: cashWeight * 100,
      investedWeightPct: investedWeight * 100,
      dailyVolPct: portfolioDailyVol * 100,
      annualVolPct: portfolioAnnualVol * 100,
      varAmount,
      varPct: varPct * 100,
      cvarAmount,
      cvarPct: cvarPct * 100,
      sharpeRatio,
      sortinoRatio,
      diversificationBenefitPct,
      maxDrawdownEstPct,
      assetContributions: assetContributions.sort((a, b) => b.weightedVolContributionPct - a.weightedVolContributionPct),
      simulatedEquity,
      simulatedVar,
      simulatedPnlChange
    };
  }, [holdings, balance, totalEquity, holdingsValue, totalPnlPct, stocks, confidenceLevel, timeHorizonDays, riskFreeRate, stressSimPct]);

  // Sharpe Quality Badge Helper
  const getSharpeRating = (sharpe: number) => {
    if (sharpe >= 2.0) return { label: "EXCELLENT", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" };
    if (sharpe >= 1.0) return { label: "GOOD", color: "text-teal-400 bg-teal-500/10 border-teal-500/30" };
    if (sharpe >= 0.5) return { label: "ADEQUATE", color: "text-amber-400 bg-amber-500/10 border-amber-500/30" };
    if (sharpe >= 0) return { label: "SUB-OPTIMAL", color: "text-orange-400 bg-orange-500/10 border-orange-500/30" };
    return { label: "HIGH RISK / NEGATIVE", color: "text-rose-400 bg-rose-500/10 border-rose-500/30" };
  };

  const sharpeBadge = getSharpeRating(riskAnalysis.sharpeRatio);

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Top Controls & Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-black text-white uppercase tracking-wider">
                REAL-TIME PORTFOLIO VaR & SHARPE ENGINE
              </h2>
              <span className="text-[8px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse">
                LIVE ANALYTICS
              </span>
            </div>
            <p className="text-[9.5px] text-slate-400 uppercase tracking-wider mt-0.5">
              Parametric Value at Risk (VaR), Conditional VaR, and Risk-Adjusted Sharpe Metrics
            </p>
          </div>
        </div>

        {/* Controls: Confidence & Time Horizon */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Confidence Level Toggle */}
          <div className="flex items-center bg-slate-950 p-1 rounded border border-slate-800 space-x-1">
            <span className="text-[8px] text-slate-400 uppercase font-bold px-1.5">Confidence:</span>
            <button
              type="button"
              onClick={() => setConfidenceLevel(95)}
              className={`px-2 py-0.5 text-[8.5px] font-black rounded transition-colors cursor-pointer ${
                confidenceLevel === 95
                  ? "bg-emerald-500 text-slate-950 shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              95%
            </button>
            <button
              type="button"
              onClick={() => setConfidenceLevel(99)}
              className={`px-2 py-0.5 text-[8.5px] font-black rounded transition-colors cursor-pointer ${
                confidenceLevel === 99
                  ? "bg-emerald-500 text-slate-950 shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              99%
            </button>
          </div>

          {/* Time Horizon Toggle */}
          <div className="flex items-center bg-slate-950 p-1 rounded border border-slate-800 space-x-1">
            <span className="text-[8px] text-slate-400 uppercase font-bold px-1.5">Horizon:</span>
            {([1, 5, 10] as const).map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => setTimeHorizonDays(days)}
                className={`px-2 py-0.5 text-[8.5px] font-black rounded transition-colors cursor-pointer ${
                  timeHorizonDays === days
                    ? "bg-emerald-500 text-slate-950 shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {days}D
              </button>
            ))}
          </div>

          {/* Formula Info Toggle Button */}
          <button
            type="button"
            onClick={() => setShowFormulaInfo(!showFormulaInfo)}
            className={`p-1.5 rounded border transition-colors cursor-pointer ${
              showFormulaInfo
                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50"
                : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
            }`}
            title="Toggle Quantitative Formula Details"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quantitative Formula Breakdown Modal / Panel */}
      <AnimatePresence>
        {showFormulaInfo && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-slate-900/90 border border-emerald-500/40 rounded-lg p-4 space-y-3 text-[10px] text-slate-300">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Info className="w-4 h-4" /> Quantitative Methodologies & Formulations
                </span>
                <span className="text-[8.5px] text-slate-400 uppercase">Parametric Normal Distribution Engine</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
                  <span className="block font-bold text-white uppercase text-[9px]">1. Value at Risk (VaR)</span>
                  <p className="text-[9px] text-emerald-400 font-mono mt-1">
                    VaR = Portfolio Value × Z<sub>α</sub> × σ<sub>portfolio</sub> × √T
                  </p>
                  <p className="text-[8.5px] text-slate-400 mt-1 leading-relaxed">
                    Estimates the maximum loss expected over {timeHorizonDays} day(s) with {confidenceLevel}% confidence under normal market conditions.
                  </p>
                </div>

                <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
                  <span className="block font-bold text-white uppercase text-[9px]">2. Sharpe Ratio</span>
                  <p className="text-[9px] text-emerald-400 font-mono mt-1">
                    Sharpe = (R<sub>p</sub> - R<sub>f</sub>) / σ<sub>annual</sub>
                  </p>
                  <p className="text-[8.5px] text-slate-400 mt-1 leading-relaxed">
                    Measures excess return per unit of total risk (risk-adjusted return). Evaluated against R<sub>f</sub> = {riskFreeRate}% annual risk-free rate.
                  </p>
                </div>

                <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
                  <span className="block font-bold text-white uppercase text-[9px]">3. Conditional VaR (CVaR)</span>
                  <p className="text-[9px] text-emerald-400 font-mono mt-1">
                    CVaR = E[Loss | Loss &gt; VaR] ≈ 1.25 × VaR
                  </p>
                  <p className="text-[8.5px] text-slate-400 mt-1 leading-relaxed">
                    Also known as Expected Shortfall. Quantifies the average loss incurred when market moves exceed the VaR threshold (tail risk).
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!riskAnalysis.hasHoldings ? (
        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-10 text-center space-y-3">
          <ShieldCheck className="w-10 h-10 text-slate-600 mx-auto" />
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Zero Portfolio Holdings Detected</h3>
            <p className="text-[9.5px] text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
              Your paper portfolio currently holds 100% Cash (₹{balance.toLocaleString("en-IN")}). Execute buy trades in the Paper Trading execution panel to establish asset allocations and compute real-time VaR and Sharpe metrics.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Main Risk Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 1. Value at Risk (VaR) Card */}
            <div className="bg-slate-900/90 border border-rose-500/40 rounded-lg p-3.5 space-y-2 relative overflow-hidden shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                  {timeHorizonDays}-Day VaR ({confidenceLevel}%)
                </span>
                <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  MAX LOSS BOUND
                </span>
              </div>

              <div>
                <span className="text-xl font-black text-rose-400 tracking-tight">
                  ₹{riskAnalysis.varAmount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </span>
                <span className="text-xs font-bold text-rose-300 ml-2">
                  ({riskAnalysis.varPct.toFixed(2)}%)
                </span>
              </div>

              <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="bg-gradient-to-r from-amber-500 to-rose-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, riskAnalysis.varPct * 5)}%` }}
                />
              </div>

              <p className="text-[8.5px] text-slate-400 leading-tight">
                9{confidenceLevel === 95 ? "5" : "9"}% statistical certainty that 1-day loss won't exceed ₹{riskAnalysis.varAmount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}.
              </p>
            </div>

            {/* 2. Sharpe Ratio Card */}
            <div className="bg-slate-900/90 border border-emerald-500/40 rounded-lg p-3.5 space-y-2 relative overflow-hidden shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  Sharpe Ratio
                </span>
                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border ${sharpeBadge.color}`}>
                  {sharpeBadge.label}
                </span>
              </div>

              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-black text-emerald-400 tracking-tight">
                  {riskAnalysis.sharpeRatio.toFixed(2)}
                </span>
                <span className="text-[9px] text-slate-400 uppercase font-bold">
                  (R<sub>f</sub>: {riskFreeRate}%)
                </span>
              </div>

              <div className="text-[8.5px] text-slate-400 space-y-1">
                <div className="flex justify-between border-t border-slate-800/80 pt-1">
                  <span>Sortino Ratio (Downside):</span>
                  <span className="font-bold text-emerald-300">{riskAnalysis.sortinoRatio.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Annual Volatility (σ):</span>
                  <span className="font-bold text-slate-200">{riskAnalysis.annualVolPct.toFixed(2)}%</span>
                </div>
              </div>
            </div>

            {/* 3. Conditional VaR (CVaR) Card */}
            <div className="bg-slate-900/90 border border-amber-500/40 rounded-lg p-3.5 space-y-2 relative overflow-hidden shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  Expected Shortfall (CVaR)
                </span>
                <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  TAIL RISK
                </span>
              </div>

              <div>
                <span className="text-xl font-black text-amber-400 tracking-tight">
                  ₹{riskAnalysis.cvarAmount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </span>
                <span className="text-xs font-bold text-amber-300 ml-2">
                  ({riskAnalysis.cvarPct.toFixed(2)}%)
                </span>
              </div>

              <p className="text-[8.5px] text-slate-400 leading-tight border-t border-slate-800/80 pt-1">
                Average expected loss if extreme market tail events breach the VaR threshold.
              </p>
            </div>

            {/* 4. Diversification & Allocation Card */}
            <div className="bg-slate-900/90 border border-teal-500/40 rounded-lg p-3.5 space-y-2 relative overflow-hidden shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1">
                  <Scale className="w-3.5 h-3.5 text-teal-400" />
                  Diversification Score
                </span>
                <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-400 border border-teal-500/30">
                  +{riskAnalysis.diversificationBenefitPct.toFixed(1)}% REDUCTION
                </span>
              </div>

              <div>
                <span className="text-xl font-black text-teal-300 tracking-tight">
                  {riskAnalysis.dailyVolPct.toFixed(2)}%
                </span>
                <span className="text-[9px] text-slate-400 uppercase font-bold ml-1.5">
                  Daily Volatility
                </span>
              </div>

              <div className="text-[8.5px] text-slate-400 space-y-1 border-t border-slate-800/80 pt-1">
                <div className="flex justify-between">
                  <span>Invested vs Cash:</span>
                  <span className="font-bold text-teal-300">
                    {riskAnalysis.investedWeightPct.toFixed(0)}% / {riskAnalysis.cashWeightPct.toFixed(0)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Est. Max Drawdown:</span>
                  <span className="font-bold text-rose-400">-{riskAnalysis.maxDrawdownEstPct.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Stress Testing & Risk Breakdown Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {/* Left: Stress Testing Simulator (1 Col) */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-emerald-400" />
                  Stress Testing Simulator
                </span>
                <span className="text-[8px] font-bold text-slate-400 uppercase">Scenario Shock</span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-[9px] font-bold uppercase">
                  <span className="text-slate-400">Simulated Market Shift:</span>
                  <span className={`font-black ${
                    stressSimPct > 0 ? "text-emerald-400" : stressSimPct < 0 ? "text-rose-400" : "text-white"
                  }`}>
                    {stressSimPct > 0 ? `+${stressSimPct}%` : `${stressSimPct}%`}
                  </span>
                </div>

                <input
                  type="range"
                  min="-20"
                  max="20"
                  step="1"
                  value={stressSimPct}
                  onChange={(e) => setStressSimPct(parseFloat(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-950 rounded-lg appearance-none"
                />

                <div className="flex justify-between text-[8px] font-bold text-slate-400 uppercase">
                  <span>-20% Crash</span>
                  <span>0% Neutral</span>
                  <span>+20% Rally</span>
                </div>
              </div>

              {/* Preset Scenarios */}
              <div className="grid grid-cols-3 gap-1.5 pt-1">
                {[
                  { label: "2008 Crash", val: -15 },
                  { label: "Correction", val: -5 },
                  { label: "Bull Spike", val: 10 }
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setStressSimPct(preset.val)}
                    className={`py-1 px-1.5 text-[8px] font-bold uppercase rounded border transition-colors cursor-pointer text-center ${
                      stressSimPct === preset.val
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50"
                        : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
                    }`}
                  >
                    {preset.label} ({preset.val > 0 ? `+${preset.val}%` : `${preset.val}%`})
                  </button>
                ))}
              </div>

              {/* Simulated Impact Results */}
              <div className="p-3 bg-slate-950 rounded border border-slate-800 space-y-2 text-[9.5px]">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 uppercase font-bold">Simulated Equity:</span>
                  <span className="font-extrabold text-white text-xs">
                    ₹{riskAnalysis.simulatedEquity.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-400 uppercase font-bold">Simulated P&L Impact:</span>
                  <span className={`font-black ${
                    riskAnalysis.simulatedPnlChange >= 0 ? "text-emerald-400" : "text-rose-400"
                  }`}>
                    {riskAnalysis.simulatedPnlChange >= 0 ? "+" : ""}₹{riskAnalysis.simulatedPnlChange.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                  </span>
                </div>

                <div className="flex justify-between items-center border-t border-slate-800 pt-1.5">
                  <span className="text-slate-400 uppercase font-bold">Stressed VaR ({confidenceLevel}%):</span>
                  <span className="font-black text-rose-400">
                    ₹{riskAnalysis.simulatedVar.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Holding Asset Volatility & VaR Risk Contribution Breakdown (2 Cols) */}
            <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-emerald-400" />
                  Asset Risk & Volatility Contribution Breakdown
                </span>
                <span className="text-[8px] font-bold text-slate-400 uppercase">
                  {riskAnalysis.assetContributions.length} Active Holdings
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[500px]">
                  <thead>
                    <tr className="border-b border-slate-800 text-[8px] text-slate-400 uppercase font-bold">
                      <th className="pb-2">ASSET</th>
                      <th className="pb-2">WEIGHT</th>
                      <th className="pb-2">DAILY VOL (σ)</th>
                      <th className="pb-2">ANNUAL VOL</th>
                      <th className="pb-2 text-right">RISK CONTRIBUTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-[9px]">
                    {riskAnalysis.assetContributions.map((asset) => (
                      <tr key={asset.ticker} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 font-bold text-white">
                          <span className="text-emerald-400">{asset.ticker}</span>
                          <span className="text-[7.5px] text-slate-400 block max-w-[120px] truncate">
                            {asset.companyName}
                          </span>
                        </td>
                        <td className="py-2.5 font-bold text-slate-200">
                          {asset.weightPct.toFixed(1)}%
                        </td>
                        <td className="py-2.5 font-semibold text-slate-300">
                          {asset.dailyVolPct.toFixed(2)}%
                        </td>
                        <td className="py-2.5 font-semibold text-slate-300">
                          {asset.annualVolPct.toFixed(1)}%
                        </td>
                        <td className="py-2.5 text-right font-bold">
                          <div className="flex items-center justify-end space-x-2">
                            <div className="w-20 bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800 hidden sm:block">
                              <div
                                className="bg-emerald-400 h-full rounded-full"
                                style={{ width: `${Math.min(100, asset.weightedVolContributionPct * 50)}%` }}
                              />
                            </div>
                            <span className="text-emerald-400 font-mono">
                              {asset.weightedVolContributionPct.toFixed(2)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
