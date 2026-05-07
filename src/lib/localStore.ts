// Sistema local de armazenamento em memória para substituir o Supabase
import { Challenge, Topic, Difficulty } from './bingo';

interface Room {
  id: string;
  name: string;
  pin: string;
  status: string;
  rows: number;
  cols: number;
  win_condition: string;
  topics: Topic[];
  difficulty: Difficulty;
  current_challenge: Challenge | null;
  drawn_answers: string[];
  winner_id: string | null;
  created_at: string;
}

interface Player {
  id: string;
  room_id: string;
  nickname: string;
  card: string[][];
  marked: string[];
  has_won: boolean;
  points: number;
  joined_at: string;
}

// Armazenamento em memória
let rooms: Room[] = [];
let players: Player[] = [];

// Geração de PIN único
const genPin = () => Math.floor(100000 + Math.random() * 900000).toString();
const genId = () => crypto.randomUUID();

// Simulação de "real-time" com listeners
const listeners = new Map<string, Set<() => void>>();

const emitChange = (table: string) => {
  const tableListeners = listeners.get(table);
  if (tableListeners) {
    tableListeners.forEach(callback => callback());
  }
  
  // Também dispara um evento customizado para sincronização entre abas
  window.dispatchEvent(new CustomEvent('dataChanged', { detail: { table } }));
  
  // Dispara evento específico para atualizações em tempo real
  window.dispatchEvent(new CustomEvent('playerJoined', { detail: { table } }));
  window.dispatchEvent(new CustomEvent('playerLeft', { detail: { table } }));
};

// Persistir dados no localStorage
const saveRooms = () => {
  try {
    localStorage.setItem('bingo_rooms', JSON.stringify(rooms));
  } catch (err) {
    console.warn('Failed to save rooms to localStorage:', err);
  }
};

const savePlayers = () => {
  try {
    localStorage.setItem('bingo_players', JSON.stringify(players));
  } catch (err) {
    console.warn('Failed to save players to localStorage:', err);
  }
};

// Carregar dados do localStorage na inicialização
try {
  const savedRooms = localStorage.getItem('bingo_rooms');
  if (savedRooms) rooms = JSON.parse(savedRooms);
  const savedPlayers = localStorage.getItem('bingo_players');
  if (savedPlayers) players = JSON.parse(savedPlayers);
} catch (err) {
  console.warn('Failed to load data from localStorage:', err);
}

// API local que simula o Supabase
export const localStore = {
  // Rooms
  rooms: {
    select: async (query?: string) => {
      if (query?.includes('eq')) {
        // Simular consulta específica (ex: .eq("id", roomId))
        const matches = query.match(/eq\("([^"]+)",\s*"([^"]+)"\)/);
        if (matches) {
          const [, field, value] = matches;
          return { data: rooms.filter(r => (r as any)[field] === value) };
        }
      }
      return { data: [...rooms] };
    },
    
    insert: async (data: Partial<Room>) => {
      const newRoom: Room = {
        id: genId(),
        name: data.name || '',
        pin: genPin(),
        status: 'waiting',
        rows: data.rows || 5,
        cols: data.cols || 5,
        win_condition: data.win_condition || 'line',
        topics: data.topics || [],
        difficulty: data.difficulty || 'medio',
        current_challenge: null,
        drawn_answers: [],
        winner_id: null,
        created_at: new Date().toISOString(),
        ...data
      };
      
      rooms.push(newRoom);
      saveRooms();
      emitChange('rooms');
      return { data: newRoom };
    },
    
    update: async (query: string, data: Partial<Room>) => {
      const matches = query.match(/eq\("id",\s*"([^"]+)"\)/);
      if (matches) {
        const roomId = matches[1];
        const index = rooms.findIndex(r => r.id === roomId);
        if (index !== -1) {
          rooms[index] = { ...rooms[index], ...data };
          saveRooms();
          emitChange('rooms');
          return { data: rooms[index] };
        }
      }
      return { data: null };
    },
    
    delete: async (query: string) => {
      const matches = query.match(/eq\("id",\s*"([^"]+)"\)/);
      if (matches) {
        const roomId = matches[1];
        rooms = rooms.filter(r => r.id !== roomId);
        players = players.filter(p => p.room_id !== roomId);
        saveRooms();
        savePlayers();
        emitChange('rooms');
        emitChange('players');
      }
    }
  },

  // Players
  players: {
    select: async (query?: string) => {
      if (query?.includes('eq')) {
        // Simular consulta específica (ex: .eq("id", playerId))
        const matches = query.match(/eq\("([^"]+)",\s*"([^"]+)"\)/);
        if (matches) {
          const [, field, value] = matches;
          return { data: players.filter(p => (p as any)[field] === value) };
        }
      }
      return { data: [...players] };
    },
    
    insert: async (data: Partial<Player>) => {
      const newPlayer: Player = {
        id: data.id || genId(),
        room_id: data.room_id || '',
        nickname: data.nickname || '',
        card: data.card || [],
        marked: [],
        has_won: false,
        points: 0,
        joined_at: new Date().toISOString(),
        ...data
      };
      
      players.push(newPlayer);
      savePlayers();
      emitChange('players');
      return { data: newPlayer };
    },
    
    update: async (query: string, data: Partial<Player>) => {
      const matches = query.match(/eq\("id",\s*"([^"]+)"\)/);
      if (matches) {
        const playerId = matches[1];
        const index = players.findIndex(p => p.id === playerId);
        if (index !== -1) {
          players[index] = { ...players[index], ...data };
          savePlayers();
          emitChange('players');
          return { data: players[index] };
        }
      }
      return { data: null };
    },
    
    delete: async (query: string) => {
      const matches = query.match(/eq\("id",\s*"([^"]+)"\)/);
      if (matches) {
        const playerId = matches[1];
        players = players.filter(p => p.id !== playerId);
        savePlayers();
        emitChange('players');
      }
    }
  },

  // Simulação de realtime
  channel: (name: string) => ({
    on: (event: string, filter: any, callback: () => void) => {
      const tableName = filter?.table;
      if (!listeners.has(tableName)) {
        listeners.set(tableName, new Set());
      }
      listeners.get(tableName)!.add(callback);
      return this;
    },
    subscribe: () => ({ unsubscribe: () => {} })
  }),

  removeChannel: () => {}
};

// Função utilitária para limpar dados (opcional)
export const clearLocalData = () => {
  rooms = [];
  players = [];
  listeners.clear();
  localStorage.removeItem('bingo_rooms');
  localStorage.removeItem('bingo_players');
};
