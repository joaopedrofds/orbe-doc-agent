# Prompts para Claude Code — Orbe Doc Agent

Use estes prompts **em ordem** no Claude Code após importar o projeto no VSCode.
Cada prompt é independente e autocontido — cole direto no Claude Code.

---

## PROMPT 1 — Instalar dependências e configurar ambiente

```
Instale as dependências do projeto e configure o ambiente:

1. Rode: npm install
   Confirme que o pacote "openai" versão ^4.x foi instalado (não @anthropic-ai/sdk).

2. Crie o arquivo .env.local com o conteúdo abaixo (só crie se não existir):
   OPENAI_API_KEY=sk-COLOQUE_SUA_CHAVE_AQUI
   A chave começa com "sk-" e pode ser obtida em https://platform.openai.com/api-keys

3. Confirme que lib/classifier.ts importa de "openai" (não de "@anthropic-ai/sdk").
   Se houver algum import errado, corrija para:
     import OpenAI from "openai";
   e o client deve ser instanciado como:
     const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

4. Confirme que o modelo usado em classifier.ts é "gpt-4o" e que o parâmetro
   response_format: { type: "json_object" } está presente na chamada.

5. Rode: npm run build
   Corrija qualquer erro de TypeScript que aparecer.
   Me mostre o output completo do build.
```

---

## PROMPT 2 — Teste de sanitização LGPD

```
Crie um arquivo de teste manual em scripts/test-sanitizer.ts:

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

Execute com: npx ts-node --esm scripts/test-sanitizer.ts
Ou adapte para rodar como você preferir.
Me mostre o output e confirme que todos os dados sensíveis foram redigidos corretamente.
```

---

## PROMPT 3 — Teste de fluxo completo (end-to-end)

```
Com o servidor rodando (npm run dev), teste o fluxo completo:

1. Crie um arquivo de teste: echo "Contrato de prestação de serviços entre João Silva (CPF: 123.456.789-00) e Orbe Contábil LTDA (CNPJ: 12.345.678/0001-90), vigência 12 meses a partir de agosto/2025." > /tmp/contrato_teste.txt

2. Faça upload via curl:
   curl -X POST http://localhost:3000/api/upload \
     -F "file=@/tmp/contrato_teste.txt;type=text/plain" \
     -F "clientId=cliente_teste"

3. Verifique:
   a) A resposta JSON contém: success=true, categoria="Contratos", resumo preenchido, redactedFields com CPF e CNPJ
   b) O arquivo existe em: uploads/cliente_teste/Contratos/
   c) O README.md foi criado em: uploads/cliente_teste/README.md
   d) O README contém a linha com os dados do documento

4. Faça um segundo upload do mesmo arquivo e confirme que:
   a) O README tem DUAS linhas (não uma sobrescrevendo a outra)
   b) O segundo arquivo tem nome diferente (sufixo de timestamp)

Me mostre os outputs de cada etapa.
```

---

## PROMPT 4 — Teste de upload de PDF

```
Teste o upload de um PDF real:

1. Baixe um PDF de teste público ou use qualquer PDF que você tenha.
2. Faça upload via curl:
   curl -X POST http://localhost:3000/api/upload \
     -F "file=@/caminho/para/arquivo.pdf;type=application/pdf" \
     -F "clientId=cliente_pdf_teste"

3. Confirme que:
   a) O texto foi extraído (não retornou "[conteúdo não extraível]")
   b) A categoria faz sentido para o conteúdo do PDF
   c) O arquivo foi salvo na pasta correta

Se pdf-parse retornar erro para algum PDF específico, ajuste o tratamento de erro em lib/extractor.ts para ser mais robusto.
```

---

## PROMPT 5 — Validações de segurança

```
Teste as validações de segurança da API:

1. Arquivo muito grande (deve retornar 400):
   dd if=/dev/zero bs=1M count=11 | curl -X POST http://localhost:3000/api/upload \
     -F "file=@-;type=text/plain" -F "clientId=teste"

2. Tipo não permitido (deve retornar 400 com mensagem clara):
   echo "teste" > /tmp/teste.csv
   curl -X POST http://localhost:3000/api/upload \
     -F "file=@/tmp/teste.csv;type=text/csv" \
     -F "clientId=teste"

3. Sem clientId (deve usar "default"):
   echo "teste" > /tmp/teste.txt
   curl -X POST http://localhost:3000/api/upload \
     -F "file=@/tmp/teste.txt;type=text/plain"

Confirme que as mensagens de erro são claras e amigáveis.
Ajuste lib/extractor.ts ou app/api/upload/route.ts se necessário.
```

---

## PROMPT 6 — Polimento de UI

```
Revise a UI em app/page.tsx e aplique os seguintes ajustes se necessário:

1. O campo "ID Cliente" no header deve ter um placeholder visual quando vazio ("Informe o ID do cliente") e mostrar uma borda vermelha sutil se o usuário tentar fazer upload sem preenchê-lo.

2. Quando um arquivo é arrastado para a tela (drag and drop), mostre uma área de drop visual com borda tracejada sobre o chat. Implemente o handler de drag-and-drop na área de messages.

3. Adicione um botão "Ver README do cliente" no header que, ao clicar, faz GET /api/readme?clientId=X e mostra o conteúdo em um modal simples. Crie também a route em app/api/readme/route.ts.

4. Garanta responsividade: em telas < 640px, o campo de clientId no header deve ficar em linha separada abaixo do título.

Faça tudo em um único componente (page.tsx) sem adicionar bibliotecas externas.
```

---

## PROMPT 7 — Route para visualizar README do cliente

```
Crie app/api/readme/route.ts:

export const runtime = "nodejs";

- Método: GET
- Query param: clientId (obrigatório)
- Lê o arquivo uploads/{clientId}/README.md
- Se não existir, retorna { content: null, message: "Nenhum documento processado para este cliente ainda." }
- Se existir, retorna { content: "...conteúdo markdown..." }
- Trate clientId com path traversal protection: rejeite strings que contenham / \ .. ou caracteres especiais (use regex /^[a-zA-Z0-9_\-]+$/)
- Status 400 para clientId inválido ou ausente
- Status 200 com o conteúdo
```

---

## PROMPT 8 — Preparação para deploy (Vercel)

```
Prepare o projeto para deploy na Vercel:

1. Confirme que next.config.js tem serverComponentsExternalPackages: ["pdf-parse"]

2. Crie vercel.json na raiz:
{
  "functions": {
    "app/api/upload/route.ts": {
      "maxDuration": 30
    }
  }
}

3. IMPORTANTE: Na Vercel, o sistema de arquivos é read-only exceto /tmp.
   Modifique lib/storage.ts para usar process.env.UPLOADS_ROOT ?? path.join(process.cwd(), "uploads")
   e adicione ao vercel.json a env var UPLOADS_ROOT=/tmp/uploads

4. Adicione ao README.md uma seção "Deploy" com as instruções:
   - Como fazer deploy na Vercel
   - Quais variáveis de ambiente configurar (ANTHROPIC_API_KEY)
   - Aviso sobre persistência de arquivos (/tmp é efêmero na Vercel — para produção real, usar S3/R2/Supabase Storage)

5. Rode npm run build e confirme 0 erros.
```

---

## PROMPT 9 — Melhorias opcionais (bônus)

```
Implemente estas melhorias para deixar o projeto com cara de produção:

1. Rate limiting simples: limite de 20 uploads por IP por hora usando um Map em memória em lib/rate-limiter.ts. Aplique no route de upload retornando 429 se excedido.

2. Logging estruturado: crie lib/logger.ts que loga em JSON cada operação: { timestamp, clientId, filename, categoria, durationMs, redactedFields }. Use no route de upload.

3. Health check: crie app/api/health/route.ts que retorna { status: "ok", timestamp, version: "1.0.0" }.

4. Adicione ao header da UI um indicador de status da API (verde/vermelho) que faz GET /api/health a cada 30 segundos.

Mantenha tudo tipado e sem any.
```

---

## Notas gerais para o Claude Code

- **Nunca** adicione `console.log` com dados de documentos em produção (LGPD).
- O arquivo `.env.local` **nunca** deve ser commitado.
- A pasta `uploads/` **nunca** deve ser commitada (dados de clientes).
- Se precisar adicionar dependências, use `npm install --save` e confirme que `package.json` foi atualizado.
- Sempre rode `npm run build` depois de mudanças estruturais para confirmar que não há erros de TypeScript.
