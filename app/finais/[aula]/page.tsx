import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { idsDeAula, lerPacote } from "@/lib/finais/conteudo";
import { aulaDaTrilha } from "@/lib/finais/trilha";
import { AulaNoNavegador } from "./AulaNoNavegador";
import { Leitura } from "./Leitura";

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
 * **E continua estática depois do banco.** A etapa concluída é gravada por
 * `registrarEtapa`, que desce daqui como referência de ação e é chamada do
 * navegador quando a etapa acaba: quem grava é a ação, não a renderização. O
 * único pedaço de aula que depende do aluno é o controle da aula de leitura, e
 * ele busca o próprio estado ao montar (`Leitura.tsx`) — uma ida de rede nas
 * duas aulas que o têm, nenhuma nas outras 47.
 *
 * **E continua estática com o `?revisao=1` da F2.** Quem lê o parâmetro é a
 * casca de cliente (`AulaNoNavegador.tsx`), no navegador; lê-lo aqui via
 * `searchParams` derrubaria a estaticidade das 49 para servir a um parâmetro
 * que só muda em qual etapa a aula abre.
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

  // Quem sabe o formato é a trilha, não o arquivo da aula: uma curta rebaixada
  // para leitura muda de linha lá, e o arquivo continua o mesmo. Aula fora da
  // trilha — um rascunho que o Doug abre para revisar — não recebe o controle.
  const formato = aulaDaTrilha(aula)?.formato;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 sm:py-10">
      {/* O caminho de volta é o do próprio motor (LessonPlayer:121): dois links
          de voltar na mesma tela seriam duas respostas para a mesma pergunta. */}
      {/* O Suspense é obrigatório: `useSearchParams` numa rota estática exige
          um limite de suspense, ou a build reprova. O `null` no fallback é o
          que já acontecia — o motor devolve `null` até a store abrir a aula. */}
      <Suspense fallback={null}>
        <AulaNoNavegador
          pacote={pacote}
          leitura={formato === "leitura" ? <Leitura aula={aula} /> : undefined}
        />
      </Suspense>
    </main>
  );
}
