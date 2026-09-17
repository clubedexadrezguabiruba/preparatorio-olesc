"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LessonPlayer } from "@/components/lesson/LessonPlayer";
import type { AulaDoAlunoV2 } from "@/lib/editor-v2/fluxo-do-aluno";
import type { AulaV2 } from "@/lib/editor-v2/modelo";
import type { PacoteDeAula } from "@/lib/finais/conteudo";
import { useLessonStore } from "@/lib/lesson/store";
import { AulaComoAluno } from "./AulaComoAluno";
import { Menu } from "./Menu";

/**
 * "Assistir como aluno" direto da lista de aulas — pedido do Doug de 16/9/2026.
 *
 * Duas versões, dentro de um `⋯` para a lista não encher de botões:
 *
 * - **a do editor**: o "Fazer a aula inteira como aluno" que já existe, com o que ainda não foi
 *   publicado — e um aviso quando isso difere do que o aluno recebe;
 * - **a publicada**: o pacote que o aluno recebe hoje, no mesmo player.
 *
 * Nenhuma das duas grava progresso: o player não recebe o gancho de gravação.
 */
export function MenuAssistirAula({ aulaId, titulo, publicada }: { aulaId: string; titulo: string; publicada: boolean }) {
  const router = useRouter();
  return (
    <Menu
      rotulo={`Assistir «${titulo}» como aluno`}
      largura="w-72"
      classeDoBotao="foco flex shrink-0 items-center justify-center rounded-md px-3 text-base leading-none text-tinta-fraca hover:bg-carta-toque hover:text-tinta"
      itens={[
        { rotulo: "Assistir como aluno", ajuda: "A versão do editor, com o que ainda não publicou", aoEscolher: () => router.push(`/editor/v2/assistir/${aulaId}`) },
        {
          rotulo: "Assistir a versão publicada",
          ajuda: "O que o aluno recebe hoje",
          disponivel: publicada,
          motivo: "esta aula ainda não foi publicada",
          aoEscolher: () => router.push(`/editor/v2/assistir/${aulaId}/publicada`),
        },
      ]}
    />
  );
}

export function AssistirVersaoDoEditor({ aulaId, documento, mudou, publicada }: {
  aulaId: string;
  documento: AulaV2;
  /** A versão do editor difere da publicada. */
  mudou: boolean;
  publicada: boolean;
}) {
  const router = useRouter();
  const voltar = () => router.push("/editor");
  const aviso = mudou ? (
    <p role="status" className="mt-1 text-xs text-aviso-tinta">
      Esta versão tem mudanças que ainda não foram publicadas.{" "}
      <Link href={`/editor/v2/assistir/${aulaId}/publicada`} className="foco font-medium underline">Ver a publicada</Link>
    </p>
  ) : !publicada ? (
    <p role="status" className="mt-1 text-xs text-aviso-tinta">Esta aula ainda não foi publicada: os alunos não a recebem.</p>
  ) : null;
  return (
    <AulaComoAluno
      aulaId={aulaId}
      documento={documento}
      podePublicar={false}
      aoTerminar={() => {}}
      aoFechar={voltar}
      aoPublicar={() => {}}
      textoDeVolta="Voltar à lista de aulas"
      aviso={aviso}
    />
  );
}

export function AssistirVersaoPublicada({ aulaId, aulaV2, pacote }: { aulaId: string; aulaV2?: AulaDoAlunoV2; pacote?: PacoteDeAula }) {
  const router = useRouter();
  // Um id de publicação próprio por abertura, como em `AulaComoAluno`: a store do aluno recomeça do zero.
  const [aula] = useState(() => aulaV2 ? { ...aulaV2, publicationId: `assistir-${Date.now()}` } : undefined);
  useEffect(() => () => {
    useLessonStore.setState({ lessonId: null, trees: {}, practices: {}, message: null });
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-papel">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-borda-fraca px-4 py-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-tinta">Versão publicada</p>
          <p className="text-xs text-tinta-fraca">O que o aluno recebe hoje, do jeito que ele faz. Nada é gravado no progresso.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/editor/v2/assistir/${aulaId}`} className="foco rounded-md border border-borda px-3 py-2 text-sm text-tinta hover:bg-carta-toque">Ver a versão do editor</Link>
          <Link href="/editor" className="foco rounded-md border border-borda px-3 py-2 text-sm text-tinta hover:bg-carta-toque">Voltar à lista de aulas</Link>
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
        {aula ? <LessonPlayer aulaV2={aula} aoSair={() => router.push("/editor")} />
          : pacote ? <LessonPlayer bundle={pacote} />
          : null}
      </div>
    </div>
  );
}
