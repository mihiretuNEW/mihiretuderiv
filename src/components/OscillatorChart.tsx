import React, { useMemo } from 'react';
import { ResponsiveContainer, ComposedChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Bar, Cell, ReferenceLine } from 'recharts';
import { CandleData, calculateSMI, calculateStochRSI, calculateZMACD, calculateStandardSMI, calculateTwoPole, calculateWAE } from '../lib/calculators';
import type { IndicatorSettings } from '../App';

interface OscillatorChartProps {
  type: 'SMI' | 'STOCHRSI' | 'ZMACD' | 'STDSMI' | 'TWOPOLE' | 'WAE' | 'SCALPING' | 'CSO';
  data: CandleData[];
  settings: IndicatorSettings;
  zoomLevel: number;
  scrollOffset: number;
}

export const OscillatorChart = React.memo(OscillatorChartComponent);

function OscillatorChartComponent({ type, data, settings, zoomLevel, scrollOffset, calcData }: OscillatorChartProps & { calcData: any }) {
  const chartData = useMemo(() => {
    if (data.length === 0 || !calcData) return [];

    let indData: any = calcData;

    const startIndex = Math.max(0, data.length - zoomLevel - scrollOffset);
    const endIndex = Math.max(0, data.length - scrollOffset);
    const slicedInput = data.slice(startIndex, endIndex);

    let sliced = slicedInput.map((d, index) => {
      const i = startIndex + index;
      const timeStr = new Date(d.epoch * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      
      const item: any = { time: timeStr, epoch: d.epoch };
      
      if (type === 'SMI') {
        item.smi = indData.smi[i] !== undefined && !isNaN(indData.smi[i]) ? indData.smi[i] : null;
        item.signal = indData.signal[i] !== undefined && !isNaN(indData.signal[i]) ? indData.signal[i] : null;
        item.histogram = (item.smi !== null && item.signal !== null) ? item.smi - item.signal : null;
      }
      if (type === 'STOCHRSI') {
        item.stochK = indData.stochK[i] !== undefined && !isNaN(indData.stochK[i]) ? indData.stochK[i] : null;
        item.stochD = indData.stochD[i] !== undefined && !isNaN(indData.stochD[i]) ? indData.stochD[i] : null;
      }
      if (type === 'ZMACD') {
        item.macd = indData.macd[i] !== undefined && !isNaN(indData.macd[i]) ? indData.macd[i] : null;
        item.signal = indData.signal[i] !== undefined && !isNaN(indData.signal[i]) ? indData.signal[i] : null;
        item.histogram = indData.histogram[i] !== undefined && !isNaN(indData.histogram[i]) ? indData.histogram[i] : null;
      }
      if (type === 'STDSMI') {
        item.smi = indData.smi[i] !== undefined && !isNaN(indData.smi[i]) ? indData.smi[i] : null;
        item.signal = indData.signal[i] !== undefined && !isNaN(indData.signal[i]) ? indData.signal[i] : null;
      }
      if (type === 'TWOPOLE') {
        item.osc = indData.oscillator[i] !== undefined && !isNaN(indData.oscillator[i]) ? indData.oscillator[i] : null;
        item.signal = indData.signal[i] !== undefined && !isNaN(indData.signal[i]) ? indData.signal[i] : null;
        if (item.osc !== null && item.signal !== null) {
          item.barData = [item.signal, item.osc];
        }
      }
      if (type === 'WAE') {
        item.waeForce = indData.waeForce[i] !== undefined && !isNaN(indData.waeForce[i]) ? indData.waeForce[i] : null;
        item.waeColor = indData.waeColor[i] !== undefined && !isNaN(indData.waeColor[i]) ? indData.waeColor[i] : null;
        item.waeExplosion = indData.waeExplosion[i] !== undefined && !isNaN(indData.waeExplosion[i]) ? indData.waeExplosion[i] : null;
        item.waeDeadZone = indData.waeDeadZone[i] !== undefined && !isNaN(indData.waeDeadZone[i]) ? indData.waeDeadZone[i] : null;
      }
      if (type === 'SCALPING') {
        item.val = indData[i]?.val !== undefined ? indData[i].val : null;
        item.color = indData[i]?.color !== undefined ? indData[i].color : null;
      }
      if (type === 'CSO') {
        item.osc = indData[i]?.oscillator !== undefined && !isNaN(indData[i].oscillator) ? indData[i].oscillator : null;
        if (item.osc !== null) {
          item.barData = [0, item.osc];
          item.oscBull = item.osc >= 0 ? item.osc : null;
          item.oscBear = item.osc <= 0 ? item.osc : null;
        }
      }
      return item;
    });

    const dummyCount = Math.floor(zoomLevel * 0.15);
    for (let i = 0; i < dummyCount; i++) {
       sliced.push({ time: '', epoch: 0 });
    }
    return sliced;
  }, [type, data, settings, zoomLevel, scrollOffset, calcData]);

  const config: any = {
    SMI: { title: 'SMI Ergodic', domain: ['auto', 'auto'], lines: [{key: 'smi', name: 'SMI', color: settings.colors.smiSmi, vis: settings.visibility.smiSmi}, {key: 'signal', name: 'Signal', color: settings.colors.smiSignal, vis: settings.visibility.smiSignal}], hist: {key: 'histogram', up: settings.colors.smiHistogramUp, down: settings.colors.smiHistogramDown, vis: settings.visibility.smiHistogram} },
    STOCHRSI: { title: 'Double Stoch RSI', domain: [0, 100], refs: [80, 20], lines: [{key: 'stochK', name: '%K', color: settings.colors.stochK, vis: settings.visibility.stochK}, {key: 'stochD', name: '%D', color: settings.colors.stochD, vis: settings.visibility.stochD}] },
    ZMACD: { title: 'Zero Lag MACD', domain: ['auto', 'auto'], lines: [{key: 'macd', name: 'MACD', color: settings.colors.zmacdMacd, vis: settings.visibility.zmacdMacd}, {key: 'signal', name: 'Signal', color: settings.colors.zmacdSignal, vis: settings.visibility.zmacdSignal}], hist: {key: 'histogram', up: settings.colors.zmacdHistUp, down: settings.colors.zmacdHistDown, vis: settings.visibility.zmacdHist} },
    STDSMI: { title: 'Standard SMI', domain: ['auto', 'auto'], refs: [40, -40], lines: [{key: 'smi', name: 'SMI', color: settings.colors.stdSmiSmi, vis: settings.visibility.stdSmiSmi}, {key: 'signal', name: 'Signal', color: settings.colors.stdSmiSignal, vis: settings.visibility.stdSmiSignal}] },
    TWOPOLE: { title: 'Two-Pole Oscillator', domain: [-1.0, 1.0], customRefs: [{y: 1, c: '#22c55e'}, {y: 0.5, c: '#eab308'}, {y: 0, c: '#ef4444'}, {y: -0.5, c: '#eab308'}, {y: -1, c: '#22c55e'}], lines: [{key: 'signal', name: 'Signal', color: settings.colors.twopoleSignal, vis: settings.visibility.twopoleSignal}], dynamicHist: true },
    WAE: { title: 'Waddah Attar Explosion', domain: ['auto', 'auto'], lines: [{key: 'waeExplosion', name: 'Explosion', color: settings.colors.waeExplosion, vis: settings.visibility.waeLines}, {key: 'waeDeadZone', name: 'DeadZone', color: settings.colors.waeDeadZone, vis: settings.visibility.waeLines}], waeHist: true },
    SCALPING: { title: 'Simple Scalping Ribbon', domain: [-1.5, 1.5], simpleHist: true },
    CSO: { title: 'Correlated Sine Oscillator', domain: [-1.1, 1.1], customRefs: [{y: 0, c: '#444'}], csoHist: true }
  }[type];

  return (
    <div className="w-full h-full relative">
      <div className="absolute top-2 left-2 z-20 flex items-center gap-2">
        <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider bg-neutral-900/50 px-2 py-0.5 rounded">
          {config.title}
        </span>
      </div>

      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 15, right: 0, left: 0, bottom: -15 }} syncId="trading-charts" barCategoryGap="0%" barGap={0}>
          <XAxis dataKey="time" stroke="#333" tick={false} axisLine={false} />
          
          <YAxis 
            yAxisId="ind" 
            domain={config.domain as any} 
            tickFormatter={(val) => val.toFixed(1)}
            stroke="#444" 
            tick={{ fill: '#666', fontSize: 10 }}
            width={60}
            orientation="right"
            scale="linear"
          />

          <Tooltip 
            cursor={false}
            position={{ y: -2, x: 100 }}
            content={() => null}
          />

          {config.refs?.map((y: number) => <ReferenceLine key={y} yAxisId="ind" y={y} stroke="#444" strokeDasharray="3 3" />)}
          {config.customRefs?.map((ref: any) => <ReferenceLine key={ref.y} yAxisId="ind" y={ref.y} stroke={ref.c} strokeWidth={1} />)}
          
          {config.hist && config.hist.vis && (
            <Bar yAxisId="ind" dataKey={config.hist.key} isAnimationActive={false} name="Hist">
              {chartData.map((entry: any, index) => (
                <Cell key={`cell-${index}`} fill={entry[config.hist.key] && entry[config.hist.key] > 0 ? config.hist.up : config.hist.down} fillOpacity={0.5} />
              ))}
            </Bar>
          )}

          {config.dynamicHist && settings.visibility.twopoleOscillator && (
            <>
            <Bar yAxisId="ind" dataKey="barData" isAnimationActive={false} name="Oscillator">
              {chartData.map((entry: any, index) => {
                let fill = entry.osc > entry.signal ? settings.colors.twopoleBull : settings.colors.twopoleBear;
                if (entry.osc >= 0.5) fill = '#22c55e';
                else if (entry.osc <= -0.5) fill = '#ef4444';
                return <Cell key={`cell-${index}`} fill={fill} fillOpacity={0.8} />;
              })}
            </Bar>
            <Line key="osc" yAxisId="ind" type="monotone" dataKey="osc" stroke={settings.colors.twopoleBull} strokeWidth={1.5} dot={false} isAnimationActive={false} name="Oscillator" />
            </>
          )}

          {config.simpleHist && (
            <Bar yAxisId="ind" dataKey="val" isAnimationActive={false} name="Ribbon">
              {chartData.map((entry: any, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.8} />
              ))}
            </Bar>
          )}

          {config.waeHist && settings.visibility.waeHistogram && (
            <Bar yAxisId="ind" dataKey="waeForce" isAnimationActive={false} name="Force">
              {chartData.map((entry: any, index) => (
                <Cell key={`cell-${index}`} fill={entry.waeColor === 1 ? settings.colors.waeGreen : settings.colors.waeRed} fillOpacity={0.8} />
              ))}
            </Bar>
          )}

          {config.csoHist && (
            <>
              <defs>
                <linearGradient id="csoBull" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity={0.8}/>
                  <stop offset="100%" stopColor="#22c55e" stopOpacity={0.1}/>
                </linearGradient>
                <linearGradient id="csoBear" x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={0.8}/>
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <Bar yAxisId="ind" dataKey="barData" isAnimationActive={false} name="Oscillator Area">
                {chartData.map((entry: any, index) => {
                  let fill = entry.osc >= 0 ? "url(#csoBull)" : "url(#csoBear)";
                  return <Cell key={`cell-${index}`} fill={fill} />;
                })}
              </Bar>
              <Line key="oscBull" yAxisId="ind" type="monotone" dataKey="oscBull" stroke="#22c55e" strokeWidth={2} dot={false} isAnimationActive={false} name="Bull" connectNulls={false} />
              <Line key="oscBear" yAxisId="ind" type="monotone" dataKey="oscBear" stroke="#ef4444" strokeWidth={2} dot={false} isAnimationActive={false} name="Bear" connectNulls={false} />
            </>
          )}

          {config.lines?.map((line: any) => line.vis && (
            <Line key={line.key} yAxisId="ind" type="monotone" dataKey={line.key} stroke={line.color} strokeWidth={1.5} dot={false} isAnimationActive={false} name={line.name} />
          ))}

        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
