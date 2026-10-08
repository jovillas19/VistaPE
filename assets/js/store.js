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

  /**
   * Indicador "Avaliações promotoras (9–10)": é a métrica exata do KR de
   * satisfação, por isso é a origem do valor desse KR. Fábrica separada
   * para ser reutilizada na migração de dados salvos antes da sincronização.
   * @param {number} [current=67] - Valor atual (% de respostas 9 ou 10).
   */
  function PROMOTERS_KPI(current) {
    return {
      id: 'k6', name: 'Avaliações promotoras (9–10)', description: 'Parcela das respostas da pesquisa pós-entrega com nota 9 ou 10.',
      formula: '(respostas com nota 9 ou 10 ÷ total de respostas) × 100', current: current == null ? 67 : current, target: 80, unit: '% promotores',
      direction: 'up', trend: 'auto', objectiveId: 'o1', krId: 'kr_o1_2', history: current == null ? [50, 55, 60, 62, 65, 67] : [current],
    };
  }

  // ---------------------------------------------------------------------------
  // Dados iniciais
  // ---------------------------------------------------------------------------

  /**
   * Monta o conjunto de dados de exemplo do ciclo Q4 2026.
   * Os OKRs vêm do planejamento real da VISTA; valores atuais, histórico,
   * responsáveis (por área) e planos de ação são exemplos plausíveis para
   * o protótipo parecer em uso — todos editáveis.
   * @returns {object} Estado completo inicial.
   */
  function seed() {
    const people = [
      { id: 'p_dir', name: 'Direção', role: 'Sócios fundadores', color: PERSON_COLORS[0] },
      { id: 'p_com', name: 'Comercial', role: 'Vendas e parcerias', color: PERSON_COLORS[1] },
      { id: 'p_ops', name: 'Operações', role: 'Fotografia e edição', color: PERSON_COLORS[3] },
      { id: 'p_cs', name: 'Sucesso do Cliente', role: 'Atendimento e pós-venda', color: PERSON_COLORS[4] },
    ];

    const objectives = [
      {
        id: 'o1', title: 'Validar a viabilidade do modelo de negócio',
        description: 'Comprovar que o negócio é capaz de gerar valor ao cliente com recorrência e satisfação.',
        owner: 'p_dir', deadline: '2026-12-31', color: OBJECTIVE_COLORS[0], notes: '',
      },
      {
        id: 'o2', title: 'Validar a capacidade de expansão geográfica',
        description: 'Demonstrar que o modelo operacional e comercial pode ser replicado em outros mercados.',
        owner: 'p_dir', deadline: '2026-12-31', color: OBJECTIVE_COLORS[2], notes: '',
      },
    ];

    const krs = [
      {
        id: 'kr_o1_1', objectiveId: 'o1', title: 'Conquistar 5 clientes recorrentes',
        description: 'Cliente recorrente = imobiliária ou corretor com 2+ ensaios contratados no trimestre ou plano mensal ativo.',
        start: 0, current: 2, target: 5, unit: 'clientes', owner: 'p_com', deadline: '2026-12-15', status: 'in_progress', notes: '', kpiId: 'k1',
      },
      {
        id: 'kr_o1_2', objectiveId: 'o1', title: 'Validar a satisfação dos clientes por meio de NPS e CSAT, buscando avaliações promotoras de 9 ou 10',
        description: 'Medido pela parcela de respostas com nota 9 ou 10 na pesquisa pós-entrega (NPS) e pela satisfação por ensaio (CSAT).',
        start: 0, current: 67, target: 80, unit: '% promotores', owner: 'p_cs', deadline: '2026-12-15', status: 'in_progress', notes: 'Meta inicial de 80% de promotores. Ajustar após 20 respostas.', kpiId: 'k6',
      },
      {
        id: 'kr_o2_1', objectiveId: 'o2', title: 'Capacitar 2 fotógrafos em outro estado',
        description: 'Capacitado = concluiu o treinamento VISTA e entregou um ensaio-piloto aprovado no padrão de qualidade.',
        start: 0, current: 1, target: 2, unit: 'fotógrafos', owner: 'p_ops', deadline: '2026-11-30', status: 'in_progress', notes: '', kpiId: 'k4',
      },
      {
        id: 'kr_o2_2', objectiveId: 'o2', title: 'Fechar 5 contratos em outro estado',
        description: 'Contratos assinados com clientes sediados fora do estado de origem.',
        start: 0, current: 1, target: 5, unit: 'contratos', owner: 'p_com', deadline: '2026-12-20', status: 'at_risk', notes: 'Depende da capacitação dos fotógrafos locais para ganhar tração.', kpiId: 'k5',
      },
    ];

    const kpis = [
      {
        id: 'k1', name: 'Clientes recorrentes', description: 'Clientes ativos com recorrência comprovada no trimestre.',
        formula: 'Nº de clientes com ≥ 2 ensaios no trimestre ou plano mensal ativo', current: 2, target: 5, unit: 'clientes',
        direction: 'up', trend: 'auto', objectiveId: 'o1', krId: 'kr_o1_1', history: [0, 0, 1, 1, 2, 2],
      },
      PROMOTERS_KPI(),
      {
        id: 'k2', name: 'NPS', description: 'Net Promoter Score da pesquisa pós-entrega.',
        formula: '% promotores (9–10) − % detratores (0–6)', current: 58, target: 70, unit: 'pts',
        direction: 'up', trend: 'auto', objectiveId: 'o1', krId: 'kr_o1_2', history: [40, 45, 50, 52, 55, 58],
      },
      {
        id: 'k3', name: 'CSAT', description: 'Satisfação média por ensaio entregue.',
        formula: '(respostas 4 ou 5 ÷ total de respostas) × 100', current: 88, target: 90, unit: '%',
        direction: 'up', trend: 'auto', objectiveId: 'o1', krId: 'kr_o1_2', history: [86, 89, 87, 88, 88, 88],
      },
      {
        id: 'k4', name: 'Fotógrafos capacitados em outro estado', description: 'Profissionais aprovados no padrão VISTA fora da base.',
        formula: 'Nº de fotógrafos com treinamento concluído + piloto aprovado', current: 1, target: 2, unit: 'fotógrafos',
        direction: 'up', trend: 'auto', objectiveId: 'o2', krId: 'kr_o2_1', history: [0, 0, 0, 1, 1, 1],
      },
      {
        id: 'k5', name: 'Contratos fechados em outro estado', description: 'Contratos assinados no novo mercado.',
        formula: 'Nº de contratos assinados com clientes de fora do estado-base', current: 1, target: 5, unit: 'contratos',
        direction: 'up', trend: 'auto', objectiveId: 'o2', krId: 'kr_o2_2', history: [0, 0, 0, 0, 1, 1],
      },
    ];

    const ck = (text, done) => ({ id: uid('ck'), text, done: !!done });
    const actions = [
      {
        id: 'a1', title: 'Estruturar plano de assinatura mensal para imobiliárias',
        description: 'Pacote com cota de ensaios/mês, prazo de entrega garantido e preço por volume.',
        objectiveId: 'o1', krId: 'kr_o1_1', owner: 'p_com', deadline: '2026-10-20', priority: 'high', status: 'in_progress', progress: 50,
        notes: 'Validar preço com 3 clientes atuais antes de publicar.',
        checklist: [ck('Levantar custos por ensaio', true), ck('Definir 3 faixas de plano', true), ck('Validar com clientes atuais'), ck('Montar proposta comercial')],
      },
      {
        id: 'a2', title: 'Prospectar 20 imobiliárias e corretores na região',
        description: 'Lista priorizada por volume de anúncios ativos; abordagem com portfólio + ensaio-teste.',
        objectiveId: 'o1', krId: 'kr_o1_1', owner: 'p_com', deadline: '2026-10-31', priority: 'high', status: 'in_progress', progress: 35,
        notes: '', checklist: [],
      },
      {
        id: 'a3', title: 'Implantar pesquisa NPS + CSAT pós-entrega',
        description: 'Formulário curto enviado 24h após a entrega das fotos, com lembrete em 72h.',
        objectiveId: 'o1', krId: 'kr_o1_2', owner: 'p_cs', deadline: '2026-10-03', priority: 'high', status: 'in_progress', progress: 75,
        notes: 'Falta automatizar o lembrete.',
        checklist: [ck('Escrever perguntas', true), ck('Criar formulário', true), ck('Disparo automático após entrega', true), ck('Lembrete em 72h')],
      },
      {
        id: 'a4', title: 'Rotina de retorno a clientes detratores',
        description: 'Contato em até 48h com quem der nota ≤ 6, registro da causa e plano de correção.',
        objectiveId: 'o1', krId: 'kr_o1_2', owner: '', deadline: '2026-11-15', priority: 'medium', status: 'not_started', progress: 0,
        notes: '', checklist: [],
      },
      {
        id: 'a5', title: 'Mapear mercado e escolher o estado-alvo',
        description: 'Comparar volume imobiliário, concorrência e custo de operação em 3 estados candidatos.',
        objectiveId: 'o2', krId: 'kr_o2_2', owner: 'p_dir', deadline: '2026-10-05', priority: 'high', status: 'done', progress: 100,
        notes: 'Estado-alvo definido.', checklist: [],
      },
      {
        id: 'a6', title: 'Criar manual do padrão VISTA (captura + edição)',
        description: 'Guia de enquadramento, luz, checklist de cômodos e preset de edição.',
        objectiveId: 'o2', krId: 'kr_o2_1', owner: 'p_ops', deadline: '2026-10-15', priority: 'high', status: 'in_progress', progress: 70,
        notes: '',
        checklist: [ck('Guia de enquadramento por cômodo', true), ck('Preset de edição', true), ck('Checklist de entrega'), ck('Vídeo-aula de 15 min')],
      },
      {
        id: 'a7', title: 'Recrutar fotógrafos parceiros no estado-alvo',
        description: 'Triagem de portfólio e entrevista com 6 candidatos.',
        objectiveId: 'o2', krId: 'kr_o2_1', owner: 'p_ops', deadline: '2026-10-25', priority: 'high', status: 'in_progress', progress: 50,
        notes: '', checklist: [],
      },
      {
        id: 'a8', title: 'Treinamento remoto e ensaio-piloto',
        description: 'Duas sessões de treinamento e um ensaio real revisado pela equipe de Operações.',
        objectiveId: 'o2', krId: 'kr_o2_1', owner: 'p_ops', deadline: '2026-11-20', priority: 'medium', status: 'not_started', progress: 0,
        notes: '', checklist: [],
      },
      {
        id: 'a9', title: 'Campanha comercial no novo estado',
        description: 'Anúncios segmentados para corretores + visitas presenciais às 10 maiores imobiliárias.',
        objectiveId: 'o2', krId: 'kr_o2_2', owner: 'p_com', deadline: '2026-11-30', priority: 'medium', status: 'not_started', progress: 0,
        notes: '', checklist: [],
      },
      {
        id: 'a10', title: 'Fechar parceria com 2 imobiliárias âncora',
        description: 'Condição de lançamento em troca de volume mínimo e depoimento.',
        objectiveId: 'o2', krId: 'kr_o2_2', owner: '', deadline: '2026-12-10', priority: 'high', status: 'not_started', progress: 0,
        notes: '', checklist: [],
      },
    ];

    return {
      version: SCHEMA_VERSION,
      updatedAt: new Date().toISOString(),
      company: { name: 'VISTA studios', cycle: 'Q4 2026', cycleStart: '2026-10-01', cycleEnd: '2026-12-31' },
      mvv: {
        mission: '',
        vision: '',
        values: [],
      },
      people, objectives, krs, kpis, actions,
    };
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
   * um KR em "% promotores"). O KR de satisfação do exemplo ganha o indicador
   * de promotores, criado a partir do valor atual do próprio KR.
   * @param {object} s - Estado (alterado in place).
   */
  function migrateSync(s) {
    if (s.syncMigrated) return;
    s.krs.forEach((kr) => {
      if (kr.kpiId !== undefined) return;
      const k = s.kpis.find((x) => x.krId === kr.id && x.unit === kr.unit);
      if (k) { kr.kpiId = k.id; return; }
      if (kr.id === 'kr_o1_2' && !s.kpis.some((x) => x.id === 'k6')) {
        s.kpis.splice(1, 0, PROMOTERS_KPI(num(kr.current)));
        kr.kpiId = 'k6';
        return;
      }
      kr.kpiId = '';
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

  let state = normalize(readLS(STORAGE_KEY)) || seed();
  let persisted = writeLS(STORAGE_KEY, state);

  const ui = Object.assign({
    theme: 'system',            // 'system' | 'light' | 'dark'
    collapsed: {},              // { [objectiveId]: true } objetivos recolhidos
    actionView: 'table',        // 'table' | 'board'
    actionFilters: { objectiveId: '', krId: '', owner: '', status: '', q: '' },
    kpiView: 'cards',           // 'cards' | 'table'
    kpiFilters: { objectiveId: '', krId: '' }, // filtros da tela de indicadores
  }, readLS(UI_KEY) || {});

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

  /**
   * Tendência de um indicador. Se configurada manualmente, respeita;
   * se "auto", compara as duas últimas medições do histórico.
   * @returns {'up'|'down'|'flat'}
   */
  function kpiTrend(k) {
    if (k.trend && k.trend !== 'auto') return k.trend;
    const h = (k.history || []).map(num);
    if (h.length < 2) return 'flat';
    const a = h[h.length - 2], b = h[h.length - 1];
    if (b > a) return 'up';
    if (b < a) return 'down';
    return 'flat';
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
    kpiTrend, kpiAttainment, alerts, upcoming, krCode, objectiveIndex, num,
  };
})();
