import { Chess } from "chess.js";
import { Tablebase } from "./tablebase.ts";

const FEN = "8/4k3/2K5/8/8/8/1P6/8 w - - 0 1";
const LINHA = ["Kc7", "Ke6", "b4", "Kd5", "b5", "Kc5", "b6", "Kc4", "b7", "Kd5", "b8=Q"];
const tb = new Tablebase("content/tablebase-cache", true);
const j = new Chess(FEN);
let n = 1;

for (let i = 0; i < LINHA.length; i += 2) {
  const fen = j.fen();
  const perdem: string[] = [];
  const empatam: string[] = [];
  for (const m of j.moves({ verbose: true })) {
    const t = new Chess(fen);
    t.move(m);
    const r = await tb.lookup(t.fen());
    const uci = `${m.from}${m.to}${m.promotion ?? ""}`;
    if (r.category === "draw" || r.category === "cursed-win" || r.category === "blessed-loss") empatam.push(uci);
    else if (r.category === "win") perdem.push(uci);
  }
  console.log(`n${n}  ${fen}`);
  console.log(`     empatam (jogam a vitoria fora): ${empatam.join(" ") || "-"}`);
  console.log(`     PERDEM: ${perdem.join(" ") || "-"}`);
  j.move(LINHA[i]);
  if (LINHA[i + 1]) j.move(LINHA[i + 1]); else break;
  n += 1;
}
