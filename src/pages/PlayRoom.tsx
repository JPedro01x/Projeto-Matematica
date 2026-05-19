import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { localStore } from "@/lib/localStore";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Sparkles, Loader } from "lucide-react";
import { toast } from "sonner";
import { Challenge, checkWin, allEligiblePlayersResponded } from "@/lib/bingo";
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
interface Player { id: string; nickname: string; card: string[][]; marked: string[]; has_won: boolean; correct_answers_count: number; }

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

  // Inicializar markedCells com as marcações existentes do jogador
  useEffect(() => {
    if (player?.marked) {
      setMarkedCells(new Set(player.marked));
    }
  }, [player?.marked]);

  // Reset apenas o estado temporário quando desafio mudar (não limpar marcações permanentes)
  useEffect(() => {
    if (room?.current_challenge?.question) {
      const challengeId = room.current_challenge.question;
      if (challengeId !== lastChallengeId) {
        setLastChallengeId(challengeId);
        // NÃO limpar markedCells - manter marcações permanentes da cartela
        setSelectedAnswer(null); // Resetar apenas a resposta selecionada para o desafio atual
        setTimerEnded(false); // Resetar estado do timer

        // NÃO limpar marked do jogador - as marcações são permanentes durante a partida
        // Só resetar quando uma nova PARTIDA começar, não quando um novo DESAFIO começar
      }
    }
  }, [room?.current_challenge?.question, lastChallengeId]);

  // Reset apenas estado temporário quando challenge_ended muda de true para false (novo desafio começando)
  useEffect(() => {
    if (room?.challenge_ended === false && timerEnded === true) {
      // Professor iniciou novo desafio, resetar apenas estado temporário
      setTimerEnded(false);
      // NÃO limpar markedCells - manter marcações permanentes da cartela
      setSelectedAnswer(null); // Resetar apenas a resposta selecionada

      // NÃO limpar marcações do jogador - elas são permanentes durante a partida
      // Só resetar quando uma nova PARTIDA começar
    }
  }, [room?.challenge_ended, timerEnded]);

  // Verificar se todos os jogadores elegíveis já responderam (têm pelo menos 5 segundos)
  useEffect(() => {
    if (!room?.current_challenge || room.status !== "playing" || room.challenge_ended) return;

    const checkEligiblePlayers = async () => {
      try {
        const { data: allPlayersInRoom } = await localStore.players.select(`eq("room_id", "${room.id}")`);
        if (!allPlayersInRoom || allPlayersInRoom.length === 0) return;

        const playersResponded = room.players_responded || [];
        const allEligibleResponded = allEligiblePlayersResponded(
          allPlayersInRoom,
          room.current_challenge.answer,
          playersResponded
        );

        if (allEligibleResponded && playersResponded.length > 0) {
          // Verificar se passaram pelo menos 5 segundos desde o início do desafio
          const challengeStartTime = room.current_challenge.question; // Usando question como identificador único
          const timeSinceStart = Date.now() - parseInt(challengeStartTime) || 0;

          if (timeSinceStart >= 5000) { // 5 segundos mínimo
            console.log("Todos os jogadores elegíveis responderam! Finalizando desafio automaticamente...");

            // Finalizar desafio e contabilizar acertos de todos
            await localStore.rooms.update(`eq("id", "${room.id}")`, {
              challenge_ended: true
            });

            // Contabilizar acertos para todos os jogadores baseado na resposta do desafio atual
            for (const player of allPlayersInRoom) {
              // Verificar se o jogador respondeu corretamente neste desafio
              const playerResponse = player.marked[player.marked.length - 1]; // Última marcação
              if (playerResponse) {
                const [r, c] = playerResponse.split(',').map(Number);
                const markedValue = player.card[r][c];
                const isCorrect = room.current_challenge?.answer === markedValue;

                if (isCorrect) {
                  const newCorrectAnswersCount = player.correct_answers_count + 1;
                  await localStore.players.update(`eq("id", "${player.id}")`, { correct_answers_count: newCorrectAnswersCount });
                }
              }
            }

            toast.success("Todos os jogadores elegíveis responderam! Desafio finalizado automaticamente ⏰");

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
        }
      } catch (err) {
        console.error("Erro ao verificar jogadores elegíveis:", err);
      }
    };

    // Verificar a cada 2 segundos
    const interval = setInterval(checkEligiblePlayers, 2000);

    return () => clearInterval(interval);
  }, [room?.current_challenge?.question, room?.status, room?.challenge_ended, room?.players_responded]);

  const toggleMark = async (r: number, c: number) => {
    if (!player || !room) return;
    if (room.status !== "playing") return;
    if (timerEnded) return; // Não permitir marcar após timer acabar

    const value = player.card[r][c];
    const key = `${r},${c}`;

    // Se já marcou algo neste desafio, não permitir mudar
    if (selectedAnswer) {
      return;
    }

    // Verificar se a resposta marcada está correta
    const isCorrect = room.current_challenge?.answer === value;

    // Se marcou a resposta correta e for o primeiro, registrar
    if (isCorrect && !room.first_correct_player) {
      await localStore.rooms.update(`eq("id", "${room.id}")`, {
        first_correct_player: player.id
      });
      toast.success("Primeira resposta correta marcada! 🏆⚡");
    }

    // Registrar que este jogador respondeu ao desafio atual
    const currentResponded = room.players_responded || [];
    if (!currentResponded.includes(player.id)) {
      const updatedResponded = [...currentResponded, player.id];
      await localStore.rooms.update(`eq("id", "${room.id}")`, {
        players_responded: updatedResponded
      });

      // Verificar se todos os jogadores elegíveis já responderam
      const { data: allPlayersInRoom } = await localStore.players.select(`eq("room_id", "${room.id}")`);
      if (allPlayersInRoom && updatedResponded.length === allPlayersInRoom.length) {
        // Todos responderam (lógica antiga mantida para compatibilidade)
        toast.info("Todos responderam! Finalizando em 3 segundos... ⏰");

        let countdown = 3;
        const countdownInterval = setInterval(async () => {
          countdown--;

          if (countdown > 0) {
            toast.info(`Finalizando em ${countdown}...`);
          } else {
            clearInterval(countdownInterval);

            // Finalizar desafio e contabilizar acertos de todos
            await localStore.rooms.update(`eq("id", "${room.id}")`, {
              challenge_ended: true
            });

            // Contabilizar acertos para todos os jogadores baseado na resposta do desafio atual
            for (const p of allPlayersInRoom) {
              // Verificar se o jogador respondeu corretamente neste desafio
              // A resposta correta é aquela que foi selecionada neste desafio
              const playerResponse = p.marked[p.marked.length - 1]; // Última marcação
              if (playerResponse) {
                const [r, c] = playerResponse.split(',').map(Number);
                const markedValue = p.card[r][c];
                const isCorrect = room.current_challenge?.answer === markedValue;

                if (isCorrect) {
                  const newCorrectAnswersCount = p.correct_answers_count + 1;
                  await localStore.players.update(`eq("id", "${p.id}")`, { correct_answers_count: newCorrectAnswersCount });
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

    // Marcar resposta apenas se estiver correta (marcação permanente)
    if (isCorrect) {
      // Adicionar à lista de marcações corretas acumuladas
      const newMarked = [...player.marked, key];

      // Atualizar estado
      await localStore.players.update(`eq("id", "${player.id}")`, {
        marked: newMarked,
        correct_answers_count: player.correct_answers_count + 1
      });
      setMarkedCells(prev => new Set(prev).add(key));
      setPlayer(prev => prev ? { ...prev, marked: newMarked, correct_answers_count: prev.correct_answers_count + 1 } : prev);
      setSelectedAnswer(key);

      // Verificar se ganhou após marcar
      const hasWon = checkWin(player.card, newMarked, room.win_condition);
      if (hasWon) {
        await localStore.players.update(`eq("id", "${player.id}")`, { has_won: true });
        await localStore.rooms.update(`eq("id", "${room.id}")`, { winner_id: player.id, status: "finished" });
        toast.success("BINGO! Você venceu! 🎉🏆");
      } else {
        toast.success("Resposta correta! Continue jogando! ✅");
      }
    } else {
      // Resposta incorreta - marcar temporariamente para feedback visual
      setSelectedAnswer(key);
      setTimeout(() => {
        setSelectedAnswer(null);
        toast.error("Resposta incorreta! Tente novamente no próximo desafio. ❌");
      }, 2000);
    }
  };

  // Callback quando timer acabar
  const handleTimeUp = async () => {
    setTimerEnded(true);

    if (!player || !room || !room.current_challenge) return;
    if (!selectedAnswer) {
      toast.info("Tempo esgotado! Nenhuma resposta marcada.");
      return;
    }

    const [r, c] = selectedAnswer.split(',').map(Number);
    const markedValue = player.card[r][c];
    const isCorrect = room.current_challenge.answer === markedValue;

    if (isCorrect) {
      toast.success("Acertou! ✅");

      const won = checkWin(player.card, player.marked, room.win_condition);
      if (won && !player.has_won) {
        await localStore.rooms.update(`eq("id", "${room.id}")`, { winner_id: player.id, status: "finished" });
        toast.success("BINGO! 🎉");
      }
    } else {
      toast.error("Errou! ❌");
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
                <Trophy className="w-4 h-4" /> {player.correct_answers_count} acertos
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

        {/* Cartela com layout mais próximo ao bingo real */}
        {room.status === "playing" && (
          <div className="rounded-[2rem] overflow-hidden border border-slate-200 shadow-soft">
            <div className="grid bg-slate-100 text-slate-600 text-xs uppercase tracking-[0.35em] font-semibold"
              style={{ gridTemplateColumns: `repeat(${room.cols}, minmax(0, 1fr))` }}>
              {(room.cols === 5 ? ["B", "I", "N", "G", "O"] : Array.from({ length: room.cols }, (_, i) => `C${i + 1}`)).map((label) => (
                <div key={label} className="px-3 py-3 border-r last:border-r-0 border-slate-200 text-center">
                  {label}
                </div>
              ))}
            </div>
            <div className="grid gap-px bg-slate-200"
              style={{ gridTemplateColumns: `repeat(${room.cols}, minmax(0, 1fr))` }}>
              {player.card.map((row, r) => row.map((value, c) => {
                const key = `${r},${c}`;
                const isMarked = markedCells.has(key) || value === "FREE";
                const hasRespondedThisChallenge = room.players_responded?.includes(player.id) ?? false;
                const isSelected = selectedAnswer === key;
                const isCorrect = room.current_challenge?.answer === value;
                const showResults = timerEnded || room.challenge_ended;
                const isCorrectAndMarked = showResults && isMarked && isCorrect;
                const isWrongAndMarked = showResults && isMarked && !isCorrect;
                const revealCorrect = showResults && isCorrect;
                const isFree = value === "FREE";
                const isDisabled = showResults || hasRespondedThisChallenge || isFree;

                return (
                  <button
                    key={key}
                    onClick={() => toggleMark(r, c)}
                    disabled={isDisabled}
                    className={`aspect-square min-h-[5rem] rounded-none flex items-center justify-center text-center px-2 font-semibold text-base sm:text-lg transition-all bg-white border border-slate-200 ${
                      isFree
                        ? "bg-emerald-600 text-white border-emerald-700 shadow-inner"
                        : isCorrectAndMarked || revealCorrect
                        ? "bg-emerald-600 text-white border-emerald-700 shadow-inner"
                        : isWrongAndMarked
                        ? "bg-rose-500 text-white border-rose-600 shadow-inner"
                        : isSelected
                        ? "bg-sky-500 text-white border-sky-600 shadow-lg"
                        : isDisabled
                        ? "bg-slate-100 text-slate-500 border-slate-200 opacity-70 cursor-not-allowed"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <span className="break-words whitespace-normal">
                      {value}
                    </span>
                  </button>
                );
              }))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
