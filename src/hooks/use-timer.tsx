import { useState, useEffect, useRef } from "react";

export type Difficulty = "facil" | "medio" | "dificil";

export interface TimerConfig {
  facil: number; // 55 segundos
  medio: number; // 30 segundos
  dificil: number; // 15 segundos
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

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  const start = () => {
    setState(prev => ({ ...prev, isRunning: true, timeLeft: TIMER_CONFIG[difficulty] }));
    startTimeRef.current = Date.now();
    
    intervalRef.current = setInterval(() => {
      setState(prev => {
        const newTimeLeft = Math.max(0, prev.timeLeft - 1);
        if (newTimeLeft === 0) {
          stop();
          return { ...prev, timeLeft: 0, isRunning: false };
        }
        return { ...prev, timeLeft: newTimeLeft };
      });
    }, 1000);
  };

  const stop = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setState(prev => ({ ...prev, isRunning: false }));
  };

  const answer = (correct: boolean) => {
    const answerTime = Date.now() - startTimeRef.current;
    setState(prev => ({
      ...prev,
      hasAnswered: true,
      answerTime: answerTime,
      isRunning: false
    }));
    stop();
  };

  const reset = () => {
    stop();
    setState({
      timeLeft: TIMER_CONFIG[difficulty],
      isRunning: false,
      hasAnswered: false
    });
    startTimeRef.current = 0;
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    ...state,
    start,
    stop,
    answer,
    reset,
    getTimeConfig: () => TIMER_CONFIG[difficulty]
  };
}
