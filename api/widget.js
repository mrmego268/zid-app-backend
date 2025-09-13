// api/widget.js
import { createClient } from "@supabase/supabase-js";

// نستخدم anon key للقراءة فقط (أفضل من service_role)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY, // fallback لو ما أضفت anon
  { auth: { persistSession: false } }
);

// هيلبر بسيط للهروب من backticks داخل النصوص
const esc = (s) => String(s ?? "").replace(/`/g, "\\`");

export default async function handler(req, res) {
  try {
    // الـ snippet سيمرر store_id بالـ query
    const storeId = (req.query.store_id || "").toString().trim();

    // نرجّع جافاسكربت (مش HTML)
    res.setHeader("Content-Type", "application/javascript; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

    if (!storeId) {
      return res.status(200).send(`console.warn("widget: missing store_id");`);
    }

    // اقرأ إعدادات المتجر من الجدول
    const { data, error } = await supabase
      .from("zid_store_settings")
      .select("enabled, delay_ms, headline, message, cta_text, cta_url, theme")
      .eq("store_id", storeId)
      .maybeSingle();

    if (error) {
      console.error("supabase error:", error);
      return res.status(200).send(`console.error("widget: supabase error");`);
    }

    // لو ما فيه سجل أو معطّل → لا ترسم بوب-أب
    if (!data || data.enabled !== true) {
      return res.status(200).send(`console.log("widget: disabled/no settings");`);
    }

    const delay   = Number(data.delay_ms ?? 1500);
    const head    = esc(data.headline ?? "عرض خاص");
    const msg     = esc(data.message  ?? "خصم لفترة محدودة");
    const ctaText = esc(data.cta_text ?? "تسوق الآن");
    const ctaUrl  = esc(data.cta_url  ?? "#");
    const theme   = (data.theme || "dark").toLowerCase(); // "dark" | "light"

    // CSS + JS خفيفين للبروب-أب
    const js = `
(function(){
  try {
    var baseZ = 2147483000;
    var isLight = ${JSON.stringify(theme)} === "light";
    var bg = isLight ? "rgba(255,255,255,.98)" : "#111";
    var fg = isLight ? "#111" : "#fff";
    var overlay = "rgba(0,0,0,.45)";

    var css = \`
.__zid_overlay{position:fixed;inset:0;background:\${overlay};display:flex;align-items:center;justify-content:center;z-index:\${baseZ};font-family:system-ui,Segoe UI,Tahoma,Arial}
.__zid_box{position:relative;background:\${bg};color:\${fg};max-width:440px;width:92%;border-radius:14px;box-shadow:0 10px 28px rgba(0,0,0,.18);overflow:hidden}
.__zid_head{padding:16px 18px;font-size:18px;font-weight:800;border-bottom:1px solid rgba(255,255,255,.08)}
.__zid_body{padding:16px 18px;line-height:1.7}
.__zid_actions{display:flex;gap:10px;padding:0 18px 18px}
.__zid_btn{flex:1;padding:11px 14px;border-radius:10px;border:0;cursor:pointer;font-weight:700}
.__zid_primary{background:\${fg};color:\${bg}}
.__zid_secondary{background:transparent;color:\${fg};box-shadow:inset 0 0 0 2px \${fg}}
.__zid_close{position:absolute;top:10px;right:14px;font-size:22px;color:\${fg};cursor:pointer;opacity:.85}
\`;

    var style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);

    function show(){
      var wrap = document.createElement("div");
      wrap.className="__zid_overlay";

      var box = document.createElement("div");
      box.className="__zid_box";
      wrap.appendChild(box);

      var head = document.createElement("div");
      head.className="__zid_head";
      head.textContent=\`${head}\`;
      box.appendChild(head);

      var body = document.createElement("div");
      body.className="__zid_body";
      body.textContent=\`${msg}\`;
      box.appendChild(body);

      var actions=document.createElement("div");
      actions.className="__zid_actions";
      box.appendChild(actions);

      var primary=document.createElement("button");
      primary.className="__zid_btn __zid_primary";
      primary.textContent=\`${ctaText}\`;
      primary.onclick=function(){ window.location.href=\`${ctaUrl}\`; close(); };
      actions.appendChild(primary);

      var secondary=document.createElement("button");
      secondary.className="__zid_btn __zid_secondary";
      secondary.textContent="إغلاق";
      secondary.onclick=close;
      actions.appendChild(secondary);

      var closeBtn=document.createElement("div");
      closeBtn.className="__zid_close";
      closeBtn.innerHTML="&times;";
      closeBtn.onclick=close;
      box.appendChild(closeBtn);

      function close(){
        if(wrap && wrap.parentNode) wrap.parentNode.removeChild(wrap);
      }

      wrap.addEventListener("click", function(e){ if(e.target===wrap){ close(); } });
      document.body.appendChild(wrap);
    }

    // انتظر قليلًا بعد تحميل الصفحة
    var delay = ${delay};
    if (document.readyState === "complete" || document.readyState === "interactive"){
      setTimeout(show, delay);
    } else {
      window.addEventListener("DOMContentLoaded", function(){ setTimeout(show, delay); });
    }
  } catch(e){ console.error("widget runtime error", e); }
})();
`;
    return res.status(200).send(js);
  } catch (e) {
    console.error("widget handler crash:", e);
    res.setHeader("Content-Type", "application/javascript");
    return res.status(200).send(`console.error("widget: crash");`);
  }
}
