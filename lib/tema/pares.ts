/**
 * O contrato de legibilidade: cada par de tinta e fundo que o site produz, com
 * o piso que ele tem de bater.
 *
 * **O que é um par.** Uma cor de texto e a pilha de fundos embaixo dela, do mais
 * próximo do olho ao mais distante. A pilha é declarada inteira porque painel
 * tingido é semitransparente: `bg-metodo-superficie/10` não tem contraste nenhum por
 * si só — tem o contraste do que sobra depois de compor com a página. O selo de
 * conclusão chega a três camadas.
 *
 * **A lista é por combinação, não por sítio.** `text-tinta-fraca` sobre a
 * página aparece em treze lugares e é uma linha só, com todos eles no campo
 * `onde`: medir a mesma dupla treze vezes dá treze vezes o mesmo número e uma
 * tabela ilegível. O que importa é que nenhuma *combinação* escape.
 *
 * **Isenção é escrita, nunca omitida.** Um par que não precisa bater o piso
 * continua na lista, continua medido e continua impresso — só não reprova. Par
 * omitido é par esquecido; par isento é decisão registrada, com o motivo do
 * lado. Hoje são três, todas de coisa que não carrega informação.
 *
 * **Dívida está escrita, e hoje está vazia.** O tema que o site tinha no B6.1
 * reprovava AA em oito combinações, de 4,23:1 a 1,39:1. Sete foram pagas pela
 * paleta clara; a oitava, e pior delas, foi paga antes, por conserto de
 * componente — era tinta encostada num fundo que mudou de claridade embaixo
 * dela, e nenhuma paleta salvaria isso.
 *
 * O campo `divida` continua existindo e continua sendo exigente: um par que o
 * declare **tem** de reprovar, senão o teste fica vermelho. Ele é o caminho
 * honesto para registrar um defeito conhecido em vez de escondê-lo — e o
 * caminho de volta, porque consertar a cor sem apagar a linha também reprova.
 * Que ele esteja vazio é a entrega do B6, não uma propriedade permanente.
 */

/** Piso da WCAG 2.2 para corpo de texto (1.4.3, AA). */
export const AA_TEXTO = 4.5;
/** Piso para texto grande — ≥ 24 px, ou ≥ 18,66 px em negrito (1.4.3, AA). */
export const AA_TEXTO_GRANDE = 3;
/** Piso para componente de interface e foco visível (1.4.11, AA). */
export const AA_COMPONENTE = 3;

export type Par = {
  /** Onde isto aparece na tela. Arquivo e linha quando é um sítio só. */
  onde: string;
  /**
   * A tinta, pelo nome do token — o mesmo que sai de `app/globals.css`, com
   * o modificador de opacidade quando houver (`metodo/80`).
   * Aceita uma pilha quando a tinta é semitransparente sobre algo que **não** é
   * o fundo contra o qual ela é medida — o caso é a borda do cartão, que compõe
   * com o cartão e é lida contra a página.
   */
  texto: string | string[];
  /** A pilha de fundo, do mais próximo do olho ao mais distante. A última é opaca. */
  fundo: string[];
  /** Razão mínima aceitável. */
  piso: number;
  /**
   * Se preenchido, o par é medido e impresso mas não reprova. O texto é o
   * motivo, e ele tem de responder "por que a WCAG não se aplica aqui".
   *
   * Isenção **não é** dívida: isenção diz que o piso não se aplica, dívida diz
   * que se aplica e estamos abaixo dele.
   */
  isencao?: string;
  /**
   * Reprovação conhecida e registrada, com o número medido e o bloco que a
   * paga. Existe para que o CI possa ficar verde sem que o defeito suma de
   * vista: o teste exige que um par com `divida` **de fato** reprove, então
   * consertar a cor sem apagar a linha daqui também fica vermelho.
   */
  divida?: string;
};

/** A página. É o `bg-papel` do `<body>`, e está embaixo de tudo. */
const PAGINA = ["papel"];
/** O cartão neutro, opaco, sobre a página. */
const CARTA = ["carta"];
/** O botão neutro em repouso e sob o ponteiro. */
const CARTA_ALTA = ["carta-alta"];
const CARTA_TOQUE = ["carta-toque"];

/**
 * As marcas do tabuleiro, cada uma medida contra **as duas casas**.
 *
 * A duplicação é gerada e não escrita à mão porque a regra é estrutural: uma
 * marca que só contrasta com a casa clara desaparece em metade do tabuleiro, e
 * qual metade depende de onde a peça está. Escrever os pares a dedo deixaria
 * cedo ou tarde alguém acrescentar uma marca e lembrar de só uma das casas.
 *
 * É esta regra que amarra o par de casas inteiro: como toda marca precisa ser
 * 3:1 **mais escura que as duas**, e acima da casa clara não sobra espaço, a
 * casa escura não pode escurecer à vontade — cada ponto que ela desce puxa para
 * baixo o teto de claridade de todas as marcas. As duas ficaram a 1,58:1 uma da
 * outra, que é exatamente a distância que o tema do pacote produzia.
 */
const MARCAS: { onde: string; token: string; piso: number }[] = [
  {
    onde: "coordenada (a–h, 1–8) — tinta única para as duas casas, e é ela que fecha o orçamento do par",
    token: "coordenada",
    piso: AA_TEXTO,
  },
  { onde: "destino de lance legal e casa selecionada", token: "destino", piso: AA_COMPONENTE },
  { onde: "realce do último lance", token: "ultimo-lance", piso: AA_COMPONENTE },
  { onde: "clarão do rei em xeque", token: "xeque", piso: AA_COMPONENTE },
  { onde: "destino de pré-lance", token: "premove", piso: AA_COMPONENTE },

  // Os quatro pincéis pedagógicos. O `/55` do corte é o mesmo alfa que a
  // tabela `PINCEIS` de `ChessBoard.tsx` passa ao chessground: ele pinta a
  // parede inteira, e opaco viraria um bloco. Os outros três são traço fino e
  // vão opacos.
  { onde: "pincel do corte — a parede que o rei não atravessa", token: "pincel-corte/55", piso: AA_COMPONENTE },
  // A mesma tinta do corte, opaca: a borda da caixa do rei (`.caixa-rei`, em
  // `app/globals.css`). É par separado porque é alfa separado — a seta do
  // corte pinta a parede inteira e por isso vai translúcida, a caixa desenha
  // só o contorno e pode ir cheia. O miolo a 8% não entra na lista: não
  // carrega informação nenhuma, e quem separa dentro de fora é a borda.
  { onde: "borda da caixa do rei nas etapas 2 e 3 (BoxOverlay)", token: "pincel-corte", piso: AA_COMPONENTE },
  { onde: "pincel da peça pendurada", token: "pincel-pendurada", piso: AA_COMPONENTE },
  { onde: "pincel da peça defendida", token: "pincel-defendida", piso: AA_COMPONENTE },
  { onde: "pincel da seta do exemplo", token: "pincel-seta", piso: AA_COMPONENTE },
  { onde: "selo de alternativa do repertório", token: "pincel-alternativa", piso: AA_COMPONENTE },
];

const NAS_DUAS_CASAS: Par[] = MARCAS.flatMap(({ onde, token, piso }) => [
  { onde: `${onde} — na casa clara`, texto: token, fundo: ["casa-clara"], piso },
  { onde: `${onde} — na casa escura`, texto: token, fundo: ["casa-escura"], piso },
]);

/**
 * Os pares deste site.
 *
 * **A lista foi reescrita ao herdar a paleta, e isso é o ponto.** A tabela veio
 * do Laboratório de Finais junto com os tokens, e citava `FeedbackPanel`,
 * `MasterySeal`, `PracticeStage` — componentes que não vieram. Uma tabela de
 * contraste apontando para telas que não existem é um teste verde que não mede
 * nada, e é o pior estado que um gate pode ter.
 *
 * Cada linha aqui aponta para um arquivo que existe. Quando uma tela nova
 * trouxer uma combinação nova, a linha entra junto — é isso, ou o par passa sem
 * ninguém medir.
 */
export const PARES: Par[] = [
  // -------------------------------------------------------------------------
  // Tinta sobre a página
  // -------------------------------------------------------------------------
  {
    onde: "app/layout.tsx — corpo do documento, e todo título que herda dele (page, entrar, painel, professor)",
    texto: "tinta",
    fundo: PAGINA,
    piso: AA_TEXTO,
  },
  {
    onde: "parágrafo de apoio, e o rótulo do botão neutro de borda — app/page.tsx, app/entrar/page.tsx, o link Área do professor e o Voltar ao painel",
    texto: "tinta-media",
    fundo: PAGINA,
    piso: AA_TEXTO,
  },
  {
    onde: "rótulo de seção e texto secundário sobre a página — app/page.tsx, entrar/Formulario.tsx, painel/page.tsx, professor/page.tsx",
    texto: "tinta-fraca",
    fundo: PAGINA,
    piso: AA_TEXTO,
  },
  {
    onde: "o selo de cada tela (a utilitária `rotulo` em verde) — as quatro telas",
    texto: "metodo-tinta",
    fundo: PAGINA,
    piso: AA_TEXTO,
  },
  {
    onde: "erro de entrada, escrito direto sob o campo (entrar/Formulario.tsx). Sem painel de propósito: numa tela de login de criança o retângulo vermelho assusta mais do que informa.",
    texto: "erro-texto",
    fundo: PAGINA,
    piso: AA_TEXTO,
  },

  // -------------------------------------------------------------------------
  // Tinta sobre o cartão
  // -------------------------------------------------------------------------
  {
    onde: "valor dentro do cartão — o número do painel, a célula da tabela de alunos, o texto digitado no campo",
    texto: "tinta",
    fundo: CARTA,
    piso: AA_TEXTO,
  },
  {
    onde: "rótulo dentro do cartão — legenda do número, cabeçalho da tabela, rótulo de campo",
    texto: "tinta-fraca",
    fundo: CARTA,
    piso: AA_TEXTO,
  },
  {
    onde: "texto de exemplo dentro do campo vazio (`placeholder:`) — entrar/Formulario.tsx, professor/CadastroDeAluno.tsx",
    texto: "tinta-muda",
    fundo: CARTA,
    piso: AA_TEXTO,
    isencao:
      "3,06:1, e nenhuma informação passa por ele: cada `placeholder` do site repete o que o rótulo acima do campo já diz por extenso, em `tinta-fraca`. O texto de exemplo some no instante em que o aluno digita — e some sem levar nada junto. A dica do campo e a faixa de rating do bloco *carregavam* informação e estavam nesta tinta: subiram para `tinta-fraca` quando esta régua as pegou.",
  },

  // -------------------------------------------------------------------------
  // O que é botão
  // -------------------------------------------------------------------------
  {
    onde: "botão primário em repouso — Entrar na home, Entrar no formulário, Criar conta",
    texto: "tinta-inversa",
    fundo: ["metodo-cheio"],
    piso: AA_TEXTO,
  },
  {
    onde: "botão primário sob o ponteiro — os mesmos três",
    texto: "tinta-inversa",
    fundo: ["metodo-cheio-toque"],
    piso: AA_TEXTO,
  },
  // -------------------------------------------------------------------------
  // O cartão de comando do treinador de repertório
  //
  // A tradução do cartão branco do Move Trainer para um tema claro é a
  // **inversão**: lá ele é a única superfície branca de uma tela escura; aqui
  // é a única escura de uma tela clara. É a mesma ideia — um lugar fixo, com a
  // instrução, que o olho acha sem ler a página.
  // -------------------------------------------------------------------------
  {
    onde: "cartão de comando do treino de repertório — as duas linhas de texto",
    texto: "tinta-inversa",
    fundo: ["tinta"],
    piso: AA_TEXTO,
  },
  {
    onde: "borda de 2 px e ícone do cartão de comando — o tom do estado bom",
    texto: "metodo-superficie",
    fundo: ["tinta"],
    piso: AA_COMPONENTE,
  },
  {
    onde: "borda de 2 px e ícone do cartão de comando — o tom de aviso",
    texto: "aviso-superficie",
    fundo: ["tinta"],
    piso: AA_COMPONENTE,
  },
  {
    onde: "borda de 2 px e ícone do cartão de comando — o tom de erro",
    texto: "erro-superficie",
    fundo: ["tinta"],
    piso: AA_COMPONENTE,
  },
  {
    onde: "borda de 2 px e ícone do cartão de comando — o tom calmo, sem veredito",
    texto: "tinta-muda",
    fundo: ["tinta"],
    piso: AA_COMPONENTE,
  },
  {
    onde: "botão neutro sob o ponteiro (`hover:bg-carta-toque`) — os mesmos dois",
    texto: "tinta-media",
    fundo: CARTA_TOQUE,
    piso: AA_TEXTO,
  },
  {
    onde: "o degrau intermediário de superfície — reservado ao repouso de controle neutro",
    texto: "tinta-media",
    fundo: CARTA_ALTA,
    piso: AA_TEXTO,
  },

  // -------------------------------------------------------------------------
  // Os painéis tingidos — a tinta compõe com o que está atrás, não com o tom cheio
  // -------------------------------------------------------------------------
  {
    onde: "manchete do aviso de que o PIN não volta (professor/CadastroDeAluno.tsx)",
    texto: "aviso-tinta",
    fundo: ["aviso-superficie/12", ...PAGINA],
    piso: AA_TEXTO,
  },
  {
    onde: "corpo do mesmo aviso e os rótulos da lista de credencial",
    texto: "tinta-media",
    fundo: ["aviso-superficie/12", ...PAGINA],
    piso: AA_TEXTO,
  },
  {
    onde: "o usuário e o PIN em si, dentro do mesmo cartão — é o que o professor copia para o papel",
    texto: "tinta",
    fundo: ["aviso-superficie/12", ...PAGINA],
    piso: AA_TEXTO,
  },
  {
    onde: "nota da ordem de dificuldade no painel do aluno",
    texto: "dica-tinta",
    fundo: ["dica-superficie/12", ...PAGINA],
    piso: AA_TEXTO,
  },
  {
    onde: "erro do cadastro, dentro do cartão do formulário (professor/CadastroDeAluno.tsx)",
    texto: "erro-tinta",
    fundo: ["erro-superficie/12", ...CARTA],
    piso: AA_TEXTO,
  },
  {
    onde: "número do bloco, dentro do disco tingido no cartão (painel/page.tsx)",
    texto: "metodo-tinta-alta",
    fundo: ["metodo-superficie/15", ...CARTA],
    piso: AA_TEXTO,
  },
  {
    onde: "o verde a meia altura sobre painel tingido leve — reservado ao rótulo de tema em /tatica",
    texto: "metodo",
    fundo: ["metodo-superficie/5", ...PAGINA],
    piso: AA_TEXTO,
  },
  {
    onde: "campo de formulário: papel dentro do cartão (professor/CadastroDeAluno.tsx) — o inverso do resto do site",
    texto: "tinta",
    fundo: ["papel", ...CARTA],
    piso: AA_TEXTO,
  },

  // -------------------------------------------------------------------------
  // Os tons cheios, que hoje só desenham contorno
  // -------------------------------------------------------------------------
  {
    onde: "o rosa cheio, hoje só como borda de estado de erro",
    texto: "erro",
    fundo: PAGINA,
    piso: AA_COMPONENTE,
  },
  {
    onde: "o âmbar cheio, hoje só como borda de estado de aviso",
    texto: "aviso",
    fundo: PAGINA,
    piso: AA_COMPONENTE,
  },

  // -------------------------------------------------------------------------
  // Estrutura: foco, e as três bordas
  // -------------------------------------------------------------------------
  {
    onde: "anel de foco sobre a página — a utilitária `foco`, cujo `outline-offset` positivo joga o anel para fora do controle, sobre o fundo atrás dele",
    texto: "foco",
    fundo: PAGINA,
    piso: AA_COMPONENTE,
  },
  {
    onde: "anel de foco sobre o cartão — os campos do formulário do professor",
    texto: "foco",
    fundo: CARTA,
    piso: AA_COMPONENTE,
  },
  {
    onde: "borda do campo de texto — `border-borda`, em entrar/Formulario.tsx e professor/CadastroDeAluno.tsx",
    // A borda compõe com o fundo do próprio controle (o `background` vai até a
    // `border-box`) e é lida contra o que está atrás. Daí a pilha na tinta.
    texto: ["borda", ...CARTA],
    fundo: PAGINA,
    piso: AA_COMPONENTE,
    divida:
      "O campo de texto é o único lugar do site em que a borda **carrega informação**: ela é o que diz onde tocar para escrever, e não há fundo próprio dizendo isso. São os 6 campos de /entrar e /professor. A conta a pagar é escurecer a borda **só do campo**, não a do cartão — 28% de tinta bate o piso, e é o valor que `borda-forte` já tem.",
  },
  {
    onde: "borda do cartão neutro — `border-borda-fraca` no cartão do bloco e na tabela de alunos",
    texto: ["borda-fraca", ...CARTA],
    fundo: PAGINA,
    piso: AA_COMPONENTE,
    isencao:
      "a borda não carrega informação: o cartão já se separa da página pelo próprio fundo, e o conteúdo dele não depende de enxergar o limite. Vira contrato de verdade se algum dia o cartão perder o fundo.",
  },
  {
    onde: "borda do cartão de credencial — o único cartão da tela que o professor não pode fechar sem ler",
    texto: ["borda-forte", "aviso-superficie/12", ...PAGINA],
    fundo: PAGINA,
    piso: AA_COMPONENTE,
    isencao:
      "1,92:1. Quem faz o cartão saltar é o **preenchimento** âmbar, não o traço: a borda é o acabamento de uma superfície que já se anuncia sozinha. Ela seria contrato de verdade se o cartão perdesse o tingimento — e aí a conta é a mesma do cartão neutro.",
  },
  {
    onde: "véu do fundo escurecido — hoje sem sítio; entra com o primeiro diálogo modal",
    texto: "veu",
    fundo: PAGINA,
    piso: AA_COMPONENTE,
    isencao:
      "é o escurecedor de fundo de um modal, não uma marca: o contraste que importa ali é o do conteúdo do modal contra o véu já composto, e esse par entra quando o modal existir.",
  },

  // -------------------------------------------------------------------------
  // O tabuleiro — ver `NAS_DUAS_CASAS` logo acima
  // -------------------------------------------------------------------------
  ...NAS_DUAS_CASAS,
];
