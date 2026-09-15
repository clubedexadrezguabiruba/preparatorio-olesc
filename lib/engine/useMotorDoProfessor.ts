"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { ENGINE_BUILD } from "./build.ts";
import {
  alturaDaBarra,
  avaliacaoParaBrancas,
  resultadoTerminal,
  formatarAvaliacao,
  linhasEsperadas,
  pvEmSanDaFen,
  type Avaliacao,
} from "./avaliacao-do-professor.ts";
import { criarMotor, isAborted, type AtualizacaoDaAnalise, type EngineStatus, type MotorDeXadrez } from "./stockfish.ts";

/**
 * O motor do professor nos editores (fatia 9, §23.1 da especificação).
 *
 * ## O que ele garante
 *
 * - **Worker próprio.** A instância nasce aqui, na primeira vez que o professor liga, e
 *   não é a do aluno: um `stop` desta análise nunca alcança a prática.
 * - **Nada antes de ligar.** Abrir o editor não cria worker nem baixa os 7,3 MB.
 * - **Uma posição por vez.** Trocar de posição cancela a análise na hora, e a nova só
 *   começa depois de 120 ms parada — as setas do teclado passando por dez lances não
 *   disparam dez análises. Resposta da posição antiga é descartada pelo carimbo do motor e,
 *   de novo, aqui, pela FEN.
 * - **Pausa.** Com `pausado` (prévia ou janela aberta) ou a aba escondida, o motor para;
 *   ao voltar, recomeça a posição da tela.
 * - **Liberado ao sair.** Desmontar encerra o worker na hora, sem os 30 s do aluno.
 *
 * Desligar só para a busca: o worker fica carregado até sair da tela, para o `L` seguinte
 * não baixar tudo de novo.
 */

/** O teto de profundidade da análise. Uma constante só, para ajustar pela medida. */
export const PROFUNDIDADE_DO_PROFESSOR = 22;
/** Quanto a posição precisa ficar parada para a análise começar. */
const ESPERA_DA_POSICAO_MS = 120;
/** Quantos lances cada linha mostra. */
const LANCES_POR_LINHA = 6;

export type LinhaDoMotor = {
  /** Já do lado das brancas. */
  avaliacao: Avaliacao;
  curto: string;
  extenso: string;
  san: string;
  /** O primeiro lance em UCI — é o da seta. */
  primeiroLance: string | null;
};

export type EstadoDoMotorDoProfessor = {
  status: "desligado" | "carregando" | "calculando" | "pronto" | "pausado" | "terminal" | "falhou";
  profundidade: number | null;
  linhas: LinhaDoMotor[];
  /** Quanto da barra é branco (0–100), ou `null` sem avaliação. */
  barra: number | null;
  /** O fim de partida pela regra do jogo, quando a posição já acabou. */
  terminal: string | null;
  erro: string | null;
};

function assinarVisibilidade(avisar: () => void): () => void {
  document.addEventListener("visibilitychange", avisar);
  return () => document.removeEventListener("visibilitychange", avisar);
}

function linhasDaAtualizacao(atualizacao: AtualizacaoDaAnalise): LinhaDoMotor[] {
  const vez = atualizacao.fen.split(" ")[1] === "b" ? "b" : "w";
  return atualizacao.linhas.map((linha) => {
    const avaliacao = avaliacaoParaBrancas({ cp: linha.cp, mate: linha.mate }, vez);
    const { curto, extenso } = formatarAvaliacao(avaliacao);
    return {
      avaliacao,
      curto,
      extenso,
      san: pvEmSanDaFen(atualizacao.fen, linha.pv, LANCES_POR_LINHA),
      primeiroLance: linha.pv[0] ?? null,
    };
  });
}

export function useMotorDoProfessor(
  fen: string,
  { ligado, linhas, pausado }: { ligado: boolean; linhas: number; pausado: boolean },
): EstadoDoMotorDoProfessor {
  const motor = useRef<MotorDeXadrez | null>(null);
  const [statusDoMotor, setStatusDoMotor] = useState<EngineStatus>("loading");
  const [erro, setErro] = useState<string | null>(null);
  /** O último retrato recebido, com a chave do pedido que o gerou. */
  const [resultado, setResultado] = useState<{ chave: string; profundidade: number; linhas: LinhaDoMotor[]; final: boolean } | null>(null);
  const escondida = useSyncExternalStore(assinarVisibilidade, () => document.hidden, () => false);

  const fim = useMemo(() => resultadoTerminal(fen), [fen]);
  const terminal = fim?.texto ?? null;
  const chave = `${fen}|${linhas}`;
  const parado = pausado || escondida;

  // Liberado ao sair: a instância só existe enquanto a tela existe.
  useEffect(() => () => {
    motor.current?.dispose();
    motor.current = null;
  }, []);

  useEffect(() => {
    if (!ligado) {
      motor.current?.cancel();
      return;
    }
    // Sem FEN (o editor não conseguiu montar a posição) não há o que analisar.
    if (!fen || terminal || parado) return;

    if (!motor.current) {
      const novo = criarMotor(ENGINE_BUILD, { medir: false });
      novo.subscribe(setStatusDoMotor);
      novo.acquire();
      motor.current = novo;
    }
    const instancia = motor.current;
    let vivo = true;

    const relogio = setTimeout(() => {
      instancia
        .analisarContinuo(
          { fen, multiPv: linhasEsperadas(fen, linhas), profundidade: PROFUNDIDADE_DO_PROFESSOR },
          (atualizacao) => {
            // Segunda defesa, depois do carimbo: só a posição deste efeito entra.
            if (!vivo || atualizacao.fen !== fen) return;
            setErro(null);
            setResultado({ chave, profundidade: atualizacao.depth, linhas: linhasDaAtualizacao(atualizacao), final: atualizacao.final });
          },
        )
        .catch((falha: unknown) => {
          if (!vivo || isAborted(falha)) return;
          setErro(falha instanceof Error ? falha.message : "o motor falhou");
        });
    }, ESPERA_DA_POSICAO_MS);

    return () => {
      vivo = false;
      clearTimeout(relogio);
      instancia.cancel();
    };
  }, [chave, fen, ligado, linhas, parado, terminal]);

  const atual = resultado?.chave === chave ? resultado : null;
  const barra = fim ? fim.barra : atual?.linhas[0] ? alturaDaBarra(atual.linhas[0].avaliacao) : null;

  let status: EstadoDoMotorDoProfessor["status"];
  if (!ligado) status = "desligado";
  else if (terminal) status = "terminal";
  else if (statusDoMotor === "failed" || erro) status = "falhou";
  else if (parado) status = "pausado";
  else if (atual?.final) status = "pronto";
  else if (statusDoMotor === "loading" && !atual) status = "carregando";
  else status = "calculando";

  return {
    status,
    profundidade: ligado && atual ? atual.profundidade : null,
    linhas: ligado && atual ? atual.linhas : [],
    barra: ligado ? barra : null,
    terminal: ligado ? terminal : null,
    erro: ligado ? erro ?? (statusDoMotor === "failed" ? "o motor não carregou" : null) : null,
  };
}
