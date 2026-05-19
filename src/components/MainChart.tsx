import { useMemo, useState } from 'react';
import { ResponsiveContainer, ComposedChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Bar, Cell, Area, ReferenceLine } from 'recharts';
import { Maximize, Minimize, Plus, Minus } from 'lucide-react';
import { CandleData, calculateSMI } from '../lib/calculators';
import type { IndicatorSettings } from '../App';

interface MainChartProps {
  data: CandleData[];
  activeIndicators: Record<string, boolean>;
  settings: IndicatorSettings;
  zoomLevel: number;
  scrollOffset: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  isSwapped?: boolean;
}

export function MainChart({ data, settings, zoomLevel, scrollOffset, onZoomIn, onZoomOut }: MainChartProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const chartData = useMemo(() => {
    if (data.length === 0) return [];

    // Calculate indicator on FULL data
    const smiData = calculateSMI(data, settings.SMI_LONG, settings.SMI_SHORT, settings.SMI_SIGNAL);

    const startIndex = Math.max(0, data.length - zoomLevel - scrollOffset);
    const endIndex = Math.max(0, data.length - scrollOffset);
    const slicedInput = data.slice(startIndex, endIndex);

    let sliced = slicedInput.map((d, index) => {
      const i = startIndex + index;
      const timeStr = new Date(d.epoch * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const smiVal = smiData.smi[i] !== undefined && !isNaN(smiData.smi[i]) ? smiData.smi[i] : null;
      const signalVal = smiData.signal[i] !== undefined && !isNaN(smiData.signal[i]) ? smiData.signal[i] : null;

      return {
        time: timeStr,
        epoch: d.epoch,
        smi: smiVal,
        signal: signalVal,
        histogram: (smiVal !== null && signalVal !== null) ? smiVal - signalVal : null,
      };
    });

    const dummyCount = Math.floor(zoomLevel * 0.15); // 15% empty space
    for (let i = 0; i < dummyCount; i++) {
       sliced.push({ time: '', epoch: 0, smi: null, signal: null, histogram: null });
    }

    return sliced;
  }, [data, settings, zoomLevel, scrollOffset]);

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      document.body.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div className={`w-full h-full flex flex-col ${isFullscreen ? 'fixed inset-0 z-50 bg-[#0a0a0a] p-4' : ''}`}>
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
        <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800">
          SMI Ergodic
        </span>
      </div>
      
      <div className="absolute top-4 right-[70px] z-10 flex items-center gap-2 bg-neutral-900/80 p-1.5 rounded-lg border border-neutral-700 backdrop-blur">
        <button onClick={onZoomIn} className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white">
          <Plus className="w-4 h-4" />
        </button>
        <button onClick={onZoomOut} className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white">
          <Minus className="w-4 h-4" />
        </button>
        <div className="w-px h-4 bg-neutral-700 mx-1" />
        <button onClick={toggleFullscreen} className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white">
          {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
        </button>
      </div>

      <div className="flex-1 w-full relative pt-8">
        {chartData.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center text-neutral-600">Loading data...</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }} syncId="trading-charts">
              <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
              <XAxis dataKey="time" stroke="#444" tick={{ fill: '#777', fontSize: 11 }} tickMargin={10} minTickGap={30} />
              
              <YAxis 
                yAxisId="ind" 
                orientation="right" 
                width={60}
                stroke="#444" 
                tick={{ fill: '#777', fontSize: 11 }} 
                domain={[-60, 60]}
              />

              <Tooltip 
                cursor={{ stroke: '#555', strokeWidth: 1, strokeDasharray: '3 3' }}
                position={{ x: 10, y: 35 }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const smi = payload.find(p => p.dataKey === 'smi')?.value;
                    const signal = payload.find(p => p.dataKey === 'signal')?.value;
                    const histogram = payload.find(p => p.dataKey === 'histogram')?.value;
                    return (
                      <div className="flex items-center gap-3 text-[10px] font-mono bg-[#0a0a0a]/80 py-0.5 px-2 rounded backdrop-blur">
                        <span className="text-neutral-400 font-bold">SMI:</span>
                        {smi !== undefined && <span className="text-blue-500">{Number(smi).toFixed(2)}</span>}
                        <span className="text-neutral-400 font-bold ml-1">SIG:</span>
                        {signal !== undefined && <span className="text-amber-500">{Number(signal).toFixed(2)}</span>}
                        <span className="text-neutral-400 font-bold ml-1">HIST:</span>
                        {histogram !== undefined && <span className={Number(histogram) > 0 ? 'text-emerald-500' : 'text-red-500'}>{Number(histogram).toFixed(2)}</span>}
                      </div>
                    );
                  }
                  return null;
                }}
              />

              <Bar yAxisId="ind" dataKey="histogram" isAnimationActive={false} name="Histogram">
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.histogram && entry.histogram > 0 ? '#10b981' : '#ef4444'} 
                    fillOpacity={0.4} 
                  />
                ))}
              </Bar>
              <Line yAxisId="ind" type="monotone" dataKey="smi" stroke="#3b82f6" strokeWidth={2} dot={false} isAnimationActive={false} name="SMI" />
              <Line yAxisId="ind" type="monotone" dataKey="signal" stroke="#f59e0b" strokeWidth={1.5} dot={false} isAnimationActive={false} name="Signal" />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}