"use client";

import { useAtalho, useCamadaDeJanela } from "@/components/atalhos/Atalhos";
import { useEffect, useRef, useState } from "react";
import type { AcaoDoLanceV2 } from "@/lib/editor-v2/acoes-do-lance";

/**
 * O menu de um lance — §11.3 e §25.
 *
 * ## A mesma lista nos dois gestos
 *
 * §11.3: "botão direito no lance e `•••` acessível por teclado devem oferecer o
 * **mesmo conjunto aplicável** de ações". Por isso a lista não é montada aqui:
 * ela chega pronta de `acoesDoLance`, que é uma função pura com teste. Os dois
 * gestos abrem este mesmo componente, com o mesmo `nodeId` — não há como um
 * oferecer uma ação que o outro não tem.
 *
 * ## Ação impossível fica visível, e diz por quê
 *
 * §11.3 permite "ausentes **ou** desabilitadas com motivo", e a segunda é
 * melhor: um menu que muda de tamanho conforme o lance obriga o professor a
 * procurar de novo a cada clique, e some justamente com a ação que ele estava
 * querendo — sem explicar que ela existe. Aqui ela fica no mesmo lugar, apagada,
 * com o motivo no `title` e anunciado pelo `aria-describedby`.
 */
export function MenuDoLance({
  acoes,
  aberto,
  rotulo,
  aoAbrir,
  aoFechar,
  aoEscolher,
}: {
  acoes: AcaoDoLanceV2[];
  aberto: boolean;
  /** O nome do lance, para o nome acessível do botão `•••`. */
  rotulo: string;
  aoAbrir: () => void;
  aoFechar: () => void;
  aoEscolher: (id: AcaoDoLanceV2["id"]) => void;
}) {
  const caixa = useRef<HTMLDivElement>(null);
  const primeiro = useRef<HTMLButtonElement>(null);
  /*
   * O menu abre em posição fixa, calculada no clique (revisão de experiência, 14/9/2026): dentro da lista de
   * lances, que rola por dentro, um menu `absolute` saía cortado embaixo e cobria o painel do lance. Sem
   * espaço embaixo, ele abre para cima.
   */
  const [lugar, setLugar] = useState<{ direita: number; topo?: number; base?: number } | null>(null);
  // Vale para os dois gestos — o `•••` e o botão direito no lance, que abre o menu pelo pai.
  useEffect(() => {
    let ativo = true;
    queueMicrotask(() => {
      if (!ativo) return;
      const botao = aberto ? caixa.current?.querySelector("button")?.getBoundingClientRect() : undefined;
      if (!botao) { setLugar(null); return; }
      const direita = Math.max(8, window.innerWidth - botao.right);
      setLugar(window.innerHeight - botao.bottom < 360 ? { direita, base: window.innerHeight - botao.top + 4 } : { direita, topo: botao.bottom + 4 });
    });
    return () => { ativo = false; };
  }, [aberto]);

  useEffect(() => {
    if (aberto) primeiro.current?.focus();
  }, [aberto]);

  /*
   * Clicar em qualquer outro lugar fecha — inclusive num lance da lista, que é o
   * gesto de quem desistiu e foi olhar outro. O `mousedown` (e não o `click`)
   * pela mesma razão do véu das janelas: o clique que fecha precisa ser o que
   * começou fora, e não o fim de um gesto que começou dentro.
   */
  useEffect(() => {
    if (!aberto) return;
    const fora = (evento: MouseEvent) => {
      if (!caixa.current?.contains(evento.target as Node)) aoFechar();
    };
    window.addEventListener("mousedown", fora);
    return () => {
      window.removeEventListener("mousedown", fora);
    };
  }, [aberto, aoFechar]);

  return (
    <div ref={caixa} className="relative shrink-0">
      {/* Fatia 10: o menu aberto é uma camada de atalhos — o L do motor e as setas ficam mudos
          atrás dele, e o Esc fecha e devolve o foco ao •••. */}
      {aberto ? <CamadaDoMenu aoFechar={() => { aoFechar(); caixa.current?.querySelector<HTMLButtonElement>("button")?.focus(); }} /> : null}
      <button
        type="button"
        aria-label={`Ações do lance ${rotulo}`}
        aria-expanded={aberto}
        title="Mais ações"
        onClick={() => (aberto ? aoFechar() : aoAbrir())}
        className="foco flex h-full min-h-7 min-w-8 items-center justify-center rounded px-1.5 text-xs text-tinta-fraca hover:bg-carta-toque hover:text-tinta"
      >
        <span aria-hidden>•••</span>
      </button>

      {aberto ? (
        <div
          role="menu"
          style={lugar ? { right: lugar.direita, ...(lugar.topo !== undefined ? { top: lugar.topo } : { bottom: lugar.base }) } : undefined}
          className={`${lugar ? "fixed" : "absolute right-0 mt-1"} z-50 flex max-h-[70vh] w-64 flex-col overflow-y-auto rounded-md border border-borda bg-carta p-1 shadow-lg`}
        >
          {visiveis(acoes).map((acao, indice) => (
            <button
              key={acao.id}
              ref={indice === 0 ? primeiro : undefined}
              type="button"
              role="menuitem"
              disabled={!acao.disponivel}
              title={acao.motivo}
              onClick={() => { aoEscolher(acao.id); aoFechar(); }}
              className={`foco rounded px-2 py-1.5 text-left text-sm hover:bg-carta-toque disabled:cursor-not-allowed disabled:opacity-40 ${acao.id === "excluir-daqui" ? "mt-1 border-t border-borda-fraca pt-2 text-erro-texto" : "text-tinta"}`}
            >
              {acao.rotulo}
              {!acao.disponivel && acao.motivo ? (
                <span className="block text-xs font-normal text-tinta-fraca">{acao.motivo}</span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Revisão de experiência (14/9/2026): o menu tinha onze itens, e metade vinha apagada com uma explicação
 * ("a posição inicial não é um lance…"). §11.3 permite ação impossível ausente; ela some. A exceção é
 * "Criar treino daqui", que continua com o motivo — é a porta dos treinos, e sumir dela confundiria.
 * A ordem é a do uso: escrever e anotar primeiro, apagar por último.
 */
const ORDEM: AcaoDoLanceV2["id"][] = ["comentar", "simbolo", "principal", "variante", "treino", "mostrar-variante", "comecar-daqui", "copiar-pgn", "duplicar-independente", "substituir-continuacao", "excluir-daqui"];

function visiveis(acoes: AcaoDoLanceV2[]): AcaoDoLanceV2[] {
  return acoes
    .filter((acao) => acao.disponivel || acao.id === "treino")
    .sort((a, b) => ORDEM.indexOf(a.id) - ORDEM.indexOf(b.id));
}

function CamadaDoMenu({ aoFechar }: { aoFechar: () => void }) {
  const { camada } = useCamadaDeJanela();
  useAtalho("fechar-janela", () => { aoFechar(); }, { camada });
  return null;
}
