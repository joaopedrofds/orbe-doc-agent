# Orbe Doc Agent

Agente de IA para organização automática de documentos contábeis da Orbe Contábil.

## Como rodar

### Pré-requisitos
- Node.js 18+
- Chave de API da Anthropic

### Instalação

```bash
# 1. Instale as dependências
npm install

# 2. Configure a chave de API
cp .env.local.example .env.local
# Edite .env.local e coloque sua ANTHROPIC_API_KEY

# 3. Rode o servidor de desenvolvimento
npm run dev
```

Acesse: http://localhost:3000

### Build para produção

```bash
npm run build
npm start
```

---

## Modelo de IA escolhido: `gpt-4o`

### Justificativa

A tarefa consiste em classificar um documento em 5 categorias fixas e gerar um resumo de 1 linha. O **gpt-4o** foi escolhido por combinar suporte nativo a Vision (imagens), `response_format: json_object` (elimina erros de parse), latência baixa e custo competitivo para uso em produção.

| Modelo | Latência média | Custo input | Custo output |
|--------|---------------|-------------|--------------|
| gpt-4o | ~1–3s | $2,50/1M tokens | $10,00/1M tokens |
| gpt-4o-mini | ~1–2s | $0,15/1M tokens | $0,60/1M tokens |
| gpt-4-turbo | ~3–6s | $10,00/1M tokens | $30,00/1M tokens |

### Custo estimado por documento

- Input médio: ~500 tokens (texto extraído + system prompt)
- Output médio: ~80 tokens (JSON com categoria + resumo)
- **Custo por documento: ~$0,0013** (gpt-4o) ou **~$0,00008** (gpt-4o-mini)
- Para 1.000 documentos/mês com gpt-4o: **~$1,30**
- Para 10.000 documentos/mês com gpt-4o: **~$13,00**

gpt-4o foi preferido sobre gpt-4o-mini por oferecer melhor precisão na classificação de documentos contábeis e suporte robusto a OCR de imagens via Vision.

---

## LGPD

O sistema segue as diretrizes da Lei Geral de Proteção de Dados (Lei 13.709/2018):

1. **Minimização de dados**: apenas o texto necessário para classificação é enviado à API.
2. **Sanitização antes do envio** (`lib/sanitizer.ts`): CPF, CNPJ, RG, e-mail, telefone e número de cartão são substituídos por placeholders `[CPF]`, `[EMAIL]` etc. antes de qualquer chamada à API externa.
3. **Rastreabilidade**: o campo `redactedFields` na resposta informa quais dados foram protegidos.
4. **Armazenamento local**: os arquivos originais (não sanitizados) ficam apenas no servidor, nunca trafegam para terceiros além do conteúdo de classificação já sanitizado.

---

## Estrutura de arquivos

```
uploads/
└── {clientId}/
    ├── Contratos/
    ├── Financeiro/
    ├── Documentos Pessoais/
    ├── Comprovantes/
    ├── Nao-Classificado/
    └── README.md          ← log append-only de todos os documentos do cliente
```

### Formato do README.md por cliente

```markdown
# Orbe Contábil — Documentos: cliente_001

| Data | Arquivo | Categoria | Resumo |
|------|---------|-----------|--------|
| 31/07/2025 14:22 | contrato_silva.pdf | Contratos | Contrato de prestação de serviços entre João Silva e Orbe Contábil |
| 31/07/2025 14:35 | nf_0042.pdf | Financeiro | Nota fiscal de serviços no valor de R$ 1.200,00, julho/2025 |
```

O arquivo é **sempre adicionado** (append), nunca sobrescrito. O histórico do cliente nunca é perdido.

---

## Deploy na Vercel

### Pré-requisitos

1. Faça push do repositório para o GitHub (ou GitLab/Bitbucket).
2. Acesse [vercel.com](https://vercel.com) e importe o repositório.
3. Configure as variáveis de ambiente no dashboard da Vercel:

| Variável | Valor | Obrigatória |
|----------|-------|-------------|
| `ORBE_OPENAI_KEY` | Sua chave de API da OpenAI | Sim |
| `UPLOADS_ROOT` | `/tmp/uploads` | Não (default) |

> **Nota**: A variável `UPLOADS_ROOT` já tem o valor `/tmp/uploads` configurado no `vercel.json`. Só é necessário sobrescrevê-la se quiser um diretório diferente.

### Deploy via CLI (alternativa)

```bash
npm i -g vercel
vercel --prod
```

O CLI detecta automaticamente as configurações do `vercel.json`.

### Aviso importante sobre persistência

Na Vercel (Serverless Functions), o sistema de arquivos é **read-only** exceto o diretório `/tmp`, que é **efêmero**:

- Arquivos em `/tmp/uploads` são perdidos sempre que a function é reciclada (nova implantação, idle timeout, escala).
- **Para produção real**, substitua o armazenamento local por um serviço externo:
  - **S3** (AWS), **R2** (Cloudflare), **Supabase Storage** ou similar.
  - A classe `lib/storage.ts` pode ser adaptada para usar o SDK do provedor escolhido sem modificar o resto do sistema.

---

## Stack

- **Next.js 14** (App Router, Server Components)
- **TypeScript** (strict mode)
- **Tailwind CSS**
- **openai** (SDK oficial) — chamadas ao gpt-4o
- **pdf-parse** — extração de texto de PDFs
- **uuid** — geração de IDs únicos
- **Jest + ts-jest** — testes automatizados

---

## Arquitetura

```
orbe-doc-agent/
├── app/
│   ├── api/
│   │   ├── upload/route.ts      # POST — recebe 1..N arquivos, classifica, salva
│   │   ├── documents/route.ts   # GET  — lista documentos com filtros
│   │   ├── clients/route.ts     # GET/POST — lista e cadastra clientes
│   │   └── readme/route.ts      # GET  — retorna README.md do cliente
│   └── page.tsx                 # SPA: login → chat + aba documentos
├── lib/
│   ├── sanitizer.ts             # LGPD: redação de CPF, CNPJ, email, tel, RG, cartão
│   ├── extractor.ts             # Extração de texto: PDF (pdf-parse), imagem (Vision), TXT
│   ├── classifier.ts            # gpt-4o: categoriza + gera resumo 1 linha
│   ├── storage.ts               # Salva arquivo, anti-colisão, dedup por hash MD5
│   ├── readme-updater.ts        # Append-only com lock por clientId (anti race condition)
│   └── rate-limiter.ts          # 30 uploads/IP/hora (Map em memória)
├── __tests__/                   # Jest: sanitizer, storage, readme-updater
└── uploads/
    └── {clientId}/
        ├── Contratos/
        ├── Financeiro/
        ├── Documentos Pessoais/
        ├── Comprovantes/
        ├── Nao-Classificado/
        ├── .hashes.json         # Índice MD5 para deduplicação
        └── README.md            # Log append-only de todos os documentos
```

## Fluxo de processamento

```
Upload (1..N arquivos)
        │
        ▼
  Validação (tipo, tamanho, clientId, rate limit)
        │
        ▼
  Extração de texto
  PDF → pdf-parse | Imagem → GPT-4o Vision | TXT → fs.readFile
        │
        ▼
  Sanitização LGPD (lib/sanitizer.ts)
  CPF/CNPJ/RG/email/tel/cartão → placeholders
        │
        ▼
  Deduplicação por hash MD5 (lib/storage.ts)
  ┌─ Duplicata ──→ skip save, marca duplicate: true
  └─ Novo ──────→ salva em uploads/{clientId}/{categoria}/
        │
        ▼
  Classificação gpt-4o (lib/classifier.ts)
  → { categoria, resumo }
        │
        ▼
  Salva metadados ({filename}.meta.json)
        │
        ▼
  Atualiza README.md do cliente (append-only, com lock)
        │
        ▼
  Retorna resultado ao chat
```

## API Reference

### POST /api/upload
Recebe um ou mais documentos e os processa.

**Request:** multipart/form-data
| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| file | File (1..N) | Sim | PDF, JPEG, PNG, WebP ou TXT. Máx 10MB cada |
| clientId | string | Sim | ID do cliente (3-50 chars: letras, números, _ -) |

**Response 200:**
```json
{
  "success": true,
  "results": [{
    "filename": "contrato.pdf",
    "categoria": "Contratos",
    "resumo": "Contrato de prestação de serviços...",
    "caminho": "uploads/joao/Contratos/contrato.pdf",
    "redactedFields": ["CPF"],
    "duplicate": false
  }]
}
```

**Erros:** 400 (validação), 409 (duplicata), 429 (rate limit), 500 (erro interno)

### GET /api/documents
Lista documentos com filtros opcionais.

**Query params:**
| Param | Tipo | Descrição |
|-------|------|-----------|
| clientId | string | "todos" para todos os clientes |
| categoria | string | Filtra por categoria específica |
| search | string | Busca por nome de arquivo (case-insensitive) |

### GET /api/clients
Lista todos os clientIds cadastrados.

### POST /api/clients
Cadastra novo cliente.
**Body:** `{ "clientId": "nome_do_cliente" }`
**Errors:** 400 (inválido), 409 (já existe)

### GET /api/readme
Retorna o README.md de um cliente.
**Query:** `?clientId=joao_silva`

## Segurança e LGPD

| Medida | Implementação |
|--------|---------------|
| Redação de dados pessoais | lib/sanitizer.ts — antes de qualquer chamada à API externa |
| Path traversal | clientId validado com /^[a-zA-Z0-9_\-]{3,50}$/ em todas as routes |
| Rate limiting | 30 uploads/IP/hora via Map em memória (lib/rate-limiter.ts) |
| Dados no servidor | Arquivos originais nunca trafegam para terceiros |
| .gitignore | uploads/ e .env.local nunca commitados |

## Testes

```bash
npm test               # Roda todos os testes
npm run test:coverage  # Cobertura de código
```

Cobertura atual:
- lib/sanitizer.ts — 100%
- lib/storage.ts — deduplicação e anti-colisão
- lib/readme-updater.ts — append, race condition com 5 uploads simultâneos

## Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| ORBE_OPENAI_KEY | Sim | Chave da OpenAI (gpt-4o) — obter em platform.openai.com/api-keys |
| OPENAI_API_KEY | Não | Fallback caso ORBE_OPENAI_KEY não esteja definida |
| UPLOADS_ROOT | Não | Caminho absoluto para pasta de uploads (padrão: ./uploads) |

## Decisões técnicas

| Decisão | Alternativa considerada | Motivo da escolha |
|---------|------------------------|-------------------|
| gpt-4o | claude-haiku, gpt-4o-mini | Vision nativa + json_object garante parse seguro |
| pdf-parse | pdfjs-dist | Mais leve, sem dependências nativas, suficiente para extração de texto |
| Lock por Promise chain | Mutex library | Zero dependências, resolve o caso de uso específico |
| Hash MD5 para dedup | SHA-256 | Velocidade — colisão acidental é improvável para documentos contábeis |
| App Router Next.js 14 | Pages Router | Server Components, route handlers nativos, melhor DX |

## Limitações conhecidas

| Limitação | Impacto | Contorno recomendado para produção |
|-----------|---------|-------------------------------------|
| Storage efêmero na Vercel | Arquivos perdidos a cada redeploy | Substituir lib/storage.ts por S3/R2/Supabase Storage |
| Rate limit em memória | Reinicia com o servidor; não funciona em múltiplas instâncias | Substituir por Redis (Upstash) |
| OCR de imagens via GPT-4o Vision | Custo maior que texto (~3–5x mais tokens); imagens muito baixa resolução podem falhar | Pré-processar imagens com sharp antes de enviar |
| PDF com texto escaneado (imagem dentro de PDF) | pdf-parse não extrai texto; retorna string vazia | Converter página do PDF para imagem e reenviar via Vision |
| Sem autenticação real | clientId é apenas uma string sem senha — qualquer pessoa que saiba o ID acessa os documentos | Implementar auth (NextAuth, Clerk, Supabase Auth) antes de expor publicamente |
| Lock de README em memória | Mesmo problema do rate limit: não funciona em múltiplas instâncias Node | Usar file lock com proper-lockfile ou operações atômicas no storage object |
| Classificação limitada a 5 categorias fixas | Documentos híbridos (ex: contrato com NF anexa) caem em Nao-Classificado | Permitir múltiplas categorias por documento em versões futuras |
| Sem versionamento de documentos | Novo upload substitui o anterior (com sufixo de timestamp) sem histórico de versões | Implementar versionamento explícito com metadados de versão |

