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
  difficulty: "facil" | "medio" | "dificil";
  challenge_ended?: boolean;
  first_correct_player?: string | null; // ID do primeiro jogador a acertar o desafio atual
  players_responded?: string[]; // IDs dos jogadores que já responderam ao desafio atual
}
interface Player { id: string; nickname: string; card: string[][]; marked: string[]; has_won: boolean; points: number; }

export default function PlayRoom() {
  const { roomId, playerId } = useParams<{ roomId: string; playerId: string }>();
  const navigate = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
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
        if (r && r.length) {
          const roomData = r[0] as any;
          setRoom(roomData);
          
          // Redirecionar para resultados se a partida foi encerrada
          if (roomData.status === 'finished') {
            toast.success("Partida encerrada! Redirecionando para resultados... 🏆");
            setTimeout(() => {
              navigate(`/resultados/${roomId}`);
            }, 2000);
            return;
          }
        }
        
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

  // Reset quando challenge_ended muda de true para false (novo desafio começando)
  useEffect(() => {
    if (room?.challenge_ended === false && timerEnded === true) {
      // Professor iniciou novo desafio, resetar timer
      setTimerEnded(false);
      setMarkedCells(new Set());
      setSelectedAnswer(null);
      
      // Limpar marcações do jogador
      if (player) {
        localStore.players.update(`eq("id", "${player.id}")`, { marked: [] });
        setPlayer({ ...player, marked: [] });
      }
    }
  }, [room?.challenge_ended, timerEnded, player]);

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
    
    // Verificar se a resposta marcada está correta e se é o primeiro a marcar
    const isCorrect = room.current_challenge?.answer === value;
    const isFirstToMarkCorrect = isCorrect && !room.first_correct_player;
    
    // Se marcou a resposta correta e for o primeiro, dar bônus imediatamente
    if (isFirstToMarkCorrect) {
      await localStore.rooms.update(`eq("id", "${room.id}")`, {
        first_correct_player: player.id
      });
      toast.success("Primeiro a marcar a resposta correta! +2 bônus 🏆⚡");
    }
    
    // Registrar que este jogador respondeu ao desafio atual
    const currentResponded = room.players_responded || [];
    if (!currentResponded.includes(player.id)) {
      const updatedResponded = [...currentResponded, player.id];
      await localStore.rooms.update(`eq("id", "${room.id}")`, {
        players_responded: updatedResponded
      });
      
      // Verificar se todos os jogadores já responderam
      const { data: allPlayersInRoom } = await localStore.players.select(`eq("room_id", "${room.id}")`);
      if (allPlayersInRoom && updatedResponded.length === allPlayersInRoom.length) {
        // Todos responderam, mostrar contagem regressiva e finalizar automaticamente
        toast.info("Todos responderam! Finalizando em 3 segundos... ⏰");
        
        let countdown = 3;
        const countdownInterval = setInterval(async () => {
          countdown--;
          
          if (countdown > 0) {
            toast.info(`Finalizando em ${countdown}...`);
          } else {
            clearInterval(countdownInterval);
            
            // Finalizar desafio e contabilizar pontos de todos
            await localStore.rooms.update(`eq("id", "${room.id}")`, {
              challenge_ended: true
            });
            
            // Forçar contabilização de pontos para todos os jogadores
            for (const player of allPlayersInRoom) {
              const markedAnswer = player.marked[0];
              if (markedAnswer) {
                const [r, c] = markedAnswer.split(',').map(Number);
                const markedValue = player.card[r][c];
                const isCorrect = room.current_challenge?.answer === markedValue;
                
                if (isCorrect) {
                  // Verificar se já recebeu bônus
                  const alreadyGotBonus = room.first_correct_player === player.id;
                  let pointsEarned = 5;
                  
                  if (alreadyGotBonus) {
                    pointsEarned += 2;
                  }
                  
                  const newPoints = player.points + pointsEarned;
                  await localStore.players.update(`eq("id", "${player.id}")`, { points: newPoints });
                }
              }
            }
            
            toast.success("Todos responderam! Desafio finalizado automaticamente ⏰");
            
            // Iniciar próximo desafio automaticamente após 3 segundos
            setTimeout(async () => {
              await localStore.rooms.update(`eq("id", "${room.id}")`, {
                challenge_ended: false,
                first_correct_player: null,
                players_responded: []
              });
              toast.success("Próximo desafio iniciado automaticamente! 🎯");
            }, 3000);
          }
        }, 1000);
      }
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
      // Verificar se já recebeu bônus por ser o primeiro a marcar
      const alreadyGotBonus = room.first_correct_player === player.id;
      
      let pointsEarned = 5; // Pontos base por acerto
      let message = "Acertou! +5 pontos �";
      
      if (alreadyGotBonus) {
        pointsEarned += 2; // Adicionar bônus que já foi dado na marcação
        message = "Acertou! +7 pontos (incluindo bônus) 🎯🏆";
      }
      
      const newPoints = currentPlayer.points + pointsEarned;
      await localStore.players.update(`eq("id", "${player.id}")`, { points: newPoints });
      setPlayer({ ...currentPlayer, points: newPoints });
      toast.success(message);

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
      <header className="bg-gradient-primary text-primary-foreground px-6 py-4 sticky top-0 z-10 shadow-soft">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            <div className="bg-white/90 backdrop-blur-sm rounded-xl px-4 py-2 shadow-lg border border-white/50">
              <p className="font-bold text-base text-foreground">{player.nickname}</p>
              <p className="text-sm text-muted-foreground">{room.name}</p>
              <p className="text-sm font-bold text-primary flex items-center gap-1">
                <Trophy className="w-4 h-4" /> {player.points} pts
              </p>
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
              const showResults = timerEnded || room.challenge_ended;
              const isCorrectAndMarked = showResults && isMarked && isCorrect;
              const isWrongAndMarked = showResults && isMarked && !isCorrect;
              const revealCorrect = showResults && isCorrect;
              const isDisabled = showResults || (player.marked.length > 0 && !room.challenge_ended);
              
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
                      : "bg-blue-50 border-blue-200 hover:border-blue-400 hover:bg-blue-100 cursor-pointer"
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
