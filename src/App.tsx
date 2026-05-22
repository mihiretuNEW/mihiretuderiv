import React, { useState, useEffect, useRef } from 'react';
import { ASSET_PAIRS, TIMEFRAMES } from './lib/derivConfig';
import { useDerivWS } from './hooks/useDerivWS';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { BottomChart } from './components/BottomChart';
import { OscillatorChart } from './components/OscillatorChart';
import { useIndicatorWorker } from './hooks/useIndicatorWorker';

export type IndicatorSettings = {
  TRENDLINES_LENGTH: number;
  TRENDLINES_MULT: number;
  TRENDLINES_STYLE: string;
  GTA_LONG: number;
  GTA_MID: number;
  GTA_SHORT: number;
  SCALPING_LOOKBACK: number;
  SCALPING_EMA: number;
  SCALPING_LOOKBACK_HL: number;
  SMI_LONG: number;
  SMI_SHORT: number;
  SMI_SIGNAL: number;
  ZMACD_FAST: number;
  ZMACD_SLOW: number;
  ZMACD_SIGNAL: number;
  STDSMI_Q: number;
  STDSMI_R: number;
  STDSMI_S: number;
  STDSMI_SIGNAL: number;
  MAENV_PERIOD: number;
  MAENV_PERCENT: number;
  TWOPOLE_FILTER_LENGTH: number;
  MSMT_ATR_LENGTH: number;
  MSMT_ATR_MULT: number;
  MSMT_LEFT_BARS: number;
  MSMT_RIGHT_BARS: number;
  MA_PERIOD: number;
  RSI_PERIOD: number;
  BB_PERIOD: number;
  BB_MULT: number;
  PSAR_STEP: number;
  PSAR_MAX: number;
  STOCH_RSI_PERIOD: number;
  STOCH_PERIOD: number;
  STOCH_K: number;
  STOCH_D: number;
  ATRFIB_WMA_PERIOD: number;
  ATRFIB_ATR_PERIOD: number;
  ATRFIB_MULTIPLIER: number;
  UTBOT_KEYVALUE: number;
  UTBOT_ATR_PERIOD: number;
  NWENV_H: number;
  NWENV_MULT: number;
  WAE_SENSITIVITY: number;
  WAE_FAST: number;
  WAE_SLOW: number;
  WAE_CHANNEL: number;
  WAE_MULT: number;
  CSO_PERIOD: number;
  CSO_MULT: number;
  CSO_SHOW_SIGNALS: boolean;
  OB_PIVOT_LENGTH: number;
  OB_MAX_BULL: number;
  OB_MAX_BEAR: number;
  OB_MITIGATION_METHOD: string;
  colors: Record<string, string>;
  visibility: Record<string, boolean>;
};

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  const [selectedSymbol, setSelectedSymbol] = useState(() => {
    return localStorage.getItem('selectedSymbol') || ASSET_PAIRS[0].symbol;
  });
  
  const [selectedTimeframe, setSelectedTimeframe] = useState(() => {
    return localStorage.getItem('selectedTimeframe') || TIMEFRAMES[0].granularity;
  });

  // 3 Pane heights/resizing
  const [topPaneHeight, setTopPaneHeight] = useState(250);
  const [bottomPaneHeight, setBottomPaneHeight] = useState(150);
  const [isResizingTop, setIsResizingTop] = useState(false);
  const [isResizingBottom, setIsResizingBottom] = useState(false);
  
  const [zoomLevel, setZoomLevel] = useState(50);
  const [scrollOffset, setScrollOffset] = useState(0);

  const handleZoomIn = () => setZoomLevel(prev => Math.max(20, prev - 10));
  const handleZoomOut = () => setZoomLevel(prev => Math.min(200, prev + 10));
  
  const defaultActive = {
    GTA: true,
    SCALPING: true,
    MA: false,
    RSI: false,
    BB: false,
    PSAR: false,
    STOCHRSI: true,
    ATRFIBENV: false,
    SMI: true,
    ZMACD: false,
    STDSMI: false,
    MAENV: false,
    TWOPOLE: false,
    MSMT: true,
    UTBOT: true,
    NWENV: false,
    WAE: true,
    CSO: true,
    OB: true,
    TRENDLINES_BREAKS: true
  };

  const [activeIndicators, setActiveIndicators] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('activeIndicators');
      if (saved) return { ...defaultActive, ...JSON.parse(saved) };
    } catch(e){}
    return defaultActive;
  });

  const defaultSettings: IndicatorSettings = {
    TRENDLINES_LENGTH: 14,
    TRENDLINES_MULT: 1.0,
    TRENDLINES_STYLE: 'dot',
    GTA_LONG: 21,
    GTA_MID: 13,
    GTA_SHORT: 6,
    SCALPING_LOOKBACK: 6,
    SCALPING_EMA: 4,
    SCALPING_LOOKBACK_HL: 2,
    SMI_LONG: 20,
    SMI_SHORT: 5,
    SMI_SIGNAL: 5,
    ZMACD_FAST: 12,
    ZMACD_SLOW: 26,
    ZMACD_SIGNAL: 9,
    STDSMI_Q: 14,
    STDSMI_R: 25,
    STDSMI_S: 2,
    STDSMI_SIGNAL: 9,
    MAENV_PERIOD: 20,
    MAENV_PERCENT: 5,
    TWOPOLE_FILTER_LENGTH: 14,
    MSMT_ATR_LENGTH: 14,
    MSMT_ATR_MULT: 3.0,
    MSMT_LEFT_BARS: 5,
    MSMT_RIGHT_BARS: 5,
    UTBOT_KEYVALUE: 1,
    UTBOT_ATR_PERIOD: 10,
    NWENV_H: 8,
    NWENV_MULT: 3.0,
    WAE_SENSITIVITY: 150,
    WAE_FAST: 20,
    WAE_SLOW: 40,
    WAE_CHANNEL: 20,
    WAE_MULT: 2.0,
    MA_PERIOD: 20,
    RSI_PERIOD: 14,
    BB_PERIOD: 20,
    BB_MULT: 2,
    PSAR_STEP: 0.02,
    PSAR_MAX: 0.2,
    STOCH_RSI_PERIOD: 14,
    STOCH_PERIOD: 14,
    STOCH_K: 3,
    STOCH_D: 3,
    ATRFIB_WMA_PERIOD: 100,
    ATRFIB_ATR_PERIOD: 100,
    ATRFIB_MULTIPLIER: 3,
    CSO_PERIOD: 20,
    CSO_MULT: 1.0,
    CSO_SHOW_SIGNALS: true,
    OB_PIVOT_LENGTH: 5,
    OB_MAX_BULL: 3,
    OB_MAX_BEAR: 3,
    OB_MITIGATION_METHOD: 'wick',
    colors: {
      ma: '#ec4899', rsi: '#a855f7', bbUpper: '#14b8a6', bbLower: '#14b8a6', psar: '#eab308',
      smiSmi: '#06b6d4', smiSignal: '#f59e0b', smiHistogramUp: '#10b981', smiHistogramDown: '#ef4444',
      stdSmiSmi: '#06b6d4', stdSmiSignal: '#f59e0b',
      zmacdMacd: '#3b82f6', zmacdSignal: '#f59e0b', zmacdHistUp: '#10b981', zmacdHistDown: '#ef4444',
      maenvUpper: '#3b82f6', maenvLower: '#3b82f6',
      stochK: '#06b6d4', stochD: '#f59e0b',
      twopoleBull: '#3b82f6', twopoleBear: '#a855f7', twopoleSignal: '#f59e0b',
      msmtTrailingUp: '#22c55e', msmtTrailingDown: '#ec4899', msmtTarget: '#eab308',
      utbotTrailingStop: '#8b5cf6', utbotBuy: '#22c55e', utbotSell: '#ef4444',
      nwenvUpper: '#10b981', nwenvLower: '#ef4444', nwenvBase: '#3b82f6',
      waeGreen: '#22c55e', waeRed: '#ef4444', waeExplosion: '#a855f7', waeDeadZone: '#fbbf24'
    },
    visibility: {
      ma: true, rsi: true, bbUpper: true, bbLower: true, psar: true,
      smiSmi: true, smiSignal: true, smiHistogram: true,
      stdSmiSmi: true, stdSmiSignal: true,
      zmacdMacd: true, zmacdSignal: true, zmacdHist: true,
      maenvUpper: true, maenvLower: true,
      stochK: true, stochD: true,
      twopoleInvalidation: true, twopoleSignal: true, twopoleOscillator: true,
      msmtTrailingLine: true, msmtTargets: true,
      utbotTrailingStop: true, utbotSignals: true,
      nwenvBands: true, nwenvBase: true, nwenvSignals: true,
      waeHistogram: true, waeLines: true, waeSignals: true
    }
  };

  const [indicatorSettings, setIndicatorSettings] = useState<IndicatorSettings>(() => {
    try {
      const saved = localStorage.getItem('indicatorSettings');
      if (saved) {
        const parsed = JSON.parse(saved);
        return { 
          ...defaultSettings, 
          ...parsed,
          colors: { ...defaultSettings.colors, ...(parsed.colors || {}) },
          visibility: { ...defaultSettings.visibility, ...(parsed.visibility || {}) }
        };
      }
    } catch(e){}
    return defaultSettings;
  });

  useEffect(() => { localStorage.setItem('selectedSymbol', selectedSymbol); }, [selectedSymbol]);
  useEffect(() => { localStorage.setItem('selectedTimeframe', selectedTimeframe); }, [selectedTimeframe]);
  useEffect(() => { localStorage.setItem('activeIndicators', JSON.stringify(activeIndicators)); }, [activeIndicators]);
  useEffect(() => { localStorage.setItem('indicatorSettings', JSON.stringify(indicatorSettings)); }, [indicatorSettings]);

  const { candles, isConnected, fetchMoreHistory } = useDerivWS(selectedSymbol, selectedTimeframe);
  
  const workerResult = useIndicatorWorker(candles, activeIndicators, indicatorSettings);

  // MTF Mini Dashboard Logic
  const { candles: m2Candles } = useDerivWS(selectedSymbol, 120, 2);
  const { candles: m5Candles } = useDerivWS(selectedSymbol, 300, 2);

  const getTrend = (data: typeof candles) => {
    if (data.length < 2) return null;
    const current = data[data.length - 1];
    return current.close >= current.open ? 'Rise' : 'Fall';
  };
  
  const m2Trend = getTrend(m2Candles);
  const m5Trend = getTrend(m5Candles);

  // Auto fetch more history if scrolling near the oldest loaded candle
  useEffect(() => {
    if (candles.length > 0 && (scrollOffset + zoomLevel) >= candles.length * 0.8) {
      if (fetchMoreHistory) {
        fetchMoreHistory();
      }
    }
  }, [scrollOffset, zoomLevel, candles.length, fetchMoreHistory]);

  useEffect(() => {
    if (!isResizingTop && !isResizingBottom) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingTop) {
        setTopPaneHeight(prev => {
          const newHeight = prev + e.movementY;
          return Math.max(100, Math.min(newHeight, window.innerHeight * 0.5));
        });
      } else if (isResizingBottom) {
        setBottomPaneHeight(prev => {
          const newHeight = prev - e.movementY;
          return Math.max(100, Math.min(newHeight, window.innerHeight * 0.5));
        });
      }
    };
    
    const handleMouseUp = () => {
      setIsResizingTop(false);
      setIsResizingBottom(false);
      document.body.style.cursor = 'default';
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'row-resize';
    
    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = 'default';
    };
  }, [isResizingTop, isResizingBottom]);

  // Panning logic
  const dragRef = useRef({ isDragging: false, startX: 0 });
  const centerPaneRef = useRef<HTMLDivElement>(null);
  const crosshairXRef = useRef<HTMLDivElement>(null);
  const crosshairYRef = useRef<HTMLDivElement>(null);

  const handleWheel = (e: React.WheelEvent) => {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      setScrollOffset(prev => Math.max(0, prev + (e.deltaX > 0 ? 2 : -2)));
    } else {
      if (e.deltaY > 0) handleZoomOut();
      else handleZoomIn();
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    dragRef.current = { isDragging: true, startX: e.clientX };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (dragRef.current.isDragging) {
      const dx = e.clientX - dragRef.current.startX;
      if (Math.abs(dx) > 10) {
        setScrollOffset(prev => Math.max(0, prev + (dx > 0 ? -1 : 1)));
        dragRef.current.startX = e.clientX;
      }
    }
    
    if (centerPaneRef.current && crosshairXRef.current && crosshairYRef.current) {
      const rect = centerPaneRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
        crosshairXRef.current.style.transform = `translateX(${x}px)`;
        crosshairYRef.current.style.transform = `translateY(${y}px)`;
        crosshairXRef.current.style.opacity = '1';
        crosshairYRef.current.style.opacity = '1';
      }
    }
  };

  const handleMouseUp = () => {
    dragRef.current.isDragging = false;
  };
  
  const handleMouseLeave = () => {
    handleMouseUp();
    if (crosshairXRef.current && crosshairYRef.current) {
      crosshairXRef.current.style.opacity = '0';
      crosshairYRef.current.style.opacity = '0';
    }
  };

  const activeOscillators = ['SMI', 'STOCHRSI', 'ZMACD', 'STDSMI', 'TWOPOLE', 'WAE', 'SCALPING', 'CSO'].filter(k => activeIndicators[k]);

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-neutral-200 overflow-hidden font-sans">
      <Sidebar 
        isOpen={sidebarOpen} 
        setIsOpen={setSidebarOpen}
        selected={selectedSymbol}
        onSelect={setSelectedSymbol}
      />
      
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
          <TopBar 
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            selectedSymbol={selectedSymbol}
            isConnected={isConnected}
            selectedTimeframe={selectedTimeframe}
            onSelectTimeframe={setSelectedTimeframe}
            activeIndicators={activeIndicators}
            setActiveIndicators={setActiveIndicators}
            indicatorSettings={indicatorSettings}
            setIndicatorSettings={setIndicatorSettings}
          />
          
          <div 
            ref={centerPaneRef}
            className="flex-1 min-h-0 relative flex flex-col p-2 gap-1 group cursor-crosshair overflow-hidden"
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
          >
            {/* Global High Performance Crosshair */}
            <div ref={crosshairXRef} className="pointer-events-none absolute top-0 bottom-0 w-px border-l border-dashed border-neutral-600 opacity-0 z-50" style={{ left: 0, willChange: 'transform' }} />
            <div ref={crosshairYRef} className="pointer-events-none absolute left-0 right-0 h-px border-t border-dashed border-neutral-600 opacity-0 z-50" style={{ top: 0, willChange: 'transform' }} />

            {/* Floating Navigation Controls */}
            <div className="absolute bottom-6 right-6 z-50 flex flex-col gap-2 bg-neutral-900/80 backdrop-blur border border-neutral-700/50 p-1.5 rounded-lg opacity-30 focus-within:opacity-100 hover:opacity-100 transition-opacity">
              <div className="flex gap-1 justify-center border-b border-neutral-700/50 pb-1.5">
                 <button onClick={() => setScrollOffset(prev => prev + 10)} className="w-8 h-8 flex items-center justify-center bg-neutral-800 hover:bg-neutral-600 text-white rounded font-bold transition-colors">&lt;</button>
                 <button onClick={() => setScrollOffset(prev => Math.max(0, prev - 10))} className="w-8 h-8 flex items-center justify-center bg-neutral-800 hover:bg-neutral-600 text-white rounded font-bold transition-colors">&gt;</button>
              </div>
              <div className="flex gap-1 justify-center pt-1.5">
                 <button onClick={handleZoomOut} className="w-8 h-8 flex items-center justify-center bg-neutral-800 hover:bg-neutral-600 text-white rounded font-bold transition-colors">-</button>
                 <button onClick={handleZoomIn} className="w-8 h-8 flex items-center justify-center bg-neutral-800 hover:bg-neutral-600 text-white rounded font-bold transition-colors">+</button>
              </div>
            </div>

            {/* Price Chart */}
            <div 
              className="flex-[2] bg-[#111111] border border-neutral-800 rounded-lg overflow-hidden relative min-h-[200px]"
            >
              <BottomChart 
                data={candles} 
                activeIndicators={activeIndicators}
                settings={indicatorSettings}
                zoomLevel={zoomLevel}
                scrollOffset={scrollOffset}
                symbol={selectedSymbol}
                calcData={workerResult.bottom}
              />
              
              {/* Mini MTF Trend Dashboard */}
              <div className="absolute bottom-4 right-[65px] z-[40] flex gap-2 bg-neutral-900/90 backdrop-blur-md border border-neutral-800 px-2 py-1 rounded shadow-lg items-center select-none">
                 <div className="flex items-center gap-1.5 text-[10px]">
                    <span className="text-neutral-400 font-medium">2M</span>
                    {m2Trend ? (
                      <span className={`font-bold ${m2Trend === 'Rise' ? 'text-green-500' : 'text-red-500'}`}>{m2Trend}</span>
                    ) : <span className="text-neutral-500">Wait</span>}
                 </div>
                 <div className="w-px h-3 bg-neutral-800"></div>
                 <div className="flex items-center gap-1.5 text-[10px]">
                    <span className="text-neutral-400 font-medium">5M</span>
                    {m5Trend ? (
                      <span className={`font-bold ${m5Trend === 'Rise' ? 'text-green-500' : 'text-red-500'}`}>{m5Trend}</span>
                    ) : <span className="text-neutral-500">Wait</span>}
                 </div>
              </div>
            </div>

            {/* Oscillators */}
            {activeOscillators.map((osc) => (
               <div key={osc} className="flex-1 min-h-[120px] bg-[#111111] border border-neutral-800 rounded-lg overflow-hidden shrink-0 relative mt-1">
                 <OscillatorChart 
                   type={osc as any}
                   data={candles}
                   settings={indicatorSettings}
                   zoomLevel={zoomLevel}
                   scrollOffset={scrollOffset}
                   calcData={workerResult.oscillators[osc]}
                 />
               </div>
            ))}
          </div>
      </div>
    </div>
  );
}
