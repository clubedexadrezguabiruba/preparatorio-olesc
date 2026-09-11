"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { Color } from "@lichess-org/chessground/types";
import { Montador, type CamposDaMontagem } from "@/components/editor-v2/Montador";
import { fenInicialDaAnalise } from "@/lib/editor-v2/arvore";
import { camposDaFen, fenDoMontador } from "@/lib/editor-v2/novo-capitulo";
import { calcularTrocaDePosicao, type ImpactoDaTrocaV2, type PlanoDaTrocaV2 } from "@/lib/editor-v2/trocar-posicao";
import type { AulaV2 } from "@/lib/editor-v2/modelo";
import type { Position } from "@/lib/lesson/schema";

/**
 * "Trocar a posição inicial" — §9 da especificação funcional.
 *
 * ## Por que o impacto é recalculado a cada peça arrastada
 *
 * §9 manda "mostrar o impacto antes de aplicar". A leitura tímida disso seria
 * uma tela de confirmação depois de o professor terminar de montar; a leitura
 * útil é a que ele tem enquanto monta. Arrastar o peão uma casa e ver na hora
 * que isso custa **onze lances e três narrações** é o que faz ele parar e
 * pensar — a mesma informação, depois de pronto, chega tarde para mudar de
 * ideia. A conta é `calcularTrocaDePosicao`, que não toca na aula; rodá-la a
 * cada mudança é seguro por construção, não por disciplina.
 *
 * ## As duas FENs lado a lado
 *
 * §9 pede as duas, e elas ficam no alto, antes de tudo: é a única informação da
 * janela que responde "o que eu estou trocando por quê" sem o professor ter de
 * reconstruir a posição antiga de cabeça.
 *
 * ## Por que o botão pode ficar desabilitado
 *
 * Quando alguém de fora da análise depende de um lance que a posição nova
 * mataria — um treino, um quadro de introdução, outra análise —, a troca não
 * acontece (ver `trocar-posicao.ts`). A janela mostra quem é, pelo nome, e o
 * botão não finge que dá. Fechar sem trocar é sempre possível: §9 manda
 * "permitir cancelar", e cancelar aqui é literalmente não ter feito nada,
 * porque nada foi escrito.
 */
export function DialogoTrocarPosicao({
  aula,
  analiseId,
  tituloDoCapitulo,
  orientacao,
  positions,
  aoTrocar,
  aoFechar,
}: {
  aula: AulaV2;
  analiseId: string;
  tituloDoCapitulo: string;
  orientacao: Color;
  positions: Record<string, Position>;
  aoTrocar: (plano: PlanoDaTrocaV2) => void;
  aoFechar: () => void;
}) {
  /**
   * A posição de agora, que é por onde o montador abre — §9.
   *
   * Lida pela **mesma** porta que a árvore usa (`fenInicialDaAnalise`), e não
   * por um `if` sobre `inicio.tipo` escrito aqui: são três tipos de início, e o
   * terceiro resolve por outra análise. Duas leituras seriam duas opiniões sobre
   * onde o capítulo começa, e a divergência só apareceria no dia em que o
   * montador abrisse com uma posição que o tabuleiro não estava mostrando.
   */
  const fenAtual = useMemo(() => {
    const analise = aula.analises.find((item) => item.id === analiseId);
    if (!analise) return "";
    try {
      return fenInicialDaAnalise(aula, analise, positions);
    } catch {
      return "";
    }
  }, [analiseId, aula, positions]);

  const [montagem, setMontagem] = useState<CamposDaMontagem | null>(() => camposDaFen(fenAtual));
  const [vista, setVista] = useState<Color>(orientacao);
  const [colada, setColada] = useState("");
  const [recadoDaColagem, setRecadoDaColagem] = useState<string | null>(null);

  const janela = useRef<HTMLElement>(null);
  /**
   * Onde o dedo **desceu**, e não onde ele subiu.
   *
   * ## O defeito que isto conserta, achado arrastando
   *
   * O véu fecha a janela ao clique, que é o gesto esperado de "cliquei fora".
   * Só que arrastar uma peça para fora do tabuleiro — o jeito de **remover** uma
   * peça, §9 — termina com o ponteiro no véu, e o navegador dispara o `click` no
   * ancestral comum entre onde o botão desceu e onde subiu: o próprio véu. A
   * janela fechava, e a posição montada ia junto.
   *
   * A regra passa a ser: só fecha se o gesto **começou** no véu. Soltar ali o que
   * saiu de dentro da janela não é um pedido de fechar — é o fim de um arrasto.
   */
  const pressionouNoVeu = useRef(false);
  const primeiroBotao = useRef<HTMLButtonElement>(null);
  const tituloId = useId();

  useEffect(() => {
    primeiroBotao.current?.focus();
  }, []);

  useEffect(() => {
    const tecla = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") {
        aoFechar();
        return;
      }
      if (evento.key !== "Tab" || !janela.current) return;
      const focaveis = janela.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input:not([disabled]), select, summary, details',
      );
      if (focaveis.length === 0) return;
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primeiro.focus();
      } else if (evento.shiftKey && document.activeElement === primeiro) {
        evento.preventDefault();
        ultimo.focus();
      }
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [aoFechar]);

  const fenNova = montagem ? fenDoMontador(montagem) : "";
  const calculo = useMemo(
    () => calcularTrocaDePosicao(aula, { analiseId, fen: fenNova }, positions),
    [analiseId, aula, fenNova, positions],
  );
  const impacto = calculo.ok ? calculo.plano.impacto : null;
  const bloqueado = (impacto?.bloqueios.length ?? 0) > 0;

  function colar(texto: string) {
    setColada(texto);
    if (texto.trim() === "") {
      setRecadoDaColagem(null);
      return;
    }
    const campos = camposDaFen(texto);
    if (!campos) {
      setRecadoDaColagem("esta não é uma FEN dos seis campos — o montador continua como estava");
      return;
    }
    setRecadoDaColagem(null);
    setMontagem(campos);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-veu p-4 backdrop-blur-[2px]"
      onMouseDown={(evento) => { pressionouNoVeu.current = evento.target === evento.currentTarget; }}
      onClick={(evento) => { if (evento.target === evento.currentTarget && pressionouNoVeu.current) aoFechar(); }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        ref={janela}
        onClick={(evento) => evento.stopPropagation()}
        className="my-8 flex w-full max-w-3xl flex-col gap-3 rounded-lg border border-borda bg-papel p-4"
      >
        <header className="flex items-start justify-between gap-3">
          <div>
            <h2 id={tituloId} className="text-base font-semibold text-tinta">
              Trocar a posição inicial de «{tituloDoCapitulo}»
            </h2>
            <p className="text-sm text-tinta-fraca">
              Os lances que a posição nova tornar ilegais são cortados a partir do primeiro deles.
              Nada acontece antes de você confirmar.
            </p>
          </div>
          <button ref={primeiroBotao} type="button" onClick={aoFechar} className="foco rounded-md border border-borda px-3 py-2 text-sm text-tinta hover:bg-carta-toque">Fechar</button>
        </header>

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-md border border-borda-fraca bg-carta p-2">
            <p className="text-xs font-semibold text-tinta-fraca">Posição de agora</p>
            <code className="block break-all font-mono text-xs text-tinta">{fenAtual || "—"}</code>
          </div>
          <div className={`rounded-md border p-2 ${calculo.ok ? "border-borda-fraca bg-carta" : "border-erro bg-erro-superficie/10"}`}>
            <p className="text-xs font-semibold text-tinta-fraca">Posição nova</p>
            <code className="block break-all font-mono text-xs text-tinta">{fenNova || "—"}</code>
          </div>
        </div>

        <label className="flex flex-col gap-1 text-sm text-tinta">
          Colar uma FEN no montador
          <input
            type="text"
            value={colada}
            onChange={(evento) => colar(evento.currentTarget.value)}
            placeholder="8/8/8/4k3/8/8/4P3/4K3 w - - 0 1"
            spellCheck={false}
            className="foco rounded-md border border-borda bg-papel px-2 py-2 font-mono text-xs text-tinta"
          />
          {recadoDaColagem ? <span className="text-xs text-erro-texto">{recadoDaColagem}</span> : null}
        </label>

        {montagem ? (
          <Montador
            campos={montagem}
            orientacao={vista}
            aoTrocar={setMontagem}
            aoVirar={() => setVista(vista === "white" ? "black" : "white")}
          />
        ) : (
          <p className="rounded-md border border-erro bg-erro-superficie/10 p-3 text-sm text-erro-texto">
            A posição atual deste capítulo não pôde ser lida como FEN dos seis campos, então o
            montador não abre carregado. Cole uma FEN acima para começar.
          </p>
        )}

        {!calculo.ok ? (
          <p role="alert" className="rounded-md border border-erro bg-erro-superficie/10 p-3 text-sm text-erro-texto">
            {calculo.mensagem}
          </p>
        ) : null}

        {impacto ? <Impacto impacto={impacto} /> : null}

        <footer className="sticky bottom-0 -mx-4 -mb-4 flex flex-wrap items-center justify-end gap-3 rounded-b-lg border-t border-borda-fraca bg-papel px-4 py-3">
          <button type="button" onClick={aoFechar} className="foco rounded-md border border-borda px-3 py-2 text-sm text-tinta hover:bg-carta-toque">Cancelar</button>
          <button
            type="button"
            disabled={!calculo.ok || bloqueado}
            onClick={() => { if (calculo.ok) aoTrocar(calculo.plano); }}
            className="foco rounded-md bg-metodo-superficie px-3 py-2 text-sm font-medium text-metodo-tinta-alta disabled:opacity-40"
          >
            Trocar a posição
          </button>
        </footer>
      </section>
    </div>
  );
}

/** Uma linha de contagem só aparece quando tem número; zero não é notícia. */
function Linha({ children }: { children: React.ReactNode }) {
  return <li className="text-sm text-tinta">{children}</li>;
}

function Impacto({ impacto }: { impacto: ImpactoDaTrocaV2 }) {
  const nada =
    impacto.podas.length === 0 &&
    impacto.nosMarcados.length === 0 &&
    impacto.narracoesRemovidas.length === 0 &&
    impacto.narracoesMarcadas.length === 0 &&
    impacto.quadrosMarcados.length === 0 &&
    impacto.treinosAfetados.length === 0 &&
    impacto.provenienciaReaberta === null;

  const percursos = impacto.capitulosAfetados.filter((c) => c.percursoCortado || c.inicioReiniciado);

  return (
    <section aria-live="polite" className="flex flex-col gap-2 rounded-md border border-borda-fraca bg-carta p-3">
      <h3 className="text-sm font-semibold text-tinta">O que esta troca faz</h3>

      {impacto.bloqueios.length > 0 ? (
        <div role="alert" className="rounded-md border border-erro bg-erro-superficie/10 p-2 text-sm text-erro-texto">
          <p className="font-medium">Esta troca não pode ser feita enquanto houver quem dependa do que seria apagado:</p>
          <ul className="mt-1 list-disc pl-5">
            {impacto.bloqueios.map((bloqueio, i) => (
              <li key={`${bloqueio.tipo}-${bloqueio.nome}-${i}`}>«{bloqueio.nome}» {bloqueio.motivo}.</li>
            ))}
          </ul>
          <p className="mt-1">
            Remova ou reaponte esses itens primeiro. Cancelar aqui não muda nada na aula.
          </p>
        </div>
      ) : null}

      {nada ? <p className="text-sm text-tinta-fraca">Nenhum lance fica ilegal: a árvore inteira continua de pé.</p> : null}

      <ul className="flex flex-col gap-1">
        {impacto.podas.map((poda) => (
          <Linha key={poda.nodeId}>
            <strong>{poda.lance}</strong> deixa de ser legal — saem {poda.nosRemovidos === 1 ? "este lance" : `${poda.nosRemovidos} lances, dele em diante`}.
          </Linha>
        ))}
        {percursos.map((capitulo) => (
          <Linha key={capitulo.id}>
            O capítulo «{capitulo.titulo}»{" "}
            {capitulo.inicioReiniciado ? "volta a começar na posição inicial" : "tem o percurso cortado no lance que caiu"}.
          </Linha>
        ))}
        {impacto.narracoesRemovidas.length > 0 ? (
          <Linha>
            {impacto.narracoesRemovidas.length === 1 ? "Uma narração some" : `${impacto.narracoesRemovidas.length} narrações somem`} junto com o lance:{" "}
            {impacto.narracoesRemovidas.map((n) => `«${n.texto.slice(0, 40)}${n.texto.length > 40 ? "…" : ""}»`).join(", ")}.
          </Linha>
        ) : null}
        {impacto.nosMarcados.length + impacto.narracoesMarcadas.length + impacto.quadrosMarcados.length > 0 ? (
          <Linha>
            Ficam marcados para revisão:{" "}
            {[
              impacto.nosMarcados.length > 0 ? `${impacto.nosMarcados.length} ${impacto.nosMarcados.length === 1 ? "posição com comentário ou desenho" : "posições com comentário ou desenho"}` : null,
              impacto.narracoesMarcadas.length > 0 ? `${impacto.narracoesMarcadas.length} ${impacto.narracoesMarcadas.length === 1 ? "narração" : "narrações"}` : null,
              impacto.quadrosMarcados.length > 0 ? `${impacto.quadrosMarcados.length} ${impacto.quadrosMarcados.length === 1 ? "quadro de introdução" : "quadros de introdução"}` : null,
            ].filter(Boolean).join(", ")}
            . Eles continuam legais; o que muda é que podem ter deixado de dizer a verdade.
          </Linha>
        ) : null}
        {impacto.treinosAfetados.map((treino) => (
          <Linha key={treino.id}>
            O treino «{treino.titulo}» volta a ter a avaliação pendente
            {treino.certificacaoReaberta ? ", e a certificação dele é reaberta" : ""}
            {treino.fonteAlterada ? ", e a fonte dele passa a constar como alterada" : ""}.
          </Linha>
        ))}
        {impacto.provenienciaReaberta ? (
          <Linha>
            A revisão da posição <code className="font-mono text-xs">{impacto.provenienciaReaberta}</code> é reaberta: a aula deixa de usá-la.
          </Linha>
        ) : null}
        {impacto.provenienciaMantida ? (
          <Linha>
            A revisão da posição <code className="font-mono text-xs">{impacto.provenienciaMantida}</code> continua valendo: outra parte da aula ainda a usa.
          </Linha>
        ) : null}
      </ul>

      <p className="text-xs text-tinta-fraca">Tudo isto é uma ação só: um Desfazer devolve o capítulo inteiro como estava.</p>
    </section>
  );
}
