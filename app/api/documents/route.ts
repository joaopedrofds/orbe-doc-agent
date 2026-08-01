export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { UPLOADS_ROOT, CATEGORIAS } from "@/lib/storage";

interface DocumentEntry {
  filename: string;
  categoria: string;
  caminho: string;
  modifiedAt: string;
  clientId: string;
  resumo: string | null;
}

const CLIENT_ID_RE = /^[a-zA-Z0-9_\-]{3,50}$/;

export async function GET(req: NextRequest) {
  try {
    const clientIdParam = req.nextUrl.searchParams.get("clientId")?.trim() || "todos";
    const categoriaFilter = req.nextUrl.searchParams.get("categoria")?.trim() || null;
    const searchFilter = req.nextUrl.searchParams.get("search")?.trim() || null;

    const isGlobal = clientIdParam === "todos";

    // Valida clientId apenas se for um valor específico
    if (!isGlobal && !CLIENT_ID_RE.test(clientIdParam)) {
      return NextResponse.json(
        { documents: [], message: "ID de cliente inválido." },
        { status: 400 }
      );
    }

    let clientDirs: string[];

    if (isGlobal) {
      // Lê todos os subdiretórios de uploads/
      try {
        await fs.mkdir(UPLOADS_ROOT, { recursive: true }).catch(() => {});
        const entries = await fs.readdir(UPLOADS_ROOT, { withFileTypes: true });
        clientDirs = entries
          .filter((e) => e.isDirectory() && CLIENT_ID_RE.test(e.name))
          .map((e) => e.name);
      } catch {
        return NextResponse.json({ documents: [] });
      }
    } else {
      clientDirs = [clientIdParam];
    }

    const validCategories = CATEGORIAS as readonly string[];
    const docs: DocumentEntry[] = [];

    for (const cId of clientDirs) {
      const clientDir = path.join(UPLOADS_ROOT, cId);
      let categories: string[];
      try {
        categories = await fs.readdir(clientDir);
      } catch {
        continue;
      }

      for (const cat of categories) {
        if (!validCategories.includes(cat)) continue;
        if (categoriaFilter && cat !== categoriaFilter) continue;

        const catDir = path.join(clientDir, cat);
        let files: string[];
        try {
          files = await fs.readdir(catDir);
        } catch {
          continue;
        }

        for (const file of files) {
          // Ignora arquivos de metadados
          if (file.endsWith(".meta.json")) continue;

          const filePath = path.join(catDir, file);
          let stat: import("fs").Stats;
          try {
            stat = await fs.stat(filePath);
          } catch {
            continue;
          }
          if (!stat.isFile()) continue;

          const caminhoRel = path.join("uploads", cId, cat, file);

          if (searchFilter && !file.toLowerCase().includes(searchFilter.toLowerCase())) {
            continue;
          }

          // Tenta ler metadados
          let resumo: string | null = null;
          const metaPath = filePath + ".meta.json";
          try {
            const metaRaw = await fs.readFile(metaPath, "utf-8");
            const meta = JSON.parse(metaRaw);
            resumo = meta.resumo ?? null;
          } catch {
            // Arquivo antigo sem metadados
          }

          docs.push({
            filename: file,
            categoria: cat,
            caminho: caminhoRel,
            modifiedAt: stat.mtime.toISOString(),
            clientId: cId,
            resumo,
          });
        }
      }
    }

    // Ordena do mais recente para o mais antigo
    docs.sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());

    return NextResponse.json({ documents: docs });
  } catch (err) {
    console.error("[documents] erro:", err);
    return NextResponse.json(
      { documents: [], message: "Erro ao listar documentos." },
      { status: 500 }
    );
  }
}