// api/callback.js
export default async function handler(req, res) {
  try {
    const { code, state, error, error_description } = req.query || {};

    // لو زد رجّعت إلغاء/خطأ (مثلاً access_denied)، وضّحه صريح
    if (error) {
      return res
        .status(400)
        .send(`OAuth cancelled: ${error}${error_description ? " - " + error_description : ""}`);
    }

    // لو دخلت مباشرة على callback بدون ما تبدأ التفويض
    if (!code) {
      return res.status(400).send("Missing ?code");
    }

    const {
      ZID_CLIENT_ID,
      ZID_CLIENT_SECRET,
      ZID_TOKEN_URL,
      REDIRECT_URI
    } = process.env;

    // تبادل الكود بتوكنات (x-www-form-urlencoded)
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
      // سجّل في اللوج للتشخيص، لا تفضح التفاصيل للمستخدم
      console.error("Token exchange failed:", tokens);
      return res.status(400).send("Token exchange failed.");
    }

    // TODO: خزّن tokens في قاعدة بياناتك واربطها بالمتجر (store_id) عبر state أو من JWT داخل tokens.authorization
    // مثال: const storeId = decodeJwt(tokens.authorization).sub

    // وجّه المستخدم لصفحة نجاح ستاتيكية داخل public/
const successUrl = "https://zid-app-backend.vercel.app/api/installed-success";
res.writeHead(302, { Location: successUrl });
return res.end();


  } catch (e) {
    console.error(e);
    return res.status(500).send("Server Error");
  }
}
