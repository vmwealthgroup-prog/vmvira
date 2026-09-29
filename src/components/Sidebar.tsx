/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import {
  LayoutDashboard,
  BarChart4,
  Activity,
  Layers,
  SearchCode,
  Users,
  MessageSquareText,
  Settings,
  Menu,
  ChevronLeft,
  Coins,
  LayoutGrid,
  Flame,
  Bitcoin,
  Zap,
  ClipboardList
} from "lucide-react";
import { SidebarView } from "../types";

interface SidebarProps {
  currentView: SidebarView;
  onViewChange: (view: SidebarView) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export default function Sidebar({ currentView, onViewChange, isCollapsed, setIsCollapsed }: SidebarProps) {
  const menuItems = [
    { view: SidebarView.DASHBOARD, label: "Market Dashboard", icon: LayoutDashboard },
    { view: SidebarView.STOCK_RESEARCH, label: "Stock Research", icon: BarChart4 },
    { view: SidebarView.HEATMAP, label: "Sectoral Heatmap", icon: LayoutGrid },
    { view: SidebarView.OPTIONS, label: "Options Analytics", icon: Layers },
    { view: SidebarView.SCREENER, label: "Institutional Scanner", icon: SearchCode },
    { view: SidebarView.INSTITUTIONAL, label: "FII / DII Flows", icon: Users },
    { view: SidebarView.AI_CHAT, label: "BloombergGPT AI", icon: MessageSquareText },
    { view: SidebarView.PAPER_TRADING, label: "Paper Trading Desk", icon: Coins },
    { view: SidebarView.ORDERS, label: "Orders & Kill Switch", icon: ClipboardList },
    { view: SidebarView.VM_ALGO, label: "VM Algo Suite", icon: Activity },
    { view: SidebarView.VM_ALGO_OPTION, label: "VM Algo Option", icon: Flame },
    { view: SidebarView.VM_ALGO_CRYPTO, label: "VM Algo Crypto", icon: Bitcoin },
    { view: SidebarView.VM_VIRA_BTC, label: "VM VIRA BTC Engine", icon: Zap },
  ];

  return (
    <aside
      className={`bg-terminal-bg border-r border-terminal-border flex flex-col justify-between transition-all duration-300 select-none font-mono ${isCollapsed ? "w-12" : "w-52"}`}
    >
      {/* Menu Header / Collapse button */}
      <div>
        <div className="h-10 border-b border-terminal-border flex items-center justify-between px-3">
          {!isCollapsed && <span className="text-[10px] font-bold text-terminal-muted uppercase tracking-widest">NAVIGATION</span>}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 hover:bg-terminal-card rounded text-terminal-muted hover:text-white transition-colors ml-auto"
          >
            {isCollapsed ? <Menu className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="p-1.5 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.view;
            return (
              <button
                key={item.view}
                onClick={() => onViewChange(item.view)}
                className={`w-full flex items-center rounded h-9 px-2.5 transition-all text-left ${isActive ? "bg-terminal-accent/15 text-terminal-accent border-l-2 border-terminal-accent font-bold" : "text-terminal-muted hover:text-white hover:bg-terminal-card"}`}
                title={item.label}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-terminal-accent" : "text-terminal-muted"}`} />
                {!isCollapsed && (
                  <span className="ml-3 text-[10px] uppercase font-bold tracking-wider truncate">
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* System Footer Details */}
      <div className="border-t border-terminal-border p-1.5 space-y-1">
        <button
          onClick={() => onViewChange(SidebarView.SETTINGS)}
          className={`w-full flex items-center rounded h-9 px-2.5 transition-all text-left ${currentView === SidebarView.SETTINGS ? "bg-terminal-accent/15 text-terminal-accent border-l-2 border-terminal-accent font-bold" : "text-terminal-muted hover:text-white hover:bg-terminal-card"}`}
          title="Terminal Settings"
        >
          <Settings className={`w-4 h-4 shrink-0 ${currentView === SidebarView.SETTINGS ? "text-terminal-accent" : "text-terminal-muted"}`} />
          {!isCollapsed && (
            <span className="ml-3 text-[10px] uppercase font-bold tracking-wider">
              Terminal Settings
            </span>
          )}
        </button>

        {!isCollapsed && (
          <div className="p-2 text-[8px] text-terminal-muted text-center font-mono leading-tight bg-terminal-card/50 rounded border border-terminal-border/40 mt-2">
            VM ALGO v2.4-PRO
            <br />
            SECURE ACCESS ONLY
          </div>
        )}
      </div>
    </aside>
  );
}
