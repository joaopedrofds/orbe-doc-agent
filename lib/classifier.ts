import OpenAI from "openai";

export type Categoria =
  | "Contratos"
  | "Financeiro"
  | "Documentos Pessoais"
  | "Comprovantes"
  | "Nao-Classificado";

export const CATEGORIAS: Categoria[] = [
  "Contratos",
  "Financeiro",
  "Documentos Pessoais",
  "Comprovantes",
  "Nao-Classificado",
];

export interface ClassificationResult {
  categoria: Categoria;
  resumo: string;
}

const SYSTEM_PROMPT = `Você é um assistente de classificação documental para um escritório de contabilidade brasileiro.

Categorias disponíveis (use EXATAMENTE estes nomes, sem variações):
- Contratos: contratos, acordos, termos de serviço, aditivos, procurações
- Financeiro: notas fiscais, boletos, extratos bancários, recibos, DRE, balancetes, guias de pagamento (DARF, GPS, FGTS)
- Documentos Pessoais: RG, CPF, CNH, certidão de nascimento/casamento, passaporte, carteira de trabalho
- Comprovantes: comprovantes de residência, comprovantes de pagamento, declarações diversas, protocolos
- Nao-Classificado: qualquer documento que não se encaixe claramente nas anteriores

Responda APENAS com JSON válido e nada mais — sem markdown, sem explicação, sem texto adicional.
Formato exato: {"categoria": "NOME_DA_CATEGORIA", "resumo": "Uma frase de no máximo 100 caracteres"}`;

const FALLBACK: ClassificationResult = {
  categoria: "Nao-Classificado",
  resumo: "Documento não pôde ser classificado automaticamente",
};

export async function classifyDocument(
  sanitizedText: string,
  filename: string,
  imageBase64?: string,
  mimeType?: string
): Promise<ClassificationResult> {
  const apiKey = process.env.ORBE_OPENAI_KEY || process.env.OPENAI_API_KEY;
  const client = new OpenAI({ apiKey, baseURL: "https://api.openai.com/v1" });

  // Trunca texto para controlar custo (~3000 chars ≈ 750 tokens)
  const truncated =
    sanitizedText.length > 3000
      ? sanitizedText.slice(0, 3000) + "\n[...conteúdo truncado]"
      : sanitizedText;

  try {
    let userContent: OpenAI.Chat.ChatCompletionContentPart[];

    if (imageBase64 && mimeType && ["image/jpeg", "image/png", "image/webp"].includes(mimeType)) {
      userContent = [
        {
          type: "image_url",
          image_url: {
            url: `data:${mimeType};base64,${imageBase64}`,
            detail: "low", // baixo custo — só precisamos classificar
          },
        },
        {
          type: "text",
          text: `Arquivo: ${filename}\nClassifique este documento conforme as instruções.`,
        },
      ];
    } else {
      userContent = [
        {
          type: "text",
          text: `Arquivo: ${filename}\n\nConteúdo:\n${truncated}`,
        },
      ];
    }

    const response = await client.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 150,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
    });

    const text = response.choices[0]?.message?.content ?? "";
    const parsed = JSON.parse(text) as ClassificationResult;

    if (!CATEGORIAS.includes(parsed.categoria)) return FALLBACK;
    if (typeof parsed.resumo !== "string") return FALLBACK;

    return {
      categoria: parsed.categoria,
      resumo: parsed.resumo.slice(0, 120),
    };
  } catch (err) {
    console.error("[classifier] erro ao classificar:", err);
    return FALLBACK;
  }
}
