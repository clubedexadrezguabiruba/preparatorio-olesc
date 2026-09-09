#!/usr/bin/env bash
#
# O "exame de sangue" do git, rodado sozinho na abertura de cada sessão.
#
# Por que ele existe: em 2026-09-08 a branch `repertorio` foi construída em
# cima de um `main` que estava 50 commits atrás do servidor, e ninguém
# percebeu até a hora de juntar. O git não avisa — ele deixa você trabalhar
# meses sobre uma fundação velha. Este hook é o aviso que faltava.
#
# Ele NÃO reclama quando está tudo em dia. Aviso que aparece sempre vira
# paisagem, e paisagem não avisa nada.
#
# A explicação inteira, para humano, está em docs/COMO-TRABALHAR-COM-BRANCHES.md

set -u

git rev-parse --git-dir >/dev/null 2>&1 || exit 0

# Perguntar ao servidor. Com teto de tempo: sem rede, a sessão não pode
# ficar presa esperando.
rede="sim"
timeout 15 git fetch origin --quiet 2>/dev/null || rede="não"

git rev-parse --verify --quiet origin/main >/dev/null 2>&1 || exit 0

branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null | tr -cd 'A-Za-z0-9._/-')
meus=$(git rev-list --count origin/main..HEAD 2>/dev/null || echo 0)
deles=$(git rev-list --count HEAD..origin/main 2>/dev/null || echo 0)
sujos=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')

if   [ "$meus" -eq 0 ] && [ "$deles" -eq 0 ]; then
  veredicto="EM DIA"; conselho="nada a fazer."
elif [ "$deles" -eq 0 ]; then
  veredicto="SO VOCE ANDOU"; conselho="merge e push são limpos, sem risco."
elif [ "$meus" -eq 0 ]; then
  veredicto="SO O SERVIDOR ANDOU"; conselho="resolve com: git pull"
else
  veredicto="DIVERGIRAM"; conselho="NAO mesclar às cegas. Regra 3: git fetch origin && git merge origin/main && npm test"
fi

# Tudo em dia e nada pendente: calar. É o caso comum, e o silêncio é a graça.
if [ "$veredicto" = "EM DIA" ] && [ "$rede" = "sim" ]; then
  exit 0
fi

aviso=""
[ "$rede" = "não" ] && aviso='AVISO: nao consegui falar com o GitHub (sem rede?). Os numeros abaixo sao da ultima lembranca e podem estar velhos.\n'

contexto="EXAME DE SANGUE DO GIT (hook SessionStart)\n"
contexto="${contexto}${aviso}"
contexto="${contexto}branch: ${branch} | arquivos nao commitados: ${sujos}\n"
contexto="${contexto}meus commits que o servidor nao tem: ${meus}\n"
contexto="${contexto}commits do servidor que eu nao tenho: ${deles}\n"
contexto="${contexto}veredicto: ${veredicto} - ${conselho}\n"
contexto="${contexto}\nINSTRUCAO PARA O CLAUDE: o Doug nao e programador e pediu para ser avisado disto. "
contexto="${contexto}Na ABERTURA da proxima tarefa que mexa em codigo, diga a ele em UMA linha qual e o veredicto e o comando que resolve, "
contexto="${contexto}e aponte docs/COMO-TRABALHAR-COM-BRANCHES.md. Diga uma vez so; se ele ignorar, siga o trabalho. "
contexto="${contexto}Se o veredicto for DIVERGIRAM, avise ANTES de qualquer merge ou push."

printf '{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"%s"},"systemMessage":"Git: %s (%s commits seus / %s do servidor) - ver docs/COMO-TRABALHAR-COM-BRANCHES.md"}\n' \
  "$contexto" "$veredicto" "$meus" "$deles"
