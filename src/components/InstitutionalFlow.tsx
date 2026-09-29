/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Users, BarChart3, AlertCircle, HelpCircle, ArrowUpRight, ArrowDownRight, RefreshCw } from "lucide-react";
import { FII_DII_FLOW_DATA, BLOCK_DEALS_DATA } from "../data/mockEquityData";

interface InstitutionalFlowProps {
  onSelectStock: (ticker: string) => void;
}

export default function InstitutionalFlow({ onSelectStock }: InstitutionalFlowProps) {
  const [loading, setLoading] = useState(false);
  const flowHistory = FII_DII_FLOW_DATA;
  const blockDeals = BLOCK_DEALS_DATA;

  // Calculate totals
  const totalFiiNet = flowHistory.reduce((sum, item) => sum + item.fiiNet, 0);
  const totalDiiNet = flowHistory.reduce((sum, item) => sum + item.diiNet, 0);

  return (
    <div className="p-4 space-y-4 font-mono text-xs select-none">
      {/* Header section */}
      <div className="bg-terminal-card border border-terminal-border rounded p-3 flex flex-col md:flex-row md:items-center justify-between">
        <div className="flex items-center space-x-3">
          <Users className="w-5 h-5 text-terminal-accent shrink-0" />
          <div>
            <h2 className="text-sm font-black text-white uppercase">INSTITUTIONAL ACCUMULATION FLOWS (FII / DII)</h2>
            <p className="text-terminal-muted text-[9px] uppercase">PROVISIONAL NET BUY/SELL TURNOVERS & LARGE BLOCK TRANSACTIONS</p>
          </div>
        </div>
      </div>

      {/* Stats summaries cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* FII Aggregate */}
        <div className="bg-terminal-card border border-terminal-border p-3 rounded">
          <span className="block text-[8px] text-terminal-muted uppercase tracking-widest font-bold">Foreign Institutional Investors (FII)</span>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className={`text-base font-black ${totalFiiNet >= 0 ? "text-terminal-success" : "text-terminal-danger"}`}>
              ₹{totalFiiNet >= 0 ? "+" : ""}{totalFiiNet.toLocaleString("en-IN", { minimumFractionDigits: 1 })} Cr
            </span>
            <span className="text-[8px] text-terminal-muted font-bold">NET (7D)</span>
          </div>
          <p className="text-[8.5px] text-terminal-muted leading-tight mt-1.5 border-t border-terminal-border/20 pt-1.5">
            FIIs remain net buyers in index derivatives but exhibit cautious rotation in cash equities.
          </p>
        </div>

        {/* DII Aggregate */}
        <div className="bg-terminal-card border border-terminal-border p-3 rounded">
          <span className="block text-[8px] text-terminal-muted uppercase tracking-widest font-bold">Domestic Institutional Investors (DII)</span>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className={`text-base font-black ${totalDiiNet >= 0 ? "text-terminal-success" : "text-terminal-danger"}`}>
              ₹{totalDiiNet >= 0 ? "+" : ""}{totalDiiNet.toLocaleString("en-IN", { minimumFractionDigits: 1 })} Cr
            </span>
            <span className="text-[8px] text-terminal-muted font-bold">NET (7D)</span>
          </div>
          <p className="text-[8.5px] text-terminal-muted leading-tight mt-1.5 border-t border-terminal-border/20 pt-1.5">
            Mutual Fund SIP inflows drive consistent structural absorption on underperforming sessions.
          </p>
        </div>

        {/* Market Commentary block */}
        <div className="bg-[#1c1c1c]/20 border border-terminal-border p-3 rounded flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 text-terminal-accent shrink-0 mt-0.5" />
          <div className="text-[9px] text-[#ccc] leading-relaxed">
            <span className="text-white font-bold uppercase block text-[8px] mb-0.5">Flow Intelligence Radar</span>
            FII/DII net positive turnover of <span className="text-terminal-success font-bold">₹{(totalFiiNet + totalDiiNet).toFixed(1)} Cr</span> over the past 7 sessions has anchored Nifty at support. Watch out for potential US Fed FOMC commentary which could pivot flows next week.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Provisional flows timeline table */}
        <div className="bg-terminal-card border border-terminal-border p-3 rounded col-span-2 space-y-2">
          <span className="text-white uppercase font-bold text-[10px] block border-b border-terminal-border pb-1.5">Provisional Daily Activity</span>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-terminal-border text-terminal-muted text-[8px] uppercase font-bold">
                  <th className="py-1">Trade Date</th>
                  <th className="py-1 text-right">FII Net Cr</th>
                  <th className="py-1 text-right">DII Net Cr</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-terminal-border/25">
                {flowHistory.map((flow, idx) => {
                  return (
                    <tr key={idx} className="hover:bg-terminal-card-hover/20">
                      <td className="py-1.5 font-bold text-white">{flow.date}</td>
                      <td className={`py-1.5 text-right font-bold ${flow.fiiNet >= 0 ? "text-terminal-success" : "text-terminal-danger"}`}>
                        {flow.fiiNet >= 0 ? "+" : ""}{flow.fiiNet.toLocaleString("en-IN", { minimumFractionDigits: 1 })}
                      </td>
                      <td className={`py-1.5 text-right font-bold ${flow.diiNet >= 0 ? "text-terminal-success" : "text-terminal-danger"}`}>
                        {flow.diiNet >= 0 ? "+" : ""}{flow.diiNet.toLocaleString("en-IN", { minimumFractionDigits: 1 })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Massive Bulk & Block deals tracker */}
        <div className="bg-terminal-card border border-terminal-border p-3 rounded col-span-3 space-y-2">
          <span className="text-white uppercase font-bold text-[10px] block border-b border-terminal-border pb-1.5">Recent NSE Block & Bulk Deals</span>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-terminal-border text-terminal-muted text-[8px] uppercase font-bold">
                  <th className="py-1">Trade Date</th>
                  <th className="py-1">Ticker</th>
                  <th className="py-1">Purchasing Client</th>
                  <th className="py-1">Deal Type</th>
                  <th className="py-1 text-right">Qty</th>
                  <th className="py-1 text-right">Val Cr</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-terminal-border/25">
                {blockDeals.map((deal, idx) => {
                  const isBuy = deal.dealType === "BUY";
                  return (
                    <tr key={idx} className="hover:bg-terminal-card-hover/20">
                      <td className="py-1.5 text-terminal-muted">{deal.date}</td>
                      <td className="py-1.5">
                        <button
                          onClick={() => onSelectStock(deal.ticker)}
                          className="font-bold text-terminal-accent hover:underline"
                        >
                          {deal.ticker}
                        </button>
                      </td>
                      <td className="py-1.5 text-[#ddd] font-medium truncate max-w-[120px]" title={deal.clientName}>{deal.clientName}</td>
                      <td className={`py-1.5 font-extrabold ${isBuy ? "text-terminal-success" : "text-terminal-danger"}`}>
                        <span className="flex items-center">
                          {isBuy ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                          {deal.dealType}
                        </span>
                      </td>
                      <td className="py-1.5 text-right text-white font-mono">{(deal.quantity / 100000).toFixed(1)}L</td>
                      <td className="py-1.5 text-right font-black text-white">₹{deal.valueCr}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
