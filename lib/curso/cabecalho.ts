import "server-only";
import { hojeNoBrasil, somarDias } from "./calendario.ts";
import { sequenciaDeDias } from "./hoje.ts";
import { minutosPorDia } from "./minutos.ts";
import { nivelDoAluno, type Nivel } from "./nivel.ts";
import { nivelConquistado } from "./progresso.ts";

/**
 * Os dois números que o cabeçalho mostra em toda tela de aluno: o nível e a
 * sequência de dias.
 *
 * ## Por que existe uma função para duas linhas
 *
 * Porque senão cada uma das seis telas montaria os dois por conta própria, e
 * seis montagens são seis chances de uma delas contar diferente — que é
 * exatamente o defeito que a rodada de 2026-09-09 veio matar em outro lugar.
 * O cabeçalho é a parte do site que aparece em todas as telas ao mesmo tempo:
 * se ele discordar de si mesmo, discorda na frente do aluno, duas vezes na
 * mesma sessão.
 *
 * ## Duas consultas, e elas correm juntas
 *
 * `nivelConquistado` e `minutosPorDia` não dependem uma da outra, então vão num
 * `Promise.all` só. Quem chama pode enfiar **esta** chamada dentro do próprio
 * `Promise.all` sem perder nada: o `await` de fora espera as duas de dentro em
 * paralelo com o resto da página.
 *
 * ## O painel não usa esta função, e é de propósito
 *
 * Ele já leu as duas coisas para desenhar o cartão Hoje e a faixa de nível.
 * Chamá-la lá seria repetir duas consultas para obter números que já estão na
 * memória — e a rajada única de 9 do `Promise.all` de lá existe justamente para
 * não haver consulta sobrando na primeira tela do aluno.
 */
export type DadosDoCabecalho = {
  readonly nivel: Nivel;
  readonly sequencia: number;
};

export async function dadosDoCabecalho(aluno: string): Promise<DadosDoCabecalho> {
  const hoje = hojeNoBrasil();
  const [conquistado, minutos] = await Promise.all([
    nivelConquistado(aluno),
    // Trinta dias: é o horizonte do preparatório inteiro, e o mesmo recorte que
    // o painel usa. Uma sequência mais longa que isso não cabe na barra nem
    // interessa a quem está em cima dela.
    minutosPorDia(aluno, somarDias(hoje, -30)),
  ]);
  return {
    nivel: nivelDoAluno(conquistado),
    sequencia: sequenciaDeDias(minutos, hoje),
  };
}
