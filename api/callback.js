export default async function handler(req, res) {
  try {
    const { code, state, error, error_description } = req.query || {};
    if (error) return res.status(400).send(`OAuth Error: ${error} ${error_description || ""}`);
    if (!code) return res.status(400).send("Missing ?code");

    const {
      ZID_CLIENT_ID,
      ZID_CLIENT_SECRET,
      ZID_TOKEN_URL,
      REDIRECT_URI
    } = process.env;

    const form = new URLSearchParams();
    form.set("grant_type", "authorization_code");
    form.set("code", code);
    form.set("redirect_uri", REDIRECT_URI);
    form.set("client_id", ZID_CLIENT_ID);
    form.set("client_secret", ZID_CLIENT_SECRET);

    const tokenResp = await fetch(ZID_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString()
    });

    const tokens = await tokenResp.json();
    if (!tokenResp.ok) {
      // سجل الخطأ في اللوج فقط، لا تعرض تفاصيل للمستخدم
      console.error("Token exchange failed:", tokens);
      return res.status(400).send("Token exchange failed.");
    }

    // TODO: خزّن tokens في قاعدة بياناتك واربطها بالمتجر (مثلاً عبر state أو من JWT)
    // مثال: const storeId = decodeJWT(tokens.authorization).sub

    // وجّه المستخدم لصفحة نجاح نظيفة
    res.writeHead(302, { Location: "/installed-success" });
    res.end();
  } catch (e) {
    console.error(e);
    res.status(500).send("Server Error");
  }
}
