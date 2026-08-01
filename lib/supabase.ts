import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!_client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;

    if (!url || !key) {
      throw new Error("SUPABASE_URL e SUPABASE_SERVICE_KEY são obrigatórios.");
    }

    _client = createClient(url, key);
  }
  return _client;
}

export function getSupabase(): SupabaseClient {
  return getClient();
}

export const BUCKET = "documentos";