/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CompanyMetadata,
  MarketCapCategory,
  QuarterlyFinancial,
  AnnualFinancial,
  BalanceSheet,
  PeerComparison,
  TechnicalIndicators,
  OptionsSummary,
  InstitutionalFlow,
  BlockDealItem,
  AIScores,
  AIInvestmentThesis,
  RecommendationType,
  OptionChainItem
} from "../types";

// Top 20 NSE/BSE Equities in India
export const COMPANIES_LIST: CompanyMetadata[] = [
  {
    ticker: "RELIANCE",
    name: "Reliance Industries Limited",
    sector: "Energy & Conglomerate",
    industry: "Oil, Gas & Retail",
    isin: "INE002A01018",
    marketCap: 1754210, // in Crores INR
    marketCapType: MarketCapCategory.LARGE_CAP,
    price: 1226.40,
    change: 6.80,
    changePct: 0.56,
    volume: 5824900,
    deliveryPct: 54.2,
    fiftyTwoWeekHigh: 1608.80,
    fiftyTwoWeekLow: 1115.00,
  },
  {
    ticker: "TCS",
    name: "Tata Consultancy Services Ltd",
    sector: "Information Technology",
    industry: "IT Services & Consulting",
    isin: "INE467B01029",
    marketCap: 1421050,
    marketCapType: MarketCapCategory.LARGE_CAP,
    price: 2105.00,
    change: -15.20,
    changePct: -0.72,
    volume: 1845100,
    deliveryPct: 62.8,
    fiftyTwoWeekHigh: 2350.00,
    fiftyTwoWeekLow: 1840.00,
  },
  {
    ticker: "HDFCBANK",
    name: "HDFC Bank Limited",
    sector: "Financial Services",
    industry: "Banking - Private",
    isin: "INE040A01034",
    marketCap: 1254300,
    marketCapType: MarketCapCategory.LARGE_CAP,
    price: 731.00,
    change: 4.20,
    changePct: 0.58,
    volume: 9812400,
    deliveryPct: 49.5,
    fiftyTwoWeekHigh: 840.00,
    fiftyTwoWeekLow: 640.00,
  },
  {
    ticker: "INFY",
    name: "Infosys Limited",
    sector: "Information Technology",
    industry: "IT Services & Consulting",
    isin: "INE009A01021",
    marketCap: 685410,
    marketCapType: MarketCapCategory.LARGE_CAP,
    price: 1051.40,
    change: -5.40,
    changePct: -0.51,
    volume: 3410500,
    deliveryPct: 59.1,
    fiftyTwoWeekHigh: 1240.00,
    fiftyTwoWeekLow: 950.00,
  },
  {
    ticker: "ICICIBANK",
    name: "ICICI Bank Limited",
    sector: "Financial Services",
    industry: "Banking - Private",
    isin: "INE090A01021",
    marketCap: 812400,
    marketCapType: MarketCapCategory.LARGE_CAP,
    price: 1338.90,
    change: 14.15,
    changePct: 1.07,
    volume: 6109200,
    deliveryPct: 51.3,
    fiftyTwoWeekHigh: 1410.00,
    fiftyTwoWeekLow: 1030.00,
  },
  {
    ticker: "SBIN",
    name: "State Bank of India",
    sector: "Financial Services",
    industry: "Banking - Public",
    isin: "INE062A01020",
    marketCap: 724150,
    marketCapType: MarketCapCategory.LARGE_CAP,
    price: 996.20,
    change: 7.40,
    changePct: 0.75,
    volume: 12450100,
    deliveryPct: 41.2,
    fiftyTwoWeekHigh: 1040.00,
    fiftyTwoWeekLow: 760.20,
  },
  {
    ticker: "BHARTIARTL",
    name: "Bharti Airtel Limited",
    sector: "Telecommunications",
    industry: "Telecom Services",
    isin: "INE397D01024",
    marketCap: 672100,
    marketCapType: MarketCapCategory.LARGE_CAP,
    price: 1893.30,
    change: 18.50,
    changePct: 0.99,
    volume: 4102900,
    deliveryPct: 55.4,
    fiftyTwoWeekHigh: 1980.00,
    fiftyTwoWeekLow: 1390.00,
  },
  {
    ticker: "ITC",
    name: "ITC Limited",
    sector: "Consumer Defensive",
    industry: "Diversified FMCG",
    isin: "INE154A01025",
    marketCap: 524300,
    marketCapType: MarketCapCategory.LARGE_CAP,
    price: 262.30,
    change: -1.30,
    changePct: -0.49,
    volume: 7215400,
    deliveryPct: 68.3,
    fiftyTwoWeekHigh: 310.00,
    fiftyTwoWeekLow: 240.00,
  },
  {
    ticker: "LT",
    name: "Larsen & Toubro Limited",
    sector: "Industrials",
    industry: "Engineering & Construction",
    isin: "INE018A01030",
    marketCap: 489500,
    marketCapType: MarketCapCategory.LARGE_CAP,
    price: 3885.00,
    change: 32.80,
    changePct: 0.85,
    volume: 1240100,
    deliveryPct: 48.9,
    fiftyTwoWeekHigh: 4100.00,
    fiftyTwoWeekLow: 3250.00,
  },
  {
    ticker: "HINDUNILVR",
    name: "Hindustan Unilever Limited",
    sector: "Consumer Defensive",
    industry: "FMCG - Personal Care",
    isin: "INE030A01027",
    marketCap: 582100,
    marketCapType: MarketCapCategory.LARGE_CAP,
    price: 1932.00,
    change: -8.30,
    changePct: -0.43,
    volume: 1420500,
    deliveryPct: 71.2,
    fiftyTwoWeekHigh: 2250.00,
    fiftyTwoWeekLow: 1820.00,
  },
  {
    ticker: "KOTAKBANK",
    name: "Kotak Mahindra Bank Limited",
    sector: "Financial Services",
    industry: "Banking - Private",
    isin: "INE237A01028",
    marketCap: 341200,
    marketCapType: MarketCapCategory.LARGE_CAP,
    price: 412.50,
    change: 2.10,
    changePct: 0.51,
    volume: 1982100,
    deliveryPct: 53.6,
    fiftyTwoWeekHigh: 480.00,
    fiftyTwoWeekLow: 370.00,
  },
  {
    ticker: "AXISBANK",
    name: "Axis Bank Limited",
    sector: "Financial Services",
    industry: "Banking - Private",
    isin: "INE238A01034",
    marketCap: 324150,
    marketCapType: MarketCapCategory.LARGE_CAP,
    price: 1257.00,
    change: 9.20,
    changePct: 0.74,
    volume: 4501200,
    deliveryPct: 47.9,
    fiftyTwoWeekHigh: 1350.00,
    fiftyTwoWeekLow: 1010.00,
  },
  {
    ticker: "BAJFINANCE",
    name: "Bajaj Finance Limited",
    sector: "Financial Services",
    industry: "Non-Banking Financial Co (NBFC)",
    isin: "INE296A01024",
    marketCap: 412400,
    marketCapType: MarketCapCategory.LARGE_CAP,
    price: 1040.30,
    change: -12.50,
    changePct: -1.19,
    volume: 810500,
    deliveryPct: 45.2,
    fiftyTwoWeekHigh: 1280.00,
    fiftyTwoWeekLow: 920.00,
  },
  {
    ticker: "MARUTI",
    name: "Maruti Suzuki India Limited",
    sector: "Consumer Cyclical",
    industry: "Automobiles",
    isin: "INE585B01010",
    marketCap: 372150,
    marketCapType: MarketCapCategory.LARGE_CAP,
    price: 12103.00,
    change: 120.50,
    changePct: 1.01,
    volume: 382100,
    deliveryPct: 51.6,
    fiftyTwoWeekHigh: 13400.00,
    fiftyTwoWeekLow: 10200.00,
  },
  {
    ticker: "SUNPHARMA",
    name: "Sun Pharmaceutical Industries Ltd",
    sector: "Healthcare",
    industry: "Pharmaceuticals",
    isin: "INE044A01036",
    marketCap: 362400,
    marketCapType: MarketCapCategory.LARGE_CAP,
    price: 1837.30,
    change: 11.40,
    changePct: 0.62,
    volume: 1104200,
    deliveryPct: 57.3,
    fiftyTwoWeekHigh: 1950.00,
    fiftyTwoWeekLow: 1480.00,
  },
  {
    ticker: "TATASTEEL",
    name: "Tata Steel Limited",
    sector: "Basic Materials",
    industry: "Iron & Steel",
    isin: "INE081A01020",
    marketCap: 181250,
    marketCapType: MarketCapCategory.MID_CAP,
    price: 185.54,
    change: -1.10,
    changePct: -0.59,
    volume: 24105000,
    deliveryPct: 39.8,
    fiftyTwoWeekHigh: 210.00,
    fiftyTwoWeekLow: 138.00,
  },
  {
    ticker: "M&M",
    name: "Mahindra & Mahindra Limited",
    sector: "Consumer Cyclical",
    industry: "Automobiles",
    isin: "INE101A01026",
    marketCap: 298100,
    marketCapType: MarketCapCategory.LARGE_CAP,
    price: 2380.00,
    change: 28.10,
    changePct: 1.19,
    volume: 1650100,
    deliveryPct: 48.7,
    fiftyTwoWeekHigh: 2610.00,
    fiftyTwoWeekLow: 1450.00,
  },
  {
    ticker: "HCLTECH",
    name: "HCL Technologies Limited",
    sector: "Information Technology",
    industry: "IT Services & Consulting",
    isin: "INE860A01027",
    marketCap: 382450,
    marketCapType: MarketCapCategory.LARGE_CAP,
    price: 1249.30,
    change: -8.40,
    changePct: -0.67,
    volume: 1985400,
    deliveryPct: 58.2,
    fiftyTwoWeekHigh: 1480.00,
    fiftyTwoWeekLow: 1080.00,
  },
  {
    ticker: "NTPC",
    name: "NTPC Limited",
    sector: "Utilities",
    industry: "Power Generation",
    isin: "INE733E01010",
    marketCap: 342100,
    marketCapType: MarketCapCategory.LARGE_CAP,
    price: 323.65,
    change: 2.80,
    changePct: 0.87,
    volume: 8905200,
    deliveryPct: 44.5,
    fiftyTwoWeekHigh: 375.00,
    fiftyTwoWeekLow: 260.00,
  },
  {
    ticker: "POWERGRID",
    name: "Power Grid Corporation of India",
    sector: "Utilities",
    industry: "Power Transmission",
    isin: "INE752E01010",
    marketCap: 262300,
    marketCapType: MarketCapCategory.LARGE_CAP,
    price: 270.30,
    change: -0.65,
    changePct: -0.24,
    volume: 5120500,
    deliveryPct: 61.4,
    fiftyTwoWeekHigh: 315.00,
    fiftyTwoWeekLow: 220.00,
  }
];

// Quarterly Financial Statements Seeding
export const QUARTERLY_FINANCIALS_MAP: Record<string, QuarterlyFinancial[]> = {
  RELIANCE: [
    { quarter: "Q1 FY26", revenue: 235120, netProfit: 19120, eps: 28.25, operatingMargin: 17.4 },
    { quarter: "Q4 FY25", revenue: 228100, netProfit: 18950, eps: 28.01, operatingMargin: 16.9 },
    { quarter: "Q3 FY25", revenue: 225300, netProfit: 17200, eps: 25.42, operatingMargin: 16.2 },
    { quarter: "Q2 FY25", revenue: 218400, netProfit: 16560, eps: 24.48, operatingMargin: 15.8 },
  ],
  TCS: [
    { quarter: "Q1 FY26", revenue: 62150, netProfit: 12100, eps: 33.15, operatingMargin: 24.8 },
    { quarter: "Q4 FY25", revenue: 61240, netProfit: 12430, eps: 34.05, operatingMargin: 25.2 },
    { quarter: "Q3 FY25", revenue: 60500, netProfit: 11050, eps: 30.27, operatingMargin: 24.1 },
    { quarter: "Q2 FY25", revenue: 59700, netProfit: 11340, eps: 31.06, operatingMargin: 24.5 },
  ],
  HDFCBANK: [
    { quarter: "Q1 FY26", revenue: 84100, netProfit: 16100, eps: 21.20, operatingMargin: 42.1 },
    { quarter: "Q4 FY25", revenue: 82500, netProfit: 16510, eps: 21.75, operatingMargin: 41.8 },
    { quarter: "Q3 FY25", revenue: 81700, netProfit: 15880, eps: 20.90, operatingMargin: 41.5 },
    { quarter: "Q2 FY25", revenue: 78900, netProfit: 14700, eps: 19.35, operatingMargin: 40.9 },
  ],
  INFY: [
    { quarter: "Q1 FY26", revenue: 41250, netProfit: 6380, eps: 15.40, operatingMargin: 21.1 },
    { quarter: "Q4 FY25", revenue: 40100, netProfit: 7970, eps: 19.24, operatingMargin: 22.0 },
    { quarter: "Q3 FY25", revenue: 39600, netProfit: 6110, eps: 14.75, operatingMargin: 20.5 },
    { quarter: "Q2 FY25", revenue: 38900, netProfit: 6220, eps: 15.02, operatingMargin: 20.8 },
  ],
  ICICIBANK: [
    { quarter: "Q1 FY26", revenue: 45200, netProfit: 10400, eps: 14.80, operatingMargin: 38.5 },
    { quarter: "Q4 FY25", revenue: 44100, netProfit: 10270, eps: 14.62, operatingMargin: 38.1 },
    { quarter: "Q3 FY25", revenue: 43250, netProfit: 9850, eps: 14.02, operatingMargin: 37.8 },
    { quarter: "Q2 FY25", revenue: 41900, netProfit: 9210, eps: 13.11, operatingMargin: 37.2 },
  ],
};

// Seeding Fallback/Default Quarter Generator for the rest of Top 20
export function getQuarterlyFinancials(ticker: string): QuarterlyFinancial[] {
  if (QUARTERLY_FINANCIALS_MAP[ticker]) {
    return QUARTERLY_FINANCIALS_MAP[ticker];
  }
  const meta = COMPANIES_LIST.find((c) => c.ticker === ticker) || COMPANIES_LIST[0];
  const scale = meta.marketCap / 10;
  return [
    { quarter: "Q1 FY26", revenue: Math.round(scale * 0.12), netProfit: Math.round(scale * 0.02), eps: Math.round(meta.price / 120), operatingMargin: 18.5 },
    { quarter: "Q4 FY25", revenue: Math.round(scale * 0.11), netProfit: Math.round(scale * 0.019), eps: Math.round(meta.price / 125), operatingMargin: 18.1 },
    { quarter: "Q3 FY25", revenue: Math.round(scale * 0.11), netProfit: Math.round(scale * 0.018), eps: Math.round(meta.price / 130), operatingMargin: 17.8 },
    { quarter: "Q2 FY25", revenue: Math.round(scale * 0.105), netProfit: Math.round(scale * 0.017), eps: Math.round(meta.price / 135), operatingMargin: 17.4 },
  ];
}

// Annual Financial Statement Seeding
export const ANNUAL_FINANCIALS_MAP: Record<string, AnnualFinancial[]> = {
  RELIANCE: [
    { year: "FY25", revenue: 910200, netProfit: 73500, eps: 108.60, operatingMargin: 16.8, debtToEquity: 0.38, roe: 9.8, roce: 10.5, dividendYield: 0.41 },
    { year: "FY24", revenue: 865400, netProfit: 69800, eps: 103.15, operatingMargin: 16.2, debtToEquity: 0.41, roe: 9.5, roce: 10.1, dividendYield: 0.38 },
    { year: "FY23", revenue: 812900, netProfit: 66700, eps: 98.50, operatingMargin: 15.9, debtToEquity: 0.44, roe: 9.2, roce: 9.8, dividendYield: 0.35 },
  ],
  TCS: [
    { year: "FY25", revenue: 245100, netProfit: 46100, eps: 126.20, operatingMargin: 24.6, debtToEquity: 0.02, roe: 45.1, roce: 55.4, dividendYield: 1.15 },
    { year: "FY24", revenue: 231400, netProfit: 42300, eps: 115.80, operatingMargin: 24.1, debtToEquity: 0.03, roe: 42.8, roce: 52.1, dividendYield: 2.10 },
    { year: "FY23", revenue: 215400, netProfit: 39100, eps: 107.00, operatingMargin: 23.8, debtToEquity: 0.02, roe: 41.5, roce: 50.8, dividendYield: 1.85 },
  ],
  HDFCBANK: [
    { year: "FY25", revenue: 325400, netProfit: 61200, eps: 80.50, operatingMargin: 41.2, debtToEquity: 0.82, roe: 17.2, roce: 18.5, dividendYield: 0.95 },
    { year: "FY24", revenue: 298100, netProfit: 54100, eps: 71.15, operatingMargin: 40.5, debtToEquity: 0.85, roe: 16.8, roce: 17.9, dividendYield: 0.90 },
    { year: "FY23", revenue: 254200, netProfit: 44100, eps: 58.00, operatingMargin: 39.8, debtToEquity: 0.88, roe: 15.5, roce: 16.5, dividendYield: 0.80 },
  ],
};

export function getAnnualFinancials(ticker: string): AnnualFinancial[] {
  if (ANNUAL_FINANCIALS_MAP[ticker]) {
    return ANNUAL_FINANCIALS_MAP[ticker];
  }
  const meta = COMPANIES_LIST.find((c) => c.ticker === ticker) || COMPANIES_LIST[0];
  const scale = meta.marketCap / 2;
  const earnings = scale * 0.08;
  const epsVal = Math.round(meta.price / 25);
  return [
    { year: "FY25", revenue: Math.round(scale), netProfit: Math.round(earnings), eps: epsVal, operatingMargin: 19.1, debtToEquity: meta.sector === "Financial Services" ? 0.85 : 0.15, roe: 16.5, roce: 18.9, dividendYield: 1.25 },
    { year: "FY24", revenue: Math.round(scale * 0.92), netProfit: Math.round(earnings * 0.88), eps: Math.round(epsVal * 0.88), operatingMargin: 18.5, debtToEquity: meta.sector === "Financial Services" ? 0.87 : 0.17, roe: 15.8, roce: 17.5, dividendYield: 1.10 },
    { year: "FY23", revenue: Math.round(scale * 0.85), netProfit: Math.round(earnings * 0.80), eps: Math.round(epsVal * 0.80), operatingMargin: 18.0, debtToEquity: meta.sector === "Financial Services" ? 0.90 : 0.20, roe: 15.1, roce: 16.8, dividendYield: 1.00 },
  ];
}

// Balance Sheets Seeding
export const BALANCE_SHEETS_MAP: Record<string, BalanceSheet[]> = {
  RELIANCE: [
    { year: "FY25", shareCapital: 6765, reserves: 712400, borrowings: 298100, otherLiabilities: 184500, fixedAssets: 685400, otherAssets: 516365, totalLiabilities: 1201765, totalAssets: 1201765 },
    { year: "FY24", shareCapital: 6765, reserves: 685100, borrowings: 312500, otherLiabilities: 172100, fixedAssets: 651200, otherAssets: 525265, totalLiabilities: 1176465, totalAssets: 1176465 },
  ],
  TCS: [
    { year: "FY25", shareCapital: 366, reserves: 104500, borrowings: 0, otherLiabilities: 21500, fixedAssets: 28400, otherAssets: 97966, totalLiabilities: 126366, totalAssets: 126366 },
    { year: "FY24", shareCapital: 366, reserves: 98400, borrowings: 0, otherLiabilities: 19800, fixedAssets: 26100, otherAssets: 92466, totalLiabilities: 118566, totalAssets: 118566 },
  ]
};

export function getBalanceSheet(ticker: string): BalanceSheet[] {
  if (BALANCE_SHEETS_MAP[ticker]) {
    return BALANCE_SHEETS_MAP[ticker];
  }
  const meta = COMPANIES_LIST.find((c) => c.ticker === ticker) || COMPANIES_LIST[0];
  const netWorth = meta.marketCap * 0.4;
  const borrows = meta.sector === "Financial Services" ? netWorth * 6 : netWorth * 0.25;
  const others = netWorth * 0.15;
  const tot = netWorth + borrows + others;
  const fixed = tot * 0.45;
  const otherA = tot - fixed;
  return [
    { year: "FY25", shareCapital: Math.round(meta.marketCap * 0.005), reserves: Math.round(netWorth), borrowings: Math.round(borrows), otherLiabilities: Math.round(others), fixedAssets: Math.round(fixed), otherAssets: Math.round(otherA), totalLiabilities: Math.round(tot), totalAssets: Math.round(tot) },
    { year: "FY24", shareCapital: Math.round(meta.marketCap * 0.005), reserves: Math.round(netWorth * 0.9), borrowings: Math.round(borrows * 1.05), otherLiabilities: Math.round(others * 0.92), fixedAssets: Math.round(fixed * 0.95), otherAssets: Math.round(otherA * 0.93), totalLiabilities: Math.round(tot * 0.94), totalAssets: Math.round(tot * 0.94) },
  ];
}

// Peer Comparisons
export function getPeerComparisons(ticker: string): PeerComparison[] {
  const stock = COMPANIES_LIST.find((c) => c.ticker === ticker) || COMPANIES_LIST[0];
  const sectorStocks = COMPANIES_LIST.filter((c) => c.sector === stock.sector);
  return sectorStocks.map((s) => {
    // Generate some deterministic ratios
    let pe = 25;
    if (s.sector === "Information Technology") pe = 28.5;
    else if (s.sector === "Financial Services") pe = 16.2;
    else if (s.sector === "Consumer Defensive") pe = 55.4;

    const variance = (s.name.length % 5) - 2.5;
    return {
      ticker: s.ticker,
      name: s.name,
      price: s.price,
      peRatio: parseFloat((pe + variance).toFixed(1)),
      pbRatio: parseFloat(((pe / 7) + (variance / 10)).toFixed(1)),
      evToEbitda: parseFloat(((pe * 0.75) + variance).toFixed(1)),
      roe: parseFloat((16.4 + variance).toFixed(1)),
      debtToEquity: s.sector === "Financial Services" ? 0.85 : 0.15,
    };
  });
}

// Technical Indicators Generator
export function getTechnicalIndicators(ticker: string): TechnicalIndicators {
  const stock = COMPANIES_LIST.find((c) => c.ticker === ticker) || COMPANIES_LIST[0];
  const pivot = stock.price;
  const isUp = stock.changePct > 0;

  // Simple indicator modeling
  const rsiVal = Math.round(52 + (stock.changePct * 12) + (stock.name.length % 7));
  const rsi = Math.max(10, Math.min(90, rsiVal));

  let trendSignal: "Strong Buy" | "Buy" | "Neutral" | "Sell" | "Strong Sell" = "Neutral";
  if (rsi > 70) trendSignal = "Strong Buy";
  else if (rsi > 55) trendSignal = "Buy";
  else if (rsi < 30) trendSignal = "Strong Sell";
  else if (rsi < 45) trendSignal = "Sell";

  return {
    timeframe: "Daily",
    rsi,
    macd: {
      line: parseFloat((stock.price * 0.001 * (isUp ? 1 : -1)).toFixed(2)),
      signal: parseFloat((stock.price * 0.0009 * (isUp ? 1 : -1)).toFixed(2)),
      histogram: parseFloat((stock.price * 0.0001 * (isUp ? 1 : -1)).toFixed(2)),
      text: rsi > 55 ? "Bullish Crossover" : rsi < 45 ? "Bearish Crossover" : "Consolidating",
    },
    ema20: parseFloat((stock.price * 0.985).toFixed(1)),
    ema50: parseFloat((stock.price * 0.962).toFixed(1)),
    ema200: parseFloat((stock.price * 0.915).toFixed(1)),
    vwap: parseFloat((stock.price * (isUp ? 0.995 : 1.005)).toFixed(1)),
    bollingerBands: {
      upper: parseFloat((stock.price * 1.05).toFixed(1)),
      middle: parseFloat((stock.price).toFixed(1)),
      lower: parseFloat((stock.price * 0.95).toFixed(1)),
    },
    trendSignal,
    pivots: {
      resistance3: parseFloat((pivot * 1.03).toFixed(1)),
      resistance2: parseFloat((pivot * 1.02).toFixed(1)),
      resistance1: parseFloat((pivot * 1.01).toFixed(1)),
      pivotPoint: parseFloat((pivot).toFixed(1)),
      support1: parseFloat((pivot * 0.99).toFixed(1)),
      support2: parseFloat((pivot * 0.98).toFixed(1)),
      support3: parseFloat((pivot * 0.97).toFixed(1)),
    }
  };
}

// Options Analytics Chain Generator
export function getOptionsSummary(ticker: string): OptionsSummary {
  const stock = COMPANIES_LIST.find((c) => c.ticker === ticker) || COMPANIES_LIST[0];
  const strikeInterval = stock.price > 5000 ? 100 : stock.price > 1000 ? 50 : stock.price > 500 ? 20 : 5;

  // Closest strike price
  const centerStrike = Math.round(stock.price / strikeInterval) * strikeInterval;
  const chain: OptionChainItem[] = [];

  for (let i = -5; i <= 5; i++) {
    const strikePrice = centerStrike + (i * strikeInterval);
    const distanceFactor = Math.abs(i);

    // Call metrics
    const callOI = Math.max(1200, Math.round((50000 / (distanceFactor + 1)) + (strikePrice % 73)));
    const callOIChange = Math.round(callOI * 0.12 * (i > 0 ? 1.5 : -0.5));
    const callLtp = Math.max(0.5, parseFloat((Math.max(1, centerStrike - strikePrice) * 1.1 + (i < 0 ? 0 : 50 / (distanceFactor + 1))).toFixed(1)));
    const callVolume = Math.round(callOI * 1.8);

    // Put metrics
    const putOI = Math.max(1000, Math.round((48000 / (distanceFactor + 1)) + (strikePrice % 89)));
    const putOIChange = Math.round(putOI * 0.08 * (i < 0 ? 1.4 : -0.3));
    const putLtp = Math.max(0.5, parseFloat((Math.max(1, strikePrice - centerStrike) * 0.9 + (i > 0 ? 0 : 45 / (distanceFactor + 1))).toFixed(1)));
    const putVolume = Math.round(putOI * 1.6);

    chain.push({
      strikePrice,
      callOI,
      callOIChange,
      callLtp,
      callVolume,
      putOI,
      putOIChange,
      putLtp,
      putVolume
    });
  }

  const totalCallOI = chain.reduce((sum, item) => sum + item.callOI, 0);
  const totalPutOI = chain.reduce((sum, item) => sum + item.putOI, 0);
  const pcr = parseFloat((totalPutOI / totalCallOI).toFixed(2));

  return {
    ticker: stock.ticker,
    pcr,
    maxPain: centerStrike,
    totalCallOI,
    totalPutOI,
    impliedVolatility: 14.5 + (stock.name.length % 5),
    ivRank: 32 + (stock.name.length % 21),
    expectedMove: parseFloat((stock.price * 0.035).toFixed(1)),
    sentiment: pcr > 1.1 ? "Bullish" : pcr < 0.75 ? "Bearish" : "Neutral",
    chain
  };
}

// Daily FII/DII net flows history
export const FII_DII_FLOW_DATA: InstitutionalFlow[] = [
  { date: "2026-07-14", fiiNet: 1420.50, diiNet: -230.10, fiiGrossBuy: 11450.20, fiiGrossSell: 10029.70, diiGrossBuy: 8120.40, diiGrossSell: 8350.50 },
  { date: "2026-07-13", fiiNet: -840.20, diiNet: 1120.60, fiiGrossBuy: 9820.50, fiiGrossSell: 10660.70, diiGrossBuy: 9540.80, diiGrossSell: 8420.20 },
  { date: "2026-07-10", fiiNet: 2150.80, diiNet: 450.20, fiiGrossBuy: 13200.40, fiiGrossSell: 11049.60, diiGrossBuy: 8900.50, diiGrossSell: 8450.30 },
  { date: "2026-07-09", fiiNet: 520.10, diiNet: -110.40, fiiGrossBuy: 10100.80, fiiGrossSell: 9580.70, diiGrossBuy: 7420.10, diiGrossSell: 7530.50 },
  { date: "2026-07-08", fiiNet: -1450.60, diiNet: 1980.50, fiiGrossBuy: 8520.10, fiiGrossSell: 9970.70, diiGrossBuy: 11250.00, diiGrossSell: 9269.50 },
  { date: "2026-07-07", fiiNet: 890.40, diiNet: -310.20, fiiGrossBuy: 11050.20, fiiGrossSell: 10159.80, diiGrossBuy: 7980.40, diiGrossSell: 8290.60 },
  { date: "2026-07-06", fiiNet: 1240.20, diiNet: 150.30, fiiGrossBuy: 10850.50, fiiGrossSell: 9610.30, diiGrossBuy: 8410.20, diiGrossSell: 8259.90 },
];

// Block & Bulk Deals Data Seeding
export const BLOCK_DEALS_DATA: BlockDealItem[] = [
  { date: "2026-07-14", ticker: "RELIANCE", clientName: "SOCIETE GENERALE", dealType: "BUY", quantity: 1850000, price: 2445.00, valueCr: 452.3 },
  { date: "2026-07-14", ticker: "INFY", clientName: "BNP PARIBAS ARBITRAGE", dealType: "SELL", quantity: 1200000, price: 1656.00, valueCr: 198.7 },
  { date: "2026-07-14", ticker: "HDFCBANK", clientName: "ICICI PRUDENTIAL MUTUAL FUND", dealType: "BUY", quantity: 3000000, price: 1648.50, valueCr: 494.5 },
  { date: "2026-07-13", ticker: "TCS", clientName: "JP MORGAN CHASE BANK", dealType: "SELL", quantity: 500000, price: 3912.00, valueCr: 195.6 },
  { date: "2026-07-13", ticker: "SBIN", clientName: "FIDELITY INVESTMENT TRUST", dealType: "BUY", quantity: 4500000, price: 810.20, valueCr: 364.5 },
  { date: "2026-07-10", ticker: "ICICIBANK", clientName: "LIC OF INDIA", dealType: "BUY", quantity: 5000000, price: 1102.50, valueCr: 551.2 },
  { date: "2026-07-09", ticker: "BHARTIARTL", clientName: "VANGUARD EMERGING MARKETS INDEX FUND", dealType: "BUY", quantity: 2100000, price: 1338.00, valueCr: 281.0 }
];

// Live Market News Headlines
export const STATIC_NEWS = [
  { id: "news-1", time: "09:30 AM", ticker: "RELIANCE", headline: "Reliance Retail expands hypermarket footprints; targets 15% footprint addition in FY27", sentiment: "Bullish", source: "Bloomberg Quint" },
  { id: "news-2", time: "10:15 AM", ticker: "TCS", headline: "TCS bags mega $450M multi-year digital transformation deal with UK insurance provider", sentiment: "Bullish", source: "Institutional Investor" },
  { id: "news-3", time: "11:02 AM", ticker: "HDFCBANK", headline: "RBI clears HDFC Bank merger benefits extension; borrowing costs expected to stabilize", sentiment: "Bullish", source: "Mint" },
  { id: "news-4", time: "11:45 AM", ticker: "INFY", headline: "Infosys CFO outlines margin defense plans amidst sluggish discretionary tech spending in US", sentiment: "Neutral", source: "Reuters India" },
  { id: "news-5", time: "12:30 PM", ticker: "TATASTEEL", headline: "Global steel tariffs trigger price consolidation; Tata Steel European operations show margin drag", sentiment: "Bearish", source: "Economic Times" },
  { id: "news-6", time: "01:15 PM", ticker: "BHARTIARTL", headline: "Airtel average revenue per user (ARPU) reaches INR 215, leading Indian telecom peer group", sentiment: "Bullish", source: "Bloomberg" },
  { id: "news-7", time: "02:00 PM", ticker: "SUNPHARMA", headline: "USFDA inspects Halol facility; reports minor observations, no data integrity issues raised", sentiment: "Neutral", source: "CNBC TV18" }
];
