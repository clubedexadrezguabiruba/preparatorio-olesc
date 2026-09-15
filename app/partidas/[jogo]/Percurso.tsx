"use client";

import { useState } from "react";
import Link from "next/link";
import type { MomentoComVersao } from "@/lib/partidas/carregar";
import type { SituacaoDoMomento } from "@/lib/partidas/concluir";
import { Momentos } from "./Momentos";

/**
 * O caminho de uma partida modelo, em três partes que se sucedem na mesma
 * página: a apresentação, os momentos e o fecho.
 *
 * **O fecho espera.** O momento final explica o golpe que o Desafio cobra;
 * mostrá-lo antes seria dar a resposta. Ele abre quando a série termina — ou
 * logo de cara, para quem já concluiu a partida em outro dia.
 */

type Fase = "apresentacao" | "momentos" | "fecho";

type Ficha = {
  intro: readonly string[];
  objetivos: readonly string[];
  momentoFinal: readonly string[];
  resumo: readonly string[];
  perguntas: readonly string[];
};

export function Percurso({
  slug,
  cor,
  tema,
  ficha,
  momentos,
  jaFeitos,
  concluida,
}: {
  slug: string;
  cor: "brancas" | "pretas";
  tema: string;
  ficha: Ficha;
  momentos: readonly MomentoComVersao[];
  /** O que o banco já tem, por `n` do momento. */
  jaFeitos: Record<number, SituacaoDoMomento>;
  concluida: boolean;
}) {
  const [fase, setFase] = useState<Fase>("apresentacao");
  const [fechouAgora, setFechouAgora] = useState(false);
  const resolvidos = Object.values(jaFeitos).filter((s) => s !== "pendente").length;

  if (fase === "momentos") {
    return (
      <Momentos
        slug={slug}
        momentos={momentos}
        aoTerminar={(concluiu) => {
          setFechouAgora(concluiu);
          setFase("fecho");
        }}
      />
    );
  }

  if (fase === "fecho") {
    return (
      <div className="flex flex-col gap-4">
        {fechouAgora ? (
          <p className="rounded-xl bg-metodo-superficie/15 px-4 py-3 text-sm font-semibold text-metodo-tinta-alta">
            ✓ Partida concluída. Ela já conta no seu nível.
          </p>
        ) : null}
        <Bloco titulo="O desfecho">
          {ficha.momentoFinal.map((fala) => (
            <p key={fala}>{fala}</p>
          ))}
        </Bloco>
        <Bloco titulo="Se você lembrar de três coisas">
          <ol className="flex list-decimal flex-col gap-1.5 pl-5">
            {ficha.resumo.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </Bloco>
        <Bloco titulo="Para pensar">
          <ul className="flex list-disc flex-col gap-1.5 pl-5">
            {ficha.perguntas.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Bloco>
        <Acoes slug={slug} cor={cor} textoMomentos="Refazer os momentos" aoMomentos={() => setFase("momentos")} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {concluida ? (
        <p className="rounded-xl bg-metodo-superficie/15 px-4 py-3 text-sm font-medium text-metodo-tinta-alta">
          ✓ Você já concluiu esta partida. Pode refazer os momentos quando quiser.
        </p>
      ) : resolvidos > 0 ? (
        <p className="text-sm text-tinta-media tabular-nums">
          Você já resolveu {resolvidos} de {momentos.length} momentos. Para concluir, faça a série e
          acerte o Desafio final de primeira.
        </p>
      ) : null}

      <Bloco titulo={tema}>
        {ficha.intro.map((fala) => (
          <p key={fala}>{fala}</p>
        ))}
      </Bloco>

      <Bloco titulo="Nesta partida você vai">
        <ul className="flex list-disc flex-col gap-1.5 pl-5">
          {ficha.objetivos.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Bloco>

      <p className="text-xs text-tinta-fraca">
        São {momentos.length} momentos de decisão. O último é o Desafio final: acerte de primeira,
        sem ajuda, para concluir a partida.
      </p>

      <Acoes
        slug={slug}
        cor={cor}
        textoMomentos={resolvidos > 0 ? "Fazer os momentos de novo" : "Começar os momentos"}
        aoMomentos={() => setFase("momentos")}
        verFecho={concluida ? () => setFase("fecho") : undefined}
      />
    </div>
  );
}

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2 cartao px-4 py-3 text-sm text-tinta-media">
      <h2 className="text-sm font-semibold text-tinta">{titulo}</h2>
      {children}
    </section>
  );
}

function Acoes({
  slug,
  cor,
  textoMomentos,
  aoMomentos,
  verFecho,
}: {
  slug: string;
  cor: string;
  textoMomentos: string;
  aoMomentos: () => void;
  verFecho?: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={aoMomentos}
        className="foco min-h-11 rounded-lg bg-metodo-cheio px-4 py-2.5 text-sm font-semibold text-tinta-inversa transition-colors hover:bg-metodo-cheio-toque"
      >
        {textoMomentos}
      </button>
      {verFecho ? (
        <button
          type="button"
          onClick={verFecho}
          className="foco min-h-11 rounded-lg border border-borda px-4 py-2.5 text-sm font-medium text-tinta-media transition-colors hover:bg-carta-toque"
        >
          Ler o desfecho
        </button>
      ) : null}
      <Link
        href={`/partidas/${slug}/inteira`}
        className="foco inline-flex min-h-11 items-center rounded-lg border border-borda px-4 py-2.5 text-sm font-medium text-tinta-media transition-colors hover:bg-carta-toque"
      >
        Jogar a partida inteira de {cor} (opcional)
      </Link>
    </div>
  );
}
