/**
 * A régua de desenho, símbolo e convenção de uma aula de finais — a máquina embaixo dos
 * cinco revisores (17/9/2026).
 *
 * ## O princípio: detectar é conta, consertar é julgamento
 *
 * Uma trava sabe dizer *"o 3º nó do treino 1 não aponta alvo"*. Ela **não sabe qual casa
 * acender** — isso é xadrez, e é por isso que quem conserta é um agente e não este arquivo.
 * O que mora aqui roda em um segundo, custa zero, nunca cansa e vale para sempre.
 *
 * ## Por que tudo aqui é aviso, e não erro
 *
 * Porque a régua é nova e o conteúdo é velho: as 11 aulas de finais no ar foram escritas
 * antes dela. Promover isto a erro travaria a publicação de tudo por uma dívida que não é
 * de nenhuma aula em particular — e a decisão do Doug de 15/9/2026 já governa o caso ("o
 * professor tem a última palavra"). A lista aparece, os agentes a consertam, e o que sobra
 * é decisão de quem lê. A régua de voz entrou por este mesmo caminho em 13/9.
 *
 * ## O que ela NÃO cobra, e por quê
 *
 * - **"Prática: zero desenho"** não vira regra: `praticaV2Schema` não tem campo de desenho,
 *   então a prática de uma aula v2 é estruturalmente nua. Quem confere isso é o aluno de
 *   Playwright, na tela, que é onde um desenho poderia reaparecer por acidente de montagem.
 * - **"Capítulo que não vira etapa nenhuma"** já é `CAPITULO_FORA_DO_FLUXO`, em `modelo.ts`.
 * - **Os três números da voz** (caracteres, palavras, palavra proibida) já são cobrados pela
 *   régua de `lib/lesson/regua.ts`. Duas cópias de um teto seriam duas opiniões sobre ele.
 */
import { Chess } from "chess.js";
import type { Position } from "../lesson/schema.ts";
import { ehAulaDeFinais } from "./dominio.ts";
import { previaDaAula } from "./previa.ts";
import { fenDaQuestaoDoTreino } from "./propriedade-treino.ts";
import type { AulaV2, DesenhoV2, ProblemaV2, QuestaoTreinoV2, TreinoV2 } from "./modelo.ts";

/**
 * Uma casa citada numa fala: `d6`, `e4` — **e também a casa dentro de um lance escrito**.
 *
 * A primeira versão era `\b[a-h][1-8]\b`, e ela não lê `Re7`: entre o `R` e o `e` não há
 * fronteira de palavra. Numa aula que escreve os lances em português — e todas escrevem, é a
 * regra de 17/9 — isso acusava "casa acesa sem citação" em passos onde a fala citara a casa,
 * como *"as Brancas jogavam **Re7**"*. Falso positivo da régua, não dívida da aula.
 *
 * Então a casa conta também quando vem depois da letra de uma peça (`R`, `D`, `T`, `B`, `C`, e
 * as inglesas), de um `x` de captura, ou da coluna de um peão que captura (`exd5`). O que
 * continua não contando é casa colada em palavra: "Fase1" não é casa.
 */
const CASA = /(?<![\p{L}\p{N}])(?:[RDTBCKQN]|[a-h])?x?([a-h][1-8])(?![\p{L}\p{N}])/gu;

/** As casas que uma fala cita, sem repetir. */
function casasCitadas(fala: string): string[] {
  return [...new Set([...fala.matchAll(CASA)].map((m) => m[1]))];
}

/** No máximo três desenhos num passo; do quarto em diante, o problema é a fala (§14.3). */
export const DESENHOS_POR_PASSO = 3;

/** As casas que um desenho acende ou aponta, nas duas grafias que o schema aceita. */
export function casasDoDesenho(desenho: DesenhoV2 | undefined): string[] {
  if (!desenho) return [];
  const das = (desenho.highlights ?? []).map((h) => (typeof h === "string" ? h : h.casa));
  const dos = (desenho.arrows ?? []).flatMap((a) => (Array.isArray(a) ? a : [a.de, a.para]));
  return [...das, ...dos];
}

/** Este desenho aponta alguma coisa? `{}` e `{ arrows: [] }` não apontam. */
export function apontaAlgo(desenho: DesenhoV2 | undefined): boolean {
  return casasDoDesenho(desenho).length > 0;
}

/** As casas **acesas** — sem as pontas das setas. Ver `casasCitadasEDesenhadas`. */
function casasAcesas(desenho: DesenhoV2 | undefined): string[] {
  return (desenho?.highlights ?? []).map((h) => (typeof h === "string" ? h : h.casa));
}

/**
 * Quantos desenhos há neste passo — **formas**, não pontas.
 *
 * Uma seta `c2→c8` é **um** desenho, não dois: ela diz "esta coluna". Contar as pontas faria
 * a escada de torres, que desenha duas colunas por passo, parecer ter quatro desenhos.
 */
function quantosDesenhos(desenho: DesenhoV2 | undefined): number {
  return (desenho?.arrows?.length ?? 0) + (desenho?.highlights?.length ?? 0);
}

/** As setas de um desenho, sempre como par `[de, para]`. */
function setas(desenho: DesenhoV2 | undefined): Array<[string, string]> {
  return (desenho?.arrows ?? []).map((a) => (Array.isArray(a) ? [a[0], a[1]] : [a.de, a.para]));
}

/** Os treinos na ordem do fluxo — a única ordem pedagógica (§18), e a que define "treino 1". */
export function treinosNoFluxo(aula: AulaV2): TreinoV2[] {
  const porId = new Map(aula.treinos.map((treino) => [treino.id, treino]));
  const ordenados: TreinoV2[] = [];
  for (const etapa of aula.fluxo) {
    if (etapa.tipo !== "treino") continue;
    const treino = porId.get(etapa.entidadeId);
    if (treino) ordenados.push(treino);
  }
  // Treino fora do fluxo já tem problema próprio (`TREINO_FORA_DO_FLUXO`); aqui ele entra no fim
  // para não sumir da régua de desenho por causa de um defeito de outra régua.
  for (const treino of aula.treinos) if (!ordenados.includes(treino)) ordenados.push(treino);
  return ordenados;
}

const aviso = (aula: AulaV2, codigo: string, mensagem: string, onde: Record<string, string> = {}): ProblemaV2 => ({
  codigo,
  severidade: "aviso",
  mensagem,
  localizacao: { aulaId: aula.id, ...onde },
});

const ordinal = (n: number) => `${n}º`;

/**
 * O apoio cai por degraus (`COMO-FAZER` §1.1, 17/9/2026): treino 1 aponta o alvo em todo nó,
 * do treino 2 em diante nenhum nó aponta. Aula com um treino só cai na primeira linha.
 *
 * O apoio que sai é o de **antes** do lance. O de depois — a fala e o erro com nome — fica em
 * todos os treinos, e nada aqui o toca.
 */
function degrausDoApoio(aula: AulaV2): ProblemaV2[] {
  const treinos = treinosNoFluxo(aula);
  return treinos.flatMap((treino, indice) => {
    const primeiro = indice === 0;
    return treino.questoes.flatMap((questao, i) => {
      const aponta = apontaAlgo(questao.desenhos);
      if (primeiro && !aponta) {
        return [aviso(aula, "DESENHO_TREINO_SEM_ALVO", `no treino «${treino.titulo}» — o primeiro da aula —, a ${i + 1}ª pergunta não aponta alvo nenhum: o treino 1 aquece, e todo nó dele pede seta ou casa acesa. Escreva o desenho no comentário daquele lance no PGN (\`{ [%csl Gd6] }\`)`, { treinoId: treino.id, questaoId: questao.id })];
      }
      if (!primeiro && aponta) {
        return [aviso(aula, "DESENHO_TREINO_COM_ALVO", `no treino «${treino.titulo}» — o ${ordinal(indice + 1)} da aula —, a ${i + 1}ª pergunta acende ${casasDoDesenho(questao.desenhos).join(", ")} antes de o aluno mexer: do treino 2 em diante o alvo não é apontado, senão ele reconhece a resposta em vez de buscá-la`, { treinoId: treino.id, questaoId: questao.id })];
      }
      return [];
    });
  });
}

/** A seta que liga a origem ao destino do lance certo é meio lance entregue (§14.3). */
function setaQueEntregaOLance(aula: AulaV2): ProblemaV2[] {
  return aula.treinos.flatMap((treino) => treino.questoes.flatMap((questao, i) => {
    const certos = questao.respostas.filter((r) => r.julgamento === "correta").flatMap((r) => r.moves);
    return setas(questao.desenhos)
      .filter(([de, para]) => certos.some((move) => move.startsWith(`${de}${para}`)))
      .map(([de, para]) => aviso(aula, "DESENHO_ENTREGA_O_LANCE", `no treino «${treino.titulo}», a ${i + 1}ª pergunta desenha a seta ${de}→${para}, que é o lance certo: isso é meio lance entregue. A seta aponta o alvo, não o caminho`, { treinoId: treino.id, questaoId: questao.id }));
  }));
}

/**
 * Casa citada é casa desenhada — **e casa acesa é casa citada**. A segunda metade é o teto
 * contra a poluição visual, e é ela que impede o revisor de desenho de encher a tela.
 *
 * ## Por que o teto vale para a casa acesa e não para a seta (medido em 18/9/2026)
 *
 * A primeira versão desta régua cobrava a citação das **pontas da seta**, e devolveu 183
 * achados nas 11 aulas — quase todos da forma "o 2º passo desenha c2, c8, b1, b8 sem que a
 * fala cite". Olhando: são **duas setas** de coluna, na escada de torres, e a fala diz "a
 * torre fecha a coluna b". A seta é uma **linha**, e o que ela afirma é a linha, não as duas
 * casas das pontas; exigir que a fala soletre `b1` e `b8` é cobrar o contrário de "uma
 * palavra por ideia". A casa **acesa**, essa sim, é um ponto, e um ponto que a fala não
 * nomeia é ruído.
 *
 * As pontas da seta continuam valendo no outro sentido: casa citada que uma seta aponta
 * **está** confirmada no tabuleiro, e não é órfã.
 *
 * O lance do passo desenha a si mesmo: o chessground acende origem e destino como `lastMove`,
 * então citar a casa de onde a peça saiu não pede desenho nenhum.
 *
 * **O passo mudo é exceção, e tem de ser.** Desde 17/9/2026 nenhum lance precisa de comentário
 * (regra global do Doug, `AGENTS.md`). Num passo sem fala nenhuma, o desenho é o único
 * comentário que existe: cobrar dele "a fala não cita esta casa" seria reintroduzir pela porta
 * dos fundos a trava que o Doug tirou. O teto vale onde **há** fala e ela não nomeia o que o
 * tabuleiro acende — que é o caso do ruído de verdade.
 */
function casasCitadasEDesenhadas(aula: AulaV2, positions: Record<string, Position>): ProblemaV2[] {
  const problemas: ProblemaV2[] = [];
  for (const trecho of previaDaAula(aula, positions).trechos) {
    for (const [i, passo] of trecho.passos.entries()) {
      if (passo.retorno || passo.recuo) continue;
      const desenhadas = casasDoDesenho(passo.desenhos);
      const citadas = casasCitadas(passo.fala);
      const doLance = passo.lance ? [passo.lance.slice(0, 2), passo.lance.slice(2, 4)] : [];
      const visiveis = new Set([...desenhadas, ...doLance]);
      const orfas = citadas.filter((casa) => !visiveis.has(casa));
      const mudas = passo.fala.trim() ? [...new Set(casasAcesas(passo.desenhos))].filter((casa) => !citadas.includes(casa)) : [];
      const quantos = quantosDesenhos(passo.desenhos);
      const onde = { capituloId: trecho.capituloId, nodeId: passo.nodeId };
      if (orfas.length) problemas.push(aviso(aula, "CASA_CITADA_SEM_DESENHO", `em «${trecho.titulo}», o ${ordinal(i + 1)} passo cita ${orfas.join(", ")} e não desenha nada ali — o aluno lê a casa e o tabuleiro não a confirma`, onde));
      if (mudas.length) problemas.push(aviso(aula, "CASA_ACESA_SEM_CITACAO", `em «${trecho.titulo}», o ${ordinal(i + 1)} passo acende ${mudas.join(", ")} sem que a fala cite — casa acesa que a fala não menciona é ruído; ou a fala ganha a casa, ou o desenho sai`, onde));
      if (quantos > DESENHOS_POR_PASSO) problemas.push(aviso(aula, "DESENHO_DEMAIS", `em «${trecho.titulo}», o ${ordinal(i + 1)} passo tem ${quantos} desenhos (o teto é ${DESENHOS_POR_PASSO}) — quando um passo precisa de tantos, o que há de errado é a fala: são duas ideias numa só`, onde));
    }
  }
  return problemas;
}

/**
 * **Toda variante de capítulo de treino carrega símbolo.**
 *
 * O símbolo não é enfeite: é o que decide o que a importação faz com a variante —
 * `!`/`!!` vira resposta aceita, `?`/`??`/`?!` vira erro com nome, e a variante sem símbolo
 * **e sem mate** vira erro mudo (`importar-estudo.ts:499` já avisa disso na importação). É
 * promover aquele aviso a régua permanente, para ele não morrer no terminal.
 *
 * Aqui a aula já está montada, então o que se lê é o resultado: resposta de erro cujo nome
 * veio do texto de reserva ("Este lance não é o da lição") é a marca de uma variante que
 * chegou sem símbolo e sem comentário.
 */
const ERRO_MUDO = "Este lance não é o da lição. Tente de novo.";

function variantesSemSimbolo(aula: AulaV2, positions: Record<string, Position>): ProblemaV2[] {
  return aula.treinos.flatMap((treino) => treino.questoes.flatMap((questao, i) => {
    return questao.respostas
      .filter((resposta) => resposta.julgamento === "erro" && resposta.feedback === ERRO_MUDO)
      .map((resposta) => aviso(aula, "VARIANTE_SEM_SIMBOLO", `no treino «${treino.titulo}», a ${i + 1}ª pergunta trata ${sanDaResposta(aula, treino, questao, resposta.moves[0], positions)} como erro sem nome: a variante chegou do estudo sem símbolo e sem comentário. Ponha \`?\` ou \`??\` e uma frase no PGN, ou o aluno erra e não fica sabendo por quê`, { treinoId: treino.id, questaoId: questao.id, respostaId: resposta.id }));
  }));
}

function sanDaResposta(aula: AulaV2, treino: TreinoV2, questao: QuestaoTreinoV2, uci: string, positions: Record<string, Position>): string {
  try {
    const jogo = new Chess(fenDaQuestaoDoTreino(aula, treino, questao, positions));
    return jogo.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.slice(4) || undefined }).san;
  } catch {
    return uci;
  }
}

/**
 * As duas convenções de montagem que são conta e não precisam de agente (`COMO-FAZER` §1).
 *
 * 1. **`LEMBRE-SE` tem de 1 a 3 regras.** Zero é um capítulo vazio; quatro é uma lista que
 *    ninguém decora.
 *
 *    **A linha-título não é regra**, e a primeira versão desta conta a somava: o piloto
 *    `N0-Q-MATE` escreve `LEMBRE-SE:` sozinho na primeira linha e depois as três regras
 *    numeradas, e a régua acusava quatro. Dois revisores acharam o defeito no mesmo dia, e ele
 *    era meu, não da aula. Quando a lista vem numerada, é a numeração que conta — é assim que
 *    o professor as escreve, e é assim que o aluno as lê.
 * 2. **O primeiro quadro da introdução é a pergunta** ("Ganha, empata ou perde?"). A resposta
 *    vem no quadro seguinte; abrir pela resposta é entregar o que a aula ia cobrar.
 */
/** A linha que só anuncia o capítulo: `LEMBRE-SE`, `LEMBRE-SE:`, `Lembre-se`. Não é regra. */
const SO_O_TITULO = /^lembre-?se\s*:?\s*$/i;

/** As regras de um `LEMBRE-SE`: as numeradas, se houver numeração; senão, as linhas de texto. */
export function regrasDoLembreSe(textos: string[]): string[] {
  const linhas = textos
    .flatMap((texto) => texto.split(/\n+/))
    .map((linha) => linha.trim())
    .filter((linha) => linha && !SO_O_TITULO.test(linha));
  const numeradas = linhas.filter((linha) => /^\d+[.)]\s/.test(linha));
  return numeradas.length ? numeradas : linhas;
}

function convencaoDeMontagem(aula: AulaV2): ProblemaV2[] {
  const problemas: ProblemaV2[] = [];
  for (const capitulo of aula.capitulos) {
    if (!/lembre-?se/i.test(capitulo.titulo)) continue;
    const regras = regrasDoLembreSe(capitulo.narracoes.map((narracao) => narracao.texto));
    if (regras.length < 1 || regras.length > 3) {
      problemas.push(aviso(aula, "LEMBRE_SE_REGRAS", `o capítulo «${capitulo.titulo}» tem ${regras.length} regra(s), e o LEMBRE-SE leva de 1 a 3 — ${regras.length === 0 ? "sem nenhuma, ele é uma tela em branco" : "uma lista de quatro ninguém decora"}`, { capituloId: capitulo.id }));
    }
  }
  const primeiro = aula.introducoes[0]?.quadros[0];
  if (primeiro && !primeiro.texto.includes("?")) {
    problemas.push(aviso(aula, "QUADRO_1_NAO_PERGUNTA", `o primeiro quadro da introdução não faz pergunta nenhuma: ele é o "Ganha, empata ou perde?" da aula, e a resposta vem no quadro seguinte`, { introducaoId: aula.introducoes[0].id, quadroId: primeiro.id }));
  }
  return problemas;
}

/**
 * As regras desta régua, **uma por código**, prontas para entrar em `REGRAS_PUBLICACAO_V2`.
 *
 * ## Por que uma por código, e não uma "régua de desenho" só
 *
 * Porque o contrato de §19 é esse: cada regra da lista tem de poder ser **desligada sozinha**,
 * e é assim que o teste prova que o vermelho que ela produz é dela e não de outra. Uma regra
 * guarda-chuva desligaria oito coisas de uma vez, e a prova não provaria nada.
 *
 * A prova forte de cada uma — ela **pega** o estrago e **cala** quando o estrago é desfeito —
 * está em `regua-de-desenho.test.ts`, que é onde ela cabe: aqui só mora o registro.
 *
 * **Só finais** (escopo que o Doug fixou em 17/9): a aula de abertura tem outro contrato — ela
 * tem move trainer, o "treino 1" dela não é aquecimento de técnica, e cobrar dela a régua de
 * finais encheria a conferência de aviso que ninguém pediu. Aberturas e partida modelo depois.
 */
export type RegraDeDesenhoV2 = {
  codigo: string;
  impede: string;
  julgar: (aula: AulaV2, contexto: { positions: Record<string, Position> }) => ProblemaV2[];
};

/** Um código só, da família toda: é assim que a lista fica com uma entrada por código. */
const so = (codigo: string, impede: string, todos: (aula: AulaV2, positions: Record<string, Position>) => ProblemaV2[]): RegraDeDesenhoV2 => ({
  codigo,
  impede,
  julgar: (aula, contexto) => (ehAulaDeFinais(aula.id) ? todos(aula, contexto.positions).filter((p) => p.codigo === codigo) : []),
});

export const REGRAS_DE_DESENHO_V2: RegraDeDesenhoV2[] = [
  so("DESENHO_TREINO_SEM_ALVO", "aviso: nó do treino 1 sem alvo apontado — publica", (a) => degrausDoApoio(a)),
  so("DESENHO_TREINO_COM_ALVO", "aviso: alvo apontado do treino 2 em diante — publica", (a) => degrausDoApoio(a)),
  so("DESENHO_ENTREGA_O_LANCE", "aviso: seta ligando a origem ao destino do lance certo — publica", (a) => setaQueEntregaOLance(a)),
  so("CASA_CITADA_SEM_DESENHO", "aviso: fala que cita uma casa que o tabuleiro não confirma — publica", (a, p) => casasCitadasEDesenhadas(a, p)),
  so("CASA_ACESA_SEM_CITACAO", "aviso: casa acesa que a fala não menciona — publica", (a, p) => casasCitadasEDesenhadas(a, p)),
  so("DESENHO_DEMAIS", "aviso: passo com mais desenhos do que uma ideia pede — publica", (a, p) => casasCitadasEDesenhadas(a, p)),
  so("VARIANTE_SEM_SIMBOLO", "aviso: variante de treino que virou erro mudo — publica", (a, p) => variantesSemSimbolo(a, p)),
  so("LEMBRE_SE_REGRAS", "aviso: LEMBRE-SE com menos de 1 ou mais de 3 regras — publica", (a) => convencaoDeMontagem(a)),
  so("QUADRO_1_NAO_PERGUNTA", "aviso: primeiro quadro da introdução que não faz pergunta — publica", (a) => convencaoDeMontagem(a)),
];

/** Tudo o que esta régua tem a dizer sobre uma aula, na ordem das regras. Só avisos. */
export function problemasDeDesenhoV2(aula: AulaV2, positions: Record<string, Position>): ProblemaV2[] {
  return REGRAS_DE_DESENHO_V2.flatMap((regra) => regra.julgar(aula, { positions }));
}
