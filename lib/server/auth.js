import crypto from "node:crypto";
import { getSupabase } from "./supabase.js";
import { getBearerToken } from "./http.js";

const TOKEN_DAYS = 30;

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) {
    const error = new Error(
      "SESSION_SECRET은 32자 이상의 임의 문자열로 설정해야 합니다."
    );
    error.status = 503;
    throw error;
  }
  return value;
}

function sign(value) {
  return crypto
    .createHmac("sha256", secret())
    .update(value)
    .digest("base64url");
}

export function hashPin(pin) {
  const normalized = String(pin || "");
  if (normalized.length < 4 || normalized.length > 20) {
    const error = new Error("PIN은 4~20자로 입력해 주세요.");
    error.status = 400;
    throw error;
  }

  const salt = crypto.randomBytes(16).toString("hex");
  const digest = crypto.scryptSync(normalized, salt, 64).toString("hex");
  return `${salt}:${digest}`;
}

export function verifyPin(pin, stored) {
  try {
    const [salt, expectedHex] = String(stored).split(":");
    const actual = crypto.scryptSync(String(pin), salt, 64);
    const expected = Buffer.from(expectedHex, "hex");
    return actual.length === expected.length &&
      crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function createSession(user) {
  const payload = {
    sub: user.id,
    nickname: user.nickname,
    exp: Date.now() + TOKEN_DAYS * 24 * 60 * 60 * 1000
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function verifySessionToken(token) {
  try {
    const [encoded, signature] = String(token).split(".");
    if (!encoded || !signature) return null;

    const expected = sign(encoded);
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8")
    );
    if (!payload.sub || Number(payload.exp) < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function optionalUser(request) {
  const token = getBearerToken(request);
  const payload = token ? verifySessionToken(token) : null;
  if (!payload) return null;

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("users")
    .select("id,nickname,oakkk,created_at")
    .eq("id", payload.sub)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

export async function requireUser(request) {
  const user = await optionalUser(request);
  if (!user) {
    const error = new Error("로그인이 필요한 기능입니다.");
    error.status = 401;
    throw error;
  }
  return user;
}

export function requireAdmin(request) {
  const expected = process.env.ADMIN_PASSWORD;
  const supplied = request.headers.get("x-admin-password") || "";

  if (!expected) {
    const error = new Error("ADMIN_PASSWORD가 설정되지 않았습니다.");
    error.status = 503;
    throw error;
  }

  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  const valid = a.length === b.length && crypto.timingSafeEqual(a, b);

  if (!valid) {
    const error = new Error("관리자 비밀번호가 올바르지 않습니다.");
    error.status = 403;
    throw error;
  }
}
