import "server-only";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { NIVEIS, type Nivel } from "@/lib/curso/nivel";

/**
 * Qual nível cada aluno já conquistou — a leitura de `nivel_conquistado`.
 *
 * ## Uma consulta, e a conta é um `max`
 *
 * A tabela é um **log**: uma linha por (aluno, nível), escrita no momento em
 * que ele passou na prova daquele nível (migration 0008). O que as telas
 * querem é um número só — o degrau mais alto —, e ele é o maior `nivel` das
 * linhas do aluno. Zero quando não há linha nenhuma.
 *
 * Um `max` sobre no máximo cinco linhas não merece view nem índice; o que ele
 * merece é morar **num lugar só**, porque o painel, a `/trilha`, a `/tatica` e
 * o relatório do professor fazem todos a mesma pergunta. Escrita quatro vezes,
 * ela é quatro chances de uma tela dizer "Nível 2" e a outra "Nível 3" com o
 * aluno na frente.
 *
 * ## Quem filtra por aluno é a RLS
 *
 * Como em todo o resto do site: a política `nivel_le_o_seu` entrega ao aluno só
 * as linhas dele e ao professor as de todos. O parâmetro `aluno` existe para o
 * relatório escolher *qual* aluno olhar, e não para proteger nada — se ele
 * fosse a proteção, apagá-lo não mudaria nada na tela e mudaria tudo na
 * segurança.
 *
 * ## Escrever não é daqui
 *
 * Não há função de concessão neste arquivo, e é de propósito: **a única ação
 * que pode conceder um nível é a que encerra a prova**, e ela roda com chave de
 * serviço depois de reconferir `prontoParaProva`. Uma função de escrita
 * exportada de um módulo de leitura seria o convite para uma segunda porta.
 */

type LinhaDoNivel = { aluno: string; nivel: number };

function maiorNivel(niveis: readonly number[]): 0 | Nivel {
  let maior: 0 | Nivel = 0;
  for (const n of niveis) {
    // Um número fora de 1..5 no banco não pode virar um `Nivel` no TypeScript:
    // o `check` da migration já o proíbe, mas quem lê um banco confia menos.
    const valido = NIVEIS.find((v) => v === n);
    if (valido !== undefined && valido > maior) maior = valido;
  }
  return maior;
}

/** O nível conquistado por um aluno. `0` quando ele ainda não passou em nenhum. */
export async function nivelConquistado(aluno: string): Promise<0 | Nivel> {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("nivel_conquistado")
    .select("aluno, nivel")
    .eq("aluno", aluno);
  return maiorNivel(((data ?? []) as LinhaDoNivel[]).map((l) => l.nivel));
}

/**
 * O nível conquistado de cada aluno da turma — a porta do relatório do
 * professor, que enxerga todo mundo pela RLS.
 *
 * Uma consulta para a turma inteira, e não uma por aluno: doze idas ao banco
 * numa tela que já faz outras seis é o tipo de coisa que só aparece em
 * produção.
 */
export async function niveisDaTurma(): Promise<Map<string, 0 | Nivel>> {
  const supabase = await criarClienteServidor();
  const { data } = await supabase.from("nivel_conquistado").select("aluno, nivel");

  const porAluno = new Map<string, number[]>();
  for (const linha of (data ?? []) as LinhaDoNivel[]) {
    porAluno.set(linha.aluno, [...(porAluno.get(linha.aluno) ?? []), linha.nivel]);
  }

  return new Map([...porAluno].map(([aluno, niveis]) => [aluno, maiorNivel(niveis)]));
}
