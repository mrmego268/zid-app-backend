export default function handler(req, res) {
  const authUrl =
    "https://oauth.zid.sa/oauth/authorize" +
    "?client_id=5153" +
    "&redirect_uri=" + encodeURIComponent("https://zid-app-backend.vercel.app/api/callback") +
    "&response_type=code" +
    "&state=install";
  res.setHeader("Location", authUrl);
  res.status(302).end();
}
