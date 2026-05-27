// Utilitários para validação e sugestão de apelidos

export function generateNicknameSuggestions(baseNickname: string): string[] {
  const randomNum = Math.floor(Math.random() * 999);
  const randomNum2 = Math.floor(Math.random() * 99);
  
  return [
    `${baseNickname}_${randomNum}`,
    `${baseNickname}${randomNum2}`,
    `${baseNickname}_o2`,
    `${baseNickname}_pro`,
    `${baseNickname}_player`,
    `${baseNickname}_${randomNum.toString().padStart(3, '0')}`,
    `${baseNickname}_2024`,
    `${baseNickname}_master`
  ];
}

export function getRandomNicknameSuggestion(baseNickname: string): string {
  const suggestions = generateNicknameSuggestions(baseNickname);
  return suggestions[Math.floor(Math.random() * suggestions.length)];
}

export function normalizeNickname(nickname: string): string {
  return nickname.trim().toLowerCase();
}

export function nicknameToId(nickname: string): string {
  const normalized = normalizeNickname(nickname)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "jogador";
}

export function isNicknameTaken(
  nickname: string, 
  existingPlayers: Array<{ nickname: string }>
): boolean {
  const normalized = normalizeNickname(nickname);
  return existingPlayers.some(player => 
    normalizeNickname(player.nickname) === normalized
  );
}

export async function checkNicknameAvailability(
  roomId: string,
  nickname: string,
  localStore: any
): Promise<{ isAvailable: boolean; suggestion?: string }> {
  try {
    const { data: existingPlayers } = await localStore.players.select(`eq("room_id", "${roomId}")`);
    
    const players = existingPlayers || [];
    const taken = isNicknameTaken(nickname, players);
    const idTaken = players.some((player: { id: string }) => player.id === nicknameToId(nickname));
    
    if (taken || idTaken) {
      return {
        isAvailable: false,
        suggestion: getRandomNicknameSuggestion(nickname)
      };
    }
    
    return { isAvailable: true };
  } catch (error) {
    console.error('Erro ao verificar disponibilidade do apelido:', error);
    return { isAvailable: true }; // Em caso de erro, permitir
  }
}
