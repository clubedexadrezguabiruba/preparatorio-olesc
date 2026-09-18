#!/usr/bin/env bash
# As três máquinas, disparadas sozinhas a cada vez que um PGN de aula de finais é salvo.
#
# São segundos e custam zero, e é por isso que elas rodam aqui e os cinco agentes não: o erro
# aparece na hora em que foi escrito, e não uma semana depois. Disparar a corrida inteira a
# cada salvamento reescreveria o texto embaixo da mão de quem está escrevendo.
#
# Entra por stdin o JSON do PostToolUse; sai por stdout o JSON com o que o modelo deve ler.
# **Nunca falha a ferramenta**: o que ela devolve é contexto, não veredito.
set -uo pipefail

raiz="$(git rev-parse --show-toplevel 2>/dev/null)" || exit 0
cd "$raiz" || exit 0

entrada="$(cat)"
arquivo="$(printf '%s' "$entrada" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const j=JSON.parse(s);process.stdout.write(j.tool_input?.file_path??"")}catch{}})' 2>/dev/null)"

case "$arquivo" in
  *content/finais/estudos-aula/*.pgn) ;;
  *) exit 0 ;;
esac

id="$(basename "$arquivo" .pgn)"
saida="$(node scripts/conferir-estudo-finais.ts "$arquivo" 2>&1 | tail -25)"
regua="$(node scripts/publicar-aula-de-finais.ts "$id" "$arquivo" --so-conferir 2>&1 | grep -E '^\s*[X!]|PERDA|FORA|erro\(s\)' | head -40)"

# A revisão que existia deixa de valer: o arquivo mudou depois dela.
rm -f ".editor/revisao-pgn/$id.ok" 2>/dev/null

ID="$id" SAIDA="$saida" REGUA="$regua" node -e '
const texto = `As máquinas rodaram sozinhas sobre ${process.env.ID} (hook de salvamento do PGN).\n\n`
  + `## conferir-estudo-finais\n${process.env.SAIDA || "(sem saída)"}\n\n`
  + `## régua da aula montada\n${process.env.REGUA || "(sem saída)"}\n\n`
  + "Isto é a régua, não o veredito: quem conserta é um dos cinco revisores de /revisar-pgn-de-finais. "
  + "A marca de revisão deste PGN foi apagada — o arquivo mudou depois dela.";
process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: texto } }));
' 2>/dev/null
exit 0
