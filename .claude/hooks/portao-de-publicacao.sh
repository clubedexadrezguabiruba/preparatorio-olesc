#!/usr/bin/env bash
# O portão: **nada de finais vai ao ar sem a revisão dos cinco.**
#
# Um hook roda um comando; ele não sabe chamar cinco subagentes. Então o que ele faz é o que um
# portão faz: **recusa** a publicação e manda rodar a `/revisar-pgn-de-finais`. A corrida é cara
# e demorada, e disparar ela por dentro de um hook a esconderia de quem está pagando por ela.
#
# A prova de que a revisão aconteceu é `.editor/revisao-pgn/<ID>.ok`, que a skill grava com o
# **hash do PGN**. Se o PGN mudou depois, a marca não vale mais — e o hook de salvamento a apaga.
#
# Como passar por cima, quando for o caso: `REVISAO_PGN=dispensada node scripts/publicar-…`.
# É explícito de propósito. Ninguém dispensa uma revisão sem escrever que dispensou.
set -uo pipefail

raiz="$(git rev-parse --show-toplevel 2>/dev/null)" || exit 0
cd "$raiz" || exit 0

comando="$(cat | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const j=JSON.parse(s);process.stdout.write(j.tool_input?.command??"")}catch{}})' 2>/dev/null)"

# Só publicação de aula de finais. Montar, conferir e `--so-conferir` passam livres.
case "$comando" in
  *publicar-aula-de-finais*--publicar*) ;;
  *) exit 0 ;;
esac
case "$comando" in *REVISAO_PGN=dispensada*) exit 0 ;; esac

id="$(printf '%s' "$comando" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const m=s.match(/publicar-aula-de-finais\.ts\s+(\S+)/);process.stdout.write(m?m[1]:"")})' 2>/dev/null)"
pgn="content/finais/estudos-aula/$id.pgn"
marca=".editor/revisao-pgn/$id.ok"

motivo=""
if [ ! -f "$pgn" ]; then
  exit 0   # sem PGN na convenção, este portão não tem o que julgar
elif [ ! -f "$marca" ]; then
  motivo="a aula $id nunca passou pelos cinco revisores nesta versão do PGN."
else
  agora="$(node -e 'const {createHash}=require("node:crypto");const {readFileSync}=require("node:fs");process.stdout.write(createHash("sha256").update(readFileSync(process.argv[1])).digest("hex"))' "$pgn" 2>/dev/null)"
  gravado="$(cat "$marca" 2>/dev/null)"
  [ "$agora" = "$gravado" ] || motivo="o PGN de $id mudou depois da última revisão (hash diferente do gravado em $marca)."
fi

[ -z "$motivo" ] && exit 0

MOTIVO="$motivo" ID="$id" node -e '
const razao = `PORTÃO DE PUBLICAÇÃO: ${process.env.MOTIVO}\n\n`
  + `Rode \`/revisar-pgn-de-finais ${process.env.ID}\` — os cinco revisores em série (arquiteto, `
  + "scaffolding, símbolos, voz, desenho), com a assinatura conferindo entre um e outro. Ela grava a "
  + `marca no fim.\n\nSe a revisão não for para acontecer agora, diga isso ao Doug e publique com `
  + "`REVISAO_PGN=dispensada` na frente do comando — nunca em silêncio.";
process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: razao } }));
' 2>/dev/null
exit 0
