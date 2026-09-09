"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { encerrarProvaDeNivel } from "@/app/nivel/acoes";

/**
 * O que acontece quando a prova de nível acaba: o servidor corrige.
 *
 * ## Por que é um componente, e não um botão
 *
 * Porque não há decisão do aluno aqui. As 12 linhas já foram julgadas uma a uma
 * por `gravarTentativa`, contra o arquivo do puzzle no disco; o que falta é
 * **contar**, e contar é do servidor. Um botão "ver o resultado" seria uma
 * cerimônia com um caminho só, e um caminho a mais para o aluno abandonar a
 * prova sem que ela conte.
 *
 * ## O `ref`, e o que ele impede
 *
 * O React monta um efeito duas vezes em desenvolvimento (`StrictMode`), e a
 * ação é uma escrita. Sem a trava, a concessão sairia em duplicata — o
 * `ignoreDuplicates` do `upsert` já absorveria isso no banco, mas duas idas ao
 * servidor por uma resposta que não muda é ruído que ninguém depura depois.
 *
 * ## Depois de corrigir, a página se refaz
 *
 * `router.refresh()` traz o aluno de volta à mesma rota, que agora encontra 12
 * linhas completas e desenha o **resultado** em vez de uma rodada nova. É o
 * mesmo movimento que a série já fazia no "Continuar" — só que aqui ele é
 * automático, porque não havia o que decidir.
 */
export function EncerrarProva({ nivel }: { nivel: number }) {
  const router = useRouter();
  const jaFoi = useRef(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (jaFoi.current) return;
    jaFoi.current = true;

    encerrarProvaDeNivel(nivel)
      .then(() => router.refresh())
      .catch(() =>
        setErro(
          "Não deu para conferir o resultado agora. As suas respostas estão gravadas — " +
            "recarregue a página.",
        ),
      );
  }, [nivel, router]);

  if (erro) {
    return (
      <p className="rounded-lg bg-aviso-superficie/12 px-3 py-2 text-sm text-aviso-tinta">{erro}</p>
    );
  }

  return (
    <p className="text-sm text-tinta-fraca" aria-live="polite">
      Conferindo o resultado…
    </p>
  );
}
