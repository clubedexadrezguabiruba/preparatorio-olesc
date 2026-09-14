/**
 * A introdução da aula e seus quadros, editados pela tela — especificação §7.1, fatia 10.
 *
 * Um quadro é uma fala do professor com uma posição parada: título opcional, texto, desenhos e a
 * posição — a **referência** a um lance de um capítulo (inclusive a posição inicial dele) ou uma
 * **FEN própria**. "Inserir lance" joga um lance a partir do quadro e cria o quadro seguinte com a
 * posição resultante; o lance fica guardado para o aluno ver de onde a peça saiu.
 *
 * ## As regras, e o porquê
 *
 * - **Referência é fonte única** (§7.1): escrever como FEN a mesma posição que um capítulo já tem é
 *   recusado, com o nome do capítulo — duas cópias da mesma posição discordariam no dia em que o
 *   capítulo mudasse.
 * - **Uma introdução tem ao menos um quadro** (schema): excluir o último é excluir a introdução, e a
 *   tela diz isso em vez de apagar calada.
 * - **A introdução entra no começo do fluxo** (§18): é o que ela é. Depois disso ela se move como
 *   qualquer etapa.
 * - Os ids chegam prontos (decididos no clique), como em todo comando: o Refazer devolve os mesmos.
 */
import { Chess } from "chess.js";
import { quadroDoNo } from "./arvore.ts";
import { mesmosDesenhos } from "./desenhos.ts";
import type { AulaV2, DesenhoV2, IntroducaoV2, QuadroIntroducaoV2 } from "./modelo.ts";
import type { Position } from "../lesson/schema.ts";

export type PosicaoDoQuadroV2 = QuadroIntroducaoV2["posicao"];

export type ComandoDeIntroducaoV2 =
  | { tipo: "ADICIONAR_INTRODUCAO"; introducaoId: string; etapaId: string; titulo: string; quadro: QuadroIntroducaoV2 }
  | { tipo: "EXCLUIR_INTRODUCAO"; introducaoId: string }
  | { tipo: "RENOMEAR_INTRODUCAO"; introducaoId: string; titulo: string }
  /** Acrescenta depois de `depoisDe` (ou no fim). Duplicar é acrescentar a cópia com id novo. */
  | { tipo: "ADICIONAR_QUADRO"; introducaoId: string; quadro: QuadroIntroducaoV2; depoisDe?: string }
  | { tipo: "EXCLUIR_QUADRO"; introducaoId: string; quadroId: string }
  | { tipo: "EDITAR_QUADRO"; introducaoId: string; quadroId: string; titulo?: string; texto?: string }
  | { tipo: "DEFINIR_POSICAO_DO_QUADRO"; introducaoId: string; quadroId: string; posicao: PosicaoDoQuadroV2 }
  | { tipo: "DEFINIR_DESENHOS_DO_QUADRO"; introducaoId: string; quadroId: string; desenhos: DesenhoV2 | undefined }
  | { tipo: "MOVER_QUADRO"; introducaoId: string; quadroId: string; direcao: "acima" | "abaixo" };

const TIPOS = new Set(["ADICIONAR_INTRODUCAO", "EXCLUIR_INTRODUCAO", "RENOMEAR_INTRODUCAO", "ADICIONAR_QUADRO", "EXCLUIR_QUADRO", "EDITAR_QUADRO", "DEFINIR_POSICAO_DO_QUADRO", "DEFINIR_DESENHOS_DO_QUADRO", "MOVER_QUADRO"]);
export const ehComandoDeIntroducao = (comando: { tipo: string }): comando is ComandoDeIntroducaoV2 => TIPOS.has(comando.tipo);

/** A FEN de um quadro, resolvida. */
export function fenDoQuadro(aula: AulaV2, quadro: QuadroIntroducaoV2, positions: Record<string, Position>): string {
  return quadro.posicao.tipo === "fen"
    ? quadro.posicao.fen
    : quadroDoNo(aula, quadro.posicao.origem.analiseId, quadro.posicao.origem.nodeId, positions).fen;
}

/** Os seis campos da FEN sem os contadores: a mesma posição, mesmo que o lance tenha outro número. */
const semContadores = (fen: string) => fen.trim().split(/\s+/).slice(0, 4).join(" ");

/**
 * O capítulo cuja posição inicial é esta FEN — é o que a recusa de §7.1 nomeia.
 * Só as posições iniciais: é para elas que a tela oferece a referência pronta.
 */
export function capituloComAMesmaPosicao(aula: AulaV2, fen: string, positions: Record<string, Position>): { capituloId: string; titulo: string; analiseId: string; nodeId: string } | null {
  for (const capitulo of aula.capitulos) {
    try {
      const inicio = quadroDoNo(aula, capitulo.analiseId, capitulo.inicioNodeId, positions).fen;
      if (semContadores(inicio) === semContadores(fen)) return { capituloId: capitulo.id, titulo: capitulo.titulo, analiseId: capitulo.analiseId, nodeId: capitulo.inicioNodeId };
    } catch { /* capítulo com lance impossível: a lista de problemas já aponta */ }
  }
  return null;
}

/** Recusa com frase, ou `null`. Usada pela tela antes do comando e pelo executor. */
export function problemaDaPosicaoDoQuadro(aula: AulaV2, posicao: PosicaoDoQuadroV2, positions: Record<string, Position>): string | null {
  if (posicao.tipo === "referencia") {
    const analise = aula.analises.find((item) => item.id === posicao.origem.analiseId);
    return analise?.nos[posicao.origem.nodeId] ? null : "o lance escolhido não existe mais nesta aula";
  }
  try { new Chess(posicao.fen); } catch { return "esta FEN não é uma posição válida"; }
  const mesma = capituloComAMesmaPosicao(aula, posicao.fen, positions);
  if (mesma) return `esta é a posição inicial do capítulo «${mesma.titulo}» — use a referência a ele, para a posição ter uma fonte só`;
  return null;
}

/**
 * O quadro seguinte a partir de um lance jogado no quadro atual ("inserir lance").
 * Devolve a posição nova como FEN, com o lance que levou a ela.
 */
export function quadroDepoisDoLance(aula: AulaV2, quadro: QuadroIntroducaoV2, uci: string, positions: Record<string, Position>, novoId: string): QuadroIntroducaoV2 {
  const jogo = new Chess(fenDoQuadro(aula, quadro, positions));
  const lance = jogo.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.slice(4) || undefined });
  if (!lance) throw new Error("esse lance não é legal nesta posição");
  return { id: novoId, texto: quadro.texto, posicao: { tipo: "fen", fen: jogo.fen() }, lance: uci };
}

function comIntroducao(aula: AulaV2, introducaoId: string, mudar: (introducao: IntroducaoV2) => IntroducaoV2): AulaV2 {
  const atual = aula.introducoes.find((item) => item.id === introducaoId);
  if (!atual) throw new Error("esta introdução não existe mais");
  const proxima = mudar(atual);
  if (proxima === atual) return aula;
  return { ...aula, introducoes: aula.introducoes.map((item) => (item.id === introducaoId ? proxima : item)) };
}

function comQuadro(introducao: IntroducaoV2, quadroId: string, mudar: (quadro: QuadroIntroducaoV2) => QuadroIntroducaoV2): IntroducaoV2 {
  const atual = introducao.quadros.find((item) => item.id === quadroId);
  if (!atual) throw new Error("este quadro não existe mais");
  const proximo = mudar(atual);
  if (proximo === atual) return introducao;
  return { ...introducao, quadros: introducao.quadros.map((item) => (item.id === quadroId ? proximo : item)) };
}

export function executarComandoDeIntroducao(aula: AulaV2, comando: ComandoDeIntroducaoV2, positions: Record<string, Position>): AulaV2 {
  switch (comando.tipo) {
    case "ADICIONAR_INTRODUCAO": {
      if (aula.introducoes.some((item) => item.id === comando.introducaoId)) throw new Error("esta introdução já existe");
      const problema = problemaDaPosicaoDoQuadro(aula, comando.quadro.posicao, positions);
      if (problema) throw new Error(problema);
      const titulo = comando.titulo.trim() || "Introdução";
      return {
        ...aula,
        introducoes: [...aula.introducoes, { id: comando.introducaoId, titulo, quadros: [comando.quadro] }],
        fluxo: [{ id: comando.etapaId, tipo: "introducao", entidadeId: comando.introducaoId }, ...aula.fluxo],
      };
    }
    case "EXCLUIR_INTRODUCAO":
      if (!aula.introducoes.some((item) => item.id === comando.introducaoId)) return aula;
      return {
        ...aula,
        introducoes: aula.introducoes.filter((item) => item.id !== comando.introducaoId),
        fluxo: aula.fluxo.filter((etapa) => !(etapa.tipo === "introducao" && etapa.entidadeId === comando.introducaoId)),
      };
    case "RENOMEAR_INTRODUCAO":
      return comIntroducao(aula, comando.introducaoId, (introducao) => {
        const titulo = comando.titulo.trim();
        return !titulo || titulo === introducao.titulo ? introducao : { ...introducao, titulo };
      });
    case "ADICIONAR_QUADRO":
      return comIntroducao(aula, comando.introducaoId, (introducao) => {
        if (introducao.quadros.some((item) => item.id === comando.quadro.id)) throw new Error("este quadro já existe");
        if (!comando.quadro.texto.trim()) throw new Error("escreva o texto do quadro — é o que o aluno lê");
        const problema = problemaDaPosicaoDoQuadro(aula, comando.quadro.posicao, positions);
        if (problema) throw new Error(problema);
        const depois = comando.depoisDe ? introducao.quadros.findIndex((item) => item.id === comando.depoisDe) : -1;
        const quadros = [...introducao.quadros];
        quadros.splice(depois < 0 ? quadros.length : depois + 1, 0, comando.quadro);
        return { ...introducao, quadros };
      });
    case "EXCLUIR_QUADRO":
      return comIntroducao(aula, comando.introducaoId, (introducao) => {
        if (!introducao.quadros.some((item) => item.id === comando.quadroId)) return introducao;
        if (introducao.quadros.length === 1) throw new Error("este é o único quadro — para tirar a introdução, use Excluir introdução");
        return { ...introducao, quadros: introducao.quadros.filter((item) => item.id !== comando.quadroId) };
      });
    case "EDITAR_QUADRO":
      return comIntroducao(aula, comando.introducaoId, (introducao) => comQuadro(introducao, comando.quadroId, (quadro) => {
        const texto = comando.texto === undefined ? quadro.texto : comando.texto.trim();
        const titulo = comando.titulo === undefined ? quadro.titulo : comando.titulo.trim() || undefined;
        // Esvaziar o texto não apaga o que existia (o schema pede texto): fica o anterior.
        const proximoTexto = texto || quadro.texto;
        if (proximoTexto === quadro.texto && titulo === quadro.titulo) return quadro;
        const editado: QuadroIntroducaoV2 = { ...quadro, texto: proximoTexto };
        if (titulo) editado.titulo = titulo; else delete editado.titulo;
        return editado;
      }));
    case "DEFINIR_POSICAO_DO_QUADRO":
      return comIntroducao(aula, comando.introducaoId, (introducao) => comQuadro(introducao, comando.quadroId, (quadro) => {
        if (JSON.stringify(quadro.posicao) === JSON.stringify(comando.posicao)) return quadro;
        const problema = problemaDaPosicaoDoQuadro(aula, comando.posicao, positions);
        if (problema) throw new Error(problema);
        // Posição nova: o lance que levava à antiga não conta mais, nem a marca de revisão.
        const { lance: _lance, revisao: _revisao, ...resto } = quadro;
        void _lance; void _revisao;
        return { ...resto, posicao: comando.posicao };
      }));
    case "DEFINIR_DESENHOS_DO_QUADRO":
      return comIntroducao(aula, comando.introducaoId, (introducao) => comQuadro(introducao, comando.quadroId, (quadro) => {
        if (mesmosDesenhos(quadro.desenhos, comando.desenhos)) return quadro;
        const vazio = !comando.desenhos || (!comando.desenhos.arrows?.length && !comando.desenhos.highlights?.length);
        const { desenhos: _desenhos, ...resto } = quadro;
        void _desenhos;
        return vazio ? resto : { ...resto, desenhos: comando.desenhos };
      }));
    case "MOVER_QUADRO":
      return comIntroducao(aula, comando.introducaoId, (introducao) => {
        const de = introducao.quadros.findIndex((item) => item.id === comando.quadroId);
        const para = comando.direcao === "acima" ? de - 1 : de + 1;
        if (de < 0 || para < 0 || para >= introducao.quadros.length) return introducao;
        const quadros = [...introducao.quadros];
        [quadros[de], quadros[para]] = [quadros[para], quadros[de]];
        return { ...introducao, quadros };
      });
  }
}
