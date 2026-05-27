import { useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Brain, GraduationCap, Trophy, Users, Zap } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

const Index = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const pin = searchParams.get("pin") || new URLSearchParams(window.location.search).get("pin");
    if (pin) {
      navigate(`/entrar?pin=${encodeURIComponent(pin)}`, { replace: true });
    }
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen overflow-hidden">
      <nav className="absolute left-0 right-0 top-0 z-10 flex items-center justify-end px-3 py-3 sm:px-6 sm:py-5">
        <div className="flex items-center gap-1.5 sm:gap-3">
          <ThemeToggle />
          <Link to="/entrar">
            <Button variant="ghost" className="rounded-full px-3 text-xs sm:px-4 sm:text-sm">
              Entrar
            </Button>
          </Link>
          <Link to="/auth">
            <Button className="rounded-full border-0 bg-gradient-primary px-3 text-xs shadow-soft hover:opacity-90 sm:px-4 sm:text-sm">
              Professor
            </Button>
          </Link>
        </div>
      </nav>

      <section className="relative flex min-h-screen items-center justify-center px-4 pb-10 pt-24 sm:px-6 sm:pb-16">
        <div className="absolute left-4 top-28 h-14 w-14 rounded-2xl bg-gradient-fun opacity-70 animate-float sm:left-10 sm:h-24 sm:w-24 sm:rounded-3xl" />
        <div className="absolute right-5 top-44 h-12 w-12 rounded-full bg-gradient-accent opacity-60 animate-float sm:right-16 sm:h-20 sm:w-20" style={{ animationDelay: "1.5s" }} />
        <div className="absolute bottom-24 left-8 h-12 w-12 rounded-2xl bg-secondary/70 animate-float sm:bottom-32 sm:left-1/4 sm:h-16 sm:w-16" style={{ animationDelay: "0.8s" }} />
        <div className="absolute bottom-32 right-6 h-16 w-16 rounded-full bg-primary/15 animate-float sm:bottom-40 sm:right-1/4 sm:h-28 sm:w-28" style={{ animationDelay: "2s" }} />

        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mb-5 inline-flex max-w-full items-center gap-2 rounded-full bg-card px-3 py-2 shadow-soft sm:mb-6 sm:px-4">
            <Zap className="h-4 w-4 shrink-0 text-secondary" />
            <span className="text-xs font-semibold sm:text-sm">Aprender matematica nunca foi tao divertido</span>
          </div>

          <h1 className="display mb-5 text-5xl leading-[0.95] sm:text-6xl md:mb-6 md:text-8xl">
            Bingo <span className="text-gradient">Matematico</span>
          </h1>

          <p className="mx-auto mb-8 max-w-2xl text-base text-muted-foreground sm:text-lg md:mb-10 md:text-xl">
            Crie partidas em segundos. Os alunos entram pelo celular com um PIN ou QR Code,
            resolvem desafios e marcam a cartela. Estilo game show, do 6o ao 9o ano.
          </p>

          <div className="mb-10 flex flex-col gap-3 sm:mb-16 sm:flex-row sm:justify-center sm:gap-4">
            <Link to="/entrar" className="w-full sm:w-auto">
              <Button size="lg" className="h-12 w-full rounded-2xl border-0 bg-gradient-primary px-6 text-base shadow-glow hover:opacity-90 sm:h-14 sm:px-8 sm:text-lg">
                Entrar com PIN
              </Button>
            </Link>
            <Link to="/auth" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="h-12 w-full rounded-2xl border-2 px-6 text-base sm:h-14 sm:px-8 sm:text-lg">
                Criar partida
              </Button>
            </Link>
          </div>

          <div className="mx-auto grid max-w-3xl gap-3 sm:grid-cols-3 sm:gap-4">
            {[
              { icon: Brain, title: "9 conteudos BNCC", desc: "Fracoes, porcentagem, MMC, racionais e mais" },
              { icon: Users, title: "Multiplayer real", desc: "Turma toda jogando ao vivo" },
              { icon: Trophy, title: "Voce define a vitoria", desc: "Linha, coluna, diagonal ou cheia" },
            ].map((feature) => (
              <div key={feature.title} className="rounded-2xl border border-border/50 bg-gradient-card p-4 text-left shadow-card sm:rounded-3xl sm:p-6">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-primary sm:h-11 sm:w-11">
                  <feature.icon className="h-5 w-5 text-primary-foreground" />
                </div>
                <h3 className="mb-1 font-bold">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="flex items-center justify-center gap-2 border-t border-border/50 px-4 py-6 text-center text-xs text-muted-foreground sm:px-6 sm:py-8 sm:text-sm">
        <GraduationCap className="h-4 w-4 shrink-0" />
        Alinhado a BNCC - Ensino Fundamental II
      </footer>
    </div>
  );
};

export default Index;
