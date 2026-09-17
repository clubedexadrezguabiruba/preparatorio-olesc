"use client";

import Link from "next/link";
import { useState } from "react";
import {
  aplicarRepertorioDoCursoAcao, buscarEstudoDoCursoAcao, gravarCursoDeAberturaAcao, lerCursoDeAberturaAcao,
  type LeituraDoCursoNaTela,
} from "@/app/editor/v2/curso-de-abertura/acoes";
import type { GravacaoDoCurso } from "@/lib/editor-v2/importar-curso";

/**
 * A tela de importar curso de abertura (spec §13.3.8 e §21). Três passos, na ordem em que o professor
 * decide:
 *
 * 1. **Ler** — o link do Lichess, o arquivo ou o texto colado; a tela mostra, por capítulo, a aula, o
 *    papel, os ramos e as paradas, os avisos do estudo e o que muda em cada aula.
 * 2. **Criar ou substituir as aulas** — rascunhos em `.editor/v2/`, com cópia de segurança de cada
 *    rascunho que muda.
 * 3. **Aplicar o PGN do repertório** — só quando ele compila; a tela diz que linhas nascem e quais
 *    morrem (o progresso delas zera), e pede confirmação.
 */

type Abertura = { cor: string; abertura: string; nome: string };

const PAPEL: Record<string, string> = { aula: "aula", treinador: "move trainer", "partida-modelo": "partida modelo", revisao: "revisão", vazio: "fora" };
const SITUACAO: Record<string, string> = { nova: "nova", igual: "igual ao rascunho", muda: "muda — cópia de segurança antes" };

export function ImportarCursoDeAbertura({ aberturas }: { aberturas: Abertura[] }) {
  const francesa = aberturas.find((a) => a.cor === "brancas" && a.abertura === "francesa") ?? aberturas[0];
  const [escolha, setEscolha] = useState(francesa ? `${francesa.cor}/${francesa.abertura}` : "");
  const [nome, setNome] = useState(francesa?.nome ?? "");
  const [link, setLink] = useState("");
  const [texto, setTexto] = useState("");
  const [origem, setOrigem] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<null | "buscar" | "ler" | "gravar" | "aplicar">(null);
  const [recado, setRecado] = useState<string | null>(null);
  const [leitura, setLeitura] = useState<LeituraDoCursoNaTela | null>(null);
  const [gravacao, setGravacao] = useState<GravacaoDoCurso | null>(null);
  const [confirmarRepertorio, setConfirmarRepertorio] = useState(false);
  const [repertorioAplicado, setRepertorioAplicado] = useState<string | null>(null);

  const [cor, abertura] = escolha.split("/");
  const pedido = { texto, cor, abertura, nome };
  const limparResultado = () => { setLeitura(null); setGravacao(null); setConfirmarRepertorio(false); setRepertorioAplicado(null); };

  const buscar = async () => {
    setOcupado("buscar");
    setRecado(null);
    const resposta = await buscarEstudoDoCursoAcao(link);
    setOcupado(null);
    if (!resposta.ok) { setRecado(resposta.mensagem); return; }
    setTexto(resposta.texto);
    setOrigem(`link ${link.trim()}`);
    limparResultado();
  };

  const ler = async () => {
    setOcupado("ler");
    setRecado(null);
    limparResultado();
    const resposta = await lerCursoDeAberturaAcao(pedido);
    setOcupado(null);
    if (!resposta.ok) { setRecado(resposta.mensagem); return; }
    setLeitura(resposta);
  };

  const gravar = async () => {
    setOcupado("gravar");
    setRecado(null);
    const resposta = await gravarCursoDeAberturaAcao(pedido);
    setOcupado(null);
    if (!resposta.ok) { setRecado(resposta.mensagem); return; }
    setGravacao(resposta.gravacao);
  };

  const aplicar = async () => {
    if (!leitura?.repertorio.ok) return;
    setOcupado("aplicar");
    setRecado(null);
    const resposta = await aplicarRepertorioDoCursoAcao({ ...pedido, impactoHash: leitura.repertorio.impactoHash });
    setOcupado(null);
    setConfirmarRepertorio(false);
    if (!resposta.ok) { setRecado([resposta.mensagem, ...(resposta.problemas ?? []).slice(0, 5)].join(" — ")); return; }
    setRepertorioAplicado(`${cor}-${abertura}.pgn`);
  };

  const campo = "foco rounded-md border border-borda bg-papel px-2 py-2 text-sm text-tinta";
  const botao = "foco min-h-11 rounded-md px-4 py-2 text-sm font-medium ring-1 transition disabled:cursor-not-allowed disabled:opacity-60";
  const principal = `${botao} bg-metodo-cheio text-tinta-inversa ring-metodo/30 hover:bg-metodo-cheio-toque`;
  const secundario = `${botao} text-tinta ring-borda hover:bg-carta-toque`;

  return (
    <div className="flex flex-col gap-5">
      <section className="cartao flex flex-col gap-3 p-4" aria-labelledby="passo-1">
        <h2 id="passo-1" className="text-base font-semibold text-tinta">1. O estudo</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm text-tinta">
            Abertura do repertório
            <select
              value={escolha}
              onChange={(evento) => {
                setEscolha(evento.currentTarget.value);
                const achada = aberturas.find((a) => `${a.cor}/${a.abertura}` === evento.currentTarget.value);
                if (achada) setNome(achada.nome);
                limparResultado();
              }}
              className={campo}
            >
              {aberturas.map((a) => <option key={`${a.cor}/${a.abertura}`} value={`${a.cor}/${a.abertura}`}>{a.nome} ({a.cor})</option>)}
            </select>
            <span className="text-xs text-tinta-fraca">O tabuleiro fica do lado das {cor}, a cor do curso — não do que o estudo diz.</span>
          </label>
          <label className="flex flex-col gap-1 text-sm text-tinta">
            Nome como o aluno lê
            <input type="text" value={nome} onChange={(evento) => { setNome(evento.currentTarget.value); limparResultado(); }} className={campo} />
          </label>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="link-do-estudo" className="text-sm text-tinta">Link do estudo no Lichess</label>
          <div className="flex flex-wrap gap-2">
            <input id="link-do-estudo" type="url" value={link} onChange={(evento) => setLink(evento.currentTarget.value)} placeholder="https://lichess.org/study/qq2xorDl" className={`${campo} min-w-0 flex-1`} />
            <button type="button" onClick={buscar} disabled={!link.trim() || ocupado !== null} className={secundario}>
              {ocupado === "buscar" ? "Buscando…" : "Buscar"}
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="text-xs text-tinta-fraca">ou</span>
          <input
            type="file"
            aria-label="Escolher o arquivo PGN do estudo"
            accept=".pgn,text/plain"
            onChange={async (evento) => {
              const arquivo = evento.currentTarget.files?.[0];
              if (!arquivo) return;
              setTexto(await arquivo.text());
              setOrigem(`arquivo ${arquivo.name}`);
              limparResultado();
            }}
            className="foco text-xs text-tinta-fraca file:mr-2 file:rounded-md file:border file:border-borda file:bg-papel file:px-3 file:py-1 file:text-tinta"
          />
        </div>
        <label className="flex flex-col gap-1 text-sm text-tinta">
          ou cole o PGN
          <textarea
            value={texto}
            onChange={(evento) => { setTexto(evento.currentTarget.value); setOrigem("texto colado"); limparResultado(); }}
            rows={4}
            spellCheck={false}
            className={`${campo} font-mono text-xs`}
          />
        </label>
        {origem && texto ? <p role="status" className="text-xs text-tinta-fraca">Estudo carregado ({origem}, {texto.length.toLocaleString("pt-BR")} caracteres).</p> : null}
        <div>
          <button type="button" onClick={ler} disabled={!texto.trim() || ocupado !== null} className={principal}>
            {ocupado === "ler" ? "Lendo…" : "Ler o estudo"}
          </button>
        </div>
      </section>

      {recado ? <p role="alert" className="rounded-md border border-erro bg-erro-superficie/10 p-3 text-sm text-erro-texto">{recado}</p> : null}

      {leitura ? (
        <>
          <section className="cartao flex flex-col gap-3 p-4" aria-labelledby="passo-2">
            <h2 id="passo-2" className="text-base font-semibold text-tinta">2. As aulas</h2>
            {leitura.estudo ? <p className="text-xs text-tinta-fraca">Fonte: {leitura.estudo}</p> : null}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-tinta-fraca">
                  <tr><th className="py-1 pr-3 font-medium">Aula</th><th className="py-1 pr-3 font-medium">Etapas</th><th className="py-1 pr-3 font-medium">Paradas</th><th className="py-1 pr-3 font-medium">Ramos</th><th className="py-1 pr-3 font-medium">Move trainer</th><th className="py-1 font-medium">Situação</th></tr>
                </thead>
                <tbody className="tabular-nums text-tinta">
                  {leitura.aulas.map((aula) => (
                    <tr key={aula.id} className="border-t border-borda-fraca">
                      <td className="py-1.5 pr-3"><span className="font-medium">{aula.bloco === "EF" ? "E+F" : aula.bloco}</span> <span className="text-xs text-tinta-fraca">{aula.id}</span></td>
                      <td className="py-1.5 pr-3">{aula.depois.etapas}</td>
                      <td className="py-1.5 pr-3">{aula.paradas}</td>
                      <td className="py-1.5 pr-3">{aula.ramos}</td>
                      <td className="py-1.5 pr-3">{aula.linhasDoTreinador ? `${aula.linhasDoTreinador} linhas` : "—"}</td>
                      <td className="py-1.5">{SITUACAO[aula.situacao]}{aula.antes && aula.situacao === "muda" ? ` (${aula.antes.etapas} → ${aula.depois.etapas} etapas)` : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <details className="rounded-md border border-borda-fraca p-3">
              <summary className="foco cursor-pointer text-sm text-tinta-media">Capítulo por capítulo ({leitura.relatorio.length})</summary>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-tinta-fraca">
                    <tr><th className="py-1 pr-2 font-medium">Código</th><th className="py-1 pr-2 font-medium">Título</th><th className="py-1 pr-2 font-medium">Aula</th><th className="py-1 pr-2 font-medium">Papel</th><th className="py-1 pr-2 font-medium">Ramos</th><th className="py-1 font-medium">Paradas</th></tr>
                  </thead>
                  <tbody className="tabular-nums text-tinta">
                    {leitura.relatorio.map((c) => (
                      <tr key={c.codigo} className="border-t border-borda-fraca">
                        <td className="py-1 pr-2 font-mono">{c.codigo}</td>
                        <td className="py-1 pr-2">{c.titulo}</td>
                        <td className="py-1 pr-2">{c.aula === "EF" ? "E+F" : c.aula ?? "—"}</td>
                        <td className="py-1 pr-2">{PAPEL[c.papel] ?? c.papel}</td>
                        <td className="py-1 pr-2">{c.ramos || "—"}</td>
                        <td className="py-1">{c.perguntas ? `${c.paradas} de ${c.perguntas}` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>

            {leitura.avisos.length ? (
              <details className="rounded-md border border-aviso-superficie/40 bg-aviso-superficie/5 p-3" open>
                <summary className="foco cursor-pointer text-sm font-medium text-aviso-tinta">O que corrigir no Lichess ({leitura.avisos.length})</summary>
                <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-xs text-tinta">
                  {leitura.avisos.map((aviso, i) => <li key={i}>{aviso.capitulo ? <strong>{aviso.capitulo}: </strong> : null}{aviso.mensagem}</li>)}
                </ul>
              </details>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={gravar} disabled={ocupado !== null} className={principal}>
                {ocupado === "gravar" ? "Gravando…" : leitura.aulas.some((a) => a.situacao === "muda") ? "Substituir as aulas" : "Criar as aulas"}
              </button>
              <span className="text-xs text-tinta-fraca">Rascunhos no editor. Publicar é aula por aula, pelo Conferir.</span>
            </div>
            {gravacao ? (
              <ul role="status" className="flex flex-col gap-1 text-sm">
                {gravacao.map((g) => (
                  <li key={g.id} className={g.ok ? "text-tinta" : "text-erro-texto"}>
                    {g.ok ? "✓" : "✗"} <Link href={`/editor/v2/finais/${g.id}`} className="foco underline">{g.id}</Link>
                    {" — "}{g.ok ? (g.situacao === "igual" ? "já estava igual" : g.situacao === "nova" ? "criada" : "substituída, com cópia de segurança") : g.erro}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          <section className="cartao flex flex-col gap-3 p-4" aria-labelledby="passo-3">
            <h2 id="passo-3" className="text-base font-semibold text-tinta">3. O PGN do repertório</h2>
            {leitura.repertorio.ok ? (
              <>
                <p className="text-sm text-tinta">
                  {cor}-{abertura}.pgn gerado do estudo: <strong className="tabular-nums">{leitura.repertorio.linhas}</strong> linhas.
                  {" "}Nascem <strong className="tabular-nums">{leitura.repertorio.nascem}</strong>; morrem <strong className="tabular-nums">{leitura.repertorio.morrem.length}</strong>
                  {leitura.repertorio.textoMudou ? <>; muda o texto de <strong className="tabular-nums">{leitura.repertorio.textoMudou}</strong></> : null}.
                </p>
                {leitura.repertorio.morrem.length ? (
                  <p className="text-xs text-aviso-tinta">O progresso dos alunos nestas linhas zera: {leitura.repertorio.morrem.join(", ")}.</p>
                ) : null}
                {repertorioAplicado ? (
                  <p role="status" className="text-sm text-metodo-tinta">✓ {repertorioAplicado} aplicado, e o estudo guardado como rascunho da fonte.</p>
                ) : confirmarRepertorio ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-tinta">Aplicar agora? O arquivo escrito à mão é substituído.</span>
                    <button type="button" onClick={aplicar} disabled={ocupado !== null} className={principal}>{ocupado === "aplicar" ? "Aplicando…" : "Sim, aplicar"}</button>
                    <button type="button" onClick={() => setConfirmarRepertorio(false)} disabled={ocupado !== null} className={secundario}>Cancelar</button>
                  </div>
                ) : (
                  <div><button type="button" onClick={() => setConfirmarRepertorio(true)} disabled={ocupado !== null} className={principal}>Aplicar o PGN do repertório</button></div>
                )}
              </>
            ) : (
              <>
                <p className="text-sm text-tinta">O PGN gerado ainda não entra no repertório: {leitura.repertorio.motivo}.</p>
                <ul className="flex list-disc flex-col gap-1 pl-5 text-xs text-erro-texto">
                  {leitura.repertorio.problemas.slice(0, 12).map((problema, i) => <li key={i}>{problema}</li>)}
                </ul>
                <p className="text-xs text-tinta-fraca">Corrija no Lichess, busque de novo e leia outra vez. As aulas podem ser criadas antes; o move trainer delas só publica depois.</p>
              </>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
