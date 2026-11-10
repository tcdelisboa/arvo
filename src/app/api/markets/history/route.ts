import type { NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { getHistory } from "@/lib/market";
import { isRange, normaliseSymbol } from "@/lib/market/types";

export async function GET(request: NextRequest) {
  if (!(await getUser())) return Response.json({ error: "Sign in first." }, { status: 401 });
  const symbol = normaliseSymbol(request.nextUrl.searchParams.get("symbol") ?? "");
  const range = request.nextUrl.searchParams.get("range");
  if (!symbol || !isRange(range)) return Response.json({ error: "Unknown symbol or range." }, { status: 400 });
  const { data, source } = await getHistory(symbol, range);
  return Response.json({ points: data, source }, { headers: { "Cache-Control": "private, max-age=300" } });
}
