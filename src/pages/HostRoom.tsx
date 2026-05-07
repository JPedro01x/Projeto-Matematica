import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { localStore } from "@/lib/localStore";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Play, SkipForward, Trophy, Users, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { Challenge, generateChallenge, Topic, Difficulty, generateCardForChallenges, generateGameChallenges, drawNextChallenge } from "@/lib/bingo";
import { ThemeToggle } from "@/components/theme-toggle";

interface Room {
  id: string; name: string; pin: string; status: string; rows: number; cols: number;
  win_condition: string; topics: string[]; difficulty: string;
  current_challenge: Challenge | null; drawn_answers: string[]; winner_id: string | null;
  challenge_ended?: boolean;
  game_challenges?: Challenge[]; // Todos os desafios do jogo pré-gerados
  first_correct_player?: string | null; // ID do primeiro jogador a acertar o desafio atual
  players_responded?: string[]; // IDs dos jogadores que já responderam ao desafio atual
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
        console.log('HostRoom: Carregando dados da sala...');
        const { data } = await localStore.rooms.select(`eq("id", "${id}")`);
        if (data && data.length) setRoom(data[0] as any);
        
        const { data: ps } = await localStore.players.select(`eq("room_id", "${id}")`);
        const newPlayers = (ps as any) ?? [];
        console.log(`HostRoom: ${newPlayers.length} jogadores encontrados`);
        setPlayers(newPlayers);
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
      }
    };

    // Carregar imediatamente
    load();

    // Atualizar a cada 100ms para melhor responsividade (mais rápido que antes)
    const interval = setInterval(load, 100);
    
    // Listener para mudanças no localStorage de outras abas - chamada imediata
    const handleStorageChange = (e: StorageEvent) => {
      console.log(`HostRoom: Storage event detectado - ${e.key}`);
      if (e.key === 'bingo_players' || e.key === 'bingo_rooms' || e.key === 'bingo_sync_players' || e.key === 'bingo_sync_rooms') {
        console.log('HostRoom: Recarregando dados imediatamente devido a mudança em:', e.key);
        // Recarregar imediatamente sem esperar o próximo intervalo
        load();
      }
    };
    
    // Listener para evento customizado de mudanças de dados (mesma aba)
    const handleDataChanged = (e: CustomEvent) => {
      console.log('HostRoom: Evento dataChanged recebido:', e.detail);
      load();
    };
    
    // Listeners específicos para entrada e saída de jogadores (mesma aba)
    const handlePlayerJoined = (e: CustomEvent) => {
      console.log('HostRoom: Evento playerJoined recebido:', e.detail);
      load();
    };
    
    const handlePlayerLeft = (e: CustomEvent) => {
      console.log('HostRoom: Evento playerLeft recebido:', e.detail);
      load();
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('dataChanged', handleDataChanged as EventListener);
    window.addEventListener('playerJoined', handlePlayerJoined as EventListener);
    window.addEventListener('playerLeft', handlePlayerLeft as EventListener);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('dataChanged', handleDataChanged as EventListener);
      window.removeEventListener('playerJoined', handlePlayerJoined as EventListener);
      window.removeEventListener('playerLeft', handlePlayerLeft as EventListener);
    };
  }, [id]);

  if (!room) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando…</div>;

  const joinUrl = `${window.location.origin}/entrar?pin=${room.pin}`;

  const start = async () => {
    const maxChallenges = room.rows * room.cols;
    
    // Gerar TODOS os desafios do jogo com respostas únicas
    const gameChallenges = generateGameChallenges(
      room.topics as Topic[], 
      room.difficulty as Difficulty, 
      maxChallenges
    );
    
    // Sortear o primeiro desafio
    const firstChallenge = gameChallenges[0];
    
    // Atualizar sala com status de playing, os desafios pré-gerados e o primeiro desafio atual
    await localStore.rooms.update(`eq("id", "${room.id}")`, { 
      status: "playing",
      game_challenges: gameChallenges as any,
      current_challenge: firstChallenge as any,
      drawn_answers: [firstChallenge.answer],
      first_correct_player: null, // Resetar primeiro acertador
      players_responded: [] // Resetar jogadores que responderam
    });
    
    // Atualizar cartelas dos jogadores com TODAS as respostas dos desafios
    const { data: playersInRoom } = await localStore.players.select(`eq("room_id", "${room.id}")`);
    if (playersInRoom) {
      const allAnswers = gameChallenges.map(c => c.answer);
      
      for (const player of playersInRoom) {
        // Gerar nova cartela com TODAS as respostas dos desafios
        const newCard = generateCardForChallenges(
          room.rows, 
          room.cols, 
          allAnswers
        );
        
        await localStore.players.update(`eq("id", "${player.id}")`, {
          card: newCard
        });
      }
    }
    
    toast.success(`Jogo iniciado com ${gameChallenges.length} desafios únicos!`);
  };

  const draw = async () => {
    // Se o desafio atual ainda não foi finalizado, finaliza ele primeiro
    if (!room.challenge_ended && room.current_challenge) {
      await localStore.rooms.update(`eq("id", "${room.id}")`, {
        challenge_ended: true
      });
      toast.success("Desafio finalizado! Mostrando respostas... ⏱️");
      return;
    }
    
    // Se o desafio já foi finalizado, vai para o próximo usando os desafios pré-gerados
    const gameChallenges = room.game_challenges || [];
    const drawnAnswersSet = new Set(room.drawn_answers);
    
    // Usar o novo sistema de sorteio controlado
    const nextChallenge = drawNextChallenge(gameChallenges, drawnAnswersSet);
    
    if (!nextChallenge) {
      toast.error("Todos os desafios já foram sorteados! 🎉");
      await finish(); // Finalizar o jogo automaticamente
      return;
    }
    
    await localStore.rooms.update(`eq("id", "${room.id}")`, {
      current_challenge: nextChallenge as any,
      drawn_answers: [...room.drawn_answers, nextChallenge.answer],
      challenge_ended: false,
      first_correct_player: null, // Resetar primeiro acertador para o novo desafio
      players_responded: [] // Resetar jogadores que responderam
    });
    
    toast.success(`Próximo desafio: ${nextChallenge.question}`);
  };

  const finish = async () => {
    // Finalizar a partida: limpar desafios e definir status como finished
    await localStore.rooms.update(`eq("id", "${room.id}")`, { 
      status: "finished",
      current_challenge: null,
      drawn_answers: []
    });
    toast.success("Partida finalizada! 🎉");
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
                <Button onClick={draw} size="lg" className="rounded-2xl h-12 bg-card text-foreground hover:bg-card/90 border-0" disabled={room.status !== 'playing'}>
                  <SkipForward className="w-4 h-4 mr-2" /> {room.challenge_ended ? 'Próximo desafio' : 'Finalizar desafio'}
                </Button>
                <Button onClick={room.status === 'playing' ? finish : start} variant="ghost" size="lg" className="rounded-2xl h-12 hover:bg-white/10">
                  {room.status === 'playing' ? 'Encerrar partida' : 'Começar partida'}
                </Button>
              </div>
              <p className="mt-6 text-xs opacity-70">{room.drawn_answers.length} desafio(s) sorteado(s)</p>
              
              {/* Mostrar status de respostas */}
              {room.status === "playing" && room.current_challenge && (
                <div className="mt-6 p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
                  <p className="text-sm uppercase tracking-wider opacity-80 mb-2">Status das Respostas</p>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-lg font-bold">
                      {room.players_responded?.length || 0} / {players.length}
                    </span>
                    <span className="text-sm opacity-80">jogadores responderam</span>
                  </div>
                  {room.players_responded && room.players_responded.length === players.length && (
                    <p className="text-sm text-green-300 mt-2 text-center">✅ Todos responderam! Desafio será finalizado automaticamente...</p>
                  )}
                </div>
              )}
              
              {/* Mostrar vencedor atual quando desafio termina */}
              {room.challenge_ended && players.length > 0 && (
                <div className="mt-6 p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
                  <p className="text-sm uppercase tracking-wider opacity-80 mb-1">Líder Atual</p>
                  {(() => {
                    const leader = players.reduce((prev, current) => (prev.points > current.points) ? prev : current);
                    return (
                      <p className="text-2xl font-bold flex items-center justify-center gap-2">
                        🏆 {leader.nickname} <span className="text-lg opacity-80">({leader.points} pts)</span>
                      </p>
                    );
                  })()}
                </div>
              )}
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
                <button onClick={() => kick(p.id)} title="Remover jogador da sala" className="text-red-500 hover:text-red-600 transition-colors ml-2 flex-shrink-0"><X className="w-4 h-4" /></button>
              </div>
            ))}
            {!players.length && <p className="text-muted-foreground text-sm col-span-full text-center py-8">Nenhum aluno conectado ainda</p>}
          </div>
        </Card>
      </main>
    </div>
  );
}
