/**
 * Como um nome que o professor escreveu vira um id que o schema v2 aceita.
 *
 * ## Por que isto mora num arquivo só
 *
 * `idV2Schema` exige `^[a-z][a-z0-9-]*$`, e duas partes do editor precisam
 * fabricar ids a partir de texto livre: a importação de PGN (o nome do capítulo
 * vem da tag `[Event]`) e o diálogo de adicionar capítulo (o nome vem do campo).
 * Duas cópias desta regra seriam duas opiniões sobre o que é um id — e a
 * divergência só apareceria no dia em que o mesmo nome produzisse dois ids
 * diferentes e um deles colidisse.
 */
import type { AulaV2 } from "./modelo.ts";

/** `P1.07 - Peão de cavalo` vira `p1-07-peao-de-cavalo`, que é o que o id v2 aceita. */
export function comoId(texto: string, reserva: string): string {
  const limpo = texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
  return /^[a-z]/.test(limpo) ? limpo : reserva;
}

/**
 * Todos os ids internos que a aula já usa.
 *
 * É um conjunto **generoso de propósito**: os ids do v2 são únicos na aula
 * inteira, não dentro de cada lista (a importação descobriu isso do jeito caro —
 * 153 colisões de `no-1` entre doze capítulos). Quem fabrica um id novo compara
 * com tudo, e não só com a lista em que ele vai entrar.
 */
export function idsDaAulaV2(aula: AulaV2): Set<string> {
  const usados = new Set<string>();
  for (const analise of aula.analises) {
    usados.add(analise.id);
    for (const id of Object.keys(analise.nos)) usados.add(id);
  }
  for (const introducao of aula.introducoes) {
    usados.add(introducao.id);
    for (const quadro of introducao.quadros) usados.add(quadro.id);
  }
  for (const capitulo of aula.capitulos) {
    usados.add(capitulo.id);
    for (const narracao of capitulo.narracoes) usados.add(narracao.id);
  }
  for (const treino of aula.treinos) {
    usados.add(treino.id);
    for (const questao of treino.questoes) {
      usados.add(questao.id);
      for (const resposta of questao.respostas) usados.add(resposta.id);
    }
  }
  for (const pratica of aula.praticas) usados.add(pratica.id);
  for (const etapa of aula.fluxo) usados.add(etapa.id);
  return usados;
}
