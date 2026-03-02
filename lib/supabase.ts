import { createClient } from "@supabase/supabase-js";

let supabaseInstance: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.warn(
      "Supabase credentials not found. File uploads will not work."
    );
    // Return a dummy client for build time
    return createClient("https://dummy.supabase.co", "dummy-key");
  }

  supabaseInstance = createClient(supabaseUrl, supabaseServiceRoleKey);
  return supabaseInstance;
}

export const supabase = {
  // Lazy proxy to avoid initialization at import time
  storage: {
    from: (bucket: string) => getSupabaseClient().storage.from(bucket),
  },
};

