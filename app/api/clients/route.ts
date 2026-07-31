export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { UPLOADS_ROOT, ensureClientFolders } from "@/lib/storage";

const CLIENT_ID_RE = /^[a-zA-Z0-9_\-]{3,50}$/;

export async function GET() {
  try {
    const entries = await fs.readdir(UPLOADS_ROOT, { withFileTypes: true });
    const clients = entries
      .filter((e) => e.isDirectory() && CLIENT_ID_RE.test(e.name))
      .map((e) => e.name)
      .sort();
    return NextResponse.json({ clients });
  } catch {
    // uploads/ ainda não existe
    return NextResponse.json({ clients: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const clientId = body?.clientId?.trim();

    if (!clientId || !CLIENT_ID_RE.test(clientId)) {
      return NextResponse.json(
        { error: "ID inválido. Use 3-50 caracteres: letras, números, _ ou -" },
        { status: 400 }
      );
    }

    const clientDir = path.join(UPLOADS_ROOT, clientId);
    try {
      await fs.access(clientDir);
      return NextResponse.json(
        { error: "Cliente já cadastrado." },
        { status: 409 }
      );
    } catch {
      // Não existe — pode criar
    }

    await ensureClientFolders(clientId);

    return NextResponse.json({ clientId }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Erro ao cadastrar cliente." },
      { status: 500 }
    );
  }
}