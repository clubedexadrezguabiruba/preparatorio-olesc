import { readFileSync } from "node:fs";
import path from "node:path";
import type { Lesson } from "./schema.ts";

/**
 * A régua editorial, lida do documento em vez de copiada dele.
 *
 * `docs/VOZ-DO-CURSO.md` §3 traz um bloco ```json voz``` com os três números
 * que a casa cobra: teto de caracteres por fala, teto de palavras por frase e a
 * lista de palavras que não chegam ao aluno. **Este arquivo não tem cópia
 * própria de nenhum deles** — quem muda a régua muda o documento, e o teste e a
 * skill `/revisar-aula` passam a cobrar o número novo no mesmo instante.
 *
 * Duas cópias de um teto seriam duas opiniões sobre a régua, e a experiência
 * deste repositório com isso está medida: a §5 do `REPERTORIO.md` pedia "frase
 * curta" desde sempre, sem número, e a §8.1 encontrou 20 de 98 comentários com
 * uma frase de 32 palavras ou mais.
 *
 * Nada aqui julga xadrez, e nada aqui lê tela. São contas sobre texto: quantos
 * caracteres, quantas palavras por frase, que palavras aparecem. O que precisa
 * de olho — "uma ideia por fala", elogio vazio, repreensão — está declarado
 * como dívida na §7 do documento.
 */

export type Regua = {
  /** Teto de caracteres de uma fala do professor. */
  falaMaxCaracteres: number;
  /** Teto de palavras de uma frase, em qualquer texto de tela. */
  fraseMaxPalavras: number;
  /** Palavras de bastidor que não chegam ao aluno. Comparadas sem acento. */
  proibidas: string[];
  /** A faixa de duração da aula assistida, em segundos: `[piso, teto]`. */
  roteiroSegundos: [number, number];
  /** Alvo mínimo onde há dedo, em px. O mínimo AAA da WCAG 2.5.5. */
  alvoDeToquePx: number;
  /** Alvo mínimo onde há ponteiro, em px. O mínimo AA da WCAG 2.5.8. */
  alvoDePonteiroPx: number;
};

/** Onde a régua mora. Um lugar só, e é um documento. */
export const DOC_DA_VOZ = "docs/VOZ-DO-CURSO.md";

/**
 * O bloco de números do documento.
 *
 * A cerca é ```` ```json voz ```` — `json` para o editor pintar, `voz` para
 * este leitor achar o bloco certo caso o documento ganhe outros exemplos de
 * JSON. Se o bloco sumir, isto **explode** em vez de assumir um padrão: uma
 * régua ausente que vira número embutido é o defeito que este arquivo existe
 * para não ter.
 */
export function lerRegua(raiz = process.cwd()): Regua {
  const doc = readFileSync(path.join(raiz, DOC_DA_VOZ), "utf8");
  const bloco = doc.match(/```json voz\n([\s\S]*?)```/);
  if (!bloco) {
    throw new Error(
      `${DOC_DA_VOZ} não traz o bloco \`\`\`json voz — a régua não existe, ` +
        "e nenhum número aqui a substitui",
    );
  }
  return JSON.parse(bloco[1]) as Regua;
}

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

/**
 * Tudo o que o aluno lê num arquivo de aula, com o caminho de cada pedaço.
 *
 * A lista é **explícita**, e não uma varredura de todas as strings do JSON: o
 * arquivo tem FEN, UCI, id de posição e slug de obra, e um coletor que
 * adivinha o que é prosa erraria nos dois sentidos. O preço é que um campo de
 * texto novo no schema precisa entrar aqui à mão — e é por isso que o teste
 * confere a contagem contra o roteiro e os nós, em vez de confiar nesta lista.
 */
export function falasDaAula(lesson: Lesson): Fala[] {
  const falas: Fala[] = [];
  const id = lesson.id;

  falas.push({ onde: `${id} / title`, texto: lesson.title, tipo: "rotulo" });

  for (const [erroId, erro] of Object.entries(lesson.errors)) {
    falas.push({ onde: `${id} / errors.${erroId}`, texto: erro.text, tipo: "fala" });
  }
  for (const [chave, texto] of Object.entries(lesson.fallbacks)) {
    falas.push({ onde: `${id} / fallbacks.${chave}`, texto, tipo: "fala" });
  }
  if (lesson.generatedTemplates) {
    for (const [chave, texto] of Object.entries(lesson.generatedTemplates)) {
      falas.push({ onde: `${id} / generatedTemplates.${chave}`, texto, tipo: "fala" });
    }
  }

  const objective = lesson.stages.objective;
  if (objective) {
    falas.push({
      onde: `${id} / objective.technique.name`,
      texto: objective.technique.name,
      tipo: "rotulo",
    });
    falas.push({
      onde: `${id} / objective.technique.summary`,
      texto: objective.technique.summary,
      tipo: "fala",
    });
    for (const [i, passo] of objective.roteiro.entries()) {
      falas.push({
        onde: `${id} / objective.roteiro[${i}].fala`,
        texto: passo.fala,
        tipo: "fala",
      });
    }
  }

  const guided = lesson.stages.guided;
  if (guided) {
    if (guided.intro) {
      falas.push({ onde: `${id} / guided.intro`, texto: guided.intro, tipo: "fala" });
    }
    for (const [nodeId, node] of Object.entries(guided.nodes)) {
      if (node.hint) {
        falas.push({ onde: `${id} / guided.${nodeId}.hint`, texto: node.hint, tipo: "fala" });
      }
      for (const [i, expect] of node.expects.entries()) {
        falas.push({
          onde: `${id} / guided.${nodeId}.expects[${i}].feedback`,
          texto: expect.feedback,
          tipo: "fala",
        });
      }
      for (const [i, alt] of (node.authorAlternatives ?? []).entries()) {
        falas.push({
          onde: `${id} / guided.${nodeId}.authorAlternatives[${i}].feedback`,
          texto: alt.feedback,
          tipo: "fala",
        });
      }
    }
  }

  return falas;
}
