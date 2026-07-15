export const ALLOWED_SCORE_DELTAS = [-60, -40, -20, 0, 20, 40, 60];
export const PREDICTION_DURATION_HOURS = 8;

const REWARD_BY_DISTANCE = new Map([
  [0, 5],
  [20, 10],
  [40, 15],
  [60, 20]
]);

export function predictionReward(scoreDelta) {
  return REWARD_BY_DISTANCE.get(Math.abs(Number(scoreDelta))) ?? 0;
}
