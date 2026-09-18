"use client";

import { useCallback, useState } from "react";
import { Celebracao, useCelebracao } from "@/components/Celebracao";
import { BotaoPrincipal, BotaoSecundario } from "@/components/lesson/BotoesDaAula";
import type { Resultado, Treino } from "@/lib/repertorio/gravar";
import type { Linha } from "@/lib/repertorio/linhas";
import type { Modo } from "@/lib/repertorio/passada";
import { semQuebras, zerado, type ProgressoDaLinha } from "@/lib/repertorio/treino";
import { Passada } from "./Passada";

/**
 * O move trainer dentro da aula de abertura — regra 17 do curso de abertura (spec §18.1).
 *
 * **O juiz e a gravação são os de `/aberturas`.** Cada linha passa pela mesma `Passada`, e o que
 * sobe ao servidor são os lances, pela mesma `registrarTreino`: o progresso de repetição espaçada é
 * um só, dentro e fora da aula.
 *
 * **A etapa está feita quando cada linha teve uma passada nesta rodada.** Na primeira vez de uma
 * linha (`tentativas = 0`), ela começa assistida — seta, treino e memória, como em `Treino.tsx`; da
 * segunda em diante, direto na de memória. Aprender de verdade (três acertos espaçados) continua sendo
 * trabalho de `/aberturas`, nos dias seguintes.
 *
 * As linhas chegam na ordem do estudo, que é a ordem de `linhas`.
 */
export function TreinadorDaAula({
  titulo,
  cor,
  abertura,
  linhas,
  progressoInicial,
  gravar,
  aoTerminar,
  rotuloDoFim,
}: {
  titulo: string;
  cor: Linha["cor"];
  abertura: string;
  linhas: readonly Linha[];
  progressoInicial: Readonly<Record<string, ProgressoDaLinha>>;
  /** A server action de `/aberturas`. Sem ela (a prévia do professor), nada é gravado. */
  gravar?: (treino: Treino) => Promise<Resultado>;
  aoTerminar: () => void;
  rotuloDoFim: string;
}) {
  const [indice, setIndice] = useState(0);
  const linha = linhas[indice];
  const primeiraVez = (progressoInicial[linha?.id ?? ""] ?? zerado()).tentativas === 0;
  const [modo, setModo] = useState<Modo>(primeiraVez ? "assistido" : "quiz");
  const [rodada, setRodada] = useState(0);
  const [gravando, setGravando] = useState(false);
  const [falha, setFalha] = useState<string | null>(null);
  const [linhaFechada, setLinhaFechada] = useState(false);
  const [placar, setPlacar] = useState<{ acertou: boolean; revelado: { san: string } | null } | null>(null);
  // O fim de cada linha no valendo celebra (17/9/2026) — confete e o acorde, no lugar do som do
  // prêmio. As etapas de dentro da linha (seta, treino) não disparam.
  const { seq, celebrar } = useCelebracao();

  const decidir = useCallback(async (lances: string[]) => {
    if (!gravar || !linha) return;
    setGravando(true);
    const resposta = await gravar({ cor, abertura, linhaId: linha.id, lances });
    setGravando(false);
    if ("erro" in resposta) setFalha(resposta.erro);
  }, [abertura, cor, gravar, linha]);

  const entrarNaLinha = useCallback((proxima: number) => {
    const nova = linhas[proxima];
    setIndice(proxima);
    setModo((progressoInicial[nova?.id ?? ""] ?? zerado()).tentativas === 0 ? "assistido" : "quiz");
    setLinhaFechada(false);
    setPlacar(null);
    setFalha(null);
    setRodada((r) => r + 1);
  }, [linhas, progressoInicial]);

  if (!linha) {
    return <p className="cartao px-4 py-3 text-sm text-tinta-media">Este treinador de lances não tem linha para treinar.</p>;
  }

  const ultima = indice === linhas.length - 1;
  const cabecalho = (
    <div className="flex flex-col gap-1">
      <p className="rotulo text-tinta-fraca">{titulo} · linha {indice + 1} de {linhas.length}</p>
      <p className="truncate text-sm font-medium text-tinta">{linha.nome}</p>
      {falha ? <p role="alert" className="text-sm text-aviso-tinta">Não deu para guardar esta linha: {falha}. Tente de novo.</p> : null}
    </div>
  );

  return (
    <>
    <Celebracao seq={seq} tela />
    <Passada
      key={`${linha.id}:${modo}:${rodada}`}
      linha={linha}
      modo={modo}
      aoFecharLinha={celebrar}
      aoDecidir={(lances) => { void decidir(lances); }}
      aoTerminar={(fecho) => {
        if (modo !== "quiz") return;
        setPlacar({ acertou: fecho.acertou, revelado: fecho.revelado });
        setLinhaFechada(true);
      }}
      aoAvancarEtapa={() => {
        setModo((atual) => (atual === "assistido" ? "treino" : "quiz"));
        setRodada((r) => r + 1);
      }}
      mostrarTrilha={primeiraVez}
      cabecalho={cabecalho}
      painelDeFim={linhaFechada ? (
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto cartao px-4 py-4">
          <p className="text-sm font-semibold text-tinta">
            {placar?.revelado ? `Não era esse lance: aqui o lance é ${placar.revelado.san}.` : placar?.acertou ? "Linha inteira, sem erro." : "Você chegou ao fim da linha."}
          </p>
          {linha.comentarios[String(linha.lances.length - 1)]?.trim() ? (
            <p className="rounded-lg bg-metodo-superficie/15 px-3 py-2.5 text-sm text-metodo-tinta-alta">
              {semQuebras(linha.comentarios[String(linha.lances.length - 1)])}
            </p>
          ) : null}
          {/*
           * Reescrito em 18/9/2026. Três defeitos numa frase só: "linha(s)", que
           * é marca de código e não de professor; o caminho cru `/aberturas`, que
           * o aluno não tem como clicar nem entender; e "para aprender de vez",
           * que prometia sem dizer o que fazer.
           */}
          <p className="text-xs text-tinta-fraca">
            {ultima
              ? "Esta era a última linha desta aula."
              : `${linhas.length - indice - 1 === 1 ? "Falta 1 linha" : `Faltam ${linhas.length - indice - 1} linhas`} nesta aula.`}{" "}
            Ela volta aqui nos próximos dias, até você acertar sem pensar.
          </p>
          <div className="flex flex-wrap gap-2">
            {ultima ? (
              <BotaoPrincipal onClick={aoTerminar} esperando={gravando}>{rotuloDoFim}</BotaoPrincipal>
            ) : (
              <BotaoPrincipal onClick={() => entrarNaLinha(indice + 1)} esperando={gravando}>Próxima linha</BotaoPrincipal>
            )}
            <BotaoSecundario onClick={() => { setModo("quiz"); setLinhaFechada(false); setPlacar(null); setRodada((r) => r + 1); }} esperando={gravando}>
              Jogar de novo
            </BotaoSecundario>
          </div>
        </div>
      ) : null}
    />
    </>
  );
}
