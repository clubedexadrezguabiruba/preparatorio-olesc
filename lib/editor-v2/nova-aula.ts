/**
 * Nova aula — §5.2 da especificação funcional.
 *
 * ## O que "o professor não digita IDs internos" quer dizer aqui
 *
 * §5.2: "O ID é gerado/validado pelo sistema; o professor não digita IDs
 * internos". O id editorial de uma aula **não** é interno — `N1-KPK` aparece no
 * nome do arquivo, na URL, no cache de tablebase e no progresso do aluno —, mas
 * ele também não é uma coisa que se peça a quem está criando a aula. Então ele é
 * **derivado do título e do nível**, mostrado antes de confirmar, e conferido
 * contra tudo o que já existe.
 *
 * - aula do curso: `N<nível>-<TÍTULO>`, o padrão que `lessonIdSchema` cobra;
 * - aula extra: `EX-<TÍTULO>`, o namespace de §22.
 *
 * A extra ganha o nível num campo do documento, e não no id: §22 exige "nível
 * explícito", e o `EX-` não traz número nenhum. Ver `metadadosAulaV2Schema`.
 *
 * ## A aula nasce vazia, e isso é permitido de propósito
 *
 * §5.2: "uma aula vazia pode ser salva como rascunho incompleto". §7 do plano
 * final diz por quê: "o rascunho versionado exige estrutura íntegra, mas pode
 * conter pendências editoriais identificadas… isso permite criar aula vazia sem
 * contornar o schema de publicação". Uma aula sem capítulo é um documento v2
 * **válido**; é a publicação — que ainda não existe — que vai exigir conteúdo.
 *
 * ## O que esta tela não faz, e diz que não faz
 *
 * Entrar na **trilha do curso** é outra coisa: a trilha (`lib/finais/trilha.ts`)
 * é uma lista em código, e acrescentar uma aula a ela é uma alteração de
 * código — não de conteúdo. Criar a aula aqui não a põe no currículo do aluno, e
 * a tela escreve isso em vez de deixar o professor supor o contrário.
 */
import { aulaIdV2Schema, type AulaV2 } from "./modelo.ts";

export type PedidoDeNovaAulaV2 = {
  titulo: string;
  tipo: "curso" | "extra";
  /** 0 a 5. Obrigatório nos dois casos: é ele que dá o prefixo ou o campo. */
  nivel: number;
  orientacaoPadrao: "white" | "black";
  criterioDominio: "D1" | "D2" | "D3" | "D4";
  classe?: "E" | "D" | "C" | "B";
};

export type PreparoDeNovaAulaV2 =
  | { ok: true; aula: AulaV2 }
  | { ok: false; campo: "titulo" | "nivel" | "id"; mensagem: string };

/**
 * `Peão de torre na sétima` vira `PEAO-DE-TORRE-NA-SETIMA`.
 *
 * Maiúsculas e hífen porque é o que `lessonIdSchema` aceita (`^N[0-9]+-[A-Z0-9-]+$`),
 * e é a forma que as aulas existentes já usam.
 */
export function comoIdDeAula(titulo: string): string {
  return titulo
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 28)
    .replace(/-+$/g, "");
}

/** O id que este pedido geraria, para a tela mostrar antes de confirmar. */
export function idDaNovaAula(pedido: Pick<PedidoDeNovaAulaV2, "titulo" | "tipo" | "nivel">): string {
  const corpo = comoIdDeAula(pedido.titulo);
  if (corpo === "") return "";
  return pedido.tipo === "extra" ? `EX-${corpo}` : `N${pedido.nivel}-${corpo}`;
}

/**
 * Confere o pedido e monta a aula vazia. **Não** escreve em disco: quem escreve
 * é a Server Action, e só depois de esta função dizer que dá.
 *
 * `idsExistentes` traz tudo o que já ocupa um id de aula — publicadas, rascunhos
 * v1 e documentos v2 —, porque o id vira nome de arquivo em três pastas
 * diferentes e uma colisão em qualquer uma delas é a mesma colisão.
 */
export function prepararNovaAula(pedido: PedidoDeNovaAulaV2, idsExistentes: Set<string>): PreparoDeNovaAulaV2 {
  const titulo = pedido.titulo.trim();
  if (titulo === "") {
    return { ok: false, campo: "titulo", mensagem: "dê um título à aula — é por ele que você vai reconhecê-la na lista" };
  }
  if (!Number.isInteger(pedido.nivel) || pedido.nivel < 0 || pedido.nivel > 5) {
    return { ok: false, campo: "nivel", mensagem: "escolha um nível de 0 a 5" };
  }

  const id = idDaNovaAula({ ...pedido, titulo });
  if (id === "") {
    return { ok: false, campo: "titulo", mensagem: "este título não gera um identificador: use ao menos uma letra ou um número" };
  }
  if (!aulaIdV2Schema.safeParse(id).success) {
    return { ok: false, campo: "id", mensagem: `o identificador «${id}» não segue o padrão do projeto` };
  }
  if (idsExistentes.has(id)) {
    return { ok: false, campo: "titulo", mensagem: `já existe uma aula com o identificador «${id}»; mude o título` };
  }

  return {
    ok: true,
    aula: {
      schemaVersion: 2,
      id,
      titulo,
      metadados: {
        orientacaoPadrao: pedido.orientacaoPadrao,
        criterioDominio: pedido.criterioDominio,
        estadoEditorial: "rascunho",
        // O nível fica declarado no documento só quando o id não o declara.
        ...(pedido.tipo === "extra" ? { nivel: pedido.nivel } : {}),
        ...(pedido.classe ? { classe: pedido.classe } : {}),
      },
      proveniencia: [],
      excecoes: [],
      analises: [],
      introducoes: [],
      capitulos: [],
      treinos: [],
      praticas: [],
      fluxo: [],
    },
  };
}
