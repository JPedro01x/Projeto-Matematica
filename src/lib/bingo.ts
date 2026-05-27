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
const shuffle = <T,>(items: T[], random: () => number = Math.random): T[] => {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

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

function parseAnswerValue(answer: string): number | string {
  const normalized = answer.replace(/−/g, "-").replace(/,/g, ".").trim();
  const integerMatch = normalized.match(/^(-?\d+)(?:\.\d+)?$/);
  if (integerMatch) return parseFloat(normalized);

  const fractionMatch = normalized.match(/^(-?\d+)[\\/](\d+)$/);
  if (fractionMatch) {
    const numerator = Number(fractionMatch[1]);
    const denominator = Number(fractionMatch[2]);
    return denominator === 0 ? normalized : numerator / denominator;
  }

  return normalized;
}

function compareAnswers(a: string, b: string): number {
  const va = parseAnswerValue(a);
  const vb = parseAnswerValue(b);
  const aIsNumber = typeof va === "number";
  const bIsNumber = typeof vb === "number";

  if (aIsNumber && bIsNumber) return va - vb;
  if (aIsNumber) return -1;
  if (bIsNumber) return 1;
  return String(va).localeCompare(String(vb), "pt-BR", { numeric: true, sensitivity: "base" });
}

function distributeAnswersByColumns(rows: number, cols: number, cells: string[]): string[][] {
  const sorted = [...cells].sort(compareAnswers);
  const columns: string[][] = Array.from({ length: cols }, () => []);

  for (let i = 0; i < sorted.length; i++) {
    const col = Math.floor(i / rows);
    columns[col]?.push(sorted[i]);
  }

  const card: string[][] = Array.from({ length: rows }, () => Array(cols).fill(""));
  for (let c = 0; c < cols; c++) {
    const columnValues = [...(columns[c] || [])].sort((a, b) => {
      const numA = parseFloat(a);
      const numB = parseFloat(b);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b);
    });
    for (let r = 0; r < rows; r++) {
      card[r][c] = columnValues[r] ?? "";
    }
  }

  return card;
}

export function generateCard(rows: number, cols: number, topics: Topic[], diff: Difficulty): string[][] {
  const pool = buildAnswerPool(topics, diff, rows * cols * 3);
  const selected = pool.sort(() => Math.random() - 0.5).slice(0, rows * cols);
  return distributeAnswersByColumns(rows, cols, selected);
}

// Gerar cartela com respostas específicas dos desafios
export function generateCardForChallenges(
  rows: number,
  cols: number,
  answers: string[],
  random: () => number = Math.random
): string[][] {
  const totalCells = rows * cols;
  const hasFreeSpace = rows === 5 && cols === 5;
  const playableCells = Math.max(0, totalCells - (hasFreeSpace ? 1 : 0));
  const uniqueAnswers = Array.from(new Set(answers)).filter(answer => answer !== "FREE");
  const selectedAnswers = shuffle(uniqueAnswers, random).slice(0, playableCells);
  const cells = [...selectedAnswers];
  const usedValues = new Set(cells);
  let fallbackValue = 1;

  while (cells.length < playableCells) {
    let randomValue = String(Math.floor(random() * 999) + 1);

    if (usedValues.has(randomValue)) {
      while (usedValues.has(String(fallbackValue))) fallbackValue++;
      randomValue = String(fallbackValue++);
    }

    if (!usedValues.has(randomValue)) {
      cells.push(randomValue);
      usedValues.add(randomValue);
    }
  }

  const shuffledCells = shuffle(cells, random);
  const card: string[][] = Array.from({ length: rows }, () => Array(cols).fill(""));
  let cellIndex = 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (hasFreeSpace && r === 2 && c === 2) {
        card[r][c] = "FREE";
      } else {
        card[r][c] = shuffledCells[cellIndex++] ?? "";
      }
    }
  }

  return card;
}

// Gerar conjunto de desafios com respostas únicas para o jogo
export function generateGameChallenges(topics: Topic[], diff: Difficulty, count: number): Challenge[] {
  const challenges: Challenge[] = [];
  const usedAnswers = new Set<string>();
  let attempts = 0;
  const maxAttempts = count * 10; // Limite para evitar loop infinito
  
  while (challenges.length < count && attempts < maxAttempts) {
    const challenge = generateChallenge(topics, diff);
    
    // Garantir respostas únicas
    if (!usedAnswers.has(challenge.answer)) {
      challenges.push(challenge);
      usedAnswers.add(challenge.answer);
    }
    
    attempts++;
  }
  
  // Se não conseguir desafios suficientes únicos, completar com qualquer desafio
  while (challenges.length < count) {
    let answer = String(1000 + challenges.length);
    while (usedAnswers.has(answer)) answer = String(Number(answer) + 1);
    challenges.push({ question: `0 + ${answer}`, answer, topic: "operacoes" });
    usedAnswers.add(answer);
  }
  
  return challenges;
}

// Sortear próximo desafio garantindo que a resposta exista nas cartelas
export function getChallengeCount(
  rows: number,
  cols: number,
  winCondition: "line" | "column" | "diagonal" | "full" | string
): number {
  const freeSpace = rows === 5 && cols === 5 ? 1 : 0;
  const playableCells = Math.max(1, rows * cols - freeSpace);
  return playableCells;
}

export function drawNextChallenge(
  availableChallenges: Challenge[], 
  drawnAnswers: Set<string>
): Challenge | null {
  // Filtrar desafios cujas respostas ainda não foram sorteadas
  const remainingChallenges = availableChallenges.filter(
    challenge => !drawnAnswers.has(challenge.answer)
  );
  
  if (remainingChallenges.length === 0) {
    return null; // Todos os desafios já foram sorteados
  }
  
  // Escolher aleatoriamente um dos desafios restantes
  const randomIndex = Math.floor(Math.random() * remainingChallenges.length);
  return remainingChallenges[randomIndex];
}

export function checkWin(
  card: string[][],
  marked: string[], // "r,c" positions
  condition: "line" | "column" | "diagonal" | "full"
): boolean {
  const rows = card.length;
  const cols = card[0]?.length ?? 0;
  const isMarked = (r: number, c: number) => marked.includes(`${r},${c}`) || card[r][c] === "FREE";

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
    const diagonalLength = Math.min(rows, cols);
    let ok = true;
    for (let i = 0; i < diagonalLength; i++) if (!isMarked(i, i)) { ok = false; break; }
    if (ok) return true;
    ok = true;
    for (let i = 0; i < diagonalLength; i++) if (!isMarked(i, cols - 1 - i)) { ok = false; break; }
    if (ok) return true;
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

// Verifica se todos os jogadores elegíveis já responderam
// Um jogador é elegível se tem a resposta correta na sua cartela
export function allEligiblePlayersResponded(
  players: Array<{ id: string; card: string[][]; marked: string[] }>,
  correctAnswer: string,
  playersResponded: string[]
): boolean {
  // Para cada jogador, verificar se ele é elegível (tem a resposta na cartela)
  for (const player of players) {
    // Verificar se o jogador tem a resposta correta na cartela
    const hasCorrectAnswer = player.card.some(row =>
      row.some(cell => cell === correctAnswer)
    );

    // Se o jogador tem a resposta correta mas ainda não respondeu, não terminamos
    if (hasCorrectAnswer && !playersResponded.includes(player.id)) {
      return false;
    }
  }

  return true;
}

export const ALL_TOPICS = Object.keys(TOPIC_LABELS) as Topic[];
