import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { localStore } from "@/lib/localStore";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Sparkles, Loader } from "lucide-react";
import { toast } from "sonner";
import { Challenge, checkWin } from "@/lib/bingo";
import { Timer } from "@/components/timer";
import { TIMER_CONFIG } from "@/hooks/use-timer";

interface Room {
  id: string; name: string; status: string; rows: number; cols: number;
  win_condition: "line" | "column" | "diagonal" | "full";
  current_challenge: Challenge | null; drawn_answers: string[]; winner_id: string | null;
  difficulty: "facil" | "medio" | "dificil"; // Adicionar campo difficulty
}
interface Player { id: string; nickname: string; card: string[][]; marked: string[]; has_won: boolean; points: number; }

export default function PlayRoom() {
  const { roomId, playerId } = useParams<{ roomId: string; playerId: string }>();
  const navigate = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [markedCells, setMarkedCells] = useState<Set<string>>(new Set());
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [timerEnded, setTimerEnded] = useState(false);
  const [lastChallengeId, setLastChallengeId] = useState<string>("");

  useEffect(() => {
    if (!roomId || !playerId) return;
    
    const load = async () => {
      try {
        const { data: r } = await localStore.rooms.select(`eq("id", "${roomId}")`);
        const { data: p } = await localStore.players.select(`eq("id", "${playerId}")`);
        if (r && r.length) setRoom(r[0] as any);
        if (p && p.length) {
          setPlayer(p[0] as any);
        } else {
          // Jogador foi removido - expulsar da sala
          toast.error("Você foi expulso da sala pelo professor! 😞");
          setTimeout(() => {
            navigate("/");
          }, 2000);
        }
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
      }
    };
    
    // Carregar imediatamente
    load();
    
    // Atualizar a cada 1 segundo
    const interval = setInterval(load, 1000);
    
    // Listener para mudanças no localStorage de outras abas
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'bingo_players' || e.key === 'bingo_rooms') {
        load();
      }
    };
    
    // Listener para evento customizado de mudanças de dados
    const handleDataChanged = (e: Event) => {
      load();
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('dataChanged', handleDataChanged);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('dataChanged', handleDataChanged);
    };
  }, [roomId, playerId, navigate]);

  // Reset quando desafio mudar
  useEffect(() => {
    if (room?.current_challenge?.question) {
      const challengeId = room.current_challenge.question;
      if (challengeId !== lastChallengeId) {
        setLastChallengeId(challengeId);
        setMarkedCells(new Set());
        setSelectedAnswer(null);
        setTimerEnded(false);

        // Limpar resposta do jogador para o novo desafio
        if (player) {
          localStore.players.update(`eq("id", "${player.id}")`, { marked: [] });
          setPlayer({ ...player, marked: [] });
        }
      }
    }
  }, [room?.current_challenge?.question, lastChallengeId, player]);

  const toggleMark = async (r: number, c: number) => {
    if (!player || !room) return;
    if (room.status !== "playing") return;
    if (timerEnded) return; // Não permitir marcar após timer acabar
    
    const value = player.card[r][c];
    const key = `${r},${c}`;
    
    // Se já marcou algo, não permitir mudar
    if (player.marked.length > 0) {
      return;
    }
    
    // Marcar resposta (sem revelar se está certo ou errado ainda)
    const newMarked = [key];
    
    // Atualizar estado
    await localStore.players.update(`eq("id", "${player.id}")`, { marked: newMarked });
    setMarkedCells(prev => new Set(prev).add(key));
    setSelectedAnswer(key);
  };

  // Callback quando timer acabar
  const handleTimeUp = async () => {
    setTimerEnded(true);
    
    if (!player || !room || !room.current_challenge) return;
    
    // Buscar dados atualizados do jogador
    const { data: p } = await localStore.players.select(`eq("id", "${player.id}")`);
    if (!p || !p.length) return;
    
    const currentPlayer = p[0] as Player;
    const markedAnswer = currentPlayer.marked[0];
    
    if (!markedAnswer) {
      toast.info("Tempo esgotado! Nenhuma resposta marcada.");
      return;
    }
    
    const [r, c] = markedAnswer.split(',').map(Number);
    const markedValue = currentPlayer.card[r][c];
    const isCorrect = room.current_challenge.answer === markedValue;
    
    if (isCorrect) {
      const newPoints = currentPlayer.points + 5;
      await localStore.players.update(`eq("id", "${player.id}")`, { points: newPoints });
      setPlayer({ ...currentPlayer, points: newPoints });
      toast.success("Acertou! +5 pontos 🎯");

      const won = checkWin(currentPlayer.card, currentPlayer.marked, room.win_condition);
      if (won && !currentPlayer.has_won) {
        await localStore.rooms.update(`eq("id", "${room.id}")`, { winner_id: player.id, status: "finished" });
        toast.success("BINGO! 🎉");
      }
    } else {
      toast.error("Errou! Sem pontos ❌");
    }
  };

  if (!room || !player) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando…</div>;

  return (
    <div className="min-h-screen bg-background pb-10">
      <header className="bg-gradient-primary text-primary-foreground px-6 py-5 sticky top-0 z-10 shadow-soft">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            <div>
              <p className="font-bold">{player.nickname}</p>
              <p className="text-xs opacity-80">{room.name}</p>
              <p className="text-xs text-primary font-bold">🏆 {player.points} pts</p>
            </div>
          </div>
          {player.has_won && <span className="bg-secondary text-secondary-foreground font-bold px-3 py-1 rounded-full text-sm flex items-center gap-1"><Trophy className="w-4 h-4" />Bingo!</span>}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Current challenge */}
        {room.status === "waiting" && (
          <Card className="p-12 text-center rounded-3xl shadow-glow mb-6 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 flex flex-col items-center justify-center min-h-96">
            <div className="flex flex-col items-center justify-center">
              <Loader className="w-16 h-16 text-primary mb-4 animate-spin" />
              <p className="display text-3xl mb-3">Sala pronta! 🎮</p>
              <p className="text-lg text-muted-foreground mb-6 text-center">Esperando o professor iniciar o bingo…</p>
              <div className="flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-secondary/20 text-secondary-foreground text-sm">
                <div className="w-2 h-2 bg-secondary-foreground rounded-full animate-pulse" />
                <span>Aguardando</span>
              </div>
            </div>
          </Card>
        )}
        {room.status === "playing" && room.current_challenge && (
          <Card className="p-6 text-center rounded-3xl shadow-glow mb-6 bg-gradient-fun border-0">
            <p className="text-xs uppercase tracking-widest font-bold text-secondary-foreground/80 mb-1">Desafio</p>
            <p className="display text-4xl md:text-5xl text-secondary-foreground" key={room.current_challenge.question}>
              {room.current_challenge.question}
            </p>
            <p className="text-sm text-secondary-foreground/70 mt-2">Resolva e marque na cartela ⬇️</p>
          </Card>
        )}
        
        {/* Timer */}
        {room.status === "playing" && room.current_challenge && (
          <Timer
            key={room.current_challenge.question}
            difficulty={room.difficulty}
            onTimeUp={handleTimeUp}
          />
        )}
        {room.status === "finished" && (
          <Card className="p-6 text-center rounded-3xl shadow-card mb-6 bg-gradient-accent border-0">
            <Trophy className="w-10 h-10 mx-auto mb-2" />
            <p className="display text-2xl">Partida encerrada</p>
            {player.has_won && <p className="font-bold mt-1">Você venceu! 🎉</p>}
          </Card>
        )}

        {/* Card grid - só aparece quando a partida começou */}
        {room.status === "playing" && (
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${room.cols}, minmax(0, 1fr))` }}>
            {player.card.map((row, r) => row.map((value, c) => {
              const key = `${r},${c}`;
              const isMarked = player.marked.includes(key);
              const isSelected = selectedAnswer === key;
              const isCorrect = room.current_challenge?.answer === value;
              const isCorrectAndMarked = timerEnded && isMarked && isCorrect;
              const isWrongAndMarked = timerEnded && isMarked && !isCorrect;
              const revealCorrect = timerEnded && isCorrect;
              const isDisabled = timerEnded || player.marked.length > 0;
              
              return (
                <button
                  key={key}
                  onClick={() => toggleMark(r, c)}
                  disabled={isDisabled}
                  className={`aspect-square rounded-2xl flex items-center justify-center font-bold text-base sm:text-xl transition-all border-2 ${
                    isCorrectAndMarked || revealCorrect
                      ? "bg-green-500 text-white border-green-600 shadow-lg scale-95"
                      : isWrongAndMarked
                      ? "bg-red-500 text-white border-red-600 shadow-lg scale-95"
                      : isSelected
                      ? "bg-primary text-primary-foreground border-primary shadow-lg scale-95"
                      : isDisabled
                      ? "bg-muted text-muted-foreground border-border opacity-50 cursor-not-allowed"
                      : "bg-card border-border hover:border-primary/50 cursor-pointer"
                  }`}
                >
                  {value}
                </button>
              );
            }))}
          </div>
        )}
      </main>
    </div>
  );
}
