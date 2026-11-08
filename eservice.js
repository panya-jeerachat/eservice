/* ══════════════════════════════════════════════════════════════════
   ไลบรารีร่วมของหน้าสาธารณะ E-Service คณะวิศวกรรมศาสตร์ มหาวิทยาลัยมหาสารคาม
   • อ่านข้อมูลจากสเปรดชีตสาธารณะผ่าน gviz (JSONP) — ไม่ต้องล็อกอิน ไม่แตะสเปรดชีตหลัก (ไม่มีชื่อ อีเมล รหัสผ่าน)
   • ส่งคำขอ/ผลประเมินไปที่ Web App (doPost)
   • ชื่อระบบ ช่องทางติดต่อ และเครดิต มาจากแท็บ PublicConfig (แก้ที่หน้าตั้งค่าในระบบ)
   © 2570 คณะวิศวกรรมศาสตร์ มหาวิทยาลัยมหาสารคาม · พัฒนาโดย นายปัญญา จีระฉัตร | นักวิชาการโสตทัศนศึกษา | panya.j@msu.ac.th
   ══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  const CFG = window.ESV_CONFIG || {};
  /* URL รูปแบบองค์กร (/a/msu.ac.th/macros/s/… หรือ /a/macros/msu.ac.th/s/…) → /macros/s/…/exec ส่งข้อมูลได้โดยไม่ต้องล็อกอิน */
  if (CFG.WEBAPP_URL) CFG.WEBAPP_URL = String(CFG.WEBAPP_URL).trim().replace(/\/a\/[^/]+\/macros\/s\//, '/macros/s/').replace(/\/a\/macros\/[^/]+\/s\//, '/macros/s/').replace(/\/macros\/u\/\d+\/s\//, '/macros/s/');
  const ESV = window.ESV = {};
  ESV.cfg = CFG;
  ESV.names = { appName: 'E-Service คณะวิศวกรรมศาสตร์', appShort: 'E-Service', faculty: 'คณะวิศวกรรมศาสตร์ มหาวิทยาลัยมหาสารคาม' };

  ESV.esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  ESV.$ = id => document.getElementById(id);
  ESV.ready = () => !!(CFG.PUBLIC_SHEET_ID && /^[\w-]{20,}$/.test(CFG.PUBLIC_SHEET_ID));

  /* ── อ่านแท็บจากสเปรดชีตสาธารณะ → [{หัวคอลัมน์: ค่า}] (ค่าเดิม v และข้อความที่แสดง f) ── */
  ESV.sheet = function (name) {
    return new Promise((resolve, reject) => {
      if (!ESV.ready()) { reject(new Error('ยังไม่ได้ตั้งค่า PUBLIC_SHEET_ID ในไฟล์ config.js')); return; }
      const cb = 'esvG_' + Math.random().toString(36).slice(2);
      const s = document.createElement('script');
      let done = false;
      const end = (fn, arg) => { if (done) return; done = true; clearTimeout(timer); try { delete window[cb]; } catch (e) { window[cb] = undefined; } s.remove(); fn(arg); };
      const timer = setTimeout(() => end(reject, Object.assign(new Error('อ่านสเปรดชีตสาธารณะไม่ได้ (หมดเวลา)'), { share: true })), 15000);
      window[cb] = json => {
        try {
          if (json.status === 'error') {
            const er = json.errors && json.errors[0] || {}, msg = String(er.detailed_message || er.message || er.reason || 'อ่านข้อมูลไม่ได้');
            throw Object.assign(new Error(msg), { share: /access|denied|permission|sign/i.test(msg + (er.reason || '')), tab: /invalid sheet|sheet/i.test(msg) });
          }
          const labels = json.table.cols.map(c => String(c.label || c.id || '').trim());
          const rows = (json.table.rows || []).map(r => {
            const o = {}, f = {};
            labels.forEach((l, i) => { const c = r.c[i]; o[l] = c ? (c.v == null ? '' : c.v) : ''; f[l] = c ? (c.f != null ? c.f : (c.v == null ? '' : String(c.v))) : ''; });
            Object.defineProperty(o, '_f', { value: f });
            return o;
          }).filter(o => Object.keys(o).some(k => o[k] !== ''));
          end(resolve, rows);
        } catch (e) { end(reject, e); }
      };
      s.onerror = () => end(reject, Object.assign(new Error('อ่านสเปรดชีตสาธารณะไม่ได้'), { share: true }));
      s.src = 'https://docs.google.com/spreadsheets/d/' + CFG.PUBLIC_SHEET_ID + '/gviz/tq?tqx=out:json;responseHandler:' + cb +
        '&headers=1&sheet=' + encodeURIComponent(name) + '&_=' + Date.now();
      document.body.appendChild(s);
    });
  };
  /* แท็บที่อาจยังไม่มี (เช่น สเปรดชีตเพิ่งสร้าง) → คืนรายการว่าง ไม่ให้ทั้งหน้าพัง */
  ESV.sheetSafe = name => ESV.sheet(name).catch(() => []);
  /* คำอธิบายสาเหตุที่อ่านข้อมูลไม่ได้ + วิธีแก้ (ให้ผู้ดูแลแก้ถูกจุด) */
  ESV.whyFail = function (e) {
    if (!ESV.ready()) return 'ยังไม่ได้ใส่ PUBLIC_SHEET_ID ในไฟล์ config.js ของเว็บนี้ — ผู้ดูแลคัดลอก config.js จากหน้าตั้งค่าระบบ → การ์ด "หน้าสาธารณะ"';
    if (e && e.tab) return 'สเปรดชีตสาธารณะยังไม่มีแท็บข้อมูลรุ่นใหม่ — ผู้ดูแลกด "ซ่อมให้อัตโนมัติ" ที่หน้าตั้งค่าระบบ → การ์ด "หน้าสาธารณะ"';
    return 'อ่านสเปรดชีตสาธารณะไม่ได้ — ส่วนใหญ่เกิดจากสเปรดชีตยังไม่ได้แชร์แบบ "ทุกคนที่มีลิงก์ดูได้" ผู้ดูแลกด "ตรวจหน้าสาธารณะ" / "ซ่อมให้อัตโนมัติ" ที่หน้าตั้งค่าระบบ';
  };

  /* ── วันที่จากชีท: Date(2026,10,5,14,30,0) หรือ "5/11/2026, 14:30:00" หรือ "5/11/2026" → Date ── */
  ESV.toDate = function (v) {
    if (v instanceof Date) return v;
    const s = String(v == null ? '' : v).trim();
    let m = s.match(/^Date\((\d+),(\d+),(\d+)(?:,(\d+),(\d+)(?:,(\d+))?)?\)$/);
    if (m) return new Date(+m[1], +m[2], +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
    m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:,?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
    if (m) { let y = +m[3]; if (y > 2400) y -= 543; return new Date(y, +m[2] - 1, +m[1], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0)); }
    m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2}))?/);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0));
    return null;
  };
  const TH_M = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  ESV.TH_M = TH_M;
  ESV.thDate = d => d ? d.getDate() + ' ' + TH_M[d.getMonth()] + ' ' + String(d.getFullYear() + 543).slice(-2) : '-';
  ESV.thStamp = d => d ? ESV.thDate(d) + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + ' น.' : '-';
  ESV.fmtDur = function (ms) {
    if (!isFinite(ms) || ms < 0) return '-';
    const m = Math.round(ms / 60000);
    if (m < 60) return m + ' นาที';
    const h = m / 60;
    if (h < 24) return Math.floor(h) + ' ชม.' + (m % 60 ? ' ' + (m % 60) + ' นาที' : '');
    const d = h / 24; return (d < 10 ? d.toFixed(1) : Math.round(d)) + ' วัน';
  };
  ESV.fiscalYear = d => d ? (d.getMonth() >= 9 ? d.getFullYear() + 544 : d.getFullYear() + 543) : 0;
  ESV.stClass = s => ({ 'รับเรื่องไว้ก่อน': 'recv', 'อยู่ระหว่างดำเนินการ': 'prog', 'สำเร็จ': 'done', 'ไม่สำเร็จ': 'fail', 'ยกเลิก': 'cancel' }[s] || 'recv');
  ESV.stBadge = s => '<span class="st ' + ESV.stClass(s) + '">' + ESV.esc(s || '-') + '</span>';
  ESV.qr = (url, size) => 'https://api.qrserver.com/v1/create-qr-code/?size=' + (size || 300) + 'x' + (size || 300) + '&margin=10&data=' + encodeURIComponent(url);

  /* ── ชื่อระบบ/ช่องทางติดต่อจากหน้าตั้งค่า → ใส่ในทุกจุดที่มี data-cfg ── */
  ESV.applyConfig = function (rows) {
    (rows || []).forEach(r => { const k = String(r['คีย์'] || r.key || ''); if (k) ESV.names[k] = String(r['ค่า'] != null ? r['ค่า'] : r.value || ''); });
    if (CFG.WEBAPP_URL && !ESV.names.webAppUrl) ESV.names.webAppUrl = CFG.WEBAPP_URL;
    document.querySelectorAll('[data-cfg]').forEach(el => { const v = ESV.names[el.dataset.cfg]; if (v) el.textContent = v; });
    document.querySelectorAll('[data-cfg-href]').forEach(el => { const v = ESV.names[el.dataset.cfgHref]; if (v) el.href = v; });
    if (document.body.dataset.title) document.title = document.body.dataset.title + ' — ' + ESV.names.appName;
    return ESV.names;
  };

  /* ── ส่งข้อมูลไปที่ Web App: อ่านผลได้ (CORS) · ถ้าเครือข่ายบล็อก ส่งซ้ำแบบอ่านผลไม่ได้ (กันซ้ำด้วย nonce) ── */
  ESV.post = async function (params) {
    const url = CFG.WEBAPP_URL || ESV.names.webAppUrl;
    if (!url) throw new Error('ยังไม่ได้ตั้งค่า WEBAPP_URL ในไฟล์ config.js');
    const body = new URLSearchParams(params).toString();
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body, redirect: 'follow' });
      const j = JSON.parse(await r.text());
      if (!j.ok) throw Object.assign(new Error(j.message || 'ส่งไม่สำเร็จ'), { server: true });
      return j;
    } catch (e) {
      if (e.server) throw e;
      await fetch(url, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body });
      return { ok: true, blind: true };
    }
  };
  /* ── ลิงก์เข้าสู่ระบบเจ้าหน้าที่ 3 วิธี — สร้างจาก WEBAPP_URL ใน config.js โดยตรง
     ใช้ได้ทันทีแม้ข้อมูลสาธารณะยังโหลดไม่เสร็จ/โหลดไม่ได้ · ทำงานเหมือนกันทั้ง eng.msu.ac.th และ GitHub Pages ── */
  ESV.staffUrls = function () {
    const src = String(CFG.STAFF_WEBAPP_URL || CFG.WEBAPP_URL || ESV.names.webAppUrl || ESV.names.domainUrl || '');   // STAFF_WEBAPP_URL ไม่บังคับ
    const m = src.match(/\/s\/([\w-]{20,})\/exec/);
    if (!m) return null;
    const domain = 'https://script.google.com/a/macros/' + (CFG.SSO_DOMAIN || 'msu.ac.th') + '/s/' + m[1] + '/exec';
    return {
      google: domain + '?sso=1',                                                                     // Google ยืนยันบัญชีแล้วเข้าระบบอัตโนมัติ
      choose: 'https://accounts.google.com/AccountChooser?continue=' + encodeURIComponent(domain + '?sso=1'),   // Chrome หลายบัญชี: เลือกบัญชีก่อน
      password: domain                                                                                // หน้าเข้าสู่ระบบ (มีฟอร์มรหัสผ่าน)
    };
  };
  /* ลิงก์ภายในเว็บที่เปิดอยู่ (GitHub หรือเว็บคณะ) — QR และลิงก์ติดตามจึงไม่พาไปอีกเว็บ */
  ESV.here = file => new URL(file || './', location.href).href.split('#')[0];
  ESV.trackLink = no => ESV.here('index.html').split('?')[0] + '?job=' + encodeURIComponent(no);

  ESV.nonce = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 10);

  /* ── เครดิตผู้พัฒนา (ทุกหน้า) ── */
  ESV.credit = function () {
    document.querySelectorAll('.credit').forEach(el => {
      el.innerHTML = '© 2570 คณะวิศวกรรมศาสตร์ มหาวิทยาลัยมหาสารคาม<br>พัฒนาโดย <b>นายปัญญา จีระฉัตร</b> | นักวิชาการโสตทัศนศึกษา | <a href="mailto:panya.j@msu.ac.th">panya.j@msu.ac.th</a>';
    });
  };
  document.addEventListener('DOMContentLoaded', ESV.credit);

  /* ── หน้าต่าง ── */
  ESV.modal = function (title, html) {
    const m = document.createElement('div');
    m.className = 'mask';
    m.innerHTML = '<div class="mbox" role="dialog" aria-modal="true"><div class="mh"><h3>' + title + '</h3><button class="x" aria-label="ปิด">×</button></div><div class="mb">' + html + '</div></div>';
    const close = () => { m.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = e => { if (e.key === 'Escape') close(); };
    m.addEventListener('click', e => { if (e.target === m || e.target.closest('.x')) close(); });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(m);
    return { el: m, close: close };
  };
})();
