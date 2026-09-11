"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Color } from "@lichess-org/chessground/types";
import { MONTAGEM_INICIAL, Montador, type CamposDaMontagem } from "@/components/editor-v2/Montador";
import {
  FEN_DA_POSICAO_INICIAL,
  fenDoMontador,
  prepararNovoCapitulo,
  type NovoCapituloV2,
} from "@/lib/editor-v2/novo-capitulo";
import type { AulaV2, CapituloV2 } from "@/lib/editor-v2/modelo";

/**
 * "Adicionar capítulo" — o diálogo de §8.3.
 *
 * ## As portas desta fatia
 *
 * Três das cinco: **posição inicial**, **montar posição** e **FEN colada**. PGN
 * já tem a sua própria janela (`PainelDeImportacao`), e continua ali; URL do
 * Lichess ainda não existe. A janela não finge que existem cinco: mostra as três
 * que funcionam, e diz onde está a quarta.
 *
 * ## Por que o formulário não se apaga quando dá erro
 *
 * §8.3 é explícito: "erro mantém o diálogo e os dados digitados". Por isso a
 * recusa é **estado desta janela**, e não um `alert` nem um fechamento: o nome
 * continua escrito, a posição montada continua montada, e o professor corrige
 * exatamente o que estava errado. É também por isso que trocar de porta não
 * zera o montador — quem foi conferir uma FEN e voltou não perdeu o trabalho.
 *
 * ## Foco
 *
 * Abre no campo do nome, `Esc` fecha, o `Tab` não escapa para a aula atrás e,
 * ao fechar, o foco volta ao botão que abriu (quem fecha é o `EditorV2`). É o
 * mesmo contrato da janela de importar, e §25 exige dos dois.
 */
export function DialogoNovoCapitulo({
  aula,
  capituloAtualId,
  orientacaoPadrao,
  aoCriar,
  aoFechar,
}: {
  aula: AulaV2;
  /** O capítulo selecionado agora: é depois dele que o novo entra, por padrão. */
  capituloAtualId: string;
  orientacaoPadrao: Color;
  aoCriar: (novo: NovoCapituloV2) => void;
  aoFechar: () => void;
}) {
  const [nome, setNome] = useState("");
  const [porta, setPorta] = useState<"inicial" | "montar" | "fen">("inicial");
  const [fenColada, setFenColada] = useState("");
  const [montagem, setMontagem] = useState<CamposDaMontagem>(MONTAGEM_INICIAL);
  const [orientacao, setOrientacao] = useState<Color>(orientacaoPadrao);
  const [depoisDe, setDepoisDe] = useState(capituloAtualId);
  const [erro, setErro] = useState<{ campo: "nome" | "posicao"; mensagem: string } | null>(null);

  const campoDoNome = useRef<HTMLInputElement>(null);
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
  const tituloId = useId();
  const erroId = useId();

  useEffect(() => {
    campoDoNome.current?.focus();
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

  /** A ordem da coluna vem do fluxo, e o seletor de lugar tem de vir dela também. */
  const capitulosNaOrdem: CapituloV2[] = aula.fluxo.flatMap((etapa) => {
    if (etapa.tipo !== "capitulo") return [];
    const item = aula.capitulos.find((c) => c.id === etapa.entidadeId);
    return item ? [item] : [];
  });

  const fen = porta === "inicial"
    ? FEN_DA_POSICAO_INICIAL
    : porta === "montar"
      ? fenDoMontador(montagem)
      : fenColada;

  function confirmar() {
    const preparo = prepararNovoCapitulo(aula, {
      nome,
      fen,
      orientacao,
      ...(depoisDe ? { depoisDoCapituloId: depoisDe } : {}),
    });
    if (!preparo.ok) {
      setErro({ campo: preparo.campo, mensagem: preparo.mensagem });
      if (preparo.campo === "nome") campoDoNome.current?.focus();
      return;
    }
    setErro(null);
    aoCriar(preparo.novo);
  }

  const portas = [
    { chave: "inicial" as const, rotulo: "Posição inicial", ajuda: "O tabuleiro padrão do xadrez." },
    { chave: "montar" as const, rotulo: "Montar posição", ajuda: "Arraste as peças uma a uma." },
    { chave: "fen" as const, rotulo: "Colar FEN", ajuda: "A posição copiada do Lichess ou de um livro." },
  ];

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
            <h2 id={tituloId} className="text-base font-semibold text-tinta">Adicionar capítulo</h2>
            <p className="text-sm text-tinta-fraca">
              Escolha de onde a posição vem. Os lances entram depois, jogando no tabuleiro.
            </p>
          </div>
          <button type="button" onClick={aoFechar} className="foco rounded-md border border-borda px-3 py-2 text-sm text-tinta hover:bg-carta-toque">Fechar</button>
        </header>

        <label className="flex flex-col gap-1 text-sm text-tinta">
          Nome do capítulo
          <input
            ref={campoDoNome}
            type="text"
            value={nome}
            onChange={(evento) => { setNome(evento.currentTarget.value); if (erro?.campo === "nome") setErro(null); }}
            onKeyDown={(evento) => { if (evento.key === "Enter") { evento.preventDefault(); confirmar(); } }}
            placeholder="Ex.: A oposição distante"
            aria-invalid={erro?.campo === "nome" ? true : undefined}
            aria-describedby={erro?.campo === "nome" ? erroId : undefined}
            className={`foco rounded-md border bg-papel px-2 py-2 text-sm text-tinta ${erro?.campo === "nome" ? "border-erro" : "border-borda"}`}
          />
        </label>

        <div role="group" aria-label="De onde vem a posição" className="flex flex-wrap gap-2">
          {portas.map((item) => (
            <button
              key={item.chave}
              type="button"
              aria-pressed={porta === item.chave}
              onClick={() => { setPorta(item.chave); if (erro?.campo === "posicao") setErro(null); }}
              className={`foco flex-1 basis-40 rounded-md border px-3 py-2 text-left text-sm ${
                porta === item.chave
                  ? "border-foco bg-metodo-superficie text-metodo-tinta-alta"
                  : "border-borda text-tinta hover:bg-carta-toque"
              }`}
            >
              <strong className="block">{item.rotulo}</strong>
              <span className="text-xs opacity-80">{item.ajuda}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-tinta-fraca">
          Para trazer partidas de um arquivo, use <strong>Importar PGN</strong>, no alto da tela.
          Importar por endereço do Lichess ainda não existe.
        </p>

        {porta === "inicial" ? (
          <p className="rounded-md border border-borda-fraca bg-carta p-3 text-sm text-tinta-fraca">
            O capítulo começa na posição inicial do xadrez, com as brancas na vez.
          </p>
        ) : null}

        {porta === "fen" ? (
          <label className="flex flex-col gap-1 text-sm text-tinta">
            FEN da posição
            <input
              type="text"
              value={fenColada}
              onChange={(evento) => { setFenColada(evento.currentTarget.value); if (erro?.campo === "posicao") setErro(null); }}
              placeholder="8/8/8/4k3/8/8/4P3/4K3 w - - 0 1"
              spellCheck={false}
              aria-invalid={erro?.campo === "posicao" ? true : undefined}
              aria-describedby={erro?.campo === "posicao" ? erroId : undefined}
              className={`foco rounded-md border bg-papel px-2 py-2 font-mono text-xs text-tinta ${erro?.campo === "posicao" ? "border-erro" : "border-borda"}`}
            />
            <span className="text-xs text-tinta-fraca">
              No Lichess: análise → o campo FEN embaixo do tabuleiro.
            </span>
          </label>
        ) : null}

        {porta === "montar" ? (
          <Montador
            campos={montagem}
            orientacao={orientacao}
            aoTrocar={(proximos) => { setMontagem(proximos); if (erro?.campo === "posicao") setErro(null); }}
            aoVirar={() => setOrientacao(orientacao === "white" ? "black" : "white")}
          />
        ) : null}

        <div className="flex flex-wrap items-center gap-4 border-t border-borda-fraca pt-3 text-sm">
          <span className="flex items-center gap-2 text-tinta-fraca">
            Tabuleiro visto pelas:
            {(["white", "black"] as const).map((lado) => (
              <label key={lado} className="flex items-center gap-1 text-tinta">
                <input type="radio" name="orientacao-do-capitulo" checked={orientacao === lado} onChange={() => setOrientacao(lado)} className="foco" />
                {lado === "white" ? "brancas" : "pretas"}
              </label>
            ))}
          </span>
          <label className="flex items-center gap-2 text-tinta-fraca">
            Entra
            <select
              value={depoisDe}
              onChange={(evento) => setDepoisDe(evento.currentTarget.value)}
              className="foco rounded-md border border-borda bg-papel px-2 py-1 text-sm text-tinta"
            >
              {capitulosNaOrdem.map((item) => (
                <option key={item.id} value={item.id}>depois de “{item.titulo}”</option>
              ))}
              <option value="">no fim da aula</option>
            </select>
          </label>
        </div>

        {erro ? (
          <p id={erroId} role="alert" className="rounded-md border border-erro bg-erro-superficie/10 p-3 text-sm text-erro-texto">
            {erro.mensagem}
          </p>
        ) : null}

        {/* O rodapé gruda embaixo porque o montador é alto: medido em
            1366×768, a janela com ele aberto tem 1.031 px e o "Criar capítulo"
            cairia fora da tela. Grudado, a ação fica sempre alcançável enquanto
            a posição rola por dentro — em vez de o professor ter de descobrir
            que precisa rolar para terminar o que começou. */}
        <footer className="sticky bottom-0 -mx-4 -mb-4 flex flex-wrap items-center justify-end gap-3 rounded-b-lg border-t border-borda-fraca bg-papel px-4 py-3">
          <button type="button" onClick={aoFechar} className="foco rounded-md border border-borda px-3 py-2 text-sm text-tinta hover:bg-carta-toque">Cancelar</button>
          <button type="button" onClick={confirmar} className="foco rounded-md bg-metodo-superficie px-3 py-2 text-sm font-medium text-metodo-tinta-alta">
            Criar capítulo
          </button>
        </footer>
      </section>
    </div>
  );
}
