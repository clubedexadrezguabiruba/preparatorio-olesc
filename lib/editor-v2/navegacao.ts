/**
 * Navegação por teclado na árvore de lances (plano §16).
 *
 * ## Por que a lógica mora aqui, e não dentro do componente
 *
 * A tecla de verdade não chega à página do navegador embutido — evento disparado por
 * script prova o manipulador, não prova o teclado (plano §19). Então a parte que dá
 * para provar sozinha fica num arquivo puro: dado um documento, um nó e uma ação, qual
 * é o próximo nó. Isso roda em Node, sem tela. O que sobra no componente é ligar a
 * tecla à ação e mexer no foco — e essa parte é o teste humano do Doug.
 *
 * ## As seis ações, e por que são estas
 *
 * - `anterior` / `proximo` (← e →) andam **na linha**: pai e primeiro filho. É o gesto
 *   de reproduzir a partida, o mesmo do Lichess.
 * - `acima` / `abaixo` (↑ e ↓) andam **na lista desenhada**, entrada por entrada, na
 *   ordem exata em que o painel mostra — variantes incluídas. Quem olha a tela vê o
 *   cursor andar como o olho anda; não há ordem secreta.
 * - `inicio` (Home) volta à posição inicial. `fim` (End) desce até o fim **da linha
 *   atual**, seguindo o primeiro filho — é o ← e → repetido, não um salto para outro
 *   ramo da árvore.
 */
import type { AnaliseV2 } from "./modelo.ts";
import { entradasVerticais } from "./painel.ts";

export type AcaoDeTeclado = "anterior" | "proximo" | "acima" | "abaixo" | "inicio" | "fim";

/** O mínimo que precisamos saber de uma tecla — assim o teste não precisa de um DOM. */
export type TeclaCrua = {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
};

/** O mínimo que precisamos saber do elemento que estava em foco quando a tecla veio. */
export type AlvoCru = { tagName?: string; isContentEditable?: boolean; getAttribute?: (nome: string) => string | null } | null;

/**
 * Um campo de texto engole o atalho (plano §16).
 *
 * Sem isto, escrever "→" dentro do comentário do lance mudaria o lance por baixo do
 * texto — e o professor perderia o que estava escrevendo sem entender por quê.
 */
export function ehCampoDeTexto(alvo: AlvoCru): boolean {
  if (!alvo) return false;
  if (alvo.isContentEditable) return true;
  const tag = (alvo.tagName ?? "").toUpperCase();
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return alvo.getAttribute?.("role") === "textbox";
}

/**
 * Traduz a tecla em ação, ou devolve `null` quando não é conosco.
 *
 * Qualquer modificador (Ctrl, Alt, Meta, Shift) faz a tecla deixar de ser nossa: é o
 * espaço dos atalhos do navegador e do Desfazer/Refazer, e roubá-lo quebraria os dois.
 */
export function acaoDeTeclado(tecla: TeclaCrua): AcaoDeTeclado | null {
  if (tecla.ctrlKey || tecla.metaKey || tecla.altKey || tecla.shiftKey) return null;
  switch (tecla.key) {
    case "ArrowLeft": return "anterior";
    case "ArrowRight": return "proximo";
    case "ArrowUp": return "acima";
    case "ArrowDown": return "abaixo";
    case "Home": return "inicio";
    case "End": return "fim";
    default: return null;
  }
}

/** A ordem em que o painel desenha: a posição inicial e, depois, cada entrada. */
function ordemVisivel(analise: AnaliseV2): string[] {
  return [analise.raizId, ...entradasVerticais(analise).map((entrada) => entrada.nodeId)];
}

function paiDe(analise: AnaliseV2, nodeId: string): string | null {
  for (const no of Object.values(analise.nos)) if (no.filhos.includes(nodeId)) return no.id;
  return null;
}

/**
 * O nó em que a seleção fica depois da ação. Nunca lança e nunca devolve nó
 * inexistente: no limite devolve o próprio nó de partida, e a tela não se mexe.
 */
export function navegar(analise: AnaliseV2, nodeId: string, acao: AcaoDeTeclado): string {
  const atual = analise.nos[nodeId] ? nodeId : analise.raizId;
  switch (acao) {
    case "anterior":
      return paiDe(analise, atual) ?? atual;
    case "proximo":
      return analise.nos[atual].filhos[0] ?? atual;
    case "inicio":
      return analise.raizId;
    case "fim": {
      let fim = atual;
      const vistos = new Set<string>([fim]);
      let seguinte = analise.nos[fim].filhos[0];
      while (seguinte && analise.nos[seguinte] && !vistos.has(seguinte)) {
        fim = seguinte;
        vistos.add(fim);
        seguinte = analise.nos[fim].filhos[0];
      }
      return fim;
    }
    case "acima":
    case "abaixo": {
      const ordem = ordemVisivel(analise);
      const indice = ordem.indexOf(atual);
      if (indice < 0) return atual;
      const alvo = acao === "acima" ? indice - 1 : indice + 1;
      return ordem[alvo] ?? atual;
    }
  }
}
