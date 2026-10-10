/**
 * @file store.js
 * @description Camada de dados do Painel Estratégico VISTA studios.
 *
 * Responsabilidades:
 *  - Manter o estado único da aplicação (empresa, MVV, pessoas, objetivos,
 *    KRs, indicadores e planos de ação).
 *  - Persistir o estado em localStorage (com tolerância a falhas: em janela
 *    privada ou com armazenamento bloqueado o app segue funcionando em memória).
 *  - Expor seletores/cálculos derivados (progresso, saúde, alertas, prazos).
 *  - Oferecer operações de CRUD com exclusão em cascata/desvinculação segura
 *    e suporte a "desfazer" via snapshot.
 *
 * Dependências: nenhuma. Exposto globalmente como `window.Store`.
 */
(function () {
  'use strict';

  /** Chave do estado persistido. O sufixo de versão permite migrar o schema no futuro. */
  const STORAGE_KEY = 'vista-strategy-v1';
  /** Chave das preferências de interface (filtros, modo de visualização, tema…). */
  const UI_KEY = 'vista-ui-v1';
  /** Versão do schema de dados. Incrementar ao mudar a forma do estado. */
  const SCHEMA_VERSION = 1;
  /**
   * Versão dos OKRs iniciais. Ao incrementar, navegadores com dados de uma
   * versão anterior recebem os novos objetivos/KRs/indicadores uma única vez
   * (ver upgradeStrategy). 2 = OKRs definidos no quadro em out/2026.
   */
  const SEED_VERSION = 2;
  /** Cópia de segurança do estado anterior à troca de OKRs iniciais. */
  const BACKUP_KEY = 'vista-strategy-backup-before-seed-' + SEED_VERSION;

  /** Rótulos de status compartilhados por KRs e planos de ação. */
  const STATUS = {
    not_started: 'Não iniciado',
    in_progress: 'Em andamento',
    done: 'Concluído',
    at_risk: 'Em risco',
  };
  /** Rótulos de prioridade dos planos de ação. */
  const PRIORITY = { high: 'Alta', medium: 'Média', low: 'Baixa' };

  /**
   * Cores disponíveis para objetivos. Todas derivadas da paleta da marca
   * (petróleo → teal → verde-água) mais dois tons de apoio para diferenciar
   * quando houver muitos objetivos.
   */
  const OBJECTIVE_COLORS = ['#0c4f5b', '#16899a', '#35bfae', '#2a6fb0', '#7a5cc4', '#c4732a'];
  /** Cores de avatar para responsáveis. */
  const PERSON_COLORS = ['#0c4f5b', '#16899a', '#2a8f7e', '#2a6fb0', '#6d55b8', '#b0603a', '#5b7480'];

  /**
   * Gera um identificador curto e único o bastante para uso local.
   * @param {string} prefix - Prefixo legível (ex.: "kr", "act").
   * @returns {string} Ex.: "kr_lq3x9a2f".
   */
  function uid(prefix) {
    return prefix + '_' + Date.now().toString(36).slice(-4) + Math.random().toString(36).slice(2, 7);
  }

  /** Clona profundamente valores serializáveis em JSON. */
  function clone(v) { return JSON.parse(JSON.stringify(v)); }
  /** Limita uma fração ao intervalo 0–1. */
  function clamp01(n) { return Math.max(0, Math.min(1, n)); }
  /** Converte para número; valores inválidos viram 0. */
  function num(v) { const n = parseFloat(v); return isFinite(n) ? n : 0; }

  // ---------------------------------------------------------------------------
  // Dados iniciais
  // ---------------------------------------------------------------------------

  /**
   * Missão, visão e valores oficiais da VISTA studios. Ficam no código para
   * aparecerem iguais em qualquer navegador. Para alterar, edite aqui e
   * incremente MVV_VERSION.
   */
  const OFFICIAL_MVV = {
    mission: 'Transformar a visão do mundo sobre o mercado imobiliário, impactando nos resultados dos nossos clientes.',
    vision: 'Criar um novo modelo de negócio, impulsionando uma nova categoria no mercado imobiliário.',
    values: ['Querência', 'Obsessão', 'No Excuse', 'Kaizen', 'Fazemos a oportunidade'],
  };
  /** Versão do texto oficial do MVV; ao incrementar, todos os navegadores recebem o texto novo. */
  const MVV_VERSION = 1;

  /** MVV oficial no formato do estado (valores como itens editáveis). */
  function officialMvv() {
    return {
      mission: OFFICIAL_MVV.mission,
      vision: OFFICIAL_MVV.vision,
      values: OFFICIAL_MVV.values.map((title, i) => ({ id: 'v' + (i + 1), title, description: '' })),
    };
  }

  /**
   * OKRs iniciais do ciclo Q4 2026, como definidos no quadro da equipe.
   * Valores atuais começam em zero (início do acompanhamento), sem
   * responsáveis nem planos de ação: a equipe preenche pelo painel.
   * Cada KR tem um indicador de origem, que o atualiza automaticamente.
   * @returns {{objectives: object[], krs: object[], kpis: object[], actions: object[]}}
   */
  function strategySeed() {
    const END = '2026-12-31'; // fim do ciclo Q4 2026
    const objectives = [
      { id: 'o1', title: 'Validar o modelo de negócio', description: '', owner: '', deadline: END, color: OBJECTIVE_COLORS[0], notes: '' },
      { id: 'o2', title: 'Expandir a operação local', description: '', owner: '', deadline: END, color: OBJECTIVE_COLORS[2], notes: '' },
    ];
    const kr = (id, objectiveId, title, target, unit, kpiId) => ({
      id, objectiveId, title, description: '', start: 0, current: 0, target, unit,
      owner: '', deadline: END, status: 'not_started', notes: '', kpiId,
    });
    const krs = [
      kr('kr_o1_1', 'o1', 'Capacitar 1 fotógrafo em outro estado', 1, 'fotógrafo', 'k1'),
      kr('kr_o1_2', 'o1', 'Conseguir 5 clientes em outro estado', 5, 'clientes', 'k2'),
      kr('kr_o2_1', 'o2', 'Conseguir 10 clientes na carteira em SSA', 10, 'clientes', 'k4'),
      kr('kr_o2_2', 'o2', 'Capacitar 1 fotógrafo em SSA', 1, 'fotógrafo', 'k5'),
    ];
    const kpi = (id, name, description, formula, target, unit, objectiveId, krId) => ({
      id, name, description, formula, current: 0, target, unit,
      direction: 'up', trend: 'auto', objectiveId, krId, history: [],
    });
    const kpis = [
      kpi('k1', 'Nº de fotógrafos em outro estado', 'Fotógrafos capacitados no padrão VISTA fora do estado-base.',
        'Fotógrafos com capacitação concluída em outro estado', 1, 'fotógrafo', 'o1', 'kr_o1_1'),
      kpi('k2', 'Nº de clientes em outro estado', 'Clientes conquistados fora do estado-base.',
        'Clientes com contrato fechado em outro estado', 5, 'clientes', 'o1', 'kr_o1_2'),
      kpi('k3', 'Faturamento', 'Faturamento acumulado no trimestre. Registre o total atualizado a cada mês.',
        'Soma do faturamento dos meses do ciclo', 20000, 'R$', 'o2', ''),
      kpi('k4', 'Nº de clientes na carteira em SSA', 'Clientes ativos na carteira em Salvador.',
        'Clientes ativos na carteira em SSA', 10, 'clientes', 'o2', 'kr_o2_1'),
      kpi('k5', 'Nº de fotógrafos em SSA', 'Fotógrafos capacitados no padrão VISTA em Salvador.',
        'Fotógrafos com capacitação concluída em SSA', 1, 'fotógrafo', 'o2', 'kr_o2_2'),
    ];
    return { objectives, krs, kpis, actions: officialActions() };
  }

  /**
   * Planos de ação definidos pela equipe (out/2026), por KR. Entram sem
   * responsável e sem prazo: a equipe completa pelo painel.
   * Para acrescentar planos a todos os navegadores, inclua-os aqui e
   * incremente ACTIONS_VERSION.
   */
  const OFFICIAL_ACTIONS = {
    kr_o1_1: [
      'Montar 1 roteiro de curso',
      'Gravar x aulas',
      'Preparar 1 material de apoio',
      'Montar plano de carreira',
      'Entrar em contato com 10 fotógrafos',
      'Oferecer 2 aulas',
      'Entrar em contato com 5 corretores',
      'Disponibilizar 3 residências para treino',
      'Coletar 1 feedback',
    ],
    kr_o1_2: [
      'Montar 1 apresentação comercial base',
      'Postar 10 reels',
      'Mapear 20 administradores de Airbnb',
      'Mapear 20 imobiliárias',
      'Mapear 50 corretores',
      'Entrar em contato com 20 administradores de Airbnb',
    ],
    // Objetivo 2 — KR "Conseguir 10 clientes na carteira em SSA"
    kr_o2_1: [
      'Montar 1 apresentação comercial base',
      'Montar CRM',
      'Entrar em contato com 20 administradores de Airbnb',
      'Entrar em contato com 30 imobiliárias',
      'Entrar em contato com 50 corretores',
      'Entrar em contato com 20 hotéis/pousadas',
    ],
    // Objetivo 2 — KR "Capacitar 1 fotógrafo em SSA"
    kr_o2_2: [
      'Mapear 5 fotógrafos',
      'Apresentar proposta para 5 fotógrafos',
      'Disponibilizar 3 residências para treino',
      'Coletar 5 feedbacks',
    ],
  };
  /** Versão da lista oficial de planos; ao incrementar, os novos chegam a todos os navegadores. 2 = planos do Objetivo 2. */
  const ACTIONS_VERSION = 2;

  /**
   * Planos oficiais no formato do estado. Ids estáveis ("pa_<kr>_<n>")
   * evitam duplicar planos ao aplicar a lista em dados já salvos.
   * @returns {object[]}
   */
  function officialActions() {
    const out = [];
    Object.keys(OFFICIAL_ACTIONS).forEach((krId) => {
      const objectiveId = krId.split('_')[1]; // "kr_o1_1" → "o1"
      OFFICIAL_ACTIONS[krId].forEach((title, i) => out.push({
        id: 'pa_' + krId + '_' + (i + 1), title, description: '', objectiveId, krId,
        owner: '', deadline: '', priority: 'medium', status: 'not_started', progress: 0, notes: '', checklist: [],
      }));
    });
    return out;
  }

  /**
   * Estado completo inicial: empresa, ciclo Q4 2026, responsáveis por área,
   * MVV em branco e os OKRs de {@link strategySeed}.
   * @returns {object}
   */
  function seed() {
    const people = [
      { id: 'p_dir', name: 'Direção', role: 'Sócios fundadores', color: PERSON_COLORS[0] },
      { id: 'p_com', name: 'Comercial', role: 'Vendas e parcerias', color: PERSON_COLORS[1] },
      { id: 'p_ops', name: 'Operações', role: 'Fotografia e edição', color: PERSON_COLORS[3] },
      { id: 'p_cs', name: 'Sucesso do Cliente', role: 'Atendimento e pós-venda', color: PERSON_COLORS[4] },
    ];
    return Object.assign({
      version: SCHEMA_VERSION,
      seedVersion: SEED_VERSION,
      syncMigrated: true,
      updatedAt: new Date().toISOString(),
      company: { name: 'VISTA studios', cycle: 'Q4 2026', cycleStart: '2026-10-01', cycleEnd: '2026-12-31' },
      mvv: officialMvv(),
      mvvVersion: MVV_VERSION,
      actionsVersion: ACTIONS_VERSION,
      people,
    }, strategySeed());
  }

  // ---------------------------------------------------------------------------
  // Persistência
  // ---------------------------------------------------------------------------

  /**
   * Lê um JSON do localStorage com tolerância a falhas.
   * @param {string} key
   * @returns {any|null} Objeto lido ou null se ausente/inválido/bloqueado.
   */
  function readLS(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  /**
   * Grava um JSON no localStorage. Falhas são silenciosas (o estado continua em memória).
   * @returns {boolean} true se gravou.
   */
  function writeLS(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; }
  }

  /**
   * Migração para a sincronização KPI → KR (dados salvos antes dela).
   * Cada KR sem indicador de origem recebe o primeiro indicador vinculado a
   * ele com a mesma unidade de medida (evita, p. ex., NPS em "pts" alimentar
   * um KR em "% promotores").
   * @param {object} s - Estado (alterado in place).
   */
  function migrateSync(s) {
    if (s.syncMigrated) return;
    s.krs.forEach((kr) => {
      if (kr.kpiId !== undefined) return;
      const k = s.kpis.find((x) => x.krId === kr.id && x.unit === kr.unit);
      kr.kpiId = k ? k.id : '';
    });
    s.syncMigrated = true;
  }

  /**
   * Ajusta o status do KR depois que o valor atual mudou:
   * meta atingida → concluído; deixou de atingir → em andamento;
   * saiu do valor inicial → em andamento. "Em risco" só muda se a meta for atingida.
   * @param {object} kr - KR (alterado in place).
   */
  function autoStatus(kr) {
    const p = krProgress(Object.assign({}, kr, { status: '' }));
    if (p >= 1) kr.status = 'done';
    else if (kr.status === 'done') kr.status = 'in_progress';
    else if (kr.status === 'not_started' && num(kr.current) !== num(kr.start)) kr.status = 'in_progress';
  }

  /**
   * Propaga valores derivados: o valor atual de todo KR com indicador de
   * origem passa a ser o valor atual desse indicador. Roda a cada commit,
   * então qualquer alteração no indicador reflete na estratégia na hora.
   * @param {object} s - Estado (alterado in place).
   */
  function syncDerived(s) {
    s.krs.forEach((kr) => {
      if (!kr.kpiId) return;
      const k = s.kpis.find((x) => x.id === kr.kpiId);
      if (!k) { kr.kpiId = ''; return; }
      // o indicador de origem fica sempre vinculado ao seu KR e objetivo
      k.krId = kr.id;
      k.objectiveId = kr.objectiveId;
      if (num(kr.current) !== num(k.current)) { kr.current = num(k.current); autoStatus(kr); }
    });
  }

  /**
   * Garante que um estado importado/persistido tenha todas as coleções esperadas.
   * Protege contra arquivos JSON antigos ou editados à mão.
   * @param {object} s - Estado candidato.
   * @returns {object|null} Estado normalizado ou null se não for reconhecível.
   */
  function normalize(s) {
    if (!s || typeof s !== 'object' || !Array.isArray(s.objectives)) return null;
    const base = seed();
    s.version = SCHEMA_VERSION;
    s.company = Object.assign({}, base.company, s.company || {});
    s.mvv = Object.assign({ mission: '', vision: '', values: [] }, s.mvv || {});
    ['people', 'krs', 'kpis', 'actions'].forEach((k) => { if (!Array.isArray(s[k])) s[k] = []; });
    s.actions.forEach((a) => { if (!Array.isArray(a.checklist)) a.checklist = []; });
    s.kpis.forEach((k) => { if (!Array.isArray(k.history)) k.history = []; });
    migrateSync(s);
    syncDerived(s);
    return s;
  }

  /**
   * Troca os OKRs de dados salvos com uma versão anterior dos OKRs iniciais
   * pelos atuais (uma única vez por navegador). Mantém empresa, ciclo, MVV
   * e responsáveis, e guarda o estado anterior em BACKUP_KEY por segurança.
   * NOTA: roda só no carregamento; backups importados não passam por aqui.
   * @param {object|null} s - Estado normalizado lido do navegador.
   * @returns {{state: object|null, upgraded: boolean}}
   */
  function upgradeStrategy(s) {
    if (!s || s.seedVersion >= SEED_VERSION) return { state: s, upgraded: false };
    writeLS(BACKUP_KEY, s);
    Object.assign(s, strategySeed(), { seedVersion: SEED_VERSION, syncMigrated: true });
    return { state: s, upgraded: true };
  }

  const boot = upgradeStrategy(normalize(readLS(STORAGE_KEY)));
  // aplica o MVV oficial uma vez por versão do texto
  if (boot.state && !(boot.state.mvvVersion >= MVV_VERSION)) {
    boot.state.mvv = officialMvv();
    boot.state.mvvVersion = MVV_VERSION;
  }
  // acrescenta os planos oficiais uma vez por versão, sem mexer nos existentes
  if (boot.state && !(boot.state.actionsVersion >= ACTIONS_VERSION)) {
    const have = new Set(boot.state.actions.map((a) => a.id));
    const krs = new Set(boot.state.krs.map((k) => k.id));
    officialActions().forEach((a) => {
      if (have.has(a.id)) return;
      // KR apagado neste navegador: o plano entra sem vínculo em vez de órfão
      if (!krs.has(a.krId)) { a.krId = ''; a.objectiveId = ''; }
      boot.state.actions.push(a);
    });
    boot.state.actionsVersion = ACTIONS_VERSION;
  }
  let state = boot.state || seed();
  let persisted = writeLS(STORAGE_KEY, state);

  const ui = Object.assign({
    theme: 'system',            // 'system' | 'light' | 'dark'
    collapsed: {},              // { [objectiveId]: true } objetivos recolhidos
    actionView: 'table',        // 'table' | 'board'
    actionFilters: { objectiveId: '', krId: '', status: '' },
  }, readLS(UI_KEY) || {});
  // filtros removidos da interface (responsável, busca) não podem ficar presos
  ui.actionFilters = { objectiveId: ui.actionFilters.objectiveId || '', krId: ui.actionFilters.krId || '', status: ui.actionFilters.status || '' };
  if (boot.upgraded) {
    // filtros e grupos recolhidos apontavam para os OKRs anteriores
    ui.collapsed = {};
    ui.actionFilters = { objectiveId: '', krId: '', status: '' };
    writeLS(UI_KEY, ui);
  }

  const listeners = new Set();

  /** Registra um ouvinte chamado após toda alteração de estado. */
  function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
  function emit() { listeners.forEach((fn) => fn(state)); }

  /**
   * Aplica uma mutação no estado, persiste e notifica a interface.
   * Toda escrita deve passar por aqui para manter persistência consistente.
   * @param {(s: object) => void} mutator - Função que altera `s` in place.
   * @param {{silent?: boolean}} [opts] - `silent` persiste sem re-renderizar
   *   (usado em campos de texto livre para não perder o cursor enquanto digita).
   * @example Store.commit(s => { s.mvv.mission = 'Nova missão'; });
   */
  function commit(mutator, opts) {
    mutator(state);
    syncDerived(state);
    state.updatedAt = new Date().toISOString();
    persisted = writeLS(STORAGE_KEY, state);
    if (!(opts && opts.silent)) emit();
  }

  /** Persiste preferências de interface (não dispara re-render). */
  function saveUI() { writeLS(UI_KEY, ui); }

  /** Snapshot completo para o "Desfazer". */
  function snapshot() { return clone(state); }
  /** Restaura um snapshot criado por {@link snapshot}. */
  function restore(snap) { commit((s) => { Object.keys(s).forEach((k) => delete s[k]); Object.assign(s, clone(snap)); }); }

  /** Substitui o estado inteiro (importação / reset). */
  function replace(next) {
    const n = normalize(clone(next));
    if (!n) throw new Error('Arquivo não reconhecido: faltam os objetivos estratégicos.');
    n.seedVersion = SEED_VERSION; // não substituir os OKRs importados ao recarregar
    restore(n);
  }

  // ---------------------------------------------------------------------------
  // CRUD
  // ---------------------------------------------------------------------------

  /** Prefixos de id por coleção. */
  const PREFIX = { objectives: 'o', krs: 'kr', kpis: 'k', actions: 'a', people: 'p' };

  /**
   * Cria ou atualiza um item em uma coleção.
   * @param {'objectives'|'krs'|'kpis'|'actions'|'people'} collection
   * @param {object} item - Se possuir `id` existente, é mesclado; senão é criado.
   * @returns {string} id do item salvo.
   */
  function upsert(collection, item) {
    let id = item.id;
    commit((s) => {
      const list = s[collection];
      const idx = id ? list.findIndex((x) => x.id === id) : -1;
      if (idx >= 0) {
        list[idx] = Object.assign({}, list[idx], item);
      } else {
        id = uid(PREFIX[collection] || 'x');
        list.push(Object.assign({}, item, { id }));
      }
    });
    return id;
  }

  /**
   * Exclui um item. Para não perder trabalho, itens dependentes são
   * desvinculados em vez de apagados — exceto KRs, que pertencem ao objetivo.
   * @param {string} collection
   * @param {string} id
   */
  function remove(collection, id) {
    commit((s) => {
      s[collection] = s[collection].filter((x) => x.id !== id);
      if (collection === 'objectives') {
        const krIds = s.krs.filter((k) => k.objectiveId === id).map((k) => k.id);
        s.krs = s.krs.filter((k) => k.objectiveId !== id);
        [...s.actions, ...s.kpis].forEach((x) => {
          if (x.objectiveId === id) x.objectiveId = '';
          if (krIds.includes(x.krId)) x.krId = '';
        });
      }
      if (collection === 'krs') {
        [...s.actions, ...s.kpis].forEach((x) => { if (x.krId === id) x.krId = ''; });
      }
      if (collection === 'people') {
        [...s.objectives, ...s.krs, ...s.actions].forEach((x) => { if (x.owner === id) x.owner = ''; });
      }
    });
  }

  /**
   * Move um item para antes/depois de outro na mesma coleção (drag & drop).
   * @param {string} collection
   * @param {string} id - Item arrastado.
   * @param {string} targetId - Item de referência.
   * @param {boolean} after - true para inserir depois do alvo.
   */
  function reorder(collection, id, targetId, after) {
    if (id === targetId) return;
    commit((s) => {
      const list = s[collection];
      const from = list.findIndex((x) => x.id === id);
      if (from < 0) return;
      const [item] = list.splice(from, 1);
      let to = list.findIndex((x) => x.id === targetId);
      if (to < 0) { list.push(item); return; }
      if (after) to += 1;
      list.splice(to, 0, item);
    });
  }

  /**
   * Define o valor atual de um KR. Se o KR tiver indicador de origem, o
   * valor é gravado no indicador (com nova medição no histórico) e o KR é
   * atualizado pela sincronização; senão, grava direto no KR.
   * @param {string} krId
   * @param {number} value
   */
  function setKrValue(krId, value) {
    commit((s) => {
      const kr = s.krs.find((x) => x.id === krId);
      if (!kr) return;
      const k = kr.kpiId && s.kpis.find((x) => x.id === kr.kpiId);
      if (k) {
        k.current = value;
        k.history = (k.history || []).concat([value]).slice(-24); // 24 últimas medições
      } else {
        kr.current = value;
        autoStatus(kr);
      }
    });
  }

  /** Indicador de origem de um KR (ou null). */
  const sourceKpi = (kr) => (kr && kr.kpiId ? state.kpis.find((k) => k.id === kr.kpiId) || null : null);
  /** KR que um indicador alimenta automaticamente (ou null). */
  const krFedBy = (kpiId) => state.krs.find((k) => k.kpiId === kpiId) || null;

  // ---------------------------------------------------------------------------
  // Seletores e cálculos
  // ---------------------------------------------------------------------------

  const byId = (collection, id) => state[collection].find((x) => x.id === id) || null;

  /** Data local de hoje em "YYYY-MM-DD" (sem efeito de fuso). */
  function todayISO() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  /** Converte "YYYY-MM-DD" em Date local à meia-noite. */
  function parseDate(iso) {
    if (!iso) return null;
    const [y, m, d] = iso.split('-').map(Number);
    return y ? new Date(y, (m || 1) - 1, d || 1) : null;
  }
  /**
   * Dias corridos de hoje até a data (negativo = já passou).
   * @param {string} iso
   * @returns {number|null}
   */
  function daysUntil(iso) {
    const d = parseDate(iso);
    if (!d) return null;
    return Math.round((d - parseDate(todayISO())) / 86400000);
  }

  /**
   * Progresso de um KR (0–1), linear entre valor inicial e meta.
   * Funciona também para metas decrescentes (ex.: reduzir prazo de entrega),
   * pois a razão usa a distância assinada entre início e meta.
   * KR marcado como concluído conta 100%.
   */
  function krProgress(kr) {
    if (kr.status === 'done') return 1;
    const start = num(kr.start), target = num(kr.target), cur = num(kr.current);
    if (target === start) return cur >= target ? 1 : 0;
    return clamp01((cur - start) / (target - start));
  }

  /** KRs de um objetivo, na ordem da lista. */
  const krsOf = (objectiveId) => state.krs.filter((k) => k.objectiveId === objectiveId);

  /** Progresso do objetivo = média simples dos KRs (cada KR com mesmo peso). */
  function objectiveProgress(o) {
    const list = krsOf(o.id);
    if (!list.length) return 0;
    return list.reduce((a, k) => a + krProgress(k), 0) / list.length;
  }

  /**
   * Status derivado do objetivo a partir dos KRs:
   * todos concluídos → concluído; algum em risco → em risco;
   * algum com avanço → em andamento; senão não iniciado.
   */
  function objectiveStatus(o) {
    const list = krsOf(o.id);
    if (!list.length) return 'not_started';
    if (list.every((k) => k.status === 'done')) return 'done';
    if (list.some((k) => k.status === 'at_risk')) return 'at_risk';
    if (list.some((k) => k.status === 'in_progress' || krProgress(k) > 0)) return 'in_progress';
    return 'not_started';
  }

  /** Progresso geral = média dos objetivos. */
  function overallProgress() {
    if (!state.objectives.length) return 0;
    return state.objectives.reduce((a, o) => a + objectiveProgress(o), 0) / state.objectives.length;
  }

  /** Fração do ciclo (trimestre) já decorrida, 0–1. Base do "ritmo esperado". */
  function cycleElapsed() {
    const s = parseDate(state.company.cycleStart), e = parseDate(state.company.cycleEnd);
    if (!s || !e || e <= s) return 0;
    return clamp01((parseDate(todayISO()) - s) / (e - s));
  }

  /** Dias restantes até o fim do ciclo (mínimo 0). */
  function cycleDaysLeft() { return Math.max(0, daysUntil(state.company.cycleEnd) || 0); }

  /**
   * Saúde geral da execução: compara progresso real com o ritmo esperado
   * pelo tempo decorrido do ciclo. Nas 2 primeiras semanas o ritmo esperado
   * é baixo demais para ser informativo, então usamos um piso de 15%.
   * @returns {{key:string,label:string,desc:string}}
   */
  function health() {
    const expected = Math.max(cycleElapsed(), 0.15);
    const ratio = overallProgress() / expected;
    const risks = state.krs.filter((k) => k.status === 'at_risk').length;
    if (ratio >= 0.9 && risks === 0) return { key: 'good', label: 'No ritmo', desc: 'Progresso compatível com o tempo decorrido do ciclo.' };
    if (ratio >= 0.6) return { key: 'warn', label: 'Atenção', desc: risks ? (risks === 1 ? '1 KR em risco exige acompanhamento.' : risks + ' KRs em risco exigem acompanhamento.') : 'Progresso um pouco abaixo do ritmo esperado.' };
    return { key: 'risk', label: 'Fora do ritmo', desc: 'Progresso abaixo do esperado para este ponto do ciclo.' };
  }

  /** Plano está atrasado se o prazo passou e não foi concluído. */
  const isOverdue = (item) => item.deadline && item.status !== 'done' && daysUntil(item.deadline) < 0;

  /**
   * Progresso efetivo de um plano: se houver checklist, ele manda
   * (itens concluídos / total); senão vale o percentual informado.
   */
  function actionProgress(a) {
    if (a.status === 'done') return 1;
    if (a.checklist && a.checklist.length) return a.checklist.filter((c) => c.done).length / a.checklist.length;
    return clamp01(num(a.progress) / 100);
  }

  /** Atingimento do indicador em relação à meta (0–1), respeitando a direção. */
  function kpiAttainment(k) {
    const cur = num(k.current), target = num(k.target);
    if (k.direction === 'down') return cur <= target ? 1 : clamp01(target / (cur || 1));
    return target ? clamp01(cur / target) : 0;
  }

  /**
   * Lista de alertas para o dashboard: planos atrasados, itens sem
   * responsável e KRs em risco. Ordenados por gravidade.
   * @returns {Array<{type:'risk'|'warn', kind:string, id:string, title:string, detail:string}>}
   */
  function alerts() {
    const out = [];
    state.actions.filter(isOverdue).forEach((a) => out.push({
      type: 'risk', kind: 'actions', id: a.id, icon: 'clock',
      title: a.title, detail: 'Atrasado há ' + Math.abs(daysUntil(a.deadline)) + ' dia(s)',
    }));
    state.krs.filter((k) => k.status === 'at_risk').forEach((k) => out.push({
      type: 'risk', kind: 'krs', id: k.id, icon: 'alert',
      title: k.title, detail: 'KR marcado como em risco',
    }));
    state.krs.filter((k) => !k.owner).forEach((k) => out.push({
      type: 'warn', kind: 'krs', id: k.id, icon: 'userx', title: k.title, detail: 'KR sem responsável',
    }));
    state.actions.filter((a) => !a.owner && a.status !== 'done').forEach((a) => out.push({
      type: 'warn', kind: 'actions', id: a.id, icon: 'userx', title: a.title, detail: 'Plano de ação sem responsável',
    }));
    state.actions.filter((a) => !a.deadline && a.status !== 'done').forEach((a) => out.push({
      type: 'warn', kind: 'actions', id: a.id, icon: 'calendar', title: a.title, detail: 'Plano de ação sem prazo',
    }));
    return out;
  }

  /**
   * Próximas entregas (planos e KRs não concluídos com prazo), incluindo
   * atrasados no topo.
   * @param {number} limit
   */
  function upcoming(limit) {
    const items = [
      ...state.actions.filter((a) => a.deadline && a.status !== 'done').map((a) => ({ kind: 'actions', item: a })),
      ...state.krs.filter((k) => k.deadline && k.status !== 'done').map((k) => ({ kind: 'krs', item: k })),
    ];
    items.sort((x, y) => (x.item.deadline < y.item.deadline ? -1 : x.item.deadline > y.item.deadline ? 1 : 0));
    return items.slice(0, limit || 6);
  }

  /** Código curto de um KR, ex.: "O1·KR2" — usado como referência visual. */
  function krCode(kr) {
    if (!kr) return '';
    const oi = state.objectives.findIndex((o) => o.id === kr.objectiveId);
    const ki = krsOf(kr.objectiveId).findIndex((k) => k.id === kr.id);
    return (oi >= 0 ? 'O' + (oi + 1) : 'O?') + '·KR' + (ki + 1);
  }
  /** Índice 1-based do objetivo na lista. */
  const objectiveIndex = (id) => state.objectives.findIndex((o) => o.id === id) + 1;

  window.Store = {
    STATUS, PRIORITY, OBJECTIVE_COLORS, PERSON_COLORS,
    get state() { return state; },
    get persisted() { return persisted; },
    ui, saveUI,
    subscribe, commit, snapshot, restore, replace, seed, uid,
    upsert, remove, reorder, byId, setKrValue, sourceKpi, krFedBy,
    todayISO, parseDate, daysUntil,
    krProgress, krsOf, objectiveProgress, objectiveStatus, overallProgress,
    cycleElapsed, cycleDaysLeft, health, isOverdue, actionProgress,
    kpiAttainment, alerts, upcoming, krCode, objectiveIndex, num,
  };
})();
