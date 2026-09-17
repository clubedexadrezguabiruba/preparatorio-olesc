import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { perfilAtual } from "@/lib/auth/perfil";
import { comLinhasDosTreinadores } from "@/lib/aberturas/linhas-da-aula";
import { abrirRodada } from "@/lib/aberturas/rodada-banco";
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
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-3 px-4 py-4 sm:px-5 lg:max-w-343 lg:py-5">
      <AulaDeAberturaNoNavegador
        aula={aula}
        vez={rodada.vez}
        feitas={rodada.feitas}
        progressoDasLinhas={progressoDasLinhas}
        voltar={{ href: `/aberturas/${cor}/${abertura}`, rotulo: `← ${entrada?.nome ?? "Abertura"}` }}
      />
    </main>
  );
}
