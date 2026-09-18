import type { Etapa } from "./serie.ts";

export type ExplicacaoDaEtapa = {
  titulo: string;
  texto: string;
};

export const EXPLICACAO_DA_ETAPA: Record<Etapa, ExplicacaoDaEtapa> = {
  aquecimento: {
    titulo: "Como funciona o aquecimento?",
    texto: "Você começa com 5 problemas mais fáceis deste tema. Eles ajudam seu olho a reconhecer o padrão antes das posições mais difíceis.",
  },
  serie: {
    titulo: "Como funciona a série?",
    texto: "Agora você resolve 24 problemas deste tema, em dificuldade crescente. A repetição serve para firmar o padrão e aprender onde ele aparece.",
  },
  prova: {
    titulo: "Como funciona a prova?",
    texto: "Aqui este tema aparece misturado com temas que você já estudou. O objetivo é reconhecer sozinho qual padrão usar, como acontece numa partida.",
  },
};

export const chaveDaExplicacaoDaEtapa = (etapa: Etapa) =>
  `preparatorio:explicacao-tatica:v1:${etapa}`;
