import { Chess } from "chess.js";
import type { Position } from "../lesson/schema.ts";
import { quadroDoNo } from "./arvore.ts";
import { aplicarImportacaoPgn, type RelatorioImportacao } from "./importar-pgn.ts";
import { mesmosDesenhos, noComDesenhos } from "./desenhos.ts";
import { aplicarNovoCapitulo, type NovoCapituloV2 } from "./novo-capitulo.ts";
import { aplicarTrocaDePosicao, semRevisao, type AlvoDeRevisaoV2, type PlanoDaTrocaV2 } from "./trocar-posicao.ts";
import {
  aplicarDuplicacaoDeCapitulo,
  aplicarExclusaoDeCapitulo,
  type CapituloDuplicadoV2,
  type PlanoDeExclusaoV2,
} from "./capitulo.ts";
import {
  aplicarComecarDaqui,
  aplicarCorte,
  aplicarDuplicarIndependente,
  aplicarMostrarVariante,
  type ComecoDaquiV2,
  type DuplicataIndependenteV2,
  type PlanoDoCorteV2,
  type VarianteMostradaV2,
} from "./acoes-do-lance.ts";
import { comNarracaoMovida, comNarracaoNova, comPausaDaNarracao } from "./narracoes.ts";
import { aplicarTreinosPreparados, type TreinosPreparadosV2 } from "./treinos.ts";
import { aplicarEdicaoDeTreino, type EdicaoDeTreinoV2 } from "./autoria-treino.ts";
import { semRevisoes } from "./revisoes.ts";
import type { ResolucoesV2 } from "./impacto.ts";
import type { AulaV2, DesenhoV2, NoV2, RevisaoDaFenV2 } from "./modelo.ts";
import { aplicarRevisaoDaFen } from "./proveniencia.ts";
import { ehComandoDeIntroducao, executarComandoDeIntroducao, type ComandoDeIntroducaoV2 } from "./introducao.ts";
import { excluirTreino, moverEtapa } from "./fluxo.ts";
import { aplicarPlanoDoEstudo, type PlanoDoEstudoV2 } from "./importar-estudo.ts";
import { mudarModo, type ModoDaParteV2, type ParteDaAulaV2 } from "./mudar-modo.ts";
import { aplicarEdicaoDePratica, aplicarExclusaoDePratica, aplicarNovaPratica, type PraticaPreparadaV2 } from "./pratica.ts";
import {
  aplicarRefazerTreino,
  comEstadosDasFontes,
  tornarTreinoIndependente,
  type PlanoDeRefazerTreinoV2,
} from "./propriedade-treino.ts";

export type ComandoV2 =
  /** §5.3: o título da aula, editável no cabeçalho. Vazio não apaga o título anterior. */
  | { tipo: "RENOMEAR_AULA"; titulo: string }
  | { tipo: "RENOMEAR_CAPITULO"; capituloId: string; titulo: string }
  /**
   * Qual cor fica embaixo no tabuleiro do aluno, num capítulo que já existe — §4 ("capítulo com
   * orientação própria") e §9. Antes só se escolhia ao criar, e um capítulo importado do Lichess
   * ficava com a do estudo para sempre. Não é o `x`, que vira só a vista do professor.
   */
  | { tipo: "DEFINIR_ORIENTACAO_CAPITULO"; capituloId: string; orientacao: "white" | "black" }
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
  /**
   * Troca a posição inicial de um capítulo que já existe — §9.
   *
   * **Pelo mesmo motivo do `ADICIONAR_CAPITULO`, o plano chega pronto.** Ele
   * carrega a lista exata dos nós que somem, calculada e mostrada ao professor
   * antes de ele confirmar. Recalcular aqui daria a chance de o executor podar
   * uma coisa diferente da que a tela prometeu — e um Refazer poderia podar uma
   * terceira. Com o plano fixo, desfazer e refazer devolvem os mesmos bytes.
   */
  | { tipo: "TROCAR_POSICAO_INICIAL"; plano: PlanoDaTrocaV2 }
  /**
   * Duplica um capítulo inteiro como independente — §8.4.
   *
   * O `novo` traz o **mapa de ids** decidido antes: cada nó, cada narração, o
   * capítulo, a análise e a etapa. É o que faz o Refazer devolver a mesma cópia.
   */
  | { tipo: "DUPLICAR_CAPITULO"; novo: CapituloDuplicadoV2 }
  /**
   * Exclui um capítulo, e a análise dele quando o professor pediu — §8.4.
   *
   * `resolucoes` é o que ele escolheu para cada dependente: remover ou
   * materializar como independente. Sem escolha para todos, o executor recusa —
   * §5 do plano não deixa a máquina decidir isso sozinha.
   */
  | { tipo: "EXCLUIR_CAPITULO"; plano: PlanoDeExclusaoV2; resolucoes?: ResolucoesV2 }
  /** §8.3: um capítulo que aponta para o percurso que já existe, sem copiar lances. */
  | { tipo: "MOSTRAR_VARIANTE"; novo: VarianteMostradaV2 }
  /** §8.3: análise nova cuja raiz referencia a posição selecionada. */
  | { tipo: "COMECAR_DAQUI"; novo: ComecoDaquiV2 }
  /** §8.3: materializa posição e conteúdo, com ids novos, e encerra a dependência. */
  | { tipo: "DUPLICAR_INDEPENDENTE"; novo: DuplicataIndependenteV2 }
  /** §11.3: excluir a partir daqui, ou substituir a continuação deste lance. */
  | { tipo: "CORTAR"; plano: PlanoDoCorteV2; resolucoes?: ResolucoesV2 }
  /** Tira a marca de revisão de §5 depois que o professor releu o texto. */
  | { tipo: "REVISAO_RESOLVIDA"; alvo: AlvoDeRevisaoV2 }
  /**
   * Resolve várias marcas de uma vez, pela lista de §19.2.
   *
   * Um comando só para um gesto só: o professor releu tudo e diz que está de
   * pé. Como N comandos, desfazer aquilo exigiria N Ctrl+Z.
   */
  | { tipo: "REVISOES_RESOLVIDAS"; alvos: AlvoDeRevisaoV2[] }
  | { tipo: "EDITAR_COMENTARIO"; analiseId: string; nodeId: string; comentario: string }
  | { tipo: "EDITAR_NARRACAO"; capituloId: string; narracaoId: string; texto: string }
  /** §12.2: a narração nova de um lance do percurso. O id chega pronto, para o Refazer devolver a mesma. */
  | { tipo: "ADICIONAR_NARRACAO"; capituloId: string; nodeId: string; narracaoId: string; texto: string }
  /** §12.2: troca de lugar com a narração vizinha **do mesmo lance**. */
  | { tipo: "MOVER_NARRACAO"; capituloId: string; narracaoId: string; direcao: "acima" | "abaixo" }
  /** §12.2 e §15.2: pausa temporizada ou manual, a que exige "Continuar". */
  | { tipo: "DEFINIR_PAUSA_DA_NARRACAO"; capituloId: string; narracaoId: string; pausa: "temporizada" | "manual" }
  /** §16: um ou dois treinos, com ids e colocação decididos na prévia de criação. */
  | { tipo: "ADICIONAR_TREINOS"; preparo: TreinosPreparadosV2 }
  /** §16.3: a autoria inteira do treino entra num único passo de Desfazer. */
  | { tipo: "EDITAR_TREINO"; edicao: EdicaoDeTreinoV2 }
  /** §16.5: materializa a cópia e encerra a dependência operacional. */
  | { tipo: "TORNAR_TREINO_INDEPENDENTE"; treinoId: string }
  /** §16.5: aplica exatamente o antes/depois que a comparação mostrou. */
  | { tipo: "REFAZER_TREINO"; plano: PlanoDeRefazerTreinoV2 }
  | { tipo: "ALTERNAR_NAG"; analiseId: string; nodeId: string; nag: number }
  /**
   * `capituloId` (fatia 10): o capítulo aberto na tela. Quando o lance sai do **fim** do percurso dele e é
   * a primeira continuação daquela posição, o percurso ganha o lance. Sem isto, um capítulo criado do
   * zero nunca tinha percurso — nem narração, nem treino, nem prévia.
   */
  | { tipo: "ADICIONAR_LANCE"; analiseId: string; nodeId: string; uci: string; novoNodeId: string; capituloId?: string }
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
  | { tipo: "DEFINIR_DESENHOS"; analiseId: string; nodeId: string; desenhos: DesenhoV2 | undefined }
  /**
   * §20.3: a conversão permanente da aula v1. Marca o documento como convertido; o diff e o
   * snapshot anterior ficam por conta de quem pede (`migrar-v1.ts`). Um Desfazer desmarca.
   */
  | { tipo: "CONVERTER_V1"; convertidaEm: string }
  /**
   * §19.1 (fatia 10): a revisão de proveniência de uma análise que começa numa FEN crua. A revisão
   * chega pronta — data e professor decididos no clique —, para o Refazer devolver os mesmos bytes.
   */
  | { tipo: "REGISTRAR_PROVENIENCIA"; analiseId: string; revisao: RevisaoDaFenV2 }
  /** A mesma declaração em várias posições da mesma origem, num Desfazer só (achado do Doug, 14/9/2026). */
  | { tipo: "REGISTRAR_PROVENIENCIAS"; itens: Array<{ analiseId: string; revisao: RevisaoDaFenV2 }> }
  /** §17.1 (fatia 10): a prática nasce com ids e registro de posição decididos na janela, no fim do fluxo. */
  | { tipo: "ADICIONAR_PRATICA"; preparo: PraticaPreparadaV2 }
  | { tipo: "EDITAR_PRATICA"; preparo: PraticaPreparadaV2 }
  | { tipo: "EXCLUIR_PRATICA"; praticaId: string }
  /** §18 (fatia 10): uma etapa do fluxo para a posição `para` — introdução, capítulo, treino ou prática. */
  | { tipo: "MOVER_ETAPA"; etapaId: string; para: number }
  /** §8.4 para o treino (fatia 10): exclui o treino e a etapa dele, pelo `•••` do cartão. */
  | { tipo: "EXCLUIR_TREINO"; treinoId: string }
  /** §7.1 (fatia 10): a introdução e os quadros — ver `introducao.ts`. */
  | ComandoDeIntroducaoV2
  /**
   * Muda uma parte da aula para outro modo — introdução, capítulo ou treino (pedido do Doug, 15/9/2026).
   * A conta é determinística (`mudar-modo.ts`): o que a janela mostrou é o que entra, num Desfazer só.
   */
  | { tipo: "MUDAR_MODO"; parte: ParteDaAulaV2; destino: ModoDaParteV2 }
  /**
   * §13 (fatia 10): um estudo do Lichess inteiro — introdução, capítulos, treinos e a prática — num
   * Desfazer. A prática chega pronta (a posição já entrou no acervo pelo servidor) ou não chega.
   */
  | { tipo: "IMPORTAR_ESTUDO"; plano: PlanoDoEstudoV2; pratica?: AulaV2["praticas"][number]; registroDaPratica?: AulaV2["proveniencia"][number] }
  /**
   * Uma tag do cabeçalho PGN da análise (fatia 8: Nome, Nível e Fonte do repertório).
   *
   * A ordem das tags é preservada — a tag editada fica onde estava, e uma tag nova entra
   * antes de `Result`, que é onde o arquivo do repertório a escreveria. Valor vazio não
   * apaga: uma tag obrigatória sumindo por um campo esvaziado seria perda sem aviso.
   */
  | { tipo: "EDITAR_TAG_PGN"; analiseId: string; chave: string; valor: string }
  /**
   * Nível e classe da aula, em Mais opções (fatia 8, §19.1 e §22). `null` tira o campo — é
   * como uma aula do curso deixa a trilha decidir o nível.
   */
  | { tipo: "EDITAR_METADADOS"; campo: "nivel"; valor: 1 | 2 | 3 | 4 | 5 | null }
  | { tipo: "EDITAR_METADADOS"; campo: "classe"; valor: "E" | "D" | "C" | "B" | null };

function executarComandoCru(aula: AulaV2, comando: ComandoV2, positions: Record<string, Position>): AulaV2 {
  if (comando.tipo === "CONVERTER_V1") {
    if (aula.origem?.formato !== "lesson-v1") throw new Error("esta aula não veio do formato antigo — não há o que converter");
    if (aula.origem.convertidaEm) return aula;
    return { ...aula, origem: { ...aula.origem, convertidaEm: comando.convertidaEm } };
  }
  if (ehComandoDeIntroducao(comando)) return executarComandoDeIntroducao(aula, comando, positions);
  if (comando.tipo === "IMPORTAR_ESTUDO") return aplicarPlanoDoEstudo(aula, comando.plano, comando.pratica, comando.registroDaPratica);
  if (comando.tipo === "MUDAR_MODO") {
    const resultado = mudarModo(aula, comando.parte, comando.destino, positions);
    if (!resultado.ok) throw new Error(resultado.mensagem);
    return resultado.mudanca.aula;
  }
  if (comando.tipo === "MOVER_ETAPA") return moverEtapa(aula, comando.etapaId, comando.para);
  if (comando.tipo === "EXCLUIR_TREINO") return excluirTreino(aula, comando.treinoId);
  if (comando.tipo === "ADICIONAR_PRATICA") return aplicarNovaPratica(aula, comando.preparo);
  if (comando.tipo === "EDITAR_PRATICA") return aplicarEdicaoDePratica(aula, comando.preparo);
  if (comando.tipo === "EXCLUIR_PRATICA") return aplicarExclusaoDePratica(aula, comando.praticaId);
  if (comando.tipo === "REGISTRAR_PROVENIENCIA") {
    const resultado = aplicarRevisaoDaFen(aula, comando.analiseId, comando.revisao);
    if (!resultado.ok) throw new Error(resultado.mensagem);
    return resultado.aula;
  }
  if (comando.tipo === "REGISTRAR_PROVENIENCIAS") {
    let atual = aula;
    for (const item of comando.itens) {
      const resultado = aplicarRevisaoDaFen(atual, item.analiseId, item.revisao);
      if (!resultado.ok) throw new Error(resultado.mensagem);
      atual = resultado.aula;
    }
    return atual;
  }
  if (comando.tipo === "EDITAR_METADADOS") {
    const atuais = aula.metadados ?? { orientacaoPadrao: "white" as const, criterioDominio: "D1" as const, estadoEditorial: "rascunho" as const };
    if ((atuais[comando.campo] ?? null) === comando.valor) return aula;
    const metadados = { ...atuais };
    if (comando.valor === null) delete metadados[comando.campo];
    else if (comando.campo === "nivel") metadados.nivel = comando.valor;
    else metadados.classe = comando.valor;
    return { ...aula, metadados };
  }
  if (comando.tipo === "EDITAR_TAG_PGN") {
    const analise = aula.analises.find((item) => item.id === comando.analiseId);
    if (!analise) throw new Error("análise inexistente");
    if (!/^\w+$/.test(comando.chave)) throw new Error("nome de tag inválido");
    const valor = comando.valor.trim();
    const tags = analise.origemPgn?.tags ?? {};
    if (!valor || tags[comando.chave] === valor) return aula;
    const novas: Record<string, string> = {};
    let entrou = comando.chave in tags;
    for (const [chave, atual] of Object.entries(tags)) {
      if (!entrou && chave === "Result") { novas[comando.chave] = valor; entrou = true; }
      novas[chave] = chave === comando.chave ? valor : atual;
    }
    if (!entrou) novas[comando.chave] = valor;
    const origemPgn = { naoReconhecidos: [], ...analise.origemPgn, tags: novas };
    return { ...aula, analises: aula.analises.map((item) => item.id === analise.id ? { ...item, origemPgn } : item) };
  }
  if (comando.tipo === "RENOMEAR_AULA") {
    const titulo = comando.titulo.trim();
    // Vazio não apaga (§8.4 diz o mesmo do capítulo), e o mesmo título não é edição (§6.1).
    if (!titulo || titulo === aula.titulo) return aula;
    return { ...aula, titulo };
  }
  if (comando.tipo === "RENOMEAR_CAPITULO") {
    return { ...aula, capitulos: aula.capitulos.map((c) => c.id === comando.capituloId ? { ...c, titulo: comando.titulo.trim() || c.titulo } : c) };
  }
  if (comando.tipo === "DEFINIR_ORIENTACAO_CAPITULO") {
    const alvo = aula.capitulos.find((c) => c.id === comando.capituloId);
    if (!alvo) throw new Error("capítulo inexistente");
    // A mesma orientação não é edição (§6.1): devolver o mesmo objeto a deixa fora do Desfazer.
    if (alvo.orientacao === comando.orientacao) return aula;
    return { ...aula, capitulos: aula.capitulos.map((c) => c === alvo ? { ...c, orientacao: comando.orientacao } : c) };
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
  if (comando.tipo === "TROCAR_POSICAO_INICIAL") {
    const resultado = aplicarTrocaDePosicao(aula, comando.plano);
    if (!resultado.ok) throw new Error(resultado.mensagem);
    return resultado.aula;
  }
  if (comando.tipo === "REVISAO_RESOLVIDA") {
    return semRevisao(aula, comando.alvo);
  }
  if (comando.tipo === "REVISOES_RESOLVIDAS") {
    return semRevisoes(aula, comando.alvos);
  }
  /*
   * As seis edições estruturais de §8.3, §8.4 e §11.3 seguem o mesmo molde: o
   * plano (ou o mapa de ids) chega pronto, o executor só aplica, e a recusa sobe
   * com a frase em português que a função de aplicação escreveu. Reescrevê-la
   * aqui perderia o motivo exato — "«Treino guiado» usa 3 lances que esta
   * exclusão apaga" não é a mesma coisa que "não deu certo".
   */
  if (comando.tipo === "DUPLICAR_CAPITULO") {
    const resultado = aplicarDuplicacaoDeCapitulo(aula, comando.novo);
    if (!resultado.ok) throw new Error(resultado.mensagem);
    return resultado.aula;
  }
  if (comando.tipo === "EXCLUIR_CAPITULO") {
    const resultado = aplicarExclusaoDeCapitulo(aula, comando.plano, comando.resolucoes ?? {});
    if (!resultado.ok) throw new Error(resultado.mensagem);
    return resultado.aula;
  }
  if (comando.tipo === "MOSTRAR_VARIANTE") {
    const resultado = aplicarMostrarVariante(aula, comando.novo);
    if (!resultado.ok) throw new Error(resultado.mensagem);
    return resultado.aula;
  }
  if (comando.tipo === "COMECAR_DAQUI") {
    const resultado = aplicarComecarDaqui(aula, comando.novo);
    if (!resultado.ok) throw new Error(resultado.mensagem);
    return resultado.aula;
  }
  if (comando.tipo === "DUPLICAR_INDEPENDENTE") {
    const resultado = aplicarDuplicarIndependente(aula, comando.novo);
    if (!resultado.ok) throw new Error(resultado.mensagem);
    return resultado.aula;
  }
  if (comando.tipo === "CORTAR") {
    const resultado = aplicarCorte(aula, comando.plano, comando.resolucoes ?? {});
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
  if (comando.tipo === "ADICIONAR_NARRACAO") return comNarracaoNova(aula, comando);
  if (comando.tipo === "MOVER_NARRACAO") return comNarracaoMovida(aula, comando);
  if (comando.tipo === "DEFINIR_PAUSA_DA_NARRACAO") return comPausaDaNarracao(aula, comando);
  if (comando.tipo === "ADICIONAR_TREINOS") return aplicarTreinosPreparados(aula, comando.preparo);
  if (comando.tipo === "EDITAR_TREINO") return aplicarEdicaoDeTreino(aula, comando.edicao);
  if (comando.tipo === "TORNAR_TREINO_INDEPENDENTE") return tornarTreinoIndependente(aula, comando.treinoId, positions);
  if (comando.tipo === "REFAZER_TREINO") return aplicarRefazerTreino(aula, comando.plano);
  if (comando.tipo === "EDITAR_NARRACAO") {
    const capitulo = aula.capitulos.find((item) => item.id === comando.capituloId);
    if (!capitulo) throw new Error("capítulo inexistente");
    const atual = capitulo.narracoes.find((item) => item.id === comando.narracaoId);
    if (!atual) throw new Error("narração inexistente");
    const texto = comando.texto.trim();
    // Sair da caixa sem mudar nada não é edição (§6.1): sem esta porta, cada foco
    // perdido empilhava um Desfazer vazio e mandava gravar.
    if (texto === atual.texto) return aula;
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
    if (comentario === (no.comentario ?? "")) return aula;
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
    const capitulo = comando.capituloId ? aula.capitulos.find((item) => item.id === comando.capituloId && item.analiseId === analise.id) : undefined;
    const fimDoPercurso = capitulo ? capitulo.caminho.at(-1) ?? capitulo.inicioNodeId : undefined;
    if (capitulo && fimDoPercurso === no.id && no.filhos.length === 0) {
      return {
        ...aula,
        analises: aula.analises.map((a, i) => i === indice ? proxima : a),
        capitulos: aula.capitulos.map((item) => item.id === capitulo.id ? { ...item, caminho: [...item.caminho, comando.novoNodeId] } : item),
      };
    }
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

/**
 * Toda edição passa pela mesma conferência de fonte. Assim comentário, narração,
 * lance, troca de posição e exclusão não mantêm opiniões diferentes sobre o treino.
 */
export function executarComando(aula: AulaV2, comando: ComandoV2, positions: Record<string, Position>): AulaV2 {
  return comEstadosDasFontes(aula, executarComandoCru(aula, comando, positions));
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
