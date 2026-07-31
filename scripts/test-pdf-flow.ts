import { extractText } from "../lib/extractor";
import { sanitizeWithReport } from "../lib/sanitizer";
import { classifyDocument } from "../lib/classifier";
import fs from "fs";

async function main() {
  console.log("=== Teste de fluxo completo com PDF ===\n");

  const buffer = fs.readFileSync("contrato_real_teste.pdf");
  console.log("1. Tamanho do buffer:", buffer.length, "bytes");

  // Extração
  console.log("\n2. Extraindo texto...");
  const rawText = await extractText({
    buffer,
    mimeType: "application/pdf",
    filename: "contrato_real_teste.pdf",
  });
  console.log("   Texto extraído:", rawText.substring(0, 200));
  console.log("   Length:", rawText.length);

  // Sanitização
  console.log("\n3. Sanitizando...");
  const { sanitized, redactedFields } = sanitizeWithReport(rawText);
  console.log("   Campos redactados:", redactedFields);
  console.log("   Texto sanitizado:", sanitized.substring(0, 200));

  // Classificação
  console.log("\n4. Classificando documento...");
  console.time("classificacao");
  try {
    const { categoria, resumo } = await classifyDocument(
      sanitized,
      "contrato_real_teste.pdf"
    );
    console.timeEnd("classificacao");
    console.log("   Categoria:", categoria);
    console.log("   Resumo:", resumo);
  } catch (e) {
    console.error("   Erro na classificação:", e);
  }

  console.log("\n=== Teste concluído ===");
}

main().catch(console.error);