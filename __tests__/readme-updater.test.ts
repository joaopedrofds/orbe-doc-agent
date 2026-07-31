import fs from "fs/promises";
import path from "path";
import { appendToReadme } from "../lib/readme-updater";

const TEST_CLIENT = "test_readme_jest";
const UPLOADS_ROOT = path.join(process.cwd(), "uploads");

beforeEach(async () => {
  await fs.mkdir(path.join(UPLOADS_ROOT, TEST_CLIENT), { recursive: true });
});

afterEach(async () => {
  await fs
    .rm(path.join(UPLOADS_ROOT, TEST_CLIENT), { recursive: true, force: true })
    .catch(() => {});
});

describe("readme-updater", () => {
  test("cria README com cabeçalho se não existir", async () => {
    await appendToReadme({
      clientId: TEST_CLIENT,
      filename: "doc.pdf",
      categoria: "Contratos",
      resumo: "Resumo teste",
      date: new Date("2025-07-31T14:00:00"),
    });
    const content = await fs.readFile(
      path.join(UPLOADS_ROOT, TEST_CLIENT, "README.md"),
      "utf-8"
    );
    expect(content).toContain("# Orbe Contábil");
    expect(content).toContain("doc.pdf");
    expect(content).toContain("Contratos");
    expect(content).toContain("Resumo teste");
  });

  test("append preserva conteúdo anterior (nunca sobrescreve)", async () => {
    await appendToReadme({
      clientId: TEST_CLIENT,
      filename: "primeiro.pdf",
      categoria: "Financeiro",
      resumo: "Primeiro",
      date: new Date(),
    });
    await appendToReadme({
      clientId: TEST_CLIENT,
      filename: "segundo.pdf",
      categoria: "Contratos",
      resumo: "Segundo",
      date: new Date(),
    });
    const content = await fs.readFile(
      path.join(UPLOADS_ROOT, TEST_CLIENT, "README.md"),
      "utf-8"
    );
    expect(content).toContain("primeiro.pdf");
    expect(content).toContain("segundo.pdf");
  });

  test("uploads simultâneos não causam race condition", async () => {
    await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        appendToReadme({
          clientId: TEST_CLIENT,
          filename: `doc${i}.pdf`,
          categoria: "Comprovantes",
          resumo: `Resumo ${i}`,
          date: new Date(),
        })
      )
    );
    const content = await fs.readFile(
      path.join(UPLOADS_ROOT, TEST_CLIENT, "README.md"),
      "utf-8"
    );
    for (let i = 0; i < 5; i++) {
      expect(content).toContain(`doc${i}.pdf`);
    }
  });
});