import { useMemo } from 'react';
import { ResponsiveContainer, ComposedChart, Bar, Line, Area, XAxis, YAxis, Tooltip, Scatter, ReferenceLine, Customized } from 'recharts';
import { CandleData, calculateSMA, calculateRSI, calculateBollingerBands, calculateParabolicSAR, calculateStochRSI, calculateATRFibEnvelopes, calculateMAEnvelope, calculateTwoPole, calculateMSMT } from '../lib/calculators';
import { HorizontalLinesOverlay, useHLineStore } from './HorizontalLineTools';
import type { IndicatorSettings } from '../App';

interface BottomChartProps {
  data: CandleData[];
  activeIndicators: Record<string, boolean>;
  settings: IndicatorSettings;
  zoomLevel: number;
  scrollOffset: number;
  symbol: string;
}

const MSMTOverlay = ({ yAxisMap, width, data }: any) => {
  if (!yAxisMap || !yAxisMap.main) return null;
  const scale = yAxisMap.main.scale;

  // Let's find the last data point with MSMT data
  const lastValid = data && data.length > 0 ? [...data].reverse().find(d => d.epoch > 0) : null;
  if (!lastValid || !lastValid.msmtTargets || lastValid.msmtTargets.length === 0) return null;

  return (
    <g className="msmt-targets-overlay">
      {lastValid.msmtTargets.map((t: any) => {
        const y = scale(t.price);
        if (y === undefined || isNaN(y)) return null;
        
        let diffPct = 0;
        if (t.breakoutPrice) { 
            diffPct = ((t.price - t.breakoutPrice) / t.breakoutPrice) * 100;
        }

        return (
          <g key={`msmt-tgt-overlay-${t.level}`}>
            <rect x={width - 100} y={y - 8} width={100} height={16} fill="#eab308" rx={2} fillOpacity={0.8}/>
            <text x={width - 50} y={y + 3} fill="#111" fontSize={9} fontWeight="bold" textAnchor="middle">{`Target ${t.level} (${diffPct > 0 ? '+' : ''}${diffPct.toFixed(2)}%)`}</text>
          </g>
        );
      })}
    </g>
  );
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="absolute top-0 left-0 flex flex-wrap gap-x-3 gap-y-1 text-[10px] items-center bg-transparent drop-shadow-md z-[100] max-w-[80vw]">
         {payload.map((entry: any, index: number) => {
            if (!entry.name || entry.name.includes('Pocket') || entry.name === 'CandleBody' || entry.name.includes('WMA (Base)')) return null;
            if (entry.value === null || entry.value === undefined) return null;
            if (entry.name === 'Candle') {
              const { open, high, low, close } = entry.payload;
              return <span key={index} className="text-neutral-300 font-medium">O: {open.toFixed(2)} H: {high.toFixed(2)} L: {low.toFixed(2)} C: {close.toFixed(2)}</span>;
            }
            return <span key={index} style={{color: entry.color}}>{entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}</span>;
         })}
      </div>
    );
  }
  return null;
}

const CandlestickShape = (props: any) => {
  const { x, y, width, height, open, close, high, low, maxTickValue, minTickValue, yAxisHeight, payload } = props;
  
  if (!payload || payload.open === undefined || typeof maxTickValue !== 'number') return null;

  const isUp = payload.close >= payload.open;
  const color = isUp ? '#10b981' : '#ef4444'; 
  
  const yAxisScale = yAxisHeight / (maxTickValue - minTickValue);
  
  const yHigh = y - (payload.high - Math.max(payload.open, payload.close)) * yAxisScale;
  const yLow = y + height + (Math.min(payload.open, payload.close) - payload.low) * yAxisScale;

  const rectX = Math.floor(x);
  const rectY = Math.floor(y);
  const rectWidth = Math.max(1, Math.floor(width));
  const rectHeight = Math.max(1, Math.floor(height));
  
  // Calculate precise center for the wick
  const centerX = rectX + (rectWidth / 2);
  
  // If width is odd, land on .5 for crisp 1px stroke, if even, integer is fine but SVG 1px stroke on boundary wants .5 too sometimes. Actually, in SVG crispEdges handles integer snapping. Let's rely on shapeRendering="crispEdges"
  return (
    <g stroke={color} fill={color} strokeWidth="1" shapeRendering="crispEdges">
      <line x1={centerX} y1={yHigh} x2={centerX} y2={yLow} />
      <rect x={rectX} y={rectY} width={rectWidth} height={rectHeight} stroke="none" />
    </g>
  );
};

export function BottomChart({ data, activeIndicators, settings, zoomLevel, scrollOffset, symbol }: BottomChartProps) {
  const hlStore = useHLineStore();

  const chartData = useMemo(() => {
    if (data.length === 0) return [];
    
    // Always calculate everything so syncing labels/tooltips is easier
    const maData = calculateSMA(data.map(d => d.close), settings.MA_PERIOD);
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

    const startIndex = Math.max(0, data.length - zoomLevel - scrollOffset);
    const endIndex = Math.max(0, data.length - scrollOffset);
    const slicedInput = data.slice(startIndex, endIndex);

    let sliced = slicedInput.map((d, index) => {
      const i = startIndex + index;
      const timeStr = new Date(d.epoch * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      
      const isBull = atrFibData?.bullish[i];
      const fibWmaRaw = atrFibData?.wma[i] !== undefined && !isNaN(atrFibData.wma[i]) ? atrFibData.wma[i] : null;

      const fbU50 = atrFibData?.upper50[i] !== undefined && !isNaN(atrFibData.upper50[i]) ? atrFibData.upper50[i] : null;
      const fbU618 = atrFibData?.upper618[i] !== undefined && !isNaN(atrFibData.upper618[i]) ? atrFibData.upper618[i] : null;
      const fbU786 = atrFibData?.upper786[i] !== undefined && !isNaN(atrFibData.upper786[i]) ? atrFibData.upper786[i] : null;
      
      const fbL50 = atrFibData?.lower50[i] !== undefined && !isNaN(atrFibData.lower50[i]) ? atrFibData.lower50[i] : null;
      const fbL618 = atrFibData?.lower618[i] !== undefined && !isNaN(atrFibData.lower618[i]) ? atrFibData.lower618[i] : null;
      const fbL786 = atrFibData?.lower786[i] !== undefined && !isNaN(atrFibData.lower786[i]) ? atrFibData.lower786[i] : null;

      let tpBullArrow = null;
      let tpBearArrow = null;
      let tpInv = null;
      let tpInvX = null;
      
      if (twoPoleData) {
        if (settings.visibility.twopoleSignal) {
           if (twoPoleData.bullishCrossover[i]) tpBullArrow = d.low - ((d.high - d.low) * 0.1);
           if (twoPoleData.bearishCrossover[i]) tpBearArrow = d.high + ((d.high - d.low) * 0.1);
        }
        if (settings.visibility.twopoleInvalidation) {
           tpInv = twoPoleData.invalidationLine[i];
           if (twoPoleData.invalidatedFlags[i]) tpInvX = d.close;
        }
      }

      let msmtTrailingUp = null;
      let msmtTrailingDown = null;
      let msmtAreaUp = null;
      let msmtAreaDown = null;
      let msmtChochArrow = null;
      let msmtChochType = null;
      let msmtTargets = [];
      
      if (msmtData) {
        if (msmtData.trailingLine[i] !== null) {
          if (msmtData.trailingDir[i] === 1) {
             msmtTrailingUp = msmtData.trailingLine[i];
             msmtAreaUp = [msmtTrailingUp, d.close];
          } else if (msmtData.trailingDir[i] === -1) {
             msmtTrailingDown = msmtData.trailingLine[i];
             msmtAreaDown = [d.close, msmtTrailingDown];
          }
        }
        if (msmtData.chochLine[i] !== null) {
          msmtChochType = msmtData.chochLine[i];
          msmtChochArrow = msmtChochType === 'bull' ? d.low - ((d.high - d.low) * 0.15) : d.high + ((d.high - d.low) * 0.15);
        }
        msmtTargets = msmtData.activeTargets[i] || [];
      }

      const flatTargets: Record<string, number> = {};
      msmtTargets.forEach(t => {
        flatTargets[`msmtTarget${t.level}`] = t.price;
      });

      return {
        ...d,
        ...flatTargets,
        time: timeStr,
        candleBody: [Math.min(d.open, d.close), Math.max(d.open, d.close)],
        ma: maData[i] !== undefined && !isNaN(maData[i]) ? maData[i] : null,
        rsi: rsiData[i] !== undefined && !isNaN(rsiData[i]) ? rsiData[i] : null,
        bbUpper: bbData?.upper[i] !== undefined && !isNaN(bbData.upper[i]) ? bbData.upper[i] : null,
        bbLower: bbData?.lower[i] !== undefined && !isNaN(bbData.lower[i]) ? bbData.lower[i] : null,
        psar: psarData[i] !== undefined && !isNaN(psarData[i]) ? psarData[i] : null,
        stochK: stochRsiData.stochK[i] !== undefined && !isNaN(stochRsiData.stochK[i]) ? stochRsiData.stochK[i] : null,
        stochD: stochRsiData.stochD[i] !== undefined && !isNaN(stochRsiData.stochD[i]) ? stochRsiData.stochD[i] : null,
        fibUpper50: fbU50,
        fibUpper618: fbU618,
        fibUpper786: fbU786,
        fibLower50: fbL50,
        fibLower618: fbL618,
        fibLower786: fbL786,
        fibWmaBull: isBull ? fibWmaRaw : null,
        fibWmaBear: isBull === false ? fibWmaRaw : null,
        fibWma: fibWmaRaw,
        // Area filled arrays: [bottom, top]
        upperPocket1: (!isBull && fbU50 && fbU618) ? [fbU50, fbU618] : null,
        upperPocket2: (!isBull && fbU618 && fbU786) ? [fbU618, fbU786] : null,
        lowerPocket1: (isBull && fbL50 && fbL618) ? [fbL50, fbL618] : null,
        lowerPocket2: (isBull && fbL618 && fbL786) ? [fbL618, fbL786] : null,
        envUpper: maEnvData?.upper[i] !== undefined && !isNaN(maEnvData.upper[i]) ? maEnvData.upper[i] : null,
        envLower: maEnvData?.lower[i] !== undefined && !isNaN(maEnvData.lower[i]) ? maEnvData.lower[i] : null,
        tpBullArrow,
        tpBearArrow,
        tpInv,
        tpInvX,
        msmtTrailingUp,
        msmtTrailingDown,
        msmtAreaUp,
        msmtAreaDown,
        msmtChochArrow,
        msmtChochType,
        msmtTargets
      };
    });

    const dummyCount = Math.floor(zoomLevel * 0.15);
    for (let i = 0; i < dummyCount; i++) {
       sliced.push({ 
         time: '', epoch: 0, open: null, close: null, high: null, low: null, candleBody: null, 
         ma: null, rsi: null, bbUpper: null, bbLower: null, psar: null, stochK: null, stochD: null,
         fibUpper50: null, fibUpper618: null, fibUpper786: null, fibLower50: null, fibLower618: null, fibLower786: null, fibWmaBull: null, fibWmaBear: null, fibWma: null,
         envUpper: null, envLower: null,
         tpBullArrow: null, tpBearArrow: null, tpInv: null, tpInvX: null,
         msmtTrailingUp: null, msmtTrailingDown: null, msmtAreaUp: null, msmtAreaDown: null, msmtChochArrow: null, msmtChochType: null, msmtTargets: []
       } as any);
    }

    return sliced;
  }, [data, activeIndicators, settings, zoomLevel, scrollOffset]);

  if (chartData.length === 0) {
    return <div className="w-full h-full flex items-center justify-center text-neutral-600 text-sm">Loading ticks...</div>;
  }

  const validCandles = chartData.filter(d => d.epoch > 0);
  let minLow = validCandles.length > 0 ? Math.min(...validCandles.map(d => d.low)) : 0;
  let maxHigh = validCandles.length > 0 ? Math.max(...validCandles.map(d => d.high)) : 1;
  const padding = (maxHigh - minLow) * 0.1;
  
  if (activeIndicators.BB) {
    const validBbs = chartData.filter(d => (d as any).bbUpper !== null);
    if (validBbs.length > 0) {
      maxHigh = Math.max(maxHigh, Math.max(...validBbs.map(d => (d as any).bbUpper as number)));
      minLow = Math.min(minLow, Math.min(...validBbs.map(d => (d as any).bbLower as number)));
    }
  }

  if (activeIndicators.ATRFIBENV) {
    const validEnvs = chartData.filter(d => (d as any).fibUpper786 !== null);
    if (validEnvs.length > 0) {
      maxHigh = Math.max(maxHigh, Math.max(...validEnvs.map(d => (d as any).fibUpper786 as number)));
      minLow = Math.min(minLow, Math.min(...validEnvs.map(d => (d as any).fibLower786 as number)));
    }
  }

  if (activeIndicators.MAENV) {
    const validEnvs = chartData.filter(d => (d as any).envUpper !== null);
    if (validEnvs.length > 0) {
      maxHigh = Math.max(maxHigh, Math.max(...validEnvs.map(d => (d as any).envUpper as number)));
      minLow = Math.min(minLow, Math.min(...validEnvs.map(d => (d as any).envLower as number)));
    }
  }

  if (activeIndicators.MSMT) {
    chartData.forEach((d: any) => {
       if (d.msmtTrailingUp !== null && typeof d.msmtTrailingUp === 'number') {
          minLow = Math.min(minLow, d.msmtTrailingUp);
          maxHigh = Math.max(maxHigh, d.msmtTrailingUp);
       }
       if (d.msmtTrailingDown !== null && typeof d.msmtTrailingDown === 'number') {
          minLow = Math.min(minLow, d.msmtTrailingDown);
          maxHigh = Math.max(maxHigh, d.msmtTrailingDown);
       }
       if (d.msmtTargets && d.msmtTargets.length > 0) {
          d.msmtTargets.forEach((t: any) => {
             minLow = Math.min(minLow, t.price);
             maxHigh = Math.max(maxHigh, t.price);
          });
       }
    });
  }

  const yDomain = [minLow - padding, maxHigh + padding];

  return (
    <div className={`w-full h-full relative ${hlStore.drawMode ? 'cursor-crosshair' : ''}`}>
      <div className="absolute top-2 left-2 z-20 flex items-center gap-2">
        <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider bg-neutral-900/50 px-2 py-0.5 rounded">
          Price + Indicators
        </span>
      </div>

      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: -15 }} syncId="trading-charts">
          <defs>
            <linearGradient id="colorMsmtBull" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={settings.colors.msmtTrailingUp || "#22c55e"} stopOpacity={0.6}/>
                <stop offset="95%" stopColor={settings.colors.msmtTrailingUp || "#22c55e"} stopOpacity={0.0}/>
            </linearGradient>
            <linearGradient id="colorMsmtBear" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={settings.colors.msmtTrailingDown || "#ec4899"} stopOpacity={0.0}/>
                <stop offset="95%" stopColor={settings.colors.msmtTrailingDown || "#ec4899"} stopOpacity={0.6}/>
            </linearGradient>
          </defs>
          <XAxis dataKey="time" stroke="#333" tick={false} axisLine={false} />
          
          <YAxis 
            yAxisId="main"
            domain={yDomain} 
            tickFormatter={(val) => val.toFixed(2)}
            stroke="#444" 
            tick={{ fill: '#666', fontSize: 10 }}
            width={60}
            orientation="right"
            scale="linear"
          />
          
          <YAxis yAxisId="percent" orientation="right" tick={false} stroke="transparent" domain={[0, 100]} width={0} />

          <Tooltip 
            cursor={{ stroke: '#555', strokeWidth: 1, strokeDasharray: '3 3' }}
            position={{ y: 0, x: 2 }}
            content={<CustomTooltip />}
          />
          
          {validCandles.length > 0 && (() => {
            const lastCandle = validCandles[validCandles.length - 1];
            const isUp = lastCandle.close >= lastCandle.open;
            const color = isUp ? '#10b981' : '#ef4444';
            return (
              <ReferenceLine 
                y={lastCandle.close} 
                yAxisId="main" 
                stroke={color} 
                strokeDasharray="4 4" 
                label={(props: any) => {
                  const { viewBox } = props;
                  if (!viewBox || viewBox.x === undefined || viewBox.y === undefined) return null;
                  return (
                    <g>
                      <rect 
                        x={viewBox.x + Math.max(0, viewBox.width - 45)} 
                        y={viewBox.y - 9} 
                        width={45} 
                        height={18} 
                        fill={color} 
                        rx={2} 
                      />
                      <text 
                        x={viewBox.x + Math.max(0, viewBox.width - 22.5)} 
                        y={viewBox.y + 3} 
                        fill="#0a0a0a" 
                        fontSize={10} 
                        fontWeight="bold" 
                        textAnchor="middle"
                      >
                        {lastCandle.close.toFixed(3)}
                      </text>
                    </g>
                  );
                }}
              />
            );
          })()}

          <Bar 
              yAxisId="main"
              dataKey="candleBody" 
              name="Candle"
              shape={(props: any) => <CandlestickShape {...props} maxTickValue={yDomain[1]} minTickValue={yDomain[0]} yAxisHeight={props.background?.height || props.height || 100} />} 
              isAnimationActive={false} 
          />
          
          {activeIndicators.MA && settings.visibility.ma && <Line yAxisId="main" type="monotone" dataKey="ma" stroke={settings.colors.ma} strokeWidth={1.5} dot={false} isAnimationActive={false} name="MA" />}
          {activeIndicators.RSI && settings.visibility.rsi && <Line yAxisId="percent" type="monotone" dataKey="rsi" stroke={settings.colors.rsi} strokeWidth={1.2} dot={false} isAnimationActive={false} name="RSI" />}
          {activeIndicators.BB && (
              <>
              {settings.visibility.bbUpper && <Line yAxisId="main" type="monotone" dataKey="bbUpper" stroke={settings.colors.bbUpper} strokeWidth={1} dot={false} isAnimationActive={false} name="BB Up" />}
              {settings.visibility.bbLower && <Line yAxisId="main" type="monotone" dataKey="bbLower" stroke={settings.colors.bbLower} strokeWidth={1} dot={false} isAnimationActive={false} name="BB Dn" />}
              </>
          )}
          {activeIndicators.PSAR && settings.visibility.psar && (
              <Scatter yAxisId="main" dataKey="psar" fill={settings.colors.psar} name="PSAR" isAnimationActive={false} />
          )}
          {activeIndicators.MAENV && (
              <>
              {settings.visibility.maenvUpper && <Line yAxisId="main" type="monotone" dataKey="envUpper" stroke={settings.colors.maenvUpper} strokeWidth={1} dot={false} isAnimationActive={false} name="Env Up" />}
              {settings.visibility.maenvLower && <Line yAxisId="main" type="monotone" dataKey="envLower" stroke={settings.colors.maenvLower} strokeWidth={1} dot={false} isAnimationActive={false} name="Env Dn" />}
              </>
          )}

          {activeIndicators.ATRFIBENV && (
              <>
              {/* Upper envelopes (Resistance when Bearish) */}
              <Area yAxisId="main" type="monotone" dataKey="upperPocket1" fill="#ef4444" fillOpacity={0.15} stroke="none" isAnimationActive={false} />
              <Area yAxisId="main" type="monotone" dataKey="upperPocket2" fill="#ef4444" fillOpacity={0.05} stroke="none" isAnimationActive={false} />
              <Line yAxisId="main" type="monotone" dataKey="fibUpper786" stroke="#f87171" strokeWidth={1} strokeOpacity={0.3} dot={false} isAnimationActive={false} name="Fib Up 0.786" />
              <Line yAxisId="main" type="monotone" dataKey="fibUpper618" stroke="#ef4444" strokeWidth={1} strokeOpacity={0.5} dot={false} isAnimationActive={false} name="Fib Up 0.618" />
              <Line yAxisId="main" type="monotone" dataKey="fibUpper50" stroke="#dc2626" strokeWidth={1} strokeOpacity={0.8} dot={false} isAnimationActive={false} name="Fib Up 0.500" />
              
              {/* Lower envelopes (Support when Bullish) */}
              <Area yAxisId="main" type="monotone" dataKey="lowerPocket1" fill="#dc2626" fillOpacity={0.15} stroke="none" isAnimationActive={false} />
              <Area yAxisId="main" type="monotone" dataKey="lowerPocket2" fill="#dc2626" fillOpacity={0.05} stroke="none" isAnimationActive={false} />
              <Line yAxisId="main" type="monotone" dataKey="fibLower50" stroke="#dc2626" strokeWidth={1} strokeOpacity={0.8} dot={false} isAnimationActive={false} name="Fib Dn 0.500" />
              <Line yAxisId="main" type="monotone" dataKey="fibLower618" stroke="#ef4444" strokeWidth={1} strokeOpacity={0.5} dot={false} isAnimationActive={false} name="Fib Dn 0.618" />
              <Line yAxisId="main" type="monotone" dataKey="fibLower786" stroke="#f87171" strokeWidth={1} strokeOpacity={0.3} dot={false} isAnimationActive={false} name="Fib Dn 0.786" />
              
              {/* Center WMA - Base gray line fills styling gaps, then overlay trend lines */}
              <Line yAxisId="main" type="monotone" dataKey="fibWma" stroke="#6b7280" strokeWidth={2} dot={false} isAnimationActive={false} name="WMA (Base)" />
              <Line yAxisId="main" type="monotone" dataKey="fibWmaBull" stroke="#0ea5e9" strokeWidth={2} dot={false} connectNulls={false} isAnimationActive={false} name="WMA (Bull)" />
              <Line yAxisId="main" type="monotone" dataKey="fibWmaBear" stroke="#ef4444" strokeWidth={2} dot={false} connectNulls={false} isAnimationActive={false} name="WMA (Bear)" />
              </>
          )}

          {/* Horizontal Lines */}
          <Customized component={<HorizontalLinesOverlay symbol={symbol} />} />

          <Customized component={<MSMTOverlay data={chartData} />} />

          {activeIndicators.TWOPOLE && (
              <>
              {settings.visibility.twopoleInvalidation && (
                  <>
                  <Line yAxisId="main" type="stepAfter" dataKey="tpInv" stroke="#aaaaaa" strokeWidth={1} strokeDasharray="4 4" dot={false} isAnimationActive={false} connectNulls={false} name="Inv Level" />
                  <Scatter yAxisId="main" dataKey="tpInvX" shape={(props: any) => props.payload.tpInvX === null ? null : <text x={props.cx} y={props.cy} fill="#ef4444" fontSize={14} fontWeight="bold" textAnchor="middle" alignmentBaseline="middle">X</text>} isAnimationActive={false} />
                  </>
              )}
              {settings.visibility.twopoleSignal && (
                  <>
                  <Scatter yAxisId="main" dataKey="tpBullArrow" shape={(props: any) => props.payload.tpBullArrow === null ? null : <text x={props.cx} y={props.cy} fill={settings.colors.twopoleBull} fontSize={16} textAnchor="middle" alignmentBaseline="text-before-edge">▲</text>} isAnimationActive={false} />
                  <Scatter yAxisId="main" dataKey="tpBearArrow" shape={(props: any) => props.payload.tpBearArrow === null ? null : <text x={props.cx} y={props.cy} fill={settings.colors.twopoleBear} fontSize={16} textAnchor="middle" alignmentBaseline="text-after-edge">▼</text>} isAnimationActive={false} />
                  </>
              )}
              </>
          )}
          {activeIndicators.MSMT && (
              <>
              {settings.visibility.msmtTrailingLine && (
                  <>
                  <Area yAxisId="main" type="stepAfter" dataKey="msmtAreaUp" fill="url(#colorMsmtBull)" stroke="none" connectNulls={false} isAnimationActive={false} />
                  <Area yAxisId="main" type="stepAfter" dataKey="msmtAreaDown" fill="url(#colorMsmtBear)" stroke="none" connectNulls={false} isAnimationActive={false} />
                  <Line yAxisId="main" type="stepAfter" dataKey="msmtTrailingUp" stroke={settings.colors.msmtTrailingUp || "#22c55e"} strokeWidth={2} dot={false} connectNulls={false} isAnimationActive={false} name="Trailing Up" />
                  <Line yAxisId="main" type="stepAfter" dataKey="msmtTrailingDown" stroke={settings.colors.msmtTrailingDown || "#ec4899"} strokeWidth={2} dot={false} connectNulls={false} isAnimationActive={false} name="Trailing Dn" />
                  <Scatter yAxisId="main" dataKey="msmtChochArrow" shape={(props: any) => props.payload.msmtChochArrow === null ? null : <text x={props.cx} y={props.cy} fill={props.payload.msmtChochType === 'bull' ? (settings.colors.msmtTrailingUp || "#22c55e") : (settings.colors.msmtTrailingDown || "#ec4899")} fontSize={10} fontWeight="bold" textAnchor="middle" alignmentBaseline={props.payload.msmtChochType === 'bull' ? "text-before-edge" : "text-after-edge"}>CHoCH</text>} isAnimationActive={false} />
                  </>
              )}
              {settings.visibility.msmtTargets && (
                  <>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(level => (
                    <Line key={`msmtT-${level}`} yAxisId="main" type="stepAfter" dataKey={`msmtTarget${level}`} stroke={settings.colors.msmtTarget || "#eab308"} strokeWidth={1} strokeDasharray="2 2" dot={false} connectNulls={false} isAnimationActive={false} name={`Target ${level}`} />
                  ))}
                  </>
              )}
              </>
          )}
          
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
