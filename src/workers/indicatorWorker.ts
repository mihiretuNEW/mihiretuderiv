import {
  calculateSMA,
  calculateRSI,
  calculateBollingerBands,
  calculateParabolicSAR,
  calculateStochRSI,
  calculateATRFibEnvelopes,
  calculateMAEnvelope,
  calculateTwoPole,
  calculateMSMT,
  calculateUTBot,
  calculateNWEnv,
  calculateWAE,
  calculateSMI,
  calculateZMACD,
  calculateStandardSMI,
  calculateGTATrend,
  calculateSimpleScalping,
  calculateTrendlinesWithBreaks,
  calculateOrderBlocks,
  calculateCorrelatedSineOscillator
} from '../lib/calculators';

self.onmessage = (e: MessageEvent) => {
  const { type, payload, id } = e.data;
  
  if (type === 'CALCULATE_BOTTOM') {
    const { data, settings, activeIndicators } = payload;
    
    // Core indicators
    const gtaData = activeIndicators.GTA ? calculateGTATrend(data, settings.GTA_LONG, settings.GTA_MID, settings.GTA_SHORT) : null;
    const scalpingData = activeIndicators.SCALPING ? calculateSimpleScalping(data, settings.SCALPING_LOOKBACK, settings.SCALPING_EMA, settings.SCALPING_LOOKBACK_HL) : null;
    const trendlinesBreakData = activeIndicators.TRENDLINES_BREAKS ? calculateTrendlinesWithBreaks(data, settings.TRENDLINES_LENGTH || 14, settings.TRENDLINES_MULT || 1.0) : null;
    
    const maData = calculateSMA(data.map((d: any) => d.close), settings.MA_PERIOD);
    const rsiData = calculateRSI(data, settings.RSI_PERIOD);
    const bbData = calculateBollingerBands(data, settings.BB_PERIOD, settings.BB_MULT);
    const psarData = calculateParabolicSAR(data, settings.PSAR_STEP, settings.PSAR_MAX);
    const stochRsiData = calculateStochRSI(data, settings.STOCH_RSI_PERIOD, settings.STOCH_PERIOD, settings.STOCH_K, settings.STOCH_D);
    const atrFibData = activeIndicators.ATRFIBENV 
      ? calculateATRFibEnvelopes(data, settings.ATRFIB_WMA_PERIOD, settings.ATRFIB_ATR_PERIOD, settings.ATRFIB_MULTIPLIER)
      : null;
    const maEnvData = activeIndicators.MAENV
      ? calculateMAEnvelope(data, settings.MAENV_PERIOD, settings.MAENV_PERCENT)
      : null;
    const twoPoleData = activeIndicators.TWOPOLE
      ? calculateTwoPole(data, settings.TWOPOLE_FILTER_LENGTH)
      : null;
    const msmtData = activeIndicators.MSMT
      ? calculateMSMT(data, settings.MSMT_ATR_LENGTH, settings.MSMT_ATR_MULT, settings.MSMT_LEFT_BARS, settings.MSMT_RIGHT_BARS)
      : null;
    const utbotData = activeIndicators.UTBOT
      ? calculateUTBot(data, settings.UTBOT_KEYVALUE, settings.UTBOT_ATR_PERIOD)
      : null;
    const nwenvData = activeIndicators.NWENV
      ? calculateNWEnv(data, settings.NWENV_H, settings.NWENV_MULT)
      : null;
    const waeData = activeIndicators.WAE
      ? calculateWAE(data, settings.WAE_SENSITIVITY, settings.WAE_FAST, settings.WAE_SLOW, settings.WAE_CHANNEL, settings.WAE_MULT)
      : null;
    const csoData = activeIndicators.CSO
      ? calculateCorrelatedSineOscillator(data, settings.CSO_PERIOD, settings.CSO_MULT, settings.CSO_SHOW_SIGNALS)
      : null;
    const obData = activeIndicators.OB
      ? calculateOrderBlocks(data, settings.OB_PIVOT_LENGTH, settings.OB_MAX_BULL, settings.OB_MAX_BEAR, settings.OB_MITIGATION_METHOD as any)
      : null;

    self.postMessage({
      id,
      type: 'BOTTOM_RESULT',
      payload: {
        gtaData, scalpingData, trendlinesBreakData, maData, rsiData, bbData, psarData, stochRsiData, atrFibData, maEnvData, twoPoleData, msmtData, utbotData, nwenvData, waeData, csoData, obData
      }
    });
  } else if (type === 'CALCULATE_OSCILLATOR') {
    const { data, settings, oscType } = payload;
    let indData = null;
    if (oscType === 'SMI') indData = calculateSMI(data, settings.SMI_LONG, settings.SMI_SHORT, settings.SMI_SIGNAL);
    if (oscType === 'STOCHRSI') indData = calculateStochRSI(data, settings.STOCH_RSI_PERIOD, settings.STOCH_PERIOD, settings.STOCH_K, settings.STOCH_D);
    if (oscType === 'ZMACD') indData = calculateZMACD(data, settings.ZMACD_FAST, settings.ZMACD_SLOW, settings.ZMACD_SIGNAL);
    if (oscType === 'STDSMI') indData = calculateStandardSMI(data, settings.STDSMI_Q, settings.STDSMI_R, settings.STDSMI_S, settings.STDSMI_SIGNAL);
    if (oscType === 'TWOPOLE') indData = calculateTwoPole(data, settings.TWOPOLE_FILTER_LENGTH);
    if (oscType === 'WAE') indData = calculateWAE(data, settings.WAE_SENSITIVITY, settings.WAE_FAST, settings.WAE_SLOW, settings.WAE_CHANNEL, settings.WAE_MULT);
    if (oscType === 'SCALPING') {
      const scalpingData = calculateSimpleScalping(data, settings.SCALPING_LOOKBACK, settings.SCALPING_EMA, settings.SCALPING_LOOKBACK_HL);
      indData = scalpingData.map((d: any) => ({
        val: d.ribbonColor === 'green' ? 1 : -1,
        color: d.ribbonColor === 'green' ? '#22c55e' : '#ef4444'
      }));
    }
    if (oscType === 'CSO') {
      indData = calculateCorrelatedSineOscillator(data, settings.CSO_PERIOD, settings.CSO_MULT, settings.CSO_SHOW_SIGNALS);
    }

    self.postMessage({
      id,
      type: 'OSCILLATOR_RESULT',
      payload: indData
    });
  }
};
