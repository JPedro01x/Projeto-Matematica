import { Challenge, drawNextChallenge } from "./bingo";

interface GameRoomState {
  id: string;
  status: string;
  current_challenge: Challenge | null;
  game_challenges?: Challenge[];
  drawn_answers: string[];
  challenge_ended?: boolean;
}

type StoreLike = any;

export async function advanceToNextChallenge(localStore: StoreLike, roomId: string) {
  const { data } = await localStore.rooms.select(`eq("id", "${roomId}")`);
  const room = data?.[0];

  if (!room || room.status !== "playing") return "blocked";

  const nextChallenge = drawNextChallenge(room.game_challenges || [], new Set(room.drawn_answers || []));

  if (!nextChallenge) {
    await localStore.rooms.update(`eq("id", "${roomId}")`, {
      challenge_ended: true,
      timer_paused: true,
    });
    return "exhausted";
  }

  await localStore.rooms.update(`eq("id", "${roomId}")`, {
    current_challenge: nextChallenge as any,
    drawn_answers: [...(room.drawn_answers || []), nextChallenge.answer],
    challenge_ended: false,
    first_correct_player: null,
    players_responded: [],
    timer_paused: false,
  });

  return "advanced";
}

export async function completeChallengeAndAdvance(localStore: StoreLike, roomId: string, delayMs = 800) {
  const { data } = await localStore.rooms.select(`eq("id", "${roomId}")`);
  const room = data?.[0];

  if (!room || room.status !== "playing" || room.challenge_ended) return "blocked";

  const challengeQuestion = room.current_challenge?.question;
  await localStore.rooms.update(`eq("id", "${roomId}")`, {
    challenge_ended: true,
    timer_paused: true,
  });

  window.setTimeout(async () => {
    const { data: freshData } = await localStore.rooms.select(`eq("id", "${roomId}")`);
    const freshRoom = freshData?.[0];

    if (
      !freshRoom ||
      freshRoom.status !== "playing" ||
      freshRoom.current_challenge?.question !== challengeQuestion
    ) {
      return;
    }

    await advanceToNextChallenge(localStore, roomId);
  }, delayMs);

  return "completed";
}
