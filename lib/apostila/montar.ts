import { BLOCOS } from "../tatica/blocos.ts";
import { temaEscrito } from "../tatica/conteudo.ts";
import { TAREFAS } from "../tarefas/conteudo.ts";
import type { Bloco, Caderno, Secao } from "./caderno.ts";
import type { BlocoAnalisado, CadernoAnalisado } from "./markdown.ts";
import { solucaoEmPortugues } from "./notacao.ts";
import { puzzlesDoTema } from "./puzzles.ts";

/**
 * A segunda fase: a estrutura que saiu do Markdown vira um caderno pronto.
 *
 * É aqui que os quatro comandos que dependem de dado externo — `@tema`,
 * `@exercicios`, `@tarefas` e `@gabarito` — deixam de ser marcação e viram
 * conteúdo. Separado do `analisar()` de propósito: aquele é pura transformação
 * de texto e se testa com uma string; este precisa do banco de puzzles de pé.
 *
 * ## O gabarito não é escrito, é contado
 *
 * As respostas saem da própria linha de solução do Lichess, traduzidas para
 * notação portuguesa. Ninguém digita gabarito — digitar seria criar uma segunda
 * opinião sobre qual é o lance certo, e a divergência apareceria com o aluno de
 * mão levantada dizendo que o site respondeu outra coisa.
 *
 * Por isso a montagem tem **duas passadas**: a primeira resolve os exercícios e
 * anota as respostas na ordem em que os números foram impressos; a segunda
 * troca o marcador `@gabarito` pela lista pronta. Numa passada só, o gabarito
 * teria de estar obrigatoriamente depois de tudo no arquivo, e o professor
 * perderia a liberdade de pôr as respostas onde quiser.
 */

type Resposta = { readonly numero: number; readonly tema: string; readonly solucao: string };

/** O nome em português do tema, que é o que sai impresso no gabarito. */
function nomeDoTema(tag: string): string {
  for (const bloco of BLOCOS) {
    for (const tema of bloco.temas) if (tema.tag === tag) return tema.nome;
  }
  return tag;
}

/**
 * O texto de um tema.
 *
 * O caderno impresso é caro — doze cópias, frente e verso —, e a explicação
 * longa de cada tema o aluno já tem na tela, no mesmo texto. O que só o papel
 * resolve é a lista do que procurar, que ele lê com o tabuleiro na frente. Por
 * isso `@tema` traz a lista e o cuidado; a explicação inteira só com
 * `@tema <nome> completo`.
 */
function blocosDoTema(tag: string, completo: boolean, linha: number): Bloco[] {
  const escrito = temaEscrito(tag);
  if (escrito === null) {
    throw new Error(`caderno, linha ${linha}: "${tag}" não tem texto em content/temas.json`);
  }

  const blocos: Bloco[] = [];
  if (completo) {
    for (const texto of escrito.explicacao) blocos.push({ tipo: "paragrafo", texto });
  }
  blocos.push({ tipo: "lista", itens: escrito.procure });
  if (escrito.cuidado !== undefined) {
    blocos.push({ tipo: "destaque", rotulo: "Cuidado:", texto: escrito.cuidado });
  }
  return blocos;
}

function blocosDasTarefas(semana: number, linha: number): Bloco[] {
  const daSemana = TAREFAS.filter((t) => t.semana === semana);
  if (daSemana.length === 0) {
    throw new Error(
      `caderno, linha ${linha}: a semana ${semana} não tem tarefa em content/tarefas.json`,
    );
  }
  return [{ tipo: "lista", itens: daSemana.map((t) => `**${t.titulo}.** ${t.detalhe}`) }];
}

export async function montarCaderno(analisado: CadernoAnalisado): Promise<Caderno> {
  const respostas: Resposta[] = [];
  let proximo = 1;

  /** Onde o `@gabarito` ficou, para a segunda passada preencher. */
  const buracos: { secao: number; bloco: number }[] = [];
  const secoes: Secao[] = [];

  for (const analisada of analisado.secoes) {
    const blocos: Bloco[] = [];

    for (const b of analisada.blocos as readonly BlocoAnalisado[]) {
      if (!("linha" in b)) {
        blocos.push(b);
        continue;
      }

      switch (b.tipo) {
        case "tema": {
          const [tag, modo] = b.tag.split(/\s+/);
          blocos.push(...blocosDoTema(tag, modo === "completo", b.linha));
          break;
        }

        case "tarefas":
          blocos.push(...blocosDasTarefas(b.semana, b.linha));
          break;

        case "exercicios": {
          const puzzles = await puzzlesDoTema(b.tag, b.quantos);
          const itens = puzzles.map((p) => {
            const numero = proximo;
            proximo += 1;
            respostas.push({
              numero,
              tema: nomeDoTema(b.tag),
              solucao: solucaoEmPortugues(p.puzzle),
            });
            return { ...p, numero };
          });
          blocos.push({ tipo: "diagramas", pedido: b.pedido, itens });
          break;
        }

        case "gabarito":
          buracos.push({ secao: secoes.length, bloco: blocos.length });
          // Um lugar guardado. A segunda passada troca por gente.
          blocos.push({ tipo: "gabarito", itens: [] });
          break;
      }
    }

    secoes.push({ titulo: analisada.titulo, blocos });
  }

  for (const { secao, bloco } of buracos) {
    const blocos = [...secoes[secao].blocos];
    blocos[bloco] = { tipo: "gabarito", itens: respostas };
    secoes[secao] = { ...secoes[secao], blocos };
  }

  return {
    numero: analisado.cabecalho.numero,
    titulo: analisado.cabecalho.titulo,
    sabado: analisado.cabecalho.sabado,
    subtitulo: analisado.cabecalho.subtitulo,
    secoes,
  };
}

/** Quantos exercícios numerados o caderno tem — um dos números que o build imprime. */
export function contarExercicios(caderno: Caderno): number {
  let total = 0;
  for (const secao of caderno.secoes) {
    for (const bloco of secao.blocos) {
      if (bloco.tipo === "diagramas") {
        total += bloco.itens.filter((i) => i.numero !== undefined).length;
      }
    }
  }
  return total;
}
