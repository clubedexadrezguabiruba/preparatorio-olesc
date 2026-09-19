import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { podeAbrir } from "@/lib/aberturas/vitrine";
import { nivelDoAluno } from "@/lib/curso/nivel";
import { nivelConquistado } from "@/lib/curso/progresso";
import { perfilAtual } from "@/lib/auth/perfil";
import { comLinhasDosTreinadores } from "@/lib/aberturas/linhas-da-aula";
import { abrirRodada } from "@/lib/aberturas/rodada-banco";
import { destinoDaAulaTrancada } from "@/lib/aberturas/trava";
import { travaDoAluno } from "@/lib/aberturas/trava-banco";
import { idDaAulaDeAbertura } from "@/lib/editor-v2/dominio";
import { aulaDoAlunoV2 } from "@/lib/editor-v2/fluxo-do-aluno";
import { pacoteAtivoDoAluno } from "@/lib/finais/conteudo-v2";
import { aberturaNoIndice } from "@/lib/repertorio/banco";
import { CORES, type Cor } from "@/lib/repertorio/linhas";
import { progressoDoRepertorio } from "@/lib/repertorio/progresso";
import { AulaDeAberturaNoNavegador } from "./AulaDeAberturaNoNavegador";

/**
 * Uma aula do curso de abertura, para o aluno — especificação §13.3 e §18.1 (16/9/2026).
 *
 * `/aberturas/brancas/francesa/aulas/b` abre `AB-BRANCAS-FRANCESA-B`. Dinâmica, e não estática como
 * `/finais/[aula]`: a aula de abertura depende do aluno já ao abrir — a vez dele decide o que se pula
 * e onde a aula retoma (regras 13 e 16), e a rodada nasce aqui.
 *
 * **Aula trancada volta para a página da abertura** (trava por aula, 17/9/2026): as aulas vão em
 * ordem, e quem digita `/aulas/c` sem ter concluído A e B cai onde o cadeado diz o que falta. O
 * redirecionamento vem **antes** de `abrirRodada`, senão a URL digitada deixaria uma rodada aberta
 * — e rodada aberta é uma das condições para o servidor aceitar gravar as linhas da aula.
 */

const ehCor = (valor: string): valor is Cor => (CORES as readonly string[]).includes(valor);
const idDaRota = (cor: Cor, abertura: string, bloco: string) =>
  /^[a-z0-9]{1,3}$/.test(bloco) && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(abertura) ? idDaAulaDeAbertura({ cor, abertura, bloco }) : null;

export async function generateMetadata({ params }: PageProps<"/aberturas/[cor]/[abertura]/aulas/[bloco]">): Promise<Metadata> {
  const { cor, abertura, bloco } = await params;
  const id = ehCor(cor) ? idDaRota(cor, abertura, bloco) : null;
  const pacote = id ? pacoteAtivoDoAluno(id) : null;
  return { title: pacote ? `${pacote.aula.titulo} — Preparatório OLESC` : "Aula não encontrada" };
}

export default async function AulaDeAbertura({ params }: PageProps<"/aberturas/[cor]/[abertura]/aulas/[bloco]">) {
  const { cor, abertura, bloco } = await params;
  if (!ehCor(cor)) notFound();
  const id = idDaRota(cor, abertura, bloco);
  const pacote = id ? pacoteAtivoDoAluno(id) : null;
  if (!id || !pacote) notFound();

  const perfil = await perfilAtual();
  // A abertura "em breve" não abre para o aluno, nem pela URL (`lib/aberturas/vitrine.ts`).
  if (!podeAbrir(cor, abertura, perfil.papel, nivelDoAluno(await nivelConquistado(perfil.id)))) redirect("/aberturas");
  const paginaDaAbertura = `/aberturas/${cor}/${abertura}`;
  const trava = await travaDoAluno(perfil);
  const destino = destinoDaAulaTrancada(
    trava.cursos.get(`${cor}/${abertura}`) ?? [],
    id,
    new Set(trava.concluidas.keys()),
    trava.quem,
    paginaDaAbertura,
  );
  if (destino) redirect(destino);

  const [entrada, aula, progresso, rodada] = await Promise.all([
    aberturaNoIndice(cor, abertura),
    // O move trainer recebe as linhas do repertório compilado, na ordem que a aula declara.
    comLinhasDosTreinadores(aulaDoAlunoV2(pacote)),
    progressoDoRepertorio(),
    abrirRodada(perfil.id, id, pacote.publicationId),
  ]);
  const idsDoTreinador = new Set(aula.etapas.flatMap((etapa) => (etapa.tipo === "treinador" ? etapa.linhaIds : [])));
  const progressoDasLinhas = Object.fromEntries([...progresso].filter(([linhaId]) => idsDoTreinador.has(linhaId)));

  return (
    <main className="aula-publicada mx-auto flex w-full max-w-xl flex-1 flex-col gap-3 px-4 py-4 sm:px-5 lg:max-w-343 lg:py-5">
      <AulaDeAberturaNoNavegador
        aula={aula}
        vez={rodada.vez}
        feitas={rodada.feitas}
        progressoDasLinhas={progressoDasLinhas}
        voltar={{ href: paginaDaAbertura, rotulo: `← ${entrada?.nome ?? "Abertura"}` }}
      />
    </main>
  );
}
