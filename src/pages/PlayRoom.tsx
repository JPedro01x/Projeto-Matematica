import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { localStore } from "@/lib/localStore";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Sparkles, Loader, Download } from "lucide-react";
import { toast } from "sonner";
import { Challenge, checkWin } from "@/lib/bingo";
import { Timer } from "@/components/timer";
import { completeChallengeAndAdvance } from "@/lib/gameFlow";

interface Room {
  id: string; name: string; status: string; rows: number; cols: number;
  win_condition: "line" | "column" | "diagonal" | "full";
  current_challenge: Challenge | null; drawn_answers: string[]; winner_id: string | null;
  difficulty: "facil" | "medio" | "dificil";
  challenge_ended?: boolean;
  game_challenges?: Challenge[];
  first_correct_player?: string | null; // ID do primeiro jogador a acertar o desafio atual
  players_responded?: string[]; // IDs dos jogadores que já responderam ao desafio atual
  timer_paused?: boolean;
}
interface Player { id: string; nickname: string; card: string[][]; marked: string[]; has_won: boolean; correct_answers_count: number; }

export default function PlayRoom() {
  const { roomId, playerId } = useParams<{ roomId: string; playerId: string }>();
  const navigate = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [markedCells, setMarkedCells] = useState<Set<string>>(new Set());
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [timerEnded, setTimerEnded] = useState(false);
  const [lastChallengeId, setLastChallengeId] = useState<string>("");
  const [winnerName, setWinnerName] = useState<string | null>(null);
  const notifiedWinnerId = useRef<string | null>(null);

  const cardLabels = (cols: number) =>
    cols === 5 ? ["B", "I", "N", "G", "O"] : Array.from({ length: cols }, (_, i) => `C${i + 1}`);

  const sanitizeFileName = (name: string) =>
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/(^-|-$)/g, "")
      .toLowerCase();

  const drawCenteredText = (
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    maxFontSize: number,
    minFontSize = 18,
    weight = "700"
  ) => {
    const content = text || "";
    let fontSize = maxFontSize;
    do {
      ctx.font = `${weight} ${fontSize}px Arial, sans-serif`;
      if (ctx.measureText(content).width <= maxWidth || fontSize <= minFontSize) break;
      fontSize -= 2;
    } while (fontSize > minFontSize);
    ctx.fillText(content, x, y);
  };

  const downloadCard = () => {
    if (!player || !room) return;

    const rows = player.card.length;
    const cols = player.card[0]?.length ?? room.cols;
    const cellSize = 132;
    const padding = 52;
    const titleHeight = 120;
    const headerHeight = 66;
    const footerHeight = 42;
    const width = padding * 2 + cols * cellSize;
    const height = padding * 2 + titleHeight + headerHeight + rows * cellSize + footerHeight;
    const canvas = document.createElement("canvas");
    const scale = 2;
    canvas.width = width * scale;
    canvas.height = height * scale;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      toast.error("Nao foi possivel gerar a imagem da cartela.");
      return;
    }

    ctx.scale(scale, scale);
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "#0f172a";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    drawCenteredText(ctx, "Cartela de Bingo", width / 2, padding + 26, width - padding * 2, 38, 24, "800");

    ctx.fillStyle = "#475569";
    drawCenteredText(ctx, player.nickname, width / 2, padding + 70, width - padding * 2, 24, 16, "700");
    drawCenteredText(ctx, room.name, width / 2, padding + 100, width - padding * 2, 20, 14, "600");

    const boardX = padding;
    const boardY = padding + titleHeight;
    const labels = cardLabels(cols);

    labels.forEach((label, c) => {
      const x = boardX + c * cellSize;
      ctx.fillStyle = "#1d4ed8";
      ctx.fillRect(x, boardY, cellSize, headerHeight);
      ctx.strokeStyle = "#bfdbfe";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, boardY, cellSize, headerHeight);
      ctx.fillStyle = "#ffffff";
      drawCenteredText(ctx, label, x + cellSize / 2, boardY + headerHeight / 2, cellSize - 18, 32, 20, "800");
    });

    player.card.forEach((row, r) => {
      row.forEach((value, c) => {
        const key = `${r},${c}`;
        const x = boardX + c * cellSize;
        const y = boardY + headerHeight + r * cellSize;
        const isMarked = markedCells.has(key);
        const isFree = value === "FREE";

        ctx.fillStyle = isFree ? "#047857" : isMarked ? "#1e293b" : "#ffffff";
        ctx.fillRect(x, y, cellSize, cellSize);
        ctx.strokeStyle = isMarked || isFree ? "#0f172a" : "#cbd5e1";
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, cellSize, cellSize);
        ctx.fillStyle = isMarked || isFree ? "#ffffff" : "#0f172a";
        drawCenteredText(ctx, value, x + cellSize / 2, y + cellSize / 2, cellSize - 22, 34, 16, "800");
      });
    });

    ctx.fillStyle = "#64748b";
    drawCenteredText(ctx, "Bingo Matematico", width / 2, height - padding + 8, width - padding * 2, 16, 12, "600");

    const link = document.createElement("a");
    link.download = `cartela-${sanitizeFileName(player.nickname || "jogador")}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    toast.success("Cartela baixada!");
  };

  useEffect(() => {
    if (!roomId || !playerId) return;
    
    const load = async () => {
      try {
        const { data: r } = await localStore.rooms.select(`eq("id", "${roomId}")`);
        const { data: p } = await localStore.players.select(`eq("id", "${playerId}")`);
        if (r && r.length) {
          const roomData = r[0] as Room;
          setRoom(roomData);
          
          // Redirecionar para resultados se a partida foi encerrada
          if (roomData.status === 'finished') {
            let winnerNickname = "um jogador";
            if (roomData.winner_id) {
              const { data: winnerData } = await localStore.players.select(`eq("id", "${roomData.winner_id}")`);
              winnerNickname = winnerData?.[0]?.nickname || winnerNickname;
              setWinnerName(winnerNickname);
            }
            toast.success("Partida encerrada! Redirecionando para resultados... 🏆");
            if (notifiedWinnerId.current !== roomData.winner_id) {
              notifiedWinnerId.current = roomData.winner_id;
              toast.success(`Vencedor: ${winnerNickname}`);
            }

            setTimeout(() => {
              navigate(`/resultados/${roomId}`);
            }, 3500);
            return;
          }
        }
        
        if (p && p.length) {
          setPlayer(p[0] as Player);
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

  const toggleMark = async (r: number, c: number) => {
    if (!player || !room || !room.current_challenge) return;
    if (room.status !== "playing" || room.challenge_ended || room.timer_paused) return;
    if (timerEnded) return;

    const value = player.card[r][c];
    const key = `${r},${c}`;

    if (selectedAnswer || room.players_responded?.includes(player.id)) return;

    const isCorrect = room.current_challenge.answer === value;
    setSelectedAnswer(key);

    if (isCorrect && !room.first_correct_player) {
      await localStore.rooms.update(`eq("id", "${room.id}")`, {
        first_correct_player: player.id
      });
      toast.success("Primeira resposta correta marcada!");
    }

    let nextMarked = player.marked;
    let nextCorrectAnswersCount = player.correct_answers_count;

    if (isCorrect) {
      const alreadyMarked = player.marked.includes(key);
      nextMarked = alreadyMarked ? player.marked : [...player.marked, key];
      nextCorrectAnswersCount = alreadyMarked
        ? player.correct_answers_count
        : player.correct_answers_count + 1;

      await localStore.players.update(`eq("id", "${player.id}")`, {
        marked: nextMarked,
        correct_answers_count: nextCorrectAnswersCount
      });

      setMarkedCells(prev => new Set(prev).add(key));
      setPlayer(prev => prev ? { ...prev, marked: nextMarked, correct_answers_count: nextCorrectAnswersCount } : prev);

      const hasWon = checkWin(player.card, nextMarked, room.win_condition);
      if (hasWon) {
        await localStore.players.update(`eq("id", "${player.id}")`, { has_won: true });
        await localStore.rooms.update(`eq("id", "${room.id}")`, { winner_id: player.id, status: "finished" });
        setWinnerName(player.nickname);
        toast.success("BINGO! Voce venceu!");
        return;
      }

      toast.success("Resposta correta!");
    } else {
      toast.error("Resposta incorreta!");
    }

    const { data: freshRooms } = await localStore.rooms.select(`eq("id", "${room.id}")`);
    const latestRoom = freshRooms?.[0] as Room | undefined;
    const currentResponded = latestRoom?.players_responded || room.players_responded || [];
    const updatedResponded = currentResponded.includes(player.id)
      ? currentResponded
      : [...currentResponded, player.id];

    await localStore.rooms.update(`eq("id", "${room.id}")`, {
      players_responded: updatedResponded
    });

    const { data: allPlayersInRoom } = await localStore.players.select(`eq("room_id", "${room.id}")`);
    const activePlayers = allPlayersInRoom || [];

    if (activePlayers.length > 0 && updatedResponded.length >= activePlayers.length) {
      setTimerEnded(true);
      toast.info("Todos responderam! Novo desafio em instantes...");
      await completeChallengeAndAdvance(localStore, room.id, 900);
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
        await localStore.players.update(`eq("id", "${player.id}")`, { has_won: true });
        await localStore.rooms.update(`eq("id", "${room.id}")`, { winner_id: player.id, status: "finished" });
        setWinnerName(player.nickname);
        toast.success("BINGO! 🎉");
      }
    } else {
      toast.error("Errou! ❌");
    }
  };

  if (!room || !player) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando…</div>;

  return (
    <div className="min-h-screen bg-background pb-10">
      <header className="sticky top-0 z-10 bg-gradient-primary px-3 py-3 text-primary-foreground shadow-soft sm:px-6 sm:py-4">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            <div className="min-w-0 rounded-xl border border-white/50 bg-white/90 px-3 py-2 shadow-lg backdrop-blur-sm sm:px-4">
              <p className="truncate text-sm font-bold text-slate-900 sm:text-base">{player.nickname}</p>
              <p className="truncate text-xs text-slate-600 sm:text-sm">{room.name}</p>
              <p className="flex items-center gap-1 text-xs font-bold text-sky-700 sm:text-sm">
                <Trophy className="w-4 h-4" /> {player.correct_answers_count} acertos
              </p>
            </div>
          </div>
          {player.has_won && <span className="bg-secondary text-secondary-foreground font-bold px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm flex items-center gap-1"><Trophy className="w-4 h-4" />Bingo!</span>}
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-2.5 py-4 sm:px-4 sm:py-6">
        {/* Current challenge */}
        {room.status === "waiting" && (
          <Card className="mb-4 flex min-h-80 flex-col items-center justify-center rounded-2xl border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5 p-6 text-center shadow-glow sm:mb-6 sm:min-h-96 sm:rounded-3xl sm:p-12">
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
          <Card className="mb-4 rounded-2xl border-0 bg-gradient-fun p-4 text-center shadow-glow sm:mb-6 sm:rounded-3xl sm:p-6">
            <p className="text-xs uppercase tracking-widest font-bold text-secondary-foreground/80 mb-1">Desafio</p>
            <p className="display break-words text-3xl text-secondary-foreground sm:text-4xl md:text-5xl" key={room.current_challenge.question}>
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
            isPaused={!!room.timer_paused || !!room.challenge_ended}
            forceZero={timerEnded || !!room.challenge_ended}
          />
        )}
        {room.status === "finished" && (
          <Card className="mb-4 rounded-2xl border-0 bg-gradient-accent p-4 text-center shadow-card sm:mb-6 sm:rounded-3xl sm:p-6">
            <Trophy className="w-10 h-10 mx-auto mb-2" />
            <p className="display text-2xl">Partida encerrada</p>
            <p className="font-bold mt-1">
              {winnerName ? `Vencedor: ${winnerName}` : "Temos um vencedor!"}
            </p>
            <p className="text-sm mt-2 opacity-80">Redirecionando para os resultados...</p>
            {player.has_won && <p className="font-bold mt-1">Você venceu! 🎉</p>}
          </Card>
        )}

        {/* Cartela com layout mais próximo ao bingo real */}
        {room.status === "playing" && (
          <>
          <div className="mb-3 flex justify-end">
            <Button type="button" variant="outline" onClick={downloadCard} className="h-10 rounded-xl bg-card/90 px-3 text-sm shadow-soft sm:h-11 sm:px-4">
              <Download className="w-4 h-4" />
              Baixar cartela
            </Button>
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-soft sm:rounded-[2rem]">
            <div className="grid bg-slate-100 text-slate-600 text-[0.65rem] uppercase tracking-[0.12em] sm:text-xs sm:tracking-[0.35em] font-semibold"
              style={{ gridTemplateColumns: `repeat(${room.cols}, minmax(0, 1fr))` }}>
              {cardLabels(room.cols).map((label) => (
                <div key={label} className="border-r border-slate-200 px-1.5 py-2 text-center last:border-r-0 sm:px-3 sm:py-3">
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
                const isCorrectAndMarked = isSelected && isCorrect;
                const isWrongAndMarked = isSelected && !isCorrect;
                const revealCorrect = showResults && isCorrect;
                const isFree = value === "FREE";
                const isDisabled = showResults || hasRespondedThisChallenge || isFree;
                const isMarkedAnswer = isMarked && !isFree;
                const numberClassName = isMarkedAnswer
                  ? "text-slate-950 font-extrabold"
                  : "text-current";

                return (
                  <button
                    key={key}
                    onClick={() => toggleMark(r, c)}
                    disabled={isDisabled}
                    className={`aspect-square min-h-0 rounded-none flex items-center justify-center text-center px-1 sm:px-2 font-semibold text-xs sm:text-base md:text-lg transition-all bg-white text-slate-900 border border-slate-200 disabled:opacity-100 ${
                      isFree
                        ? "bg-emerald-600 text-white border-emerald-700 shadow-inner"
                        : isMarkedAnswer
                        ? "bg-slate-200 text-slate-950 border-slate-500 shadow-inner ring-2 ring-slate-500/20"
                        : isCorrectAndMarked
                        ? "bg-emerald-600 text-white border-emerald-700 shadow-inner"
                        : isWrongAndMarked
                        ? "bg-rose-500 text-white border-rose-600 shadow-inner"
                        : isSelected
                        ? "bg-sky-500 text-white border-sky-600 shadow-lg"
                        : revealCorrect
                        ? "bg-emerald-600 text-white border-emerald-700 shadow-inner"
                        : isDisabled
                        ? "bg-slate-100 text-slate-700 border-slate-200 cursor-not-allowed"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <span className={`block max-w-full break-words whitespace-normal opacity-100 ${numberClassName}`}>
                      {value}
                    </span>
                  </button>
                );
              }))}
            </div>
          </div>
          </>
        )}
      </main>
    </div>
  );
}
