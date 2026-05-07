// Math challenge generator for Bingo Matemático
// Returns { question: string, answer: number | string, display?: string }

export type Topic =
  | "operacoes"
  | "expressoes"
  | "naturais"
  | "fracoes"
  | "fracoes-equiv"
  | "mult-div"
  | "racionais"
  | "porcentagem"
  | "logica";

export type Difficulty = "facil" | "medio" | "dificil";

export interface Challenge {
  question: string;
  answer: string; // normalized as string for matching
  topic: Topic;
}

const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));
const simplify = (n: number, d: number) => {
  const g = gcd(n, d);
  return [n / g, d / g] as const;
};
const fracStr = (n: number, d: number) => {
  const [a, b] = simplify(n, d);
  return b === 1 ? `${a}` : `${a}/${b}`;
};

function range(d: Difficulty) {
  if (d === "facil") return { lo: 1, hi: 12 };
  if (d === "medio") return { lo: 5, hi: 50 };
  return { lo: 10, hi: 200 };
}

function gen(topic: Topic, diff: Difficulty): Challenge {
  const { lo, hi } = range(diff);
  switch (topic) {
    case "operacoes": {
      const op = pick(["+", "−", "×", "÷"]);
      let a = rand(lo, hi), b = rand(lo, hi), ans = 0;
      if (op === "+") ans = a + b;
      else if (op === "−") { if (b > a) [a, b] = [b, a]; ans = a - b; }
      else if (op === "×") { a = rand(2, diff === "facil" ? 9 : 15); b = rand(2, diff === "facil" ? 9 : 12); ans = a * b; }
      else { ans = rand(2, 12); b = rand(2, 9); a = ans * b; }
      return { question: `${a} ${op} ${b}`, answer: String(ans), topic };
    }
    case "expressoes": {
      const a = rand(lo, hi), b = rand(2, 9), c = rand(2, 9);
      return { question: `${a} + ${b} × ${c}`, answer: String(a + b * c), topic };
    }
    case "naturais": {
      const a = rand(hi, hi * 5), b = rand(lo, hi);
      return { question: `${a} − ${b}`, answer: String(a - b), topic };
    }
    case "fracoes": {
      const d = rand(2, 8);
      const a = rand(1, d - 1), b = rand(1, d - 1);
      const sum = a + b;
      return { question: `${a}/${d} + ${b}/${d}`, answer: fracStr(sum, d), topic };
    }
    case "fracoes-equiv": {
      const n = rand(1, 6), d = rand(n + 1, 10), k = rand(2, 5);
      return { question: `Fração equivalente a ${n}/${d} (multiplique por ${k})`, answer: `${n * k}/${d * k}`, topic };
    }
    case "mult-div": {
      if (Math.random() < 0.5) {
        const a = rand(2, 12); const k = rand(2, 9);
        return { question: `Um múltiplo de ${a} (×${k})`, answer: String(a * k), topic };
      }
      const d = rand(2, 12); const k = rand(2, 9);
      return { question: `Quociente de ${d * k} ÷ ${d}`, answer: String(k), topic };
    }
    case "racionais": {
      const a = rand(1, 99) / 10; const b = rand(1, 99) / 10;
      return { question: `${a.toFixed(1)} + ${b.toFixed(1)}`, answer: (a + b).toFixed(1), topic };
    }
    case "porcentagem": {
      const p = pick([10, 20, 25, 50, 75]); const base = pick([20, 40, 60, 80, 100, 120, 200]);
      return { question: `${p}% de ${base}`, answer: String((p * base) / 100), topic };
    }
    case "logica": {
      const a = rand(2, 9), n = rand(3, 6);
      const seq = Array.from({ length: n }, (_, i) => a * (i + 1));
      const next = a * (n + 1);
      return { question: `Próximo da sequência: ${seq.join(", ")}, ?`, answer: String(next), topic };
    }
  }
}

export function generateChallenge(topics: Topic[], diff: Difficulty): Challenge {
  const t = topics.length ? pick(topics) : "operacoes";
  return gen(t, diff);
}

// Build pool of unique answers for card generation
export function buildAnswerPool(topics: Topic[], diff: Difficulty, size: number): string[] {
  const set = new Set<string>();
  let safety = 0;
  while (set.size < size && safety < size * 50) {
    set.add(generateChallenge(topics, diff).answer);
    safety++;
  }
  // Pad with extras if needed
  while (set.size < size) set.add(String(rand(1, 999) + set.size));
  return Array.from(set);
}

export function generateCard(rows: number, cols: number, topics: Topic[], diff: Difficulty): string[][] {
  const pool = buildAnswerPool(topics, diff, rows * cols * 3);
  const shuffled = pool.sort(() => Math.random() - 0.5).slice(0, rows * cols);
  const card: string[][] = [];
  for (let r = 0; r < rows; r++) card.push(shuffled.slice(r * cols, r * cols + cols));
  return card;
}

// Gerar cartela com respostas específicas dos desafios
export function generateCardForChallenges(rows: number, cols: number, answers: string[]): string[][] {
  const totalCells = rows * cols;
  
  // Garantir que TODAS as respostas corretas estejam na cartela
  const allAnswers = [...answers];
  const shuffledAnswers = [...answers].sort(() => Math.random() - 0.5);
  
  // Se houver mais respostas que células, usar apenas as que cabem
  const answersToFit = shuffledAnswers.slice(0, Math.min(totalCells, shuffledAnswers.length));
  
  // Preencher o restante com números aleatórios
  const remainingCells = totalCells - answersToFit.length;
  const randomNumbers = [];
  for (let i = 0; i < remainingCells; i++) {
    randomNumbers.push(String(Math.floor(Math.random() * 999) + 1));
  }
  
  // Combinar e embaralhar tudo
  const allCells = [...answersToFit, ...randomNumbers].sort(() => Math.random() - 0.5);
  
  // Criar matriz da cartela
  const card: string[][] = [];
  for (let r = 0; r < rows; r++) {
    card.push(allCells.slice(r * cols, r * cols + cols));
  }
  
  return card;
}

export function checkWin(
  card: string[][],
  marked: string[], // "r,c" positions
  condition: "line" | "column" | "diagonal" | "full"
): boolean {
  const rows = card.length;
  const cols = card[0]?.length ?? 0;
  const isMarked = (r: number, c: number) => marked.includes(`${r},${c}`);

  if (condition === "full") {
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (!isMarked(r, c)) return false;
    return true;
  }
  if (condition === "line") {
    for (let r = 0; r < rows; r++) {
      let ok = true;
      for (let c = 0; c < cols; c++) if (!isMarked(r, c)) { ok = false; break; }
      if (ok) return true;
    }
  }
  if (condition === "column") {
    for (let c = 0; c < cols; c++) {
      let ok = true;
      for (let r = 0; r < rows; r++) if (!isMarked(r, c)) { ok = false; break; }
      if (ok) return true;
    }
  }
  if (condition === "diagonal") {
    if (rows === cols) {
      let ok = true;
      for (let i = 0; i < rows; i++) if (!isMarked(i, i)) { ok = false; break; }
      if (ok) return true;
      ok = true;
      for (let i = 0; i < rows; i++) if (!isMarked(i, cols - 1 - i)) { ok = false; break; }
      if (ok) return true;
    }
  }
  return false;
}

export const TOPIC_LABELS: Record<Topic, string> = {
  "operacoes": "Operações básicas",
  "expressoes": "Expressões numéricas",
  "naturais": "Números naturais",
  "fracoes": "Frações",
  "fracoes-equiv": "Frações equivalentes",
  "mult-div": "Múltiplos e divisores",
  "racionais": "Números racionais",
  "porcentagem": "Porcentagem",
  "logica": "Raciocínio lógico",
};

export const ALL_TOPICS = Object.keys(TOPIC_LABELS) as Topic[];
