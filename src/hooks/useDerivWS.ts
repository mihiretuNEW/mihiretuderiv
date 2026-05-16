import { useEffect, useRef, useState } from 'react';
import { DERIV_WS_URL } from '../lib/derivConfig';
import type { CandleData } from '../lib/calculators';

export function useDerivWS(symbol: string, granularity: number) {
  const wsRef = useRef<WebSocket | null>(null);
  const candlesRef = useRef<CandleData[]>([]);
  const pingIntervalRef = useRef<number | null>(null);

  const [candles, setCandles] = useState<CandleData[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  
  useEffect(() => {
    const ws = new WebSocket(DERIV_WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);

      // Ping to keep connection alive
      pingIntervalRef.current = window.setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ ping: 1 }));
        }
      }, 15000);

      // Fetch history and subscribe
      ws.send(JSON.stringify({
        ticks_history: symbol,
        adjust_start_time: 1,
        count: 1000,
        end: 'latest',
        style: 'candles',
        granularity: granularity,
        subscribe: 1
      }));
    };

    ws.onmessage = (msg) => {
      const data = JSON.parse(msg.data);
      
      if (data.error) {
        console.error("Deriv WS Error:", data.error.message);
        return;
      }

      if (data.msg_type === 'candles') {
        const history: CandleData[] = data.candles.map((c: any) => ({
          epoch: c.epoch,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close
        }));
        candlesRef.current = history;
        setCandles([...candlesRef.current]);
      } else if (data.msg_type === 'ohlc') {
        const tick = data.ohlc;
        const newCandle: CandleData = {
          epoch: tick.open_time || tick.epoch,
          open: parseFloat(tick.open),
          high: parseFloat(tick.high),
          low: parseFloat(tick.low),
          close: parseFloat(tick.close)
        };
        
        const prev = candlesRef.current;
        if (prev.length === 0) {
          prev.push(newCandle);
        } else {
          const lastCandle = prev[prev.length - 1];
          if (lastCandle.epoch === newCandle.epoch) {
            prev[prev.length - 1] = newCandle;
          } else {
            prev.push(newCandle);
            if (prev.length > 2000) prev.shift();
          }
        }

        setCandles([...candlesRef.current]);
      }
    };

    ws.onerror = (err) => {
      console.error('WebSocket Error', err);
    };

    ws.onclose = () => {
      setIsConnected(false);
      if (pingIntervalRef.current) window.clearInterval(pingIntervalRef.current);
    };

    return () => {
      if (pingIntervalRef.current) window.clearInterval(pingIntervalRef.current);
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ forget_all: 'ticks' }));
        ws.close();
      } else {
        ws.close();
      }
    };
  }, [symbol, granularity]);

  return { candles, isConnected };
}
