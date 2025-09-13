// api/callback.js

function decodeJwt(jwt) {
  try {
    const payload = jwt.split(".")[1];
    return JSON.parse(Buffer.from(payload, "base64").toString("utf8"));
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  try {
    const { code, error, error_description } = req.query || {};

    if (error) {
      return res
        .status(400)
        .send(`OAuth cancelled: ${error}${error_description ? " - " + error_description : ""}`);
    }
    if (!code) return res.status(400).send("Missing ?code");

    const {
      ZID_CLIENT_ID,
      ZID_CLIENT_SECRET,
      ZID_TOKEN_URL,
      REDIRECT_URI,
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY, // انت سميته كذا في Vercel
    } = process.env;

    // 1) تبادل الكود بتوكنات
    const form = new URLSearchParams();
    form.set("grant_type", "authorization_code");
    form.set("code", code);
    form.set("redirect_uri", REDIRECT_URI);
    form.set("client_id", ZID_CLIENT_ID);
    form.set("client_secret", ZID_CLIENT_SECRET);

    const tokenResp = await fetch(ZID_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });

    const tokens = await tokenResp.json();
    if (!tokenResp.ok) {
      console.error("Token exchange failed:", tokens);
      return res.status(400).send("Token exchange failed.");
    }

    // 2) استخرج store_id من JWT authorization
    const authJwt = tokens.authorization;
    const decoded = decodeJwt(authJwt);
    const storeId = decoded?.sub;
    const storeName = decoded?.store_name || null;

    if (!storeId) {
      console.error("Cannot extract store_id from authorization JWT");
      return res.status(400).send("Cannot extract store id.");
    }

    // 3) احسب وقت الانتهاء
    const expiresAt = new Date(Date.now() + (tokens.expires_in || 0) * 1000).toISOString();

    // 4) خزّن/حدّث في Supabase (upsert)
    try {
      if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        console.error("Supabase env vars missing");
      } else {
        const { createClient } = await import("@supabase/supabase-js");
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        const row = {
          store_id: String(storeId),
          store_name: storeName,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        };

        const { error: dbErr } = await supabase
          .from("zid_stores")
          .upsert(row, { onConflict: "store_id" });

        if (dbErr) console.error("Supabase upsert error:", dbErr);
      }
    } catch (dbError) {
      console.error("Supabase error:", dbError);
    }

    // 5) وجّه المستخدم لصفحة النجاح (اللي عندك شغالة)
    res.writeHead(302, { Location: "/api/installed-success" });
    return res.end();

  } catch (e) {
    console.error(e);
    return res.status(500).send("Server Error");
  }
}
