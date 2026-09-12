"use client";

import { useMemo, useState } from "react";
import { Dialogo } from "@/components/editor-v2/Dialogo";
import { pgnDaAnalise, pgnDaAula, pgnDaVariante, type PgnExportadoV2 } from "@/lib/editor-v2/escrever-pgn";
import type { AulaV2 } from "@/lib/editor-v2/modelo";
import type { Position } from "@/lib/lesson/schema";

type Saida = "variante" | "capitulo" | "aula" | "pacote";

/**
 * "Exportar" — §14.
 *
 * ## A tela existe para dizer a diferença entre os quatro botões
 *
 * §14 manda a interface explicar que "somente o pacote JSON v2 promete restaurar
 * a aula inteira" e que "qualquer perda ou exclusão editorial é listada antes de
 * baixar". Aqui as duas coisas acontecem no mesmo lugar: cada saída mostra o
 * texto que sairia, **com** a lista do que ela não leva e do que atravessou com
 * perda, antes de o professor copiar ou baixar.
 *
 * ## Por que o PGN aparece na tela, e não só num arquivo
 *
 * Porque a saída mais usada é "copiar o PGN desta variante para colar no
 * Lichess", e para isso o arquivo é um desvio. O texto fica visível, com o botão
 * de copiar ao lado — e, por tabela, o professor vê o que está copiando, que é o
 * jeito mais barato de descobrir que uma exportação não ficou como ele esperava.
 */
export function DialogoExportar({
  aula,
  analiseId,
  nodeId,
  capituloId,
  positions,
  aoFechar,
}: {
  aula: AulaV2;
  analiseId: string;
  /** O lance selecionado — a "variante" de §14 sai dele. */
  nodeId: string;
  capituloId: string;
  positions: Record<string, Position>;
  aoFechar: () => void;
}) {
  const [saida, setSaida] = useState<Saida>("variante");
  const [copiado, setCopiado] = useState(false);

  const capitulo = aula.capitulos.find((item) => item.id === capituloId);

  const exportado: PgnExportadoV2 = useMemo(() => {
    if (saida === "variante") return pgnDaVariante(aula, analiseId, nodeId, positions);
    if (saida === "capitulo") return pgnDaAnalise(aula, analiseId, positions, { titulo: capitulo?.titulo });
    if (saida === "aula") return pgnDaAula(aula, positions);
    return { texto: JSON.stringify(aula, null, 2) + "\n", naoCabe: [], perdas: [] };
  }, [analiseId, aula, capitulo?.titulo, nodeId, positions, saida]);

  const nomeDoArquivo = saida === "pacote"
    ? `${aula.id}-editor-v2.json`
    : saida === "aula"
      ? `${aula.id}.pgn`
      : `${aula.id}-${capitulo?.id ?? analiseId}.pgn`;

  function baixar() {
    const blob = new Blob([exportado.texto], { type: saida === "pacote" ? "application/json" : "application/x-chess-pgn" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = nomeDoArquivo;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(exportado.texto);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Sem área de transferência (permissão negada, navegador antigo) o texto
      // continua na tela e selecionável: o caminho manual nunca deixa de existir.
      setCopiado(false);
    }
  }

  return (
    <Dialogo
      titulo="Exportar"
      descricao="Escolha o que sair. O texto aparece aqui antes de você copiar ou baixar."
      aoFechar={aoFechar}
      rodape={
        <>
          <button type="button" onClick={aoFechar} className="foco rounded-md border border-borda px-3 py-2 text-sm text-tinta hover:bg-carta-toque">Fechar</button>
          <button type="button" onClick={copiar} className="foco rounded-md border border-borda px-3 py-2 text-sm text-tinta hover:bg-carta-toque">
            {copiado ? "Copiado ✓" : "Copiar"}
          </button>
          <button type="button" onClick={baixar} className="foco rounded-md bg-metodo-superficie px-3 py-2 text-sm font-medium text-metodo-tinta-alta">
            Baixar {nomeDoArquivo}
          </button>
        </>
      }
    >
      <div className="flex flex-wrap gap-2" role="group" aria-label="O que exportar">
        {([
          ["variante", "PGN desta variante"],
          ["capitulo", "PGN deste capítulo"],
          ["aula", "PGN de todas as partidas"],
          ["pacote", "Pacote JSON v2"],
        ] as const).map(([valor, rotulo]) => (
          <button
            key={valor}
            type="button"
            aria-pressed={saida === valor}
            onClick={() => setSaida(valor)}
            className={`foco rounded-md border px-3 py-2 text-sm ${saida === valor ? "border-metodo-superficie bg-metodo-superficie/20 font-medium text-metodo-tinta" : "border-borda text-tinta hover:bg-carta-toque"}`}
          >
            {rotulo}
          </button>
        ))}
      </div>

      <p className="rounded-md border border-borda-fraca bg-carta p-3 text-sm text-tinta">
        {saida === "pacote"
          ? "O pacote JSON v2 é o único formato que promete trazer a aula inteira de volta: narração, ordem, treinos, proveniência e certificação."
          : "O PGN guarda o xadrez — posição inicial, lances, variantes, comentários da posição, símbolos e desenhos com cor. Ele não é um retrato da aula."}
      </p>

      {exportado.naoCabe.length > 0 ? (
        <section className="rounded-md border border-aviso-superficie bg-aviso-superficie/10 p-3 text-sm text-aviso-tinta">
          <p className="font-medium">O que este PGN não leva:</p>
          <ul className="mt-1 list-disc pl-5">
            {exportado.naoCabe.map((aviso) => <li key={aviso}>{aviso}</li>)}
          </ul>
        </section>
      ) : null}

      {exportado.perdas.length > 0 ? (
        <section className="rounded-md border border-erro bg-erro-superficie/10 p-3 text-sm text-erro-texto">
          <p className="font-medium">O que atravessou com perda:</p>
          <ul className="mt-1 list-disc pl-5">
            {exportado.perdas.map((perda, indice) => <li key={`${perda.codigo}-${indice}`}>{perda.mensagem}</li>)}
          </ul>
        </section>
      ) : null}

      <label className="flex flex-col gap-1 text-sm text-tinta">
        O que vai sair
        <textarea
          readOnly
          value={exportado.texto}
          rows={12}
          spellCheck={false}
          className="foco resize-y rounded-md border border-borda bg-papel p-2 font-mono text-xs text-tinta"
        />
      </label>
    </Dialogo>
  );
}
