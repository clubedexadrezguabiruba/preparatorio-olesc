import { METAL, type Nivel } from "../curso/nivel.ts";
import { comDatas, type SeloGravado } from "../curso/selos-gravados.ts";
import {
  entradaZerada,
  FAMILIAS_FORA_DA_VITRINE,
  selos,
  type AberturaParaOSelo,
  type CursoParaOSelo,
  type Familia,
} from "../curso/selos.ts";
import {
  ATIVIDADE_ZERADA,
  ordenarPorTempo,
  type ResumoDeAtividade,
} from "./atividade.ts";

/**
 * A turma e a vitrine de um colega (Doug, 17/9/2026) — as regras, sem banco.
 *
 * ## O que um colega vê de outro
 *
 * **A vitrine pública da turma:** avatar, nome, nível, selos e atividade objetiva: tempo
 * registrado, rating de tática, puzzles, linhas estudadas e linhas dominadas.
 *
 * Fica de fora, e por quê:
 *
 * Continua privado: graus por conteúdo, fila de revisão, erros por tema, datas e histórico.
 * O rating de entrada continua privado; o rating atual da Tática Rating é atividade pública.
 * - **`usuario`**: é metade do login (a outra metade é um PIN de seis dígitos);
 * - **equipe e tabuleiro**: o tabuleiro **é** uma ordem de força (o 1.º tabuleiro é o mais
 *   forte da equipe) — mostrá-lo seria um ranking pela porta dos fundos. A equipe não ordena
 *   ninguém, mas também não diz nada que a vitrine precise; sem motivo para mostrar, não sai;
 * - **a data de cada selo**: no perfil do próprio aluno ela é memória; na vitrine vira
 *   comparação ("ele ganhou antes de mim").
 *
 * Desde 19/9/2026, por decisão do Doug, a lista ordena pelo tempo medido, do maior para o menor.
 * Não há pontos nem posição calculada. Empate de tempo fica em ordem alfabética.
 *
 * ## A conta de ensaio
 *
 * `alunoteste` é do professor, para ensaiar o site como aluno. Para os alunos ela **não
 * aparece**: um "Aluno de Teste" na grade é ruído, e o selo dele seria de mentira ao lado dos
 * de verdade. Para o professor ela aparece — é justamente a conta que ele usa para conferir a
 * turma. E quem está logado nela sempre se vê, senão o ensaio da página não ensaiaria nada.
 * As cobaias de `npm run db:rls` (`zz.teste.*`) seguem a mesma regra.
 *
 * ## Duas turmas que não se enxergam (Doug, 18/9/2026)
 *
 * Toda conta é da turma `olesc` (os alunos, com as equipes M e F) ou `testadores` (contas de
 * teste de colegas do Doug, sem equipe). O aluno só vê quem é da **mesma** turma — na grade e na
 * vitrine. O professor vê as duas, separadas. A coluna `turma` é lida de quem olha e usada no
 * `where` da consulta: ela não sai para a tela do colega.
 */

/** As turmas, na ordem em que o professor as vê. A mesma lista do `check` da migration 0019. */
export const TURMAS = ["olesc", "testadores"] as const;
export type Turma = (typeof TURMAS)[number];

export const NOME_DA_TURMA: Readonly<Record<Turma, string>> = { olesc: "OLESC", testadores: "Testadores" };

export function ehTurma(valor: unknown): valor is Turma {
  return typeof valor === "string" && (TURMAS as readonly string[]).includes(valor);
}

/** As colunas de `perfis` que a turma e a vitrine leem de um colega. Nenhuma outra. */
export const COLUNAS_DO_COLEGA = "id, nome, avatar";

/** O que nunca pode sair de `perfis` (nem de lugar nenhum) para um colega. */
export const CAMPOS_PROIBIDOS: readonly string[] = [
  "usuario",
  "rating",
  "equipe",
  "tabuleiro",
  "turma",
  "papel",
  "graus",
  "revisoes",
  "grausPorConteudo",
  "historico",
];

/** As chaves exatas de uma {@link Vitrine}. O teste confere que o objeto montado tem só estas. */
export const CAMPOS_DA_VITRINE = ["id", "nome", "avatar", "nivel", "metal", "selos", "atividade"] as const;

const USUARIOS_DE_ENSAIO: ReadonlySet<string> = new Set(["alunoteste"]);
const PREFIXO_DAS_COBAIAS = "zz.teste.";

export function ehContaDeEnsaio(usuario: string): boolean {
  return USUARIOS_DE_ENSAIO.has(usuario) || usuario.startsWith(PREFIXO_DAS_COBAIAS);
}

/** Os filtros de ensaio, na forma que o PostgREST recebe — para o `usuario` nunca ser lido. */
export const FILTRO_DE_ENSAIO = {
  usuarios: [...USUARIOS_DE_ENSAIO],
  prefixo: `${PREFIXO_DAS_COBAIAS}%`,
} as const;

export type QuemOlha = { readonly id: string; readonly papel: "aluno" | "professor"; readonly turma: Turma };

/**
 * Se uma conta aparece para quem olha. Professor vê todas; aluno vê só as da própria turma, e
 * nelas não vê as de ensaio — menos a própria, que ele sempre vê.
 *
 * É a regra por extenso; `vitrine.ts` a aplica no `where` da consulta, e o teste confere as duas.
 */
export function quemAparece(
  quem: QuemOlha,
  conta: { readonly id: string; readonly usuario: string; readonly turma: Turma },
): boolean {
  if (quem.papel === "professor" || conta.id === quem.id) return true;
  return conta.turma === quem.turma && !ehContaDeEnsaio(conta.usuario);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Só um uuid vai ao banco como id de conta: o resto é 404 sem consulta. */
export function ehIdDeConta(valor: string): boolean {
  return UUID.test(valor);
}

export type ColegaNaTurma = {
  readonly id: string;
  readonly nome: string;
  readonly avatar: string | null;
  /** O próprio aluno: o cartão dele leva a "Meu perfil". */
  readonly ehVoce: boolean;
  readonly atividade: ResumoDeAtividade;
};

/**
 * A grade da turma: **ordem alfabética** (sem acento e sem caixa pesarem), e nenhum número. As
 * chaves do objeto são montadas aqui, uma a uma — a linha do banco nunca é repassada.
 */
export function turmaEmOrdem(
  linhas: readonly { readonly id: string; readonly nome: string; readonly avatar: string | null }[],
  eu: string,
): ColegaNaTurma[] {
  const ordem = new Intl.Collator("pt-BR", { sensitivity: "base" });
  return linhas
    .map((l) => ({
      id: l.id,
      nome: l.nome,
      avatar: l.avatar,
      ehVoce: l.id === eu,
      atividade: ATIVIDADE_ZERADA,
    }))
    .sort((a, b) => ordem.compare(a.nome, b.nome) || a.id.localeCompare(b.id));
}

/** Ordena por tempo medido e anexa somente as métricas públicas de cada aluno. */
export function turmaPorTempo(
  linhas: readonly { readonly id: string; readonly nome: string; readonly avatar: string | null }[],
  eu: string,
  atividades: ReadonlyMap<string, ResumoDeAtividade>,
): ColegaNaTurma[] {
  return ordenarPorTempo(
    linhas.map((linha) => ({
      id: linha.id,
      nome: linha.nome,
      avatar: linha.avatar,
      ehVoce: linha.id === eu,
      atividade: atividades.get(linha.id) ?? ATIVIDADE_ZERADA,
    })),
  );
}

export type GrupoDaTurma = { readonly turma: Turma; readonly nome: string; readonly colegas: ColegaNaTurma[] };

/**
 * A grade separada por turma, na ordem de {@link TURMAS}, cada uma em ordem alfabética. Turma
 * vazia não sai. Para o aluno as linhas já chegam filtradas, e sai um grupo só.
 */
export function turmasEmOrdem(
  linhas: readonly { readonly id: string; readonly nome: string; readonly avatar: string | null; readonly turma: Turma }[],
  eu: string,
): GrupoDaTurma[] {
  return TURMAS.map((turma) => ({
    turma,
    nome: NOME_DA_TURMA[turma],
    colegas: turmaEmOrdem(
      linhas.filter((l) => l.turma === turma),
      eu,
    ),
  })).filter((g) => g.colegas.length > 0);
}

export function turmasPorTempo(
  linhas: readonly { readonly id: string; readonly nome: string; readonly avatar: string | null; readonly turma: Turma }[],
  eu: string,
  atividades: ReadonlyMap<string, ResumoDeAtividade>,
): GrupoDaTurma[] {
  return TURMAS.map((turma) => ({
    turma,
    nome: NOME_DA_TURMA[turma],
    colegas: turmaPorTempo(
      linhas.filter((linha) => linha.turma === turma),
      eu,
      atividades,
    ),
  })).filter((grupo) => grupo.colegas.length > 0);
}

export type SeloDaVitrine = {
  readonly id: string;
  readonly familia: Familia;
  readonly nome: string;
  readonly conta: string;
};

export type Vitrine = {
  readonly id: string;
  readonly nome: string;
  readonly avatar: string | null;
  readonly nivel: Nivel;
  readonly metal: string;
  readonly selos: readonly SeloDaVitrine[];
  readonly atividade: ResumoDeAtividade;
};

/**
 * A vitrine de um colega, montada campo a campo.
 *
 * Recebe a linha como `Record` de propósito: se um dia alguém trocar a consulta por `select("*")`,
 * o que chegar a mais **não passa** daqui. Os selos são os **gravados** (nunca derivados do
 * progresso do colega, que exigiria ler o caderno dele), na ordem do catálogo, sem a família
 * rating e sem data.
 */
export function montarVitrine(
  linha: Readonly<Record<string, unknown>>,
  nivel: Nivel,
  gravados: readonly SeloGravado[],
  cursos: readonly CursoParaOSelo[],
  aberturas: readonly AberturaParaOSelo[] = [],
  atividade: ResumoDeAtividade = ATIVIDADE_ZERADA,
): Vitrine {
  const catalogo = selos(entradaZerada(cursos, aberturas));
  const ganhos = comDatas(catalogo, gravados)
    .filter((s) => s.ganho && !FAMILIAS_FORA_DA_VITRINE.has(s.familia))
    .map((s) => ({ id: s.id, familia: s.familia, nome: s.nome, conta: s.conta }));
  return {
    id: String(linha.id),
    nome: String(linha.nome),
    avatar: typeof linha.avatar === "string" ? linha.avatar : null,
    nivel,
    metal: METAL[nivel],
    selos: ganhos,
    atividade,
  };
}
