
import { useEffect, useState } from 'react';

export function usePubgAirdropTimer(
  targetEpochMs,
  serverOffsetMs = 0
) {
  const calculateRemaining = () =>
    Math.max(
      0,
      targetEpochMs - (Date.now() + serverOffsetMs)
    );

  const [remainingMs, setRemainingMs] = useState(
    calculateRemaining
  );

  useEffect(() => {
    const update = () => {
      setRemainingMs(calculateRemaining());
    };

    update();

    const intervalId = window.setInterval(update, 250);

    document.addEventListener(
      'visibilitychange',
      update
    );

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener(
        'visibilitychange',
        update
      );
    };
  }, [targetEpochMs, serverOffsetMs]);

  const totalSeconds = Math.ceil(remainingMs / 1000);

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return {
    remainingMs,
    isExpired: remainingMs === 0,
    formatted: `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
  };
}
