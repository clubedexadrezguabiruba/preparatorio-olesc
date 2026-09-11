import { Chess } from "chess.js";
import type { Position } from "../lesson/schema.ts";
import { quadroDoNo } from "./arvore.ts";
import { aplicarImportacaoPgn, type RelatorioImportacao } from "./importar-pgn.ts";
import { mesmosDesenhos, noComDesenhos } from "./desenhos.ts";
import { aplicarNovoCapitulo, type NovoCapituloV2 } from "./novo-capitulo.ts";
import type { AulaV2, DesenhoV2, NoV2 } from "./modelo.ts";

export type ComandoV2 =
  | { tipo: "RENOMEAR_CAPITULO"; capituloId: string; titulo: string }
  /**
   * Move a etapa de um capítulo para um dos vãos entre os capítulos visíveis.
   *
   * `fluxo` continua sendo a única fonte da ordem pedagógica: não reordenamos o
   * cadastro de capítulos e não guardamos uma segunda lista. A etapa inteira muda
   * de lugar, com o mesmo ID, inclusive quando atravessa treino ou prática.
   */
  | { tipo: "MOVER_CAPITULO"; capituloId: string; vao: number }
  /**
   * Importar capítulos de um PGN já lido.
   *
   * **Por que a importação é um comando, e não uma escrita direta na aula.** Porque
   * ela precisa caber num Desfazer. Doze capítulos entrando de uma vez é a edição
   * mais cara que o editor faz, e é exatamente a que o professor mais vai querer
   * desfazer quando vir que escolheu o arquivo errado. Passando por aqui, ela entra
   * no histórico como qualquer outro gesto: um Ctrl+Z e a aula volta ao que era.
   */
  | { tipo: "IMPORTAR_JOGOS"; relatorio: RelatorioImportacao; escolhidos: number[] }
  /**
   * Cria um capítulo do nada: análise nova, capítulo e etapa, numa transação só.
   *
   * **Os ids chegam prontos, e isso é o ponto.** `NovoCapituloV2` é calculado por
   * `prepararNovoCapitulo` no instante em que o professor confirma o diálogo; aqui
   * nada é sorteado. Se o id nascesse neste executor, um Refazer criaria um
   * capítulo com identidade diferente — e §8.3 pede que Refazer devolva o mesmo
   * capítulo, não um parecido.
   */
  | { tipo: "ADICIONAR_CAPITULO"; novo: NovoCapituloV2 }
  | { tipo: "EDITAR_COMENTARIO"; analiseId: string; nodeId: string; comentario: string }
  | { tipo: "EDITAR_NARRACAO"; capituloId: string; narracaoId: string; texto: string }
  | { tipo: "ALTERNAR_NAG"; analiseId: string; nodeId: string; nag: number }
  | { tipo: "ADICIONAR_LANCE"; analiseId: string; nodeId: string; uci: string; novoNodeId: string }
  | { tipo: "PROMOVER_VARIANTE"; analiseId: string; parentId: string; nodeId: string }
  | { tipo: "EXCLUIR_RAMO"; analiseId: string; parentId: string; nodeId: string }
  /**
   * O desenho desta posição, inteiro, como está no tabuleiro agora.
   *
   * **Por que a lista inteira e não "acrescente esta seta".** Porque é isso que o
   * tabuleiro sabe dizer: o chessground devolve o conjunto de formas depois de cada
   * gesto — inclusive quando o gesto foi apagar. Um comando de acrescentar exigiria
   * adivinhar, por diferença, o que o professor fez; a lista inteira não adivinha
   * nada. E como cada uma entra no histórico, um Ctrl+Z devolve o desenho anterior.
   */
  | { tipo: "DEFINIR_DESENHOS"; analiseId: string; nodeId: string; desenhos: DesenhoV2 | undefined };

export function executarComando(aula: AulaV2, comando: ComandoV2, positions: Record<string, Position>): AulaV2 {
  if (comando.tipo === "RENOMEAR_CAPITULO") {
    return { ...aula, capitulos: aula.capitulos.map((c) => c.id === comando.capituloId ? { ...c, titulo: comando.titulo.trim() || c.titulo } : c) };
  }
  if (comando.tipo === "MOVER_CAPITULO") {
    const etapas = aula.fluxo.filter((etapa) => etapa.tipo === "capitulo");
    const de = etapas.findIndex((etapa) => etapa.entidadeId === comando.capituloId);
    if (de < 0) throw new Error("esse capítulo não está no fluxo da aula");
    if (!Number.isInteger(comando.vao) || comando.vao < 0 || comando.vao > etapas.length) {
      throw new Error("o destino do capítulo não existe");
    }

    // Os dois vãos que ladeiam a própria etapa significam desistir do gesto.
    // Devolver o mesmo objeto impede que um arrasto sem efeito entre no histórico.
    if (comando.vao === de || comando.vao === de + 1) return aula;

    const movida = etapas[de];
    const semEla = aula.fluxo.filter((etapa) => etapa.id !== movida.id);
    const restantes = etapas.filter((etapa) => etapa.id !== movida.id);
    const para = comando.vao > de ? comando.vao - 1 : comando.vao;
    const referencia = restantes[para];
    const indice = referencia
      ? semEla.findIndex((etapa) => etapa.id === referencia.id)
      : semEla.findIndex((etapa) => etapa.id === restantes.at(-1)?.id) + 1;
    semEla.splice(indice, 0, movida);
    return { ...aula, fluxo: semEla };
  }
  if (comando.tipo === "ADICIONAR_CAPITULO") {
    const resultado = aplicarNovoCapitulo(aula, comando.novo);
    if (!resultado.ok) throw new Error(resultado.mensagem);
    return resultado.aula;
  }
  if (comando.tipo === "IMPORTAR_JOGOS") {
    // A recusa do importador é uma frase pronta, em português de professor, e ela
    // vira a mensagem que a tela mostra. Reescrevê-la aqui perderia o motivo exato —
    // "a aula já tem uma parte chamada X" não é a mesma coisa que "não deu certo".
    const resultado = aplicarImportacaoPgn(aula, comando.relatorio, comando.escolhidos);
    if (!resultado.ok) throw new Error(resultado.mensagem);
    return resultado.aula;
  }
  if (comando.tipo === "EDITAR_NARRACAO") {
    const capitulo = aula.capitulos.find((item) => item.id === comando.capituloId);
    if (!capitulo) throw new Error("capítulo inexistente");
    if (!capitulo.narracoes.some((item) => item.id === comando.narracaoId)) throw new Error("narração inexistente");
    const texto = comando.texto.trim();
    return {
      ...aula,
      capitulos: aula.capitulos.map((item) => item.id !== capitulo.id ? item : {
        ...item,
        narracoes: texto
          ? item.narracoes.map((narracao) => narracao.id === comando.narracaoId ? { ...narracao, texto } : narracao)
          : item.narracoes.filter((narracao) => narracao.id !== comando.narracaoId),
      }),
    };
  }
  const indice = aula.analises.findIndex((a) => a.id === comando.analiseId);
  if (indice < 0) throw new Error("análise inexistente");
  const analise = aula.analises[indice];
  const alvoId = comando.tipo === "PROMOVER_VARIANTE" || comando.tipo === "EXCLUIR_RAMO"
    ? comando.parentId
    : comando.nodeId;
  const no = analise.nos[alvoId];
  if (!no) throw new Error("nó inexistente");
  let proxima = analise;

  if (comando.tipo === "EDITAR_COMENTARIO") {
    const comentario = comando.comentario.trim();
    const editado: NoV2 = { ...no };
    if (comentario) editado.comentario = comentario; else delete editado.comentario;
    proxima = { ...analise, nos: { ...analise.nos, [no.id]: editado } };
  }
  if (comando.tipo === "ALTERNAR_NAG") {
    const qualidadesDaInterface = new Set([1, 2, 3, 4, 5, 6]);
    const jaSelecionado = no.nags?.includes(comando.nag) ?? false;
    // Os seis símbolos da interface são alternativas, não etiquetas
    // acumuláveis. NAGs importados que a interface não edita continuam
    // preservados para que o ciclo PGN -> editor -> PGN não perca informação.
    const nags = qualidadesDaInterface.has(comando.nag)
      ? (() => {
          const preservados = (no.nags ?? []).filter((n) => !qualidadesDaInterface.has(n));
          return jaSelecionado ? preservados : [...preservados, comando.nag];
        })()
      : jaSelecionado
        ? (no.nags ?? []).filter((n) => n !== comando.nag)
        : [...(no.nags ?? []), comando.nag];
    const editado: NoV2 = { ...no };
    if (nags.length) editado.nags = nags; else delete editado.nags;
    proxima = { ...analise, nos: { ...analise.nos, [no.id]: editado } };
  }
  if (comando.tipo === "ADICIONAR_LANCE") {
    if (analise.nos[comando.novoNodeId]) throw new Error("o id do novo nó já existe");
    const fen = quadroDoNo(aula, analise.id, no.id, positions).fen;
    const game = new Chess(fen);
    try { game.move({ from: comando.uci.slice(0, 2), to: comando.uci.slice(2, 4), promotion: comando.uci.slice(4) || undefined }); }
    catch { throw new Error("esse lance não é legal nesta posição"); }
    const existente = no.filhos.find((filho) => analise.nos[filho]?.uci === comando.uci);
    if (existente) return aula;
    proxima = { ...analise, nos: { ...analise.nos, [no.id]: { ...no, filhos: [...no.filhos, comando.novoNodeId] }, [comando.novoNodeId]: { id: comando.novoNodeId, uci: comando.uci, filhos: [] } } };
  }
  if (comando.tipo === "DEFINIR_DESENHOS") {
    // Gesto sem efeito não entra no histórico (§6 do plano). O tabuleiro avisa da
    // mudança mais vezes do que ela acontece — um clique com o botão esquerdo numa
    // casa vazia já devolve a lista —, e sem esta porta o Desfazer encheria de
    // passos que não desfazem nada.
    if (mesmosDesenhos(no.desenhos, comando.desenhos)) return aula;
    proxima = { ...analise, nos: { ...analise.nos, [no.id]: noComDesenhos(no, comando.desenhos) } };
  }
  if (comando.tipo === "PROMOVER_VARIANTE") {
    if (!no.filhos.includes(comando.nodeId)) throw new Error("a variante não pertence a esta posição");
    proxima = { ...analise, nos: { ...analise.nos, [no.id]: { ...no, filhos: [comando.nodeId, ...no.filhos.filter((id) => id !== comando.nodeId)] } } };
  }
  if (comando.tipo === "EXCLUIR_RAMO") {
    if (!no.filhos.includes(comando.nodeId)) throw new Error("o ramo não pertence a esta posição");
    const remover = new Set<string>();
    const colher = (id: string) => { if (remover.has(id)) return; remover.add(id); analise.nos[id]?.filhos.forEach(colher); };
    colher(comando.nodeId);
    const nos = Object.fromEntries(Object.entries(analise.nos).filter(([id]) => !remover.has(id)));
    nos[no.id] = { ...no, filhos: no.filhos.filter((id) => id !== comando.nodeId) };
    proxima = { ...analise, nos };
  }
  return { ...aula, analises: aula.analises.map((a, i) => i === indice ? proxima : a) };
}

export type Historico<T> = { presente: T; passados: T[]; futuros: T[] };
export const iniciarHistorico = <T>(presente: T): Historico<T> => ({ presente, passados: [], futuros: [] });
export function aplicarNoHistorico<T>(h: Historico<T>, proximo: T): Historico<T> {
  return proximo === h.presente ? h : { presente: proximo, passados: [...h.passados, h.presente], futuros: [] };
}
export function desfazer<T>(h: Historico<T>): Historico<T> {
  const anterior = h.passados.at(-1); if (anterior === undefined) return h;
  return { presente: anterior, passados: h.passados.slice(0, -1), futuros: [h.presente, ...h.futuros] };
}
export function refazer<T>(h: Historico<T>): Historico<T> {
  const proximo = h.futuros[0]; if (proximo === undefined) return h;
  return { presente: proximo, passados: [...h.passados, h.presente], futuros: h.futuros.slice(1) };
}
