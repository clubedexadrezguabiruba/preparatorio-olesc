import { BLOCOS } from "../lib/tatica/blocos.ts";
import { temaEscrito } from "../lib/tatica/conteudo.ts";
import { TAREFAS } from "../lib/tarefas/conteudo.ts";
import { puzzlesDoTema } from "../lib/apostila/puzzles.ts";
import type { Bloco, Caderno, Secao } from "../lib/apostila/caderno.ts";

/**
 * Caderno 1 — o do Sábado 1 (12/9).
 *
 * O aluno leva este caderno para casa no fim do primeiro sábado. Ele responde
 * a três perguntas, nesta ordem: **como funciona o torneio para o qual eu
 * estou treinando**, **o que eu penso antes de mover uma peça**, e **o que eu
 * treino esta semana**.
 *
 * ## O que este arquivo escreve, e o que ele só monta
 *
 * Escreve: as regras da OLESC, a anotação e as três perguntas. Esse texto não
 * existe em nenhum outro lugar do projeto — ele é do papel.
 *
 * **Não** escreve: a explicação de cada tema de tática (vem de
 * `content/temas.json`, a mesma que o aluno lê na tela), os problemas (vêm do
 * mesmo banco que o site serve) e as tarefas da semana (vêm de
 * `content/tarefas.json`, as mesmas que aparecem no painel). Se o caderno
 * tivesse a sua própria cópia dessas três coisas, o papel e a tela começariam
 * iguais e terminariam diferentes — e quem descobriria seria o aluno, no
 * domingo, sozinho.
 *
 * Os fatos da OLESC saem do Regulamento Técnico Fesporte 2026, Cap. XXXVII, e
 * estão registrados com a fonte em `docs/00-PLANO-MESTRE.md` (§Regras do
 * torneio). Um número que mudar no boletim muda lá, e daí muda aqui.
 */

/** O enunciado impresso embaixo de cada diagrama, por tema. */
const ENUNCIADOS: Record<string, string> = {
  mateIn1: "Ache o mate em 1.",
  mateIn2: "Ache o mate em 2 — comece pelos xeques.",
  hangingPiece: "Ache a peça sem defesa e capture-a.",
  backRankMate: "Ache o mate no corredor.",
  smotheredMate: "Ache o mate sufocado.",
  arabianMate: "Ache o mate — torre e cavalo trabalham juntos.",
  anastasiaMate: "Ache o mate pela coluna.",
  hookMate: "Ache o mate do gancho.",
};

/**
 * Quantos problemas impressos por tema, por bloco.
 *
 * O bloco 1 tem três temas e ganha quatro problemas cada; o bloco 2 tem cinco
 * temas e ganha dois. É o que mantém o caderno na faixa de 16 páginas do plano
 * sem deixar nenhum tema sem exemplo no papel.
 */
const POR_TEMA: Record<number, number> = { 1: 4, 2: 2 };

/* ------------------------------------------------------------------ *
 * As seções escritas
 * ------------------------------------------------------------------ */

const A_OLESC: Secao = {
  titulo: "A OLESC, em uma página",
  novaPagina: true,
  blocos: [
    {
      tipo: "paragrafo",
      texto:
        "A OLESC é a Olimpíada Estudantil de Santa Catarina. O xadrez acontece em " +
        "Lages, de 11 a 16 de outubro. Você não vai jogar sozinho: vai jogar por " +
        "uma equipe do seu município, e o que você fizer no seu tabuleiro conta " +
        "para o time inteiro.",
    },
    { tipo: "subtitulo", texto: "São três provas, não uma" },
    {
      tipo: "lista",
      itens: [
        "**Blitz** — partidas rápidas, individual.",
        "**Rápido** — partidas de ritmo médio, individual.",
        "**Equipe** — quatro tabuleiros jogando ao mesmo tempo contra outro " +
          "município. É a prova que **vale o triplo** na pontuação da cidade.",
      ],
    },
    {
      tipo: "paragrafo",
      texto:
        "Cada prova tem **7 rodadas**, no sistema suíço: você não joga contra todo " +
        "mundo, joga contra quem está fazendo mais ou menos a mesma pontuação que " +
        "você. Quem ganha sobe de adversário; quem perde desce. Por isso a segunda " +
        "metade do torneio costuma ser mais equilibrada que a primeira.",
    },
    { tipo: "subtitulo", texto: "A equipe e os tabuleiros" },
    {
      tipo: "paragrafo",
      texto:
        "A equipe tem **4 titulares e até 2 reservas** por naipe. A ordem dos " +
        "tabuleiros é fixada no congresso técnico, antes de tudo começar, e vale " +
        "igual nas três provas — o tabuleiro 1 é o tabuleiro 1 do começo ao fim.",
    },
    {
      tipo: "paragrafo",
      texto:
        "As cores já vêm decididas pelo tabuleiro: **1 e 3 jogam com a cor da " +
        "equipe, 2 e 4 com a cor contrária**. Ou seja, você já sabe, antes de a " +
        "rodada começar, se vai ser de brancas ou de pretas — e dá para chegar com " +
        "a abertura na cabeça.",
    },
    {
      tipo: "destaque",
      rotulo: "Vale saber:",
      texto:
        "para levar medalha individual do seu tabuleiro é preciso ter jogado pelo " +
        "menos **5 das 7 partidas**. Faltar a uma rodada custa caro.",
    },
    { tipo: "subtitulo", texto: "Quem vai estar do outro lado" },
    {
      tipo: "paragrafo",
      texto:
        "Olhando as OLESC de 2024 e 2025: o topo da tabela tem gente de 1700 a " +
        "1900, e **metade dos inscritos não tem rating nenhum**. Isso muda o que " +
        "vale a pena treinar. Contra a maioria, **não entregar peça de graça já " +
        "ganha metade das partidas** — é literalmente o que decide. Contra os de " +
        "1700 para cima o plano é outro: defender, complicar, e segurar o empate " +
        "que ajuda o time.",
    },
    { tipo: "subtitulo", texto: "Empatou na pontuação. E agora?" },
    {
      tipo: "paragrafo",
      texto:
        "Quando dois terminam com os mesmos pontos, a classificação sai por " +
        "**desempate**, nesta ordem:",
    },
    {
      tipo: "lista",
      ordenada: true,
      itens: [
        "**Confronto direto** — se vocês se enfrentaram, quem ganhou fica na frente.",
        "**Buchholz** — soma os pontos de todos os seus adversários. Quem pegou " +
          "adversários mais fortes fica na frente. O *mediano* joga fora o melhor " +
          "e o pior adversário antes de somar; o *total* soma todos.",
        "**Sonneborn-Berger** — parecido, mas conta mais os adversários que você " +
          "**venceu**.",
      ],
    },
    {
      tipo: "paragrafo",
      texto:
        "O que isso quer dizer na prática: **não existe rodada que não vale nada**. " +
        "Ganhar na rodada 1 de um adversário que depois vai bem melhora o seu " +
        "desempate lá no fim.",
    },
  ],
};

const REGRAS: Secao = {
  titulo: "As regras que pegam",
  novaPagina: true,
  blocos: [
    {
      tipo: "paragrafo",
      texto:
        "Estas são as regras que tiram ponto de quem não sabe delas. Nenhuma é " +
        "difícil. Todas já custaram partida para alguém que jogava melhor.",
    },
    { tipo: "subtitulo", texto: "Anotação é obrigatória" },
    {
      tipo: "paragrafo",
      texto:
        "Você anota os seus lances **e os do adversário**, na planilha, durante a " +
        "partida. Não é enfeite: a planilha é o documento da partida. Se houver " +
        "reclamação — de lance ilegal, de repetição, de tempo — é ela que a " +
        "árbitra vai ler. Quem parou de anotar no meio perde o direito de " +
        "reclamar.",
    },
    {
      tipo: "paragrafo",
      texto:
        "Anote **antes de apertar o relógio**, sempre na mesma ordem: jogo, anoto, " +
        "aperto. Quem deixa para anotar depois esquece, e no fim da partida tem uma " +
        "planilha pela metade.",
    },
    { tipo: "subtitulo", texto: "Peça tocada, peça jogada" },
    {
      tipo: "paragrafo",
      texto:
        "Se você **toca** numa peça sua, tem de mover aquela peça, se houver lance " +
        "legal com ela. Se toca numa peça do adversário, tem de capturá-la, se der. " +
        "E o lance está feito quando você **solta** a peça — não dá para voltar " +
        "atrás depois de soltar.",
    },
    {
      tipo: "paragrafo",
      texto:
        "Precisa ajeitar uma peça que está torta na casa? Diga **componho** antes " +
        "de encostar nela. Sem falar, encostou é lance.",
    },
    { tipo: "subtitulo", texto: "Lance ilegal" },
    {
      tipo: "paragrafo",
      texto:
        "Lance ilegal é o que as regras não permitem: mover deixando o próprio rei " +
        "em xeque, mover uma peça de um jeito que ela não anda, rocar quando não " +
        "pode. Nas partidas **rápidas e no blitz**, reclamar um lance ilegal do " +
        "adversário é coisa séria: pare o relógio e chame a árbitra. Não corrija " +
        "sozinho e não jogue por cima do erro — quem joga em cima abre mão da " +
        "reclamação.",
    },
    { tipo: "subtitulo", texto: "O relógio e o incremento" },
    {
      tipo: "paragrafo",
      texto:
        "O relógio tem dois lados, e o seu corre enquanto é a sua vez. **15+10** " +
        "quer dizer 15 minutos para a partida inteira, mais **10 segundos que " +
        "entram no seu relógio a cada lance que você faz**. Esse incremento é a sua " +
        "rede de segurança: mesmo com 5 segundos na tela, se você continuar " +
        "jogando, você não cai — desde que jogue em menos de 10 segundos por lance.",
    },
    {
      tipo: "destaque",
      rotulo: "O erro clássico:",
      texto:
        "gastar 8 dos 15 minutos nos dez primeiros lances, que são justamente os " +
        "que você já estudou. O tempo serve para a posição difícil, e ela vem " +
        "depois.",
    },
    { tipo: "subtitulo", texto: "Como se pede empate" },
    {
      tipo: "paragrafo",
      texto:
        "Só se oferece empate **depois de fazer o seu lance e antes de apertar o " +
        "relógio**. Você joga, diz que propõe empate, e aí aperta. O adversário " +
        "responde aceitando, dizendo não, ou simplesmente jogando — jogar é " +
        "recusar.",
    },
    {
      tipo: "paragrafo",
      texto:
        "Empate também acontece sozinho: **afogamento** (é a vez dele, o rei não " +
        "está em xeque e ele não tem nenhum lance legal), **a mesma posição " +
        "repetida três vezes**, **50 lances sem captura e sem lance de peão**, e " +
        "quando não sobra material para dar mate.",
    },
    {
      tipo: "destaque",
      rotulo: "Na prova por equipe:",
      texto:
        "empate não é só seu. Antes de aceitar ou de oferecer, **olhe para o " +
        "professor**. Um empate no seu tabuleiro pode ser exatamente o que a equipe " +
        "precisa — ou exatamente o que ela não pode.",
    },
    { tipo: "subtitulo", texto: "Comportamento" },
    {
      tipo: "lista",
      itens: [
        "Celular **desligado**, não no silencioso. Tocou, perdeu.",
        "Não fale com quem está jogando, nem com quem está assistindo, nem com o " +
          "seu adversário — a não ser para propor empate, para dizer que compõe, " +
          "ou para chamar a árbitra.",
        "Não analise a partida que acabou perto de quem ainda está jogando.",
        "Aperte a mão no começo e no fim. Perder é parte do jogo, e você vai " +
          "reencontrar essa mesma pessoa em outros torneios.",
      ],
    },
  ],
};

const ANOTACAO: Secao = {
  titulo: "Como anotar a sua partida",
  novaPagina: true,
  blocos: [
    {
      tipo: "paragrafo",
      texto:
        "Cada casa do tabuleiro tem um nome: a **letra da coluna** (a até h, da " +
        "esquerda para a direita, do ponto de vista das brancas) mais o **número da " +
        "fileira** (1 até 8, de baixo para cima). O rei branco começa em e1; o rei " +
        "preto, em e8.",
    },
    {
      tipo: "diagramas",
      pedido:
        "A posição inicial, vista das brancas. As letras e os números em volta são " +
        "as coordenadas, e elas aparecem em todo diagrama deste caderno.",
      itens: [
        {
          fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
          orientacao: "brancas",
          vez: "Brancas jogam.",
        },
      ],
    },
    { tipo: "subtitulo", texto: "As letras das peças" },
    {
      tipo: "lista",
      itens: [
        "**R** = rei · **D** = dama · **T** = torre · **B** = bispo · **C** = cavalo",
        "O **peão não tem letra**: escreve-se só a casa. `e4` quer dizer peão para e4.",
      ],
    },
    { tipo: "subtitulo", texto: "Como se escreve um lance" },
    {
      tipo: "lista",
      itens: [
        "`Cf3` — o cavalo foi para f3.",
        "`Bxc6` — o bispo **capturou** o que estava em c6. O **x** é captura.",
        "`exd5` — o peão da coluna **e** capturou em d5. Captura de peão leva a " +
          "coluna de onde ele saiu.",
        "`O-O` — roque pequeno, do lado do rei. `O-O-O` — roque grande.",
        "`e8=D` — o peão chegou em e8 e **promoveu** a dama.",
        "`+` é xeque, `#` é mate. `1-0` brancas ganharam, `0-1` pretas ganharam, " +
          "`½-½` empate.",
        "Se **duas** peças iguais podiam ir para a mesma casa, diga qual: `Tad1` " +
          "(a torre da coluna a) ou `T1d2` (a torre da fileira 1).",
      ],
    },
    {
      tipo: "destaque",
      rotulo: "Treine isto de graça:",
      texto:
        "o exercício de **Coordenadas** do Lichess, 10 minutos por dia, é o que faz " +
        "você anotar sem parar para pensar onde fica f6. Está na sua tarefa desta " +
        "semana.",
    },
  ],
};

async function tresPerguntas(): Promise<Secao> {
  const exemplos = await puzzlesDoTema("hangingPiece", 2);

  return {
    titulo: "As três perguntas antes de mover",
  novaPagina: true,
    blocos: [
      {
        tipo: "paragrafo",
        texto:
          "A maior parte das partidas entre 1000 e 1400 não é decidida por um plano " +
          "brilhante. É decidida por uma peça que alguém deixou de graça. E a " +
          "diferença entre quem entrega e quem não entrega não é talento — é " +
          "**hábito**: três perguntas, na mesma ordem, todas as vezes.",
      },
      { tipo: "subtitulo", texto: "1. O que ele está ameaçando?" },
      {
        tipo: "paragrafo",
        texto:
          "Ele acabou de mover. Olhe para o lance dele **antes** de olhar para o seu " +
          "plano. A peça que ele moveu passou a atacar o quê? E a casa que ela " +
          "deixou — ela estava defendendo alguma coisa que agora ficou solta?",
      },
      { tipo: "subtitulo", texto: "2. As minhas peças estão seguras?" },
      {
        tipo: "paragrafo",
        texto:
          "Passe o olho pelas suas peças, uma por uma. Cada uma que estiver atacada: " +
          "quantas vezes ela é atacada, e quantas vezes ela é defendida? Atacada " +
          "duas e defendida uma é peça perdida. **Conte** — não confie na sensação.",
      },
      { tipo: "subtitulo", texto: "3. Posso capturar alguma coisa de graça?" },
      {
        tipo: "paragrafo",
        texto:
          "Agora sim, olhe para o lado dele. Alguma peça sem defensor? Alguma atacada " +
          "mais vezes do que defendida? Algum xeque que ganha material?",
      },
      {
        tipo: "destaque",
        rotulo: "E antes de soltar a peça:",
        texto:
          "a peça que você está tirando dali estava defendendo alguém? Esse é o " +
          "descuido que mais custa partida — a peça sai para atacar e abre a porta " +
          "atrás dela.",
      },
      {
        tipo: "paragrafo",
        texto:
          "Nos dois diagramas abaixo é a pergunta 3 em ação. Faça o exercício " +
          "inteiro: conte os atacantes e os defensores antes de escrever a resposta.",
      },
      {
        tipo: "diagramas",
        pedido: "Nos dois: ele acabou de jogar. Ache a peça que ficou sem defensor.",
        itens: exemplos,
      },
    ],
  };
}

function aTarefa(): Secao {
  const daSemana = TAREFAS.filter((t) => t.semana === 1);
  if (daSemana.length === 0) throw new Error("a semana 1 sumiu de content/tarefas.json");

  return {
    titulo: "A tarefa desta semana",
  novaPagina: true,
    blocos: [
      {
        tipo: "paragrafo",
        texto:
          "É a mesma lista que está no seu painel, no site. Lá você marca o que " +
          "terminou; aqui você vê tudo de uma vez. **Faça um pouco por dia** — tudo " +
          "no sábado à noite não ensina nada.",
      },
      {
        tipo: "lista",
        itens: daSemana.map((t) => `**${t.titulo}.** ${t.detalhe}`),
      },
      {
        tipo: "destaque",
        rotulo: "Sobre a meta de acerto:",
        texto:
          "os 70% são um alvo, não uma trava. Errar puzzle é como se aprende — o que " +
          "não ensina é chutar para passar rápido. Erre devagar.",
      },
    ],
  };
}

/** Duas folhas, uma para cada partida da tarefa da semana. */
const PLANILHAS: Secao[] = [
  {
    titulo: "Planilha de anotação",
  novaPagina: true,
    blocos: [
      {
        tipo: "paragrafo",
        texto:
          "Uma das suas tarefas são duas partidas de 15+10 anotadas **à mão**. Use " +
          "estas duas folhas — uma para cada partida — e traga-as no Sábado 2. Elas " +
          "viram material de aula: a gente vai procurar junto o lance que decidiu " +
          "cada uma.",
      },
      { tipo: "planilha", lances: 50 },
    ],
  },
  {
    titulo: "Planilha de anotação — segunda partida",
  novaPagina: true,
    blocos: [{ tipo: "planilha", lances: 50 }],
  },
];

/* ------------------------------------------------------------------ *
 * As seções montadas a partir do conteúdo
 * ------------------------------------------------------------------ */

async function secaoDoTema(tag: string, nome: string, quantos: number): Promise<Secao> {
  const escrito = temaEscrito(tag);
  if (escrito === null) throw new Error(`"${tag}" não tem texto em content/temas.json`);

  const enunciado = ENUNCIADOS[tag];
  if (enunciado === undefined) throw new Error(`"${tag}" está no caderno sem enunciado`);


  const blocos: Bloco[] = [
    ...escrito.explicacao.map((texto): Bloco => ({ tipo: "paragrafo", texto })),
    { tipo: "subtitulo", texto: "O que procurar" },
    { tipo: "lista", itens: escrito.procure },
  ];

  if (escrito.cuidado !== undefined) {
    blocos.push({ tipo: "destaque", rotulo: "Cuidado:", texto: escrito.cuidado });
  }

  blocos.push(
    { tipo: "subtitulo", texto: "Resolva no papel" },
    {
      tipo: "paragrafo",
      texto:
        "Escreva o lance na linha de cada diagrama, em notação — do mesmo jeito " +
        "que você vai anotar no torneio. A resposta está no site, no tema deste " +
        "bloco.",
    },
    { tipo: "diagramas", pedido: enunciado, itens: await puzzlesDoTema(tag, quantos) },
  );

  return { titulo: nome, blocos };
}

export async function montar(): Promise<Caderno> {
  const secoes: Secao[] = [A_OLESC, REGRAS, ANOTACAO, await tresPerguntas()];

  // Os blocos que abrem no Sábado 1, na ordem do currículo. Ler a lista de
  // `blocos.ts` em vez de repetir as tags aqui é o que impede o caderno de
  // esquecer um tema que o site abriu.
  for (const bloco of BLOCOS.filter((b) => b.sabado === 1)) {
    const quantos = POR_TEMA[bloco.id];
    if (quantos === undefined) throw new Error(`o bloco ${bloco.id} entrou sem cota de problemas`);
    for (const tema of bloco.temas) {
      secoes.push(await secaoDoTema(tema.tag, tema.nome, quantos));
    }
  }

  secoes.push(aTarefa(), ...PLANILHAS);

  return {
    numero: 1,
    titulo: "Como funciona o torneio e como eu penso",
    sabado: "Sábado 1 · 12 de setembro de 2026",
    subtitulo:
      "As regras que pegam em torneio, as três perguntas antes de mover e os " +
      "primeiros padrões de mate. Leia com um tabuleiro do lado.",
    secoes,
  };
}
