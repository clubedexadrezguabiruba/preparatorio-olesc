"use client";

import { useMemo, useState } from "react";
import { Dialogo } from "@/components/editor-v2/Dialogo";
import {
  prepararComecarDaqui,
  prepararDuplicarIndependente,
  prepararMostrarVariante,
  type ComecoDaquiV2,
  type DuplicataIndependenteV2,
  type VarianteMostradaV2,
} from "@/lib/editor-v2/acoes-do-lance";
import type { AulaV2 } from "@/lib/editor-v2/modelo";
import type { Position } from "@/lib/lesson/schema";

export type AcaoContextualV2 = "mostrar-variante" | "comecar-daqui" | "duplicar-independente";

/**
 * As três ações contextuais de §8.3, numa janela só.
 *
 * ## Por que uma janela e não três
 *
 * Porque o formulário é idêntico — nome, orientação e onde entra — e o que muda
 * entre elas é **o que acontece com o material**, que é explicação, não campo.
 * Três janelas iguais com um parágrafo diferente ensinariam o professor a pular
 * o parágrafo.
 *
 * E a diferença precisa mesmo ser lida, porque é sutil e cara:
 *
 * | Ação | O que copia | Do que continua dependendo |
 * |---|---|---|
 * | Mostrar esta variante | nada | dos próprios lances da partida |
 * | Começar desta posição | nada | só da posição escolhida |
 * | Duplicar como independente | tudo daqui para baixo | de nada |
 *
 * O quadro em prosa fica na tela, com os números reais desta partida: "13 lances
 * seriam copiados" é o que faz o professor entender que a terceira é a cara.
 */
export function DialogoDoLance({
  aula,
  acao,
  analiseId,
  nodeId,
  capituloId,
  nomeSugerido,
  orientacaoPadrao,
  positions,
  aoMostrarVariante,
  aoComecarDaqui,
  aoDuplicar,
  aoFechar,
}: {
  aula: AulaV2;
  acao: AcaoContextualV2;
  analiseId: string;
  nodeId: string;
  /** O capítulo aberto: é depois dele que a etapa entra, e dele vêm as narrações. */
  capituloId: string;
  /** O SAN do lance, para sugerir um nome que o professor reconheça. */
  nomeSugerido: string;
  orientacaoPadrao: "white" | "black";
  positions: Record<string, Position>;
  aoMostrarVariante: (novo: VarianteMostradaV2) => void;
  aoComecarDaqui: (novo: ComecoDaquiV2) => void;
  aoDuplicar: (novo: DuplicataIndependenteV2) => void;
  aoFechar: () => void;
}) {
  const [nome, setNome] = useState(nomeSugerido);
  const [orientacao, setOrientacao] = useState<"white" | "black">(orientacaoPadrao);
  const [depoisDe, setDepoisDe] = useState(capituloId);

  const pedido = { analiseId, nodeId, nome, orientacao, depoisDoCapituloId: depoisDe, narracoesDoCapituloId: capituloId };

  const preparo = useMemo(() => {
    if (acao === "mostrar-variante") return { tipo: "mostrar-variante" as const, resultado: prepararMostrarVariante(aula, pedido) };
    if (acao === "comecar-daqui") return { tipo: "comecar-daqui" as const, resultado: prepararComecarDaqui(aula, pedido) };
    return { tipo: "duplicar-independente" as const, resultado: prepararDuplicarIndependente(aula, pedido, positions) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acao, aula, analiseId, nodeId, nome, orientacao, depoisDe, capituloId, positions]);

  const erro = preparo.resultado.ok ? null : preparo.resultado;

  /** A ordem da coluna vem do fluxo, e o seletor de lugar tem de vir dela também. */
  const capitulosNaOrdem = aula.fluxo.flatMap((etapa) => {
    if (etapa.tipo !== "capitulo") return [];
    const item = aula.capitulos.find((c) => c.id === etapa.entidadeId);
    return item ? [item] : [];
  });

  const analise = aula.analises.find((item) => item.id === analiseId);
  const copiados = useMemo(() => {
    if (!analise) return 0;
    const vistos = new Set<string>();
    const andar = (id: string) => {
      if (vistos.has(id)) return;
      vistos.add(id);
      analise.nos[id]?.filhos.forEach(andar);
    };
    andar(nodeId);
    return vistos.size;
  }, [analise, nodeId]);

  function confirmar() {
    if (!preparo.resultado.ok) return;
    if (preparo.tipo === "mostrar-variante") aoMostrarVariante(preparo.resultado.novo as VarianteMostradaV2);
    else if (preparo.tipo === "comecar-daqui") aoComecarDaqui(preparo.resultado.novo as ComecoDaquiV2);
    else aoDuplicar(preparo.resultado.novo as DuplicataIndependenteV2);
  }

  return (
    <Dialogo
      titulo={`${TITULO[acao]} — a partir de ${nomeSugerido}`}
      descricao="O capítulo novo é criado numa ação só; um Desfazer o remove inteiro."
      largura="max-w-xl"
      aoFechar={aoFechar}
      rodape={
        <>
          <button type="button" onClick={aoFechar} className="foco rounded-md border border-borda px-3 py-2 text-sm text-tinta hover:bg-carta-toque">Cancelar</button>
          <button
            type="button"
            disabled={!preparo.resultado.ok}
            onClick={confirmar}
            className="foco rounded-md bg-metodo-superficie px-3 py-2 text-sm font-medium text-metodo-tinta-alta disabled:opacity-40"
          >
            Criar capítulo
          </button>
        </>
      }
    >
      <p className="rounded-md border border-borda-fraca bg-carta p-3 text-sm text-tinta">{explicacao(acao, copiados)}</p>

      <label className="flex flex-col gap-1 text-sm text-tinta">
        Nome do capítulo
        <input
          type="text"
          value={nome}
          onChange={(evento) => setNome(evento.currentTarget.value)}
          aria-invalid={erro?.campo === "nome" ? true : undefined}
          className="foco rounded-md border border-borda bg-papel px-2 py-2 text-sm text-tinta"
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm text-tinta">
          Tabuleiro visto por
          <select
            value={orientacao}
            onChange={(evento) => setOrientacao(evento.currentTarget.value === "black" ? "black" : "white")}
            className="foco rounded-md border border-borda bg-papel px-2 py-2 text-sm text-tinta"
          >
            <option value="white">Brancas embaixo</option>
            <option value="black">Pretas embaixo</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-tinta">
          Entra…
          <select
            value={depoisDe}
            onChange={(evento) => setDepoisDe(evento.currentTarget.value)}
            className="foco rounded-md border border-borda bg-papel px-2 py-2 text-sm text-tinta"
          >
            {capitulosNaOrdem.map((item) => (
              <option key={item.id} value={item.id}>depois de «{item.titulo}»</option>
            ))}
            <option value="">no fim da aula</option>
          </select>
        </label>
      </div>

      {erro ? (
        <p role="alert" className="rounded-md border border-erro bg-erro-superficie/10 p-3 text-sm text-erro-texto">{erro.mensagem}</p>
      ) : null}
    </Dialogo>
  );
}

const TITULO: Record<AcaoContextualV2, string> = {
  "mostrar-variante": "Mostrar esta variante como capítulo",
  "comecar-daqui": "Começar novo capítulo desta posição",
  "duplicar-independente": "Duplicar como independente",
};

function explicacao(acao: AcaoContextualV2, copiados: number): string {
  if (acao === "mostrar-variante") {
    return "O capítulo novo aponta para os lances que já existem: nada é copiado. Se você promover outra variante a principal depois, este capítulo continua mostrando o mesmo percurso.";
  }
  if (acao === "comecar-daqui") {
    return "Nasce uma partida nova, que começa nesta posição e segue por conta própria. Ela depende da posição — se você trocar a posição inicial do capítulo de origem, esta muda de tabuleiro junto —, mas não dos lances daqui para a frente, que são seus para escrever.";
  }
  const lances = Math.max(copiados - 1, 0);
  return `Esta posição e ${lances === 1 ? "1 lance" : `${lances} lances`} daqui para baixo são copiados com identificadores novos, junto dos comentários, símbolos, desenhos e narrações. A cópia deixa de depender do original: editar uma não mexe na outra.`;
}
