/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Black-Scholes Option Greeks & Market Analytics Utility

export interface OptionGreeks {
  delta: number;
  gamma: number;
  theta: number; // per day
  vega: number;  // per 1% IV change
  iv: number;    // %
}

export interface MarketAnalytics {
  pcr: number;
  maxPain: number;
  totalCallOI: number;
  totalPutOI: number;
  sentiment: "STRONG BULLISH" | "BULLISH" | "NEUTRAL" | "BEARISH" | "STRONG BEARISH";
}

/**
 * Standard Normal CDF approximation
 */
function normCDF(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  const p =
    d *
    t *
    (0.3193815 +
      t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x >= 0 ? 1 - p : p;
}

/**
 * Standard Normal PDF
 */
function normPDF(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

/**
 * Compute Black-Scholes approximate Greeks
 */
export function calculateOptionGreeks(
  spot: number,
  strike: number,
  isCall: boolean,
  daysToExpiry = 14,
  iv = 0.22
): OptionGreeks {
  const t = Math.max(0.001, daysToExpiry / 365);
  const r = 0.065; // Risk free interest rate (6.5%)
  const sigma = iv;

  const d1 =
    (Math.log(spot / strike) + (r + (sigma * sigma) / 2) * t) /
    (sigma * Math.sqrt(t));
  const d2 = d1 - sigma * Math.sqrt(t);

  const delta = isCall ? normCDF(d1) : normCDF(d1) - 1;
  const gamma = normPDF(d1) / (spot * sigma * Math.sqrt(t));
  const vega = (spot * normPDF(d1) * Math.sqrt(t)) / 100;

  let theta = 0;
  if (isCall) {
    theta =
      (-(spot * normPDF(d1) * sigma) / (2 * Math.sqrt(t)) -
        r * strike * Math.exp(-r * t) * normCDF(d2)) /
      365;
  } else {
    theta =
      (-(spot * normPDF(d1) * sigma) / (2 * Math.sqrt(t)) +
        r * strike * Math.exp(-r * t) * normCDF(-d2)) /
      365;
  }

  return {
    delta: parseFloat(delta.toFixed(3)),
    gamma: parseFloat(gamma.toFixed(4)),
    theta: parseFloat(theta.toFixed(2)),
    vega: parseFloat(vega.toFixed(2)),
    iv: Math.round(iv * 100)
  };
}

/**
 * Compute PCR & Max Pain strike from options chain data
 */
export function computeMarketAnalytics(chain: any[], spotPrice: number): MarketAnalytics {
  if (!chain || chain.length === 0) {
    return {
      pcr: 1.0,
      maxPain: spotPrice,
      totalCallOI: 0,
      totalPutOI: 0,
      sentiment: "NEUTRAL"
    };
  }

  let totalCallOI = 0;
  let totalPutOI = 0;

  chain.forEach((row) => {
    totalCallOI += row.callOI || 0;
    totalPutOI += row.putOI || 0;
  });

  const pcr = totalCallOI > 0 ? parseFloat((totalPutOI / totalCallOI).toFixed(2)) : 1.0;

  // Compute Max Pain
  let minPainValue = Infinity;
  let maxPainStrike = spotPrice;

  chain.forEach((targetRow) => {
    const k = targetRow.strikePrice;
    let totalPain = 0;
    chain.forEach((row) => {
      // Calls in pain if spot > strike
      if (k > row.strikePrice) {
        totalPain += (k - row.strikePrice) * (row.callOI || 0);
      }
      // Puts in pain if spot < strike
      if (k < row.strikePrice) {
        totalPain += (row.strikePrice - k) * (row.putOI || 0);
      }
    });
    if (totalPain < minPainValue) {
      minPainValue = totalPain;
      maxPainStrike = k;
    }
  });

  let sentiment: MarketAnalytics["sentiment"] = "NEUTRAL";
  if (pcr > 1.35) sentiment = "STRONG BULLISH";
  else if (pcr > 1.1) sentiment = "BULLISH";
  else if (pcr < 0.65) sentiment = "STRONG BEARISH";
  else if (pcr < 0.85) sentiment = "BEARISH";

  return {
    pcr,
    maxPain: maxPainStrike,
    totalCallOI,
    totalPutOI,
    sentiment
  };
}
