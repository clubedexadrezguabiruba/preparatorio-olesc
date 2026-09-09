import { NIVEIS, type Nivel } from "./nivel.ts";

/**
 * Os selos: o que o aluno **já conquistou**, e o que falta para o próximo.
 *
 * ## Nenhuma tabela, nenhuma migration, nenhuma consulta a mais
 *
 * Tudo o que um selo precisa o painel já lê para desenhar as barras. Este
 * arquivo é uma **função pura** sobre esses números — o mesmo padrão de
 * `fechamentoDoNivel` e `proximaAcao`, e pelo mesmo motivo: uma regra que fala
 * com o banco é uma regra que o `node --test` não cobre.
 *
 * ## A armadilha da janela de 30 dias
 *
 * O painel lia os minutos de **apenas 30 dias**, e o comentário explicava por
 * quê: *"o preparatório inteiro tem quatro semanas"*. Certo para o cartão
 * "Hoje"; **errado para um selo**, que é permanente. "Uma hora" ganho no dia 1
 * sumiria no dia 32, e "30 dias seguidos" seria inconquistável dentro de uma
 * janela de 30.
 *
 * O conserto é não passar `desde` a `minutosPorDia` — o parâmetro já era
 * opcional — e recortar os 30 dias em memória para o cartão. E o que entra aqui
 * é a **maior** sequência já atingida (`maiorSequenciaDeDias`), não a atual: um
 * selo que some quando o aluno falta um dia é o site tirando dele uma coisa que
 * ele fez.
 *
 * ## Por que a V1 é pequena
 *
 * Porque ainda não sabemos se os alunos vão olhar para os selos. Seis famílias,
 * e o resto fica escrito no plano: puzzles resolvidos (100/250/500/1000) e
 * pontaria (80% em 100+) ficam para a V2. **Cortado de vez:** "Sem rede" —
 * passar a prova de primeira —, porque `ultimaProvaDeNivel()` devolve
 * `{acertos, total, passou, erros}` e **não** o número da tentativa. Um selo
 * raro não vale uma migration.
 *
 * ## Selo trancado diz o que falta
 *
 * Sempre. Um selo apagado sem condição escrita é decoração — ele mostra que
 * existe uma coisa boa e esconde como chegar lá, que é o oposto de um
 * treinador. É por isso que {@link Selo} tem `falta` e não um booleano.
 */

export type Familia = "tatica" | "finais" | "repertorio" | "nivel" | "hora" | "constante";

export type Selo = {
  /** Único, e estável: ele vira `key` de lista e um dia vira linha de banco. */
  readonly id: string;
  readonly familia: Familia;
  /** O que o selo diz quando ganho. Curto — cabe numa pastilha de celular. */
  readonly nome: string;
  /** Uma linha: o que ele significa. Aparece no ganho e no trancado. */
  readonly conta: string;
  readonly ganho: boolean;
  /** O que falta, escrito. `null` quando o selo já é dele. */
  readonly falta: string | null;
};

/**
 * Os degraus de cada família numérica. Números, e não fórmula: são decisão.
 *
 * `readonly number[]` e não `as const` na leitura: com os literais o TypeScript
 * sabe que `degrau` nunca é 1 na tática e reprova a comparação que escreve
 * "1 tema" — o que está certo hoje e vira um erro de compilação na primeira vez
 * que alguém acrescentar um degrau 1. O tipo declarado deixa a lista ser dado.
 */
export const DEGRAUS: Record<"tatica" | "finais" | "constante", readonly number[]> = {
  /**
   * **13 no lugar de 10**, e o motivo é o currículo: 13 é a meta da OLESC (os
   * temas dos níveis 1 a 3), o número que a `/trilha` já celebra. Um selo em 13
   * é *"cheguei ao torneio pronto"*; um selo em 10 é um número redondo.
   */
  tatica: [3, 7, 13, 24, 36],
  /**
   * **O degrau 1 existe para ser alcançável hoje.** São 49 aulas na taxonomia e
   * 2 publicadas. Os degraus 5, 10, 25 e 49 já ficam escritos e acendem sozinhos
   * conforme as aulas forem publicadas — nenhum código muda quando isso
   * acontecer.
   */
  finais: [1, 5, 10, 25, 49],
  /** Dias seguidos de treino **medido**. A partida declarada não os sustenta. */
  constante: [3, 7, 14, 30],
};

/**
 * O que a decisão precisa. Tudo já está na memória do painel quando ele chama.
 */
export type ParaOsSelos = {
  /** Temas de tática fechados (as três etapas), no curso inteiro. */
  readonly temasFechados: number;
  /** Aulas de finais aprendidas, entre as publicadas. */
  readonly aulasAprendidas: number;
  readonly repertorio: {
    readonly brancasCompletas: boolean;
    readonly pretasCompletas: boolean;
    readonly baseCompleto: boolean;
    readonly avancadoCompleto: boolean;
  };
  /** O maior nível cuja prova ele passou. 0 se nenhuma. */
  readonly conquistado: 0 | Nivel;
  /** Em quantos dias distintos ele já treinou 60 minutos medidos. */
  readonly diasComUmaHora: number;
  /** A **maior** sequência de dias seguidos já atingida — não a atual. */
  readonly maiorSequencia: number;
};

function plural(n: number, um: string, muitos: string): string {
  return `${n} ${n === 1 ? um : muitos}`;
}

/** Um selo de degrau numérico, com o "faltam N" já escrito. */
function porDegrau(
  familia: Familia,
  degrau: number,
  tem: number,
  nome: string,
  conta: string,
  unidade: [string, string],
): Selo {
  const ganho = tem >= degrau;
  const quantos = degrau - tem;
  return {
    id: `${familia}-${degrau}`,
    familia,
    nome,
    conta,
    ganho,
    // O verbo concorda junto com o substantivo: "faltam 1 tema" é o tipo de
    // detalhe que uma criança de 11 anos lê como descuido, e ela não está errada.
    falta: ganho
      ? null
      : `${quantos === 1 ? "falta" : "faltam"} ${plural(quantos, unidade[0], unidade[1])}`,
  };
}

/** Um selo que não conta: ou aconteceu, ou não. */
function porCondicao(
  familia: Familia,
  id: string,
  ganho: boolean,
  nome: string,
  conta: string,
  falta: string,
): Selo {
  return { id, familia, nome, conta, ganho, falta: ganho ? null : falta };
}

/**
 * Todos os selos da V1, na ordem em que eles aparecem na tela.
 *
 * A lista sai **inteira**, ganhos e trancados juntos: quem recorta é a tela, e é
 * ela que decide mostrar os ganhos e os dois próximos. Uma função que já
 * devolvesse só o recorte esconderia dos testes exatamente a parte que interessa
 * — o que acontece com o selo que ainda falta.
 */
export function selos(p: ParaOsSelos): Selo[] {
  const lista: Selo[] = [];

  for (const degrau of DEGRAUS.tatica) {
    lista.push(
      porDegrau(
        "tatica",
        degrau,
        p.temasFechados,
        `${degrau} temas de tática`,
        degrau === 13
          ? "Os 13 temas dos níveis 1 a 3 — a meta da OLESC."
          : "Um tema fecha com aquecimento, série e prova.",
        ["tema", "temas"],
      ),
    );
  }

  for (const degrau of DEGRAUS.finais) {
    lista.push(
      porDegrau(
        "finais",
        degrau,
        p.aulasAprendidas,
        `${degrau} ${degrau === 1 ? "aula" : "aulas"} de finais`,
        "Cada aula é certificada pela tablebase, em três dias diferentes.",
        ["aula", "aulas"],
      ),
    );
  }

  lista.push(
    porCondicao(
      "repertorio",
      "repertorio-brancas",
      p.repertorio.brancasCompletas,
      "Repertório de brancas",
      "Todas as linhas de brancas do Base, aprendidas.",
      "termine as linhas de brancas do Base",
    ),
    porCondicao(
      "repertorio",
      "repertorio-pretas",
      p.repertorio.pretasCompletas,
      "Repertório de pretas",
      "Todas as linhas de pretas do Base, aprendidas.",
      "termine as linhas de pretas do Base",
    ),
    porCondicao(
      "repertorio",
      "repertorio-base",
      p.repertorio.baseCompleto,
      "O Base inteiro",
      "O repertório do clube, de ponta a ponta. É ele que abre o Avançado.",
      "termine as duas cores do Base",
    ),
    porCondicao(
      "repertorio",
      "repertorio-avancado",
      p.repertorio.avancadoCompleto,
      "O Avançado inteiro",
      "As linhas que só abrem depois do Base.",
      "termine o Base e depois o Avançado",
    ),
  );

  for (const n of NIVEIS) {
    lista.push(
      porCondicao(
        "nivel",
        `nivel-${n}`,
        p.conquistado >= n,
        `Nível ${n}`,
        "A prova do degrau: 12 puzzles misturados, sem dizer o tema.",
        n === (p.conquistado as number) + 1
          ? "feche as três frentes e faça a prova"
          : `conquiste antes o nível ${n - 1}`,
      ),
    );
  }

  lista.push(
    porCondicao(
      "hora",
      "hora-1",
      p.diasComUmaHora > 0,
      "Uma hora",
      "Um dia inteiro de treino medido pelo site: 60 minutos.",
      "treine 60 minutos medidos num mesmo dia",
    ),
  );

  for (const degrau of DEGRAUS.constante) {
    lista.push(
      porDegrau(
        "constante",
        degrau,
        p.maiorSequencia,
        `${degrau} dias seguidos`,
        "Dias seguidos com 60 minutos de treino no site. A partida declarada não conta.",
        ["dia", "dias"],
      ),
    );
  }

  return lista;
}

/** Os que ele já tem. */
export function ganhos(lista: readonly Selo[]): Selo[] {
  return lista.filter((s) => s.ganho);
}

/**
 * Os `quantos` mais próximos, um por família.
 *
 * **Um por família**, e não os primeiros da lista: sem isso os dois próximos
 * seriam sempre os dois degraus seguintes de tática, e o aluno nunca ficaria
 * sabendo que existe um selo de constância. O ponto de mostrar o que falta é
 * mostrar o **leque**, não o próximo passo — quem responde "o próximo passo" é o
 * cartão AGORA, e ele não divide esse trabalho com ninguém.
 */
export function proximos(lista: readonly Selo[], quantos = 2): Selo[] {
  const vistas = new Set<Familia>();
  const escolhidos: Selo[] = [];
  for (const selo of lista) {
    if (selo.ganho || vistas.has(selo.familia)) continue;
    vistas.add(selo.familia);
    escolhidos.push(selo);
    if (escolhidos.length === quantos) break;
  }
  return escolhidos;
}
