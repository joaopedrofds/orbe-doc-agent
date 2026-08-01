export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSupabase, BUCKET } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");

  if (!clientId || !/^[a-zA-Z0-9_\-]{3,50}$/.test(clientId)) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  }

  const { data } = await getSupabase().storage
    .from(BUCKET)
    .download(`${clientId}/README.md`);

  if (!data) {
    return NextResponse.json({ content: null, message: "Nenhum documento processado para este cliente ainda." });
  }

  const content = await data.text();
  return NextResponse.json({ content });
}