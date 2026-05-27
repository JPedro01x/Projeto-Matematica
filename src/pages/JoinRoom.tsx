import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { localStore } from "@/lib/localStore";
import { validateNickname } from "@/lib/validation";
import { checkNicknameAvailability, nicknameToId } from "@/lib/nicknameUtils";
import { validateNicknameContent } from "@/lib/contentFilter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Sparkles, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { generateCard } from "@/lib/bingo";
import { ThemeToggle } from "@/components/theme-toggle";
import { hasSupabaseConfig } from "@/integrations/supabase/client";

export default function JoinRoom() {
  const navigate = useNavigate();
  const { roomId: paramRoomId } = useParams();
  const [search] = useSearchParams();
  const qrRoomId = search.get("room") ?? "";
  const prefilledPin = search.get("pin") ?? "";
  const [pin, setPin] = useState(prefilledPin);
  const [nickname, setNickname] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const roomId = paramRoomId || qrRoomId;
    if (!roomId) return;

    localStore.rooms.select(`eq("id", "${roomId}")`).then(({ data }) => {
      if (data?.length) setPin(data[0].pin);
    });
  }, [paramRoomId, qrRoomId]);

  const findRoom = async () => {
    const roomId = paramRoomId || qrRoomId;

    if (roomId) {
      const { data } = await localStore.rooms.select(`eq("id", "${roomId}")`);
      if (data?.length) return data[0];
    }

    const { data } = await localStore.rooms.select(`eq("pin", "${pin.trim()}")`);
    return data?.[0] ?? null;
  };

  const join = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim() || !nickname.trim()) return;

    const contentValidation = validateNicknameContent(nickname.trim());
    if (!contentValidation.isValid) {
      let errorMessage = contentValidation.error;
      if (contentValidation.suggestion) {
        errorMessage += ` Sugestao: ${contentValidation.suggestion}`;
      }
      toast.error(errorMessage, { duration: 6000 });
      return;
    }

    const validation = validateNickname(nickname.trim());
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    setBusy(true);
    try {
      const roomData = await findRoom();

      if (!roomData) {
        if (!hasSupabaseConfig) {
          toast.error("Banco compartilhado nao configurado no deploy. Configure o Supabase e crie uma nova sala.");
          return;
        }

        toast.error("PIN invalido. Peca ao professor para gerar uma nova sala e tente novamente.");
        return;
      }

      if (roomData.status === "playing") {
        toast.error("Esta partida ja iniciou! Aguarde a proxima rodada.", { duration: 5000 });
        return;
      }

      if (roomData.status === "finished") {
        toast.error("Esta partida ja foi encerrada. Aguarde uma nova sala!", { duration: 5000 });
        return;
      }

      const nicknameCheck = await checkNicknameAvailability(roomData.id, nickname.trim(), localStore);
      if (!nicknameCheck.isAvailable) {
        toast.error(`Este apelido ja esta em uso! Tente: ${nicknameCheck.suggestion}`, { duration: 6000 });
        return;
      }

      const card = generateCard(roomData.rows, roomData.cols, roomData.topics as any, roomData.difficulty as any);
      const playerId = `${roomData.id}-${nicknameToId(nickname.trim())}`;
      const { data: player, error } = await localStore.players.insert({
        id: playerId,
        room_id: roomData.id,
        nickname: nickname.trim(),
        card,
      });

      if (error) throw error;
      if (!player) throw new Error("Erro ao criar jogador");

      localStorage.setItem(`player:${roomData.id}`, player.id);
      navigate(`/jogar/${roomData.id}/${player.id}`);
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao entrar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-hero px-4 py-6 sm:p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="rounded-full"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <ThemeToggle />
        </div>
        <div className="mb-4 text-center sm:mb-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-card/90 px-4 py-2 shadow-soft backdrop-blur">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold">Entrar na partida</span>
          </div>
        </div>
        <Card className="rounded-2xl border-0 p-5 shadow-glow sm:rounded-3xl sm:p-8">
          <h1 className="display mb-1 text-2xl sm:text-3xl">Bora jogar!</h1>
          <p className="mb-5 text-sm text-muted-foreground sm:mb-6 sm:text-base">Digite o PIN dado pelo professor.</p>
          <form onSubmit={join} className="space-y-3 sm:space-y-4">
            <div>
              <Label>PIN da sala</Label>
              <Input
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                maxLength={6}
                placeholder="000000"
                className="mt-1.5 h-14 rounded-xl text-center font-mono text-2xl font-bold tracking-[0.35em] sm:h-16 sm:text-3xl sm:tracking-[0.5em]"
              />
            </div>
            <div>
              <Label>Seu apelido</Label>
              <Input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={20}
                placeholder="Ex: Maria"
                className="mt-1.5 h-12 rounded-xl"
              />
            </div>
            <Button
              type="submit"
              disabled={busy}
              className="h-12 w-full rounded-2xl border-0 bg-gradient-primary text-base shadow-glow sm:h-14 sm:text-lg"
            >
              {busy ? "Entrando..." : "Entrar na partida"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
