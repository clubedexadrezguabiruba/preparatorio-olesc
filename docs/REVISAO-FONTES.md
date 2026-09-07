# Revisão de fontes do repertório — 7/9/2026

> **A régua nova, dada pelo Doug em 7/9/2026:** *"pegar linha do motor não ensina
> nada a não ser decorar. As linhas que jogamos devem vir de fontes que explicam
> o motivo de cada lance e os planos, adequado para o nível e com explicação
> adequada para a faixa etária. Todas as linhas devem ser recomendações de alguma
> fonte confiável."*

Este documento mede o repertório contra essa régua, separa acerto de falha, e
propõe fonte para cada falha. Ele **não** executa nada: nenhuma linha foi mudada.

---

## 1. O que a régua nova exige, em três testes

A régua antiga (§5 do `REPERTORIO.md`) pedia **proveniência do lance**. A nova
pede mais. Uma linha só passa se cumprir os três:

1. **Lance com fonte** — o lance é recomendação de alguém, não escolha de motor.
2. **Motivo escrito na fonte** — a fonte diz *por quê*, e diz o plano. Fonte que
   dá o lance mudo reprova: o aluno só pode decorar.
3. **Nível adequado** — a recomendação serve para 12–15 anos de clube, e a
   explicação cabe em português de adolescente.

O teste 2 é o novo, e é ele que derruba o repertório.

---

## 2. O placar

**43 linhas compiladas. 11 passam. 32 reprovam.**

| Origem real dos lances | Linhas | A fonte explica? | Veredito |
|---|---:|---|---|
| **Krikor** (curso em português) | **11** | **Sim** — 262 comentários, 90 explicam plano, 0 perguntas | ✅ **passa** |
| **Grigoryan** (ChessMood) | 11 | **Não** — 140 comentários, 90 são pergunta sem resposta, 48 são rótulo (`Transposition`, `Mistake`), **4 explicam** | ❌ reprova |
| **Kushager** (Short & Sweet) | 1 | **Não** — **zero** comentários no arquivo inteiro | ❌ reprova |
| **Motor** (Stockfish) | 20 | **Não** — motor dá avaliação, nunca motivo | ❌ reprova |

### As 11 que passam, e por que elas passam

Todas vêm do **Krikor**, e não é coincidência: é a única fonte do corpus escrita
por um professor, em português, explicando plano.

- `brancas-alapin` ×3 · `brancas-escandinava` ×3 · `brancas-escocesa` ×3
  (as três "sem 3…exd4") · `brancas-philidor` ×2

Exemplo do que "explicar" quer dizer, literal do Krikor:

> *"convidando as pretas a fazer …exd4 mais uma vez. Uma dica é manter essa
> tensão e evitar fazer o lance 4.d5 … pois acredito que a posição fechada é
> mais fácil de jogar para as pretas"*

Compare com o que o Grigoryan escreve na mesma situação:

> *"Do you remember how do we play here? Check out the addition sections."*

---

## 3. As falhas se dividem em duas, e o custo é MUITO diferente

Esta é a distinção que decide o tamanho do trabalho.

### Falha A — o lance não tem fonte (20 linhas, as de motor)

Aqui o lance nasceu do Stockfish. Consertar significa **trocar o lance** pelo que
a fonte nova recomendar. E trocar lance **muda o id** (o id é o FNV-1a dos lances
em UCI, `lib/repertorio/linhas.ts:59`), o que **órfã o progresso** de quem já
treinou aquela linha.

Arquivos: `pretas-siciliana` (10), `pretas-londres` (2), `pretas-manhattan` (2),
`pretas-colle` (1), `pretas-outras` (1), `brancas-escocesa` (2),
`brancas-francesa` (1), `brancas-caro-kann` (1).

### Falha B — o lance tem fonte, mas a fonte não explica (12 linhas)

Aqui o lance **está certo e citado** — é recomendação do Grigoryan ou do
Kushager. O que falta é o *motivo*. Conserto: arrumar uma **fonte complementar
que explique aquela posição**, e reescrever o comentário.

**Os lances não mudam. O id não muda. Ninguém é órfão.** É o conserto barato, e
resolve mais de um terço das falhas.

Arquivos: `brancas-escocesa` (4), `pretas-siciliana` (3), `brancas-caro-kann` (1),
`brancas-petroff` (1), `pretas-manhattan` (1), + os 2 híbridos da `brancas-francesa`.

---

## 4. O que já está pago e disponível — medido na sua conta

Verificado ao vivo em `chess.com`, logado como `ProfDouglasVieira`, em 7/9/2026.

### O Diamond resgata cursos, sim

O filtro **"Grátis com Diamante"** existe e vale: ~300 cursos **Short & Sweet**
com o botão **"Resgatar Curso"**, custo zero adicional. Todo curso pago sai com
**30 % de desconto** para Diamond.

> ⚠️ **Correção importante:** os "Short & Sweet" **deixaram de ser gratuitos na
> Chessable** em 2/1/2025 (viraram exclusivos do PRO). O caminho gratuito hoje é
> **pelo chess.com, com o seu Diamond** — não pelo chessable.com. E o Diamond
> **não** dá Chessable PRO.

### Os 13 cursos que você já tem

Relevantes para o repertório:

| Curso | Cor | Serve para |
|---|---|---|
| **Short & Sweet: Plichta's Accelerated Dragon** (6 % feito) | Pretas | Buracos 5, 6, 7, 8 |
| **Short & Sweet: Kushager's 1.d4 d5** | Pretas | Manhattan (já usado) |
| Short & Sweet: Simon Williams's Jobava London | **Brancas** | ⚠️ lado errado — precisamos das pretas |
| Short & Sweet: Finegold's 1.d4 | **Brancas** | ⚠️ lado errado |
| Short & Sweet: Botvinnik English | **Brancas** | ⚠️ lado errado |
| The Tournament Starter Kit (D. King) | — | material de faixa etária |

### Os que resgatar hoje, de graça — confirmados na tela

| Curso | Autor | Cor | Tamanho | Cobre |
|---|---|---|---|---|
| **Short & Sweet: Anti-London System** | FM Viktor Neustroev | Pretas | 18 linhas, vídeo 1h32 | **Buracos 10 e 11** (Londres + Jobava) |
| **Short & Sweet: King's Anti-Sicilians for Black** | GM Daniel King | Pretas | 10 linhas, vídeo 1h20 | **Buracos 8 e 9** (Grand Prix, Fechada, Alapin, Morra, Rossolimo) |
| **Short & Sweet: Scotch** | WIM Fiona Steil-Antoni | Brancas | 10 linhas, vídeo 1h40 | **Buraco 2** — e a faixa declarada é **400–1600**, a nossa |

O **Anti-London** é o melhor achado da revisão: escrito explicitamente *"se você
responde 1.d4 com 1…d5"* — que é exatamente o nosso aluno — e ataca o centro e a
ala da dama, que é o plano `…c5` + `…Db6` que hoje só existe por motor.

---

## 5. Buraco a buraco — a proposta de fonte

Legenda: **✅ confirmado na tela** · **◐ índice lido, linha específica não** ·
**○ inferência, precisa conferir antes de escrever**

| # | Buraco | Hoje | Proposta | Custo | Estado |
|---|---|---|---|---|---|
| 1 | Caro Troca, brancas vs `4…Cf6` | motor | `Short & Sweet: Sielecki's 1.e4`; ou *Keep It Simple 1.e4 2.0* cap. 22-23 | grátis / US$ 34,99 | ○ |
| 2 | Escocesa vs `5…c5` e `5…b6` | motor | **`Short & Sweet: Scotch`** (Steil-Antoni); *The Scotch Game* (Bezgodov) nomeia os dois lances | **grátis** / livro | ✅ / ◐ |
| 3 | Francesa 3.Bd3 vs `3…Cc6` | motor | *Tackle the French with 3.Bd3* cap. 2; ou Ris (ChessBase, €9,90) | US$ 14,99 | ◐ |
| 4 | Francesa 3.Bd3 vs `3…c5`, lance 5 | híbrido | idem, cap. 4 (21 variações) | US$ 14,99 | ◐ |
| 5 | Bowdler `2.Bc4 Cc6`, lance 3 | motor | **Plichta AD** `#46 rare moves`, `#47 2.d3` — **já é seu** | **0** | ◐ |
| 6 | Dragão vs `5.Cxc6`/`5.Be3`/`5.Bc4` | motor | **Plichta AD** `#9`, `#10-15`, `#16-21` — **já é seu** | **0** | ✅ |
| 7 | Rossolimo vs `4.O-O` | motor | ⚠️ **Plichta joga `3…e5`, não `3…g6` — não serve.** Ver §7.1 | — | ✅ (é conflito) |
| 8 | `2.Cc3 Cc6` vs `3.Cf3`/`3.Bc4` | motor | **King's Anti-Sicilians** (Grand Prix, Fechada) | **grátis** | ✅ |
| 9 | Morra `2.d4 cxd4 3.c3` | motor | **King's Anti-Sicilians** (Smith-Morra, Alapin) | **grátis** | ✅ |
| 10 | Londres `…c5` + `…Db6` | motor | **Anti-London System** (Neustroev) | **grátis** | ✅ |
| 11 | Colle e Jobava | motor | **Anti-London System** cobre Jobava; Colle sem fonte dedicada | **grátis** (parcial) | ✅ / ○ |
| 12 | Inglesa, transposição | motor | `Short & Sweet: Sielecki's QGD` (cobre 1.c4 com `…e6`/`…d5`); `Short & Sweet: Anti-English` | **grátis** | ○ |

**Resumo do custo:** dos 12 buracos, **6 fecham de graça** (3 cursos a resgatar +
1 que você já tem), 1 é conflito de repertório a decidir, e 5 pedem compra entre
US$ 14,99 e US$ 34,99 — todos com os 30 % do Diamond.

---

## 6. Os acertos — o que a revisão confirma que está certo

Não é só falha. Três coisas se sustentam:

1. **A escolha do Krikor sobre o Grigoryan na Escandinava foi acerto medido.** O
   arquivo do Grigoryan tem **0** comentários; o capítulo do Krikor tem 41, média
   87 caracteres. Trocamos volume por explicação, e é a direção da régua nova.
2. **A política de proveniência já estava certa, só era frouxa demais.** A tag
   `[Fonte]` obrigatória é o que permitiu esta auditoria existir. Sem ela, não
   haveria como medir nada.
3. **A página de princípios (⚠12) é o formato certo para o que não tem fonte.**
   Quatro defesas raras viraram `/aberturas/notas/`, sem linha para decorar. É a
   terceira saída, e ela já funciona.

---

## 7. As três decisões que são suas

### 7.1 O Rossolimo — conflito de repertório, não buraco de fonte

Nosso aluno joga `3…g6` (Dragão Acelerado). Medido: **Plichta joga `3…e5`**,
**Daniel King joga `3…Cf6`**, **Schandorff evita com `2…g6`**. Nenhuma das fontes
boas joga o nosso lance. Ou trocamos o `3…g6` pelo `3…e5` do Plichta (que já é
seu), ou o Rossolimo vira página de princípios.

### 7.2 O Morra/Alapin — nosso plano não é o de ninguém

Nós declinamos com `3…Cf6` transpondo para a Alapin. Medido: **Plichta responde
`2…e5!?`**, **Bok muda para `…b5`/`…Ba6`**. Só o **King** cobre Morra e Alapin
juntos — e é grátis. Sugiro alinhar ao King.

### 7.3 Órfãos — e a janela que está aberta agora

Trocar os lances das 20 linhas de motor órfã o progresso. **Medido: não há
progresso de aluno real gravado** — só das contas de teste (`alunoteste`,
`zz.teste.*`). O repertório fecha para a aula de **19/9**, que ainda não
aconteceu.

**Ou seja: a janela para essa troca é agora, e ela fecha em 19/9.** Depois disso
cada linha trocada custa o progresso de 12 alunos.

---

## 8. Ordem de trabalho proposta

1. **Resgatar os 3 cursos grátis** (Anti-London, King's Anti-Sicilians, Scotch).
   Custo zero, fecha 6 buracos. — *decisão sua, é a sua conta*
2. **Falha B primeiro (12 linhas).** Não muda lance, não órfã ninguém, e já
   melhora um terço das falhas. Fonte complementar + comentário reescrito.
3. **Decidir 7.1 e 7.2** — sem isso o Rossolimo e o Morra não têm o que escrever.
4. **Falha A (20 linhas)**, na ordem de frequência que o aluno encontra.
5. **Endurecer a tag `[Fonte]`** para o compilador reprovar linha sem fonte que
   explique. Hoje o schema pede `min(3)` caracteres e nada mais
   (`lib/repertorio/linhas.ts:97`) — qualquer string passa.

---

## 9. Pendências declaradas

- **Nenhuma proposta da §5 foi verificada linha a linha.** Marquei ✅ só o que vi
  na tela (existência, cor, tamanho, preço). Que o curso X cubra a sublinha Y
  exige abrir o curso — e vários ainda não foram resgatados.
- **O Colle continua sem fonte dedicada.** Nenhum curso anti-Colle decente existe;
  a saída provável é tratá-lo como "Londres sem Bf4" ou mandá-lo para `notas/`.
- **A medição de "a fonte explica" é por arquivo, não por linha.** Grigoryan tem
  4 explicações em 140 comentários, e 3 delas estão no arquivo da Inglesa, que
  não usamos — por isso tratei as 11 linhas dele como reprovadas em bloco. Se
  alguma delas cair justamente sobre a única explicação usável, o número muda de
  32 para 31.
- **Não foi medido se os nossos comentários atuais carregam o argumento do
  Krikor** nas 11 linhas que passam. O `repertorio:fidelidade` põe os textos lado
  a lado, mas não compara — a leitura é humana e não foi feita.


---

## 10. O que os cursos resgatados de fato têm — medido em 7/9/2026

Dez cursos foram **lidos pela API do chess.com**: lances, posições (FEN) e a prosa
do autor lance a lance. Os dados ficam **fora do Git** (é curso pago, o
repositório é público), em `scratchpad/cursos/CORPUS.json` (1,2 MB).

### O corpus novo

| Curso | Autor | Cor | Variantes | Comentários | Média |
|---|---|---|---:|---:|---:|
| Anti-London System | FM Neustroev | pretas | 18 | 178 | 109 car. |
| King's Anti-Sicilians | GM D. King | pretas | 10 | 156 | 189 |
| Scotch | WIM Steil-Antoni | brancas | 10 | 123 | 296 |
| Sielecki's QGD | IM Sielecki | pretas | 11 | 192 | **705** |
| Plichta's Dragão Acelerado | FM Plichta | pretas | 32 | 569 | 405 |
| Kushager's 1.d4 d5 | IM Kushager | pretas | 10 | 263 | 186 |
| 1.e4 for Club Players | IM Toth | brancas | 18 | 184 | 134 |
| Sielecki's 1.e4 | IM Sielecki | brancas | 11 | 203 | 434 |
| Huschenbeth's 1.e4 | GM Huschenbeth | brancas | 10 | 144 | 164 |
| **Caro Kann't (Troca)** | Chess.com | brancas | 8 | 115 | 239 |
| **TOTAL** | | | **138** | **2.127** | **312 car.** |

**Contra o corpus antigo:** Grigoryan tem 140 comentários em 256 linhas, 90 deles
pergunta sem resposta e **4** que explicam. A razão de prosa por linha vai de
**0,55** para **15,4**.

> **Nota de método:** a primeira extração perdeu 35 % do texto — os comentários
> vêm em blocos aninhados (texto + lance inline + sub-blocos) e o leitor só lia o
> primeiro nível. Foi reescrito recursivamente e recolhido de novo: **0 perdidos**.
> As médias desta tabela são as corretas; as da primeira medição eram menores.

> **Achado que não custa nada:** o PGN do Kushager que temos em disco tem **zero**
> comentários; a mesma fonte no chess.com tem **263**. O export em PGN jogou a
> prosa fora. A linha do Manhattan ganha fonte explicativa **sem trocar um lance**.

### A Caro-Kann, resolvida de graça

A linha favorita do Doug é a Troca com `4.Bd3 Cc6 5.c3 Cf6 6.Bf4`. O curso
gratuito **"Caro Kann't: Beat 1...c6 with White"** (Chess.com, faixa 1200–1600,
8 linhas, 115 comentários) joga **as mesmas 5 primeiras jogadas**, e diverge só no
lance 6: ele joga **`6.h3`** em vez de `6.Bf4`, e explica por quê —

> *"Bd3 impede …Bf5, e depois impedimos …Bg4 com h3."*
> *"Dá para formular duas regras: jogue c3 contra …Cc6, jogue h3 contra …Cf6."*

Ou seja: a nossa ordem permite `6.Bf4 Bg4`, que é justamente o que o curso
trabalha para impedir. **É decisão de xadrez do Doug**, não de medição — mas a
fonte tem argumento escrito, e o nosso `6.Bf4` não tem nenhum.

Com esse curso, a `brancas-caro-kann` foi de **36 % para 73 %** de cobertura.

### Cobertura final do repertório atual

| Abertura | Linhas | Cobertura | Encaixes com prosa da fonte |
|---|---:|---:|---:|
| `pretas-outras` | 1 | 100 % | 10 |
| `brancas-petroff` | 1 | 87 % | 11 |
| `pretas-manhattan` | 3 | 81 % | 32 |
| `brancas-escocesa` | 9 | 78 % | 83 |
| `brancas-caro-kann` | 2 | 73 % | 13 |
| `brancas-francesa` | 3 | 67 % | 23 |
| `pretas-londres` | 2 | 66 % | 12 |
| `brancas-escandinava` | 3 | 60 % | 21 |
| `pretas-siciliana` | 13 | 56 % | 59 |
| `brancas-alapin` | 3 | 54 % | 9 |
| `brancas-philidor` | 2 | 20 % | 6 |
| `pretas-colle` | 1 | 13 % | 2 |

**281 encaixes** das nossas 43 linhas caem em posição que alguma fonte comenta —
matéria-prima para reescrever os 116 comentários do repertório.

**O Colle é o único buraco que sobrou sem fonte.** O Philidor tem 20 %, mas as
duas linhas dele já passam pelo Krikor: não é buraco, é só ausência nestes cursos.

### O que mudou nos buracos, de graça

- **Buraco 1 (Caro `4…Cf6`)** — fechado pelo curso gratuito. Era US$ 34,99.
- **Buracos 3 e 4 (Francesa `3.Bd3`)** — o **Huschenbeth joga `3.Bd3`**, duas
  variantes, **38 comentários**, na linha em que o Grigoryan tinha zero. Eram
  US$ 14,99.
- **Buraco 2 (Escocesa)** — o curso cobre `4…Cxd4 5.Dxd4 b6`, e também o
  **`4…Df6`** que estava em aberto no ⚠13.
- **Buracos 10 e 11 (Londres, Jobava)** — Anti-London, 11 das 18 variantes com
  `…Db6`.

**Custo total do que foi fechado: zero.** Os cinco buracos que a §5 orçava em
US$ 14,99–34,99 fecharam com cursos gratuitos ou já pagos.

### Os conflitos de escolha, que são decisão e não medição

| Posição | O que nós jogamos | O que a fonte joga |
|---|---|---|
| Caro Troca, lance 6 | `6.Bf4` (permite `…Bg4`) | Chess.com: **`6.h3`** (impede) |
| Rossolimo `3.Bb5` | `3…g6` | King: `3…Cf6` · Plichta: `3…e5` |
| Morra `2.d4 cxd4 3.c3` | declinar com `3…Cf6` | King: **aceitar** com `3…dxc3` |
| Alapin (pretas) | `2…Cf6` | King: `2…e6` · Plichta: `2…e5` |
| Londres | `2…c5` + `…Db6` | **Neustroev: igual** ✅ |
| Jobava | `1.d4 d5 2.Cc3` | Neustroev: chega por `2.Bf4 c5 3.Cc3` |


---

## 11. As decisões do Doug — 7/9/2026

Três conflitos da §10 foram decididos. Registrado aqui porque muda *quais linhas
existem*, e isso não é medição.

### 11.1 Caro-Kann: os dois lances, em níveis diferentes

- **`6.h3` entra no Base.** Tem fonte com argumento escrito (curso gratuito
  "Caro Kann't"), e as duas regras dele — *jogue c3 contra …Cc6, jogue h3 contra
  …Cf6* — são do tipo que o aluno guarda em vez de decorar.
- **`6.Bf4` vai para o Avançado.** É a linha favorita do Doug e a que já está no
  repertório hoje.

> ⚠️ **Pendência aberta:** o `6.Bf4` **continua sem fonte que explique**. O
> arquivo do Grigoryan joga o lance, mas tem **um** comentário, que é a
> assinatura. Pela régua da §1 essa linha reprova enquanto estiver assim.

### 11.2 Rossolimo: adotado o `3…Cf6` do Daniel King

E o encaixe é melhor do que parecia: **King joga `3…Cf6 4.Cc3 g6`** — volta para
o fianqueto, então o aluno mantém o mesmo esquema `…g6/…Bg7` do Dragão
Acelerado. Não é um sistema novo para decorar, é a mesma casa por outra porta.

A linha tem **20 comentários**, e ensina plano:

> *"O cavalo não parece bem na borda, mas está a dois passos de um belo posto
> avançado no meio do tabuleiro: …Ch6-f5-d4 — problema resolvido!"*

**Custo:** troca os lances da linha do Rossolimo → id novo → órfã o progresso
daquela linha. Dentro da janela até 19/9, custo zero.

### 11.3 Morra: continua declinando — e a fonte ainda não existe

Decisão: **declinar**, e achar quem declina. Estado da busca em 7/9/2026:

| Fonte | Custo | Veredito |
|---|---|---|
| King's Anti-Sicilians (temos) | — | **Aceita** com `3…dxc3`. Não serve. |
| Huschenbeth (temos) | — | Joga o Morra **pelas brancas**. Não serve. |
| Plichta (temos) | — | Responde a Alapin com `2…e5!?`. Não serve. |
| **Mop Up the Morra** (NM Logozar) | US$ 10,49 | Capítulo "The critical 7.Bg5" — é repertório de **aceitar**. Não serve. |
| **Finegold's Sicilian** | **grátis** | Descrição lista "Smith-Morra Gambit" entre as variantes. Faixa **400–1600**. **Não verificado se declina.** |
| **Magnus Sicilian** (Sielecki) | **grátis** | 27 linhas, 236 min, faixa 1200–1600. **Não verificado.** |

**Nenhuma fonte que declina foi confirmada ainda.** Os dois candidatos gratuitos
precisam ser resgatados para eu ler o que jogam.

### 11.4 A fonte que falta para o `6.Bf4` do Avançado

Melhor candidato medido: **"Combat the Caro-Kann with 3.exd5"** (GM Lukasz
Jarmula, **US$ 6,99** com Diamond, 32 linhas). Uma resenha confirma a ordem de
lances: *"depois da troca inicial e de **Bd3 Cc6 c3**, você recebe várias linhas
nos três lances mais óbvios das pretas: Dc7, Cf6 e g6"* — é a nossa ordem
exata, e o capítulo **`5…Cf6` tem 14 linhas**, que é justo onde `6.Bf4` × `6.h3`
se decide.

**Não confirmado que ele jogue `6.Bf4`.** É o teste mais barato disponível.

Alternativa maior: "Exchange and Win" (Brucomela, US$ 17,49, 433 linhas,
capítulos `1) 4…Cf6` com 31 linhas e `2) 5…e6` com 21).

### 11.5 Erro de método corrigido no meio da busca

Duas páginas de curso foram lidas com **slug truncado** e devolveram tela vazia
com o rótulo padrão "Curso Gratuito". Cheguei a registrar "Mop Up the Morra" e
"Combat the Caro-Kann" como gratuitos — **estava errado**: são US$ 10,49 e
US$ 6,99. Os endereços corretos estão nas tabelas acima.


---

## 12. O Magnus Sicilian resolve as duas pendências — 7/9/2026

Resgatado e lido: **Short & Sweet: Magnus Sicilian** (IM Christof Sielecki,
grátis com Diamante, faixa **1200–1600**, 27 variantes, **307 comentários**).
Ele fecha as duas pendências da §11 de uma vez.

### 12.1 O Morra declinado — resolvido

`1.e4 c5 2.d4 cxd4 3.c3 Cf6 4.e5 Cd5` — **a nossa linha exata**, com o motivo
escrito:

> *"Magnus enfrentou o Morra só uma vez, num jogo em que tinha 11 anos. Na época
> jogou a resposta questionável 3…Cc6, que não ajuda a escolher uma linha. Por
> isso vou de abordagem prática e recomendo **3…Cf6, que transpõe para a
> Alapin**."*
>
> *(no 4…Cd5)* *"E transpusemos para a Alapin, que normalmente surge de
> 1.e4 c5 2.c3 Cf6 3.e5 Cd5 4.d4 cxd4."*

É exatamente o nosso argumento — e agora tem autor. **Buraco 9 fechado, custo zero.**

Foram seis fontes verificadas até achar: King aceita, Finegold aceita, Logozar
aceita, Huschenbeth joga pelas brancas, Plichta responde a Alapin com `2…e5`.
**Só o Sielecki declina.**

### 12.2 O Rossolimo — a decisão do Doug pode ser revista

A §11.2 adotou o `3…Cf6` do King porque *nenhuma fonte boa jogava o nosso
`3…g6`*. **Isso deixou de ser verdade.** O Sielecki joga `3…g6`, com quatro
variantes, incluindo o **`4.O-O`** que era o buraco 7:

> *(no 3…g6)* *"Contra o Rossolimo as pretas têm duas linhas principais: 3…e6 e
> 3…g6. Magnus jogou as duas, mas na esmagadora maioria das partidas foi para o
> fianqueto."*
>
> *(no 4.O-O)* *"A escolha flexível das brancas, em vez de capturar em c6. Depois
> da nossa resposta natural 4…Bg7 os caminhos se separam."*

**As duas opções agora têm fonte:**

| | Lances | Fonte | Comentários | Órfã? |
|---|---|---|---|---|
| **(a) King** | `3…Cf6 4.Cc3 g6` | King's Anti-Sicilians | 20 | **sim** — troca o lance 3 |
| **(b) Sielecki** | `3…g6 4.O-O Bg7` | Magnus Sicilian | 4 variantes | **não** — é a nossa ordem atual |

A (b) mantém os quatro primeiros lances que já estão no repertório. As duas
chegam ao fianqueto; a diferença é a ordem e o que vem depois — o Sielecki
segue com o setup Botvinnik (`…e5`).

**Decisão do Doug, reaberta.**

### 12.3 Ressalva sobre adotar o Sielecki em bloco

O Magnus Sicilian é um repertório de **Sveshnikov** (`…e5`): 13 das 27 variantes
são disso. O nosso aluno joga **Dragão Acelerado** (`…g6`). Os capítulos que
interessam — Morra, Rossolimo, Alapin, Fechada, Grand Prix — são anti-sicilianas
e não dependem da escolha da linha principal, mas **não dá para adotar o curso
inteiro** sem trocar a siciliana do aluno.


---

## 13. Rossolimo — decisão final: `3…g6` com o Sielecki

### 13.1 Correção de um erro meu

A tabela da §12.2 dizia que a opção Sielecki **"não órfã"**. Está **errado**, e a
correção importa porque o Doug decidiu em cima disso. Medido lance a lance:

| Nossa linha | Bate com o Sielecki até | Diverge em |
|---|---:|---|
| `4.Bxc6 dxc6 5.d3 Bg7 6.h3` | 11 de 16 meios-lances | nosso `6…Cf6` × dele `6…Dc7` |
| `4.O-O Bg7 5.c3` | 9 de 16 | nosso `5…Cf6` × dele `5…e5` |

O id é o hash de **todos** os lances. As duas linhas mudam de id nas duas opções.
**O custo de órfão é idêntico: 2 linhas, com King ou com Sielecki.**

### 13.2 A comparação que decide, medida

| | Sielecki | King |
|---|---|---|
| Variantes **do nosso Rossolimo** | **4** | **1** |
| Comentários | 46 | 20 |
| Média por comentário | **453 car.** | 182 car. |
| 4º lance das brancas coberto | **`4.O-O` e `4.Bxc6`** | `4.Cc3` só |
| Bate com a nossa ordem até | **11 meios-lances** | 6 |

> **Nota:** o King tem 3 variantes de "Rossolimo", mas duas delas são
> `2.Cc3 Cc6 3.Bb5 Cd4` — outra posição, não a nossa. Do nosso Rossolimo ele tem
> **uma**.

### 13.3 O buraco que a opção King criaria

A própria prosa do King diz: *"Há duas respostas principais, **4.Cc3** (a mais
popular) e **4.e5**."* Ele dá linha só para o `4.Cc3`. Adotar o `3…Cf6`
obrigaria o aluno a saber também o que fazer contra `4.e5` — **um buraco novo**,
criado pelo próprio conserto.

### 13.4 E o esquema fica coerente

O aluno já joga `…g6` no lance 3 em toda a Siciliana (Dragão Acelerado). O
Sielecki mantém isso: **uma regra, não duas**. O plano dele com `…e5` (setup
Botvinnik) é o mesmo que a nossa linha atual já faz — a `a6563193` termina
justamente em `…e5`, só numa ordem diferente.

**Decisão: `3…g6`, fonte Sielecki (Magnus Sicilian).** Confirmada em 7/9/2026.


---

## 14. O mapa linha a linha — Bloco 1, medido em 7/9/2026

Cada uma das 43 linhas foi caminhada lance a lance contra o corpus (11 cursos,
165 variantes, 2.434 comentários), casando por **posição (FEN)** e não por nome.
A cobertura é **contígua**: conta do lance 1 até o primeiro lance que nenhuma
fonte joga.

### O placar

| Grupo | Linhas | O que significa | Mexe nos lances? |
|---|---:|---|---|
| **J** | **11** | O Krikor já explica. Não tocar. | não |
| **A** | **4** | A fonte joga a linha **inteira**. Só reescrever o comentário. | não |
| **C** | **12** | A fonte joga o tronco; diverge na cauda. | sim, a cauda |
| **E** | **11** | A fonte **joga esta abertura**, por outra ordem de lances. | sim, a ordem |
| **F** | **5** | Nenhuma fonte entra nesta abertura. | decisão dura |

**15 linhas não precisam mudar lance nenhum. 23 mudam. 5 são decisão.**

Dos 116 encaixes de comentário do repertório, **53 caem numa posição em que a
fonte escreveu prosa** — matéria-prima direta para reescrever.

### O grupo F, e o buraco que ele revela

| Linha | Entrada | Cobertura |
|---|---|---:|
| `pretas-siciliana-336144b9` | `1.e4 c5 2.Bc4 Cc6` | 17 % |
| `pretas-siciliana-092f6068` | `1.e4 c5 2.Bc4 Cc6` | 14 % |
| `pretas-siciliana-31cff340` | `1.e4 c5 2.Bc4 Cc6` | 13 % |
| `pretas-colle-f0590dc0` | `1.d4 d5 2.Cf3 Cf6` | 13 % |
| `pretas-outras-2ffa3251` | `1.c4 e6 2.Cc3 d5` | 17 % |

**Três das cinco são o Bowdler `2.Bc4`** — e pela §2.6 do `REPERTORIO.md` esse é
**o lance que a criança mais faz contra a Siciliana, ~31 % delas**. Nenhum dos
11 cursos entra nele: os autores escrevem para 1200+, e nessa faixa o `2.Bc4`
praticamente não aparece.

**É o maior buraco do repertório por frequência, e é estrutural:** não é falta de
procurar, é que a literatura de repertório não cobre lance de iniciante.

### A recomendação para o Bowdler

**Página de princípios**, não linha. É exatamente o caso do ⚠12: lance que o
aluno vê muito, que não tem teoria, e cuja resposta é um princípio — *desenvolva
normal e puna o bispo que saiu cedo* — e não uma sequência para decorar. O
formato de `/aberturas/notas/` já existe e já funciona.

Isso tira 3 linhas do Base e devolve uma página que cobre 31 % das Sicilianas.

### Onde a prosa da fonte está mais rasa

Nas 11 linhas do Krikor, **só 15 dos 39 encaixes** têm prosa dos cursos novos na
mesma posição — o que era de esperar: elas vêm de outro repertório. O Philidor é
o extremo, com **0 de 6**. Não é problema: o Krikor já explica essas linhas. Só
significa que os cursos do chess.com não ajudam a melhorá-las.


---

## 15. Bloco A entregue — as 4 linhas que só precisavam de citação

**O que se descobriu ao abrir:** os comentários dessas quatro **já carregavam o
argumento da fonte**. O que as reprovava na régua da §1 não era o texto — era a
**citação**. Três delas diziam "Livro + motor" ou citavam um autor que não
explica, quando existe fonte que explica exatamente aqueles lances.

| Linha | Fonte antiga | Fonte nova | Batimento |
|---|---|---|---|
| `brancas-escocesa-7b8467ff` | Livro + motor | **Steil-Antoni & Astaneh, "Scotch"**, variante *The Popular 4…Cxd4?!* | 15 de 15 meios-lances |
| `brancas-francesa-c384ccc4` | Grigoryan (0 prosa) | **Huschenbeth, "1.e4"**, variante *French #2* | 15 de 15 |
| `pretas-manhattan-7945d4d3` | Kushager (PGN sem prosa) | **Kushager, "The Manhattan #1"** — 263 comentários na versão do chess.com | por transposição Cc3/Cf3 |
| `pretas-siciliana-345142b0` | Grigoryan (0 prosa) | **Plichta, "Dragão Acelerado"**, variantes #12 e #13 | 16 de 16 |

### Verificação

- `repertorio:compilar` → 43 linhas em 12 arquivos, igual a antes
- **43 ids antes, 43 depois. 0 sumiram, 0 novos.** Nenhum aluno fica órfão
- diff do compilado: **só o campo `fonte`** mudou, em 6 linhas (as 4 mais as 2
  vizinhas que dividem o mesmo jogo PGN)
- typecheck ✔ · lint ✔ · **582 testes, 582 passando** ✔ · `validate:content` ✔ ·
  `compilar --check` sem diferença ✔ · `build` ✔

### Duas pontas ficaram declaradas dentro das tags

Os jogos PGN da Escocesa e da Francesa têm **duas linhas cada**, e só uma delas
tem fonte nova. Em vez de dividir o jogo (risco estrutural sem ganho), a tag
`[Fonte]` passou a nomear as duas metades com `||`, dizendo qual linha vem de
onde e qual **ainda espera fonte**:

- Escocesa `5…c5` — o curso cita o lance em prosa mas não dá linha
- Francesa `3…c5` — a escolha do lance 5 continua nossa

### Erro cometido e corrigido no bloco

A primeira escrita dos PGN converteu **378 quebras de linha de LF para CRLF**
(Python em modo texto no Windows), o que sujou os comentários compilados com
`
`. Pego no diff, revertido, recompilado. O diff final tem **10 linhas**, todas
de `fonte`.

**Placar da régua: de 11 linhas aprovadas para 15.**

---

## 16. Bloco F/Bowdler entregue — o maior buraco vira página, 7/9/2026

O grupo F da §14 tinha 5 linhas sem fonte nenhuma, e **3 delas eram o mesmo
bispo em c4**. Este bloco fecha essas três.

### O que se decidiu, e por quê

Não houve fonte para procurar. Isso não é desistência — é medição: **nenhum
dos 11 cursos do corpus entra na posição**, porque os autores escrevem para
1200+ e nessa faixa o `2.Bc4` quase não aparece. A régua da §1 exige que a fonte
explique o motivo; quando fonte nenhuma existe, cumprir a régua **não pode ser
inventar uma**.

E a própria medição da §2.6 do `REPERTORIO.md` dava a saída. Depois de `2.Bc4
Cc6` as quatro respostas mais comuns das brancas somam **73,2 %**, o número mais
espalhado da tabela inteira. **Posição que se dispersa em quatro não rende
sequência para decorar — rende uma ideia.** Decorar oito meios-lances dela era
exatamente o que a régua nova condena, mesmo que houvesse fonte.

A ideia cabe numa frase e tem motivo tático visível para uma criança de 12: **o
mate em f7 só existe porque o bispo de c4 defende a casa em que a dama pousa.**
Tire o bispo da diagonal com `…e6` e `4.Dxf7+ Rxf7` é uma dama de graça. E `…e6`
é o mesmo lance que prepara o `…d5` que expulsa o bispo: defesa e plano no mesmo
lance.

### O xadrez, medido em 7/9/2026

Mesma build da §8 (`stockfish-18.0.8-lite-single`, profundidade 20, MultiPV 5):

| Posição | O que o motor diz |
|---|---|
| `1.e4 c5 2.Bc4` | `2…Cc6` é a 1ª escolha, **igual**, e a linha dele é `…e6` + `…d5` batendo no bispo |
| `2.Bc4 Cc6 3.Dh5` | `3…e6!` — **pretas +0,96**; as 4 melhores das brancas depois dele ficam entre **+1,03 e +1,19 para as pretas**, e o `4.Dxc5` nem entra no corte |
| `2.Bc4 Cc6 3.d3` | `3…e6` é a 1ª escolha, **igual**, com `…a6`, `…b5`, `…Ca5` — o mesmo plano que estava na linha apagada |
| `3.Dh5 Cf6??` | `4.Dxf7#` — conferido na `chess.js`, é mate |
| `3.Dh5 d6?` | `4.Bxf7+` — **brancas +2,95**, e o rei nunca mais roca |

As duas últimas linhas viraram o campo `cuidado` da página. O número grande de
`3…e6` é o argumento pedagógico inteiro: **contra a dama que sai cedo, quem joga
o lance necessário antes do lance bonito ganha quase um peão de graça.**

### A moldura das notas estava errada, e teve de mudar junto

As quatro notas antigas eram "as raras": a tela dizia, em texto fixo, *"juntas
somam menos de 8 % das partidas"*. O bispo em c4 é o oposto — **~31 % das
sicilianas, a posição mais frequente do repertório inteiro**. Publicá-lo sob
aquele rótulo seria a página nascer mentindo.

Daí dois campos novos no schema (`lib/repertorio/notas.ts`):

- **`porque`** — cada nota diz **o seu** motivo de não ter linha. Quatro por
  raridade, uma por ausência de teoria. O rodapé fixo da tela sumiu; no lugar
  dele há um bloco "Por que não há linha para decorar" alimentado pelo dado.
- **`cor`** — as quatro raras são das brancas, esta é das pretas, e a página
  inteira fala em "ele" e "você". Sem o campo, o aluno abriria a nota achando
  que é ele quem joga `2.Bc4`.

O teste que dizia *"toda nota começa por 1.e4 — são respostas ao nosso primeiro
lance"* passava por acaso (a do bispo em c4 também começa por `1.e4`, só que do
outro lado). Foi trocado por um que **prende de verdade**: cada nota tem de parar
na vez do aluno, e a vez tem de bater com o campo `cor`.

### Um defeito antigo que a página nova tornou insustentável

As notas mostravam lance em **notação inglesa** — `Nc3`, `Nf3`, `Be2` — enquanto
o treinador, três cliques ao lado, fala português: `sanEmPortugues`, em
`lib/repertorio/treino.ts`, existe exatamente para isso. Nas quatro notas raras
eram seis referências soltas e o defeito passava. A do bispo em c4 tem **oito**,
e duas delas são o argumento inteiro da página (`3.Dh5`, `4.Dxf7+ Rxf7`): em
inglês a criança lê uma coisa na tela e escreve outra na planilha do torneio.

Consertado nas **cinco**, em duas metades:

- **A prosa** foi reescrita em português, direto no JSON.
- **O campo `lances`** continua em SAN inglês, e a tela é que traduz, por
  `lancesEmPortugues` (novo, em `notas.ts`). Inglês é o que a `chess.js` joga, e
  é só por isso que o teste consegue provar que o texto do alto da página é
  lance legal — um `Cf3` digitado errado passaria batido pelo zod e pela
  `chess.js`. Dado conferido de um lado, tela na língua do aluno do outro.

A armadilha, que o teste prende: **`R` é torre em inglês e rei em português.** Por
isso a tradução é a mesma função do treinador, e não uma segunda.

### O que mudou nos arquivos

| Arquivo | O quê |
|---|---|
| `content/repertorio/notas.json` | nota `bispo-em-c4` acrescentada em 1º lugar (a ordem do arquivo é a ordem de frequência); `cor` e `porque` nas cinco |
| `lib/repertorio/notas.ts` | schema com os dois campos novos, e o docstring com os **dois** motivos de uma nota existir |
| `lib/repertorio/notas.ts` | mais `lancesEmPortugues`, que traduz o campo `lances` na leitura |
| `lib/repertorio/notas.test.ts` | 5 slugs na ordem; teste novo de "para na vez do aluno"; teste novo de `porque` obrigatório |
| `content/repertorio/pretas-siciliana.pgn` | o jogo `Siciliana — bispo em c4` **apagado**; cabeçalho reescrito dizendo para onde ele foi; **duas referências cruzadas órfãs** consertadas (a tag `[Fonte]` do jogo `2.Cc3` e o comentário dele que citava "as três primeiras linhas deste arquivo") |
| `app/aberturas/page.tsx` | seção deixou de se chamar "As raras, por princípio"; cada item mostra "Você de brancas/pretas" |
| `app/aberturas/notas/[abertura]/page.tsx` | bloco "Por que não há linha para decorar"; selo da cor; rodapé falso removido |
| `lib/repertorio/banco.ts`, `gravar.ts`, `banco.test.ts` | a contagem 43 → 40 |
| `docs/REPERTORIO.md` | §2.6 reescrita; §2.10 e as tabelas de orçamento; ⚠1 e ⚠12 da §8 |

### Verificação

- `repertorio:compilar` → **40 linhas** em 12 arquivos (`pretas-siciliana` foi de
  13 para 10)
- **43 ids antes, 40 depois. Sumiram exatamente os 3 do Bowdler**
  (`336144b9`, `092f6068`, `31cff340`), **0 novos, 0 alterados** — conferido
  contra o `HEAD` arquivo por arquivo
- os 7 trechos SAN das 5 notas jogados na `chess.js`: **todos legais**
- as 5 notas varridas atrás de `N`, `Q` e `K` na prosa — as três letras que não
  existem em português: **nenhuma**
- as duas telas vistas de pé no `next dev`, logado como `alunoteste`: a nota
  inteira renderiza, e `/aberturas` diz **40 linhas**
- typecheck ✔ · lint ✔ · **585 testes, 585 passando** (eram 582; os 3 novos são
  os das notas: `porque` obrigatório, "para na vez do aluno" e a tradução) ✔ · `validate:content` ✔ · `compilar --check` sem diferença ✔ ·
  `build` ✔, com a rota `/aberturas/notas/[abertura]` no manifesto

### O preço, dito por inteiro

**3 ids sumiram** — e id que some órfa o progresso de quem treinou aquela linha,
pela §7.3. Coube agora porque **ainda não há progresso de aluno de verdade
gravado**, só contas de teste, e a janela fecha na aula de 19/9. Depois dela, uma
troca dessas custa o progresso da turma.

**Placar da régua: de 15 linhas aprovadas em 43 para 15 em 40** — o denominador
caiu, o numerador não. As 3 que saíram eram reprovadas, e a página que as
substitui não entra no placar: ela não pede que o aluno decore lance nenhum, que
é exatamente o que a régua da §1 cobra.

**Sobra do grupo F: 2 linhas** — `pretas-colle-f0590dc0` e `pretas-outras-2ffa3251`
— e o Colle continua sendo a única abertura do repertório sem fonte alguma (§9).


---

## 17. O mapa refeito sobre 40 linhas — e três correções na §14, 7/9/2026

O script que produziu o placar `J/A/C/E/F` da §14 **morreu junto com o scratchpad
da sessão que o escreveu.** O documento guardou o placar, não a lista: sabia-se
que havia 12 linhas no grupo C, não *quais*. A medição foi refeita do zero sobre
as 40 linhas de hoje.

**A medição virou script, para não se perder uma terceira vez:**
`npm run repertorio:mapear` refaz este mapa inteiro, e
`npm run repertorio:mapear <id-da-linha>` imprime a prosa da fonte lance a lance,
que é a matéria-prima do comentário. Ele lê o `CORPUS.json` de
`REPERTORIO_FONTES` — que fica fora do Git, porque é curso pago — e diz isso e
sai em paz quando não acha o arquivo.

> **Atenção ao comparar com as tabelas abaixo.** O script agrupa as **40**
> linhas; as tabelas desta seção cobrem só as **25** que sobram depois de tirar
> as 11 do Krikor (grupo J) e as 4 do bloco A. Por isso ele imprime *9* em "só
> ordem de lances" e a tabela mostra *8*: a diferença são linhas do Krikor, que
> não se tocam.

**A medição reproduz.** Mesmo corpus (11 cursos, 165 variantes, 2.434
comentários), mesmo casamento por posição, e o número que serve de prova bate:
**53 âncoras de comentário caem em posição com prosa da fonte** — o mesmo 53 da
§14. O total de âncoras caiu de 116 para 110, que são justamente as 6 das três
linhas do Bowdler que saíram.

> **Armadilha de FEN, para quem repetir a medição.** A `chess.js` 1.4 só escreve
> a casa de *en passant* quando a captura é de fato possível; o chess.com escreve
> sempre. Comparar as strings cruas dá **zero** posições em comum — nem o `1.e4`
> bate. Recarregar o FEN da fonte pela `chess.js` e reemitir normaliza os dois.

### O corte que reproduz não é o `C/E`

O `C/E` da §14 carregava julgamento humano ("a fonte joga esta abertura, por
outra ordem") e não se refaz sozinho. O que se mede sem opinião é melhor, porque
diz **que trabalho cada linha dá**: onde a cobertura contígua quebra, **quem
jogou o lance que quebrou**, e se a fonte volta a bater depois.

| Grupo medido | Linhas | O que é | Mexe nos lances? |
|---|---:|---|---|
| **Só ordem de lances** | **8** | A fonte chega na mesma posição por outra porta e volta a bater. | **não** |
| **Cauda de verdade** | **7** | Nós jogamos um lance que a fonte não joga, e ela não volta. | sim |
| **A fonte não cobre o ramo** | **9** | Quem sai da fonte é **ele**, não nós. Não há cauda para trocar. | não — falta fonte |
| **Sem fonte** | **1** | O Colle. | decisão dura |

#### Só ordem de lances — 8

| Linha | Quebra em | A fonte joga | Volta a bater | Âncoras com prosa |
|---|---|---|---|---:|
| `brancas-escocesa-903edd82` | `6.Cc3` | `6.De2` | `7…` | 3/3 |
| `pretas-siciliana-71793593` | `5.Be3` | `5.Cc3` | `6…` | 2/2 |
| `pretas-siciliana-1dc3b0cb` | `5.Bc4` | `5.Cc3` | `7.` | 2/2 |
| `pretas-siciliana-685348cf` | `3…g6` | `3…e5` | `5.` | 2/2 |
| `pretas-outras-2ffa3251` | `2.Cc3` | `2.Cf3` | `3.` | 2/2 |
| `pretas-londres-53d5b431` | `3…Cc6` | `3…Cf6` | `4…` | 1/3 |
| `pretas-manhattan-3e9e876d` | `4…Cbd7` | `4…dxc4` | `6.` | 1/2 |
| `pretas-siciliana-97331249` | `5.cxd4` | `5.Cf3` | `6…` | 1/4 |

As cinco de cima têm **todas** as âncoras de comentário caindo em prosa da fonte:
é reescrever o texto e trocar a citação, sem tocar em lance nenhum e sem órfar
ninguém.

#### Cauda de verdade — 7

| Linha | Quebra em | A fonte joga | Variantes da fonte |
|---|---|---|---:|
| `brancas-caro-kann-d2337d9b` | `6.Bf4` | `6.h3` | **6** |
| `brancas-escocesa-fe195431` | `6.e5` | `6.Cc3` | 2 |
| `pretas-siciliana-a6563193` | `6…Cf6` | `6…Dc7` | 1 |
| `pretas-siciliana-e6e1e081` | `5…Cf6` | `5…e5` | 1 |
| `pretas-siciliana-f9fa14c5` | `8…dxe5` | `8…Bd7` | 1 |
| `pretas-londres-1c8d69bc` | `3…Db6` | `3…Cc6` | 1 |
| `pretas-manhattan-6ac84e24` | `4…Cbd7` | `4…dxc4` | 1 |

#### A fonte não cobre o ramo — 9

`brancas-caro-kann-054a0df4` (`4…Cf6`), `brancas-escocesa-724ae4ca` (`5…Cf6`),
`brancas-escocesa-5250fcfd` (`5…d6`), `brancas-escocesa-a46c0bd6` (`5…c5`),
`brancas-francesa-746ed04d` (`3…c5`), `brancas-francesa-9d4caf37` (`3…Cc6`),
`brancas-petroff-934fd6a6` (`7…O-O`), `pretas-siciliana-2d329919` (`8.Cc3`),
`pretas-siciliana-2bfe81e8` (`3.Bc4`).

Aqui **não há cauda para trocar**: quem saiu do roteiro da fonte foi o
adversário. Ou a linha inteira ganha outra fonte, ou ela fica declarada como está.

### Correção 1 — o `6.Bf4` do Base contradiz a decisão da §11.1

A §11.1 decidiu, em 7/9: **`6.h3` entra no Base, `6.Bf4` vai para o Avançado.**
A linha compilada `brancas-caro-kann-d2337d9b` está `nivel: base` **e joga
`6.Bf4`**. A decisão está registrada e não foi executada.

E a fonte gratuita ("Caro Kann't", chave `carokann-troca` do corpus) joga
`4…Cc6 5.c3 Cf6 6.h3` em **seis variantes**, com prosa. É a linha mais barata do
grupo inteiro: fecha a pendência da §11.4 *no Base* e passa na régua da §1.

O `6.Bf4` do Avançado continua sem fonte — a pendência da §11.4 não morre, só
deixa de contaminar o Base.

### Correção 2 — `pretas-outras-2ffa3251` não é órfã de fonte

A §14 põe essa linha no grupo F, "nenhuma fonte entra nesta abertura". Medido
meio-lance a meio-lance: **10 dos 12 têm fonte**, e as **2 âncoras de comentário
caem em prosa**. O único furo é o `2.Cc3` dele — a fonte chega por `2.Cf3`. Do
lance 3 em diante bate tudo, com Kushager e Sielecki-QGD juntos, porque a linha
transpõe para o Manhattan.

**Sobra uma linha sem fonte alguma, não duas: o Colle.** Dela, do lance 2 em
diante, o corpus inteiro de `1.d4` vira Londres (`2.Bf4`, 21 variantes) ou
Gambito da Dama (`2.c4`, 14) — ninguém joga `2.Cf3` e `3.e3`.

### Correção 3 — as três Escocesas do `4…Cxd4` estão bloqueadas, não pendentes

Na posição exata depois de `5.Dxd4`, o curso escreve:

> *"From here, Black has tried many things. We can't cover everything in the
> course, so we'll tackle the five most popular continuations, which are 5…d6,
> 5…Cf6, 5…c5, 5…Df6 and 5…b6."*

O PGN do **Short & Sweet** — que é o que temos — traz **só o `5…b6`**, que é
exatamente a linha `brancas-escocesa-7b8467ff` já entregue no bloco A. As outras
quatro estão no curso completo.

Citar essa prosa **não resolve** `724ae4ca`, `5250fcfd` e `a46c0bd6`: ela
*nomeia* os lances e não explica nenhum deles. Pela régua da §1 isso é citação
sem argumento. Essas três dependem de comprar o curso completo ou de achar outra
fonte — não de escrever melhor.

