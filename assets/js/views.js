/**
 * @file views.js
 * @description Renderizadores das seis áreas do painel.
 *
 * Cada view expõe `render()` → string HTML. A interação é tratada por
 * delegação de eventos em app.js via atributos `data-act`, `data-id`,
 * `data-drag`, `data-filter` etc. — por isso as views não registram
 * listeners próprios (exceto o salvamento silencioso do MVV, em app.js).
 *
 * NOTA: o título de cada tela fica só na barra superior (app.js); as telas
 * começam direto pelo conteúdo, sem cabeçalho nem texto explicativo.
 *
 * Dependências: Store, UI. Exposto como `window.Views`.
 */
(function () {
  'use strict';
  const S = window.Store;
  const U = window.UI;
  const esc = U.esc;
  const ic = U.icon;

  const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

  /**
   * Barra de ações no topo da tela (filtros à esquerda, botões à direita).
   * @param {string} left - HTML dos controles à esquerda (pode ser vazio).
   * @param {string} right - HTML dos botões à direita.
   */
  function toolbar(left, right) {
    return '<div class="page-bar"><div class="filters">' + (left || '') + '</div><div class="actions">' + right + '</div></div>';
  }

  /** Título simples de card. */
  const cardHead = (title, extra) => '<div class="card-head"><h3>' + esc(title) + '</h3>' + (extra || '') + '</div>';

  /** `<option>` com seleção. */
  const opt = (v, l, cur) => '<option value="' + esc(v) + '"' + (v === cur ? ' selected' : '') + '>' + esc(l) + '</option>';

  /** Rótulo "KR1", "KR2"… pela posição dentro do objetivo. */
  const krLabel = (k) => 'KR' + (S.krsOf(k.objectiveId).indexOf(k) + 1);

  /**
   * Valor atual com unidade, com o símbolo monetário antes do número.
   * @param {object} k - Indicador.
   * @param {string} [cls] - Classe do número em destaque.
   */
  function bigValue(k, cls) {
    const n = '<b class="num ' + (cls || '') + '">' + U.fmtNum(k.current) + '</b>';
    return U.isMoney(k.unit) ? '<span>R$</span>' + n : n + '<span>' + esc(k.unit) + '</span>';
  }

  // ===========================================================================
  // 1. DASHBOARD
  // ===========================================================================
  function dashboard() {
    const s = S.state;
    const overall = S.overallProgress();
    const h = S.health();
    // cores do semáforo sobre o destaque (fundo sempre escuro, nos dois temas)
    const healthDot = { good: '#7fe7b8', warn: '#ffd27a', risk: '#ff9f7f' }[h.key];

    const hero =
      '<section class="hero hero-compact">' +
      '<i class="finder tl"></i><i class="finder tr"></i><i class="finder bl"></i><i class="finder br"></i>' +
      '<div class="ring-wrap">' + U.ring(overall, 120, 10) + '<div class="center"><div><b class="num">' + Math.round(overall * 100) + '<small>%</small></b><span>progresso</span></div></div></div>' +
      '<div class="hero-side"><span class="health"><i style="background:' + healthDot + '"></i>' + esc(h.label) + '</span>' +
      '<div class="days"><b class="num">' + S.cycleDaysLeft() + '</b><span>dias restantes no ' + esc(s.company.cycle) + '</span></div></div>' +
      '</section>';

    const stat = (href, icon, value, label) =>
      '<a class="card stat" href="#' + href + '"><span class="ico">' + ic(icon, 18) + '</span>' +
      '<div><div class="big num">' + value + '</div><div class="lbl">' + label + '</div></div></a>';
    const stats = '<section class="stats">' +
      stat('okrs', 'target', s.objectives.length, 'Objetivos') +
      stat('okrs', 'layers', s.krs.length, 'Key Results') +
      stat('indicadores', 'pulse', s.kpis.length, 'Indicadores') +
      stat('planos', 'list', s.actions.length, 'Planos de ação') +
      '</section>';

    // --- Progresso por objetivo ---
    const objRows = s.objectives.length ? s.objectives.map((o, i) => {
      const st = S.objectiveStatus(o);
      const krLines = S.krsOf(o.id).map((k, j) =>
        '<div class="kr-line"><span title="' + esc(k.title) + '"><span class="mono kr-n">KR' + (j + 1) + '</span> ' + esc(k.title) + '</span>' +
        U.progress(S.krProgress(k), { size: 'sm', status: k.status }) + '</div>').join('');
      return '<div class="row"><div class="row-head"><span class="name"><i class="obj-dot" style="background:' + esc(o.color) + '"></i><span title="' + esc(o.title) + '">' + esc(o.title) + '</span></span>' + U.statusBadge(st) + '</div>' +
        U.progress(S.objectiveProgress(o), { size: 'lg', status: st }) +
        (krLines ? '<div class="krs">' + krLines + '</div>' : '') + '</div>';
    }).join('') : U.empty('target', 'Nenhum objetivo ainda', 'Comece definindo o primeiro objetivo do ciclo.', '<button class="btn btn-primary" data-act="new-objective">' + ic('plus', 16) + ' Novo objetivo</button>');
    const progressCard = '<div class="card card-pad">' + cardHead('Progresso por objetivo') + '<div class="obj-progress">' + objRows + '</div></div>';

    // --- Indicadores ---
    const kpiCard = '<div class="card card-pad">' + cardHead('Indicadores', '<a class="btn btn-ghost btn-sm" href="#indicadores">Ver todos ' + ic('arrowRight', 14) + '</a>') +
      (s.kpis.length ? '<div class="kpi-mini-grid">' + s.kpis.map((k) =>
        '<button type="button" class="kpi-mini" data-act="edit-kpi" data-id="' + esc(k.id) + '">' +
        '<span class="n" title="' + esc(k.name) + '">' + esc(k.name) + '</span>' +
        '<span class="v">' + bigValue(k) + (k.target !== '' ? '<span class="of">de ' + esc(U.fmtValue(k.target, k.unit)) + '</span>' : '') + '</span>' +
        U.progress(S.kpiAttainment(k), { size: 'sm', hideVal: true, status: S.kpiAttainment(k) >= 1 ? 'done' : '' }) +
        '</button>').join('') + '</div>' : U.empty('pulse', 'Sem indicadores', 'Cadastre os indicadores do ciclo.'))
      + '</div>';

    // --- Alertas ---
    const al = S.alerts();
    const alertsCard = '<div class="card card-pad">' + cardHead('Alertas', al.length ? '<span class="badge st-at_risk">' + al.length + '</span>' : '') +
      (al.length ? '<div class="alerts">' + al.slice(0, 5).map((a) =>
        '<button type="button" class="alert ' + a.type + '" data-act="open-item" data-kind="' + a.kind + '" data-id="' + esc(a.id) + '">' +
        '<span class="ico">' + ic(a.icon, 16) + '</span><span style="min-width:0"><span class="t">' + esc(a.title) + '</span><span class="d">' + esc(a.detail) + '</span></span></button>').join('') +
        (al.length > 5 ? '<span class="faint" style="font-size:12px">+ ' + (al.length - 5) + ' outros</span>' : '') + '</div>'
        : '<div class="alerts-ok">' + ic('checkCircle', 18) + ' Tudo em dia.</div>') + '</div>';

    // --- Próximos passos ---
    const up = S.upcoming(5);
    const upcomingCard = '<div class="card card-pad">' + cardHead('Próximos passos') +
      (up.length ? '<div class="timeline">' + up.map(({ kind, item }) => {
        const d = S.parseDate(item.deadline);
        const over = S.daysUntil(item.deadline) < 0;
        return '<div class="tl-item ' + (over ? 'overdue' : '') + '" role="button" tabindex="0" data-act="open-item" data-kind="' + kind + '" data-id="' + esc(item.id) + '">' +
          '<div class="tl-date"><b class="num">' + d.getDate() + '</b><span>' + MONTHS[d.getMonth()] + '</span></div>' +
          '<div style="min-width:0"><div class="t">' + esc(item.title) + '</div><div class="d">' + esc(U.relDays(item.deadline)) + '</div></div>' +
          U.people(S.ownersOf(item), true) + '</div>';
      }).join('') + '</div>' : '<p class="faint" style="font-size:13px">Nenhuma entrega com prazo pendente.</p>') + '</div>';

    return hero + stats +
      '<section class="grid-2"><div class="stack">' + progressCard + kpiCard + '</div><div class="stack">' + alertsCard + upcomingCard + '</div></section>';
  }

  // ===========================================================================
  // 2. ESTRATÉGIA / OKRs
  // ===========================================================================
  function okrs() {
    const s = S.state;
    const bar = toolbar('', '<button class="btn btn-primary" data-act="new-objective">' + ic('plus', 16) + ' Novo objetivo</button>');

    if (!s.objectives.length) {
      return bar + '<div class="card">' + U.empty('target', 'Defina o primeiro objetivo', 'Depois, adicione os Key Results de cada um.', '<button class="btn btn-primary" data-act="new-objective">' + ic('plus', 16) + ' Novo objetivo</button>') + '</div>';
    }

    const blocks = s.objectives.map((o, i) => {
      const collapsed = S.ui.collapsed[o.id];
      const st = S.objectiveStatus(o);

      const krRows = S.krsOf(o.id).map((k, j) =>
        '<div class="kr">' +
        '<div class="k-main"><span class="k-code">KR' + (j + 1) + '</span><span class="k-title">' + esc(k.title) + '</span>' + U.person(k.owner, true) + '</div>' +
        '<div class="k-value"><div class="nums"><b class="num">' + U.fmtNum(k.current) + '</b><span>/ ' + esc(U.fmtValue(k.target, k.unit)) + '</span>' +
        '<span class="stepper"><button type="button" data-act="kr-dec" data-id="' + esc(k.id) + '" aria-label="Diminuir valor atual">' + ic('minus', 12) + '</button>' +
        '<button type="button" data-act="kr-inc" data-id="' + esc(k.id) + '" aria-label="Aumentar valor atual">' + ic('plus', 12) + '</button></span></div>' +
        U.progress(S.krProgress(k), { status: k.status }) + '</div>' +
        '<div class="k-status">' + U.statusSelect(k.status, 'data-status-for="krs" data-id="' + esc(k.id) + '"') + '</div>' +
        '<button type="button" class="icon-btn sm" data-act="edit-kr" data-id="' + esc(k.id) + '" title="Editar KR" aria-label="Editar KR">' + ic('edit', 15) + '</button>' +
        '</div>').join('');

      return '<article class="card objective ' + (collapsed ? 'collapsed' : '') + '" id="obj-' + esc(o.id) + '">' +
        '<div class="o-head">' +
        '<span class="o-index" style="background:linear-gradient(135deg,' + esc(o.color) + ',color-mix(in srgb,' + esc(o.color) + ' 55%, #78dccb))">O' + (i + 1) + '</span>' +
        '<div class="o-title"><h3>' + esc(o.title) + '</h3>' + U.statusBadge(st) + '</div>' +
        '<div class="o-prog">' + U.progress(S.objectiveProgress(o), { status: st }) + '</div>' +
        '<div class="o-tools">' +
        '<button type="button" class="icon-btn" data-act="edit-objective" data-id="' + esc(o.id) + '" title="Editar objetivo" aria-label="Editar objetivo">' + ic('edit', 17) + '</button>' +
        '<button type="button" class="icon-btn" data-act="toggle-objective" data-id="' + esc(o.id) + '" aria-expanded="' + !collapsed + '" title="' + (collapsed ? 'Expandir' : 'Recolher') + '" aria-label="Expandir ou recolher"><span class="chev" style="display:grid">' + ic('chevDown', 18) + '</span></button>' +
        '</div></div>' +
        '<div class="o-body"><div class="kr-list">' + krRows +
        '<button type="button" class="kr-add" data-act="new-kr" data-id="' + esc(o.id) + '">' + ic('plus', 16) + ' Adicionar Key Result</button></div></div>' +
        '</article>';
    }).join('');

    return bar + '<div class="okr-list">' + blocks + '</div>';
  }

  // ===========================================================================
  // 3. INDICADORES
  // ===========================================================================

  /** Card de indicador. */
  function kpiCard(k) {
    const att = S.kpiAttainment(k);
    return '<article class="card kpi">' +
      '<div class="head"><h4>' + esc(k.name) + '</h4>' +
      '<button class="icon-btn sm" data-act="edit-kpi" data-id="' + esc(k.id) + '" title="Editar" aria-label="Editar indicador">' + ic('edit', 15) + '</button></div>' +
      '<div class="numbers"><div class="cur">' + bigValue(k) + '</div>' +
      '<div class="target">Meta<b class="num">' + (k.target !== '' ? esc(U.fmtValue(k.target, k.unit)) : '—') + '</b></div></div>' +
      U.progress(att, { status: att >= 1 ? 'done' : '' }) +
      U.sparkline(k.history, k.target) +
      '<button class="btn btn-sm" data-act="measure-kpi" data-id="' + esc(k.id) + '">' + ic('plus', 14) + ' Registrar medição</button>' +
      '</article>';
  }

  function indicators() {
    const s = S.state;
    const bar = toolbar('', '<button class="btn btn-primary" data-act="new-kpi">' + ic('plus', 16) + ' Novo indicador</button>');
    if (!s.kpis.length) return bar + '<div class="card">' + U.empty('pulse', 'Nenhum indicador cadastrado', 'Crie os indicadores e vincule-os aos KRs.', '<button class="btn btn-primary" data-act="new-kpi">' + ic('plus', 16) + ' Novo indicador</button>') + '</div>';

    // agrupados por objetivo: o contexto fica no título do grupo, não em cada card
    const group = (title, color, list) => list.length
      ? '<section class="kpi-group"><h3 class="group-title"><i class="obj-dot" style="background:' + color + '"></i>' + title + '</h3><div class="kpi-grid">' + list.map(kpiCard).join('') + '</div></section>'
      : '';
    const known = new Set(s.objectives.map((o) => o.id));
    return bar +
      s.objectives.map((o, i) => group('Objetivo ' + (i + 1) + ' · ' + esc(o.title), esc(o.color), s.kpis.filter((k) => k.objectiveId === o.id))).join('') +
      group('Sem objetivo vinculado', 'var(--st-idle)', s.kpis.filter((k) => !known.has(k.objectiveId)));
  }

  // ===========================================================================
  // 4. PLANOS DE AÇÃO
  // ===========================================================================

  /**
   * Aplica os filtros (objetivo, KR, status, pessoa, área) e ordena por prazo,
   * com concluídos no fim. Pessoa e área valem se QUALQUER responsável do
   * plano for daquela pessoa/área.
   */
  function filteredActions() {
    const f = S.ui.actionFilters;
    const dl = (a) => a.deadline || '9999';
    return S.state.actions
      .filter((a) => (!f.objectiveId || a.objectiveId === f.objectiveId) &&
        (!f.krId || a.krId === f.krId) &&
        (!f.status || (f.status === 'overdue' ? S.isOverdue(a) : a.status === f.status)) &&
        (!f.person || (f.person === '__none' ? !a.owners.length : S.peopleOfRoles(a.owners).indexOf(f.person) >= 0)) &&
        (!f.area || S.areasOfRoles(a.owners).indexOf(f.area) >= 0))
      .sort((x, y) => ((x.status === 'done') - (y.status === 'done')) || (dl(x) < dl(y) ? -1 : dl(x) > dl(y) ? 1 : 0));
  }

  function actions() {
    const s = S.state;
    const f = S.ui.actionFilters;
    const view = S.ui.actionView;
    const list = filteredActions();
    const active = f.objectiveId || f.krId || f.status || f.person || f.area;

    const filters =
      '<select class="select" id="flt-obj" data-filter="objectiveId" aria-label="Filtrar por objetivo">' + opt('', 'Todos os objetivos', f.objectiveId) + s.objectives.map((o, i) => opt(o.id, 'Objetivo ' + (i + 1) + ' · ' + o.title, f.objectiveId)).join('') + '</select>' +
      '<select class="select" id="flt-kr" data-filter="krId" aria-label="Filtrar por KR">' + opt('', 'Todos os KRs', f.krId) + s.krs.filter((k) => !f.objectiveId || k.objectiveId === f.objectiveId).map((k) => opt(k.id, krLabel(k) + ' · ' + k.title, f.krId)).join('') + '</select>' +
      '<select class="select" id="flt-status" data-filter="status" aria-label="Filtrar por status">' + opt('', 'Todos os status', f.status) + Object.keys(S.STATUS).map((k) => opt(k, S.STATUS[k], f.status)).join('') + opt('overdue', 'Atrasados', f.status) + '</select>' +
      '<select class="select" id="flt-person" data-filter="person" aria-label="Filtrar por pessoa">' + opt('', 'Todas as pessoas', f.person) + Object.keys(S.ORG_PEOPLE).map((k) => opt(k, S.ORG_PEOPLE[k].name, f.person)).join('') + opt('__none', 'Sem responsável', f.person) + '</select>' +
      '<select class="select" id="flt-area" data-filter="area" aria-label="Filtrar por área">' + opt('', 'Todas as áreas', f.area) + [S.ORG.top.name].concat(S.ORG.areas.map((a) => a.name)).map((n) => opt(n, n, f.area)).join('') + '</select>' +
      (active ? '<button class="btn btn-ghost btn-sm" data-act="clear-filters">' + ic('x', 14) + ' Limpar</button>' : '');
    const right =
      '<div class="seg" aria-label="Modo de visualização">' +
      '<button type="button" class="' + (view === 'table' ? 'on' : '') + '" data-act="action-view" data-v="table" aria-pressed="' + (view === 'table') + '">' + ic('table', 15) + ' Tabela</button>' +
      '<button type="button" class="' + (view === 'board' ? 'on' : '') + '" data-act="action-view" data-v="board" aria-pressed="' + (view === 'board') + '">' + ic('board', 15) + ' Quadro</button></div>' +
      '<button class="btn btn-primary" data-act="new-action">' + ic('plus', 16) + ' Novo plano</button>';

    if (!s.actions.length) {
      return toolbar('', '<button class="btn btn-primary" data-act="new-action">' + ic('plus', 16) + ' Novo plano</button>') +
        '<div class="card">' + U.empty('list', 'Nenhum plano de ação', 'Transforme os KRs em iniciativas com dono e prazo.', '<button class="btn btn-primary" data-act="new-action">' + ic('plus', 16) + ' Novo plano</button>') + '</div>';
    }

    let body;
    if (view === 'board') {
      body = '<div class="kanban">' + Object.keys(S.STATUS).map((st) => {
        const items = list.filter((a) => a.status === st);
        return '<div class="kcol" data-dropstatus="' + st + '"><div class="kcol-head">' + U.statusBadge(st) + '<span class="n num">' + items.length + '</span></div>' +
          (items.length ? items.map(actionCard).join('') : '<div class="empty-col">Arraste planos para cá</div>') + '</div>';
      }).join('') + '</div>';
    } else {
      body = list.length ? '<div class="card table-wrap"><table class="table"><thead><tr><th>Plano de ação</th><th>Responsável</th><th>Prazo</th><th>Prioridade</th><th>Status</th><th>Progresso</th></tr></thead><tbody>' +
        groupedRows(list) + '</tbody></table></div>'
        : '<div class="card">' + U.empty('search', 'Nenhum plano com esses filtros', 'Ajuste ou limpe os filtros.', '<button class="btn" data-act="clear-filters">Limpar filtros</button>') + '</div>';
    }
    return toolbar(filters, right) + body;
  }

  /** Linha da tabela de planos (clique abre a edição, onde fica o excluir). */
  function actionRow(a) {
    return '<tr data-act="edit-action" data-id="' + esc(a.id) + '" style="cursor:pointer">' +
      '<td class="title-cell">' + esc(a.title) + '</td>' +
      '<td>' + U.people(a.owners) + '</td>' +
      '<td>' + U.dateTag(a.deadline, a.status) + '</td>' +
      '<td>' + U.priorityBadge(a.priority) + '</td>' +
      '<td>' + U.statusSelect(a.status, 'data-status-for="actions" data-id="' + esc(a.id) + '"') + '</td>' +
      '<td style="min-width:140px">' + U.progress(S.actionProgress(a), { status: a.status }) + '</td></tr>';
  }

  /**
   * Agrupa as linhas por Objetivo → KR, com cabeçalhos de seção.
   * O contexto fica no grupo, não em etiquetas em cada linha.
   * @param {object[]} list - Planos já filtrados e ordenados.
   * @returns {string} Linhas <tr> da tabela.
   */
  function groupedRows(list) {
    const s = S.state;
    const COLS = 6; // número de colunas da tabela de planos
    let html = '';
    const used = new Set();
    const krHead = (label) => '<tr class="grp-kr"><td colspan="' + COLS + '">' + label + '</td></tr>';
    s.objectives.forEach((o, i) => {
      const inObj = list.filter((a) => a.objectiveId === o.id);
      if (!inObj.length) return;
      html += '<tr class="grp-obj"><td colspan="' + COLS + '"><span class="obj-dot" style="background:' + esc(o.color) + '"></span>' +
        '<span class="eyebrow">Objetivo ' + (i + 1) + '</span><b>' + esc(o.title) + '</b></td></tr>';
      S.krsOf(o.id).forEach((k, j) => {
        const g = inObj.filter((a) => a.krId === k.id);
        if (!g.length) return;
        g.forEach((a) => used.add(a.id));
        html += krHead('<span class="mono">KR' + (j + 1) + '</span> ' + esc(k.title)) + g.map(actionRow).join('');
      });
      const rest = inObj.filter((a) => !used.has(a.id));
      if (rest.length) { rest.forEach((a) => used.add(a.id)); html += krHead('Sem Key Result vinculado') + rest.map(actionRow).join(''); }
    });
    const orphan = list.filter((a) => !used.has(a.id));
    if (orphan.length) {
      html += '<tr class="grp-obj"><td colspan="' + COLS + '"><span class="obj-dot" style="background:var(--st-idle)"></span><b>Sem objetivo vinculado</b></td></tr>' + orphan.map(actionRow).join('');
    }
    return html;
  }

  /** Card do quadro (kanban) — arrastável entre colunas de status. */
  function actionCard(a) {
    const kr = a.krId ? S.byId('krs', a.krId) : null;
    const o = a.objectiveId ? S.byId('objectives', a.objectiveId) : null;
    return '<div class="acard" draggable="true" data-drag="action-card" data-id="' + esc(a.id) + '" data-act="edit-action" tabindex="0" role="button">' +
      '<div class="row"><span class="t">' + esc(a.title) + '</span>' + U.priorityBadge(a.priority) + '</div>' +
      (kr ? '<div class="acard-kr" title="' + esc(kr.title) + '"><i class="obj-dot" style="background:' + esc(o ? o.color : 'var(--st-idle)') + '"></i><span>' + esc(kr.title) + '</span></div>' : '') +
      U.progress(S.actionProgress(a), { size: 'sm', status: a.status }) +
      '<div class="row">' + U.people(a.owners) + U.dateTag(a.deadline, a.status) + '</div>' +
      '</div>';
  }

  // ===========================================================================
  // 5. MVV (mantida como está, a pedido da equipe)
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

    const company = '<form class="card card-pad" id="company-form">' + cardHead('Empresa e ciclo') +
      '<div class="form-grid">' +
      '<div class="field full"><label for="c-name">Nome da empresa</label><input class="input" id="c-name" name="name" value="' + esc(c.name) + '" required></div>' +
      '<div class="field full"><label for="c-cycle">Nome do ciclo</label><input class="input" id="c-cycle" name="cycle" value="' + esc(c.cycle) + '" placeholder="Ex.: Q4 2026"></div>' +
      '<div class="field"><label for="c-start">Início</label><input class="input" type="date" id="c-start" name="cycleStart" value="' + esc(c.cycleStart) + '" required></div>' +
      '<div class="field"><label for="c-end">Fim</label><input class="input" type="date" id="c-end" name="cycleEnd" value="' + esc(c.cycleEnd) + '" required></div>' +
      '</div><div style="display:flex;justify-content:flex-end;margin-top:18px"><button class="btn btn-primary" type="submit">' + ic('check', 16) + ' Salvar</button></div></form>';

    const data = '<div class="card card-pad">' + cardHead('Backup') +
      '<div class="setting-row"><div class="t">Exportar</div>' +
      '<span style="display:flex;gap:6px"><button class="btn btn-sm" data-act="export-json">' + ic('download', 14) + ' Baixar</button><button class="btn btn-sm" data-act="copy-json">' + ic('copy', 14) + ' Copiar</button></span></div>' +
      '<div class="setting-row"><div class="t">Importar</div>' +
      '<label class="btn btn-sm" for="import-file" style="cursor:pointer">' + ic('upload', 14) + ' Escolher arquivo</label><input type="file" id="import-file" accept="application/json,.json" hidden></div>' +
      (S.persisted ? '' : '<p class="hint" style="margin-top:10px">O navegador está bloqueando o salvamento: exporte antes de fechar.</p>') +
      '</div>';

    return '<div class="settings-grid"><div class="stack">' + company + '</div><div class="stack">' + data + '</div></div>';
  }

  // ===========================================================================
  // 7. MACROESTRUTURA
  // ===========================================================================

  /**
   * Card de cargo: título, ocupantes e, quando houver, o que o cargo faz.
   * Mostra quantos objetivos/KRs/planos estão sob esse cargo.
   * @param {object} r - Cargo da macroestrutura.
   */
  function roleCard(r) {
    const o = S.owner(r.id);
    const s = S.state;
    const n = s.objectives.filter((x) => x.owner === r.id).length + s.krs.filter((x) => x.owner === r.id).length + s.actions.filter((x) => S.ownersOf(x).indexOf(r.id) >= 0).length;
    return '<div class="role-card">' +
      '<div class="role-title">' + esc(r.title) + '</div>' +
      '<div class="role-who">' + U.avatars(o.holders) + '<span>' + esc(o.sub) + '</span></div>' +
      (r.description ? '<p class="role-desc">' + esc(r.description) + '</p>' : '') +
      (n ? '<div class="role-load">' + n + (n === 1 ? ' item atribuído' : ' itens atribuídos') + '</div>' : '') +
      '</div>';
  }

  /** Organograma: Estratégia no topo, áreas em colunas e frentes abaixo. */
  function structure() {
    const org = S.ORG;
    const top = '<section class="org-top card"><h3 class="org-area-name">' + esc(org.top.name) + '</h3>' +
      '<div class="org-top-roles">' + org.top.roles.map(roleCard).join('') + '</div></section>';
    const areas = '<div class="org-areas">' + org.areas.map((a) =>
      '<section class="org-col"><div class="card org-area"><h3 class="org-area-name">' + esc(a.name) + '</h3>' + roleCard(a.lead) + '</div>' +
      '<div class="org-units">' + a.units.map((u) =>
        '<div class="org-unit"><div class="org-unit-name">' + esc(u.name) + '</div>' + roleCard(u.role) + '</div>').join('') + '</div>' +
      '</section>').join('') + '</div>';

    // quem ocupa o quê: leitura rápida por pessoa
    const byPerson = Object.keys(S.ORG_PEOPLE).map((key) => {
      const p = S.ORG_PEOPLE[key];
      const roles = S.orgRoles().filter((r) => r.holders.indexOf(key) >= 0).map((r) => r.title);
      return '<div class="person-roles">' + U.avatars([p]) + '<div><b>' + esc(p.name) + '</b><span>' + esc(roles.join(' · ')) + '</span></div></div>';
    }).join('');

    return '<div class="org">' + top + '<div class="org-stem"></div>' + areas + '</div>' +
      '<div class="card card-pad">' + cardHead('Cargos por pessoa') + '<div class="people-roles">' + byPerson + '</div></div>';
  }

  window.Views = {
    dashboard: { title: 'Dashboard', render: dashboard },
    okrs: { title: 'Estratégia & OKRs', render: okrs },
    indicadores: { title: 'Indicadores', render: indicators },
    planos: { title: 'Planos de ação', render: actions },
    mvv: { title: 'Missão, Visão e Valores', render: mvv },
    estrutura: { title: 'Macroestrutura', render: structure },
    configuracoes: { title: 'Configurações', render: settings },
    mvvCompletion,
  };
})();
