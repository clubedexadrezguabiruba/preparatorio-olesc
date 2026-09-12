/**
 * Criar, ordenar e pausar narrações — §12.2.
 *
 * ## A narração é do capítulo, não do lance
 *
 * O mesmo nó pode ser narrado de um jeito num capítulo e de outro na comparação
 * (§15.3, item 4). Por isso tudo aqui recebe o `capituloId`, e nada toca no
 * comentário da análise.
 *
 * ## A ordem é a do array, entre as narrações do mesmo lance
 *
 * A prévia filtra `capitulo.narracoes` pelo nó e toca na ordem em que elas aparecem
 * (`previa.ts`). Não há campo `ordem`: seria uma segunda verdade, pronta para
 * divergir do array no primeiro remapeamento. Narrações de lances diferentes
 * nunca trocam de lugar entre si — a ordem delas é a do percurso.
 */
import { idsDaAulaV2 } from "./ids.ts";
import type { AulaV2, CapituloV2, NarracaoV2 } from "./modelo.ts";
import { percursoDoCapitulo } from "./previa.ts";

/**
 * Este lance aceita narração neste capítulo?
 *
 * Só se ele está no percurso. Uma narração num lance de variante seria texto que a
 * prévia nunca toca — e que o professor escreveu achando que o aluno ia ler.
 */
export function podeNarrar(capitulo: CapituloV2, nodeId: string): boolean {
  return percursoDoCapitulo(capitulo).includes(nodeId);
}

/**
 * O id da próxima narração deste lance.
 *
 * **Calculado, e não sorteado**, pelo mesmo motivo do `ADICIONAR_CAPITULO`: o id
 * chega pronto no comando, e o Refazer devolve a mesma narração. O prefixo é o da
 * importação (`narracao-<nó>`), e o sufixo só aparece quando esse já está em uso.
 */
export function novoIdDeNarracao(aula: AulaV2, nodeId: string): string {
  const usados = idsDaAulaV2(aula);
  const base = `narracao-${nodeId}`;
  if (!usados.has(base)) return base;
  let n = 2;
  while (usados.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

function comCapitulo(aula: AulaV2, capituloId: string, mudar: (capitulo: CapituloV2) => CapituloV2): AulaV2 {
  const capitulo = aula.capitulos.find((item) => item.id === capituloId);
  if (!capitulo) throw new Error("capítulo inexistente");
  const novo = mudar(capitulo);
  // Mudança sem efeito devolve a mesma aula, e com isso não entra no histórico (§6.1).
  if (novo === capitulo) return aula;
  return { ...aula, capitulos: aula.capitulos.map((item) => item.id === capituloId ? novo : item) };
}

export function comNarracaoNova(
  aula: AulaV2,
  pedido: { capituloId: string; nodeId: string; narracaoId: string; texto: string },
): AulaV2 {
  return comCapitulo(aula, pedido.capituloId, (capitulo) => {
    const texto = pedido.texto.trim();
    // Caixa aberta e deixada vazia é desistência, não narração: o schema não aceita
    // texto vazio, e §12.2 já diz que esvaziar remove.
    if (!texto) return capitulo;
    if (!podeNarrar(capitulo, pedido.nodeId)) {
      throw new Error("este lance não está no percurso do capítulo, e a narração dele nunca seria mostrada");
    }
    if (idsDaAulaV2(aula).has(pedido.narracaoId)) throw new Error("o id da narração já existe");
    const nova: NarracaoV2 = { id: pedido.narracaoId, nodeId: pedido.nodeId, texto, pausa: "temporizada" };
    const ultima = capitulo.narracoes.findLastIndex((n) => n.nodeId === pedido.nodeId);
    const narracoes = [...capitulo.narracoes];
    narracoes.splice(ultima < 0 ? narracoes.length : ultima + 1, 0, nova);
    return { ...capitulo, narracoes };
  });
}

export function comNarracaoMovida(
  aula: AulaV2,
  pedido: { capituloId: string; narracaoId: string; direcao: "acima" | "abaixo" },
): AulaV2 {
  return comCapitulo(aula, pedido.capituloId, (capitulo) => {
    const de = capitulo.narracoes.findIndex((n) => n.id === pedido.narracaoId);
    if (de < 0) throw new Error("narração inexistente");
    const doLance = capitulo.narracoes.flatMap((n, i) => n.nodeId === capitulo.narracoes[de].nodeId ? [i] : []);
    const vizinha = doLance[doLance.indexOf(de) + (pedido.direcao === "acima" ? -1 : 1)];
    // Na ponta não há com quem trocar; e nunca se troca com narração de outro lance.
    if (vizinha === undefined) return capitulo;
    const narracoes = [...capitulo.narracoes];
    [narracoes[de], narracoes[vizinha]] = [narracoes[vizinha], narracoes[de]];
    return { ...capitulo, narracoes };
  });
}

export function comPausaDaNarracao(
  aula: AulaV2,
  pedido: { capituloId: string; narracaoId: string; pausa: NarracaoV2["pausa"] },
): AulaV2 {
  return comCapitulo(aula, pedido.capituloId, (capitulo) => {
    const alvo = capitulo.narracoes.find((n) => n.id === pedido.narracaoId);
    if (!alvo) throw new Error("narração inexistente");
    if (alvo.pausa === pedido.pausa) return capitulo;
    return { ...capitulo, narracoes: capitulo.narracoes.map((n) => n === alvo ? { ...n, pausa: pedido.pausa } : n) };
  });
}
