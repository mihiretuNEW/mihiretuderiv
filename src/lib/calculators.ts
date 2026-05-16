export interface CandleData {
  epoch: number; // Unix timestamp
  open: number;
  high: number;
  low: number;
  close: number;
}

export function calculateEMA(data: number[], period: number): number[] {
  if (!data || data.length === 0 || period <= 0) return [];
  const k = 2 / (period + 1);
  const emaArray: number[] = [];
  
  let ema = data[0];
  emaArray.push(ema);
  
  for (let i = 1; i < data.length; i++) {
    ema = (data[i] - ema) * k + ema;
    emaArray.push(ema);
  }
  return emaArray;
}

export function calculateSMA(data: number[], period: number): number[] {
  const smaArray: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      smaArray.push(NaN);
      continue;
    }
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j];
    }
    smaArray.push(sum / period);
  }
  return smaArray;
}

export function calculateSMI(data: CandleData[], longPeriod = 20, shortPeriod = 5, signalPeriod = 5) {
  if (data.length === 0) return { smi: [], signal: [] };
  
  const diffs = data.map((d, i) => i === 0 ? 0 : d.close - data[i - 1].close);
  const absDiffs = diffs.map(Math.abs);
  
  const emaDiff1 = calculateEMA(diffs, longPeriod);
  const emaDiff2 = calculateEMA(emaDiff1, shortPeriod);
  
  const emaAbsDiff1 = calculateEMA(absDiffs, longPeriod);
  const emaAbsDiff2 = calculateEMA(emaAbsDiff1, shortPeriod);
  
  const smi = [];
  for (let i = 0; i < data.length; i++) {
    if (emaAbsDiff2[i] === 0) {
      smi.push(0);
    } else {
      smi.push(100 * (emaDiff2[i] / (0.5 * emaAbsDiff2[i]))); // Standard SMI formula uses 0.5 * EMA_ABS or standard TSI is without 0.5. Let's use standard TSI formula * 100
      // Adjusted formula to typical SMI: 100 * (EMA2(Close-PrevClose) / EMA2(|Close-PrevClose|)).
      // Wait, standard SMI is typically bounded -100 to 100.
    }
  }
  
  // Recompute with exact TSI / SMI Ergodic formula
  const smiFinal = emaDiff2.map((val, i) => emaAbsDiff2[i] === 0 ? 0 : 100 * (val / emaAbsDiff2[i]));
  const signal = calculateEMA(smiFinal, signalPeriod);
  
  return { smi: smiFinal, signal };
}

export function calculateRSI(data: CandleData[], period = 14): number[] {
  const rsi: number[] = [];
  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      rsi.push(NaN);
      continue;
    }
    const change = data[i].close - data[i - 1].close;
    const gain = Math.max(0, change);
    const loss = Math.max(0, -change);

    if (i < period) {
      avgGain += gain;
      avgLoss += loss;
      rsi.push(NaN);
      if (i === period - 1) {
        avgGain /= period;
        avgLoss /= period;
      }
    } else if (i === period) {
      let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      rsi.push(avgLoss === 0 ? 100 : 100 - (100 / (1 + rs)));
    } else {
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
      let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      rsi.push(avgLoss === 0 ? 100 : 100 - (100 / (1 + rs)));
    }
  }
  return rsi;
}

export function calculateBollingerBands(data: CandleData[], period = 20, multiplier = 2) {
  const values = data.map(d => d.close);
  const sma = calculateSMA(values, period);
  const upper = [];
  const lower = [];

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      upper.push(NaN);
      lower.push(NaN);
      continue;
    }
    let variance = 0;
    for (let j = 0; j < period; j++) {
      variance += Math.pow(values[i - j] - sma[i], 2);
    }
    const stdev = Math.sqrt(variance / period);
    upper.push(sma[i] + multiplier * stdev);
    lower.push(sma[i] - multiplier * stdev);
  }
  
  return { sma, upper, lower };
}

export function calculateParabolicSAR(data: CandleData[], step = 0.02, maxStep = 0.2): number[] {
  const sar: number[] = new Array(data.length).fill(NaN);
  if (data.length < 2) return sar;

  let isLong = true; // Assume long initially
  let af = step;
  let ep = data[0].high;
  sar[0] = data[0].low; // Start SAR at low of first candle

  for (let i = 1; i < data.length; i++) {
    const prevSAR = sar[i-1];
    
    // Calculate current SAR
    sar[i] = prevSAR + af * (ep - prevSAR);

    if (isLong) {
      if (data[i].low < sar[i]) {
        // Switch to short
        isLong = false;
        sar[i] = ep;
        ep = data[i].low;
        af = step;
      } else {
        if (data[i].high > ep) {
          ep = data[i].high;
          af = Math.min(af + step, maxStep);
        }
      }
    } else {
      if (data[i].high > sar[i]) {
        // Switch to long
        isLong = true;
        sar[i] = ep;
        ep = data[i].high;
        af = step;
      } else {
        if (data[i].low < ep) {
          ep = data[i].low;
          af = Math.min(af + step, maxStep);
        }
      }
    }
  }
  return sar;
}

export function calculateStochRSI(data: CandleData[], rsiPeriod = 14, stochPeriod = 14, kPeriod = 3, dPeriod = 3) {
  const rsi = calculateRSI(data, rsiPeriod);
  const kValues: number[] = [];
  
  for (let i = 0; i < rsi.length; i++) {
    if (i < rsiPeriod + stochPeriod - 2 || isNaN(rsi[i])) {
      kValues.push(NaN);
      continue;
    }
    const window = rsi.slice(i - stochPeriod + 1, i + 1).filter(v => !isNaN(v));
    if (window.length < stochPeriod) {
      kValues.push(NaN);
      continue;
    }
    const minRsi = Math.min(...window);
    const maxRsi = Math.max(...window);
    const k = maxRsi === minRsi ? 50 : 100 * (rsi[i] - minRsi) / (maxRsi - minRsi);
    kValues.push(k);
  }
  
  // Smoothing with SMA (standard for StochRSI)
  const smoothK = calculateSMA(kValues, kPeriod);
  const smoothD = calculateSMA(smoothK, dPeriod);
  
  return { stochK: smoothK, stochD: smoothD };
}
