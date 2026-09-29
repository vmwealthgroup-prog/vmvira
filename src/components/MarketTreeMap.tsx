/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import * as d3 from "d3";
import { CompanyMetadata } from "../types";
import { Info, Eye, Search } from "lucide-react";

interface MarketTreeMapProps {
  stocks: CompanyMetadata[];
  onSelectStock: (ticker: string) => void;
}

interface TreemapNode {
  name: string;
  ticker?: string;
  sector?: string;
  marketCap?: number;
  changePct?: number;
  price?: number;
  companyName?: string;
  children?: TreemapNode[];
}

export default function MarketTreeMap({ stocks, onSelectStock }: MarketTreeMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 380 });
  const [hoveredNode, setHoveredNode] = useState<d3.HierarchyRectangularNode<TreemapNode> | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [selectedSector, setSelectedSector] = useState<string>("All Sectors");

  // Handle responsiveness cleanly using a ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return;
    
    const observer = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width } = entries[0].contentRect;
      // Adjust aspect ratio dynamically
      const height = Math.max(320, Math.min(480, width * 0.45));
      setDimensions({ width, height });
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Filter stocks if a specific sector is isolated
  const filteredStocks = selectedSector === "All Sectors" 
    ? stocks 
    : stocks.filter(s => s.sector === selectedSector);

  // Generate hierarchy
  const sectorsMap = d3.group(filteredStocks, (s) => s.sector);
  const rootData: TreemapNode = {
    name: "NSE",
    children: Array.from(sectorsMap).map(([sector, sectorStocks]) => ({
      name: sector,
      children: sectorStocks.map((s) => ({
        name: s.ticker,
        ticker: s.ticker,
        sector: s.sector,
        marketCap: s.marketCap,
        changePct: s.changePct,
        price: s.price,
        companyName: s.name
      })),
    })),
  };

  const root = d3
    .hierarchy<TreemapNode>(rootData)
    .sum((d) => d.marketCap || 0)
    .sort((a, b) => (b.value || 0) - (a.value || 0));

  // Compute layout with standard padding for sector categories
  const paddingOuter = selectedSector === "All Sectors" ? 4 : 2;
  const paddingTop = selectedSector === "All Sectors" ? 18 : 6;
  
  d3
    .treemap<TreemapNode>()
    .size([dimensions.width, dimensions.height])
    .paddingOuter(paddingOuter)
    .paddingTop(paddingTop)
    .paddingInner(2)
    .round(true)(root);

  const leaves = root.leaves() as d3.HierarchyRectangularNode<TreemapNode>[];
  const sectorNodes = root.descendants().filter((d) => d.depth === 1) as d3.HierarchyRectangularNode<TreemapNode>[];

  // High-fidelity Institutional color mapping matching our Terminal theme
  // Scale range from intense red (<= -3%) to neutral dark grey (0%) to intense green (>= +3%)
  const getColor = (pct: number | undefined) => {
    if (pct === undefined) return "#27272a"; // zinc-800
    if (pct > 0) {
      const t = Math.min(pct / 3.0, 1.0); // Clamp to 3% max intensity
      // Interpolate from custom zinc-800 (#27272a) to vibrant emerald-500 (#10b981)
      return d3.interpolateRgb("#1e293b", "#10b981")(t);
    } else {
      const t = Math.min(Math.abs(pct) / 3.0, 1.0); // Clamp to 3% max intensity
      // Interpolate from custom zinc-800 (#27272a) to vibrant rose-500 (#f43f5e)
      return d3.interpolateRgb("#1e293b", "#f43f5e")(t);
    }
  };

  const handleMouseMove = (e: React.MouseEvent, leaf: d3.HierarchyRectangularNode<TreemapNode>) => {
    if (!containerRef.current) return;
    const bounds = containerRef.current.getBoundingClientRect();
    const x = e.clientX - bounds.left;
    const y = e.clientY - bounds.top;
    
    setHoveredNode(leaf);
    setTooltipPos({ x, y });
  };

  const handleMouseLeave = () => {
    setHoveredNode(null);
  };

  // Sector list for filter pill selections
  const allSectorsList = ["All Sectors", ...Array.from(new Set(stocks.map(s => s.sector)))];

  return (
    <div className="bg-terminal-card border border-terminal-border rounded p-3 space-y-3 font-mono text-xs relative">
      {/* Header Widget Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-terminal-border pb-2.5">
        <div>
          <span className="font-bold text-white uppercase tracking-wider text-[10px] flex items-center">
            <Search className="w-3.5 h-3.5 text-terminal-accent mr-1.5" /> NSE Sectoral Heatmap (D3 Tree)
          </span>
          <p className="text-[9px] text-terminal-muted uppercase tracking-wider mt-0.5">
            Tile Area = Market Cap (Cr) • Color = Price Change %
          </p>
        </div>

        {/* Sector Isolator Pill Selector */}
        <div className="flex flex-wrap gap-1 max-w-full overflow-x-auto pb-1 sm:pb-0">
          <select
            value={selectedSector}
            onChange={(e) => setSelectedSector(e.target.value)}
            className="bg-terminal-bg border border-terminal-border rounded h-6 px-2 text-[9px] text-white font-mono focus:border-terminal-accent outline-none"
          >
            {allSectorsList.map((sec) => (
              <option key={sec} value={sec}>
                {sec}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div ref={containerRef} className="relative bg-terminal-bg rounded border border-terminal-border/40 overflow-hidden select-none">
        <svg width={dimensions.width} height={dimensions.height} className="overflow-hidden">
          {/* 1. Sector Boundary & Label Overlays (only visible in 'All Sectors' view) */}
          {selectedSector === "All Sectors" && sectorNodes.map((node, i) => {
            const w = node.x1 - node.x0;
            const h = node.y1 - node.y0;
            if (w < 40 || h < 22) return null; // Too small to label

            return (
              <g key={`sec-${i}`}>
                {/* Sector outline card */}
                <rect
                  x={node.x0}
                  y={node.y0}
                  width={w}
                  height={h}
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.08)"
                  strokeWidth="1"
                />
                {/* Sector header panel */}
                <rect
                  x={node.x0 + 1}
                  y={node.y0 + 1}
                  width={w - 2}
                  height={15}
                  fill="rgba(30, 41, 59, 0.4)"
                />
                <text
                  x={node.x0 + 6}
                  y={node.y0 + 11}
                  fill="#94a3b8"
                  fontSize="8"
                  fontWeight="bold"
                  letterSpacing="0.05em"
                  className="uppercase pointer-events-none"
                >
                  {node.data.name.length > w / 6 ? `${node.data.name.slice(0, Math.floor(w / 6) - 2)}..` : node.data.name}
                </text>
              </g>
            );
          })}

          {/* 2. Interactive Leaf Tiles (Individual Stocks) */}
          {leaves.map((leaf, idx) => {
            const w = leaf.x1 - leaf.x0;
            const h = leaf.y1 - leaf.y0;
            const isHovered = hoveredNode?.data.ticker === leaf.data.ticker;
            const tileColor = getColor(leaf.data.changePct);
            const isUp = (leaf.data.changePct || 0) >= 0;

            // Display text layout heuristics
            const showFullText = w > 52 && h > 30;
            const showSymbolOnly = !showFullText && w > 28 && h > 15;

            return (
              <g
                key={`leaf-${idx}`}
                className="cursor-pointer"
                onClick={() => leaf.data.ticker && onSelectStock(leaf.data.ticker)}
                onMouseMove={(e) => handleMouseMove(e, leaf)}
                onMouseLeave={handleMouseLeave}
              >
                {/* Stock heat block */}
                <rect
                  x={leaf.x0}
                  y={leaf.y0}
                  width={w}
                  height={h}
                  fill={tileColor}
                  stroke={isHovered ? "#38bdf8" : "#0f172a"}
                  strokeWidth={isHovered ? 1.5 : 0.8}
                  className="transition-all duration-150"
                />

                {/* Stock Text Details */}
                {showFullText ? (
                  <g className="pointer-events-none">
                    {/* Ticker Symbol */}
                    <text
                      x={leaf.x0 + w / 2}
                      y={leaf.y0 + h / 2 - 2}
                      fill="#ffffff"
                      fontSize="9"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {leaf.data.ticker}
                    </text>
                    {/* Change % label */}
                    <text
                      x={leaf.x0 + w / 2}
                      y={leaf.y0 + h / 2 + 10}
                      fill={isUp ? "#4ade80" : "#f87171"}
                      fontSize="8.5"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {isUp ? "+" : ""}{leaf.data.changePct?.toFixed(2)}%
                    </text>
                  </g>
                ) : showSymbolOnly ? (
                  <text
                    x={leaf.x0 + w / 2}
                    y={leaf.y0 + h / 2 + 3}
                    fill="#ffffff"
                    fontSize="8.5"
                    fontWeight="bold"
                    textAnchor="middle"
                    className="pointer-events-none"
                  >
                    {leaf.data.ticker}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>

        {/* 3. Floating Custom HUD Tooltip */}
        {hoveredNode && hoveredNode.data.ticker && (
          <div
            className="absolute bg-slate-950/95 border border-slate-800 text-white rounded p-2.5 shadow-2xl space-y-1.5 pointer-events-none z-30 transition-transform duration-75"
            style={{
              left: `${Math.min(tooltipPos.x + 12, dimensions.width - 180)}px`,
              top: `${Math.min(tooltipPos.y + 12, dimensions.height - 110)}px`,
              width: "170px"
            }}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-1">
              <span className="font-bold text-sky-400">{hoveredNode.data.ticker}</span>
              <span className="text-[7.5px] uppercase bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 font-bold">
                {hoveredNode.data.sector}
              </span>
            </div>
            
            <p className="text-[9px] text-slate-300 font-semibold truncate leading-tight uppercase">
              {hoveredNode.data.companyName}
            </p>

            <div className="grid grid-cols-2 gap-y-1 text-[8px] uppercase pt-0.5 font-bold">
              <span className="text-slate-500">Mkt Cap:</span>
              <span className="text-right text-slate-100">
                ₹{hoveredNode.data.marketCap?.toLocaleString("en-IN")} Cr
              </span>

              <span className="text-slate-500">LTP Price:</span>
              <span className="text-right text-slate-100">
                ₹{hoveredNode.data.price?.toFixed(2)}
              </span>

              <span className="text-slate-500">Day Change:</span>
              <span className={`text-right font-black ${hoveredNode.data.changePct && hoveredNode.data.changePct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {(hoveredNode.data.changePct || 0) >= 0 ? "+" : ""}
                {hoveredNode.data.changePct?.toFixed(2)}%
              </span>
            </div>

            <div className="text-[7.5px] text-slate-500 font-bold flex items-center justify-center pt-1 border-t border-slate-800/60 uppercase">
              <Eye className="w-2.5 h-2.5 mr-1 text-sky-400" /> Click to research coordinate
            </div>
          </div>
        )}
      </div>

      {/* Legend Block */}
      <div className="flex flex-wrap items-center justify-between text-[8px] text-terminal-muted uppercase font-bold pt-1.5 border-t border-terminal-border/30">
        <div className="flex items-center space-x-1">
          <Info className="w-3 h-3 text-terminal-accent shrink-0" />
          <span>Interactive Map: Click any coordinate tile to load full analytic workspace reports.</span>
        </div>
        <div className="flex items-center space-x-1.5 mt-1 sm:mt-0">
          <span>Bearish (&lt; -3%)</span>
          <div className="flex h-2.5 w-16 rounded overflow-hidden border border-slate-800">
            <div className="flex-1 bg-rose-600" />
            <div className="flex-1 bg-slate-800" />
            <div className="flex-1 bg-emerald-600" />
          </div>
          <span>Bullish (&gt; +3%)</span>
        </div>
      </div>
    </div>
  );
}
