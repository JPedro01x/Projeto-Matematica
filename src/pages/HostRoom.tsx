import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { localStore } from "@/lib/localStore";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Play, SkipForward, Trophy, Users, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { Challenge, generateChallenge, Topic, Difficulty, generateCardForChallenges } from "@/lib/bingo";
import { ThemeToggle } from "@/components/theme-toggle";

interface Room {
  id: string; name: string; pin: string; status: string; rows: number; cols: number;
  win_condition: string; topics: string[]; difficulty: string;
  current_challenge: Challenge | null; drawn_answers: string[]; winner_id: string | null;
}
interface Player { id: string; nickname: string; has_won: boolean; points: number; }

export default function HostRoom() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);

  useEffect(() => {
    const professorNickname = localStorage.getItem("professor_nickname");
    if (!professorNickname) {
      navigate("/auth");
      return;
    }
  }, [navigate]);

  useEffect(() => {
    if (!id) return;
    
    const load = async () => {
      try {
        const { data } = await localStore.rooms.select(`eq("id", "${id}")`);
        if (data && data.length) setRoom(data[0] as any);
        
        const { data: ps } = await localStore.players.select(`eq("room_id", "${id}")`);
        setPlayers((ps as any) ?? []);
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
    
    // Listeners específicos para entrada e saída de jogadores
    const handlePlayerJoined = (e: Event) => {
      load();
    };
    
    const handlePlayerLeft = (e: Event) => {
      load();
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('dataChanged', handleDataChanged);
    window.addEventListener('playerJoined', handlePlayerJoined);
    window.addEventListener('playerLeft', handlePlayerLeft);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('dataChanged', handleDataChanged);
      window.removeEventListener('playerJoined', handlePlayerJoined);
      window.removeEventListener('playerLeft', handlePlayerLeft);
    };
  }, [id]);

  if (!room) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando…</div>;

  const joinUrl = `${window.location.origin}/entrar?pin=${room.pin}`;

  const start = async () => {
    // Gerar desafios baseados nas operações escolhidas
    const challenges: Challenge[] = [];
    const maxChallenges = room.rows * room.cols;
    
    // Gerar todos os desafios possíveis baseados nos tópicos escolhidos
    for (let i = 0; i < maxChallenges; i++) {
      const challenge = generateChallenge(room.topics as Topic[], room.difficulty as Difficulty);
      challenges.push(challenge);
    }
    
    // Atualizar sala com status de playing e os desafios gerados
    await localStore.rooms.update(`eq("id", "${room.id}")`, { 
      status: "playing",
      current_challenge: challenges[0] as any,
      drawn_answers: [challenges[0].answer]
    });
    
    // Atualizar cartelas dos jogadores com respostas aleatórias dos desafios
    const { data: playersInRoom } = await localStore.players.select(`eq("room_id", "${room.id}")`);
    if (playersInRoom) {
      for (const player of playersInRoom) {
        // Gerar nova cartela com respostas dos desafios
        const newCard = generateCardForChallenges(
          room.rows, 
          room.cols, 
          challenges.map(c => c.answer)
        );
        
        await localStore.players.update(`eq("id", "${player.id}")`, {
          card: newCard
        });
      }
    }
  };

  const draw = async () => {
    const ch = generateChallenge(room.topics as Topic[], room.difficulty as Difficulty);
    // ensure new answer not already drawn
    let tries = 0;
    let next = ch;
    while (room.drawn_answers.includes(next.answer) && tries < 30) {
      next = generateChallenge(room.topics as Topic[], room.difficulty as Difficulty);
      tries++;
    }
    await localStore.rooms.update(`eq("id", "${room.id}")`, {
      current_challenge: next as any,
      drawn_answers: [...room.drawn_answers, next.answer],
    });
  };

  const finish = async () => {
    await localStore.rooms.update(`eq("id", "${room.id}")`, { status: "finished" });
  };

  const kick = async (pid: string) => {
    const playerToRemove = players.find(p => p.id === pid);
    if (!playerToRemove) return;
    
    await localStore.players.delete(`eq("id", "${pid}")`);
    toast.success(`${playerToRemove.nickname} foi removido da sala`);
  };

  const winner = players.find(p => p.id === room.winner_id);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/professor")} className="rounded-full"><ArrowLeft className="w-4 h-4 mr-2" />Painel</Button>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <h1 className="font-display text-xl">{room.name}</h1>
          </div>
          <div className="w-20" />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 grid lg:grid-cols-3 gap-6">
        {/* Left: PIN + QR */}
        <Card className="p-6 rounded-3xl shadow-card lg:col-span-1 bg-gradient-card">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Código PIN</p>
          <p className="display text-6xl my-2 text-gradient">{room.pin}</p>
          <p className="text-sm text-muted-foreground mb-4">A turma entra em <span className="font-mono font-semibold text-foreground">/entrar</span></p>
          <div className="bg-card p-4 rounded-2xl flex items-center justify-center">
            <QRCodeSVG value={joinUrl} size={180} />
          </div>
          <p className="text-xs text-center text-muted-foreground mt-3">Aponte a câmera para entrar</p>
        </Card>

        {/* Center: Challenge */}
        <Card className="p-6 rounded-3xl shadow-card lg:col-span-2 bg-gradient-primary text-primary-foreground border-0">
          {room.status === "waiting" && (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <h2 className="display text-3xl mb-2">Sala aberta</h2>
              <p className="opacity-90 mb-6">{players.length} aluno(s) na sala</p>
              <Button onClick={start} disabled={!players.length} size="lg" className="rounded-2xl h-14 px-8 bg-card text-foreground hover:bg-card/90 border-0 text-lg shadow-pop">
                <Play className="w-5 h-5 mr-2" /> Começar partida
              </Button>
            </div>
          )}
          {room.status === "playing" && room.current_challenge && (
            <div className="flex flex-col items-center justify-center h-full text-center py-8 animate-pop-in" key={room.current_challenge.question}>
              <p className="text-sm uppercase tracking-widest opacity-80 mb-2">Desafio</p>
              <p className="display text-5xl md:text-7xl mb-6 leading-none">{room.current_challenge.question}</p>
              <p className="opacity-80 mb-6 text-sm">Resposta: <span className="font-mono font-bold">{room.current_challenge.answer}</span></p>
              <div className="flex gap-3 flex-wrap justify-center">
                <Button onClick={draw} size="lg" className="rounded-2xl h-12 bg-card text-foreground hover:bg-card/90 border-0">
                  <SkipForward className="w-4 h-4 mr-2" /> Próximo desafio
                </Button>
                <Button onClick={finish} variant="ghost" size="lg" className="rounded-2xl h-12 hover:bg-white/10">Encerrar</Button>
              </div>
              <p className="mt-6 text-xs opacity-70">{room.drawn_answers.length} desafio(s) sorteado(s)</p>
            </div>
          )}
          {room.status === "finished" && (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <Trophy className="w-16 h-16 mb-4" />
              <h2 className="display text-3xl">Partida encerrada</h2>
              {winner && <p className="mt-2 text-lg">🏆 Vencedor: <strong>{winner.nickname}</strong></p>}
            </div>
          )}
        </Card>

        {/* Players */}
        <Card className="p-6 rounded-3xl shadow-card lg:col-span-3">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5" />
            <h3 className="font-bold">{players.length} Jogador{players.length !== 1 ? 'es' : ''}</h3>
            <span className="text-xs text-muted-foreground ml-auto">Clique no X para remover</span>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {players.map(p => (
              <div key={p.id} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${p.has_won ? "bg-success/10 border-success" : "bg-muted border-border hover:border-destructive/50 hover:bg-muted/70"}`}>
                <div className="flex-1">
                  <span className="font-medium truncate">{p.has_won && "🏆 "}{p.nickname}</span>
                  <p className="text-xs text-muted-foreground">🏆 {p.points || 0} pts</p>
                </div>
                <button onClick={() => kick(p.id)} title="Remover jogador da sala" className="text-muted-foreground hover:text-destructive transition-colors ml-2 flex-shrink-0"><X className="w-4 h-4" /></button>
              </div>
            ))}
            {!players.length && <p className="text-muted-foreground text-sm col-span-full text-center py-8">Nenhum aluno conectado ainda</p>}
          </div>
        </Card>
      </main>
    </div>
  );
}
