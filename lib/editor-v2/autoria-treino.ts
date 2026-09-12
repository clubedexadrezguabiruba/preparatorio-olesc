import { Chess } from "chess.js";
import type { Position } from "../lesson/schema.ts";
import { quadroDoNo } from "./arvore.ts";
import { comoId, idsDaAulaV2 } from "./ids.ts";
import type { AulaV2, RespostaTreinoV2, TreinoV2 } from "./modelo.ts";

export type CatalogoV2 = NonNullable<AulaV2["catalogo"]>;
export type EdicaoDeTreinoV2 = { treino: TreinoV2; catalogo?: CatalogoV2 };
export type ResultadoDaEdicaoDeTreinoV2 =
  | { ok: true; edicao: EdicaoDeTreinoV2 }
  | { ok: false; campo: string; mensagem: string };

const CATALOGO_VAZIO: CatalogoV2 = {
  erros: [],
  mensagensPadrao: {
    vitoriaForaDoMetodo: "Este lance funciona, mas não aplica o método treinado.",
    perdeResultado: "Este lance perde o resultado que a posição permitia.",
    alternativaDoMetodo: "Boa alternativa. Continue pela linha ensinada.",
  },
};

function aplicar(game: Chess, uci: string): boolean {
  try {
    game.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.slice(4) || undefined });
    return true;
  } catch {
    return false;
  }
}

function mesmaPosicao(a: string, b: string): boolean {
  return a === b;
}

function fimValido(game: Chess, resposta: RespostaTreinoV2, treino: TreinoV2): string | null {
  if (resposta.efeito.tipo !== "encerra") return null;
  const ultimo = resposta.efeito.defesaFinal ?? resposta.moves[0];
  if (resposta.efeito.condicao === "mate" && !game.isCheckmate()) return "a posição final não é mate";
  if (resposta.efeito.condicao === "promotion" && ultimo.length !== 5) return "o ramo não termina em promoção";
  if (resposta.efeito.condicao === "draw-secured" && !game.isDraw()) return "a posição final ainda não é um empate pelas regras";
  if (resposta.efeito.condicao === "tablebase-win" && treino.perfil !== "final-certificado") return "vitória certificada só cabe em final certificado";
  if (resposta.efeito.condicao === "objetivo-autoral" && !treino.explicacaoConclusao?.trim()) return "explique a conclusão do objetivo autoral";
  return null;
}

/**
 * Confere a execução inteira antes de a cópia autoral entrar no documento.
 * Resposta aceita não pode ser só uma etiqueta: ou repete deliberadamente, ou
 * chega à próxima pergunta depois da defesa, ou prova a condição terminal.
 */
export function prepararEdicaoDeTreino(
  aula: AulaV2,
  edicao: EdicaoDeTreinoV2,
  positions: Record<string, Position>,
): ResultadoDaEdicaoDeTreinoV2 {
  const original = aula.treinos.find((item) => item.id === edicao.treino.id);
  if (!original) return { ok: false, campo: "treino", mensagem: "este treino não existe mais" };
  // Cópia funda: a janela confere a cada tecla, e aparar o texto no objeto que a tela
  // mostra comeria o espaço digitado antes da palavra seguinte.
  const pedido = structuredClone(edicao.treino);
  const treino: TreinoV2 = {
    ...pedido,
    titulo: pedido.titulo.trim(),
    objetivo: pedido.objetivo.trim(),
    ...(pedido.explicacaoConclusao?.trim()
      ? { explicacaoConclusao: pedido.explicacaoConclusao.trim() }
      : {}),
  };
  if (!pedido.explicacaoConclusao?.trim()) delete treino.explicacaoConclusao;
  if (!treino.titulo) return { ok: false, campo: "titulo", mensagem: "escreva um título para o treino" };
  if (!treino.objetivo) return { ok: false, campo: "objetivo", mensagem: "explique o objetivo do treino" };
  const catalogo = edicao.catalogo;
  const erros = new Map(catalogo?.erros.map((erro) => [erro.id, erro]) ?? []);
  const questoes = new Map(treino.questoes.map((questao) => [questao.id, questao]));
  const movimentos = new Set<string>();

  for (let qi = 0; qi < treino.questoes.length; qi += 1) {
    const questao = treino.questoes[qi];
    const prefixo = `questoes.${qi}`;
    if (!questao.dica?.trim()) delete questao.dica;
    let fen: string;
    try { fen = quadroDoNo(aula, questao.posicao.analiseId, questao.posicao.nodeId, positions).fen; }
    catch { return { ok: false, campo: `${prefixo}.posicao`, mensagem: `a pergunta ${qi + 1} aponta para uma posição que não existe` }; }
    if (!questao.respostas.length) return { ok: false, campo: `${prefixo}.respostas`, mensagem: `a pergunta ${qi + 1} precisa de ao menos uma resposta` };
    if (!questao.respostas.some((resposta) => resposta.julgamento !== "erro")) {
      return { ok: false, campo: `${prefixo}.respostas`, mensagem: `a pergunta ${qi + 1} precisa de uma resposta aceita` };
    }

    movimentos.clear();
    for (let ri = 0; ri < questao.respostas.length; ri += 1) {
      const resposta = questao.respostas[ri];
      const campo = `${prefixo}.respostas.${ri}`;
      resposta.feedback = resposta.feedback.trim();
      if (!resposta.feedback) return { ok: false, campo: `${campo}.feedback`, mensagem: `escreva o feedback da resposta ${ri + 1} da pergunta ${qi + 1}` };
      if (!resposta.moves.length) return { ok: false, campo: `${campo}.moves`, mensagem: `informe o lance da resposta ${ri + 1}` };
      for (const move of resposta.moves) {
        if (movimentos.has(move)) return { ok: false, campo: `${campo}.moves`, mensagem: `o lance ${move} aparece em duas respostas da pergunta ${qi + 1}` };
        movimentos.add(move);
      }
      if (resposta.julgamento === "erro") {
        const erro = resposta.erroId ? erros.get(resposta.erroId) : undefined;
        if (!erro) return { ok: false, campo: `${campo}.erroId`, mensagem: `nomeie o erro conhecido da resposta ${ri + 1}` };
        if (!erro.nome?.trim()) return { ok: false, campo: `${campo}.erroId`, mensagem: `dê um nome curto ao erro conhecido da resposta ${ri + 1}` };
        if (!erro.texto.trim()) return { ok: false, campo: `${campo}.erroId`, mensagem: `explique o erro conhecido da resposta ${ri + 1}` };
        if (resposta.efeito.tipo !== "repete") return { ok: false, campo: `${campo}.efeito`, mensagem: "um erro conhecido precisa explicar e repetir a pergunta" };
      } else if (resposta.erroId) {
        return { ok: false, campo: `${campo}.erroId`, mensagem: "uma resposta aceita não pode apontar para um erro" };
      }

      for (const move of resposta.moves) {
        const game = new Chess(fen);
        if (!aplicar(game, move)) return { ok: false, campo: `${campo}.moves`, mensagem: `${move} não é legal na posição da pergunta ${qi + 1}` };
        if (resposta.julgamento === "erro" || resposta.efeito.tipo === "repete") continue;
        if (resposta.efeito.tipo === "avanca") {
          for (const defesa of resposta.efeito.defesas) {
            const depois = new Chess(game.fen());
            if (!aplicar(depois, defesa.move)) return { ok: false, campo: `${campo}.efeito`, mensagem: `${defesa.move} não é uma resposta legal do defensor` };
            const proxima = questoes.get(defesa.proximaQuestaoId);
            if (!proxima) return { ok: false, campo: `${campo}.efeito`, mensagem: "a continuação aponta para uma pergunta que não existe" };
            const fenDaProxima = quadroDoNo(aula, proxima.posicao.analiseId, proxima.posicao.nodeId, positions).fen;
            if (!mesmaPosicao(depois.fen(), fenDaProxima)) return { ok: false, campo: `${campo}.efeito`, mensagem: "a continuação não chega à posição da próxima pergunta" };
          }
        } else {
          if (resposta.efeito.defesaFinal && !aplicar(game, resposta.efeito.defesaFinal)) return { ok: false, campo: `${campo}.efeito`, mensagem: `${resposta.efeito.defesaFinal} não é uma resposta final legal do defensor` };
          const problema = fimValido(game, resposta, treino);
          if (problema) return { ok: false, campo: `${campo}.efeito`, mensagem: problema };
        }
      }
    }
  }

  // Salvar sem mudar nada devolve o próprio documento: não personaliza (§16.5, só o
  // primeiro ajuste materializa a cópia) e não entra no histórico (§6.1).
  const nadaMudou = JSON.stringify(treino) === JSON.stringify(original)
    && JSON.stringify(catalogo) === JSON.stringify(aula.catalogo);
  if (nadaMudou) return { ok: true, edicao: { treino: original, ...(aula.catalogo ? { catalogo: aula.catalogo } : {}) } };
  treino.propriedade = treino.propriedade === "independente" ? "independente" : "personalizado";
  treino.revisaoAvaliacao = "pendente";
  return { ok: true, edicao: { treino, ...(catalogo ? { catalogo } : {}) } };
}

export function aplicarEdicaoDeTreino(aula: AulaV2, edicao: EdicaoDeTreinoV2): AulaV2 {
  const indice = aula.treinos.findIndex((item) => item.id === edicao.treino.id);
  if (indice < 0) throw new Error("este treino não existe mais");
  const atual = aula.treinos[indice];
  const mesmoTreino = JSON.stringify(atual) === JSON.stringify(edicao.treino);
  const mesmoCatalogo = JSON.stringify(aula.catalogo) === JSON.stringify(edicao.catalogo);
  if (mesmoTreino && mesmoCatalogo) return aula;
  return {
    ...aula,
    treinos: aula.treinos.map((item) => item.id === edicao.treino.id ? edicao.treino : item),
    ...(edicao.catalogo ? { catalogo: edicao.catalogo } : {}),
  };
}

/** O efeito de uma resposta quando o professor troca o que vem depois dela. */
export function efeitoAoTrocarTipo(
  tipo: RespostaTreinoV2["efeito"]["tipo"],
  contexto: { proximaQuestaoId: string; original?: RespostaTreinoV2["efeito"] },
): RespostaTreinoV2["efeito"] {
  // Voltar ao tipo que a resposta já tinha no documento devolve o que o professor
  // escreveu (a defesa, a próxima pergunta, a condição), e não um marcador.
  if (contexto.original?.tipo === tipo) return structuredClone(contexto.original);
  if (tipo === "repete") return { tipo };
  if (tipo === "encerra") return { tipo, condicao: "objetivo-autoral" };
  return { tipo: "avanca", defesas: [{ move: "a1a2", proximaQuestaoId: contexto.proximaQuestaoId }] };
}

export function proximoIdDeResposta(aula: AulaV2, treino: TreinoV2, questaoId: string): string {
  const usados = idsDaAulaV2(aula);
  treino.questoes.flatMap((questao) => questao.respostas).forEach((resposta) => usados.add(resposta.id));
  const base = `resposta-${questaoId}-autoral`;
  let id = base;
  let numero = 2;
  while (usados.has(id)) id = `${base}-${numero++}`;
  return id;
}

export function catalogoComErro(
  aula: AulaV2,
  catalogoAtual: CatalogoV2 | undefined,
  nome: string,
  texto: string,
  julgamento: "fora-do-metodo" | "perde-resultado" = "perde-resultado",
): { catalogo: CatalogoV2; erroId: string } {
  const catalogo = structuredClone(catalogoAtual ?? aula.catalogo ?? CATALOGO_VAZIO);
  const base = `erro-${comoId(nome, "conhecido")}`;
  const usados = idsDaAulaV2(aula);
  catalogo.erros.forEach((erro) => usados.add(erro.id));
  let erroId = base;
  let numero = 2;
  while (usados.has(erroId)) erroId = `${base}-${numero++}`;
  catalogo.erros.push({ id: erroId, nome: nome.trim(), julgamento, texto: texto.trim() });
  return { catalogo, erroId };
}
