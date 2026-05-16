import { useMemo } from 'react';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, Scatter, ReferenceLine } from 'recharts';
import { CandleData, calculateSMA, calculateRSI, calculateBollingerBands, calculateParabolicSAR, calculateStochRSI } from '../lib/calculators';
import type { IndicatorSettings } from '../App';

interface BottomChartProps {
  data: CandleData[];
  activeIndicators: Record<string, boolean>;
  settings: IndicatorSettings;
  zoomLevel: number;
  scrollOffset: number;
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

export function BottomChart({ data, activeIndicators, settings, zoomLevel, scrollOffset }: BottomChartProps) {
  const chartData = useMemo(() => {
    if (data.length === 0) return [];
    
    // Always calculate everything so syncing labels/tooltips is easier
    const maData = calculateSMA(data.map(d => d.close), settings.MA_PERIOD);
    const rsiData = calculateRSI(data, settings.RSI_PERIOD);
    const bbData = calculateBollingerBands(data, settings.BB_PERIOD, settings.BB_MULT);
    const psarData = calculateParabolicSAR(data, settings.PSAR_STEP, settings.PSAR_MAX);
    const stochRsiData = calculateStochRSI(data, settings.STOCH_RSI_PERIOD, settings.STOCH_PERIOD, settings.STOCH_K, settings.STOCH_D);

    const startIndex = Math.max(0, data.length - zoomLevel - scrollOffset);
    const endIndex = Math.max(0, data.length - scrollOffset);
    const slicedInput = data.slice(startIndex, endIndex);

    let sliced = slicedInput.map((d, index) => {
      const i = startIndex + index;
      const timeStr = new Date(d.epoch * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      return {
        ...d,
        time: timeStr,
        candleBody: [Math.min(d.open, d.close), Math.max(d.open, d.close)],
        ma: maData[i] !== undefined && !isNaN(maData[i]) ? maData[i] : null,
        rsi: rsiData[i] !== undefined && !isNaN(rsiData[i]) ? rsiData[i] : null,
        bbUpper: bbData?.upper[i] !== undefined && !isNaN(bbData.upper[i]) ? bbData.upper[i] : null,
        bbLower: bbData?.lower[i] !== undefined && !isNaN(bbData.lower[i]) ? bbData.lower[i] : null,
        psar: psarData[i] !== undefined && !isNaN(psarData[i]) ? psarData[i] : null,
        stochK: stochRsiData.stochK[i] !== undefined && !isNaN(stochRsiData.stochK[i]) ? stochRsiData.stochK[i] : null,
        stochD: stochRsiData.stochD[i] !== undefined && !isNaN(stochRsiData.stochD[i]) ? stochRsiData.stochD[i] : null,
      };
    });

    const dummyCount = Math.floor(zoomLevel * 0.15);
    for (let i = 0; i < dummyCount; i++) {
       sliced.push({ 
         time: '', epoch: 0, open: null, close: null, high: null, low: null, candleBody: null, 
         ma: null, rsi: null, bbUpper: null, bbLower: null, psar: null, stochK: null, stochD: null
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

  const yDomain = [minLow - padding, maxHigh + padding];

  return (
    <div className="w-full h-full relative">
      <div className="absolute top-2 left-2 z-20 flex items-center gap-2">
        <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider bg-neutral-900/50 px-2 py-0.5 rounded">
          Price + Indicators
        </span>
      </div>

      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: -15 }} syncId="trading-charts">
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
            contentStyle={{ backgroundColor: '#111', borderColor: '#333', fontSize: '12px' }}
            labelStyle={{ display: 'none' }}
            itemStyle={{ color: '#ccc' }}
            formatter={(value: any, name: string, props: any) => {
               if (name === 'Candle' && props.payload.epoch > 0) {
                 const { open, high, low, close } = props.payload;
                 return [`O: ${open} H: ${high} L: ${low} C: ${close}`, ''];
               }
               return [Number(value).toFixed(2), name];
            }}
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
          
          {activeIndicators.MA && <Line yAxisId="main" type="monotone" dataKey="ma" stroke="#ec4899" strokeWidth={1.5} dot={false} isAnimationActive={false} name="MA" />}
          {activeIndicators.RSI && <Line yAxisId="percent" type="monotone" dataKey="rsi" stroke="#a855f7" strokeWidth={1.2} dot={false} isAnimationActive={false} name="RSI" />}
          {activeIndicators.BB && (
              <>
              <Line yAxisId="main" type="monotone" dataKey="bbUpper" stroke="#14b8a6" strokeWidth={1} dot={false} isAnimationActive={false} name="BB Up" />
              <Line yAxisId="main" type="monotone" dataKey="bbLower" stroke="#14b8a6" strokeWidth={1} dot={false} isAnimationActive={false} name="BB Dn" />
              </>
          )}
          {activeIndicators.PSAR && (
              <Scatter yAxisId="main" dataKey="psar" fill="#eab308" name="PSAR" isAnimationActive={false} />
          )}
          
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

