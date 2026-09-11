/**
 * Adicionar capítulo sem passar por importação — §8.3 da especificação funcional.
 *
 * ## O que esta fatia cobre, e o que ela deliberadamente não cobre
 *
 * Das cinco portas de §8.3, esta entrega as três que nascem de uma **posição**:
 * posição inicial padrão, posição montada à mão e FEN colada. PGN já existia por
 * outro caminho (`importar-pgn.ts`) e URL do Lichess continua aberta. As ações
 * contextuais — "mostrar esta variante na aula", "começar desta posição",
 * "duplicar como independente" — também continuam abertas: elas nascem de um
 * lance selecionado, não deste diálogo.
 *
 * ## Por que a criação inteira é UM objeto calculado antes do comando
 *
 * Porque §8.3 exige "uma única ação de Undo/Redo" e o plano final (§4) exige que
 * Refazer devolva **os mesmos ids**. Se os ids nascessem dentro do executor do
 * comando, cada Refazer fabricaria ids novos: o capítulo voltaria parecido, mas
 * não seria o mesmo capítulo — e qualquer narração, treino ou etapa que
 * apontasse para ele ficaria apontando para um fantasma. Aqui os ids são
 * decididos uma vez, no momento em que o professor confirma, e o comando só
 * carrega o que já foi decidido. O histórico guarda documentos inteiros, então
 * desfazer/refazer devolve exatamente os mesmos bytes.
 *
 * ## Por que a validação devolve o campo, e não só a frase
 *
 * §8.3: "erro mantém o diálogo e os dados digitados". A tela precisa saber onde
 * acender o erro para não apagar o resto do formulário, e por isso o veredicto
 * diz `campo: "nome" | "posicao"` junto com a mensagem em português.
 */
import { pecaNaCasa, problemaDaPosicaoMontada } from "../chess/fen.ts";
import { fenSchema } from "../lesson/schema.ts";
import { comoId, idsDaAulaV2 } from "./ids.ts";
import { problemasDeLimiteV2 } from "./limites.ts";
import { FEN_INICIAL_PADRAO, type AnaliseV2, type AulaV2, type CapituloV2 } from "./modelo.ts";

/** O que o professor preencheu no diálogo. */
export type PedidoDeCapituloV2 = {
  nome: string;
  /** A FEN completa, dos seis campos, venha ela do padrão, do montador ou colada. */
  fen: string;
  orientacao: "white" | "black";
  /**
   * Insere a etapa nova logo **depois** da etapa deste capítulo (§8.3: "insere
   * depois do capítulo atual"). Sem ela — ou com um capítulo que não está no
   * fluxo — a etapa entra no fim, que é o comportamento da importação.
   */
  depoisDoCapituloId?: string;
};

/**
 * A criação já decidida: ids, título e posição. É isto que entra no comando e,
 * portanto, é isto que o Refazer repete igual.
 */
export type NovoCapituloV2 = {
  analiseId: string;
  capituloId: string;
  etapaId: string;
  raizId: string;
  titulo: string;
  fen: string;
  orientacao: "white" | "black";
  depoisDoCapituloId?: string;
};

/** Os quatro ids que um apelido gera, sempre nesta ordem. */
function idsDoApelido(apelido: string): [string, string, string, string] {
  return [`analise-${apelido}`, `capitulo-${apelido}`, `etapa-capitulo-${apelido}`, `no-${apelido}-0`];
}

export type PreparoDeCapituloV2 =
  | { ok: true; novo: NovoCapituloV2 }
  | { ok: false; campo: "nome" | "posicao"; mensagem: string };

/** A posição inicial do xadrez, para a porta mais simples do diálogo. */
export const FEN_DA_POSICAO_INICIAL = FEN_INICIAL_PADRAO;

/**
 * Confere o pedido e decide os ids. **Não** toca na aula.
 *
 * A ordem das recusas é a ordem em que o professor preenche: primeiro o nome,
 * que é o campo obrigatório de §8.3, depois a posição.
 */
export function prepararNovoCapitulo(aula: AulaV2, pedido: PedidoDeCapituloV2): PreparoDeCapituloV2 {
  const titulo = pedido.nome.trim();
  if (titulo === "") return { ok: false, campo: "nome", mensagem: "dê um nome ao capítulo — é por ele que você vai reconhecê-lo na coluna da esquerda" };

  const fen = pedido.fen.trim();
  if (fen === "") return { ok: false, campo: "posicao", mensagem: "não há posição nenhuma para este capítulo" };
  if (!fenSchema.safeParse(fen).success) {
    return { ok: false, campo: "posicao", mensagem: "esta não é uma FEN dos seis campos (peças, vez, roque, en passant e os dois contadores)" };
  }
  const problema = problemaDaPosicaoMontada(fen);
  if (problema) return { ok: false, campo: "posicao", mensagem: `esta posição não serve: ${problema}` };

  const usados = idsDaAulaV2(aula);
  // O apelido é escolhido uma vez e serve aos quatro ids, como na importação:
  // lendo `capitulo-oposicao-distante` e `analise-oposicao-distante` num diff,
  // dá para saber de que capítulo se trata sem abrir o editor.
  const base = comoId(titulo, `capitulo-${aula.capitulos.length + 1}`);
  // Um apelido só serve se os **quatro** ids que ele gera estiverem livres.
  // Conferir só o do capítulo deixaria passar a colisão do nó raiz, que é a que
  // ninguém enxerga lendo a tela.
  const livre = (apelido: string) =>
    !idsDoApelido(apelido).some((id) => usados.has(id));
  let apelido = base;
  for (let n = 2; !livre(apelido); n += 1) apelido = `${base}-${n}`;

  const [analiseId, capituloId, etapaId, raizId] = idsDoApelido(apelido);
  return {
    ok: true,
    novo: {
      analiseId,
      capituloId,
      etapaId,
      raizId,
      titulo,
      fen,
      orientacao: pedido.orientacao,
      ...(pedido.depoisDoCapituloId ? { depoisDoCapituloId: pedido.depoisDoCapituloId } : {}),
    },
  };
}

export type AplicacaoDeCapituloV2 =
  | { ok: true; aula: AulaV2 }
  | { ok: false; mensagem: string };

/**
 * Junta a análise, o capítulo e a etapa à aula — tudo, ou nada.
 *
 * Mesmo desenho da aplicação da importação: a aula nova é montada inteira numa
 * cópia e conferida nela; a aula que entrou nunca é tocada. O `fluxo` continua
 * sendo a única ordem — não existe segunda lista para manter em dia.
 */
export function aplicarNovoCapitulo(aula: AulaV2, novo: NovoCapituloV2): AplicacaoDeCapituloV2 {
  const usados = idsDaAulaV2(aula);
  for (const id of [novo.analiseId, novo.capituloId, novo.etapaId, novo.raizId]) {
    if (usados.has(id)) return { ok: false, mensagem: `a aula já tem uma parte chamada "${id}"; escolha outro nome para o capítulo` };
  }

  const analise: AnaliseV2 = {
    id: novo.analiseId,
    // Posição composta pelo professor é `fen` crua, como a importada, e pelo
    // mesmo motivo de §12: FEN que não passou por revisão de proveniência não
    // pode ganhar a aparência de posição aprovada. O validador avisa, e o aviso
    // é o trabalho que ainda falta — não um defeito desta criação.
    inicio: { tipo: "fen", fen: novo.fen },
    raizId: novo.raizId,
    nos: { [novo.raizId]: { id: novo.raizId, filhos: [] } },
  };

  // Capítulo de posição parada: o percurso é vazio (§3 do plano final, "caminho
  // vazio = posição parada"). Os lances entram depois, jogando no tabuleiro.
  const capitulo: CapituloV2 = {
    id: novo.capituloId,
    titulo: novo.titulo,
    analiseId: novo.analiseId,
    inicioNodeId: novo.raizId,
    caminho: [],
    orientacao: novo.orientacao,
    narracoes: [],
  };

  const etapa = { id: novo.etapaId, tipo: "capitulo" as const, entidadeId: novo.capituloId };
  const fluxo = [...aula.fluxo];
  const depois = novo.depoisDoCapituloId
    ? fluxo.findIndex((item) => item.tipo === "capitulo" && item.entidadeId === novo.depoisDoCapituloId)
    : -1;
  fluxo.splice(depois < 0 ? fluxo.length : depois + 1, 0, etapa);

  const nova: AulaV2 = {
    ...aula,
    analises: [...aula.analises, analise],
    capitulos: [...aula.capitulos, capitulo],
    fluxo,
  };

  const excedidos = problemasDeLimiteV2(nova);
  if (excedidos.length > 0) {
    return { ok: false, mensagem: `com mais este capítulo a aula passa do que o editor aguenta: ${excedidos.map((p) => p.mensagem).join("; ")}. Nada foi criado.` };
  }
  return { ok: true, aula: nova };
}

/**
 * A FEN completa a partir dos campos do montador.
 *
 * O tabuleiro devolve só a parte das peças (`api.getFen()` é assim, e está
 * documentado na prop `montagem` do `ChessBoard`); de quem é a vez, roque, en
 * passant e contadores são decisão do montador, não do tabuleiro. A ordem do
 * roque é a canônica `KQkq` porque é a que o `fenSchema` do projeto aceita.
 */
export function fenDoMontador(campos: {
  pecas: string;
  vez: "w" | "b";
  roques: { K: boolean; Q: boolean; k: boolean; q: boolean };
  enPassant: string;
  meiosLances: number;
  lance: number;
}): string {
  const roque = (["K", "Q", "k", "q"] as const).filter((letra) => campos.roques[letra]).join("") || "-";
  const enPassant = campos.enPassant.trim() === "" ? "-" : campos.enPassant.trim();
  return `${campos.pecas} ${campos.vez} ${roque} ${enPassant} ${campos.meiosLances} ${campos.lance}`;
}

/**
 * Os direitos de roque que a posição **permite**, para o montador desmarcar
 * sozinho o que ficou impossível quando uma torre foi arrastada para fora.
 *
 * Não é uma segunda opinião sobre legalidade: é a mesma regra de
 * `problemaDosCamposDaFen`, aplicada antes para o professor não precisar ler um
 * erro que a tela já sabia evitar.
 */
export function roquesPossiveis(pecas: string): { K: boolean; Q: boolean; k: boolean; q: boolean } {
  const em = (casa: string, peca: string) => pecaNaCasa(pecas, casa) === peca;
  return {
    K: em("e1", "K") && em("h1", "R"),
    Q: em("e1", "K") && em("a1", "R"),
    k: em("e8", "k") && em("h8", "r"),
    q: em("e8", "k") && em("a8", "r"),
  };
}
