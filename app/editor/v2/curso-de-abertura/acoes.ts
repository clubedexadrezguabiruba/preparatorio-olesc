"use server";

import { exigirEditor } from "@/lib/editor/acesso";
import { dominioDaAulaV2 } from "@/lib/editor-v2/dominio";
import { aplicarRepertorioDoCurso, diffDoCurso, gravarAulasDoCurso, prepararRepertorioDoCurso, type DiffDaAula, type GravacaoDoCurso } from "@/lib/editor-v2/importar-curso";
import { buscarPgnDoLichess } from "@/lib/editor-v2/lichess-url";
import { planejarCursoDeAbertura, type CursoPlanejado, type LinhaDoRelatorio } from "@/lib/editor-v2/planejar-curso";
import type { AvisoDoCurso } from "@/lib/editor-v2/curso-de-abertura";
import { CORES, type Cor } from "@/lib/repertorio/linhas";

/**
 * As três ações da tela de importar curso de abertura (spec §13.3.8 e §21). Cada uma planeja de
 * novo a partir do texto do estudo — nada fica guardado entre uma e outra no servidor —, e cada uma
 * confere `exigirEditor()`: um POST direto não passa pela página.
 */

export type PedidoDoCurso = { texto: string; cor: string; abertura: string; nome: string };

const LIMITE_DO_TEXTO = 2_000_000;

function planejar(pedido: PedidoDoCurso): { ok: true; curso: CursoPlanejado; cor: Cor } | { ok: false; mensagem: string } {
  const cor = String(pedido.cor ?? "");
  const abertura = String(pedido.abertura ?? "");
  const nome = String(pedido.nome ?? "").trim();
  const texto = String(pedido.texto ?? "");
  if (!(CORES as readonly string[]).includes(cor)) return { ok: false, mensagem: "escolha a cor do curso: brancas ou pretas" };
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(abertura)) return { ok: false, mensagem: "a abertura precisa ser um nome curto, minúsculo, com hífen (ex.: francesa, caro-kann)" };
  if (!nome || nome.length > 60) return { ok: false, mensagem: "dê o nome da abertura como o aluno lê (até 60 letras)" };
  if (!texto.trim()) return { ok: false, mensagem: "traga o estudo: o link do Lichess, o arquivo PGN ou o texto colado" };
  if (texto.length > LIMITE_DO_TEXTO) return { ok: false, mensagem: "o estudo passa de 2 MB — é grande demais para um curso" };
  try {
    return { ok: true, cor: cor as Cor, curso: planejarCursoDeAbertura(texto, { cor: cor as Cor, abertura, nomeDaAbertura: nome }) };
  } catch (erro) {
    return { ok: false, mensagem: erro instanceof Error ? erro.message : "o estudo não pôde ser lido" };
  }
}

export async function buscarEstudoDoCursoAcao(link: string): Promise<{ ok: true; texto: string } | { ok: false; mensagem: string }> {
  await exigirEditor();
  const resposta = await buscarPgnDoLichess(String(link ?? "").slice(0, 500));
  return resposta.ok ? { ok: true, texto: resposta.pgn } : { ok: false, mensagem: resposta.mensagem };
}

export type LeituraDoCursoNaTela = {
  ok: true;
  estudo: string | null;
  relatorio: LinhaDoRelatorio[];
  avisos: AvisoDoCurso[];
  aulas: Array<DiffDaAula & { bloco: string; paradas: number; ramos: number; linhasDoTreinador: number }>;
  repertorio:
    | { ok: true; linhas: number; nascem: number; morrem: string[]; textoMudou: number; impactoHash: string }
    | { ok: false; motivo: string; problemas: string[] };
};

export async function lerCursoDeAberturaAcao(pedido: PedidoDoCurso): Promise<LeituraDoCursoNaTela | { ok: false; mensagem: string }> {
  await exigirEditor();
  const planejado = planejar(pedido);
  if (!planejado.ok) return planejado;
  const { curso } = planejado;
  const diff = new Map(diffDoCurso(curso).map((item) => [item.id, item]));
  const preparo = prepararRepertorioDoCurso(curso, pedido.abertura);
  return {
    ok: true,
    estudo: curso.pgn.fonte,
    relatorio: curso.relatorio,
    avisos: curso.avisos,
    aulas: curso.aulas.map((item) => ({ ...diff.get(item.aula.id)!, bloco: item.bloco, paradas: item.paradas, ramos: item.ramos, linhasDoTreinador: item.linhasDoTreinador })),
    repertorio: preparo.ok
      ? { ok: true, linhas: curso.pgn.linhas, nascem: preparo.impacto.nascem.length, morrem: preparo.idsQueMorrem, textoMudou: preparo.impacto.textoMudou, impactoHash: preparo.impactoHash }
      // O compilador junta os problemas do banco num texto só, uma linha por problema: a tela lista um por item.
      : { ok: false, motivo: preparo.motivo, problemas: preparo.problemas.flatMap((p) => p.split("\n").map((linha) => linha.trim()).filter((linha) => linha && !/não passou na conferência:$/.test(linha))) },
  };
}

export async function gravarCursoDeAberturaAcao(pedido: PedidoDoCurso): Promise<{ ok: true; gravacao: GravacaoDoCurso } | { ok: false; mensagem: string }> {
  await exigirEditor();
  const planejado = planejar(pedido);
  if (!planejado.ok) return planejado;
  if (!planejado.curso.aulas.every((item) => dominioDaAulaV2(item.aula.id) === "abertura")) return { ok: false, mensagem: "o planejador produziu uma aula fora do curso de abertura" };
  return { ok: true, gravacao: gravarAulasDoCurso(planejado.curso) };
}

export async function aplicarRepertorioDoCursoAcao(pedido: PedidoDoCurso & { impactoHash: string }): Promise<{ ok: true } | { ok: false; mensagem: string; problemas?: string[] }> {
  await exigirEditor();
  const planejado = planejar(pedido);
  if (!planejado.ok) return planejado;
  const resultado = aplicarRepertorioDoCurso(planejado.curso, pedido.texto, pedido.abertura, String(pedido.impactoHash ?? ""));
  return resultado.ok ? { ok: true } : { ok: false, mensagem: resultado.motivo, ...(resultado.problemas ? { problemas: resultado.problemas } : {}) };
}
