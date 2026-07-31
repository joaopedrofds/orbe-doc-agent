const fs = require("fs");

function makePdf(text) {
  const esc = text
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
  const lines = esc.split("\n");

  let content = "";
  let y = 750;
  for (const line of lines) {
    content += `BT /F1 12 Tf 50 ${y} Td (${line}) Tj ET\n`;
    y -= 18;
  }

  const contentLen = Buffer.byteLength(content, "utf-8");

  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj",
    `4 0 obj\n<< /Length ${contentLen} >>\nstream\n${content}\nendstream\nendobj`,
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [];
  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj + "\n";
  }

  const xref = pdf.length;
  pdf += "xref\n";
  pdf += `0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (const o of offsets) {
    pdf += String(o).padStart(10, "0") + " 00000 n \n";
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += "startxref\n" + xref + "\n%%EOF";
  return pdf;
}

const texto = `CONTRATO DE PRESTACAO DE SERVICOS

CONTRATANTE: Maria Oliveira, CPF: 987.654.321-00
CONTRATADA: Orbe Contabilidade Ltda, CNPJ: 98.765.432/0001-10

OBJETO: Prestacao de servicos contabeis mensais.
VALOR: R$ 2.500,00 mensais
PRAZO: 24 meses, renovavel automaticamente.

Clausula Primeira: A CONTRATADA prestara servicos de contabilidade.
Clausula Segunda: O valor mensal sera pago ate o dia 5 de cada mes.
Clausula Terceira: Vigencia de 24 meses a partir da assinatura.

Assinado em Sao Paulo, 15 de marco de 2025.

Maria Oliveira - CPF: 987.654.321-00`;

const pdf = makePdf(texto);
fs.writeFileSync("contrato_pdf_real.pdf", pdf);
console.log("PDF criado:", fs.statSync("contrato_pdf_real.pdf").size, "bytes");