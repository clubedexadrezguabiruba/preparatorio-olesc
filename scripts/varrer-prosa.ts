import { DICAS } from "../lib/meiojogo/conteudo.ts";

/**
 * A varredura da prosa das dicas atrás de heurística vendida como verdade.
 *
 * Uso:
 *   node scripts/varrer-prosa.ts            todas as marcas, dica a dica
 *   node scripts/varrer-prosa.ts m12        só uma dica
 *
 * ## Por que isto não é um gate
 *
 * Porque a marca não decide. "Coluna aberta é coluna sem peão nenhum" é uma
 * definição, e definição é universal por construção; "bispo de casas claras
 * nunca alcança c3" é geometria. Reprovar por palavra faria a autoria trocar
 * "nunca" por "raramente" numa frase verdadeira, que é piorar o texto para
 * agradar um teste.
 *
 * O que a varredura faz é **onde olhar**. Na passagem de 2026-09-07, das 244
 * frases de prosa das 30 dicas, 72 traziam marca de universalidade e **6 foram
 * reescritas**, em 5 dicas:
 *
 * | dica | o que dizia | por que era forte demais |
 * |---|---|---|
 * | m12 | "ninguém o defende de graça — cada defesa custa uma peça parada" | o rei defende, e peça pode defender sem ficar parada |
 * | m5 | "as casas que ele defendia ficam sem dono para sempre" | outro peão pode cobri-las, e peça também |
 * | m5 | "avançar qualquer um é abrir uma porta permanente" | permanente é o peão não voltar, não a casa ficar fraca |
 * | m13 | "peão dobrado perde… defender o vizinho" | ele defende vizinho em diagonal: c3 defende b4 e d4 |
 * | m3 | "para lá qualquer peça chega em menos lances" | a torre de a1 chega a a8 em um lance e a d4 em dois |
 * | m16 | "vigiar de longe não segura ninguém" | há posição em que avançar perde o peão |
 * | m20 | "peão retardatário não pode avançar" | pode, e é capturado — que é outra coisa |
 *
 * O critério que sobra, e é o de aceite da §13 do plano: **nenhuma heurística
 * aparece como verdade universal**. Definição, geometria e conta continuam
 * podendo ser absolutas, porque são.
 */

/** Marcas de universalidade. Não são veredito: são onde olhar. */
const MARCAS = [
  /\bsempre\b/i,
  /\bnunca\b/i,
  /\bjamais\b/i,
  /\bninguém\b/i,
  /\bnenhum[ea]?s?\b/i,
  /\bqualquer\b/i,
  /\btod[oa]s?\b/i,
  /\bimpossível\b/i,
  /\bgarante\b/i,
  /\bobriga\b/i,
  /\bnão pode\b/i,
  /\btem de\b/i,
  /\bprecisa\b/i,
  /\bsó\b/i,
];

const alvo = process.argv[2];

let campos = 0;
let marcadas = 0;

for (const dica of DICAS) {
  if (alvo && dica.id !== alvo) continue;
  const textos: [string, string][] = [
    ["resumo", dica.resumo],
    ...dica.explicacao.map((p, i): [string, string] => [`explicacao[${i}]`, p.texto]),
    ...dica.procure.map((p, i): [string, string] => [`procure[${i}]`, p]),
    ["cuidado", dica.cuidado ?? ""],
    ["quiz.porque", dica.quiz.porque],
  ];

  for (const [onde, texto] of textos) {
    if (!texto) continue;
    campos += 1;
    // Frase a frase: o recorte tem de caber na tela para ser julgado.
    for (const frase of texto.split(/(?<=[.!?])\s+/)) {
      const achadas = MARCAS.filter((m) => m.test(frase));
      if (achadas.length === 0) continue;
      marcadas += 1;
      console.log(`${dica.id} ${onde}: ${frase}`);
    }
  }
}

console.log(
  `\n${campos} campos de prosa, ${marcadas} frases com marca de universalidade. ` +
    "A marca não reprova — ela diz onde ler.",
);
