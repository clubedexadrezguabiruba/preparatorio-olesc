import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { perfilAtual } from "@/lib/auth/perfil";
import { BLOCOS, temaPorTag } from "@/lib/tatica/blocos";
import { temaAberto, temaEscrito } from "@/lib/tatica/conteudo";
import { escolherPuzzles } from "@/lib/tatica/escolher";
import {
  linhasDoTema,
  progressoPorTema,
  puzzlesJaVistos,
  PUZZLES_POR_TEMA,
  temaZerado,
} from "@/lib/tatica/progresso";
import { etapaAtual, idsErradosParaAProva, METAS, quantosFaltam } from "@/lib/tatica/serie";
import { Serie } from "./Serie";

export async function generateMetadata({ params }: PageProps<"/tatica/[tema]">): Promise<Metadata> {
  const { tema } = await params;
  return { title: `${temaPorTag(tema)?.nome ?? "Tática"} — Preparatório OLESC` };
}

/**
 * A página de um tema de tática.
 *
 * **Quem escolhe os puzzles é o servidor, e isso não é detalhe de arrumação.**
 * A alternativa seria mandar o arquivo do tema inteiro para o celular e deixá-lo
 * sortear: 1,4 MB no 4G para resolver 24 puzzles, e o sorteio na mão de quem
 * também é dono do "acertei". Aqui descem os 24 escolhidos, e nada mais.
 *
 * O sorteio é semeado pelo id do aluno: dois alunos lado a lado veem séries
 * diferentes, e o mesmo aluno que recarrega a página vê a mesma série de novo.
 * Sem isso, um F5 no meio da série trocaria os puzzles e o progresso viraria
 * contagem de nada.
 */
export default async function Tema({ params }: PageProps<"/tatica/[tema]">) {
  const { tema: tag } = await params;

  const tema = temaPorTag(tag);
  if (!tema) notFound();

  const bloco = BLOCOS.find((b) => b.id === tema.bloco);
  const escrito = temaEscrito(tag);
  const perfil = await perfilAtual();

  // Tema do currículo que ainda não tem texto escrito: ele existe, mas não
  // abriu. Ter texto **é** o que abre — não há uma segunda lista de temas
  // liberados que pudesse discordar desta.
  if (!escrito || !bloco) {
    return (
      <Moldura tema={tema.nome} bloco={bloco?.nome ?? ""}>
        <p className="rounded-xl border border-dashed border-borda bg-carta px-4 py-6 text-center text-sm text-tinta-fraca">
          Este tema abre no Sábado {bloco?.sabado ?? "—"}. Até lá, siga pelos temas que já
          estão abertos.
        </p>
      </Moldura>
    );
  }

  const todosOsProgressos = await progressoPorTema();
  const progresso = todosOsProgressos.get(tag) ?? temaZerado();
  const etapa = etapaAtual(progresso.feitos);

  if (!etapa) {
    return (
      <Moldura tema={tema.nome} bloco={bloco.nome}>
        <div className="flex flex-col gap-3 rounded-xl border border-borda-fraca bg-carta px-4 py-6 text-center">
          <p className="titulo text-tinta">Tema concluído</p>
          <p className="text-sm text-tinta-media tabular-nums">
            {progresso.tentativas} puzzles ·{" "}
            {Math.round((100 * progresso.certos) / progresso.tentativas)}% de acerto
          </p>
          <Link href="/tatica" className="foco text-sm font-medium text-metodo-tinta underline">
            Escolher outro tema
          </Link>
        </div>
      </Moldura>
    );
  }

  const faltam = quantosFaltam(etapa, progresso.feitos);
  const jaVistos = await puzzlesJaVistos();
  const semente = `${perfil.id}:${tag}:${etapa}`;

  // Só a prova relê as linhas do tema: é nela que os errados voltam. A regra
  // inteira mora em `lib/tatica/escolher.ts`, que o script `db:tatica` prova.
  const errados = etapa === "prova" ? idsErradosParaAProva(await linhasDoTema(tag)) : [];

  const puzzles = await escolherPuzzles({
    tag,
    etapa,
    faltam,
    semente,
    jaVistos,
    outrosTemas: [...todosOsProgressos.keys()].filter((t) => t !== tag && temaAberto(t)),
    errados,
  });

  return (
    <Moldura tema={tema.nome} bloco={bloco.nome}>
      <Serie
        /*
         * A `key` é o que faz o botão "Continuar" funcionar.
         *
         * Ele chama `router.refresh()`, que troca as props vindas do servidor
         * mas **não** desmonta o componente de cliente: sem a `key`, a série
         * voltaria com puzzles novos e o estado velho — parada na tela de fim
         * da rodada anterior. Etapa e quantos já foram mudam sempre que uma
         * rodada termina, e é isso que remonta.
         */
        key={`${etapa}:${progresso.feitos[etapa]}`}
        tema={tag}
        nomeDoTema={tema.nome}
        etapa={etapa}
        puzzles={puzzles}
        jaFeitosNaEtapa={progresso.feitos[etapa]}
        metaDaEtapa={METAS[etapa]}
        feitosNoTema={progresso.tentativas}
        totalNoTema={PUZZLES_POR_TEMA}
        explicacao={escrito.explicacao}
        procure={escrito.procure}
        cuidado={escrito.cuidado ?? null}
      />
    </Moldura>
  );
}

/* ------------------------------------------------------------------ *
 * A moldura
 * ------------------------------------------------------------------ */

function Moldura({
  tema,
  bloco,
  children,
}: {
  tema: string;
  bloco: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-5 px-4 py-6 sm:px-5 sm:py-10">
      <header className="flex flex-col gap-1">
        <Link href="/tatica" className="foco rotulo w-fit text-metodo-tinta hover:underline">
          ← Tática
        </Link>
        <h1 className="titulo text-tinta">{tema}</h1>
        {bloco ? <p className="text-xs text-tinta-fraca">{bloco}</p> : null}
      </header>
      {children}
    </main>
  );
}
