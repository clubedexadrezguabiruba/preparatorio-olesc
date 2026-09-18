"use client";

import { useEffect, useRef } from "react";
import { Celebracao, useCelebracao } from "@/components/Celebracao";
import type { Nivel } from "@/lib/curso/nivel";

/** A conclusão das trilhas vem antes da prova; celebra uma vez e deixa claro o que acontece agora. */
export function AvisoDeNivelConcluido({ nivel }: { nivel: Nivel }) {
  const { seq, celebrar } = useCelebracao();
  const tentou = useRef(false);

  useEffect(() => {
    if (tentou.current) return;
    tentou.current = true;
    const chave = `preparatorio:nivel-${nivel}-concluido-celebrado`;
    try {
      if (localStorage.getItem(chave)) return;
      localStorage.setItem(chave, "1");
    } catch {
      // Sem armazenamento, a referência ainda impede repetição nesta montagem.
    }
    celebrar();
  }, [celebrar, nivel]);

  return (
    <>
      <Celebracao seq={seq} tela />
      <section role="status" className="cartao mt-4 max-w-sm border-metodo-cheio px-4 py-4 text-left">
        <h3 className="text-base font-semibold text-tinta">Parabéns, você terminou o nível {nivel}!</h3>
        <p className="mt-1 text-sm leading-relaxed text-tinta-media">
          Aguarde o professor liberar a prova e o nível 2. Enquanto isso, continue praticando todos
          os temas de tática e jogando partidas de treino — e anote suas partidas!
        </p>
      </section>
    </>
  );
}
