"use client";

import { useId, useMemo, useState } from "react";
import { ChessBoard } from "@/components/board/ChessBoard";
import { Dialogo } from "@/components/editor-v2/Dialogo";
import { SeletorDoAcervo } from "@/components/editor-v2/SeletorDoAcervo";
import { ROTULO_DO_RESULTADO, type PosicaoDoAcervoV2 } from "@/lib/editor-v2/acervo";
import type { AdicaoAoAcervoV2, ObraDoRegistro, PedidoDePosicaoNoAcervoV2 } from "@/lib/editor-v2/acervo-em-disco";
import { ORIGENS_DA_POSICAO, type AulaV2, type OrigemDaPosicaoV2, type PraticaV2 } from "@/lib/editor-v2/modelo";
import { ADVERSARIO_PADRAO, mudancasDeAvaliacao, prepararPratica, type PraticaPreparadaV2 } from "@/lib/editor-v2/pratica";
import { ROTULO_DA_ORIGEM, estadoDaProveniencia, prepararRevisaoDaFen } from "@/lib/editor-v2/proveniencia";
import type { Position } from "@/lib/lesson/schema";

/**
 * A prática contra o computador — §17.1, fatia 10.
 *
 * Os campos são os que o `PracticeStage` sabe jogar; os fatos que não se escolhem aparecem em
 * texto (quantas a aula quiser, no fim do fluxo). Editar posição, lado, objetivo ou adversário
 * cria nova versão da avaliação, e a janela diz isso **antes** de salvar.
 */
export function DialogoPratica({ aula, praticaId, positions, acervo, obras, professor, aoSalvar, aoExcluir, aoPrever, aoAdicionarAoAcervo, aoFechar }: {
  aula: AulaV2;
  /** `null`: prática nova. */
  praticaId: string | null;
  positions: Record<string, Position>;
  acervo: PosicaoDoAcervoV2[];
  obras: ObraDoRegistro[];
  professor: string;
  aoSalvar: (preparo: PraticaPreparadaV2, nova: boolean) => void;
  aoExcluir: (praticaId: string) => void;
  aoPrever: (pratica: PraticaV2) => void;
  aoAdicionarAoAcervo: (pedido: PedidoDePosicaoNoAcervoV2) => Promise<AdicaoAoAcervoV2>;
  aoFechar: () => void;
}) {
  const atual = praticaId ? aula.praticas.find((item) => item.id === praticaId) : undefined;
  const [titulo, setTitulo] = useState(atual?.titulo ?? "Prática contra o computador");
  const [positionId, setPositionId] = useState(atual?.positionId ?? "");
  const [lado, setLado] = useState<"white" | "black">(atual?.ladoAluno ?? "white");
  const [objetivo, setObjetivo] = useState<"win" | "draw">(atual?.objetivo ?? "win");
  const [skill, setSkill] = useState(String(atual?.engine.skill ?? ADVERSARIO_PADRAO.skill));
  const [tempo, setTempo] = useState(String(atual?.engine.moveTimeMs ?? ADVERSARIO_PADRAO.moveTimeMs));
  const [fonte, setFonte] = useState<"acervo" | "capitulo">("acervo");
  const [erro, setErro] = useState<{ campo: string; mensagem: string } | null>(null);
  const [avisos, setAvisos] = useState<string[]>([]);
  const erroId = useId();
  const grupoOrigem = useId();

  // A posição nova a partir de um capítulo desta aula.
  const capitulosComFen = useMemo(() => aula.capitulos.flatMap((capitulo) => {
    const analise = aula.analises.find((item) => item.id === capitulo.analiseId);
    if (analise?.inicio.tipo !== "fen") return [];
    return [{ capitulo, analise, fen: analise.inicio.fen }];
  }), [aula]);
  const [capituloId, setCapituloId] = useState(capitulosComFen[0]?.capitulo.id ?? "");
  const escolhido = capitulosComFen.find((item) => item.capitulo.id === capituloId);
  const revisaoDoCapitulo = escolhido && estadoDaProveniencia(escolhido.analise) === "revisada" && escolhido.analise.inicio.tipo === "fen" ? escolhido.analise.inicio.revisao : undefined;
  const [origem, setOrigem] = useState<OrigemDaPosicaoV2 | "">("");
  const [obra, setObra] = useState("");
  const [resultado, setResultado] = useState<Position["expectedResult"] | "">("");
  const [adicionando, setAdicionando] = useState(false);

  const posicao = positions[positionId];

  const pedido = { titulo, positionId, ladoAluno: lado, objetivo, skill: Number(skill), moveTimeMs: Number(tempo) };
  const doAcervo = acervo.find((item) => item.position.id === positionId);
  const registro = doAcervo ? { positionId, conteudoHash: doAcervo.conteudoHash, estado: doAcervo.position.status } : undefined;
  const preparo = prepararPratica(aula, pedido, positions, registro, atual?.id);
  const mudancas = atual && preparo.ok ? mudancasDeAvaliacao(atual, preparo.preparo.pratica, positions) : [];

  const escolherPosicao = (item: PosicaoDoAcervoV2) => {
    setPositionId(item.position.id);
    setErro(null);
    // Lado e objetivo seguem a posição: quem está na vez e o resultado esperado.
    const vez = item.position.fen.split(" ")[1] === "b" ? "black" : "white";
    setLado(item.position.expectedResult === "win-black" ? "black" : item.position.expectedResult === "win-white" ? "white" : vez);
    setObjetivo(item.position.expectedResult === "draw" ? "draw" : "win");
  };

  const adicionar = async () => {
    if (!escolhido) return;
    // "De onde veio" é opcional desde 15/9 (trava 7): sem resposta, fica desconhecida e a conferência avisa.
    const revisao = revisaoDoCapitulo ?? (() => {
      const r = prepararRevisaoDaFen({ origem: origem || "desconhecida", mostrarCredito: false }, escolhido.fen, professor, new Date());
      return r.ok ? r.revisao : null;
    })();
    if (!revisao) { setErro({ campo: "origem", mensagem: "não foi possível registrar a origem desta posição" }); return; }
    setAdicionando(true);
    try {
      const resposta = await aoAdicionarAoAcervo({ aulaId: aula.id, fen: escolhido.fen, revisao, ...(obra ? { obra } : {}), ...(resultado ? { resultadoDeclarado: resultado } : {}), etiqueta: escolhido.capitulo.titulo });
      if (!resposta.ok) {
        setErro({ campo: resposta.campo, mensagem: resposta.mensagem });
        return;
      }
      setAvisos(resposta.avisos);
      escolherPosicao(resposta.item);
      setFonte("acervo");
    } finally {
      setAdicionando(false);
    }
  };

  const salvar = () => {
    if (!preparo.ok) { setErro({ campo: preparo.campo, mensagem: preparo.mensagem }); return; }
    aoSalvar(preparo.preparo, !atual);
  };

  const campo = "foco rounded-md border border-borda bg-papel px-2 py-1.5 text-sm text-tinta";
  return (
    <Dialogo
      titulo={atual ? "Prática contra o computador" : "Nova prática contra o computador"}
      descricao="A prova final da aula: o aluno joga esta posição contra o computador."
      largura="max-w-4xl"
      aoFechar={aoFechar}
      rodape={(
        <>
          {atual ? <button type="button" onClick={() => aoExcluir(atual.id)} className="foco mr-auto rounded-md border border-erro px-3 py-2 text-sm text-erro-texto hover:bg-erro-superficie/20">Excluir prática…</button> : null}
          <button type="button" onClick={aoFechar} className="foco rounded-md border border-borda px-3 py-2 text-sm text-tinta hover:bg-carta-toque">Cancelar</button>
          <button type="button" disabled={!preparo.ok} title={preparo.ok ? undefined : preparo.mensagem} onClick={() => preparo.ok && aoPrever(preparo.preparo.pratica)} className="foco rounded-md border border-borda px-3 py-2 text-sm text-tinta hover:bg-carta-toque disabled:opacity-40">⏵ Jogar na prévia</button>
          <button type="button" onClick={salvar} className="foco rounded-md bg-metodo-superficie/25 px-3 py-2 text-sm font-medium text-metodo-tinta-alta">{atual ? "Salvar prática" : "Criar prática"}</button>
        </>
      )}
    >
      <p className="text-xs text-tinta-fraca">Entra no fim da aula. A aula pode ter mais de uma: ela só fica aprendida quando o aluno aprende todas.</p>

      <label className="flex flex-col gap-1 text-sm text-tinta">
        Título
        <input type="text" value={titulo} onChange={(e) => { setTitulo(e.currentTarget.value); setErro(null); }} aria-invalid={erro?.campo === "titulo" || undefined} className={campo} />
      </label>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_14rem]">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium text-tinta">Posição</legend>
          <div role="group" aria-label="De onde vem a posição" className="flex flex-wrap gap-2">
            {([["acervo", "Posições salvas do curso"], ["capitulo", "De um capítulo desta aula"]] as const).map(([chave, rotulo]) => (
              <button key={chave} type="button" aria-pressed={fonte === chave} onClick={() => setFonte(chave)} className={`foco rounded-md border px-3 py-1.5 text-sm ${fonte === chave ? "border-foco bg-metodo-superficie/25 text-metodo-tinta-alta" : "border-borda text-tinta hover:bg-carta-toque"}`}>
                {fonte === chave ? "✓ " : ""}{rotulo}
              </button>
            ))}
          </div>
          {fonte === "acervo" ? (
            <SeletorDoAcervo acervo={acervo} escolhida={positionId || null} aoEscolher={escolherPosicao} />
          ) : capitulosComFen.length === 0 ? (
            <p className="text-sm text-tinta-fraca">Nenhum capítulo desta aula começa numa FEN própria.</p>
          ) : (
            <div className="flex flex-col gap-2 rounded-md border border-borda-fraca p-2">
              <label className="flex flex-col gap-1 text-sm text-tinta">
                Capítulo
                <select value={capituloId} onChange={(e) => setCapituloId(e.currentTarget.value)} className={campo}>
                  {capitulosComFen.map((item) => <option key={item.capitulo.id} value={item.capitulo.id}>{item.capitulo.titulo}</option>)}
                </select>
              </label>
              {escolhido ? <code className="break-all text-xs text-tinta-fraca">{escolhido.fen}</code> : null}
              {revisaoDoCapitulo ? (
                <p className="text-xs text-tinta-fraca">Origem já registrada no capítulo: {ROTULO_DA_ORIGEM[revisaoDoCapitulo.origem].rotulo}.</p>
              ) : (
                <fieldset className="flex flex-wrap gap-2" aria-label="De onde veio a posição">
                  {ORIGENS_DA_POSICAO.filter((item) => item !== "desconhecida").map((item) => (
                    <label key={item} className="flex items-center gap-1 text-xs text-tinta">
                      <input type="radio" name={grupoOrigem} checked={origem === item} onChange={() => { setOrigem(item); setErro(null); }} className="foco" />
                      {ROTULO_DA_ORIGEM[item].rotulo}
                    </label>
                  ))}
                </fieldset>
              )}
              {(revisaoDoCapitulo?.origem ?? origem) === "obra" || (revisaoDoCapitulo?.origem ?? origem) === "estudo-lichess" ? (
                <label className="flex flex-col gap-1 text-xs text-tinta-fraca">
                  Obra do registro (opcional)
                  <select value={obra} onChange={(e) => setObra(e.currentTarget.value)} className={campo}>
                    <option value="">— escolha —</option>
                    {obras.map((item) => <option key={item.slug} value={item.slug}>{item.titulo}</option>)}
                  </select>
                </label>
              ) : null}
              <label className="flex flex-col gap-1 text-xs text-tinta-fraca">
                Resultado da posição (você decide; o motor do editor ajuda a conferir)
                <select value={resultado} onChange={(e) => { setResultado(e.currentTarget.value as Position["expectedResult"]); setErro(null); }} aria-invalid={erro?.campo === "resultado" || undefined} className={campo}>
                  <option value="">— escolha —</option>
                  {(["win-white", "win-black", "draw"] as const).map((item) => <option key={item} value={item}>{ROTULO_DO_RESULTADO[item]}</option>)}
                </select>
              </label>
              <button type="button" disabled={adicionando} onClick={() => void adicionar()} className="foco w-fit rounded-md border border-borda px-3 py-1.5 text-sm text-tinta hover:bg-carta-toque disabled:opacity-40">
                {adicionando ? "Adicionando…" : "Adicionar ao acervo e usar"}
              </button>
            </div>
          )}
        </fieldset>

        <div className="flex flex-col gap-3">
          {posicao ? (
            <div className="flex flex-col gap-1">
              <div className="w-56 max-w-full"><ChessBoard fen={posicao.fen} orientation={lado} viewOnly /></div>
              <p className="break-all text-xs text-tinta-fraca">✓ {posicao.id} · {ROTULO_DO_RESULTADO[posicao.expectedResult]}</p>
            </div>
          ) : <p className="text-xs text-tinta-fraca">Nenhuma posição escolhida.</p>}
          <fieldset className="flex flex-col gap-1 text-sm text-tinta">
            <legend className="text-sm font-medium">O aluno joga com</legend>
            {(["white", "black"] as const).map((item) => (
              <label key={item} className="flex items-center gap-2"><input type="radio" checked={lado === item} onChange={() => setLado(item)} className="foco" />{item === "white" ? "as brancas" : "as pretas"}</label>
            ))}
          </fieldset>
          <fieldset className="flex flex-col gap-1 text-sm text-tinta">
            <legend className="text-sm font-medium">Objetivo</legend>
            <label className="flex items-center gap-2"><input type="radio" checked={objetivo === "win"} onChange={() => setObjetivo("win")} className="foco" />vencer</label>
            <label className="flex items-center gap-2"><input type="radio" checked={objetivo === "draw"} onChange={() => setObjetivo("draw")} className="foco" />segurar o empate</label>
          </fieldset>
          <fieldset className="flex flex-col gap-1 text-sm text-tinta">
            <legend className="text-sm font-medium">Computador</legend>
            <label className="flex items-center justify-between gap-2 text-xs">Nível do computador (0 a 20)<input type="number" min={0} max={20} value={skill} onChange={(e) => setSkill(e.currentTarget.value)} className={`${campo} w-20`} /></label>
            <label className="flex items-center justify-between gap-2 text-xs">Tempo por lance (ms)<input type="number" min={50} max={5000} step={50} value={tempo} onChange={(e) => setTempo(e.currentTarget.value)} className={`${campo} w-20`} /></label>
            <span className="text-xs text-tinta-fraca">Padrão: força {ADVERSARIO_PADRAO.skill}, {ADVERSARIO_PADRAO.moveTimeMs} ms.</span>
          </fieldset>
        </div>
      </div>

      {mudancas.length ? (
        <p role="status" className="rounded-md border border-aviso-superficie bg-aviso-superficie/10 p-2 text-sm text-aviso-tinta">
          Mudar {mudancas.join(", ")} cria uma <strong>nova versão da avaliação</strong>: quem já dominou a versão de antes guarda a conquista no histórico, e a nova fica pendente. Título não muda a versão.
        </p>
      ) : null}
      {avisos.map((aviso) => <p key={aviso} role="status" className="text-xs text-aviso-tinta">{aviso}</p>)}
      {erro ? <p id={erroId} role="alert" className="rounded-md border border-erro bg-erro-superficie/10 p-2 text-sm text-erro-texto">{erro.mensagem}</p> : null}
    </Dialogo>
  );
}
