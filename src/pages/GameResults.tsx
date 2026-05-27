import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Home, Medal, Star, Trophy, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { localStore } from "@/lib/localStore";

interface Room {
  id: string;
  name: string;
  status: string;
  winner_id: string | null;
}

interface Player {
  id: string;
  nickname: string;
  correct_answers_count: number;
  has_won: boolean;
}

export default function GameResults() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadResults = async () => {
      try {
        const { data: roomData } = await localStore.rooms.select(`eq("id", "${roomId}")`);
        if (roomData?.length) setRoom(roomData[0] as any);

        const { data: playersData } = await localStore.players.select(`eq("room_id", "${roomId}")`);
        if (playersData?.length) {
          setPlayers((playersData as Player[]).sort((a, b) => b.correct_answers_count - a.correct_answers_count));
        }
      } catch (err) {
        console.error("Erro ao carregar resultados:", err);
        toast.error("Erro ao carregar resultados");
      } finally {
        setLoading(false);
      }
    };

    loadResults();
  }, [roomId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Carregando resultados...</p>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="text-center">
          <p className="mb-4 text-destructive">Sala nao encontrada</p>
          <Button onClick={() => navigate("/")} className="rounded-xl">
            <Home className="mr-2 h-4 w-4" />
            Voltar ao inicio
          </Button>
        </div>
      </div>
    );
  }

  const winner = players.find((player) => player.id === room.winner_id);
  const sortedPlayers = [...players].sort((a, b) => b.correct_answers_count - a.correct_answers_count);
  const maxScore = players.length > 0 ? Math.max(...players.map((player) => player.correct_answers_count)) : 0;
  const averageScore = players.length > 0
    ? Math.round(players.reduce((sum, player) => sum + player.correct_answers_count, 0) / players.length)
    : 0;

  return (
    <div className="min-h-screen bg-hero pb-8 sm:pb-10">
      <header className="bg-gradient-primary px-3 py-3 text-primary-foreground sm:px-6 sm:py-5">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-2">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="rounded-full px-3 text-primary-foreground hover:bg-primary-foreground/10 sm:px-4"
          >
            <Home className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Inicio</span>
          </Button>
          <h1 className="truncate text-center font-display text-base sm:text-xl">Resultados da Partida</h1>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-3 py-5 sm:px-6 sm:py-8">
        {winner && (
          <Card className="mb-5 rounded-2xl border-2 border-yellow-300 bg-gradient-to-br from-yellow-50 to-orange-50 p-5 shadow-glow sm:mb-8 sm:rounded-3xl sm:p-8">
            <div className="text-center">
              <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-orange-400 sm:h-20 sm:w-20">
                <Trophy className="h-8 w-8 text-white sm:h-10 sm:w-10" />
              </div>
              <h2 className="display mb-2 bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-2xl text-transparent sm:text-3xl">
                Vencedor da Partida!
              </h2>
              <p className="mb-2 break-words text-xl font-bold text-gray-800 sm:text-2xl">{winner.nickname}</p>
              <div className="inline-flex items-center gap-2 rounded-full bg-yellow-100 px-4 py-2 text-yellow-800">
                <Star className="h-5 w-5" />
                <span className="font-bold">{winner.correct_answers_count} acertos</span>
              </div>
            </div>
          </Card>
        )}

        <Card className="rounded-2xl p-4 shadow-card sm:rounded-3xl sm:p-6">
          <div className="mb-5 flex flex-wrap items-center gap-2 sm:mb-6">
            <Users className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-bold">Todos os Participantes</h3>
            <span className="text-sm text-muted-foreground sm:ml-auto">
              {players.length} jogador{players.length !== 1 ? "es" : ""}
            </span>
          </div>

          <div className="space-y-3">
            {sortedPlayers.map((player, index) => {
              const isWinner = player.id === room.winner_id;
              const position = index + 1;

              return (
                <div
                  key={player.id}
                  className={`flex items-center justify-between gap-3 rounded-2xl border-2 p-3 transition-all sm:p-4 ${
                    isWinner
                      ? "border-yellow-300 bg-gradient-to-r from-yellow-50 to-orange-50 shadow-lg sm:scale-105"
                      : "border-border bg-card hover:border-primary/50"
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      position === 1 ? "bg-gradient-to-br from-yellow-400 to-orange-400 text-white" :
                      position === 2 ? "bg-gray-400 text-white" :
                      position === 3 ? "bg-amber-600 text-white" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {position === 1 ? <Trophy className="h-5 w-5" /> :
                       position === 2 ? <Medal className="h-5 w-5" /> :
                       position === 3 ? <Medal className="h-5 w-5" /> :
                       position}
                    </div>

                    <div className="min-w-0">
                      <p className={`break-words font-bold ${isWinner ? "text-base text-orange-800 sm:text-lg" : ""}`}>
                        {player.nickname}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {player.has_won ? "Fez Bingo" : "Nao fez Bingo"}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className={`text-base font-bold sm:text-lg ${isWinner ? "text-orange-800" : ""}`}>
                      {player.correct_answers_count}
                    </p>
                    <p className="text-xs text-muted-foreground">acertos</p>
                    {isWinner && <p className="text-xs font-medium text-yellow-600">Vencedor</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <div className="mt-5 grid gap-3 sm:mt-8 md:grid-cols-3 md:gap-4">
          <Card className="rounded-2xl border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-4 text-center">
            <p className="mb-1 text-sm font-medium text-blue-600">Total de Jogadores</p>
            <p className="text-2xl font-bold text-blue-800">{players.length}</p>
          </Card>
          <Card className="rounded-2xl border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 p-4 text-center">
            <p className="mb-1 text-sm font-medium text-green-600">Maximo de Acertos</p>
            <p className="text-2xl font-bold text-green-800">{maxScore}</p>
          </Card>
          <Card className="rounded-2xl border-sky-200 bg-gradient-to-br from-sky-50 to-cyan-50 p-4 text-center">
            <p className="mb-1 text-sm font-medium text-sky-700">Media de Acertos</p>
            <p className="text-2xl font-bold text-sky-900">{averageScore}</p>
          </Card>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:justify-center sm:gap-4">
          <Button onClick={() => navigate(`/sala/${roomId}/host`)} variant="outline" className="h-12 rounded-xl">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar a Sala
          </Button>
          <Button onClick={() => navigate("/")} className="h-12 rounded-xl border-0 bg-gradient-primary">
            <Home className="mr-2 h-4 w-4" />
            Voltar ao Inicio
          </Button>
        </div>
      </main>
    </div>
  );
}
