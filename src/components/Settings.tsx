/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Settings, ShieldCheck, Key, HelpCircle, Code, ArrowRight } from "lucide-react";

export default function SettingsPanel() {
  const isKeyConfigured = true; // Injected on backend server dynamically

  return (
    <div className="p-4 space-y-4 font-mono text-xs select-none">
      {/* Header section */}
      <div className="bg-terminal-card border border-terminal-border rounded p-3 flex flex-col md:flex-row md:items-center justify-between">
        <div className="flex items-center space-x-3">
          <Settings className="w-5 h-5 text-terminal-accent shrink-0" />
          <div>
            <h2 className="text-sm font-black text-white uppercase">TERMINAL CONFIGURATIONS & INTEGRATIONS</h2>
            <p className="text-terminal-muted text-[9px] uppercase">VERIFY SECURITY CHANNELS, CACHING SCHEMAS & REASONING CORE PIPELINES</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Credentials Desk */}
        <div className="bg-terminal-card border border-terminal-border p-3 rounded space-y-3">
          <span className="text-white uppercase font-bold text-[10px] block border-b border-terminal-border pb-1.5 flex items-center">
            <Key className="w-3.5 h-3.5 text-terminal-accent mr-1.5" /> API Secrets & Credentials
          </span>

          <div className="space-y-3">
            <div className="space-y-1 bg-terminal-bg p-2 rounded border border-terminal-border/60">
              <span className="text-[8.5px] text-terminal-muted uppercase block">GEMINI_API_KEY (Active)</span>
              <div className="flex items-center justify-between">
                <span className="font-bold text-white uppercase tracking-widest text-[9px]">••••••••••••••••</span>
                <span className="text-[8px] bg-terminal-success/15 text-terminal-success border border-terminal-success/25 px-1 py-0.2 rounded font-bold uppercase animate-pulse">
                  CONFIGURED
                </span>
              </div>
            </div>

            <div className="p-2 bg-terminal-bg/50 border border-terminal-border/40 rounded text-[8.5px] leading-relaxed text-terminal-muted space-y-1.5">
              <span className="text-white font-bold block uppercase text-[8px]">Injected Credentials Details:</span>
              <p>
                API keys are securely mapped from the **Settings &gt; Secrets** panel in the Google AI Studio environment.
              </p>
              <p>
                The server intercepts all communications from this dashboard, preventing any sensitive keys or credentials from being compiled into client-side bundles.
              </p>
            </div>
          </div>
        </div>

        {/* AI Engine pipeline blueprint */}
        <div className="bg-terminal-card border border-terminal-border p-3 rounded col-span-2 space-y-3">
          <span className="text-white uppercase font-bold text-[10px] block border-b border-terminal-border pb-1.5 flex items-center">
            <Code className="w-3.5 h-3.5 text-terminal-warning mr-1.5" /> VM ALGO AI Unified Core pipeline
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[9px]">
            <div className="space-y-2 text-[#ccc] leading-relaxed">
              <div className="font-bold text-white border-b border-terminal-border/20 pb-0.5">1. QUANT DATA INGESTION</div>
              <p>
                The server fetches the target equity's quarterly financial margins, balance sheet records, historical daily candles, and derivative Put-Call Ratios.
              </p>

              <div className="font-bold text-white border-b border-terminal-border/20 pb-0.5 mt-2">2. GOOGLE SEARCH GROUNDING</div>
              <p>
                The pipeline executes structured web queries using premium search tooling to extract real-time broker consensus, target price adjustments, and domestic regulatory updates.
              </p>
            </div>

            <div className="space-y-2 text-[#ccc] leading-relaxed border-l border-terminal-border/30 pl-4">
              <div className="font-bold text-white border-b border-terminal-border/20 pb-0.5">3. MULTI-AXIS GRADING</div>
              <p>
                Gemini processes the aggregated quantitative and qualitative vectors, grading the asset across Fundamental, Technical, Valuation, Quality, and Risk parameters.
              </p>

              <div className="font-bold text-white border-b border-terminal-border/20 pb-0.5 mt-2">4. REPORT COMPILATION</div>
              <p>
                The reasoning engine synthesizes a formal SWOT diagram, identifies future value catalysts, models a 12-Month DCF valuation target, and compiles a comprehensive Buy/Sell thesis.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
