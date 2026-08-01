import fs from "fs/promises";
import path from "path";
import { UPLOADS_ROOT } from "./storage";

// Lock por clientId para evitar race condition em uploads simultâneos
const locks = new Map<string, Promise<void>>();

async function _appendToReadme(params: {
  clientId: string;
  filename: string;
  categoria: string;
  resumo: string;
  date: Date;
}): Promise<void> {
  const { clientId, filename, categoria, resumo, date } = params;
  const readmePath = path.join(UPLOADS_ROOT, clientId, "README.md");

  const pad = (n: number) => String(n).padStart(2, "0");
  const dateStr = `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;

  // Escapa pipes do markdown para não quebrar a tabela
  const safe = (s: string) => s.replace(/\|/g, "\\|");
  const newRow = `| ${dateStr} | ${safe(filename)} | ${safe(categoria)} | ${safe(resumo)} |`;

  await fs.mkdir(path.join(UPLOADS_ROOT, clientId), { recursive: true });

  let content: string;
  try {
    content = await fs.readFile(readmePath, "utf-8");
  } catch {
    // Arquivo não existe — cria com cabeçalho
    content = `# Orbe Contábil — Documentos: ${clientId}\n\n| Data | Arquivo | Categoria | Resumo |\n|------|---------|-----------|--------|\n`;
  }

  // Adiciona nova linha ao final (nunca sobrescreve)
  const updated = content.trimEnd() + "\n" + newRow + "\n";
  await fs.writeFile(readmePath, updated, "utf-8");
}

export async function appendToReadme(params: {
  clientId: string;
  filename: string;
  categoria: string;
  resumo: string;
  date: Date;
}): Promise<void> {
  const key = params.clientId;

  // Encadeia a operação na fila do cliente
  const prev = locks.get(key) ?? Promise.resolve();
  const next = prev.then(() => _appendToReadme(params)).catch(() => _appendToReadme(params));
  locks.set(key, next);

  await next;
}
