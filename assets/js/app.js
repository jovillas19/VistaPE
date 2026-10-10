/**
 * @file app.js
 * @description Shell da aplicação: monta sidebar/topbar, roteia entre as
 * views pelo hash da URL (#dashboard, #okrs…), e trata toda a interação via
 * delegação de eventos (cliques, selects de status, filtros, drag & drop,
 * importação/exportação).
 *
 * Dependências: Store, UI, Forms, Views.
 */
(function () {
  'use strict';
  const S = window.Store;
  const U = window.UI;
  const F = window.Forms;
  const V = window.Views;
  const ic = U.icon;
  const esc = U.esc;

  /** Ordem e metadados da navegação lateral. */
  const NAV = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'okrs', label: 'Estratégia & OKRs', icon: 'target' },
    { id: 'indicadores', label: 'Indicadores', icon: 'pulse' },
    { id: 'planos', label: 'Planos de ação', icon: 'list' },
    { id: 'mvv', label: 'MVV', icon: 'compass' },
    { id: 'estrutura', label: 'Macroestrutura', icon: 'users' },
  ];
  const DEFAULT_ROUTE = 'dashboard';

  const app = document.getElementById('app');
  let route = '';

  /** Rota atual a partir do hash (apenas tokens simples, ex.: "#planos"). */
  function currentRoute() {
    const h = (location.hash || '').replace('#', '');
    return V[h] && V[h].render ? h : DEFAULT_ROUTE;
  }

  // ---------------------------------------------------------------------------
  // Tema
  // ---------------------------------------------------------------------------

  /** Aplica a preferência de tema: "system" remove o atributo e segue o SO. */
  function applyTheme() {
    const root = document.documentElement;
    if (S.ui.theme === 'light' || S.ui.theme === 'dark') root.setAttribute('data-theme', S.ui.theme);
    else root.removeAttribute('data-theme');
  }
  /** Tema efetivo no momento (resolve "system" pela media query). */
  function effectiveTheme() {
    if (S.ui.theme !== 'system') return S.ui.theme;
    return window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  // ---------------------------------------------------------------------------
  // Shell
  // ---------------------------------------------------------------------------

  /** Monta a estrutura fixa (sidebar + topbar + área de conteúdo) uma única vez. */
  function mountShell() {
    app.innerHTML =
      '<aside class="sidebar" id="sidebar" aria-label="Navegação principal">' +
      '<a class="brand" href="#dashboard" aria-label="VISTA studios, início"><span class="brand-mark">' + U.logoMark(22) + '</span>' +
      '<span class="brand-name"><b>VISTA</b><span>studios</span></span></a>' +
      '<nav class="nav" id="nav"></nav>' +
      '<nav class="nav nav-sys" id="nav-sys"></nav>' +
      '<div class="cycle-card" id="cycle-card"></div></aside>' +
      '<div class="main"><header class="topbar">' +
      '<button class="icon-btn menu-btn" data-act="toggle-nav" aria-label="Abrir menu">' + ic('menu', 20) + '</button>' +
      '<div class="crumb"><h1 id="crumb-title"></h1></div>' +
      '<span class="spacer"></span>' +
      '<button class="icon-btn outline" data-act="toggle-theme" id="theme-btn" aria-label="Alternar tema claro/escuro"></button>' +
      '<div class="dropdown" id="new-dd"><button class="btn btn-primary" data-act="toggle-new" aria-haspopup="menu" aria-expanded="false">' + ic('plus', 16) + '<span class="btn-label">Novo</span></button>' +
      '<div class="dropdown-menu" role="menu" hidden>' +
      '<button type="button" role="menuitem" data-act="new-objective">' + ic('target', 16) + '<span>Objetivo<small>Direção estratégica do ciclo</small></span></button>' +
      '<button type="button" role="menuitem" data-act="new-kr">' + ic('layers', 16) + '<span>Key Result<small>Resultado mensurável</small></span></button>' +
      '<button type="button" role="menuitem" data-act="new-kpi">' + ic('pulse', 16) + '<span>Indicador<small>Métrica contínua (KPI)</small></span></button>' +
      '<button type="button" role="menuitem" data-act="new-action">' + ic('list', 16) + '<span>Plano de ação<small>Iniciativa com dono e prazo</small></span></button>' +
      '</div></div></header>' +
      '<main class="content" id="content" tabindex="-1"></main></div>';
  }

  /** Atualiza partes dinâmicas do shell (alerta de atrasos, ciclo, título, tema). */
  function renderChrome() {
    const s = S.state;
    const overdue = s.actions.filter(S.isOverdue).length;
    document.getElementById('nav').innerHTML = NAV.map((n) =>
      '<a href="#' + n.id + '" class="' + (route === n.id ? 'active' : '') + '"' + (route === n.id ? ' aria-current="page"' : '') + '>' + ic(n.icon, 18) + '<span>' + n.label + '</span>' +
      (n.id === 'planos' && overdue ? '<span class="dot-alert" title="' + overdue + ' plano(s) atrasado(s)">' + overdue + '</span>' : '') + '</a>').join('');
    document.getElementById('nav-sys').innerHTML =
      '<a href="#configuracoes" class="' + (route === 'configuracoes' ? 'active' : '') + '">' + ic('sliders', 18) + '<span>Configurações</span></a>';

    const el = S.cycleElapsed();
    document.getElementById('cycle-card').innerHTML =
      '<div class="row"><span class="title">' + esc(s.company.cycle) + '</span><span class="meta">' + S.cycleDaysLeft() + ' dias restantes</span></div>' +
      '<div class="track" title="Tempo decorrido do ciclo"><span style="width:' + (el * 100).toFixed(1) + '%"></span></div>';

    document.getElementById('crumb-title').textContent = V[route].title;
    document.title = V[route].title + ' · ' + s.company.name;
    document.getElementById('theme-btn').innerHTML = ic(effectiveTheme() === 'dark' ? 'sun' : 'moon', 18);
  }

  /**
   * Renderiza a view atual preservando foco e cursor do campo ativo
   * (necessário porque a renderização substitui o HTML do conteúdo).
   * @param {boolean} routeChanged - Anima a entrada e rola ao topo.
   */
  function render(routeChanged) {
    const content = document.getElementById('content');
    const active = document.activeElement;
    const focusId = active && active.id && content.contains(active) ? active.id : null;
    const sel = focusId && typeof active.selectionStart === 'number' ? [active.selectionStart, active.selectionEnd] : null;

    renderChrome();
    content.innerHTML = V[route].render();

    if (routeChanged) {
      content.classList.remove('view-enter');
      void content.offsetWidth; // reinicia a animação de entrada
      content.classList.add('view-enter');
      window.scrollTo(0, 0);
    }
    if (focusId) {
      const el = document.getElementById(focusId);
      if (el) { el.focus(); if (sel && el.setSelectionRange) try { el.setSelectionRange(sel[0], sel[1]); } catch (e) { /* tipos sem seleção */ } }
    }
  }

  function onRoute() {
    const r = currentRoute();
    const changed = r !== route;
    route = r;
    app.classList.remove('nav-open');
    render(changed);
  }

  // ---------------------------------------------------------------------------
  // Ações (delegação de cliques)
  // ---------------------------------------------------------------------------

  /** Navega para uma rota; se já estiver nela, apenas re-renderiza. */
  function go(r) { if (location.hash === '#' + r) render(false); else location.hash = r; }

  /** Abre o formulário certo para um item, a partir de seu tipo. */
  function openItem(kind, id) {
    const it = S.byId(kind, id);
    if (!it) return;
    if (kind === 'actions') F.editAction(it);
    else if (kind === 'krs') F.editKR(it);
    else if (kind === 'kpis') F.editKPI(it);
    else if (kind === 'objectives') F.editObjective(it);
  }

  /**
   * Ajusta o valor atual do KR em ±1 (stepper rápido). Se o KR tiver
   * indicador de origem, a medição é registrada no indicador (Store.setKrValue).
   */
  function stepKR(id, delta) {
    const k = S.byId('krs', id);
    if (!k) return;
    S.setKrValue(id, Math.round((S.num(k.current) + delta) * 100) / 100);
  }

  /** Baixa o estado como JSON (funciona localmente; alguns ambientes bloqueiam downloads). */
  function exportJSON() {
    const data = JSON.stringify(S.state, null, 2);
    try {
      const blob = new Blob([data], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'vista-estrategia-' + S.todayISO() + '.json';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
      U.toast('Backup gerado. Se o download não iniciar, use "Copiar".');
    } catch (e) { U.toast('Download indisponível aqui. Use "Copiar".'); }
  }

  /** Copia o JSON para a área de transferência, com fallback em modal selecionável. */
  function copyJSON() {
    const data = JSON.stringify(S.state, null, 2);
    const fallback = () => U.openModal({
      title: 'Copie o backup', text: 'Selecione o conteúdo abaixo e copie (Ctrl+C).', icon: 'copy', confirmLabel: 'Fechar',
      body: '<textarea class="textarea mono" id="json-out" rows="10" readonly style="font-size:11px">' + esc(data) + '</textarea>',
      onConfirm: () => {},
    });
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(data).then(() => U.toast('Backup copiado para a área de transferência'), fallback);
    } else fallback();
  }

  const ACTIONS = {
    'toggle-nav': () => app.classList.toggle('nav-open'),
    'toggle-theme': () => { S.ui.theme = effectiveTheme() === 'dark' ? 'light' : 'dark'; S.saveUI(); applyTheme(); render(false); },
    'toggle-new': (el) => {
      const menu = el.parentElement.querySelector('.dropdown-menu');
      menu.hidden = !menu.hidden;
      el.setAttribute('aria-expanded', String(!menu.hidden));
    },

    // Objetivos
    'new-objective': () => F.editObjective(),
    'edit-objective': (el) => openItem('objectives', el.dataset.id),
    'toggle-objective': (el) => { const id = el.dataset.id; if (S.ui.collapsed[id]) delete S.ui.collapsed[id]; else S.ui.collapsed[id] = true; S.saveUI(); render(false); },
    // KRs
    'new-kr': (el) => F.editKR(null, el.dataset.id),
    'edit-kr': (el) => openItem('krs', el.dataset.id),
    'kr-inc': (el) => stepKR(el.dataset.id, 1),
    'kr-dec': (el) => stepKR(el.dataset.id, -1),
    // Indicadores
    'new-kpi': () => F.editKPI(),
    'edit-kpi': (el) => openItem('kpis', el.dataset.id),
    'measure-kpi': (el) => F.recordMeasurement(S.byId('kpis', el.dataset.id)),
    // Planos de ação
    'new-action': () => {
      const f = S.ui.actionFilters;
      // herda o contexto dos filtros ativos para agilizar o cadastro
      F.editAction(null, route === 'planos' ? { objectiveId: f.objectiveId, krId: f.krId } : {});
    },
    'edit-action': (el) => openItem('actions', el.dataset.id),
    'action-view': (el) => { S.ui.actionView = el.dataset.v; S.saveUI(); render(false); },
    'clear-filters': () => { S.ui.actionFilters = { objectiveId: '', krId: '', status: '' }; S.saveUI(); render(false); },
    'open-item': (el) => openItem(el.dataset.kind, el.dataset.id),

    // MVV
    'new-value': () => F.editValue(),
    'edit-value': (el) => F.editValue(+el.dataset.id),
    'delete-value': (el) => {
      const i = +el.dataset.id;
      U.confirmDelete('Excluir valor?', '"' + S.state.mvv.values[i].title + '" será removido.', () => {
        const snap = S.snapshot();
        S.commit((s) => { s.mvv.values.splice(i, 1); });
        U.toast('Valor excluído', { actionLabel: 'Desfazer', onAction: () => S.restore(snap) });
      });
    },

    // Configurações
    'export-json': exportJSON,
    'copy-json': copyJSON,

  };

  document.addEventListener('click', (e) => {
    // fecha o menu "Novo" ao clicar fora dele
    const dd = document.getElementById('new-dd');
    if (dd && !dd.contains(e.target)) { const m = dd.querySelector('.dropdown-menu'); if (m && !m.hidden) { m.hidden = true; dd.querySelector('[aria-expanded]').setAttribute('aria-expanded', 'false'); } }
    // fecha a sidebar mobile ao tocar no conteúdo
    if (app.classList.contains('nav-open') && !e.target.closest('.sidebar') && !e.target.closest('[data-act="toggle-nav"]')) app.classList.remove('nav-open');

    // controles de formulário dentro de linhas clicáveis não devem abrir o item
    if (e.target.closest('select, input, textarea, label, .badge-select')) return;
    const el = e.target.closest('[data-act]');
    if (!el || !ACTIONS[el.dataset.act]) return;
    if (el.tagName === 'A') e.preventDefault();
    // fecha o menu "Novo" após escolher uma opção
    if (el.closest('.dropdown-menu')) { el.closest('.dropdown-menu').hidden = true; }
    e.stopPropagation();
    ACTIONS[el.dataset.act](el, e);
  });

  // Enter/Espaço em elementos role="button" não nativos (cards, itens de prazo)
  document.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[role="button"][data-act]')) {
      e.preventDefault();
      ACTIONS[e.target.dataset.act] && ACTIONS[e.target.dataset.act](e.target, e);
    }
  });

  // ---------------------------------------------------------------------------
  // Mudanças em selects/inputs (status rápido, filtros, busca, MVV)
  // ---------------------------------------------------------------------------
  let mvvTimer = null;

  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t.dataset.statusFor) {
      const coll = t.dataset.statusFor;
      S.commit((s) => {
        const it = s[coll].find((x) => x.id === t.dataset.id);
        if (!it) return;
        it.status = t.value;
        if (coll === 'actions' && t.value === 'done') it.progress = 100;
      });
      U.toast('Status atualizado: ' + S.STATUS[t.value]);
      return;
    }
    if (t.dataset.filter && t.tagName === 'SELECT') {
      S.ui.actionFilters[t.dataset.filter] = t.value;
      // ao trocar o objetivo, um KR de outro objetivo deixa de fazer sentido
      if (t.dataset.filter === 'objectiveId') {
        const kr = S.byId('krs', S.ui.actionFilters.krId);
        if (kr && t.value && kr.objectiveId !== t.value) S.ui.actionFilters.krId = '';
      }
      if (t.dataset.filter === 'krId' && t.value) {
        const kr = S.byId('krs', t.value);
        if (kr) S.ui.actionFilters.objectiveId = kr.objectiveId;
      }
      S.saveUI(); render(false); return;
    }
    if (t.dataset.mvv) { saveMVV(t); return; }
    if (t.id === 'import-file' && t.files && t.files[0]) importFile(t.files[0], t);
  });

  document.addEventListener('input', (e) => {
    const t = e.target;
    if (t.dataset.mvv) {
      clearTimeout(mvvTimer);
      mvvTimer = setTimeout(() => saveMVV(t), 400); // salva ~0,4s após parar de digitar
    }
  });

  /**
   * Salva um campo do MVV sem re-renderizar a tela (mantém cursor e
   * evita perder cliques), atualizando só as pílulas de completude.
   */
  function saveMVV(t) {
    S.commit((s) => { s.mvv[t.dataset.mvv] = t.value; }, { silent: true });
    t.classList.toggle('filled', !!t.value.trim());
    const c = document.getElementById('mvv-completion');
    if (c) c.innerHTML = V.mvvCompletion();
  }

  // Formulário de empresa/ciclo (Configurações)
  document.addEventListener('submit', (e) => {
    if (e.target.id !== 'company-form') return;
    e.preventDefault();
    const fd = new FormData(e.target);
    const v = {}; fd.forEach((val, k) => { v[k] = String(val).trim(); });
    if (v.cycleEnd <= v.cycleStart) { U.toast('A data de fim precisa ser depois do início'); return; }
    S.commit((s) => { Object.assign(s.company, v); });
    U.toast('Empresa e ciclo atualizados');
  });

  /** Lê um arquivo JSON exportado e substitui o estado (com desfazer). */
  function importFile(file, input) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const snap = S.snapshot();
        S.replace(JSON.parse(reader.result));
        U.toast('Backup importado', { actionLabel: 'Desfazer', onAction: () => S.restore(snap), ms: 7000 });
      } catch (err) {
        U.toast('Não foi possível importar: o arquivo não é um backup válido deste painel.');
      }
      input.value = '';
    };
    reader.readAsText(file);
  }

  // ---------------------------------------------------------------------------
  // Drag & drop
  //  - objetivos e KRs: reordenar (KR pode mudar de objetivo ao ser solto em outro)
  //  - valores do MVV: reordenar
  //  - cards do quadro: mover entre colunas altera o status
  // ---------------------------------------------------------------------------
  let drag = null;

  // Objetivos e KRs só ficam arrastáveis a partir da alça, para não
  // atrapalhar seleção de texto e cliques no restante do card.
  document.addEventListener('mousedown', (e) => {
    const h = e.target.closest('[data-handle]');
    if (h) { const it = h.closest('[data-drag]'); if (it) it.setAttribute('draggable', 'true'); }
  });

  document.addEventListener('dragstart', (e) => {
    const el = e.target.closest && e.target.closest('[data-drag]');
    if (!el || el.getAttribute('draggable') !== 'true') return;
    e.stopPropagation();
    drag = { kind: el.dataset.drag, id: el.dataset.id, el };
    el.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', el.dataset.id); } catch (err) { /* IE/Edge legado */ }
  });

  const clearMarks = () => document.querySelectorAll('.drop-before,.drop-after,.drop-zone-over').forEach((n) => n.classList.remove('drop-before', 'drop-after', 'drop-zone-over'));

  /** Alvo válido de soltura para o item arrastado. */
  function dropTarget(e) {
    if (!drag) return null;
    if (drag.kind === 'action-card') return e.target.closest('[data-dropstatus]');
    const t = e.target.closest('[data-drag="' + drag.kind + '"]');
    return t && t !== drag.el ? t : null;
  }

  document.addEventListener('dragover', (e) => {
    const t = dropTarget(e);
    if (!t) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    clearMarks();
    if (drag.kind === 'action-card') { t.classList.add('drop-zone-over'); return; }
    const r = t.getBoundingClientRect();
    // valores ficam em grade (horizontal); demais itens em lista (vertical)
    const after = drag.kind === 'values' ? e.clientX > r.left + r.width / 2 : e.clientY > r.top + r.height / 2;
    t.classList.add(after ? 'drop-after' : 'drop-before');
  });

  document.addEventListener('drop', (e) => {
    const t = dropTarget(e);
    if (!t) return;
    e.preventDefault();
    const after = t.classList.contains('drop-after');
    const d = drag;
    clearMarks();
    if (d.kind === 'action-card') {
      const st = t.dataset.dropstatus;
      S.commit((s) => {
        const a = s.actions.find((x) => x.id === d.id);
        if (a && a.status !== st) { a.status = st; if (st === 'done') a.progress = 100; }
      });
      U.toast('Movido para ' + S.STATUS[t.dataset.dropstatus]);
    } else if (d.kind === 'values') {
      const from = +d.id; let to = +t.dataset.id;
      S.commit((s) => {
        const [v] = s.mvv.values.splice(from, 1);
        if (from < to) to -= 1;
        s.mvv.values.splice(after ? to + 1 : to, 0, v);
      });
    } else if (d.kind === 'krs') {
      const target = S.byId('krs', t.dataset.id);
      const src = S.byId('krs', d.id);
      // soltar sobre KR de outro objetivo transfere o KR para aquele objetivo
      if (target && src && target.objectiveId !== src.objectiveId) {
        S.commit((s) => { s.krs.find((x) => x.id === d.id).objectiveId = target.objectiveId; }, { silent: true });
        U.toast('KR movido para O' + S.objectiveIndex(target.objectiveId));
      }
      S.reorder('krs', d.id, t.dataset.id, after);
    } else {
      S.reorder(d.kind, d.id, t.dataset.id, after);
    }
  });

  document.addEventListener('dragend', () => {
    if (drag && drag.el) {
      drag.el.classList.remove('dragging');
      if (drag.kind !== 'action-card' && drag.kind !== 'values') drag.el.removeAttribute('draggable');
    }
    drag = null;
    clearMarks();
  });

  // ---------------------------------------------------------------------------
  // Inicialização
  // ---------------------------------------------------------------------------
  applyTheme();
  mountShell();
  S.subscribe(() => render(false));
  window.addEventListener('hashchange', onRoute);
  if (window.matchMedia) {
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const onScheme = () => { if (S.ui.theme === 'system') renderChrome(); };
    mq.addEventListener ? mq.addEventListener('change', onScheme) : mq.addListener(onScheme);
  }
  onRoute();
})();
