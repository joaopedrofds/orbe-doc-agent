import fs from "fs/promises";
import path from "path";
import { createHash } from "crypto";

export const UPLOADS_ROOT = process.env.UPLOADS_ROOT ?? path.join(process.cwd(), "uploads");

export const CATEGORIAS = [
  "Contratos",
  "Financeiro",
  "Documentos Pessoais",
  "Comprovantes",
  "Nao-Classificado",
] as const;

export type Categoria = (typeof CATEGORIAS)[number];

function computeHash(buffer: Buffer): string {
  return createHash("md5").update(buffer).digest("hex");
}

const HASHES_FILE = ".hashes.json";

interface HashEntry {
  filename: string;
  caminho: string;
  categoria: string;
  uploadedAt: string;
}

async function readHashIndex(clientId: string): Promise<Record<string, HashEntry>> {
  const p = path.join(UPLOADS_ROOT, clientId, HASHES_FILE);
  try {
    const raw = await fs.readFile(p, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function writeHashIndex(clientId: string, index: Record<string, HashEntry>): Promise<void> {
  const p = path.join(UPLOADS_ROOT, clientId, HASHES_FILE);
  await fs.writeFile(p, JSON.stringify(index, null, 2), "utf-8");
}

export async function ensureClientFolders(clientId: string): Promise<void> {
  // Garante a raiz primeiro
  await fs.mkdir(UPLOADS_ROOT, { recursive: true });
  // Depois cada categoria
  for (const cat of CATEGORIAS) {
    await fs.mkdir(path.join(UPLOADS_ROOT, clientId, cat), { recursive: true });
  }
}

function sanitizeFilename(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._\-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 200);
}

export interface SaveResult {
  caminho: string;
  duplicate: boolean;
  duplicateOf?: string;
}

export async function saveDocument(params: {
  clientId: string;
  categoria: string;
  filename: string;
  buffer: Buffer;
}): Promise<SaveResult> {
  const { clientId, categoria, filename, buffer } = params;

  await ensureClientFolders(clientId);

  const hash = computeHash(buffer);
  const index = await readHashIndex(clientId);

  // Verifica duplicata
  if (index[hash]) {
    return {
      caminho: index[hash].caminho,
      duplicate: true,
      duplicateOf: index[hash].filename,
    };
  }

  // Salva arquivo normalmente
  const ext = path.extname(filename);
  const base = path.basename(filename, ext);
  const safeName = sanitizeFilename(base) + ext;
  const destDir = path.join(UPLOADS_ROOT, clientId, categoria);

  let finalName = safeName;
  try {
    await fs.access(path.join(destDir, safeName));
    finalName = `${sanitizeFilename(base)}_${Date.now()}${ext}`;
  } catch {
    // nome livre
  }

  const destPath = path.join(destDir, finalName);
  await fs.writeFile(destPath, buffer);

  const caminho = path.join("uploads", clientId, categoria, finalName);

  // Registra no índice de hashes
  index[hash] = { filename: finalName, caminho, categoria, uploadedAt: new Date().toISOString() };
  await writeHashIndex(clientId, index);

  return { caminho, duplicate: false };
}

export async function saveDocumentWithMeta(params: {
  clientId: string;
  categoria: string;
  filename: string;
  buffer: Buffer;
  resumo: string;
}): Promise<{ relativePath: string; absolutePath: string; duplicate: boolean; duplicateOf?: string }> {
  const saveResult = await saveDocument(params);
  const absolutePath = path.join(UPLOADS_ROOT, params.clientId, params.categoria, path.basename(saveResult.caminho));

  if (!saveResult.duplicate) {
    // Salva metadados adjacentes
    const metaPath = absolutePath + ".meta.json";
    await fs.writeFile(
      metaPath,
      JSON.stringify({
        resumo: params.resumo,
        categoria: params.categoria,
        clientId: params.clientId,
        filename: params.filename,
        uploadedAt: new Date().toISOString(),
      })
    );
  }

  return {
    relativePath: saveResult.caminho,
    absolutePath,
    duplicate: saveResult.duplicate,
    duplicateOf: saveResult.duplicateOf,
  };
}