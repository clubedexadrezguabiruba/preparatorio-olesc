/**
 * As revisões pendentes da aula, juntas e resolvíveis — §19.2 e §5 do plano.
 *
 * ## O buraco que isto fecha
 *
 * A marca de revisão nasceu com a troca de posição inicial (§9): tudo o que
 * sobrevive a uma mudança de chão fica marcado, porque "legalidade não comprova
 * validade pedagógica". A marca aparecia em dois lugares — junto do comentário e
 * junto da narração —, cada um com o seu botão **Já reli**, e no painel de
 * problemas como `REVISAO_PENDENTE`.
 *
 * Faltavam duas coisas, e as duas eram do mesmo tipo:
 *
 * 1. **O quadro de introdução era marcado e não tinha como ser desmarcado.** O
 *    editor de introdução não tem tela, então não havia onde pôr o botão. Uma
 *    marca sem porta de saída é uma armadilha: §5 manda resolver as revisões
 *    antes de publicar, e o professor não tinha como resolver aquela.
 * 2. **Não havia onde ver todas de uma vez.** Depois de uma troca que marca
 *    dezesseis textos, o professor precisava caçar um a um pela árvore, guiado
 *    por avisos que dizem "no 3º lance do capítulo X" — e perder um era o
 *    resultado provável.
 *
 * Esta lista é a tela dos dois: ela nomeia cada marca, mostra o trecho que
 * precisa ser relido, leva até ele e resolve ali mesmo.
 *
 * ## Por que o trecho aparece na lista
 *
 * Porque reler é o trabalho, e "o 3º lance do capítulo «Peão na sexta»" não é o
 * texto — é o endereço dele. Com as primeiras palavras à vista, boa parte das
 * marcas se resolve sem sair da lista: quem escreveu "o rei branco está na
 * oposição" reconhece na hora se aquilo ainda é verdade no tabuleiro novo.
 */
import type { DestinoV2 } from "./diagnostico-visual.ts";
import { semRevisao, type AlvoDeRevisaoV2 } from "./trocar-posicao.ts";
import type { AulaV2 } from "./modelo.ts";

export type RevisaoPendenteListadaV2 = {
  /** Chave estável para a tela — os três tipos moram no mesmo espaço de nomes. */
  chave: string;
  alvo: AlvoDeRevisaoV2;
  /** Que tipo de texto é: o professor procura por isso primeiro. */
  tipo: "comentário" | "narração" | "quadro da introdução";
  /** Onde está, com os nomes que o professor escreveu. */
  onde: string;
  /** O começo do texto marcado, para reconhecer sem sair da lista. */
  trecho: string;
  destino: DestinoV2 | null;
};

function recortar(texto: string, tamanho = 90): string {
  const limpo = texto.replace(/\s+/g, " ").trim();
  return limpo.length > tamanho ? `${limpo.slice(0, tamanho)}…` : limpo;
}

/**
 * Todas as marcas de revisão da aula, na ordem em que o professor as encontra:
 * primeiro a introdução, depois os capítulos, e dentro de cada capítulo o
 * comentário antes da narração — que é a ordem em que os dois aparecem na tela.
 */
export function revisoesPendentesV2(aula: AulaV2): RevisaoPendenteListadaV2[] {
  const lista: RevisaoPendenteListadaV2[] = [];

  for (const introducao of aula.introducoes) {
    introducao.quadros.forEach((quadro, indice) => {
      if (!quadro.revisao) return;
      lista.push({
        chave: `quadro:${introducao.id}:${quadro.id}`,
        alvo: { introducaoId: introducao.id, quadroId: quadro.id },
        tipo: "quadro da introdução",
        onde: `${indice + 1}º quadro de «${introducao.titulo}»`,
        trecho: recortar(quadro.texto),
        destino: null,
      });
    });
  }

  /*
   * O comentário é da **análise**, e uma análise pode ser mostrada por mais de
   * um capítulo. A lista o atribui ao primeiro capítulo que a mostra, porque é
   * por um capítulo que a tela chega até o lance — e não porque o comentário
   * pertença a ele.
   */
  const capituloDaAnalise = new Map<string, { id: string; titulo: string }>();
  for (const capitulo of aula.capitulos) {
    if (!capituloDaAnalise.has(capitulo.analiseId)) {
      capituloDaAnalise.set(capitulo.analiseId, { id: capitulo.id, titulo: capitulo.titulo });
    }
  }

  for (const analise of aula.analises) {
    const capitulo = capituloDaAnalise.get(analise.id);
    for (const no of Object.values(analise.nos)) {
      if (!no.revisao) continue;
      lista.push({
        chave: `no:${analise.id}:${no.id}`,
        alvo: { analiseId: analise.id, nodeId: no.id },
        tipo: "comentário",
        onde: capitulo ? `um lance de «${capitulo.titulo}»` : "um lance de uma partida sem capítulo",
        trecho: recortar(no.comentario ?? "(sem texto: o que mudou foram os desenhos desta posição)"),
        destino: capitulo ? { capituloId: capitulo.id, analiseId: analise.id, nodeId: no.id } : { analiseId: analise.id, nodeId: no.id },
      });
    }
  }

  for (const capitulo of aula.capitulos) {
    for (const narracao of capitulo.narracoes) {
      if (!narracao.revisao) continue;
      lista.push({
        chave: `narracao:${capitulo.id}:${narracao.id}`,
        alvo: { capituloId: capitulo.id, narracaoId: narracao.id },
        tipo: "narração",
        onde: `«${capitulo.titulo}»`,
        trecho: recortar(narracao.texto),
        destino: { capituloId: capitulo.id, analiseId: capitulo.analiseId, nodeId: narracao.nodeId },
      });
    }
  }

  return lista;
}

/**
 * Resolve várias marcas de uma vez — **uma** ação no histórico.
 *
 * É um comando só, e não N, porque é um gesto só: o professor releu a aula
 * inteira e diz que ela está de pé. Se fossem N comandos, desfazer aquilo
 * exigiria N Ctrl+Z, e o décimo sexto desfaria alguma outra coisa.
 */
export function semRevisoes(aula: AulaV2, alvos: AlvoDeRevisaoV2[]): AulaV2 {
  return alvos.reduce((atual, alvo) => semRevisao(atual, alvo), aula);
}
