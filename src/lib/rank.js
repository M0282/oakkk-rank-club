export const TIER_KO = {
  IRON: "아이언", BRONZE: "브론즈", SILVER: "실버", GOLD: "골드",
  PLATINUM: "플래티넘", EMERALD: "에메랄드", DIAMOND: "다이아몬드",
  MASTER: "마스터", GRANDMASTER: "그랜드마스터", CHALLENGER: "챌린저"
};

export const DIVISION_KO = { I: "Ⅰ", II: "Ⅱ", III: "Ⅲ", IV: "Ⅳ" };

export function rankLabel(player) {
  if (!player?.tier) return "언랭크";
  return `${TIER_KO[player.tier] || player.tier} ${
    DIVISION_KO[player.division] || ""
  }`.trim();
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

export function recentRate(player, count = 3) {
  const matches = (player?.recent_matches || []).slice(0, count);
  if (!matches.length) return 0;
  return Math.round(
    (matches.filter((match) => match.win).length / matches.length) * 100
  );
}

export function profileIconUrl(id) {
  return `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/${Number(id || 0)}.jpg`;
}

export function championIconUrl(id) {
  return `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/${Number(id || 0)}.png`;
}
