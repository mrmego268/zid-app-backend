// api/widget.js
import { createClient } from "@supabase/supabase-js";

// منع الكاش؛ دايمًا أحدث إعدادات
const nocache = (res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
};

export default async function handler(req, res) {
  try {
    nocache(res);
    res.setHeader("Content-Type", "application/javascript; charset=utf-8");

    const { store_id } = req.query || {};
    if (!store_id) {
      return res.status(200).send(`/* Missing store_id; nothing to do */`);
    }

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data: cfg, error } = await supabase
      .from("zid_store_settings")
      .select("*")
      .eq("store_id", String(store_id))
      .single();

    if (error || !cfg || !cfg.enabled) {
      return res.status(200).send(`/* Popup disabled or no config for store ${store_id} */`);
    }

    // امنع الحقن المكرر
    const js = `
(function(){
  if (window.__zid_popup_injected__) return;
  window.__zid_popup_injected__ = true;

  var delay = ${Number(cfg.delay_ms) || 1500};

  function injectStyle(){
    if (document.getElementById('zid-popup-style')) return;
    var css = \`
      .zid-popup-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:99998}
      .zid-popup{position:fixed;z-index:99999;left:50%;top:50%;transform:translate(-50%,-50%);
        background:#fff;border-radius:14px;padding:20px;box-shadow:0 10px 30px rgba(0,0,0,.2);
        max-width:90%;width:380px;font-family:system-ui, -apple-system, Segoe UI, Roboto, Arial}
      .zid-popup h3{margin:0 0 8px;font-size:18px}
      .zid-popup p{margin:0 0 14px;color:#444;line-height:1.6}
      .zid-popup .actions{display:flex;gap:10px;justify-content:flex-end}
      .zid-popup button{padding:8px 14px;border-radius:10px;border:1px solid #ddd;background:#fff;cursor:pointer}
      .zid-popup .primary{background:#111;color:#fff;border-color:#111}
    \`;
    var s = document.createElement('style'); s.id='zid-popup-style'; s.textContent = css;
    document.head.appendChild(s);
  }

  function openPopup(){
    injectStyle();
    var b = document.createElement('div'); b.className='zid-popup-backdrop';
    b.addEventListener('click', function(e){ if (e.target===b) document.body.removeChild(b); });

    var box = document.createElement('div'); box.className='zid-popup';
    box.innerHTML = \`
      <h3>${escapeHtml(\`${cfg.headline}\`)}</h3>
      <p>${escapeHtml(\`${cfg.message}\`)}</p>
      <div class="actions">
        <button id="zidPopupDismiss">إغلاق</button>
        <a id="zidPopupCta" class="primary" href="${cfg.cta_url}" rel="noopener noreferrer">${escapeHtml(\`${cfg.cta_text}\`)}</a>
      </div>\`;

    b.appendChild(box);
    document.body.appendChild(b);

    document.getElementById('zidPopupDismiss').onclick = function(){ try{ document.body.removeChild(b); }catch(e){} };
  }

  // بسيط: هروب HTML لمنع إدخال سكربت
  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, function(m){
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]);
    });
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(openPopup, delay);
  } else {
    document.addEventListener('DOMContentLoaded', function(){ setTimeout(openPopup, delay); });
  }
})();`;

    return res.status(200).send(js);
  } catch (e) {
    res.setHeader("Content-Type", "application/javascript; charset=utf-8");
    return res.status(200).send(`/* widget error: ${String(e).slice(0,200)} */`);
  }
}
