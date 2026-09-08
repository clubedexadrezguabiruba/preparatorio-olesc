import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LessonPlayer } from "@/components/lesson/LessonPlayer";
import { lerPacote } from "@/lib/finais/conteudo";
import { moduloDaAula } from "@/lib/lesson/schema";
import { idsDeMeioJogo } from "@/lib/meiojogo/conteudo";
import { registrarExercicio } from "../acoes";

/**
 * A aula de meio-jogo. É o **mesmo motor** de finais, e é essa a decisão de
 * 2026-09-07 inteira: o módulo antigo tinha tela própria com rolagem, e foi
 * recusado por isso. O que muda desta rota para a de `/finais/[aula]`:
 *
 * - a ação que grava é `registrarExercicio`, e ela escreve em
 *   `tentativa_meiojogo` em vez de `tentativas_aula`;
 * - não há `?revisao=1` — a revisão espaçada do meio-jogo ainda não existe, e
 *   por isso esta rota não precisa da casca de cliente que `/finais` tem para
 *   ler o parâmetro sem perder a estaticidade.
 *
 * **Estática**, pela mesma razão de lá: as aulas são conhecidas na build, o
 * conteúdo só muda com um deploy, e o celular no 4G recebe HTML pronto.
 * `dynamicParams = false` fecha a porta — id que não existe é 404 na hora.
 *
 * A ação de gravar desce como referência e é chamada do navegador quando o
 * aluno joga um lance: quem grava é a ação, não a renderização, e por isso a
 * página continua estática mesmo escrevendo no banco.
 */

export function generateStaticParams() {
  return idsDeMeioJogo().map((aula) => ({ aula }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: PageProps<"/meio-jogo/[aula]">): Promise<Metadata> {
  const { aula } = await params;
  const pacote = lerPacote(aula);
  return {
    title: pacote ? `${pacote.lesson.title} — Meio-jogo` : "Aula não encontrada",
  };
}

export default async function AulaDeMeioJogo({ params }: PageProps<"/meio-jogo/[aula]">) {
  const { aula } = await params;
  const pacote = lerPacote(aula);
  if (!pacote || moduloDaAula(aula) !== "meio-jogo") notFound();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 sm:py-10">
      {/* O caminho de volta é o do próprio motor (`LessonPlayer`), que olha o
          prefixo do id e aponta para `/meio-jogo`: dois links de voltar na
          mesma tela seriam duas respostas para a mesma pergunta. */}
      <LessonPlayer bundle={pacote} onExercise={registrarExercicio} />

      {/* A atribuição da obra, em toda tela do módulo. Não é rodapé decorativo:
          é a contrapartida declarada de o meio-jogo não ter teto de citação
          (ver o `_leia` de `content/sources.json`). */}
      <footer className="border-t border-borda-fraca pt-4 text-xs leading-relaxed text-tinta-fraca">
        Posições, exercícios, pontuação e nota de corte de Artur Yusupov, série{" "}
        <em>Build Up Your Chess / Boost Your Chess / Chess Evolution</em> (Quality Chess). Uso
        interno do preparatório, com exemplares adquiridos. A prosa em português é nossa.
      </footer>
    </main>
  );
}
