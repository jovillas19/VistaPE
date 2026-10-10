# VISTA studios · Painel Estratégico

Protótipo front-end de gestão estratégica: Dashboard, Estratégia & OKRs, Indicadores, Planos de ação, MVV e Configurações.

## Como abrir

Abra `index.html` direto no navegador. Não há build nem dependências: só HTML, CSS e JavaScript puro.
Para servir localmente:

```bash
python -m http.server 5178
```

## Estrutura

| Arquivo | Papel |
|---|---|
| `assets/styles.css` | Tokens de design (tema claro/escuro), componentes e layouts |
| `assets/js/store.js` | Estado, dados iniciais, persistência em localStorage, cálculos (progresso, ritmo, alertas) |
| `assets/js/ui.js` | Componentes reutilizáveis: ícones, badges, barras, gráficos SVG, drawer, modal, toast |
| `assets/js/forms.js` | Formulários de cadastro e edição (objetivo, KR, indicador, plano, responsável, valor) |
| `assets/js/views.js` | As seis telas |
| `assets/js/app.js` | Shell, rotas por hash, eventos, drag & drop, importação e exportação |

## Regras de cálculo

- **Sincronização indicador → KR**: cada KR pode ter um indicador de origem. O valor atual do KR passa a vir desse indicador e o status se ajusta sozinho (meta atingida = concluído). Os botões −/+ do KR registram a medição no indicador.
- **Progresso do KR**: `(atual − inicial) ÷ (meta − inicial)`, limitado a 0–100%. KR concluído conta 100%.
- **Progresso do objetivo**: média simples dos seus KRs. **Geral**: média dos objetivos.
- **Ritmo esperado**: fração do ciclo já decorrida; base do selo de saúde do dashboard.
- **MVV**: o texto oficial fica em `OFFICIAL_MVV` (`assets/js/store.js`). Para alterar, edite ali e incremente `MVV_VERSION`.
- **Saúde**: "No ritmo", "Atenção" ou "Fora do ritmo", comparando o progresso com o ritmo esperado e os KRs em risco.
- **Plano de ação com checklist**: o progresso vem das etapas marcadas.

Os dados ficam no navegador (localStorage). Use **Configurações → Exportar backup** para salvar ou levar para outra máquina.
