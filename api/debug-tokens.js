// api/debug-tokens.js
export default async function handler(req, res) {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  try {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = await supabase
      .from("zid_stores")
      .select("store_id, store_name, expires_at, created_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(10);

    if (error) return res.status(500).json({ error });
    return res.status(200).json({ rows: data });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
