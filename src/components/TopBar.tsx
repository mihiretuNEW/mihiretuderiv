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
  isSwapped: boolean;
  setIsSwapped: (s: boolean) => void;
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
  setIndicatorSettings,
  isSwapped,
  setIsSwapped
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
        <button 
          onClick={() => setIsSwapped(!isSwapped)}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors border shadow-sm",
            isSwapped 
              ? "bg-purple-600/20 border-purple-500/50 text-purple-200 hover:bg-purple-600/30" 
              : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:bg-neutral-800"
          )}
          title="Swap Main and Sub Chart"
        >
          <ArrowUpDown className="w-4 h-4" />
          Swap View
        </button>

        <div className="relative">
          <button 
            onClick={() => setShowIndicators(!showIndicators)}
            className="flex items-center gap-2 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 rounded-md text-sm font-medium transition-colors border border-neutral-800"
          >
            <Activity className="w-4 h-4 text-blue-500" />
            Indicators
          </button>

          {showIndicators && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl z-50 py-1">
              {Object.keys(activeIndicators).map(ind => (
                <button
                  key={ind}
                  onClick={() => toggleIndicator(ind)}
                  className="w-full text-left px-4 py-2 text-sm flex items-center justify-between hover:bg-neutral-800"
                >
                  <span className={activeIndicators[ind] ? "text-white" : "text-neutral-400"}>
                    {ind === 'MA' ? 'Moving Average' : 
                     ind === 'RSI' ? 'RSI' : 
                     ind === 'BB' ? 'Bollinger Bands' : 
                     ind === 'STOCHRSI' ? 'Stoch RSI' : 'Parabolic SAR'}
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
  const update = (key: string, val: string) => {
    setSettings((prev: any) => ({ ...prev, [key]: Number(val) }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center">
      <div className="bg-[#111] border border-neutral-800 rounded-xl w-full max-w-md p-6 shadow-2xl">
        <h3 className="text-lg font-semibold text-white mb-4">Indicator Settings</h3>
        
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          {/* SMI */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-blue-400">SMI Ergodic</h4>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs text-neutral-400 flex justify-between items-center">
                Long Period
                <input type="number" value={settings.SMI_LONG} onChange={e => update('SMI_LONG', e.target.value)} className="w-16 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-right text-white" />
              </label>
              <label className="text-xs text-neutral-400 flex justify-between items-center">
                Short Period
                <input type="number" value={settings.SMI_SHORT} onChange={e => update('SMI_SHORT', e.target.value)} className="w-16 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-right text-white" />
              </label>
              <label className="text-xs text-neutral-400 flex justify-between items-center">
                Signal Period
                <input type="number" value={settings.SMI_SIGNAL} onChange={e => update('SMI_SIGNAL', e.target.value)} className="w-16 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-right text-white" />
              </label>
            </div>
          </div>

          <div className="h-px bg-neutral-800" />

          {/* StochRSI */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-purple-400">Double Stochastic RSI</h4>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs text-neutral-400 flex justify-between items-center">
                RSI Period
                <input type="number" value={settings.STOCH_RSI_PERIOD} onChange={e => update('STOCH_RSI_PERIOD', e.target.value)} className="w-16 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-right text-white" />
              </label>
              <label className="text-xs text-neutral-400 flex justify-between items-center">
                Stoch Period
                <input type="number" value={settings.STOCH_PERIOD} onChange={e => update('STOCH_PERIOD', e.target.value)} className="w-16 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-right text-white" />
              </label>
              <label className="text-xs text-neutral-400 flex justify-between items-center">
                Smooth K
                <input type="number" value={settings.STOCH_K} onChange={e => update('STOCH_K', e.target.value)} className="w-16 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-right text-white" />
              </label>
              <label className="text-xs text-neutral-400 flex justify-between items-center">
                Smooth D
                <input type="number" value={settings.STOCH_D} onChange={e => update('STOCH_D', e.target.value)} className="w-16 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-right text-white" />
              </label>
            </div>
          </div>

          <div className="h-px bg-neutral-800" />

          {/* Simple Settings */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-blue-400">Other Overlays</h4>
            <label className="text-xs text-neutral-400 flex justify-between items-center">
              MA Period
              <input type="number" value={settings.MA_PERIOD} onChange={e => update('MA_PERIOD', e.target.value)} className="w-16 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-right text-white" />
            </label>
            <label className="text-xs text-neutral-400 flex justify-between items-center">
              RSI Period
              <input type="number" value={settings.RSI_PERIOD} onChange={e => update('RSI_PERIOD', e.target.value)} className="w-16 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-right text-white" />
            </label>
            <label className="text-xs text-neutral-400 flex justify-between items-center">
              BB Period
              <input type="number" value={settings.BB_PERIOD} onChange={e => update('BB_PERIOD', e.target.value)} className="w-16 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-right text-white" />
            </label>
            <label className="text-xs text-neutral-400 flex justify-between items-center">
              BB Multiplier
              <input type="number" value={settings.BB_MULT} onChange={e => update('BB_MULT', e.target.value)} className="w-16 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-right text-white" />
            </label>
          </div>
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
