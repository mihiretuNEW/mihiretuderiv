export interface CandleData {
  epoch: number; // Unix timestamp
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface GTATrendResult {
  colorState: 0 | 1 | 2; // 0=Green(Bullish), 1=Red(Bearish), 2=Yellow(Neutral)
  sellArrow: number | null; // Value to plot arrow ABOVE candle
  buyArrow: number | null;  // Value to plot arrow BELOW candle
}

export function calculateGTATrend(data: CandleData[], longPeriod = 21, midPeriod = 13, shortPeriod = 6): GTATrendResult[] {
  const closePrices = data.map(d => d.close);
  const emaLong = calculateEMA(closePrices, longPeriod);
  const emaMid = calculateEMA(closePrices, midPeriod);
  const emaShort = calculateEMA(closePrices, shortPeriod);

  const results: GTATrendResult[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (isNaN(emaLong[i]) || isNaN(emaMid[i]) || isNaN(emaShort[i])) {
      results.push({ colorState: 2, sellArrow: null, buyArrow: null });
      continue;
    }
    
    // Trend condition checking
    const eL = emaLong[i];
    const eM = emaMid[i];
    const eS = emaShort[i];
    
    let state: 0 | 1 | 2 = 2; // neutral
    if (eS > eM && eM > eL) {
      state = 0; // Bullish
    } else if (eS < eM && eM < eL) {
      state = 1; // Bearish
    }
    
    // Arrows triggers: when crossing into state = 0 from non-0 -> Buy
    let buyArrow = null;
    let sellArrow = null;
    if (i > 0) {
      const prevRes = results[i - 1];
      if (state === 0 && prevRes.colorState !== 0) {
        buyArrow = data[i].low - (data[i].high - data[i].low) * 0.1; // Below bar
      } else if (state === 1 && prevRes.colorState !== 1) {
        sellArrow = data[i].high + (data[i].high - data[i].low) * 0.1; // Above bar
      }
    }
    
    results.push({ colorState: state, sellArrow, buyArrow });
  }
  
  return results;
}

export interface SimpleScalpingResult {
  ribbonColor: 'green' | 'red';
}

export function calculateSimpleScalping(data: CandleData[], lookback = 6, emaInput = 4, lookbackHl = 2): SimpleScalpingResult[] {
  const results: SimpleScalpingResult[] = [];
  const closes = data.map(d => d.close);
  const myEma = calculateEMA(closes, emaInput);
  
  // Implementation of simple scalping ribbon state logic based on inputs.
  // Generally ribbon changes state based on fast EMA versus a trailing line.
  // Assuming a smoothed median based on lookback.
  const mySma = calculateSMA(closes, lookback);
  
  for (let i = 0; i < data.length; i++) {
    if (isNaN(myEma[i]) || isNaN(mySma[i])) {
      results.push({ ribbonColor: 'green' }); // Default
      continue;
    }
    const color = myEma[i] > mySma[i] ? 'green' : 'red';
    results.push({ ribbonColor: color });
  }
  return results;
}


export function calculateEMA(data: number[], period: number): number[] {
  if (!data || data.length === 0 || period <= 0) return [];
  const k = 2 / (period + 1);
  const emaArray: number[] = new Array(data.length).fill(NaN);
  
  let firstValidIdx = data.findIndex(d => !isNaN(d));
  if (firstValidIdx === -1) return emaArray;

  let ema = data[firstValidIdx];
  emaArray[firstValidIdx] = ema;
  
  for (let i = firstValidIdx + 1; i < data.length; i++) {
    if (isNaN(data[i])) {
      emaArray[i] = NaN;
    } else {
      ema = (data[i] - ema) * k + ema;
      emaArray[i] = ema;
    }
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

export function calculateWMA(data: number[], period: number): number[] {
  const wmaArray: number[] = [];
  const denominator = (period * (period + 1)) / 2;

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      wmaArray.push(NaN);
      continue;
    }
    let sum = 0;
    for (let j = 0; j < period; j++) {
      const weight = period - j;
      sum += data[i - j] * weight;
    }
    wmaArray.push(sum / denominator);
  }
  return wmaArray;
}

export function calculateATR(data: CandleData[], period = 100): number[] {
  const tr: number[] = [];
  const atr: number[] = [];

  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      tr.push(data[i].high - data[i].low);
      atr.push(NaN);
      continue;
    }
    const high = data[i].high;
    const low = data[i].low;
    const prevClose = data[i - 1].close;

    const trValue = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    tr.push(trValue);

    if (i < period - 1) {
      atr.push(NaN);
    } else if (i === period - 1) {
      // First ATR is SMA of TR
      const sum = tr.slice(0, period).reduce((a, b) => a + b, 0);
      atr.push(sum / period);
    } else {
      // Smoothed moving average for ATR
      const prevAtr = atr[i - 1];
      atr.push((prevAtr * (period - 1) + trValue) / period);
    }
  }

  return atr;
}

export function calculateATRFibEnvelopes(data: CandleData[], wmaPeriod = 100, atrPeriod = 100, atrMultiplier = 3) {
  const closes = data.map(d => d.close);
  const wma = calculateWMA(closes, wmaPeriod);
  const atr = calculateATR(data, atrPeriod);

  const upper50: number[] = [];
  const upper618: number[] = [];
  const upper786: number[] = [];
  const lower50: number[] = [];
  const lower618: number[] = [];
  const lower786: number[] = [];
  const bullish: boolean[] = [];

  for (let i = 0; i < data.length; i++) {
    if (isNaN(wma[i]) || isNaN(atr[i])) {
      upper50.push(NaN);
      upper618.push(NaN);
      upper786.push(NaN);
      lower50.push(NaN);
      lower618.push(NaN);
      lower786.push(NaN);
      bullish.push(closes[i] > (wma[i] || 0)); // fallback if needed, but condition handles NaN
      continue;
    }
    
    // Trend condition
    bullish.push(closes[i] > wma[i]);

    const atrBand = atr[i] * atrMultiplier;
    upper50.push(wma[i] + atrBand * 0.5);
    upper618.push(wma[i] + atrBand * 0.618);
    upper786.push(wma[i] + atrBand * 0.786);

    lower50.push(wma[i] - atrBand * 0.5);
    lower618.push(wma[i] - atrBand * 0.618);
    lower786.push(wma[i] - atrBand * 0.786);
  }

  return {
    wma,
    bullish,
    upper50,
    upper618,
    upper786,
    lower50,
    lower618,
    lower786
  };
}

export function calculateZLEMA(data: number[], period: number): number[] {
  const lag = Math.floor((period - 1) / 2);
  const adjustedData: number[] = new Array(data.length).fill(NaN);
  for (let i = lag; i < data.length; i++) {
    if (!isNaN(data[i]) && !isNaN(data[i - lag])) {
      adjustedData[i] = data[i] + (data[i] - data[i - lag]);
    } else {
      adjustedData[i] = data[i]; // Fallback to raw data if lag not available but current is (e.g., handles start of array if we want, but better to keep NaN if we want strict)
    }
  }
  // To avoid entirely NaN array if strictly lag-based, we can just use regular EMA initialization
  return calculateEMA(adjustedData, period);
}

export function calculateZMACD(data: CandleData[], fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  const closes = data.map(d => d.close);
  const fastZlema = calculateZLEMA(closes, fastPeriod);
  const slowZlema = calculateZLEMA(closes, slowPeriod);
  
  const macd: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (isNaN(fastZlema[i]) || isNaN(slowZlema[i])) {
      macd.push(NaN);
    } else {
      macd.push(fastZlema[i] - slowZlema[i]);
    }
  }
  
  const signal = calculateZLEMA(macd, signalPeriod);
  const histogram: number[] = [];
  for (let i = 0; i < data.length; i++) {
    histogram.push(isNaN(macd[i]) || isNaN(signal[i]) ? NaN : macd[i] - signal[i]);
  }
  
  return { macd, signal, histogram };
}

export function calculateStandardSMI(data: CandleData[], qPeriod = 14, rPeriod = 25, sPeriod = 2, signalPeriod = 9) {
  const diffs: number[] = new Array(data.length).fill(NaN);
  const hls: number[] = new Array(data.length).fill(NaN);
  
  for (let i = 0; i < data.length; i++) {
    if (i < qPeriod - 1) continue;
    
    let hh = -Infinity;
    let ll = Infinity;
    for (let j = 0; j < qPeriod; j++) {
      const c = data[i - j];
      if (c.high > hh) hh = c.high;
      if (c.low < ll) ll = c.low;
    }
    
    const cm = (hh + ll) / 2;
    diffs[i] = data[i].close - cm;
    hls[i] = hh - ll;
  }
  
  const dEma1 = calculateEMA(diffs, rPeriod);
  const dEma2 = calculateEMA(dEma1, sPeriod);
  
  const hlEma1 = calculateEMA(hls, rPeriod);
  const hlEma2 = calculateEMA(hlEma1, sPeriod);
  
  const smi = [];
  for (let i = 0; i < data.length; i++) {
    if (isNaN(dEma2[i]) || isNaN(hlEma2[i]) || hlEma2[i] === 0) {
      smi.push(NaN);
    } else {
      smi.push(100 * (dEma2[i] / (hlEma2[i] / 2)));
    }
  }
  
  const signal = calculateEMA(smi, signalPeriod);
  return { smi, signal };
}

export function calculateMAEnvelope(data: CandleData[], period = 20, percent = 5) {
  const closes = data.map(d => d.close);
  const sma = calculateSMA(closes, period);
  const upper = [];
  const lower = [];
  
  for (let i = 0; i < data.length; i++) {
    if (isNaN(sma[i])) {
      upper.push(NaN);
      lower.push(NaN);
    } else {
      upper.push(sma[i] * (1 + percent / 100));
      lower.push(sma[i] * (1 - percent / 100));
    }
  }
  
  return { sma, upper, lower };
}

export function calculateTwoPole(data: CandleData[], period = 14) {
  const closes = data.map(d => d.close);
  
  const sma = calculateSMA(closes, period);
  const deviations: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (isNaN(sma[i])) {
      deviations.push(NaN);
    } else {
      deviations.push(closes[i] - sma[i]);
    }
  }
  
  const rollingHighestDev: number[] = [];
  for(let i=0; i<data.length; i++){
    if(i < period - 1 || isNaN(deviations[i])) {
      rollingHighestDev.push(NaN);
    } else {
      let maxD = 0.0000000001;
      for(let j=0; j<period; j++){
        maxD = Math.max(maxD, Math.abs(deviations[i-j]));
      }
      rollingHighestDev.push(maxD);
    }
  }

  const normDev = deviations.map((d, i) => isNaN(rollingHighestDev[i]) ? NaN : d / rollingHighestDev[i]);

  const ema1 = calculateEMA(normDev, period);
  const oscillator = calculateEMA(ema1, period); 

  const signalPeriod = Math.max(Math.floor(period / 2), 2);
  const signal = calculateEMA(oscillator, signalPeriod);
  
  const bullishCrossover: boolean[] = [];
  const bearishCrossover: boolean[] = [];
  const invalidationLine: (number | null)[] = new Array(data.length).fill(null);
  const invalidatedFlags: boolean[] = new Array(data.length).fill(false);

  let currentInvalidationValue: number | null = null;
  let currentSignalType: 'bull' | 'bear' | null = null;
  
  for (let i = 1; i < data.length; i++) {
    if (isNaN(oscillator[i]) || isNaN(signal[i]) || isNaN(oscillator[i - 1]) || isNaN(signal[i - 1])) {
      bullishCrossover.push(false);
      bearishCrossover.push(false);
      continue;
    }

    const isBullCross = oscillator[i] > signal[i] && oscillator[i - 1] <= signal[i - 1] && oscillator[i] < 0.5;
    const isBearCross = oscillator[i] < signal[i] && oscillator[i - 1] >= signal[i - 1] && oscillator[i] > -0.5;

    bullishCrossover.push(isBullCross);
    bearishCrossover.push(isBearCross);
    
    if (isBullCross) {
      currentInvalidationValue = data[i].low;
      currentSignalType = 'bull';
    } else if (isBearCross) {
      currentInvalidationValue = data[i].high;
      currentSignalType = 'bear';
    }

    if (currentInvalidationValue !== null) {
      invalidationLine[i] = currentInvalidationValue;
      
      if (currentSignalType === 'bull' && data[i].close < currentInvalidationValue) {
        invalidatedFlags[i] = true;
        currentInvalidationValue = null;
        currentSignalType = null;
      } else if (currentSignalType === 'bear' && data[i].close > currentInvalidationValue) {
        invalidatedFlags[i] = true;
        currentInvalidationValue = null;
        currentSignalType = null;
      }
    }
  }
  
  bullishCrossover.unshift(false);
  bearishCrossover.unshift(false);

  return { oscillator, signal, bullishCrossover, bearishCrossover, invalidationLine, invalidatedFlags };
}

export function calculateMSMT(data: CandleData[], atrPeriod = 14, atrMult = 3.0, leftBars = 5, rightBars = 5) {
  const atr = calculateATR(data, atrPeriod);
  
  const isSwingHigh = new Array(data.length).fill(false);
  const isSwingLow = new Array(data.length).fill(false);
  
  for (let i = leftBars + rightBars; i < data.length; i++) {
    const pivotIdx = i - rightBars;
    let highOk = true;
    let lowOk = true;
    for (let j = 1; j <= leftBars; j++) {
      if (data[pivotIdx - j].high >= data[pivotIdx].high) highOk = false;
      if (data[pivotIdx - j].low <= data[pivotIdx].low) lowOk = false;
    }
    for (let j = 1; j <= rightBars; j++) {
      if (data[pivotIdx + j].high > data[pivotIdx].high) highOk = false;
      if (data[pivotIdx + j].low < data[pivotIdx].low) lowOk = false;
    }
    isSwingHigh[pivotIdx] = highOk;
    isSwingLow[pivotIdx] = lowOk;
  }
  
  const trailingLine: (number | null)[] = new Array(data.length).fill(null);
  const trailingDir: (1 | -1 | null)[] = new Array(data.length).fill(null);
  const chochLine: ('bull' | 'bear' | null)[] = new Array(data.length).fill(null);
  const activeTargets: { price: number, level: number, breakoutPrice: number }[][] = new Array(data.length).fill([]);
  
  let trend: 1 | -1 | null = null;
  let lastSwingHigh: number | null = null;
  let lastSwingLow: number | null = null;
  
  let currentTrailingLine: number | null = null;
  let currentTargets: { price: number, level: number, breakoutPrice: number }[] = [];
  let maxTargetLevelActive = 0;
  let targetStepDist = 0;
  
  for (let i = 0; i < data.length; i++) {
    // Check if rightBars ago was a swing, so we only know it NOW
    if (i >= rightBars) {
      const checkIdx = i - rightBars;
      if (isSwingHigh[checkIdx]) {
        lastSwingHigh = data[checkIdx].high;
      }
      if (isSwingLow[checkIdx]) {
        lastSwingLow = data[checkIdx].low;
      }
    }
    
    // Check CHoCH
    let chochTriggered = false;
    if (trend === null) {
      if (lastSwingLow !== null && data[i].close < lastSwingLow) {
        trend = -1;
        chochLine[i] = 'bear';
        chochTriggered = true;
      } else if (lastSwingHigh !== null && data[i].close > lastSwingHigh) {
        trend = 1;
        chochLine[i] = 'bull';
        chochTriggered = true;
      }
    } else if (trend === 1) {
      if (lastSwingLow !== null && data[i].close < lastSwingLow) {
        trend = -1;
        chochLine[i] = 'bear';
        chochTriggered = true;
      }
    } else if (trend === -1) {
      if (lastSwingHigh !== null && data[i].close > lastSwingHigh) {
        trend = 1;
        chochLine[i] = 'bull';
        chochTriggered = true;
      }
    }
    
    // Setup targets and reset trailing line on ChoCH
    if (chochTriggered) {
      const currentAtr = isNaN(atr[i]) ? (data[i].high - data[i].low) : atr[i];
      targetStepDist = currentAtr * atrMult;
      
      if (trend === 1) {
        // Bullish CHoCH -> trailing starts below
        currentTrailingLine = data[i].close - currentAtr * atrMult;
        currentTargets = [{ price: data[i].close + targetStepDist, level: 1, breakoutPrice: data[i].close }];
      } else {
        // Bearish CHoCH -> trailing starts above
        currentTrailingLine = data[i].close + currentAtr * atrMult;
        currentTargets = [{ price: data[i].close - targetStepDist, level: 1, breakoutPrice: data[i].close }];
      }
      maxTargetLevelActive = 1;
    } else {
      // Update trailing line
      const currentAtr = isNaN(atr[i]) ? 0 : atr[i];
      if (trend === 1) {
        const potentialLine = data[i].close - currentAtr * atrMult;
        if (currentTrailingLine === null) {
           currentTrailingLine = potentialLine;
        } else {
           currentTrailingLine = Math.max(currentTrailingLine, potentialLine);
        }
      } else if (trend === -1) {
        const potentialLine = data[i].close + currentAtr * atrMult;
        if (currentTrailingLine === null) {
           currentTrailingLine = potentialLine;
        } else {
           currentTrailingLine = Math.min(currentTrailingLine, potentialLine);
        }
      }
      
      // Check target progression
      if (trend === 1 && currentTargets.length > 0) {
        if (data[i].close >= currentTargets[currentTargets.length - 1].price) {
          maxTargetLevelActive++;
          currentTargets.push({ price: currentTargets[0].price + (maxTargetLevelActive - 1) * targetStepDist, level: maxTargetLevelActive, breakoutPrice: currentTargets[0].breakoutPrice });
        }
      } else if (trend === -1 && currentTargets.length > 0) {
        if (data[i].close <= currentTargets[currentTargets.length - 1].price) {
          maxTargetLevelActive++;
          currentTargets.push({ price: currentTargets[0].price - (maxTargetLevelActive - 1) * targetStepDist, level: maxTargetLevelActive, breakoutPrice: currentTargets[0].breakoutPrice });
        }
      }
    }
    
    trailingLine[i] = currentTrailingLine;
    trailingDir[i] = trend;
    activeTargets[i] = [...currentTargets];
  }
  
  return { trailingLine, trailingDir, chochLine, activeTargets };
}

export function calculateUTBot(data: CandleData[], keyValue = 1, atrPeriod = 10) {
  const atr = calculateATR(data, atrPeriod);
  
  const trailingStop: (number | null)[] = new Array(data.length).fill(null);
  const trend: (1 | -1)[] = new Array(data.length).fill(1);
  const buySignal: boolean[] = new Array(data.length).fill(false);
  const sellSignal: boolean[] = new Array(data.length).fill(false);
  
  let prevTs = 0.0;
  let prevClose = 0.0;
  let currentTrend: 1 | -1 = 1;
  
  for (let i = 0; i < data.length; i++) {
    const close = data[i].close;
    if (i === 0 || isNaN(atr[i])) {
      const loss = isNaN(atr[i]) ? (data[i].high - data[i].low) * keyValue : atr[i] * keyValue;
      trailingStop[i] = close - loss;
      prevTs = trailingStop[i] as number;
      prevClose = close;
      continue;
    }
    
    const loss = atr[i] * keyValue;
    let ts = 0;
    
    if (close > prevTs && prevClose > prevTs) {
      ts = Math.max(prevTs, close - loss);
    } else if (close < prevTs && prevClose < prevTs) {
      ts = Math.min(prevTs, close + loss);
    } else if (close > prevTs) {
      ts = close - loss;
    } else {
      ts = close + loss;
    }
    
    trailingStop[i] = ts;
    
    if (close < ts && prevClose > prevTs) {
      currentTrend = -1;
    } else if (close > ts && prevClose < prevTs) {
      currentTrend = 1;
    }
    
    trend[i] = currentTrend;
    
    if (i > 0 && trend[i] !== trend[i-1]) {
      if (currentTrend === 1) {
        buySignal[i] = true;
      } else if (currentTrend === -1) {
        sellSignal[i] = true;
      }
    }
    
    prevTs = ts;
    prevClose = close;
  }
  
  return { trailingStop, trend, buySignal, sellSignal };
}

export function calculateWAE(data: CandleData[], sensitivity = 150, fastPeriod = 20, slowPeriod = 40, channelPeriod = 20, mult = 2.0) {
  const closes = data.map(d => d.close);
  const emaFast = calculateEMA(closes, fastPeriod);
  const emaSlow = calculateEMA(closes, slowPeriod);
  const bb = calculateBollingerBands(data, channelPeriod, mult);
  const atr = calculateATR(data, 20); // Fixed 20 period based on specs

  const waeForce: (number | null)[] = new Array(data.length).fill(null);
  const waeColor: (number | null)[] = new Array(data.length).fill(null); // 1 = Green, -1 = Red, null = none
  const waeExplosion: (number | null)[] = new Array(data.length).fill(null);
  const waeDeadZone: (number | null)[] = new Array(data.length).fill(null);
  const waeBuySignal: boolean[] = new Array(data.length).fill(false);
  const waeSellSignal: boolean[] = new Array(data.length).fill(false);

  for (let i = 1; i < data.length; i++) {
    if (isNaN(emaFast[i]) || isNaN(emaSlow[i]) || isNaN(emaFast[i-1]) || isNaN(emaSlow[i-1])) continue;
    
    const trend1 = emaFast[i] - emaSlow[i];
    const trend2 = emaFast[i-1] - emaSlow[i-1];
    const diff = (trend1 - trend2) * sensitivity;

    if (!isNaN(bb.upper[i]) && !isNaN(bb.lower[i])) {
      waeExplosion[i] = bb.upper[i] - bb.lower[i];
    }

    if (!isNaN(atr[i])) {
      waeDeadZone[i] = atr[i] * 0.7;
    }

    if (diff >= 0) {
      waeForce[i] = diff;
      waeColor[i] = 1; // Green
    } else {
      waeForce[i] = -diff;
      waeColor[i] = -1; // Red
    }

    const exp = waeExplosion[i] ?? 0;
    const dz = waeDeadZone[i] ?? 0;

    if (waeColor[i] === 1 && waeForce[i]! > exp && waeForce[i]! > dz) {
      waeBuySignal[i] = true;
    }

    if (waeColor[i] === -1 && waeForce[i]! > exp && waeForce[i]! > dz) {
      waeSellSignal[i] = true;
    }
  }

  return { waeForce, waeColor, waeExplosion, waeDeadZone, waeBuySignal, waeSellSignal };
}

export function calculateNWEnv(data: CandleData[], h = 8, mult = 3.0) {

  const base: (number | null)[] = new Array(data.length).fill(null);
  const upper: (number | null)[] = new Array(data.length).fill(null);
  const lower: (number | null)[] = new Array(data.length).fill(null);
  const buySignal: boolean[] = new Array(data.length).fill(false);
  const sellSignal: boolean[] = new Array(data.length).fill(false);
  const windowSize = Math.max(100, h * 5); // Limit lookback to prevent O(N^2)

  const maeArr: number[] = new Array(data.length).fill(0);

  // Pass 1: Calculate Base and MAE
  for (let i = 0; i < data.length; i++) {
    const t = i;
    let sumW = 0;
    let sumSW = 0;

    const start = Math.max(0, i - windowSize);
    for (let j = start; j <= i; j++) {
      const w = Math.exp(-Math.pow(i - j, 2) / (2 * h * h));
      sumW += w;
      sumSW += w * data[j].close;
    }

    base[i] = sumSW / sumW;
    maeArr[i] = Math.abs(data[i].close - base[i]!);
  }

  // Pass 2: Smooth MAE and calculate bands + signals
  for (let i = 0; i < data.length; i++) {
    const t = i;
    let sumW = 0;
    let sumMAE = 0;

    const start = Math.max(0, i - windowSize);
    for (let j = start; j <= i; j++) {
      const w = Math.exp(-Math.pow(i - j, 2) / (2 * h * h));
      sumW += w;
      sumMAE += w * maeArr[j];
    }

    const smoothedMAE = sumMAE / sumW;
    upper[i] = base[i]! + smoothedMAE * mult;
    lower[i] = base[i]! - smoothedMAE * mult;
    
    // Signal Generation
    // Buy Signal: Close crosses from outside below the Lower Band back inside above the Lower Band (close > lower and prevClose < prevLower)
    // Sell Signal: Close crosses from outside above the Upper Band back inside below the Upper Band (close < upper and prevClose > prevUpper)
    if (i > 0) {
      if (data[i].close > lower[i]! && data[i-1].close < lower[i-1]!) {
        buySignal[i] = true;
      }
      if (data[i].close < upper[i]! && data[i-1].close > upper[i-1]!) {
        sellSignal[i] = true;
      }
    }
  }

  return { base, upper, lower, buySignal, sellSignal };
}

export function calculateTrendlinesWithBreaks(data: CandleData[], length = 14, mult = 1.0) {
  const results = data.map(() => ({ 
    upper: null as number | null, 
    lower: null as number | null 
  }));

  const stdevs = new Float64Array(data.length);
  let sum = 0;
  let sumSq = 0;

  for (let i = 0; i < data.length; i++) {
    const c = data[i].close;
    sum += c;
    sumSq += c * c;

    if (i >= length) {
      const oldC = data[i - length].close;
      sum -= oldC;
      sumSq -= oldC * oldC;
    }

    if (i >= length - 1) {
      const mean = sum / length;
      const variance = (sumSq / length) - (mean * mean);
      stdevs[i] = Math.sqrt(Math.max(0, variance));
    }
  }

  let currentUpper: number | null = null;
  let currentLower: number | null = null;
  let upSlope = 0;
  let dnSlope = 0;

  for (let i = 0; i < data.length; i++) {
    const pivotIdx = i - length;
    let isPh = false;
    let isPl = false;
    let phVal = 0;
    let plVal = 0;

    if (pivotIdx >= length) {
      const highCandidate = data[pivotIdx].high;
      let isPeak = true;
      for (let j = i - 2 * length; j <= i; j++) {
        if (j < pivotIdx && data[j].high > highCandidate) {
          isPeak = false; break;
        }
        if (j > pivotIdx && data[j].high >= highCandidate) {
          isPeak = false; break;
        }
      }
      if (isPeak) {
        isPh = true;
        phVal = highCandidate;
      }

      const lowCandidate = data[pivotIdx].low;
      let isDip = true;
      for (let j = i - 2 * length; j <= i; j++) {
        if (j < pivotIdx && data[j].low < lowCandidate) {
          isDip = false; break;
        }
        if (j > pivotIdx && data[j].low <= lowCandidate) {
          isDip = false; break;
        }
      }
      if (isDip) {
        isPl = true;
        plVal = lowCandidate;
      }
    }

    const currentSlope = (stdevs[i] * mult) / length;

    if (isPh) {
      upSlope = currentSlope;
      currentUpper = phVal - length * upSlope;
      if (pivotIdx > 0) results[pivotIdx - 1].upper = null; // visual break
      for (let k = 0; k <= length; k++) {
        results[pivotIdx + k].upper = phVal - k * upSlope;
      }
    } else if (currentUpper !== null) {
      currentUpper -= upSlope;
      results[i].upper = currentUpper;
    }

    if (isPl) {
      dnSlope = currentSlope;
      currentLower = plVal + length * dnSlope;
      if (pivotIdx > 0) results[pivotIdx - 1].lower = null; // visual break
      for (let k = 0; k <= length; k++) {
        results[pivotIdx + k].lower = plVal + k * dnSlope;
      }
    } else if (currentLower !== null) {
      currentLower += dnSlope;
      results[i].lower = currentLower;
    }
  }

  return results;
}

export function calculateOrderBlocks(
  data: CandleData[],
  volumePivotLength: number = 5,
  maxBullishOb: number = 3,
  maxBearishOb: number = 3,
  mitigationMethod: "wick" | "close" = "wick"
) {
  const results = data.map(() => ({
    bull_ob_top: Array(maxBullishOb).fill(null),
    bull_ob_bottom: Array(maxBullishOb).fill(null),
    bear_ob_top: Array(maxBearishOb).fill(null),
    bear_ob_bottom: Array(maxBearishOb).fill(null),
  }));

  if (data.length < volumePivotLength * 2 + 1) return results;

  interface OB {
    startIndex: number;
    breakoutIndex: number;
    endIndex: number;
    top: number;
    bottom: number;
  }

  const bullOBs: OB[] = [];
  const bearOBs: OB[] = [];

  for (let p = volumePivotLength; p < data.length - volumePivotLength; p++) {
    // 1. Identify volume peaks (pivot)
    let isPeak = true;
    for (let j = p - volumePivotLength; j <= p + volumePivotLength; j++) {
      if (j !== p && (data[j].volume || 0) >= (data[p].volume || 0)) {
        isPeak = false;
        break;
      }
    }
    if (!isPeak) continue;

    // 2. Breakout Confirmation
    let breakoutIndex = -1;
    let type: 'bull' | 'bear' | null = null;
    let top = 0;
    let bottom = 0;

    for (let i = p + 1; i < data.length; i++) {
      if (data[i].close > data[p].high) {
        breakoutIndex = i;
        type = 'bull';
        top = (data[p].high + data[p].low) / 2;
        bottom = data[p].low;
        break;
      } else if (data[i].close < data[p].low) {
        breakoutIndex = i;
        type = 'bear';
        top = data[p].high;
        bottom = (data[p].high + data[p].low) / 2;
        break;
      }
    }

    if (breakoutIndex !== -1 && type) {
      // 3. Track Mitigation (Must survive unmitigated until breakout to be valid)
      let mitigationIndex = data.length - 1;
      let valid = true;
      for (let i = p + 1; i < data.length; i++) {
        let mitigated = false;
        if (type === 'bull') {
          mitigated = mitigationMethod === "wick" ? data[i].low <= top : data[i].close < bottom;
        } else {
          mitigated = mitigationMethod === "wick" ? data[i].high >= bottom : data[i].close > top;
        }
        
        if (mitigated) {
          if (i < breakoutIndex) valid = false;
          mitigationIndex = i;
          break;
        }
      }

      if (valid) {
        if (type === 'bull') bullOBs.push({ startIndex: p, breakoutIndex, endIndex: mitigationIndex, top, bottom });
        else bearOBs.push({ startIndex: p, breakoutIndex, endIndex: mitigationIndex, top, bottom });
      }
    }
  }

  const assignLanes = (obs: OB[], maxLanes: number, topKey: 'bull_ob_top' | 'bear_ob_top', bottomKey: 'bull_ob_bottom' | 'bear_ob_bottom') => {
    let currentLaneOBs: (OB | null)[] = Array(maxLanes).fill(null);
    for (let i = 0; i < data.length; i++) {
        for (let l = 0; l < maxLanes; l++) {
            if (currentLaneOBs[l] && currentLaneOBs[l]!.endIndex < i) {
                currentLaneOBs[l] = null;
            }
        }

        const startingOBs = obs.filter(ob => ob.startIndex === i);
        for (const newOb of startingOBs) {
            let placed = false;
            for (let l = 0; l < maxLanes; l++) {
                if (!currentLaneOBs[l]) {
                    currentLaneOBs[l] = newOb;
                    placed = true;
                    break;
                }
            }
            if (!placed) {
                let oldestLane = 0;
                let oldestStart = Infinity;
                for (let l = 0; l < maxLanes; l++) {
                    if (currentLaneOBs[l]!.startIndex < oldestStart) {
                        oldestStart = currentLaneOBs[l]!.startIndex;
                        oldestLane = l;
                    }
                }
                currentLaneOBs[oldestLane] = newOb;
            }
        }
        
        for (let l = 0; l < maxLanes; l++) {
            if (currentLaneOBs[l]) {
                results[i][topKey][l] = currentLaneOBs[l]!.top;
                results[i][bottomKey][l] = currentLaneOBs[l]!.bottom;
            }
        }
    }
  };

  assignLanes(bullOBs, maxBullishOb, 'bull_ob_top', 'bull_ob_bottom');
  assignLanes(bearOBs, maxBearishOb, 'bear_ob_top', 'bear_ob_bottom');

  return results;
}

export function calculateCorrelatedSineOscillator(
  data: CandleData[],
  cyclePeriod: number = 20,
  phaseMultiplier: number = 1.0,
  showSignals: boolean = true
) {
  const results = data.map(() => ({
    oscillator: 0,
    buySignal: null as number | null,
    sellSignal: null as number | null,
  }));

  const detrended = new Float64Array(data.length);
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i].close;
    if (i >= cyclePeriod) sum -= data[i - cyclePeriod].close;
    const count = Math.min(i + 1, cyclePeriod);
    const sma = sum / count;
    detrended[i] = data[i].close - sma;
  }

  const omega = (2 * Math.PI) / cyclePeriod;
  const cosOmega = Math.cos(omega);
  const sinOmega = Math.sin(omega);

  let prevR = 0;
  let prevI = 0;

  for (let i = 0; i < data.length; i++) {
    const x_i = detrended[i];
    const x_i_P = i >= cyclePeriod ? detrended[i - cyclePeriod] : 0;
    
    const R_i = prevR * cosOmega - prevI * sinOmega + x_i - x_i_P;
    const I_i = prevR * sinOmega + prevI * cosOmega;
    
    prevR = R_i;
    prevI = I_i;
    
    const phaseAngle = Math.atan2(I_i, R_i) * phaseMultiplier;
    const sineOscillator = Math.sin(phaseAngle);
    
    results[i].oscillator = sineOscillator;
    
    if (i > 0 && showSignals) {
      const prevObs = results[i - 1].oscillator;
      if (prevObs <= 0 && sineOscillator > 0) {
        results[i].buySignal = 1; 
      } else if (prevObs >= 0 && sineOscillator < 0) {
        results[i].sellSignal = -1;
      }
    }
  }

  return results;
}