/**
 * Os vinte avatares que o aluno pode escolher (Doug, 17/9/2026: dez, e depois mais dez).
 *
 * O aluno troca **só o desenho** — o nome, o usuário, a equipe e o rating são do
 * professor. Este arquivo é puro de propósito: a lista, a pergunta "isto é um
 * avatar?" e a linha que vai para o banco moram aqui, sem Supabase e sem React,
 * para que o teste as alcance sem servidor. O desenho de cada um está em
 * `components/avatar/Avatares.tsx`; a mesma lista está no `check` do banco (a
 * última migração que redefine `perfis_avatar_valido` — hoje a `0017`), e
 * `avatares.test.ts` confere que as duas batem.
 *
 * O `nome` não aparece escrito na tela (Doug: "o nome fica muito infantil"): ele
 * existe para o leitor de tela. A `ideia` é só documentação.
 */

export const AVATARES = [
  { id: "peao-heroi", nome: "Peão Herói", ideia: "o peão de máscara e capa, pronto para salvar a partida" },
  { id: "peao-ninja", nome: "Peão Ninja", ideia: "faixa na testa, olhar sério e uma estrelinha voando" },
  { id: "peao-promovido", nome: "Peão Promovido", ideia: "chegou à oitava fileira e a coroa ficou grande demais" },
  { id: "torre-oculos", nome: "Torre Descolada", ideia: "óculos escuros e sorriso de canto: roque tranquilo" },
  { id: "torre-foguete", nome: "Torre Foguete", ideia: "a torre decola pela coluna aberta, de olhos arregalados" },
  { id: "cavalo-dj", nome: "Cavalo DJ", ideia: "fones no ouvido, notas no ar, pulando no ritmo do L" },
  { id: "cavalo-unicornio", nome: "Cavalo Unicórnio", ideia: "queria um chifre e colou uma casquinha de sorvete" },
  { id: "bispo-soneca", nome: "Bispo Soneca", ideia: "cochilando torto na diagonal, com os Zz subindo" },
  { id: "dama-cafe", nome: "Dama do Cafezinho", ideia: "coroa torta e xícara fumegante: a peça mais forte descansa" },
  { id: "rei-sufoco", nome: "Rei no Sufoco", ideia: "suando frio com o relógio de xadrez na bandeira" },
  // A segunda leva (Doug, 17/9/2026: "mais 10, diferentes e criativos").
  { id: "peao-mergulho", nome: "Peão Mergulhador", ideia: "máscara de mergulho, snorkel e bolhas subindo" },
  { id: "peao-skate", nome: "Peão Skatista", ideia: "boné para trás, inclinado na manobra do skate" },
  { id: "torre-farol", nome: "Torre Farol", ideia: "vigia de olho arregalado com a luz girando no topo" },
  { id: "torre-bolo", nome: "Torre de Aniversário", ideia: "bolo com cobertura escorrendo e velas acesas nas ameias" },
  { id: "cavalo-detetive", nome: "Cavalo Detetive", ideia: "chapéu de detetive e a lupa que aumenta o olho" },
  { id: "cavalo-astronauta", nome: "Cavalo Astronauta", ideia: "capacete-bolha, gola de traje e estrelas em volta" },
  { id: "bispo-mago", nome: "Bispo Mágico", ideia: "piscadinha e varinha soltando estrela" },
  { id: "bispo-pirata", nome: "Bispo Pirata", ideia: "bandana, tapa-olho e bigode enrolado" },
  { id: "dama-chiclete", nome: "Dama do Chiclete", ideia: "vesga olhando a bola de chiclete crescer" },
  { id: "rei-pipoca", nome: "Rei da Pipoca", ideia: "assistindo a partida com o balde de pipoca" },
] as const;

export type AvatarId = (typeof AVATARES)[number]["id"];

const IDS: ReadonlySet<string> = new Set(AVATARES.map((a) => a.id));

/** Sim só para um dos ids da lista, escrito exatamente assim. Sem aparar espaço nem mudar caixa. */
export function ehAvatar(valor: unknown): valor is AvatarId {
  return typeof valor === "string" && IDS.has(valor);
}

export function nomeDoAvatar(id: AvatarId): string {
  return AVATARES.find((a) => a.id === id)!.nome;
}

export type GravacaoDoAvatar =
  | { ok: true; linha: { avatar: AvatarId } }
  | { ok: false; erro: string };

/**
 * A linha que a server action grava em `perfis`, montada do pedido do navegador.
 *
 * **A linha é construída, nunca repassada.** O pedido chega do aluno e pode ser
 * qualquer coisa — inclusive `{ avatar, nome: "…", papel: "professor" }`. Um
 * `update(pedido)` gravaria tudo; aqui só existe uma chave possível na saída,
 * e o valor dela é um dos ids da lista. Um objeto no lugar do id é recusado inteiro,
 * e não "aproveitado".
 *
 * Nulo também é recusado: a tela não oferece "tirar o avatar", e a coluna nula
 * fica reservada para quem nunca escolheu.
 */
export function gravacaoDoAvatar(pedido: unknown): GravacaoDoAvatar {
  if (!ehAvatar(pedido)) return { ok: false, erro: "Esse avatar não existe." };
  return { ok: true, linha: { avatar: pedido } };
}
