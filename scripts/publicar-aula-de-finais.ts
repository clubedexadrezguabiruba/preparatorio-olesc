/**
 * Monta, confere e (se pedido) publica uma aula de finais a partir de um estudo em PGN, sem abrir a
 * tela do editor — o mesmo caminho do botão "Importar estudo" + Conferir + Publicar do Editor v2.
 *
 *   node scripts/publicar-aula-de-finais.ts <ID> <estudo.pgn> [opções]
 *
 * Opções:
 *   --titulo "…"        título da aula (padrão: o nome da aula na trilha, ou o StudyName)
 *   --autor X           autor do estudo (padrão: Annotator do PGN)
 *   --link URL          endereço do estudo (padrão: o do PGN)
 *   --obra "…"          obra/estudo de origem (padrão: StudyName)
 *   --empate 9,10       capítulos de prática cujo resultado declarado é empate (padrão: o [Result] do
 *                       capítulo — "1/2-1/2" é empate —, senão vitória do aluno)
 *   --substituir        refaz o documento v2 que já existe para este ID
 *   --publicar          publica se a conferência sair verde
 *   --so-conferir       monta e julga em memória: não cria posição, não grava, não pega a trava
 *                       (é o que a reescrita em paralelo usa)
 *   --nivel N --classe X  só para aula extra (EX-…); a do curso lê da trilha
 *
 * Precisa do editor local ligado: o script liga `EDITOR_LOCAL=1` e `NODE_ENV=development` só no
 * próprio processo. Ver `docs/COMO-FAZER-UMA-AULA-DE-FINAIS.md`.
 */
import { readFileSync } from "node:fs";

process.env.EDITOR_LOCAL = "1";
(process.env as Record<string, string>).NODE_ENV = "development";

const { adicionarPosicaoAoAcervo } = await import("../lib/editor-v2/acervo-em-disco.ts");
const { executarComando } = await import("../lib/editor-v2/comandos.ts");
const { conferirAulaV2, julgarDocumentoV2, lerPosicoesDoConteudoV2 } = await import("../lib/editor-v2/gate.ts");
const { lerRegua } = await import("../lib/lesson/voz.ts");
const { aulaDoAlunoV2 } = await import("../lib/editor-v2/fluxo-do-aluno.ts");
const { montarPacoteV2 } = await import("../lib/editor-v2/pacote.ts");
const { lerEstudo, planejarEstudo } = await import("../lib/editor-v2/importar-estudo.ts");
const { ADVERSARIO_PADRAO, aplicarNovaPratica, prepararPratica } = await import("../lib/editor-v2/pratica.ts");
const { prepararPublicacaoV2, publicarAulaV2 } = await import("../lib/editor-v2/publicar.ts");
const { gravarDocumentoV2, lerDocumentoV2 } = await import("../lib/editor-v2/rascunhos.ts");
const { aulaDaTrilha } = await import("../lib/finais/trilha.ts");
type AulaV2 = import("../lib/editor-v2/modelo.ts").AulaV2;
type RevisaoDaFenV2 = import("../lib/editor-v2/modelo.ts").RevisaoDaFenV2;

function opcoes(argv: string[]) {
  const posicionais: string[] = [];
  const flags: Record<string, string | true> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) { posicionais.push(arg); continue; }
    const nome = arg.slice(2);
    const valor = argv[i + 1];
    if (valor === undefined || valor.startsWith("--")) flags[nome] = true;
    else { flags[nome] = valor; i += 1; }
  }
  return { posicionais, flags };
}

async function main() {
  const { posicionais: [id, arquivo], flags } = opcoes(process.argv.slice(2));
  if (!id || !arquivo) { console.error("uso: node scripts/publicar-aula-de-finais.ts <ID> <estudo.pgn> [--publicar] [--substituir]"); process.exit(2); }
  const texto = readFileSync(arquivo, "utf8");
  const leitura = lerEstudo(texto);
  const daTrilha = aulaDaTrilha(id);
  const extra = id.startsWith("EX-");
  if (!extra && !daTrilha) throw new Error(`${id} não está na trilha (lib/finais/trilha.ts)`);

  const seco = Boolean(flags["so-conferir"]);
  const existente = lerDocumentoV2(id);
  if (existente && !flags.substituir && !seco) throw new Error(`${id} já tem documento v2 — use --substituir para refazer`);

  const titulo = typeof flags.titulo === "string" ? flags.titulo : daTrilha?.nome ?? leitura.estudo.nome ?? id;
  const lado = leitura.capitulos.find((c) => c.sugerido === "capitulo")?.lado ?? "white";
  const vazia: AulaV2 = {
    schemaVersion: 2, id, titulo,
    metadados: {
      orientacaoPadrao: lado, criterioDominio: "D1", estadoEditorial: "rascunho",
      ...(extra ? { nivel: Number(flags.nivel ?? 1), classe: String(flags.classe ?? "E") as "E" } : { classe: daTrilha!.classe as "E" }),
    },
    proveniencia: [], excecoes: [], analises: [], introducoes: [], capitulos: [], treinos: [], praticas: [], fluxo: [],
  };

  const agora = new Date().toISOString();
  const revisao: RevisaoDaFenV2 = {
    origem: "estudo-lichess",
    autor: typeof flags.autor === "string" ? flags.autor : leitura.estudo.autor ?? "clubexadrezguabiruba",
    obra: typeof flags.obra === "string" ? flags.obra : leitura.estudo.nome ?? titulo,
    ...(typeof flags.link === "string" ? { link: flags.link } : leitura.estudo.link ? { link: leitura.estudo.link } : {}),
    fenRevisada: "8/8/8/8/4k3/8/8/4K3 w - - 0 1",
    revisadoEm: agora,
    professor: "Doug",
    mostrarCredito: false,
    direitoDosTextos: true,
  };

  let positions = lerPosicoesDoConteudoV2();
  const plano = planejarEstudo(vazia, leitura, { destinos: {}, revisao }, positions);
  if (!plano.ok) throw new Error(plano.mensagem);

  const empates = new Set(String(flags.empate ?? "").split(",").filter(Boolean).map(Number));
  const praticas: AulaV2["praticas"] = [];
  const registros: AulaV2["proveniencia"] = [];
  let comAsAnteriores = vazia;
  for (const doEstudo of seco ? [] : plano.plano.praticas) {
    const resultadoDeclarado = empates.has(doEstudo.numero) || doEstudo.resultado === "draw" ? "draw" : doEstudo.lado === "white" ? "win-white" : "win-black";
    const resposta = await adicionarPosicaoAoAcervo({ aulaId: id, fen: doEstudo.fen, revisao: { ...revisao, fenRevisada: doEstudo.fen }, resultadoDeclarado, etiqueta: doEstudo.titulo });
    if (!resposta.ok) throw new Error(`a prática «${doEstudo.titulo}» não entrou: ${resposta.mensagem}`);
    plano.plano.avisos.push(...resposta.avisos);
    positions = { ...positions, [resposta.item.position.id]: resposta.item.position };
    const registro = { positionId: resposta.item.position.id, conteudoHash: resposta.item.conteudoHash, estado: resposta.item.position.status };
    const objetivo = resposta.item.position.expectedResult === "draw" ? "draw" : "win";
    const preparo = prepararPratica(comAsAnteriores, { titulo: doEstudo.titulo, positionId: resposta.item.position.id, ladoAluno: doEstudo.lado, objetivo, ...ADVERSARIO_PADRAO }, positions, registro);
    if (!preparo.ok) throw new Error(`a prática «${doEstudo.titulo}» não entrou: ${preparo.mensagem}`);
    praticas.push(preparo.preparo.pratica);
    registros.push(registro);
    comAsAnteriores = aplicarNovaPratica(comAsAnteriores, preparo.preparo);
  }

  const aula = executarComando(vazia, { tipo: "IMPORTAR_ESTUDO", plano: plano.plano, praticas, registrosDasPraticas: registros }, positions);
  if (seco) {
    console.log(`\n${id} — «${titulo}» (só conferir: nada gravado)`);
    console.log(`fluxo: ${aula.fluxo.map((e) => e.tipo).join(" → ")} → ${plano.plano.praticas.length} prática(s)`);
    console.log(`capítulos: ${aula.capitulos.length} (${aula.fluxo.flatMap((e) => e.comparacoes ?? []).length} variante(s) tocada(s) na hora, sem etapa própria), treinos: ${aula.treinos.length}`);
    if (plano.plano.avisos.length) console.log(`avisos da importação:\n  - ${plano.plano.avisos.join("\n  - ")}`);
    // As perdas de cada capítulo (lance que não pôde ser jogado, token não lido), menos as que todo estudo tem.
    const comuns = /dicas e os textos de desvio|praticar contra o computador|a prática desta versão não mostra texto/;
    for (const c of leitura.capitulos) for (const perda of c.perdas.filter((p) => !comuns.test(p))) console.log(`  ! PERDA «${c.titulo}»: ${perda}`);
    for (const c of leitura.capitulos) if (c.sugerido === "fora") console.log(`  X FORA «${c.titulo}»: ${c.pista}`);
    const problemas = julgarDocumentoV2(aula, positions, lerRegua());
    for (const p of problemas) console.log(`  ${p.severidade === "erro" ? "X" : "!"} ${p.codigo}: ${p.mensagem}`);
    console.log(`${problemas.filter((p) => p.severidade === "erro").length} erro(s), ${problemas.filter((p) => p.severidade !== "erro").length} aviso(s)`);
    const doAluno = aulaDoAlunoV2(montarPacoteV2(aula, positions));
    for (const e of doAluno.etapas) {
      if (e.tipo === "capitulo") console.log(`  aula «${e.titulo}»: ${e.passos.filter((p) => p.lance).length} lances${e.passos.some((p) => p.fala.startsWith("Voltamos")) ? ", com «Voltamos»" : ""}`);
      else if (e.tipo === "introducao") console.log(`  introdução: ${e.passos.length} quadro(s)`);
      else console.log(`  ${e.tipo}: ${e.rotulo}`);
    }
    return;
  }
  const gravado = gravarDocumentoV2(id, aula, existente?.hash ?? null);
  if (!gravado.ok) throw new Error(`não gravou: ${gravado.erro}${"problemas" in gravado && gravado.problemas ? `\n  ${gravado.problemas.join("\n  ")}` : ""}`);

  console.log(`\n${id} — «${titulo}»`);
  console.log(`fluxo: ${aula.fluxo.map((e) => e.tipo).join(" → ")}`);
  console.log(`capítulos: ${aula.capitulos.length} (${aula.capitulos.filter((c) => c.titulo.startsWith("Comparação")).length} de comparação), treinos: ${aula.treinos.length}, práticas: ${aula.praticas.length}`);
  if (plano.plano.avisos.length) console.log(`avisos da importação:\n  - ${plano.plano.avisos.join("\n  - ")}`);

  const conferencia = await conferirAulaV2(id);
  if (conferencia.impedimento) throw new Error(`conferência: ${conferencia.impedimento}`);
  const erros = conferencia.problemas.filter((p) => p.severidade === "erro");
  const avisos = conferencia.problemas.filter((p) => p.severidade !== "erro");
  console.log(`conferência: ${conferencia.verde ? "VERDE" : "VERMELHA"} — ${erros.length} erro(s), ${avisos.length} aviso(s)`);
  for (const p of erros) console.log(`  X ${p.codigo}: ${p.mensagem}`);
  const porCodigo = new Map<string, number>();
  for (const p of avisos) porCodigo.set(`${p.codigo}: ${p.mensagem}`, (porCodigo.get(`${p.codigo}: ${p.mensagem}`) ?? 0) + 1);
  for (const [chave, n] of porCodigo) console.log(`  ! ${chave}${n > 1 ? ` (×${n})` : ""}`);

  if (!flags.publicar) return;
  if (!conferencia.verde) throw new Error("não publicado: a conferência não está verde");
  const preparo = await prepararPublicacaoV2(id);
  if (!preparo.ok) throw new Error(`não publicado: ${preparo.motivo}`);
  const publicado = await publicarAulaV2(id, { impactoHash: preparo.impactoHash });
  if (!publicado.ok) throw new Error(`não publicado: ${publicado.motivo}`);
  console.log(`PUBLICADA: ${publicado.publicationId}${publicado.anterior ? ` (antes: ${publicado.anterior})` : ""}${publicado.mesmoConteudo ? " — mesmo conteúdo" : ""}`);
}

try {
  await main();
} catch (erro) {
  console.error(`\nFALHOU: ${erro instanceof Error ? erro.message : String(erro)}`);
  process.exit(1);
}
