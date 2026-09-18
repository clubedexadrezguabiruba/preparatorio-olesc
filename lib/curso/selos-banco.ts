import "server-only";
import type { TravaDoAluno } from "@/lib/aberturas/trava-banco";
import { naVitrine } from "@/lib/aberturas/vitrine";
import { diasComOMinimo, maiorSequenciaDeDias, type MinutosDoDia } from "@/lib/curso/hoje";
import { temaFechado, type Nivel } from "@/lib/curso/nivel";
import { comDatas, planoDosSelos, type SeloComData, type SeloGravado } from "@/lib/curso/selos-gravados";
import { selos, type CursoParaOSelo, type ParaOsSelos, type Selo } from "@/lib/curso/selos";
import { aprendidasDaTrilha, type AulaDaTrilha, type ProgressoDaAula } from "@/lib/finais/trilha";
import type { EntradaDoIndice } from "@/lib/repertorio/linhas";
import { aberturasDoRepertorio } from "@/lib/curso/selos-repertorio";
import { aprendidasDaAbertura, baseCompleto, type ProgressoDaLinha } from "@/lib/repertorio/treino";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { BLOCOS, contaNoCurso } from "@/lib/tatica/blocos";
import type { EstadoDoRating } from "@/lib/tatica/rating";
import type { ProgressoDoTema } from "@/lib/tatica/progresso";

/**
 * Os selos com o banco: a entrada montada das leituras, os números da view de puzzles, e a
 * gravação com data (0018). A regra mora em `selos.ts` e `selos-gravados.ts`, que são puros.
 *
 * ## Quem chama
 *
 * O painel e "Meu perfil" — as duas telas em que o aluno vê as próprias conquistas. As duas
 * montam a entrada **daqui**, para não discordarem sobre o que ele ganhou. O relatório do
 * professor e a vitrine de um colega **só leem o gravado**: derivar lá exigiria ler o progresso
 * inteiro de outra pessoa (e `progressoDoRepertorio()` sem `aluno`, com a sessão do professor,
 * devolveria a turma inteira).
 */

export type PuzzlesDoAluno = ParaOsSelos["puzzles"];

/** Os números dos selos V2, da view `puzzles_do_aluno`. A RLS entrega só a linha do aluno. */
export async function puzzlesDoAluno(aluno: string): Promise<PuzzlesDoAluno> {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("puzzles_do_aluno")
    .select("tentativas, resolvidos, melhor_janela")
    .eq("aluno", aluno)
    .maybeSingle();
  return {
    tentativas: data?.tentativas ?? 0,
    resolvidos: data?.resolvidos ?? 0,
    melhorJanela: data?.melhor_janela ?? null,
  };
}

/** Os cursos de abertura publicados, com quantas aulas de cada o aluno concluiu. */
export function cursosParaOsSelos(
  trava: Pick<TravaDoAluno, "cursos" | "concluidas">,
  indice: readonly EntradaDoIndice[],
): CursoParaOSelo[] {
  return [...trava.cursos].map(([chave, aulas]) => {
    const [cor, abertura] = chave.split("/");
    const nome = indice.find((e) => e.cor === cor && e.abertura === abertura)?.nome ?? abertura;
    return { chave, nome, aulas: aulas.length, concluidas: aulas.filter((a) => trava.concluidas.has(a.id)).length };
  });
}

/**
 * A entrada dos selos, montada do que a página já leu. Era o miolo do painel até 17/9; saiu de
 * lá para "Meu perfil" contar exatamente o mesmo.
 */
export function entradaDosSelos(d: {
  readonly progresso: ReadonlyMap<string, ProgressoDoTema>;
  readonly finais: ReadonlyMap<string, ProgressoDaAula>;
  readonly aulasDeFinais: readonly AulaDaTrilha[];
  readonly comPratica: ReadonlySet<string>;
  readonly indice: readonly EntradaDoIndice[];
  readonly repertorio: ReadonlyMap<string, ProgressoDaLinha>;
  readonly trava: Pick<TravaDoAluno, "cursos" | "concluidas" | "trancadas">;
  readonly conquistado: 0 | Nivel;
  /** O histórico **inteiro** de minutos: um selo não expira (ver `selos.ts`). */
  readonly minutos: readonly MinutosDoDia[];
  readonly ratingTatica: EstadoDoRating | null;
  readonly puzzles: PuzzlesDoAluno;
}): ParaOsSelos {
  // Os números de tática e de finais são do **curso inteiro**, e não do degrau: um selo de
  // "14 temas" que zerasse ao subir de nível não seria um selo.
  const temasFechados = BLOCOS.flatMap((b) => b.temas).filter(
    (t) => contaNoCurso(t) && temaFechado(d.progresso.get(t.tag)?.feitos),
  ).length;

  const repertorio = d.repertorio;
  const linhasTodas = d.indice.reduce((n, e) => n + e.ids.length, 0);
  const aprendidasTodas = d.indice.reduce((n, e) => n + aprendidasDaAbertura(repertorio, e, true), 0);

  // Só as abertas: o selo por abertura é do que o aluno consegue treinar hoje. A Alapin (1 linha
  // só no Base) tinha o menor Base do índice e aparecia como o selo "mais perto" no painel — mas
  // o curso dela está bloqueado (`lib/aberturas/vitrine.ts`), e `/aberturas/.../treino` redireciona
  // quem tenta abri-la. Um selo que ninguém consegue ganhar não é "mais perto", é enganoso (Doug,
  // 18/9/2026).
  const indiceLiberado = d.indice.filter((e) => naVitrine(e.cor, e.abertura)?.liberada === true);

  return {
    temasFechados,
    aulasAprendidas: aprendidasDaTrilha(d.aulasDeFinais, d.finais, d.comPratica).size,
    repertorio: {
      aberturas: aberturasDoRepertorio(indiceLiberado, repertorio, d.trava.trancadas),
      baseCompleto: baseCompleto(repertorio, d.indice, d.trava.trancadas),
      avancadoCompleto: linhasTodas > 0 && aprendidasTodas >= linhasTodas,
    },
    conquistado: d.conquistado,
    diasComUmaHora: diasComOMinimo(d.minutos),
    maiorSequencia: maiorSequenciaDeDias(d.minutos),
    // O máximo e a melhor sequência, que só sobem: selo ganho não some.
    ratingTatica: d.ratingTatica
      ? {
          maximo: d.ratingTatica.ratingMaximo,
          melhorSequencia: d.ratingTatica.melhorSequencia,
          inicio: d.ratingTatica.ratingInicial,
          resolvidos: d.ratingTatica.resolvidos,
        }
      : null,
    puzzles: d.puzzles,
    aberturas: {
      concluidas: [...d.trava.cursos.values()].flat().filter((a) => d.trava.concluidas.has(a.id)).length,
      cursos: cursosParaOsSelos(d.trava, d.indice),
    },
  };
}

type LinhaGravada = { selo: string; conquistado_em: string; visto_em: string | null };

const doBanco = (l: LinhaGravada): SeloGravado => ({ selo: l.selo, conquistadoEm: l.conquistado_em, vistoEm: l.visto_em });

export type SelosDoAluno = {
  /** A lista inteira (ganhos e trancados), com a data dos ganhos. */
  readonly lista: readonly SeloComData[];
  /** Os selos a anunciar agora ("Selo novo"). Vazio na primeira vez, e depois de vistos. */
  readonly novos: readonly Selo[];
};

/**
 * Deriva, grava o que é novo e devolve a lista com datas — para **o aluno da sessão**.
 *
 * `aluno` tem de ser `perfilAtual().id`: a escrita é pela chave de serviço (a tabela não tem
 * política de `insert`), e a chave não sabe quem pediu. As duas páginas que chamam passam o id
 * da sessão, e nenhuma aceita id de fora.
 *
 * **Uma falha aqui não derruba a página.** O painel é a primeira tela do aluno; se o banco
 * recusar a gravação, ele vê os selos derivados, sem data e sem aviso, e a próxima visita
 * tenta de novo — o plano é idempotente.
 */
export async function sincronizarSelos(aluno: string, entrada: ParaOsSelos): Promise<SelosDoAluno> {
  const derivados = selos(entrada);
  try {
    const admin = criarClienteAdmin();
    const [gravadosLidos, inicio] = await Promise.all([
      admin.from("selo_conquistado").select("selo, conquistado_em, visto_em").eq("aluno", aluno),
      admin.from("selo_inicio").select("aluno").eq("aluno", aluno).maybeSingle(),
    ]);
    if (gravadosLidos.error) throw new Error(gravadosLidos.error.message);
    if (inicio.error) throw new Error(inicio.error.message);

    const gravados = ((gravadosLidos.data ?? []) as LinhaGravada[]).map(doBanco);
    const agora = new Date().toISOString();
    const plano = planoDosSelos({
      ganhos: derivados.filter((s) => s.ganho).map((s) => s.id),
      gravados,
      iniciado: inicio.data !== null,
      agora,
    });

    // As linhas antes da marca: se a marca falhar, a próxima visita é "primeira vez" de novo e
    // grava calada — o contrário (marca sem linhas) viraria uma festa de tudo de uma vez.
    if (plano.gravar.length > 0) {
      const { error } = await admin
        .from("selo_conquistado")
        .upsert(plano.gravar.map((linha) => ({ aluno, ...linha })), { onConflict: "aluno,selo", ignoreDuplicates: true });
      if (error) throw new Error(error.message);
    }
    if (plano.marcarInicio) {
      const { error } = await admin
        .from("selo_inicio")
        .upsert({ aluno, em: agora }, { onConflict: "aluno", ignoreDuplicates: true });
      if (error) throw new Error(error.message);
    }

    const todos: SeloGravado[] = [
      ...gravados,
      ...plano.gravar.map((l) => ({ selo: l.selo, conquistadoEm: l.conquistado_em, vistoEm: l.visto_em })),
    ];
    const lista = comDatas(derivados, todos);
    const aAnunciar = new Set(plano.anunciar);
    return { lista, novos: lista.filter((s) => aAnunciar.has(s.id)) };
  } catch (erro) {
    console.error("selos: não foi possível gravar/ler os selos conquistados:", erro);
    return { lista: comDatas(derivados, []), novos: [] };
  }
}

/**
 * Os selos gravados de um aluno, pela sessão de quem lê — o professor lê qualquer um (RLS).
 * Só leitura: o relatório do professor não grava nada no nome do aluno.
 */
export async function selosGravados(aluno: string): Promise<SeloGravado[]> {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("selo_conquistado")
    .select("selo, conquistado_em, visto_em")
    .eq("aluno", aluno)
    .order("conquistado_em");
  return ((data ?? []) as LinhaGravada[]).map(doBanco);
}
