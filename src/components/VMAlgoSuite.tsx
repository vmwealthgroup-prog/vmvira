/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import {
  Activity,
  Settings,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  Play,
  Pause,
  RefreshCw,
  Terminal,
  History,
  CheckCircle,
  AlertTriangle,
  Flame,
  Info,
  ChevronRight,
  BookOpen
} from "lucide-react";
import { motion } from "motion/react";
import { CompanyMetadata, PaperAccount, PaperOrder } from "../types";
import BuyAlertPopup, { BuyAlertPayload } from "./BuyAlertPopup";
import { isKillSwitchEngaged } from "../services/killSwitchService";

interface VMAlgoSuiteProps {
  stocks: CompanyMetadata[];
  onSelectStock: (ticker: string) => void;
}

// Pine Script input structures
interface StrategyInputs {
  stMult: number;
  atrLen: number;
  minScore: number;
  showCloud: boolean;
  cloudTr: number; // opacity %
}

interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface CalculatedIndicators {
  candle: Candle;
  idx: number;
  ema9: number;
  ema21: number;
  ema50: number;
  atr14: number;
  atr20: number;
  atrLenValue: number;
  volPct: number;
  stLine: number;
  stDir: number; // -1 for Bullish, 1 for Bearish
  rsi: number;
  vwap: number;
  skSmo: number;
  sdSmo: number;
  volOK: boolean;
  consolidation: boolean;
  bullCandle: boolean;
  bearCandle: boolean;
  r3: number;
  s3: number;
  buyScore: number;
  sellScore: number;
  buySignal: boolean;
  sellSignal: boolean;
  stFlipBuy: boolean;
  stFlipSell: boolean;
}

export default function VMAlgoSuite({ stocks, onSelectStock }: VMAlgoSuiteProps) {
  const [selectedTicker, setSelectedTicker] = useState<string>(stocks[0]?.ticker || "RELIANCE");
  const [activeTab, setActiveTab] = useState<"dashboard" | "backtest" | "console">("dashboard");

  // Strategy parameters
  const [inputs, setInputs] = useState<StrategyInputs>({
    stMult: 3.0,
    atrLen: 10,
    minScore: 3,
    showCloud: true,
    cloudTr: 72
  });

  // Automation state
  const [isAutoActive, setIsAutoActive] = useState<boolean>(() => {
    return localStorage.getItem("vm_algo_auto_active") === "true";
  });
  const [autoQty, setAutoQty] = useState<number>(15);
  const [autoMaxTradesPerDay, setAutoMaxTradesPerDay] = useState<number>(() => {
    const saved = localStorage.getItem("vm_algo_stock_bot_max_trades");
    return saved ? parseInt(saved) : 5;
  });
  const [autoDailyTradesCount, setAutoDailyTradesCount] = useState<number>(() => {
    const savedDate = localStorage.getItem("vm_algo_stock_bot_trades_date");
    const today = new Date().toISOString().split("T")[0];
    if (savedDate !== today) {
      localStorage.setItem("vm_algo_stock_bot_trades_date", today);
      localStorage.setItem("vm_algo_stock_bot_trades_count", "0");
      return 0;
    }
    const savedCount = localStorage.getItem("vm_algo_stock_bot_trades_count");
    return savedCount ? parseInt(savedCount) : 0;
  });
  const [automationLogs, setAutomationLogs] = useState<string[]>([]);

  useEffect(() => {
    localStorage.setItem("vm_algo_stock_bot_max_trades", autoMaxTradesPerDay.toString());
  }, [autoMaxTradesPerDay]);
  
  // Buy Alert Popup State
  const [activeBuyAlert, setActiveBuyAlert] = useState<BuyAlertPayload | null>(null);

  const triggerTestBuyAlert = () => {
    setActiveBuyAlert({
      id: `ALERT-${Date.now()}`,
      symbol: selectedTicker,
      assetType: "STOCK",
      action: "BUY",
      price: currentStock.price,
      targetPrice: parseFloat((currentStock.price * 1.035).toFixed(2)),
      stopLoss: parseFloat((currentStock.price * 0.985).toFixed(2)),
      score: 5,
      maxScore: 5,
      reason: `SUPER TREND X10 BULLISH BREAKOUT: Supertrend Flip Buy triggered with score 5/5 confluence on ${selectedTicker}.`,
      source: "VM Algo Stock Strategy",
      timestamp: new Date().toLocaleTimeString()
    });
  };
  
  // High fidelity simulated charts data
  const [candles, setCandles] = useState<Candle[]>([]);
  const [indicators, setIndicators] = useState<CalculatedIndicators[]>([]);
  const [hoveredData, setHoveredData] = useState<CalculatedIndicators | null>(null);

  // Core prices tracking
  const currentStock = stocks.find(s => s.ticker === selectedTicker) || stocks[0];

  // Save auto status to localStorage
  useEffect(() => {
    localStorage.setItem("vm_algo_auto_active", isAutoActive.toString());
  }, [isAutoActive]);

  const prevTickerRef = useRef<string>(selectedTicker);

  // Generate 120 historical candlesticks based on real-time price and sector profiles
  useEffect(() => {
    if (!currentStock) return;

    const tickerChanged = prevTickerRef.current !== selectedTicker;
    prevTickerRef.current = selectedTicker;

    if (!tickerChanged && candles.length > 0) {
      // Live tick update for the latest candle
      setCandles(prev => {
        if (prev.length === 0) return prev;
        const copy = [...prev];
        const last = { ...copy[copy.length - 1] };
        last.close = currentStock.price;
        if (currentStock.price > last.high) last.high = currentStock.price;
        if (currentStock.price < last.low) last.low = currentStock.price;
        copy[copy.length - 1] = last;
        return copy;
      });
      return;
    }
    
    // Seed price generation
    const baseline = currentStock.price;
    const volatility = 0.007; // standard NSE stock intraday drift
    const list: Candle[] = [];
    
    let tempClose = baseline - (80 * baseline * volatility * 0.3); // back-project pricing
    const nowTime = new Date();
    
    for (let i = 0; i < 120; i++) {
      const direction = Math.sin(i / 10) * 0.4 + (Math.random() - 0.48); // organic waves + some upward drift
      const change = tempClose * volatility * direction;
      const open = tempClose;
      const close = tempClose + change;
      
      const shadowMax = Math.max(open, close);
      const shadowMin = Math.min(open, close);
      const high = shadowMax + (Math.random() * tempClose * 0.004);
      const low = shadowMin - (Math.random() * tempClose * 0.004);
      const volume = Math.round(50000 + Math.random() * 150000);
      
      const timeStr = new Date(nowTime.getTime() - (120 - i) * 5 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      list.push({
        time: timeStr,
        open: parseFloat(open.toFixed(2)),
        high: parseFloat(high.toFixed(2)),
        low: parseFloat(low.toFixed(2)),
        close: parseFloat(close.toFixed(2)),
        volume
      });
      tempClose = close;
    }
    
    // Set the very last close to the actual live stock price
    list[list.length - 1].close = currentStock.price;
    setCandles(list);
  }, [selectedTicker, currentStock?.price]);

  // Recalculate Pine Script logic whenever candles or inputs change
  useEffect(() => {
    if (candles.length < 50) return;

    const calc: CalculatedIndicators[] = [];
    
    // Technical helpers
    const getEMA = (values: number[], period: number): number[] => {
      const k = 2 / (period + 1);
      const ema: number[] = [];
      if (values.length === 0) return [];
      
      // Seed first
      let current = values[0];
      ema.push(current);
      
      for (let i = 1; i < values.length; i++) {
        current = values[i] * k + current * (1 - k);
        ema.push(current);
      }
      return ema;
    };

    const getSMA = (values: number[], period: number): number[] => {
      const sma: number[] = [];
      for (let i = 0; i < values.length; i++) {
        if (i < period - 1) {
          sma.push(values[i]);
        } else {
          const sum = values.slice(i - period + 1, i + 1).reduce((s, v) => s + v, 0);
          sma.push(sum / period);
        }
      }
      return sma;
    };

    const getRSI = (closes: number[], period: number): number[] => {
      const rsi: number[] = [];
      let avgGain = 0;
      let avgLoss = 0;
      
      for (let i = 0; i < closes.length; i++) {
        if (i === 0) {
          rsi.push(50);
          continue;
        }
        const diff = closes[i] - closes[i - 1];
        const gain = diff > 0 ? diff : 0;
        const loss = diff < 0 ? -diff : 0;
        
        if (i < period) {
          avgGain += gain;
          avgLoss += loss;
          rsi.push(50);
        } else if (i === period) {
          avgGain = avgGain / period;
          avgLoss = avgLoss / period;
          const rs = avgGain / (avgLoss || 1e-10);
          rsi.push(100 - (100 / (1 + rs)));
        } else {
          avgGain = (avgGain * (period - 1) + gain) / period;
          avgLoss = (avgLoss * (period - 1) + loss) / period;
          const rs = avgGain / (avgLoss || 1e-10);
          rsi.push(100 - (100 / (1 + rs)));
        }
      }
      return rsi;
    };

    const closes = candles.map(c => c.close);
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    const volumes = candles.map(c => c.volume);

    const ema9Values = getEMA(closes, 9);
    const ema21Values = getEMA(closes, 21);
    const ema50Values = getEMA(closes, 50);
    
    // True Range
    const trValues: number[] = [];
    for (let i = 0; i < candles.length; i++) {
      if (i === 0) {
        trValues.push(highs[i] - lows[i]);
      } else {
        const tr = Math.max(
          highs[i] - lows[i],
          Math.abs(highs[i] - closes[i - 1]),
          Math.abs(lows[i] - closes[i - 1])
        );
        trValues.push(tr);
      }
    }

    const atr14Values = getSMA(trValues, 14);
    const atr20Values = getSMA(trValues, 20);
    const atrLenValues = getSMA(trValues, inputs.atrLen);

    // Supertrend Adaptive
    const atrPeakValues: number[] = [];
    const atrFloorValues: number[] = [];
    for (let i = 0; i < candles.length; i++) {
      const slice = atrLenValues.slice(Math.max(0, i - 99), i + 1);
      atrPeakValues.push(Math.max(...slice));
      atrFloorValues.push(Math.min(...slice));
    }

    // Volatility percentile and Cluster Multiplier
    const aMultValues: number[] = [];
    const volPctValues: number[] = [];
    for (let i = 0; i < candles.length; i++) {
      const raw = atrLenValues[i];
      const peak = atrPeakValues[i];
      const floor = atrFloorValues[i];
      const range = Math.max(peak - floor, 1e-10);
      const volPct = ((raw - floor) / range) * 100;
      volPctValues.push(volPct);
      
      const cluster = volPct > 70 ? 3 : volPct < 30 ? 1 : 2;
      const aMult = cluster === 1 ? inputs.stMult * 0.80 : cluster === 3 ? inputs.stMult * 1.25 : inputs.stMult;
      aMultValues.push(aMult);
    }

    // SuperTrend calculation algorithm
    const stLineValues: number[] = [];
    const stDirValues: number[] = []; // -1 is Bullish, 1 is Bearish
    
    let prevStLine = 0;
    let prevStDir = 1; // Start Bearish
    let prevLowerBand = 0;
    let prevUpperBand = 0;

    for (let i = 0; i < candles.length; i++) {
      const hl2 = (highs[i] + lows[i]) / 2;
      const rawMult = aMultValues[i];
      const rawAtr = atrLenValues[i];
      
      const basicUpperBand = hl2 + rawMult * rawAtr;
      const basicLowerBand = hl2 - rawMult * rawAtr;
      
      let finalLowerBand = basicLowerBand;
      let finalUpperBand = basicUpperBand;
      
      if (i > 0) {
        if (basicLowerBand > prevLowerBand || closes[i - 1] < prevLowerBand) {
          finalLowerBand = basicLowerBand;
        } else {
          finalLowerBand = prevLowerBand;
        }
        
        if (basicUpperBand < prevUpperBand || closes[i - 1] > prevUpperBand) {
          finalUpperBand = basicUpperBand;
        } else {
          finalUpperBand = prevUpperBand;
        }
      }

      let currentDir = prevStDir;
      let currentStLine = 0;

      if (i > 0) {
        if (prevStDir === 1 && closes[i] > finalUpperBand) {
          currentDir = -1; // flip buy
        } else if (prevStDir === -1 && closes[i] < finalLowerBand) {
          currentDir = 1; // flip sell
        }
      }
      
      currentStLine = currentDir === -1 ? finalLowerBand : finalUpperBand;
      
      stLineValues.push(currentStLine);
      stDirValues.push(currentDir);
      
      prevStLine = currentStLine;
      prevStDir = currentDir;
      prevLowerBand = finalLowerBand;
      prevUpperBand = finalUpperBand;
    }

    // RSI
    const rsiValues = getRSI(closes, 14);

    // VWAP
    const vwapValues: number[] = [];
    let cumVolume = 0;
    let cumPriceVol = 0;
    for (let i = 0; i < candles.length; i++) {
      const hlc3 = (highs[i] + lows[i] + closes[i]) / 3;
      cumVolume += volumes[i];
      cumPriceVol += hlc3 * volumes[i];
      vwapValues.push(cumPriceVol / (cumVolume || 1));
    }

    // Stochastic RSI (zone base)
    const skSmoValues: number[] = [];
    const sdSmoValues: number[] = [];
    for (let i = 0; i < candles.length; i++) {
      const slice = rsiValues.slice(Math.max(0, i - 13), i + 1);
      const maxRsi = Math.max(...slice);
      const minRsi = Math.min(...slice);
      const range = Math.max(maxRsi - minRsi, 1e-10);
      const currentRsi = rsiValues[i];
      const rawStoch = ((currentRsi - minRsi) / range) * 100;
      skSmoValues.push(rawStoch); // Simply smooth inside loop for demonstration
    }
    const skSmoothed = getEMA(skSmoValues, 3);
    const sdSmoothed = getEMA(skSmoothed, 3);

    // Vol average
    const volAvgValues = getSMA(volumes, 20);

    // Pivot Points (Daily R3 / S3) - computed based on seed high/low/close
    // To make it look dynamic, we project pivots based on first 20 candles
    const dH = highs[10] || currentStock.price * 1.02;
    const dL = lows[10] || currentStock.price * 0.98;
    const dC = closes[10] || currentStock.price;
    const pivPoint = (dH + dL + dC) / 3;
    const dRng = dH - dL;
    const calculatedR3 = pivPoint + dRng * 2;
    const calculatedS3 = pivPoint - dRng * 2;

    // Confluence loops
    for (let i = 0; i < candles.length; i++) {
      const c = candles[i];
      const emaBull = ema9Values[i] > ema21Values[i];
      const emaBear = ema9Values[i] < ema21Values[i];
      const curRsi = rsiValues[i];
      const rsiBull = curRsi > 40 && curRsi < 75;
      const rsiBear = curRsi > 25 && curRsi < 60;
      const aboveVWAP = c.close > vwapValues[i];
      const belowVWAP = c.close < vwapValues[i];
      const stochBull = skSmoothed[i] > sdSmoothed[i];
      const stochBear = skSmoothed[i] < sdSmoothed[i];
      
      const volOK = volumes[i] > volAvgValues[i] * 1.1;
      
      // Consolidation (20 bars)
      let consolidation = false;
      if (i >= 20) {
        const sliceH = highs.slice(i - 19, i + 1);
        const sliceL = lows.slice(i - 19, i + 1);
        const highRange = Math.max(...sliceH);
        const lowRange = Math.min(...sliceL);
        consolidation = (highRange - lowRange) < atr20Values[i] * 1.5;
      }

      // Candle bodies
      const bullCandle = c.close > c.open && (c.close - c.open) > atr14Values[i] * 0.15;
      const bearCandle = c.close < c.open && (c.open - c.close) > atr14Values[i] * 0.15;

      // Score computation
      const buyScore = 
        (emaBull ? 1 : 0) +
        (rsiBull ? 1 : 0) +
        (aboveVWAP ? 1 : 0) +
        (stochBull ? 1 : 0) +
        (bullCandle ? 1 : 0);

      const sellScore =
        (emaBear ? 1 : 0) +
        (rsiBear ? 1 : 0) +
        (belowVWAP ? 1 : 0) +
        (stochBear ? 1 : 0) +
        (bearCandle ? 1 : 0);

      // Flips
      const stBull = stDirValues[i] < 0;
      let stFlipBuy = false;
      let stFlipSell = false;
      if (i > 0) {
        stFlipBuy = stDirValues[i] < 0 && stDirValues[i - 1] > 0;
        stFlipSell = stDirValues[i] > 0 && stDirValues[i - 1] < 0;
      }

      const buySignal = stFlipBuy && buyScore >= inputs.minScore && !consolidation;
      const sellSignal = stFlipSell && sellScore >= inputs.minScore && !consolidation;

      calc.push({
        candle: c,
        idx: i,
        ema9: ema9Values[i],
        ema21: ema21Values[i],
        ema50: ema50Values[i],
        atr14: atr14Values[i],
        atr20: atr20Values[i],
        atrLenValue: atrLenValues[i],
        volPct: volPctValues[i],
        stLine: stLineValues[i],
        stDir: stDirValues[i],
        rsi: curRsi,
        vwap: vwapValues[i],
        skSmo: skSmoothed[i],
        sdSmo: sdSmoothed[i],
        volOK,
        consolidation,
        bullCandle,
        bearCandle,
        r3: calculatedR3,
        s3: calculatedS3,
        buyScore,
        sellScore,
        buySignal,
        sellSignal,
        stFlipBuy,
        stFlipSell
      });
    }

    setIndicators(calc);
    setHoveredData(calc[calc.length - 1]);
  }, [candles, inputs]);

  // AUTOMATED SIGNAL WATCHER (AUTOMATIC TRADING ENGINE TRIGGER)
  // Run every 2 seconds to check if a signal just flashed on the latest pulse!
  useEffect(() => {
    if (!indicators.length) return;

    if (isKillSwitchEngaged()) {
      if (isAutoActive) setIsAutoActive(false);
      return;
    }
    
    const lastCalculated = indicators[indicators.length - 1];
    
    // Since we simulate live microticks, if an active signal flashes and Auto active is TRUE, execute automatically
    if (isAutoActive && (lastCalculated.buySignal || lastCalculated.sellSignal)) {
      const isBuy = lastCalculated.buySignal;
      const signalName = isBuy ? "BUY" : "SELL";
      const signalScore = isBuy ? lastCalculated.buyScore : lastCalculated.sellScore;
      const tradePrice = currentStock.price;
      const tradeVal = tradePrice * autoQty;
      
      // Let's load virtual account data
      const savedPT = localStorage.getItem("vm_algo_paper_trading");
      let account: PaperAccount;
      if (savedPT) {
        try {
          account = JSON.parse(savedPT);
        } catch {
          account = {
            balance: 1000000.00,
            initialBalance: 1000000.00,
            totalEquity: 1000000.00,
            holdingsValue: 0.00,
            totalPnl: 0.00,
            totalPnlPct: 0.00,
            holdings: [],
            orders: []
          };
        }
      } else {
        account = {
          balance: 1000000.00,
          initialBalance: 1000000.00,
          totalEquity: 1000000.00,
          holdingsValue: 0.00,
          totalPnl: 0.00,
          totalPnlPct: 0.00,
          holdings: [],
          orders: []
        };
      }

      // Check if order already compiled to avoid duplicate signal trading on same timestamp
      const alreadyTraded = account.orders.some(o => 
        o.ticker === currentStock.ticker && 
        o.type === signalName && 
        o.timestamp.slice(0, -3) === new Date().toLocaleTimeString().slice(0, -3)
      );

      if (!alreadyTraded) {
        const timestampStr = new Date().toLocaleTimeString();
        let logMessage = "";
        let isSuccess = false;

        if (isBuy) {
          // Check daily trades limit
          const todayStr = new Date().toISOString().split("T")[0];
          const storedDate = localStorage.getItem("vm_algo_stock_bot_trades_date");
          let currentDailyCount = autoDailyTradesCount;
          if (storedDate !== todayStr) {
            currentDailyCount = 0;
            setAutoDailyTradesCount(0);
            localStorage.setItem("vm_algo_stock_bot_trades_date", todayStr);
            localStorage.setItem("vm_algo_stock_bot_trades_count", "0");
          }

          if (autoMaxTradesPerDay > 0 && currentDailyCount >= autoMaxTradesPerDay) {
            const limitMsg = `[${timestampStr}] VM ALGO PAUSE: Daily trade limit of ${autoMaxTradesPerDay} reached (${currentDailyCount}/${autoMaxTradesPerDay}). Automated buy paused.`;
            setAutomationLogs((prev) => [limitMsg, ...prev].slice(0, 100));
            return;
          }

          if (account.balance >= tradeVal) {
            // Deduct balance and open holding
            account.balance -= tradeVal;
            const existingIdx = account.holdings.findIndex(h => h.ticker === currentStock.ticker);
            if (existingIdx !== -1) {
              const prev = account.holdings[existingIdx];
              const nextQty = prev.quantity + autoQty;
              const nextCost = prev.totalCost + tradeVal;
              account.holdings[existingIdx] = {
                ...prev,
                quantity: nextQty,
                totalCost: nextCost,
                avgBuyPrice: parseFloat((nextCost / nextQty).toFixed(2)),
                currentPrice: tradePrice,
                currentValue: nextQty * tradePrice,
                pnl: (nextQty * tradePrice) - nextCost,
                pnlPct: (((nextQty * tradePrice) - nextCost) / nextCost) * 100
              };
            } else {
              account.holdings.push({
                ticker: currentStock.ticker,
                companyName: currentStock.name,
                quantity: autoQty,
                avgBuyPrice: tradePrice,
                currentPrice: tradePrice,
                currentValue: tradeVal,
                totalCost: tradeVal,
                pnl: 0,
                pnlPct: 0
              });
            }
            
            const newOrder: PaperOrder = {
              id: `VM-${Date.now().toString().slice(-6)}`,
              ticker: currentStock.ticker,
              companyName: currentStock.name,
              type: "BUY",
              quantity: autoQty,
              price: tradePrice,
              timestamp: timestampStr,
              value: tradeVal,
              orderType: "MARKET",
              status: "COMPLETED"
            };
            account.orders = [newOrder, ...account.orders];
            isSuccess = true;
            logMessage = `[${timestampStr}] VM ALGO TRIGGER: Automated BUY order MATCHED for ${autoQty} ${currentStock.ticker} shares at ₹${tradePrice.toFixed(2)}. Net: ₹${tradeVal.toLocaleString("en-IN")}. Confluence: ${signalScore}/5.`;

            // Increment daily trades count
            const newCount = currentDailyCount + 1;
            setAutoDailyTradesCount(newCount);
            localStorage.setItem("vm_algo_stock_bot_trades_count", newCount.toString());
            localStorage.setItem("vm_algo_stock_bot_trades_date", todayStr);

            // Trigger Buy Alert Popup
            setActiveBuyAlert({
              id: `ALERT-${Date.now()}`,
              symbol: currentStock.ticker,
              assetType: "STOCK",
              action: "BUY",
              price: tradePrice,
              targetPrice: parseFloat((tradePrice * 1.035).toFixed(2)),
              stopLoss: parseFloat((tradePrice * 0.985).toFixed(2)),
              score: signalScore,
              maxScore: 5,
              reason: `VM ALGO STOCK BOT ENTRY: Automated ${autoQty} shares BUY position executed on ${currentStock.ticker} @ ₹${tradePrice.toFixed(2)}.`,
              source: "VM Algo Stock Strategy Engine",
              timestamp: timestampStr
            });
          } else {
            logMessage = `[${timestampStr}] VM ALGO REJECT: Automated BUY for ${currentStock.ticker} aborted due to insufficient margin. Required ₹${tradeVal.toFixed(2)}, Held ₹${account.balance.toFixed(2)}.`;
          }
        } else {
          // Sell signal squares off whatever position is held
          const existing = account.holdings.find(h => h.ticker === currentStock.ticker);
          if (existing) {
            const sellQty = Math.min(existing.quantity, autoQty);
            const sellVal = sellQty * tradePrice;
            
            account.balance += sellVal;
            account.holdings = account.holdings.map(h => {
              if (h.ticker !== currentStock.ticker) return h;
              const nextQty = h.quantity - sellQty;
              const propCost = h.totalCost * (nextQty / h.quantity);
              return {
                ...h,
                quantity: nextQty,
                totalCost: propCost,
                currentValue: nextQty * tradePrice,
                pnl: (nextQty * tradePrice) - propCost,
                pnlPct: propCost > 0 ? (((nextQty * tradePrice) - propCost) / propCost) * 100 : 0
              };
            }).filter(h => h.quantity > 0);

            const newOrder: PaperOrder = {
              id: `VM-${Date.now().toString().slice(-6)}`,
              ticker: currentStock.ticker,
              companyName: currentStock.name,
              type: "SELL",
              quantity: sellQty,
              price: tradePrice,
              timestamp: timestampStr,
              value: sellVal,
              orderType: "MARKET",
              status: "COMPLETED"
            };
            account.orders = [newOrder, ...account.orders];
            isSuccess = true;
            logMessage = `[${timestampStr}] VM ALGO TRIGGER: Automated SELL order MATCHED for ${sellQty} ${currentStock.ticker} shares at ₹${tradePrice.toFixed(2)}. Net: ₹${sellVal.toLocaleString("en-IN")}. Confluence: ${signalScore}/5.`;
          } else {
            logMessage = `[${timestampStr}] VM ALGO IGNORE: Automated SELL signal ignored for ${currentStock.ticker}. No open inventory coordinates to square off.`;
          }
        }

        if (isSuccess) {
          // Recalculate totals
          const nextHoldingsValue = account.holdings.reduce((sum, h) => sum + h.currentValue, 0);
          account.holdingsValue = nextHoldingsValue;
          account.totalEquity = account.balance + nextHoldingsValue;
          account.totalPnl = account.totalEquity - account.initialBalance;
          account.totalPnlPct = (account.totalPnl / account.initialBalance) * 100;
          
          localStorage.setItem("vm_algo_paper_trading", JSON.stringify(account));
          
          // Trigger a fake custom event to let PaperTrading page reload if active
          window.dispatchEvent(new Event("storage"));
        }

        setAutomationLogs(prev => [logMessage, ...prev.slice(0, 49)]);
      }
    }
  }, [indicators, isAutoActive, currentStock, autoQty]);

  // Microtick simulation generator (every 2.5s) to pulse indicators and chart close prices
  useEffect(() => {
    const timer = setInterval(() => {
      setCandles(prev => {
        if (!prev.length) return prev;
        const copy = [...prev];
        const lastIndex = copy.length - 1;
        const current = copy[lastIndex];
        
        // Slightly vary close with normal drift
        const delta = currentStock.price - current.close;
        const drift = (Math.random() - 0.5) * current.close * 0.001 + delta * 0.2; // drift towards real stock price
        const nextClose = parseFloat((current.close + drift).toFixed(2));
        
        copy[lastIndex] = {
          ...current,
          close: nextClose,
          high: parseFloat(Math.max(current.high, nextClose).toFixed(2)),
          low: parseFloat(Math.min(current.low, nextClose).toFixed(2))
        };
        return copy;
      });
    }, 2500);

    return () => clearInterval(timer);
  }, [selectedTicker, currentStock]);

  const activeIndicator = hoveredData || indicators[indicators.length - 1];

  // Run a quick historical backtest on current candlesticks
  const runBacktest = () => {
    if (indicators.length < 30) return { winRate: 0, profit: 0, trades: [] };
    
    let tradesList: Array<{ id: string; ticker: string; type: "BUY" | "SELL"; price: number; time: string; pnl?: number; score: number }> = [];
    let capital = 100000;
    let initialCapital = 100000;
    let activePos: { price: number; qty: number; time: string } | null = null;
    let totalWin = 0;
    let totalLoss = 0;
    let winsCount = 0;
    let totalTradesCount = 0;

    for (let i = 10; i < indicators.length; i++) {
      const ind = indicators[i];
      if (ind.buySignal && !activePos) {
        // Buy signal triggers long entry
        const qty = Math.floor(capital / ind.candle.close);
        if (qty > 0) {
          activePos = { price: ind.candle.close, qty, time: ind.candle.time };
          tradesList.push({
            id: `SIM-${i}`,
            ticker: selectedTicker,
            type: "BUY",
            price: ind.candle.close,
            time: ind.candle.time,
            score: ind.buyScore
          });
        }
      } else if (ind.sellSignal && activePos) {
        // Sell signal triggers long exit
        const exitPrice = ind.candle.close;
        const entryVal = activePos.price * activePos.qty;
        const exitVal = exitPrice * activePos.qty;
        const pnlValue = exitVal - entryVal;
        
        capital += pnlValue;
        totalTradesCount++;
        
        if (pnlValue > 0) {
          winsCount++;
          totalWin += pnlValue;
        } else {
          totalLoss += Math.abs(pnlValue);
        }

        tradesList.push({
          id: `SIM-EXIT-${i}`,
          ticker: selectedTicker,
          type: "SELL",
          price: exitPrice,
          time: ind.candle.time,
          pnl: pnlValue,
          score: ind.sellScore
        });
        activePos = null;
      }
    }

    // Force close active position if any on last bar
    if (activePos) {
      const exitPrice = indicators[indicators.length - 1].candle.close;
      const pnlValue = (exitPrice - activePos.price) * activePos.qty;
      capital += pnlValue;
      totalTradesCount++;
      if (pnlValue > 0) {
        winsCount++;
        totalWin += pnlValue;
      } else {
        totalLoss += Math.abs(pnlValue);
      }
      tradesList.push({
        id: `SIM-FORCE-EXIT`,
        ticker: selectedTicker,
        type: "SELL",
        price: exitPrice,
        time: indicators[indicators.length - 1].candle.time,
        pnl: pnlValue,
        score: 3
      });
    }

    const winRate = totalTradesCount > 0 ? (winsCount / totalTradesCount) * 100 : 0;
    const profitPct = ((capital - initialCapital) / initialCapital) * 100;
    const profitFactor = totalLoss > 0 ? totalWin / totalLoss : totalWin > 0 ? 9.99 : 0;

    return {
      winRate,
      profit: capital - initialCapital,
      profitPct,
      profitFactor,
      totalTrades: totalTradesCount,
      trades: tradesList
    };
  };

  const backtestResults = runBacktest();

  // SVG Chart Dimensions & Computations
  const chartHeight = 240;
  const priceMargin = 20;

  const getSourcedPoints = () => {
    if (!indicators.length) return { candlesSvg: [], stLinePoints: "", ema9Points: "", ema21Points: "", ema50Points: "", vwapPoints: "", triggers: [] };

    const visibleCount = 60; // Show the last 60 candles on the main responsive viewport
    const slice = indicators.slice(-visibleCount);
    const prices = slice.flatMap(ind => [ind.candle.high, ind.candle.low, ind.stLine, ind.ema9, ind.ema21, ind.ema50]);
    const maxPrice = Math.max(...prices) * 1.002;
    const minPrice = Math.min(...prices) * 0.998;
    const priceDiff = maxPrice - minPrice || 1;

    const width = 640;
    const step = width / visibleCount;

    const stPoints: string[] = [];
    const ema9Points: string[] = [];
    const ema21Points: string[] = [];
    const ema50Points: string[] = [];
    const vwapPoints: string[] = [];
    const triggers: Array<{ x: number; y: number; isBuy: boolean; score: number }> = [];

    const candlesSvg = slice.map((ind, i) => {
      const x = i * step + step / 2;
      const yHigh = chartHeight - ((ind.candle.high - minPrice) / priceDiff) * (chartHeight - priceMargin * 2) - priceMargin;
      const yLow = chartHeight - ((ind.candle.low - minPrice) / priceDiff) * (chartHeight - priceMargin * 2) - priceMargin;
      const yOpen = chartHeight - ((ind.candle.open - minPrice) / priceDiff) * (chartHeight - priceMargin * 2) - priceMargin;
      const yClose = chartHeight - ((ind.candle.close - minPrice) / priceDiff) * (chartHeight - priceMargin * 2) - priceMargin;
      
      const stY = chartHeight - ((ind.stLine - minPrice) / priceDiff) * (chartHeight - priceMargin * 2) - priceMargin;
      const ema9Y = chartHeight - ((ind.ema9 - minPrice) / priceDiff) * (chartHeight - priceMargin * 2) - priceMargin;
      const ema21Y = chartHeight - ((ind.ema21 - minPrice) / priceDiff) * (chartHeight - priceMargin * 2) - priceMargin;
      const ema50Y = chartHeight - ((ind.ema50 - minPrice) / priceDiff) * (chartHeight - priceMargin * 2) - priceMargin;
      const vwapY = chartHeight - ((ind.vwap - minPrice) / priceDiff) * (chartHeight - priceMargin * 2) - priceMargin;

      stPoints.push(`${x},${stY}`);
      ema9Points.push(`${x},${ema9Y}`);
      ema21Points.push(`${x},${ema21Y}`);
      ema50Points.push(`${x},${ema50Y}`);
      vwapPoints.push(`${x},${vwapY}`);

      if (ind.buySignal) {
        triggers.push({ x, y: yLow + 12, isBuy: true, score: ind.buyScore });
      }
      if (ind.sellSignal) {
        triggers.push({ x, y: yHigh - 12, isBuy: false, score: ind.sellScore });
      }

      return {
        x,
        yHigh,
        yLow,
        yOpen,
        yClose,
        isBull: ind.candle.close >= ind.candle.open,
        indicator: ind
      };
    });

    return {
      candlesSvg,
      stLinePoints: stPoints.join(" "),
      ema9Points: ema9Points.join(" "),
      ema21Points: ema21Points.join(" "),
      ema50Points: ema50Points.join(" "),
      vwapPoints: vwapPoints.join(" "),
      triggers,
      minPrice,
      maxPrice
    };
  };

  const chartData = getSourcedPoints();

  return (
    <div className="p-4 space-y-4 font-mono text-xs">
      {/* Header Banner */}
      <div className="border border-terminal-border bg-terminal-card p-3 rounded flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <div className="flex items-center space-x-2 text-terminal-accent">
            <Flame className="w-5 h-5 text-amber-500 animate-pulse" />
            <h1 className="text-sm font-black tracking-wider uppercase font-display">
              VM VIRA X10 AI ALGO ENGINE
            </h1>
          </div>
          <p className="text-[9px] text-terminal-muted uppercase tracking-wider mt-0.5">
            Institutional Confluence System • Pine Script v6 Compiler Sandbox
          </p>
        </div>

        {/* Quick Ticker selector & Test Buy Alert Button */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={triggerTestBuyAlert}
            className="px-2.5 py-1.5 text-[8.5px] font-black uppercase tracking-wider text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded shadow-[0_0_10px_rgba(16,185,129,0.4)] transition-all flex items-center space-x-1.5 cursor-pointer"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-950 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-950"></span>
            </span>
            <span>TEST BUY ALERT POPUP</span>
          </button>

          <label className="text-[8px] text-terminal-muted uppercase font-bold ml-1">Trading Coordinate:</label>
          <select
            value={selectedTicker}
            onChange={(e) => setSelectedTicker(e.target.value)}
            className="bg-terminal-bg border border-terminal-border rounded h-8 px-2.5 text-white font-mono focus:border-terminal-accent outline-none text-[10px]"
          >
            {stocks.map(s => (
              <option key={s.ticker} value={s.ticker}>
                {s.ticker} (₹{s.price.toFixed(2)})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main split grid: Controls & Indicators vs Live Chart/Ticking Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        
        {/* Left Column: Interactive Settings & Pine Compilation Parameters */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Strategy Variables Input Widget */}
          <div className="border border-terminal-border bg-terminal-card p-3 rounded space-y-3">
            <div className="border-b border-terminal-border pb-2 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-terminal-accent flex items-center space-x-1">
                <Settings className="w-3.5 h-3.5" />
                <span>Pine Strategy Inputs</span>
              </span>
              <span className="text-[7px] bg-terminal-border text-terminal-muted px-1.5 py-0.5 rounded font-bold">
                ADAPTIVE MODE
              </span>
            </div>

            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-[8px] uppercase text-terminal-muted mb-1 font-bold">
                  <span>ST Multiplier</span>
                  <span className="text-white font-bold">{inputs.stMult.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="6.0"
                  step="0.1"
                  value={inputs.stMult}
                  onChange={(e) => setInputs(prev => ({ ...prev, stMult: parseFloat(e.target.value) }))}
                  className="w-full accent-terminal-accent cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[8px] uppercase text-terminal-muted mb-1 font-bold">
                  <span>ATR Length</span>
                  <span className="text-white font-bold">{inputs.atrLen} bars</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="30"
                  step="1"
                  value={inputs.atrLen}
                  onChange={(e) => setInputs(prev => ({ ...prev, atrLen: parseInt(e.target.value) }))}
                  className="w-full accent-terminal-accent cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[8px] uppercase text-terminal-muted mb-1 font-bold">
                  <span>Minimum Confluence Score</span>
                  <span className="text-white font-bold">{inputs.minScore} / 5</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="5"
                  step="1"
                  value={inputs.minScore}
                  onChange={(e) => setInputs(prev => ({ ...prev, minScore: parseInt(e.target.value) }))}
                  className="w-full accent-terminal-accent cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-terminal-border/40 mt-1">
                <span className="text-[8px] text-terminal-muted uppercase font-bold">Show Trend Cloud Fill</span>
                <input
                  type="checkbox"
                  checked={inputs.showCloud}
                  onChange={(e) => setInputs(prev => ({ ...prev, showCloud: e.target.checked }))}
                  className="w-3.5 h-3.5 accent-terminal-accent cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Automated Trading Execution Engine */}
          <div className="border border-terminal-border bg-terminal-card p-3 rounded space-y-3">
            <div className="border-b border-terminal-border pb-2 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-terminal-success flex items-center space-x-1">
                <Play className="w-3.5 h-3.5 text-terminal-success" />
                <span>Automated Trading Engine</span>
              </span>
              <span className={`text-[7px] px-1.5 py-0.5 rounded font-bold ${isAutoActive ? "bg-terminal-success/10 text-terminal-success" : "bg-terminal-danger/10 text-terminal-danger"}`}>
                {isAutoActive ? "ACTIVE" : "PAUSED"}
              </span>
            </div>

            <p className="text-[8.5px] text-terminal-muted lowercase normal-case leading-relaxed">
              When enabled, the VM VIRA AI strategy will actively listen to candlestick triggers. Upon confirmed BUY / SELL signals matching parameters, market orders are executed on your Paper Trading Desk account instantly.
            </p>

            <div className="space-y-2 pt-1.5 border-t border-terminal-border/40">
              <div className="flex items-center justify-between">
                <span className="text-[8.5px] uppercase text-terminal-muted font-bold">Auto-Trade Status</span>
                <button
                  onClick={() => setIsAutoActive(!isAutoActive)}
                  className={`px-3 py-1.5 rounded text-[8.5px] uppercase font-black tracking-widest flex items-center space-x-1.5 transition-all cursor-pointer border ${
                    isAutoActive ? "bg-terminal-success text-white border-terminal-success" : "bg-terminal-danger/10 text-terminal-danger border-terminal-danger/30"
                  }`}
                >
                  {isAutoActive ? (
                    <>
                      <Pause className="w-3 h-3" />
                      <span>AUTOTRADE LIVE</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3 animate-pulse" />
                      <span>ACTIVATE AUTOTRADE</span>
                    </>
                  )}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="text-[7.5px] text-terminal-muted uppercase font-bold block mb-1">Execution Qty</label>
                  <input
                    type="number"
                    min="1"
                    value={autoQty}
                    onChange={(e) => setAutoQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-terminal-bg border border-terminal-border rounded h-7 px-1.5 text-white font-mono outline-none text-[9px]"
                  />
                </div>
                <div>
                  <label className="text-[7.5px] text-terminal-muted uppercase font-bold block mb-1">Leverage Mode</label>
                  <div className="w-full bg-terminal-bg/50 border border-terminal-border/50 rounded h-7 px-1.5 text-terminal-muted font-mono flex items-center text-[9px]">
                    1X SOLID INVENTORY
                  </div>
                </div>
              </div>

              {/* Day Limit (Max Trades Per Day) */}
              <div className="bg-terminal-bg/80 border border-terminal-border rounded p-2 space-y-1.5">
                <div className="flex items-center justify-between text-[7.5px] uppercase font-bold">
                  <span className="text-terminal-muted">Day Limit (Trades / Day)</span>
                  <span className="text-terminal-success font-black font-mono">
                    {autoDailyTradesCount} / {autoMaxTradesPerDay === 0 ? "Unlimited" : `${autoMaxTradesPerDay} Today`}
                  </span>
                </div>
                
                <div className="flex items-center space-x-1.5">
                  <div className="flex-1 flex bg-terminal-card border border-terminal-border rounded items-center h-6 px-1.5 justify-between">
                    <button
                      type="button"
                      onClick={() => setAutoMaxTradesPerDay((p) => Math.max(0, p - 1))}
                      className="w-4 h-4 flex items-center justify-center bg-terminal-border text-terminal-muted hover:text-white rounded text-[10px] font-bold cursor-pointer"
                      title="Decrease limit"
                    >
                      -
                    </button>
                    <span className="text-[8.5px] font-mono font-bold text-white">
                      {autoMaxTradesPerDay === 0 ? "Unlimited" : `${autoMaxTradesPerDay} / Day`}
                    </span>
                    <button
                      type="button"
                      onClick={() => setAutoMaxTradesPerDay((p) => p + 1)}
                      className="w-4 h-4 flex items-center justify-center bg-terminal-border text-terminal-muted hover:text-white rounded text-[10px] font-bold cursor-pointer"
                      title="Increase limit"
                    >
                      +
                    </button>
                  </div>

                  <div className="flex space-x-1">
                    {[3, 5, 10, 0].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setAutoMaxTradesPerDay(val)}
                        className={`px-1.5 py-0.5 text-[7px] font-bold uppercase rounded border cursor-pointer ${
                          autoMaxTradesPerDay === val
                            ? "bg-terminal-success/20 text-terminal-success border-terminal-success/50"
                            : "bg-terminal-card text-terminal-muted border-terminal-border hover:text-white"
                        }`}
                      >
                        {val === 0 ? "∞" : val}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setAutoDailyTradesCount(0);
                        const today = new Date().toISOString().split("T")[0];
                        localStorage.setItem("vm_algo_stock_bot_trades_count", "0");
                        localStorage.setItem("vm_algo_stock_bot_trades_date", today);
                      }}
                      className="px-1.5 py-0.5 text-[7px] font-bold uppercase rounded bg-terminal-border text-slate-300 hover:text-white cursor-pointer"
                      title="Reset today's counter"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick instructions desk */}
          <div className="border border-terminal-border bg-terminal-card p-3 rounded text-[8.5px] text-terminal-muted space-y-1.5">
            <span className="text-[9px] font-bold text-white uppercase flex items-center space-x-1">
              <BookOpen className="w-3.5 h-3.5 text-terminal-accent" />
              <span>VM Algo Strategy Rules</span>
            </span>
            <ul className="list-disc pl-3.5 space-y-1 lowercase normal-case">
              <li>ST direction is the required trigger — Entry can only occur on the exact crossover bar.</li>
              <li>Score confirms momentum strength. High scores (4/5, 5/5) signal strong trend continuation.</li>
              <li>No trades trigger during Consolidation (yellow background) to protect from whipsaws.</li>
            </ul>
          </div>
        </div>

        {/* Right Column: Chart, Dashboard Grid and Ticking Output console */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Main Visualizer Area Tabs */}
          <div className="border border-terminal-border bg-terminal-card rounded flex flex-col">
            <div className="border-b border-terminal-border flex justify-between items-center bg-terminal-bg/40 px-3">
              <div className="flex space-x-1 pt-1.5">
                <button
                  onClick={() => setActiveTab("dashboard")}
                  className={`px-3 py-1.5 text-[9px] uppercase font-bold tracking-widest border-t-2 transition-all cursor-pointer ${
                    activeTab === "dashboard" ? "border-terminal-accent text-white bg-terminal-card" : "border-transparent text-terminal-muted hover:text-white"
                  }`}
                >
                  <div className="flex items-center space-x-1.5">
                    <Activity className="w-3.5 h-3.5" />
                    <span>Live Strategy Chart</span>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab("backtest")}
                  className={`px-3 py-1.5 text-[9px] uppercase font-bold tracking-widest border-t-2 transition-all cursor-pointer ${
                    activeTab === "backtest" ? "border-terminal-accent text-white bg-terminal-card" : "border-transparent text-terminal-muted hover:text-white"
                  }`}
                >
                  <div className="flex items-center space-x-1.5">
                    <History className="w-3.5 h-3.5" />
                    <span>Simulation Backtest</span>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab("console")}
                  className={`px-3 py-1.5 text-[9px] uppercase font-bold tracking-widest border-t-2 transition-all cursor-pointer ${
                    activeTab === "console" ? "border-terminal-accent text-white bg-terminal-card" : "border-transparent text-terminal-muted hover:text-white"
                  }`}
                >
                  <div className="flex items-center space-x-1.5">
                    <Terminal className="w-3.5 h-3.5" />
                    <span>Auto Logs ({automationLogs.length})</span>
                  </div>
                </button>
              </div>
              <div className="flex items-center space-x-1">
                <span className="w-1.5 h-1.5 bg-terminal-success rounded-full animate-ping shrink-0" />
                <span className="text-[7.5px] text-terminal-muted font-bold uppercase hidden md:inline">LIVE STREAM MATCHING</span>
              </div>
            </div>

            {/* View contents wrapper */}
            <div className="p-3">
              {activeTab === "dashboard" && (
                !activeIndicator ? (
                  <div className="p-12 text-center text-terminal-muted uppercase flex flex-col items-center justify-center space-y-3">
                    <RefreshCw className="w-6 h-6 animate-spin text-terminal-accent" strokeWidth="3" />
                    <span>Bootstrapping Strategy Indicators...</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    
                    {/* Candlestick viewport */}
                    <div className="relative border border-terminal-border bg-terminal-bg rounded overflow-hidden">
                      
                      {/* Floating HUD metrics on Hover */}
                      <div className="absolute top-2 left-2 bg-terminal-card/90 border border-terminal-border/80 px-2.5 py-1 rounded text-[8px] space-x-2 text-terminal-muted z-10 flex flex-wrap items-center gap-y-1">
                        <span className="text-white font-bold uppercase">{selectedTicker} 5M</span>
                        <span>O: <strong className="text-[#eee]">₹{activeIndicator.candle.open}</strong></span>
                        <span>H: <strong className="text-terminal-success">₹{activeIndicator.candle.high}</strong></span>
                        <span>L: <strong className="text-terminal-danger">₹{activeIndicator.candle.low}</strong></span>
                        <span>C: <strong className="text-white">₹{activeIndicator.candle.close}</strong></span>
                        <span className="border-l border-terminal-border pl-2 text-terminal-accent font-bold">ST: ₹{activeIndicator.stLine.toFixed(2)}</span>
                      </div>

                    {/* Chart Canvas drawing SVG */}
                    <svg className="w-full select-none" viewBox="0 0 640 240" style={{ minHeight: "240px" }}>
                      
                      {/* Grid Lines */}
                      <line x1="0" y1="60" x2="640" y2="60" stroke="var(--terminal-border)" strokeWidth="0.5" strokeDasharray="3" />
                      <line x1="0" y1="120" x2="640" y2="120" stroke="var(--terminal-border)" strokeWidth="0.5" strokeDasharray="3" />
                      <line x1="0" y1="180" x2="640" y2="180" stroke="var(--terminal-border)" strokeWidth="0.5" strokeDasharray="3" />

                      {/* Consolidation background highlights */}
                      {chartData.candlesSvg.map((c, idx) => {
                        if (c.indicator.consolidation) {
                          const step = 640 / 60;
                          return (
                            <rect
                              key={`consol-${idx}`}
                              x={c.x - step/2}
                              y="0"
                              width={step}
                              height="240"
                              fill="rgba(217, 119, 6, 0.05)"
                            />
                          );
                        }
                        return null;
                      })}

                      {/* Cloud fill (Bullish / Bearish) */}
                      {inputs.showCloud && chartData.candlesSvg.length > 1 && (
                        (() => {
                          const pointsUp: string[] = [];
                          const pointsDown: string[] = [];

                          chartData.candlesSvg.forEach((c) => {
                            if (c.indicator.stDir < 0) {
                              pointsUp.push(`${c.x},${c.yClose}`);
                              pointsUp.push(`${c.x},${chartHeight - ((c.indicator.stLine - chartData.minPrice) / (chartData.maxPrice - chartData.minPrice)) * (chartHeight - priceMargin * 2) - priceMargin}`);
                            } else {
                              pointsDown.push(`${c.x},${c.yClose}`);
                              pointsDown.push(`${c.x},${chartHeight - ((c.indicator.stLine - chartData.minPrice) / (chartData.maxPrice - chartData.minPrice)) * (chartHeight - priceMargin * 2) - priceMargin}`);
                            }
                          });

                          return (
                            <>
                              {/* Renders dynamic cloud shards */}
                              {chartData.candlesSvg.map((c, i) => {
                                if (i === 0) return null;
                                const prev = chartData.candlesSvg[i - 1];
                                const isBull = c.indicator.stDir < 0;
                                const fillCol = isBull ? "rgba(16, 185, 129, 0.08)" : "rgba(239, 68, 68, 0.08)";
                                
                                const stY = chartHeight - ((c.indicator.stLine - chartData.minPrice) / (chartData.maxPrice - chartData.minPrice)) * (chartHeight - priceMargin * 2) - priceMargin;
                                const prevStY = chartHeight - ((prev.indicator.stLine - chartData.minPrice) / (chartData.maxPrice - chartData.minPrice)) * (chartHeight - priceMargin * 2) - priceMargin;

                                return (
                                  <polygon
                                    key={`cloud-${i}`}
                                    points={`${prev.x},${prev.yClose} ${c.x},${c.yClose} ${c.x},${stY} ${prev.x},${prevStY}`}
                                    fill={fillCol}
                                  />
                                );
                              })}
                            </>
                          );
                        })()
                      )}

                      {/* Daily Pivots S3 / R3 Lines */}
                      {indicators.length > 0 && (
                        (() => {
                          const r3Y = chartHeight - ((indicators[indicators.length - 1].r3 - chartData.minPrice) / (chartData.maxPrice - chartData.minPrice)) * (chartHeight - priceMargin * 2) - priceMargin;
                          const s3Y = chartHeight - ((indicators[indicators.length - 1].s3 - chartData.minPrice) / (chartData.maxPrice - chartData.minPrice)) * (chartHeight - priceMargin * 2) - priceMargin;
                          return (
                            <>
                              {r3Y > 0 && r3Y < chartHeight && (
                                <>
                                  <line x1="0" y1={r3Y} x2="640" y2={r3Y} stroke="#ff1744" strokeWidth="0.8" strokeDasharray="4 4" />
                                  <text x="5" y={r3Y - 3} fill="#ff1744" fontSize="7" fontWeight="bold">NSE Daily R3 Resistance</text>
                                </>
                              )}
                              {s3Y > 0 && s3Y < chartHeight && (
                                <>
                                  <line x1="0" y1={s3Y} x2="640" y2={s3Y} stroke="#00c853" strokeWidth="0.8" strokeDasharray="4 4" />
                                  <text x="5" y={s3Y + 9} fill="#00c853" fontSize="7" fontWeight="bold">NSE Daily S3 Support</text>
                                </>
                              )}
                            </>
                          );
                        })()
                      )}

                      {/* EMA Plotting lines */}
                      <polyline points={chartData.ema9Points} fill="none" stroke="#2196f3" strokeWidth="0.8" />
                      <polyline points={chartData.ema21Points} fill="none" stroke="#ff9800" strokeWidth="0.8" />
                      <polyline points={chartData.ema50Points} fill="none" stroke="#9c27b0" strokeWidth="0.8" />
                      <polyline points={chartData.vwapPoints} fill="none" stroke="#00bcd4" strokeWidth="0.8" opacity="0.6" />

                      {/* SuperTrend Line itself */}
                      <polyline points={chartData.stLinePoints} fill="none" stroke={indicators[indicators.length-1]?.stDir < 0 ? "#00ff00" : "#ff0000"} strokeWidth="1.8" />

                      {/* Draw Candlesticks */}
                      {chartData.candlesSvg.map((c, idx) => {
                        const wickX = c.x;
                        const bodyWidth = 6;
                        const bodyX = c.x - bodyWidth / 2;
                        const bodyY = Math.min(c.yOpen, c.yClose);
                        const bodyHeight = Math.max(Math.abs(c.yOpen - c.yClose), 1.2);
                        const fill = c.isBull ? "var(--color-terminal-success)" : "var(--color-terminal-danger)";

                        return (
                          <g
                            key={`candle-${idx}`}
                            className="cursor-pointer"
                            onMouseEnter={() => setHoveredData(c.indicator)}
                          >
                            {/* Wick line */}
                            <line x1={wickX} y1={c.yHigh} x2={wickX} y2={c.yLow} stroke={fill} strokeWidth="1" />
                            {/* Candle body */}
                            <rect x={bodyX} y={bodyY} width={bodyWidth} height={bodyHeight} fill={fill} />
                          </g>
                        );
                      })}

                      {/* Render Confirmation Signal triggers and triangles */}
                      {chartData.triggers.map((trig, idx) => (
                        <g key={`trig-${idx}`} className="animate-bounce">
                          {trig.isBuy ? (
                            <>
                              {/* Green arrow pointing up */}
                              <polygon points={`${trig.x},${trig.y} ${trig.x-4},${trig.y+6} ${trig.x+4},${trig.y+6}`} fill="#00c853" />
                              <rect x={trig.x-14} y={trig.y+7} width="28" height="8" rx="1.5" fill="#00c853" />
                              <text x={trig.x} y={trig.y+13} fill="white" fontSize="6" fontWeight="bold" textAnchor="middle">
                                BUY {trig.score}/5
                              </text>
                            </>
                          ) : (
                            <>
                              {/* Red arrow pointing down */}
                              <polygon points={`${trig.x},${trig.y} ${trig.x-4},${trig.y-6} ${trig.x+4},${trig.y-6}`} fill="#ff1744" />
                              <rect x={trig.x-14} y={trig.y-15} width="28" height="8" rx="1.5" fill="#ff1744" />
                              <text x={trig.x} y={trig.y-9} fill="white" fontSize="6" fontWeight="bold" textAnchor="middle">
                                SELL {trig.score}/5
                              </text>
                            </>
                          )}
                        </g>
                      ))}
                    </svg>
                    
                    {/* Overlay legend indicator labels */}
                    <div className="absolute bottom-2 left-2 flex items-center space-x-3 text-[7.5px] uppercase text-terminal-muted select-none">
                      <div className="flex items-center space-x-1">
                        <span className="w-2 h-0.5 bg-[#2196f3] inline-block" />
                        <span>EMA 9</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="w-2 h-0.5 bg-[#ff9800] inline-block" />
                        <span>EMA 21</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="w-2 h-0.5 bg-[#9c27b0] inline-block" />
                        <span>EMA 50</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="w-2 h-0.5 bg-[#00bcd4] inline-block" />
                        <span>VWAP</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="w-3 h-1 bg-terminal-success inline-block opacity-20" />
                        <span>Trend Cloud</span>
                      </div>
                    </div>
                  </div>

                  {/* Pine Script Table Dashboard exactly matches `table dash` layout */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Left half: VM VIRA compact indicator matching pine table */}
                    <div className="border border-terminal-border rounded overflow-hidden">
                      <div className="bg-terminal-accent text-white p-2 text-center text-[10px] font-black uppercase tracking-wider font-display">
                        VM VIRA X10 STATUS CONSOLE
                      </div>
                      <div className="bg-terminal-card divide-y divide-terminal-border/60 text-[9px] uppercase font-bold">
                        
                        {/* Row 1: Trigger signal */}
                        <div className="flex justify-between p-2">
                          <span className="text-terminal-muted">SIGNAL / TRIGGER</span>
                          <span className={`px-2 py-0.5 rounded text-[8px] text-white ${
                            activeIndicator.buySignal ? "bg-terminal-success" : 
                            activeIndicator.sellSignal ? "bg-terminal-danger" : "bg-slate-500"
                          }`}>
                            {activeIndicator.buySignal ? "BUY / GO LONG" : 
                             activeIndicator.sellSignal ? "SELL / GO SHORT" : "WAIT FOR SIGNAL"}
                          </span>
                        </div>

                        {/* Row 2: Buy Confluence Score */}
                        <div className="flex justify-between p-2">
                          <span className="text-terminal-muted">BUY SCORE</span>
                          <span className={`px-1.5 py-0.5 rounded text-[8px] text-white ${
                            activeIndicator.buyScore >= 4 ? "bg-terminal-success" : 
                            activeIndicator.buyScore >= 2 ? "bg-amber-600" : "bg-terminal-danger"
                          }`}>
                            {activeIndicator.buyScore} / 5
                          </span>
                        </div>

                        {/* Row 3: Sell Confluence Score */}
                        <div className="flex justify-between p-2">
                          <span className="text-terminal-muted">SELL SCORE</span>
                          <span className={`px-1.5 py-0.5 rounded text-[8px] text-white ${
                            activeIndicator.sellScore >= 4 ? "bg-terminal-success" : 
                            activeIndicator.sellScore >= 2 ? "bg-amber-600" : "bg-terminal-danger"
                          }`}>
                            {activeIndicator.sellScore} / 5
                          </span>
                        </div>

                        {/* Row 4: Adaptive SuperTrend */}
                        <div className="flex justify-between p-2">
                          <span className="text-terminal-muted">SUPERTREND</span>
                          <span className={`font-bold ${activeIndicator.stDir < 0 ? "text-terminal-success" : "text-terminal-danger"}`}>
                            {activeIndicator.stDir < 0 ? "BULLISH TREND" : "BEARISH TREND"}
                          </span>
                        </div>

                        {/* Row 5: EMAs 9/21 */}
                        <div className="flex justify-between p-2">
                          <span className="text-terminal-muted">EMA 9/21 RELATION</span>
                          <span className={`font-bold ${activeIndicator.ema9 > activeIndicator.ema21 ? "text-terminal-success" : "text-terminal-danger"}`}>
                            {activeIndicator.ema9 > activeIndicator.ema21 ? "9 > 21 BULLISH" : "9 < 21 BEARISH"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right half: Remaining metrics */}
                    <div className="border border-terminal-border rounded overflow-hidden">
                      <div className="bg-terminal-border p-2 text-center text-[10px] font-black uppercase tracking-wider text-terminal-muted font-display">
                        VOLUMETRIC & OSCILLATOR COEFFS
                      </div>
                      <div className="bg-terminal-card divide-y divide-terminal-border/60 text-[9px] uppercase font-bold">
                        
                        {/* Row 6: RSI indicator */}
                        <div className="flex justify-between p-2">
                          <span className="text-terminal-muted">RSI (14) OSCILLATOR</span>
                          <div className="flex items-center space-x-1.5">
                            <span className="text-[#eee]">{activeIndicator.rsi.toFixed(1)}</span>
                            <span className={`px-1 py-0.5 rounded text-[7px] text-white ${
                              activeIndicator.rsi > 55 ? "bg-terminal-success" : 
                              activeIndicator.rsi < 45 ? "bg-terminal-danger" : "bg-amber-600"
                            }`}>
                              {activeIndicator.rsi > 55 ? "BULL" : activeIndicator.rsi < 45 ? "BEAR" : "NEUT"}
                            </span>
                          </div>
                        </div>

                        {/* Row 7: Stochastic RSI */}
                        <div className="flex justify-between p-2">
                          <span className="text-terminal-muted">STOCHASTIC RSI</span>
                          <span className={`font-bold ${activeIndicator.skSmo > activeIndicator.sdSmo ? "text-terminal-success" : "text-terminal-danger"}`}>
                            {activeIndicator.skSmo > activeIndicator.sdSmo ? "BULL CROSS" : "BEAR CROSS"}
                          </span>
                        </div>

                        {/* Row 8: Volume status */}
                        <div className="flex justify-between p-2">
                          <span className="text-terminal-muted">VOLUME SPIKE INDEX</span>
                          <span className={`px-1 rounded text-[7.5px] text-white ${activeIndicator.volOK ? "bg-terminal-success" : "bg-slate-600"}`}>
                            {activeIndicator.volOK ? "SPIKE DETECTED" : "NORMAL LIQUIDITY"}
                          </span>
                        </div>

                        {/* Row 9: Candle Body */}
                        <div className="flex justify-between p-2">
                          <span className="text-terminal-muted">CANDLESTICK STRUCTURE</span>
                          <span className={`font-bold ${
                            activeIndicator.bullCandle ? "text-terminal-success" : 
                            activeIndicator.bearCandle ? "text-terminal-danger" : "text-terminal-muted"
                          }`}>
                            {activeIndicator.bullCandle ? "BULLISH BODY" : 
                             activeIndicator.bearCandle ? "BEARISH BODY" : "DENSE DOJI"}
                          </span>
                        </div>

                        {/* Row 10: ATR volatility */}
                        <div className="flex justify-between p-2">
                          <span className="text-terminal-muted">ATR RANGE SPREAD</span>
                          <span className="text-terminal-accent font-mono font-black">
                            ₹{activeIndicator.atr14.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            )}

              {activeTab === "backtest" && (
                <div className="space-y-4">
                  {/* Summary metrics header */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="border border-terminal-border/80 bg-terminal-bg/50 p-2.5 rounded text-center">
                      <span className="text-[7.5px] text-terminal-muted uppercase tracking-wider block">Backtested Trades</span>
                      <span className="text-sm font-black text-white block mt-0.5">{backtestResults.totalTrades}</span>
                    </div>
                    <div className="border border-terminal-border/80 bg-terminal-bg/50 p-2.5 rounded text-center">
                      <span className="text-[7.5px] text-terminal-muted uppercase tracking-wider block">Strategy Win Rate %</span>
                      <span className="text-sm font-black text-terminal-success block mt-0.5">{backtestResults.winRate.toFixed(1)}%</span>
                    </div>
                    <div className="border border-terminal-border/80 bg-terminal-bg/50 p-2.5 rounded text-center">
                      <span className="text-[7.5px] text-terminal-muted uppercase tracking-wider block">Net Capital Gain</span>
                      <span className={`text-sm font-black block mt-0.5 ${backtestResults.profit >= 0 ? "text-terminal-success" : "text-terminal-danger"}`}>
                        ₹{backtestResults.profit.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="border border-terminal-border/80 bg-terminal-bg/50 p-2.5 rounded text-center">
                      <span className="text-[7.5px] text-terminal-muted uppercase tracking-wider block">Profit Factor</span>
                      <span className="text-sm font-black text-terminal-accent block mt-0.5">{backtestResults.profitFactor.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Trades log */}
                  <div className="border border-terminal-border rounded overflow-hidden max-h-[220px] overflow-y-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-terminal-border/80 bg-terminal-bg/40 text-[7.5px] text-terminal-muted uppercase">
                          <th className="p-2">SIM TIME</th>
                          <th className="p-2">TYPE</th>
                          <th className="p-2">ENTRY/EXIT PRICE</th>
                          <th className="p-2">CONF SCORE</th>
                          <th className="p-2 text-right">UNREALIZED P&L</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-terminal-border/40 text-[8.5px] font-mono">
                        {backtestResults.trades.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-terminal-muted uppercase">
                              No backtested trades triggered. Adjust settings or pick a higher volatility stock.
                            </td>
                          </tr>
                        ) : (
                          backtestResults.trades.map((t, idx) => (
                            <tr key={`${t.id}-${idx}`} className="hover:bg-terminal-card-hover/20">
                              <td className="p-2 text-terminal-muted">{t.time}</td>
                              <td className="p-2">
                                <span className={`px-1 py-0.2 rounded font-bold ${t.type === "BUY" ? "bg-terminal-success/15 text-terminal-success" : "bg-terminal-danger/15 text-terminal-danger"}`}>
                                  {t.type}
                                </span>
                              </td>
                              <td className="p-2 text-[#eee]">₹{t.price.toFixed(2)}</td>
                              <td className="p-2 text-terminal-muted">{t.score}/5</td>
                              <td className={`p-2 text-right font-black ${t.pnl === undefined ? "text-terminal-muted" : t.pnl >= 0 ? "text-terminal-success" : "text-terminal-danger"}`}>
                                {t.pnl === undefined ? "POSITION HELD" : `${t.pnl >= 0 ? "+" : ""}₹${t.pnl.toFixed(2)}`}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === "console" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] text-terminal-muted uppercase tracking-widest font-bold">Automation Command Console logs</span>
                    <button
                      onClick={() => setAutomationLogs([])}
                      className="text-terminal-danger uppercase hover:underline text-[7.5px]"
                    >
                      Clear stream Buffer
                    </button>
                  </div>
                  <div className="bg-[#04060b] border border-terminal-border rounded p-2.5 h-[180px] overflow-y-auto font-mono text-[8.5px] text-[#00ff00] space-y-1.5 leading-relaxed">
                    {automationLogs.length === 0 ? (
                      <div className="text-terminal-muted uppercase text-center py-12">
                        [VM ALGO ENGINE ACTIVE - AWAITING MARKET CROSSOVERS...]
                        <p className="text-[7px] mt-1">Make sure "ACTIVATE AUTOTRADE" is enabled on the left panel to execute trades automatically.</p>
                      </div>
                    ) : (
                      automationLogs.map((log, idx) => (
                        <div key={idx} className="border-b border-white/5 pb-1">
                          {log}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Buy Alert Popup Dialog */}
      <BuyAlertPopup alert={activeBuyAlert} onClose={() => setActiveBuyAlert(null)} />
    </div>
  );
}
