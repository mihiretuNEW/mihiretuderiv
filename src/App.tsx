import React, { useState, useEffect, useRef } from 'react';
import { ASSET_PAIRS, TIMEFRAMES } from './lib/derivConfig';
import { useDerivWS } from './hooks/useDerivWS';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { MainChart } from './components/MainChart';
import { BottomChart } from './components/BottomChart';
import { StochChart } from './components/StochChart';

export type IndicatorSettings = {
  SMI_LONG: number;
  SMI_SHORT: number;
  SMI_SIGNAL: number;
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
};

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedSymbol, setSelectedSymbol] = useState(ASSET_PAIRS[0].symbol);
  const [selectedTimeframe, setSelectedTimeframe] = useState(TIMEFRAMES[0].granularity);
  
  // 3 Pane heights/resizing
  const [topPaneHeight, setTopPaneHeight] = useState(250);
  const [bottomPaneHeight, setBottomPaneHeight] = useState(150);
  const [isResizingTop, setIsResizingTop] = useState(false);
  const [isResizingBottom, setIsResizingBottom] = useState(false);
  
  const [isSwapped, setIsSwapped] = useState(false);
  
  const [zoomLevel, setZoomLevel] = useState(50);
  const [scrollOffset, setScrollOffset] = useState(0);

  const handleZoomIn = () => setZoomLevel(prev => Math.max(20, prev - 10));
  const handleZoomOut = () => setZoomLevel(prev => Math.min(200, prev + 10));
  
  const [activeIndicators, setActiveIndicators] = useState<Record<string, boolean>>({
    MA: false,
    RSI: false,
    BB: false,
    PSAR: false,
    STOCHRSI: true,
  });

  const [indicatorSettings, setIndicatorSettings] = useState<IndicatorSettings>({
    SMI_LONG: 20,
    SMI_SHORT: 5,
    SMI_SIGNAL: 5,
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
  });

  const { candles, isConnected } = useDerivWS(selectedSymbol, selectedTimeframe);

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
  };

  const handleMouseUp = () => {
    dragRef.current.isDragging = false;
  };

  const smiErgodicChart = (
    <MainChart 
      data={candles} 
      activeIndicators={activeIndicators}
      settings={indicatorSettings}
      zoomLevel={zoomLevel}
      scrollOffset={scrollOffset}
      onZoomIn={handleZoomIn}
      onZoomOut={handleZoomOut}
    />
  );

  const priceAndIndicatorsChart = (
    <BottomChart 
      data={candles} 
      activeIndicators={activeIndicators}
      settings={indicatorSettings}
      zoomLevel={zoomLevel}
      scrollOffset={scrollOffset}
    />
  );

  const stochRsiChart = (
    <StochChart 
      data={candles} 
      settings={indicatorSettings}
      zoomLevel={zoomLevel}
      scrollOffset={scrollOffset}
    />
  );

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
            isSwapped={isSwapped}
            setIsSwapped={setIsSwapped}
          />
          
          <div 
            className="flex-1 min-h-0 relative flex flex-col p-2 gap-1"
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Top Pane */}
            {(!isSwapped || activeIndicators.STOCHRSI) && (
              <>
                <div 
                  style={{ height: topPaneHeight }}
                  className="bg-[#111111] border border-neutral-800 rounded-lg overflow-hidden shrink-0 relative"
                >
                  {isSwapped ? stochRsiChart : smiErgodicChart}
                </div>
                
                <div 
                  className="h-1.5 w-full bg-neutral-800 hover:bg-neutral-600 active:bg-blue-500 rounded cursor-row-resize transition-colors shrink-0 my-0.5"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setIsResizingTop(true);
                  }}
                />
              </>
            )}
            
            {/* Middle Pane (Price) */}
            <div 
              className="flex-1 bg-[#111111] border border-neutral-800 rounded-lg overflow-hidden relative min-h-[100px]"
            >
              {priceAndIndicatorsChart}
            </div>

            {/* Bottom Pane */}
            {(isSwapped || activeIndicators.STOCHRSI) && (
              <>
                <div 
                  className="h-1.5 w-full bg-neutral-800 hover:bg-neutral-600 active:bg-blue-500 rounded cursor-row-resize transition-colors shrink-0 my-0.5"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setIsResizingBottom(true);
                  }}
                />
                
                <div 
                  style={{ height: bottomPaneHeight }} 
                  className="bg-[#111111] border border-neutral-800 rounded-lg overflow-hidden shrink-0 relative"
                >
                  {isSwapped ? smiErgodicChart : stochRsiChart}
                </div>
              </>
            )}
          </div>
      </div>
    </div>
  );
}

