import "server-only";
import { cursosDeAbertura, todasAsAulasDeAbertura } from "@/lib/aberturas/curso";
import type { Perfil } from "@/lib/auth/perfil";
import { nivelDoAluno, NIVEIS, type Nivel } from "@/lib/curso/nivel";
import { cursosParaOsSelos } from "@/lib/curso/selos-banco";
import { aberturasDoRepertorio } from "@/lib/curso/selos-repertorio";
import type { SeloGravado } from "@/lib/curso/selos-gravados";
import { lerIndice } from "@/lib/repertorio/banco";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import {
  COLUNAS_DO_COLEGA,
  ehIdDeConta,
  FILTRO_DE_ENSAIO,
  montarVitrine,
  turmaEmOrdem,
  type ColegaNaTurma,
  type Vitrine,
} from "./turma.ts";

/**
 * A leitura da turma e da vitrine de um colega — **a única porta** para um aluno ver outro.
 *
 * ## Por que a chave de serviço, e não uma view ou função `security definer`
 *
 * A RLS de `perfis` e das tabelas de progresso continua fechada: aluno lê só o dele. Para a
 * vitrine havia duas saídas:
 *
 * 1. **uma view/função `security definer`** que expusesse o resumo. Ela ficaria publicada na API
 *    do Supabase para qualquer sessão logada chamar direto, com a chave pública, fora do site —
 *    e cada coluna a mais que alguém acrescentasse a ela um dia vazaria para a turma sem passar
 *    por tela nenhuma;
 * 2. **este módulo, no servidor**, com a chave de serviço: confere a sessão, filtra por id,
 *    **escolhe as colunas** (`COLUNAS_DO_COLEGA`) e monta um tipo fechado (`Vitrine`) campo a
 *    campo. Nada fica exposto na API; a superfície é uma página.
 *
 * Ficou a 2. O preço é a disciplina deste arquivo, e ela é conferida: `lib/turma/turma.test.ts`
 * reprova coluna proibida e chave a mais, e `import "server-only"` impede que ele chegue ao
 * navegador.
 *
 * ## O que nunca se lê de um colega
 *
 * `usuario`, `rating`, `equipe`, `tabuleiro`, graus, tentativas, minutos. O filtro de conta de
 * ensaio usa `usuario` **dentro do `where`** — o PostgREST filtra por ele sem devolvê-lo.
 */

type LinhaDoColega = { id: string; nome: string; avatar: string | null };

/** Os alunos da turma que `quem` pode ver, em ordem alfabética, sem número nenhum. */
export async function turmaVisivel(quem: Pick<Perfil, "id" | "papel" | "nome" | "avatar">): Promise<ColegaNaTurma[]> {
  let consulta = criarClienteAdmin().from("perfis").select(COLUNAS_DO_COLEGA).eq("papel", "aluno");
  if (quem.papel !== "professor") {
    consulta = consulta
      .not("usuario", "in", `(${FILTRO_DE_ENSAIO.usuarios.map((u) => `"${u}"`).join(",")})`)
      .not("usuario", "like", FILTRO_DE_ENSAIO.prefixo);
  }
  const { data, error } = await consulta;
  if (error) throw new Error(`não foi possível ler a turma: ${error.message}`);

  const linhas = (data ?? []) as LinhaDoColega[];
  // O próprio aluno sempre se vê — inclusive logado na conta de ensaio, que o filtro tirou.
  if (quem.papel === "aluno" && !linhas.some((l) => l.id === quem.id)) {
    linhas.push({ id: quem.id, nome: quem.nome, avatar: quem.avatar });
  }
  return turmaEmOrdem(linhas, quem.id);
}

/**
 * A vitrine de um colega, ou `null` (a página responde 404): id que não é conta, conta que não
 * existe, conta de professor, ou conta de ensaio vista por um aluno.
 *
 * Quem chama já conferiu a sessão (`perfilAtual`) e já mandou o próprio aluno para `/perfil`.
 */
export async function vitrineDoColega(quem: Pick<Perfil, "id" | "papel">, id: string): Promise<Vitrine | null> {
  if (!ehIdDeConta(id)) return null;
  const admin = criarClienteAdmin();

  let consulta = admin.from("perfis").select(COLUNAS_DO_COLEGA).eq("id", id).eq("papel", "aluno");
  if (quem.papel !== "professor" && id !== quem.id) {
    consulta = consulta
      .not("usuario", "in", `(${FILTRO_DE_ENSAIO.usuarios.map((u) => `"${u}"`).join(",")})`)
      .not("usuario", "like", FILTRO_DE_ENSAIO.prefixo);
  }
  const { data: linha, error } = await consulta.maybeSingle();
  if (error) throw new Error(`não foi possível ler o colega: ${error.message}`);
  if (!linha) return null;

  const [niveis, gravados, indice] = await Promise.all([
    admin.from("nivel_conquistado").select("nivel").eq("aluno", id),
    // Só o id do selo: a data fica de fora da vitrine, e nem chega a ser lida.
    admin.from("selo_conquistado").select("selo").eq("aluno", id),
    lerIndice(),
  ]);
  if (niveis.error) throw new Error(`não foi possível ler o nível do colega: ${niveis.error.message}`);
  if (gravados.error) throw new Error(`não foi possível ler os selos do colega: ${gravados.error.message}`);

  const conquistado = ((niveis.data ?? []) as { nivel: number }[]).reduce<0 | Nivel>((maior, l) => {
    const valido = NIVEIS.find((n) => n === l.nivel);
    return valido !== undefined && valido > maior ? valido : maior;
  }, 0);

  const selos: SeloGravado[] = ((gravados.data ?? []) as { selo: string }[]).map((g) => ({
    selo: g.selo,
    conquistadoEm: "",
    vistoEm: null,
  }));

  // Os cursos só dão nome aos selos de abertura; o que o colega concluiu não é lido.
  const cursos = cursosParaOsSelos({ cursos: cursosDeAbertura(todasAsAulasDeAbertura()), concluidas: new Map() }, indice);

  // O índice só dá nome aos selos de repertório; o progresso do colega não é lido.
  const aberturas = aberturasDoRepertorio(indice, new Map(), new Set());

  return montarVitrine(linha as LinhaDoColega, nivelDoAluno(conquistado), selos, cursos, aberturas);
}
