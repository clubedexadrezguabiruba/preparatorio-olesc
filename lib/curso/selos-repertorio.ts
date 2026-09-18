import type { EntradaDoIndice } from "../repertorio/linhas.ts";
import { aprendidasDaAbertura, idsLiberados, type ProgressoDaLinha } from "../repertorio/treino.ts";
import type { AberturaParaOSelo } from "./selos.ts";

/**
 * O repertório de cada abertura, como o selo dela o vê (17/9/2026) — lido do índice, por dados.
 *
 * O Doug achou o selo "Repertório de brancas" longo demais para ganhar: são 30 linhas do Base (medido no
 * índice de 17/9) numa conquista só. Agora cada abertura do índice tem o seu selo — de brancas, um por defesa do
 * adversário; de pretas, um por sistema. Uma abertura nova no `index.json` ganha selo sozinha.
 *
 * ## As três contas
 *
 * - **`base`**: as linhas do Base da abertura (`idsLiberados(e, false)`). O Avançado não conta: ele
 *   só abre depois do Base inteiro, e tem selo próprio (`repertorio-avancado`).
 * - **`aprendidas`**: delas, quantas estão aprendidas (`aprendidasDaAbertura`, a mesma régua da
 *   lista de aberturas).
 * - **`trancadas`**: delas, quantas a trava por aula ainda tranca (`travaDoAluno`).
 *
 * O selo pede `aprendidas === base` **e** `trancadas === 0`. A segunda parte é decisão: nas telas,
 * a linha trancada sai do denominador, mas um selo gravado não some — se ela saísse daqui também,
 * o aluno que aprendeu as 2 linhas abertas da Francesa (de 19) ficaria com o selo da Francesa para
 * sempre.
 *
 * ## Não filtra pela abertura estar liberada
 *
 * Quem chama para o aluno (painel, perfil) filtra o `indice` antes de passar — ver
 * `entradaDosSelos` em `selos-banco.ts`. Esta função continua recebendo qualquer índice, porque o
 * relatório do professor e a vitrine de um colega (`lib/turma/vitrine.ts`) montam o catálogo
 * inteiro para nomear selos já gravados, e um aluno pode ter ganho um selo numa abertura que foi
 * bloqueada depois.
 */
export function aberturasDoRepertorio(
  indice: readonly EntradaDoIndice[],
  progresso: ReadonlyMap<string, ProgressoDaLinha>,
  trancadas: ReadonlySet<string>,
): AberturaParaOSelo[] {
  return indice.map((e) => {
    const base = idsLiberados(e, false);
    return {
      cor: e.cor,
      abertura: e.abertura,
      nome: e.nome,
      base: base.length,
      aprendidas: aprendidasDaAbertura(progresso, e, false),
      trancadas: base.filter((id) => trancadas.has(id)).length,
    };
  });
}
