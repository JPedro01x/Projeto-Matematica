import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Sparkles, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { validateNicknameContent } from "@/lib/contentFilter";

export default function Auth() {
  const navigate = useNavigate();
  const [nickname, setNickname] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); 
    if (!nickname.trim()) {
      toast.error("Digite seu apelido");
      return;
    }
    
    // Validar conteúdo inapropriado
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
    
    setBusy(true);
    try {
      // Salvar apelido no localStorage
      localStorage.setItem("professor_nickname", nickname.trim());
      toast.success(`Bem-vindo(a), Professor(a) ${nickname.trim()}!`);
      navigate("/professor");
    } catch (err: any) {
      toast.error("Erro ao entrar");
    } finally { 
      setBusy(false); 
    }
  };

  return (
    <div className="min-h-screen bg-hero flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-2 text-primary-foreground/90 hover:text-primary-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Link>
        <Card className="p-8 rounded-3xl shadow-glow border-0">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-2xl bg-gradient-primary flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="display text-2xl">Área do professor</h1>
              <p className="text-sm text-muted-foreground">Digite seu apelido para criar partidas</p>
            </div>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label htmlFor="nickname">Seu apelido</Label>
              <Input 
                id="nickname" 
                type="text" 
                required 
                value={nickname} 
                onChange={(e) => setNickname(e.target.value)} 
                placeholder="Ex: Professor João"
                className="rounded-xl h-12 mt-1.5" 
              />
            </div>
            <Button type="submit" disabled={busy} className="w-full h-12 rounded-xl bg-gradient-primary hover:opacity-90 border-0 text-base">
              {busy ? "Aguarde…" : "Entrar como professor"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
