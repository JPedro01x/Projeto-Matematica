import { useTimer } from "@/hooks/use-timer";
import { Card } from "@/components/ui/card";
import { Clock } from "lucide-react";
import { useEffect } from "react";

interface TimerProps {
  difficulty: "facil" | "medio" | "dificil";
  onTimeUp: () => void;
  isRunning?: boolean;
}

export function Timer({ difficulty, onTimeUp, isRunning = true }: TimerProps) {
  const timer = useTimer(difficulty);

  // Iniciar timer quando component montar e isRunning for true
  useEffect(() => {
    if (isRunning && !timer.isRunning) {
      console.log("Timer iniciando...");
      timer.start();
    }
  }, [isRunning, timer]);

  // Chamar callback quando tempo acabar
  useEffect(() => {
    if (timer.timeLeft === 0 && timer.isRunning === false && timer.hasAnswered === false) {
      console.log("Tempo esgotado!");
      onTimeUp();
    }
  }, [timer.timeLeft, timer.isRunning, timer.hasAnswered, onTimeUp]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerColor = () => {
    if (!timer.isRunning && timer.hasAnswered) return "text-green-600";
    if (timer.timeLeft <= 5) return "text-red-600";
    if (timer.timeLeft <= 10) return "text-orange-600";
    return "text-blue-600";
  };

  return (
    <Card className="p-4 rounded-2xl shadow-card mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className={`w-5 h-5 ${getTimerColor()}`} />
          <span className={`font-mono text-2xl font-bold ${getTimerColor()}`}>
            {formatTime(timer.timeLeft)}
          </span>
        </div>
        <div className="text-sm text-muted-foreground">
          {timer.hasAnswered && timer.answerTime && (
            <span className="text-green-600">
              Resposta em {Math.round(timer.answerTime / 1000)}s
            </span>
          )}
          {!timer.hasAnswered && timer.isRunning && (
            <span>Tempo: {timer.getTimeConfig()}s</span>
          )}
        </div>
      </div>
    </Card>
  );
}
