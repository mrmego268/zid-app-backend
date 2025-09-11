export default async function handler(req, res) {
  try {
    const { code, state, error, error_description } = req.query || {};

    if (error) {
      return res.status(400).send(`<h2>OAuth Error</h2><pre>${error}: ${error_description || ""}</pre>`);
    }
    if (!code) {
      return res.status(400).send("<h2>Missing ?code</h2>");
    }

    const {
      ZID_CLIENT_ID,
      ZID_CLIENT_SECRET,
      ZID_TOKEN_URL,
      REDIRECT_URI
    } = process.env;

    const tokenResp = await fetch(ZID_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI,
        client_id: ZID_CLIENT_ID,
        client_secret: ZID_CLIENT_SECRET
      })
    });

    const tokens = await tokenResp.json();
    if (!tokenResp.ok) {
      return res.status(400).send(`<h2>Token exchange failed</h2><pre>${JSON.stringify(tokens, null, 2)}</pre>`);
    }

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(`
      <h1>OAuth Success ✅</h1>
      <p>Code exchanged successfully.</p>
      <pre>${JSON.stringify(tokens, null, 2)}</pre>
    `);
  } catch (e) {
    res.status(500).send(`<h2>Server Error</h2><pre>${String(e)}</pre>`);
  }
}
