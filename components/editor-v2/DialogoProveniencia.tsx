"use client";

import { useId, useState } from "react";
import { ChessBoard } from "@/components/board/ChessBoard";
import { Dialogo } from "@/components/editor-v2/Dialogo";
import { ORIGENS_DA_POSICAO, type AulaV2, type OrigemDaPosicaoV2, type RevisaoDaFenV2 } from "@/lib/editor-v2/modelo";
import { analiseTemTexto, estadoDaProveniencia, linhaDeCredito, origemDeTerceiro, posicoesDaMesmaOrigem, prepararRevisaoDaFen, ROTULO_DA_ORIGEM, type PedidoDeRevisaoDaFen } from "@/lib/editor-v2/proveniencia";

/**
 * "De onde veio esta posição?" — §19.1 e plano §12, fatia 10.
 *
 * Um campo obrigatório só (decisão do Doug, 14/9): **De onde veio**. O resto é opcional e fica
 * recolhido até alguém querer. O botão "Registrar revisão" é a confirmação — grava a data, o
 * professor e a FEN que estava na tela. O crédito ao aluno é privado por padrão; para estudo do
 * Lichess ele já vem ligado.
 */
export function DialogoProveniencia({ aula, analiseId, professor, aoRegistrar, aoFechar }: {
  aula: AulaV2;
  analiseId: string;
  professor: string;
  /** `outras`: a mesma declaração nas posições da mesma origem, quando o professor deixa marcado. */
  aoRegistrar: (revisao: RevisaoDaFenV2, outras: Array<{ analiseId: string; revisao: RevisaoDaFenV2 }>) => void;
  aoFechar: () => void;
}) {
  const analise = aula.analises.find((item) => item.id === analiseId);
  const inicio = analise?.inicio.tipo === "fen" ? analise.inicio : null;
  const anterior = inicio?.revisao;
  const capitulo = aula.capitulos.find((item) => item.analiseId === analiseId);
  const [pedido, setPedido] = useState<PedidoDeRevisaoDaFen>(() => ({
    origem: anterior?.origem ?? "",
    autor: anterior?.autor ?? "",
    obra: anterior?.obra ?? "",
    pagina: anterior?.pagina ?? "",
    link: anterior?.link ?? "",
    licenca: anterior?.licenca ?? "",
    nota: anterior?.nota ?? "",
    mostrarCredito: anterior?.mostrarCredito ?? false,
    direitoDosTextos: anterior?.direitoDosTextos ?? false,
  }));
  const [erro, setErro] = useState<{ campo: "origem" | "link"; mensagem: string } | null>(null);
  // Achado do Doug (14/9/2026): o estudo importado inteiro recebe a mesma declaração de uma vez.
  const mesmaOrigem = posicoesDaMesmaOrigem(aula, analiseId);
  const [paraTodas, setParaTodas] = useState(true);
  const erroId = useId();
  const nomeDoGrupo = useId();

  if (!analise || !inicio) {
    return (
      <Dialogo titulo="Proveniência da posição" aoFechar={aoFechar} rodape={<button type="button" onClick={aoFechar} className="foco rounded-md border border-borda px-3 py-2 text-sm text-tinta">Fechar</button>}>
        <p className="text-sm text-tinta-media">Esta posição vem do acervo do curso: a proveniência dela está no arquivo da posição, e não aqui.</p>
      </Dialogo>
    );
  }

  const estado = estadoDaProveniencia(analise);
  const mudar = (parcial: Partial<PedidoDeRevisaoDaFen>) => {
    setPedido((atual) => ({ ...atual, ...parcial }));
    if (erro && (("origem" in parcial && erro.campo === "origem") || ("link" in parcial && erro.campo === "link"))) setErro(null);
  };
  const escolherOrigem = (origem: OrigemDaPosicaoV2) => {
    // Estudo do Lichess de outra pessoa: o crédito já vem ligado (decisão do Doug, 14/9).
    mudar({ origem, ...(!anterior && origem === "estudo-lichess" ? { mostrarCredito: true } : {}) });
  };

  const registrar = () => {
    const agora = new Date();
    const preparo = prepararRevisaoDaFen(pedido, inicio.fen, professor, agora);
    if (!preparo.ok) {
      setErro({ campo: preparo.campo, mensagem: preparo.mensagem });
      return;
    }
    const outras = (paraTodas ? mesmaOrigem : []).flatMap((outraId) => {
      const outra = aula.analises.find((item) => item.id === outraId);
      if (outra?.inicio.tipo !== "fen") return [];
      const daOutra = prepararRevisaoDaFen(pedido, outra.inicio.fen, professor, agora);
      return daOutra.ok ? [{ analiseId: outraId, revisao: daOutra.revisao }] : [];
    });
    aoRegistrar(preparo.revisao, outras);
  };

  const previaDoCredito = pedido.origem
    ? linhaDeCredito({ origem: pedido.origem, autor: pedido.autor?.trim() || undefined, obra: pedido.obra?.trim() || undefined, pagina: pedido.pagina?.trim() || undefined, fenRevisada: inicio.fen, revisadoEm: "", professor, mostrarCredito: true })
    : null;

  return (
    <Dialogo
      titulo="De onde veio esta posição?"
      descricao={capitulo ? `Capítulo «${capitulo.titulo}». Tudo aqui é opcional; sem origem, a conferência avisa.` : "Tudo aqui é opcional; sem origem, a conferência avisa."}
      largura="max-w-2xl"
      aoFechar={aoFechar}
      rodape={(
        <>
          <button type="button" onClick={aoFechar} className="foco rounded-md border border-borda px-3 py-2 text-sm text-tinta hover:bg-carta-toque">Cancelar</button>
          <button type="button" onClick={registrar} className="foco rounded-md bg-metodo-superficie/25 px-3 py-2 text-sm font-medium text-metodo-tinta-alta">Registrar revisão</button>
        </>
      )}
    >
      <div className="grid gap-4 sm:grid-cols-[10rem_minmax(0,1fr)]">
        <div className="flex flex-col gap-1">
          <div className="w-40 max-w-full"><ChessBoard fen={inicio.fen} orientation={capitulo?.orientacao ?? "white"} viewOnly /></div>
          <code className="break-all text-[0.65rem] text-tinta-fraca">{inicio.fen}</code>
        </div>
        <div className="flex flex-col gap-3">
          {estado === "caduca" && anterior ? (
            <p role="status" className="rounded-md border border-aviso-superficie bg-aviso-superficie/10 p-2 text-xs text-aviso-tinta">
              A posição mudou depois da última revisão. Antes: <code className="break-all">{anterior.fenRevisada}</code>. Confirme a origem para a posição de agora.
            </p>
          ) : null}
          {anterior && estado !== "caduca" ? (
            <p className="text-xs text-tinta-fraca">Revisada em {new Date(anterior.revisadoEm).toLocaleDateString("pt-BR")} por {anterior.professor}. Registrar de novo substitui.</p>
          ) : null}

          <fieldset aria-describedby={erro?.campo === "origem" ? erroId : undefined} className="flex flex-col gap-1">
            <legend className="mb-1 text-sm font-medium text-tinta">De onde veio <span className="text-xs font-normal text-tinta-fraca">(opcional)</span></legend>
            {ORIGENS_DA_POSICAO.map((origem) => (
              <label key={origem} className={`flex cursor-pointer items-start gap-2 rounded-md border p-2 text-sm ${pedido.origem === origem ? "border-foco bg-metodo-superficie/10" : "border-borda-fraca"}`}>
                <input type="radio" name={nomeDoGrupo} checked={pedido.origem === origem} onChange={() => escolherOrigem(origem)} className="foco mt-1" />
                <span>
                  <span className="block font-medium text-tinta">{ROTULO_DA_ORIGEM[origem].rotulo}{pedido.origem === origem ? " ✓" : ""}</span>
                  <span className="block text-xs text-tinta-fraca">{ROTULO_DA_ORIGEM[origem].ajuda}</span>
                </span>
              </label>
            ))}
          </fieldset>

          <details className="rounded-md border border-borda-fraca p-2" open={Boolean(anterior?.autor || anterior?.obra || anterior?.link)}>
            <summary className="foco cursor-pointer text-sm text-tinta">Detalhes opcionais — autor, obra, página, link, licença e nota</summary>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {([
                ["autor", "Autor"],
                ["obra", "Obra ou estudo"],
                ["pagina", "Página ou diagrama"],
                ["licenca", "Licença"],
              ] as const).map(([campo, rotulo]) => (
                <label key={campo} className="flex flex-col gap-1 text-xs text-tinta-fraca">
                  {rotulo}
                  <input type="text" value={pedido[campo] ?? ""} onChange={(e) => mudar({ [campo]: e.currentTarget.value })} className="foco rounded-md border border-borda bg-papel px-2 py-1.5 text-sm text-tinta" />
                </label>
              ))}
              <label className="flex flex-col gap-1 text-xs text-tinta-fraca sm:col-span-2">
                Link
                <input
                  type="url"
                  value={pedido.link ?? ""}
                  onChange={(e) => mudar({ link: e.currentTarget.value })}
                  placeholder="https://lichess.org/study/…"
                  aria-invalid={erro?.campo === "link" ? true : undefined}
                  aria-describedby={erro?.campo === "link" ? erroId : undefined}
                  className={`foco rounded-md border bg-papel px-2 py-1.5 text-sm text-tinta ${erro?.campo === "link" ? "border-erro" : "border-borda"}`}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-tinta-fraca sm:col-span-2">
                Nota
                <textarea rows={2} value={pedido.nota ?? ""} onChange={(e) => mudar({ nota: e.currentTarget.value })} className="foco rounded-md border border-borda bg-papel px-2 py-1.5 text-sm text-tinta" />
              </label>
            </div>
          </details>

          <label className="flex items-start gap-2 text-sm text-tinta">
            <input type="checkbox" checked={pedido.mostrarCredito} onChange={(e) => mudar({ mostrarCredito: e.currentTarget.checked })} className="foco mt-1" />
            <span>
              Mostrar crédito ao aluno
              <span className="block text-xs text-tinta-fraca">
                {pedido.mostrarCredito
                  ? previaDoCredito ? `No fim da aula, discreto: “${previaDoCredito}”.` : "Preencha autor ou obra para haver o que mostrar."
                  : "Desligado: a origem fica só no arquivo, para você."}
              </span>
            </span>
          </label>

          {pedido.origem && origemDeTerceiro(pedido.origem) ? (
            <label className="flex items-start gap-2 text-sm text-tinta">
              <input type="checkbox" checked={pedido.direitoDosTextos === true} onChange={(e) => mudar({ direitoDosTextos: e.currentTarget.checked })} className="foco mt-1" />
              <span>
                Os textos que vieram com esta posição são meus, ou tenho direito de usá-los
                <span className="block text-xs text-tinta-fraca">
                  {analiseTemTexto(aula, analise)
                    ? "Este capítulo tem narração. Sem esta marca, a conferência avisa — reescreva os textos ou marque."
                    : "Este capítulo ainda não tem narração; a marca vale para a que vier."}
                </span>
              </span>
            </label>
          ) : null}

          {mesmaOrigem.length ? (
            <label className="flex items-start gap-2 rounded-md border border-borda-fraca p-2 text-sm text-tinta">
              <input type="checkbox" checked={paraTodas} onChange={(e) => setParaTodas(e.currentTarget.checked)} className="foco mt-1" />
              <span>
                Registrar o mesmo para as outras {mesmaOrigem.length} {mesmaOrigem.length === 1 ? "posição" : "posições"} que vieram de «{anterior?.obra || anterior?.link}»
                <span className="block text-xs text-tinta-fraca">
                  {mesmaOrigem.map((outraId) => aula.capitulos.find((item) => item.analiseId === outraId)?.titulo).filter(Boolean).join(" · ") || "posições usadas pelos treinos importados"}
                </span>
              </span>
            </label>
          ) : null}

          {erro ? <p id={erroId} role="alert" className="rounded-md border border-erro bg-erro-superficie/10 p-2 text-sm text-erro-texto">{erro.mensagem}</p> : null}
        </div>
      </div>
    </Dialogo>
  );
}
