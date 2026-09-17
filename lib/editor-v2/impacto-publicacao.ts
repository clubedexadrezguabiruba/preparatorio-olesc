/**
 * O que uma publicação muda no curso — especificação §20.1 ("mostra impacto em curso, nível,
 * alunos e avaliações") e plano §10 ("o editor calcula alunos e requisitos afetados antes da
 * publicação; conquistas históricas não são apagadas silenciosamente").
 *
 * Conta pura: compara o pacote ativo com o candidato, avaliação por avaliação, pela revisão.
 * Os **alunos** afetados vêm do banco e são contados na action, por fora — o banco pode não
 * responder, e o impacto do conteúdo não pode depender disso.
 */
import { dominioDaAulaV2 } from "./dominio.ts";
import { fechamentoDoNivel, type Nivel } from "../curso/nivel.ts";
import { aulaDaTrilha, extrasDaTrilha, type AulaDaTrilha } from "../finais/trilha.ts";
import type { PacoteV2 } from "./pacote.ts";

export type SituacaoDaAvaliacaoV2 = "nova" | "mudou" | "igual" | "removida";

/** O que o disco diz do curso hoje: quem está publicado e quais extras estão na trilha. */
export type CursoNoImpactoV2 = { publicadas: ReadonlySet<string>; extras: readonly AulaDaTrilha[] };

/** As aulas de finais exigidas para fechar o nível — os três números que a tela do aluno mostra. */
export type FinaisDoNivelV2 = { exigidas: number; declaradas: number; publicadas: number };

/**
 * O efeito real no fechamento do nível (§22: "o editor apresenta o efeito real no fechamento do
 * nível calculado pelo código"), com a mesma conta de `fechamentoDoNivel`.
 */
export type FechamentoNoImpactoV2 = { nivel: Nivel; antes: FinaisDoNivelV2; depois: FinaisDoNivelV2; nivelAnterior: Nivel | null };

export type ImpactoDaPublicacaoV2 = {
  aulaId: string;
  publicationIdAnterior: string | null;
  publicationIdNovo: string;
  /** Republicar o mesmo conteúdo: nada muda para ninguém. */
  mesmoConteudo: boolean;
  /** O nível em que a aula conta: o da trilha, ou o declarado numa extra válida. `null` fora da trilha. */
  nivel: number | null;
  /** Aula das 49, extra com nível e classe, ou fora da trilha (fixture, extra sem nível). */
  lugar: "curso" | "extra" | "fora";
  /** Antes e depois desta publicação. `null` fora da trilha, ou sem o retrato do curso. */
  fechamento: FechamentoNoImpactoV2 | null;
  temPratica: boolean;
  temPraticaAntes: boolean | null;
  avaliacoes: Array<{ entidadeId: string; tipo: "treino" | "pratica"; titulo: string; situacao: SituacaoDaAvaliacaoV2; revisao: string | null; revisaoAnterior: string | null }>;
};

function tituloDe(pacote: PacoteV2, entidadeId: string): string {
  return pacote.aula.treinos.find((t) => t.id === entidadeId)?.titulo
    ?? pacote.aula.praticas.find((p) => p.id === entidadeId)?.titulo
    ?? entidadeId;
}

/** Os números de finais do nível `n` para um retrato do curso — só a parte de finais importa aqui. */
function finaisDoNivel(n: Nivel, publicadas: ReadonlySet<string>, extras: readonly AulaDaTrilha[]): FinaisDoNivelV2 {
  const { exigidas, declaradas, publicadas: quantas } = fechamentoDoNivel(n, {
    temas: new Map(),
    finais: new Map(),
    publicadas,
    comPratica: new Set(),
    linhasAprendidas: 0,
    baseCompleto: false,
    extras,
  }).finais;
  return { exigidas, declaradas, publicadas: quantas };
}

export function impactoDaPublicacaoV2(anterior: PacoteV2 | null, novo: PacoteV2, curso?: CursoNoImpactoV2): ImpactoDaPublicacaoV2 {
  const ids = [...new Set([...Object.keys(anterior?.revisoes ?? {}), ...Object.keys(novo.revisoes)])].sort();
  const avaliacoes = ids.map((entidadeId) => {
    const antes = anterior?.revisoes[entidadeId];
    const depois = novo.revisoes[entidadeId];
    const situacao: SituacaoDaAvaliacaoV2 = !antes ? "nova" : !depois ? "removida" : antes.revisao === depois.revisao ? "igual" : "mudou";
    return {
      entidadeId,
      tipo: (depois ?? antes)!.tipo,
      titulo: depois ? tituloDe(novo, entidadeId) : tituloDe(anterior!, entidadeId),
      situacao,
      revisao: depois?.revisao ?? null,
      revisaoAnterior: antes?.revisao ?? null,
    };
  });
  const id = novo.aula.id;
  const doCurso = aulaDaTrilha(id);
  const comoExtra = doCurso ? undefined : extrasDaTrilha([{ id, titulo: novo.aula.titulo, metadados: novo.aula.metadados }])[0];
  const lugar = doCurso ? "curso" : comoExtra ? "extra" : "fora";
  const nivel = (doCurso?.nivel ?? comoExtra?.nivel ?? null) as Nivel | null;

  let fechamento: FechamentoNoImpactoV2 | null = null;
  if (curso && nivel !== null) {
    const extrasDepois = [...curso.extras.filter((a) => a.id !== id), ...(comoExtra ? [comoExtra] : [])];
    const publicadasDepois = new Set([...curso.publicadas, id]);
    const nivelAnterior = (curso.extras.find((a) => a.id === id)?.nivel ?? null) as Nivel | null;
    fechamento = {
      nivel,
      antes: finaisDoNivel(nivel, curso.publicadas, curso.extras),
      depois: finaisDoNivel(nivel, publicadasDepois, extrasDepois),
      nivelAnterior: nivelAnterior !== null && nivelAnterior !== nivel ? nivelAnterior : null,
    };
  }

  return {
    aulaId: novo.aula.id,
    publicationIdAnterior: anterior?.publicationId ?? null,
    publicationIdNovo: novo.publicationId,
    mesmoConteudo: anterior?.publicationId === novo.publicationId,
    nivel,
    lugar,
    fechamento,
    temPratica: novo.aula.praticas.length > 0,
    temPraticaAntes: anterior ? anterior.aula.praticas.length > 0 : null,
    avaliacoes,
  };
}

/** O impacto em frases de professor, na ordem em que importam. */
export function frasesDoImpactoV2(impacto: ImpactoDaPublicacaoV2, alunos: { comProgresso: number | null }): string[] {
  if (impacto.mesmoConteudo) return ["Esta publicação é igual à que está ativa: nada muda para os alunos."];
  const frases: string[] = [];
  const deAbertura = dominioDaAulaV2(impacto.aulaId) === "abertura";
  frases.push(impacto.publicationIdAnterior
    ? "Substitui a publicação v2 ativa; ela continua guardada e pode ser reativada."
    // Curso de abertura (§13.3.3, 16/9/2026): nunca teve versão v1 e não mora em /finais.
    : deAbertura
      ? "É a primeira publicação desta aula do curso de abertura: ela passa a aparecer na abertura, em /aberturas."
    // Uma extra nunca teve versão v1: dizer que os alunos "deixam de receber a versão antiga"
    // era falso para ela (achado no roteiro da 8F).
    : impacto.aulaId.startsWith("EX-")
      ? "É a primeira publicação desta aula extra: ela passa a existir para os alunos."
      : "É a primeira publicação v2 desta aula: os alunos deixam de receber a versão antiga.");
  frases.push(...(deAbertura ? ["Aula de curso de abertura: não conta para o fechamento de nenhum nível de finais."] : frasesDoFechamento(impacto)));
  for (const avaliacao of impacto.avaliacoes) {
    const nome = `${avaliacao.tipo === "pratica" ? "Prática" : "Treino"} «${avaliacao.titulo}»`;
    if (avaliacao.situacao === "nova") frases.push(`${nome}: avaliação nova${avaliacao.tipo === "pratica" ? " — o domínio da aula passa a depender dela" : ""}.`);
    if (avaliacao.situacao === "mudou") frases.push(`${nome}: a tarefa mudou. O domínio conquistado na versão anterior fica no histórico e não vale para a nova.`);
    if (avaliacao.situacao === "removida") frases.push(`${nome}: sai da aula. As tentativas antigas continuam guardadas.`);
  }
  if (!impacto.temPratica && !deAbertura) frases.push("A aula não tem prática: ninguém consegue dominá-la.");
  if (alunos.comProgresso === null) frases.push("Não foi possível contar os alunos com progresso nesta aula agora (o banco não respondeu).");
  else frases.push(alunos.comProgresso === 0 ? "Nenhum aluno tem progresso registrado nesta aula." : `${alunos.comProgresso} aluno(s) têm progresso registrado nesta aula.`);
  return frases;
}

const maiuscula = (frase: string) => frase.charAt(0).toUpperCase() + frase.slice(1);

const aulas = (n: number) => `${n} ${n === 1 ? "aula" : "aulas"}`;

/**
 * O fechamento em frases. Até a fatia 8 a janela dizia "conta para o fechamento do nível N"
 * para qualquer aula com nível — inclusive a extra, que nenhuma conta do curso lia (D5).
 */
function frasesDoFechamento(impacto: ImpactoDaPublicacaoV2): string[] {
  if (impacto.lugar === "fora") {
    return [impacto.aulaId.startsWith("EX-")
      ? "Esta aula extra não tem nível e classe declarados: fica fora da trilha e não conta para o fechamento de nenhum nível."
      : "Esta aula não está na trilha do curso: não conta para o fechamento de nenhum nível."];
  }
  const f = impacto.fechamento;
  const quem = impacto.lugar === "extra" ? "Aula extra: " : "";
  if (!f) return [maiuscula(`${quem}a aula conta para o fechamento do nível ${impacto.nivel}.`)];
  const frases: string[] = [];
  if (f.nivelAnterior !== null) frases.push(`${quem}sai da conta do nível ${f.nivelAnterior} e passa para o nível ${f.nivel}.`);
  if (f.antes.exigidas === f.depois.exigidas && f.antes.publicadas === f.depois.publicadas) {
    frases.push(`${quem}já conta para o fechamento do nível ${f.nivel}; a exigência continua ${aulas(f.depois.exigidas)} de finais (o nível declara ${f.depois.declaradas}, e há ${f.depois.publicadas} publicadas).`);
  } else {
    frases.push(
      `${quem}entra na conta do nível ${f.nivel}: para fechar o nível, antes ${aulas(f.antes.exigidas)} de finais, depois ${aulas(f.depois.exigidas)} ` +
        `(o nível declara ${f.depois.declaradas}; publicadas no nível: ${f.antes.publicadas} → ${f.depois.publicadas}).`,
    );
    if (f.depois.exigidas > f.antes.exigidas) {
      frases.push(`Quem ainda não fechou o nível ${f.nivel} passa a precisar de mais ${aulas(f.depois.exigidas - f.antes.exigidas)} de finais. Quem já conquistou o nível continua com ele.`);
    }
  }
  return frases.map(maiuscula);
}
