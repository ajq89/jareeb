import { createClient } from "@supabase/supabase-js";

let supabaseInstance: ReturnType<typeof createClient> | null = null;

function sanitizeValue(val: string | undefined): string {
  if (!val) return "";
  let clean = val.trim();
  if (clean.startsWith('"') && clean.endsWith('"')) {
    clean = clean.slice(1, -1);
  } else if (clean.startsWith("'") && clean.endsWith("'")) {
    clean = clean.slice(1, -1);
  }
  clean = clean.trim();

  // Strip sub-paths like /storage/v1 or /rest/v1 if accidentally included by user
  if (clean.includes("/storage/v1")) {
    clean = clean.split("/storage/v1")[0];
  }
  if (clean.includes("/rest/v1")) {
    clean = clean.split("/rest/v1")[0];
  }

  // Remove any trailing slashes
  while (clean.endsWith("/")) {
    clean = clean.slice(0, -1);
  }
  
  return clean.trim();
}

/**
 * Lazily retrieves the Supabase client instance.
 * This prevents module load-time crashes if environment variables are not yet defined.
 */
export function getSupabaseClient() {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  let supabaseUrl = sanitizeValue((import.meta as any).env.VITE_SUPABASE_URL);
  let supabaseAnonKey = sanitizeValue((import.meta as any).env.VITE_SUPABASE_ANON_KEY);

  // Remove trailing slashes from Supabase URL to avoid double-slashes and routing issues
  if (supabaseUrl.endsWith("/")) {
    supabaseUrl = supabaseUrl.slice(0, -1);
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
      "Supabase environment variables (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY) are missing. " +
      "The Supabase client is operating in a degraded mock state or will throw errors on execution."
    );
  }

  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  return supabaseInstance;
}
