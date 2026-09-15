import type { Fala } from "../lesson/regua.ts";
import { lerPartidas } from "./ler.ts";
import type { Partida } from "./montar.ts";

/**
 * Tudo o que o aluno lê numa partida modelo, com o caminho de cada pedaço — para
 * a régua de `docs/VOZ-DO-CURSO.md` medir, como mede as aulas.
 *
 * A lista é **explícita**, pelo mesmo motivo de `falasDaAula`: a ficha tem FEN,
 * UCI e slug, e um coletor que adivinha o que é prosa erra nos dois sentidos.
 * Campo de texto novo na ficha entra aqui à mão.
 *
 * Fica de fora o que o aluno não lê: `correcoes` (registro editorial),
 * `autoria` e `fonte.referencia` (citação, não fala).
 */
export function falasDaPartida(p: Partida): Fala[] {
  const id = `partida ${p.slug}`;
  const falas: Fala[] = [
    { onde: `${id} / [Nome]`, texto: p.nome, tipo: "rotulo" },
    { onde: `${id} / [Tema]`, texto: p.tema, tipo: "rotulo" },
  ];
  const f = p.ficha;
  const lista = (campo: "intro" | "objetivos" | "momentoFinal" | "resumo" | "perguntas") => {
    for (const [i, texto] of f[campo].entries()) {
      falas.push({ onde: `${id} / ${campo}[${i}]`, texto, tipo: "fala" });
    }
  };
  lista("intro");
  lista("objetivos");
  lista("momentoFinal");
  lista("resumo");
  lista("perguntas");

  for (const m of f.momentos) {
    const onde = `${id} / momento ${m.n}`;
    falas.push({ onde: `${onde}.titulo`, texto: m.titulo, tipo: "rotulo" });
    falas.push({ onde: `${onde}.pergunta`, texto: m.pergunta, tipo: "fala" });
    falas.push({ onde: `${onde}.ideia`, texto: m.ideia, tipo: "fala" });
    falas.push({ onde: `${onde}.feedback`, texto: m.feedback, tipo: "fala" });
    if (m.alternativas.trim()) {
      falas.push({ onde: `${onde}.alternativas`, texto: m.alternativas, tipo: "fala" });
    }
  }

  // A narração: o comentário de cada meio-lance do PGN, já sem o [%autoria].
  for (const [ply, texto] of Object.entries(p.linha.comentarios)) {
    falas.push({ onde: `${id} / comentário do meio-lance ${ply}`, texto, tipo: "fala" });
  }
  return falas;
}

/** As falas de todas as partidas de `content/partidas/`. */
export function falasDasPartidas(raiz = process.cwd()): Fala[] {
  return lerPartidas(raiz).partidas.flatMap(falasDaPartida);
}
