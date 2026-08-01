import { getSupabase, BUCKET } from "./supabase";

const locks = new Map<string, Promise<void>>();

async function _appendToReadme(params: {
  clientId: string;
  filename: string;
  categoria: string;
  resumo: string;
  date: Date;
}): Promise<void> {
  const { clientId, filename, categoria, resumo, date } = params;
  const readmePath = `${clientId}/README.md`;

  const pad = (n: number) => String(n).padStart(2, "0");
  const dateStr = `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;

  const safe = (s: string) => s.replace(/\|/g, "\\|");
  const newRow = `| ${dateStr} | ${safe(filename)} | ${safe(categoria)} | ${safe(resumo)} |`;

  let content: string;
  const { data } = await getSupabase().storage.from(BUCKET).download(readmePath);

  if (data) {
    content = await data.text();
  } else {
    content = `# Orbe Contábil — Documentos: ${clientId}\n\n| Data | Arquivo | Categoria | Resumo |\n|------|---------|-----------|--------|\n`;
  }

  const updated = content.trimEnd() + "\n" + newRow + "\n";
  const blob = new Blob([updated], { type: "text/markdown" });

  await getSupabase().storage.from(BUCKET).upload(readmePath, blob, { upsert: true });
}

export async function appendToReadme(params: {
  clientId: string;
  filename: string;
  categoria: string;
  resumo: string;
  date: Date;
}): Promise<void> {
  const key = params.clientId;
  const prev = locks.get(key) ?? Promise.resolve();
  const next = prev.then(() => _appendToReadme(params)).catch(() => _appendToReadme(params));
  locks.set(key, next);
  await next;
}