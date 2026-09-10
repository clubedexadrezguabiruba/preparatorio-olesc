import { spawn } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { editorLigado } from "./local.ts";
import { lerPassada, type Passada } from "./saida-do-gate.ts";
import {
  caminhoDeAula,
  caminhoDoRascunho,
  escreverAtomico,
  lerConteudo,
  PASTA_DO_EDITOR,
  serializar,
} from "./rascunhos.ts";

/**
 * O botão "Conferir": duas passadas do gate, e nenhuma delas sozinha basta.
 *
 * ## Por que duas
 *
 * `scripts/validate-content.ts --write` julga **com o juiz enfraquecido**. Ele
 * diz isso de si mesmo (linhas 137-139 de lá): enquanto grava os derivados, os
 * códigos `WINNING_MOVES_DESATUALIZADO`, `ALTERNATIVAS_DESATUALIZADAS` e
 * `TREINO_DESATUALIZADO` não são cobrados — não faria sentido acusar de estar
 * desatualizado exatamente o que ele está atualizando. Uma rodada de `--write`
 * verde, portanto, não quer dizer que o conteúdo está bom; quer dizer que ele
 * está gravado.
 *
 * Então:
 *
 * - **Passada A** — `--rascunhos --refresh-cache --write`. Gera a etapa 3, os
 *   `winningMoves` e as alternativas, consultando a tablebase (e a rede, se
 *   faltar cache). Depois dela o rascunho em disco **mudou**, e a tela precisa
 *   recarregar: é aqui que a etapa 3 de verdade nasce.
 * - **Passada B** — `--rascunhos`, sem nada. Lê limpo o que A escreveu, com o
 *   juiz inteiro e sem tocar em nada.
 *
 * Verde é A **e** B verdes. O `hashVerde` é o dos bytes **depois de B**, e é
 * ele que o botão "Publicar no curso" compara com o rascunho atual: publicar
 * exige que nada tenha mudado desde a conferência que ficou verde.
 *
 * ## O spawn
 *
 * `process.execPath` (o Node que está rodando este servidor), argumentos em
 * array, `shell: false`, `cwd` fixo na raiz do repositório. Nada do que o
 * professor digita chega aqui — o id da aula é validado por `lessonIdSchema`
 * antes, e nem assim ele entra na linha de comando: o gate confere o conteúdo
 * inteiro, sempre.
 *
 * ## O lock
 *
 * Uma conferência por vez. Duas rodadas de `--write` cruzadas escreveriam os
 * derivados uma por cima da outra, e a segunda leria pela metade o que a
 * primeira estava gravando. O arquivo do lock guarda o pid, e um lock de
 * processo morto é roubado — senão um `next dev` derrubado no meio deixaria o
 * botão "Conferir" desligado para sempre, sem ninguém saber por quê.
 */

export type PassadaNomeada = Passada & { nome: "A" | "B"; comando: string[] };

export type Conferencia = {
  aula: string;
  em: string;
  verde: boolean;
  /** O hash do rascunho depois da passada B. `null` quando não ficou verde. */
  hashVerde: string | null;
  passadas: PassadaNomeada[];
  /** Preenchido quando o gate nem chegou a rodar (lock, tempo, processo). */
  impedimento?: string;
};

const GATE = path.join(PASTA_DO_EDITOR, "gate");
const TEMPO_LIMITE_MS = 10 * 60_000;

export function caminhoDoLock(raiz: string): string {
  return path.resolve(raiz, GATE, "lock");
}

function caminhoDoEstado(aula: string, raiz: string): string {
  return caminhoDeAula(aula, GATE, raiz);
}

function vivo(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Pega o lock, ou diz por que não deu.
 *
 * Roubar o lock de um processo morto é seguro porque a única coisa que ele
 * protege é a escrita dos derivados, e um processo morto não escreve mais. Sem
 * o roubo, um `next dev` derrubado no meio de uma conferência deixaria o botão
 * "Conferir" desligado para sempre, sem ninguém saber por quê.
 *
 * Exportada porque a tela também pergunta: "posso conferir agora?" é uma
 * pergunta legítima de quem desenha o botão, não só um detalhe daqui.
 */
export function travarConferencia(raiz: string): { ok: true } | { ok: false; motivo: string } {
  const lock = caminhoDoLock(raiz);
  if (existsSync(lock)) {
    let dono: { pid?: number; em?: string } = {};
    try {
      dono = JSON.parse(readFileSync(lock, "utf8")) as { pid?: number; em?: string };
    } catch {
      // Lock ilegível é lock de ninguém.
    }
    if (typeof dono.pid === "number" && dono.pid !== process.pid && vivo(dono.pid)) {
      return { ok: false, motivo: "já há uma conferência rodando — espere ela terminar" };
    }
    rmSync(lock, { force: true });
  }
  escreverAtomico(lock, serializar({ pid: process.pid, em: new Date().toISOString() }));
  return { ok: true };
}

export function destravarConferencia(raiz: string): void {
  rmSync(caminhoDoLock(raiz), { force: true });
}

type Rodada = { saida: string; exit: number | null };

function rodar(args: string[], raiz: string): Promise<Rodada> {
  return new Promise((resolver) => {
    const filho = spawn(process.execPath, [path.join("scripts", "validate-content.ts"), ...args], {
      cwd: raiz,
      shell: false,
      windowsHide: true,
      // O gate não lê nada da entrada; deixá-la aberta seguraria o processo.
      stdio: ["ignore", "pipe", "pipe"],
    });

    let saida = "";
    // Os dois canos entram no mesmo texto porque o `morrer()` do gate escreve
    // em stderr e o resto em stdout — e o leitor de JSONL escolhe as linhas
    // dele por conteúdo, não por qual cano veio.
    filho.stdout.on("data", (p: Buffer) => (saida += p.toString("utf8")));
    filho.stderr.on("data", (p: Buffer) => (saida += p.toString("utf8")));

    const relogio = setTimeout(() => {
      filho.kill();
      saida += "\n[editor] a conferência passou de 10 minutos e foi interrompida\n";
    }, TEMPO_LIMITE_MS);

    filho.on("error", (erro) => {
      clearTimeout(relogio);
      resolver({ saida: `${saida}\n[editor] não consegui rodar o gate: ${erro.message}\n`, exit: null });
    });
    filho.on("close", (codigo) => {
      clearTimeout(relogio);
      resolver({ saida, exit: codigo });
    });
  });
}

/**
 * Roda a conferência inteira e guarda o resultado em `.editor/gate/<AULA>.json`.
 *
 * O estado fica em disco, e não em memória, porque o `next dev` recompila e
 * reinicia módulos a cada arquivo salvo — um "última conferência verde"
 * guardado numa variável de módulo sumiria no meio do trabalho, e o botão de
 * publicar apagaria sozinho sem explicação.
 */
export async function conferir(
  aula: string,
  opcoes: { raiz?: string; env?: Record<string, string | undefined> } = {},
): Promise<Conferencia> {
  const { raiz = process.cwd(), env = process.env } = opcoes;
  if (!editorLigado(env)) {
    throw new Error("o editor está desligado — nenhuma conferência daqui");
  }

  const agora = new Date().toISOString();
  const lock = travarConferencia(raiz);
  if (!lock.ok) {
    return { aula, em: agora, verde: false, hashVerde: null, passadas: [], impedimento: lock.motivo };
  }

  try {
    const receitas: Array<{ nome: "A" | "B"; args: string[] }> = [
      { nome: "A", args: ["--rascunhos", "--refresh-cache", "--write", "--jsonl"] },
      { nome: "B", args: ["--rascunhos", "--jsonl"] },
    ];

    const passadas: PassadaNomeada[] = [];
    for (const receita of receitas) {
      const { saida, exit } = await rodar(receita.args, raiz);
      const lida = lerPassada(saida, exit);
      passadas.push({ ...lida, nome: receita.nome, comando: receita.args });
      // A passada B não tem por que rodar sobre um A vermelho: ela leria os
      // derivados que A não conseguiu gravar, e o segundo relatório diria a
      // mesma coisa com outras palavras.
      if (!lida.verde) break;
    }

    const verde = passadas.length === receitas.length && passadas.every((p) => p.verde);
    const rascunho = verde ? lerConteudo(caminhoDoRascunho(aula, raiz)) : null;
    const conferencia: Conferencia = {
      aula,
      em: agora,
      verde,
      hashVerde: rascunho ? rascunho.hash : null,
      passadas,
    };
    escreverAtomico(caminhoDoEstado(aula, raiz), serializar(conferencia));
    return conferencia;
  } finally {
    destravarConferencia(raiz);
  }
}

/** A última conferência desta aula, ou `null` se ela nunca foi conferida. */
export function ultimaConferencia(aula: string, raiz: string = process.cwd()): Conferencia | null {
  const conteudo = lerConteudo(caminhoDoEstado(aula, raiz));
  if (!conteudo) return null;
  try {
    return JSON.parse(conteudo.texto) as Conferencia;
  } catch {
    return null;
  }
}

/**
 * O botão "Publicar no curso" pode acender?
 *
 * Duas condições, e a segunda é a que importa: a última conferência ficou
 * verde **e** o rascunho em disco ainda é exatamente aquele. Um lápis depois da
 * conferência apaga o direito de publicar — o gate julgou o que viu, não o que
 * veio depois.
 */
export function podePublicar(
  aula: string,
  raiz: string = process.cwd(),
): { pode: boolean; motivo: string | null } {
  const ultima = ultimaConferencia(aula, raiz);
  if (!ultima) return { pode: false, motivo: "esta aula ainda não foi conferida" };
  if (!ultima.verde) return { pode: false, motivo: "a última conferência encontrou problemas" };
  const rascunho = lerConteudo(caminhoDoRascunho(aula, raiz));
  if (!rascunho) return { pode: false, motivo: "não há rascunho aberto para esta aula" };
  if (rascunho.hash !== ultima.hashVerde) {
    return { pode: false, motivo: "a aula mudou depois da conferência — confira de novo" };
  }
  return { pode: true, motivo: null };
}

export type Publicacao = {
  ok: boolean;
  motivo: string | null;
  /** O que o gate promoveu, por caminho. Vazio quando nada foi publicado. */
  promovidos: string[];
  passada: Passada | null;
  /** `git status --porcelain content/`, como o plano pede — sem commit nenhum. */
  gitStatus: string;
};

/**
 * Publica: `--rascunhos --aplicar`, que julga tudo de novo, limpo, e só então
 * copia os bytes do rascunho para `content/lessons/`.
 *
 * O editor **nunca** escreve em `content/lessons/`. Quem escreve ali é o gate,
 * por `copyFileSync` (`validate-content.ts:1668`), e só quando a rodada inteira
 * ficou verde. Isto aqui é a terceira conferência do mesmo conteúdo, e ela
 * existe porque as duas primeiras podem ter ficado velhas entre o clique e o
 * clique.
 */
export async function publicar(
  aula: string,
  opcoes: { raiz?: string; env?: Record<string, string | undefined> } = {},
): Promise<Publicacao> {
  const { raiz = process.cwd(), env = process.env } = opcoes;
  if (!editorLigado(env)) {
    throw new Error("o editor está desligado — nenhuma publicação daqui");
  }

  const permissao = podePublicar(aula, raiz);
  if (!permissao.pode) {
    return { ok: false, motivo: permissao.motivo, promovidos: [], passada: null, gitStatus: "" };
  }

  const lock = travarConferencia(raiz);
  if (!lock.ok) {
    return { ok: false, motivo: lock.motivo, promovidos: [], passada: null, gitStatus: "" };
  }

  try {
    const { saida, exit } = await rodar(["--rascunhos", "--aplicar", "--jsonl"], raiz);
    const passada = lerPassada(saida, exit);
    const promovidos = passada.resumo?.promovidos ?? [];
    return {
      ok: passada.verde,
      motivo: passada.verde ? null : "o gate recusou o conteúdo na hora de publicar",
      promovidos,
      passada,
      gitStatus: await gitStatusDoConteudo(raiz),
    };
  } finally {
    destravarConferencia(raiz);
    // A conferência guardada descreve um rascunho que acabou de ser promovido
    // (e apagado). Mantê-la faria o botão prometer uma publicação que já
    // aconteceu.
    rmSync(caminhoDoEstado(aula, raiz), { force: true });
  }
}

/** O que mudou em `content/`, sem commit e sem push — quem envia é o Doug. */
export function gitStatusDoConteudo(raiz: string = process.cwd()): Promise<string> {
  return new Promise((resolver) => {
    const filho = spawn("git", ["status", "--porcelain", "content/"], {
      cwd: raiz,
      shell: false,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let saida = "";
    filho.stdout.on("data", (p: Buffer) => (saida += p.toString("utf8")));
    filho.on("error", () => resolver(""));
    filho.on("close", () => resolver(saida.trim()));
  });
}
