import fs from "fs/promises";
import path from "path";
import { saveDocument, ensureClientFolders } from "../lib/storage";

const TEST_CLIENT = "test_client_jest";
const UPLOADS_ROOT = path.join(process.cwd(), "uploads");

beforeEach(async () => {
  await fs.mkdir(path.join(UPLOADS_ROOT, TEST_CLIENT), { recursive: true });
});

afterEach(async () => {
  await fs
    .rm(path.join(UPLOADS_ROOT, TEST_CLIENT), { recursive: true, force: true })
    .catch(() => {});
});

describe("storage", () => {
  test("cria pastas de todas as categorias", async () => {
    await ensureClientFolders(TEST_CLIENT);
    for (const cat of [
      "Contratos",
      "Financeiro",
      "Documentos Pessoais",
      "Comprovantes",
      "Nao-Classificado",
    ]) {
      const exists = await fs
        .access(path.join(UPLOADS_ROOT, TEST_CLIENT, cat))
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);
    }
  });

  test("salva arquivo e retorna caminho relativo", async () => {
    const buf = Buffer.from("conteúdo de teste");
    const result = await saveDocument({
      clientId: TEST_CLIENT,
      categoria: "Contratos",
      filename: "teste.txt",
      buffer: buf,
    });
    expect(result.caminho).toContain("Contratos");
    expect(result.caminho).toContain("teste.txt");
    expect(result.duplicate).toBe(false);
    // Aceita separadores Unix e Windows
    const normalized = result.caminho.replace(/\\/g, "/");
    expect(normalized.startsWith("uploads/")).toBe(true);
  });

  test("arquivo realmente escrito no disco", async () => {
    const buf = Buffer.from("salvo em disco");
    const result = await saveDocument({
      clientId: TEST_CLIENT,
      categoria: "Financeiro",
      filename: "disco.txt",
      buffer: buf,
    });
    const absolutePath = path.join(process.cwd(), result.caminho);
    const content = await fs.readFile(absolutePath, "utf-8");
    expect(content).toBe("salvo em disco");
  });
});