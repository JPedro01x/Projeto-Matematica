import { useTimer } from "@/hooks/use-timer";
import { Card } from "@/components/ui/card";
import { Clock, Pause } from "lucide-react";
import { useEffect, useRef } from "react";

interface TimerProps {
  difficulty: "facil" | "medio" | "dificil";
  onTimeUp: () => void;
  isRunning?: boolean;
  isPaused?: boolean;
  forceZero?: boolean;
}

export function Timer({ difficulty, onTimeUp, isRunning = true, isPaused = false, forceZero = false }: TimerProps) {
  const timer = useTimer(difficulty);
  const {
    answerTime,
    hasAnswered,
    isRunning: timerIsRunning,
    pause,
    resume,
    start,
    stop,
    timeLeft,
    getTimeConfig
  } = timer;
  const timeUpSentRef = useRef(false);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!isRunning || isPaused || startedRef.current) return;

    startedRef.current = true;
    start();

    return () => stop();
  }, [isRunning, isPaused, start, stop]);

  useEffect(() => {
    if (!startedRef.current) return;

    if (isPaused || forceZero) {
      pause();
      return;
    }

    if (isRunning && !timerIsRunning && !hasAnswered && timeLeft > 0) {
      resume();
    }
  }, [forceZero, hasAnswered, isPaused, isRunning, pause, resume, timeLeft, timerIsRunning]);

  useEffect(() => {
    if (timeLeft === 0 && !timerIsRunning && !hasAnswered && !timeUpSentRef.current) {
      timeUpSentRef.current = true;
      onTimeUp();
    }
  }, [timeLeft, timerIsRunning, hasAnswered, onTimeUp]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const displayTime = forceZero ? 0 : timeLeft;
  const paused = isPaused && !forceZero;

  const getTimerColor = () => {
    if (paused) return "text-sky-700";
    if (!timerIsRunning && hasAnswered) return "text-green-600";
    if (displayTime <= 5) return "text-red-600";
    if (displayTime <= 10) return "text-orange-600";
    return "text-blue-600";
  };

  return (
    <Card className="p-4 rounded-2xl shadow-card mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {paused ? <Pause className={`w-5 h-5 ${getTimerColor()}`} /> : <Clock className={`w-5 h-5 ${getTimerColor()}`} />}
          <span className={`font-mono text-2xl font-bold ${getTimerColor()}`}>
            {formatTime(displayTime)}
          </span>
        </div>
        <div className="text-sm text-muted-foreground">
          {paused && <span className="text-sky-700 font-medium">Pausado</span>}
          {!paused && hasAnswered && answerTime && (
            <span className="text-green-600">
              Resposta em {Math.round(answerTime / 1000)}s
            </span>
          )}
          {!paused && !hasAnswered && timerIsRunning && (
            <span>Tempo: {getTimeConfig()}s</span>
          )}
        </div>
      </div>
    </Card>
  );
}
