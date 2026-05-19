export interface CandleData {
  epoch: number; // Unix timestamp
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface LuxPivotLine {
  type: 'support' | 'resistance';
  idx: number;
  epoch: number;
  price: number;
  brokenIdx: number | null;
  brokenEpoch: number | null;
}

export function calculateLuxAlgoSR(data: CandleData[], leftBars: number, rightBars: number): LuxPivotLine[] {
  const lines: LuxPivotLine[] = [];
  if (!data || data.length < leftBars + rightBars + 1) return lines;

  for (let i = leftBars; i < data.length - rightBars; i++) {
    const currentHigh = data[i].high;
    const currentLow = data[i].low;
    
    // Check Resistance (Pivot High)
    let isPivotHigh = true;
    for (let j = 1; j <= leftBars; j++) {
      if (data[i - j].high >= currentHigh) { isPivotHigh = false; break; }
    }
    if (isPivotHigh) {
      for (let j = 1; j <= rightBars; j++) {
        if (data[i + j].high > currentHigh) { isPivotHigh = false; break; }
      }
    }
    
    // Check Support (Pivot Low)
    let isPivotLow = true;
    for (let j = 1; j <= leftBars; j++) {
      if (data[i - j].low <= currentLow) { isPivotLow = false; break; }
    }
    if (isPivotLow) {
      for (let j = 1; j <= rightBars; j++) {
        if (data[i + j].low < currentLow) { isPivotLow = false; break; }
      }
    }

    if (isPivotHigh) {
      lines.push({
        type: 'resistance',
        idx: i,
        epoch: data[i].epoch,
        price: currentHigh,
        brokenIdx: null,
        brokenEpoch: null
      });
    }

    if (isPivotLow) {
      lines.push({
        type: 'support',
        idx: i,
        epoch: data[i].epoch,
        price: currentLow,
        brokenIdx: null,
        brokenEpoch: null
      });
    }
  }

  // Detect breaks
  for (const line of lines) {
    const startCheck = line.idx + rightBars; 
    for (let k = startCheck; k < data.length; k++) {
      if (line.type === 'resistance') {
        if (data[k].close > line.price) {
          line.brokenIdx = k;
          line.brokenEpoch = data[k].epoch;
          break;
        }
      } else {
        if (data[k].close < line.price) {
          line.brokenIdx = k;
          line.brokenEpoch = data[k].epoch;
          break;
        }
      }
    }
  }

  return lines;
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

