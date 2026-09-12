"use client";

import type { DependenteV2, ResolucaoV2, ResolucoesV2 } from "@/lib/editor-v2/impacto";

/**
 * As três saídas de §5, uma por dependente — e cancelar, que é sempre a quarta.
 *
 * ## Por que a escolha é por item, e não uma só para todos
 *
 * §5 do plano final: "excluir análise ou subárvore referenciada exige cancelar,
 * remover explicitamente os dependentes **ou** materializar os dependentes como
 * independentes". Um botão único "remover tudo" leria a frase como se as três
 * fossem um interruptor da operação inteira — e o professor que quer **manter** o
 * treino e **soltar** o capítulo derivado não teria como dizer isso.
 *
 * ## Por que o botão de confirmar fica desabilitado até o fim
 *
 * Porque nenhum padrão aqui é seguro. Um padrão em "remover" apagaria trabalho
 * de quem só clicou em confirmar; um padrão em "materializar" romperia
 * dependências sem ninguém pedir. Enquanto faltar uma escolha, o botão não
 * finge que dá — e a linha embaixo diz quantas faltam.
 */
export function PainelDeResolucoes({
  dependentes,
  resolucoes,
  aoEscolher,
}: {
  dependentes: DependenteV2[];
  resolucoes: ResolucoesV2;
  aoEscolher: (id: string, escolha: ResolucaoV2) => void;
}) {
  if (dependentes.length === 0) return null;

  return (
    <section className="flex flex-col gap-2 rounded-md border border-erro bg-erro-superficie/10 p-3">
      <h3 className="text-sm font-semibold text-erro-texto">
        {dependentes.length === 1
          ? "Uma parte da aula depende do que seria apagado"
          : `${dependentes.length} partes da aula dependem do que seria apagado`}
      </h3>
      <p className="text-xs text-tinta-media">
        Decida o que fazer com cada uma. Cancelar aqui não muda nada na aula.
      </p>

      <ul className="flex flex-col gap-2">
        {dependentes.map((dependente) => {
          const escolha = resolucoes[dependente.id];
          return (
            <li key={dependente.id} className="rounded-md border border-borda-fraca bg-carta p-2">
              <p className="text-sm text-tinta">
                <strong>«{dependente.nome}»</strong> {dependente.motivo}.
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  aria-pressed={escolha === "remover"}
                  onClick={() => aoEscolher(dependente.id, "remover")}
                  className={`foco rounded border px-2 py-1 text-xs ${escolha === "remover" ? "border-erro bg-erro-superficie/20 font-medium text-erro-texto" : "border-borda text-tinta hover:bg-carta-toque"}`}
                >
                  Remover {rotuloDoTipo(dependente.tipo)}
                </button>
                <button
                  type="button"
                  disabled={dependente.materializacao === null}
                  aria-pressed={escolha === "materializar"}
                  title={dependente.motivoSemMaterializar}
                  onClick={() => aoEscolher(dependente.id, "materializar")}
                  className={`foco rounded border px-2 py-1 text-xs disabled:opacity-40 ${escolha === "materializar" ? "border-metodo-superficie bg-metodo-superficie/20 font-medium text-metodo-tinta" : "border-borda text-tinta hover:bg-carta-toque"}`}
                >
                  Tornar independente
                </button>
                {/* §11.3: "ações impossíveis ficam ausentes ou desabilitadas
                    **com motivo**". O motivo fica escrito, e não só no title:
                    um `title` só aparece para quem já parou o mouse em cima. */}
                {dependente.materializacao === null && dependente.motivoSemMaterializar ? (
                  <span className="basis-full text-xs text-tinta-fraca">
                    Tornar independente não dá aqui: {dependente.motivoSemMaterializar}.
                  </span>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function rotuloDoTipo(tipo: DependenteV2["tipo"]): string {
  if (tipo === "treino") return "o treino";
  if (tipo === "introducao") return "a introdução";
  return "o capítulo";
}

/** Quantas escolhas ainda faltam — a frase que explica o botão desabilitado. */
export function faltamEscolhas(dependentes: DependenteV2[], resolucoes: ResolucoesV2): number {
  return dependentes.filter((dependente) => {
    const escolha = resolucoes[dependente.id];
    if (escolha === "remover") return false;
    return !(escolha === "materializar" && dependente.materializacao !== null);
  }).length;
}
