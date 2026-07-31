export const runtime = "nodejs";

import fs from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { extractText } from "@/lib/extractor";
import { sanitizeWithReport } from "@/lib/sanitizer";
import { classifyDocument } from "@/lib/classifier";
import { saveDocument, UPLOADS_ROOT } from "@/lib/storage";
import { appendToReadme } from "@/lib/readme-updater";
import { checkRateLimit } from "@/lib/rate-limiter";
import { logEvent } from "@/lib/logger";

const CLIENT_ID_RE = /^[a-zA-Z0-9_\-]{3,50}$/;

const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain",
];

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

function getClientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? req.headers.get("x-real-ip")
    ?? "127.0.0.1";
}

export async function POST(req: NextRequest) {
  const startTime = performance.now();
  const ip = getClientIp(req);

  try {
    // Rate limiting por IP
    const rateLimit = checkRateLimit(ip);
    if (!rateLimit.allowed) {
      logEvent({
        timestamp: new Date().toISOString(),
        action: "rate_limited",
        ip,
      });
      return NextResponse.json(
        { error: "Limite de uploads excedido (20/hora). Tente novamente mais tarde." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }

    const formData = await req.formData();
    const files = formData.getAll("file") as File[];
    const clientId = (formData.get("clientId") as string | null)?.trim() || "default";

    if (!clientId || !CLIENT_ID_RE.test(clientId)) {
      return NextResponse.json(
        { error: "ID de cliente inválido." },
        { status: 400 }
      );
    }

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
    }

    // Validação upfront de todos os arquivos
    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: `Tipo não permitido: ${file.name} (${file.type}). Use PDF, imagem (JPEG/PNG/WebP) ou TXT.` },
          { status: 400 }
        );
      }
      if (file.size > MAX_SIZE) {
        return NextResponse.json(
          { error: `Arquivo muito grande: ${file.name} (máx 10MB).` },
          { status: 400 }
        );
      }
    }

    // Processamento sequencial para evitar race condition no README
    const results: {
      filename: string;
      categoria: string;
      resumo: string;
      caminho: string;
      redactedFields: string[];
      duplicate: boolean;
      duplicateOf?: string;
    }[] = [];

    for (const file of files) {
      const fileStartTime = performance.now();

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const filename = file.name;
      const mimeType = file.type;

      // Extração de texto
      const rawText = await extractText({ buffer, mimeType, filename });

      // Sanitização LGPD
      const { sanitized, redactedFields } = sanitizeWithReport(rawText);

      // Para imagens, passa base64 direto ao classificador (gpt-4o Vision)
      let imageBase64: string | undefined;
      if (["image/jpeg", "image/png", "image/webp"].includes(mimeType)) {
        imageBase64 = buffer.toString("base64");
      }

      // Classificação via gpt-4o
      const { categoria, resumo } = await classifyDocument(sanitized, filename, imageBase64, mimeType);

      // Salva o arquivo na pasta correta
      const saveResult = await saveDocument({ clientId, categoria, filename, buffer });

      const caminhoFinal = saveResult.caminho;

      if (!saveResult.duplicate) {
        // Salva .meta.json normalmente
        const absPath = path.join(UPLOADS_ROOT, clientId, categoria, path.basename(caminhoFinal));
        await fs.writeFile(
          absPath + ".meta.json",
          JSON.stringify({ resumo, categoria, clientId, filename, uploadedAt: new Date().toISOString() })
        );
      }

      // Atualiza README com nota de duplicata se for o caso
      const resumoFinal = saveResult.duplicate
        ? `[DUPLICATA de ${saveResult.duplicateOf}] ${resumo}`
        : resumo;

      await appendToReadme({ clientId, filename, categoria, resumo: resumoFinal, date: new Date() });

      const fileDurationMs = Math.round(performance.now() - fileStartTime);

      logEvent({
        timestamp: new Date().toISOString(),
        action: "upload",
        clientId,
        filename,
        categoria,
        durationMs: fileDurationMs,
        redactedFields,
        duplicate: saveResult.duplicate,
        ip,
      });

      results.push({
        filename,
        categoria,
        resumo,
        caminho: caminhoFinal,
        redactedFields,
        duplicate: saveResult.duplicate,
        duplicateOf: saveResult.duplicateOf,
      });
    }

    return NextResponse.json({ success: true, results });
  } catch (err) {
    const durationMs = Math.round(performance.now() - startTime);
    const errorMessage = err instanceof Error ? err.message : "Erro desconhecido";

    logEvent({
      timestamp: new Date().toISOString(),
      action: "error",
      error: errorMessage,
      durationMs,
      ip,
    });

    return NextResponse.json(
      { error: "Erro interno ao processar o documento. Tente novamente." },
      { status: 500 }
    );
  }
}
