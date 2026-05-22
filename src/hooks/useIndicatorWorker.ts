import { useEffect, useRef, useState } from 'react';
import type { CandleData } from '../lib/calculators';
import type { IndicatorSettings } from '../App';

export function useIndicatorWorker(
  data: CandleData[],
  activeIndicators: Record<string, boolean>,
  settings: IndicatorSettings
) {
  const [workerResult, setWorkerResult] = useState<{
    bottom: any;
    oscillators: Record<string, any>;
  }>({ bottom: null, oscillators: {} });

  const workerRef = useRef<Worker | null>(null);
  const rafRef = useRef<number | null>(null);
  const pendingDataRef = useRef<any>(null);

  useEffect(() => {
    workerRef.current = new Worker(new URL('../workers/indicatorWorker.ts', import.meta.url), {
      type: 'module'
    });

    workerRef.current.onmessage = (e) => {
      const { type, payload, id } = e.data;
      if (type === 'BOTTOM_RESULT') {
        rafRef.current = requestAnimationFrame(() => {
          setWorkerResult(prev => ({ ...prev, bottom: payload }));
        });
      } else if (type === 'OSCILLATOR_RESULT') {
        rafRef.current = requestAnimationFrame(() => {
          setWorkerResult(prev => ({
            ...prev,
            oscillators: {
              ...prev.oscillators,
              [id]: payload
            }
          }));
        });
      }
    };

    return () => {
      if (workerRef.current) workerRef.current.terminate();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    if (!workerRef.current || data.length === 0) return;

    // Throttle worker posting
    if (!pendingDataRef.current) {
      pendingDataRef.current = setTimeout(() => {
        workerRef.current?.postMessage({
          type: 'CALCULATE_BOTTOM',
          payload: { data, settings, activeIndicators }
        });

        const activeOscillators = ['SMI', 'STOCHRSI', 'ZMACD', 'STDSMI', 'TWOPOLE', 'WAE', 'SCALPING', 'CSO'].filter(k => activeIndicators[k]);
        activeOscillators.forEach(osc => {
          workerRef.current?.postMessage({
            type: 'CALCULATE_OSCILLATOR',
            id: osc,
            payload: { data, settings, oscType: osc }
          });
        });

        pendingDataRef.current = null;
      }, 16); // ~60fps
    }
  }, [data, activeIndicators, settings]);

  return workerResult;
}
