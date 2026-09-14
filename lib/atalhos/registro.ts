/**
 * O despachante dos atalhos — um ouvinte só, com uma pilha de escopos (fatia 10, 10F).
 *
 * Cada tela registra o que faz com um atalho da tabela; cada janela aberta empilha o escopo `janela`.
 * Com uma janela na pilha, só os atalhos registrados **a partir dela** agem: o `L` do motor não liga
 * atrás do menu `•••`, e as setas não mudam o lance atrás da prévia.
 *
 * As guardas comuns moram aqui, uma vez: campo de texto engole a tecla (`ehCampoDeTexto`, a mesma do
 * editor desde a fatia 5), exceto o Esc; e tecla com Ctrl/Meta/Alt só casa o atalho que a declara.
 *
 * O módulo é puro (sem React) para o teste poder despachar eventos de mentira.
 */
import { ehCampoDeTexto, type AlvoCru } from "../editor-v2/navegacao.ts";
import { atalho, teclaDoEvento } from "./tabela.ts";

type Registro = { id: string; teclas: string[]; camada: number; agir: (evento: EventoDeTecla) => boolean | void; permitirEmCampo: boolean; emTodasAsCamadas: boolean };
export type EventoDeTecla = { key: string; ctrlKey?: boolean; metaKey?: boolean; altKey?: boolean; shiftKey?: boolean; target?: AlvoCru; preventDefault?: () => void };

export type Despachante = {
  /** Registra a ação; devolve a função que remove. `camada` é a profundidade da pilha em que nasceu. */
  registrar: (id: string, agir: Registro["agir"], opcoes?: { camada?: number; permitirEmCampo?: boolean; emTodasAsCamadas?: boolean }) => () => void;
  /** Um número de camada novo, sem empilhar (é puro o bastante para o render do React). */
  novaCamada: () => number;
  /** Empilha a camada; devolve a função que a tira. Chamar num efeito, que tem limpeza. */
  entrar: (camada: number) => () => void;
  /** Atalho de teste: nova camada já empilhada. */
  empilharJanela: () => { camada: number; sair: () => void };
  camadaAtual: () => number;
  despachar: (evento: EventoDeTecla) => string | null;
};

export function criarDespachante(): Despachante {
  const registros: Registro[] = [];
  const janelas: number[] = [];
  let proximaJanela = 1;
  const camadaAtual = () => janelas.at(-1) ?? 0;

  return {
    registrar(id, agir, opcoes = {}) {
      const item: Registro = { id, teclas: atalho(id).teclas, camada: opcoes.camada ?? 0, agir, permitirEmCampo: opcoes.permitirEmCampo ?? atalho(id).teclas.includes("Escape"), emTodasAsCamadas: opcoes.emTodasAsCamadas ?? false };
      registros.push(item);
      return () => { const i = registros.indexOf(item); if (i >= 0) registros.splice(i, 1); };
    },
    novaCamada: () => proximaJanela++,
    entrar(camada) {
      janelas.push(camada);
      return () => { const i = janelas.lastIndexOf(camada); if (i >= 0) janelas.splice(i, 1); };
    },
    empilharJanela() {
      const camada = proximaJanela++;
      janelas.push(camada);
      return { camada, sair: () => { const i = janelas.lastIndexOf(camada); if (i >= 0) janelas.splice(i, 1); } };
    },
    camadaAtual,
    despachar(evento) {
      const tecla = teclaDoEvento(evento);
      const noCampo = ehCampoDeTexto(evento.target ?? null);
      const topo = camadaAtual();
      // O mais recente primeiro: dentro de uma camada, quem registrou por último fala por último e ganha.
      for (const item of [...registros].reverse()) {
        // O Desfazer do documento vale com janela aberta, como valia antes do registro (§6.1).
        if ((item.camada !== topo && !item.emTodasAsCamadas) || !item.teclas.includes(tecla)) continue;
        if (noCampo && !item.permitirEmCampo) continue;
        if (item.agir(evento) === false) continue;
        evento.preventDefault?.();
        return item.id;
      }
      return null;
    },
  };
}
