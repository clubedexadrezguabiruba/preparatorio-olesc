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

/**
 * A turma e a vitrine de um colega (Doug, 17/9/2026) — as regras, sem banco.
 *
 * ## O que um colega vê de outro
 *
 * **A vitrine, e só ela:** avatar, nome, nível com o metal, e os selos ganhos. O que o
 * aluno *fez*, e nada de *quanto* nem *onde ele está contra os outros*.
 *
 * Fica de fora, e por quê:
 *
 * - **graus, erros, acertos, revisões, minutos**: são o caderno do aluno, não a vitrine;
 * - **rating** — e a família de selos `rating`, que é o rating com outras palavras;
 * - **`usuario`**: é metade do login (a outra metade é um PIN de seis dígitos);
 * - **equipe e tabuleiro**: o tabuleiro **é** uma ordem de força (o 1.º tabuleiro é o mais
 *   forte da equipe) — mostrá-lo seria um ranking pela porta dos fundos. A equipe não ordena
 *   ninguém, mas também não diz nada que a vitrine precise; sem motivo para mostrar, não sai;
 * - **a data de cada selo**: no perfil do próprio aluno ela é memória; na vitrine vira
 *   comparação ("ele ganhou antes de mim").
 *
 * Sem ranking, sem ordenação por desempenho, sem contagem comparativa: a turma é em ordem
 * alfabética, e a vitrine não diz "12 de 40".
 *
 * ## A conta de ensaio
 *
 * `alunoteste` é do professor, para ensaiar o site como aluno. Para os alunos ela **não
 * aparece**: um "Aluno de Teste" na grade é ruído, e o selo dele seria de mentira ao lado dos
 * de verdade. Para o professor ela aparece — é justamente a conta que ele usa para conferir a
 * turma. E quem está logado nela sempre se vê, senão o ensaio da página não ensaiaria nada.
 * As cobaias de `npm run db:rls` (`zz.teste.*`) seguem a mesma regra.
 */

/** As colunas de `perfis` que a turma e a vitrine leem de um colega. Nenhuma outra. */
export const COLUNAS_DO_COLEGA = "id, nome, avatar";

/** O que nunca pode sair de `perfis` (nem de lugar nenhum) para um colega. */
export const CAMPOS_PROIBIDOS: readonly string[] = [
  "usuario",
  "rating",
  "equipe",
  "tabuleiro",
  "papel",
  "graus",
  "erros",
  "acertos",
  "revisoes",
  "minutos",
];

/** As chaves exatas de uma {@link Vitrine}. O teste confere que o objeto montado tem só estas. */
export const CAMPOS_DA_VITRINE = ["id", "nome", "avatar", "nivel", "metal", "selos"] as const;

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

export type QuemOlha = { readonly id: string; readonly papel: "aluno" | "professor" };

/** Se uma conta aparece para quem olha. Professor vê todas; aluno não vê as de ensaio, menos a própria. */
export function quemAparece(quem: QuemOlha, conta: { readonly id: string; readonly usuario: string }): boolean {
  if (quem.papel === "professor" || conta.id === quem.id) return true;
  return !ehContaDeEnsaio(conta.usuario);
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
    .map((l) => ({ id: l.id, nome: l.nome, avatar: l.avatar, ehVoce: l.id === eu }))
    .sort((a, b) => ordem.compare(a.nome, b.nome) || a.id.localeCompare(b.id));
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
  };
}
