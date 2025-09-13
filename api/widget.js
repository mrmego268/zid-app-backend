// /api/widget.js
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  try {
    const { store_id } = req.query || {};

    // 1) تحقق من البارامترات
    if (!store_id) {
      res.setHeader("Content-Type", "application/javascript; charset=utf-8");
      return res.status(400).send('console.error("widget: missing store_id");');
    }

    // 2) متغيرات البيئة
    const url = process.env.SUPABASE_URL;
    const anon = process.env.SUPABASE_ANON_KEY; // نستخدم ANON للقراءة

    if (!url || !anon) {
      res.setHeader("Content-Type", "application/javascript; charset=utf-8");
      return res
        .status(500)
        .send(
          `console.error("widget: missing env vars", ${JSON.stringify({
            hasUrl: !!url,
            hasAnon: !!anon,
          })});`
        );
    }

    const supabase = createClient(url, anon);

    // 3) اجلب إعدادات الواجهة
    const { data, error } = await supabase
      .from("zid_store_settings")
      .select("enabled, delay_ms, headline, message, cta_text, cta_url, theme")
      .eq("store_id", String(store_id))
      .single();

    if (error) {
      res.setHeader("Content-Type", "application/javascript; charset=utf-8");
      return res
        .status(500)
        .send(`console.error("widget: supabase error", ${JSON.stringify(error)});`);
    }

    if (!data || data.enabled !== true) {
      res.setHeader("Content-Type", "application/javascript; charset=utf-8");
      return res.status(200).send("// widget disabled or not found");
    }

    const {
      delay_ms = 1200,
      headline = "عرض خاص",
      message = "خصم 10% اليوم فقط",
      cta_text = "تسوق الآن",
      cta_url = "/",
      theme = "light",
    } = data;

    const js = `
(function(){
  try {
    if (window.__zid_popup_injected__) return;
    window.__zid_popup_injected__ = true;

    var css = ".zid-popup-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:999999}"+
              ".zid-popup-card{max-width:420px;width:93%;background:#fff;color:#111;border-radius:12px;padding:20px;box-shadow:0 10px 30px rgba(0,0,0,.2);font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,sans-serif;position:relative}"+
              ".zid-popup-card.dark{background:#111;color:#fff}"+
              ".zid-popup-head{font-size:22px;font-weight:700;margin:0 0 10px}"+
              ".zid-popup-msg{font-size:16px;line-height:1.6;margin:0 0 16px}"+
              ".zid-popup-cta{display:inline-block;padding:10px 16px;border-radius:8px;background:#1e88e5;color:#fff;text-decoration:none;font-weight:600}"+
              ".zid-popup-close{position:absolute;right:10px;top:10px;background:transparent;border:none;font-size:20px;cursor:pointer;color:inherit}";
    var style = document.createElement("style");
    style.appendChild(document.createTextNode(css));
    document.head.appendChild(style);

    function show(){
      var overlay = document.createElement("div");
      overlay.className = "zid-popup-overlay";
      overlay.addEventListener("click", function(e){ if(e.target === overlay) document.body.removeChild(overlay); });

      var card = document.createElement("div");
      card.className = "zid-popup-card ${theme === "dark" ? "dark" : ""}";

      var close = document.createElement("button");
      close.className = "zid-popup-close";
      close.innerHTML = "&times;";
      close.addEventListener("click", function(){ document.body.removeChild(overlay); });

      var h = document.createElement("h3");
      h.className = "zid-popup-head";
      h.textContent = ${JSON.stringify(headline)};

      var p = document.createElement("p");
      p.className = "zid-popup-msg";
      p.textContent = ${JSON.stringify(message)};

      var a = document.createElement("a");
      a.className = "zid-popup-cta";
      a.href = ${JSON.stringify(cta_url)};
      a.textContent = ${JSON.stringify(cta_text)};

      card.appendChild(close);
      card.appendChild(h);
      card.appendChild(p);
      card.appendChild(a);
      overlay.appendChild(card);
      document.body.appendChild(overlay);
    }

    setTimeout(show, ${Number(delay_ms) || 1200});
  } catch(e) {
    console.error("widget runtime error", e);
  }
})();
`;
    res.setHeader("Content-Type", "application/javascript; charset=utf-8");
    return res.status(200).send(js);
  } catch (e) {
    res.setHeader("Content-Type", "application/javascript; charset=utf-8");
    return res
      .status(500)
      .send(`console.error("widget: fatal", ${JSON.stringify(String(e))});`);
  }
}
