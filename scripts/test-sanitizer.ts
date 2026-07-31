import { sanitizeWithReport } from "../lib/sanitizer";

const casos = [
  "CPF: 123.456.789-00, email: joao@orbe.com.br, tel: (81) 99999-0000",
  "CNPJ: 12.345.678/0001-90, cartão: 4111 1111 1111 1111",
  "RG: 1.234.567-8, CPF sem máscara: 12345678900",
  "Texto sem dados sensíveis aqui.",
];

for (const texto of casos) {
  const r = sanitizeWithReport(texto);
  console.log("ORIGINAL:", texto);
  console.log("SANITIZADO:", r.sanitized);
  console.log("CAMPOS:", r.redactedFields);
  console.log("---");
}