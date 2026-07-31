export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "no file" }, { status: 400 });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Test pdf-parse with a small copy to avoid any reference issues
    const testBuffer = Buffer.alloc(buffer.length);
    buffer.copy(testBuffer);

    let result1 = "?";
    try {
      const pdfParse = (await import("pdf-parse")).default;
      const r = await pdfParse(testBuffer);
      result1 = `OK: pages=${r.numpages}, text=${r.text.substring(0, 80)}`;
    } catch (e: any) {
      result1 = `FAIL: ${e.message}`;
    }

    // Also try saving to temp file and reading
    let result2 = "?";
    try {
      const fs = require("fs");
      const os = require("os");
      const path = require("path");
      const tmpPath = path.join(os.tmpdir(), "test-pdf-" + Date.now() + ".pdf");
      fs.writeFileSync(tmpPath, buffer);
      const fsBuffer = fs.readFileSync(tmpPath);
      const pdfParse = (await import("pdf-parse")).default;
      const r = await pdfParse(fsBuffer);
      result2 = `OK (file): pages=${r.numpages}, text=${r.text.substring(0, 80)}`;
      fs.unlinkSync(tmpPath);
    } catch (e: any) {
      result2 = `FAIL (file): ${e.message}`;
    }

    return NextResponse.json({
      result1,
      result2,
      firstBytes: buffer.slice(0, 30).toString("hex"),
      firstChars: buffer.slice(0, 50).toString("ascii"),
      length: buffer.length,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}