import "server-only";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { AULA_ZERADA, type ProgressoDaAula } from "@/lib/finais/trilha";

/**
 * A leitura do progresso de finais, num lugar só — o gêmeo de
 * `lib/tatica/progresso.ts`, e pelo mesmo motivo: três telas fazem a mesma
 * pergunta (a trilha de `/finais`, o cartão do painel e a coluna do relatório),
 * e três consultas escritas em três arquivos seriam três chances de o painel
 * dizer 6 e o relatório dizer 5 com o aluno na frente.
 *
 * ## Duas tabelas, uma resposta
 *
 * O progresso de uma aula vem de dois lugares que o B3 separou de propósito: a
 * view `progresso_aula`, que soma o que foi **jogado** e reconferido no
 * servidor, e `aula_lida`, que guarda o que o aluno **declarou** nas aulas de
 * leitura. Juntá-las é o trabalho daqui; decidir o que a junção significa é de
 * `lib/finais/trilha.ts`, que sabe o formato de cada aula.
 *
 * ## Quem filtra por aluno é a RLS
 *
 * Como em todo o resto do site: a view roda com `security_invoker`, e as
 * políticas de `0004_finais.sql` entregam ao aluno só as linhas dele e ao
 * professor as de todos. O parâmetro `aluno` existe para o relatório escolher
 * *qual* aluno olhar, e não para proteger nada — se ele fosse a proteção,
 * apagá-lo não mudaria nada na tela e mudaria tudo na segurança.
 */

type LinhaDaView = {
  aluno: string;
  aula: string;
  solo_ok: boolean | null;
  pratica_ok: boolean | null;
  tentativas: number | null;
};

type LinhaDeLeitura = { aluno: string; aula: string };

/**
 * Uma consulta a cada tabela, e a junção em memória.
 *
 * Duas idas ao banco em vez de um `join` no SQL porque as duas metades não têm
 * o mesmo dono: a view soma tentativas e a tabela guarda declarações, e uma
 * aula de leitura nunca aparece na primeira. Um `full outer join` numa view
 * agregada resolveria isso ao custo de uma segunda view para manter — e as duas
 * consultas custam, juntas, menos que a renderização da tela que as pediu.
 */
async function ler(aluno?: string): Promise<Map<string, Map<string, ProgressoDaAula>>> {
  const supabase = await criarClienteServidor();

  let daView = supabase.from("progresso_aula").select("aluno, aula, solo_ok, pratica_ok, tentativas");
  let daLeitura = supabase.from("aula_lida").select("aluno, aula");
  if (aluno) {
    daView = daView.eq("aluno", aluno);
    daLeitura = daLeitura.eq("aluno", aluno);
  }

  const [jogadas, lidas] = await Promise.all([daView, daLeitura]);
  const porAluno = new Map<string, Map<string, ProgressoDaAula>>();

  const doAluno = (id: string) => {
    const atual = porAluno.get(id) ?? new Map<string, ProgressoDaAula>();
    porAluno.set(id, atual);
    return atual;
  };

  for (const linha of (jogadas.data ?? []) as LinhaDaView[]) {
    doAluno(linha.aluno).set(linha.aula, {
      ...AULA_ZERADA,
      soloOk: linha.solo_ok === true,
      praticaOk: linha.pratica_ok === true,
      tentativas: linha.tentativas ?? 0,
    });
  }

  for (const linha of (lidas.data ?? []) as LinhaDeLeitura[]) {
    const aulas = doAluno(linha.aluno);
    aulas.set(linha.aula, { ...(aulas.get(linha.aula) ?? AULA_ZERADA), lida: true });
  }

  return porAluno;
}

/**
 * O progresso por aula, do aluno pedido.
 *
 * **Passe sempre o id.** O parâmetro é opcional para caber no molde de
 * `progressoPorTema`, mas aqui a omissão só é correta para um aluno, porque a
 * RLS já lhe entrega uma linha por aula e mais nada. Para um professor — que
 * enxerga a turma inteira — omitir somaria doze alunos num mapa só; a porta
 * dele é `finaisDaTurma`, logo abaixo. Como toda tela que chama esta função já
 * pediu `perfilAtual()` uma linha antes, passar o id não custa consulta
 * nenhuma.
 *
 * Mapa vazio é resposta legítima e comum: é o aluno que ainda não abriu nenhuma
 * aula. Quem completa o buraco é `AULA_ZERADA`, na tela.
 */
export async function progressoDeFinais(aluno?: string): Promise<Map<string, ProgressoDaAula>> {
  const porAluno = await ler(aluno);
  if (aluno) return porAluno.get(aluno) ?? new Map();

  const junto = new Map<string, ProgressoDaAula>();
  for (const aulas of porAluno.values()) {
    for (const [aula, p] of aulas) junto.set(aula, p);
  }
  return junto;
}

/**
 * O mesmo, mas de todo mundo que a RLS entregar: uma consulta para a turma
 * inteira, em vez de uma por aluno.
 *
 * Só o relatório do professor chama. Com doze alunos, doze idas ao banco na
 * renderização de uma tabela seria o tipo de lentidão que ninguém investiga
 * porque cada consulta, sozinha, é rápida.
 */
export async function finaisDaTurma(): Promise<Map<string, Map<string, ProgressoDaAula>>> {
  return ler();
}
