"use client";

import { useMemo, useState } from "react";
import type { DrawShape } from "@lichess-org/chessground/draw";
import { ChessBoard } from "@/components/board/ChessBoard";
import { desenhoDaAutoriaV2 } from "@/lib/chess/annotations";
import { quadroDoNo } from "@/lib/editor-v2/arvore";
import {
  catalogoComErro,
  efeitoAoTrocarTipo,
  prepararEdicaoDeTreino,
  proximoIdDeResposta,
  type CatalogoV2,
  type EdicaoDeTreinoV2,
} from "@/lib/editor-v2/autoria-treino";
import { desenhoDeFormas } from "@/lib/editor-v2/desenhos";
import type { AulaV2, QuestaoTreinoV2, RespostaTreinoV2, TreinoV2 } from "@/lib/editor-v2/modelo";
import type { Position } from "@/lib/lesson/schema";
import { Dialogo } from "./Dialogo";

const NOMES_DO_FIM: Record<Extract<RespostaTreinoV2["efeito"], { tipo: "encerra" }>["condicao"], string> = {
  mate: "Mate",
  promotion: "Promoção",
  "draw-secured": "Empate pelas regras",
  "tablebase-win": "Vitória certificada",
  "objetivo-autoral": "Objetivo autoral alcançado",
};

function clonar<T>(valor: T): T {
  return structuredClone(valor);
}

function efeitoModelo(questao: QuestaoTreinoV2): RespostaTreinoV2["efeito"] {
  return clonar(questao.respostas.find((resposta) => resposta.julgamento !== "erro")?.efeito
    ?? { tipo: "repete" as const });
}

function movimentos(texto: string): string[] {
  return texto.split(/[\s,;]+/).map((item) => item.trim().toLowerCase()).filter(Boolean);
}

export function DialogoEditarTreino({ aula, treinoId, positions, aoSalvar, aoFechar }: {
  aula: AulaV2;
  treinoId: string;
  positions: Record<string, Position>;
  aoSalvar: (edicao: EdicaoDeTreinoV2) => void;
  aoFechar: () => void;
}) {
  const original = aula.treinos.find((item) => item.id === treinoId)!;
  const [treino, setTreino] = useState<TreinoV2>(() => clonar(original));
  const [catalogo, setCatalogo] = useState<CatalogoV2 | undefined>(() => aula.catalogo ? clonar(aula.catalogo) : undefined);
  const [questaoId, setQuestaoId] = useState(original.questoes[0].id);
  const questao = treino.questoes.find((item) => item.id === questaoId) ?? treino.questoes[0];
  const indiceQuestao = treino.questoes.indexOf(questao);
  const fen = quadroDoNo(aula, questao.posicao.analiseId, questao.posicao.nodeId, positions).fen;
  const resultado = useMemo(() => prepararEdicaoDeTreino(aula, { treino, catalogo }, positions), [aula, catalogo, positions, treino]);

  const atualizarQuestao = (muda: (atual: QuestaoTreinoV2) => QuestaoTreinoV2) => {
    setTreino((atual) => ({ ...atual, questoes: atual.questoes.map((item) => item.id === questao.id ? muda(item) : item) }));
  };
  const atualizarResposta = (respostaId: string, muda: (atual: RespostaTreinoV2) => RespostaTreinoV2) => {
    atualizarQuestao((atual) => ({ ...atual, respostas: atual.respostas.map((item) => item.id === respostaId ? muda(item) : item) }));
  };

  const adicionarResposta = (julgamento: RespostaTreinoV2["julgamento"]) => {
    const id = proximoIdDeResposta(aula, treino, questao.id);
    if (julgamento === "erro") {
      const numero = (catalogo?.erros.length ?? aula.catalogo?.erros.length ?? 0) + 1;
      const novo = catalogoComErro(aula, catalogo, `Erro conhecido ${numero}`, "Explique por que este lance não serve.");
      setCatalogo(novo.catalogo);
      atualizarQuestao((atual) => ({ ...atual, respostas: [...atual.respostas, {
        id, moves: ["a1a2"], julgamento: "erro", erroId: novo.erroId,
        feedback: "Explique o erro e peça ao aluno que tente de novo.", efeito: { tipo: "repete" },
      }] }));
      return;
    }
    atualizarQuestao((atual) => ({ ...atual, respostas: [...atual.respostas, {
      id, moves: ["a1a2"], julgamento,
      feedback: julgamento === "alternativa" ? "Este lance funciona, mas segue outro método." : "Boa escolha. Continue.",
      efeito: efeitoModelo(atual),
    }] }));
  };

  const mudarJulgamento = (resposta: RespostaTreinoV2, julgamento: RespostaTreinoV2["julgamento"]) => {
    if (julgamento === "erro" && !resposta.erroId) {
      const numero = (catalogo?.erros.length ?? aula.catalogo?.erros.length ?? 0) + 1;
      const novo = catalogoComErro(aula, catalogo, `Erro conhecido ${numero}`, "Explique por que este lance não serve.");
      setCatalogo(novo.catalogo);
      atualizarResposta(resposta.id, (atual) => ({ ...atual, julgamento, erroId: novo.erroId, efeito: { tipo: "repete" } }));
      return;
    }
    atualizarResposta(resposta.id, (atual) => julgamento === "erro"
      ? { ...atual, julgamento, efeito: { tipo: "repete" } }
      : { ...atual, julgamento, erroId: undefined });
  };

  return (
    <Dialogo
      titulo={`Editar treino — ${original.titulo}`}
      descricao="Cada resposta aceita precisa chegar a outra pergunta, repetir deliberadamente ou terminar numa condição comprovável. Salvar é uma única ação de Desfazer."
      largura="max-w-6xl"
      aoFechar={aoFechar}
      rodape={(
        <>
          <span className={`mr-auto text-xs ${resultado.ok ? "text-metodo-tinta" : "text-erro-texto"}`} role={resultado.ok ? undefined : "alert"}>
            {resultado.ok ? "Todas as respostas têm continuação ou término executável." : resultado.mensagem}
          </span>
          <button type="button" onClick={aoFechar} className="foco rounded-md border border-borda px-3 py-2 text-sm text-tinta">Cancelar</button>
          <button type="button" disabled={!resultado.ok} onClick={() => { if (resultado.ok) aoSalvar(resultado.edicao); }} className="foco rounded-md bg-metodo-superficie px-3 py-2 text-sm font-semibold text-metodo-tinta-alta disabled:opacity-40">Salvar autoria</button>
        </>
      )}
    >
      <div className="grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <aside className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm text-tinta">Título
            <input value={treino.titulo} onChange={(e) => setTreino({ ...treino, titulo: e.currentTarget.value })} className="foco rounded-md border border-borda bg-papel px-2 py-2" />
          </label>
          <label className="flex flex-col gap-1 text-sm text-tinta">Objetivo
            <textarea value={treino.objetivo} onChange={(e) => setTreino({ ...treino, objetivo: e.currentTarget.value })} rows={3} className="foco resize-y rounded-md border border-borda bg-papel p-2" />
          </label>
          <label className="flex flex-col gap-1 text-sm text-tinta">Explicação ao concluir
            <textarea value={treino.explicacaoConclusao ?? ""} onChange={(e) => setTreino({ ...treino, explicacaoConclusao: e.currentTarget.value || undefined })} rows={3} placeholder="O que o aluno deve entender no fim" className="foco resize-y rounded-md border border-borda bg-papel p-2" />
          </label>
          <fieldset className="rounded-md border border-borda p-2">
            <legend className="px-1 text-sm font-medium text-tinta">Término de segurança</legend>
            <select value={treino.termino.tipo} onChange={(e) => {
              const tipo = e.currentTarget.value as TreinoV2["termino"]["tipo"];
              setTreino({ ...treino, termino: tipo === "limite" ? { tipo, maxPlies: treino.termino.maxPlies ?? 20 } : { tipo } });
            }} className="foco w-full rounded-md border border-borda bg-papel px-2 py-2 text-sm text-tinta">
              <option value="objetivo">Pelo objetivo dos ramos</option><option value="mate">Ao dar mate</option><option value="limite">Limite de meios-lances</option>
            </select>
            {treino.termino.tipo === "limite" ? <input aria-label="Máximo de meios-lances" type="number" min={1} value={treino.termino.maxPlies ?? 20} onChange={(e) => setTreino({ ...treino, termino: { tipo: "limite", maxPlies: Number(e.currentTarget.value) } })} className="foco mt-2 w-full rounded-md border border-borda bg-papel px-2 py-2 text-sm text-tinta" /> : null}
          </fieldset>
          <nav aria-label="Perguntas do treino" className="flex flex-col gap-1">
            {treino.questoes.map((item, indice) => <button key={item.id} type="button" onClick={() => setQuestaoId(item.id)} className={`foco rounded-md border px-2 py-2 text-left text-sm ${item.id === questao.id ? "border-foco bg-metodo-superficie text-metodo-tinta-alta" : "border-borda text-tinta"}`}>Pergunta {indice + 1} · {item.respostas.length} resposta{item.respostas.length === 1 ? "" : "s"}</button>)}
          </nav>
        </aside>

        <section className="flex min-w-0 flex-col gap-3">
          <div className="grid gap-3 md:grid-cols-[15rem_minmax(0,1fr)]">
            <div>
              <h3 className="mb-2 text-sm font-semibold text-tinta">Pergunta {indiceQuestao + 1}</h3>
              <ChessBoard fen={fen} orientation={treino.ladoAluno} viewOnly shapes={desenhoDaAutoriaV2(questao.desenhos)} />
              <p className="mt-2 break-all text-[11px] text-tinta-fraca">{fen}</p>
            </div>
            <div className="flex flex-col gap-2">
              <label className="flex flex-col gap-1 text-sm text-tinta">Dica sob demanda
                <textarea value={questao.dica ?? ""} onChange={(e) => { const valor = e.currentTarget.value; atualizarQuestao((atual) => ({ ...atual, dica: valor || undefined })); }} rows={3} className="foco resize-y rounded-md border border-borda bg-papel p-2" />
              </label>
              <div className="rounded-md border border-borda p-2">
                <p className="text-sm font-medium text-tinta">Desenho da dica</p>
                <p className="text-xs text-tinta-fraca">Use o botão direito no tabuleiro para desenhar; Shift vermelho, Alt azul e Shift+Alt amarelo.</p>
                <ChessBoard
                  key={`dica-${questao.id}`}
                  fen={fen}
                  orientation={treino.ladoAluno}
                  desenhavel={{ shapes: desenhoDaAutoriaV2(questao.desenhos), onChange: (formas: DrawShape[]) => atualizarQuestao((atual) => ({ ...atual, desenhos: desenhoDeFormas(formas) })) }}
                  espessuraDeDesenhoUniforme
                />
                <button type="button" onClick={() => atualizarQuestao((atual) => ({ ...atual, desenhos: undefined }))} className="foco mt-2 rounded-md border border-borda px-2 py-1 text-xs text-tinta">Apagar desenho da dica</button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => adicionarResposta("correta")} className="foco rounded-md border border-borda px-2 py-1 text-xs text-tinta">+ Resposta correta</button>
            <button type="button" onClick={() => adicionarResposta("alternativa")} className="foco rounded-md border border-borda px-2 py-1 text-xs text-tinta">+ Correta fora do método</button>
            <button type="button" onClick={() => adicionarResposta("erro")} className="foco rounded-md border border-borda px-2 py-1 text-xs text-tinta">+ Erro conhecido</button>
          </div>

          {questao.respostas.map((resposta, indice) => {
            const erro = resposta.erroId ? catalogo?.erros.find((item) => item.id === resposta.erroId) : undefined;
            return <article key={resposta.id} className="rounded-md border border-borda p-3">
              <div className="flex items-center justify-between gap-2"><h4 className="text-sm font-semibold text-tinta">Resposta {indice + 1}</h4><button type="button" onClick={() => atualizarQuestao((atual) => ({ ...atual, respostas: atual.respostas.filter((item) => item.id !== resposta.id) }))} className="foco rounded-md border border-borda px-2 py-1 text-xs text-tinta">Remover</button></div>
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                <label className="flex flex-col gap-1 text-xs text-tinta">Lance(s) UCI, separados por vírgula
                  <input value={resposta.moves.join(", ")} onChange={(e) => { const valor = e.currentTarget.value; atualizarResposta(resposta.id, (atual) => ({ ...atual, moves: movimentos(valor) })); }} className="foco rounded-md border border-borda bg-papel px-2 py-2 text-sm" />
                </label>
                <label className="flex flex-col gap-1 text-xs text-tinta">Julgamento
                  <select value={resposta.julgamento} onChange={(e) => mudarJulgamento(resposta, e.currentTarget.value as RespostaTreinoV2["julgamento"])} className="foco rounded-md border border-borda bg-papel px-2 py-2 text-sm"><option value="correta">Correta no método</option><option value="alternativa">Correta fora do método</option><option value="erro">Erro conhecido</option></select>
                </label>
              </div>
              <label className="mt-2 flex flex-col gap-1 text-xs text-tinta">Feedback desta resposta
                <textarea value={resposta.feedback} onChange={(e) => { const valor = e.currentTarget.value; atualizarResposta(resposta.id, (atual) => ({ ...atual, feedback: valor })); }} rows={2} className="foco resize-y rounded-md border border-borda bg-papel p-2 text-sm" />
              </label>
              {resposta.julgamento === "erro" ? (
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  <label className="flex flex-col gap-1 text-xs text-tinta">Nome do erro conhecido
                    <input value={erro?.nome ?? ""} onChange={(e) => { const valor = e.currentTarget.value; setCatalogo((atual) => atual ? ({ ...atual, erros: atual.erros.map((item) => item.id === resposta.erroId ? { ...item, nome: valor } : item) }) : atual); }} className="foco rounded-md border border-borda bg-papel px-2 py-2 text-sm" />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-tinta">Explicação do erro
                    <textarea value={erro?.texto ?? ""} onChange={(e) => { const valor = e.currentTarget.value; setCatalogo((atual) => atual ? ({ ...atual, erros: atual.erros.map((item) => item.id === resposta.erroId ? { ...item, texto: valor } : item) }) : atual); }} rows={2} className="foco resize-y rounded-md border border-borda bg-papel p-2 text-sm" />
                  </label>
                </div>
              ) : (
                <div className="mt-2 rounded-md border border-borda-fraca p-2">
                  <label className="flex flex-col gap-1 text-xs text-tinta">Depois desta resposta
                    <select value={resposta.efeito.tipo} onChange={(e) => {
                      const tipo = e.currentTarget.value as RespostaTreinoV2["efeito"]["tipo"];
                      const proxima = treino.questoes[indiceQuestao + 1] ?? treino.questoes[0];
                      const noDocumento = original.questoes.flatMap((item) => item.respostas).find((item) => item.id === resposta.id)?.efeito;
                      atualizarResposta(resposta.id, (atual) => ({ ...atual, efeito: efeitoAoTrocarTipo(tipo, { proximaQuestaoId: proxima.id, original: noDocumento }) }));
                    }} className="foco rounded-md border border-borda bg-papel px-2 py-2 text-sm"><option value="avanca">Defensor responde e avança</option><option value="repete">Aceita e repete esta pergunta</option><option value="encerra">Encerra o ramo</option></select>
                  </label>
                  {resposta.efeito.tipo === "avanca" ? resposta.efeito.defesas.map((defesa, di) => <div key={`${resposta.id}-${di}`} className="mt-2 grid gap-2 md:grid-cols-2">
                    <label className="flex flex-col gap-1 text-xs text-tinta">Resposta do defensor<input value={defesa.move} onChange={(e) => { const valor = e.currentTarget.value.toLowerCase(); atualizarResposta(resposta.id, (atual) => atual.efeito.tipo !== "avanca" ? atual : ({ ...atual, efeito: { ...atual.efeito, defesas: atual.efeito.defesas.map((item, i) => i === di ? { ...item, move: valor } : item) } })); }} className="foco rounded-md border border-borda bg-papel px-2 py-2 text-sm" /></label>
                    <label className="flex flex-col gap-1 text-xs text-tinta">Próxima pergunta<select value={defesa.proximaQuestaoId} onChange={(e) => { const valor = e.currentTarget.value; atualizarResposta(resposta.id, (atual) => atual.efeito.tipo !== "avanca" ? atual : ({ ...atual, efeito: { ...atual.efeito, defesas: atual.efeito.defesas.map((item, i) => i === di ? { ...item, proximaQuestaoId: valor } : item) } })); }} className="foco rounded-md border border-borda bg-papel px-2 py-2 text-sm">{treino.questoes.map((item, i) => <option key={item.id} value={item.id}>Pergunta {i + 1}</option>)}</select></label>
                  </div>) : null}
                  {resposta.efeito.tipo === "encerra" ? <div className="mt-2 grid gap-2 md:grid-cols-2">
                    <label className="flex flex-col gap-1 text-xs text-tinta">Condição final<select value={resposta.efeito.condicao} onChange={(e) => { const valor = e.currentTarget.value as Extract<RespostaTreinoV2["efeito"], { tipo: "encerra" }>["condicao"]; atualizarResposta(resposta.id, (atual) => atual.efeito.tipo !== "encerra" ? atual : ({ ...atual, efeito: { ...atual.efeito, condicao: valor } })); }} className="foco rounded-md border border-borda bg-papel px-2 py-2 text-sm">{Object.entries(NOMES_DO_FIM).map(([valor, nome]) => <option key={valor} value={valor}>{nome}</option>)}</select></label>
                    <label className="flex flex-col gap-1 text-xs text-tinta">Último lance do defensor (opcional)<input value={resposta.efeito.defesaFinal ?? ""} onChange={(e) => { const valor = e.currentTarget.value.toLowerCase() || undefined; atualizarResposta(resposta.id, (atual) => atual.efeito.tipo !== "encerra" ? atual : ({ ...atual, efeito: { ...atual.efeito, defesaFinal: valor } })); }} className="foco rounded-md border border-borda bg-papel px-2 py-2 text-sm" /></label>
                  </div> : null}
                </div>
              )}
            </article>;
          })}
        </section>
      </div>
    </Dialogo>
  );
}
