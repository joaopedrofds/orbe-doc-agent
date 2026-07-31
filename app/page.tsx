"use client";

import { useState, useRef, useEffect, useCallback } from "react";

const CLIENT_ID_RE = /^[a-zA-Z0-9_\-]+$/;
const MIN_CLIENT_ID_LENGTH = 3;

type Categoria =
  | "Contratos"
  | "Financeiro"
  | "Documentos Pessoais"
  | "Comprovantes"
  | "Nao-Classificado";

const ALL_CATEGORIES: Categoria[] = [
  "Contratos",
  "Financeiro",
  "Documentos Pessoais",
  "Comprovantes",
  "Nao-Classificado",
];

interface AssistantResult {
  filename: string;
  categoria: Categoria;
  resumo: string;
  caminho: string;
  redactedFields: string[];
  duplicate: boolean;
  duplicateOf?: string;
}

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  text?: string;
  result?: AssistantResult;
  results?: AssistantResult[];
  error?: string;
  loading?: boolean;
}

const CATEGORY_STYLES: Record<Categoria, { bg: string; text: string; dot: string }> = {
  Contratos: { bg: "bg-blue-900/40", text: "text-blue-300", dot: "bg-blue-400" },
  Financeiro: { bg: "bg-emerald-900/40", text: "text-emerald-300", dot: "bg-emerald-400" },
  "Documentos Pessoais": { bg: "bg-purple-900/40", text: "text-purple-300", dot: "bg-purple-400" },
  Comprovantes: { bg: "bg-orange-900/40", text: "text-orange-300", dot: "bg-orange-400" },
  "Nao-Classificado": { bg: "bg-gray-800/40", text: "text-gray-400", dot: "bg-gray-500" },
};

function CategoryBadge({ categoria }: { categoria: Categoria }) {
  const s = CATEGORY_STYLES[categoria];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {categoria}
    </span>
  );
}

function FileIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function PaperclipIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

function AssistantMessage({ msg }: { msg: Message }) {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (!msg.loading) return;
    const interval = setInterval(() => {
      setStepIndex((prev) => (prev < LOADING_STEPS.length - 1 ? prev + 1 : prev));
    }, 2000);
    return () => clearInterval(interval);
  }, [msg.loading]);

  if (msg.loading) {
    return (
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-orbe-accent flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">
          OC
        </div>
        <div className="bg-orbe-surface border border-orbe-border rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm min-w-[220px]">
          <div className="flex flex-col gap-1.5">
            {LOADING_STEPS.map((step, i) => (
              <div
                key={step}
                className={`flex items-center gap-2 text-sm transition-opacity duration-500 ${
                  i === stepIndex
                    ? "opacity-100 text-orbe-textPrimary"
                    : i < stepIndex
                    ? "opacity-40 text-orbe-textSecondary"
                    : "opacity-20 text-orbe-textSecondary"
                }`}
              >
                {i < stepIndex ? (
                  <svg className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : i === stepIndex ? (
                  <span className="w-3.5 h-3.5 border-2 border-orbe-accent border-t-transparent rounded-full animate-spin flex-shrink-0" />
                ) : (
                  <span className="w-3.5 h-3.5 flex-shrink-0" />
                )}
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (msg.error) {
    return (
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-orbe-accent flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">
          OC
        </div>
        <div className="bg-red-900/30 border border-red-800/50 rounded-2xl rounded-tl-sm px-4 py-3 max-w-lg">
          <p className="text-red-300 text-sm">{msg.error}</p>
        </div>
      </div>
    );
  }

  if (msg.results) {
    return (
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-orbe-accent flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">
          OC
        </div>
        <div className="flex flex-col gap-2 min-w-0">
          {msg.results.map((r, idx) => (
            <div key={idx} className="bg-orbe-surface border border-orbe-border rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm max-w-lg">
              <div className="flex items-center gap-2 mb-2">
                <FileIcon />
                <span className="text-sm font-medium text-orbe-textPrimary truncate max-w-xs">{r.filename}</span>
                {r.duplicate && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-900/40 text-amber-300">
                    ⚠ Duplicata
                  </span>
                )}
              </div>
              <div className="mb-2">
                <CategoryBadge categoria={r.categoria} />
              </div>
              <p className="text-sm text-orbe-textSecondary leading-relaxed mb-2">{r.resumo}</p>
              {r.duplicate && r.duplicateOf && (
                <p className="text-xs text-amber-400 mb-2">Arquivo já existe como: {r.duplicateOf}</p>
              )}
              {r.redactedFields.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-300 bg-emerald-900/30 px-2.5 py-1.5 rounded-lg">
                  <ShieldIcon />
                  <span>Dados protegidos (LGPD): {r.redactedFields.join(", ")}</span>
                </div>
              )}
              <p className="text-xs text-gray-500 mt-2 font-mono truncate">{r.caminho}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (msg.result) {
    const r = msg.result;
    return (
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-orbe-accent flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">
          OC
        </div>
        <div className="bg-orbe-surface border border-orbe-border rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm max-w-lg">
          <div className="flex items-center gap-2 mb-2">
            <FileIcon />
            <span className="text-sm font-medium text-orbe-textPrimary truncate max-w-xs">{r.filename}</span>
          </div>
          <div className="mb-2">
            <CategoryBadge categoria={r.categoria} />
          </div>
          <p className="text-sm text-orbe-textSecondary leading-relaxed mb-2">{r.resumo}</p>
          {r.redactedFields.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-300 bg-emerald-900/30 px-2.5 py-1.5 rounded-lg">
              <ShieldIcon />
              <span>Dados protegidos (LGPD): {r.redactedFields.join(", ")}</span>
            </div>
          )}
          <p className="text-xs text-gray-500 mt-2 font-mono truncate">{r.caminho}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-full bg-orbe-navy flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">
        OC
      </div>
      <div className="bg-orbe-surface border border-orbe-border rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm max-w-lg">
        <p className="text-sm text-orbe-textPrimary">{msg.text}</p>
      </div>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function ReadmeModal({
  clientId,
  onClose,
}: {
  clientId: string;
  onClose: () => void;
}) {
  const [content, setContent] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/readme?clientId=${encodeURIComponent(clientId)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.content) {
          setContent(data.content);
        } else {
          setMessage(data.message ?? "Nenhum conteúdo encontrado.");
        }
      })
      .catch(() => setMessage("Erro ao carregar README."))
      .finally(() => setLoading(false));
  }, [clientId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      {/* Modal */}
      <div className="relative bg-orbe-surface rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col border border-orbe-border">
        <div className="flex items-center justify-between px-5 py-4 border-b border-orbe-border">
          <h2 className="text-sm font-semibold text-orbe-textPrimary">
            README — {clientId}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-gray-500 hover:text-orbe-textSecondary transition-colors"
          >
            <CloseIcon />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-5">
          {loading ? (
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
              <span>Carregando…</span>
            </div>
          ) : message ? (
            <p className="text-sm text-orbe-textSecondary">{message}</p>
          ) : (
            <pre className="text-sm text-orbe-textPrimary whitespace-pre-wrap font-sans leading-relaxed">
              {content}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

function LogoutIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  );
}

function LoginScreen({ onLogin }: { onLogin: (id: string) => void }) {
  const [selected, setSelected] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"select" | "create">("select");
  const [clients, setClients] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [newClientId, setNewClientId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fechar gaveta ao clicar fora
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  // Fechar gaveta com Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen]);

  const openDrawer = async () => {
    setIsOpen(true);
    setError(null);
    setSearch("");
    setMode("select");
    try {
      const res = await fetch("/api/clients");
      const data = await res.json();
      setClients(data.clients ?? []);
    } catch {
      setClients([]);
    }
  };

  const filteredClients = clients.filter((c) =>
    c.toLowerCase().includes(search.toLowerCase())
  );

  const isNewIdValid = /^[a-zA-Z0-9_\-]{3,50}$/.test(newClientId);

  const handleSelect = (id: string) => {
    setSelected(id);
    setIsOpen(false);
    setError(null);
  };

  const handleCreate = async () => {
    if (!isNewIdValid) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: newClientId.trim() }),
      });
      if (res.status === 409) {
        setError("Este ID já está cadastrado.");
        return;
      }
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Erro ao cadastrar.");
        return;
      }
      handleSelect(newClientId.trim());
    } catch {
      setError("Erro de conexão.");
    } finally {
      setLoading(false);
    }
  };

  const valid = selected.length >= 3 && /^[a-zA-Z0-9_\-]+$/.test(selected);

  return (
    <div className="flex flex-col h-screen bg-orbe-bg">
      {/* Logo no topo */}
      <div className="flex-shrink-0 flex justify-center pt-12 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-orbe-textPrimary">Orbe Contábil</h1>
      </div>

      {/* Card central */}
      <div className="flex-1 flex items-center justify-center px-4 -mt-16">
        <div className="bg-orbe-surface rounded-2xl p-8 w-full max-w-sm shadow-2xl border border-orbe-border">
          <h2 className="text-lg font-semibold text-orbe-textPrimary mb-1">Identificação</h2>
          <p className="text-sm text-orbe-textSecondary mb-6">Selecione ou cadastre um cliente</p>

          <div className="relative" ref={dropdownRef}>
            {/* Trigger */}
            <div
              onClick={openDrawer}
              className="w-full bg-orbe-bg border border-orbe-border text-sm rounded-xl px-4 py-3 flex items-center justify-between cursor-pointer transition-colors hover:border-orbe-accent/50"
            >
              <span className={selected ? "text-orbe-textPrimary" : "text-gray-500"}>
                {selected || "Selecione ou cadastre um cliente..."}
              </span>
              <svg
                className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            {/* Gaveta */}
            {isOpen && (
              <div className="absolute z-50 mt-2 w-full bg-[#16161F] border border-[#2A2A3A] rounded-xl shadow-2xl overflow-hidden">
                {mode === "select" ? (
                  <>
                    {/* Busca */}
                    <div className="p-2">
                      <div className="relative">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                          type="text"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          placeholder="Buscar cliente..."
                          className="w-full bg-[#0D0D14] border border-[#2A2A3A] text-sm text-[#F1F5F9] placeholder-gray-500 rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent"
                          autoFocus
                        />
                      </div>
                    </div>

                    {/* Lista de clientes */}
                    {clients.length > 0 && filteredClients.length > 0 ? (
                      <div className="max-h-48 overflow-y-auto">
                        {filteredClients.map((cid) => (
                          <div
                            key={cid}
                            onClick={() => handleSelect(cid)}
                            className="flex items-center gap-2 px-3 py-2.5 text-sm text-[#F1F5F9] hover:bg-[#2A2A3A] cursor-pointer transition-colors"
                          >
                            <span>👤</span> {cid}
                          </div>
                        ))}
                      </div>
                    ) : clients.length > 0 && search.length >= 3 ? (
                      <div className="p-3">
                        <button
                          onClick={() => { setMode("create"); setNewClientId(search); }}
                          className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-sm font-medium rounded-lg px-4 py-2.5 transition-colors"
                        >
                          + Cadastrar &apos;{search}&apos;
                        </button>
                      </div>
                    ) : clients.length === 0 ? (
                      <div className="p-4 text-center">
                        <p className="text-sm text-[#94A3B8] mb-3">Nenhum cliente cadastrado ainda.</p>
                        <button
                          onClick={() => { setMode("create"); setNewClientId(""); }}
                          className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-sm font-medium rounded-lg px-4 py-2.5 transition-colors"
                        >
                          + Novo cliente
                        </button>
                      </div>
                    ) : (
                      <div className="p-3 text-center text-sm text-[#94A3B8]">
                        Nenhum resultado para &quot;{search}&quot;
                      </div>
                    )}
                  </>
                ) : (
                  /* MODO CREATE */
                  <div className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setMode("select")}
                        className="text-sm text-[#94A3B8] hover:text-[#F1F5F9] transition-colors"
                      >
                        ← Voltar
                      </button>
                      <span className="text-sm font-medium text-[#F1F5F9]">Novo cliente</span>
                    </div>

                    <div>
                      <input
                        type="text"
                        value={newClientId}
                        onChange={(e) => setNewClientId(e.target.value)}
                        placeholder="ID do cliente"
                        className={`w-full bg-[#0D0D14] border text-sm text-[#F1F5F9] placeholder-gray-500 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:border-transparent transition-colors ${
                          newClientId.length > 0
                            ? isNewIdValid
                              ? "border-green-600 focus:ring-green-600"
                              : "border-red-500 focus:ring-red-500"
                            : "border-[#2A2A3A] focus:ring-[#7C3AED]"
                        }`}
                        autoFocus
                      />
                      {newClientId.length > 0 && !isNewIdValid && (
                        <p className="text-red-400 text-xs mt-1 ml-1">
                          Use 3-50 caracteres: letras, números, _ ou -
                        </p>
                      )}
                    </div>

                    {error && (
                      <p className="text-red-400 text-xs">{error}</p>
                    )}

                    <button
                      onClick={handleCreate}
                      disabled={!isNewIdValid || loading}
                      className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] disabled:bg-[#7C3AED]/40 disabled:text-gray-500 text-white text-sm font-medium rounded-lg px-4 py-2.5 transition-colors"
                    >
                      {loading ? "Cadastrando..." : "Cadastrar"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            onClick={() => { setMode("create"); setNewClientId(""); setError(null); setIsOpen(true); }}
            className="mt-3 w-full bg-orbe-accent hover:bg-orbe-accentHover disabled:bg-orbe-accent/40 disabled:text-gray-500 text-white font-medium text-sm rounded-xl px-4 py-2.5 transition-colors"
          >
            + Cadastrar cliente
          </button>

          <button
            onClick={() => onLogin(selected)}
            disabled={!valid}
            className="mt-4 w-full bg-orbe-accent hover:bg-orbe-accentHover disabled:bg-orbe-accent/40 disabled:text-gray-500 text-white font-medium text-sm rounded-xl px-4 py-3 transition-colors"
          >
            Entrar
          </button>
        </div>
      </div>
    </div>
  );
}

function DropOverlay({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
      <div className="w-[calc(100%-2rem)] h-[calc(100%-2rem)] border-2 border-dashed border-orbe-accent rounded-3xl bg-blue-50/80 flex flex-col items-center justify-center gap-3">
        <svg className="w-12 h-12 text-orbe-accent/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <p className="text-orbe-accent font-medium text-lg">Solte o arquivo aqui</p>
        <p className="text-orbe-accent/60 text-sm">PDF · Imagens · TXT (máx. 10MB)</p>
      </div>
    </div>
  );
}

interface DocItem {
  filename: string;
  categoria: string;
  caminho: string;
  modifiedAt: string;
  clientId: string;
  resumo: string | null;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const DUPLICATA_RE = /^\[DUPLICATA de .*?\]\s*/;

function SkeletonCard() {
  return (
    <div className="bg-orbe-surface border border-orbe-border rounded-2xl p-4 animate-pulse">
      <div className="h-5 w-24 bg-gray-800/60 rounded-full mb-3" />
      <div className="h-4 w-3/4 bg-gray-800/40 rounded mb-2" />
      <div className="h-3 w-1/2 bg-gray-800/30 rounded mb-2" />
      <div className="h-3 w-2/3 bg-gray-800/30 rounded" />
    </div>
  );
}

function DocumentsTab({ clientId }: { clientId: string }) {
  const [documents, setDocuments] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoria, setCategoria] = useState("");
  const [clientFilter, setClientFilter] = useState("todos");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Extrai lista única de clientIds dos documentos retornados
  const availableClients = Array.from(new Set(documents.map((d) => d.clientId))).sort();

  const fetchDocuments = useCallback(
    async (q: string, cat: string, cf: string) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ clientId: cf });
        if (cat) params.set("categoria", cat);
        if (q) params.set("search", q);
        const res = await fetch(`/api/documents?${params}`);
        const data = await res.json();
        setDocuments(data.documents ?? []);
      } catch {
        setDocuments([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Fetch inicial / mudança de filtro
  useEffect(() => {
    fetchDocuments("", "", clientFilter);
  }, [clientFilter, fetchDocuments]);

  // Debounce no search + categoria
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchDocuments(search, categoria, clientFilter);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, categoria, clientFilter, fetchDocuments]);

  return (
    <div className="max-w-3xl mx-auto">
      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome do arquivo..."
          className="flex-1 bg-orbe-bg border border-orbe-border rounded-xl px-4 py-2.5 text-sm text-orbe-textPrimary placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orbe-accent focus:border-transparent"
        />
        <select
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          className="bg-orbe-bg border border-orbe-border rounded-xl px-4 py-2.5 text-sm text-orbe-textPrimary focus:outline-none focus:ring-2 focus:ring-orbe-accent focus:border-transparent min-w-[180px]"
        >
          <option value="">Todas as categorias</option>
          {ALL_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <select
          value={clientFilter}
          onChange={(e) => setClientFilter(e.target.value)}
          className="bg-orbe-bg border border-orbe-border rounded-xl px-4 py-2.5 text-sm text-orbe-textPrimary focus:outline-none focus:ring-2 focus:ring-orbe-accent focus:border-transparent min-w-[150px]"
        >
          <option value="todos">Todos os clientes</option>
          {availableClients.map((cid) => (
            <option key={cid} value={cid}>{cid}</option>
          ))}
        </select>
      </div>

      {/* Grid de documentos */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-orbe-textSecondary text-sm">Nenhum documento encontrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {documents.map((doc, i) => (
            <div key={`${doc.caminho}-${i}`} className="bg-orbe-surface border border-orbe-border rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <CategoryBadge categoria={doc.categoria as Categoria} />
                {doc.resumo && DUPLICATA_RE.test(doc.resumo) && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-900/40 text-amber-300">
                    ⚠ Duplicata
                  </span>
                )}
                {doc.clientId && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-[#2A2A3A] text-[#94A3B8]">
                    👤 {doc.clientId}
                  </span>
                )}
              </div>
              <p className="text-sm font-medium text-orbe-textPrimary truncate mb-1">{doc.filename}</p>
              {doc.resumo && (
                <p className="text-xs text-orbe-textSecondary leading-relaxed mb-1 line-clamp-2">{doc.resumo.replace(DUPLICATA_RE, "")}</p>
              )}
              <p className="text-xs text-orbe-textSecondary mb-1">{formatDate(doc.modifiedAt)}</p>
              <p className="text-xs text-gray-500 font-mono truncate">{doc.caminho}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface ToastState {
  visible: boolean;
  message: string;
  type: "success" | "error";
}

const LOADING_STEPS = [
  "Lendo documento…",
  "Protegendo dados sensíveis…",
  "Classificando com IA…",
  "Salvando…",
];

const INITIAL_MESSAGES: Message[] = [
  {
    id: "welcome",
    role: "assistant",
    text: "Olá! Sou o assistente de organização da Orbe Contábil. Envie um documento (PDF, imagem ou TXT) e eu vou classificá-lo e organizá-lo automaticamente.",
  },
];

function ToastNotification({ toast }: { toast: ToastState }) {
  useEffect(() => {
    if (!toast.visible) return;
    const timer = setTimeout(() => {
      // dispara transição de saída via estado global
    }, 3000);
    return () => clearTimeout(timer);
  }, [toast.visible]);

  if (!toast.visible) return null;

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border transition-all duration-300 ${
        toast.type === "success"
          ? "bg-emerald-900/80 border-emerald-700/50 text-emerald-100"
          : "bg-red-900/80 border-red-700/50 text-red-100"
      }`}
      style={{ animation: "toast-in 0.3s ease-out" }}
    >
      <span className="text-sm font-medium">{toast.message}</span>
    </div>
  );
}

export default function Page() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "documentos">("chat");
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [clientId, setClientId] = useState("");
  const [textInput, setTextInput] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [showReadme, setShowReadme] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [apiStatus, setApiStatus] = useState<"ok" | "error" | "checking">("checking");
  const [toast, setToast] = useState<ToastState>({ visible: false, message: "", type: "success" });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const dragCounter = useRef(0);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: "", type: "success" }), 3000);
  };

  useEffect(() => {
    const saved = localStorage.getItem("orbe_client_id");
    if (saved) {
      setClientId(saved);
      setLoggedIn(true);
    }
  }, []);

  const handleLogin = (id: string) => {
    localStorage.setItem("orbe_client_id", id);
    setClientId(id);
    setLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("orbe_client_id");
    setClientId("");
    setLoggedIn(false);
    setMessages(INITIAL_MESSAGES);
    setShowReadme(false);
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Health check a cada 30s
  useEffect(() => {
    function check() {
      fetch("/api/health")
        .then((r) => r.json())
        .then((d) => setApiStatus(d.status === "ok" ? "ok" : "error"))
        .catch(() => setApiStatus("error"));
    }
    check();
    const interval = setInterval(check, 30_000);
    return () => clearInterval(interval);
  }, []);

  const getInitial = (id: string) => id.trim().charAt(0).toUpperCase() || "?";

  const addMessage = (msg: Omit<Message, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setMessages((prev) => [...prev, { ...msg, id }]);
    return id;
  };

  const updateMessage = (id: string, patch: Partial<Message>) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  };

  const handleUpload = useCallback(
    async (files: File[]) => {
      if (!clientId.trim()) {
        addMessage({ role: "system", error: "Informe o ID do cliente antes de enviar." });
        return;
      }

      const nomes = files.map((f) => f.name).join(", ");
      const tamanho = files.reduce((acc, f) => acc + f.size, 0);
      const tamanhoStr =
        tamanho > 1024 * 1024
          ? `${(tamanho / 1024 / 1024).toFixed(1)} MB`
          : `${Math.round(tamanho / 1024)} KB`;
      addMessage({
        role: "user",
        text:
          files.length === 1
            ? `📎 ${files[0].name} · ${tamanhoStr}`
            : `📎 ${files.length} arquivos · ${tamanhoStr}\n${nomes}`,
      });

      const loadingId = addMessage({ role: "assistant", loading: true });
      setIsUploading(true);

      try {
        const fd = new FormData();
        files.forEach((f) => fd.append("file", f));
        fd.append("clientId", clientId.trim());

        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const data = await res.json();

        if (!res.ok || data.error) {
          const errMsg = data.error ?? "Erro ao processar documentos.";
          updateMessage(loadingId, { loading: false, error: errMsg });
          showToast(errMsg, "error");
        } else {
          updateMessage(loadingId, { loading: false, results: data.results });
          const qtd = data.results?.length ?? 1;
          showToast(`${qtd} documento${qtd > 1 ? "s" : ""} processado${qtd > 1 ? "s" : ""}.`, "success");
        }
      } catch {
        const errMsg = "Erro de conexão. Verifique sua internet.";
        updateMessage(loadingId, { loading: false, error: errMsg });
        showToast(errMsg, "error");
      } finally {
        setIsUploading(false);
      }
    },
    [clientId]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) handleUpload(files);
    e.target.value = "";
  };

  const handleSendText = () => {
    if (!textInput.trim()) return;
    addMessage({ role: "user", text: textInput });
    setTextInput("");
    setTimeout(() => {
      addMessage({
        role: "assistant",
        text: "Por enquanto só processo documentos. Envie um PDF, imagem (JPEG/PNG/WebP) ou arquivo TXT.",
      });
    }, 400);
  };

  // --- Drag and drop handlers ---
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current = 0;
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files ?? []);
      if (files.length > 0) handleUpload(files);
    },
    [handleUpload]
  );

  if (!loggedIn) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="flex flex-col h-screen bg-orbe-bg">
      {/* Header */}
      <header className="bg-orbe-surface border-b border-orbe-border px-6 py-4 flex-shrink-0">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-orbe-textPrimary">Orbe Contábil</h1>
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  apiStatus === "ok"
                    ? "bg-green-400"
                    : apiStatus === "error"
                    ? "bg-red-400"
                    : "bg-yellow-400 animate-pulse"
                }`}
                title={
                  apiStatus === "ok"
                    ? "API online"
                    : apiStatus === "error"
                    ? "API offline"
                    : "Verificando…"
                }
              />
            </div>
            <p className="text-orbe-textSecondary text-xs mt-0.5">Organizador Inteligente de Documentos</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowReadme(true)}
              title="Ver README do cliente"
              className="text-xs bg-orbe-accent/10 hover:bg-orbe-accent/20 text-orbe-accent border border-orbe-accent/30 rounded-lg px-2.5 py-1.5 transition-colors whitespace-nowrap"
            >
              README
            </button>
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                style={{ backgroundColor: "#7C3AED" }}
                title={clientId}
              >
                {getInitial(clientId)}
              </div>
              <span className="text-sm text-orbe-textSecondary hidden sm:inline">{clientId}</span>
              <button
                onClick={handleLogout}
                title="Sair"
                className="p-1.5 rounded-lg hover:bg-white/5 text-gray-500 hover:text-orbe-textSecondary transition-colors"
              >
                <LogoutIcon />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tab navigation */}
      <div className="bg-orbe-surface border-b border-orbe-border px-6 flex-shrink-0">
        <div className="max-w-3xl mx-auto flex gap-6">
          <button
            onClick={() => setActiveTab("chat")}
            className={`text-sm font-medium py-3 border-b-2 transition-colors ${
              activeTab === "chat"
                ? "text-orbe-textPrimary border-orbe-accent"
                : "text-orbe-textSecondary border-transparent hover:text-orbe-textPrimary"
            }`}
          >
            Chat
          </button>
          <button
            onClick={() => setActiveTab("documentos")}
            className={`text-sm font-medium py-3 border-b-2 transition-colors ${
              activeTab === "documentos"
                ? "text-orbe-textPrimary border-orbe-accent"
                : "text-orbe-textSecondary border-transparent hover:text-orbe-textPrimary"
            }`}
          >
            Documentos
          </button>
        </div>
      </div>

      {/* Content area */}
      {activeTab === "chat" ? (
        <>
          <main
            className="flex-1 overflow-y-auto px-4 py-6 relative bg-orbe-bg"
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <DropOverlay visible={isDragging} />
            <div className="max-w-3xl mx-auto space-y-4">
              {messages.map((msg) =>
                msg.role === "user" ? (
                  <div key={msg.id} className="flex justify-end">
                    <div className="bg-orbe-accent text-white rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-sm shadow-sm">
                      <p className="text-sm">{msg.text}</p>
                    </div>
                  </div>
                ) : (
                  <AssistantMessage key={msg.id} msg={msg} />
                )
              )}
              <div ref={bottomRef} />
            </div>
          </main>

          {/* Input area */}
          <footer className="bg-orbe-surface border-t border-orbe-border px-4 py-3 flex-shrink-0">
            <div className="max-w-3xl mx-auto flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                multiple
                accept=".pdf,.txt,image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                title="Enviar documento"
                className="p-2.5 rounded-xl text-gray-500 hover:text-orbe-textPrimary hover:bg-white/5 transition-colors disabled:opacity-40"
              >
                <PaperclipIcon />
              </button>
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendText()}
                placeholder="Envie um documento ou escreva uma mensagem…"
                className="flex-1 bg-orbe-bg border border-orbe-border rounded-xl px-4 py-2.5 text-sm text-orbe-textPrimary placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orbe-accent focus:border-transparent"
              />
              <button
                onClick={handleSendText}
                disabled={!textInput.trim() || isUploading}
                className="bg-orbe-accent text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-orbe-accentHover transition-colors disabled:opacity-40"
              >
                Enviar
              </button>
            </div>
            <p className="max-w-3xl mx-auto text-xs text-gray-500 mt-2 text-center">
              Documentos aceitos: PDF · JPEG · PNG · WebP · TXT · Máx. 10MB
            </p>
          </footer>
        </>
      ) : (
        <main className="flex-1 overflow-y-auto px-4 py-6 relative bg-orbe-bg">
          <DocumentsTab clientId={clientId} />
        </main>
      )}

      {/* README Modal */}
      {showReadme && (
        <ReadmeModal
          clientId={clientId.trim() || "default"}
          onClose={() => setShowReadme(false)}
        />
      )}

      {/* Toast */}
      <ToastNotification toast={toast} />
    </div>
  );
}