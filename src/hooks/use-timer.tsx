import { useCallback, useEffect, useRef, useState } from "react";

export type Difficulty = "facil" | "medio" | "dificil";

export interface TimerConfig {
  facil: number;
  medio: number;
  dificil: number;
}

export const TIMER_CONFIG: TimerConfig = {
  facil: 55,
  medio: 30,
  dificil: 15
};

export interface TimerState {
  timeLeft: number;
  isRunning: boolean;
  hasAnswered: boolean;
  answerTime?: number;
}

export function useTimer(difficulty: Difficulty) {
  const [state, setState] = useState<TimerState>({
    timeLeft: TIMER_CONFIG[difficulty],
    isRunning: false,
    hasAnswered: false
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const runInterval = useCallback(() => {
    clearTimer();
    intervalRef.current = setInterval(() => {
      setState(prev => {
        const nextTime = Math.max(0, prev.timeLeft - 1);
        if (nextTime === 0) {
          clearTimer();
          return { ...prev, timeLeft: 0, isRunning: false };
        }

        return { ...prev, timeLeft: nextTime };
      });
    }, 1000);
  }, [clearTimer]);

  const start = useCallback(() => {
    clearTimer();
    startTimeRef.current = Date.now();
    setState({
      timeLeft: TIMER_CONFIG[difficulty],
      isRunning: true,
      hasAnswered: false
    });
    runInterval();
  }, [clearTimer, difficulty, runInterval]);

  const pause = useCallback(() => {
    clearTimer();
    setState(prev => ({ ...prev, isRunning: false }));
  }, [clearTimer]);

  const resume = useCallback(() => {
    setState(prev => {
      if (prev.timeLeft <= 0 || prev.hasAnswered || prev.isRunning) return prev;
      return { ...prev, isRunning: true };
    });
    runInterval();
  }, [runInterval]);

  const stop = useCallback(() => {
    clearTimer();
    setState(prev => ({ ...prev, isRunning: false }));
  }, [clearTimer]);

  const answer = useCallback(() => {
    const answerTime = Date.now() - startTimeRef.current;
    clearTimer();
    setState(prev => ({
      ...prev,
      hasAnswered: true,
      answerTime,
      isRunning: false
    }));
  }, [clearTimer]);

  const reset = useCallback(() => {
    clearTimer();
    setState({
      timeLeft: TIMER_CONFIG[difficulty],
      isRunning: false,
      hasAnswered: false
    });
    startTimeRef.current = 0;
  }, [clearTimer, difficulty]);

  useEffect(() => clearTimer, [clearTimer]);

  return {
    ...state,
    start,
    pause,
    resume,
    stop,
    answer,
    reset,
    getTimeConfig: () => TIMER_CONFIG[difficulty]
  };
}
