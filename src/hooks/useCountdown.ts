import { useState, useEffect, useRef } from 'react';

export function useCountdown(targetDate: Date | null, maxDaysAhead = 7): string | null {
  const [countdown, setCountdown] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!targetDate) { setCountdown(null); return; }

    const sevenDays = maxDaysAhead * 24 * 60 * 60 * 1000;
    if (targetDate.getTime() - Date.now() > sevenDays) { setCountdown(null); return; }

    const tick = () => {
      const diff = targetDate.getTime() - Date.now();
      if (diff <= 0) { setCountdown('¡Partido en curso!'); clearInterval(intervalRef.current!); return; }
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setCountdown(`${days}d ${String(hours).padStart(2,'0')}:${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`);
    };
    tick();
    intervalRef.current = setInterval(tick, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [targetDate?.getTime(), maxDaysAhead]);

  return countdown;
}
