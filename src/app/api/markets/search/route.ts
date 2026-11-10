import type { NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { searchAssets } from "@/lib/market";

export async function GET(request: NextRequest) {
  if (!(await getUser())) return Response.json({ error: "Sign in first." }, { status: 401 });
  const query = (request.nextUrl.searchParams.get("q") ?? "").trim();
  if (!query) return Response.json({ hits: [], source: "live" });
  const { data, source } = await searchAssets(query);
  return Response.json({ hits: data, source }, { headers: { "Cache-Control": "private, max-age=300" } });
}
