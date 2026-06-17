import { NextResponse } from "next/server";

export function json<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function error(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status });
}

export const unauthorized = () => error("Not authenticated", 401);
export const forbidden = () => error("Forbidden", 403);
export const notFound = (what = "Resource") => error(`${what} not found`, 404);
export const tooMany = () => error("Too many requests", 429);
