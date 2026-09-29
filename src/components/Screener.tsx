/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { SearchCode, RefreshCw, AlertTriangle, ArrowRight, Table, Filter, Sparkles } from "lucide-react";
import { ScreenerFilter, CompanyMetadata } from "../types";
import { runScreener } from "../services/apiService";

interface ScreenerProps {
  onSelectStock: (ticker: string) => void;
}

export default function Screener({ onSelectStock }: ScreenerProps) {
  const [filters, setFilters] = useState<ScreenerFilter[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter input states
  const [selectedField, setSelectedField] = useState("roe");
  const [selectedOperator, setSelectedOperator] = useState("gt");
  const [filterValue, setFilterValue] = useState("15");

  const filterFields = [
    { field: "marketCap", label: "Market Cap (INR Cr)", type: "number" },
    { field: "price", label: "Share Price (₹)", type: "number" },
    { field: "roe", label: "Return on Equity (ROE %)", type: "number" },
    { field: "roce", label: "ROCE (%)", type: "number" },
    { field: "debtToEquity", label: "Debt to Equity (Ratio)", type: "number" },
    { field: "rsi", label: "RSI Indicator", type: "number" }
  ];

  // Presets configurations
  const presets = [
    {
      name: "High ROE Growth Leaders",
      filters: [
        { id: "1", label: "ROE", field: "roe", type: "number", operator: "gt", value: "20" },
        { id: "2", label: "Market Cap", field: "marketCap", type: "number", operator: "gt", value: "300000" }
      ]
    },
    {
      name: "Undervalued / Oversold Scanner",
      filters: [
        { id: "1", label: "RSI", field: "rsi", type: "number", operator: "lt", value: "48" },
        { id: "2", label: "Debt to Equity", field: "debtToEquity", type: "number", operator: "lt", value: "0.4" }
      ]
    },
    {
      name: "High ROCE Low Debt Quality",
      filters: [
        { id: "1", label: "ROCE", field: "roce", type: "number", operator: "gt", value: "18" },
        { id: "2", label: "Debt to Equity", field: "debtToEquity", type: "number", operator: "lt", value: "0.2" }
      ]
    }
  ];

  const applyPreset = (presetFilters: any[]) => {
    setFilters(presetFilters);
  };

  const executeScan = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await runScreener(filters);
      setResults(data);
    } catch (err: any) {
      setError(err.message || "Failed to compile scanner outputs");
    } finally {
      setLoading(false);
    }
  };

  // Run scan when filters change
  useEffect(() => {
    executeScan();
  }, [filters]);

  const addFilter = () => {
    const fieldObj = filterFields.find(f => f.field === selectedField);
    if (!fieldObj) return;

    const newFilter: ScreenerFilter = {
      id: Math.random().toString(),
      label: fieldObj.label,
      field: selectedField,
      type: fieldObj.type as any,
      operator: selectedOperator as any,
      value: filterValue
    };

    setFilters(prev => [...prev, newFilter]);
    setFilterValue("");
  };

  const removeFilter = (id: string) => {
    setFilters(prev => prev.filter(f => f.id !== id));
  };

  return (
    <div className="p-4 space-y-4 font-mono text-xs select-none">
      {/* Header section */}
      <div className="bg-terminal-card border border-terminal-border rounded p-3 flex flex-col md:flex-row md:items-center justify-between">
        <div className="flex items-center space-x-3">
          <SearchCode className="w-5 h-5 text-terminal-accent shrink-0" />
          <div>
            <h2 className="text-sm font-black text-white uppercase">MULTIVARIATE INSTITUTIONAL SCANNER</h2>
            <p className="text-terminal-muted text-[9px] uppercase">COVERS 100+ SECTORS, FUNDAMENTALS, AND OVERBOUGHT MOMENTUM FILTERS</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Filters and Presets Drawer Panel */}
        <div className="bg-terminal-card border border-terminal-border rounded p-3 space-y-4 col-span-1">
          {/* Custom Filter creator */}
          <div className="space-y-2 border-b border-terminal-border/40 pb-4">
            <span className="font-bold text-white text-[10px] uppercase block flex items-center">
              <Filter className="w-3.5 h-3.5 text-terminal-accent mr-1.5" /> Define Custom Filter
            </span>

            <div className="space-y-1.5">
              <label className="text-[8.5px] text-terminal-muted uppercase font-bold">Indicator Metric</label>
              <select
                value={selectedField}
                onChange={(e) => setSelectedField(e.target.value)}
                className="w-full bg-terminal-bg border border-terminal-border rounded text-white p-1 text-[10px] h-7 focus:outline-none"
              >
                {filterFields.map(f => (
                  <option key={f.field} value={f.field}>{f.label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[8.5px] text-terminal-muted uppercase font-bold">Condition</label>
                <select
                  value={selectedOperator}
                  onChange={(e) => setSelectedOperator(e.target.value)}
                  className="w-full bg-terminal-bg border border-terminal-border rounded text-white p-1 text-[10px] h-7 focus:outline-none"
                >
                  <option value="gt">Greater than</option>
                  <option value="lt">Less than</option>
                  <option value="eq">Equal to</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[8.5px] text-terminal-muted uppercase font-bold">Target Value</label>
                <input
                  type="text"
                  placeholder="e.g. 15"
                  value={filterValue}
                  onChange={(e) => setFilterValue(e.target.value)}
                  className="w-full bg-terminal-bg border border-terminal-border rounded text-white px-1.5 py-1 text-[10px] h-7 focus:outline-none focus:border-terminal-accent"
                />
              </div>
            </div>

            <button
              onClick={addFilter}
              className="w-full bg-terminal-accent text-white font-bold rounded py-1.5 hover:bg-terminal-accent/90 transition-colors uppercase text-[9.5px] mt-2"
            >
              Add Filter Parameter
            </button>
          </div>

          {/* Active Filter List */}
          <div className="space-y-2 border-b border-terminal-border/40 pb-4">
            <span className="font-bold text-white text-[10px] uppercase block">Active Parameters ({filters.length})</span>
            {filters.length === 0 ? (
              <span className="text-[9px] text-terminal-muted block text-center py-2">No active filter constraints</span>
            ) : (
              <div className="space-y-1">
                {filters.map(f => (
                  <div key={f.id} className="bg-terminal-bg border border-terminal-border/60 rounded p-1.5 flex items-center justify-between text-[9px] text-[#ddd]">
                    <div className="truncate max-w-[130px]">
                      <span className="text-terminal-accent font-bold">{f.field.toUpperCase()}</span> {f.operator === "gt" ? ">" : f.operator === "lt" ? "<" : "="} {f.value}
                    </div>
                    <button
                      onClick={() => removeFilter(f.id)}
                      className="text-terminal-danger font-bold hover:text-red-300 px-1"
                    >
                      [X]
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Screener Presets */}
          <div className="space-y-2">
            <span className="font-bold text-white text-[10px] uppercase block flex items-center">
              <Sparkles className="w-3.5 h-3.5 text-terminal-warning mr-1.5" /> Institutional Presets
            </span>
            <div className="space-y-1">
              {presets.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => applyPreset(preset.filters)}
                  className="w-full text-left p-2 bg-terminal-bg border border-terminal-border rounded hover:bg-terminal-card-hover text-white transition-colors text-[9px] flex items-center justify-between font-bold"
                >
                  <span className="truncate max-w-[130px]">{preset.name}</span>
                  <ArrowRight className="w-3 h-3 text-terminal-muted shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Screener Results Panel */}
        <div className="bg-terminal-card border border-terminal-border rounded p-3 col-span-3">
          <div className="flex items-center justify-between border-b border-terminal-border pb-1.5 mb-2">
            <span className="font-bold text-white uppercase text-[10px] flex items-center">
              <Table className="w-3.5 h-3.5 text-terminal-accent mr-1.5" /> Executed Screen Query Matches ({results.length})
            </span>
          </div>

          {loading ? (
            <div className="p-8 flex flex-col items-center justify-center space-y-3 h-72">
              <RefreshCw className="w-6 h-6 text-terminal-accent animate-spin" />
              <span className="text-terminal-muted uppercase tracking-widest animate-pulse">EXECUTING SCAN QUERY...</span>
            </div>
          ) : error ? (
            <div className="p-8 flex flex-col items-center justify-center space-y-2 text-center text-terminal-danger h-72">
              <AlertTriangle className="w-6 h-6" />
              <span>{error}</span>
            </div>
          ) : results.length === 0 ? (
            <div className="p-8 flex flex-col items-center justify-center text-center text-terminal-muted h-72">
              No listed NSE equities match the current multivariable bounds. Try loosening the filter values.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-[9px]">
                <thead>
                  <tr className="border-b border-terminal-border text-terminal-muted text-[8.5px] uppercase">
                    <th className="py-1">Ticker</th>
                    <th className="py-1">Sector</th>
                    <th className="py-1 text-right">LTP (₹)</th>
                    <th className="py-1 text-right">ROE %</th>
                    <th className="py-1 text-right">ROCE %</th>
                    <th className="py-1 text-right">Debt / Equity</th>
                    <th className="py-1 text-right">RSI (14)</th>
                    <th className="py-1 text-right">Trigger</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-terminal-border/25">
                  {results.map((stock) => (
                    <tr key={stock.ticker} className="hover:bg-terminal-card-hover/25">
                      <td className="py-2">
                        <button
                          onClick={() => onSelectStock(stock.ticker)}
                          className="font-black text-terminal-accent hover:underline text-left"
                        >
                          {stock.ticker}
                        </button>
                        <span className="block text-[8px] text-terminal-muted max-w-[120px] truncate">{stock.name}</span>
                      </td>
                      <td className="py-2 text-terminal-muted text-[8px] max-w-[100px] truncate">{stock.sector}</td>
                      <td className="py-2 text-right font-bold text-white">₹{stock.price}</td>
                      <td className="py-2 text-right font-bold text-terminal-success">{stock.roe}%</td>
                      <td className="py-2 text-right text-[#ccc]">{stock.roce}%</td>
                      <td className="py-2 text-right text-terminal-warning">{stock.debtToEquity}</td>
                      <td className={`py-2 text-right font-bold ${stock.rsi > 65 ? "text-terminal-success" : stock.rsi < 35 ? "text-terminal-danger" : "text-white"}`}>{stock.rsi}</td>
                      <td className="py-2 text-right">
                        <button
                          onClick={() => onSelectStock(stock.ticker)}
                          className="px-2 py-0.5 border border-terminal-border hover:border-terminal-accent rounded text-[8px] text-terminal-muted hover:text-white uppercase font-bold bg-terminal-bg transition-colors"
                        >
                          Deep Research
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
