import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Sparkles, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { validateNicknameContent } from "@/lib/contentFilter";
import { ThemeToggle } from "@/components/theme-toggle";

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
    <div className="flex min-h-screen items-center justify-center bg-hero px-4 py-6 sm:p-6">
      <div className="w-full max-w-md">
        <div className="mb-4 flex items-center justify-between sm:mb-6">
          <Link to="/" className="inline-flex items-center gap-2 text-primary-foreground/90 hover:text-primary-foreground">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Link>
          <ThemeToggle />
        </div>
        <Card className="rounded-2xl border-0 p-5 shadow-glow sm:rounded-3xl sm:p-8">
          <div className="mb-5 flex items-center gap-3 sm:mb-6">
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
                className="mt-1.5 h-12 rounded-xl" 
              />
            </div>
            <Button type="submit" disabled={busy} className="h-12 w-full rounded-xl border-0 bg-gradient-primary text-base hover:opacity-90">
              {busy ? "Aguarde…" : "Entrar como professor"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
