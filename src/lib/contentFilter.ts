// Sistema de filtro de conteúdo para apelidos
// Bloqueia palavrões, termos sexuais e conteúdo inapropriado

// Lista de palavrões e termos inapropriados em português (incluindo variações)
const BANNED_WORDS = [
  // Palavrões comuns
  'porra', 'caralho', 'merda', 'puta', 'filho da puta', 'desgraça',
  'foda', 'fodase', 'foda-se', 'porcaria', 'bosta', 'cu',
  'buceta', 'caralhos', 'porras', 'merdas', 'putas',
  
  // Termos sexuais explícitos
  'sexo', 'sexual', 'porn', 'porno', 'xvideos', 'xvideo',
  'hentai', 'nsfw', 'nude', 'nudes', 'naked', 'strip',
  'stripper', 'prostituta', 'garota de programa', 'acompanhante',
  
  // Derivações e abreviações
  'prr', 'crlh', 'mrd', 'fdp', 'bct', 'crlh', 'bxta',
  'fck', 'fod*', 'merd*', 'put*', 'caralh*', 'porr*',
  
  // Termos homofóbicos e racistas (também bloqueados)
  'viado', 'veado', 'bicha', 'bichinha', 'gayzão', 'macaco',
  'negro', 'preto', 'racista', 'nazista', 'kkk',
  
  // Conteúdo violento ou inadequado
  'morte', 'matar', 'suicídio', 'suicidio', 'arma', 'faca',
  'revolver', 'pistola', 'droga', 'maconha', 'cocaína',
  'cocaina', 'crack', 'overdose',
  
  // Termos inadequados para ambiente escolar
  'bêbado', 'bebado', 'drogado', 'viciado', 'prostituição',
  'prostituicao', 'orgia', 'orgias', 'sadismo', 'masoquismo',
  
  // Palavras em inglês e internacionais
  'fuck', 'shit', 'bitch', 'asshole', 'dick', 'pussy',
  'cock', 'whore', 'slut', 'bastard', 'cunt', 'tits',
  'boobs', 'sex', 'porn', 'xxx', 'nsfw',
  
  // Números que podem significar conteúdo inadequado
  '69', '420', '666',
  
  // Combinações com números e letras
  'f0d4', 'f0da', 'p0rr4', 'c4r4lh0', 'm3rd4', 'put4',
  'b1ch4', 'bxt4', 'pr0stitut4',
];

// Padrões de caracteres especiais para tentativas de burlar o filtro
const SPECIAL_CHAR_PATTERNS = [
  /\*/g, /\$/g, /@/g, /#/g, /!/g, /%/g, /&/g, /\+/g,
  /0/g, /1/g, /2/g, /3/g, /4/g, /5/g, /6/g, /7/g, /8/g, /9/g
];

// Substituições comuns para tentar burlar filtros
const LEET_REPLACEMENTS: Record<string, string[]> = {
  'a': ['4', '@'],
  'e': ['3', '€'],
  'i': ['1', '!'],
  'o': ['0'],
  's': ['5', '$'],
  't': ['7'],
  'c': ['k'],
  'u': ['v'],
  'h': ['#'],
};

/**
 * Normaliza uma string removendo caracteres especiais e números
 * para detectar tentativas de burlar o filtro
 */
function normalizeText(text: string): string {
  let normalized = text.toLowerCase();
  
  // Remover espaços e caracteres especiais
  normalized = normalized.replace(/[^a-z0-9]/g, '');
  
  // Substituir números por letras correspondentes (leet speak)
  Object.entries(LEET_REPLACEMENTS).forEach(([letter, replacements]) => {
    replacements.forEach(replacement => {
      normalized = normalized.replace(new RegExp(replacement, 'g'), letter);
    });
  });
  
  return normalized;
}

/**
 * Verifica se um texto contém palavras proibidas
 */
export function containsInappropriateContent(text: string): {
  isInappropriate: boolean;
  reason?: string;
  detectedWord?: string;
} {
  const normalized = normalizeText(text);
  const originalLower = text.toLowerCase();
  
  // Verificar palavras exatas na lista
  for (const bannedWord of BANNED_WORDS) {
    const bannedNormalized = normalizeText(bannedWord);
    
    if (normalized.includes(bannedNormalized) || originalLower.includes(bannedWord.toLowerCase())) {
      return {
        isInappropriate: true,
        reason: 'Conteúdo inapropriado detectado',
        detectedWord: bannedWord
      };
    }
  }
  
  // Verificar combinações suspeitas de números
  const hasInappropriateNumbers = /\b(69|420|666|1234)\b/.test(text);
  if (hasInappropriateNumbers) {
    return {
      isInappropriate: true,
      reason: 'Números inapropriados detectados',
      detectedWord: 'números inadequados'
    };
  }
  
  // Verificar sequências de caracteres suspeitas
  const hasSuspiciousPattern = /[xX]{3,}|[aA]{4,}|[sS]{3,}/.test(text);
  if (hasSuspiciousPattern) {
    return {
      isInappropriate: true,
      reason: 'Padrão de caracteres suspeito',
      detectedWord: 'padrão suspeito'
    };
  }
  
  return { isInappropriate: false };
}

/**
 * Valida um apelido completo (comprimento + conteúdo)
 */
export function validateNicknameContent(nickname: string): {
  isValid: boolean;
  error?: string;
  suggestion?: string;
} {
  // Verificar comprimento mínimo e máximo
  if (nickname.length < 2) {
    return {
      isValid: false,
      error: 'Apelido muito curto (mínimo 2 caracteres)',
      suggestion: 'Jogador' + Math.floor(Math.random() * 999)
    };
  }
  
  if (nickname.length > 20) {
    return {
      isValid: false,
      error: 'Apelido muito longo (máximo 20 caracteres)'
    };
  }
  
  // Verificar conteúdo inapropriado
  const contentCheck = containsInappropriateContent(nickname);
  if (contentCheck.isInappropriate) {
    const suggestions = [
      'Jogador' + Math.floor(Math.random() * 999),
      'Player' + Math.floor(Math.random() * 99),
      'Gamer' + Math.floor(Math.random() * 999),
      'User' + Math.floor(Math.random() * 9999)
    ];
    
    return {
      isValid: false,
      error: 'Apelido contém conteúdo inadequado. Escolha um nome apropriado para o ambiente escolar.',
      suggestion: suggestions[Math.floor(Math.random() * suggestions.length)]
    };
  }
  
  // Verificar se é apenas números ou caracteres especiais
  const isOnlyNumbersOrSpecial = /^[0-9\s\-_]+$/.test(nickname);
  if (isOnlyNumbersOrSpecial) {
    return {
      isValid: false,
      error: 'Apelido deve conter letras',
      suggestion: 'Player' + Math.floor(Math.random() * 999)
    };
  }
  
  return { isValid: true };
}

/**
 * Gera sugestões de apelidos seguros e apropriados
 */
export function generateSafeNicknameSuggestions(base?: string): string[] {
  const prefixes = base ? [base] : ['Jogador', 'Player', 'Gamer', 'User', 'Aluno', 'Estudante'];
  const suffixes = ['Pro', 'Master', 'Star', 'Legend', 'Champion', 'Hero'];
  const numbers = [Math.floor(Math.random() * 999), Math.floor(Math.random() * 99), Math.floor(Math.random() * 9999)];
  
  const suggestions: string[] = [];
  
  prefixes.forEach(prefix => {
    suggestions.push(`${prefix}${numbers[0]}`);
    suggestions.push(`${prefix}_${numbers[1]}`);
    suffixes.forEach(suffix => {
      suggestions.push(`${prefix}${suffix}`);
      suggestions.push(`${prefix}_${suffix}`);
    });
  });
  
  // Remover duplicados e limitar a 10 sugestões
  return [...new Set(suggestions)].slice(0, 10);
}
