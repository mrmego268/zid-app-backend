// api/installed-success.js
export default function handler(req, res) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(`
    <!doctype html>
    <meta charset="utf-8"/>
    <title>تم التثبيت</title>
    <body style="font-family:system-ui;max-width:620px;margin:5rem auto;line-height:1.8">
      <h2>✅ تم تثبيت التطبيق بنجاح</h2>
      <p>تقدر الآن ترجع للمتجر أو تفتح لوحة التحكم في تطبيقك.</p>
    </body>
  `);
}
