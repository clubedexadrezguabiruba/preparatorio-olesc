import "server-only";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import type { ProgressoDaEscada } from "@/lib/finais/escada";
import { AULA_ZERADA, type ProgressoDaAula } from "@/lib/finais/trilha";

/**
 * A leitura do progresso de finais, num lugar só — o gêmeo de
 * `lib/tatica/progresso.ts`, e pelo mesmo motivo: três telas fazem a mesma
 * pergunta (a trilha de `/finais`, o cartão do painel e a coluna do relatório),
 * e três consultas escritas em três arquivos seriam três chances de o painel
 * dizer 6 e o relatório dizer 5 com o aluno na frente.
 *
 * ## Três tabelas, uma resposta
 *
 * O progresso de uma aula vem de três lugares, e a separação é de propósito:
 *
 * - a view `progresso_aula`, que soma o que foi **jogado** e reconferido no
 *   servidor — quantas tentativas, quando foi a última;
 * - `aula_lida`, que guarda o que o aluno **declarou** nas aulas de leitura;
 * - `finais_progresso`, que guarda **em que degrau da escada** cada aula está,
 *   escrita pelo servidor depois de reproduzir a partida (migration 0007).
 *
 * A terceira entrou em 2026-09-08 e é a que responde "o aluno sabe isto?". A
 * view não responde mais: o `bool_or` dela diz "conseguiu em alguma tentativa",
 * que era o critério antigo de "dominada" e virou apenas um fato do histórico.
 *
 * Juntá-las é o trabalho daqui; decidir o que a junção significa é de
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
  ultima: string | null;
};

type LinhaDeLeitura = { aluno: string; aula: string };

type LinhaDaEscada = {
  aluno: string;
  aula: string;
  degrau: number;
  revisar_em: string | null;
  tentativas: number;
  erros: number;
  aprendida_em: string | null;
  ultima_em: string;
};

/**
 * Uma consulta a cada tabela, e a junção em memória.
 *
 * Três idas ao banco em vez de um `join` no SQL porque as três partes não têm o
 * mesmo dono: a view soma tentativas, `aula_lida` guarda declarações e
 * `finais_progresso` guarda o degrau — e uma aula de leitura nunca aparece na
 * primeira nem na terceira. Um `full outer join` numa view agregada resolveria
 * isso ao custo de mais uma view para manter, e as três consultas custam,
 * juntas, menos que a renderização da tela que as pediu.
 *
 * Elas vão **em paralelo** (`Promise.all`), então a latência é a da mais lenta,
 * e não a soma.
 */
async function ler(aluno?: string): Promise<Map<string, Map<string, ProgressoDaAula>>> {
  const supabase = await criarClienteServidor();

  let daView = supabase
    .from("progresso_aula")
    .select("aluno, aula, solo_ok, pratica_ok, tentativas, ultima");
  let daLeitura = supabase.from("aula_lida").select("aluno, aula");
  let daEscada = supabase
    .from("finais_progresso")
    .select("aluno, aula, degrau, revisar_em, tentativas, erros, aprendida_em, ultima_em");
  if (aluno) {
    daView = daView.eq("aluno", aluno);
    daLeitura = daLeitura.eq("aluno", aluno);
    daEscada = daEscada.eq("aluno", aluno);
  }

  const [jogadas, lidas, naEscada] = await Promise.all([daView, daLeitura, daEscada]);
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
      ultima: linha.ultima,
    });
  }

  for (const linha of (lidas.data ?? []) as LinhaDeLeitura[]) {
    const aulas = doAluno(linha.aluno);
    aulas.set(linha.aula, { ...(aulas.get(linha.aula) ?? AULA_ZERADA), lida: true });
  }

  for (const linha of (naEscada.data ?? []) as LinhaDaEscada[]) {
    const aulas = doAluno(linha.aluno);
    const escada: ProgressoDaEscada = {
      degrau: linha.degrau,
      revisarEm: linha.revisar_em,
      tentativas: linha.tentativas,
      erros: linha.erros,
      aprendidaEm: linha.aprendida_em,
      ultimaEm: linha.ultima_em,
    };
    aulas.set(linha.aula, { ...(aulas.get(linha.aula) ?? AULA_ZERADA), escada });
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

/*
 * **`eventosDeAulas` saiu daqui em 2026-09-08.**
 *
 * Ela lia `tentativas_aula` inteira, com data, para o antigo `revisao.ts`
 * derivar a agenda de revisão a cada tela — porque não havia onde guardar
 * "quando dominou" e "quantas revisões já venceu".
 *
 * Agora há: `finais_progresso` guarda o degrau e a data, e quem os escreve é o
 * servidor no instante da partida. A fila do dia passou a ser uma leitura
 * (`aulasVencidas`, em `lib/finais/escada.ts`) em vez de uma varredura do log —
 * e o log volta a ser o que ele é, o histórico que o professor lê.
 */
