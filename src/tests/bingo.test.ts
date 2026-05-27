import { describe, expect, it } from "vitest";
import { generateCardForChallenges } from "@/lib/bingo";

const makeRandom = (seed: number) => {
  let state = seed;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
};

describe("generateCardForChallenges", () => {
  it("keeps all challenge answers when adding the free center", () => {
    const answers = Array.from({ length: 10 }, (_, i) => String(i + 1));
    const card = generateCardForChallenges(5, 5, answers, makeRandom(7));
    const flatCard = card.flat();

    expect(card[2][2]).toBe("FREE");
    answers.forEach(answer => expect(flatCard).toContain(answer));
  });

  it("creates different layouts for different players", () => {
    const answers = Array.from({ length: 10 }, (_, i) => String(i + 1));
    const firstCard = generateCardForChallenges(5, 5, answers, makeRandom(11));
    const secondCard = generateCardForChallenges(5, 5, answers, makeRandom(29));

    expect(JSON.stringify(firstCard)).not.toEqual(JSON.stringify(secondCard));
  });
});
