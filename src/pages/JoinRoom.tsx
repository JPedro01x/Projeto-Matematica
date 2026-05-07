import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { localStore } from "@/lib/localStore";
import { validateNickname } from "@/lib/validation";
import { checkNicknameAvailability } from "@/lib/nicknameUtils";
import { validateNicknameContent } from "@/lib/contentFilter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Sparkles, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { generateCard } from "@/lib/bingo";

export default function JoinRoom() {
  const navigate = useNavigate();
  const { roomId: paramRoomId } = useParams();
  const [search] = useSearchParams();
  const prefilledPin = search.get("pin") ?? "";
  const [pin, setPin] = useState(prefilledPin);
  const [nickname, setNickname] = useState("");
  const [busy, setBusy] = useState(false);

  // If roomId in path, look up its PIN
  useEffect(() => {
    if (paramRoomId) {
      localStore.rooms.select(`eq("id", "${paramRoomId}")`).then(({ data }) => {
        if (data && data.length) setPin(data[0].pin);
      });
    }
  }, [paramRoomId]);

  const join = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim() || !nickname.trim()) return;
    
    // Validar apelido - conteúdo inapropriado primeiro
    const contentValidation = validateNicknameContent(nickname.trim());
    if (!contentValidation.isValid) {
      let errorMessage = contentValidation.error;
      if (contentValidation.suggestion) {
        errorMessage += ` Sugestão: ${contentValidation.suggestion}`;
      }
      toast.error(errorMessage, {
        duration: 6000,
      });
      return;
    }
    
    // Validar formato do apelido
    const validation = validateNickname(nickname.trim());
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }
    
    setBusy(true);
    try {
      console.log('=== INICIANDO BUSCA DE SALA ===');
      console.log('PIN digitado:', pin.trim());
      console.log('Nickname:', nickname.trim());
      
      const { data: room } = await localStore.rooms.select(`eq("pin", "${pin.trim()}")`);
      console.log('Resultado da busca:', room);
      console.log('Query executada:', `eq("pin", "${pin.trim()}")`);
      
      if (!room || !room.length) { 
        console.error('Sala não encontrada. PIN:', pin.trim(), 'Query:', `eq("pin", "${pin.trim()}")`, 'Rooms disponíveis:', room);
        toast.error("PIN inválido"); 
        return; 
      }
      const roomData = room[0];
      console.log('Sala encontrada com sucesso:', roomData);
      
      // Verificar se a partida já está em andamento
      if (roomData.status === 'playing') {
        toast.error('Esta partida já iniciou! Aguarde a próxima rodada. ⏳', {
          duration: 5000,
        });
        return;
      }
      
      // Verificar se a partida já foi finalizada
      if (roomData.status === 'finished') {
        toast.error('Esta partida já foi encerrada. Aguarde uma nova sala! 🏁', {
          duration: 5000,
        });
        return;
      }
      
      // Verificar se já existe jogador com mesmo apelido nesta sala
      const nicknameCheck = await checkNicknameAvailability(roomData.id, nickname.trim(), localStore);
      if (!nicknameCheck.isAvailable) {
        toast.error(`Este apelido já está em uso! Tente: ${nicknameCheck.suggestion} 😅`, {
          duration: 6000,
        });
        return;
      }
      
      console.log('Sala encontrada:', roomData);
      console.log('PIN digitado:', pin.trim());
      console.log('Apelido verificado e disponível');
      
      const card = generateCard(roomData.rows, roomData.cols, roomData.topics as any, roomData.difficulty as any);
      const { data: player } = await localStore.players.insert({
        room_id: roomData.id, 
        nickname: nickname.trim(), 
        card,
      });
      if (!player) throw new Error("Erro ao criar jogador");
      localStorage.setItem(`player:${roomData.id}`, player.id);
      navigate(`/jogar/${roomData.id}/${player.id}`);
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao entrar");
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-hero flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Button 
          variant="ghost" 
          onClick={() => navigate("/")} 
          className="mb-4 rounded-full"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card/90 backdrop-blur shadow-soft">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold">Entrar na partida</span>
          </div>
        </div>
        <Card className="p-8 rounded-3xl shadow-glow border-0">
          <h1 className="display text-3xl mb-1">Bora jogar! 🎯</h1>
          <p className="text-muted-foreground mb-6">Digite o PIN dado pelo professor.</p>
          <form onSubmit={join} className="space-y-4">
            <div>
              <Label>PIN da sala</Label>
              <Input value={pin} onChange={(e) => setPin(e.target.value)} maxLength={6} placeholder="000000"
                className="rounded-xl h-16 mt-1.5 text-center text-3xl font-mono tracking-[0.5em] font-bold" />
            </div>
            <div>
              <Label>Seu apelido</Label>
              <Input value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={20} placeholder="Ex: Maria"
                className="rounded-xl h-12 mt-1.5" />
            </div>
            <Button type="submit" disabled={busy} className="w-full h-14 rounded-2xl bg-gradient-primary border-0 text-lg shadow-glow">
              {busy ? "Entrando…" : "Entrar na partida"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
