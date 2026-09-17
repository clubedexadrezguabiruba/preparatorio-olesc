"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { usePrisaoDeFoco } from "@/components/editor-v2/foco";
import { buscarPgnDoLichessAcao } from "@/app/editor/v2/acoes";
import { PainelDoEstudo, type PedidoDeImportacaoDeEstudo } from "@/components/editor-v2/PainelDoEstudo";
import type { ObraDoRegistro } from "@/lib/editor-v2/acervo-em-disco";
import { idsDaAulaV2 } from "@/lib/editor-v2/ids";
import { lerEstudo } from "@/lib/editor-v2/importar-estudo";
import { lerImportacaoPgn, medirImportacao, type RelatorioImportacao } from "@/lib/editor-v2/importar-pgn";
import type { Position } from "@/lib/lesson/schema";
import { LIMITES_V2 } from "@/lib/editor-v2/limites";
import type { AulaV2 } from "@/lib/editor-v2/modelo";

/**
 * A tela de importar PGN — a metade "mostre antes de aplicar" do plano (§11).
 *
 * ## A ordem da tela é a ordem da decisão
 *
 * Escolher o arquivo, **ver o que ele tem**, marcar o que entra, e só então aplicar.
 * O botão de aplicar não existe enquanto não há relatório, porque antes do relatório
 * não há decisão nenhuma a tomar — só uma aposta.
 *
 * ## O que o professor precisa ver de cada capítulo, e por quê
 *
 * Título, lances, variantes e comentários: é como ele reconhece o capítulo e confere
 * se veio inteiro. **Recusa** em vermelho, com o motivo, e a caixa desmarcada e
 * travada — um capítulo que não pode entrar não pode ser escolhido por engano.
 * **Perdas** em âmbar, uma linha cada: elas não impedem, mas quem aplica sem ler
 * merece saber que leu.
 *
 * ## O número do rodapé
 *
 * "A aula fica com 182 de 4.000 lances" responde a pergunta que o professor faria
 * depois de aplicar, e responde antes. Passando do teto, o botão trava e diz por quê —
 * em vez de deixar aplicar e devolver um erro que ele não sabe desfazer.
 *
 * ## Foco
 *
 * O plano (§16) pede foco visível e restauração de foco. Ao abrir, o foco vai para a
 * caixa de texto; `Esc` fecha; ao fechar, o foco volta para o botão que abriu. Sem
 * isso, quem navega por teclado cai no começo da página a cada abertura.
 */
const SEM_POSICOES: Record<string, Position> = {};
const SEM_OBRAS: ObraDoRegistro[] = [];

export function PainelDeImportacao({
  aula,
  aoAplicar,
  aoFechar,
  aoImportarEstudo,
  positions = SEM_POSICOES,
  obras = SEM_OBRAS,
  professor = "professor",
  enderecoInicial = "",
  textoInicial = "",
  nomeInicial = null,
}: {
  aula: AulaV2;
  /** Devolve `null` quando entrou, ou a recusa — e então a janela fica aberta com o que o professor trouxe (§8.3). */
  aoAplicar: (relatorio: RelatorioImportacao, escolhidos: number[]) => string | null;
  aoFechar: () => void;
  /** Fatia 10: aplica um estudo do Lichess com os modos. Devolve a recusa, ou `null`. */
  aoImportarEstudo?: (pedido: PedidoDeImportacaoDeEstudo) => Promise<string | null>;
  positions?: Record<string, Position>;
  obras?: ObraDoRegistro[];
  professor?: string;
  /** O endereço do Lichess que a porta "Endereço do Lichess" de Adicionar capítulo trouxe. */
  enderecoInicial?: string;
  /** O PGN que "Nova aula → Importar" já buscou ou leu, para a janela abrir com ele lido. */
  textoInicial?: string;
  nomeInicial?: string | null;
}) {
  const [endereco, setEndereco] = useState(enderecoInicial);
  const [buscando, setBuscando] = useState(false);
  const [recadoDaBusca, setRecadoDaBusca] = useState<string | null>(null);
  const buscaAtual = useRef(0);
  const [aplicandoEstudo, setAplicandoEstudo] = useState(false);
  const [recusaDoEstudo, setRecusaDoEstudo] = useState<string | null>(null);
  const [recusaDoLote, setRecusaDoLote] = useState<string | null>(null);
  const [texto, setTexto] = useState(textoInicial);
  const [nomeDoArquivo, setNomeDoArquivo] = useState<string | null>(nomeInicial);
  const [relatorio, setRelatorio] = useState<RelatorioImportacao | null>(null);
  const [escolhidos, setEscolhidos] = useState<number[]>([]);
  const [lendo, setLendo] = useState(textoInicial !== "");
  /**
   * Conta as leituras pedidas. Buscar o mesmo endereço (ou subir o mesmo arquivo) de novo põe o mesmo
   * texto, que sozinho não dispara a leitura — e a janela ficava em "lendo o arquivo…" (15/9/2026).
   */
  const [leitura, setLeitura] = useState(0);
  const idsDaAula = useMemo(() => idsDaAulaV2(aula), [aula]);
  const caixa = useRef<HTMLTextAreaElement>(null);
  const janela = useRef<HTMLElement>(null);
  const tituloId = useId();

  useEffect(() => {
    caixa.current?.focus();
  }, []);

  /*
   * `Esc` fecha, e o `Tab` não sai da janela.
   *
   * A prisão de foco existe porque `aria-modal` diz ao leitor de tela que a tela
   * atrás não está lá — se o `Tab` escapasse para ela, o teclado passearia por uma
   * aula que, para quem escuta, não existe. Aqui a janela tem muitos controles, então
   * a prisão é a volta da lista: do último para o primeiro, e do primeiro para trás.
   */
  // Esc, Tab preso, atalhos de trás mudos e foco devolvido: o contrato comum de `foco.ts` (fatia 10).
  usePrisaoDeFoco(janela, aoFechar);

  /*
   * A leitura espera o professor parar de digitar.
   *
   * Ler um arquivo de 20 partidas custa cerca de 145 ms, medido. Sem esta espera, um
   * texto colado e depois ajustado à mão relê o arquivo inteiro a cada tecla — e a
   * caixa de texto trava debaixo dos dedos.
   */
  useEffect(() => {
    const relogio = setTimeout(() => {
      setLendo(false);
      if (texto.trim() === "") {
        setRelatorio(null);
        setEscolhidos([]);
        return;
      }
      const lido = lerImportacaoPgn(texto, idsDaAula);
      setRelatorio(lido);
      // Tudo o que pode entrar já vem marcado: importar o arquivo inteiro é o que o
      // professor quer quase sempre, e desmarcar dois é menos trabalho que marcar dez.
      setEscolhidos(lido.jogos.filter((jogo) => jogo.recusa === null).map((jogo) => jogo.numero));
    }, 300);
    return () => clearTimeout(relogio);
  }, [texto, leitura, idsDaAula]);

  const receberArquivo = useCallback(async (arquivo: File | null | undefined) => {
    if (!arquivo) return;
    setLendo(true);
    setNomeDoArquivo(arquivo.name);
    setTexto(await arquivo.text());
    setLeitura((n) => n + 1);
  }, []);

  /*
   * §13.2: o servidor reconhece o endereço e monta o da API oficial; o navegador só manda o texto
   * colado. Cancelar não interrompe o servidor (ele tem o próprio prazo de 20 s): a resposta que
   * chegar depois do cancelamento é ignorada, e nada entra.
   */
  const buscar = async () => {
    const numero = ++buscaAtual.current;
    setBuscando(true);
    setRecadoDaBusca(null);
    const resposta = await buscarPgnDoLichessAcao(endereco);
    if (numero !== buscaAtual.current) return;
    setBuscando(false);
    if (!resposta.ok) { setRecadoDaBusca(resposta.mensagem); return; }
    setNomeDoArquivo(`${resposta.descricao} · ${Math.ceil(resposta.bytes / 1024)} KB`);
    setLendo(true);
    setTexto(resposta.pgn);
    setLeitura((n) => n + 1);
  };
  const cancelarBusca = () => { buscaAtual.current += 1; setBuscando(false); setRecadoDaBusca("busca cancelada — nada foi importado"); };

  /** Um estudo do Lichess (tem capítulos): a leitura com os modos, em vez da lista de jogos. */
  const estudo = useMemo(() => (!lendo && aoImportarEstudo && /\[(ChapterName|StudyName|ChapterMode) "/.test(texto) ? lerEstudo(texto, idsDaAula) : null), [aoImportarEstudo, idsDaAula, lendo, texto]);

  const medida = relatorio ? medirImportacao(aula, relatorio, escolhidos) : null;
  const podeAplicar = relatorio !== null && escolhidos.length > 0 && medida !== null && medida.cabe;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-veu p-4 backdrop-blur-[2px]" onClick={aoFechar}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        ref={janela}
        onClick={(evento) => evento.stopPropagation()}
        onDragOver={(evento) => evento.preventDefault()}
        onDrop={(evento) => {
          evento.preventDefault();
          void receberArquivo(evento.dataTransfer.files?.[0]);
        }}
        className="my-8 flex w-full max-w-3xl flex-col gap-3 rounded-lg border border-borda bg-papel p-4"
      >
        <header className="flex items-start justify-between gap-3">
          <div>
            <h2 id={tituloId} className="text-base font-semibold text-tinta">Importar do Lichess ou PGN</h2>
            <p className="text-sm text-tinta-fraca">Por endereço do Lichess, arquivo ou texto colado. Nada entra na aula antes de você escolher.</p>
          </div>
          <button type="button" onClick={aoFechar} className="foco rounded-md border border-borda px-3 py-2 text-sm text-tinta hover:bg-carta-toque">Fechar</button>
        </header>

        <div className="flex flex-col gap-1 text-sm text-tinta">
          <label htmlFor={`${tituloId}-endereco`}>Endereço do Lichess — partida, capítulo ou estudo público</label>
          <div className="flex flex-wrap gap-2">
            <input
              id={`${tituloId}-endereco`}
              type="url"
              value={endereco}
              onChange={(evento) => { setEndereco(evento.currentTarget.value); setRecadoDaBusca(null); }}
              onKeyDown={(evento) => { if (evento.key === "Enter") { evento.preventDefault(); void buscar(); } }}
              placeholder="https://lichess.org/study/…"
              className="foco min-w-0 flex-1 rounded-md border border-borda bg-carta px-2 py-2 text-sm text-tinta"
            />
            {buscando
              ? <button type="button" onClick={cancelarBusca} className="foco rounded-md border border-borda px-3 py-2 text-sm text-tinta">Cancelar busca</button>
              : <button type="button" disabled={!endereco.trim()} onClick={() => void buscar()} className="foco rounded-md border border-borda px-3 py-2 text-sm text-tinta hover:bg-carta-toque disabled:opacity-40">Buscar no Lichess</button>}
          </div>
          {buscando ? <p role="status" className="text-xs text-tinta-fraca">buscando no Lichess…</p> : null}
          {recadoDaBusca ? <p role="alert" className="text-xs text-erro-texto">{recadoDaBusca}</p> : null}
        </div>

        <label className="flex flex-col gap-1 text-sm text-tinta">
          Ou cole o PGN aqui, ou arraste o arquivo para esta janela
          <textarea
            ref={caixa}
            value={texto}
            onChange={(evento) => { setLendo(true); setTexto(evento.currentTarget.value); setNomeDoArquivo(null); }}
            rows={5}
            spellCheck={false}
            placeholder={'[Event "…"]\n\n1. e4 e5 2. Nf3 …'}
            className="foco rounded-md border border-borda bg-carta px-2 py-2 font-mono text-xs text-tinta"
          />
        </label>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <input
            type="file"
            aria-label="Escolher um arquivo PGN do computador"
            accept=".pgn,text/plain"
            onChange={(evento) => void receberArquivo(evento.currentTarget.files?.[0])}
            className="foco text-xs text-tinta-fraca file:mr-2 file:rounded-md file:border file:border-borda file:bg-carta file:px-3 file:py-1 file:text-tinta"
          />
          {nomeDoArquivo ? <span className="text-xs text-tinta-fraca">{nomeDoArquivo}</span> : null}
        </div>

        {lendo ? <p className="text-sm text-tinta-fraca">lendo o arquivo…</p> : null}

        {estudo && aoImportarEstudo ? (
          <>
            <PainelDoEstudo
              aula={aula}
              leitura={estudo}
              positions={positions}
              obras={obras}
              professor={professor}
              aplicando={aplicandoEstudo}
              aoAplicar={async (pedido) => {
                setAplicandoEstudo(true);
                setRecusaDoEstudo(null);
                const recusa = await aoImportarEstudo(pedido);
                setAplicandoEstudo(false);
                if (recusa) setRecusaDoEstudo(recusa);
              }}
            />
            {recusaDoEstudo ? <p role="alert" className="rounded-md border border-erro bg-erro-superficie/10 p-2 text-sm text-erro-texto">{recusaDoEstudo}</p> : null}
          </>
        ) : relatorio && !lendo ? (
          relatorio.jogos.length === 0 ? (
            <p role="alert" className="rounded-lg border border-aviso-superficie bg-aviso-superficie/10 p-3 text-sm text-aviso-tinta">
              Não encontrei jogo nenhum neste texto. Um PGN precisa ter pelo menos um lance.
            </p>
          ) : (
            <>
              <p className="text-sm text-tinta">
                {relatorio.jogos.length} jogo(s) no arquivo · <strong>{relatorio.aproveitaveis}</strong> podem entrar
              </p>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <strong className="text-metodo-tinta">{escolhidos.length} selecionado(s) para importar</strong>
                <span className="flex gap-2">
                  <button type="button" onClick={() => setEscolhidos(relatorio.jogos.filter((jogo) => jogo.recusa === null).map((jogo) => jogo.numero))} className="foco rounded border border-borda px-2 py-1 text-tinta hover:bg-carta-toque">Selecionar todos</button>
                  <button type="button" onClick={() => setEscolhidos([])} className="foco rounded border border-borda px-2 py-1 text-tinta hover:bg-carta-toque">Desmarcar todos</button>
                </span>
              </div>
              <ul className="flex max-h-72 flex-col gap-2 overflow-y-auto rounded-md border border-borda-fraca p-2">
                {relatorio.jogos.map((jogo) => {
                  const marcado = escolhidos.includes(jogo.numero);
                  return (
                    <li key={jogo.numero} className={`rounded-md border p-2 text-sm transition-colors ${marcado ? "border-metodo-cheio bg-metodo-superficie/14" : "border-borda-fraca bg-carta"}`}>
                      <label className="flex cursor-pointer items-start gap-2">
                        <input
                          type="checkbox"
                          className="foco mt-0.5 h-4 w-4 shrink-0 accent-metodo-superficie"
                          checked={marcado}
                          disabled={jogo.recusa !== null}
                          onChange={() => setEscolhidos((atuais) => marcado ? atuais.filter((n) => n !== jogo.numero) : [...atuais, jogo.numero])}
                        />
                        <span className="min-w-0 flex-1">
                          <span className={jogo.recusa ? "text-tinta-fraca line-through" : marcado ? "font-medium text-metodo-tinta-alta" : "text-tinta"}>{jogo.titulo}</span>
                          {jogo.recusa ? null : (
                            <span className="text-tinta-fraca"> — {jogo.lances} lances, {jogo.variantes} variantes, {jogo.comentarios} comentários</span>
                          )}
                        </span>
                        {!jogo.recusa ? <strong className={`shrink-0 text-xs ${marcado ? "text-metodo-tinta" : "text-tinta-fraca"}`}>{marcado ? "incluído" : "fora"}</strong> : null}
                      </label>
                      {jogo.recusa ? (
                        <p className="ml-6 mt-1 text-xs text-erro-texto"><span className="rotulo">não entra</span> {jogo.recusa.mensagem}</p>
                      ) : null}
                      {jogo.perdas.map((perda, indice) => (
                        <p key={indice} className="ml-6 mt-1 text-xs text-aviso-tinta"><span className="rotulo">perda</span> {perda.mensagem}</p>
                      ))}
                    </li>
                  );
                })}
              </ul>
            </>
          )
        ) : null}

        {medida && !estudo ? (
          <p className={`text-sm ${medida.cabe ? "text-tinta-fraca" : "text-erro-texto"}`}>
            Com o que está marcado, a aula fica com <strong>{medida.lances}</strong> de {medida.teto} lances.
            {medida.cabe ? null : ` Passa do que o editor aguenta — desmarque capítulos até caber, ou importe em duas aulas. O limite de profundidade é ${LIMITES_V2.profundidade} meios-lances por linha.`}
          </p>
        ) : null}

        {recusaDoLote && !estudo ? <p role="alert" className="rounded-md border border-erro bg-erro-superficie/10 p-2 text-sm text-erro-texto">{recusaDoLote}</p> : null}

        <footer className="flex flex-wrap items-center justify-end gap-3 border-t border-borda-fraca pt-3">
          <button type="button" onClick={aoFechar} className="foco rounded-md border border-borda px-3 py-2 text-sm text-tinta hover:bg-carta-toque">Cancelar</button>
          <button
            type="button"
            hidden={Boolean(estudo)}
            disabled={!podeAplicar}
            onClick={() => { if (relatorio) setRecusaDoLote(aoAplicar(relatorio, escolhidos)); }}
            className="foco rounded-md bg-metodo-superficie/25 px-3 py-2 text-sm font-medium text-metodo-tinta-alta disabled:opacity-40"
          >
            {escolhidos.length === 0 ? "Escolha um capítulo" : `Importar ${escolhidos.length} capítulo(s)`}
          </button>
        </footer>
      </section>
    </div>
  );
}
