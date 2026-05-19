import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { localStore } from "@/lib/localStore";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Medal, Star, Users, ArrowLeft, Home } from "lucide-react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/theme-toggle";

interface Room {
  id: string; name: string; status: string; winner_id: string | null;
}

interface Player {
  id: string; nickname: string; correct_answers_count: number; has_won: boolean;
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
        // Carregar dados da sala
        const { data: roomData } = await localStore.rooms.select(`eq("id", "${roomId}")`);
        if (roomData && roomData.length) {
          setRoom(roomData[0] as any);
        }

        // Carregar todos os jogadores da sala
        const { data: playersData } = await localStore.players.select(`eq("room_id", "${roomId}")`);
        if (playersData && playersData.length) {
          // Ordenar jogadores por pontos (maior para menor)
          const sortedPlayers = (playersData as Player[]).sort((a, b) => b.points - a.points);
          setPlayers(sortedPlayers);
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando resultados...</p>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">Sala não encontrada</p>
          <Button onClick={() => navigate("/")} className="rounded-xl">
            <Home className="w-4 h-4 mr-2" />
            Voltar ao Início
          </Button>
        </div>
      </div>
    );
  }

  const winner = players.find(p => p.id === room.winner_id);
  const sortedPlayers = [...players].sort((a, b) => b.correct_answers_count - a.correct_answers_count);

  return (
    <div className="min-h-screen bg-hero pb-10">
      <header className="bg-gradient-primary text-primary-foreground px-6 py-5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/")} 
            className="rounded-full text-primary-foreground hover:bg-primary-foreground/10"
          >
            <Home className="w-4 h-4 mr-2" />
            Início
          </Button>
          <h1 className="font-display text-xl">Resultados da Partida</h1>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Vencedor Destacado */}
        {winner && (
          <Card className="p-8 rounded-3xl shadow-glow mb-8 bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-300">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-orange-400 mb-4">
                <Trophy className="w-10 h-10 text-white" />
              </div>
              <h2 className="display text-3xl mb-2 text-transparent bg-clip-text bg-gradient-to-r from-yellow-600 to-orange-600">
                🏆 Vencedor da Partida!
              </h2>
              <p className="text-2xl font-bold text-gray-800 mb-2">{winner.nickname}</p>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-100 text-yellow-800">
                <Star className="w-5 h-5" />
                <span className="font-bold">{winner.correct_answers_count} acertos</span>
              </div>
            </div>
          </Card>
        )}

        {/* Lista de Todos os Participantes */}
        <Card className="p-6 rounded-3xl shadow-card">
          <div className="flex items-center gap-2 mb-6">
            <Users className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-lg">Todos os Participantes</h3>
            <span className="text-sm text-muted-foreground ml-auto">
              {players.length} jogador{players.length !== 1 ? 'es' : ''}
            </span>
          </div>

          <div className="space-y-3">
            {sortedPlayers.map((player, index) => {
              const isWinner = player.id === room.winner_id;
              const position = index + 1;
              
              return (
                <div
                  key={player.id}
                  className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                    isWinner
                      ? "bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-300 shadow-lg scale-105"
                      : "bg-card border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Posição */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                      position === 1 ? "bg-gradient-to-br from-yellow-400 to-orange-400 text-white" :
                      position === 2 ? "bg-gray-400 text-white" :
                      position === 3 ? "bg-amber-600 text-white" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {position === 1 ? <Trophy className="w-5 h-5" /> :
                       position === 2 ? <Medal className="w-5 h-5" /> :
                       position === 3 ? <Medal className="w-5 h-5" /> :
                       position}
                    </div>
                    
                    {/* Info do Jogador */}
                    <div>
                      <p className={`font-bold ${isWinner ? "text-lg text-orange-800" : ""}`}>
                        {player.nickname}
                        {isWinner && <span className="ml-2 text-yellow-600">🏆</span>}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {player.has_won ? "✅ Fez Bingo" : "❌ Não fez Bingo"}
                      </p>
                    </div>
                  </div>

                  {/* Acertos */}
                  <div className="text-right">
                    <p className={`font-bold text-lg ${isWinner ? "text-orange-800" : ""}`}>
                      {player.correct_answers_count} acertos
                    </p>
                    {isWinner && (
                      <p className="text-xs text-yellow-600 font-medium">Vencedor</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Estatísticas da Partida */}
        <div className="grid md:grid-cols-3 gap-4 mt-8">
          <Card className="p-4 rounded-2xl text-center bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <p className="text-sm text-blue-600 font-medium mb-1">Total de Jogadores</p>
            <p className="text-2xl font-bold text-blue-800">{players.length}</p>
          </Card>
          
          <Card className="p-4 rounded-2xl text-center bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <p className="text-sm text-green-600 font-medium mb-1">Máximo de Acertos</p>
            <p className="text-2xl font-bold text-green-800">
              {players.length > 0 ? Math.max(...players.map(p => p.correct_answers_count)) : 0}
            </p>
          </Card>
          
          <Card className="p-4 rounded-2xl text-center bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
            <p className="text-sm text-purple-600 font-medium mb-1">Média de Acertos</p>
            <p className="text-2xl font-bold text-purple-800">
              {players.length > 0 ? Math.round(players.reduce((sum, p) => sum + p.correct_answers_count, 0) / players.length) : 0}
            </p>
          </Card>
        </div>

        {/* Botões de Ação */}
        <div className="flex gap-4 justify-center mt-8">
          <Button 
            onClick={() => navigate(`/sala/${roomId}/host`)} 
            variant="outline"
            className="rounded-xl h-12"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar à Sala
          </Button>
          <Button 
            onClick={() => navigate("/professor")} 
            className="rounded-xl h-12 bg-gradient-primary border-0"
          >
            <Home className="w-4 h-4 mr-2" />
            Painel do Professor
          </Button>
        </div>
      </main>
    </div>
  );
}
