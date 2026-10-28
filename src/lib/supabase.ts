import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://nqwlbqxzdmbsgyprwikd.supabase.co";
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xd2xicXh6ZG1ic2d5cHJ3aWtkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3ODcxMTAsImV4cCI6MjEwNjM2MzExMH0.ksCNePOT8XALSbjAiXBnH55IrOJvLd_-Gfrl1OZVWtg";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
