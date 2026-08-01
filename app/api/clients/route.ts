export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSupabase, BUCKET } from "@/lib/supabase";
import { ensureClientFolders } from "@/lib/storage";

export async function GET() {
  try {
    const { data, error } = await getSupabase().storage.from(BUCKET).list("", {
      limit: 200,
      offset: 0,
    });

    if (error) return NextResponse.json({ clients: [] });

    // Filtra apenas "pastas" (itens sem extensão que são prefixos de clientId)
    const clients = (data ?? [])
      .filter(item => !item.name.startsWith(".") && item.metadata === null)
      .map(item => item.name);

    return NextResponse.json({ clients });
  } catch {
    return NextResponse.json({ clients: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { clientId } = await req.json();

    if (!clientId || !/^[a-zA-Z0-9_\-]{3,50}$/.test(clientId)) {
      return NextResponse.json({ error: "ID inválido. Use 3-50 caracteres: letras, números, _ ou -" }, { status: 400 });
    }

    // Verifica se já existe checando se há arquivos com esse prefixo
    const { data: existing } = await getSupabase().storage.from(BUCKET).list(clientId, { limit: 1 });
    if (existing && existing.length > 0) {
      return NextResponse.json({ error: "Cliente já cadastrado." }, { status: 409 });
    }

    // Cria um arquivo placeholder para "criar" a pasta do cliente
    const placeholder = new Blob([""], { type: "text/plain" });
    await getSupabase().storage.from(BUCKET).upload(`${clientId}/.init`, placeholder, { upsert: true });

    return NextResponse.json({ clientId }, { status: 201 });
  } catch (err) {
    console.error("[clients POST] erro:", err);
    return NextResponse.json({ error: "Erro ao criar cliente." }, { status: 500 });
  }
}