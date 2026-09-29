/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  X,
  Power,
  Flame,
  CheckCircle,
  RotateCcw,
  Zap
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { CompanyMetadata } from "../types";
import {
  isKillSwitchEngaged,
  triggerKillSwitch,
  disarmKillSwitch,
  getKillSwitchConfig
} from "../services/killSwitchService";

interface KillSwitchModalProps {
  isOpen: boolean;
  onClose: () => void;
  stocks?: CompanyMetadata[];
  onSuccess?: () => void;
}

export default function KillSwitchModal({
  isOpen,
  onClose,
  stocks,
  onSuccess
}: KillSwitchModalProps) {
  const isEngaged = isKillSwitchEngaged();
  const config = getKillSwitchConfig();

  const [reason, setReason] = useState(
    "High volatility containment & emergency desk shutdown"
  );
  const [squareOffAll, setSquareOffAll] = useState(true);
  const [disarmNotes, setDisarmNotes] = useState("Manual confirmation by portfolio manager");
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleEngage = () => {
    setIsProcessing(true);
    try {
      const result = triggerKillSwitch(reason, squareOffAll, stocks);
      setActionFeedback(
        `Kill switch engaged. Cancelled ${result.cancelledOrders} orders.${
          squareOffAll
            ? ` Flattened ${result.flattenedCounts.stocks} equities, ${result.flattenedCounts.options} options, ${result.flattenedCounts.crypto} crypto.`
            : ""
        }`
      );
      setTimeout(() => {
        setIsProcessing(false);
        if (onSuccess) onSuccess();
        onClose();
      }, 1200);
    } catch (err: any) {
      setIsProcessing(false);
      setActionFeedback(`Failed to engage kill switch: ${err.message}`);
    }
  };

  const handleDisarm = () => {
    setIsProcessing(true);
    try {
      disarmKillSwitch(disarmNotes);
      setActionFeedback("Kill switch disarmed. Trading locks released.");
      setTimeout(() => {
        setIsProcessing(false);
        if (onSuccess) onSuccess();
        onClose();
      }, 1000);
    } catch (err: any) {
      setIsProcessing(false);
      setActionFeedback(`Failed to disarm kill switch: ${err.message}`);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm font-mono select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className={`w-full max-w-lg bg-terminal-card border rounded-lg shadow-2xl overflow-hidden ${
            isEngaged
              ? "border-amber-500/50"
              : "border-terminal-danger/70 shadow-terminal-danger/20"
          }`}
        >
          {/* Modal Header */}
          <div
            className={`p-4 flex items-center justify-between border-b ${
              isEngaged
                ? "bg-amber-950/30 border-amber-500/30 text-amber-400"
                : "bg-red-950/40 border-red-500/40 text-red-400"
            }`}
          >
            <div className="flex items-center space-x-2.5">
              {isEngaged ? (
                <ShieldCheck className="w-5 h-5 text-amber-400 animate-pulse" />
              ) : (
                <ShieldAlert className="w-5 h-5 text-red-500 animate-bounce" />
              )}
              <div>
                <h2 className="text-xs font-black uppercase tracking-wider text-white">
                  {isEngaged
                    ? "DISARM EMERGENCY KILL SWITCH"
                    : "EMERGENCY RISK KILL SWITCH"}
                </h2>
                <p className="text-[9px] text-terminal-muted uppercase tracking-wider">
                  {isEngaged
                    ? "Reactivate algorithmic bots and unlock order book execution"
                    : "Institutional-grade emergency panic & circuit breaker protocol"}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-terminal-card-hover rounded text-terminal-muted hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Feedback banner */}
          {actionFeedback && (
            <div className="p-3 bg-terminal-accent/20 border-b border-terminal-accent text-terminal-accent text-[10px] font-bold flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{actionFeedback}</span>
            </div>
          )}

          {/* Body */}
          <div className="p-5 space-y-4 text-[10px]">
            {!isEngaged ? (
              <>
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded text-red-300 space-y-1.5">
                  <div className="flex items-center space-x-1.5 font-bold text-[11px] text-red-400 uppercase">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Immediate Consequences of Activation:</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-0.5 text-[9px] text-red-200">
                    <li>
                      <strong>HALTS ALL AUTOMATED BOTS:</strong> VM Algo Stock Bot,
                      Options Bot, Crypto Bot, and BTC bot are instantly suspended.
                    </li>
                    <li>
                      <strong>CANCELS OPEN ORDERS:</strong> All pending limit and
                      trigger orders across all exchanges are cancelled immediately.
                    </li>
                    <li>
                      <strong>EXECUTION LOCK:</strong> Prevents any new manual or
                      automated order routing until disarmed.
                    </li>
                  </ul>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-terminal-muted uppercase">
                    Trigger Reason / Desk Justification:
                  </label>
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full bg-terminal-bg border border-terminal-border rounded px-2.5 py-1.5 text-white focus:outline-none focus:border-red-500 text-[10px]"
                    placeholder="e.g. Extreme market dislocation / System error"
                  />
                </div>

                <div className="p-3 bg-terminal-bg border border-terminal-border rounded flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Flame className="w-4 h-4 text-amber-500" />
                    <div>
                      <span className="font-bold text-white uppercase text-[10px]">
                        Emergency Flatten All Positions
                      </span>
                      <p className="text-[9px] text-terminal-muted">
                        Square off all active equity, option, and crypto inventory to cash at market
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={squareOffAll}
                    onChange={(e) => setSquareOffAll(e.target.checked)}
                    className="w-4 h-4 accent-red-600 rounded cursor-pointer"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded text-amber-300 space-y-1">
                  <div className="flex items-center space-x-1.5 font-bold text-[11px] text-amber-400 uppercase">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Kill Switch is Currently ACTIVE</span>
                  </div>
                  <p className="text-[9px] text-amber-200">
                    Active since:{" "}
                    <strong>
                      {config.engagedAt
                        ? new Date(config.engagedAt).toLocaleString()
                        : "Earlier"}
                    </strong>
                    <br />
                    Reason: <em>"{config.reason || "Emergency Risk Lockdown"}"</em>
                  </p>
                  <p className="text-[9px] text-amber-200 mt-1">
                    Disarming will remove the order routing block and allow manual trading
                    and automated bots to resume normal operation.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-terminal-muted uppercase">
                    Clearance Notes / Manager Confirmation:
                  </label>
                  <input
                    type="text"
                    value={disarmNotes}
                    onChange={(e) => setDisarmNotes(e.target.value)}
                    className="w-full bg-terminal-bg border border-terminal-border rounded px-2.5 py-1.5 text-white focus:outline-none focus:border-amber-500 text-[10px]"
                    placeholder="e.g. Risk limits cleared, market stabilized"
                  />
                </div>
              </>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 bg-terminal-bg/80 border-t border-terminal-border flex items-center justify-end space-x-2">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="px-3 py-1.5 bg-terminal-card border border-terminal-border hover:bg-terminal-card-hover rounded text-terminal-muted hover:text-white uppercase font-bold text-[9px] tracking-wider transition-colors"
            >
              Cancel
            </button>
            {!isEngaged ? (
              <button
                onClick={handleEngage}
                disabled={isProcessing}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded uppercase font-black text-[10px] tracking-widest shadow-lg shadow-red-900/40 transition-all flex items-center space-x-1.5 disabled:opacity-50"
              >
                <Power className="w-3.5 h-3.5" />
                <span>{isProcessing ? "ENGAGING PROTOCOL..." : "ENGAGE KILL SWITCH NOW"}</span>
              </button>
            ) : (
              <button
                onClick={handleDisarm}
                disabled={isProcessing}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded uppercase font-black text-[10px] tracking-widest shadow-lg shadow-amber-900/40 transition-all flex items-center space-x-1.5 disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{isProcessing ? "DISARMING..." : "DISARM & RESUME TRADING"}</span>
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
