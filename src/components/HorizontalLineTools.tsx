import React, { useEffect, useState } from 'react';
import { PenTool, Trash2 } from 'lucide-react';

type Line = { price: number; color: string; thickness: number; id: string };

class LinesStore {
  lines: Record<string, Line[]> = {};
  drawMode: boolean = false;
  currentColor: string = '#3b82f6';
  currentThickness: number = 1;
  selectedLineId: string | null = null;
  listeners: Set<() => void> = new Set();

  constructor() {
    try {
      const saved = localStorage.getItem('hl_lines_v2');
      if (saved) this.lines = JSON.parse(saved);
    } catch {}

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          this.drawMode = false;
          this.selectedLineId = null;
          this.notify();
        }
      });
    }
  }

  notify() {
    this.listeners.forEach(l => l());
    localStorage.setItem('hl_lines_v2', JSON.stringify(this.lines));
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  toggleDrawMode() {
    this.drawMode = !this.drawMode;
    if (this.drawMode) this.selectedLineId = null;
    this.notify();
  }

  setColor(c: string) {
    this.currentColor = c;
    this.notify();
  }

  setThickness(t: number) {
    this.currentThickness = t;
    this.notify();
  }

  addLine(symbol: string, price: number) {
    if (!this.lines[symbol]) this.lines[symbol] = [];
    this.lines[symbol].push({ price, color: this.currentColor, thickness: this.currentThickness, id: Math.random().toString() });
    this.notify();
  }

  clearLines(symbol: string) {
    this.lines[symbol] = [];
    this.notify();
  }

  selectLine(id: string | null) {
    this.selectedLineId = id;
    if (id) this.drawMode = false;
    this.notify();
  }

  updateSelectedLine(updates: Partial<Line>) {
    if (!this.selectedLineId) return;
    for (const sym in this.lines) {
      const idx = this.lines[sym].findIndex(l => l.id === this.selectedLineId);
      if (idx !== -1) {
        this.lines[sym][idx] = { ...this.lines[sym][idx], ...updates };
        this.notify();
        return;
      }
    }
  }

  removeLine(id: string) {
    for (const sym in this.lines) {
      this.lines[sym] = this.lines[sym].filter(l => l.id !== id);
    }
    if (this.selectedLineId === id) this.selectedLineId = null;
    this.notify();
  }
}

export const hLineStore = new LinesStore();

export function useHLineStore() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const unsub = hLineStore.subscribe(() => setTick(t => t + 1));
    return unsub;
  }, []);
  return hLineStore;
}

export function HorizontalLineToolbar({ symbol }: { symbol: string }) {
  const store = useHLineStore();

  return (
    <div className="flex items-center gap-2 border-r border-neutral-800 pr-3 mr-1">
      <button
        onClick={() => store.toggleDrawMode()}
        className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors border ${store.drawMode ? "bg-blue-900/50 border-blue-500 text-blue-200" : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:bg-neutral-800"}`}
        title="Draw Horizontal Line"
      >
        <PenTool className="w-3.5 h-3.5" />
        H-Line
      </button>

      {store.drawMode && (
        <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 rounded-md p-1">
           {['#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#a855f7'].map(c => (
             <button key={c} onClick={() => store.setColor(c)} className={`w-4 h-4 rounded-full ${store.currentColor === c ? 'ring-2 ring-white' : ''}`} style={{ backgroundColor: c }} />
           ))}
           <div className="w-px h-4 bg-neutral-700 mx-1" />
           {[1, 2, 3].map(t => (
             <button key={t} onClick={() => store.setThickness(t)} className={`text-[10px] px-1 rounded ${store.currentThickness === t ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}>{t}x</button>
           ))}
        </div>
      )}

      <button
        onClick={() => store.clearLines(symbol)}
        className="p-1.5 bg-neutral-900 hover:bg-red-900/50 border border-neutral-800 hover:border-red-500/50 rounded-md text-neutral-400 hover:text-red-400 transition-colors ml-1"
        title="Clear Horizontal Lines"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function HorizontalLinesOverlay(props: any) {
  const { yAxisMap, xAxisMap, width, height } = props;
  const store = useHLineStore();
  const symbol = props.symbol;
  
  if (!yAxisMap || !yAxisMap.main || !symbol) return null;
  const scale = yAxisMap.main.scale;

  const lines = store.lines[symbol] || [];

  return (
    <g className="horizontal-lines-overlay text-neutral-400">
       {/* Visible lines */}
       {lines.map(line => {
         const y = scale(line.price);
         if (y === undefined || isNaN(y)) return null;
         const isSelected = store.selectedLineId === line.id;
         const ySafe = Math.max(0, Math.min(y, height - 35));

         return (
           <g key={line.id} 
              style={{ cursor: 'pointer', pointerEvents: 'all' }}
              onMouseDown={(e) => { e.stopPropagation(); hLineStore.selectLine(line.id); }}
           >
             <line x1={0} y1={y} x2={width} y2={y} stroke={line.color} strokeWidth={line.thickness} strokeDasharray={isSelected ? undefined : "4 4"} />
             <rect x={width + 2} y={y - 8} width={45} height={16} fill={line.color} rx={2} />
             <text x={width + 24} y={y + 3} fill="#0e0e0e" fontSize={9} fontWeight="bold" textAnchor="middle">{line.price.toFixed(2)}</text>
             
             {/* Invisible thicker line for easier clicking */}
             <line x1={0} y1={y} x2={width} y2={y} stroke="transparent" strokeWidth={15} />

             {isSelected && (
                <foreignObject x={Math.max(10, width/2 - 90)} y={ySafe - 40} width={180} height={38}>
                    <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-700 rounded-md p-1.5 shadow-lg w-max" onMouseDown={e => e.stopPropagation()}>
                       {['#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#a855f7', '#ffffff'].map(c => (
                         <button key={c} onClick={(e) => { e.stopPropagation(); store.updateSelectedLine({ color: c }); }} className={`w-4 h-4 rounded-full ${line.color === c ? 'ring-2 ring-white' : ''}`} style={{ backgroundColor: c }} />
                       ))}
                       <div className="w-px h-4 bg-neutral-700 mx-1" />
                       {[1, 2, 3].map(t => (
                         <button key={t} onClick={(e) => { e.stopPropagation(); store.updateSelectedLine({ thickness: t }); }} className={`text-[10px] px-1.5 rounded ${line.thickness === t ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}>{t}x</button>
                       ))}
                       <div className="w-px h-4 bg-neutral-700 mx-1" />
                       <button onClick={(e) => { e.stopPropagation(); store.removeLine(line.id); }} className="text-red-400 hover:text-red-300 bg-red-900/30 hover:bg-red-900/50 rounded ml-1 p-1">
                            <Trash2 className="w-3.5 h-3.5" />
                       </button>
                    </div>
                </foreignObject>
             )}
           </g>
         );
       })}

       {/* Invisible interaction layer */}
       {store.drawMode && (
         <rect 
           x={0} width={width} y={0} height={height} 
           fill="#ffffff"
           fillOpacity={0}
           style={{ cursor: 'crosshair', pointerEvents: 'all' }}
           onContextMenu={(e) => {
             e.preventDefault();
             e.stopPropagation();
             hLineStore.drawMode = false;
             hLineStore.notify();
           }}
           onMouseDown={(e) => {
             e.stopPropagation();
             e.preventDefault();
             if (e.button === 2) {
                hLineStore.drawMode = false;
                hLineStore.notify();
                return;
             }
             const rect = (e.target as Element).getBoundingClientRect();
             const y = e.clientY - rect.top;
             const price = scale.invert(y);
             hLineStore.addLine(symbol, price);
           }}
         />
       )}
    </g>
  );
}
