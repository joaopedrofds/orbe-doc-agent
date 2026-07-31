export interface LogEntry {
  timestamp: string;
  action: "upload" | "error" | "rate_limited";
  clientId?: string;
  filename?: string;
  categoria?: string;
  durationMs?: number;
  redactedFields?: string[];
  duplicate?: boolean;
  error?: string;
  ip?: string;
}

export function logEvent(entry: LogEntry): void {
  // Em produção, isso enviaria para um serviço de logging (Datadog, Logtail, etc.)
  // Aqui usamos stdout com JSON para ser capturado pelo runtime da Vercel ou Docker.
  console.log(JSON.stringify(entry));
}