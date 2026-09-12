"use client";

import { useMemo, useState } from "react";
import { Dialogo } from "@/components/editor-v2/Dialogo";
import { prepararDuplicacaoDeCapitulo, type CapituloDuplicadoV2 } from "@/lib/editor-v2/capitulo";
import type { AulaV2 } from "@/lib/editor-v2/modelo";
import type { Position } from "@/lib/lesson/schema";

/**
 * "Duplicar como independente" — §8.4.
 *
 * A janela é pequena porque a decisão é pequena: só o nome. O que ela **precisa**
 * dizer é o que "independente" quer dizer aqui, porque a palavra promete mais do
 * que a maioria dos editores entrega: a cópia recebe ids novos em cada lance,
 * cada narração e no próprio capítulo, e a partir daí as duas não se falam mais.
 * Editar uma não mexe na outra.
 *
 * Quando o capítulo copiado **começava numa posição de outro capítulo**, a janela
 * diz que a cópia passa a guardar aquela posição por conta própria — é a única
 * forma de ela ser independente de verdade, e o professor precisa saber que essa
 * ligação se rompe.
 */
export function DialogoDuplicarCapitulo({
  aula,
  capituloId,
  positions,
  aoDuplicar,
  aoFechar,
}: {
  aula: AulaV2;
  capituloId: string;
  positions: Record<string, Position>;
  aoDuplicar: (novo: CapituloDuplicadoV2) => void;
  aoFechar: () => void;
}) {
  const capitulo = aula.capitulos.find((item) => item.id === capituloId);
  const analise = aula.analises.find((item) => item.id === capitulo?.analiseId);
  const [nome, setNome] = useState(capitulo ? `${capitulo.titulo} (cópia)` : "");

  const preparo = useMemo(
    () => prepararDuplicacaoDeCapitulo(aula, { capituloId, nome }, positions),
    [aula, capituloId, nome, positions],
  );

  const lances = analise ? Math.max(Object.keys(analise.nos).length - 1, 0) : 0;

  return (
    <Dialogo
      titulo={`Duplicar «${capitulo?.titulo ?? "capítulo"}» como independente`}
      descricao="A cópia entra logo depois do original e recebe identificadores próprios."
      largura="max-w-xl"
      aoFechar={aoFechar}
      rodape={
        <>
          <button type="button" onClick={aoFechar} className="foco rounded-md border border-borda px-3 py-2 text-sm text-tinta hover:bg-carta-toque">Cancelar</button>
          <button
            type="button"
            disabled={!preparo.ok}
            onClick={() => { if (preparo.ok) aoDuplicar(preparo.novo); }}
            className="foco rounded-md bg-metodo-superficie px-3 py-2 text-sm font-medium text-metodo-tinta-alta disabled:opacity-40"
          >
            Duplicar
          </button>
        </>
      }
    >
      <label className="flex flex-col gap-1 text-sm text-tinta">
        Nome da cópia
        <input
          type="text"
          value={nome}
          onChange={(evento) => setNome(evento.currentTarget.value)}
          aria-invalid={preparo.ok ? undefined : true}
          className="foco rounded-md border border-borda bg-papel px-2 py-2 text-sm text-tinta"
        />
        {!preparo.ok ? <span role="alert" className="text-xs text-erro-texto">{preparo.mensagem}</span> : null}
      </label>

      <ul className="flex flex-col gap-1 rounded-md border border-borda-fraca bg-carta p-3 text-sm text-tinta">
        <li>{lances === 1 ? "1 lance é copiado" : `${lances} lances são copiados`}, com comentários, símbolos e desenhos.</li>
        <li>
          {capitulo?.narracoes.length
            ? `${capitulo.narracoes.length} ${capitulo.narracoes.length === 1 ? "narração vem" : "narrações vêm"} junto.`
            : "Este capítulo ainda não tem narração."}
        </li>
        <li>Cada lance da cópia ganha identificador próprio: editar uma das duas não mexe na outra.</li>
        {analise?.inicio.tipo === "referencia" ? (
          <li className="text-aviso-tinta">
            Este capítulo começa numa posição de outro capítulo. A cópia passa a guardar essa posição por conta própria — é isso
            que a torna independente, e é a ligação que se rompe.
          </li>
        ) : null}
        {analise?.origemPgn ? <li>O cabeçalho do PGN de origem acompanha a cópia.</li> : null}
      </ul>
    </Dialogo>
  );
}
