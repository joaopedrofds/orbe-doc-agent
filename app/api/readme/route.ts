export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const CLIENT_ID_RE = /^[a-zA-Z0-9_\-]+$/;

export async function GET(req: NextRequest) {
  try {
    const clientId = req.nextUrl.searchParams.get("clientId")?.trim();

    if (!clientId) {
      return NextResponse.json(
        { content: null, message: "Informe o parâmetro clientId." },
        { status: 400 }
      );
    }

    if (!CLIENT_ID_RE.test(clientId)) {
      return NextResponse.json(
        { content: null, message: "clientId inválido. Use apenas letras, números, hífen e underscore." },
        { status: 400 }
      );
    }

    const readmePath = path.join(process.cwd(), "uploads", clientId, "README.md");

    let content: string;
    try {
      content = await fs.readFile(readmePath, "utf-8");
    } catch {
      return NextResponse.json(
        { content: null, message: "Nenhum documento processado para este cliente ainda." },
        { status: 200 }
      );
    }

    return NextResponse.json({ content, clientId });
  } catch (err) {
    console.error("[readme] erro:", err);
    return NextResponse.json(
      { content: null, message: "Erro ao ler README." },
      { status: 500 }
    );
  }
}