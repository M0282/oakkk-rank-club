import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const root = resolve(import.meta.dirname, "..");
const [migration, rootSql, packageLock, predictionCode, modalCode, sharedCode] =
  await Promise.all([
    readFile(resolve(root, "supabase/migration_2026_07_complete.sql"), "utf8"),
    readFile(resolve(root, "RUN_THIS_IN_SUPABASE.sql"), "utf8"),
    readFile(resolve(root, "package-lock.json"), "utf8"),
    readFile(resolve(root, "api/predictions.js"), "utf8"),
    readFile(resolve(root, "src/components/PredictionModal.jsx"), "utf8"),
    readFile(resolve(root, "shared/prediction.js"), "utf8")
  ]);

assert(migration === rootSql, "루트 SQL과 supabase 마이그레이션 SQL이 다릅니다.");
assert(!/add\s+column\s+if\s+not\s+exists\s+offset\b/i.test(migration), "예약어 offset 컬럼이 SQL에 남아 있습니다.");
assert(/add\s+column\s+if\s+not\s+exists\s+score_delta\b/i.test(migration), "score_delta 컬럼 추가 SQL이 없습니다.");
assert(/interval\s+'8 hours'/i.test(migration), "8시간 마이그레이션이 없습니다.");
assert(!packageLock.includes("internal.api.openai.org"), "package-lock.json에 내부 레지스트리 주소가 있습니다.");
assert(!packageLock.includes("applied-caas"), "package-lock.json에 내부 레지스트리 주소가 있습니다.");
assert(predictionCode.includes("score_delta: scoreDelta"), "예측 API가 score_delta를 저장하지 않습니다.");
assert(predictionCode.includes("PREDICTION_DURATION_HOURS"), "예측 API가 공통 판정 시간을 사용하지 않습니다.");
assert(modalCode.includes("ALLOWED_SCORE_DELTAS"), "예측 UI가 공통 점수 변동폭 목록을 사용하지 않습니다.");
assert(sharedCode.includes("PREDICTION_DURATION_HOURS = 8"), "예측 판정 시간이 8시간이 아닙니다.");

console.log("정적 일관성 검사 통과");
