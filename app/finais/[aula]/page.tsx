import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LessonPlayer } from "@/components/lesson/LessonPlayer";
import { idsDeAula, lerPacote } from "@/lib/finais/conteudo";

/**
 * A aula. Roda no servidor: lê o arquivo de `content/`, valida com o schema e
 * entrega ao motor já pronto.
 *
 * **Estática.** As aulas são conhecidas na build — o conteúdo só muda quando
 * alguém edita `content/` e faz um deploy —, então o aluno não espera leitura
 * de disco nenhuma, e o celular no 4G recebe HTML pronto. `dynamicParams =
 * false` fecha a porta: um id que não existe é 404 na hora, não uma tentativa
 * de renderizar sob demanda.
 *
 * Quando o B3 trouxer o banco, a etapa concluída passa a ser gravada por uma
 * server action chamada do cliente — a página continua estática, porque quem
 * grava é a ação, não a renderização.
 */

export function generateStaticParams() {
  return idsDeAula().map((aula) => ({ aula }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: PageProps<"/finais/[aula]">): Promise<Metadata> {
  const { aula } = await params;
  const pacote = lerPacote(aula);
  return {
    title: pacote ? `${pacote.lesson.title} — Finais` : "Aula não encontrada",
  };
}

export default async function AulaDeFinais({ params }: PageProps<"/finais/[aula]">) {
  const { aula } = await params;
  const pacote = lerPacote(aula);
  if (!pacote) notFound();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 sm:py-10">
      {/* O caminho de volta é o do próprio motor (LessonPlayer:121): dois links
          de voltar na mesma tela seriam duas respostas para a mesma pergunta. */}
      <LessonPlayer bundle={pacote} />
    </main>
  );
}
