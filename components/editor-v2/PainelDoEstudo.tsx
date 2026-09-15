"use client";

import { useId, useMemo, useState } from "react";
import type { ObraDoRegistro } from "@/lib/editor-v2/acervo-em-disco";
import { planejarEstudo, type DestinoNoEstudo, type LeituraDoEstudo } from "@/lib/editor-v2/importar-estudo";
import { ORIGENS_DA_POSICAO, type AulaV2, type OrigemDaPosicaoV2, type RevisaoDaFenV2 } from "@/lib/editor-v2/modelo";
import { ROTULO_DA_ORIGEM, origemDeTerceiro } from "@/lib/editor-v2/proveniencia";
import type { Position } from "@/lib/lesson/schema";

export type PedidoDeImportacaoDeEstudo = {
  leitura: LeituraDoEstudo;
  destinos: Record<number, DestinoNoEstudo>;
  revisao: RevisaoDaFenV2;
  /** A obra do registro para a posição da prática entrar no acervo. */
  obraDaPratica: string;
  /** Usado só se a tablebase não tiver a posição da prática no cache — o servidor avisa. */
  resultadoDaPratica: "win-white" | "win-black" | "draw";
};

const ROTULO: Record<DestinoNoEstudo, string> = { introducao: "Introdução", capitulo: "Capítulo", treino: "Treino", pratica: "Prática", fora: "Fora" };

/**
 * O estudo do Lichess antes de aplicar — §13.1, §13.2 e §12, fatia 10 (10E).
 *
 * Um seletor por capítulo com a sugestão da pista ("é uma lição interativa no Lichess"), as perdas de
 * cada um, a proveniência já preenchida (estudo do Lichess, autor e link) e o resumo do que a aula vai
 * ganhar. O plano é recalculado a cada troca, e a recusa aparece antes do botão.
 */
export function PainelDoEstudo({ aula, leitura, positions, obras, professor, aplicando, aoAplicar }: {
  aula: AulaV2;
  leitura: LeituraDoEstudo;
  positions: Record<string, Position>;
  obras: ObraDoRegistro[];
  professor: string;
  aplicando: boolean;
  aoAplicar: (pedido: PedidoDeImportacaoDeEstudo) => void;
}) {
  const [destinos, setDestinos] = useState<Record<number, DestinoNoEstudo>>(() => Object.fromEntries(leitura.capitulos.map((c) => [c.numero, c.sugerido])));
  const [origem, setOrigem] = useState<OrigemDaPosicaoV2>("estudo-lichess");
  const [autor, setAutor] = useState(leitura.estudo.autor ?? "");
  const [obra, setObra] = useState(leitura.estudo.nome ?? "");
  const [link, setLink] = useState(leitura.estudo.link ?? "");
  const [credito, setCredito] = useState(true);
  const [direito, setDireito] = useState(false);
  const [obraDaPratica, setObraDaPratica] = useState("posicoes-do-preparatorio");
  const ladoDaPratica = leitura.capitulos.find((c) => c.sugerido === "pratica")?.lado ?? "white";
  const [resultadoDaPratica, setResultadoDaPratica] = useState<PedidoDeImportacaoDeEstudo["resultadoDaPratica"]>(ladoDaPratica === "black" ? "win-black" : "win-white");
  const grupo = useId();

  const revisao: RevisaoDaFenV2 = useMemo(() => ({
    origem,
    ...(autor.trim() ? { autor: autor.trim() } : {}),
    ...(obra.trim() ? { obra: obra.trim() } : {}),
    ...(/^https?:\/\//.test(link.trim()) ? { link: link.trim() } : {}),
    fenRevisada: "8/8/8/8/8/8/8/8 w - - 0 1",
    revisadoEm: new Date().toISOString(),
    professor,
    mostrarCredito: credito,
    ...(origemDeTerceiro(origem) ? { direitoDosTextos: direito } : {}),
  }), [autor, credito, direito, link, obra, origem, professor]);

  const plano = useMemo(() => planejarEstudo(aula, leitura, { destinos, revisao }, positions), [aula, destinos, leitura, positions, revisao]);
  const contagem = (destino: DestinoNoEstudo) => leitura.capitulos.filter((c) => destinos[c.numero] === destino).length;
  const campo = "foco rounded-md border border-borda bg-papel px-2 py-1.5 text-sm text-tinta";

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-tinta">
        Estudo {leitura.estudo.nome ? <strong>«{leitura.estudo.nome}»</strong> : null} com {leitura.capitulos.length} capítulos. Escolha o que cada um vira — a sugestão vem das pistas do Lichess.
      </p>
      <ul aria-label="Capítulos do estudo" className="flex max-h-80 flex-col gap-2 overflow-y-auto rounded-md border border-borda-fraca p-2">
        {leitura.capitulos.map((c) => (
          <li key={c.numero} className={`rounded-md border p-2 text-sm ${destinos[c.numero] === "fora" ? "border-borda-fraca bg-carta" : "border-metodo-cheio bg-metodo-superficie/10"}`}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="min-w-0 flex-1">
                <span className="tabular-nums text-tinta-fraca">{String(c.numero - 1).padStart(2, "0")} · </span>
                <span className="font-medium text-tinta">{c.titulo}</span>
                <span className="block text-xs text-tinta-fraca">{c.lances} lances, {c.variantes} variantes, {c.comentarios} comentários · sugestão: {ROTULO[c.sugerido]} ({c.pista})</span>
              </span>
              <label className="flex items-center gap-1 text-xs text-tinta-fraca">
                Vira
                <select aria-label={`O que «${c.titulo}» vira`} value={destinos[c.numero]} onChange={(e) => { const valor = e.currentTarget.value as DestinoNoEstudo; setDestinos((atual) => ({ ...atual, [c.numero]: valor })); }} className={campo}>
                  {c.possiveis.map((destino) => <option key={destino} value={destino}>{ROTULO[destino]}</option>)}
                </select>
              </label>
            </div>
            {c.perdas.map((perda) => <p key={perda} className="mt-1 text-xs text-aviso-tinta"><span className="rotulo">perda</span> {perda}</p>)}
          </li>
        ))}
      </ul>
      {leitura.perdasGerais.map((perda) => <p key={perda} className="text-xs text-aviso-tinta"><span className="rotulo">perda</span> {perda}</p>)}

      <fieldset className="flex flex-col gap-2 rounded-md border border-borda-fraca p-2">
        <legend className="px-1 text-sm font-medium text-tinta">De onde vêm as posições</legend>
        <div className="flex flex-wrap gap-3">
          {ORIGENS_DA_POSICAO.map((item) => (
            <label key={item} className="flex items-center gap-1 text-xs text-tinta">
              <input type="radio" name={grupo} checked={origem === item} onChange={() => setOrigem(item)} className="foco" />
              {ROTULO_DA_ORIGEM[item].rotulo}
            </label>
          ))}
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-xs text-tinta-fraca">Autor<input value={autor} onChange={(e) => setAutor(e.currentTarget.value)} className={campo} /></label>
          <label className="flex flex-col gap-1 text-xs text-tinta-fraca">Obra ou estudo<input value={obra} onChange={(e) => setObra(e.currentTarget.value)} className={campo} /></label>
          <label className="flex flex-col gap-1 text-xs text-tinta-fraca">Link<input value={link} onChange={(e) => setLink(e.currentTarget.value)} className={campo} /></label>
        </div>
        <label className="flex items-center gap-2 text-xs text-tinta"><input type="checkbox" checked={credito} onChange={(e) => setCredito(e.currentTarget.checked)} className="foco" />Mostrar crédito ao aluno no fim da aula</label>
        {origemDeTerceiro(origem) ? (
          <label className="flex items-center gap-2 text-xs text-tinta"><input type="checkbox" checked={direito} onChange={(e) => setDireito(e.currentTarget.checked)} className="foco" />Os comentários e narrações do estudo são meus, ou tenho direito de usá-los (sem isto a aula não publica)</label>
        ) : null}
        {contagem("pratica") ? (
          <label className="flex flex-col gap-1 text-xs text-tinta-fraca">
            De que obra vem a posição da prática
            <select value={obraDaPratica} onChange={(e) => setObraDaPratica(e.currentTarget.value)} className={campo}>
              {obras.map((item) => <option key={item.slug} value={item.slug}>{item.titulo}</option>)}
            </select>
          </label>
        ) : null}
        {contagem("pratica") ? (
          <label className="flex flex-col gap-1 text-xs text-tinta-fraca">
            Resultado esperado da prática, se o curso ainda não o conhecer
            <select value={resultadoDaPratica} onChange={(e) => setResultadoDaPratica(e.currentTarget.value as PedidoDeImportacaoDeEstudo["resultadoDaPratica"])} className={campo}>
              <option value="win-white">brancas ganham</option>
              <option value="win-black">pretas ganham</option>
              <option value="draw">empate</option>
            </select>
          </label>
        ) : null}
      </fieldset>

      <p role="status" className="text-sm text-tinta">
        A aula ganha: {contagem("introducao")} quadro(s) de introdução, {contagem("capitulo")} capítulo(s), {contagem("treino")} treino(s) e {contagem("pratica")} prática.
      </p>
      {plano.ok ? plano.plano.avisos.map((aviso) => <p key={aviso} className="text-xs text-aviso-tinta"><span className="rotulo">revisar</span> {aviso}</p>) : (
        <p role="alert" className="rounded-md border border-erro bg-erro-superficie/10 p-2 text-sm text-erro-texto">{plano.mensagem}</p>
      )}
      <div className="flex justify-end">
        <button
          type="button"
          disabled={!plano.ok || aplicando}
          onClick={() => aoAplicar({ leitura, destinos, revisao, obraDaPratica, resultadoDaPratica })}
          className="foco rounded-md bg-metodo-superficie/25 px-3 py-2 text-sm font-medium text-metodo-tinta-alta disabled:opacity-40"
        >
          {aplicando ? "Importando…" : "Importar o estudo"}
        </button>
      </div>
    </div>
  );
}
