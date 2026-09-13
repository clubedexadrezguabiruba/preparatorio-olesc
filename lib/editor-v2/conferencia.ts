/**
 * O que impede publicar uma aula v2 — especificação §19.3 e §20.1, plano final §13.
 *
 * ## A régua de duas alturas
 *
 * `problemasDaAulaV2` é a régua do **rascunho**: ela aponta tudo, e parte do que aponta é
 * aviso de propósito, porque o professor precisa conseguir guardar uma aula no meio do
 * caminho (plano §7). Várias dessas conferências trazem escrito, no próprio comentário,
 * "quando a publicação v2 existir, esta passa a impedir". Este arquivo é essa publicação.
 *
 * `problemasParaPublicarV2` usa a mesma régua e sobe a altura em dois movimentos:
 *
 * 1. **promove** a erro quatro avisos do rascunho — proveniência caduca ou divergente, FEN
 *    importada sem revisão e revisão pendente (§5: "revisões obrigatórias devem ser
 *    resolvidas antes da publicação");
 * 2. **acrescenta** as regras que só fazem sentido para publicar: certificação pendente,
 *    caduca ou refutada; a prática única; e a revisão de avaliação gravada que não é a que
 *    o conteúdo produz.
 *
 * A régua de voz entra aqui como **aviso, sempre** (decisão do Doug, 13/9/2026): ela é
 * editorial, e a última palavra é do professor.
 *
 * ## Por que uma lista de regras, e não uma função comprida
 *
 * O plano §19 exige, para cada regra impeditiva nova, a prova de que **desligá-la faz o
 * estrago passar**. Uma lista com código é o que deixa o teste desligar uma regra só e ver
 * o vermelho sumir — sem isso a prova seria "a regra existe", que não prova nada.
 *
 * ## Onde roda
 *
 * No servidor (o hash da posição e o da certificação vêm do `node:crypto`). A tela recebe o
 * resultado pronto, pela action do botão Conferir.
 */
import { reprovacoes, type Fala, type Regua } from "../lesson/regua.ts";
import type { Position } from "../lesson/schema.ts";
import type { RevisoesDaAulaV2 } from "./avaliacao.ts";
import { hashCanonico, hashDaPosicao } from "./hash.ts";
import { problemasDaAulaV2, type AulaV2, type LocalizacaoProblemaV2, type ProblemaV2, type TreinoV2 } from "./modelo.ts";
import { fenDaQuestaoDoTreino } from "./propriedade-treino.ts";
import { falasDoTreinoV2 } from "./voz-do-treino.ts";

export type ContextoDePublicacaoV2 = {
  positions: Record<string, Position>;
  /** A régua de voz. Sem ela, a voz não é conferida — e isso não impede nada. */
  regua?: Regua;
  /**
   * Os lances que preservam o resultado, pelo **cache** da tablebase, sem rede. `null` quando
   * a posição não está no cache. Sem a função, a evidência é conferida só contra o alvo.
   */
  tablebase?: (fen: string, resultado: "win" | "draw") => string[] | null;
  /** As revisões gravadas num pacote, para comparar com as recalculadas. */
  revisoes?: { gravadas: RevisoesDaAulaV2; recalculadas: RevisoesDaAulaV2 };
};

type RegraDePublicacaoV2 = {
  codigo: string;
  /** Uma frase para o relatório: o que a regra impede. */
  impede: string;
  /** Promovida: a regra não julga nada novo, só transforma o aviso do rascunho em erro. */
  promove?: true;
  julgar?: (aula: AulaV2, contexto: ContextoDePublicacaoV2) => ProblemaV2[];
};

const erro = (aula: AulaV2, codigo: string, mensagem: string, localizacao: Omit<LocalizacaoProblemaV2, "aulaId"> = {}): ProblemaV2 => ({
  codigo,
  severidade: "erro",
  mensagem,
  localizacao: { aulaId: aula.id, ...localizacao },
});

/**
 * O alvo da certificação de um treino: o resultado e a posição de cada pergunta.
 *
 * É o que a evidência afirma — "nestas posições, estes lances preservam este resultado". Uma
 * pergunta que muda de posição, ou o resultado que muda, deixa a evidência falando de outra
 * coisa. Respostas e textos ficam de fora: eles são julgados **contra** a evidência, e não
 * fazem parte dela.
 */
export function alvoDaCertificacaoV2(aula: AulaV2, treino: TreinoV2, positions: Record<string, Position>): string {
  return hashCanonico({
    resultado: treino.certificacao?.resultado ?? null,
    questoes: treino.questoes.map((questao) => [questao.id, fenDaQuestaoDoTreino(aula, treino, questao, positions)]).sort(),
  });
}

function certificados(aula: AulaV2): TreinoV2[] {
  return aula.treinos.filter((treino) => treino.perfil === "final-certificado" && treino.certificacao);
}

const ESTADO_DITO: Record<string, string> = {
  pendente: "ainda não foi conferida contra a tablebase",
  "herdada-v1": "veio da aula v1 e ainda não foi confirmada pelo Conferir do v2",
  indisponivel: "não pôde ser calculada: a tablebase não alcança uma das posições",
};

export const REGRAS_PUBLICACAO_V2: RegraDePublicacaoV2[] = [
  { codigo: "PROVENIENCIA_CADUCA", impede: "posição mudou depois de a revisão ser registrada", promove: true },
  { codigo: "PROVENIENCIA_DIVERGE", impede: "estado da revisão diferente do arquivo da posição", promove: true },
  { codigo: "FEN_IMPORTADA_SEM_REVISAO", impede: "análise começa numa FEN importada sem revisão", promove: true },
  { codigo: "REVISAO_PENDENTE", impede: "texto marcado para revisão depois de trocar a posição", promove: true },
  {
    codigo: "CERTIFICACAO_PENDENTE",
    impede: "final certificado sem certificação confirmada",
    julgar: (aula) => certificados(aula)
      .filter((treino) => treino.certificacao!.estado !== "confirmada")
      .map((treino) => erro(aula, "CERTIFICACAO_PENDENTE", `a certificação do treino «${treino.titulo}» ${ESTADO_DITO[treino.certificacao!.estado] ?? "não está confirmada"}`, { treinoId: treino.id, campo: "certificacao.estado" })),
  },
  {
    codigo: "CERTIFICACAO_CADUCA",
    impede: "evidência que não fala mais das posições do treino, ou que o cache desmente",
    julgar: (aula, contexto) => {
      const problemas: ProblemaV2[] = [];
      for (const treino of certificados(aula)) {
        const certificacao = treino.certificacao!;
        if (certificacao.estado !== "confirmada") continue;
        const onde = { treinoId: treino.id, campo: "certificacao" };
        if (!certificacao.resultado) {
          problemas.push(erro(aula, "CERTIFICACAO_CADUCA", `a certificação do treino «${treino.titulo}» não diz se certifica vitória ou empate`, onde));
          continue;
        }
        if (certificacao.alvoHash !== alvoDaCertificacaoV2(aula, treino, contexto.positions)) {
          problemas.push(erro(aula, "CERTIFICACAO_CADUCA", `o treino «${treino.titulo}» mudou de posição ou de resultado depois de ser certificado — confira de novo`, onde));
          continue;
        }
        treino.questoes.forEach((questao, i) => {
          const fen = fenDaQuestaoDoTreino(aula, treino, questao, contexto.positions);
          const evidencia = certificacao.evidencias?.[questao.id];
          const lugar = { treinoId: treino.id, questaoId: questao.id, campo: "certificacao.evidencias" };
          if (!evidencia || evidencia.fen !== fen) {
            problemas.push(erro(aula, "CERTIFICACAO_CADUCA", `a pergunta ${i + 1} do treino «${treino.titulo}» não tem evidência da tablebase para a posição dela`, lugar));
            return;
          }
          if (!contexto.tablebase) return;
          const doCache = contexto.tablebase(fen, certificacao.resultado!);
          if (doCache === null) {
            problemas.push(erro(aula, "CERTIFICACAO_CADUCA", `a evidência da pergunta ${i + 1} do treino «${treino.titulo}» não pôde ser conferida: falta o cache da tablebase desta posição`, lugar));
          } else if (JSON.stringify([...doCache].sort()) !== JSON.stringify([...evidencia.winningMoves].sort())) {
            problemas.push(erro(aula, "CERTIFICACAO_CADUCA", `a evidência da pergunta ${i + 1} do treino «${treino.titulo}» não bate com a tablebase (gravada: ${evidencia.winningMoves.length} lances, tablebase: ${doCache.length})`, lugar));
          }
        });
      }
      return problemas;
    },
  },
  {
    codigo: "CERTIFICACAO_REFUTADA",
    impede: "resposta aceita que a tablebase diz jogar o resultado fora",
    julgar: (aula, contexto) => {
      const problemas: ProblemaV2[] = [];
      for (const treino of certificados(aula)) {
        const certificacao = treino.certificacao!;
        if (certificacao.estado !== "confirmada") continue;
        treino.questoes.forEach((questao, i) => {
          const evidencia = certificacao.evidencias?.[questao.id];
          if (!evidencia || evidencia.fen !== fenDaQuestaoDoTreino(aula, treino, questao, contexto.positions)) return;
          const preservam = new Set(evidencia.winningMoves);
          questao.respostas.forEach((resposta, r) => {
            if (resposta.julgamento === "erro") return;
            for (const lance of resposta.moves) {
              if (preservam.has(lance)) continue;
              const resultado = certificacao.resultado === "draw" ? "o empate" : "a vitória";
              problemas.push(erro(
                aula,
                "CERTIFICACAO_REFUTADA",
                `na pergunta ${i + 1} do treino «${treino.titulo}», a resposta ${r + 1} aceita "${lance}", e a tablebase diz que esse lance joga ${resultado} fora`,
                { treinoId: treino.id, questaoId: questao.id, respostaId: resposta.id, campo: "moves" },
              ));
            }
          });
        });
      }
      return problemas;
    },
  },
  {
    codigo: "PRATICA_AUSENTE",
    impede: "aula sem prática: o domínio depende dela",
    julgar: (aula) => aula.praticas.length === 0
      ? [erro(aula, "PRATICA_AUSENTE", "a aula não tem prática contra o computador — nesta versão o domínio da aula depende dela", { campo: "praticas" })]
      : [],
  },
  {
    codigo: "PRATICAS_MULTIPLAS",
    impede: "mais de uma prática: esta versão aceita uma, obrigatória",
    julgar: (aula) => aula.praticas.length > 1
      ? [erro(aula, "PRATICAS_MULTIPLAS", `a aula tem ${aula.praticas.length} práticas, e esta versão da publicação aceita uma só — o domínio por várias avaliações ainda não existe`, { campo: "praticas" })]
      : [],
  },
  {
    codigo: "AVALIACAO_REVISAO_DIVERGE",
    impede: "revisão de avaliação gravada diferente da que o conteúdo produz",
    julgar: (aula, contexto) => {
      if (!contexto.revisoes) return [];
      const { gravadas, recalculadas } = contexto.revisoes;
      const ids = [...new Set([...Object.keys(gravadas), ...Object.keys(recalculadas)])].sort();
      return ids
        .filter((id) => gravadas[id]?.revisao !== recalculadas[id]?.revisao || gravadas[id]?.tipo !== recalculadas[id]?.tipo)
        .map((id) => erro(aula, "AVALIACAO_REVISAO_DIVERGE", `a revisão de avaliação gravada para "${id}" não é a que o conteúdo produz — o progresso seria gravado contra uma tarefa que o aluno não jogou`, recalculadas[id]?.tipo === "pratica" ? { praticaId: id } : { treinoId: id }));
    },
  },
];

/** Tudo o que o aluno lê numa aula v2, para a régua de voz. */
export function falasDaAulaV2(aula: AulaV2): Fala[] {
  const falas: Fala[] = [{ onde: "aula · título", texto: aula.titulo, tipo: "rotulo" }];
  for (const introducao of aula.introducoes) {
    introducao.quadros.forEach((quadro, i) => falas.push({ onde: `Introdução · quadro ${i + 1}`, texto: quadro.texto, tipo: "fala" }));
  }
  for (const capitulo of aula.capitulos) {
    const nome = `Capítulo «${capitulo.titulo}»`;
    falas.push({ onde: `${nome} · título`, texto: capitulo.titulo, tipo: "rotulo" });
    if (capitulo.resumo) falas.push({ onde: `${nome} · resumo`, texto: capitulo.resumo, tipo: "fala" });
    capitulo.narracoes.forEach((narracao, i) => falas.push({ onde: `${nome} · narração ${i + 1}`, texto: narracao.texto, tipo: "fala" }));
  }
  for (const treino of aula.treinos) falas.push(...falasDoTreinoV2(treino));
  // No final certificado o aluno lê as mensagens de reserva do catálogo (ver
  // `treino-jogavel.ts`); fora dele, não.
  if (aula.catalogo && certificados(aula).length) {
    const m = aula.catalogo.mensagensPadrao;
    falas.push(
      { onde: "Catálogo · lance que ainda ganha, fora do caminho", texto: m.vitoriaForaDoMetodo, tipo: "fala" },
      { onde: "Catálogo · lance que joga o resultado fora", texto: m.perdeResultado, tipo: "fala" },
    );
  }
  for (const pratica of aula.praticas) falas.push({ onde: `Prática «${pratica.titulo}» · título`, texto: pratica.titulo, tipo: "rotulo" });
  return falas;
}

const CODIGO_DA_VOZ = { caracteres: "VOZ_CARACTERES", palavras: "VOZ_PALAVRAS", proibida: "VOZ_PROIBIDA" } as const;

/**
 * A régua que decide a publicação.
 *
 * `desligadas` existe para o teste de §19 — "prova de que a mutação deixa de ser detectada
 * quando a regra é desativada". Em produção ninguém passa nada.
 */
export function problemasParaPublicarV2(
  aula: AulaV2,
  contexto: ContextoDePublicacaoV2,
  desligadas: ReadonlySet<string> = new Set(),
): ProblemaV2[] {
  const ativas = REGRAS_PUBLICACAO_V2.filter((regra) => !desligadas.has(regra.codigo));
  const promovidas = new Set(ativas.filter((regra) => regra.promove).map((regra) => regra.codigo));
  const problemas: ProblemaV2[] = problemasDaAulaV2(aula, contexto.positions, hashDaPosicao)
    .map((problema) => (promovidas.has(problema.codigo) ? { ...problema, severidade: "erro" as const } : problema));
  for (const regra of ativas) if (regra.julgar) problemas.push(...regra.julgar(aula, contexto));
  if (contexto.regua) {
    for (const reprovacao of reprovacoes(falasDaAulaV2(aula), contexto.regua)) {
      problemas.push({
        codigo: CODIGO_DA_VOZ[reprovacao.regra],
        severidade: "aviso",
        mensagem: `${reprovacao.onde}: ${reprovacao.detalhe}`,
        localizacao: { aulaId: aula.id },
      });
    }
  }
  // Primeiro o que impede, depois os avisos (§19.2); a ordem dentro de cada grupo é a da régua.
  return [...problemas.filter((p) => p.severidade === "erro"), ...problemas.filter((p) => p.severidade === "aviso")];
}

export type ContagemDaConferenciaV2 = { erros: number; avisos: number; podePublicar: boolean };

export function contarProblemasV2(problemas: ProblemaV2[]): ContagemDaConferenciaV2 {
  const erros = problemas.filter((p) => p.severidade === "erro").length;
  return { erros, avisos: problemas.length - erros, podePublicar: erros === 0 };
}
