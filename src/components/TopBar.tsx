import React, { useState, useEffect } from 'react';
import { Menu, Activity, Settings, Wifi, WifiOff, ArrowUpDown } from 'lucide-react';

function LiveClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Moscow', // GMT+3
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  return (
    <div className="text-emerald-400 font-mono text-[11px] font-medium bg-neutral-900 border border-neutral-800 px-2 py-1 rounded hidden sm:block">
      {formatter.format(time)}
    </div>
  );
}

import { ASSET_PAIRS, TIMEFRAMES } from '../lib/derivConfig';
import { cn } from '../lib/utils';
import type { IndicatorSettings } from '../App';

interface TopBarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (o: boolean) => void;
  selectedSymbol: string;
  isConnected: boolean;
  selectedTimeframe: number;
  onSelectTimeframe: (tf: number) => void;
  activeIndicators: Record<string, boolean>;
  setActiveIndicators: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  indicatorSettings: IndicatorSettings;
  setIndicatorSettings: React.Dispatch<React.SetStateAction<IndicatorSettings>>;
}

export function TopBar({ 
  sidebarOpen, 
  setSidebarOpen, 
  selectedSymbol, 
  isConnected,
  selectedTimeframe,
  onSelectTimeframe,
  activeIndicators,
  setActiveIndicators,
  indicatorSettings,
  setIndicatorSettings
}: TopBarProps) {
  const [showIndicators, setShowIndicators] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const assetName = ASSET_PAIRS.find(a => a.symbol === selectedSymbol)?.name || selectedSymbol;

  const toggleIndicator = (ind: string) => {
    setActiveIndicators(prev => ({ ...prev, [ind]: !prev[ind] }));
  };

  return (
    <div className="h-14 border-b border-neutral-800 bg-[#0a0a0a] flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-4">
        {!sidebarOpen && (
          <button onClick={() => setSidebarOpen(true)} className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white">
            <Menu className="w-5 h-5" />
          </button>
        )}
        
        <div className="flex items-center gap-2">
          <span className="font-semibold text-lg text-white">{assetName}</span>
          {isConnected ? (
            <Wifi className="w-4 h-4 text-emerald-500" />
          ) : (
            <WifiOff className="w-4 h-4 text-red-500" />
          )}
        </div>

        <div className="h-6 w-px bg-neutral-800 mx-2" />

        <div className="flex items-center gap-1 bg-neutral-900 p-1 rounded-md">
          {TIMEFRAMES.map(tf => (
            <button
              key={tf.granularity}
              onClick={() => onSelectTimeframe(tf.granularity)}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded transition-colors",
                selectedTimeframe === tf.granularity 
                  ? "bg-neutral-700 text-white" 
                  : "text-neutral-400 hover:text-neutral-200"
              )}
            >
              {tf.label}
            </button>
          ))}
        </div>
        
        <LiveClock />
      </div>

      <div className="flex items-center gap-3">
        <div className="relative">
          <button 
            onClick={() => setShowIndicators(!showIndicators)}
            className="flex items-center gap-2 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 rounded-md text-sm font-medium transition-colors border border-neutral-800"
          >
            <Activity className="w-4 h-4 text-blue-500" />
            Indicators
          </button>

          {showIndicators && (
            <div className="absolute right-0 top-full mt-2 w-48 max-h-80 overflow-y-auto bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl z-50 py-1">
              {Object.keys(activeIndicators).map(ind => (
                <button
                  key={ind}
                  onClick={() => toggleIndicator(ind)}
                  className="w-full text-left px-4 py-2 text-sm flex items-center justify-between hover:bg-neutral-800"
                >
                  <span className={activeIndicators[ind] ? "text-white" : "text-neutral-400"}>
                    {ind === 'SMI' ? 'SMI Ergodic' :
                     ind === 'MA' ? 'Moving Average' : 
                     ind === 'RSI' ? 'RSI' : 
                     ind === 'BB' ? 'Bollinger Bands' : 
                     ind === 'STOCHRSI' ? 'Double Stoch RSI' : 
                     ind === 'ATRFIBENV' ? 'ATR Fib Envelopes' :
                     ind === 'ZMACD' ? 'Zero Lag MACD' :
                     ind === 'STDSMI' ? 'Stochastic Momentum Index' :
                     ind === 'MAENV' ? 'Moving Average Envelope' :
                     ind === 'TWOPOLE' ? 'Two-Pole Oscillator' :
                     ind === 'MSMT' ? 'Market Structure Trend Matrix' :
                     ind === 'UTBOT' ? 'UT Bot Alerts' :
                     ind === 'NWENV' ? 'Nadaraya-Watson Envelope' :
                     ind === 'WAE' ? 'Waddah Attar Explosion' :
                     ind === 'CSO' ? 'Correlated Sine Oscillator' :
                     ind === 'OB' ? 'Order Block Detector' :
                     ind === 'GTA' ? 'GTA Trend Filter' :
                     ind === 'SCALPING' ? 'Simple Scalping Ribbon' :
                     ind === 'TRENDLINES_BREAKS' ? 'Trendlines with Breaks' :
                     ind === 'PSAR' ? 'Parabolic SAR' : ind}
                  </span>
                  {activeIndicators[ind] && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                </button>
              ))}
            </div>
          )}
        </div>

        <button 
          onClick={() => setShowSettings(!showSettings)}
          className="p-1.5 hover:bg-neutral-800 rounded-md text-neutral-400 hover:text-white transition-colors"
        >
          <Settings className="w-5 h-5" />
        </button>

        {showSettings && (
          <SettingsModal 
            settings={indicatorSettings}
            setSettings={setIndicatorSettings}
            onClose={() => setShowSettings(false)}
          />
        )}
      </div>
    </div>
  );
}

function SettingsModal({ settings, setSettings, onClose }: any) {
  const [activeTab, setActiveTab] = useState<'params' | 'styles'>('params');

  const update = (key: string, val: string) => {
    setSettings((prev: any) => ({ ...prev, [key]: Number(val) }));
  };
  
  const updateColor = (key: string, val: string) => {
    setSettings((prev: any) => ({ ...prev, colors: { ...prev.colors, [key]: val } }));
  };

  const updateVis = (key: string, val: boolean) => {
    setSettings((prev: any) => ({ ...prev, visibility: { ...prev.visibility, [key]: val } }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center">
      <div className="bg-[#111] border border-neutral-800 rounded-xl w-full max-w-2xl p-6 shadow-2xl flex flex-col max-h-[85vh]">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">Indicator Settings</h3>
          <div className="flex gap-2">
            <button onClick={() => setActiveTab('params')} className={`px-3 py-1 rounded text-sm ${activeTab === 'params' ? 'bg-blue-600 text-white' : 'bg-neutral-800 text-neutral-400'}`}>Parameters</button>
            <button onClick={() => setActiveTab('styles')} className={`px-3 py-1 rounded text-sm ${activeTab === 'styles' ? 'bg-blue-600 text-white' : 'bg-neutral-800 text-neutral-400'}`}>Styles & Visibility</button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto pr-2 space-y-6">
          {activeTab === 'params' && (
            <>
              {/* SMI & ZMACD & STDSMI */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2 border border-neutral-800 p-3 rounded bg-neutral-900/50">
                  <h4 className="text-sm font-medium text-blue-400">SMI Ergodic</h4>
                  <div className="grid grid-cols-1 gap-2">
                    <label className="text-xs text-neutral-400 flex justify-between items-center">Long Period <input type="number" value={settings.SMI_LONG} onChange={e => update('SMI_LONG', e.target.value)} className="w-16 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-right text-white" /></label>
                    <label className="text-xs text-neutral-400 flex justify-between items-center">Short Period <input type="number" value={settings.SMI_SHORT} onChange={e => update('SMI_SHORT', e.target.value)} className="w-16 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-right text-white" /></label>
                    <label className="text-xs text-neutral-400 flex justify-between items-center">Signal Period <input type="number" value={settings.SMI_SIGNAL} onChange={e => update('SMI_SIGNAL', e.target.value)} className="w-16 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-right text-white" /></label>
                  </div>
                </div>

                <div className="space-y-2 border border-neutral-800 p-3 rounded bg-neutral-900/50">
                  <h4 className="text-sm font-medium text-purple-400">Double Stoch RSI</h4>
                  <div className="grid grid-cols-1 gap-2">
                    <label className="text-xs text-neutral-400 flex justify-between items-center">RSI Period <input type="number" value={settings.STOCH_RSI_PERIOD} onChange={e => update('STOCH_RSI_PERIOD', e.target.value)} className="w-16 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-right text-white" /></label>
                    <label className="text-xs text-neutral-400 flex justify-between items-center">Stoch Period <input type="number" value={settings.STOCH_PERIOD} onChange={e => update('STOCH_PERIOD', e.target.value)} className="w-16 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-right text-white" /></label>
                    <label className="text-xs text-neutral-400 flex justify-between items-center">Smooth K <input type="number" value={settings.STOCH_K} onChange={e => update('STOCH_K', e.target.value)} className="w-16 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-right text-white" /></label>
                    <label className="text-xs text-neutral-400 flex justify-between items-center">Smooth D <input type="number" value={settings.STOCH_D} onChange={e => update('STOCH_D', e.target.value)} className="w-16 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-right text-white" /></label>
                  </div>
                </div>

                <div className="space-y-2 border border-neutral-800 p-3 rounded bg-neutral-900/50">
                  <h4 className="text-sm font-medium text-emerald-400">Zero Lag MACD</h4>
                  <div className="grid grid-cols-1 gap-2">
                    <label className="text-xs text-neutral-400 flex justify-between items-center">Fast Period <input type="number" value={settings.ZMACD_FAST} onChange={e => update('ZMACD_FAST', e.target.value)} className="w-16 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-right text-white" /></label>
                    <label className="text-xs text-neutral-400 flex justify-between items-center">Slow Period <input type="number" value={settings.ZMACD_SLOW} onChange={e => update('ZMACD_SLOW', e.target.value)} className="w-16 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-right text-white" /></label>
                    <label className="text-xs text-neutral-400 flex justify-between items-center">Signal Period <input type="number" value={settings.ZMACD_SIGNAL} onChange={e => update('ZMACD_SIGNAL', e.target.value)} className="w-16 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-right text-white" /></label>
                  </div>
                </div>
                
                <div className="space-y-2 border border-neutral-800 p-3 rounded bg-neutral-900/50">
                  <h4 className="text-sm font-medium text-orange-400">Standard SMI</h4>
                  <div className="grid grid-cols-1 gap-2">
                    <label className="text-xs text-neutral-400 flex justify-between items-center">Q Length <input type="number" value={settings.STDSMI_Q} onChange={e => update('STDSMI_Q', e.target.value)} className="w-16 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-right text-white" /></label>
                    <label className="text-xs text-neutral-400 flex justify-between items-center">R Smooth <input type="number" value={settings.STDSMI_R} onChange={e => update('STDSMI_R', e.target.value)} className="w-16 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-right text-white" /></label>
                    <label className="text-xs text-neutral-400 flex justify-between items-center">S Smooth <input type="number" value={settings.STDSMI_S} onChange={e => update('STDSMI_S', e.target.value)} className="w-16 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-right text-white" /></label>
                    <label className="text-xs text-neutral-400 flex justify-between items-center">Signal Period <input type="number" value={settings.STDSMI_SIGNAL} onChange={e => update('STDSMI_SIGNAL', e.target.value)} className="w-16 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-right text-white" /></label>
                  </div>
                </div>

                <div className="space-y-2 border border-neutral-800 p-3 rounded bg-neutral-900/50">
                  <h4 className="text-sm font-medium text-[#10b981]">Trendlines with Breaks</h4>
                  <div className="grid grid-cols-1 gap-2">
                    <label className="text-xs text-neutral-400 flex justify-between items-center">Length <input type="number" value={settings.TRENDLINES_LENGTH} onChange={e => update('TRENDLINES_LENGTH', e.target.value)} className="w-16 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-right text-white" /></label>
                    <label className="text-xs text-neutral-400 flex justify-between items-center">Slope Multiplier <input type="number" step="0.1" value={settings.TRENDLINES_MULT} onChange={e => update('TRENDLINES_MULT', e.target.value)} className="w-16 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-right text-white" /></label>
                    <label className="text-xs text-neutral-400 flex justify-between items-center">Line Style 
                      <select value={settings.TRENDLINES_STYLE || 'dot'} onChange={e => setSettings((s: any) => ({ ...s, TRENDLINES_STYLE: e.target.value }))} className="w-[72px] bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-right text-white">
                        <option value="dot">Dotted</option>
                        <option value="solid">Solid</option>
                      </select>
                    </label>
                  </div>
                </div>

                <div className="space-y-2 border border-neutral-800 p-3 rounded bg-neutral-900/50">
                  <h4 className="text-sm font-medium text-cyan-400">GTA Trend Filter</h4>
                  <div className="grid grid-cols-1 gap-2">
                    <label className="text-xs text-neutral-400 flex justify-between items-center">Long EMA <input type="number" value={settings.GTA_LONG} onChange={e => update('GTA_LONG', e.target.value)} className="w-16 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-right text-white" /></label>
                    <label className="text-xs text-neutral-400 flex justify-between items-center">Mid EMA <input type="number" value={settings.GTA_MID} onChange={e => update('GTA_MID', e.target.value)} className="w-16 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-right text-white" /></label>
                    <label className="text-xs text-neutral-400 flex justify-between items-center">Short EMA <input type="number" value={settings.GTA_SHORT} onChange={e => update('GTA_SHORT', e.target.value)} className="w-16 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-right text-white" /></label>
                  </div>
                </div>

                <div className="space-y-2 border border-neutral-800 p-3 rounded bg-neutral-900/50">
                  <h4 className="text-sm font-medium text-lime-400">Simple Scalping</h4>
                  <div className="grid grid-cols-1 gap-2">
                    <label className="text-xs text-neutral-400 flex justify-between items-center">Lookback EMA <input type="number" step="0.1" value={settings.SCALPING_LOOKBACK} onChange={e => update('SCALPING_LOOKBACK', e.target.value)} className="w-16 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-right text-white" /></label>
                    <label className="text-xs text-neutral-400 flex justify-between items-center">Signal EMA <input type="number" step="0.1" value={settings.SCALPING_EMA} onChange={e => update('SCALPING_EMA', e.target.value)} className="w-16 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-right text-white" /></label>
                    <label className="text-xs text-neutral-400 flex justify-between items-center">Trailing HL <input type="number" step="0.1" value={settings.SCALPING_LOOKBACK_HL} onChange={e => update('SCALPING_LOOKBACK_HL', e.target.value)} className="w-16 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-right text-white" /></label>
                  </div>
                </div>

                <div className="space-y-2 border border-neutral-800 p-3 rounded bg-neutral-900/50">
                  <h4 className="text-sm font-medium text-pink-400">ATR Fib Envelopes</h4>
                  <div className="grid grid-cols-1 gap-2">
                    <label className="text-xs text-neutral-400 flex justify-between items-center">WMA Period <input type="number" value={settings.ATRFIB_WMA_PERIOD} onChange={e => update('ATRFIB_WMA_PERIOD', e.target.value)} className="w-16 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-right text-white" /></label>
                    <label className="text-xs text-neutral-400 flex justify-between items-center">ATR Period <input type="number" value={settings.ATRFIB_ATR_PERIOD} onChange={e => update('ATRFIB_ATR_PERIOD', e.target.value)} className="w-16 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-right text-white" /></label>
                    <label className="text-xs text-neutral-400 flex justify-between items-center">ATR Multiplier <input type="number" step="0.1" value={settings.ATRFIB_MULTIPLIER} onChange={e => update('ATRFIB_MULTIPLIER', e.target.value)} className="w-16 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-right text-white" /></label>
                  </div>
                </div>

                <div className="space-y-2 border border-neutral-800 p-3 rounded bg-neutral-900/50">
                  <h4 className="text-sm font-medium text-yellow-400">Two-Pole Oscillator</h4>
                  <div className="grid grid-cols-1 gap-2">
                    <label className="text-xs text-neutral-400 flex justify-between items-center">Filter Length <input type="number" value={settings.TWOPOLE_FILTER_LENGTH} onChange={e => update('TWOPOLE_FILTER_LENGTH', e.target.value)} className="w-16 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-right text-white" /></label>
                  </div>
                </div>

                <div className="space-y-2 border border-neutral-800 p-3 rounded bg-neutral-900/50">
                  <h4 className="text-sm font-medium text-[#22c55e]">Market Structure Trend Matrix</h4>
                  <div className="grid grid-cols-1 gap-2">
                    <label className="text-xs text-neutral-400 flex justify-between items-center">ATR Length <input type="number" value={settings.MSMT_ATR_LENGTH} onChange={e => update('MSMT_ATR_LENGTH', e.target.value)} className="w-16 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-right text-white" /></label>
                    <label className="text-xs text-neutral-400 flex justify-between items-center">ATR Mult <input type="number" step="0.1" value={settings.MSMT_ATR_MULT} onChange={e => update('MSMT_ATR_MULT', e.target.value)} className="w-16 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-right text-white" /></label>
                    <label className="text-xs text-neutral-400 flex justify-between items-center">Left Bars <input type="number" value={settings.MSMT_LEFT_BARS} onChange={e => update('MSMT_LEFT_BARS', e.target.value)} className="w-16 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-right text-white" /></label>
                    <label className="text-xs text-neutral-400 flex justify-between items-center">Right Bars <input type="number" value={settings.MSMT_RIGHT_BARS} onChange={e => update('MSMT_RIGHT_BARS', e.target.value)} className="w-16 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-right text-white" /></label>
                  </div>
                </div>

                <div className="space-y-2 border border-neutral-800 p-3 rounded bg-neutral-900/50">
                  <h4 className="text-sm font-medium text-[#8b5cf6]">UT Bot Alerts</h4>
                  <div className="grid grid-cols-1 gap-2">
                    <label className="text-xs text-neutral-400 flex justify-between items-center">Key Value <input type="number" step="0.1" value={settings.UTBOT_KEYVALUE} onChange={e => update('UTBOT_KEYVALUE', e.target.value)} className="w-16 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-right text-white" /></label>
                    <label className="text-xs text-neutral-400 flex justify-between items-center">ATR Period <input type="number" value={settings.UTBOT_ATR_PERIOD} onChange={e => update('UTBOT_ATR_PERIOD', e.target.value)} className="w-16 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-right text-white" /></label>
                  </div>
                </div>

                <div className="space-y-2 border border-neutral-800 p-3 rounded bg-neutral-900/50">
                  <h4 className="text-sm font-medium text-[#10b981]">Nadaraya-Watson Envelope</h4>
                  <div className="grid grid-cols-1 gap-2">
                    <label className="text-xs text-neutral-400 flex justify-between items-center">Bandwidth (h) <input type="number" value={settings.NWENV_H} onChange={e => update('NWENV_H', e.target.value)} className="w-16 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-right text-white" /></label>
                    <label className="text-xs text-neutral-400 flex justify-between items-center">Multiplier <input type="number" step="0.1" value={settings.NWENV_MULT} onChange={e => update('NWENV_MULT', e.target.value)} className="w-16 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-right text-white" /></label>
                  </div>
                </div>

                <div className="space-y-2 border border-neutral-800 p-3 rounded bg-neutral-900/50">
                  <h4 className="text-sm font-medium text-[#22c55e]">Order Block Detector</h4>
                  <div className="grid grid-cols-1 gap-2">
                    <label className="text-xs text-neutral-400 flex justify-between items-center">Volume Pivot Length <input type="number" value={settings.OB_PIVOT_LENGTH} onChange={e => update('OB_PIVOT_LENGTH', e.target.value)} className="w-16 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-right text-white" /></label>
                    <label className="text-xs text-neutral-400 flex justify-between items-center">Max Bullish Blocks <input type="number" value={settings.OB_MAX_BULL} onChange={e => update('OB_MAX_BULL', e.target.value)} className="w-16 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-right text-white" /></label>
                    <label className="text-xs text-neutral-400 flex justify-between items-center">Max Bearish Blocks <input type="number" value={settings.OB_MAX_BEAR} onChange={e => update('OB_MAX_BEAR', e.target.value)} className="w-16 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-right text-white" /></label>
                    <label className="text-xs text-neutral-400 flex justify-between items-center">Mitigation Method
                      <select value={settings.OB_MITIGATION_METHOD} onChange={e => setSettings((s: any) => ({ ...s, OB_MITIGATION_METHOD: e.target.value }))} className="w-20 bg-neutral-900 border border-neutral-800 rounded px-1 py-1 text-right text-white">
                        <option value="wick">Wick</option>
                        <option value="close">Close</option>
                      </select>
                    </label>
                  </div>
                </div>

                <div className="space-y-2 border border-neutral-800 p-3 rounded bg-neutral-900/50">
                  <h4 className="text-sm font-medium text-[#22c55e]">Correlated Sine Oscillator</h4>
                  <div className="grid grid-cols-1 gap-2">
                    <label className="text-xs text-neutral-400 flex justify-between items-center">Cycle Period <input type="number" value={settings.CSO_PERIOD} onChange={e => update('CSO_PERIOD', e.target.value)} className="w-16 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-right text-white" /></label>
                    <label className="text-xs text-neutral-400 flex justify-between items-center">Phase Multiplier <input type="number" step="0.1" value={settings.CSO_MULT} onChange={e => update('CSO_MULT', e.target.value)} className="w-16 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-right text-white" /></label>
                    <label className="text-xs text-neutral-400 flex justify-between items-center text-left">Show Signals <input type="checkbox" checked={settings.CSO_SHOW_SIGNALS} onChange={e => setSettings((s: any) => ({ ...s, CSO_SHOW_SIGNALS: e.target.checked }))} className="w-4 h-4 bg-neutral-900 border border-neutral-800 rounded mx-1" /></label>
                  </div>
                </div>

                <div className="space-y-2 border border-neutral-800 p-3 rounded bg-neutral-900/50">
                  <h4 className="text-sm font-medium text-[#a855f7]">Waddah Attar Explosion</h4>
                  <div className="grid grid-cols-1 gap-2">
                    <label className="text-xs text-neutral-400 flex justify-between items-center">Sensitivity <input type="number" value={settings.WAE_SENSITIVITY} onChange={e => update('WAE_SENSITIVITY', e.target.value)} className="w-16 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-right text-white" /></label>
                    <label className="text-xs text-neutral-400 flex justify-between items-center">Fast EMA <input type="number" value={settings.WAE_FAST} onChange={e => update('WAE_FAST', e.target.value)} className="w-16 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-right text-white" /></label>
                    <label className="text-xs text-neutral-400 flex justify-between items-center">Slow EMA <input type="number" value={settings.WAE_SLOW} onChange={e => update('WAE_SLOW', e.target.value)} className="w-16 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-right text-white" /></label>
                    <label className="text-xs text-neutral-400 flex justify-between items-center">Channel <input type="number" value={settings.WAE_CHANNEL} onChange={e => update('WAE_CHANNEL', e.target.value)} className="w-16 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-right text-white" /></label>
                    <label className="text-xs text-neutral-400 flex justify-between items-center">Multiplier <input type="number" step="0.1" value={settings.WAE_MULT} onChange={e => update('WAE_MULT', e.target.value)} className="w-16 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-right text-white" /></label>
                  </div>
                </div>

                <div className="space-y-2 border border-neutral-800 p-3 rounded bg-neutral-900/50 relative md:col-span-2 lg:col-span-1">
                  <h4 className="text-sm font-medium text-cyan-400">Other Overlays</h4>
                  <div className="grid grid-cols-1 gap-2">
                    <label className="text-xs text-neutral-400 flex justify-between items-center">MA Period <input type="number" value={settings.MA_PERIOD} onChange={e => update('MA_PERIOD', e.target.value)} className="w-16 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-right text-white" /></label>
                    <label className="text-xs text-neutral-400 flex justify-between items-center">RSI Period <input type="number" value={settings.RSI_PERIOD} onChange={e => update('RSI_PERIOD', e.target.value)} className="w-16 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-right text-white" /></label>
                    <label className="text-xs text-neutral-400 flex justify-between items-center">BB Period <input type="number" value={settings.BB_PERIOD} onChange={e => update('BB_PERIOD', e.target.value)} className="w-16 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-right text-white" /></label>
                    <label className="text-xs text-neutral-400 flex justify-between items-center">BB Multiplier <input type="number" value={settings.BB_MULT} onChange={e => update('BB_MULT', e.target.value)} className="w-16 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-right text-white" /></label>
                    <label className="text-xs text-neutral-400 flex justify-between items-center">MA Env Period <input type="number" value={settings.MAENV_PERIOD} onChange={e => update('MAENV_PERIOD', e.target.value)} className="w-16 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-right text-white" /></label>
                    <label className="text-xs text-neutral-400 flex justify-between items-center">MA Env % <input type="number" value={settings.MAENV_PERCENT} onChange={e => update('MAENV_PERCENT', e.target.value)} className="w-16 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-right text-white" /></label>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'styles' && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.keys(settings.visibility).map(key => (
                <div key={key} className="flex items-center justify-between p-2 border border-neutral-800 rounded bg-neutral-900/50">
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      checked={settings.visibility[key]}
                      onChange={e => updateVis(key, e.target.checked)}
                      className="accent-blue-500 w-4 h-4 cursor-pointer"
                    />
                    <span className="text-xs text-neutral-300 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                  </div>
                  {settings.colors[key] && (
                    <input 
                      type="color" 
                      value={settings.colors[key]}
                      onChange={e => updateColor(key, e.target.value)}
                      className="w-6 h-6 p-0 border-0 bg-transparent cursor-pointer rounded"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <button 
          onClick={onClose}
          className="w-full mt-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
}