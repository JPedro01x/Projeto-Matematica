import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { localStore } from "@/lib/localStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Plus, LogOut, Play, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ALL_TOPICS, TOPIC_LABELS, Topic, Difficulty } from "@/lib/bingo";
import { ThemeToggle } from "@/components/theme-toggle";
import { normalizeNickname } from "@/lib/nicknameUtils";

interface Room {
  id: string; name: string; pin: string; status: string;
  rows: number; cols: number; win_condition: string; created_at: string;
  owner_nickname?: string;
}

const genPin = async (existingRooms: Room[]): Promise<string> => {
  let attempts = 0;
  const maxAttempts = 100;
  
  while (attempts < maxAttempts) {
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Verificar se o PIN já existe
    const pinExists = existingRooms.some(room => room.pin === pin);
    
    if (!pinExists) {
      return pin;
    }
    
    attempts++;
  }
  
  // Se não conseguir um PIN único após várias tentativas, usar timestamp
  return Math.floor(100000 + (Date.now() % 900000)).toString();
};

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const [professorNickname, setProfessorNickname] = useState<string>("");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [rows, setRows] = useState(5);
  const [cols, setCols] = useState(5);
  const [winCondition, setWinCondition] = useState<"line" | "column" | "diagonal" | "full">("line");
  const [difficulty, setDifficulty] = useState<Difficulty>("medio");
  const [topics, setTopics] = useState<Topic[]>(["operacoes", "expressoes"]);

  useEffect(() => {
    const nickname = localStorage.getItem("professor_nickname");
    if (!nickname) {
      navigate("/auth");
      return;
    }
    setProfessorNickname(nickname);
    loadRooms(nickname);
    
    // Listener para mudanças no localStorage de outras abas
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'bingo_rooms') {
        loadRooms(nickname);
      }
    };
    
    // Listener para evento customizado de mudanças de dados
    const handleDataChanged = (e: Event) => {
      loadRooms(nickname);
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('dataChanged', handleDataChanged);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('dataChanged', handleDataChanged);
    };
  }, [navigate]);

  const loadRooms = async (nickname = professorNickname) => {
    if (!nickname) return;
    const { data } = await localStore.rooms.select();
    const allRooms = ((data as Room[]) ?? []).map(room => {
      if (!room.owner_nickname) {
        localStore.rooms.update(`eq("id", "${room.id}")`, { owner_nickname: nickname } as any);
        return { ...room, owner_nickname: nickname };
      }
      return room;
    });
    const ownerKey = normalizeNickname(nickname);
    setRooms(allRooms.filter(room => normalizeNickname(room.owner_nickname || "") === ownerKey));
  };

  const create = async () => {
    if (!name.trim()) return toast.error("Dê um nome à partida");
    if (!topics.length) return toast.error("Escolha ao menos um conteúdo");
    
    // Gerar PIN único
    const { data: allRooms } = await localStore.rooms.select();
    const uniquePin = await genPin((allRooms as Room[]) ?? []);
    
    const { data } = await localStore.rooms.insert({
      name, pin: uniquePin, rows, cols,
      owner_nickname: professorNickname,
      win_condition: winCondition, difficulty, topics,
    });
    if (!data) return toast.error("Erro ao criar sala");
    toast.success("Sala criada!");
    setCreating(false); setName("");
    navigate(`/sala/${data.id}/host`);
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir essa sala?")) return;
    await localStore.rooms.delete(`eq("id", "${id}")`);
    loadRooms();
  };

  const logout = () => { 
    localStorage.removeItem("professor_nickname"); 
    navigate("/"); 
  };

  const toggleTopic = (t: Topic) => setTopics(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t]);

  if (!professorNickname) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button variant="ghost" onClick={logout} className="rounded-full"><LogOut className="w-4 h-4 mr-2" />Sair</Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-6 sm:mb-8 gap-4">
          <div>
            <h1 className="display text-3xl sm:text-4xl md:text-5xl">Suas partidas</h1>
            <p className="text-muted-foreground mt-2 text-sm sm:text-base">Crie uma sala e compartilhe o PIN com a turma.</p>
          </div>
          <Button onClick={() => setCreating(true)} className="rounded-2xl h-12 w-full sm:w-auto px-6 bg-gradient-primary border-0 shadow-soft">
            <Plus className="w-5 h-5 mr-2" /> Nova partida
          </Button>
        </div>

        {creating && (
          <Card className="p-4 sm:p-6 md:p-8 rounded-2xl md:rounded-3xl mb-6 sm:mb-8 shadow-card animate-pop-in">
            <h2 className="display text-xl sm:text-2xl mb-4 sm:mb-5">Configurar partida</h2>
            <div className="grid md:grid-cols-2 gap-4 md:gap-5">
              <div className="md:col-span-2">
                <Label>Nome da partida</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Revisão 7º ano" className="rounded-xl h-11 mt-1.5" />
              </div>
              <div>
                <Label>Linhas</Label>
                <Input type="number" min={3} max={9} value={rows} onChange={(e) => setRows(+e.target.value)} className="rounded-xl h-11 mt-1.5" />
              </div>
              <div>
                <Label>Colunas</Label>
                <Input type="number" min={3} max={9} value={cols} onChange={(e) => setCols(+e.target.value)} className="rounded-xl h-11 mt-1.5" />
              </div>
              <div>
                <Label>Condição de vitória</Label>
                <Select value={winCondition} onValueChange={(v: any) => setWinCondition(v)}>
                  <SelectTrigger className="rounded-xl h-11 mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="line">Linha</SelectItem>
                    <SelectItem value="column">Coluna</SelectItem>
                    <SelectItem value="diagonal">Diagonal</SelectItem>
                    <SelectItem value="full">Cartela cheia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Dificuldade</Label>
                <Select value={difficulty} onValueChange={(v: any) => setDifficulty(v)}>
                  <SelectTrigger className="rounded-xl h-11 mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="facil">Fácil</SelectItem>
                    <SelectItem value="medio">Médio</SelectItem>
                    <SelectItem value="dificil">Difícil</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label>Conteúdos</Label>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                  {ALL_TOPICS.map(t => (
                    <label key={t} className="flex items-center gap-2 p-3 rounded-xl border border-border bg-card hover:bg-muted cursor-pointer transition-colors">
                      <Checkbox checked={topics.includes(t)} onCheckedChange={() => toggleTopic(t)} />
                      <span className="text-sm font-medium">{TOPIC_LABELS[t]}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <Button onClick={create} className="rounded-xl bg-gradient-primary border-0 h-11 px-6">Criar partida</Button>
              <Button variant="ghost" onClick={() => setCreating(false)} className="rounded-xl h-11">Cancelar</Button>
            </div>
          </Card>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map(r => (
            <Card key={r.id} className="p-4 sm:p-5 rounded-2xl shadow-card border-border/50 hover:shadow-glow transition-shadow">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <h3 className="font-bold text-lg">{r.name}</h3>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">PIN · <span className="font-mono text-base text-foreground tracking-wider">{r.pin}</span></p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-semibold shrink-0 ${r.status === "waiting" ? "bg-secondary/30 text-secondary-foreground" : r.status === "playing" ? "bg-accent/30" : "bg-muted text-muted-foreground"}`}>
                  {r.status === "waiting" ? "Aguardando" : r.status === "playing" ? "Em jogo" : "Encerrada"}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">{r.rows}×{r.cols} · {r.win_condition}</p>
              <div className="flex gap-2">
                <Button onClick={() => navigate(`/sala/${r.id}/host`)} className="flex-1 rounded-xl bg-gradient-primary border-0"><Play className="w-4 h-4 mr-1" />Abrir</Button>
                <Button variant="ghost" size="icon" onClick={() => remove(r.id)} className="rounded-xl"><Trash2 className="w-4 h-4" /></Button>
              </div>
            </Card>
          ))}
          {!rooms.length && !creating && (
            <p className="text-muted-foreground col-span-full text-center py-12">Nenhuma partida ainda. Crie a primeira!</p>
          )}
        </div>
      </main>
    </div>
  );
}
