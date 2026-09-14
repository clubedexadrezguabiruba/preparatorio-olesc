"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { criarDespachante } from "@/lib/atalhos/registro";
import { ATALHOS, nomeDaTecla, type EscopoDeAtalho } from "@/lib/atalhos/tabela";

/**
 * O lado de tela da tabela de atalhos — fatia 10, parada 10F.
 *
 * - **Um ouvinte só** na janela, instalado na primeira vez que alguém registra um atalho.
 * - **Camadas:** cada janela modal empilha uma camada (`useCamadaDeJanela`); os atalhos de baixo
 *   ficam mudos enquanto ela está aberta.
 * - **`x` vira a vista** (`VistaDoTabuleiro`): um contexto que o `ChessBoard` lê para inverter a
 *   orientação na tela. Não muda a aula, não entra no Desfazer, e não muda o lado do aluno na prática
 *   ou no treino — só o desenho.
 * - **`?` abre a ajuda**, gerada da mesma tabela que o código usa.
 */

const despachante = criarDespachante();
let ouvindo = false;
function ouvir() {
  if (ouvindo || typeof window === "undefined") return;
  ouvindo = true;
  window.addEventListener("keydown", (evento) => {
    despachante.despachar({
      key: evento.key, ctrlKey: evento.ctrlKey, metaKey: evento.metaKey, altKey: evento.altKey, shiftKey: evento.shiftKey,
      target: evento.target as HTMLElement | null,
      preventDefault: () => evento.preventDefault(),
    });
  });
}

const CamadaDeAtalhos = createContext(0);

/** Registra a ação de um atalho da tabela enquanto o componente estiver montado e `ativo`. */
export function useAtalho(id: string, agir: () => boolean | void, { ativo = true, camada, emTodasAsCamadas = false }: { ativo?: boolean; camada?: number; emTodasAsCamadas?: boolean } = {}) {
  const daArvore = useContext(CamadaDeAtalhos);
  const onde = camada ?? daArvore;
  const acao = useRef(agir);
  useEffect(() => { acao.current = agir; });
  useEffect(() => {
    if (!ativo) return;
    ouvir();
    return despachante.registrar(id, () => acao.current(), { camada: onde, emTodasAsCamadas });
  }, [id, ativo, onde, emTodasAsCamadas]);
}

/**
 * Uma janela modal empilha uma camada enquanto está montada. Devolve a camada, para quem registra
 * atalhos da janela, e o provedor para os filhos herdarem.
 */
export function useCamadaDeJanela(): { camada: number; Provedor: (props: { children: ReactNode }) => ReactNode } {
  const [camada] = useState(() => despachante.novaCamada());
  useEffect(() => despachante.entrar(camada), [camada]);
  const Provedor = useMemo(() => function ProvedorDaCamada({ children }: { children: ReactNode }) {
    return <CamadaDeAtalhos.Provider value={camada}>{children}</CamadaDeAtalhos.Provider>;
  }, [camada]);
  return { camada, Provedor };
}

/* ---- a vista virada ------------------------------------------------------------------ */

type Vista = { virada: boolean; virar: () => void; abrirAjuda: () => void };
const VistaContexto = createContext<Vista>({ virada: false, virar: () => undefined, abrirAjuda: () => undefined });

/** A orientação na tela: a pedida, ou a oposta quando o professor ou o aluno apertou `x`. */
export function useOrientacaoDaVista(orientacao: "white" | "black"): "white" | "black" {
  const { virada } = useContext(VistaContexto);
  return virada ? (orientacao === "white" ? "black" : "white") : orientacao;
}

/**
 * Registra `x` e `?` na camada de quem chama. As telas cheias (prévias, introdução) chamam isto
 * com a camada delas, para as duas teclas continuarem valendo por cima do editor.
 */
export function useTeclasDoTabuleiro(camada?: number) {
  const { virar, abrirAjuda } = useContext(VistaContexto);
  useAtalho("virar-tabuleiro", virar, { camada });
  useAtalho("ajuda-atalhos", abrirAjuda, { camada });
}

export function VistaDoTabuleiro({ escopos, children }: { escopos: EscopoDeAtalho[]; children: ReactNode }) {
  const [virada, setVirada] = useState(false);
  const [ajuda, setAjuda] = useState(false);
  const virar = useCallback(() => setVirada((atual) => !atual), []);
  const abrirAjuda = useCallback(() => setAjuda(true), []);
  const valor = useMemo(() => ({ virada, virar, abrirAjuda }), [abrirAjuda, virada, virar]);
  return (
    <VistaContexto.Provider value={valor}>
      <TeclasNaRaiz />
      {virada ? <p role="status" className="sr-only">Tabuleiro virado</p> : null}
      {children}
      {ajuda ? <AjudaDosAtalhos escopos={escopos} aoFechar={() => setAjuda(false)} /> : null}
    </VistaContexto.Provider>
  );
}

function TeclasNaRaiz() {
  useTeclasDoTabuleiro(0);
  return null;
}

/** A lista dos atalhos de alguns escopos — a mesma que o `(?)` do editor mostra. */
export function ListaDeAtalhos({ escopos }: { escopos: EscopoDeAtalho[] }) {
  const linhas = ATALHOS.filter((item) => escopos.includes(item.escopo) && !item.soNaTabela);
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
      {linhas.map((item) => (
        <div key={item.id} className="contents">
          <dt className="whitespace-nowrap font-mono text-tinta">{item.teclas.map(nomeDaTecla).join(" · ")}</dt>
          <dd className="text-tinta-media">{item.descricao}</dd>
        </div>
      ))}
    </dl>
  );
}

function AjudaDosAtalhos({ escopos, aoFechar }: { escopos: EscopoDeAtalho[]; aoFechar: () => void }) {
  const { camada, Provedor } = useCamadaDeJanela();
  useAtalho("fechar-janela", () => { aoFechar(); }, { camada });
  const caixa = useRef<HTMLDivElement>(null);
  const quemAbriu = useRef<Element | null>(null);
  useEffect(() => {
    quemAbriu.current = document.activeElement;
    caixa.current?.querySelector<HTMLElement>("button")?.focus();
    return () => { (quemAbriu.current as HTMLElement | null)?.focus?.(); };
  }, []);
  return (
    <Provedor>
      <div className="fixed inset-0 z-[70] flex items-start justify-center bg-veu p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) aoFechar(); }}>
        <div ref={caixa} role="dialog" aria-modal="true" aria-label="Atalhos de teclado" className="my-12 flex w-full max-w-lg flex-col gap-3 rounded-lg border border-borda bg-papel p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-tinta">Atalhos de teclado</h2>
            <button type="button" onClick={aoFechar} className="foco rounded-md border border-borda px-3 py-1.5 text-sm text-tinta">Fechar</button>
          </div>
          <ListaDeAtalhos escopos={[...escopos, "tabuleiro", "janela"]} />
          <p className="text-xs text-tinta-fraca">Dentro de um campo de texto as teclas escrevem; os atalhos voltam quando o foco sai dele.</p>
        </div>
      </div>
    </Provedor>
  );
}
