export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...headers
    }
  });
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    const error = new Error("올바른 JSON 요청이 아닙니다.");
    error.status = 400;
    throw error;
  }
}

export function handleError(error) {
  console.error(error);
  return json(
    { error: error?.message || "서버 오류가 발생했습니다." },
    Number(error?.status || 500)
  );
}

export function methodNotAllowed() {
  return json({ error: "지원하지 않는 요청 방식입니다." }, 405);
}

export function cleanText(value, maxLength = 100) {
  return String(value ?? "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function getBearerToken(request) {
  const header = request.headers.get("authorization") || "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}
