/**
 * @file snapshot.js
 * @description Versão de referência da estratégia (objetivos, KRs,
 * indicadores e planos de ação), exportada do navegador da equipe em
 * 10/10/2026. O Store aplica este conteúdo uma vez em cada navegador
 * (ver SNAPSHOT_VERSION em store.js) para todos verem a mesma base
 * enquanto não há banco de dados compartilhado.
 *
 * NOTA: arquivo gerado a partir de backups/edge-2026-10-10.json.
 */
window.VISTA_SNAPSHOT = {
  "objectives": [
    {
      "id": "o1",
      "title": "Validar o modelo de negócio",
      "description": "",
      "owner": "",
      "deadline": "2026-12-31",
      "color": "#0c4f5b",
      "notes": ""
    },
    {
      "id": "o2",
      "title": "Expandir a operação local",
      "description": "",
      "owner": "",
      "deadline": "2026-12-31",
      "color": "#35bfae",
      "notes": ""
    }
  ],
  "krs": [
    {
      "id": "kr_o1_1",
      "objectiveId": "o1",
      "title": "Capacitar 1 fotógrafo em outro estado",
      "description": "",
      "start": 0,
      "current": 0,
      "target": 1,
      "unit": "fotógrafo",
      "owner": "",
      "deadline": "2026-12-31",
      "status": "in_progress",
      "notes": "",
      "kpiId": "k1"
    },
    {
      "id": "kr_o1_2",
      "objectiveId": "o1",
      "title": "Conseguir 5 clientes em outro estado",
      "description": "",
      "start": 0,
      "current": 0,
      "target": 5,
      "unit": "clientes",
      "owner": "",
      "deadline": "2026-12-31",
      "status": "not_started",
      "notes": "",
      "kpiId": "k2"
    },
    {
      "id": "kr_o2_1",
      "objectiveId": "o2",
      "title": "Conseguir 10 clientes na carteira em SSA",
      "description": "",
      "start": 0,
      "current": 0,
      "target": 10,
      "unit": "clientes",
      "owner": "",
      "deadline": "2026-12-31",
      "status": "not_started",
      "notes": "",
      "kpiId": "k4"
    },
    {
      "id": "kr_o2_2",
      "objectiveId": "o2",
      "title": "Capacitar 1 fotógrafo em SSA",
      "description": "",
      "start": 0,
      "current": 0,
      "target": 1,
      "unit": "fotógrafo",
      "owner": "",
      "deadline": "2026-12-31",
      "status": "not_started",
      "notes": "",
      "kpiId": "k5"
    }
  ],
  "kpis": [
    {
      "id": "k1",
      "name": "Nº de fotógrafos em outro estado",
      "description": "Fotógrafos capacitados no padrão VISTA fora do estado-base.",
      "formula": "Fotógrafos com capacitação concluída em outro estado",
      "current": 0,
      "target": 1,
      "unit": "fotógrafo",
      "direction": "up",
      "trend": "auto",
      "objectiveId": "o1",
      "krId": "kr_o1_1",
      "history": [
        1,
        0,
        10,
        0
      ]
    },
    {
      "id": "k2",
      "name": "Nº de clientes em outro estado",
      "description": "Clientes conquistados fora do estado-base.",
      "formula": "Clientes com contrato fechado em outro estado",
      "current": 0,
      "target": 5,
      "unit": "clientes",
      "direction": "up",
      "trend": "auto",
      "objectiveId": "o1",
      "krId": "kr_o1_2",
      "history": []
    },
    {
      "id": "k3",
      "name": "Faturamento",
      "description": "Faturamento acumulado no trimestre. Registre o total atualizado a cada mês.",
      "formula": "Soma do faturamento dos meses do ciclo",
      "current": 0,
      "target": 20000,
      "unit": "R$",
      "direction": "up",
      "trend": "auto",
      "objectiveId": "o2",
      "krId": "",
      "history": []
    },
    {
      "id": "k4",
      "name": "Nº de clientes na carteira em SSA",
      "description": "Clientes ativos na carteira em Salvador.",
      "formula": "Clientes ativos na carteira em SSA",
      "current": 0,
      "target": 10,
      "unit": "clientes",
      "direction": "up",
      "trend": "auto",
      "objectiveId": "o2",
      "krId": "kr_o2_1",
      "history": []
    },
    {
      "id": "k5",
      "name": "Nº de fotógrafos em SSA",
      "description": "Fotógrafos capacitados no padrão VISTA em Salvador.",
      "formula": "Fotógrafos com capacitação concluída em SSA",
      "current": 0,
      "target": 1,
      "unit": "fotógrafo",
      "direction": "up",
      "trend": "auto",
      "objectiveId": "o2",
      "krId": "kr_o2_2",
      "history": []
    }
  ],
  "actions": [
    {
      "id": "pa_kr_o1_1_1",
      "title": "Montar 1 roteiro de curso",
      "description": "",
      "objectiveId": "o1",
      "krId": "kr_o1_1",
      "deadline": "",
      "priority": "medium",
      "status": "not_started",
      "progress": 0,
      "notes": "",
      "checklist": [],
      "owners": [
        "r_ger_capacitacao"
      ]
    },
    {
      "id": "pa_kr_o1_1_2",
      "title": "Gravar x aulas",
      "description": "",
      "objectiveId": "o1",
      "krId": "kr_o1_1",
      "deadline": "",
      "priority": "medium",
      "status": "not_started",
      "progress": 0,
      "notes": "",
      "checklist": [],
      "owners": [
        "r_ger_capacitacao",
        "r_ger_conteudo",
        "r_ger_operacoes"
      ]
    },
    {
      "id": "pa_kr_o1_1_3",
      "title": "Preparar 1 material de apoio",
      "description": "",
      "objectiveId": "o1",
      "krId": "kr_o1_1",
      "deadline": "",
      "priority": "medium",
      "status": "not_started",
      "progress": 0,
      "notes": "",
      "checklist": [],
      "owners": [
        "r_ger_capacitacao"
      ]
    },
    {
      "id": "pa_kr_o1_1_4",
      "title": "Montar plano de carreira",
      "description": "",
      "objectiveId": "o1",
      "krId": "kr_o1_1",
      "deadline": "",
      "priority": "medium",
      "status": "not_started",
      "progress": 0,
      "notes": "",
      "checklist": [],
      "owners": [
        "r_ceo",
        "r_coo",
        "r_ger_financeiro"
      ]
    },
    {
      "id": "pa_kr_o1_1_5",
      "title": "Entrar em contato com 10 fotógrafos",
      "description": "",
      "objectiveId": "o1",
      "krId": "kr_o1_1",
      "deadline": "",
      "priority": "medium",
      "status": "not_started",
      "progress": 0,
      "notes": "",
      "checklist": [],
      "owners": [
        "r_ceo",
        "r_ger_operacoes"
      ]
    },
    {
      "id": "pa_kr_o1_1_6",
      "title": "Oferecer 2 momentos",
      "description": "",
      "objectiveId": "o1",
      "krId": "kr_o1_1",
      "deadline": "",
      "priority": "medium",
      "status": "not_started",
      "progress": 0,
      "notes": "",
      "checklist": [],
      "owners": [
        "r_ceo"
      ]
    },
    {
      "id": "pa_kr_o1_1_7",
      "title": "Entrar em contato com 5 corretores",
      "description": "",
      "objectiveId": "o1",
      "krId": "kr_o1_1",
      "deadline": "",
      "priority": "medium",
      "status": "not_started",
      "progress": 0,
      "notes": "",
      "checklist": [],
      "owners": [
        "r_dir_pd",
        "r_ger_capacitacao"
      ]
    },
    {
      "id": "pa_kr_o1_1_8",
      "title": "Disponibilizar 3 residências para treino",
      "description": "",
      "objectiveId": "o1",
      "krId": "kr_o1_1",
      "deadline": "",
      "priority": "medium",
      "status": "not_started",
      "progress": 0,
      "notes": "",
      "checklist": [],
      "owners": [
        "r_dir_pd",
        "r_ger_capacitacao"
      ]
    },
    {
      "id": "pa_kr_o1_1_9",
      "title": "Coletar 3 feedbacks",
      "description": "",
      "objectiveId": "o1",
      "krId": "kr_o1_1",
      "deadline": "",
      "priority": "medium",
      "status": "not_started",
      "progress": 0,
      "notes": "",
      "checklist": [],
      "owners": [
        "r_ger_capacitacao",
        "r_ger_cx"
      ]
    },
    {
      "id": "pa_kr_o1_2_1",
      "title": "Montar 1 apresentação comercial base",
      "description": "",
      "objectiveId": "o1",
      "krId": "kr_o1_2",
      "deadline": "",
      "priority": "medium",
      "status": "not_started",
      "progress": 0,
      "notes": "",
      "checklist": [],
      "owners": [
        "r_cso",
        "r_cmo"
      ]
    },
    {
      "id": "pa_kr_o1_2_2",
      "title": "Postar 10 reels",
      "description": "",
      "objectiveId": "o1",
      "krId": "kr_o1_2",
      "deadline": "",
      "priority": "medium",
      "status": "not_started",
      "progress": 0,
      "notes": "",
      "checklist": [],
      "owners": [
        "r_ger_conteudo",
        "r_ger_comunidade"
      ]
    },
    {
      "id": "pa_kr_o1_2_3",
      "title": "Mapear 20 administradores de Airbnb",
      "description": "",
      "objectiveId": "o1",
      "krId": "kr_o1_2",
      "deadline": "",
      "priority": "medium",
      "status": "not_started",
      "progress": 0,
      "notes": "",
      "checklist": [],
      "owners": [
        "r_ger_vendas"
      ]
    },
    {
      "id": "pa_kr_o1_2_4",
      "title": "Mapear 20 imobiliárias",
      "description": "",
      "objectiveId": "o1",
      "krId": "kr_o1_2",
      "deadline": "",
      "priority": "medium",
      "status": "not_started",
      "progress": 0,
      "notes": "",
      "checklist": [],
      "owners": [
        "r_ger_vendas"
      ]
    },
    {
      "id": "pa_kr_o1_2_5",
      "title": "Mapear 50 corretores",
      "description": "",
      "objectiveId": "o1",
      "krId": "kr_o1_2",
      "deadline": "",
      "priority": "medium",
      "status": "not_started",
      "progress": 0,
      "notes": "",
      "checklist": [],
      "owners": [
        "r_ger_vendas"
      ]
    },
    {
      "id": "pa_kr_o1_2_6",
      "title": "Entrar em contato com 20 administradores de Airbnb",
      "description": "",
      "objectiveId": "o1",
      "krId": "kr_o1_2",
      "deadline": "",
      "priority": "medium",
      "status": "not_started",
      "progress": 0,
      "notes": "",
      "checklist": [],
      "owners": [
        "r_ger_vendas"
      ]
    },
    {
      "id": "pa_kr_o2_1_1",
      "title": "Montar 1 apresentação comercial base",
      "description": "",
      "objectiveId": "o2",
      "krId": "kr_o2_1",
      "deadline": "",
      "priority": "medium",
      "status": "not_started",
      "progress": 0,
      "notes": "",
      "checklist": [],
      "owners": [
        "r_cso",
        "r_cmo"
      ]
    },
    {
      "id": "pa_kr_o2_1_2",
      "title": "Montar CRM",
      "description": "",
      "objectiveId": "o2",
      "krId": "kr_o2_1",
      "deadline": "",
      "priority": "medium",
      "status": "not_started",
      "progress": 0,
      "notes": "",
      "checklist": [],
      "owners": [
        "r_cso"
      ]
    },
    {
      "id": "pa_kr_o2_1_3",
      "title": "Entrar em contato com 20 administradores de Airbnb",
      "description": "",
      "objectiveId": "o2",
      "krId": "kr_o2_1",
      "deadline": "",
      "priority": "medium",
      "status": "not_started",
      "progress": 0,
      "notes": "",
      "checklist": [],
      "owners": [
        "r_ger_vendas"
      ]
    },
    {
      "id": "pa_kr_o2_1_4",
      "title": "Entrar em contato com 30 imobiliárias",
      "description": "",
      "objectiveId": "o2",
      "krId": "kr_o2_1",
      "deadline": "",
      "priority": "medium",
      "status": "not_started",
      "progress": 0,
      "notes": "",
      "checklist": [],
      "owners": [
        "r_ger_vendas"
      ]
    },
    {
      "id": "pa_kr_o2_1_5",
      "title": "Entrar em contato com 50 corretores",
      "description": "",
      "objectiveId": "o2",
      "krId": "kr_o2_1",
      "deadline": "",
      "priority": "medium",
      "status": "not_started",
      "progress": 0,
      "notes": "",
      "checklist": [],
      "owners": [
        "r_ger_vendas"
      ]
    },
    {
      "id": "pa_kr_o2_1_6",
      "title": "Entrar em contato com 20 hotéis/pousadas",
      "description": "",
      "objectiveId": "o2",
      "krId": "kr_o2_1",
      "deadline": "",
      "priority": "medium",
      "status": "not_started",
      "progress": 0,
      "notes": "",
      "checklist": [],
      "owners": [
        "r_ger_vendas"
      ]
    },
    {
      "id": "pa_kr_o2_2_1",
      "title": "Mapear 5 fotógrafos",
      "description": "",
      "objectiveId": "o2",
      "krId": "kr_o2_2",
      "deadline": "",
      "priority": "medium",
      "status": "not_started",
      "progress": 0,
      "notes": "",
      "checklist": [],
      "owners": [
        "r_ceo",
        "r_ger_operacoes"
      ]
    },
    {
      "id": "pa_kr_o2_2_2",
      "title": "Apresentar proposta para 5 fotógrafos",
      "description": "",
      "objectiveId": "o2",
      "krId": "kr_o2_2",
      "deadline": "",
      "priority": "medium",
      "status": "not_started",
      "progress": 0,
      "notes": "",
      "checklist": [],
      "owners": [
        "r_ceo",
        "r_ger_operacoes"
      ]
    },
    {
      "id": "pa_kr_o2_2_3",
      "title": "Disponibilizar 3 residências para treino",
      "description": "",
      "objectiveId": "o2",
      "krId": "kr_o2_2",
      "deadline": "",
      "priority": "medium",
      "status": "not_started",
      "progress": 0,
      "notes": "",
      "checklist": [],
      "owners": [
        "r_ceo",
        "r_coo"
      ]
    },
    {
      "id": "pa_kr_o2_2_4",
      "title": "Coletar 3 feedbacks",
      "description": "",
      "objectiveId": "o2",
      "krId": "kr_o2_2",
      "deadline": "",
      "priority": "medium",
      "status": "not_started",
      "progress": 0,
      "notes": "",
      "checklist": [],
      "owners": [
        "r_ger_capacitacao",
        "r_ger_cx"
      ]
    },
    {
      "title": "Realizar 3 Momentos de Capacitação",
      "description": "",
      "objectiveId": "o2",
      "krId": "kr_o2_2",
      "deadline": "",
      "priority": "medium",
      "status": "not_started",
      "progress": 0,
      "notes": "",
      "checklist": [],
      "id": "a_gtbyex7h0",
      "owners": [
        "r_ger_capacitacao",
        "r_ger_operacoes"
      ]
    }
  ]
};
