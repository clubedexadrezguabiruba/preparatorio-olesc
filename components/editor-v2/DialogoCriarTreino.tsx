"use client";

import { useMemo, useState } from "react";
import { Chess } from "chess.js";
import { Dialogo } from "./Dialogo";
import { quadroDoNo } from "@/lib/editor-v2/arvore";
import { prepararTreinosDaqui, type ColocacaoDoTreinoV2, type LadoDoTreinoV2, type TreinosPreparadosV2 } from "@/lib/editor-v2/treinos";
import type { AulaV2 } from "@/lib/editor-v2/modelo";
import type { Position } from "@/lib/lesson/schema";

function nomeDoLado(lado: "white" | "black"): string {
  return lado === "white" ? "Brancas" : "Pretas";
}

function resumoDoFim(efeito: AulaV2["treinos"][number]["questoes"][number]["respostas"][number]["efeito"]): string {
  if (efeito.tipo === "avanca") return `${efeito.defesas.length} resposta${efeito.defesas.length === 1 ? "" : "s"} do defensor`;
  if (efeito.tipo === "repete") return "repete a pergunta";
  const nomes = { mate: "mate", promotion: "promoção", "draw-secured": "empate assegurado", "tablebase-win": "vitória certificada", "objetivo-autoral": "objetivo da linha" };
  return `${efeito.defesaFinal ? `defensor joga ${efeito.defesaFinal} e ` : ""}termina em ${nomes[efeito.condicao]}`;
}

/** A prévia de criação exigida por §16.1: nada entra no documento antes de confirmar. */
export function DialogoCriarTreino({ aula, capituloId, nodeId, positions, aoCriar, aoFechar }: {
  aula: AulaV2;
  capituloId: string;
  nodeId: string;
  positions: Record<string, Position>;
  aoCriar: (preparo: TreinosPreparadosV2) => void;
  aoFechar: () => void;
}) {
  const capitulo = aula.capitulos.find((item) => item.id === capituloId)!;
  const fen = quadroDoNo(aula, capitulo.analiseId, nodeId, positions).fen;
  const ladoInicial = new Chess(fen).turn() === "w" ? "white" : "black";
  const [titulo, setTitulo] = useState(`${capitulo.titulo} — treino`);
  const [objetivo, setObjetivo] = useState("Jogue a linha ensinada neste capítulo até a conclusão.");
  const [lado, setLado] = useState<LadoDoTreinoV2>(ladoInicial);
  const [colocacao, setColocacao] = useState<ColocacaoDoTreinoV2>("depois-do-capitulo");
  const [obrigatorio, setObrigatorio] = useState(true);
  const resultado = useMemo(() => prepararTreinosDaqui(aula, {
    capituloId, nodeId, titulo, objetivo, lado, colocacao, obrigatorio,
  }, positions), [aula, capituloId, nodeId, titulo, objetivo, lado, colocacao, obrigatorio, positions]);

  return (
    <Dialogo
      titulo="Criar treino daqui"
      descricao="Confira a receita antes de criar. Variantes não entram como respostas corretas automaticamente."
      largura="max-w-4xl"
      aoFechar={aoFechar}
      rodape={(
        <>
          <button type="button" onClick={aoFechar} className="foco rounded-md border border-borda px-3 py-2 text-sm text-tinta">Cancelar</button>
          <button type="button" disabled={!resultado.ok} onClick={() => { if (resultado.ok) aoCriar(resultado.preparo); }} className="foco rounded-md bg-metodo-superficie px-3 py-2 text-sm font-semibold text-metodo-tinta-alta disabled:opacity-40">Criar treino</button>
        </>
      )}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm text-tinta">
            Título
            <input value={titulo} onChange={(e) => setTitulo(e.currentTarget.value)} className="foco rounded-md border border-borda bg-papel px-2 py-2" />
          </label>
          <label className="flex flex-col gap-1 text-sm text-tinta">
            Objetivo para o aluno
            <textarea value={objetivo} onChange={(e) => setObjetivo(e.currentTarget.value)} rows={3} className="foco resize-y rounded-md border border-borda bg-papel p-2" />
          </label>
          <fieldset className="rounded-md border border-borda p-3">
            <legend className="px-1 text-sm font-medium text-tinta">Lado do aluno</legend>
            <div className="flex flex-wrap gap-3 text-sm text-tinta">
              {(["white", "black", "ambos"] as const).map((valor) => (
                <label key={valor} className="flex items-center gap-1.5">
                  <input type="radio" name="lado-do-treino" checked={lado === valor} onChange={() => setLado(valor)} />
                  {valor === "ambos" ? "Ambos (duas tarefas)" : nomeDoLado(valor)}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="flex flex-col gap-1 text-sm text-tinta">
            Lugar na aula
            <select value={colocacao} onChange={(e) => setColocacao(e.currentTarget.value as ColocacaoDoTreinoV2)} className="foco rounded-md border border-borda bg-papel px-2 py-2">
              <option value="depois-do-capitulo">Depois deste capítulo</option>
              <option value="fim-da-aula">No fim, antes das práticas finais</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-tinta">
            <input type="checkbox" checked={obrigatorio} onChange={(e) => setObrigatorio(e.currentTarget.checked)} />
            Obrigatório no fluxo da aula
          </label>
          <div className="rounded-md border border-borda-fraca p-2 text-xs text-tinta-fraca">
            <p><strong className="text-tinta">Posição inicial:</strong> {fen}</p>
            <p><strong className="text-tinta">Origem:</strong> «{capitulo.titulo}», do ponto escolhido até o fim do percurso.</p>
            <p><strong className="text-tinta">Perfil:</strong> linha autoral — um lance legal fora das respostas receberá “este lance não faz parte da linha treinada”.</p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-tinta">O que será criado</h3>
          {!resultado.ok ? (
            <p role="alert" className="rounded-md border border-erro bg-erro-superficie/10 p-3 text-sm text-erro-texto">{resultado.mensagem}</p>
          ) : resultado.preparo.treinos.map((treino) => (
            <section key={treino.id} className="rounded-md border border-borda p-3">
              <h4 className="font-medium text-tinta">{treino.titulo}</h4>
              <p className="text-xs text-tinta-fraca">{nomeDoLado(treino.ladoAluno)} · {treino.questoes.length} pergunta{treino.questoes.length === 1 ? "" : "s"} · defensor determinístico</p>
              {treino.defesaInicial ? <p className="mt-2 text-xs text-metodo-tinta">O defensor começa com {treino.defesaInicial.move}, antes da primeira pergunta.</p> : null}
              <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm text-tinta">
                {treino.questoes.map((questao) => {
                  const resposta = questao.respostas[0];
                  return (
                    <li key={questao.id}>
                      <span className="font-medium">Aluno: {resposta.moves.join(" ou ")}</span>
                      <span className="block text-xs text-tinta-fraca">{resumoDoFim(resposta.efeito)} · feedback: {resposta.feedback}</span>
                    </li>
                  );
                })}
              </ol>
              <p className="mt-2 text-xs text-tinta-fraca">Dicas, alternativas corretas, erros conhecidos e feedback podem ser personalizados na próxima parada desta fatia.</p>
            </section>
          ))}
        </div>
      </div>
    </Dialogo>
  );
}
