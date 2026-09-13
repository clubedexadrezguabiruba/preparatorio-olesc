/**
 * As contas da régua editorial, sem disco.
 *
 * Moravam em `voz.ts`, que lê o documento da régua com `node:fs`. Esse import impede a
 * janela de autoria do Editor v2, que roda no navegador, de conferir a voz enquanto o
 * professor digita. As contas vieram para cá sem mudar uma linha; `voz.ts` as reexporta,
 * e quem já as importava de lá continua igual. Os números continuam só no documento:
 * este arquivo recebe a régua pronta, nunca a inventa.
 */

export type Regua = {
  /** Teto de caracteres de uma fala do professor. */
  falaMaxCaracteres: number;
  /** Teto de palavras de uma frase, em qualquer texto de tela. */
  fraseMaxPalavras: number;
  /** Palavras de bastidor que não chegam ao aluno. Comparadas sem acento. */
  proibidas: string[];
  /** Alvo mínimo onde há dedo, em px. O mínimo AAA da WCAG 2.5.5. */
  alvoDeToquePx: number;
  /** Alvo mínimo onde há ponteiro, em px. O mínimo AA da WCAG 2.5.8. */
  alvoDePonteiroPx: number;
};

/** Onde a régua mora. Um lugar só, e é um documento. */
export const DOC_DA_VOZ = "docs/VOZ-DO-CURSO.md";

/**
 * Um texto que o aluno lê, com o lugar de onde ele veio.
 *
 * `tipo` decide qual teto vale: a **fala** é o que o professor diz dentro da
 * aula e paga os dois tetos; o **rótulo** é nome de botão, título de aula ou
 * cabeçalho, e paga só o de palavras por frase — um rótulo de 200 caracteres
 * não existe, e cobrar dele o teto de fala seria cobrar o que já é impossível.
 */
export type Fala = {
  /** Caminho legível até o texto, para a mensagem do teste. */
  onde: string;
  texto: string;
  tipo: "fala" | "rotulo";
};

/** O que reprovou, e por quê. */
export type Reprovacao = {
  onde: string;
  regra: "caracteres" | "palavras" | "proibida";
  detalhe: string;
  texto: string;
};

/** Frases de um texto. O travessão não fecha frase — ele é a marca da casa. */
export function emFrases(texto: string): string[] {
  return (texto.match(/[^.!?…]+(?:[.!?…]+["'”’)]*\s*|$)/g) ?? [texto])
    .map((f) => f.trim())
    .filter((f) => f.length > 0);
}

/** Palavras de uma frase. Conta o que tem letra ou número; pontuação não é palavra. */
export function emPalavras(frase: string): string[] {
  return frase.split(/\s+/).filter((p) => /[\p{L}\p{N}]/u.test(p));
}

/** Sem acento e em minúsculas, para a lista proibida pegar "método" em "Método". */
function achatar(texto: string): string {
  return texto.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

/**
 * A palavra proibida aparece neste texto?
 *
 * Comparação por **palavra inteira**, e não por pedaço: "teto" não pode
 * reprovar "tetos" de propósito, mas também não pode reprovar "objeto". A
 * fronteira é qualquer coisa que não seja letra ou número, e o plural entra
 * porque a régua é sobre a palavra, não sobre o número dela.
 */
export function usaProibida(texto: string, proibida: string): boolean {
  const alvo = achatar(proibida);
  return new RegExp(`(?<![\\p{L}\\p{N}])${alvo}s?(?![\\p{L}\\p{N}])`, "u").test(achatar(texto));
}

/** Tudo o que uma lista de falas quebra na régua. Lista vazia é aprovação. */
export function reprovacoes(falas: Fala[], regua: Regua): Reprovacao[] {
  const achados: Reprovacao[] = [];
  for (const { onde, texto, tipo } of falas) {
    if (tipo === "fala" && texto.length > regua.falaMaxCaracteres) {
      achados.push({
        onde,
        regra: "caracteres",
        detalhe: `${texto.length} caracteres (teto ${regua.falaMaxCaracteres})`,
        texto,
      });
    }
    for (const frase of emFrases(texto)) {
      const palavras = emPalavras(frase);
      if (palavras.length > regua.fraseMaxPalavras) {
        achados.push({
          onde,
          regra: "palavras",
          detalhe: `${palavras.length} palavras (teto ${regua.fraseMaxPalavras}): "${frase}"`,
          texto,
        });
      }
    }
    for (const proibida of regua.proibidas) {
      if (usaProibida(texto, proibida)) {
        achados.push({
          onde,
          regra: "proibida",
          detalhe: `usa "${proibida}" — ver a §4 de ${DOC_DA_VOZ}`,
          texto,
        });
      }
    }
  }
  return achados;
}
