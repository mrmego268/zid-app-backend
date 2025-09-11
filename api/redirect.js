export default async function handler(req, res) {
  const params = new URLSearchParams(req.query || {}).toString();
  // مرّر البارامترات كلها إلى /api/callback
  res.redirect(302, `/api/callback${params ? `?${params}` : ""}`);
}
