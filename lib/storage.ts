import { getSupabase, BUCKET } from "./supabase";
import { createHash } from "crypto";
import path from "path";

export const CATEGORIAS = [
  "Contratos",
  "Financeiro",
  "Documentos Pessoais",
  "Comprovantes",
  "Nao-Classificado",
] as const;

export type Categoria = (typeof CATEGORIAS)[number];

// UPLOADS_ROOT mantido apenas para compatibilidade local
export const UPLOADS_ROOT = (process.env.UPLOADS_ROOT ?? "").trim() ||
  path.join(process.cwd(), "uploads");

export interface SaveResult {
  caminho: string;
  duplicate: boolean;
  duplicateOf?: string;
}

function computeHash(buffer: Buffer): string {
  return createHash("md5").update(buffer).digest("hex");
}

// Caminho no bucket: {clientId}/{categoria}/{filename}
function bucketPath(clientId: string, categoria: string, filename: string): string {
  return `${clientId}/${categoria}/${filename}`;
}

function sanitizeFilename(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._\-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 200);
}

async function readHashIndex(clientId: string): Promise<Record<string, { filename: string; caminho: string; categoria: string; uploadedAt: string }>> {
  const { data } = await getSupabase().storage
    .from(BUCKET)
    .download(`${clientId}/.hashes.json`);

  if (!data) return {};

  try {
    const text = await data.text();
    return JSON.parse(text);
  } catch {
    return {};
  }
}

async function writeHashIndex(clientId: string, index: Record<string, unknown>): Promise<void> {
  const blob = new Blob([JSON.stringify(index, null, 2)], { type: "application/json" });
  await getSupabase().storage
    .from(BUCKET)
    .upload(`${clientId}/.hashes.json`, blob, { upsert: true });
}

export async function ensureClientFolders(clientId: string): Promise<void> {
  // No Supabase Storage não há pastas reais — são criadas automaticamente no upload
  // Apenas valida o clientId
  if (!/^[a-zA-Z0-9_\-]{3,50}$/.test(clientId)) {
    throw new Error("ID de cliente inválido.");
  }
}

export async function saveDocument(params: {
  clientId: string;
  categoria: string;
  filename: string;
  buffer: Buffer;
}): Promise<SaveResult> {
  const { clientId, categoria, filename, buffer } = params;

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

  const ext = path.extname(filename);
  const base = path.basename(filename, ext);
  const safeName = sanitizeFilename(base) + ext;

  // Verifica colisão de nome
  const { data: existing } = await getSupabase().storage.from(BUCKET).list(`${clientId}/${categoria}`);
  const nameExists = existing?.some(f => f.name === safeName);
  const finalName = nameExists ? `${sanitizeFilename(base)}_${Date.now()}${ext}` : safeName;

  const filePath = bucketPath(clientId, categoria, finalName);

  const blob = new Blob([new Uint8Array(buffer)]);
  const { error } = await getSupabase().storage
    .from(BUCKET)
    .upload(filePath, blob, { upsert: false });

  if (error) throw new Error(`Erro ao salvar arquivo: ${error.message}`);

  const caminho = filePath;

  // Atualiza índice de hashes
  index[hash] = { filename: finalName, caminho, categoria, uploadedAt: new Date().toISOString() };
  await writeHashIndex(clientId, index);

  return { caminho, duplicate: false };
}