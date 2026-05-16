import { ASSET_PAIRS } from '../lib/derivConfig';
import { cn } from '../lib/utils';
import { ChevronLeft, BarChart3 } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (o: boolean) => void;
  selected: string;
  onSelect: (s: string) => void;
}

export function Sidebar({ isOpen, setIsOpen, selected, onSelect }: SidebarProps) {
  return (
    <div className={cn(
      "h-full border-r border-neutral-800 bg-[#0a0a0a] flex flex-col shrink-0 transition-[width] duration-200 ease-out",
      isOpen ? "w-64" : "w-0 overflow-hidden border-none"
    )}>
      <div className="flex items-center justify-between p-4 border-b border-neutral-800 shrink-0 min-w-max">
        <div className="flex items-center gap-2 font-semibold text-white">
          <BarChart3 className="w-5 h-5 text-blue-500" />
          <span>Markets</span>
        </div>
        <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white">
          <ChevronLeft className="w-5 h-5" />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 scrollbar-hide">
        <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2 px-2 mt-2">
          Volatility Indices
        </div>
        {ASSET_PAIRS.filter(a => a.type === 'Volatility').map(asset => (
          <button
            key={asset.symbol}
            onClick={() => onSelect(asset.symbol)}
            className={cn(
              "w-full text-left px-3 py-2 text-sm rounded transition-colors mb-1",
              selected === asset.symbol ? "bg-blue-600/20 text-blue-500 font-medium" : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
            )}
          >
            {asset.name}
          </button>
        ))}

        <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2 px-2 mt-4">
          Jump Indices
        </div>
        {ASSET_PAIRS.filter(a => a.type === 'Jump').map(asset => (
          <button
            key={asset.symbol}
            onClick={() => onSelect(asset.symbol)}
            className={cn(
              "w-full text-left px-3 py-2 text-sm rounded transition-colors mb-1",
              selected === asset.symbol ? "bg-blue-600/20 text-blue-500 font-medium" : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
            )}
          >
            {asset.name}
          </button>
        ))}
      </div>
    </div>
  );
}
