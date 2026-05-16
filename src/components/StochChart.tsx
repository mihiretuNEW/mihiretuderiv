import { useMemo } from 'react';
import { ResponsiveContainer, ComposedChart, Line, XAxis, YAxis, Tooltip, ReferenceLine } from 'recharts';
import { CandleData, calculateStochRSI } from '../lib/calculators';
import type { IndicatorSettings } from '../App';

interface StochChartProps {
  data: CandleData[];
  settings: IndicatorSettings;
  zoomLevel: number;
  scrollOffset: number;
}

export function StochChart({ data, settings, zoomLevel, scrollOffset }: StochChartProps) {

  const chartData = useMemo(() => {
    if (data.length === 0) return [];

    const stochRsiData = calculateStochRSI(data, settings.STOCH_RSI_PERIOD, settings.STOCH_PERIOD, settings.STOCH_K, settings.STOCH_D);

    const startIndex = Math.max(0, data.length - zoomLevel - scrollOffset);
    const endIndex = Math.max(0, data.length - scrollOffset);
    const slicedInput = data.slice(startIndex, endIndex);

    let sliced = slicedInput.map((d, index) => {
      const i = startIndex + index;
      const timeStr = new Date(d.epoch * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      const stochK = stochRsiData.stochK[i] !== undefined && !isNaN(stochRsiData.stochK[i]) ? stochRsiData.stochK[i] : null;
      const stochD = stochRsiData.stochD[i] !== undefined && !isNaN(stochRsiData.stochD[i]) ? stochRsiData.stochD[i] : null;

      return {
        time: timeStr,
        epoch: d.epoch,
        stochK,
        stochD,
      };
    });

    const dummyCount = Math.floor(zoomLevel * 0.15); // 15% empty space
    for (let i = 0; i < dummyCount; i++) {
       sliced.push({ time: '', epoch: 0, stochK: null, stochD: null });
    }

    return sliced;
  }, [data, settings, zoomLevel, scrollOffset]);

  return (
    <div className="w-full h-full relative">
      <div className="absolute top-2 left-2 z-20 flex items-center gap-2">
        <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider bg-neutral-900/50 px-2 py-0.5 rounded">
          Double Stoch RSI
        </span>
      </div>

      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 15, right: 0, left: 0, bottom: -15 }} syncId="trading-charts">
          <XAxis dataKey="time" stroke="#333" tick={false} axisLine={false} />
          
          <YAxis 
            yAxisId="ind"
            domain={[0, 100]} 
            tickFormatter={(val) => val.toFixed(0)}
            stroke="#444" 
            tick={{ fill: '#666', fontSize: 10 }}
            width={60}
            orientation="right"
            scale="linear"
          />

          <Tooltip 
            cursor={{ stroke: '#555', strokeWidth: 1, strokeDasharray: '3 3' }}
            position={{ x: 10, y: -2 }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const kVal = payload.find(p => p.dataKey === 'stochK')?.value;
                const dVal = payload.find(p => p.dataKey === 'stochD')?.value;
                return (
                  <div className="flex items-center gap-3 text-[10px] font-mono bg-[#0a0a0a]/80 py-0.5 px-2 rounded backdrop-blur">
                    <span className="text-neutral-400 font-bold">K:</span>
                    {kVal !== undefined && <span className="text-blue-400">{Number(kVal).toFixed(2)}</span>}
                    <span className="text-neutral-400 font-bold ml-1">D:</span>
                    {dVal !== undefined && <span className="text-orange-400">{Number(dVal).toFixed(2)}</span>}
                  </div>
                );
              }
              return null;
            }}
          />

          <ReferenceLine yAxisId="ind" y={80} stroke="#444" strokeDasharray="3 3" />
          <ReferenceLine yAxisId="ind" y={20} stroke="#444" strokeDasharray="3 3" />
          
          <Line yAxisId="ind" type="monotone" dataKey="stochK" stroke="#3b82f6" strokeWidth={2} dot={false} isAnimationActive={false} name="Stoch %K" />
          <Line yAxisId="ind" type="monotone" dataKey="stochD" stroke="#f97316" strokeWidth={1.5} dot={false} isAnimationActive={false} name="Stoch %D" />
          
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
