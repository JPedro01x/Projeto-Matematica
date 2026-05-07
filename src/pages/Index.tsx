import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, Brain, Users, Trophy, Zap, GraduationCap } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen overflow-hidden">
      {/* Nav */}
      <nav className="absolute top-0 left-0 right-0 z-10 px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2 text-foreground">
        </div>
        <div className="flex items-center gap-3">
          <Link to="/entrar"><Button variant="ghost" className="rounded-full">Entrar na sala</Button></Link>
          <Link to="/auth"><Button className="rounded-full bg-gradient-primary hover:opacity-90 border-0 shadow-soft">Sou professor</Button></Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center px-6 pt-24 pb-16">
        {/* Floating bg shapes */}
        <div className="absolute top-32 left-10 w-24 h-24 rounded-3xl bg-gradient-fun opacity-80 animate-float" style={{ animationDelay: "0s" }} />
        <div className="absolute top-48 right-16 w-20 h-20 rounded-full bg-gradient-accent opacity-70 animate-float" style={{ animationDelay: "1.5s" }} />
        <div className="absolute bottom-32 left-1/4 w-16 h-16 rounded-2xl bg-secondary/80 animate-float" style={{ animationDelay: "0.8s" }} />
        <div className="absolute bottom-40 right-1/4 w-28 h-28 rounded-full bg-primary/20 animate-float" style={{ animationDelay: "2s" }} />

        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card shadow-soft mb-6">
            <Zap className="w-4 h-4 text-secondary" />
            <span className="text-sm font-semibold">Aprender matemática nunca foi tão divertido</span>
          </div>

          <h1 className="display text-6xl md:text-8xl mb-6 leading-[0.95]">
            Bingo <span className="text-gradient">Matemático</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Crie partidas em segundos. Os alunos entram pelo celular com um PIN ou QR Code,
            resolvem desafios e marcam a cartela. Estilo game show, do 6º ao 9º ano.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link to="/entrar">
              <Button size="lg" className="rounded-2xl text-lg h-14 px-8 bg-gradient-primary hover:opacity-90 border-0 shadow-glow">
                Entrar com PIN
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="lg" variant="outline" className="rounded-2xl text-lg h-14 px-8 border-2">
                Criar partida (professor)
              </Button>
            </Link>
          </div>

          {/* Feature cards */}
          <div className="grid sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {[
              { icon: Brain, title: "9 conteúdos BNCC", desc: "Frações, %, MMC, racionais e mais" },
              { icon: Users, title: "Multiplayer real", desc: "Turma toda jogando ao vivo" },
              { icon: Trophy, title: "Você define a vitória", desc: "Linha, coluna, diagonal ou cheia" },
            ].map((f) => (
              <div key={f.title} className="bg-gradient-card rounded-3xl p-6 shadow-card border border-border/50 text-left">
                <div className="w-11 h-11 rounded-2xl bg-gradient-primary flex items-center justify-center mb-3">
                  <f.icon className="w-5 h-5 text-primary-foreground" />
                </div>
                <h3 className="font-bold mb-1">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="px-6 py-8 text-center text-sm text-muted-foreground border-t border-border/50 flex items-center justify-center gap-2">
        <GraduationCap className="w-4 h-4" /> Alinhado à BNCC · Ensino Fundamental II
      </footer>
    </div>
  );
};

export default Index;
