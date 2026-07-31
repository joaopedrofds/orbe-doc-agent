export interface ExtractInput {
  buffer: Buffer;
  mimeType: string;
  filename: string;
}

function extractTextFromBytes(buffer: Buffer): string {
  // Fallback: extrai texto entre parênteses em streams de conteúdo PDF
  const ascii = buffer.toString("ascii");
  const lines: string[] = [];
  const parenRegex = /\(([^)]*)\)/g;
  let match: RegExpExecArray | null;
  while ((match = parenRegex.exec(ascii)) !== null) {
    const content = match[1];
    // Ignora comandos PDF e conteúdo não-textual
    if (content.length > 3 && /[a-zA-ZÀ-ÿ]{3,}/.test(content)) {
      lines.push(content);
    }
  }
  return lines.length > 0 ? lines.join("\n") : "[conteúdo não extraível]";
}

export async function extractText({
  buffer,
  mimeType,
  filename,
}: ExtractInput): Promise<string> {
  try {
    if (mimeType === "application/pdf") {
      const pdfParse = (await import("pdf-parse")).default;
      try {
        const result = await pdfParse(buffer);
        const text = result.text?.trim();
        if (text && text !== "[conteúdo não extraível]") return text;
      } catch {
        // pdf-parse falhou — tenta fallback de extração crua
      }
      const fallback = extractTextFromBytes(buffer);
      if (fallback !== "[conteúdo não extraível]") return fallback;
      throw new Error("Não foi possível extrair texto do PDF");
    }

    if (["image/jpeg", "image/png", "image/webp"].includes(mimeType)) {
      // Para imagens, enviamos como base64 para o Claude fazer OCR via vision
      // ao invés de tesseract (evita dependência nativa pesada)
      return `[IMAGEM: ${filename} — conteúdo visual a ser analisado pelo modelo]`;
    }

    if (mimeType === "text/plain") {
      return buffer.toString("utf-8").trim() || "[conteúdo não extraível]";
    }

    throw new Error(`Tipo de arquivo não suportado: ${mimeType}`);
  } catch (err) {
    if (err instanceof Error && err.message.includes("não suportado")) {
      throw err;
    }
    throw new Error(`Erro ao extrair texto de ${filename}: ${(err as Error).message}`);
  }
}
