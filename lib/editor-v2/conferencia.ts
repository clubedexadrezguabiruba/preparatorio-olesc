/**
 * O que impede publicar uma aula v2 — especificação §19.3 e §20.1, plano final §13.
 *
 * ## A régua de duas alturas
 *
 * `problemasDaAulaV2` é a régua do **rascunho**: ela aponta tudo, e parte do que aponta é
 * aviso de propósito, porque o professor precisa conseguir guardar uma aula no meio do
 * caminho (plano §7).
 *
 * `problemasParaPublicarV2` usa a mesma régua e sobe a altura em dois movimentos:
 *
 * 1. **promove** a erro o aviso de revisão pendente (§5: "revisões obrigatórias devem ser
 *    resolvidas antes da publicação");
 * 2. **acrescenta** as regras que só fazem sentido para publicar: aula extra sem nível ou
 *    classe, nível diferente da trilha, e a revisão de avaliação gravada que não é a que o
 *    conteúdo produz.
 *
 * ## As travas de 15/9/2026 (decisão do Doug, `docs/TRILHA-FINAIS.md`)
 *
 * **O professor tem a última palavra.** Saíram daqui, e não impedem mais publicar:
 *
 * - `CERTIFICACAO_PENDENTE`, `CERTIFICACAO_CADUCA` e `CERTIFICACAO_REFUTADA` (travas 2 e 3):
 *   a tablebase não é mais consultada. O resultado do treino é declarado pelo professor
 *   (`treino.resultado`); a certificação gravada nas aulas antigas fica como dado congelado.
 * - `PRATICA_AUSENTE` e `PRATICAS_MULTIPLAS` (trava 9): a aula tem nenhuma, uma ou várias.
 * - A promoção de `PROVENIENCIA_CADUCA`, `PROVENIENCIA_DIVERGE` e `FEN_IMPORTADA_SEM_REVISAO`
 *   (trava 7): continuam aparecendo, como aviso.
 * - `TEXTO_SEM_DIREITO_DECLARADO` virou aviso (decisão sobre direitos autorais).
 *
 * A régua de voz entra aqui como **aviso, sempre** (decisão do Doug, 13/9/2026).
 *
 * ## Por que uma lista de regras, e não uma função comprida
 *
 * O plano §19 exige, para cada regra impeditiva nova, a prova de que **desligá-la faz o
 * estrago passar**. Uma lista com código é o que deixa o teste desligar uma regra só e ver
 * o vermelho sumir — sem isso a prova seria "a regra existe", que não prova nada.
 *
 * ## Onde roda
 *
 * No servidor (o hash da posição vem do `node:crypto`). A tela recebe o resultado pronto,
 * pela action do botão Conferir.
 */
import { reprovacoes, type Fala, type Regua } from "../lesson/regua.ts";
import { aulaDaTrilha } from "../finais/trilha.ts";
import type { Position } from "../lesson/schema.ts";
import type { RevisoesDaAulaV2 } from "./avaliacao.ts";
import { hashDaPosicao } from "./hash.ts";
import { problemasDaAulaV2, resultadoDoTreinoV2, type AulaV2, type LocalizacaoProblemaV2, type ProblemaV2, type TreinoV2 } from "./modelo.ts";
import { fenInicialDoTreino } from "./propriedade-treino.ts";
import { aberturaDoId, dominioDaAulaV2 } from "./dominio.ts";
import { analiseTemTexto, origemDeTerceiro } from "./proveniencia.ts";
import { temEvidenciaCongelada } from "./treino-jogavel.ts";
import { falasDoTreinoV2 } from "./voz-do-treino.ts";

export type ContextoDePublicacaoV2 = {
  positions: Record<string, Position>;
  /** A régua de voz. Sem ela, a voz não é conferida — e isso não impede nada. */
  regua?: Regua;
  /** As revisões gravadas num pacote, para comparar com as recalculadas. */
  revisoes?: { gravadas: RevisoesDaAulaV2; recalculadas: RevisoesDaAulaV2 };
  /**
   * Os ids das linhas do repertório compilado (`public/repertorio/`), para o move trainer da aula
   * de abertura (§18.1). Ausente numa aula que tem move trainer: a conferência não tem como dizer
   * que as linhas existem, e isso impede publicar.
   */
  linhasDoRepertorio?: ReadonlySet<string>;
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

const ehExtra = (aula: AulaV2) => dominioDaAulaV2(aula.id) === "extra";
const ehAbertura = (aula: AulaV2) => dominioDaAulaV2(aula.id) === "abertura";

const semContadores = (fen: string) => fen.trim().split(/\s+/).slice(0, 4).join(" ");
const COBRA = { win: "vencer", draw: "segurar o empate" } as const;
const NO_ACERVO = { "win-white": "vitória das brancas", "win-black": "vitória das pretas", draw: "empate" } as const;

/**
 * Onde o treino × resultado da posição discordam (decisão do Doug, 15/9/2026). Duas fontes, as duas
 * lidas no servidor, sem tablebase e sem motor:
 *
 * 1. **O acervo:** a posição de `content/positions/` com a mesma FEN (sem os contadores) de onde o
 *    treino começa. Achar pela FEN, e não pelo `positionId` da análise, cobre o treino que começa no
 *    meio da linha só quando aquela posição exata está no acervo — e o de FEN colada que por acaso é
 *    uma posição do acervo. Sem posição igual, o acervo não tem o que dizer.
 * 2. **A certificação antiga** (`certificacao.resultado`), dado congelado das aulas convertidas. Só
 *    conta quando o professor declarou outro resultado: sem declaração, o cobrado já é o dela.
 *
 * O motor do professor não entra: ele roda no navegador, e a conferência não. A FEN colada fora do
 * acervo e sem certificação fica sem aviso — não há resultado com que comparar, e a decisão é só do
 * professor.
 */
function divergenciasDoResultado(aula: AulaV2, treino: TreinoV2, positions: Record<string, Position>): string[] {
  const cobrado = resultadoDoTreinoV2(treino) ?? "win";
  const partes: string[] = [];
  let fen: string | null = null;
  try {
    fen = semContadores(fenInicialDoTreino(aula, treino, positions));
  } catch {
    // Início quebrado: a régua do rascunho já o aponta, com o nome certo.
  }
  const noAcervo = fen ? Object.values(positions).find((posicao) => semContadores(posicao.fen) === fen) : undefined;
  if (noAcervo) {
    const paraOAluno = noAcervo.expectedResult === "draw" ? "draw" : noAcervo.expectedResult === `win-${treino.ladoAluno}` ? "win" : "loss";
    if (paraOAluno !== cobrado) partes.push(`no acervo, a posição onde ele começa dá ${NO_ACERVO[noAcervo.expectedResult]}`);
  }
  const certificado = treino.certificacao?.resultado;
  if (treino.resultado && certificado && certificado !== cobrado) partes.push(`a certificação antiga guarda ${certificado === "win" ? "vitória" : "empate"}`);
  return partes;
}

export const REGRAS_PUBLICACAO_V2: RegraDePublicacaoV2[] = [
  /*
   * §22 — aula extra: namespace `EX-`, nível explícito, e na trilha por dados. Sem nível ou
   * sem classe a extra não entra em `trilhaCompleta`, e publicá-la assim seria prometer ao
   * professor uma aula que nenhum fechamento de nível lê.
   */
  {
    codigo: "EXTRA_SEM_NIVEL",
    impede: "aula extra sem o nível (1 a 5) declarado",
    julgar: (aula) => ehExtra(aula) && !aula.metadados?.nivel
      ? [erro(aula, "EXTRA_SEM_NIVEL", "esta aula extra não declara o nível (1 a 5) — sem ele ela não entra na trilha nem conta para o fechamento de nível nenhum. Escolha em Mais opções.", { campo: "metadados.nivel" })]
      : [],
  },
  {
    codigo: "EXTRA_SEM_CLASSE",
    impede: "aula extra sem a classe (E, D, C ou B) declarada",
    julgar: (aula) => ehExtra(aula) && !aula.metadados?.classe
      ? [erro(aula, "EXTRA_SEM_CLASSE", "esta aula extra não declara a classe (E, D, C ou B) — é por ela que a lista de finais a mostra. Escolha em Mais opções.", { campo: "metadados.classe" })]
      : [],
  },
  {
    codigo: "NIVEL_DIVERGE",
    impede: "aula do curso declarando um nível diferente do da trilha",
    julgar: (aula) => {
      const naTrilha = aulaDaTrilha(aula.id);
      const declarado = aula.metadados?.nivel;
      return naTrilha && declarado !== undefined && declarado !== naTrilha.nivel
        ? [erro(aula, "NIVEL_DIVERGE", `esta aula declara o nível ${declarado}, e a trilha do curso a põe no nível ${naTrilha.nivel} — é a trilha que decide; tire o nível em Mais opções ou corrija a trilha`, { campo: "metadados.nivel" })]
        : [];
    },
  },
  {
    codigo: "AULA_FORA_DA_TRILHA",
    impede: "aviso: aula do curso que não está na trilha — publica, mas não conta para nível nenhum",
    julgar: (aula) => !ehExtra(aula) && !ehAbertura(aula) && !aulaDaTrilha(aula.id)
      ? [{ codigo: "AULA_FORA_DA_TRILHA", severidade: "aviso" as const, mensagem: "esta aula não está na trilha do curso: publicada, ela abre pelo endereço, mas não aparece em /finais nem conta para o fechamento de nível nenhum", localizacao: { aulaId: aula.id } }]
      : [],
  },
  /*
   * §13.3.3 (16/9/2026): a aula de abertura diz de que curso é pelo id **e** pelos metadados, e os
   * dois têm de contar a mesma história — é pelos metadados que a trilha do curso a acha, e é pelo
   * id que o aluno a abre. O move trainer tem de ser da mesma abertura.
   */
  {
    codigo: "ABERTURA_DIVERGE",
    impede: "aula de abertura cujo id, metadados e move trainer não apontam para o mesmo curso",
    julgar: (aula) => {
      const doId = aberturaDoId(aula.id);
      const declarada = aula.metadados?.abertura;
      if (!doId) {
        return declarada
          ? [erro(aula, "ABERTURA_DIVERGE", "esta aula declara um curso de abertura, mas o id não é de aula de abertura (AB-<COR>-<ABERTURA>-<BLOCO>)", { campo: "metadados.abertura" })]
          : [];
      }
      if (!declarada) return [erro(aula, "ABERTURA_DIVERGE", `o id diz ${doId.cor}/${doId.abertura}, bloco ${doId.bloco}, e a aula não declara o curso de abertura nos metadados`, { campo: "metadados.abertura" })];
      const problemas: ProblemaV2[] = [];
      if (declarada.cor !== doId.cor || declarada.abertura !== doId.abertura || declarada.bloco !== doId.bloco) {
        problemas.push(erro(aula, "ABERTURA_DIVERGE", `o id diz ${doId.cor}/${doId.abertura}, bloco ${doId.bloco}, e os metadados dizem ${declarada.cor}/${declarada.abertura}, bloco ${declarada.bloco}`, { campo: "metadados.abertura" }));
      }
      for (const treinador of aula.treinadores ?? []) {
        if (treinador.cor !== doId.cor || treinador.abertura !== doId.abertura) {
          problemas.push(erro(aula, "ABERTURA_DIVERGE", `o move trainer «${treinador.titulo}» é de ${treinador.cor}/${treinador.abertura}, e a aula é de ${doId.cor}/${doId.abertura}`, { treinadorId: treinador.id, campo: "abertura" }));
        }
      }
      return problemas;
    },
  },
  /*
   * §18.1: o move trainer grava pelo juiz de `/aberturas`, que só aceita linha do repertório
   * compilado. Uma linha que não está lá deixaria o aluno preso numa etapa que nunca fecha.
   */
  {
    codigo: "TREINADOR_LINHA_AUSENTE",
    impede: "move trainer com linha que não existe no repertório compilado",
    julgar: (aula, contexto) => (aula.treinadores ?? []).flatMap((treinador) => {
      if (!contexto.linhasDoRepertorio) {
        return [erro(aula, "TREINADOR_LINHA_AUSENTE", `o repertório compilado não foi lido, e sem ele não há como saber se as linhas do move trainer «${treinador.titulo}» existem`, { treinadorId: treinador.id, campo: "linhaIds" })];
      }
      return treinador.linhaIds
        .filter((id) => !contexto.linhasDoRepertorio!.has(id))
        .map((id) => erro(aula, "TREINADOR_LINHA_AUSENTE", `o move trainer «${treinador.titulo}» usa a linha ${id}, que não está no repertório compilado — gere e aplique o PGN do repertório antes de publicar`, { treinadorId: treinador.id, campo: "linhaIds" }));
    }),
  },
  { codigo: "REVISAO_PENDENTE", impede: "texto marcado para revisão depois de trocar a posição", promove: true },
  /*
   * Teste de uso de 15/9/2026: a cópia da N0-LADDER com o treino trocado para "Segurar o empate"
   * publicava calada, e a escada de torres dá vitória. Aviso, nunca impedimento — trava 2: o
   * professor declara o resultado, a máquina avisa e ele decide.
   */
  {
    codigo: "TREINO_RESULTADO_DIVERGE",
    impede: "aviso: treino que cobra um resultado diferente do que a posição dá — publica",
    julgar: (aula, contexto) => aula.treinos.flatMap((treino) => {
      const partes = divergenciasDoResultado(aula, treino, contexto.positions);
      if (!partes.length) return [];
      const cobrado = COBRA[resultadoDoTreinoV2(treino) ?? "win"];
      return [{ ...erro(aula, "TREINO_RESULTADO_DIVERGE", `o treino «${treino.titulo}» cobra ${cobrado}, e ${partes.join("; e ")} — a aula publica assim; se não era isso, troque em «Editar treino»`, { treinoId: treino.id, campo: "resultado" }), severidade: "aviso" as const }];
    }),
  },
  /*
   * §12.3 e plano §12 (fatia 10): narração que chegou com uma posição de outra pessoa — obra, estudo
   * do Lichess, partida — sem a declaração do professor de que o texto é dele ou que ele tem direito
   * de usá-lo. **Aviso desde 15/9/2026** (decisão do Doug sobre direitos autorais): publica, e o
   * aviso fica à vista até a declaração ser feita.
   */
  {
    codigo: "TEXTO_SEM_DIREITO_DECLARADO",
    impede: "aviso: narração de posição de terceiros sem a declaração de direito de uso — publica",
    julgar: (aula) => aula.analises.flatMap((analise) => {
      const revisao = analise.inicio.tipo === "fen" ? analise.inicio.revisao : undefined;
      if (!revisao || !origemDeTerceiro(revisao.origem) || revisao.direitoDosTextos || !analiseTemTexto(aula, analise)) return [];
      const capitulo = aula.capitulos.find((item) => item.analiseId === analise.id);
      return [{ ...erro(aula, "TEXTO_SEM_DIREITO_DECLARADO", `as narrações ${capitulo ? `do capítulo «${capitulo.titulo}» ` : ""}vieram de outra pessoa — a aula publica, mas em «De onde veio a posição» vale marcar que os textos são seus ou que você pode usá-los`, { analiseId: analise.id, campo: "inicio.revisao" }), severidade: "aviso" as const }];
    }),
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
  // Com a evidência congelada de uma aula antiga, o aluno lê as mensagens de reserva do
  // catálogo (ver `treino-jogavel.ts`); fora dela, não.
  if (aula.catalogo && aula.treinos.some((treino) => temEvidenciaCongelada(treino))) {
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
