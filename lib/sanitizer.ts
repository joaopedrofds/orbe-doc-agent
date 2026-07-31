// LGPD: este módulo redige dados pessoais antes de enviá-los a APIs externas.

export interface SanitizationResult {
  sanitized: string;
  redactedFields: string[];
}

const PATTERNS: Array<{ label: string; regex: RegExp; placeholder: string }> = [
  {
    label: "CPF",
    regex: /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g,
    placeholder: "[CPF]",
  },
  {
    label: "CNPJ",
    regex: /\b\d{2}\.?\d{3}\.?\d{3}\/?0001-?\d{2}\b|\b\d{14}\b/g,
    placeholder: "[CNPJ]",
  },
  {
    label: "RG",
    regex: /\b\d{1,2}\.?\d{3}\.?\d{3}-?[\dxX]\b/g,
    placeholder: "[RG]",
  },
  {
    label: "EMAIL",
    regex: /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g,
    placeholder: "[EMAIL]",
  },
  {
    label: "TELEFONE",
    regex: /(\(?\d{2}\)?\s?)?(\d{4,5}[-\s]?\d{4})/g,
    placeholder: "[TELEFONE]",
  },
  {
    label: "CARTAO",
    regex: /\b\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}\b/g,
    placeholder: "[CARTAO]",
  },
];

export function sanitizeWithReport(text: string): SanitizationResult {
  let sanitized = text;
  const found = new Set<string>();

  for (const { label, regex, placeholder } of PATTERNS) {
    const before = sanitized;
    sanitized = sanitized.replace(regex, placeholder);
    if (sanitized !== before) found.add(label);
  }

  return { sanitized, redactedFields: Array.from(found) };
}
