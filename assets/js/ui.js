/**
 * @file ui.js
 * @description Biblioteca de componentes de interface reutilizáveis.
 *
 * Todos os componentes de marcação retornam strings HTML (renderização por
 * template), o que mantém o app sem dependências e sem etapa de build.
 * Os overlays (drawer, modal, toast) manipulam o DOM diretamente.
 *
 * SEGURANCA: todo texto vindo do usuário passa por `esc()` antes de entrar
 * em template HTML, evitando injeção de marcação.
 *
 * Dependências: Store (window.Store). Exposto como `window.UI`.
 */
(function () {
  'use strict';
  const S = window.Store;

  /**
   * Escapa texto para inserção segura em HTML e atributos.
   * @param {any} v
   * @returns {string}
   */
  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // ---------------------------------------------------------------------------
  // Ícones (traço 1.8px, estilo linear — paths no padrão Lucide)
  // ---------------------------------------------------------------------------
  const ICONS = {
    dashboard: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
    target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    pulse: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
    list: '<path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/><path d="M13 6h8M13 12h8M13 18h8"/>',
    compass: '<circle cx="12" cy="12" r="10"/><path d="m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36z"/>',
    sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    edit: '<path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
    trash: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    chevDown: '<path d="m6 9 6 6 6-6"/>',
    chevRight: '<path d="m9 18 6-6-6-6"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    grip: '<circle cx="9" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="18" r="1"/>',
    up: '<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
    down: '<path d="m22 17-8.5-8.5-5 5L2 7"/><path d="M16 17h6v-6"/>',
    flat: '<path d="M5 12h14"/>',
    alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4M12 17h.01"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    userx: '<circle cx="10" cy="8" r="4"/><path d="M2 21a8 8 0 0 1 13.3-6M17 17l5 5M22 17l-5 5"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    checkCircle: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
    flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/>',
    table: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/>',
    board: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
    monitor: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5M12 15V3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5M12 3v12"/>',
    refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
    eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
    gem: '<path d="M6 3h12l4 6-10 13L2 9Z"/><path d="M11 3 8 9l4 13 4-13-3-6M2 9h20"/>',
    rocket: '<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    note: '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>',
    layers: '<path d="m12 2 10 5-10 5L2 7l10-5Z"/><path d="m2 17 10 5 10-5M2 12l10 5 10-5"/>',
    arrowRight: '<path d="M5 12h14m-7-7 7 7-7 7"/>',
    minus: '<path d="M5 12h14"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    formula: '<path d="M4 20h4l8-16h4M6 12h8"/>',
    inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
    sparkle: '<path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>',
  };

  /**
   * Gera um ícone SVG inline.
   * @param {string} name - Chave em ICONS.
   * @param {number} [size=18] - Tamanho em px.
   * @returns {string} Marcação SVG.
   */
  function icon(name, size) {
    const s = size || 18;
    return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || '') + '</svg>';
  }

  /**
   * Marca da VISTA: moldura de visor (cantos) com um "V" ao centro —
   * referência direta ao enquadramento fotográfico.
   */
  function logoMark(size) {
    const s = size || 22;
    return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3"/>' +
      '<path d="m8 8.5 4 7.5 4-7.5" stroke="#bdf1e5" stroke-width="2.1"/></svg>';
  }

  // ---------------------------------------------------------------------------
  // Formatação
  // ---------------------------------------------------------------------------
  const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

  /** "2026-10-20" → "20 out". Com `year`, → "20 out 2026". */
  function fmtDate(iso, year) {
    const d = S.parseDate(iso);
    if (!d) return '—';
    return d.getDate() + ' ' + MONTHS[d.getMonth()] + (year ? ' ' + d.getFullYear() : '');
  }

  /** Número no padrão brasileiro, até 1 casa decimal. */
  function fmtNum(n) {
    const v = S.num(n);
    return v.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  }

  /** Unidade monetária: o símbolo vai antes do número ("R$ 20.000"). */
  const isMoney = (unit) => /^R\$$/.test(String(unit || '').trim());

  /**
   * Valor com unidade, respeitando a posição do símbolo monetário.
   * @param {number|string} n
   * @param {string} unit
   * @returns {string} Ex.: "R$ 20.000" ou "5 clientes".
   * @example fmtValue(20000, 'R$') // "R$ 20.000"
   */
  function fmtValue(n, unit) {
    if (isMoney(unit)) return 'R$ ' + fmtNum(n);
    return fmtNum(n) + (unit ? ' ' + unit : '');
  }

  /** Fração 0–1 → "42%". */
  const pct = (f) => Math.round((f || 0) * 100) + '%';

  /** Texto relativo de prazo: "hoje", "em 3 dias", "há 2 dias". */
  function relDays(iso) {
    const d = S.daysUntil(iso);
    if (d === null) return '';
    if (d === 0) return 'hoje';
    if (d === 1) return 'amanhã';
    if (d > 0) return 'em ' + d + ' dias';
    return 'há ' + Math.abs(d) + (d === -1 ? ' dia' : ' dias');
  }

  /** Iniciais do nome para o avatar ("Sucesso do Cliente" → "SC"). */
  function initials(name) {
    // ignora conectivos para que "Sucesso do Cliente" vire "SC", não "SD"
    const parts = String(name || '').split(/\s+/).filter((p) => p && !/^(de|da|do|das|dos|e)$/i.test(p));
    return ((parts[0] || '?')[0] + ((parts[1] || '')[0] || '')).toUpperCase();
  }

  // ---------------------------------------------------------------------------
  // Componentes de marcação
  // ---------------------------------------------------------------------------

  /** Badge de status (não iniciado / em andamento / concluído / em risco). */
  const statusBadge = (st) => '<span class="badge st-' + esc(st) + '">' + esc(S.STATUS[st] || st) + '</span>';
  /** Badge de prioridade. */
  const priorityBadge = (p) => '<span class="badge plain pr-' + esc(p) + '">' + icon('flag', 12) + ' ' + esc(S.PRIORITY[p] || p) + '</span>';

  /**
   * Select estilizado como badge para troca rápida de status.
   * @param {string} st - Status atual.
   * @param {string} attrs - Atributos data-* que identificam o item.
   */
  function statusSelect(st, attrs) {
    return '<span class="badge-select st-' + esc(st) + '"><select class="st-' + esc(st) + '" ' + attrs + ' aria-label="Alterar status">' +
      Object.keys(S.STATUS).map((k) => '<option value="' + k + '"' + (k === st ? ' selected' : '') + '>' + S.STATUS[k] + '</option>').join('') +
      '</select></span>';
  }

  /** Avatares sobrepostos dos ocupantes de um cargo (cor fixa por pessoa). */
  function avatars(holders) {
    return '<span class="avatars">' + holders.map((h) =>
      '<span class="avatar" style="background:' + esc(h.color) + '" title="' + esc(h.name) + '">' + esc(initials(h.name)) + '</span>').join('') + '</span>';
  }

  /**
   * Vários responsáveis (planos de ação): avatares de todas as pessoas
   * envolvidas, cargos separados por vírgula e nomes logo abaixo.
   * Com um único cargo, equivale a {@link person}.
   * @param {string[]} ids - Ids de cargo.
   * @param {boolean} [compact] - Só os avatares, com cargos e nomes no tooltip.
   * @returns {string}
   */
  function people(ids, compact) {
    const list = (ids || []).map((id) => S.owner(id)).filter(Boolean);
    if (list.length <= 1) return person(ids && ids[0], compact);
    const holders = [];
    list.forEach((o) => o.holders.forEach((h) => { if (!holders.some((x) => x.name === h.name)) holders.push(h); }));
    const titles = list.map((o) => o.title).join(', ');
    const names = holders.map((h) => h.name).join(', ');
    return '<span class="person" title="' + esc(titles + ' · ' + names) + '">' + avatars(holders) +
      (compact ? '' : '<span class="who"><span class="role">' + esc(titles) + '</span><small>' + esc(names) + '</small></span>') + '</span>';
  }

  /**
   * Responsável (cargo da macroestrutura): avatares dos ocupantes + cargo,
   * com os nomes logo abaixo. Destaca em âmbar quando não há responsável.
   * @param {string} ownerId - Id do cargo (ou de um responsável antigo).
   * @param {boolean} [compact] - Só os avatares, com cargo e nomes no tooltip.
   * @returns {string}
   */
  function person(ownerId, compact) {
    const o = S.owner(ownerId);
    if (!o) return '<span class="person none" title="Sem responsável"><span class="avatar">?</span>' + (compact ? '' : '<span>Sem responsável</span>') + '</span>';
    const tip = o.title + (o.sub ? ' · ' + o.sub : '');
    return '<span class="person" title="' + esc(tip) + '">' + avatars(o.holders) +
      (compact ? '' : '<span class="who"><span class="role">' + esc(o.title) + '</span>' + (o.sub ? '<small>' + esc(o.sub) + '</small>' : '') + '</span>') + '</span>';
  }

  /**
   * Data de prazo com destaque: vermelho se atrasado, âmbar se ≤ 7 dias.
   * @param {string} iso
   * @param {string} [status] - Itens concluídos nunca aparecem como atrasados.
   */
  function dateTag(iso, status) {
    if (!iso) return '<span class="date faint">' + icon('calendar', 14) + ' Sem prazo</span>';
    const d = S.daysUntil(iso);
    const cls = status === 'done' ? '' : d < 0 ? 'overdue' : d <= 7 ? 'soon' : '';
    return '<span class="date ' + cls + '" title="' + esc(relDays(iso)) + '">' + icon(d < 0 && status !== 'done' ? 'clock' : 'calendar', 14) + ' ' + fmtDate(iso) + '</span>';
  }

  /**
   * Barra de progresso com gradiente da marca.
   * @param {number} f - Fração 0–1.
   * @param {object} [o]
   * @param {'sm'|'lg'} [o.size]
   * @param {string} [o.status] - Muda a cor do preenchimento (done/at_risk).
   * @param {number} [o.pace] - Fração 0–1 do ritmo esperado (marcador vertical).
   * @param {boolean} [o.hideVal]
   */
  function progress(f, o) {
    o = o || {};
    const cls = o.status === 'done' || f >= 1 ? 'done' : o.status === 'at_risk' ? 'risk' : '';
    const pace = o.pace != null ? '<i class="pace" style="left:calc(' + (o.pace * 100).toFixed(1) + '% - 1px)" title="Ritmo esperado hoje: ' + pct(o.pace) + '"></i>' : '';
    return '<div class="progress ' + (o.size || '') + '" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + Math.round(f * 100) + '">' +
      '<div class="track"><div class="fill ' + cls + '" style="width:' + (f * 100).toFixed(1) + '%"></div>' + pace + '</div>' +
      (o.hideVal ? '' : '<span class="val num">' + pct(f) + '</span>') + '</div>';
  }

  /** Estado vazio com ícone, título, texto e ação opcional. */
  function empty(ic, title, text, actionHtml) {
    return '<div class="empty"><div class="ico">' + icon(ic, 24) + '</div><h4>' + esc(title) + '</h4><p>' + esc(text) + '</p>' + (actionHtml || '') + '</div>';
  }

  // ---------------------------------------------------------------------------
  // Gráficos SVG leves
  // ---------------------------------------------------------------------------

  /**
   * Anel de progresso (usado no hero do dashboard).
   * @param {number} f - Fração 0–1.
   * @param {number} size - Diâmetro em px.
   * @param {number} stroke - Espessura do traço em px.
   */
  function ring(f, size, stroke) {
    const r = (size - stroke) / 2, c = 2 * Math.PI * r;
    const gid = 'rg' + Math.random().toString(36).slice(2, 7);
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" aria-hidden="true">' +
      '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#bdf1e5"/><stop offset="1" stop-color="#4fcfb9"/></linearGradient></defs>' +
      '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="' + stroke + '"/>' +
      '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="url(#' + gid + ')" stroke-width="' + stroke + '" stroke-linecap="round" ' +
      'stroke-dasharray="' + (c * f).toFixed(2) + ' ' + c.toFixed(2) + '" transform="rotate(-90 ' + size / 2 + ' ' + size / 2 + ')"/></svg>';
  }

  /**
   * Sparkline com área em gradiente, linha da meta tracejada e ponto final
   * destacado. A escala Y inclui a meta para que ela seja sempre visível.
   * @param {number[]} values
   * @param {number} [target]
   * @param {object} [o] - { height }
   */
  function sparkline(values, target, o) {
    o = o || {};
    const W = 240, H = o.height || 44, P = 4;
    const vals = (values || []).map(S.num);
    if (vals.length < 2) {
      return '<svg class="spark" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" aria-hidden="true"><line x1="0" y1="' + (H - 6) + '" x2="' + W + '" y2="' + (H - 6) + '" style="stroke:var(--border-strong)" stroke-dasharray="3 4"/></svg>';
    }
    const all = target != null && target !== '' ? vals.concat([S.num(target)]) : vals;
    let min = Math.min.apply(null, all), max = Math.max.apply(null, all);
    if (max === min) { max += 1; min -= 1; }
    const x = (i) => P + (i * (W - P * 2)) / (vals.length - 1);
    const y = (v) => H - P - ((v - min) / (max - min)) * (H - P * 2);
    const pts = vals.map((v, i) => x(i).toFixed(1) + ',' + y(v).toFixed(1));
    const gid = 'sg' + Math.random().toString(36).slice(2, 7);
    const last = vals.length - 1;
    const tLine = target != null && target !== '' ? '<line x1="0" x2="' + W + '" y1="' + y(S.num(target)).toFixed(1) + '" y2="' + y(S.num(target)).toFixed(1) + '" style="stroke:var(--text-3)" stroke-width="1" stroke-dasharray="3 4" vector-effect="non-scaling-stroke"/>' : '';
    // o ponto final é um elemento HTML (em %) para não ser deformado pelo
    // preserveAspectRatio="none" que estica o SVG na largura do card
    const dot = '<i class="spark-dot" style="left:' + (x(last) / W * 100).toFixed(2) + '%;top:' + (y(vals[last]) / H * 100).toFixed(2) + '%"></i>';
    return '<span class="spark-wrap" style="height:' + H + 'px"><svg class="spark" style="height:' + H + 'px" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" aria-hidden="true">' +
      '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--accent);stop-opacity:.28"/><stop offset="1" style="stop-color:var(--accent);stop-opacity:0"/></linearGradient></defs>' +
      tLine +
      '<path d="M' + pts[0] + ' L' + pts.slice(1).join(' L') + ' L' + x(last).toFixed(1) + ',' + H + ' L' + x(0).toFixed(1) + ',' + H + ' Z" fill="url(#' + gid + ')"/>' +
      '<polyline points="' + pts.join(' ') + '" fill="none" style="stroke:var(--accent)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>' +
      '</svg>' + dot + '</span>';
  }

  // ---------------------------------------------------------------------------
  // Overlays
  // ---------------------------------------------------------------------------
  let scrimEl = null;
  /** Mostra/oculta o fundo escurecido compartilhado por drawer e modal. */
  function scrim(show, onClick) {
    if (show) {
      if (!scrimEl) {
        scrimEl = document.createElement('div');
        scrimEl.className = 'scrim';
        document.body.appendChild(scrimEl);
        requestAnimationFrame(() => scrimEl && scrimEl.classList.add('open'));
      }
      scrimEl.onclick = onClick;
    } else if (scrimEl) {
      const el = scrimEl; scrimEl = null;
      el.classList.remove('open');
      setTimeout(() => el.remove(), 250);
    }
  }

  let drawerEl = null;
  let lastFocus = null;

  /**
   * Abre um painel lateral (drawer) com formulário.
   * @param {object} cfg
   * @param {string} cfg.title
   * @param {string} [cfg.subtitle]
   * @param {string} cfg.body - HTML do corpo (normalmente campos de formulário).
   * @param {string} [cfg.submitLabel='Salvar']
   * @param {(form: HTMLFormElement) => (boolean|void)} cfg.onSubmit - Retorne false para manter aberto.
   * @param {() => void} [cfg.onDelete] - Se presente, exibe botão "Excluir".
   * @param {(el: HTMLElement) => void} [cfg.onMount] - Hook para ligar eventos internos.
   */
  function openDrawer(cfg) {
    closeDrawer(true);
    lastFocus = document.activeElement;
    scrim(true, () => closeDrawer());
    const el = document.createElement('aside');
    el.className = 'drawer';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', cfg.title);
    el.innerHTML =
      '<form novalidate>' +
      '<div class="drawer-head"><div><h3>' + esc(cfg.title) + '</h3>' + (cfg.subtitle ? '<div class="sub">' + esc(cfg.subtitle) + '</div>' : '') + '</div>' +
      '<button type="button" class="icon-btn" data-close aria-label="Fechar">' + icon('x') + '</button></div>' +
      '<div class="drawer-body">' + cfg.body + '</div>' +
      '<div class="drawer-foot">' +
      (cfg.onDelete ? '<button type="button" class="btn btn-danger" data-delete>' + icon('trash', 16) + ' Excluir</button>' : '') +
      '<span class="grow"></span>' +
      '<button type="button" class="btn btn-ghost" data-close>Cancelar</button>' +
      '<button type="submit" class="btn btn-primary">' + icon('check', 16) + ' ' + esc(cfg.submitLabel || 'Salvar') + '</button>' +
      '</div></form>';
    // o form precisa ocupar toda a altura para que o rodapé fique fixo
    el.firstChild.style.cssText = 'display:flex;flex-direction:column;height:100%';
    document.body.appendChild(el);
    drawerEl = el;
    requestAnimationFrame(() => el.classList.add('open'));

    el.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => closeDrawer()));
    const del = el.querySelector('[data-delete]');
    if (del) del.addEventListener('click', () => cfg.onDelete());
    el.querySelector('form').addEventListener('submit', (e) => {
      e.preventDefault();
      const form = e.target;
      // validação nativa dos campos obrigatórios, com foco no primeiro inválido
      const invalid = form.querySelector(':invalid');
      if (invalid) { invalid.focus(); invalid.reportValidity && invalid.reportValidity(); return; }
      if (cfg.onSubmit(form) !== false) closeDrawer();
    });
    if (cfg.onMount) cfg.onMount(el);
    setTimeout(() => { const f = el.querySelector('input:not([type=hidden]), textarea, select'); if (f) f.focus(); }, 60);
  }

  /** Fecha o drawer aberto (se houver). */
  function closeDrawer(instant) {
    if (!drawerEl) return;
    const el = drawerEl; drawerEl = null;
    el.classList.remove('open');
    if (!instant) scrim(false);
    setTimeout(() => el.remove(), instant ? 0 : 320);
    if (!instant && lastFocus && lastFocus.focus) lastFocus.focus();
  }

  let modalEl = null;
  /**
   * Modal genérico (confirmação ou pequeno formulário).
   * NOTA: substitui window.confirm/prompt, que não funcionam em todos os ambientes.
   * @param {object} cfg
   * @param {string} cfg.title
   * @param {string} [cfg.text]
   * @param {string} [cfg.body] - HTML extra (campos).
   * @param {string} [cfg.confirmLabel='Confirmar']
   * @param {boolean} [cfg.danger] - Estilo destrutivo.
   * @param {string} [cfg.icon]
   * @param {(el: HTMLElement) => (boolean|void)} cfg.onConfirm - Retorne false para manter aberto.
   */
  function openModal(cfg) {
    closeModal();
    const prevFocus = document.activeElement;
    const keepDrawer = !!drawerEl;
    if (!keepDrawer) scrim(true, () => closeModal());
    const el = document.createElement('div');
    el.className = 'modal';
    el.setAttribute('role', 'alertdialog');
    el.setAttribute('aria-modal', 'true');
    el.innerHTML =
      '<form novalidate><div class="m-ico ' + (cfg.danger ? '' : 'neutral') + '">' + icon(cfg.icon || (cfg.danger ? 'trash' : 'sparkle'), 22) + '</div>' +
      '<h3>' + esc(cfg.title) + '</h3>' + (cfg.text ? '<p>' + esc(cfg.text) + '</p>' : '') +
      (cfg.body ? '<div class="m-body">' + cfg.body + '</div>' : '') +
      '<div class="m-foot"><button type="button" class="btn btn-ghost" data-cancel>Cancelar</button>' +
      '<button type="submit" class="btn ' + (cfg.danger ? 'btn-danger' : 'btn-primary') + '">' + esc(cfg.confirmLabel || 'Confirmar') + '</button></div></form>';
    document.body.appendChild(el);
    if (keepDrawer) el.style.zIndex = 110;
    modalEl = el;
    modalEl._restore = () => { if (!keepDrawer) scrim(false); if (prevFocus && prevFocus.focus) prevFocus.focus(); };
    requestAnimationFrame(() => el.classList.add('open'));
    el.querySelector('[data-cancel]').addEventListener('click', () => closeModal());
    el.querySelector('form').addEventListener('submit', (e) => {
      e.preventDefault();
      const invalid = el.querySelector(':invalid');
      if (invalid) { invalid.focus(); return; }
      if (cfg.onConfirm(el) !== false) closeModal();
    });
    setTimeout(() => { const f = el.querySelector('input, textarea, select') || el.querySelector('[type=submit]'); f && f.focus(); }, 60);
  }

  /** Fecha o modal aberto (se houver). */
  function closeModal() {
    if (!modalEl) return;
    const el = modalEl; modalEl = null;
    el.classList.remove('open');
    el._restore && el._restore();
    setTimeout(() => el.remove(), 220);
  }

  /** Atalho para confirmação de exclusão. */
  function confirmDelete(title, text, onYes) {
    openModal({ title, text, danger: true, confirmLabel: 'Excluir', onConfirm: () => { onYes(); } });
  }

  let toastsEl = null;
  /**
   * Notificação temporária no rodapé.
   * @param {string} msg
   * @param {object} [o]
   * @param {string} [o.actionLabel] - Ex.: "Desfazer".
   * @param {() => void} [o.onAction]
   * @param {number} [o.ms=4200] - Duração em milissegundos.
   */
  function toast(msg, o) {
    o = o || {};
    if (!toastsEl) { toastsEl = document.createElement('div'); toastsEl.className = 'toasts'; toastsEl.setAttribute('aria-live', 'polite'); document.body.appendChild(toastsEl); }
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = icon('checkCircle', 16) + '<span>' + esc(msg) + '</span>' + (o.actionLabel ? '<button type="button">' + esc(o.actionLabel) + '</button>' : '');
    toastsEl.appendChild(t);
    const kill = () => { t.style.opacity = '0'; t.style.transition = 'opacity .2s'; setTimeout(() => t.remove(), 200); };
    if (o.actionLabel) t.querySelector('button').addEventListener('click', () => { o.onAction && o.onAction(); kill(); });
    setTimeout(kill, o.ms || 4200);
  }

  /** Esc fecha o overlay do topo. */
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (modalEl) closeModal(); else if (drawerEl) closeDrawer();
  });

  window.UI = {
    esc, icon, logoMark, fmtDate, fmtNum, fmtValue, isMoney, pct, relDays, initials,
    statusBadge, priorityBadge, statusSelect, person, people, avatars, dateTag, progress,
    empty, ring, sparkline,
    openDrawer, closeDrawer, openModal, closeModal, confirmDelete, toast,
    get drawerOpen() { return !!drawerEl; },
  };
})();
