const fs = require("fs");

function createSimplePDF(text) {
  let pdf = "%PDF-1.4\n";
  const objects = [];

  // Object 1: Catalog
  objects.push({
    id: 1,
    data: "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
  });

  // Object 2: Pages
  objects.push({
    id: 2,
    data: "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
  });

  // Object 3: Page
  objects.push({
    id: 3,
    data:
      "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n",
  });

  // Escape text for PDF string
  const esc = text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  const streamContent = "BT /F1 12 Tf 50 700 Td (" + esc + ") Tj ET";
  const streamLength = Buffer.byteLength(streamContent, "utf-8");

  // Object 4: Content stream
  objects.push({
    id: 4,
    data:
      "4 0 obj\n<< /Length " +
      streamLength +
      " >>\nstream\n" +
      streamContent +
      "\nendstream\nendobj\n",
  });

  // Object 5: Font
  objects.push({
    id: 5,
    data:
      "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
  });

  // Calculate offsets and build PDF
  let offset = pdf.length;
  for (const obj of objects) {
    obj.offset = offset;
    offset += obj.data.length;
    pdf += obj.data;
  }

  // Cross-reference table
  const xrefOffset = pdf.length;
  pdf += "xref\n0 " + (objects.length + 1) + "\n0000000000 65535 f \n";
  for (const obj of objects) {
    pdf += String(obj.offset).padStart(10, "0") + " 00000 n \n";
  }

  pdf += "trailer\n<< /Size " + (objects.length + 1) + " /Root 1 0 R >>\n";
  pdf += "startxref\n" + xrefOffset + "\n%%EOF";

  fs.writeFileSync("contrato_real_teste.pdf", pdf, "binary");
  console.log("PDF criado:", fs.statSync("contrato_real_teste.pdf").size, "bytes");
  console.log("Conteúdo textual:", text.substring(0, 100) + "...");
}

const texto = `CONTRATO DE PRESTACAO DE SERVICOS

CONTRATANTE: Maria Oliveira, CPF: 987.654.321-00
CONTRATADA: Orbe Contabilidade Ltda, CNPJ: 98.765.432/0001-10

OBJETO: Prestacao de servicos contabeis mensais.
VALOR: R$ 2.500,00 mensais
PRAZO: 24 meses, renovavel automaticamente.

Clausula Primeira - Do objeto: A CONTRATADA prestara servicos de contabilidade, fiscal e RH.
Clausula Segunda - Do valor: O valor mensal sera pago ate o dia 5 de cada mes.
Clausula Terceira - Do prazo: O presente contrato vigora por 24 meses.

Assinado em Sao Paulo, 15 de marco de 2025.

Maria Oliveira
CPF: 987.654.321-00`;

createSimplePDF(texto);