/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { SidebarView, CompanyMetadata } from "./types";
import { fetchMarkets, fetchStocks, MarketSummaryResponse } from "./services/apiService";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import StockResearch from "./components/StockResearch";
import OptionsAnalytics from "./components/OptionsAnalytics";
import Screener from "./components/Screener";
import InstitutionalFlow from "./components/InstitutionalFlow";
import AIChat from "./components/AIChat";
import SettingsPanel from "./components/Settings";
import PaperTrading from "./components/PaperTrading";
import VMAlgoSuite from "./components/VMAlgoSuite";
import VMAlgoOption from "./components/VMAlgoOption";
import VMAlgoCrypto from "./components/VMAlgoCrypto";
import VMViraBtc from "./components/VMViraBtc";
import MarketTreeMap from "./components/MarketTreeMap";
import OrdersAndKillSwitch from "./components/OrdersAndKillSwitch";
import { RefreshCw, AlertTriangle } from "lucide-react";

export default function App() {
  const [currentView, setCurrentView] = useState<SidebarView>(SidebarView.DASHBOARD);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [selectedTicker, setSelectedTicker] = useState("RELIANCE");

  // Theme state
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    try {
      const saved = localStorage.getItem("theme");
      return (saved === "light" || saved === "dark") ? saved : "light";
    } catch {
      return "light";
    }
  });

  // Apply theme to DOM
  useEffect(() => {
    try {
      document.documentElement.setAttribute("data-theme", theme);
      if (theme === "dark") {
        document.documentElement.classList.add("dark");
        document.documentElement.classList.remove("light");
      } else {
        document.documentElement.classList.add("light");
        document.documentElement.classList.remove("dark");
      }
      localStorage.setItem("theme", theme);
    } catch (e) {
      console.warn("Could not save theme", e);
    }
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme(prev => (prev === "light" ? "dark" : "light"));
  };

  // Global Data states
  const [marketData, setMarketData] = useState<MarketSummaryResponse | null>(null);
  const [stocks, setStocks] = useState<CompanyMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadGlobalData = async () => {
    try {
      const [mkt, stk] = await Promise.all([fetchMarkets(), fetchStocks()]);
      setMarketData(mkt);
      setStocks(stk);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to establish terminal communication with Express API gateway");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGlobalData();
    // Auto refresh every 1 second (1000ms) for high-frequency live ticking updates
    const interval = setInterval(async () => {
      try {
        const [mkt, stk] = await Promise.all([fetchMarkets(), fetchStocks()]);
        if (mkt) setMarketData(mkt);
        if (stk && stk.length > 0) setStocks(stk);
      } catch {
        // Gracefully handled by safe client-side fallback in apiService
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadGlobalData();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSearchStock = (ticker: string) => {
    setSelectedTicker(ticker);
    setCurrentView(SidebarView.STOCK_RESEARCH);
  };

  if (loading) {
    return (
      <div className="bg-terminal-bg min-h-screen text-white font-mono text-xs flex flex-col items-center justify-center space-y-4">
        <div className="flex items-center space-x-2">
          <RefreshCw className="w-8 h-8 text-terminal-accent animate-spin" />
        </div>
        <div className="text-center space-y-1">
          <span className="text-[11px] font-bold tracking-widest text-white uppercase animate-pulse">VM ALGO AI CORE SYSTEM DETECTED</span>
          <p className="text-terminal-muted text-[9px] uppercase tracking-wider">BOOTSTRAPPING NSE SECTOR DATABASES & VERIFYING FIREWALLS...</p>
        </div>
      </div>
    );
  }

  if (error || !marketData) {
    return (
      <div className="bg-terminal-bg min-h-screen text-white font-mono text-xs flex flex-col items-center justify-center space-y-4 p-8 text-center">
        <AlertTriangle className="w-12 h-12 text-terminal-danger animate-bounce" />
        <div className="space-y-1.5">
          <h1 className="text-base font-black text-terminal-danger uppercase">TERMINAL LINK DISCONNECTED</h1>
          <p className="text-terminal-muted max-w-lg mx-auto text-[10px] leading-relaxed">
            The frontend terminal lost contact with the backend Express API service layer on port 3000. Ensure the dev server scripts are actively executed.
          </p>
          <div className="p-3 bg-terminal-card border border-terminal-border rounded text-[9px] text-[#eee] text-left max-w-md mx-auto">
            {error}
          </div>
        </div>
        <button
          onClick={loadGlobalData}
          className="px-4 py-2 bg-terminal-accent text-white font-bold rounded uppercase tracking-wider hover:bg-terminal-accent/90 transition-all shadow-md"
        >
          Re-establish Connection
        </button>
      </div>
    );
  }

  // View router
  const renderCurrentView = () => {
    switch (currentView) {
      case SidebarView.DASHBOARD:
        return (
          <Dashboard
            marketData={marketData}
            stocks={stocks}
            onSelectStock={handleSearchStock}
          />
        );
      case SidebarView.STOCK_RESEARCH:
        return (
          <StockResearch
            selectedTicker={selectedTicker}
            onViewChange={setCurrentView}
          />
        );
      case SidebarView.OPTIONS:
        return (
          <OptionsAnalytics
            stocks={stocks}
            selectedTicker={selectedTicker}
            onSelectStock={setSelectedTicker}
          />
        );
      case SidebarView.SCREENER:
        return <Screener onSelectStock={handleSearchStock} />;
      case SidebarView.INSTITUTIONAL:
        return <InstitutionalFlow onSelectStock={handleSearchStock} />;
      case SidebarView.AI_CHAT:
        return <AIChat onSelectStock={handleSearchStock} />;
      case SidebarView.PAPER_TRADING:
        return <PaperTrading stocks={stocks} onSelectStock={handleSearchStock} />;
      case SidebarView.ORDERS:
        return <OrdersAndKillSwitch stocks={stocks} onSelectStock={handleSearchStock} />;
      case SidebarView.VM_ALGO:
        return <VMAlgoSuite stocks={stocks} onSelectStock={handleSearchStock} />;
      case SidebarView.VM_ALGO_OPTION:
        return <VMAlgoOption stocks={stocks} onSelectStock={handleSearchStock} />;
      case SidebarView.VM_ALGO_CRYPTO:
        return <VMAlgoCrypto />;
      case SidebarView.VM_VIRA_BTC:
        return <VMViraBtc />;
      case SidebarView.HEATMAP:
        return (
          <div className="p-4 space-y-4 font-mono">
            {/* Page Header */}
            <div className="border border-terminal-border bg-terminal-card p-3 rounded flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
              <div>
                <span className="font-bold text-terminal-accent uppercase tracking-wider text-xs">
                  NSE Market Breadth TreeMap
                </span>
                <p className="text-[9px] text-terminal-muted uppercase tracking-wider mt-0.5">
                  High-fidelity institutional sectoral density & relative strength visualization
                </p>
              </div>
            </div>
            <MarketTreeMap stocks={stocks} onSelectStock={handleSearchStock} />
          </div>
        );
      case SidebarView.SETTINGS:
        return <SettingsPanel />;
      default:
        return (
          <Dashboard
            marketData={marketData}
            stocks={stocks}
            onSelectStock={handleSearchStock}
          />
        );
    }
  };

  return (
    <div className="bg-terminal-bg text-terminal-text min-h-screen flex flex-col selection:bg-terminal-accent selection:text-white">
      {/* Dynamic index ticker top ribbon and search */}
      <Header
        indices={marketData.indices}
        source={marketData.source}
        stocks={stocks}
        onSearchStock={handleSearchStock}
        onRefresh={handleManualRefresh}
        isRefreshing={isRefreshing}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onOpenOrders={() => setCurrentView(SidebarView.ORDERS)}
      />

      {/* Main Terminal Grid layout */}
      <div className="flex flex-1 min-h-0">
        <Sidebar
          currentView={currentView}
          onViewChange={setCurrentView}
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
        />

        {/* Console view layout frame */}
        <main className="flex-1 overflow-y-auto bg-terminal-bg">
          {renderCurrentView()}
        </main>
      </div>
    </div>
  );
}
