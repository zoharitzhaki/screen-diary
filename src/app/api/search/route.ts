import { NextRequest } from "next/server";
import { searchMulti } from "@/lib/tmdb";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q) {
    return Response.json({ results: [] });
  }
  try {
    const results = await searchMulti(q);
    return Response.json({ results });
  } catch (err) {
    const message = err instanceof Error ? err.message : "שגיאה לא ידועה";
    return Response.json({ error: message }, { status: 500 });
  }
}
