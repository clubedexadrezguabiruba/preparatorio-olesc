/**
 * O planejador do curso de abertura — especificação §13.3 e §18.1 (decisões do Doug, 16/9/2026).
 *
 * Recebe o texto do estudo e devolve as aulas prontas para gravar, uma por bloco, mais o PGN do
 * repertório gerado e o relatório por capítulo. Não escreve nada: quem grava é a action da tela de
 * importação (`app/editor/v2/curso-de-abertura/`).
 *
 * ## O molde de cada aula (§13.3.6)
 *
 * ```text
 * capítulo do bloco     ── UMA etapa (Doug, 18/9/2026): [OBJETIVO] no resumo → falas, uma por marcador
 *   (ramos)             ── na mesma etapa (`comparacoes`): a principal até o fim, e a fita volta a
 *                          cada ramo (`ordemDaFita`); o Laboratório toca na ordem dos casos
 *   (paradas)           ── na mesma etapa (`paradas`): o tabuleiro para na pergunta, o aluno joga,
 *                          e a narração segue — sem etapa própria, sem Espaço
 * …
 * revisão (F)           ── introdução, um quadro por trecho comentado
 * treino guiado         ── a árvore das linhas do bloco; a defesa gira a cada tentativa
 * move trainer          ── as linhas do bloco no repertório compilado, na ordem do estudo
 * ```
 *
 * A aula de partida modelo (D) é só o capítulo (regra 18).
 *
 * ## Ids determinísticos
 *
 * Tudo sai do código do capítulo (`cap-b05a`, `no-cap-b05a-12`, `treino-parada-b05a-1`). Planejar
 * duas vezes o mesmo estudo produz as mesmas aulas byte a byte — é o que deixa a reimportação
 * mostrar um diff que significa alguma coisa.
 */
import { Chess } from "chess.js";
import { lerPgnsDoEstudo } from "../repertorio/pgn.ts";
import { idDaLinha } from "../repertorio/linhas.ts";
import { gerarPgnDoEstudo, type PgnGerado } from "../repertorio/gerar-do-estudo.ts";
import {
  AULAS_DO_CURSO, adversarioDo, comentarioDoRepertorio, lanceEscrito, lerComentario, lerCursoDeAbertura, marcaBoa, marcaRuim, semContadores, tituloDaAula,
  type AulaDoCurso, type AvisoDoCurso, type CapituloDoCurso, type LanceDoEstudo, type LeituraDoCurso, type Parada, type Percurso,
} from "./curso-de-abertura.ts";
import { idDaAulaDeAbertura, type CorDoCurso } from "./dominio.ts";
import { ordemDaFita } from "./previa.ts";
import { importarJogo } from "./importar-pgn.ts";
import type {
  AnaliseV2, AulaV2, CapituloV2, IntroducaoV2, NarracaoV2, QuestaoTreinoV2, RespostaTreinoV2, TreinadorV2, TreinoV2,
} from "./modelo.ts";

export type OpcoesDoCurso = {
  cor: CorDoCurso;
  /** O slug da abertura: `francesa`, `caro-kann`. */
  abertura: string;
  /** Como o aluno lê o nome: "Francesa 3.Bd3". */
  nomeDaAbertura: string;
  nivel?: "base" | "avancado";
  agora?: Date;
};

export type LinhaDoRelatorio = {
  codigo: string;
  titulo: string;
  aula: AulaDoCurso | null;
  papel: CapituloDoCurso["papel"];
  ramos: number;
  perguntas: number;
  paradas: number;
};

export type AulaPlanejada = {
  bloco: AulaDoCurso;
  aula: AulaV2;
  capitulos: string[];
  paradas: number;
  ramos: number;
  linhasDoTreinador: number;
};

export type CursoPlanejado = {
  leitura: LeituraDoCurso;
  aulas: AulaPlanejada[];
  pgn: PgnGerado;
  relatorio: LinhaDoRelatorio[];
  avisos: AvisoDoCurso[];
};

const ROTULO_DA_AULA: Record<AulaDoCurso, string> = { A: "A", B: "B", C: "C", D: "D", EF: "E+F" };
const idDe = (codigo: string) => `cap-${codigo.toLowerCase()}`;

/** Posição e histórico de um nó, para a cópia operacional do treino independente. */
function materializar(analise: AnaliseV2, nodeId: string) {
  const historicoUci: string[] = [];
  const pais = new Map<string, string>();
  for (const no of Object.values(analise.nos)) for (const filho of no.filhos) pais.set(filho, no.id);
  for (let atual: string | undefined = nodeId; atual && atual !== analise.raizId; atual = pais.get(atual)) {
    historicoUci.unshift(analise.nos[atual].uci!);
  }
  const jogo = new Chess(analise.inicio.tipo === "fen" ? analise.inicio.fen : undefined);
  for (const uci of historicoUci) jogo.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.slice(4) || undefined });
  return { fen: jogo.fen(), historicoUci, origem: { analiseId: analise.id, nodeId } };
}

/** Os ids dos nós de um percurso do estudo na análise importada: a raiz e um por lance. */
function nosDoPercurso(analise: AnaliseV2, lances: readonly LanceDoEstudo[]): string[] {
  const ids = [analise.raizId];
  for (const lance of lances) {
    const pai = analise.nos[ids[ids.length - 1]];
    const filho = pai.filhos.find((id) => analise.nos[id].uci === lance.uci);
    if (!filho) throw new Error(`o lance ${lanceEscrito(lance)} não está na análise importada`);
    ids.push(filho);
  }
  return ids;
}

type Montagem = {
  analises: AnaliseV2[];
  capitulos: CapituloV2[];
  treinos: TreinoV2[];
  introducoes: IntroducaoV2[];
  treinadores: TreinadorV2[];
  fluxo: AulaV2["fluxo"];
  erros: NonNullable<AulaV2["catalogo"]>["erros"];
  usados: Set<string>;
};

const livre = (m: Montagem, base: string) => {
  let id = base;
  for (let n = 2; m.usados.has(id); n += 1) id = `${base}-${n}`;
  m.usados.add(id);
  return id;
};

/** As falas de um nó na ordem escrita, sem o que vira pergunta de parada. Os ids de Resumo e A seguir vão para `fechamentos`. */
function narracoesDoNo(m: Montagem, nodeId: string, comentario: string | null, opcoes: { semPergunta: boolean; fechamentos?: Set<string> }): NarracaoV2[] {
  return lerComentario(comentario).sequencia
    .filter((fala) => !(fala.pergunta && opcoes.semPergunta))
    .map((fala) => {
      const id = livre(m, `narracao-${nodeId}`);
      if (fala.fechamento) opcoes.fechamentos?.add(id);
      return {
        id,
        nodeId,
        texto: fala.texto,
        pausa: fala.pausaManual ? "manual" as const : "temporizada" as const,
        ...(fala.rotulo ? { rotulo: fala.rotulo.slice(0, 40) } : {}),
      };
    });
}

/** O cabeçalho da partida modelo, das tags `Model*`. */
function cabecalhoDaPartida(capitulo: CapituloDoCurso): string | null {
  const p = capitulo.partidaModelo;
  if (!p) return null;
  const ano = p.data?.slice(0, 4);
  return `${p.brancas} × ${p.pretas}${p.evento ? ` — ${p.evento}` : ""}${ano && !p.evento?.includes(ano) ? `, ${ano}` : ""}.`;
}

function montarCapituloDeAula(m: Montagem, leitura: LeituraDoCurso, capitulo: CapituloDoCurso, avisos: AvisoDoCurso[]): { paradas: number; ramos: number } {
  const partida = { ...capitulo.partida, tags: { ...capitulo.partida.tags, ChapterName: `cap ${capitulo.codigo}` } };
  const jogo = importarJogo(partida, capitulo.numero, new Set(m.usados));
  if (!jogo.analise) {
    avisos.push({ codigo: "CAPITULO_RECUSADO", capitulo: capitulo.codigo, mensagem: jogo.recusa?.mensagem ?? "o capítulo não pôde ser importado" });
    return { paradas: 0, ramos: 0 };
  }
  const analise = jogo.analise;
  for (const id of Object.keys(analise.nos)) m.usados.add(id);
  m.usados.add(analise.id);
  m.analises.push(analise);
  const orientacao = leitura.cor === "brancas" ? "white" as const : "black" as const;
  let paradas = 0;
  const fechamentos = new Set<string>();
  // Uma linha por percurso: o capítulo dela (da raiz até a ponta) e as perguntas que ela faz.
  const linhas: Array<{ capitulo: CapituloV2; nodeIds: string[]; paradas: string[] }> = [];

  capitulo.percursos.forEach((percurso: Percurso, indice) => {
    const nodeIds = nosDoPercurso(analise, percurso.lances);
    const dasParadas = capitulo.paradas.filter((p) => p.percurso === indice).sort((a, b) => a.resposta - b.resposta);
    const perguntasJogaveis = new Set(dasParadas.map((p) => p.pergunta));
    // Na principal a raiz é narrada (a introdução do capítulo); num ramo, só os lances próprios dele —
    // o começo comum já foi narrado na linha de onde ele saiu.
    const primeiroNarrado = percurso.tipo === "ramo" ? percurso.desde + 1 : 0;
    const narracoes: NarracaoV2[] = [];
    if (percurso.tipo === "principal") {
      const cabecalho = cabecalhoDaPartida(capitulo);
      if (cabecalho) narracoes.push({ id: livre(m, `narracao-${nodeIds[0]}`), nodeId: nodeIds[0], texto: cabecalho, pausa: "temporizada", rotulo: "Partida" });
    }
    for (let k = primeiroNarrado; k < nodeIds.length; k += 1) {
      const comentario = k === 0 ? capitulo.partida.intro : percurso.lances[k - 1].comentario;
      // A pergunta que vira parada sai da fala: quem a faz é o passo da pergunta. A que não tem lance fica.
      const semPergunta = k > 0 && perguntasJogaveis.has(k - 1);
      narracoes.push(...narracoesDoNo(m, nodeIds[k], comentario, { semPergunta, ...(percurso.tipo === "principal" ? { fechamentos } : {}) }));
    }
    const id = livre(m, `${idDe(capitulo.codigo)}${percurso.tipo === "ramo" ? `-ramo-${indice}` : ""}`);
    const titulo = percurso.tipo === "principal" ? capitulo.titulo : percurso.titulo ?? `${capitulo.titulo} — se ${lanceEscrito(percurso.lances[percurso.desde])}`;
    const doCapitulo: CapituloV2 = {
      id,
      titulo,
      ...(percurso.tipo === "principal" && capitulo.objetivo ? { resumo: capitulo.objetivo } : {}),
      ...(percurso.tipo === "principal" && capitulo.secao ? { secao: capitulo.secao } : {}),
      analiseId: analise.id,
      inicioNodeId: nodeIds[0],
      caminho: nodeIds.slice(1),
      orientacao,
      narracoes,
    };
    m.capitulos.push(doCapitulo);
    const idsDasParadas: string[] = [];
    for (const parada of dasParadas) {
      paradas += 1;
      idsDasParadas.push(montarParada(m, capitulo, analise, nodeIds, percurso, parada, orientacao, paradas));
    }
    linhas.push({ capitulo: doCapitulo, nodeIds, paradas: idsDasParadas });
  });

  // A ordem da fita: o Laboratório (todo ramo é um CASO, já em ordem de número) toca pela lista; o
  // resto, a principal até o fim e cada ramo depois, do mais fundo ao mais raso.
  const laboratorio = linhas.length > 1 && capitulo.percursos.slice(1).every((p) => p.caso !== null);
  const ordem = laboratorio ? linhas.map((_, i) => i) : ordemDaFita(linhas.map((l) => l.nodeIds));
  const [principal, ...ramos] = ordem.map((i) => linhas[i]);
  // O Resumo e o A seguir fecham a etapa inteira: vão para o último lance da última linha tocada.
  if (ramos.length && fechamentos.size) {
    const ultima = ramos.at(-1)!;
    const fechos = principal.capitulo.narracoes.filter((n) => fechamentos.has(n.id));
    principal.capitulo.narracoes = principal.capitulo.narracoes.filter((n) => !fechamentos.has(n.id));
    ultima.capitulo.narracoes.push(...fechos.map((n) => ({ ...n, nodeId: ultima.nodeIds.at(-1)! })));
  }
  const todasAsParadas = ordem.flatMap((i) => linhas[i].paradas);
  m.fluxo.push({
    id: livre(m, `etapa-${principal.capitulo.id}`),
    tipo: "capitulo",
    entidadeId: principal.capitulo.id,
    ...(ramos.length ? { comparacoes: ramos.map((l) => l.capitulo.id) } : {}),
    ...(todasAsParadas.length ? { paradas: todasAsParadas } : {}),
  });
  return { paradas, ramos: capitulo.percursos.length - 1 };
}

/** A pergunta de uma parada: um treino de uma questão, jogado dentro da etapa do capítulo. Devolve o id. */
function montarParada(m: Montagem, capitulo: CapituloDoCurso, analise: AnaliseV2, nodeIds: string[], percurso: Percurso, parada: Parada, lado: "white" | "black", numero: number): string {
  const resposta = percurso.lances[parada.resposta];
  const posicaoId = nodeIds[parada.resposta];
  const base = `parada-${capitulo.codigo.toLowerCase()}-${numero}`;
  const treinoId = livre(m, `treino-${base}`);
  const questaoId = livre(m, `questao-${base}`);
  const principal = lanceEscrito(resposta);
  const jogo = new Chess(materializar(analise, posicaoId).fen);
  jogo.move({ from: resposta.uci.slice(0, 2), to: resposta.uci.slice(2, 4), promotion: resposta.uci.slice(4) || undefined });
  const respostas: RespostaTreinoV2[] = [{
    id: livre(m, `resposta-${base}`),
    moves: [resposta.uci],
    julgamento: "correta",
    feedback: `Isso: ${principal}.`,
    efeito: { tipo: "encerra", condicao: jogo.isCheckmate() ? "mate" : "objetivo-autoral" },
  }];
  for (const irmao of parada.alternativas) {
    respostas.push({ id: livre(m, `resposta-${base}-${irmao.uci}`), moves: [irmao.uci], julgamento: "alternativa", feedback: `${lanceEscrito(irmao)} também vale, mas a aula segue por ${principal}.`, efeito: { tipo: "repete" } });
  }
  for (const irmao of parada.erros) {
    const texto = comentarioDoRepertorio(irmao.comentario) || `${lanceEscrito(irmao)} não é o lance. Tente de novo.`;
    const erroId = livre(m, `erro-${base}-${irmao.uci}`);
    m.erros.push({ id: erroId, nome: `${lanceEscrito(irmao)} — ${capitulo.codigo}`, julgamento: irmao.nags.some((n) => n === "??" || n === "$4") ? "perde-resultado" : "fora-do-metodo", texto });
    respostas.push({ id: livre(m, `resposta-${base}-${irmao.uci}`), moves: [irmao.uci], julgamento: "erro", feedback: texto, erroId, efeito: { tipo: "repete" } });
  }
  const materializada = materializar(analise, posicaoId);
  const questao: QuestaoTreinoV2 = { id: questaoId, posicao: { analiseId: analise.id, nodeId: posicaoId }, dica: parada.dica ?? parada.texto, respostas };
  m.treinos.push({
    id: treinoId,
    titulo: `Sua vez — ${capitulo.codigo}`,
    introducao: parada.texto,
    perfil: "linha-autoral",
    inicio: { analiseId: analise.id, nodeId: posicaoId },
    ladoAluno: lado,
    objetivo: parada.texto,
    questoes: [questao],
    defensor: { politica: "deterministica" },
    termino: { tipo: "objetivo" },
    propriedade: "independente",
    fonte: "atual",
    copia: { inicio: materializada, questoes: { [questaoId]: materializada } },
    obrigatorio: true,
    revisaoAvaliacao: "pendente",
    explicacaoConclusao: `Isso: ${principal}.`,
    papel: "parada",
  });
  return treinoId;
}

/** A revisão (bloco F): uma introdução com um quadro por trecho comentado. */
function montarRevisao(m: Montagem, capitulo: CapituloDoCurso) {
  const partida = { ...capitulo.partida, tags: { ...capitulo.partida.tags, ChapterName: `cap ${capitulo.codigo}` } };
  const jogo = importarJogo(partida, capitulo.numero, new Set(m.usados));
  if (!jogo.analise) return;
  const analise = jogo.analise;
  for (const id of Object.keys(analise.nos)) m.usados.add(id);
  m.analises.push(analise);
  const quadros: IntroducaoV2["quadros"] = [];
  const intro = lerComentario(capitulo.partida.intro);
  for (const fala of intro.falas) {
    quadros.push({ id: livre(m, `quadro-${idDe(capitulo.codigo)}`), ...(fala.rotulo ? { titulo: fala.rotulo } : {}), texto: fala.texto, posicao: { tipo: "referencia", origem: { analiseId: analise.id, nodeId: analise.raizId } } });
  }
  const andar = (lance: LanceDoEstudo, ucis: string[]) => {
    const caminho = [...ucis, lance.uci];
    const lido = lerComentario(lance.comentario);
    if (lido.falas.length) {
      let nodeId = analise.raizId;
      for (const uci of caminho) nodeId = analise.nos[nodeId].filhos.find((id) => analise.nos[id].uci === uci)!;
      const titulo = lido.falas.find((f) => f.rotulo)?.rotulo;
      quadros.push({
        id: livre(m, `quadro-${idDe(capitulo.codigo)}`),
        titulo: titulo ?? `Depois de ${lanceEscrito(lance)}`,
        texto: lido.falas.map((f) => f.texto).join(" "),
        lance: lance.uci,
        posicao: { tipo: "referencia", origem: { analiseId: analise.id, nodeId } },
      });
    }
    lance.filhos.forEach((filho) => andar(filho, caminho));
  };
  capitulo.arvore.filhos.forEach((filho) => andar(filho, []));
  if (!quadros.length) return;
  const id = livre(m, `introducao-${idDe(capitulo.codigo)}`);
  m.introducoes.push({ id, titulo: capitulo.titulo, ...(capitulo.secao ? { secao: capitulo.secao } : {}), quadros });
  m.fluxo.push({ id: livre(m, `etapa-${id}`), tipo: "introducao", entidadeId: id });
}

/**
 * O treino guiado do bloco: a árvore das linhas do move trainer dele, numa análise própria. Cada
 * posição em que o aluno joga vira uma pergunta; cada resposta do adversário que a árvore tem vira
 * uma defesa — até quatro, e o defensor gira entre elas a cada tentativa (§16.4).
 */
function montarTreinoGuiado(m: Montagem, leitura: LeituraDoCurso, bloco: AulaDoCurso, linhas: LeituraDoCurso["linhas"], avisos: AvisoDoCurso[]) {
  if (!linhas.length) return;
  const prefixo = `arvore-${bloco.toLowerCase()}`;
  const raizId = livre(m, `no-${prefixo}-0`);
  const nos: AnaliseV2["nos"] = { [raizId]: { id: raizId, filhos: [] } };
  const lanceDoNo = new Map<string, LanceDoEstudo>();
  let contador = 0;
  for (const linha of linhas) {
    let atual = raizId;
    for (const lance of linha.lances) {
      const existente = nos[atual].filhos.find((id) => nos[id].uci === lance.uci);
      if (existente) { atual = existente; continue; }
      contador += 1;
      const id = livre(m, `no-${prefixo}-${contador}`);
      nos[id] = { id, uci: lance.uci, filhos: [], ...(lance.nags.length ? { nags: nagsNumericos(lance.nags) } : {}) };
      nos[atual].filhos.push(id);
      lanceDoNo.set(id, lance);
      atual = id;
    }
  }
  const analise: AnaliseV2 = { id: livre(m, `analise-${prefixo}`), inicio: { tipo: "fen", fen: new Chess().fen() }, raizId, nos };
  m.analises.push(analise);

  const turno = leitura.cor === "brancas" ? "w" : "b";
  const irmaos = irmaosMarcados(leitura);
  const questoes: QuestaoTreinoV2[] = [];
  const questaoEm = new Map<string, string>();
  const copia: Record<string, ReturnType<typeof materializar>> = {};
  const perguntar = (nodeId: string): string => {
    const ja = questaoEm.get(nodeId);
    if (ja) return ja;
    const id = livre(m, `questao-${prefixo}-${questoes.length + 1}`);
    questaoEm.set(nodeId, id);
    const questao: QuestaoTreinoV2 = { id, posicao: { analiseId: analise.id, nodeId }, respostas: [] };
    questoes.push(questao);
    copia[id] = materializar(analise, nodeId);
    const nossos = nos[nodeId].filhos;
    nossos.forEach((filhoId, i) => {
      const lance = lanceDoNo.get(filhoId)!;
      // Sem comentário (Doug, 18/9/2026): o porquê o aluno já ouviu na aula; aqui ele só joga.
      const feedback = "Isso.";
      const defesas = nos[filhoId].filhos;
      if (defesas.length > 4) avisos.push({ codigo: "DEFESAS_DEMAIS", mensagem: `no treino guiado da aula ${ROTULO_DA_AULA[bloco]}, depois de ${lanceEscrito(lance)} há ${defesas.length} respostas das ${adversarioDo(leitura.cor)}; o defensor gira só entre as 4 primeiras` });
      const jogo = new Chess(copia[id].fen);
      jogo.move({ from: lance.uci.slice(0, 2), to: lance.uci.slice(2, 4), promotion: lance.uci.slice(4) || undefined });
      const efeito: RespostaTreinoV2["efeito"] = defesas.length
        ? { tipo: "avanca", defesas: defesas.slice(0, 4).map((defesaId) => ({ move: nos[defesaId].uci!, proximaQuestaoId: perguntar(defesaId) })) }
        : { tipo: "encerra", condicao: jogo.isCheckmate() ? "mate" : "objetivo-autoral" };
      questao.respostas.push({ id: livre(m, `resposta-${filhoId}`), moves: [lance.uci], julgamento: i === 0 ? "correta" : "alternativa", feedback: i === 0 ? feedback : `${lanceEscrito(lance)} também está no repertório.`, efeito: i === 0 ? efeito : { tipo: "repete" } });
    });
    const principal = lanceDoNo.get(nossos[0]);
    for (const irmao of irmaos.get(semContadores(copia[id].fen)) ?? []) {
      if (nossos.some((filhoId) => nos[filhoId].uci === irmao.uci) || !principal) continue;
      if (marcaBoa(irmao)) {
        questao.respostas.push({ id: livre(m, `resposta-${prefixo}-${irmao.uci}`), moves: [irmao.uci], julgamento: "alternativa", feedback: `${lanceEscrito(irmao)} também vale, mas o repertório segue por ${lanceEscrito(principal)}.`, efeito: { tipo: "repete" } });
      } else if (marcaRuim(irmao)) {
        const texto = comentarioDoRepertorio(irmao.comentario) || `${lanceEscrito(irmao)} não é o lance. Tente de novo.`;
        const erroId = livre(m, `erro-${prefixo}-${irmao.uci}`);
        m.erros.push({ id: erroId, nome: lanceEscrito(irmao), julgamento: "fora-do-metodo", texto });
        questao.respostas.push({ id: livre(m, `resposta-${prefixo}-${irmao.uci}`), moves: [irmao.uci], julgamento: "erro", feedback: texto, erroId, efeito: { tipo: "repete" } });
      }
    }
    return id;
  };

  // A posição inicial: se a vez é nossa, a primeira pergunta; se é do adversário, a defesa inicial.
  const vezNaRaiz = new Chess(analise.inicio.tipo === "fen" ? analise.inicio.fen : undefined).turn();
  let defesaInicial: TreinoV2["defesaInicial"];
  if (vezNaRaiz === turno) perguntar(raizId);
  else {
    const [primeira, ...outras] = nos[raizId].filhos;
    if (outras.length) avisos.push({ codigo: "DEFESA_INICIAL_UNICA", mensagem: `o treino guiado da aula ${ROTULO_DA_AULA[bloco]} começa com o lance do adversário e só a primeira abertura dele entra` });
    defesaInicial = { move: nos[primeira].uci!, primeiraQuestaoId: perguntar(primeira) };
  }
  const id = livre(m, `treino-${prefixo}`);
  m.treinos.push({
    id,
    titulo: `Treino guiado — aula ${ROTULO_DA_AULA[bloco]}`,
    perfil: "linha-autoral",
    inicio: { analiseId: analise.id, nodeId: raizId },
    ladoAluno: leitura.cor === "brancas" ? "white" : "black",
    objetivo: "Jogar as linhas da aula de memória, contra as respostas que o repertório prevê.",
    questoes,
    defensor: { politica: "deterministica" },
    ...(defesaInicial ? { defesaInicial } : {}),
    termino: { tipo: "objetivo" },
    propriedade: "independente",
    fonte: "atual",
    copia: { inicio: materializar(analise, raizId), questoes: copia },
    obrigatorio: true,
    revisaoAvaliacao: "pendente",
  });
  m.fluxo.push({ id: livre(m, `etapa-${id}`), tipo: "treino", entidadeId: id });
}

const NUMERO: Record<string, number> = { "!": 1, "?": 2, "!!": 3, "??": 4, "!?": 5, "?!": 6 };
const nagsNumericos = (nags: string[]) => [...new Set(nags.map((n) => NUMERO[n] ?? Number(n.replace("$", ""))).filter((n) => Number.isInteger(n) && n > 0))];

/** Em cada posição, os lances nossos que algum capítulo marca como bons ou ruins. */
function irmaosMarcados(leitura: LeituraDoCurso): Map<string, LanceDoEstudo[]> {
  const mapa = new Map<string, LanceDoEstudo[]>();
  const andar = (lance: LanceDoEstudo) => {
    if (lance.nosso && (marcaBoa(lance) || marcaRuim(lance))) {
      const posicao = semContadores(lance.fenAntes);
      const lista = mapa.get(posicao) ?? [];
      if (!lista.some((item) => item.uci === lance.uci)) lista.push(lance);
      mapa.set(posicao, lista);
    }
    lance.filhos.forEach(andar);
  };
  for (const capitulo of leitura.capitulos) capitulo.arvore.filhos.forEach(andar);
  return mapa;
}

export function planejarCursoDeAbertura(texto: string, opcoes: OpcoesDoCurso): CursoPlanejado {
  const leitura = lerCursoDeAbertura(texto, opcoes.cor);
  const avisos = [...leitura.avisos];
  const nivel = opcoes.nivel ?? "base";
  const pgn = gerarPgnDoEstudo(leitura, { abertura: opcoes.abertura, nome: opcoes.nomeDaAbertura, nivel }, opcoes.agora);
  const porCodigo = new Map(leitura.capitulos.map((c) => [c.codigo, c]));
  const aulas: AulaPlanejada[] = [];

  for (const bloco of AULAS_DO_CURSO) {
    const codigos = leitura.aulas[bloco].capitulos;
    if (!codigos.length) continue;
    const m: Montagem = { analises: [], capitulos: [], treinos: [], introducoes: [], treinadores: [], fluxo: [], erros: [], usados: new Set() };
    let paradas = 0;
    let ramos = 0;
    for (const codigo of codigos) {
      const capitulo = porCodigo.get(codigo)!;
      if (capitulo.papel === "revisao") { montarRevisao(m, capitulo); continue; }
      const feito = montarCapituloDeAula(m, leitura, capitulo, avisos);
      paradas += feito.paradas;
      ramos += feito.ramos;
    }
    const codigosDoTreinador = new Set(leitura.aulas[bloco].treinadores);
    const linhas = leitura.linhas.filter((linha) => bloco === "EF" || codigosDoTreinador.has(linha.capitulo));
    // Regra 18: a partida modelo não tem treino guiado nem move trainer.
    if (bloco !== "D") {
      montarTreinoGuiado(m, leitura, bloco, linhas, avisos);
      if (linhas.length) {
        const id = livre(m, `treinador-${bloco.toLowerCase()}`);
        m.treinadores.push({ id, titulo: `Treinador de lances — aula ${ROTULO_DA_AULA[bloco]}`, cor: opcoes.cor, abertura: opcoes.abertura, linhaIds: linhas.map((linha) => idDaLinha(opcoes.cor, opcoes.abertura, linha.lances.map((l) => l.uci))) });
        m.fluxo.push({ id: livre(m, `etapa-${id}`), tipo: "treinador", entidadeId: id });
      }
    }
    const aula: AulaV2 = {
      schemaVersion: 2,
      id: idDaAulaDeAbertura({ cor: opcoes.cor, abertura: opcoes.abertura, bloco }),
      titulo: `${opcoes.nomeDaAbertura} — aula ${ROTULO_DA_AULA[bloco]}: ${tituloDaAula(bloco, opcoes.cor)}`,
      metadados: {
        orientacaoPadrao: opcoes.cor === "brancas" ? "white" : "black",
        criterioDominio: "D1",
        estadoEditorial: "rascunho",
        fonteDidatica: pgn.fonte,
        abertura: { cor: opcoes.cor, abertura: opcoes.abertura, bloco },
      },
      proveniencia: [],
      excecoes: [],
      ...(m.erros.length ? { catalogo: { erros: m.erros, mensagensPadrao: { vitoriaForaDoMetodo: "Este lance funciona, mas não é o caminho ensinado.", perdeResultado: "Este lance perde o que a posição permitia.", alternativaDoMetodo: "Também vale. Continue pela linha ensinada." } } } : {}),
      analises: m.analises,
      introducoes: m.introducoes,
      capitulos: m.capitulos,
      treinos: m.treinos,
      praticas: [],
      ...(m.treinadores.length ? { treinadores: m.treinadores } : {}),
      fluxo: m.fluxo,
    };
    aulas.push({ bloco, aula, capitulos: codigos, paradas, ramos, linhasDoTreinador: bloco === "D" ? 0 : linhas.length });
  }

  const relatorio: LinhaDoRelatorio[] = leitura.capitulos.map((c) => ({
    codigo: c.codigo,
    titulo: c.titulo,
    aula: c.aula,
    papel: c.papel,
    ramos: Math.max(0, c.percursos.length - 1),
    perguntas: c.perguntas,
    paradas: c.paradas.length,
  }));
  return { leitura, aulas, pgn, relatorio, avisos };
}

/** Só para o teste e a tela: as partidas do texto, para contar capítulos sem planejar. */
export const contarCapitulos = (texto: string) => lerPgnsDoEstudo(texto).length;
