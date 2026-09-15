import { Chess } from "chess.js";
import { CURADORIA } from "./curadoria.ts";
import { problemasDoMomento } from "./momentos.ts";
import { plyDoLance, type Partida } from "./montar.ts";
import { falasDaPartida } from "./voz.ts";

/**
 * A trava das partidas modelo. Roda no `npm test` (`conteudo.test.ts`) e no
 * `npm run validate:content`. Lista vazia é aprovação.
 *
 * O que ela cobra, e o erro que cada item impede:
 *
 * 1. **Contagem da curadoria** — partida a mais, a menos, no nível errado, ou com
 *    um momento a mais. A curadoria é decisão do Doug (`curadoria.ts`).
 * 2. **FEN do momento = posição da partida no `ply`**, e **lance esperado = lance
 *    jogado**. O momento é da partida; uma FEN copiada errada ensinaria outra.
 * 3. **Alternativas boas** legais e diferentes do esperado (`momentos.ts`).
 * 4. **Exatamente um Desafio final** — é o critério de "concluída".
 * 5. **Nenhum símbolo da ficha fora do PGN** — a regra de 14/9, `AGENTS.md`.
 * 6. **A fonte existe** em `content/sources.json`, e é a mesma no PGN e na ficha.
 * 7. **Nenhum rótulo de nível antigo e nenhuma frase errada conhecida** — o que
 *    as fichas de origem tinham e a adaptação corrigiu não pode voltar.
 */

/**
 * Textos que não chegam ao aluno. Cada um tem o motivo; tirar um daqui é
 * decisão de conteúdo, não de código.
 */
export const FRASES_ERRADAS: readonly { padrao: RegExp; motivo: string }[] = [
  { padrao: /\[(essencial|clube|avan[cç]ad[ao])\]/i, motivo: "rótulo de profundidade da ficha antiga" },
  { padrao: /200\s*[–-]\s*700/, motivo: "a faixa das fichas; a turma é 700–1700" },
  { padrao: /\biniciantes?\b/i, motivo: "o texto é para a turma de 700–1700, não para iniciante" },
  { padrao: /\bcheques?\b/i, motivo: "é \"xeque\"; \"cheque\" é de banco (grafia das fichas)" },
  { padrao: /(?<!\p{L})roçou(?!\p{L})/iu, motivo: "é \"rocou\" ou \"fez o roque\"; \"roçou\" é de roçar (erro das fichas)" },
  { padrao: /torre de e4/i, motivo: "Capablanca–Villegas: no lance 21 a torre está em d4, não em e4" },
  { padrao: /\bRed1\b|\bTed1\b/, motivo: "Capablanca–Villegas: não havia torre em e1/e4 para ir a d1" },
  { padrao: /[uú]ltimo bloqueador/i, motivo: "Capablanca–Villegas: 33.Dxd6 tira a torre que ataca o peão; quem bloqueia c7 é a dama" },
  { padrao: /precisa ir a d8|rei a d8/i, motivo: "Tarrasch–Kurschner: o rei tinha três casas, não só d8" },
  { padrao: /roque prematuro/i, motivo: "Ruger–Gebhard: não era o erro real da partida" },
  {
    padrao: /(?<![\p{L}\p{N}])[NQK][a-h]?[1-8]?x?[a-h][1-8]/u,
    motivo: "notação inglesa no texto do aluno: é C (cavalo), D (dama), R (rei), T (torre)",
  },
];

const PECA_EM_INGLES: Record<string, string> = { C: "N", D: "Q", T: "R", R: "K", B: "B" };
const LANCE_PT = /^(\d+)(\.\.\.|\.)((?:O-O-O|O-O|[CDTRB][a-h]?[1-8]?x?[a-h][1-8]|[a-h]x[a-h][1-8](?:=[DTBC])?|[a-h][1-8](?:=[DTBC])?)[+#]?)[!?]*$/;
const PARECE_LANCE = /^\(?(?:\d+\.(?:\.\.)?)?(?:O-O-O|O-O|[CDTRB]?[a-h]?[1-8]?x?[a-h][1-8](?:=[DTBC])?)[+#]?[!?]*[),.;:]*$/;

/**
 * Os lances numerados que um texto cita e que não cabem na partida.
 *
 * `13.Txd7` no texto tem de ser, no meio-lance 24, **o lance jogado ou um lance
 * legal ali** — a segunda metade deixa a prosa falar da alternativa ("22...Tg2!
 * dava mate"). Só se confere o **primeiro** lance de uma sequência: o `23.Dd3`
 * de "22...Tg2! 23.Dd3 Txf2+" é da variação, e a posição dele não existe na partida.
 */
export function lancesCitadosForaDaPartida(texto: string, p: Partida): string[] {
  const fora: string[] = [];
  const pedacos = texto.split(/\s+/);
  for (const [i, bruto] of pedacos.entries()) {
    const limpo = bruto.replace(/^[(“"]+/, "").replace(/[),.;:”"]+$/, "");
    const casou = LANCE_PT.exec(limpo);
    if (!casou) continue;
    if (i > 0 && PARECE_LANCE.test(pedacos[i - 1])) continue;
    const ply = (Number(casou[1]) - 1) * 2 + (casou[2] === "..." ? 1 : 0);
    const emIngles = casou[3].replace(/^[CDTRB]/, (l) => PECA_EM_INGLES[l]).replace(/=([DTBC])/, (_, l) => `=${PECA_EM_INGLES[l] ?? l}`);
    const jogado = p.lances[ply];
    if (!jogado) {
      fora.push(`${limpo} (a partida não chega ao meio-lance ${ply})`);
      continue;
    }
    const semXeque = (s: string) => s.replace(/[+#]/g, "");
    if (semXeque(jogado.san) === semXeque(emIngles)) continue;
    let legal = false;
    try {
      legal = new Chess(jogado.fenAntes).moves().some((m) => semXeque(m) === semXeque(emIngles));
    } catch {
      legal = false;
    }
    if (!legal) fora.push(`${limpo} (no meio-lance ${ply} a partida tem ${jogado.san}, e ${emIngles} não é legal ali)`);
  }
  return fora;
}

export function problemasDasPartidas(
  partidas: readonly Partida[],
  fontes: ReadonlySet<string>,
): string[] {
  const problemas: string[] = [];
  const porSlug = new Map(partidas.map((p) => [p.slug, p]));

  for (const item of CURADORIA) {
    if (!porSlug.has(item.slug)) problemas.push(`curadoria: falta a partida "${item.slug}" (nível ${item.nivel})`);
  }
  for (const p of partidas) {
    const onde = `partida ${p.slug}`;
    const item = CURADORIA.find((c) => c.slug === p.slug);
    if (!item) {
      problemas.push(`${onde}: não está na curadoria aprovada (lib/partidas/curadoria.ts)`);
      continue;
    }
    if (p.nivel !== item.nivel) problemas.push(`${onde}: [Nivel "${p.nivel}"], e a curadoria diz ${item.nivel}`);
    if (p.ordem !== item.ordem) problemas.push(`${onde}: [Ordem "${p.ordem}"], e a curadoria diz ${item.ordem}`);

    const { momentos } = p.ficha;
    if (momentos.length !== item.momentos) {
      problemas.push(`${onde}: ${momentos.length} momentos, e a curadoria diz ${item.momentos}`);
    }
    const finais = momentos.filter((m) => m.desafioFinal).length;
    if (finais !== 1) problemas.push(`${onde}: ${finais} Desafios finais — tem de ser exatamente 1`);

    for (const [i, m] of momentos.entries()) {
      const deste = `${onde} / momento ${m.n}`;
      if (m.n !== i + 1) problemas.push(`${deste}: fora de ordem — esperava o momento ${i + 1}`);
      if (i > 0 && m.ply <= momentos[i - 1].ply) problemas.push(`${deste}: o ply ${m.ply} não vem depois do anterior`);
      if (m.lado !== p.cor) problemas.push(`${deste}: é das ${m.lado}, e o aluno joga de ${p.cor}`);
      problemas.push(...problemasDoMomento(m, deste));
      const jogado = p.lances[m.ply];
      if (!jogado) {
        problemas.push(`${deste}: a partida não tem o meio-lance ${m.ply}`);
        continue;
      }
      if (m.fen !== jogado.fenAntes) {
        problemas.push(`${deste}: a FEN não é a da partida no ply ${m.ply}\n    momento: ${m.fen}\n    partida: ${jogado.fenAntes}`);
      }
      if (m.uci !== jogado.uci) {
        problemas.push(`${deste}: o lance esperado é ${m.san}, e na partida foi ${jogado.san}`);
      }
    }

    for (const marca of p.ficha.marcasDaFonte) {
      const lido = plyDoLance(marca.lance);
      const jogado = lido ? p.lances[lido.ply] : undefined;
      const semXeque = (s: string) => s.replace(/[+#]/g, "");
      if (!lido || !jogado || semXeque(jogado.san) !== semXeque(lido.san)) {
        problemas.push(`${onde}: a marca "${marca.lance}${marca.simbolo}" não é um lance da partida`);
        continue;
      }
      if (!(p.nags[String(lido.ply)] ?? []).includes(marca.simbolo)) {
        problemas.push(
          `${onde}: ${marca.lance} perdeu o símbolo "${marca.simbolo}" que a ficha dá — ` +
            "o símbolo vai junto com o lance (AGENTS.md)",
        );
      }
    }

    if (p.ficha.fonte.slug !== p.fonteSlug) {
      problemas.push(`${onde}: [FonteSlug "${p.fonteSlug}"] e a ficha diz "${p.ficha.fonte.slug}"`);
    }
    if (!fontes.has(p.fonteSlug)) {
      problemas.push(`${onde}: a fonte "${p.fonteSlug}" não está em content/sources.json`);
    }

    for (const fala of falasDaPartida(p)) {
      for (const { padrao, motivo } of FRASES_ERRADAS) {
        if (padrao.test(fala.texto)) problemas.push(`${fala.onde}: ${motivo}\n    "${fala.texto}"`);
      }
      for (const citado of lancesCitadosForaDaPartida(fala.texto, p)) {
        problemas.push(`${fala.onde}: lance citado fora da partida — ${citado}`);
      }
    }
  }
  return problemas;
}
