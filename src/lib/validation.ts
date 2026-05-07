// Lista de palavras bloqueadas (palavrões, conteúdo sexual)
const BLOCKED_WORDS = [
  // Palavrões comuns em português
  "puta", "putaria", "putaria", "buceta", "cu", "cú", "piranha", "vadia", "cadela", 
  "desgraçada", "desgraçado", "filha de puta", "filho da puta", "merda", "bosta",
  "anus", "penis", "pênis", "vagina", "teta", "mama", "moca", "moça",
  
  // Conteúdo sexual
  "sex", "porn", "porno", "xxx", "sexo", "sêxo", "mamada", "chupada", "chupa",
  "transa", "foda", "fode", "fodem", "transada", "transado",
  
  // Variações comuns
  "p1ta", "p*ta", "p@ta", "cu", "c*", "c@", "m3rda", "m*rda",
  "p0rn", "p*rn", "xxx", "x3x",
  
  // Outros ofensivos
  "nazista", "racista", "pedófilo", "pedofilo", "estuprador",
];

// Verificar se a palavra é ofensiva
export function hasBlockedWords(text: string): boolean {
  const normalized = text.toLowerCase().trim();
  
  for (const word of BLOCKED_WORDS) {
    if (normalized.includes(word)) {
      return true;
    }
  }
  
  return false;
}

// Validar apelido
export function validateNickname(nickname: string): { valid: boolean; error?: string } {
  if (!nickname || !nickname.trim()) {
    return { valid: false, error: "Apelido não pode estar vazio" };
  }
  
  if (nickname.trim().length < 2) {
    return { valid: false, error: "Apelido deve ter pelo menos 2 caracteres" };
  }
  
  if (nickname.trim().length > 20) {
    return { valid: false, error: "Apelido não pode ter mais de 20 caracteres" };
  }
  
  if (hasBlockedWords(nickname)) {
    return { valid: false, error: "Apelido contém conteúdo impróprio 🚫" };
  }
  
  return { valid: true };
}
