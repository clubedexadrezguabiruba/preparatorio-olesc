"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { buscarPgnDoLichessAcao, criarAulaV2 } from "@/app/editor/v2/acoes";
import { lerEstudo } from "@/lib/editor-v2/importar-estudo";
import { lerImportacaoPgn } from "@/lib/editor-v2/importar-pgn";
import { idDaNovaAula, sugestaoDaImportacao } from "@/lib/editor-v2/nova-aula";

/**
 * "Nova aula" — §5.2.
 *
 * ## O identificador aparece, e não se digita
 *
 * §5.2: "o ID é gerado/validado pelo sistema; o professor não digita IDs
 * internos". Mas ele também não pode ser invisível: o id de uma aula vira o nome
 * do arquivo, a URL e a chave do progresso do aluno, e quem cria precisa ver o
 * que vai ficar antes de confirmar. Então ele é mostrado, em tempo real,
 * desabilitado — dá para ler e conferir, e não dá para inventar um que o projeto
 * não aceita.
 *
 * ## O que esta tela promete, e o que ela avisa que não faz
 *
 * Ela cria o **rascunho v2**. Ela não põe a aula na trilha do curso: a trilha é
 * uma lista em código (`lib/finais/trilha.ts`), e acrescentar uma aula lá é
 * alteração de código. Prometer o contrário faria o professor esperar a aula
 * aparecer para o aluno, e ela não apareceria.
 *
 * ## A segunda porta: nascer importando (pedido do Doug, 14/9/2026)
 *
 * No teste humano o Doug perguntou por que digitar o título de uma aula que já
 * tem nome no Lichess. A porta "Importar do Lichess ou de um PGN" busca ou lê o
 * PGN **aqui**, antes de criar: o título vem do arquivo (`sugestaoDaImportacao`),
 * editável, e a quantidade de capítulos aparece para o professor conferir que
 * trouxe o estudo certo. Tipo, nível e classe o arquivo não sabe. Criar grava a
 * aula vazia — a mesma de sempre — e deixa o PGN nesta aba; o editor abre a
 * janela de importar já com ele lido, e é lá que se escolhe o que entra, com o
 * Desfazer de sempre. Nada muda na importação: esta porta só poupa a digitação.
 */
export function FormularioDeNovaAula() {
  const router = useRouter();
  const [comeco, setComeco] = useState<"vazia" | "importar">("vazia");
  const [endereco, setEndereco] = useState("");
  const [buscando, setBuscando] = useState(false);
  const buscaAtual = useRef(0);
  const [colado, setColado] = useState("");
  const [pgn, setPgn] = useState<{ texto: string; nome: string; jogos: number; aproveitaveis: number } | null>(null);
  const [recadoDoPgn, setRecadoDoPgn] = useState<string | null>(null);
  const tituloTocado = useRef(false);
  const [criadaSemPgn, setCriadaSemPgn] = useState<string | null>(null);
  const [titulo, setTitulo] = useState("");
  // Revisão de experiência (14/9/2026): o professor cria aula extra; aula do curso é a exceção, e pede código.
  const [tipo, setTipo] = useState<"curso" | "extra">("extra");
  const [nivel, setNivel] = useState(1);
  const [orientacaoPadrao, setOrientacaoPadrao] = useState<"white" | "black">("white");
  const [criterioDominio, setCriterioDominio] = useState<"D1" | "D2" | "D3" | "D4">("D1");
  const [classe, setClasse] = useState<"" | "E" | "D" | "C" | "B">("");
  const [erro, setErro] = useState<{ campo: string; mensagem: string } | null>(null);
  const [criando, comTransicao] = useTransition();

  const id = idDaNovaAula({ titulo, tipo, nivel });

  /** O PGN chegou (link, arquivo ou colado): conta os jogos e preenche o que o arquivo sabe. */
  function receberPgn(texto: string, nome: string, nomeDoArquivo?: string) {
    // Um estudo do Lichess conta pelos capítulos do estudo, como a janela de importar: o leitor de jogos
    // pula os capítulos só de texto (a introdução), e o professor veria 6 onde o estudo tem 9.
    const ehEstudo = /\[(ChapterName|StudyName|ChapterMode) "/.test(texto);
    const capitulosDoEstudo = ehEstudo ? lerEstudo(texto).capitulos : null;
    const relatorio = capitulosDoEstudo
      ? { jogos: capitulosDoEstudo, aproveitaveis: capitulosDoEstudo.length }
      : lerImportacaoPgn(texto);
    if (relatorio.jogos.length === 0) {
      setPgn(null);
      setRecadoDoPgn("Não encontrei jogo nenhum neste texto. Um PGN precisa ter pelo menos um lance.");
      return;
    }
    setRecadoDoPgn(null);
    setPgn({ texto, nome, jogos: relatorio.jogos.length, aproveitaveis: relatorio.aproveitaveis });
    const sugestao = sugestaoDaImportacao(texto, nomeDoArquivo);
    // O título que o professor já digitou vence a sugestão.
    if (sugestao.titulo && (!tituloTocado.current || titulo.trim() === "")) setTitulo(sugestao.titulo);
    if (sugestao.orientacao) setOrientacaoPadrao(sugestao.orientacao);
  }

  // O texto colado é lido quando o professor para de digitar, como na janela de importar.
  useEffect(() => {
    if (colado.trim() === "") return;
    const relogio = setTimeout(() => receberPgn(colado, "texto colado"), 300);
    return () => clearTimeout(relogio);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só o texto colado dispara a leitura
  }, [colado]);

  async function buscar() {
    const numero = ++buscaAtual.current;
    setBuscando(true);
    setRecadoDoPgn(null);
    const resposta = await buscarPgnDoLichessAcao(endereco);
    if (numero !== buscaAtual.current) return;
    setBuscando(false);
    if (!resposta.ok) { setPgn(null); setRecadoDoPgn(resposta.mensagem); return; }
    receberPgn(resposta.pgn, resposta.descricao);
  }

  function criar() {
    setErro(null);
    setCriadaSemPgn(null);
    comTransicao(async () => {
      const resultado = await criarAulaV2(JSON.stringify({ titulo, tipo, nivel, orientacaoPadrao, criterioDominio, ...(classe ? { classe } : {}) }));
      if (!resultado.ok) {
        setErro(resultado);
        return;
      }
      if (comeco === "importar" && pgn) {
        try {
          sessionStorage.setItem(`editor-v2-importar-ao-abrir:${resultado.id}`, JSON.stringify({ texto: pgn.texto, nome: pgn.nome }));
        } catch {
          // A aula existe; só o recado para a próxima tela não coube. Dizer isso, em vez de abrir uma aula vazia calada.
          setCriadaSemPgn(resultado.id);
          return;
        }
      }
      // §5.2: "criar abre a nova aula e oferece imediatamente Adicionar capítulo".
      router.push(`/editor/v2/finais/${resultado.id}`);
    });
  }

  const falta = comeco === "importar" && !pgn;

  return (
    <form
      onSubmit={(evento) => { evento.preventDefault(); criar(); }}
      className="cartao-vazio flex flex-col gap-4 p-4"
    >
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm text-tinta">Como a aula começa</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {([
            ["vazia", "Vazia", "Eu monto os capítulos pela tela."],
            ["importar", "Importando do Lichess ou de um PGN", "O título vem do estudo, e a aula abre na tela de importar."],
          ] as const).map(([valor, rotulo, explicacao]) => (
            <label
              key={valor}
              className={`flex cursor-pointer items-start gap-2 rounded-md border p-3 text-sm ${comeco === valor ? "border-metodo-cheio bg-metodo-superficie/14" : "border-borda-fraca bg-carta"}`}
            >
              <input
                type="radio"
                name="comeco"
                value={valor}
                checked={comeco === valor}
                onChange={() => setComeco(valor)}
                className="foco mt-0.5 accent-metodo-superficie"
              />
              <span>
                <span className={comeco === valor ? "font-medium text-metodo-tinta-alta" : "text-tinta"}>{rotulo}</span>
                <span className="block text-xs text-tinta-fraca">{explicacao}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {comeco === "importar" ? (
        <div className="flex flex-col gap-3 rounded-md border border-borda-fraca bg-carta p-3">
          <div className="flex flex-col gap-1 text-sm text-tinta">
            <label htmlFor="nova-aula-endereco">Endereço do Lichess — estudo, capítulo ou partida pública</label>
            <div className="flex flex-wrap gap-2">
              <input
                id="nova-aula-endereco"
                type="url"
                value={endereco}
                autoFocus
                onChange={(evento) => { setEndereco(evento.currentTarget.value); setRecadoDoPgn(null); }}
                onKeyDown={(evento) => { if (evento.key === "Enter") { evento.preventDefault(); if (endereco.trim()) void buscar(); } }}
                placeholder="https://lichess.org/study/…"
                className="foco min-w-0 flex-1 rounded-md border border-borda bg-papel px-2 py-2 text-sm text-tinta"
              />
              {buscando
                ? <button type="button" onClick={() => { buscaAtual.current += 1; setBuscando(false); setRecadoDoPgn("busca cancelada"); }} className="foco rounded-md border border-borda px-3 py-2 text-sm text-tinta">Cancelar busca</button>
                : <button type="button" disabled={!endereco.trim()} onClick={() => void buscar()} className="foco rounded-md border border-borda px-3 py-2 text-sm text-tinta hover:bg-carta-toque disabled:opacity-40">Buscar no Lichess</button>}
            </div>
            {buscando ? <p role="status" className="text-xs text-tinta-fraca">buscando no Lichess…</p> : null}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="text-xs text-tinta-fraca">ou</span>
            <input
              type="file"
              aria-label="Escolher um arquivo PGN do computador"
              accept=".pgn,text/plain"
              onChange={async (evento) => {
                const arquivo = evento.currentTarget.files?.[0];
                if (arquivo) receberPgn(await arquivo.text(), arquivo.name, arquivo.name);
              }}
              className="foco text-xs text-tinta-fraca file:mr-2 file:rounded-md file:border file:border-borda file:bg-papel file:px-3 file:py-1 file:text-tinta"
            />
          </div>
          <label className="flex flex-col gap-1 text-sm text-tinta">
            ou cole o PGN
            <textarea
              value={colado}
              onChange={(evento) => setColado(evento.currentTarget.value)}
              rows={3}
              spellCheck={false}
              placeholder={'[Event "…"]\n\n1. e4 e5 2. Nf3 …'}
              className="foco rounded-md border border-borda bg-papel px-2 py-2 font-mono text-xs text-tinta"
            />
          </label>
          {recadoDoPgn ? <p role="alert" className="text-sm text-erro-texto">{recadoDoPgn}</p> : null}
          {pgn ? (
            <p role="status" className="text-sm text-metodo-tinta">
              ✓ {pgn.nome}: <strong>{pgn.jogos}</strong> {pgn.jogos === 1 ? "capítulo" : "capítulos"}
              {pgn.aproveitaveis < pgn.jogos ? ` (${pgn.aproveitaveis} podem entrar)` : ""}. O título abaixo veio do arquivo — mude se quiser.
            </p>
          ) : null}
        </div>
      ) : null}

      <label className="flex flex-col gap-1 text-sm text-tinta">
        Título da aula
        <input
          type="text"
          value={titulo}
          autoFocus={comeco === "vazia"}
          onChange={(evento) => { tituloTocado.current = true; setTitulo(evento.currentTarget.value); }}
          placeholder="Peão de torre na sétima"
          aria-invalid={erro?.campo === "titulo" ? true : undefined}
          className="foco rounded-md border border-borda bg-papel px-2 py-2 text-sm text-tinta"
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm text-tinta">
          Tipo
          <select
            value={tipo}
            onChange={(evento) => {
              const novo = evento.currentTarget.value === "extra" ? "extra" : "curso";
              setTipo(novo);
              // Nível 0 não existe numa extra; a série N0 existe numa aula do curso.
              if (novo === "extra" && nivel === 0) setNivel(1);
            }}
            className="foco rounded-md border border-borda bg-papel px-2 py-2 text-sm text-tinta"
          >
            <option value="curso">Aula do curso</option>
            <option value="extra">Aula extra (EX-)</option>
          </select>
        </label>
        {tipo === "curso" ? (
          <label className="flex flex-col gap-1 text-sm text-tinta">
            Série do identificador
            <select
              value={nivel}
              onChange={(evento) => setNivel(Number(evento.currentTarget.value))}
              aria-invalid={erro?.campo === "nivel" ? true : undefined}
              className="foco rounded-md border border-borda bg-papel px-2 py-2 text-sm text-tinta"
            >
              {[0, 1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>N{n}</option>)}
            </select>
            <span className="text-xs text-tinta-fraca">Não é o nível: o nível de uma aula do curso vem da trilha.</span>
          </label>
        ) : (
          <>
            <label className="flex flex-col gap-1 text-sm text-tinta">
              Nível
              <select
                value={nivel}
                onChange={(evento) => setNivel(Number(evento.currentTarget.value))}
                aria-invalid={erro?.campo === "nivel" ? true : undefined}
                className="foco rounded-md border border-borda bg-papel px-2 py-2 text-sm text-tinta"
              >
                {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>Nível {n}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm text-tinta">
              Classe
              <select
                value={classe}
                onChange={(evento) => setClasse(evento.currentTarget.value as "" | "E" | "D" | "C" | "B")}
                aria-invalid={erro?.campo === "classe" ? true : undefined}
                className="foco rounded-md border border-borda bg-papel px-2 py-2 text-sm text-tinta"
              >
                <option value="">— escolha —</option>
                {(["E", "D", "C", "B"] as const).map((c) => <option key={c} value={c}>Classe {c}</option>)}
              </select>
            </label>
          </>
        )}
        <label className="flex flex-col gap-1 text-sm text-tinta">
          Tabuleiro visto por
          <select
            value={orientacaoPadrao}
            onChange={(evento) => setOrientacaoPadrao(evento.currentTarget.value === "black" ? "black" : "white")}
            className="foco rounded-md border border-borda bg-papel px-2 py-2 text-sm text-tinta"
          >
            <option value="white">Brancas embaixo</option>
            <option value="black">Pretas embaixo</option>
          </select>
        </label>
      </div>

      {/* O que quase nunca muda fica fechado (revisão de experiência, 14/9/2026). */}
      <details className="rounded-md border border-borda-fraca bg-carta p-3 text-sm text-tinta">
        <summary className="foco cursor-pointer text-sm text-tinta-media">Opções avançadas</summary>
        <div className="mt-3 flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm text-tinta">
            Critério de domínio
            <select
              value={criterioDominio}
              onChange={(evento) => setCriterioDominio(evento.currentTarget.value as "D1" | "D2" | "D3" | "D4")}
              className="foco rounded-md border border-borda bg-papel px-2 py-2 text-sm text-tinta"
            >
              {["D1", "D2", "D3", "D4"].map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </label>
          <p>
            Código da aula: <code className="font-mono text-xs">{id || "—"}</code>
            <span className="block text-xs text-tinta-fraca">Sai do título. É o endereço da aula e não muda depois.</span>
          </p>
        </div>
      </details>

      {erro ? <p role="alert" className="rounded-md border border-erro bg-erro-superficie/10 p-3 text-sm text-erro-texto">{erro.mensagem}</p> : null}
      {criadaSemPgn ? (
        <p role="alert" className="rounded-md border border-aviso-superficie bg-aviso-superficie/10 p-3 text-sm text-aviso-tinta">
          A aula foi criada, mas o navegador não deixou guardar o PGN para a próxima tela.{" "}
          <a href={`/editor/v2/finais/${criadaSemPgn}`} className="foco underline">Abra a aula</a> e use «Importar do Lichess ou PGN».
        </p>
      ) : null}

      <p className="text-xs text-tinta-fraca">
        {comeco === "importar"
          ? "A aula abre direto na tela de importar, onde você escolhe o que entra. "
          : "A aula abre vazia, pronta para o primeiro capítulo. "}
        {tipo === "extra"
          ? "Com nível e classe, ela entra no curso quando for publicada."
          : "Aula do curso só entra na trilha por código."}
      </p>

      <div className="flex flex-wrap justify-end gap-3">
        <a href="/editor" className="foco rounded-md border border-borda px-3 py-2 text-sm text-tinta hover:bg-carta-toque">Cancelar</a>
        <button
          type="submit"
          disabled={criando || id === "" || falta}
          className="foco rounded-md bg-metodo-superficie/25 px-3 py-2 text-sm font-medium text-metodo-tinta-alta disabled:opacity-40"
        >
          {criando ? "Criando…" : falta ? "Traga o PGN primeiro" : comeco === "importar" ? "Criar aula e importar" : "Criar aula"}
        </button>
      </div>
    </form>
  );
}
