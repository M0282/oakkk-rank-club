export const TIER_BASE = {
  IRON: 0, BRONZE: 400, SILVER: 800, GOLD: 1200,
  PLATINUM: 1600, EMERALD: 2000, DIAMOND: 2400,
  MASTER: 2800, GRANDMASTER: 2800, CHALLENGER: 2800
};

export const DIVISION_OFFSET = { IV: 0, III: 100, II: 200, I: 300 };

export function rankScore(entry) {
  if (!entry) return null;
  const base = TIER_BASE[entry.tier] ?? 0;
  if (["MASTER", "GRANDMASTER", "CHALLENGER"].includes(entry.tier)) {
    return base + Number(entry.leaguePoints || 0);
  }
  return base + (DIVISION_OFFSET[entry.rank] ?? 0) +
    Number(entry.leaguePoints || 0);
}

export function scoreToRankLabel(score) {
  const value = Math.max(0, Number(score || 0));
  const tiers = [
    ["아이언", 0], ["브론즈", 400], ["실버", 800], ["골드", 1200],
    ["플래티넘", 1600], ["에메랄드", 2000], ["다이아몬드", 2400]
  ];
  if (value >= 2800) return `마스터+ ${value - 2800} LP`;

  let tier = tiers[0];
  for (const item of tiers) if (value >= item[1]) tier = item;
  const within = value - tier[1];
  const divisions = ["Ⅳ", "Ⅲ", "Ⅱ", "Ⅰ"];
  return `${tier[0]} ${divisions[Math.min(3, Math.floor(within / 100))]} ${within % 100} LP`;
}

export function streaks(matches) {
  if (!Array.isArray(matches) || !matches.length) {
    return { wins: 0, losses: 0 };
  }
  const firstResult = Boolean(matches[0].win);
  let count = 0;
  for (const match of matches) {
    if (Boolean(match.win) !== firstResult) break;
    count += 1;
  }
  return firstResult ? { wins: count, losses: 0 } : { wins: 0, losses: count };
}
