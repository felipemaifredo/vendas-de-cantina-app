# Sistema de Design — Controle de Vendas Cantina / Eventos

Este documento define o sistema de design visual da aplicação, com foco em usabilidade, velocidade de operação e alta legibilidade em celulares e tablets.

---

## 1. Tema Visual: Claro Clean (Legibilidade Máxima)

O esquema de cores foi projetado para alta legibilidade em ambientes de eventos sob luz solar direta ou iluminação variada.

### Paleta de Cores (CSS Variables)

```css
:root {
  /* Cores de Fundo e Superfície */
  --color-bg: #f8fafc;        /* Fundo principal (Slate 50) */
  --color-surface: #ffffff;   /* Fundo de cards, modais e containers */
  --color-border: #e2e8f0;    /* Bordas sutis (Slate 200) */
  
  /* Marca e Ações Primárias (Azul Royal) */
  --color-primary: #2563eb;   /* Azul Royal principal (Blue 600) */
  --color-primary-hover: #1d4ed8; /* Azul Royal escuro para hover/foco (Blue 700) */
  --color-primary-light: #eff6ff; /* Fundo suave para elementos ativos (Blue 50) */
  
  /* Cores de Texto */
  --color-text-primary: #0f172a;   /* Texto principal (Slate 900) */
  --color-text-secondary: #475569; /* Texto descritivo (Slate 600) */
  --color-text-muted: #94a3b8;     /* Texto desabilitado ou secundário mudo (Slate 400) */
  
  /* Cores de Feedback Semântico */
  --color-success: #16a34a;       /* Sucesso / Venda concluída / Caixa aberto (Green 600) */
  --color-success-hover: #15803d; /* Hover de sucesso (Green 700) */
  --color-success-light: #f0fdf4; /* Fundo suave de sucesso */
  
  --color-danger: #dc2626;        /* Cancelamento / Erro / Excluir (Red 600) */
  --color-danger-hover: #b91c1c;  /* Hover de perigo (Red 700) */
  --color-danger-light: #fef2f2;  /* Fundo suave de erro */
  
  --color-warning: #d97706;       /* Alerta (Amber 600) */
  
  /* Efeitos */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
}
```

---

## 2. Tipografia

A tipografia utiliza a fonte **Roboto** para garantir clareza e alta legibilidade em qualquer dispositivo.

* **Família de Fontes:** `Roboto, system-ui, -apple-system, sans-serif`
* **Pesos:** Regular (400), Medium (500), Bold (700)
* **Tamanhos e Hierarquia:**
  * `h1`: 32px (Bold, títulos de páginas grandes/dashboards)
  * `h2`: 24px (Bold, títulos de seções/carrinho)
  * `h3`: 18px (Medium, títulos de cards/produtos)
  * `body`: 16px (Regular, textos de itens e listagens)
  * `caption`: 14px (Regular, preços unitários e metadados)
  * `sm`: 12px (Regular, legendas e rótulos pequenos)

---

## 3. Diretrizes de Layout e Operabilidade (UX Rápida)

Como o sistema é focado em vendas rápidas de cantina/eventos, a experiência de toque é otimizada:

### Tamanho dos Alvos de Toque (Tap Targets)
* Todo botão clicável na tela de vendas deve ter no mínimo **48px de altura** para evitar cliques errados.
* Espaçamento entre botões de produtos: mínimo de **8px**.

### Responsividade
* **Mobile (até 768px):** Exibição vertical. O catálogo de produtos é agrupado por categorias colapsáveis ou em rolagem fluida. O carrinho é um rodapé fixo compacto que expande ao deslizar ou clicar em "Finalizar".
* **Tablet/Desktop (768px ou mais):** Layout em duas colunas fixas.
  * Coluna da esquerda (65% da largura): Lista de produtos e combos.
  * Coluna da direita (35% da largura): Carrinho atual com itens selecionados, quantidades, preço total e botão "Finalizar Pedido" em destaque.

---

## 4. Convenções de CSS Modules

Todos os estilos devem ser construídos em arquivos `[Componente].module.css` localizados na mesma pasta do componente.

* **Convenção de Nomes:** BEM simplificado com camelCase ou hifens para classes:
  * `.container` — Wrapper do componente.
  * `.header` — Cabeçalho interno.
  * `.list` — Lista de itens.
  * `.listItem` — Item de lista.
  * `.buttonPrimary` — Botão de ação principal.
  * `.isActive` / `.isDisabled` — Modificadores de estado.
