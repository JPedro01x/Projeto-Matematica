// Sistema de validação de apelidos para bloquear conteúdo inadequado

// Lista de palavras e termos bloqueados
const BLOCKED_WORDS = [
  // Palavrões em português
  'porra', 'caralho', 'merda', 'puta', 'filho da puta', 'desgraça', 'foda', 'fodase',
  'cu', 'buceta', 'pica', 'pinto', 'rola', 'bicha', 'viado', 'gay', 'boiola',
  'vagabundo', 'vadia', 'piranha', 'prostituta', 'traveco', 'travesti',
  
  // Termos sexuais explícitos
  'sexo', 'pornografia', 'porno', 'nude', 'naked', 'sex', 'fuck', 'shit',
  'dick', 'pussy', 'ass', 'boobs', 'tits', 'anal', 'oral', 'masturba',
  
  // Termos de ódio e discriminatórios
  'racista', 'nazista', 'kkk', 'hitler', 'preto', 'negro', 'macaco',
  'judeu', 'judaico', 'muçulmano', 'árabe', 'imigrante', 'refugiado',
  
  // Drogas
  'maconha', 'cocaína', 'crack', 'heroína', 'droga', 'fumar', 'cheirar',
  
  // Violência
  'matar', 'morte', 'suicídio', 'bomba', 'arma', 'fogo', 'queimar',
  
  // Termos vulgares em inglês
  'bitch', 'bastard', 'asshole', 'motherfucker', 'whore', 'slut',
  'cock', 'dickhead', 'piss', 'crap', 'damn', 'hell',
  
  // Variações e abreviações
  'p0rra', 'car4lh0', 'm3rd4', 'put@', 'f0da', 'cuzão', 'bich@',
  'v1ad0', 'pir4nh@', 'tr4v3c0', 'n4z1', 'kkl', 'h1tl3r'
];

// Função para normalizar texto (remover acentos e converter para minúsculas)
const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[0-9]/g, '') // Remove números
    .replace(/[@#$%&*]/g, ''); // Remove caracteres especiais
};

// Verificar se o apelido contém palavras bloqueadas
export const containsInappropriateContent = (nickname: string): boolean => {
  const normalized = normalizeText(nickname);
  
  // Verificar palavras exatas
  for (const word of BLOCKED_WORDS) {
    if (normalized.includes(word)) {
      return true;
    }
  }
  
  // Verificar padrões suspeitos
  const suspiciousPatterns = [
    /\d{3,}/, // Muitos números seguidos
    /^[a-z]{1,2}\d+$/, // Padrão tipo "xx123"
    /\b\d+[a-z]+\d*\b/i, // Números misturados com letras
    /\b[a-z]+\d+[a-z]+\b/i, // Letras-números-letras
    /\b.{1,2}\d{2,}\b/i, // Poucas letras com muitos números
  ];
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(normalized)) {
      return true;
    }
  }
  
  return false;
};

// Gerar ID único baseado no apelido
export const generatePlayerId = (nickname: string): string => {
  // Remover espaços e caracteres especiais, converter para minúsculas
  const clean = nickname
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 8); // Limitar a 8 caracteres
  
  // Adicionar timestamp e random para garantir unicidade
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 5);
  
  return `${clean}_${timestamp}_${random}`;
};

// Validar apelido completo
export const validateNickname = (nickname: string): { valid: boolean; error?: string } => {
  if (!nickname || nickname.trim().length === 0) {
    return { valid: false, error: "Apelido é obrigatório" };
  }
  
  if (nickname.trim().length < 2) {
    return { valid: false, error: "Apelido deve ter pelo menos 2 caracteres" };
  }
  
  if (nickname.trim().length > 20) {
    return { valid: false, error: "Apelido deve ter no máximo 20 caracteres" };
  }
  
  if (containsInappropriateContent(nickname)) {
    return { valid: false, error: "Apelido contém conteúdo inadequado" };
  }
  
  if (!/^[a-zA-Z0-9\sáéíóúâêîôûãõçÁÉÍÓÚÂÊÎÔÛÃÕÇ-]+$/.test(nickname)) {
    return { valid: false, error: "Apelido contém caracteres inválidos" };
  }
  
  return { valid: true };
};
