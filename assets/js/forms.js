/**
 * @file forms.js
 * @description Formulários de cadastro/edição exibidos no drawer lateral.
 *
 * Cada função `edit*` abre o drawer já preenchido (edição) ou vazio
 * (criação, quando o item não é informado), valida, salva no Store e
 * mostra um toast. Exclusões sempre oferecem "Desfazer".
 *
 * Dependências: Store, UI. Exposto como `window.Forms`.
 */
(function () {
  'use strict';
  const S = window.Store;
  const U = window.UI;
  const esc = U.esc;

  // ---------------------------------------------------------------------------
  // Construtores de campo (HTML)
  // ---------------------------------------------------------------------------

  /** Gera um id estável para o campo — preserva foco/valor entre renderizações. */
  const fid = (name) => 'f-' + name;

  function text(name, label, value, o) {
    o = o || {};
    return '<div class="field ' + (o.full ? 'full' : '') + '"><label for="' + fid(name) + '">' + esc(label) + '</label>' +
      '<input class="input" id="' + fid(name) + '" name="' + name + '" type="' + (o.type || 'text') + '" value="' + esc(value) + '"' +
      (o.placeholder ? ' placeholder="' + esc(o.placeholder) + '"' : '') + (o.required ? ' required' : '') +
      (o.step ? ' step="' + o.step + '"' : '') + (o.type === 'number' ? ' inputmode="decimal"' : '') + '>' +
      (o.hint ? '<span class="hint">' + esc(o.hint) + '</span>' : '') + '</div>';
  }
  function area(name, label, value, o) {
    o = o || {};
    return '<div class="field full"><label for="' + fid(name) + '">' + esc(label) + '</label>' +
      '<textarea class="textarea" id="' + fid(name) + '" name="' + name + '" rows="' + (o.rows || 3) + '"' +
      (o.placeholder ? ' placeholder="' + esc(o.placeholder) + '"' : '') + '>' + esc(value) + '</textarea>' +
      (o.hint ? '<span class="hint">' + esc(o.hint) + '</span>' : '') + '</div>';
  }
  /**
   * @param {Array<[string,string]>} options - Pares [valor, rótulo].
   */
  function select(name, label, value, options, o) {
    o = o || {};
    return '<div class="field ' + (o.full ? 'full' : '') + '"><label for="' + fid(name) + '">' + esc(label) + '</label>' +
      '<select class="select" id="' + fid(name) + '" name="' + name + '">' +
      options.map(([v, l]) => '<option value="' + esc(v) + '"' + (String(v) === String(value || '') ? ' selected' : '') + '>' + esc(l) + '</option>').join('') +
      '</select>' + (o.hint ? '<span class="hint">' + esc(o.hint) + '</span>' : '') + '</div>';
  }
  const section = (label) => '<div class="form-section full">' + esc(label) + '</div>';
  const grid = (inner) => '<div class="form-grid">' + inner + '</div>';

  // Opções reutilizadas
  const peopleOpts = () => [['', 'Sem responsável']].concat(S.state.people.map((p) => [p.id, p.name]));
  const statusOpts = () => Object.keys(S.STATUS).map((k) => [k, S.STATUS[k]]);
  const priorityOpts = () => Object.keys(S.PRIORITY).map((k) => [k, S.PRIORITY[k]]);
  const objectiveOpts = (allowNone) => (allowNone ? [['', 'Sem objetivo vinculado']] : []).concat(
    S.state.objectives.map((o, i) => [o.id, 'O' + (i + 1) + ' · ' + o.title]));
  const krOpts = (objectiveId) => [['', 'Sem KR vinculado']].concat(
    S.state.krs.filter((k) => !objectiveId || k.objectiveId === objectiveId).map((k) => [k.id, 'KR' + (S.krsOf(k.objectiveId).indexOf(k) + 1) + ' · ' + k.title]));

  /**
   * Liga um select de objetivo a um select de KR: ao trocar o objetivo,
   * a lista de KRs é filtrada (evita vincular KR de outro objetivo).
   */
  function bindObjectiveKr(root) {
    const o = root.querySelector('[name=objectiveId]');
    const k = root.querySelector('[name=krId]');
    if (!o || !k) return;
    o.addEventListener('change', () => {
      const cur = k.value;
      k.innerHTML = krOpts(o.value).map(([v, l]) => '<option value="' + esc(v) + '">' + esc(l) + '</option>').join('');
      if ([...k.options].some((op) => op.value === cur)) k.value = cur;
    });
    // escolher um KR primeiro preenche o objetivo automaticamente
    k.addEventListener('change', () => {
      const kr = S.byId('krs', k.value);
      if (kr && o.value !== kr.objectiveId) { o.value = kr.objectiveId; }
    });
  }

  /** Lê o formulário como objeto simples. */
  function values(form) {
    const out = {};
    new FormData(form).forEach((v, k) => { out[k] = typeof v === 'string' ? v.trim() : v; });
    return out;
  }

  /**
   * Exclui com possibilidade de desfazer (snapshot antes da operação).
   * @param {string} collection
   * @param {string} id
   * @param {string} label - Texto do toast.
   */
  function removeWithUndo(collection, id, label) {
    const snap = S.snapshot();
    S.remove(collection, id);
    U.closeDrawer();
    U.toast(label, { actionLabel: 'Desfazer', onAction: () => { S.restore(snap); U.toast('Exclusão desfeita'); }, ms: 6500 });
  }

  // ---------------------------------------------------------------------------
  // Objetivo
  // ---------------------------------------------------------------------------

  /**
   * Abre o formulário de objetivo.
   * @param {object} [obj] - Objetivo existente; omitido para criar.
   */
  function editObjective(obj) {
    const isNew = !obj;
    obj = obj || { title: '', description: '', owner: '', deadline: S.state.company.cycleEnd, color: S.OBJECTIVE_COLORS[S.state.objectives.length % S.OBJECTIVE_COLORS.length], notes: '' };
    const swatches = '<div class="field full"><span class="label">Cor de identificação</span><div class="swatches">' +
      S.OBJECTIVE_COLORS.map((c, i) => '<label title="Cor ' + (i + 1) + '"><input type="radio" name="color" value="' + c + '"' + (c === obj.color ? ' checked' : '') + '><span style="background:' + c + '"></span></label>').join('') +
      '</div></div>';
    U.openDrawer({
      title: isNew ? 'Novo objetivo' : 'Editar objetivo',
      subtitle: isNew ? 'Defina uma direção qualitativa e inspiradora para o ciclo.' : 'O' + S.objectiveIndex(obj.id) + ' · ' + S.state.company.cycle,
      submitLabel: isNew ? 'Criar objetivo' : 'Salvar alterações',
      body: grid(
        text('title', 'Nome do objetivo', obj.title, { required: true, full: true, placeholder: 'Ex.: Validar a viabilidade do modelo de negócio' }) +
        area('description', 'Descrição', obj.description, { placeholder: 'Por que este objetivo importa agora?' }) +
        select('owner', 'Responsável', obj.owner, peopleOpts()) +
        text('deadline', 'Prazo', obj.deadline, { type: 'date' }) +
        swatches +
        area('notes', 'Observações', obj.notes, { rows: 2, placeholder: 'Premissas, riscos, contexto…' })
      ),
      onDelete: isNew ? null : () => {
        const n = S.krsOf(obj.id).length;
        U.confirmDelete('Excluir objetivo?', 'O objetivo e seus ' + n + ' KR(s) serão removidos. Planos e indicadores vinculados serão mantidos, mas desvinculados.',
          () => removeWithUndo('objectives', obj.id, 'Objetivo excluído'));
      },
      onSubmit: (form) => {
        const v = values(form);
        const id = S.upsert('objectives', Object.assign(isNew ? {} : { id: obj.id }, v));
        if (isNew) { delete S.ui.collapsed[id]; S.saveUI(); }
        U.toast(isNew ? 'Objetivo criado' : 'Objetivo atualizado');
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Key Result
  // ---------------------------------------------------------------------------

  /**
   * Abre o formulário de KR.
   * @param {object} [kr] - KR existente.
   * @param {string} [objectiveId] - Objetivo pré-selecionado ao criar.
   */
  function editKR(kr, objectiveId) {
    const isNew = !kr;
    kr = kr || { objectiveId: objectiveId || (S.state.objectives[0] || {}).id || '', title: '', description: '', start: 0, current: 0, target: '', unit: '', owner: '', deadline: S.state.company.cycleEnd, status: 'not_started', notes: '', kpiId: '' };
    const kpiOpts = [['', 'Atualização manual']].concat(S.state.kpis.map((k) => [k.id, k.name + (k.unit ? ' (' + k.unit + ')' : '')]));
    if (!S.state.objectives.length) { U.toast('Crie um objetivo antes de adicionar KRs'); return; }
    U.openDrawer({
      title: isNew ? 'Novo Key Result' : 'Editar Key Result',
      subtitle: isNew ? 'Um resultado mensurável que indica o avanço do objetivo.' : S.krCode(kr),
      submitLabel: isNew ? 'Criar KR' : 'Salvar alterações',
      body: grid(
        select('objectiveId', 'Objetivo', kr.objectiveId, objectiveOpts(false), { full: true }) +
        text('title', 'Resultado-chave', kr.title, { required: true, full: true, placeholder: 'Ex.: Conquistar 5 clientes recorrentes' }) +
        area('description', 'Descrição / critério de medição', kr.description, { rows: 2, placeholder: 'Como saberemos que foi atingido?' }) +
        section('Meta e medição') +
        select('kpiId', 'Valor atual vem do indicador', kr.kpiId || '', kpiOpts, { full: true, hint: 'Com um indicador escolhido, o KR é atualizado automaticamente sempre que o indicador mudar.' }) +
        text('start', 'Valor inicial', kr.start, { type: 'number', step: 'any' }) +
        text('current', 'Valor atual', kr.current, { type: 'number', step: 'any' }) +
        text('target', 'Meta', kr.target, { type: 'number', step: 'any', required: true }) +
        text('unit', 'Unidade de medida', kr.unit, { placeholder: 'clientes, %, contratos…' }) +
        '<div class="field full"><span class="label">Prévia do progresso</span><div id="kr-preview"></div></div>' +
        section('Execução') +
        select('owner', 'Responsável', kr.owner, peopleOpts()) +
        text('deadline', 'Prazo', kr.deadline, { type: 'date' }) +
        select('status', 'Status', kr.status, statusOpts(), { full: true }) +
        area('notes', 'Observações', kr.notes, { rows: 2 })
      ),
      onMount: (el) => {
        // prévia ao vivo do progresso enquanto o usuário digita a meta
        const prev = el.querySelector('#kr-preview');
        const src = el.querySelector('[name=kpiId]');
        const cur = el.querySelector('[name=current]');
        /** Com indicador de origem, o valor atual é somente leitura e espelha o indicador. */
        const syncField = () => {
          const k = S.byId('kpis', src.value);
          cur.disabled = !!k;
          if (k) cur.value = k.current;
        };
        src.addEventListener('change', syncField);
        syncField();
        const upd = () => {
          const v = values(el.querySelector('form'));
          prev.innerHTML = U.progress(S.krProgress({ start: v.start, current: cur.value, target: v.target, status: v.status }), { status: v.status });
        };
        el.querySelector('form').addEventListener('input', upd);
        el.querySelector('form').addEventListener('change', upd);
        upd();
      },
      onDelete: isNew ? null : () => U.confirmDelete('Excluir este KR?', 'Planos de ação e indicadores ligados a ele serão mantidos, sem vínculo.',
        () => removeWithUndo('krs', kr.id, 'KR excluído')),
      onSubmit: (form) => {
        const v = values(form);
        ['start', 'target'].forEach((k) => { v[k] = S.num(v[k]); });
        // campo desabilitado não entra no FormData: o valor virá do indicador
        if (v.kpiId) delete v.current; else v.current = S.num(v.current);
        const id = S.upsert('krs', Object.assign(isNew ? {} : { id: kr.id }, v));
        // um indicador alimenta um único KR: libera vínculo anterior
        if (v.kpiId) S.commit((s) => { s.krs.forEach((x) => { if (x.id !== id && x.kpiId === v.kpiId) x.kpiId = ''; }); });
        if (S.ui.collapsed[v.objectiveId]) { delete S.ui.collapsed[v.objectiveId]; S.saveUI(); }
        U.toast(isNew ? 'KR criado' : 'KR atualizado');
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Indicador (KPI)
  // ---------------------------------------------------------------------------

  /**
   * Abre o formulário de indicador.
   * @param {object} [k] - Indicador existente.
   */
  function editKPI(k) {
    const isNew = !k;
    k = k || { name: '', description: '', formula: '', current: '', target: '', unit: '', direction: 'up', trend: 'auto', objectiveId: '', krId: '', history: [] };
    const fed = isNew ? null : S.krFedBy(k.id);
    U.openDrawer({
      title: isNew ? 'Novo indicador' : 'Editar indicador',
      subtitle: isNew ? 'Métrica acompanhada continuamente para medir a saúde da estratégia.' : k.name,
      submitLabel: isNew ? 'Criar indicador' : 'Salvar alterações',
      body: grid(
        text('name', 'Nome do indicador', k.name, { required: true, full: true, placeholder: 'Ex.: NPS' }) +
        area('description', 'Descrição', k.description, { rows: 2 }) +
        area('formula', 'Fórmula / lógica de cálculo', k.formula, { rows: 2, placeholder: 'Ex.: % promotores − % detratores' }) +
        section('Valores') +
        text('current', 'Valor atual', k.current, { type: 'number', step: 'any', required: true }) +
        text('target', 'Meta', k.target, { type: 'number', step: 'any' }) +
        text('unit', 'Unidade de medida', k.unit, { placeholder: 'pts, %, clientes…' }) +
        select('direction', 'Melhor quando', k.direction, [['up', 'Maior é melhor'], ['down', 'Menor é melhor']]) +
        text('history', 'Histórico de medições', (k.history || []).join(', '), { full: true, placeholder: '40, 45, 50, 55', hint: 'Valores em ordem cronológica, separados por vírgula (decimais com ponto). Alimenta o mini gráfico.' }) +
        section('Vínculo estratégico') +
        select('objectiveId', 'Objetivo', k.objectiveId, objectiveOpts(true)) +
        select('krId', 'Key Result', k.krId, krOpts(k.objectiveId)) +
        '<p class="hint full">' + (fed ? 'Este indicador atualiza automaticamente o KR "' + esc(fed.title) + '".'
          : 'Ao vincular a um KR que ainda não tem indicador de origem, este indicador passa a atualizá-lo automaticamente.') + '</p>'
      ),
      onMount: bindObjectiveKr,
      onDelete: isNew ? null : () => U.confirmDelete('Excluir indicador?', '"' + k.name + '" e seu histórico serão removidos.',
        () => removeWithUndo('kpis', k.id, 'Indicador excluído')),
      onSubmit: (form) => {
        const v = values(form);
        v.current = S.num(v.current);
        v.target = v.target === '' ? '' : S.num(v.target);
        // vírgula, ponto e vírgula ou espaço separam medições; decimais usam ponto
        v.history = String(v.history || '').split(/[;,\s]+/).filter((x) => x !== '').map(S.num);
        // valor atual novo entra como medição, para a tendência refletir a mudança
        if (!v.history.length || v.history[v.history.length - 1] !== v.current) v.history.push(v.current);
        const id = S.upsert('kpis', Object.assign(isNew ? {} : { id: k.id }, v));
        S.commit((s) => {
          // trocou de KR: deixa de alimentar o anterior
          s.krs.forEach((x) => { if (x.kpiId === id && x.id !== v.krId) x.kpiId = ''; });
          // KR escolhido sem origem passa a ser alimentado por este indicador
          const kr = s.krs.find((x) => x.id === v.krId);
          if (kr && !kr.kpiId) kr.kpiId = id;
        });
        U.toast(isNew ? 'Indicador criado' : 'Indicador atualizado');
      },
    });
  }

  /**
   * Modal rápido para registrar uma nova medição do indicador.
   * Adiciona ao histórico e atualiza o valor atual; se o indicador for a
   * origem de um KR, a sincronização do Store atualiza o KR em seguida.
   * @param {object} k
   */
  function recordMeasurement(k) {
    const kr = S.krFedBy(k.id);
    U.openModal({
      title: 'Registrar medição',
      text: k.name + ' · atual: ' + U.fmtValue(k.current, k.unit),
      icon: 'pulse',
      confirmLabel: 'Registrar',
      body: '<div class="field"><label for="m-val">Novo valor' + (k.unit ? ' (' + esc(k.unit) + ')' : '') + '</label>' +
        '<input class="input" id="m-val" type="number" step="any" required inputmode="decimal" value="' + esc(k.current) + '">' +
        (kr ? '<span class="hint">O KR "' + esc(kr.title) + '" será atualizado automaticamente.</span>' : '') + '</div>',
      onConfirm: (el) => {
        const val = S.num(el.querySelector('#m-val').value);
        S.commit((s) => {
          const it = s.kpis.find((x) => x.id === k.id);
          it.current = val;
          it.history = (it.history || []).concat([val]).slice(-24); // mantém as 24 últimas medições
        });
        U.toast(kr ? 'Medição registrada e KR atualizado' : 'Medição registrada');
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Plano de ação
  // ---------------------------------------------------------------------------

  /**
   * Abre o formulário de plano de ação, com editor de checklist.
   * @param {object} [a] - Plano existente.
   * @param {object} [defaults] - Valores iniciais ao criar (ex.: { krId }).
   */
  function editAction(a, defaults) {
    const isNew = !a;
    a = a || Object.assign({ title: '', description: '', objectiveId: '', krId: '', owner: '', deadline: '', priority: 'medium', status: 'not_started', progress: 0, notes: '', checklist: [] }, defaults || {});
    if (a.krId && !a.objectiveId) { const kr = S.byId('krs', a.krId); if (kr) a.objectiveId = kr.objectiveId; }
    // cópia local editável do checklist; só é gravada ao salvar
    let checklist = (a.checklist || []).map((c) => Object.assign({}, c));

    const body = grid(
      text('title', 'Título do plano', a.title, { required: true, full: true, placeholder: 'Ex.: Implantar pesquisa NPS pós-entrega' }) +
      area('description', 'Descrição', a.description, { rows: 2 }) +
      section('Vínculo estratégico') +
      select('objectiveId', 'Objetivo', a.objectiveId, objectiveOpts(true)) +
      select('krId', 'Key Result', a.krId, krOpts(a.objectiveId)) +
      section('Execução') +
      select('owner', 'Responsável', a.owner, peopleOpts()) +
      text('deadline', 'Prazo', a.deadline, { type: 'date' }) +
      select('priority', 'Prioridade', a.priority, priorityOpts()) +
      select('status', 'Status', a.status, statusOpts()) +
      '<div class="field full"><label for="f-progress">Percentual de conclusão</label>' +
      '<div class="range-row"><input type="range" id="f-progress" name="progress" min="0" max="100" step="5" value="' + esc(a.progress || 0) + '"><output class="num" id="f-progress-out">' + esc(a.progress || 0) + '%</output></div>' +
      '<span class="hint" id="f-progress-hint"></span></div>' +
      '<div class="field full"><span class="label">Checklist</span><div class="checklist" id="f-checklist"></div>' +
      '<div class="check-add"><input class="input" id="f-check-new" placeholder="Adicionar etapa e pressionar Enter"><button type="button" class="btn" id="f-check-add">' + U.icon('plus', 16) + ' Adicionar</button></div></div>' +
      area('notes', 'Observações', a.notes, { rows: 3, placeholder: 'Bloqueios, decisões, links…' })
    );

    U.openDrawer({
      title: isNew ? 'Novo plano de ação' : 'Editar plano de ação',
      subtitle: isNew ? 'Uma iniciativa concreta que move um Key Result.' : (a.krId ? S.krCode(S.byId('krs', a.krId)) + ' · ' : '') + (S.STATUS[a.status] || ''),
      submitLabel: isNew ? 'Criar plano' : 'Salvar alterações',
      body,
      onMount: (el) => {
        bindObjectiveKr(el);
        const listEl = el.querySelector('#f-checklist');
        const range = el.querySelector('#f-progress');
        const out = el.querySelector('#f-progress-out');
        const hint = el.querySelector('#f-progress-hint');
        const statusSel = el.querySelector('[name=status]');

        /** Com checklist, o progresso é derivado dos itens marcados. */
        const syncProgress = () => {
          if (checklist.length) {
            const p = Math.round((checklist.filter((c) => c.done).length / checklist.length) * 100);
            range.value = p; range.disabled = true;
            hint.textContent = 'Calculado automaticamente pelo checklist.';
          } else { range.disabled = false; hint.textContent = ''; }
          out.textContent = range.value + '%';
        };
        const renderList = () => {
          listEl.innerHTML = checklist.length ? checklist.map((c, i) =>
            '<div class="check-item ' + (c.done ? 'done' : '') + '">' +
            '<input type="checkbox" data-i="' + i + '"' + (c.done ? ' checked' : '') + ' aria-label="Concluir etapa">' +
            '<input class="input" data-t="' + i + '" value="' + esc(c.text) + '" aria-label="Texto da etapa">' +
            '<button type="button" class="icon-btn sm danger" data-r="' + i + '" aria-label="Remover etapa">' + U.icon('x', 14) + '</button></div>').join('')
            : '<span class="hint">Opcional. Divida o plano em etapas para acompanhar o avanço.</span>';
          syncProgress();
        };
        listEl.addEventListener('change', (e) => {
          const i = e.target.dataset.i;
          if (i != null) { checklist[i].done = e.target.checked; renderList(); }
        });
        listEl.addEventListener('input', (e) => { const i = e.target.dataset.t; if (i != null) checklist[i].text = e.target.value; });
        listEl.addEventListener('click', (e) => {
          const b = e.target.closest('[data-r]');
          if (b) { checklist.splice(+b.dataset.r, 1); renderList(); }
        });
        const addInput = el.querySelector('#f-check-new');
        const add = () => {
          const t = addInput.value.trim();
          if (!t) return;
          checklist.push({ id: S.uid('ck'), text: t, done: false });
          addInput.value = '';
          renderList();
          addInput.focus();
        };
        el.querySelector('#f-check-add').addEventListener('click', add);
        // Enter no campo de etapa adiciona o item em vez de enviar o formulário
        addInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } });
        range.addEventListener('input', () => { out.textContent = range.value + '%'; });
        statusSel.addEventListener('change', () => {
          if (statusSel.value === 'done' && !checklist.length) { range.value = 100; out.textContent = '100%'; }
        });
        renderList();
      },
      onDelete: isNew ? null : () => U.confirmDelete('Excluir plano de ação?', '"' + a.title + '" será removido.',
        () => removeWithUndo('actions', a.id, 'Plano de ação excluído')),
      onSubmit: (form) => {
        const v = values(form);
        const range = form.querySelector('#f-progress');
        v.progress = S.num(range.value); // range desabilitado não entra no FormData
        v.checklist = checklist.filter((c) => c.text.trim());
        if (v.status === 'done') v.progress = 100;
        else if (v.progress >= 100) v.status = 'done'; // 100% (manual ou checklist completo) conclui o plano
        S.upsert('actions', Object.assign(isNew ? {} : { id: a.id }, v));
        U.toast(isNew ? 'Plano de ação criado' : 'Plano de ação atualizado');
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Pessoas e Valores
  // ---------------------------------------------------------------------------

  /** Formulário de responsável (pessoa ou área). */
  function editPerson(p) {
    const isNew = !p;
    p = p || { name: '', role: '', color: S.PERSON_COLORS[S.state.people.length % S.PERSON_COLORS.length] };
    U.openDrawer({
      title: isNew ? 'Novo responsável' : 'Editar responsável',
      subtitle: 'Pessoas ou áreas que podem assumir objetivos, KRs e planos.',
      submitLabel: isNew ? 'Adicionar' : 'Salvar',
      body: grid(
        text('name', 'Nome', p.name, { required: true, full: true, placeholder: 'Ex.: Marina, ou Comercial' }) +
        text('role', 'Função / área', p.role, { full: true, placeholder: 'Ex.: Fotógrafa líder' }) +
        '<div class="field full"><span class="label">Cor do avatar</span><div class="swatches">' +
        S.PERSON_COLORS.map((c) => '<label><input type="radio" name="color" value="' + c + '"' + (c === p.color ? ' checked' : '') + '><span style="background:' + c + '"></span></label>').join('') +
        '</div></div>'
      ),
      onDelete: isNew ? null : () => U.confirmDelete('Remover responsável?', 'Os itens atribuídos a ' + p.name + ' ficarão sem responsável.',
        () => removeWithUndo('people', p.id, 'Responsável removido')),
      onSubmit: (form) => {
        S.upsert('people', Object.assign(isNew ? {} : { id: p.id }, values(form)));
        U.toast(isNew ? 'Responsável adicionado' : 'Responsável atualizado');
      },
    });
  }

  /**
   * Formulário de valor da empresa (MVV).
   * @param {number} [index] - Posição do valor existente; omitido para criar.
   */
  function editValue(index) {
    const list = S.state.mvv.values;
    const isNew = index == null;
    const v = isNew ? { title: '', description: '' } : list[index];
    U.openDrawer({
      title: isNew ? 'Novo valor' : 'Editar valor',
      subtitle: 'Um princípio que orienta decisões e comportamentos do time.',
      submitLabel: isNew ? 'Adicionar valor' : 'Salvar',
      body: grid(
        text('title', 'Valor', v.title, { required: true, full: true, placeholder: 'Ex.: Obsessão pelo detalhe' }) +
        area('description', 'O que significa na prática', v.description, { rows: 4, placeholder: 'Ex.: Revisamos cada imagem como se fosse capa de portfólio.' })
      ),
      onDelete: isNew ? null : () => U.confirmDelete('Excluir valor?', '"' + v.title + '" será removido.', () => {
        const snap = S.snapshot();
        S.commit((s) => { s.mvv.values.splice(index, 1); });
        U.closeDrawer();
        U.toast('Valor excluído', { actionLabel: 'Desfazer', onAction: () => S.restore(snap) });
      }),
      onSubmit: (form) => {
        const val = values(form);
        S.commit((s) => {
          if (isNew) s.mvv.values.push({ id: S.uid('v'), title: val.title, description: val.description });
          else Object.assign(s.mvv.values[index], val);
        });
        U.toast(isNew ? 'Valor adicionado' : 'Valor atualizado');
      },
    });
  }

  window.Forms = { editObjective, editKR, editKPI, editAction, editPerson, editValue, recordMeasurement, removeWithUndo };
})();
