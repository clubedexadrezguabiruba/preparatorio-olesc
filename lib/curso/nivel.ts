import { aprendeu, AULA_ZERADA, TRILHA, type ProgressoDaAula } from "../finais/trilha.ts";
import { BLOCOS } from "../tatica/blocos.ts";
import { etapaAtual, type Feitos } from "../tatica/serie.ts";

/**
 * A escada de níveis — o eixo do site, no lugar do calendário.
 *
 * ## O que este arquivo substituiu, e por quê
 *
 * Até 2026-09-09 o curso era **quatro semanas presas a datas**. `semanaAtual()`
 * lia o relógio e decidia o que o painel listava e o que a `/trilha` mostrava
 * como "ainda não chegou". Três coisas estavam erradas ao mesmo tempo:
 *
 * 1. **O portão por data não serve a uma turma de 700 a 1700.** Todos recebiam
 *    a mesma coisa no mesmo dia; ninguém adiantava nem revisava fora de hora.
 * 2. **O portão nem funcionava.** Os 36 temas já estavam escritos e
 *    `temaAberto()` devolvia `true` para todos: o "Abre no Sábado 2" da
 *    `/tatica` era código morto, e `/finais/[aula]` não checava semana nenhuma.
 * 3. **A escada que resolveria isso existia pela metade e estava quebrada.**
 *    O `lib/curso/trilha.ts` derivava o nível do **piso de rating do puzzle** —
 *    e como os oito blocos começam entre 700 e 1100, os 36 temas caíam todos no
 *    nível 1. O defeito estava admitido por escrito no próprio `mapa.ts`.
 *
 * A troca: **a data deixa de trancar qualquer coisa** e vira agenda dos
 * encontros presenciais (`SABADOS` fica em `calendario.ts`, sem poder de
 * tranca). O que governa é o nível, e o aluno sobe fechando o que o degrau
 * pede.
 *
 * ## Por que este arquivo não importa `calendario.ts`
 *
 * É o ponto inteiro. Se ele importasse, a data voltaria a ter voz na regra
 * pela porta dos fundos, e ninguém notaria até a segunda remarcação de sábado.
 * Também não importa `server-only`: a regra tem de rodar em `node --test`.
 *
 * ## O nível é **declarado** no dado, não derivado dele
 *
 * `Bloco.nivel` e `AulaDaTrilha.nivel` são campos escritos à mão. Foi derivar
 * que quebrou a escada anterior: qualquer fórmula sobre rating de puzzle ou
 * classe USCF é uma quinta escala de dificuldade discordando das outras
 * quatro. O currículo tem uma ordem pedagógica, e ela cabe num campo.
 */

export type Nivel = 1 | 2 | 3 | 4 | 5;

export const NIVEIS: readonly Nivel[] = [1, 2, 3, 4, 5];

export type DescricaoDoNivel = {
  readonly numero: Nivel;
  /** A faixa FIDE. Teto `null` = sem teto. */
  readonly fide: readonly [number, number | null];
  /** Uma linha: o que o aluno deste nível está aprendendo a fazer. */
  readonly resumo: string;
  /**
   * Quantas aulas de finais o nível pede — **declarado, não derivado**.
   *
   * Derivar de "todas as aulas do nível" faria o nível 4 pedir 16 aulas e o 1
   * pedir 6, sem que ninguém tenha decidido isso. O número é o mesmo em todos
   * os cinco porque é o que o orçamento de calendário mediu: quatro aulas
   * correndo em paralelo com os ~5 dias do repertório, que é o piso real do
   * nível. Ele é um botão — mexer aqui muda o custo de um degrau, e é para
   * isso que ele é um campo e não uma conta.
   *
   * O requisito que a tela cobra é `min(aulasParaFechar, publicadas)`; ver
   * {@link fechamentoDoNivel}.
   */
  readonly aulasParaFechar: number;
};

/**
 * ## Por que o rótulo é FIDE, e não chess.com
 *
 * FIDE ≈ rápidas do chess.com − 300/400. A turma (700–1700 rapid) ocupa de
 * ~400 a ~1350 FIDE. Rotulados em chess.com, o aluno de 1700 rapid leria
 * "1400+" no nível 5 e concluiria que pode pular os quatro de baixo. A
 * conversão é honesta, não inventada para produzir esse efeito — o efeito
 * acontece sozinho, e é o desejado.
 */
export const NIVEL: Record<Nivel, DescricaoDoNivel> = {
  1: {
    numero: 1,
    fide: [0, 800],
    resumo: "Ver o mate em um lance e não entregar peça de graça.",
    aulasParaFechar: 4,
  },
  2: {
    numero: 2,
    fide: [800, 1000],
    resumo: "Garfo, cravada, espeto, descoberto — o vocabulário que decide partida.",
    aulasParaFechar: 4,
  },
  3: {
    numero: 3,
    fide: [1000, 1200],
    resumo: "Os padrões de mate que se reconhecem de longe.",
    aulasParaFechar: 4,
  },
  4: {
    numero: 4,
    fide: [1200, 1400],
    resumo: "Mates de padrão avançado, e remover quem defende.",
    aulasParaFechar: 4,
  },
  5: {
    numero: 5,
    fide: [1400, null],
    resumo: "Ataque ao rei, lances finos, defesa e conversão.",
    aulasParaFechar: 4,
  },
};

/** Os níveis que são a meta declarada da OLESC de 2026. */
export const META_DA_OLESC: readonly Nivel[] = [1, 2, 3];

/**
 * Quantas linhas de repertório cada degrau acrescenta, **em acumulado**:
 * o nível 1 pede 4 aprendidas, o 2 pede 8, o 3 pede 12, o 4 pede 16.
 *
 * ## Acumulado, e não "4 novas por nível"
 *
 * Três razões. O aluno escolhe **quaisquer** linhas, que é a decisão do dono do
 * produto. Não é preciso atribuir linha a nível — atribuir seria criar a quinta
 * escala de dificuldade, exatamente o erro que esta escada conserta. E quem
 * adiantou repertório atravessa o portão de graça, o que é justo: ele fez o
 * trabalho.
 *
 * **O nível 5 não usa este número.** Ele cobra `baseCompleto()`. Os dois valem
 * o mesmo hoje (o Base tem 20 linhas), e é bonito que fechar o nível 5 e abrir
 * o repertório Avançado sejam o mesmo evento — mas se o Base mudar de tamanho,
 * o número mente e a função não.
 *
 * **O preço, medido:** uma linha aprendida exige `DEGRAU_APRENDIDA = 3`, cujos
 * intervalos são 1 e 3 dias — ~5 dias corridos. As 4 linhas treinam **em
 * paralelo**, na mesma sessão diária, então o piso é ~5 dias por nível, e não
 * 20. É o piso mais caro do degrau, e ele não encolhe sem mexer em
 * `DEGRAUS_EM_DIAS`, que rege o repertório fora dos níveis também.
 */
export const LINHAS_POR_NIVEL = 4;

/**
 * Acima de quantos itens vencidos na revisão o painel oferece a fila em lugar
 * do próximo passo do nível.
 *
 * Dois dias de fila a `REVISAO_POR_DIA = 10`. Não é cadeado — é o site
 * apontando para a casa antes de deixar mudar de bairro.
 */
export const REVISAO_ANTES_DO_AVANCO = 20;

/** Quantos puzzles a prova de nível serve, e quantos passam. */
export const PROVA_DE_NIVEL = { puzzles: 12, paraPassar: 9 } as const;

/* ------------------------------------------------------------------ *
 * O que cai em cada nível
 * ------------------------------------------------------------------ */

/** As tags de tática do nível, na ordem dos blocos. */
export function temasDoNivel(n: Nivel): readonly string[] {
  return BLOCOS.filter((b) => b.nivel === n).flatMap((b) => b.temas.map((t) => t.tag));
}

/** As aulas de finais do nível, na ordem da trilha (que é ordem de pré-requisito). */
export function aulasDoNivel(n: Nivel) {
  return TRILHA.filter((a) => a.nivel === n);
}

/**
 * Os temas de onde a prova de nível sorteia: os do nível **e os de todos os
 * anteriores**.
 *
 * Os anteriores entram porque o degrau 3 não pode deixar o aluno esquecer o
 * mate em 1 do degrau 1 — é a mesma razão pela qual a fila de revisão mistura
 * todos os níveis já percorridos. E porque a prova é a única medida do site que
 * **não diz o tema**: sortear só do degrau de cima entregaria metade da
 * resposta antes de o aluno olhar o tabuleiro.
 *
 * Mora aqui, e não em `lib/tatica/prova.ts`, porque é uma regra sobre a escada
 * e não sobre o banco de puzzles — e porque `prova.ts` é `server-only`, o que
 * a deixaria fora do `npm test`.
 */
export function temasDaProva(nivel: Nivel): string[] {
  return NIVEIS.filter((n) => n <= nivel).flatMap((n) => [...temasDoNivel(n)]);
}

/** Em que nível mora um tema de tática. `undefined` se a tag não é do currículo. */
export function nivelDoTema(tag: string): Nivel | undefined {
  return BLOCOS.find((b) => b.temas.some((t) => t.tag === tag))?.nivel;
}

/* ------------------------------------------------------------------ *
 * A trava mole
 * ------------------------------------------------------------------ */

/**
 * A situação de um item na tela. A data saiu; entrou o nível.
 *
 * ## Ordem: nível antes de texto
 *
 * O `lib/curso/trilha.ts` que morreu tinha a mesma ordem por outro argumento —
 * *"a data é o que o aluno controla: esperar"*. O argumento novo é mais forte:
 * o **nível** é o que ele controla ainda mais, porque ele o alcança fazendo
 * trabalho, e não esperando o relógio. "Em escrita" continua sendo o que ele
 * não controla. Anunciar "em escrita" num item três níveis acima expõe o
 * calendário de autoria a quem não tem o que fazer com ele.
 *
 * `"adiante"` **continua clicável**: ver {@link TRANCA_DURA}.
 */
export type Situacao = "aberto" | "adiante" | "em-escrita";

/**
 * A trava é mole: o nível governa o que o site **recomenda**, o que entra na
 * lista de casa e o que fecha o degrau — mas não bloqueia rota.
 *
 * Um item de nível acima aparece como "adiante", tracejado, e abre se o aluno
 * clicar. Não há prova de saída: todos percorrem o conteúdo inteiro, e a trava
 * mole é o que absorve isso — o aluno forte não fica preso, apenas não é
 * dirigido para frente.
 *
 * Este `false` existe para que endurecer depois de observar uma semana de dados
 * seja **uma linha**, e não uma caçada a `if`s pelas telas.
 */
export const TRANCA_DURA = false;

export function situacaoDoItem(doItem: Nivel, doAluno: Nivel, escrito: boolean): Situacao {
  if (doItem > doAluno) return "adiante";
  return escrito ? "aberto" : "em-escrita";
}

/** Clicável hoje. Existe para que nenhuma tela compare a string à mão. */
export function podeAbrir(s: Situacao): boolean {
  return TRANCA_DURA ? s === "aberto" : s !== "em-escrita";
}

/* ------------------------------------------------------------------ *
 * O fechamento de um nível
 * ------------------------------------------------------------------ */

export type ProgressoParaONivel = {
  /** O que o aluno fez em cada tema, da view `progresso_tema`. */
  readonly temas: ReadonlyMap<string, Feitos>;
  readonly finais: ReadonlyMap<string, ProgressoDaAula>;
  /** Os ids das aulas com JSON publicado em `content/lessons/`. */
  readonly publicadas: ReadonlySet<string>;
  /**
   * Os ids das aulas que têm a etapa 4, de `aulasComPratica()`. É o que decide
   * o que "aprendida" quer dizer em cada uma — substituiu a coluna `formato` da
   * trilha, apagada em 9/9/2026 junto com os três formatos.
   *
   * Entra como campo, e não por `import`, pelo mesmo motivo de `publicadas`:
   * quem lê o disco é `lib/finais/conteudo.ts`, que é `server-only`, e este
   * arquivo precisa continuar rodando no `node --test` sem servidor nenhum.
   */
  readonly comPratica: ReadonlySet<string>;
  /** Quantas linhas do repertório estão aprendidas, no total. */
  readonly linhasAprendidas: number;
  /** `baseCompleto()`, que é o requisito do nível 5 no lugar do número 20. */
  readonly baseCompleto: boolean;
};

export type FechamentoDoNivel = {
  readonly nivel: Nivel;
  readonly tatica: { readonly feitos: number; readonly total: number };
  /** Os quatro números, porque a tela mostra o clamp. */
  readonly finais: {
    readonly feitos: number;
    readonly exigidas: number;
    readonly declaradas: number;
    readonly publicadas: number;
  };
  readonly repertorio: { readonly feitas: number; readonly exigidas: number };
  readonly fechado: boolean;
};

/**
 * Um tema está fechado quando as três etapas acabaram — 5 + 24 + 10.
 *
 * ## Sem piso de acerto, deliberadamente
 *
 * `lib/tarefas/tarefas.ts` já decidiu o contrário por escrito: *"a caixa que
 * ele não consegue marcar por mais que trabalhe é a caixa que ensina a
 * desistir."* Quem pune acerto baixo é a fila de revisão, que já existe e já
 * derruba. Um segundo mecanismo de punição seriam duas réguas de "eu sei isto"
 * na mesma tela. O acerto aparece como **aviso** no cartão do nível, nunca como
 * cadeado.
 */
export function temaFechado(feitos: Feitos | undefined): boolean {
  return feitos !== undefined && etapaAtual(feitos) === null;
}

/**
 * As três trilhas do nível, com os números que a tela mostra.
 *
 * ## O clamp dos finais, e por que ele não é um remendo
 *
 * O requisito é `min(aulasParaFechar, publicadasDoNivel)`. Sem ele o nível 1
 * seria **incompletável** — zero aulas de classe E existem em disco hoje — e
 * ninguém sairia dele nunca. Os dois números vão para a tela juntos (*"Nível 2
 * · 1 de 4 aulas publicadas — o nível fecha com o que existe hoje"*), porque
 * um requisito que encolhe em silêncio é pior que um requisito alto.
 *
 * O preço declarado: **publicar uma aula nova encarece o nível para quem ainda
 * não passou.** O aluno A fecha o nível 2 com 1 aula publicada; o B, três
 * semanas depois, com 6 — mesmo selo, seis vezes o trabalho. O
 * `aulasParaFechar` declarado limita o dano; eliminá-lo exigiria congelar o
 * requisito por aluno na entrada do nível, o que esta escada não faz.
 */
export function fechamentoDoNivel(n: Nivel, p: ProgressoParaONivel): FechamentoDoNivel {
  const temas = temasDoNivel(n);
  const taticaFeitos = temas.filter((tag) => temaFechado(p.temas.get(tag))).length;

  const aulas = aulasDoNivel(n);
  const publicadas = aulas.filter((a) => p.publicadas.has(a.id)).length;
  const declaradas = NIVEL[n].aulasParaFechar;
  const exigidas = Math.min(declaradas, publicadas);
  const finaisFeitos = aulas.filter((a) =>
    aprendeu(p.comPratica.has(a.id), p.finais.get(a.id) ?? AULA_ZERADA),
  ).length;

  const exigidasNoRepertorio = LINHAS_POR_NIVEL * n;
  // O nível 5 chama a função, e não o número: os dois valem 20 hoje, mas se o
  // Base crescer, o número mente sobre o que é "o repertório inteiro".
  const repertorioOk = n === 5 ? p.baseCompleto : p.linhasAprendidas >= exigidasNoRepertorio;

  return {
    nivel: n,
    tatica: { feitos: taticaFeitos, total: temas.length },
    finais: { feitos: finaisFeitos, exigidas, declaradas, publicadas },
    repertorio: { feitas: p.linhasAprendidas, exigidas: exigidasNoRepertorio },
    fechado: taticaFeitos >= temas.length && finaisFeitos >= exigidas && repertorioOk,
  };
}

/**
 * O maior nível cuja prova já pode ser feita: o mais alto `N` tal que os níveis
 * 1 a `N` têm as três trilhas fechadas. `0` quando nem o nível 1 fechou.
 *
 * ## Por que `prontoParaProva`, e não `nivelAlcancado`
 *
 * Com a prova como último passo, o nível deixou de ser derivável só do
 * progresso: fechar as três trilhas te deixa **elegível**, e quem conquista é a
 * prova. Esta função pura responde *"pode fazer a prova do nível N"*; quem
 * responde *"está no nível N"* é {@link nivelDoAluno}, que lê o banco.
 *
 * A varredura para no primeiro nível não fechado porque a progressão é
 * sequencial: fechar o nível 4 sem ter fechado o 2 não abre prova nenhuma.
 */
export function prontoParaProva(p: ProgressoParaONivel): 0 | Nivel {
  let maior: 0 | Nivel = 0;
  for (const n of NIVEIS) {
    if (!fechamentoDoNivel(n, p).fechado) break;
    maior = n;
  }
  return maior;
}

/**
 * Em que nível o aluno **está**: o degrau seguinte ao mais alto que ele
 * conquistou.
 *
 * `conquistado` vem de `nivel_conquistado`, que é log e só cresce. Por isso a
 * conta é uma soma e não uma varredura: **o nível conquistado é gravado, não
 * derivado**. Se fosse recalculado do zero a cada carregamento, publicar uma
 * aula de finais nova rebaixaria quem já passou — e o aluno veria o site tirar
 * dele um selo que ele ganhou.
 *
 * Não recebe o progresso: `ProgressoParaONivel` não muda a resposta, e um
 * parâmetro que não muda a resposta é uma promessa falsa para quem chama.
 * Quem quer saber o que falta pergunta a {@link fechamentoDoNivel}.
 */
export function nivelDoAluno(conquistado: 0 | Nivel): Nivel {
  return Math.min(5, conquistado + 1) as Nivel;
}

/* ------------------------------------------------------------------ *
 * O próximo passo
 * ------------------------------------------------------------------ */

/**
 * Um alvo só por vez — é o cartão "Próximo passo" do painel.
 *
 * ## A ordem, e o que ela decide
 *
 * 1. **`revisao`**, e só acima de {@link REVISAO_ANTES_DO_AVANCO} itens
 *    vencidos. A fila vem antes de conteúdo novo porque é ela que impede o
 *    "aprendi e esqueci" — e ela mistura **todos os níveis já percorridos**, de
 *    graça, porque já é derivada de todas as linhas de `tentativas_puzzle`.
 * 2. **`tema` / `aula` / `linha`** — o que falta no nível, nesta ordem.
 * 3. **`prova-de-nivel`** — a prova é sempre a última coisa do nível. Ela é o
 *    selo, não o exame de admissão, e por construção só sobra quando as três
 *    trilhas fecharam.
 * 4. **`nivel-fechado`** — nada a fazer: o aluno conquistou o nível 5.
 */
export type ProximoPasso =
  | { readonly tipo: "revisao"; readonly vencidos: number }
  | { readonly tipo: "tema"; readonly tag: string; readonly nome: string; readonly href: string }
  | { readonly tipo: "aula"; readonly id: string; readonly nome: string; readonly href: string }
  | { readonly tipo: "linha"; readonly faltam: number }
  | { readonly tipo: "prova-de-nivel"; readonly nivel: Nivel }
  | { readonly tipo: "nivel-fechado" };

export function proximoPasso(
  doAluno: Nivel,
  p: ProgressoParaONivel,
  vencidosNaRevisao: number,
  conquistado: 0 | Nivel = 0,
): ProximoPasso {
  if (vencidosNaRevisao > REVISAO_ANTES_DO_AVANCO) {
    return { tipo: "revisao", vencidos: vencidosNaRevisao };
  }

  const fecho = fechamentoDoNivel(doAluno, p);

  const tema = temasDoNivel(doAluno).find((tag) => !temaFechado(p.temas.get(tag)));
  if (tema !== undefined) {
    const nome =
      BLOCOS.flatMap((b) => b.temas).find((t) => t.tag === tema)?.nome ?? tema;
    return { tipo: "tema", tag: tema, nome, href: `/tatica/${tema}` };
  }

  if (fecho.finais.feitos < fecho.finais.exigidas) {
    // A primeira publicada que ele ainda não aprendeu, na ordem da trilha —
    // que é ordem de pré-requisito, e não a ordem em que ele abriu as abas.
    const aula = aulasDoNivel(doAluno).find(
      (a) => p.publicadas.has(a.id) && !aprendeu(p.comPratica.has(a.id), p.finais.get(a.id) ?? AULA_ZERADA),
    );
    if (aula) return { tipo: "aula", id: aula.id, nome: aula.nome, href: `/finais/${aula.id}` };
  }

  const faltamLinhas =
    doAluno === 5
      ? p.baseCompleto
        ? 0
        : 1
      : Math.max(0, fecho.repertorio.exigidas - fecho.repertorio.feitas);
  if (faltamLinhas > 0) return { tipo: "linha", faltam: faltamLinhas };

  if (fecho.fechado && conquistado < doAluno) {
    return { tipo: "prova-de-nivel", nivel: doAluno };
  }

  return { tipo: "nivel-fechado" };
}
