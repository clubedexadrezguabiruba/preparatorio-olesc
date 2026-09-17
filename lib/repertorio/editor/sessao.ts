import { Chess } from "chess.js";
import type { AnaliseV2, AulaV2 } from "../../editor-v2/modelo.ts";
import { expandir, type Aviso } from "../arvore.ts";
import { separarPlano, type Plano } from "../esquema.ts";
import { CORES, conferirRegras, NIVEIS, type Cor, type Linha, type Nivel } from "../linhas.ts";
import { partidaDaAnalise, type FormasDosNags } from "./adaptar.ts";

/**
 * O que a tela do repertório pergunta enquanto o professor edita — puro, para medir e
 * testar sem navegador.
 *
 * - **o que um lance novo vai virar** (linha nova, continuação, alternativa ou erro), dito
 *   ao professor na hora em que ele joga;
 * - **a conferência instantânea**: as regras do compilador (`expandir`, `conferirRegras`,
 *   `fechamentosAbertos`) sobre a casca em memória, cada problema com o lance para onde
 *   "Ir até a linha" leva;
 * - **o `[%plano]` em campos**, ida e volta pelo mesmo leitor do compilador;
 * - **o PGN da abertura nova**, só com as tags.
 */

/* ------------------------------------------------------------------ *
 * O lance novo
 * ------------------------------------------------------------------ */

export type ClasseDoLance =
  | { tipo: "existente"; nodeId: string }
  | { tipo: "linha-nova"; frase: string }
  | { tipo: "continuacao"; frase: string }
  | { tipo: "alternativa-ou-erro"; frase: string };

/** De quem é a vez numa posição, na cor do repertório. */
export function ehLanceNosso(fenDaPosicao: string, cor: Cor): boolean {
  const vez = fenDaPosicao.split(" ")[1] ?? "w";
  return (vez === "w") === (cor === "brancas");
}

/**
 * O que acontece se o professor jogar `uci` na posição `paiId`.
 *
 * A regra é a de `arvore.ts`: ramo no lance **do adversário** é uma linha própria (ele pode
 * jogar qualquer uma, e o aluno precisa responder a todas); ramo no lance **nosso** não é
 * linha — é alternativa aceita (com `!`/`!?`), erro nomeado (com `?`/`?!`) ou nada, sem marca.
 */
export function classificarLance(analise: AnaliseV2, cor: Cor, paiId: string, fenDoPai: string, uci: string): ClasseDoLance {
  const pai = analise.nos[paiId];
  const existente = pai?.filhos.find((filho) => analise.nos[filho]?.uci === uci);
  if (existente) return { tipo: "existente", nodeId: existente };
  const nosso = ehLanceNosso(fenDoPai, cor);
  const temContinuacao = (pai?.filhos.length ?? 0) > 0;
  if (!nosso) {
    return temContinuacao
      ? { tipo: "linha-nova", frase: "Linha nova: é uma resposta do adversário que ainda não tinha linha. O aluno vai treiná-la como uma linha própria, e ela precisa terminar num lance nosso comentado." }
      : { tipo: "continuacao", frase: "A linha continua com este lance do adversário. Ela ainda precisa terminar num lance nosso — e o id dela muda, então quem já treinou recomeça." };
  }
  return temContinuacao
    ? { tipo: "alternativa-ou-erro", frase: "Não vira linha: é um lance nosso ao lado do lance da linha. Marque ! ou !? para o treinador aceitá-lo como alternativa, ou ? ou ?! para ele virar erro nomeado. Sem marca, a conferência avisa e o treinador ignora." }
    : { tipo: "continuacao", frase: "A linha continua com este lance nosso. Escreva o comentário: todo lance nosso diz por quê. O id da linha muda, então quem já treinou recomeça." };
}

/** O que cada um dos seis símbolos faz no lance selecionado — dito ao lado do botão. */
export function efeitoDoSimbolo(nag: number, nosso: boolean, principal: boolean): string {
  const bom = nag === 1 || nag === 3 || nag === 5;
  if (nosso && !principal) {
    return bom
      ? "alternativa aceita: o treinador aceita este lance sem cobrá-lo"
      : "erro nomeado: o treinador nunca aceita este lance e avisa o aluno quando ele cair nele";
  }
  if (!nosso && !bom) return "erro do adversário: a linha tem de mostrar a punição";
  return "só anota o lance; não muda o que o treinador cobra";
}

/* ------------------------------------------------------------------ *
 * Conferência instantânea
 * ------------------------------------------------------------------ */

export type ItemDaConferencia = {
  severidade: "erro" | "aviso";
  mensagem: string;
  analiseId: string;
  /** O lance para onde "Ir até a linha" leva; `null` quando o problema é do jogo inteiro. */
  nodeId: string | null;
};

export type ConferenciaDoArquivo = {
  itens: ItemDaConferencia[];
  /** As linhas que o arquivo produz agora, com os ids que o aluno teria. */
  linhas: Array<Linha & { analiseId: string }>;
};

/** O nó do meio-lance `indice` de uma linha, andando pelos lances dela a partir da raiz. */
export function noDaLinha(analise: AnaliseV2, lances: readonly string[], indice: number): string | null {
  let atual = analise.raizId;
  for (let i = 0; i <= indice && i < lances.length; i++) {
    const filho = analise.nos[atual]?.filhos.find((id) => analise.nos[id]?.uci === lances[i]);
    if (!filho) return null;
    atual = filho;
  }
  return atual;
}

/** O cabeçalho do jogo a partir das tags, ou o que falta nele. */
export function cabecalhoDasTags(tags: Record<string, string>): { ok: true; cabecalho: { abertura: string; nome: string; cor: Cor; nivel: Nivel; fonte: string } } | { ok: false; faltando: string[] } {
  const faltando = [
    !tags.Abertura && "Abertura",
    !tags.Nome && "Nome",
    !CORES.includes(tags.Cor as Cor) && "Cor",
    !NIVEIS.includes(tags.Nivel as Nivel) && "Nível",
    !tags.Fonte && "Fonte",
  ].filter((x): x is string => Boolean(x));
  if (faltando.length > 0) return { ok: false, faltando };
  return { ok: true, cabecalho: { abertura: tags.Abertura, nome: tags.Nome, cor: tags.Cor as Cor, nivel: tags.Nivel as Nivel, fonte: tags.Fonte } };
}

const MENSAGEM_DO_AVISO: Partial<Record<Aviso["tipo"], "aviso" | "erro">> = {
  "irmao-sem-marca": "aviso",
  "termina-em-pergunta": "aviso",
  "erro-do-adversario-sem-refutacao": "aviso",
};

/**
 * As regras do compilador sobre a casca, sem gravar nada.
 *
 * O que ela **não** vê: a sequência repetida entre arquivos diferentes e a nota de
 * princípios que aponta para uma abertura — isso é do banco inteiro, e aparece na hora de
 * **Aplicar**, que compila os onze.
 */
export function conferirCasca(aula: AulaV2, formas?: FormasDosNags): ConferenciaDoArquivo {
  const itens: ItemDaConferencia[] = [];
  const linhas: Array<Linha & { analiseId: string }> = [];
  for (const analise of aula.analises) {
    const resultado = conferirAnalise(analise, formas);
    itens.push(...resultado.itens);
    linhas.push(...resultado.linhas);
  }

  // A mesma sequência em dois jogos do mesmo arquivo — a regra do banco, aqui dentro.
  const vistas = new Map<string, string>();
  for (const linha of linhas) {
    const chave = linha.lances.join(" ");
    const antes = vistas.get(chave);
    if (antes) itens.push({ severidade: "erro", mensagem: `${linha.nome}: é a mesma sequência de lances de ${antes}`, analiseId: linha.analiseId, nodeId: null });
    else vistas.set(chave, linha.nome);
  }

  itens.sort((a, b) => (a.severidade === b.severidade ? 0 : a.severidade === "erro" ? -1 : 1));
  return { itens, linhas };
}

type ConferenciaDaAnalise = { itens: ItemDaConferencia[]; linhas: Array<Linha & { analiseId: string }> };

/**
 * O resultado de cada análise, guardado pela identidade dela. Os comandos do v2 são
 * imutáveis: um jogo que a edição não tocou é o **mesmo objeto**, e reexpandi-lo a cada
 * comentário confirmado era parte do que levava a edição na Siciliana acima de 100 ms (8D).
 */
const porAnalise = new WeakMap<AnaliseV2, ConferenciaDaAnalise & { formas: FormasDosNags | undefined }>();

function conferirAnalise(analise: AnaliseV2, formas?: FormasDosNags): ConferenciaDaAnalise {
  const guardado = porAnalise.get(analise);
  if (guardado && guardado.formas === formas) return guardado;
  const resultado = conferirAnaliseSemCache(analise, formas);
  porAnalise.set(analise, { ...resultado, formas });
  return resultado;
}

function conferirAnaliseSemCache(analise: AnaliseV2, formas?: FormasDosNags): ConferenciaDaAnalise {
  const itens: ItemDaConferencia[] = [];
  const linhas: Array<Linha & { analiseId: string }> = [];
  {
    const { partida, problemas } = partidaDaAnalise(analise, formas);
    for (const p of problemas) itens.push({ severidade: "erro", mensagem: p, analiseId: analise.id, nodeId: null });
    const lido = cabecalhoDasTags(partida.tags);
    if (!lido.ok) {
      itens.push({ severidade: "erro", mensagem: `faltam no jogo: ${lido.faltando.join(", ")} (em Mais opções)`, analiseId: analise.id, nodeId: null });
      return { itens, linhas };
    }
    if (partida.lances.length === 0) {
      // A abertura que acabou de nascer tem só o cabeçalho. Sem este erro a conferência
      // ficava vazia — "passa nas regras" — e Aplicar parecia possível (achado no roteiro 8F).
      itens.push({
        severidade: "erro",
        mensagem: "este jogo ainda não tem nenhuma linha: jogue os lances no tabuleiro. A abertura só entra no repertório com ao menos uma linha completa — 12 lances nossos, o roque feito, as peças menores fora e todo lance nosso comentado.",
        analiseId: analise.id,
        nodeId: analise.raizId,
      });
      return { itens, linhas };
    }
    const expansao = expandir(partida, lido.cabecalho);
    for (const p of expansao.problemas) itens.push({ severidade: "erro", mensagem: p, analiseId: analise.id, nodeId: null });
    for (const aviso of expansao.avisos) {
      const severidade = MENSAGEM_DO_AVISO[aviso.tipo];
      if (severidade) itens.push({ severidade, mensagem: `${aviso.onde}: ${aviso.detalhe}`, analiseId: analise.id, nodeId: null });
    }

    for (const linha of expansao.linhas) {
      linhas.push({ ...linha, analiseId: analise.id });
      const ultimo = linha.lances.length - 1;
      const doFim = noDaLinha(analise, linha.lances, ultimo);
      for (const regra of conferirRegras([linha])) {
        // O lance mudo mais cedo é para onde "Ir até a linha" leva quando a regra é essa.
        const mudo = regra.erro.includes("sem comentário")
          ? linha.meus.find((i) => !linha.comentarios[String(i)]?.trim())
          : undefined;
        itens.push({
          severidade: "erro",
          mensagem: `${linha.nome}: ${regra.erro}`,
          analiseId: analise.id,
          nodeId: mudo !== undefined ? noDaLinha(analise, linha.lances, mudo) : doFim,
        });
      }
    }
  }
  return { itens, linhas };
}

/* ------------------------------------------------------------------ *
 * O [%plano] em campos
 * ------------------------------------------------------------------ */

export type EntradaDoPlanoNaTela =
  | { chave: string; destino: string; motivo: string }
  | { chave: "rei"; roque: "O-O" | "O-O-O" | "rei-fica"; motivo: string };

/** Separa o comentário do último lance em prosa e as entradas do plano, para os campos. */
export function planoDoComentario(comentario: string | undefined, cor: Cor): { prosa: string; entradas: EntradaDoPlanoNaTela[]; erros: string[] } {
  const { prosa, plano, erros } = separarPlano(comentario ?? null, cor);
  const entradas: EntradaDoPlanoNaTela[] = Object.entries(plano).map(([chave, e]) =>
    chave === "rei"
      ? { chave: "rei", roque: e.casa === null ? "rei-fica" : e.casa[0] === "g" ? "O-O" : "O-O-O", motivo: e.motivo }
      : { chave, destino: e.casa ?? "", motivo: e.motivo },
  );
  // Sem bloco, a prosa é o comentário inteiro — com as quebras de linha dele.
  const semBloco = !comentario?.includes("[%plano");
  return { prosa: semBloco ? comentario ?? "" : prosa ?? "", entradas, erros };
}

/** Os campos de volta para o comentário, no formato que o compilador lê. */
export function comentarioComPlano(prosa: string, entradas: readonly EntradaDoPlanoNaTela[]): string {
  const limpas = entradas.filter((e) => e.motivo.trim() !== "");
  if (limpas.length === 0) return prosa;
  const linhas = limpas.map((e) =>
    "roque" in e ? `${e.roque}: ${e.motivo.trim().replace(/\s*\n\s*/g, " ")}` : `${e.chave}>${e.destino}: ${e.motivo.trim().replace(/\s*\n\s*/g, " ")}`,
  );
  return `${prosa.trimEnd()}\n[%plano\n${linhas.join("\n")}\n]`;
}

/** O plano como o compilador o leria — para o teste de ida e volta. */
export function planoLido(comentario: string, cor: Cor): Plano {
  return separarPlano(comentario, cor).plano;
}

/* ------------------------------------------------------------------ *
 * Abertura nova
 * ------------------------------------------------------------------ */

/** `Gambito Évans` → `gambito-evans`: minúsculas, sem acento, hífen no lugar do resto. */
export function slugDaAbertura(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export type PedidoDeAberturaNova = { cor: Cor; nome: string; slug?: string; nivel: Nivel; fonte: string };

export type AberturaNova =
  | { ok: true; arquivo: string; texto: string }
  | { ok: false; problemas: string[] };

/**
 * O rascunho de uma abertura nova: só as tags, e o `*`. As linhas nascem na tela; a
 * abertura só entra em `content/repertorio/` quando compilar.
 */
export function pgnDaAberturaNova(pedido: PedidoDeAberturaNova, existentes: readonly string[]): AberturaNova {
  const problemas: string[] = [];
  const slug = slugDaAbertura(pedido.slug?.trim() || pedido.nome);
  const nome = pedido.nome.trim();
  const fonte = pedido.fonte.trim();
  if (!CORES.includes(pedido.cor)) problemas.push("escolha a cor: brancas ou pretas");
  if (!NIVEIS.includes(pedido.nivel)) problemas.push("escolha o nível: Base ou Avançado");
  if (nome.length < 3) problemas.push("o nome precisa de pelo menos 3 letras");
  if (!slug) problemas.push("o nome não gera um endereço — use letras ou números");
  if (fonte.length < 3) problemas.push("diga a fonte das linhas: nenhum lance entra sem dizer de onde veio");
  for (const [campo, valor] of [["nome", nome], ["fonte", fonte]] as const) {
    if (valor.includes('"')) problemas.push(`o campo ${campo} tem aspas duplas, que o PGN não guarda — use aspas simples`);
    if (/[\r\n]/.test(valor)) problemas.push(`o campo ${campo} precisa caber numa linha só`);
  }
  const arquivo = `${pedido.cor}-${slug}`;
  if (existentes.includes(arquivo)) problemas.push(`já existe a abertura ${arquivo}`);
  if (problemas.length > 0) return { ok: false, problemas };
  const texto = [
    `[Abertura "${slug}"]`,
    `[Nome "${nome}"]`,
    `[Cor "${pedido.cor}"]`,
    `[Nivel "${pedido.nivel}"]`,
    `[Fonte "${fonte}"]`,
    `[Result "*"]`,
    "",
    "*",
    "",
  ].join("\n");
  return { ok: true, arquivo, texto };
}

/** A posição depois de um caminho de lances, para o tabuleiro e para `classificarLance`. */
export function fenDepois(fenInicial: string, lances: readonly string[]): string {
  const jogo = new Chess(fenInicial);
  for (const uci of lances) jogo.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.slice(4) || undefined });
  return jogo.fen();
}
