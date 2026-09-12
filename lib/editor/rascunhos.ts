import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { lessonIdSchema, lessonSchema } from "../lesson/schema.ts";
import { editorLigado } from "./local.ts";

/**
 * A camada de disco do editor: quem escreve, onde, e com que promessa.
 *
 * ## Dois lugares, duas promessas
 *
 * - `.editor/autosave/<ID>.json` guarda **qualquer** estado, inclusive o que o
 *   schema recusa. É a recuperação de sessão: fechou a aba no meio da frase,
 *   volta onde estava. Ninguém além do editor lê isto, e é `.gitignore`d.
 * - `content/rascunhos/lessons/<ID>.json` só recebe JSON que passa em
 *   `lessonSchema`. É o que o player monta e o que `scripts/validate-content.ts`
 *   julga com `--rascunhos`, e os dois foram escritos para conteúdo válido.
 *
 * ## Por que o texto cru, e não o objeto do Zod
 *
 * `lessonSchema.parse()` devolve um objeto **na ordem do schema**, não na ordem
 * do arquivo. Salvar o resultado dele reescreveria as 547 linhas da N1-KPK para
 * mudar uma fala, e o `git diff` deixaria de dizer o que o Doug mudou — que é
 * exatamente a medida deste bloco. Então: o editor carrega o JSON cru, mexe no
 * pedaço, e o Zod entra só como **juiz**, nunca como escritor. Estas funções
 * recebem `unknown` e serializam o que receberam.
 *
 * O formato é `JSON.stringify(x, null, 2)` com quebra de linha no fim, copiado
 * de `validate-content.ts:1641` de propósito: é o que o `--write` do gate
 * grava, e dois formatadores diferentes sobre o mesmo arquivo brigariam a cada
 * rodada.
 *
 * ## Por que não tem `server-only` aqui
 *
 * O marcador `server-only` só é inofensivo sob a condição `react-server`, e
 * `npm test` (`node --test`) roda sem ela — pôr o marcador aqui trocaria os
 * testes de concorrência e de interrupção por nenhum teste. O marcador mora em
 * `lib/editor/acesso.ts`, por onde toda página e toda ação passam, e este
 * arquivo importa `node:fs`, que é parede própria em pacote de navegador.
 */

/** Onde mora o que é do editor e não é conteúdo. Fora de `content/` de propósito. */
export const PASTA_DO_EDITOR = ".editor";

/** O espelho que `scripts/validate-content.ts --rascunhos` lê (linha 158 de lá). */
export const PASTA_DE_RASCUNHOS = path.join("content", "rascunhos");

/** Onde o gate publica, e onde o editor nunca escreve — só o `--aplicar` escreve ali. */
export const PASTA_PUBLICADA = path.join("content", "lessons");

export type Conteudo = { texto: string; hash: string };

/**
 * O que a tela recebe quando o disco recusa a gravação.
 *
 * Os dois campos vêm nulos quando o arquivo sumiu — o caso real é o `--aplicar`
 * ter promovido o rascunho enquanto a aba estava aberta.
 */
export type Conflito = {
  hashAtual: string | null;
  textoAtual: string | null;
};

export type Gravacao =
  | { ok: true; hash: string; caminho: string }
  | { ok: false; erro: string; conflito?: Conflito; problemas?: string[] };

/**
 * A identidade dos bytes.
 *
 * Serve a uma pergunta só: o arquivo em disco ainda é o que esta aba abriu?
 * SHA-256 do texto, hex inteiro — ele viaja uma vez por gravação, e truncar
 * economizaria bytes que ninguém está contando em troca de colisões que
 * ninguém saberia diagnosticar.
 */
export function hashDoTexto(texto: string): string {
  return createHash("sha256").update(texto, "utf8").digest("hex");
}

/** O texto do arquivo com o hash dele, ou `null` se ele não existe. */
export function lerConteudo(caminho: string): Conteudo | null {
  if (!existsSync(caminho)) return null;
  const texto = readFileSync(caminho, "utf8");
  return { texto, hash: hashDoTexto(texto) };
}

/**
 * O caminho de um arquivo do editor, com o id conferido duas vezes.
 *
 * O id chega da URL ou de uma ação, e `path.join` é feliz com `..`. A defesa é
 * a mesma que `lib/finais/conteudo.ts:91` já usa: valida o id pelo schema **e**
 * confere que o resultado caiu dentro da pasta. Duas travas porque a primeira é
 * uma expressão regular que alguém pode afrouxar um dia, e a segunda é sobre o
 * caminho de verdade.
 */
export function caminhoDeAula(
  id: string,
  pasta: string,
  raiz: string = process.cwd(),
  /**
   * Qual regra de id vale nesta pasta.
   *
   * O padrão é o das aulas do curso (`N0-…`), que é o que as pastas do v1
   * guardam. A pasta do Editor v2 passa o schema dela, que também aceita o
   * namespace `EX-` das aulas extras (§22) — sem isto, "Nova aula" criava um id
   * que o próprio projeto aceita e que esta função recusava na hora de gravar.
   *
   * **Continua sendo uma expressão regular sem barra e sem ponto**, e a segunda
   * trava — a conferência do caminho resolvido — vale para as duas.
   */
  schema: { safeParse: (valor: string) => { success: boolean; data?: string } } = lessonIdSchema,
): string {
  const conferido = schema.safeParse(id);
  if (!conferido.success) {
    throw new Error(`id de aula inválido: ${JSON.stringify(id)}`);
  }
  const base = path.resolve(raiz, pasta);
  const alvo = path.resolve(base, `${conferido.data as string}.json`);
  if (!alvo.startsWith(base + path.sep)) {
    throw new Error(`caminho fora da pasta: ${JSON.stringify(id)}`);
  }
  return alvo;
}

export function caminhoDoRascunho(id: string, raiz: string = process.cwd()): string {
  return caminhoDeAula(id, path.join(PASTA_DE_RASCUNHOS, "lessons"), raiz);
}

export function caminhoDaPublicada(id: string, raiz: string = process.cwd()): string {
  return caminhoDeAula(id, PASTA_PUBLICADA, raiz);
}

export function caminhoDoAutosave(id: string, raiz: string = process.cwd()): string {
  return caminhoDeAula(id, path.join(PASTA_DO_EDITOR, "autosave"), raiz);
}

/** O texto exatamente como vai para o disco. Um formatador só, o do gate. */
export function serializar(valor: unknown): string {
  return JSON.stringify(valor, null, 2) + "\n";
}

let contador = 0;

/**
 * Metade um da escrita atômica: os bytes novos num arquivo temporário.
 *
 * Devolve o caminho do `.tmp`. Nada no destino mudou ainda — é exatamente este
 * o estado em que um processo morto deixa o disco, e é por isso que esta
 * metade é exportada em vez de escondida: o teste de interrupção chama só ela e
 * confere que o arquivo anterior continua inteiro. Um `escreverAtomico` com um
 * gancho de teste no meio testaria o gancho; isto testa o programa.
 *
 * O nome do temporário carrega pid e contador porque duas gravações do mesmo
 * arquivo podem se cruzar, e um `.tmp` compartilhado seria a corrida que a
 * escrita atômica existe para não ter.
 */
export function prepararEscrita(caminho: string, texto: string): string {
  mkdirSync(path.dirname(caminho), { recursive: true });
  contador += 1;
  const tmp = `${caminho}.${process.pid}.${contador}.tmp`;
  writeFileSync(tmp, texto, "utf8");
  return tmp;
}

/**
 * Metade dois: o `rename`, que no mesmo volume é atômico.
 *
 * Ou o destino tem os bytes velhos inteiros, ou tem os novos inteiros. Não
 * existe o meio-termo em que ele tem meio JSON — que é o estado em que um
 * `writeFileSync` direto no destino deixaria o arquivo se a luz caísse.
 */
export function concluirEscrita(tmp: string, caminho: string): void {
  renameSync(tmp, caminho);
}

export function escreverAtomico(caminho: string, texto: string): void {
  const tmp = prepararEscrita(caminho, texto);
  try {
    concluirEscrita(tmp, caminho);
  } catch (erro) {
    rmSync(tmp, { force: true });
    throw erro;
  }
}

/**
 * O arquivo em disco ainda é aquele sobre o qual esta aba decidiu?
 *
 * `baseHash` é o hash dos bytes que a tela abriu ou gravou por último; `null`
 * significa "eu acho que este arquivo não existe, estou criando". O caso real
 * que isto pega não é o Doug em duas abas: é um agente editando o mesmo JSON
 * com o editor aberto. Sem isto, a aba escreveria por cima do trabalho do
 * agente sem que ninguém visse.
 */
export function conflito(atual: Conteudo | null, baseHash: string | null): Conflito | null {
  if (atual === null && baseHash === null) return null;
  if (atual === null) return { hashAtual: null, textoAtual: null };
  if (atual.hash === baseHash) return null;
  return { hashAtual: atual.hash, textoAtual: atual.texto };
}

/**
 * Grava o rascunho de uma aula, se ela passar no schema e ninguém tiver mexido.
 *
 * A ordem importa: primeiro o juiz (um JSON que o `lessonSchema` recusa não
 * pode chegar ao gate nem ao player), depois o conflito, e a escrita por
 * último. Recusar depois de escrever seria escrever.
 *
 * `sobrescrever` é o "sim, eu vi, pode ir" que a tela oferece depois de mostrar
 * o conflito. Não há outro caminho para passar por cima.
 */
export function gravarRascunhoDeAula(
  id: string,
  cru: unknown,
  baseHash: string | null,
  opcoes: { raiz?: string; sobrescrever?: boolean; env?: Record<string, string | undefined> } = {},
): Gravacao {
  const { raiz = process.cwd(), sobrescrever = false, env = process.env } = opcoes;

  if (!editorLigado(env)) {
    throw new Error("o editor está desligado — nenhuma escrita em disco daqui");
  }

  const julgamento = lessonSchema.safeParse(cru);
  if (!julgamento.success) {
    return {
      ok: false,
      erro: "esta versão da aula ainda não é válida",
      problemas: julgamento.error.issues.map((i) => `${i.path.join(".") || "(raiz)"}: ${i.message}`),
    };
  }
  if (julgamento.data.id !== id) {
    return { ok: false, erro: `o arquivo diz ser ${julgamento.data.id}, e o pedido é ${id}` };
  }

  const caminho = caminhoDoRascunho(id, raiz);
  const atual = lerConteudo(caminho);
  const briga = conflito(atual, baseHash);
  if (briga && !sobrescrever) {
    return { ok: false, erro: "o arquivo mudou fora do editor", conflito: briga };
  }

  const texto = serializar(cru);
  escreverAtomico(caminho, texto);
  return { ok: true, hash: hashDoTexto(texto), caminho };
}

/**
 * Abre o rascunho de uma aula, criando-o a partir da publicada na primeira vez.
 *
 * A cópia é de bytes, e não uma releitura seguida de reserialização: a ordem
 * das chaves do arquivo publicado é a que o `git diff` vai comparar depois, e
 * reescrevê-la aqui gastaria a medida do bloco antes do primeiro lápis. É a
 * mesma decisão que o `--aplicar` do gate tomou na volta (`copyFileSync`,
 * `validate-content.ts:1668`).
 *
 * Devolve `null` quando não há nem rascunho nem publicada — aula que ainda não
 * existe é assunto do Bloco 3, não deste.
 */
export function abrirRascunhoDeAula(
  id: string,
  opcoes: { raiz?: string; env?: Record<string, string | undefined> } = {},
): Conteudo | null {
  const { raiz = process.cwd(), env = process.env } = opcoes;
  if (!editorLigado(env)) {
    throw new Error("o editor está desligado — nenhuma escrita em disco daqui");
  }

  const rascunho = caminhoDoRascunho(id, raiz);
  const jaAberto = lerConteudo(rascunho);
  if (jaAberto) return jaAberto;

  const publicada = lerConteudo(caminhoDaPublicada(id, raiz));
  if (!publicada) return null;

  escreverAtomico(rascunho, publicada.texto);
  return publicada;
}

/** O autosave aceita o que o schema recusa — é recuperação de sessão, não conteúdo. */
export function gravarAutosave(
  id: string,
  estado: unknown,
  opcoes: { raiz?: string; env?: Record<string, string | undefined> } = {},
): void {
  const { raiz = process.cwd(), env = process.env } = opcoes;
  if (!editorLigado(env)) {
    throw new Error("o editor está desligado — nenhuma escrita em disco daqui");
  }
  escreverAtomico(caminhoDoAutosave(id, raiz), serializar(estado));
}

export function lerAutosave(id: string, raiz: string = process.cwd()): unknown {
  const conteudo = lerConteudo(caminhoDoAutosave(id, raiz));
  if (!conteudo) return null;
  try {
    return JSON.parse(conteudo.texto) as unknown;
  } catch {
    return null;
  }
}

export function apagarAutosave(id: string, raiz: string = process.cwd()): void {
  rmSync(caminhoDoAutosave(id, raiz), { force: true });
}
