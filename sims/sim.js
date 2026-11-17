/* Shared helpers for the book's simulations and games.  Every simulation page loads this file.
   SimKit.openInStatbelt({t:'title', n:['Col A','Col B'], c:[[...],[...]]}) opens STATBELT with the data.
   SimKit.barChart(svg, {...}) draws a bar chart with optional theoretical markers.
   ?embed=1 hides the page chrome so a chapter page can show the simulation in a collapsible box. */
(function(){
  const qs = new URLSearchParams(location.search);
  const embed = qs.get('embed') === '1';
  if (embed) document.documentElement.classList.add('embed');
  // On the book site (or a local test server) use the site's own STATBELT; anywhere else (the claude.ai preview,
  // a file opened from disk) use the live site, so the button never points at a page that isn't there.
  const onSite = /(^|\.)statswithtech\.(org|com)$|^localhost$|^127\.0\.0\.1$/.test(location.hostname) || /\.pages\.dev$/.test(location.hostname);
  // Opened from the unzipped site on a computer (file://): use the statbelt/ folder next to sims/.
  const here = (document.currentScript && document.currentScript.src) || location.href;
  const STATBELT = location.protocol === 'file:' ? new URL('../statbelt/index.html', here).href
                 : onSite ? '/statbelt/' : 'https://statswithtech.org/statbelt/';
  const MAX_ROWS = 2500;              // STATBELT's spreadsheet holds 2,500 rows

  function rint(a, b){ return a + Math.floor(Math.random() * (b - a + 1)); }
  function fmt(x, d){ return (Number.isFinite(x) ? x.toFixed(d == null ? 4 : d) : '–'); }
  function comma(n){ return n.toLocaleString('en-US'); }

  /* data = {t: title, n: [column names], c: [[values], ...]}; keeps the last 2,500 rows */
  function statbeltUrl(data){
    const c = data.c.map(col => col.length > MAX_ROWS ? col.slice(-MAX_ROWS) : col);
    return STATBELT + '#sim=' + encodeURIComponent(JSON.stringify({t: data.t, n: data.n, c}));
  }
  /* always a new tab, so the simulation (and its results) stay open behind STATBELT */
  function openInStatbelt(data){
    const a = document.createElement('a');
    a.href = statbeltUrl(data); a.target = '_blank'; a.rel = 'noopener';
    document.body.appendChild(a); a.click(); a.remove();
  }

  /* bar chart.  o = {labels, values, ref (optional theoretical values), ymax, ylabel, xlabel, title} */
  function barChart(svg, o){
    const W = 440, H = 280, L = 52, R = 8, T = 12, B = 48;
    const n = o.labels.length, pw = W - L - R, ph = H - T - B;
    const all = o.values.concat(o.ref || []);
    let ymax = o.ymax || Math.max(0.05, ...all) * 1.1;
    const step = niceStep(ymax / 5); ymax = Math.ceil(ymax / step) * step;
    const y = v => T + ph - (v / ymax) * ph, bw = pw / n;
    let s = '';
    for (let v = 0; v <= ymax + 1e-9; v += step){
      s += `<line x1="${L}" x2="${W-R}" y1="${y(v)}" y2="${y(v)}" stroke="#e3e6ec"/>`
         + `<text x="${L-6}" y="${y(v)+4}" text-anchor="end" font-size="14" fill="#5a5f6b">${+v.toFixed(3)}</text>`;
    }
    o.labels.forEach((lab, i) => {
      const x = L + i * bw, v = o.values[i] || 0;
      s += `<rect x="${x + bw*0.15}" y="${y(v)}" width="${bw*0.7}" height="${Math.max(0, T+ph-y(v))}" fill="#365F91"/>`;
      if (o.ref) s += `<line x1="${x + bw*0.08}" x2="${x + bw*0.92}" y1="${y(o.ref[i])}" y2="${y(o.ref[i])}" stroke="#C65A2C" stroke-width="3" stroke-dasharray="6 3"/>`;
      s += `<text x="${x + bw/2}" y="${T+ph+17}" text-anchor="middle" font-size="15" fill="#111">${lab}</text>`;
    });
    s += `<line x1="${L}" x2="${W-R}" y1="${T+ph}" y2="${T+ph}" stroke="#111"/>`;
    if (o.xlabel) s += `<text x="${L+pw/2}" y="${H-6}" text-anchor="middle" font-size="15" fill="#111">${o.xlabel}</text>`;
    if (o.ylabel) s += `<text transform="translate(15 ${T+ph/2}) rotate(-90)" text-anchor="middle" font-size="15" fill="#111">${o.ylabel}</text>`;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('role', 'img');
    if (o.title) svg.setAttribute('aria-label', o.title);
    svg.innerHTML = s;
  }
  /* line chart against x = 1..n.
     o = {x: [...], y: [...]}  (one series)  or  o = {x: [...], series: [{y: [...], color, dash, width}]};
     ref = horizontal reference line (optional); ymin / ymax (optional: fitted to the data, with 0 included);
     xlabel, ylabel, title.  Long series are thinned to about 1,000 points for drawing. */
  function lineChart(svg, o){
    const W = 440, H = 280, L = 58, R = 24, T = 12, B = 48, pw = W - L - R, ph = H - T - B;
    const series = o.series || [{y: o.y, color: '#365F91', width: 2, dots: true}];
    const n = o.x.length, xmax = Math.max(1, n ? o.x[n - 1] : 1);
    let ymin = o.ymin, ymax = o.ymax;
    if (ymin == null || ymax == null){
      let lo = 0, hi = 0;
      series.forEach(S => { for (let i = 0; i < S.y.length; i++){ const v = S.y[i]; if (v < lo) lo = v; if (v > hi) hi = v; } });
      if (o.ref != null){ lo = Math.min(lo, o.ref); hi = Math.max(hi, o.ref); }
      if (hi - lo < 1e-9){ hi += 1; lo -= 1; }
      const st = niceStep((hi - lo) / 5);
      if (ymin == null) ymin = Math.floor(lo / st) * st;
      if (ymax == null) ymax = Math.ceil(hi / st) * st;
    }
    const X = v => L + (v / xmax) * pw, Y = v => T + ph - ((v - ymin) / (ymax - ymin)) * ph;
    let s = '';
    const ys = niceStep((ymax - ymin) / 5);
    for (let v = Math.ceil(ymin / ys) * ys; v <= ymax + 1e-9; v += ys){
      const lab = o.money ? money(v, 0) : (+v.toFixed(3)).toLocaleString('en-US');
      s += `<line x1="${L}" x2="${W-R}" y1="${Y(v)}" y2="${Y(v)}" stroke="${Math.abs(v) < 1e-9 && ymin < 0 ? '#9aa3b2' : '#e3e6ec'}"/><text x="${L-6}" y="${Y(v)+4}" text-anchor="end" font-size="14" fill="#5a5f6b">${lab}</text>`;
    }
    const xs = niceStep(xmax / 4);
    for (let v = 0; v <= xmax + 1e-9; v += xs)
      s += `<line x1="${X(v)}" x2="${X(v)}" y1="${T+ph}" y2="${T+ph+5}" stroke="#111"/><text x="${X(v)}" y="${T+ph+19}" text-anchor="middle" font-size="14" fill="#111">${v.toLocaleString('en-US')}</text>`;
    if (o.ref != null) s += `<line x1="${L}" x2="${W-R}" y1="${Y(o.ref)}" y2="${Y(o.ref)}" stroke="#C65A2C" stroke-width="2.5" stroke-dasharray="7 4"/>`;
    if (n) series.forEach(S => {
      const step = Math.max(1, Math.floor(n / 1000)); let d = '';
      for (let i = 0; i < n; i += step) d += (d ? 'L' : 'M') + X(o.x[i]).toFixed(1) + ' ' + Y(S.y[i]).toFixed(1);
      d += 'L' + X(o.x[n-1]).toFixed(1) + ' ' + Y(S.y[n-1]).toFixed(1);
      s += `<path d="${d}" fill="none" stroke="${S.color}" stroke-width="${S.width || 2}"${S.dash ? ` stroke-dasharray="${S.dash}"` : ''} stroke-linejoin="round"/>`;
      if (S.dots && n <= 60) for (let i = 0; i < n; i++) s += `<circle cx="${X(o.x[i])}" cy="${Y(S.y[i])}" r="3" fill="${S.color}"/>`;
      if (!S.dash) s += `<circle cx="${X(o.x[n-1])}" cy="${Y(S.y[n-1])}" r="4.5" fill="#7030A0"/>`;
    });
    s += `<line x1="${L}" x2="${W-R}" y1="${T+ph}" y2="${T+ph}" stroke="#111"/><line x1="${L}" x2="${L}" y1="${T}" y2="${T+ph}" stroke="#111"/>`;
    if (o.xlabel) s += `<text x="${L+pw/2}" y="${H-6}" text-anchor="middle" font-size="15" fill="#111">${o.xlabel}</text>`;
    if (o.ylabel) s += `<text transform="translate(15 ${T+ph/2}) rotate(-90)" text-anchor="middle" font-size="15" fill="#111">${o.ylabel}</text>`;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('role', 'img');
    if (o.title) svg.setAttribute('aria-label', o.title);
    svg.innerHTML = s;
  }
  /* money(-12.5) -> "−$12.50"; money(30, 0) -> "$30" */
  function money(v, d){ d = d == null ? 2 : d; const a = Math.abs(v).toLocaleString('en-US', {minimumFractionDigits: d, maximumFractionDigits: d}); return (v < -1e-9 ? '−$' : '$') + a; }
  function niceStep(x){ const p = Math.pow(10, Math.floor(Math.log10(x))), m = x / p; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p; }

  /* in a chapter page's collapsible box, tell the page how tall the simulation is */
  if (embed && window.parent !== window){
    const send = () => parent.postMessage({simHeight: Math.ceil(document.documentElement.scrollHeight)}, '*');
    window.addEventListener('load', send);
    if ('ResizeObserver' in window) new ResizeObserver(send).observe(document.body);
  }
  /* links inside an embedded simulation open in a new tab, not inside the box */
  if (embed) document.addEventListener('click', e => { const a = e.target.closest('a[href]'); if (a) a.target = '_blank'; });

  window.SimKit = {embed, rint, fmt, comma, statbeltUrl, openInStatbelt, barChart, lineChart, money, MAX_ROWS};
})();
