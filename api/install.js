export default async function handler(req, res) {
  const clientId = process.env.ZID_CLIENT_ID; // 5153 عندك
  const redirectUri = encodeURIComponent("https://zid-app-backend.vercel.app/api/callback");

  // لو عندك سكوبات محددة في زد، ضيفها هنا أو خليه فاضي
  const scopes = process.env.ZID_SCOPES || "";
  const scopeParam = scopes ? `&scope=${encodeURIComponent(scopes)}` : "";

  // state عشوائي للأمان وربطه بالمتجر لاحقًا
  const state = Math.random().toString(36).slice(2);

  const authUrl =
    `https://oauth.zid.sa/oauth/authorize?client_id=${clientId}` +
    `&redirect_uri=${redirectUri}&response_type=code&state=${state}${scopeParam}`;

  res.setHeader("Location", authUrl);
  res.status(302).end();
}
