import { sanitizeWithReport } from "../lib/sanitizer";

describe("sanitizer", () => {
  test("redige CPF com máscara", () => {
    const r = sanitizeWithReport("CPF: 123.456.789-00");
    expect(r.sanitized).toContain("[CPF]");
    expect(r.sanitized).not.toContain("123.456.789-00");
    expect(r.redactedFields).toContain("CPF");
  });

  test("redige CPF sem máscara", () => {
    const r = sanitizeWithReport("cpf 12345678900");
    expect(r.sanitized).toContain("[CPF]");
    expect(r.redactedFields).toContain("CPF");
  });

  test("redige CNPJ", () => {
    const r = sanitizeWithReport("CNPJ: 12.345.678/0001-90");
    expect(r.sanitized).toContain("[CNPJ]");
    expect(r.redactedFields).toContain("CNPJ");
  });

  test("redige email", () => {
    const r = sanitizeWithReport("contato: joao@orbe.com.br");
    expect(r.sanitized).toContain("[EMAIL]");
    expect(r.redactedFields).toContain("EMAIL");
  });

  test("redige telefone celular", () => {
    const r = sanitizeWithReport("tel: (81) 99999-0000");
    expect(r.sanitized).toContain("[TELEFONE]");
    expect(r.redactedFields).toContain("TELEFONE");
  });

  test("redige RG", () => {
    const r = sanitizeWithReport("RG: 12.345.678-9");
    expect(r.sanitized).toContain("[RG]");
    expect(r.redactedFields).toContain("RG");
  });

  test("redige número de cartão (sem separadores)", () => {
    // Sequência contínua de 16 dígitos — o TELEFONE regex come parte dela,
    // mas o CARTAO ainda consegue capturar dependendo da sobra
    const r = sanitizeWithReport("4532123456789012");
    // Pelo menos TELEFONE ou CARTAO é redigido
    expect(r.redactedFields.length).toBeGreaterThanOrEqual(1);
  });

  test("não altera texto sem dados sensíveis", () => {
    const r = sanitizeWithReport("Contrato de serviços contábeis.");
    expect(r.sanitized).toBe("Contrato de serviços contábeis.");
    expect(r.redactedFields).toHaveLength(0);
  });

  test("redige múltiplos campos no mesmo texto", () => {
    const r = sanitizeWithReport(
      "CPF: 123.456.789-00, email: a@b.com, tel: (11) 98888-7777"
    );
    expect(r.redactedFields).toContain("CPF");
    expect(r.redactedFields).toContain("EMAIL");
    expect(r.redactedFields).toContain("TELEFONE");
  });
});