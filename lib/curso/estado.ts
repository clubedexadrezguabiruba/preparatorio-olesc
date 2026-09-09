import "server-only";
import { aulasPublicadas } from "@/lib/finais/conteudo";
import { progressoDeFinais } from "@/lib/finais/progresso";
import { lerIndice } from "@/lib/repertorio/banco";
import { progressoDoRepertorio } from "@/lib/repertorio/progresso";
import { aprendidasDaAbertura, baseCompleto } from "@/lib/repertorio/treino";
import { progressoPorTema } from "@/lib/tatica/progresso";
import type { ProgressoParaONivel } from "./nivel";

/**
 * Tudo o que a regra do nível precisa saber sobre um aluno, montado do banco.
 *
 * ## Por que existe, sendo três consultas que o painel já faz
 *
 * Porque quem **concede** o nível não é o painel — é a ação que encerra a prova
 * (`app/nivel/acoes.ts`), e ela precisa recalcular `prontoParaProva` do zero,
 * no servidor, sem confiar em nada que veio do navegador. Duas montagens do
 * mesmo objeto em dois arquivos seriam duas chances de a tela dizer "faça a
 * prova" e o servidor responder "você não está pronto" — com o aluno na frente,
 * e sem explicação possível.
 *
 * O painel monta o dele das leituras que já fez na mesma rajada, e é o certo
 * lá: ele já tem tudo na memória, e chamar isto seria pagar as três consultas
 * de novo. O que não pode divergir é a **forma** do objeto, e o tipo é o mesmo.
 *
 * ## O repertório conta as linhas liberadas, e não as 20 do Base
 *
 * `linhasAprendidas` é a mesma conta de `/aberturas` e do painel: aprendidas
 * entre as **visíveis**, que enquanto o portão do Avançado está fechado são as
 * do Base. Contar as trancadas daria ao aluno um numerador que ele não pode
 * mover.
 */
export async function estadoParaONivel(aluno: string): Promise<ProgressoParaONivel> {
  const [tatica, finais, indice, repertorio] = await Promise.all([
    progressoPorTema(aluno),
    progressoDeFinais(aluno),
    lerIndice(),
    progressoDoRepertorio(aluno),
  ]);

  const destravado = baseCompleto(repertorio, indice);
  const linhasAprendidas = indice.reduce(
    (soma, e) => soma + aprendidasDaAbertura(repertorio, e, destravado),
    0,
  );
  return {
    temas: new Map([...tatica].map(([tema, p]) => [tema, p.feitos])),
    finais,
    publicadas: aulasPublicadas(),
    linhasAprendidas,
    baseCompleto: destravado,
  };
}
