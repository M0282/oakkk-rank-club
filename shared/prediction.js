export const ALLOWED_PREDICTION_OFFSETS = [-60, -40, -20, 0, 20, 40, 60];

export function predictionReward(direction, offset) {
  const difficultDistance = direction === "over" ? offset : -offset;
  if (difficultDistance >= 60) return 20;
  if (difficultDistance >= 40) return 15;
  if (difficultDistance >= 20) return 10;
  return 5;
}
