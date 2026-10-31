// Page helpers for Google Flow (flow.google.com), injected by flow.py through
// PinchTab /evaluate. Every function returns plain JSON-able values. They rely on
// aria-labels, ARIA roles and visible text (Material icon ligatures stripped),
// never on generated class names.
(() => {
  if (window.__flow && window.__flow.v === 5) return 'loaded';
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const vis = (e) => !!e && !!(e.offsetParent || e.getClientRects().length);
  // Visible text of an element without Material icon names ("videocam Video" -> "Video").
  const txt = (e) => {
    if (!e) return '';
    const c = e.cloneNode(true);
    c.querySelectorAll('mat-icon, .material-icons, .material-symbols-outlined, .google-symbols').forEach((i) => i.remove());
    return (c.textContent || '').replace(/\s+/g, ' ').trim();
  };
  const low = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9.:]+/g, '');
  const all = (sel) => [...document.querySelectorAll(sel)].filter(vis);
  const byLabel = (label) => all(`[aria-label="${label}"]`)[0] || null;
  const byText = (sel, text) => {
    const want = low(text);
    const els = all(sel);
    return els.find((e) => low(txt(e)) === want) || els.find((e) => low(txt(e)).startsWith(want)) || null;
  };
  const waitFor = async (fn, ms = 8000, step = 150) => {
    const t0 = Date.now();
    for (;;) {
      const v = fn();
      if (v) return v;
      if (Date.now() - t0 > ms) return null;
      await sleep(step);
    }
  };
  const esc = () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true }));
    const bd = document.querySelector('.cdk-overlay-backdrop');
    if (bd) bd.click();
  };
  const closeMenus = async () => {
    for (let i = 0; i < 4 && all('[role=menu], [role=dialog], .cdk-overlay-pane [role=menuitem]').length; i++) {
      esc();
      await sleep(200);
    }
  };

  // ---- generation settings panel -------------------------------------------------
  const promptBox = () => byLabel('What do you want to create?');
  const trigger = () => byLabel('Settings trigger');
  const radios = () => all('[role=radio]').map((e) => ({ text: txt(e), checked: e.getAttribute('aria-checked') === 'true', el: e }));
  const panelOpen = () => radios().some((r) => /^(Image|Video)$/.test(r.text));
  const openPanel = async () => {
    if (panelOpen()) return true;
    await closeMenus();
    const t = trigger();
    if (!t) return false;
    t.click();
    return !!(await waitFor(panelOpen, 4000));
  };
  const priceText = () => {
    const a = all('a, span, div').find((e) => /^\d[\d,]* credits?$/.test(txt(e)) && e.children.length === 0);
    return a ? txt(a) : null;
  };
  const price = () => {
    const p = priceText();
    return p ? parseInt(p.replace(/[^\d]/g, ''), 10) : null;
  };
  const modelLabel = () => {
    const b = byLabel('Select model family');
    return b ? txt(b) : null;
  };
  const panelState = () => ({
    open: panelOpen(),
    model: modelLabel(),
    price: price(),
    summary: trigger() ? txt(trigger()) : null,
    options: radios().map(({ text, checked }) => ({ text, checked })),
    agent: (all('button[aria-pressed]').find((e) => txt(e) === 'Agent') || {}).ariaPressed || null,
  });
  // Click a toggle radio by its visible text; returns true when it ends up checked.
  const choose = async (label) => {
    const want = low(label);
    const r = radios().find((x) => low(x.text) === want) || radios().find((x) => low(x.text).startsWith(want));
    if (!r) return false;
    if (!r.checked) r.el.click();
    return !!(await waitFor(() => (radios().find((x) => x.text === r.text) || {}).checked, 3000));
  };
  const models = async () => {
    const b = byLabel('Select model family');
    if (!b) return [];
    b.click();
    const items = await waitFor(() => { const m = all('[role=menuitem]'); return m.length ? m : null; }, 3000);
    const names = (items || []).map(txt);
    await closeMenus();
    return names;
  };
  const selectModel = async (name) => {
    const b = byLabel('Select model family');
    if (!b) return { ok: false, error: 'no model selector' };
    if (low(txt(b)).startsWith(low(name))) return { ok: true, model: txt(b) };
    b.click();
    const items = await waitFor(() => { const m = all('[role=menuitem]'); return m.length ? m : null; }, 3000);
    if (!items) return { ok: false, error: 'model menu did not open' };
    const want = low(name);
    const it = items.find((e) => low(txt(e)) === want) || items.find((e) => low(txt(e)).includes(want));
    if (!it) { const names = items.map(txt); await closeMenus(); return { ok: false, error: 'model not found', available: names }; }
    it.click();
    await waitFor(() => low(modelLabel()).startsWith(low(txt(it))), 3000);
    await sleep(250);
    return { ok: true, model: modelLabel() };
  };
  // Apply a settings dict: {mode, input, model, aspect, res, secs, count}. Order matters:
  // mode -> input (Frames/Ingredients) -> model (changes which options exist) -> the rest.
  const configure = async (cfg) => {
    const out = { ok: true, missing: [] };
    if (!(await openPanel())) return { ok: false, error: 'settings panel did not open' };
    const agent = all('button[aria-pressed]').find((e) => txt(e) === 'Agent');
    if (agent && agent.getAttribute('aria-pressed') === 'true') { agent.click(); await sleep(400); await openPanel(); }
    for (const key of ['mode', 'input']) {
      if (cfg[key] && !(await choose(cfg[key]))) out.missing.push(`${key}=${cfg[key]}`);
    }
    if (cfg.model) {
      const m = await selectModel(cfg.model);
      if (!m.ok) return { ...out, ok: false, error: m.error, available: m.available };
      await openPanel();
    }
    for (const key of ['aspect', 'res', 'secs', 'count']) {
      if (cfg[key] && !(await choose(cfg[key]))) out.missing.push(`${key}=${cfg[key]}`);
    }
    await sleep(300);
    return { ...out, state: panelState() };
  };

  // ---- prompt, frames, ingredients --------------------------------------------------
  const setPrompt = async (text) => {
    const box = promptBox();
    if (!box) return { ok: false, error: 'no prompt box' };
    box.focus();
    document.execCommand('selectAll', false, null);
    document.execCommand('delete', false, null);
    document.execCommand('insertText', false, text);
    await sleep(200);
    const got = (box.innerText || '').trim();
    return { ok: got.length > 0 && got.slice(0, 20) === text.trim().slice(0, 20), length: got.length };
  };
  const assetOption = (name) => {
    const opts = all('[role=option]');
    return opts.find((o) => txt(o) === name || o.getAttribute('aria-label') === name) ||
      opts.find((o) => txt(o).includes(name)) || null;
  };
  // Opens the asset picker behind `opener` (the Start / End frame slot or the ingredients
  // button), picks `name`, and confirms with "Add to prompt" when the dialog asks for it.
  const pickAsset = async (opener, name) => {
    if (!opener) return { ok: false, error: 'picker button not found' };
    opener.click();
    const search = await waitFor(() => all('input[aria-label="Search assets"], [aria-label="Search assets"]')[0], 5000);
    if (search && name) {
      search.focus();
      search.value = name;
      search.dispatchEvent(new Event('input', { bubbles: true }));
      await sleep(600);
    }
    const opt = await waitFor(() => assetOption(name), 8000);
    if (!opt) { const names = all('[role=option]').map(txt).slice(0, 30); await closeMenus(); return { ok: false, error: 'asset not found', available: names }; }
    opt.click();
    await sleep(500);
    const add = all('button').find((b) => txt(b) === 'Add to prompt' || b.getAttribute('aria-label') === 'Add to prompt');
    if (add && !add.disabled && all('[role=option]').length) { add.click(); await sleep(400); }
    await closeMenus();
    return { ok: true };
  };
  const frameSlot = (which) => all('button').find((b) => txt(b) === which) || null;
  const filledFrames = () => all('[aria-label="Ingredient image"], img[alt="Ingredient image"]').length;
  const setFrame = async (which, name) => {
    const before = filledFrames();
    const r = await pickAsset(frameSlot(which), name);
    if (!r.ok) return r;
    const ok = await waitFor(() => filledFrames() > before || !frameSlot(which), 5000);
    return { ok: !!ok };
  };
  const addIngredient = async (name) => pickAsset(byLabel('Add ingredients to the prompt box'), name);
  const clearPromptBar = async () => {
    const c = byLabel('Clear prompt');
    if (c) { c.click(); await sleep(300); }
    return true;
  };
  const generate = () => {
    const b = byLabel('Start generation');
    if (!b) return { ok: false, error: 'no generate button' };
    if (b.disabled || b.getAttribute('aria-disabled') === 'true') return { ok: false, error: 'generate button disabled' };
    b.click();
    return { ok: true };
  };

  // ---- media grid ---------------------------------------------------------------------
  const tiles = () => [...document.querySelectorAll('flow-tile-container')].map((c, i) => {
    const kind = c.querySelector('flow-video-tile') ? 'video' : c.querySelector('flow-image-tile') ? 'image' : 'other';
    const title = (c.querySelector('flow-tile-hover-footer button[aria-label]') || {}).ariaLabel ||
      (c.querySelector('flow-tile-hover-footer button') ? txt(c.querySelector('flow-tile-hover-footer button')) : '');
    const t = txt(c);
    const pm = t.match(/(\d{1,3})%/);
    const img = c.querySelector('img');
    return {
      i, kind, title,
      progress: pm ? parseInt(pm[1], 10) : null,
      thumb: img ? img.src.slice(-24) : null,
      failed: /fail|couldn.?t|error|violat|policy|unable|try again/i.test(t),
      text: t.slice(0, 160),
    };
  });
  const scrollTop = () => { const m = document.querySelector('main') || document.scrollingElement; if (m) m.scrollTop = 0; window.scrollTo(0, 0); };
  // Run a tile's "More options" menu path, e.g. ["Download", "1080p"].
  const tileMenu = async (i, path) => {
    const c = document.querySelectorAll('flow-tile-container')[i];
    if (!c) return { ok: false, error: `no tile ${i}` };
    c.scrollIntoView({ block: 'center' });
    c.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    c.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    await sleep(200);
    const more = c.querySelector('button[aria-label="More options"]');
    if (!more) return { ok: false, error: 'no More options on tile' };
    more.click();
    for (const step of path) {
      const want = low(step);
      const it = await waitFor(() => all('[role=menuitem]').find((e) => low(txt(e)).startsWith(want) || low(txt(e)).includes(want)), 4000);
      if (!it) {
        const items = all('[role=menuitem]').map(txt);
        await closeMenus();
        return { ok: false, error: `menu item not found: ${step}`, available: items };
      }
      if (it.disabled || it.getAttribute('aria-disabled') === 'true') {
        await closeMenus();
        return { ok: false, error: `menu item disabled: ${txt(it)} (plan limit?)` };
      }
      it.click();
      await sleep(450);
    }
    await sleep(300);
    await closeMenus();
    return { ok: true };
  };
  const downloadOptions = async (i) => {
    const c = document.querySelectorAll('flow-tile-container')[i];
    if (!c) return [];
    c.querySelector('button[aria-label="More options"]').click();
    const d = await waitFor(() => all('[role=menuitem]').find((e) => low(txt(e)) === 'download'), 3000);
    if (!d) { await closeMenus(); return []; }
    d.click();
    await sleep(500);
    const items = all('[role=menuitem]').map((e) => ({ text: txt(e), disabled: e.disabled || e.getAttribute('aria-disabled') === 'true' }))
      .filter((x) => /\d+p\b|\d+k\b|gif|original|upscaled/i.test(x.text));
    await closeMenus();
    return items;
  };

  // ---- download capture ------------------------------------------------------------------
  // Flow builds every download as a blob and clicks an <a download>. Upscales finish minutes
  // after the click, so a headless browser drops them. We keep the blob instead and hand it to
  // flow.py in base64 chunks.
  const cap = window.__flowCap || (window.__flowCap = { items: [], blobs: new Map(), hooked: false });
  const hookDownloads = () => {
    if (cap.hooked) return true;
    const C = URL.createObjectURL;
    URL.createObjectURL = function (b) { const u = C.call(this, b); if (b instanceof Blob) cap.blobs.set(u, b); return u; };
    const A = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () {
      if (this.hasAttribute('download') && cap.armed) {
        const href = this.href || '';
        const item = { name: this.download || 'flow-download', href: href.slice(0, 400), blob: cap.blobs.get(href) || null, at: Date.now() };
        cap.items.push(item);
        if (!item.blob && /^https?:/.test(href)) {
          fetch(href, { credentials: 'include' }).then((r) => r.blob()).then((b) => { item.blob = b; }).catch((e) => { item.error = String(e); });
        }
        return undefined; // swallow the browser download; flow.py writes the file
      }
      return A.call(this);
    };
    cap.hooked = true;
    return true;
  };
  const dlArm = () => { hookDownloads(); cap.items = []; cap.armed = true; return true; };
  const dlStatus = () => {
    const it = cap.items[cap.items.length - 1];
    const toasts = all('mat-snack-bar-container, [aria-live]').map(txt).filter(Boolean);
    if (!it) return { ready: false, toasts };
    return { ready: !!it.blob, name: it.name, size: it.blob ? it.blob.size : null, type: it.blob ? it.blob.type : null, error: it.error || null, toasts };
  };
  const dlChunk = (start, len) => new Promise((resolve) => {
    const it = cap.items[cap.items.length - 1];
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result).split(',')[1] || '');
    fr.readAsDataURL(it.blob.slice(start, start + len));
  });
  const dlDone = () => { cap.armed = false; cap.items = []; cap.blobs.clear(); return true; };

  // ---- upload (Flow's picker refuses automated file inputs, so drop a File) ------------
  let buf = '';
  const bufReset = () => { buf = ''; return 0; };
  const bufAdd = (s) => { buf += s; return buf.length; };
  const dropFile = async (name, type) => {
    const b = atob(buf);
    const u = new Uint8Array(b.length);
    for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
    buf = '';
    const f = new File([u], name, { type });
    await closeMenus();
    const target = document.querySelector('flow-tile-container')?.parentElement ||
      document.elementFromPoint(innerWidth / 2, innerHeight / 3) || document.body;
    const dt = new DataTransfer();
    dt.items.add(f);
    const r = target.getBoundingClientRect();
    const opts = { bubbles: true, cancelable: true, dataTransfer: dt, clientX: r.left + r.width / 2, clientY: r.top + Math.min(r.height / 2, 300) };
    for (const t of ['dragenter', 'dragover', 'drop']) target.dispatchEvent(new DragEvent(t, opts));
    return { ok: true, size: f.size };
  };

  // ---- account --------------------------------------------------------------------------
  const account = async () => {
    const a = all('[aria-label^="Google Account"]')[0];
    const email = a ? (a.getAttribute('aria-label').match(/\(([^)]+@[^)]+)\)/) || [])[1] || null : null;
    const btn = byLabel('Account details') || a;
    if (!btn) return { signedIn: false };
    btn.click();
    const line = await waitFor(() => all('*').find((e) => e.children.length === 0 && /[\d,]+ Google Flow credits/.test(e.textContent || '')), 5000);
    const reset = all('*').find((e) => e.children.length === 0 && /^Resets /.test((e.textContent || '').trim()));
    const out = {
      signedIn: !!email,
      email,
      credits: line ? parseInt(line.textContent.replace(/[^\d]/g, ''), 10) : null,
      resets: reset ? reset.textContent.trim() : null,
    };
    await closeMenus();
    return out;
  };

  const errors = () => all('[role=alert], mat-snack-bar-container, .mat-mdc-snack-bar-label, [aria-live=polite], [aria-live=assertive]')
    .map(txt).filter(Boolean).slice(0, 5);

  window.__flow = {
    v: 5, sleep, txt, panelState, openPanel, configure, models, selectModel, price, setPrompt, setFrame,
    addIngredient, clearPromptBar, generate, tiles, tileMenu, downloadOptions, scrollTop, bufReset, bufAdd,
    dropFile, account, errors, closeMenus, dlArm, dlStatus, dlChunk, dlDone,
  };
  return 'loaded';
})();
