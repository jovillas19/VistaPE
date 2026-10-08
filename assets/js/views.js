/**
 * @file views.js
 * @description Renderizadores das seis áreas do painel.
 *
 * Cada view expõe `render()` → string HTML. A interação é tratada por
 * delegação de eventos em app.js via atributos `data-act`, `data-id`,
 * `data-drag`, `data-filter` etc. — por isso as views não registram
 * listeners próprios (exceto o salvamento silencioso do MVV, em app.js).
 *
 * Dependências: Store, UI. Exposto como `window.Views`.
 */
(function () {
  'use strict';
  const S = window.Store;
  const U = window.UI;
  const esc = U.esc;
  const ic = U.icon;

  /** Cor sólida por status — usada em gráficos (via var CSS, segue o tema). */
  const ST_COLOR = { not_started: 'var(--st-idle)', in_progress: 'var(--st-progress)', done: 'var(--st-done)', at_risk: 'var(--st-risk)' };
  const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };

  /** Cabeçalho padrão de página. */
  function pageHead(title, text, actions) {
    return '<div class="page-head"><div><h2>' + esc(title) + '</h2>' + (text ? '<p>' + esc(text) + '</p>' : '') + '</div>' +
      (actions ? '<div class="actions">' + actions + '</div>' : '') + '</div>';
  }

  /** Quantidade de planos ligados a um KR. */
  const actionsOfKr = (krId) => S.state.actions.filter((a) => a.krId === krId);

  // ===========================================================================
  // 1. DASHBOARD
  // ===========================================================================
  function dashboard() {
    const s = S.state;
    const overall = S.overallProgress();
    const h = S.health();
    const elapsed = S.cycleElapsed();
    const krDone = s.krs.filter((k) => k.status === 'done').length;
    const krRisk = s.krs.filter((k) => k.status === 'at_risk').length;
    const actDone = s.actions.filter((a) => a.status === 'done').length;
    const overdue = s.actions.filter(S.isOverdue).length;
    const kpiOnTarget = s.kpis.filter((k) => k.target !== '' && S.kpiAttainment(k) >= 1).length;
    const objRisk = s.objectives.filter((o) => S.objectiveStatus(o) === 'at_risk').length;
    // Cores do semáforo sobre o hero (fundo sempre escuro, nos dois temas)
    const healthDot = { good: '#7fe7b8', warn: '#ffd27a', risk: '#ff9f7f' }[h.key];
    const totalDays = Math.max(1, S.daysUntil(s.company.cycleEnd) - S.daysUntil(s.company.cycleStart));

    const hero =
      '<section class="hero">' +
      '<i class="finder tl"></i><i class="finder tr"></i><i class="finder bl"></i><i class="finder br"></i>' +
      '<div><div class="eyebrow">Ciclo ' + esc(s.company.cycle) + ' · ' + U.fmtDate(s.company.cycleStart) + ' – ' + U.fmtDate(s.company.cycleEnd, true) + '</div>' +
      '<h2>Visão executiva da estratégia</h2>' +
      '<p>' + esc(h.desc) + ' Pelo calendário, o esperado hoje é ' + U.pct(elapsed) + ' do caminho; a estratégia está em ' + U.pct(overall) + '.</p>' +
      '<span class="health"><i style="background:' + healthDot + '"></i>' + esc(h.label) + '</span></div>' +
      '<div class="ring-wrap">' + U.ring(overall, 148, 12) + '<div class="center"><div><b class="num">' + Math.round(overall * 100) + '<small style="font-size:18px">%</small></b><span>progresso geral</span></div></div></div>' +
      '<div class="facts">' +
      '<div class="fact"><b class="num">' + S.cycleDaysLeft() + '</b><span>dias restantes no ciclo</span></div>' +
      '<div class="fact"><b class="num">' + U.pct(elapsed) + '</b><span>do trimestre decorrido (' + totalDays + ' dias)</span></div>' +
      '<div class="fact"><b class="num">' + krDone + '/' + s.krs.length + '</b><span>KRs concluídos</span></div>' +
      '<div class="fact"><b class="num">' + actDone + '/' + s.actions.length + '</b><span>planos concluídos</span></div>' +
      '</div></section>';

    const stat = (href, icon, value, label, foot) =>
      '<a class="card stat" href="#' + href + '"><div class="top"><span class="ico">' + ic(icon, 18) + '</span>' + ic('arrowRight', 16) + '</div>' +
      '<div><div class="big num">' + value + '</div><div class="lbl">' + label + '</div></div><div class="foot">' + foot + '</div></a>';
    const stats = '<section class="stats">' +
      stat('okrs', 'target', s.objectives.length, 'Objetivos estratégicos', objRisk ? '<span><b>' + objRisk + '</b> com KR em risco</span>' : '<span>Nenhum objetivo em risco</span>') +
      stat('okrs', 'layers', s.krs.length, 'Key Results', '<span><b>' + krDone + '</b> concluídos</span><span><b>' + krRisk + '</b> em risco</span>') +
      stat('indicadores', 'pulse', s.kpis.length, 'Indicadores', '<span><b>' + kpiOnTarget + '</b> na meta</span><span><b>' + (s.kpis.length - kpiOnTarget) + '</b> abaixo</span>') +
      stat('planos', 'list', s.actions.length, 'Planos de ação', '<span><b>' + overdue + '</b> atrasados</span><span><b>' + actDone + '</b> concluídos</span>') +
      '</section>';

    // --- Progresso por objetivo (com marcador de ritmo esperado) ---
    const objRows = s.objectives.length ? s.objectives.map((o, i) => {
      const st = S.objectiveStatus(o);
      const krLines = S.krsOf(o.id).map((k) =>
        '<div class="kr-line"><span title="' + esc(k.title) + '"><span class="mono" style="font-size:11px;color:var(--accent-text)">KR' + (S.krsOf(o.id).indexOf(k) + 1) + '</span> ' + esc(k.title) + '</span>' +
        U.progress(S.krProgress(k), { size: 'sm', status: k.status }) + '</div>').join('');
      return '<div class="row"><div class="row-head"><span class="name"><i class="obj-dot" style="background:' + esc(o.color) + '"></i><span title="' + esc(o.title) + '">O' + (i + 1) + ' · ' + esc(o.title) + '</span></span>' + U.statusBadge(st) + '</div>' +
        U.progress(S.objectiveProgress(o), { size: 'lg', pace: elapsed, status: st }) +
        (krLines ? '<div class="krs">' + krLines + '</div>' : '') + '</div>';
    }).join('') : U.empty('target', 'Nenhum objetivo ainda', 'Comece definindo o primeiro objetivo do ciclo.', '<button class="btn btn-primary" data-act="new-objective">' + ic('plus', 16) + ' Novo objetivo</button>');

    const progressCard = '<div class="card card-pad"><div class="card-head"><div><h3>Progresso por objetivo</h3><div class="sub">Média dos KRs de cada objetivo</div></div>' +
      '<span class="legend-pace"><i></i> ritmo esperado hoje</span></div><div class="obj-progress">' + objRows + '</div></div>';

    // --- Indicadores principais ---
    const kpiCard = '<div class="card card-pad"><div class="card-head"><div><h3>Indicadores principais</h3><div class="sub">Valor atual, meta e evolução recente</div></div>' +
      '<a class="btn btn-ghost btn-sm" href="#indicadores">Ver todos ' + ic('arrowRight', 14) + '</a></div>' +
      (s.kpis.length ? '<div class="kpi-mini-grid">' + s.kpis.slice(0, 6).map((k) =>
        '<button type="button" class="kpi-mini" data-act="edit-kpi" data-id="' + esc(k.id) + '">' +
        '<span class="n">' + esc(k.name) + '</span>' +
        '<span class="v"><b class="num">' + U.fmtNum(k.current) + '</b><span>' + esc(k.unit) + (k.target !== '' ? ' · meta ' + U.fmtNum(k.target) : '') + '</span></span>' +
        U.sparkline(k.history, k.target, { height: 36 }) +
        '<span style="display:flex;justify-content:space-between;align-items:center;margin-top:4px">' + U.trendTag(k) + '<span class="mono faint" style="font-size:11px">' + U.pct(S.kpiAttainment(k)) + ' da meta</span></span>' +
        '</button>').join('') + '</div>' : U.empty('pulse', 'Sem indicadores', 'Cadastre os KPIs que medem a saúde da estratégia.'))
      + '</div>';

    // --- Alertas ---
    const al = S.alerts();
    const alertsCard = '<div class="card card-pad"><div class="card-head"><div><h3>Alertas</h3><div class="sub">Atrasos, riscos e itens sem dono</div></div>' +
      (al.length ? '<span class="badge st-at_risk">' + al.length + '</span>' : '') + '</div>' +
      (al.length ? '<div class="alerts">' + al.slice(0, 6).map((a) =>
        '<button type="button" class="alert ' + a.type + '" data-act="open-item" data-kind="' + a.kind + '" data-id="' + esc(a.id) + '">' +
        '<span class="ico">' + ic(a.icon, 16) + '</span><span style="min-width:0"><span class="t" style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(a.title) + '</span><span class="d">' + esc(a.detail) + '</span></span></button>').join('') +
        (al.length > 6 ? '<a class="btn btn-ghost btn-sm" href="#planos" style="align-self:flex-start">+ ' + (al.length - 6) + ' outros alertas</a>' : '') + '</div>'
        : '<div class="alerts-ok">' + ic('checkCircle', 18) + ' Tudo em dia: nenhum atraso ou item sem responsável.</div>') + '</div>';

    // --- Resumo de status (planos + KRs) ---
    const counts = Object.keys(S.STATUS).map((k) => ({ key: k, value: s.actions.filter((a) => a.status === k).length }));
    const krCounts = Object.keys(S.STATUS).map((k) => ({ key: k, value: s.krs.filter((x) => x.status === k).length }));
    const statusCard = '<div class="card card-pad"><div class="card-head"><div><h3>Status da execução</h3><div class="sub">Planos de ação por status</div></div></div>' +
      '<div class="status-summary"><div class="donut-wrap">' + U.donut(counts.map((c) => ({ value: c.value, color: ST_COLOR[c.key] })), 132, 16) +
      '<div class="center"><div><b class="num">' + s.actions.length + '</b><span>planos</span></div></div></div>' +
      '<div class="legend">' + counts.map((c) => '<div class="li"><i class="sw" style="background:' + ST_COLOR[c.key] + '"></i>' + S.STATUS[c.key] + '<b class="num">' + c.value + '</b></div>').join('') + '</div></div>' +
      '<div style="margin-top:18px" class="eyebrow">Key Results por status</div>' +
      '<div class="kr-status-strip">' + krCounts.filter((c) => c.value).map((c) => '<span title="' + S.STATUS[c.key] + ': ' + c.value + '" style="flex:' + c.value + ';background:' + ST_COLOR[c.key] + '"></span>').join('') + '</div>' +
      '<div style="display:flex;gap:14px;flex-wrap:wrap;margin-top:8px;font-size:12px" class="muted">' + krCounts.filter((c) => c.value).map((c) => '<span>' + S.STATUS[c.key] + ' <b class="num">' + c.value + '</b></span>').join('') + '</div>' +
      '</div>';

    // --- Próximos passos / prazos ---
    const up = S.upcoming(6);
    const upcomingCard = '<div class="card card-pad"><div class="card-head"><div><h3>Próximos passos</h3><div class="sub">Entregas pendentes por prazo</div></div><a class="btn btn-ghost btn-sm" href="#planos">Planos ' + ic('arrowRight', 14) + '</a></div>' +
      (up.length ? '<div class="timeline">' + up.map(({ kind, item }) => {
        const d = S.parseDate(item.deadline);
        const over = S.daysUntil(item.deadline) < 0;
        const kr = kind === 'krs' ? item : S.byId('krs', item.krId);
        const ref = kind === 'krs' ? 'Key Result' : (kr ? kr.title : 'Plano de ação');
        return '<div class="tl-item ' + (over ? 'overdue' : '') + '" role="button" tabindex="0" data-act="open-item" data-kind="' + kind + '" data-id="' + esc(item.id) + '">' +
          '<div class="tl-date"><b class="num">' + d.getDate() + '</b><span>' + ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][d.getMonth()] + '</span></div>' +
          '<div style="min-width:0"><div class="t">' + esc(item.title) + '</div><div class="d">' + esc(ref) + ' · ' + esc(U.relDays(item.deadline)) + '</div></div>' +
          U.person(item.owner, true) + '</div>';
      }).join('') + '</div>' : U.empty('calendar', 'Sem prazos pendentes', 'Defina prazos nos planos de ação para vê-los aqui.')) + '</div>';

    // --- Cards de objetivo ---
    const objCards = s.objectives.length ? '<section><div class="page-head" style="margin-bottom:14px"><div><h2 style="font-size:20px">Objetivos do ciclo</h2></div>' +
      '<a class="btn btn-sm" href="#okrs">Gerenciar OKRs ' + ic('arrowRight', 14) + '</a></div><div class="obj-cards">' +
      s.objectives.map((o, i) => {
        const krs = S.krsOf(o.id);
        const acts = s.actions.filter((a) => a.objectiveId === o.id);
        return '<article class="card obj-card" role="button" tabindex="0" data-act="goto-objective" data-id="' + esc(o.id) + '">' +
          '<span class="glow" style="background:' + esc(o.color) + '"></span>' +
          '<div class="head"><span class="eyebrow">Objetivo ' + (i + 1) + '</span>' + U.statusBadge(S.objectiveStatus(o)) + '</div>' +
          '<div><h4>' + esc(o.title) + '</h4>' + (o.description ? '<p class="muted" style="font-size:13px;margin-top:6px">' + esc(o.description) + '</p>' : '') + '</div>' +
          U.progress(S.objectiveProgress(o), { status: S.objectiveStatus(o) }) +
          '<div class="meta"><span>' + ic('layers', 14) + ' ' + krs.length + ' KRs</span><span>' + ic('list', 14) + ' ' + acts.length + ' planos</span><span>' + ic('calendar', 14) + ' ' + U.fmtDate(o.deadline) + '</span>' + U.person(o.owner) + '</div>' +
          '</article>';
      }).join('') + '</div></section>' : '';

    return hero + stats +
      '<section class="grid-2"><div class="stack">' + progressCard + kpiCard + '</div><div class="stack">' + alertsCard + statusCard + upcomingCard + '</div></section>' +
      objCards;
  }

  // ===========================================================================
  // 2. ESTRATÉGIA / OKRs
  // ===========================================================================
  function okrs() {
    const s = S.state;
    const q = (S.ui.okrQuery || '').trim().toLowerCase();
    const has = (t) => String(t || '').toLowerCase().includes(q);
    const allCollapsed = s.objectives.length && s.objectives.every((o) => S.ui.collapsed[o.id]);

    const head = pageHead('Estratégia & OKRs',
      'Objetivos do ciclo ' + s.company.cycle + ' e os resultados-chave que provam o avanço. Arraste para reorganizar, clique para editar.',
      '<button class="btn" data-act="toggle-all">' + ic(allCollapsed ? 'chevDown' : 'minus', 16) + ' ' + (allCollapsed ? 'Expandir tudo' : 'Recolher tudo') + '</button>' +
      '<button class="btn btn-primary" data-act="new-objective">' + ic('plus', 16) + ' Novo objetivo</button>');

    const toolbar = '<div class="toolbar"><label class="search">' + ic('search', 16) +
      '<input class="input" id="okr-search" data-ui="okrQuery" placeholder="Buscar objetivo ou KR" value="' + esc(S.ui.okrQuery || '') + '" aria-label="Buscar objetivo ou KR"></label>' +
      '<span class="grow"></span><span class="faint" style="font-size:12.5px">' + s.objectives.length + ' objetivos · ' + s.krs.length + ' KRs · progresso geral <b class="num" style="color:var(--text)">' + U.pct(S.overallProgress()) + '</b></span></div>';

    let shown = 0;
    const blocks = s.objectives.map((o, i) => {
      const objMatch = !q || has(o.title) || has(o.description);
      const krs = S.krsOf(o.id).filter((k) => objMatch || has(k.title) || has(k.description));
      if (!objMatch && !krs.length) return '';
      shown++;
      const collapsed = !q && S.ui.collapsed[o.id];
      const st = S.objectiveStatus(o);
      const prog = S.objectiveProgress(o);
      const acts = s.actions.filter((a) => a.objectiveId === o.id);

      const krRows = krs.map((k) => {
        const n = actionsOfKr(k.id).length;
        const src = S.sourceKpi(k);
        return '<div class="kr" data-drag="krs" data-id="' + esc(k.id) + '">' +
          '<button type="button" class="drag-handle" data-handle aria-label="Arrastar para reordenar">' + ic('grip', 16) + '</button>' +
          '<div class="k-main"><span class="k-code">KR' + (S.krsOf(o.id).indexOf(k) + 1) + '</span><div style="min-width:0">' +
          '<div class="k-title">' + esc(k.title) + '</div>' +
          (k.description ? '<div class="muted" style="font-size:12.5px;margin-top:3px">' + esc(k.description) + '</div>' : '') +
          '<div class="k-sub">' + U.person(k.owner) + U.dateTag(k.deadline, k.status) +
          '<a href="#planos" data-act="goto-actions-kr" data-id="' + esc(k.id) + '" style="display:inline-flex;align-items:center;gap:5px;color:inherit">' + ic('list', 14) + ' ' + n + (n === 1 ? ' plano' : ' planos') + '</a>' +
          (src ? '<span class="sync-tag" title="O valor atual vem deste indicador e se atualiza sozinho">' + ic('refresh', 13) + ' Automático via ' + esc(src.name) + '</span>' : '') +
          (k.notes ? '<span title="' + esc(k.notes) + '">' + ic('note', 14) + ' nota</span>' : '') + '</div></div></div>' +
          '<div class="k-value"><div class="nums"><b class="num">' + U.fmtNum(k.current) + '</b><span>/ ' + U.fmtNum(k.target) + ' ' + esc(k.unit) + '</span>' +
          '<span class="stepper"><button type="button" data-act="kr-dec" data-id="' + esc(k.id) + '" aria-label="Diminuir valor atual">' + ic('minus', 12) + '</button>' +
          '<button type="button" data-act="kr-inc" data-id="' + esc(k.id) + '" aria-label="Aumentar valor atual">' + ic('plus', 12) + '</button></span></div>' +
          U.progress(S.krProgress(k), { status: k.status }) + '</div>' +
          '<div class="k-status">' + U.statusSelect(k.status, 'data-status-for="krs" data-id="' + esc(k.id) + '"') + '</div>' +
          '<div class="k-tools"><button type="button" class="icon-btn sm" data-act="new-action-kr" data-id="' + esc(k.id) + '" title="Novo plano para este KR" aria-label="Novo plano para este KR">' + ic('plus', 15) + '</button>' +
          '<button type="button" class="icon-btn sm" data-act="edit-kr" data-id="' + esc(k.id) + '" title="Editar KR" aria-label="Editar KR">' + ic('edit', 15) + '</button>' +
          '<button type="button" class="icon-btn sm danger" data-act="delete-kr" data-id="' + esc(k.id) + '" title="Excluir KR" aria-label="Excluir KR">' + ic('trash', 15) + '</button></div>' +
          '</div>';
      }).join('');

      return '<article class="card objective ' + (collapsed ? 'collapsed' : '') + '" id="obj-' + esc(o.id) + '" data-drag="objectives" data-id="' + esc(o.id) + '">' +
        '<div class="o-head">' +
        '<button type="button" class="drag-handle" data-handle aria-label="Arrastar objetivo">' + ic('grip', 16) + '</button>' +
        '<span class="o-index" style="background:linear-gradient(135deg,' + esc(o.color) + ',color-mix(in srgb,' + esc(o.color) + ' 55%, #78dccb))">O' + (i + 1) + '</span>' +
        '<div class="o-title"><div class="eyebrow">Objetivo estratégico ' + U.statusBadge(st) + '</div><h3>' + esc(o.title) + '</h3>' + (o.description ? '<p>' + esc(o.description) + '</p>' : '') + '</div>' +
        '<div class="o-side"><div class="o-prog"><div class="lbl"><span>Progresso</span><span class="num">' + krs.length + ' KRs</span></div>' + U.progress(prog, { status: st, pace: S.cycleElapsed() }) + '</div>' +
        '<div class="o-tools">' +
        '<button type="button" class="icon-btn" data-act="edit-objective" data-id="' + esc(o.id) + '" title="Editar objetivo" aria-label="Editar objetivo">' + ic('edit', 17) + '</button>' +
        '<button type="button" class="icon-btn danger" data-act="delete-objective" data-id="' + esc(o.id) + '" title="Excluir objetivo" aria-label="Excluir objetivo">' + ic('trash', 17) + '</button>' +
        '<button type="button" class="icon-btn" data-act="toggle-objective" data-id="' + esc(o.id) + '" aria-expanded="' + !collapsed + '" title="' + (collapsed ? 'Expandir' : 'Recolher') + '" aria-label="Expandir ou recolher">' + '<span class="chev" style="display:grid">' + ic('chevDown', 18) + '</span></button>' +
        '</div></div></div>' +
        '<div class="o-meta"><span>' + U.person(o.owner) + '</span><span>' + U.dateTag(o.deadline) + '</span><span>' + ic('list', 14) + ' ' + acts.length + ' planos de ação</span>' +
        (o.notes ? '<span title="' + esc(o.notes) + '">' + ic('note', 14) + ' ' + esc(o.notes.length > 60 ? o.notes.slice(0, 60) + '…' : o.notes) + '</span>' : '') + '</div>' +
        '<div class="o-body"><div class="kr-list">' + krRows +
        '<button type="button" class="kr-add" data-act="new-kr" data-id="' + esc(o.id) + '">' + ic('plus', 16) + ' Adicionar Key Result</button></div></div>' +
        '</article>';
    }).join('');

    const list = s.objectives.length
      ? (shown ? '<div class="okr-list">' + blocks + '</div>' : '<div class="card">' + U.empty('search', 'Nada encontrado', 'Nenhum objetivo ou KR corresponde a "' + S.ui.okrQuery + '".') + '</div>')
      : '<div class="card">' + U.empty('target', 'Defina o primeiro objetivo', 'Objetivos são direções qualitativas. Depois, adicione KRs mensuráveis a cada um.', '<button class="btn btn-primary" data-act="new-objective">' + ic('plus', 16) + ' Novo objetivo</button>') + '</div>';

    return head + toolbar + list;
  }

  // ===========================================================================
  // 3. INDICADORES
  // ===========================================================================
  function indicators() {
    const s = S.state;
    const view = S.ui.kpiView;
    const onTarget = s.kpis.filter((k) => k.target !== '' && S.kpiAttainment(k) >= 1).length;
    const head = pageHead('Indicadores',
      'Métricas que mostram, semana a semana, se a estratégia está funcionando. Registre medições para alimentar a tendência.',
      '<div class="seg" role="tablist" aria-label="Modo de visualização">' +
      '<button type="button" class="' + (view === 'cards' ? 'on' : '') + '" data-act="kpi-view" data-v="cards" aria-pressed="' + (view === 'cards') + '">' + ic('grid', 15) + ' Cards</button>' +
      '<button type="button" class="' + (view === 'table' ? 'on' : '') + '" data-act="kpi-view" data-v="table" aria-pressed="' + (view === 'table') + '">' + ic('table', 15) + ' Tabela</button></div>' +
      '<button class="btn btn-primary" data-act="new-kpi">' + ic('plus', 16) + ' Novo indicador</button>');

    if (!s.kpis.length) return head + '<div class="card">' + U.empty('pulse', 'Nenhum indicador cadastrado', 'Crie indicadores como NPS, CSAT ou clientes recorrentes e vincule-os aos KRs.', '<button class="btn btn-primary" data-act="new-kpi">' + ic('plus', 16) + ' Novo indicador</button>') + '</div>';

    // filtros por objetivo/KR substituem as etiquetas de vínculo em cada card
    const kf = S.ui.kpiFilters || (S.ui.kpiFilters = { objectiveId: '', krId: '' });
    const opt = (v, l, cur) => '<option value="' + esc(v) + '"' + (v === cur ? ' selected' : '') + '>' + esc(l) + '</option>';
    const kpis = s.kpis.filter((k) => (!kf.objectiveId || k.objectiveId === kf.objectiveId) && (!kf.krId || k.krId === kf.krId));
    const summary = '<div class="card card-pad" style="padding:14px 16px"><div class="filters">' +
      '<select class="select" id="kflt-obj" data-kfilter="objectiveId" aria-label="Filtrar por objetivo">' + opt('', 'Todos os objetivos', kf.objectiveId) + s.objectives.map((o, i) => opt(o.id, 'Objetivo ' + (i + 1) + ' · ' + o.title, kf.objectiveId)).join('') + '</select>' +
      '<select class="select" id="kflt-kr" data-kfilter="krId" aria-label="Filtrar por Key Result">' + opt('', 'Todos os Key Results', kf.krId) + s.krs.filter((k) => !kf.objectiveId || k.objectiveId === kf.objectiveId).map((k) => opt(k.id, 'KR' + (S.krsOf(k.objectiveId).indexOf(k) + 1) + ' · ' + k.title, kf.krId)).join('') + '</select>' +
      (kf.objectiveId || kf.krId ? '<button class="btn btn-ghost btn-sm" data-act="clear-kpi-filters">' + ic('x', 14) + ' Limpar</button>' : '') +
      '<span style="flex:1"></span><span class="faint" style="font-size:12.5px"><b class="num" style="color:var(--text)">' + onTarget + '</b> de ' + s.kpis.length + ' na meta</span>' +
      '</div></div>';
    if (!kpis.length) return head + summary + '<div class="card">' + U.empty('search', 'Nenhum indicador para este filtro', 'Escolha outro objetivo ou KR, ou limpe o filtro.') + '</div>';

    /** Linha discreta dizendo qual KR o indicador alimenta ou acompanha. */
    const linkLine = (k) => {
      const fed = S.krFedBy(k.id);
      if (fed) return '<div class="kpi-link">' + ic('refresh', 13) + '<span>Atualiza automaticamente o KR <b>' + esc(fed.title) + '</b></span></div>';
      const kr = k.krId ? S.byId('krs', k.krId) : null;
      return kr ? '<div class="kpi-link">' + ic('link', 13) + '<span>Acompanha o KR <b>' + esc(kr.title) + '</b></span></div>' : '';
    };

    if (view === 'table') {
      const rows = kpis.map((k) => '<tr>' +
        '<td class="title-cell">' + esc(k.name) + '<small>' + esc(k.description) + '</small></td>' +
        '<td><b class="num" style="font-family:var(--font-display);font-size:16px">' + U.fmtNum(k.current) + '</b> <span class="faint">' + esc(k.unit) + '</span></td>' +
        '<td class="num">' + (k.target !== '' ? U.fmtNum(k.target) + ' <span class="faint">' + esc(k.unit) + '</span>' : '—') + '</td>' +
        '<td style="min-width:150px">' + U.progress(S.kpiAttainment(k), {}) + '</td>' +
        '<td>' + U.trendTag(k) + '</td>' +
        '<td style="width:130px">' + U.sparkline(k.history, k.target, { height: 30 }) + '</td>' +
        '<td style="white-space:nowrap;text-align:right"><button class="icon-btn sm" data-act="measure-kpi" data-id="' + esc(k.id) + '" title="Registrar medição" aria-label="Registrar medição">' + ic('plus', 15) + '</button>' +
        '<button class="icon-btn sm" data-act="edit-kpi" data-id="' + esc(k.id) + '" aria-label="Editar">' + ic('edit', 15) + '</button>' +
        '<button class="icon-btn sm danger" data-act="delete-kpi" data-id="' + esc(k.id) + '" aria-label="Excluir">' + ic('trash', 15) + '</button></td></tr>').join('');
      return head + summary + '<div class="card table-wrap"><table class="table"><thead><tr><th>Indicador</th><th>Atual</th><th>Meta</th><th>Atingimento</th><th>Tendência</th><th>Evolução</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>';
    }

    const cards = kpis.map((k) => {
      const att = S.kpiAttainment(k);
      return '<article class="card kpi">' +
        '<div class="head"><div style="min-width:0"><h4>' + esc(k.name) + '</h4>' + (k.description ? '<p class="desc">' + esc(k.description) + '</p>' : '') + '</div>' + U.trendTag(k) + '</div>' +
        '<div class="numbers"><div class="cur"><b class="num">' + U.fmtNum(k.current) + '</b><span>' + esc(k.unit) + '</span></div>' +
        '<div class="target">Meta<b class="num">' + (k.target !== '' ? U.fmtNum(k.target) + ' ' + esc(k.unit) : '—') + '</b></div></div>' +
        U.progress(att, { status: att >= 1 ? 'done' : '' }) +
        U.sparkline(k.history, k.target) +
        linkLine(k) +
        '<div class="foot"><button class="btn btn-sm" data-act="measure-kpi" data-id="' + esc(k.id) + '">' + ic('plus', 14) + ' Registrar medição</button>' +
        '<span><button class="icon-btn sm" data-act="edit-kpi" data-id="' + esc(k.id) + '" title="Editar" aria-label="Editar indicador">' + ic('edit', 15) + '</button>' +
        '<button class="icon-btn sm danger" data-act="delete-kpi" data-id="' + esc(k.id) + '" title="Excluir" aria-label="Excluir indicador">' + ic('trash', 15) + '</button></span></div>' +
        '</article>';
    }).join('');
    return head + summary + '<div class="kpi-grid">' + cards + '</div>';
  }

  // ===========================================================================
  // 4. PLANOS DE AÇÃO
  // ===========================================================================

  /** Aplica filtros e ordenação salvos em Store.ui. */
  function filteredActions() {
    const f = S.ui.actionFilters;
    const q = (f.q || '').trim().toLowerCase();
    const list = S.state.actions.filter((a) =>
      (!f.objectiveId || a.objectiveId === f.objectiveId) &&
      (!f.krId || a.krId === f.krId) &&
      (!f.owner || (f.owner === '__none' ? !a.owner : a.owner === f.owner)) &&
      (!f.status || (f.status === 'overdue' ? S.isOverdue(a) : a.status === f.status)) &&
      (!q || (a.title + ' ' + a.description + ' ' + a.notes).toLowerCase().includes(q)));
    const sort = S.ui.actionSort || 'deadline';
    const dl = (a) => a.deadline || '9999';
    list.sort((x, y) => {
      if (sort === 'priority') return (PRIORITY_RANK[x.priority] - PRIORITY_RANK[y.priority]) || (dl(x) < dl(y) ? -1 : 1);
      if (sort === 'progress') return S.actionProgress(x) - S.actionProgress(y);
      // concluídos vão para o fim; o resto por prazo
      return ((x.status === 'done') - (y.status === 'done')) || (dl(x) < dl(y) ? -1 : dl(x) > dl(y) ? 1 : 0);
    });
    return list;
  }

  function actions() {
    const s = S.state;
    const f = S.ui.actionFilters;
    const view = S.ui.actionView;
    const list = filteredActions();
    const active = ['objectiveId', 'krId', 'owner', 'status', 'q'].some((k) => f[k]);

    const head = pageHead('Planos de ação',
      'As iniciativas que movem cada Key Result: quem faz, até quando e em que pé está.',
      '<div class="seg" aria-label="Modo de visualização">' +
      '<button type="button" class="' + (view === 'table' ? 'on' : '') + '" data-act="action-view" data-v="table" aria-pressed="' + (view === 'table') + '">' + ic('table', 15) + ' Tabela</button>' +
      '<button type="button" class="' + (view === 'board' ? 'on' : '') + '" data-act="action-view" data-v="board" aria-pressed="' + (view === 'board') + '">' + ic('board', 15) + ' Quadro</button></div>' +
      '<button class="btn btn-primary" data-act="new-action">' + ic('plus', 16) + ' Novo plano</button>');

    const opt = (v, l, cur) => '<option value="' + esc(v) + '"' + (v === cur ? ' selected' : '') + '>' + esc(l) + '</option>';
    const filters = '<div class="card card-pad" style="padding:14px 16px"><div class="filters">' +
      '<label class="search" style="flex:1 1 220px">' + ic('search', 16) + '<input class="input" id="act-search" data-filter="q" placeholder="Buscar plano" value="' + esc(f.q || '') + '" aria-label="Buscar plano"></label>' +
      '<select class="select" id="flt-obj" data-filter="objectiveId" aria-label="Filtrar por objetivo">' + opt('', 'Todos os objetivos', f.objectiveId) + s.objectives.map((o, i) => opt(o.id, 'Objetivo ' + (i + 1) + ' · ' + o.title, f.objectiveId)).join('') + '</select>' +
      '<select class="select" id="flt-kr" data-filter="krId" aria-label="Filtrar por KR">' + opt('', 'Todos os KRs', f.krId) + s.krs.filter((k) => !f.objectiveId || k.objectiveId === f.objectiveId).map((k) => opt(k.id, 'KR' + (S.krsOf(k.objectiveId).indexOf(k) + 1) + ' · ' + k.title, f.krId)).join('') + '</select>' +
      '<select class="select" id="flt-owner" data-filter="owner" aria-label="Filtrar por responsável">' + opt('', 'Todos os responsáveis', f.owner) + s.people.map((p) => opt(p.id, p.name, f.owner)).join('') + opt('__none', 'Sem responsável', f.owner) + '</select>' +
      '<select class="select" id="flt-status" data-filter="status" aria-label="Filtrar por status">' + opt('', 'Todos os status', f.status) + Object.keys(S.STATUS).map((k) => opt(k, S.STATUS[k], f.status)).join('') + opt('overdue', 'Atrasados', f.status) + '</select>' +
      (view === 'table' ? '<select class="select" id="act-sort" data-ui-select="actionSort" aria-label="Ordenar por">' + opt('deadline', 'Ordenar: prazo', S.ui.actionSort || 'deadline') + opt('priority', 'Ordenar: prioridade', S.ui.actionSort) + opt('progress', 'Ordenar: progresso', S.ui.actionSort) + '</select>' : '') +
      (active ? '<button class="btn btn-ghost btn-sm clear" data-act="clear-filters">' + ic('x', 14) + ' Limpar filtros</button>' : '') +
      '</div></div>';

    const overdueN = s.actions.filter(S.isOverdue).length;
    const noOwnerN = s.actions.filter((a) => !a.owner && a.status !== 'done').length;
    const quick = '<div class="toolbar" style="font-size:12.5px"><span class="faint">' + list.length + ' de ' + s.actions.length + ' planos</span><span class="grow"></span>' +
      (overdueN ? '<button class="badge st-at_risk" style="border:0;cursor:pointer" data-act="quick-filter" data-k="status" data-v="overdue">' + overdueN + ' atrasado(s)</button>' : '') +
      (noOwnerN ? '<button class="badge pr-medium" style="border:0;cursor:pointer" data-act="quick-filter" data-k="owner" data-v="__none">' + noOwnerN + ' sem responsável</button>' : '') + '</div>';

    if (!s.actions.length) {
      return head + '<div class="card">' + U.empty('list', 'Nenhum plano de ação', 'Transforme os KRs em iniciativas concretas, com dono e prazo.', '<button class="btn btn-primary" data-act="new-action">' + ic('plus', 16) + ' Novo plano</button>') + '</div>';
    }

    let body;
    if (view === 'board') {
      body = '<div class="kanban">' + Object.keys(S.STATUS).map((st) => {
        const items = list.filter((a) => a.status === st);
        return '<div class="kcol" data-dropstatus="' + st + '"><div class="kcol-head">' + U.statusBadge(st) + '<span class="n num">' + items.length + '</span></div>' +
          (items.length ? items.map(actionCard).join('') : '<div class="empty-col">Arraste planos para cá</div>') + '</div>';
      }).join('') + '</div>';
    } else {
      body = list.length ? '<div class="card table-wrap"><table class="table"><thead><tr><th>Plano de ação</th><th>Responsável</th><th>Prazo</th><th>Prioridade</th><th>Status</th><th>Progresso</th><th></th></tr></thead><tbody>' +
        groupedRows(list) + '</tbody></table></div>'
        : '<div class="card">' + U.empty('search', 'Nenhum plano com esses filtros', 'Ajuste ou limpe os filtros para ver mais resultados.', '<button class="btn" data-act="clear-filters">Limpar filtros</button>') + '</div>';
    }
    return head + filters + quick + body;
  }

  /** Linha da tabela de planos. */
  function actionRow(a) {
    const p = S.actionProgress(a);
    const cl = a.checklist && a.checklist.length ? ' · ' + a.checklist.filter((c) => c.done).length + '/' + a.checklist.length + ' etapas' : '';
    return '<tr data-act="edit-action" data-id="' + esc(a.id) + '" style="cursor:pointer">' +
      '<td class="title-cell">' + esc(a.title) + '<small>' + esc(a.description || 'Sem descrição') + esc(cl) + '</small></td>' +
      '<td>' + U.person(a.owner) + '</td>' +
      '<td>' + U.dateTag(a.deadline, a.status) + '</td>' +
      '<td>' + U.priorityBadge(a.priority) + '</td>' +
      '<td>' + U.statusSelect(a.status, 'data-status-for="actions" data-id="' + esc(a.id) + '"') + '</td>' +
      '<td style="min-width:140px">' + U.progress(p, { status: a.status }) + '</td>' +
      '<td style="text-align:right;white-space:nowrap"><button class="icon-btn sm" data-act="edit-action" data-id="' + esc(a.id) + '" aria-label="Editar plano">' + ic('edit', 15) + '</button>' +
      '<button class="icon-btn sm danger" data-act="delete-action" data-id="' + esc(a.id) + '" aria-label="Excluir plano">' + ic('trash', 15) + '</button></td></tr>';
  }

  /**
   * Agrupa as linhas por Objetivo → KR, com cabeçalhos de seção.
   * Substitui as etiquetas de vínculo em cada linha: o contexto fica no grupo.
   * A ordenação escolhida vale dentro de cada grupo.
   * @param {object[]} list - Planos já filtrados e ordenados.
   * @returns {string} Linhas <tr> da tabela.
   */
  function groupedRows(list) {
    const s = S.state;
    const COLS = 7; // número de colunas da tabela de planos
    let html = '';
    const used = new Set();
    const krHead = (label, n) => '<tr class="grp-kr"><td colspan="' + COLS + '"><span>' + label + '</span><span class="n num">' + n + '</span></td></tr>';
    s.objectives.forEach((o, i) => {
      const inObj = list.filter((a) => a.objectiveId === o.id);
      if (!inObj.length) return;
      html += '<tr class="grp-obj"><td colspan="' + COLS + '"><span class="obj-dot" style="background:' + esc(o.color) + '"></span>' +
        '<span class="eyebrow">Objetivo ' + (i + 1) + '</span><b>' + esc(o.title) + '</b></td></tr>';
      S.krsOf(o.id).forEach((k, j) => {
        const g = inObj.filter((a) => a.krId === k.id);
        if (!g.length) return;
        g.forEach((a) => used.add(a.id));
        html += krHead('<span class="mono">KR' + (j + 1) + '</span> ' + esc(k.title), g.length) + g.map(actionRow).join('');
      });
      const rest = inObj.filter((a) => !used.has(a.id));
      if (rest.length) { rest.forEach((a) => used.add(a.id)); html += krHead('Sem Key Result vinculado', rest.length) + rest.map(actionRow).join(''); }
    });
    const orphan = list.filter((a) => !used.has(a.id));
    if (orphan.length) {
      html += '<tr class="grp-obj"><td colspan="' + COLS + '"><span class="obj-dot" style="background:var(--st-idle)"></span><b>Sem objetivo vinculado</b></td></tr>' + orphan.map(actionRow).join('');
    }
    return html;
  }

  /** Card do quadro (kanban) — arrastável entre colunas de status. */
  function actionCard(a) {
    const p = S.actionProgress(a);
    const kr = a.krId ? S.byId('krs', a.krId) : null;
    const o = a.objectiveId ? S.byId('objectives', a.objectiveId) : null;
    const cl = a.checklist && a.checklist.length;
    return '<div class="acard" draggable="true" data-drag="action-card" data-id="' + esc(a.id) + '" data-act="edit-action" tabindex="0" role="button">' +
      '<div class="row">' + U.priorityBadge(a.priority) + '</div>' +
      '<div class="t">' + esc(a.title) + '</div>' +
      (kr ? '<div class="acard-kr" title="' + esc(kr.title) + '"><i class="obj-dot" style="background:' + esc(o ? o.color : 'var(--st-idle)') + '"></i><span>' + esc(kr.title) + '</span></div>' : '') +
      U.progress(p, { size: 'sm', status: a.status }) +
      '<div class="row">' + U.person(a.owner) + U.dateTag(a.deadline, a.status) + '</div>' +
      (cl ? '<span class="checks">' + ic('checkCircle', 13) + ' ' + a.checklist.filter((c) => c.done).length + '/' + cl + ' etapas</span>' : '') +
      '</div>';
  }

  // ===========================================================================
  // 5. MVV
  // ===========================================================================

  /** Pílulas de completude do MVV (re-renderizadas isoladamente ao digitar). */
  function mvvCompletion() {
    const m = S.state.mvv;
    const pill = (ok, label) => '<span class="' + (ok ? 'ok' : '') + '">' + ic(ok ? 'checkCircle' : 'clock', 14) + ' ' + label + '</span>';
    return pill(!!m.mission.trim(), 'Missão') + pill(!!m.vision.trim(), 'Visão') + pill(m.values.length > 0, m.values.length ? m.values.length + ' valores' : 'Valores');
  }

  function mvv() {
    const m = S.state.mvv;
    const hero = '<section class="mvv-hero"><div class="eyebrow">Identidade estratégica · ' + esc(S.state.company.name) + '</div>' +
      '<h2>Por que existimos e para onde vamos.</h2>' +
      '<p>Missão, visão e valores dão sentido aos objetivos do ciclo. Escreva direto nos campos abaixo: tudo é salvo automaticamente.</p>' +
      '<div class="completion" id="mvv-completion">' + mvvCompletion() + '</div></section>';

    const block = (key, icon, title, sub, placeholder) =>
      '<div class="card mvv-block"><div class="head"><span class="ico">' + ic(icon, 22) + '</span><div><h3>' + title + '</h3><div class="sub">' + sub + '</div></div></div>' +
      '<textarea class="mvv-statement ' + (m[key].trim() ? 'filled' : '') + '" id="mvv-' + key + '" data-mvv="' + key + '" rows="4" placeholder="' + esc(placeholder) + '" aria-label="' + title + '">' + esc(m[key]) + '</textarea>' +
      '<div class="mvv-tip">' + ic('edit', 13) + ' Clique para editar · salvo automaticamente</div></div>';

    const values = '<div class="card mvv-block values-wrap"><div class="head"><span class="ico">' + ic('gem', 22) + '</span><div><h3>Valores</h3><div class="sub">Princípios que orientam decisões e o jeito VISTA de trabalhar. Arraste para ordenar.</div></div></div>' +
      '<div class="values-grid">' + m.values.map((v, i) =>
        '<div class="value-card" data-drag="values" data-id="' + i + '" draggable="true">' +
        '<span class="n">' + String(i + 1).padStart(2, '0') + '</span><h4>' + esc(v.title) + '</h4>' + (v.description ? '<p>' + esc(v.description) + '</p>' : '') +
        '<div class="tools"><button class="icon-btn sm" data-act="edit-value" data-id="' + i + '" aria-label="Editar valor">' + ic('edit', 14) + '</button>' +
        '<button class="icon-btn sm danger" data-act="delete-value" data-id="' + i + '" aria-label="Excluir valor">' + ic('trash', 14) + '</button></div></div>').join('') +
      '<button type="button" class="value-add" data-act="new-value">' + ic('plus', 20) + (m.values.length ? 'Adicionar valor' : 'Liste os valores da empresa') + '</button>' +
      '</div></div>';

    return hero + '<div class="mvv-grid">' +
      block('mission', 'rocket', 'Missão', 'O que fazemos, para quem e por quê, hoje.', 'Defina a missão da empresa') +
      block('vision', 'eye', 'Visão', 'Onde queremos estar em 3 a 5 anos.', 'Defina a visão de longo prazo') +
      values + '</div>';
  }

  // ===========================================================================
  // 6. CONFIGURAÇÕES
  // ===========================================================================
  function settings() {
    const s = S.state;
    const c = s.company;
    const load = (pid) => s.objectives.filter((x) => x.owner === pid).length + s.krs.filter((x) => x.owner === pid).length + s.actions.filter((x) => x.owner === pid).length;
    const theme = S.ui.theme;

    const company = '<form class="card card-pad" id="company-form"><div class="card-head"><div><h3>Empresa e ciclo</h3><div class="sub">Define o período usado no cálculo de ritmo e prazos</div></div></div>' +
      '<div class="form-grid">' +
      '<div class="field full"><label for="c-name">Nome da empresa</label><input class="input" id="c-name" name="name" value="' + esc(c.name) + '" required></div>' +
      '<div class="field full"><label for="c-cycle">Nome do ciclo</label><input class="input" id="c-cycle" name="cycle" value="' + esc(c.cycle) + '" placeholder="Ex.: Q4 2026"></div>' +
      '<div class="field"><label for="c-start">Início</label><input class="input" type="date" id="c-start" name="cycleStart" value="' + esc(c.cycleStart) + '" required></div>' +
      '<div class="field"><label for="c-end">Fim</label><input class="input" type="date" id="c-end" name="cycleEnd" value="' + esc(c.cycleEnd) + '" required></div>' +
      '</div><div style="display:flex;justify-content:flex-end;margin-top:18px"><button class="btn btn-primary" type="submit">' + ic('check', 16) + ' Salvar</button></div></form>';

    const people = '<div class="card card-pad"><div class="card-head"><div><h3>Responsáveis</h3><div class="sub">Pessoas ou áreas disponíveis para atribuição</div></div>' +
      '<button class="btn btn-sm" data-act="new-person">' + ic('plus', 14) + ' Adicionar</button></div>' +
      (s.people.length ? '<div class="people-list">' + s.people.map((p) =>
        '<div class="people-row"><span class="avatar" style="background:' + esc(p.color) + '">' + esc(U.initials(p.name)) + '</span>' +
        '<div style="min-width:0"><div class="nm">' + esc(p.name) + '</div><div class="rl">' + esc(p.role || '—') + '</div></div>' +
        '<span class="load">' + load(p.id) + ' itens</span>' +
        '<button class="icon-btn sm" data-act="edit-person" data-id="' + esc(p.id) + '" aria-label="Editar responsável">' + ic('edit', 15) + '</button></div>').join('') + '</div>'
        : U.empty('users', 'Sem responsáveis', 'Adicione pessoas ou áreas para atribuir dono aos itens.')) + '</div>';

    const appearance = '<div class="card card-pad"><div class="card-head"><div><h3>Aparência</h3><div class="sub">Tema da interface neste navegador</div></div></div>' +
      '<div class="seg">' + [['system', 'monitor', 'Sistema'], ['light', 'sun', 'Claro'], ['dark', 'moon', 'Escuro']].map(([v, i, l]) =>
        '<button type="button" class="' + (theme === v ? 'on' : '') + '" data-act="set-theme" data-v="' + v + '" aria-pressed="' + (theme === v) + '">' + ic(i, 15) + ' ' + l + '</button>').join('') + '</div></div>';

    const data = '<div class="card card-pad"><div class="card-head"><div><h3>Dados</h3><div class="sub">' +
      (S.persisted ? 'Salvo automaticamente neste navegador. Última alteração: ' + new Date(s.updatedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'O armazenamento local está bloqueado: as alterações valem só nesta sessão. Exporte para não perder.') +
      '</div></div></div>' +
      '<div class="setting-row"><div><div class="t">Exportar backup</div><div class="d">Arquivo JSON com toda a estratégia, para guardar ou compartilhar.</div></div>' +
      '<span style="display:flex;gap:6px"><button class="btn btn-sm" data-act="export-json">' + ic('download', 14) + ' Baixar</button><button class="btn btn-sm" data-act="copy-json">' + ic('copy', 14) + ' Copiar</button></span></div>' +
      '<div class="setting-row"><div><div class="t">Importar backup</div><div class="d">Substitui os dados atuais pelo conteúdo de um arquivo exportado.</div></div>' +
      '<label class="btn btn-sm" for="import-file" style="cursor:pointer">' + ic('upload', 14) + ' Escolher arquivo</label><input type="file" id="import-file" accept="application/json,.json" hidden></div>' +
      '<div class="setting-row"><div><div class="t">Zerar progresso</div><div class="d">Mantém a estrutura e volta valores, status e checklists ao início do ciclo.</div></div>' +
      '<button class="btn btn-sm" data-act="reset-progress">' + ic('refresh', 14) + ' Zerar</button></div>' +
      '<div class="setting-row"><div><div class="t">Restaurar dados de exemplo</div><div class="d">Volta ao conteúdo inicial da VISTA studios (OKRs do Q4 2026).</div></div>' +
      '<button class="btn btn-sm" data-act="reset-seed">' + ic('refresh', 14) + ' Restaurar</button></div>' +
      '<div class="setting-row"><div><div class="t" style="color:var(--st-risk)">Começar do zero</div><div class="d">Apaga objetivos, KRs, indicadores, planos e MVV. Mantém empresa e responsáveis.</div></div>' +
      '<button class="btn btn-sm btn-danger" data-act="reset-blank">' + ic('trash', 14) + ' Apagar</button></div></div>';

    return pageHead('Configurações', 'Dados da empresa, ciclo, responsáveis, aparência e backup.') +
      '<div class="settings-grid"><div class="stack">' + company + people + '</div><div class="stack">' + appearance + data + '</div></div>';
  }

  window.Views = {
    dashboard: { title: 'Dashboard', render: dashboard },
    okrs: { title: 'Estratégia & OKRs', render: okrs },
    indicadores: { title: 'Indicadores', render: indicators },
    planos: { title: 'Planos de ação', render: actions },
    mvv: { title: 'Missão, Visão e Valores', render: mvv },
    configuracoes: { title: 'Configurações', render: settings },
    mvvCompletion,
  };
})();
