"use server";

import { revalidatePath } from "next/cache";
import { perfilAtual } from "@/lib/auth/perfil";
import { lerAula } from "@/lib/finais/conteudo";
import { gravarTentativaDeAula, type ResultadoDeAula, type TentativaDeAula } from "@/lib/finais/gravar";
import { criarClienteServidor } from "@/lib/supabase/servidor";

export type { TentativaDeAula } from "@/lib/finais/gravar";

/**
 * Grava uma etapa jogada de uma aula de finais.
 *
 * A casca é fina como a de `registrarTentativa`: a primeira linha confere
 * **quem** está pedindo, e o `aluno` que segue adiante é o do cookie de sessão,
 * nunca um id vindo do corpo da chamada. Todo o resto — ler a aula do disco,
 * reproduzir os lances, escrever — é `lib/finais/gravar.ts`, que roda também
 * fora do Next e por isso tem prova em `scripts/verificar-finais.ts`.
 */
export async function registrarEtapa(tentativa: TentativaDeAula): Promise<ResultadoDeAula> {
  const perfil = await perfilAtual();
  return gravarTentativaDeAula(perfil.id, tentativa);
}

/**
 * Marca ou desmarca a leitura de uma aula do formato "leitura".
 *
 * Aqui não há lance para reconferir — o aluno está dizendo que leu o objetivo e
 * viu o exemplo até o fim —, então quem grava é ele mesmo, com a RLS de
 * `aula_lida` valendo. É o molde de `alternarTarefa`, e o cliente é o do
 * servidor com o cookie do aluno, **não** o de serviço.
 *
 * A conferência de que a aula existe não é zelo: sem ela, esta ação viraria
 * "escreva qualquer texto na sua linha de `aula_lida`". O que ela **não**
 * precisa conferir é o formato da aula: declarar leitura de uma aula completa
 * não dá selo nenhum, porque quem decide o que conta é a trilha
 * (`lib/finais/trilha.ts`, B4) — para a aula completa o critério é a etapa sem
 * ajuda mais a prática, e uma linha aqui não substitui nenhuma das duas.
 */
export async function marcarLeitura(aula: string, lida: boolean): Promise<void> {
  const perfil = await perfilAtual();
  if (!lerAula(aula)) return;

  const supabase = await criarClienteServidor();

  if (lida) {
    // Sem erro na segunda marcação: a chave primária `(aluno, aula)` já recusa
    // a linha repetida, e dois toques no celular não podem virar erro na tela.
    await supabase
      .from("aula_lida")
      .upsert({ aluno: perfil.id, aula }, { onConflict: "aluno,aula", ignoreDuplicates: true });
  } else {
    await supabase.from("aula_lida").delete().eq("aula", aula).eq("aluno", perfil.id);
  }

  revalidatePath("/finais");
}

/**
 * A aula de leitura já foi marcada por quem está logado?
 *
 * Existe porque `/finais/[aula]` é **estática**: o HTML da aula é o mesmo para
 * a turma inteira, e por isso não pode carregar dentro dele o que só vale para
 * um aluno. A alternativa seria renderizar a aula sob demanda — e cobrar de
 * todas as 49 uma ida ao banco na abertura para servir às duas que são de
 * leitura.
 *
 * Então quem pergunta é o controle, do navegador, ao montar: uma ida de rede
 * nas aulas que têm o controle, nenhuma nas outras.
 */
export async function leituraDaAula(aula: string): Promise<boolean> {
  const perfil = await perfilAtual();
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("aula_lida")
    .select("aula")
    .eq("aluno", perfil.id)
    .eq("aula", aula)
    .maybeSingle();
  return data !== null;
}
