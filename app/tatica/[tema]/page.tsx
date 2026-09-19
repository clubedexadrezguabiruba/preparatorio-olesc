import { VistaDoTabuleiro } from "@/components/atalhos/Atalhos";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { perfilAtual } from "@/lib/auth/perfil";
import { EmTeste } from "@/components/tatica/CartaoDoTema";
import { BLOCOS, contaNoCurso, temaPorTag } from "@/lib/tatica/blocos";
import { temaAberto, temaEscrito } from "@/lib/tatica/conteudo";
import { escolherPuzzles } from "@/lib/tatica/escolher";
import { temaLiberado } from "@/lib/tatica/ordem";
import {
  linhasDoTema,
  progressoPorTema,
  puzzlesJaVistos,
  PUZZLES_POR_TEMA,
  temaZerado,
} from "@/lib/tatica/progresso";
import { etapaAtual, idsErradosParaAProva, METAS, quantosFaltam } from "@/lib/tatica/serie";
import { Serie } from "./Serie";
import { obterRodada, puzzlesPendentes } from "@/lib/tatica/rodadas";

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
      <Moldura tema={tema.nome} bloco={bloco?.nome ?? ""} emTeste={tema.emTeste}>
        <p className="cartao-vazio px-4 py-6 text-center text-sm text-tinta-fraca">
          Este tema é do currículo, mas o texto dele ainda não foi escrito. Siga pelos
          temas que já estão abertos.
        </p>
      </Moldura>
    );
  }

  const todosOsProgressos = await progressoPorTema();
  const feitosPorTema = new Map([...todosOsProgressos].map(([t, p]) => [t, p.feitos]));
  if (!temaLiberado(tag, feitosPorTema, perfil.papel === "professor")) redirect("/tatica");
  const progresso = todosOsProgressos.get(tag) ?? temaZerado();
  const etapa = etapaAtual(progresso.feitos);

  if (!etapa) {
    return (
      <Moldura tema={tema.nome} bloco={bloco.nome} emTeste={tema.emTeste}>
        <div className="flex flex-col gap-3 cartao px-4 py-6 text-center">
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

  const rodada = await obterRodada({
    aluno: perfil.id,
    chave: `tema:${tag}:${etapa}`,
    modo: etapa,
    tema: tag,
    selecionar: () => escolherPuzzles({
      tag,
      etapa,
      faltam,
      semente,
      jaVistos,
      // Tema em teste não se mistura na prova dos outros.
      outrosTemas: [...todosOsProgressos.keys()].filter((t) => {
        const outro = temaPorTag(t);
        return t !== tag && temaAberto(t) && outro !== undefined && contaNoCurso(outro);
    }),
    errados,
    }),
  });
  const puzzles = await puzzlesPendentes(rodada);

  return (
    <Moldura tema={etapa === "prova" ? "Prova — temas misturados" : tema.nome} bloco={etapa === "prova" ? "" : bloco.nome} emTeste={tema.emTeste}>
      {/* Fatia 10: x vira a vista e ? mostra os atalhos. */}
      <VistaDoTabuleiro escopos={[]}>
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
        key={`${rodada.id}:${progresso.feitos[etapa]}`}
        rodadaId={rodada.id}
        acertosAnteriores={progresso.acertos[etapa]}
        tema={tag}
        nomeDoTema={tema.nome}
        etapa={etapa}
        puzzles={puzzles}
        jaFeitosNaEtapa={progresso.feitos[etapa]}
        metaDaEtapa={METAS[etapa]}
        feitosNoTema={progresso.tentativas}
        totalNoTema={PUZZLES_POR_TEMA}
        explicacao={etapa === "prova" ? [] : escrito.explicacao}
        procure={etapa === "prova" ? [] : escrito.procure}
        cuidado={etapa === "prova" ? null : escrito.cuidado ?? null}
      />
      </VistaDoTabuleiro>
    </Moldura>
  );
}

/* ------------------------------------------------------------------ *
 * A moldura
 * ------------------------------------------------------------------ */

function Moldura({
  tema,
  bloco,
  emTeste = false,
  children,
}: {
  tema: string;
  bloco: string;
  /** `Tema.emTeste`: a pastilha e a frase curta, na mesma linha do título. */
  emTeste?: boolean;
  children: React.ReactNode;
}) {
  return (
    /*
     * A moldura é a mesma da aula de abertura, e pelo mesmo motivo: ela é o
     * TETO do palco, não a régua dele. 85,75rem ≥ tabuleiro no máximo (48rem)
     * + vão (2,5rem) + painel (32,625rem) + os 2,5rem de `px-5`, que somam
     * 85,625. Quem decide a largura real é `--aula-teto`, no CSS — a moldura
     * só não pode estrangular a conta.
     *
     * `max-w-xl` continua valendo abaixo de `lg`, onde o palco é uma coluna só.
     */
    <main className="aula-publicada mx-auto flex w-full max-w-xl flex-1 flex-col gap-3 px-4 py-4 sm:px-5 lg:max-w-343 lg:py-5">
      {/*
       * **O cabeçalho é uma LINHA, e isso é altura de tabuleiro.**
       *
       * Ele era três linhas empilhadas — voltar, título, bloco — com `gap-5`
       * abaixo. No palco, `--aula-teto` é literalmente `100dvh` menos o que
       * está fora do tabuleiro, então cada pixel que sai daqui entra nele. É a
       * mesma conta e o mesmo desenho da `Moldura` de
       * `app/aberturas/[cor]/[abertura]/page.tsx`, que registra os números
       * medidos.
       */}
      <header className="cabecalho-aula flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
        <Link href="/tatica" className="foco rotulo text-metodo-tinta hover:underline">
          ← Tática
        </Link>
        <h1 className="titulo text-tinta">{tema}</h1>
        {bloco ? <p className="text-xs text-tinta-fraca">{bloco}</p> : null}
        {emTeste ? (
          <p className="text-xs text-aviso-tinta">
            <EmTeste /> Não conta para nível, selos nem tarefas.
          </p>
        ) : null}
      </header>
      {children}
    </main>
  );
}
