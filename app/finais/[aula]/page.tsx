import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { perfilAtual } from "@/lib/auth/perfil";
import { nivelAberto } from "@/lib/curso/liberado";
import { nivelDoAluno as nivelDoAlunoDe } from "@/lib/curso/nivel";
import { nivelConquistado } from "@/lib/curso/progresso";
import { idsDeAula, lerPacoteDoAluno, aulasExtras } from "@/lib/finais/conteudo";
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
  const doAluno = lerPacoteDoAluno(aula);
  const titulo = doAluno?.versao === 2 ? doAluno.aula.titulo : doAluno?.pacote.lesson.title;
  return {
    title: titulo ? `${titulo} — Finais` : "Aula não encontrada",
  };
}

export default async function AulaDeFinais({ params }: PageProps<"/finais/[aula]">) {
  const { aula } = await params;
  const doAluno = lerPacoteDoAluno(aula);
  if (!doAluno) notFound();

  // Só o nível liberado abre (`lib/curso/liberado.ts`); o professor entra em tudo. O nível 1 abre
  // para todos e não lê a sessão — as aulas dele continuam pré-montadas no build.
  const nivel = aulaDaTrilha(aula, aulasExtras())?.nivel;
  if (nivel !== undefined && nivel > 1) {
    const perfil = await perfilAtual();
    const nivelDoAluno = nivelDoAlunoDe(await nivelConquistado(perfil.id));
    if (!nivelAberto(nivel, { papel: perfil.papel, nivelDoAluno })) redirect("/finais");
  }

  /*
   * **A aula v2 publicada vence a v1 do mesmo id (fatia 7).** O aluno segue o fluxo dela, no
   * mesmo player. O pacote inteiro fica aqui no servidor; ao navegador vão só as etapas
   * traduzidas, sem comentário privado de análise (plano §12).
   */
  if (doAluno.versao === 2) {
    // Aula v2 sem prática (trava 9, 15/9/2026): o aluno a fecha marcando que assistiu, como na v1.
    const semPratica = !doAluno.aula.etapas.some((etapa) => etapa.tipo === "pratica");
    const naTrilhaV2 = aulaDaTrilha(aula, aulasExtras()) !== undefined;
    return (
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-3 px-4 py-4 sm:px-5 lg:max-w-343 lg:py-5">
        <Suspense fallback={null}>
          <AulaNoNavegador aulaV2={doAluno.aula} leitura={semPratica && naTrilhaV2 ? <Leitura key="leitura" aula={aula} /> : undefined} />
        </Suspense>
      </main>
    );
  }
  const pacote = doAluno.pacote;

  /*
   * **Quem sabe se a aula é de leitura é o ARQUIVO dela, e não mais a trilha.**
   *
   * Era `aulaDaTrilha(aula)?.formato === "leitura"`. Os três formatos saíram em
   * 9/9/2026 (ver `lib/finais/trilha.ts`), e a pergunta que eles respondiam
   * ficou sendo uma só: a aula tem a etapa 4? Sem prática não há partida para
   * vencer, e o que fecha a aula é a declaração do aluno de que leu.
   *
   * Aula fora da trilha — um rascunho que o Doug abre para revisar — continua
   * sem o controle: o botão grava progresso, e rascunho não grava.
   */
  const naTrilha = aulaDaTrilha(aula, aulasExtras()) !== undefined;
  const deLeitura = naTrilha && pacote.lesson.stages.practice === undefined;

  return (
    /*
     * **A moldura é o TETO do palco, não a régua dele.** `max-w-5xl` (1024 px)
     * com `py-8 sm:py-10` era a página de antes do palco: 80 px de respiro
     * vertical e uma largura que estrangulava a conta do tabuleiro.
     *
     * 85,75rem ≥ tabuleiro no máximo (48rem) + vão (2,5rem) + painel
     * (32,625rem) + os 2,5rem de `px-5`, que somam 85,625 — arredondado para
     * cima de propósito, porque quem decide a largura real é `--aula-teto`, no
     * bloco "O palco da aula" de `app/globals.css`. A moldura só não pode
     * apertar a conta.
     *
     * O respiro caiu para `py-4`/`lg:py-5` (32 e 40 px) porque `--aula-teto` é
     * literalmente `100dvh` menos ele, o cabeçalho e o vão: cada pixel que sai
     * daqui entra no tabuleiro. Os números batem com os do CSS — 5,5rem no
     * desktop (40 + 36 + 12) e 6rem no celular (32 + 50 + 12) — e errar para
     * baixo devolve a rolagem que o palco existe para matar.
     */
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-3 px-4 py-4 sm:px-5 lg:max-w-343 lg:py-5">
      {/* O caminho de volta é o do próprio motor (LessonPlayer:121): dois links
          de voltar na mesma tela seriam duas respostas para a mesma pergunta. */}
      {/* O Suspense é obrigatório: `useSearchParams` numa rota estática exige
          um limite de suspense, ou a build reprova. O `null` no fallback é o
          que já acontecia — o motor devolve `null` até a store abrir a aula. */}
      <Suspense fallback={null}>
        <AulaNoNavegador
          pacote={pacote}
          leitura={deLeitura ? <Leitura key="leitura" aula={aula} /> : undefined}
        />
      </Suspense>
    </main>
  );
}
