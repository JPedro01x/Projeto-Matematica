import { supabase, hasSupabaseConfig } from "@/integrations/supabase/client";
import { Challenge, Topic, Difficulty } from "./bingo";
import { nicknameToId, normalizeNickname } from "./nicknameUtils";

interface Room {
  id: string;
  name: string;
  pin: string;
  owner_nickname: string;
  status: string;
  rows: number;
  cols: number;
  win_condition: string;
  topics: Topic[];
  difficulty: Difficulty;
  current_challenge: Challenge | null;
  game_challenges?: Challenge[];
  drawn_answers: string[];
  winner_id: string | null;
  created_at: string;
  challenge_ended?: boolean;
  first_correct_player?: string | null;
  players_responded?: string[];
  timer_paused?: boolean;
}

interface Player {
  id: string;
  room_id: string;
  nickname: string;
  card: string[][];
  marked: string[];
  has_won: boolean;
  correct_answers_count: number;
  joined_at: string;
}

type TableName = "rooms" | "players";

let rooms: Room[] = [];
let players: Player[] = [];

const genPin = () => Math.floor(100000 + Math.random() * 900000).toString();
const genId = () => crypto.randomUUID();

const parseEq = (query?: string) => {
  const matches = query?.match(/eq\("([^"]+)",\s*"([^"]+)"\)/);
  return matches ? { field: matches[1], value: matches[2] } : null;
};

const listeners = new Map<string, Set<() => void>>();

const emitChange = (table: TableName) => {
  listeners.get(table)?.forEach((callback) => callback());
  window.dispatchEvent(new CustomEvent("dataChanged", { detail: { table } }));

  if (table === "players") {
    window.dispatchEvent(new CustomEvent("playerJoined", { detail: { table } }));
  }

  try {
    localStorage.setItem(`bingo_sync_${table}`, Date.now().toString());
  } catch {
    // Ignore private browsing or storage quota issues.
  }
};

const saveRooms = () => {
  try {
    localStorage.setItem("bingo_rooms", JSON.stringify(rooms));
  } catch (err) {
    console.warn("Failed to save rooms to localStorage:", err);
  }
};

const savePlayers = () => {
  try {
    localStorage.setItem("bingo_players", JSON.stringify(players));
  } catch (err) {
    console.warn("Failed to save players to localStorage:", err);
  }
};

const syncFromLocalStorage = () => {
  try {
    const savedRooms = localStorage.getItem("bingo_rooms");
    rooms = savedRooms ? JSON.parse(savedRooms) : [];
    const savedPlayers = localStorage.getItem("bingo_players");
    players = savedPlayers ? JSON.parse(savedPlayers) : [];
  } catch (err) {
    console.warn("Erro ao sincronizar com localStorage:", err);
  }
};

syncFromLocalStorage();

const remoteEnabled = () => hasSupabaseConfig && !!supabase;

const selectRemote = async <T,>(table: TableName, query?: string) => {
  if (!supabase) return { data: [] as T[], error: null };

  const eq = parseEq(query);
  let request = supabase.from(table).select("*");
  if (eq) request = request.eq(eq.field, eq.value);

  const { data, error } = await request;
  if (error) {
    console.error(`Erro ao buscar ${table}:`, error);
    return { data: [] as T[], error };
  }

  return { data: (data ?? []) as T[], error: null };
};

const updateRemote = async <T,>(table: TableName, query: string, data: Partial<T>) => {
  if (!supabase) return { data: null, error: null };

  const eq = parseEq(query);
  if (!eq) return { data: null, error: new Error("Query invalida") };

  const { data: updated, error } = await supabase
    .from(table)
    .update(data)
    .eq(eq.field, eq.value)
    .select()
    .maybeSingle();

  if (error) console.error(`Erro ao atualizar ${table}:`, error);
  if (!error) emitChange(table);

  return { data: updated as T | null, error };
};

const deleteRemote = async (table: TableName, query: string) => {
  if (!supabase) return { error: null };

  const eq = parseEq(query);
  if (!eq) return { error: new Error("Query invalida") };

  if (table === "rooms" && eq.field === "id") {
    await supabase.from("players").delete().eq("room_id", eq.value);
  }

  const { error } = await supabase.from(table).delete().eq(eq.field, eq.value);
  if (error) console.error(`Erro ao excluir ${table}:`, error);
  if (!error) emitChange(table);

  return { error };
};

export const localStore = {
  rooms: {
    select: async (query?: string) => {
      if (remoteEnabled()) return selectRemote<Room>("rooms", query);

      syncFromLocalStorage();
      const eq = parseEq(query);
      if (eq) return { data: rooms.filter((room) => (room as any)[eq.field] === eq.value) };
      return { data: [...rooms] };
    },

    insert: async (data: Partial<Room>) => {
      const newRoom: Room = {
        id: data.id || genId(),
        name: data.name || "",
        pin: data.pin || genPin(),
        owner_nickname: data.owner_nickname || "",
        status: data.status || "waiting",
        rows: data.rows || 5,
        cols: data.cols || 5,
        win_condition: data.win_condition || "line",
        topics: data.topics || [],
        difficulty: data.difficulty || "medio",
        current_challenge: data.current_challenge || null,
        game_challenges: data.game_challenges || [],
        drawn_answers: data.drawn_answers || [],
        winner_id: data.winner_id || null,
        challenge_ended: data.challenge_ended || false,
        first_correct_player: data.first_correct_player || null,
        players_responded: data.players_responded || [],
        timer_paused: data.timer_paused || false,
        created_at: data.created_at || new Date().toISOString(),
      };

      if (remoteEnabled() && supabase) {
        const { data: inserted, error } = await supabase.from("rooms").insert(newRoom).select().single();
        if (error) {
          console.error("Erro ao criar sala:", error);
          return { data: null, error };
        }
        emitChange("rooms");
        return { data: inserted as Room, error: null };
      }

      rooms.push(newRoom);
      saveRooms();
      emitChange("rooms");
      return { data: newRoom };
    },

    update: async (query: string, data: Partial<Room>) => {
      if (remoteEnabled()) return updateRemote<Room>("rooms", query, data);

      const eq = parseEq(query);
      if (!eq) return { data: null };

      const index = rooms.findIndex((room) => (room as any)[eq.field] === eq.value);
      if (index === -1) return { data: null };

      rooms[index] = { ...rooms[index], ...data };
      saveRooms();
      emitChange("rooms");
      return { data: rooms[index] };
    },

    delete: async (query: string) => {
      if (remoteEnabled()) return deleteRemote("rooms", query);

      const eq = parseEq(query);
      if (!eq) return;

      rooms = rooms.filter((room) => (room as any)[eq.field] !== eq.value);
      if (eq.field === "id") {
        players = players.filter((player) => player.room_id !== eq.value);
      }
      saveRooms();
      savePlayers();
      emitChange("rooms");
      emitChange("players");
    },
  },

  players: {
    select: async (query?: string) => {
      if (remoteEnabled()) return selectRemote<Player>("players", query);

      syncFromLocalStorage();
      const eq = parseEq(query);
      if (eq) return { data: players.filter((player) => (player as any)[eq.field] === eq.value) };
      return { data: [...players] };
    },

    insert: async (data: Partial<Player>) => {
      const nickname = data.nickname?.trim() || "";
      const newPlayer: Player = {
        id: data.id || `${data.room_id}-${nicknameToId(nickname)}`,
        room_id: data.room_id || "",
        nickname,
        card: data.card || [],
        marked: data.marked || [],
        has_won: data.has_won || false,
        correct_answers_count: data.correct_answers_count || 0,
        joined_at: data.joined_at || new Date().toISOString(),
      };

      if (remoteEnabled() && supabase) {
        const { data: roomPlayers } = await selectRemote<Player>(
          "players",
          `eq("room_id", "${newPlayer.room_id}")`
        );
        const nicknameAlreadyUsed = roomPlayers.some(
          (player) =>
            player.id === newPlayer.id ||
            normalizeNickname(player.nickname) === normalizeNickname(newPlayer.nickname)
        );

        if (nicknameAlreadyUsed) return { data: null, error: new Error("Apelido ja esta em uso") };

        const { data: inserted, error } = await supabase.from("players").insert(newPlayer).select().single();
        if (error) {
          console.error("Erro ao criar jogador:", error);
          return { data: null, error };
        }
        emitChange("players");
        return { data: inserted as Player, error: null };
      }

      const nicknameAlreadyUsed = players.some(
        (player) =>
          player.room_id === newPlayer.room_id &&
          (player.id === newPlayer.id ||
            normalizeNickname(player.nickname) === normalizeNickname(newPlayer.nickname))
      );

      if (nicknameAlreadyUsed) return { data: null, error: new Error("Apelido ja esta em uso") };

      players.push(newPlayer);
      savePlayers();
      emitChange("players");
      return { data: newPlayer };
    },

    update: async (query: string, data: Partial<Player>) => {
      if (remoteEnabled()) return updateRemote<Player>("players", query, data);

      const eq = parseEq(query);
      if (!eq) return { data: null };

      const index = players.findIndex((player) => (player as any)[eq.field] === eq.value);
      if (index === -1) return { data: null };

      players[index] = { ...players[index], ...data };
      savePlayers();
      emitChange("players");
      return { data: players[index] };
    },

    delete: async (query: string) => {
      if (remoteEnabled()) return deleteRemote("players", query);

      const eq = parseEq(query);
      if (!eq) return;

      players = players.filter((player) => (player as any)[eq.field] !== eq.value);
      savePlayers();
      emitChange("players");
    },
  },

  channel: (_name: string) => ({
    on: (_event: string, filter: any, callback: () => void) => {
      const tableName = filter?.table;
      if (!listeners.has(tableName)) listeners.set(tableName, new Set());
      listeners.get(tableName)!.add(callback);
      return localStore.channel(_name);
    },
    subscribe: () => ({ unsubscribe: () => {} }),
  }),

  removeChannel: () => {},
};

export const clearLocalData = () => {
  rooms = [];
  players = [];
  listeners.clear();
  localStorage.removeItem("bingo_rooms");
  localStorage.removeItem("bingo_players");
};
