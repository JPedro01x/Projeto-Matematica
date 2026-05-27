import { describe, expect, it } from "vitest";
import { checkWin, generateCardForChallenges, generateGameChallenges, getChallengeCount } from "@/lib/bingo";

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

describe("getChallengeCount", () => {
  it("uses every playable cell so winning depends on the selected bingo condition", () => {
    expect(getChallengeCount(5, 5, "line")).toBe(24);
    expect(getChallengeCount(5, 5, "column")).toBe(24);
    expect(getChallengeCount(5, 5, "diagonal")).toBe(24);
    expect(getChallengeCount(5, 5, "full")).toBe(24);
    expect(getChallengeCount(4, 4, "full")).toBe(16);
  });
});

describe("checkWin", () => {
  const card = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
  ];

  it("matches only the selected win condition", () => {
    expect(checkWin(card, ["0,0", "0,1", "0,2"], "line")).toBe(true);
    expect(checkWin(card, ["0,0", "1,0", "2,0"], "column")).toBe(true);
    expect(checkWin(card, ["0,0", "1,1", "2,2"], "diagonal")).toBe(true);
    expect(checkWin(card, ["0,0", "0,1", "0,2"], "full")).toBe(false);
  });
});

describe("generateGameChallenges", () => {
  it("keeps challenge answers unique even when fallback challenges are needed", () => {
    const challenges = generateGameChallenges(["fracoes"], "facil", 40);
    const answers = challenges.map(challenge => challenge.answer);

    expect(new Set(answers).size).toBe(answers.length);
  });
});
