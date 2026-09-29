/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Enum declarations as required by React guidelines
export enum RecommendationType {
  STRONG_BUY = "Strong Buy",
  BUY = "Buy",
  HOLD = "Hold",
  REDUCE = "Reduce",
  SELL = "Sell",
}

export enum MarketCapCategory {
  LARGE_CAP = "Large Cap",
  MID_CAP = "Mid Cap",
  SMALL_CAP = "Small Cap",
}

export enum SidebarView {
  DASHBOARD = "dashboard",
  STOCK_RESEARCH = "stock_research",
  SCREENER = "screener",
  OPTIONS = "options",
  INSTITUTIONAL = "institutional",
  AI_CHAT = "ai_chat",
  NEWS = "news",
  SETTINGS = "settings",
  PAPER_TRADING = "paper_trading",
  ORDERS = "orders",
  VM_ALGO = "vm_algo",
  VM_ALGO_OPTION = "vm_algo_option",
  VM_ALGO_CRYPTO = "vm_algo_crypto",
  VM_VIRA_BTC = "vm_vira_btc",
  HEATMAP = "heatmap",
}

// Unified Orders & Kill Switch Types
export type AssetCategory = "EQUITY" | "OPTION" | "CRYPTO";
export type UnifiedOrderStatus = "OPEN" | "COMPLETED" | "CANCELLED" | "REJECTED";
export type OrderExecutionType = "MARKET" | "LIMIT" | "STOP_LOSS" | "SL_MARKET";

export interface UnifiedOrder {
  id: string;
  ticker: string;
  symbol: string;
  name: string;
  assetCategory: AssetCategory;
  side: "BUY" | "SELL";
  orderType: OrderExecutionType;
  quantity: number;
  price: number;
  limitPrice?: number;
  triggerPrice?: number;
  value: number;
  status: UnifiedOrderStatus;
  timestamp: string;
  source: "MANUAL" | "VM_ALGO_STOCK" | "VM_ALGO_OPTION" | "VM_ALGO_CRYPTO" | "API";
  rejectReason?: string;
  filledQuantity?: number;
  filledPrice?: number;
  strike?: number;
  optionType?: "CE" | "PE";
}

export interface KillSwitchLog {
  id: string;
  timestamp: string;
  action: "ENGAGED" | "DISARMED" | "AUTO_CIRCUIT_TRIP" | "POSITIONS_FLATTENED" | "ORDERS_CANCELLED" | "ORDER_BLOCKED";
  details: string;
}

export interface KillSwitchConfig {
  isEngaged: boolean;
  engagedAt?: string;
  reason?: string;
  haltAllBots: boolean;
  blockManualOrders: boolean;
  autoCancelPendingOrders: boolean;
  autoSquareOffPositions: boolean;
  maxDailyLossLimit: number; // in INR
  maxDailyLossActive: boolean;
  maxDrawdownPct: number; // e.g. 5%
  maxDrawdownActive: boolean;
  maxOrderValue: number; // e.g. 5,00,000 INR
  maxOrderValueActive: boolean;
  killSwitchLogs: KillSwitchLog[];
}

// Company Profiles and Identifiers
export interface CompanyMetadata {
  ticker: string;
  name: string;
  sector: string;
  industry: string;
  isin: string;
  marketCap: number; // in Crores (INR)
  marketCapType: MarketCapCategory;
  price: number;
  change: number;
  changePct: number;
  volume: number;
  deliveryPct: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
}

// Quarterly Results
export interface QuarterlyFinancial {
  quarter: string; // e.g. "Q1 FY26", "Q4 FY25"
  revenue: number; // in Crores
  netProfit: number; // in Crores
  eps: number;
  operatingMargin: number; // %
}

// Annual Financials
export interface AnnualFinancial {
  year: string; // e.g. "FY25", "FY24"
  revenue: number;
  netProfit: number;
  eps: number;
  operatingMargin: number;
  debtToEquity: number;
  roe: number; // %
  roce: number; // %
  dividendYield: number; // %
}

// Balance Sheet
export interface BalanceSheet {
  year: string;
  shareCapital: number;
  reserves: number;
  borrowings: number;
  otherLiabilities: number;
  fixedAssets: number;
  otherAssets: number;
  totalLiabilities: number;
  totalAssets: number;
}

// Peer Comparison
export interface PeerComparison {
  ticker: string;
  name: string;
  price: number;
  peRatio: number;
  pbRatio: number;
  evToEbitda: number;
  roe: number;
  debtToEquity: number;
}

// SWOT Analysis
export interface SWOTAnalysis {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

// Technical Indicators & Pivot Points
export interface TechnicalIndicators {
  timeframe: "Daily" | "Weekly" | "Monthly";
  rsi: number;
  macd: {
    line: number;
    signal: number;
    histogram: number;
    text: string;
  };
  ema20: number;
  ema50: number;
  ema200: number;
  vwap?: number;
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
  };
  trendSignal: "Strong Buy" | "Buy" | "Neutral" | "Sell" | "Strong Sell";
  pivots: {
    resistance3: number;
    resistance2: number;
    resistance1: number;
    pivotPoint: number;
    support1: number;
    support2: number;
    support3: number;
  };
}

// Options Analytics
export interface OptionChainItem {
  strikePrice: number;
  callOI: number;
  callOIChange: number;
  callLtp: number;
  callVolume: number;
  putOI: number;
  putOIChange: number;
  putLtp: number;
  putVolume: number;
}

export interface OptionsSummary {
  ticker: string;
  pcr: number;
  maxPain: number;
  totalCallOI: number;
  totalPutOI: number;
  impliedVolatility: number;
  ivRank: number;
  expectedMove: number;
  sentiment: "Bullish" | "Bearish" | "Neutral" | "Short Covering" | "Long Build-up";
  chain: OptionChainItem[];
}

// Institutional Flow (FII / DII)
export interface InstitutionalFlow {
  date: string;
  fiiNet: number; // in Crores
  diiNet: number; // in Crores
  fiiGrossBuy: number;
  fiiGrossSell: number;
  diiGrossBuy: number;
  diiGrossSell: number;
}

export interface BlockDealItem {
  date: string;
  ticker: string;
  clientName: string;
  dealType: "BUY" | "SELL";
  quantity: number;
  price: number;
  valueCr: number;
}

// Core AI Score Definitions
export interface AIScores {
  fundamentalScore: number; // 0-100
  technicalScore: number;
  momentumScore: number;
  qualityScore: number;
  growthScore: number;
  valuationScore: number;
  riskScore: number;
  institutionalScore: number;
  sentimentScore: number;
  overallScore: number;
  grade: "AAA+" | "AAA" | "AA" | "A" | "BBB" | "BB" | "B";
  confidenceScore: number; // 0-100
}

// AI Investment Thesis
export interface AIInvestmentThesis {
  summary: string;
  bullCase: string[];
  bearCase: string[];
  catalysts: string[];
  fairValue: number;
  targetPrice: number;
  expectedCagr: number; // %
  recommendation: RecommendationType;
}

// Unified Institutional Report Output
export interface InstitutionalReport {
  ticker: string;
  timestamp: string;
  businessSummary: string;
  scores: AIScores;
  thesis: AIInvestmentThesis;
  swot: SWOTAnalysis;
  valuationDCF: {
    intrinsicValue: number;
    upsidePct: number;
    discountRateUsed: number;
    growthRateUsed: number;
  };
}

// Screener Interface Definitions
export interface ScreenerFilter {
  id: string;
  label: string;
  field: string;
  type: "number" | "string";
  operator: "gt" | "lt" | "eq" | "contains";
  value: any;
}

// Chat Definitions
export interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  groundingSources?: Array<{ title: string; uri: string }>;
}

// Paper Trading definitions
export interface PaperHolding {
  ticker: string;
  companyName: string;
  quantity: number;
  avgBuyPrice: number;
  currentPrice: number;
  currentValue: number;
  totalCost: number;
  pnl: number;
  pnlPct: number;
}

export interface PaperOrder {
  id: string;
  ticker: string;
  companyName: string;
  type: "BUY" | "SELL";
  quantity: number;
  price: number;
  timestamp: string;
  value: number;
  orderType: "MARKET" | "LIMIT";
  limitPrice?: number;
  status: "COMPLETED" | "FAILED" | "PENDING";
}

export interface PaperAccount {
  balance: number;
  initialBalance: number;
  totalEquity: number;
  holdingsValue: number;
  totalPnl: number;
  totalPnlPct: number;
  holdings: PaperHolding[];
  orders: PaperOrder[];
}
