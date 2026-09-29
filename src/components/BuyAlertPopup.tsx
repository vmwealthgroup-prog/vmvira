/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from "react";
import { TrendingUp, AlertCircle, CheckCircle2, X, Bell, Zap, ShieldAlert, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export interface BuyAlertPayload {
  id: string;
  symbol: string;
  assetType: "STOCK" | "OPTION" | "CRYPTO";
  action: "BUY" | "CE_BUY" | "PE_BUY";
  price: number;
  strike?: number;
  optionType?: "CE" | "PE";
  targetPrice?: number;
  stopLoss?: number;
  score?: number;
  maxScore?: number;
  reason?: string;
  source?: string;
  timestamp: string;
}

interface BuyAlertPopupProps {
  alert: BuyAlertPayload | null;
  onClose: () => void;
  onExecute?: (alert: BuyAlertPayload) => void;
}

export function playBuyChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    // First tone (A5 - 880Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(880, ctx.currentTime);
    gain1.gain.setValueAtTime(0.15, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.2);

    // Second higher tone (D6 - 1174.66Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.12);
    gain2.gain.setValueAtTime(0.2, ctx.currentTime + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.12);
    osc2.stop(ctx.currentTime + 0.45);
  } catch (err) {
    // Audio context play error handled silently
  }
}

export default function BuyAlertPopup({ alert, onClose, onExecute }: BuyAlertPopupProps) {
  useEffect(() => {
    if (alert) {
      playBuyChime();
    }
  }, [alert]);

  if (!alert) return null;

  const isOption = alert.assetType === "OPTION";
  const isCrypto = alert.assetType === "CRYPTO";

  const actionText = alert.action === "CE_BUY" ? "BUY CALL (CE)" : alert.action === "PE_BUY" ? "BUY PUT (PE)" : "BUY SIGNAL";

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 10 }}
          transition={{ type: "spring", damping: 25, stiffness: 350 }}
          className="relative w-full max-w-lg bg-slate-900 border-2 border-emerald-500/80 rounded-xl shadow-[0_0_50px_rgba(16,185,129,0.3)] overflow-hidden font-mono"
        >
          {/* Top Decorative Alert Bar */}
          <div className="bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-600 px-4 py-2 flex items-center justify-between text-slate-950">
            <div className="flex items-center space-x-2 font-black text-xs uppercase tracking-wider">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-950 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-slate-950"></span>
              </span>
              <Bell className="w-4 h-4 fill-slate-950" />
              <span>VM ALGO REAL-TIME BUY ALERT</span>
            </div>

            <button
              onClick={onClose}
              className="p-1 text-slate-950 hover:bg-slate-950/20 rounded transition-colors cursor-pointer"
              title="Close Alert"
            >
              <X className="w-4 h-4 stroke-[3]" />
            </button>
          </div>

          {/* Alert Content */}
          <div className="p-5 space-y-4 text-white">
            {/* Header / Symbol badge */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-2xl font-black tracking-tight text-white">
                    {alert.symbol}
                  </span>
                  {alert.strike && (
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold text-xs">
                      {alert.strike} {alert.optionType || "CE"}
                    </span>
                  )}
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold uppercase tracking-widest border border-slate-700">
                    {alert.assetType}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-1 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-emerald-400 inline" />
                  Source: <span className="text-emerald-400 font-bold">{alert.source || "VM Algo Engine"}</span>
                  {" • "}
                  <span>{alert.timestamp}</span>
                </p>
              </div>

              <div className="text-right">
                <span className="block text-[9px] uppercase font-bold text-slate-400 tracking-wider">
                  Action
                </span>
                <span className="inline-block text-xs font-black px-2.5 py-1 rounded bg-emerald-500 text-slate-950 uppercase tracking-wider shadow-[0_0_12px_rgba(16,185,129,0.5)]">
                  {actionText}
                </span>
              </div>
            </div>

            {/* Metrics grid */}
            <div className="grid grid-cols-3 gap-2.5 bg-slate-950/80 p-3 rounded-lg border border-slate-800 text-center">
              <div>
                <span className="block text-[8px] text-slate-400 uppercase font-bold tracking-wider">
                  Entry Price
                </span>
                <span className="text-base font-extrabold text-white">
                  {isCrypto ? `$${alert.price.toLocaleString()}` : `₹${alert.price.toLocaleString("en-IN")}`}
                </span>
              </div>

              <div>
                <span className="block text-[8px] text-slate-400 uppercase font-bold tracking-wider">
                  Target (TP)
                </span>
                <span className="text-base font-extrabold text-emerald-400">
                  {alert.targetPrice
                    ? isCrypto
                      ? `$${alert.targetPrice.toLocaleString()}`
                      : `₹${alert.targetPrice.toLocaleString("en-IN")}`
                    : (isCrypto ? `$${(alert.price * 1.05).toFixed(2)}` : `₹${(alert.price * 1.04).toFixed(2)}`)}
                </span>
              </div>

              <div>
                <span className="block text-[8px] text-slate-400 uppercase font-bold tracking-wider">
                  Stop Loss (SL)
                </span>
                <span className="text-base font-extrabold text-rose-400">
                  {alert.stopLoss
                    ? isCrypto
                      ? `$${alert.stopLoss.toLocaleString()}`
                      : `₹${alert.stopLoss.toLocaleString("en-IN")}`
                    : (isCrypto ? `$${(alert.price * 0.97).toFixed(2)}` : `₹${(alert.price * 0.98).toFixed(2)}`)}
                </span>
              </div>
            </div>

            {/* Reason / Score Confluence */}
            {alert.reason && (
              <div className="p-2.5 bg-emerald-950/30 border border-emerald-500/30 rounded text-emerald-300 text-[10px] space-y-1">
                <div className="flex items-center justify-between font-bold uppercase">
                  <span className="flex items-center">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mr-1.5" /> Confluence Signal
                  </span>
                  {alert.score !== undefined && alert.maxScore && (
                    <span className="bg-emerald-500/20 px-1.5 py-0.5 rounded text-[9px] text-emerald-400 border border-emerald-500/40">
                      Score: {alert.score}/{alert.maxScore}
                    </span>
                  )}
                </div>
                <p className="text-[9.5px] leading-relaxed opacity-90">{alert.reason}</p>
              </div>
            )}

            {/* Buttons */}
            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold uppercase tracking-wider transition-colors border border-slate-700 cursor-pointer"
              >
                Dismiss
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onExecute) onExecute(alert);
                  onClose();
                }}
                className="flex-1 py-2.5 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)] flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <span>Execute / View</span>
                <ArrowRight className="w-4 h-4 stroke-[3]" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
