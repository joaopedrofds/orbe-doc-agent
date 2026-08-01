export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSupabase, BUCKET } from "@/lib/supabase";
import { CATEGORIAS } from "@/lib/storage";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId") ?? "todos";
    const categoria = searchParams.get("categoria") ?? "";
    const search = searchParams.get("search") ?? "";

    if (clientId !== "todos" && !/^[a-zA-Z0-9_\-]{3,50}$/.test(clientId)) {
      return NextResponse.json({ error: "ID inválido." }, { status: 400 });
    }

    // Lista clientes a processar
    let clientIds: string[] = [];
    if (clientId === "todos") {
      const { data } = await getSupabase().storage.from(BUCKET).list("", { limit: 200 });
      clientIds = (data ?? [])
        .filter(i => !i.name.startsWith(".") && i.metadata === null)
        .map(i => i.name);
    } else {
      clientIds = [clientId];
    }

    const documents: Array<{
      filename: string;
      categoria: string;
      caminho: string;
      modifiedAt: string;
      clientId: string;
      resumo: string | null;
    }> = [];

    const cats = categoria ? [categoria] : CATEGORIAS;

    for (const cid of clientIds) {
      for (const cat of cats) {
        const { data: files } = await getSupabase().storage
          .from(BUCKET)
          .list(`${cid}/${cat}`, { limit: 500 });

        if (!files) continue;

        const realFiles = files.filter(
          f => !f.name.startsWith(".") && !f.name.endsWith(".meta.json")
        );

        for (const file of realFiles) {
          if (search && !file.name.toLowerCase().includes(search.toLowerCase())) continue;

          // Tenta ler metadados
          let resumo: string | null = null;
          const { data: metaBlob } = await getSupabase().storage
            .from(BUCKET)
            .download(`${cid}/${cat}/${file.name}.meta.json`);

          if (metaBlob) {
            try {
              const meta = JSON.parse(await metaBlob.text());
              resumo = meta.resumo ?? null;
            } catch { /* sem meta */ }
          }

          documents.push({
            filename: file.name,
            categoria: cat,
            caminho: `${cid}/${cat}/${file.name}`,
            modifiedAt: file.updated_at ?? file.created_at ?? new Date().toISOString(),
            clientId: cid,
            resumo,
          });
        }
      }
    }

    return NextResponse.json({ documents });
  } catch (err) {
    console.error("[documents] erro:", err);
    return NextResponse.json({ documents: [] });
  }
}