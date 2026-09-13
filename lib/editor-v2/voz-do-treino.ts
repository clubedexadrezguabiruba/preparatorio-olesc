/**
 * Tudo o que o aluno lê num treino v2, para a régua de voz (plano final §6 e §12).
 *
 * Mesma ideia de `falasDaAula` (`lib/lesson/voz.ts`): a lista é **explícita**, e cada
 * texto vem com o lugar dele em nomes que o professor reconhece — pergunta, resposta,
 * defesa —, nunca em id.
 *
 * ## A fala do defensor é colhida como o aluno a lê
 *
 * Quando a defesa tem texto, o painel mostra o feedback da resposta **seguido** do texto
 * da defesa, numa fala só (`juntarFala`). É essa soma que paga o teto de caracteres: um
 * feedback de 150 e um texto de 60 cabem sozinhos e estouram juntos. O feedback sozinho
 * só é colhido onde ele aparece sozinho — resposta que repete ou encerra sem texto, ou
 * defesa sem texto.
 *
 * ## O que fica fora, e por quê
 *
 * O texto do catálogo de erros e as mensagens padrão não aparecem no treino v2: o erro
 * conhecido mostra o feedback da própria resposta, e o lance fora da linha mostra
 * `FORA_DA_LINHA`. Colher o que o aluno não lê seria cobrar a régua do bastidor.
 *
 * A régua **avisa e não impede salvar**, como no editor v1 (`app/editor/acoes.ts`): ela
 * é editorial, e a última palavra é do professor.
 */
import type { Fala } from "../lesson/regua.ts";
import type { TreinoV2 } from "./modelo.ts";
import { juntarFala } from "./treino-jogavel.ts";

export function falasDoTreinoV2(treino: TreinoV2): Fala[] {
  const nome = `Treino «${treino.titulo}»`;
  const falas: Fala[] = [
    { onde: `${nome} · título`, texto: treino.titulo, tipo: "rotulo" },
    { onde: `${nome} · objetivo`, texto: treino.objetivo, tipo: "fala" },
  ];
  if (treino.introducao) falas.push({ onde: `${nome} · introdução`, texto: treino.introducao, tipo: "fala" });
  if (treino.explicacaoConclusao) falas.push({ onde: `${nome} · explicação ao concluir`, texto: treino.explicacaoConclusao, tipo: "fala" });
  if (treino.defesaInicial?.texto) {
    falas.push({ onde: `${nome} · defesa inicial ${treino.defesaInicial.move}`, texto: treino.defesaInicial.texto, tipo: "fala" });
  }

  treino.questoes.forEach((questao, qi) => {
    const pergunta = `${nome} · Pergunta ${qi + 1}`;
    if (questao.dica) falas.push({ onde: `${pergunta} · dica`, texto: questao.dica, tipo: "fala" });
    questao.respostas.forEach((resposta, ri) => {
      const lugar = `${pergunta} · resposta ${ri + 1}`;
      const { efeito } = resposta;
      let feedbackSozinho = true;
      if (efeito.tipo === "avanca") {
        const comTexto = efeito.defesas.filter((defesa) => defesa.texto);
        for (const defesa of comTexto) {
          falas.push({ onde: `${lugar} · defesa ${defesa.move}`, texto: juntarFala(resposta.feedback, defesa.texto!), tipo: "fala" });
        }
        feedbackSozinho = comTexto.length < efeito.defesas.length;
      } else if (efeito.tipo === "encerra" && efeito.defesaFinal && efeito.textoDaDefesaFinal) {
        falas.push({ onde: `${lugar} · defesa final ${efeito.defesaFinal}`, texto: juntarFala(resposta.feedback, efeito.textoDaDefesaFinal), tipo: "fala" });
        feedbackSozinho = false;
      }
      if (feedbackSozinho) falas.push({ onde: `${lugar} · feedback`, texto: resposta.feedback, tipo: "fala" });
    });
  });
  return falas;
}
