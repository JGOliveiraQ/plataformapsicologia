import crypto from "node:crypto";
import { cookies } from "next/headers";

const AUTH_COOKIE = "psi_auth";

function envOrThrow(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variável de ambiente obrigatória ausente: ${name}`);
  }
  return value;
}

function buildToken(password: string) {
  const secret = envOrThrow("AUTH_COOKIE_SECRET");
  return crypto.createHmac("sha256", secret).update(password).digest("hex");
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) {
    return false;
  }
  return crypto.timingSafeEqual(left, right);
}

export function validatePassword(password: string) {
  const expected = envOrThrow("AUTH_PASSWORD");
  return safeEqual(password, expected);
}

export async function signIn() {
  const password = envOrThrow("AUTH_PASSWORD");
  const token = buildToken(password);
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
}

export async function signOut() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE);
}

export async function isAuthenticated() {
  const password = process.env.AUTH_PASSWORD;
  const secret = process.env.AUTH_COOKIE_SECRET;
  if (!password || !secret) {
    return false;
  }

  const expectedToken = buildToken(password);
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;
  if (!token) {
    return false;
  }
  return safeEqual(token, expectedToken);
}
