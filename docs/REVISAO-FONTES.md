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
| 11 | Colle e Jobava | motor | **Anti-London System** cobre Jobava; Colle sem fonte dedicada | **grátis** (parcial) | ✅ **fechado na §22** |
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
>
> **Resolvida em 7/9 pela §19, por outro caminho:** o Doug decidiu ser ele a
> fonte. A linha é recomendação do professor, e o argumento passa a ser escrito
> aqui em vez de procurado fora.

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
| **Sem fonte** | **1** | O Colle. | ~~decisão dura~~ — **fechado na §22** |

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

> **Executada em 7/9 — ver §19.** E com um desfecho melhor do que o previsto
> aqui: o `6.Bf4` **não saiu**, virou a primeira linha do Avançado, com o
> professor como fonte. Como os lances dela não mudaram, o id não mudou, e o
> bloco fechou com **0 órfãos** em vez de 1.

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

---

## 18. Bloco "só ordem de lances" entregue — as 5 que não custam um lance, 7/9/2026

As cinco linhas da §17 cujas âncoras de comentário caem **todas** em prosa da
fonte. A fonte chega na mesma posição por outra porta e volta a bater antes do
fim, então não há lance a trocar: **o trabalho é escrever o argumento e dizer de
quem ele é.**

| Linha | Quebra em | A fonte nova | Onde ela volta a bater |
|---|---|---|---|
| `brancas-escocesa-903edd82` | `6.Cc3` | **Steil-Antoni & Astaneh, "Scotch"**, *Classical Variation #1* e *#2* | `7…d6`, e o `8.Be3` é o lance dela |
| `pretas-siciliana-71793593` | `5.Be3` | **Plichta, "Dragão Acelerado"**, tronco `5.Cc3 Bg7 6.Be3 Cf6 7.Bc4 O-O` (#2 a #13) | `6…Bg7` |
| `pretas-siciliana-1dc3b0cb` | `5.Bc4` | idem, mesmas variantes | `7.Cc3` |
| `pretas-siciliana-685348cf` | `3…g6` | **Plichta**, variantes *#30* a *#32* | `5.Cxd4` |
| `pretas-outras-2ffa3251` | `2.Cc3` | **Sielecki, "QGD"**, *The English* + **Kushager, "1.d4 d5"**, *The Manhattan #1–#3* | `3.d4` |

### O que cada uma ganhou de argumento

- **Escocesa** — o curso escolhe `5.Cb3` por dois motivos escritos: menos teoria
  decorada, e é a que permite a montagem mais agressiva. E ele mesmo diz que
  `6.De2` e `6.Cc3` dão no mesmo, sendo **a nossa a mais popular das duas** — é
  isso que o comentário do `8.Be3` agora conta, para o aluno não estranhar.
- **Dragão, `5.Be3`** — por que o bispo dele acaba sempre em e3: é o único lance
  que defende o cavalo de d4 e desenvolve no mesmo tempo.
- **Dragão, `5.Bc4`** — enquanto o bispo estiver naquela diagonal o `…d5` não
  sai; o autor escolhe o roque no lugar do `…Da5` que jogou por anos.
- **`2.Cc3`** — o curso recomenda `2…Cc6` **justamente** para poder responder
  `3.Cf3` com `3…g6`. E ganhou o melhor achado do bloco: ao pôr o cavalo em c3
  cedo, as brancas abrem mão do Maróczy sozinhas, porque o peão de c2 teria de
  passar por c3 para chegar a c4.
- **`1.c4`** — o `4…Cbd7` tira o xeque `Da4+` do caminho, que mataria o `…c5`
  antes de nascer; o `5…Bb4` prega o cavalo que ataca d5; o `6…c5` é o ponto da
  variante. Fecha a correção 2 da §17.

### As tags `[Fonte]` de três jogos foram partidas com `||`

Mesmo problema do bloco A: um jogo PGN carrega mais de uma linha e a tag é uma
só. As metades sem fonte nova ficam **declaradas dentro da própria tag**:

- **Escocesa, jogo 1** — as outras três (`4…Cf6`, `5…d6`, `5…Cf6`) seguem no
  Grigoryan; as duas do `5.Dxd4` estão bloqueadas pela correção 3 da §17.
- **Dragão, jogo do 5º lance** — o `5.Cxc6` fica em Livro + motor. O Plichta
  cobre esse lance na variante #5, mas sai da nossa linha no `8.Cc3` **dele**.
- **`2.Cc3`** — o ramo `3.Bc4` continua em Livro + motor: nenhum curso do corpus
  entra nele.

### Duas âncoras de tronco ficaram como estavam, de propósito

O `4.Cxd4` da Escocesa e o `4…g6` do Dragão são nós **compartilhados** com
linhas que não são deste bloco, e a prosa da fonte que cai neles é abertura de
capítulo, não argumento de lance. Reescrevê-los seria mexer em quatro linhas
para ganhar nada. O `2…Cc6` do `2.Cc3` também é compartilhado, e esse **foi**
reescrito: ali a prosa do Plichta é argumento de lance de verdade.

### Verificação

- `repertorio:compilar` → 40 linhas em 12 arquivos, igual a antes
- **40 ids antes, 40 depois, 0 alterados.** Nenhum aluno fica órfão
- diff do compilado: só `fonte` (10 linhas, as 5 mais as 5 que dividem o mesmo
  jogo PGN) e 6 comentários. **Zero** mudança em `lances`, `sans` ou `fen`
- `repertorio:mapear` repete os números de controle: 11 cursos / 165 variantes /
  2.434 comentários, **110 âncoras e as mesmas 53** em prosa
- typecheck ✔ · lint ✔ · **585 testes, 585 passando** ✔ · `validate:content` ✔ ·
  `compilar --check` sem diferença ✔ · `build` ✔

**Placar da régua: de 15 linhas aprovadas para 20.**

---

## 19. Caro-Kann entregue — o Base troca de lance e o Avançado ganha autor, 7/9/2026

Executa a correção 1 da §17 e fecha a §11.1. O Base passa a jogar `6.h3`, com a
fonte gratuita que explica; o `6.Bf4` do Doug vira a **primeira linha do
Avançado** do repertório.

### A decisão do Doug mudou o custo do bloco inteiro

O plano previa que o `6.Bf4` sairia do repertório, e por isso previa órfão: "1
id some, 1 nasce". O Doug decidiu outra coisa — **o `6.Bf4` fica, no Avançado, e
a fonte dele passa a ser o professor.** Como o id sai do hash dos *lances*
(`lib/repertorio/linhas.ts:59`) e os lances dessa linha não mudaram, mudar
`nivel` e `fonte` **não mexe no id**.

**Resultado medido: 40 ids antes, 41 depois, 0 alterados, 0 órfãos.** A janela da
§7.3 nem precisou ser gasta.

> A janela foi conferida assim mesmo: a §7.3 mediu "nenhum progresso de aluno
> real" em **7/9**, que é o mesmo dia deste bloco, e a aula é 19/9. Uma consulta
> direta ao Postgres de produção foi tentada e **bloqueada** pelo classificador
> do modo automático; não se insistiu, porque a medição é do próprio dia.

### As três linhas do arquivo, e de quem é cada uma

| Linha | Nível | Fonte | Estado |
|---|---|---|---|
| `brancas-caro-kann-428a7cce` **nova** | base | "Caro Kann't" (Chess.com, **grátis**) | ✅ passa na régua |
| `brancas-caro-kann-d2337d9b` | **avancado** | **Recomendação do professor** | ✅ assim que o Doug assinar o texto |
| `brancas-caro-kann-054a0df4` | base | Livro + motor | ❌ segue sem fonte |

A linha nova é `1.e4 c6 2.d4 d5 3.exd5 cxd5 4.Bd3 Cc6 5.c3 Cf6 6.h3 e6 7.Cf3
Bd6 8.O-O` — os **15 meios-lances inteiros** saem das variantes *the Passive
6…e6* #1 e #2 do curso, sem furo nenhum. O `repertorio:mapear` a classifica em
**COBERTA INTEIRA, 15/15**.

### O argumento que a fonte deu, e o que ele ensina

A regra está escrita literal no curso, e é o que o aluno leva embora em vez de
decorar:

> *"We can formulate two rules: play c3 against …Nc6, play h3 against …Nf6."*

E os dois lances de bispo viram um plano só: `Bd3` fecha `f5`, `h3` fecha `g4`, e
o bispo de c8 — a peça pela qual a Caro-Kann existe — não sai. O `5.c3` ganhou o
argumento inteiro do autor: **não** se joga `5.Cf3` ali, porque `5…Bg4` prega o
cavalo, e o problema não é a troca — é que depois de `h3 Bh5` vem `…Bg6`, e quem
sai do tabuleiro é o **nosso** bispo de d3.

### Duas âncoras de 6 não têm prosa da fonte, de propósito

O mapa dá **4/6** para a linha nova. As duas que faltam são as únicas em que o
curso não comenta o lance:

- **`7.Cf3`** — o argumento é a outra metade do `5.c3` do próprio autor: o lance
  que era ruim dois lances atrás ficou bom porque o `h3` tirou o `…Bg4`.
- **`8.O-O`** — carrega a prosa que o curso escreve **um lance adiante**, no
  `9.Te1` ("*the rook is well placed on the semi-open e-file… ready to use the
  e5-square*"). Trazida para cá porque a linha do Base tem de terminar em lance
  nosso, e `8.O-O` é o último.

### Dois erros de xadrez achados no texto antigo, e corrigidos

O bloco não era para mexer nisso, mas os dois estavam no comentário que ia ser
reaproveitado.

1. **O `…c6` não fecha a saída do bispo — abre.** O texto dizia *"o …c6 do
   primeiro lance fechou a saída natural dela"*. É a lógica da **Francesa**
   aplicada à Caro-Kann: o preto joga `…c6` em vez de `…e6` **justamente** para
   deixar o bispo de c8 livre, e o próprio curso diz isso (*"Caro-Kann players
   love developing their bishop to f5"*). Corrigido nas duas linhas, e o texto
   novo usa a diferença como argumento em vez de escondê-la. De quebra entrou um
   fato conferido na `chess.js`: **`4…Bf5` perde peça** — depois de `5.Bxf5` há
   **zero** recapturas em f5, porque não há peão em e6 nem em g6.
2. **Quem vai para f3 é o cavalo de g1, não o de d2.** O comentário do `8.Cd2`
   dizia *"de d2 ele segue para f3"*. Medido com o `repertorio:motor` (Stockfish
   18, profundidade 20, 5 linhas) na posição exata: nas **cinco** continuações o
   lance é **`Cgf3`**. Corrigido para o que é certo — o cavalo da dama vai por d2
   porque `c3` está ocupado, e quem ocupa f3 é o outro.

### O `054a0df4` teve de mudar junto, mesmo não sendo alvo

O comentário do `5.c3` dele mandava o aluno para *"bispo para f4, cavalo por d2 e
dama para b3"* — um plano que o Base deixou de jogar. Reescrito para o plano do
`h3`, com a transposição dita por extenso. A tag `[Fonte]` também: **nem** o
Grigoryan **nem** o "Caro Kann't" cobrem o `4…Cf6` — as oito variantes do curso
gratuito jogam `4…Cc6`. Ele continua no grupo "a fonte não cobre o ramo".

### Nenhuma tag precisou do `||`

Ao contrário do bloco A (§15) e do §18: aqui cada jogo do PGN carrega **uma**
linha só, então cada `[Fonte]` fala por si.

### Três coisas que ficam declaradas

1. ~~**O texto do Avançado é rascunho até o Doug ler.**~~ **Fechado em 7/9/2026.**
   A tag dizia "recomendação do professor" e "o argumento é dele", mas quem
   redigiu as frases foi o assistente, e por isso a linha estava **verde no
   compilador e pendente na régua**. O Doug leu os cinco comentários — `4.Bd3`,
   `5.c3`, `6.Bf4`, `7.Db3` e `8.Cd2` — e **assinou o texto como está**, sem
   ajuste. A tag `[Fonte]` passou a registrar a data da assinatura. **Nenhum
   lance, id ou comentário mudou**: o único campo tocado foi `fonte`.
2. **`nivel` não separa nada na tela, hoje.** Medido: a palavra `nivel` não
   aparece em `app/aberturas/`, em `components/` nem no `index.json` — o campo é
   só o teto de profundidade (`PROFUNDIDADE`) e um rótulo no JSON. Marcar a linha
   como `avancado` **não a esconde do aluno**; ela segue na mesma lista da
   Caro-Kann. Se a intenção for que o Base venha antes, isso é trabalho de tela e
   ainda não existe.
3. **A linha do Avançado tem 15 dos 23 meios-lances que o nível permite.** Não
   foi esticada de propósito: os 8 que faltam seriam escolha de xadrez do
   professor, e inventá-los seria assinar em nome dele.

### O `repertorio:mapear` não enxerga "recomendação do professor"

Ele casa o repertório com o corpus de cursos do chess.com. O `d2337d9b` vai
continuar aparecendo em **CAUDA DE VERDADE, "a fonte joga: h3"** para sempre —
não é regressão, é o mapa dizendo que nenhum *curso* joga aquilo. Quem quiser o
número certo lê a tag `[Fonte]`, não o mapa.

E a §11.4 muda de estado: comprar o "Combat the Caro-Kann" (US$ 6,99) **deixou de
ser necessário** para esta linha. Vira opcional — serve para conferir o `6.Bf4`
contra um GM, não para a linha existir.

### Um teste teve de mudar, e o nome dele estava certo o tempo todo

`lib/repertorio/banco.test.ts:70` se chama *"o **Base** publicado tem 40 linhas"*
e afirmava `todas.length === 40`. Os dois números eram o mesmo só porque **não
havia nenhuma linha do Avançado no repertório inteiro** — esta é a primeira.
Passou a contar `nivel === "base"`, que é o que o nome sempre prometeu. O 40
segue de pé: 41 linhas = 40 do Base + 1 do Avançado.

### Verificação

- `repertorio:compilar` → **41 linhas em 12 arquivos** (40 base, 1 avançado)
- **40 ids antes, 41 depois, 0 alterados, 0 sumidos.** O novo é
  `brancas-caro-kann-428a7cce`. **Nenhum aluno fica órfão**
- diff do compilado, conferido campo a campo por id: `d2337d9b` mudou
  `nivel`, `fonte`, `comentarios`; `054a0df4` mudou `fonte`, `comentarios`.
  **Zero** mudança em `lances`, `sans`, `fen` ou `meus` em quem já existia
- `repertorio:mapear`: corpus **igual** (11 cursos / 165 variantes / 2.434
  comentários) e o repertório sobe de **110 âncoras / 53 em prosa** para
  **118 / 58**, que é o esperado — a linha nova entrou com 6 âncoras, 4 em prosa
- typecheck ✔ · lint ✔ · **585 testes, 585 passando** ✔ · `validate:content` ✔ ·
  `compilar --check` sem diferença ✔ · `build` ✔

**Placar da régua: de 20 linhas aprovadas para 21** — e **22** com a assinatura do
Doug, dada em 7/9/2026 (ver a pendência 1 acima, agora fechada).

---

## 20. As 3 que faltavam de "só ordem de lances" — e o Anti-London finalmente citado, 7/9/2026

Fecha o grupo C. São as três linhas que o §18 deixou de fora porque **só parte**
das âncoras cai em prosa da fonte. Nenhuma muda lance, então **nenhuma muda id**:
o trabalho foi escrever o argumento, trocar a citação e — onde a fonte não fala —
dizer isso em vez de inventar.

| Linha | Quebra em | A fonte nova | Âncoras |
|---|---|---|---:|
| `pretas-londres-53d5b431` | `3…Cc6` (nosso) | **FM Viktor Neustroev, "Anti-London System"** (grátis), variantes *7.h3* e *7.Nbd2* | 3 |
| `pretas-manhattan-3e9e876d` | `4…Cbd7` (nosso) | **Kushager, "1.d4 d5"**, *The Manhattan #1–#3* + **Sielecki, "QGD"** para o `4.Bg5` dele | 2 |
| `pretas-siciliana-97331249` | `5.cxd4` (dele) | **Toth, "1.e4 for Club Players"** até o `4…cxd4` + **Sielecki, "Magnus Sicilian"** do `6…Cc6` ao `8.Bb5` | 4 |

### O achado do bloco: a Londres estava citando o curso errado há dois blocos

O `pretas-londres.pgn` dizia **"Livro + motor"** e explicava por quê: o *Short &
Sweet* do Kushager tem **um** capítulo de Londres e ele começa por `2…Cf6`, não
pelo `2…c5` que a §2.9 decidiu. A tag estava certa sobre o Kushager e **errada
sobre o corpus** — o `anti-london` está lá desde a importação, e:

| | `anti-london` | Kushager *S&S* |
|---|---|---|
| Variantes de Londres | **18** | 1 |
| Resposta ao `2.Bf4` | `2…c5` em **todas as 18** | `2…Cf6` |
| Plano | `…c5`, `…Cc6`, `…Db6` batendo em b2 | `…Ch5` caçando o bispo, `…Bd6` |
| Cobre a nossa linha | sim, variantes **#7** e **#8** | não |

A §4 já tinha escrito que o Anti-London é *"o melhor achado da revisão"* e a §5
já marcava o **buraco 10 como ✅ com ele**. Faltava executar. Executado aqui: as
variantes #7 e #8 são a nossa posição até o `8…O-O`, que é o último lance delas
também. **O buraco 10 fecha de graça** — o curso é gratuito.

O Doug perguntou no meio do bloco se valia adotar. A resposta medida foi sim, e
adotar **não custou lance nenhum**: a fonte chega por `3…Cf6 4.Cf3 Cc6` e nós por
`3…Cc6 4.Cf3 Cf6`; do `5.c3` em diante bate um a um.

### Um erro de xadrez que estava em dois lugares, e a medida que o derruba

O comentário do `4…Cf6` e o **cabeçalho do arquivo** diziam a mesma coisa:

> *"o cavalo de b1 pularia para c3, defenderia b2 e ganharia um tempo em cima
> dela"* · *"quem defende b2 é o cavalo indo a c3"*

**`Cc3` não defende `b2`.** De c3 um cavalo alcança a2, b1, b5, d1, d5, e2 e e4 —
b2 não está na lista. A conclusão do arquivo estava certa por acidente; o
mecanismo, não. O que `5.Cc3` faz é **atacar d5**, que fica sem defensor nenhum
no instante em que a dama sai de d8. Medido no Stockfish 18 lite-single de
`public/engine/`, profundidade 20, em 7/9/2026:

- `4…Db6? 5.Cc3!` → **brancas +1,40**, com a linha do motor `6.dxc5 Dxc5 7.Cb5
  Bg4 8.Cc7+ Rd7 9.Cxa8` — o garfo em c7, não uma defesa de b2
- `5…Dxb2 6.Cxd5!` → **brancas +3,79**

E o texto novo fecha com a fonte em vez de contra ela: quando o **peão** dele
ocupa c3, o cavalo perde a casa, d5 volta a estar em paz e **aí sim** b2 fica
pendurado — que é exatamente por que o Neustroev escreve, nessa posição, que as
brancas têm *"3 lances típicos para defender b2"*. A nossa linha vê o `6.Dc2`;
os outros dois são `Dc1` e `Db3`.

De quebra, o `…Cf6` deixou de ser lance de espera e virou lance com motivo: **o
cavalo em f6 defende d5**, e com ele lá o `Cc3` não ganha peão nenhum.

### O que cada linha ganhou de argumento

- **Londres `8…O-O`** — o comentário repetia o do `4…Cf6`. Trocado pelo que a
  fonte de fato ensina ali: por que `…g6` e não `…Bf5` (`7.dxc5!` ataca a dama,
  tira-a de cima de b2 e o bispo de f5 fica de graça), por que o `h3` **dele**
  existe (fecha g4 e abre h2 para o bispo fugir do `…Ch5`), e as duas escolhas
  que ele tem depois do nosso roque.
- **Manhattan `6…c5`** — ganhou os dois argumentos do Kushager: o bispo de b4
  prega o cavalo de c3 **contra o rei**, e como é esse cavalo que batia em d5,
  pregar é o mesmo que defender o peão; e o `…c5` é *o ponto da variante* — nas
  outras linhas da Recusada as pretas arrumam a casa com o bispo de c8 preso, e
  nesta se bate no centro na hora.
- **Alapin `2…Cf6`** — trocado um erro pequeno por um argumento. O texto dizia
  que depois de `3.e5` o peão fica *"sem nenhum peão vizinho para protegê-lo"*,
  o que deixa de ser verdade um lance depois, no `4.d4`. O argumento das duas
  fontes é melhor e não vence: o `2.c3` quer o par `e4`+`d4`, e o `…Cf6` ataca
  e4 **antes** que ele exista, obrigando o peão a ir sozinho para a frente,
  onde deixa de ser muralha e vira alvo.
- **Alapin `5…d6`** — recebeu a observação do Sielecki, escrita por ele na
  posição depois do nosso `6…Cc6`: sumiram **os dois peões de c**, então `c4`,
  que é o lance normal para expulsar um cavalo de d5, não existe mais. Sobra
  fazer isso com peça, e é o `7.Bc4` — que devolvemos com `…Cb6`, ganhando o
  tempo de volta.

### O `8…dxe5` da Alapin: decidido antes de escrever, e declarado

Era o ponto duvidoso do bloco. A fonte **sai de novo** no último meio-lance, que
é nosso e fecha a linha. A decisão foi **manter o lance** e declarar o
comentário, porque a prosa que existe ali não é argumento para ele:

> *"Black's main line is actually 8…dxe5, but the bishop move has gained some
> momentum recently and was successfully employed by the World Champion… One key
> advantage over 8…dxe5 is that Black retains more chances to play for a win."*

Ou seja: o Sielecki **chama o nosso lance de linha principal das pretas** e mesmo
assim escolhe `8…Bd7`, por um critério de campeão do mundo — jogar para ganhar —
que não é o critério de um aluno de 12 a 15 anos. E o draft do Grigoryan dá o
`8…dxe5` sem explicar lance nenhum. Então o argumento do comentário é **nosso**,
está dito na tag com essas palavras, e fechá-lo na régua pede **uma de duas
coisas**: o professor assinar o argumento, como fez com a Caro-Kann, ou um bloco
futuro trocar o lance por `8…Bd7` — e aí a linha sai deste grupo e vira troca de
cauda, com id novo.

O comentário foi reescrito para ser **conferível** em vez de opinativo: depois de
`9.Cxe5` os peões brancos são `a2 b2 d4 f2 g2 h2`, lidos da FEN da `chess.js`, e
o `d4` é **isolado**. O plano do aluno vira um enunciado curto: bloquear d5 e
cobrar d4.

> O `pretas-siciliana-f9fa14c5` (Gambito Morra) termina na **mesma posição** por
> transposição e tem o **mesmo** `8…dxe5`. Ele está no grupo "cauda de verdade" e
> não foi tocado aqui — mas o que se decidir para um vale para os dois.

### As tags `[Fonte]` de dois jogos foram partidas com `||`

Como no bloco A (§15) e no §18 — e ao contrário da Caro-Kann (§19), onde cada
jogo carregava uma linha só. Conferido antes de escrever, no compilado:

- **Londres, jogo único** — carrega as **duas** linhas do arquivo. A metade do
  `3.c3 Db6` segue em Livro + motor: o curso cobre o `3.c3` na variante *The
  Solid 3.c3* e joga `3…Cc6` primeiro, não o `…Db6` de cara. É decisão de xadrez
  do professor, e está no grupo "cauda de verdade" da §17.
- **Manhattan, jogo do `4.Bg5`** — carrega a linha do `5.e3` e a **Armadilha do
  Elefante**. Medido com o `repertorio:mapear`: do `4…Cbd7` até o fim, **nenhum**
  curso do corpus acompanha a armadilha. Ela não é caso de trocar cauda — é ramo
  que a fonte não cobre.
- **Alapin** — **não** precisou: o jogo carrega uma linha só. O `(3…Ce4 $4)` é
  folha marcada como erro e não vira linha compilada.

### Uma citação que se recusou a esticar

O Sielecki (*QGD*) explica o `4.Bg5` **das brancas**, e é por isso que ele entra
na tag do Manhattan. Mas contra todo bispo cedo ele recomenda `4…dxc4`, e **não**
o nosso `4…Cbd7`. A tag diz isso com todas as letras: dele vem a explicação do
lance **dele**, não do nosso. O nosso é do Kushager.

### O `2…c5` da Londres e o `4…Cbd7` do Manhattan ficaram como estavam

Mesmo motivo do §18: são nós **compartilhados** com a outra linha do mesmo jogo,
e os dois textos **já carregavam o argumento da fonte** — o `2…c5` diz o que o
Kushager escreve sobre o `2.Bf4` ("ao contrário do `2.c4`, não disputa espaço no
centro") e o `4…Cbd7` diz o que o Kushager escreve sobre o `…Cbd7` (sem o xeque
`Da4+`, o cavalo não é empurrado para c6). Reescrever seria mexer em duas linhas
para ganhar zero. A citação entrou; o texto ficou.

### Verificação

- `repertorio:compilar` → **41 linhas em 12 arquivos** (40 base, 1 avançado)
- **41 ids antes, 41 depois, 0 alterados, 0 sumidos, 0 novos**
- diff do compilado conferido campo a campo por id: mudaram **só** `fonte` e
  `comentarios`, em 5 linhas — as 3 do bloco mais as 2 que dividem o mesmo jogo
  PGN (`pretas-londres-1c8d69bc` e `pretas-manhattan-6ac84e24`, só `fonte`).
  **Zero** mudança em `lances`, `sans`, `fen` ou `meus`
- `repertorio:mapear`: corpus **igual** (11 cursos / 165 variantes / 2.434
  comentários) e repertório **igual** — **41 linhas, 118 âncoras, 58 em prosa**.
  Nenhuma âncora foi criada nem mudou de lugar
- typecheck ✔ · lint ✔ · **585 testes, 585 passando** ✔ · `validate:content` ✔ ·
  `compilar --check` sem diferença ✔ · `build` ✔

**Placar da régua: de 22 linhas aprovadas para 24** — e **25** se o professor
assinar o `8…dxe5` da Alapin. O grupo "só ordem de lances" está fechado.

### O que sobra, e é tudo decisão de xadrez do professor

1. As **6 de "cauda de verdade"** que são trabalho de verdade: `escocesa-fe195431`,
   `siciliana-a6563193`, `siciliana-e6e1e081`, `siciliana-f9fa14c5`,
   `londres-1c8d69bc`, `manhattan-6ac84e24`. Duas delas ganharam informação neste
   bloco: a `londres-1c8d69bc` agora tem uma fonte que joga `3.c3 Cc6` em vez do
   `…Db6` de cara, e a `siciliana-f9fa14c5` compartilha o `8…dxe5` acima.
2. O **Colle** (`pretas-colle-f0590dc0`), única linha sem fonte alguma.
3. O `8…dxe5` da Alapin — assinar ou trocar.

> **Os itens 1 e 3 foram executados em 7/9 — ver §21.** O Doug **recusou**
> assinar o `8…dxe5` e mandou trocar pela cauda do curso, o que levou o Morra
> junto. Das 6 de "cauda de verdade", 4 trocaram de lance e 2 foram assinadas
> pelo professor. O item 2, o Colle, continua aberto.

---

## 21. Cauda de verdade — o bloco que troca lance, e o teto do Base sobe, 7/9/2026

Fecha o grupo. É o **primeiro bloco que mata id**: até aqui todos fecharam com
"0 ids alterados", porque dava para trocar a citação sem tocar em lance. Aqui
trocar a cauda **é** trocar lance, e o id sai do hash dos lances
(`lib/repertorio/linhas.ts:59`).

### A janela foi re-medida antes de qualquer edição

A §7.3 afirmou em 7/9 que não havia progresso de aluno real. Medido de novo no
mesmo dia, direto no `repertorio_progresso` com a chave de serviço:

| | número |
|---|---:|
| linhas em `repertorio_progresso` | **5** |
| contas com progresso | **1** — `alunoteste@alunos.olesc.local`, última em 6/9 |
| contas no Auth inteiro | **2** — `alunoteste` e `doug` |

**Zero alunos reais.** Os `zz.teste.*` que a §7.3 citava já nem existem — os
`verificar-*` apagam as próprias contas. A janela está aberta e fecha em 19/9.

### As seis decisões do Doug, e uma que veio de brinde

| Linha | Decisão | id |
|---|---|---|
| `siciliana-97331249` (Alapin) | `8…dxe5` → `8…Bd7`, cauda do Sielecki | morre → `ddf21e1b` |
| `siciliana-f9fa14c5` (Morra) | idem, por transposição | morre → `a23cd1f7` |
| `escocesa-fe195431` | `6.e5` → `6.Cc3`, Schmidt #2 | morre → `73290a81` |
| `siciliana-a6563193` (Rossolimo `4.Bxc6`) | `6…Cf6` → `6…Dc7` | morre → `08323cca` |
| `londres-1c8d69bc` | `3…Db6` → `3…Cc6`, "The Solid 3.c3" | morre → `0fdb1535` |
| `siciliana-e6e1e081` (Rossolimo `4.O-O`) | **assinada** pelo professor | **fica** |
| `manhattan-6ac84e24` (Armadilha) | **assinada** pelo professor | **fica** |

A Alapin não era do bloco: ela entrou pela pendência declarada na §20, e a
decisão dela arrastou o Morra junto, porque as duas terminam na mesma posição
por transposição.

### O que o professor recusou assinar, e por que importa

O `8…dxe5` da Alapin tinha um argumento nosso — o peão isolado de d4 — e a
pergunta era assinar ou trocar. **O Doug recusou** e mandou seguir o curso. A
troca não custou a aula: a posição final do `8…Bd7` tem os peões brancos em
`a2 b2 d4 f2 g2 h2`, lidos da FEN da `chess.js`, e o `d4` **continua isolado**.
Mudou o autor, não o conteúdo — e agora quem escreve "dominar as casas claras,
em especial a que fica na frente do peão isolado" é o Sielecki.

### O teto do Base foi de 8 para 11 lances

Não estava no plano do bloco, e apareceu no primeiro `compilar`: as cinco caudas
novas **estouram o teto do Base**, que ia até o lance 8 (15 meios-lances nas
brancas, 16 nas pretas). O que decidiu o número foi uma medida, não gosto:

```
Alapin, material ao fim da linha, por onde se corta:
  corte 16 (8…Bd7)     IGUAL
  corte 18 (9…e6)      brancas +1
  corte 20 (10…f6)     brancas +1   <- o "lance 10"
  corte 22 (11…Bxd6)   IGUAL
```

Cortar no lance 10 deixaria a Alapin e o Morra terminando com o aluno **um peão
atrás**, porque a recaptura `…Bxd6` só acontece no lance 11. O 11 é o menor
número em que as cinco caem em ponto de material igual ou de plano completo. O
Avançado segue em 12, então os níveis continuam diferentes.

Custo da mudança, medido: a constante, o comentário dela e **três asserções de
teste** (`arvore.test.ts:154`, `linhas.test.ts:67-68` e a mensagem de erro do
`linhas.test.ts:78`). Nada mais depende do número — o `aberturasInchadas` conta
linhas por abertura, não profundidade.

Uma linha ficou mais curta do que o Doug escolheu por causa do teto: a Escocesa
para no `11.Df3` e não no `12.Bf4`. O comentário do `11.Df3` carrega o plano do
`Bf4` por escrito, com a atribuição.

### Três achados que não eram do roteiro

**1. A tag do Morra estava desatualizada, e o Magnus Sicilian cobria a linha
inteira.** A tag dizia "Livro + motor" e citava o draft do Grigoryan, que para
no `3.c3`. Medido: o Sielecki joga a **nossa ordem inteira** —
`2.d4 cxd4 3.c3 Cf6 4.e5 Cd5 5.Cf3 Cc6 6.cxd4 d6 7.Bc4 Cb6 8.Bb5` — e explica o
`3…Cf6` por escrito. Eram 15 dos 16 meios-lances com fonte numa linha declarada
como sem fonte nenhuma. É o mesmo tipo de achado do Anti-London na §20.

**2. O Manhattan não era cauda para trocar; era a abertura.** O mapa manda
trocar o `4…Cbd7` pelo `4…dxc4` do Sielecki. Medido no compilado: os **dois**
ids daquele jogo PGN saem do `4…Cbd7` — o `6ac84e24` (a armadilha) e o
`3e9e876d`, aprovado na §20 com o Kushager. Trocar mataria os dois e tiraria o
Manhattan do repertório, que é o nome do arquivo e o tronco de três linhas.

**3. Um erro de xadrez no texto do Morra, e ele contradizia o próprio arquivo.**
O comentário do `3…Cf6` dizia que aceitar com `3…dxc3` faria o aluno *"jogar o
resto da partida correndo atrás"* — e o comentário do `8…dxe5`, no mesmo jogo,
dizia que aceitar *"também empata pelo motor"*. Medido no Stockfish 18
lite-single de `public/engine/`, profundidade 20, em 7/9/2026: o `3…dxc3` é
**igualdade e o primeiro lance do motor**, empatado com o `3…Cf6`. O motivo de
recusar não é de posição, é de estudo, e é o que o Sielecki escreve: aceitar o
peão não é uma linha para decorar, é um curso inteiro.

### Os números do motor que sustentam as decisões

Todos com o Stockfish 18 lite-single de `public/engine/`, profundidade 20,
medidos em 7/9/2026.

| Posição | Nosso lance | O da fonte | Leitura |
|---|---|---|---|
| Alapin, depois de `8.Bb5` | `8…dxe5` **0,00** | `8…Bd7` **0,00** | empate — a escolha é pedagógica |
| Alapin, depois de `9.exd6` | — | `9…e6` **0,00** | `9…exd6` dá +0,35 e `9…a6` +0,55 |
| Escocesa, depois de `5…bxc6` | `6.e5` **igual** | `6.Cc3` **igual** | e `6.Bd3`, `6.Cd2`, `6.De2` também |
| Rossolimo, depois de `6.h3` | `6…Cf6` **+0,34** | `6…Dc7` **+0,43** | a troca **piora** 9 centésimos |
| Rossolimo `4.O-O`, após `5.c3` | `5…Cf6` **+0,32** | `5…e5` **+0,34** | o nosso é a variante principal |
| Londres, depois de `3.c3` | `3…Db6` **0,00** | `3…Cc6` **0,00** | empate |
| Manhattan, fim da armadilha | `8…Bxd2+` **+3,17** | — | uma peça para as pretas |

A linha do motor para o `6.e5` antigo da Escocesa é
`6…De7 7.De2 Cd5 8.c4 Ba6 9.b3 Dh4 10.Bb2 Bb4+ 11.Rd1 Cf4` — **rei branco em d1
no lance 11**, e ainda igual. É exatamente a complexidade de que o curso fala
quando recusa aquele lance: *"posições altamente complexas, ideais para quem
está no nível avançado"*.

### As duas assinaturas, e o que as separa da Caro-Kann

O professor virou fonte de mais duas linhas. Nos dois casos o argumento está
escrito na tag `[Fonte]`, com data, como manda a §19.

- **`siciliana-e6e1e081`** (Rossolimo `4.O-O`) — a fonte natural **declara que
  está chutando**: o Sielecki escreve que o `5.c3` *"ainda não foi tentado
  contra o Magnus Carlsen, então não sabemos o que ele teria planejado"*, e que
  **ele** decidiu recomendar `5…e5` por coerência com o curso dele. Somado a
  isso, o motor põe a nossa linha inteira como variante principal, e a dele
  termina com o rei preto em f8 sem roque, segurando um peão a mais.
- **`manhattan-6ac84e24`** (Armadilha do Elefante) — não há cauda para trocar
  sem trocar de abertura, o lance que abre a armadilha é **erro dele**, e nenhum
  curso do corpus perde peça de propósito para mostrar como se pune.

Isso as separa da Caro-Kann: lá o professor assinou uma **escolha entre dois
lances bons**; aqui ele assinou onde a fonte **não tem o que dizer**.

### Quatro âncoras ficam sem prosa de propósito

Duas do Rossolimo `4.O-O` e duas do Manhattan: são as linhas assinadas, e por
definição o mapa não acha prosa de curso nelas. Ele vai continuar mostrando
`âncoras 0/2` para as duas — como já mostra para a `brancas-caro-kann-d2337d9b`
desde a §19. Quem quiser o número certo lê a tag `[Fonte]`, não o mapa.

### Verificação

- `repertorio:compilar` → **41 linhas em 12 arquivos** (40 base, 1 avançado)
- **41 ids antes, 41 depois: 5 morreram, 5 nasceram, 36 intactos.** Com
  **0 alunos reais no banco**, nenhum aluno fica órfão

| morreu | nasceu | tamanho |
|---|---|---:|
| `brancas-escocesa-fe195431` | `brancas-escocesa-73290a81` | 13 → **21** |
| `pretas-londres-1c8d69bc` | `pretas-londres-0fdb1535` | 16 → **20** |
| `pretas-siciliana-97331249` | `pretas-siciliana-ddf21e1b` | 16 → **22** |
| `pretas-siciliana-a6563193` | `pretas-siciliana-08323cca` | 16 → **22** |
| `pretas-siciliana-f9fa14c5` | `pretas-siciliana-a23cd1f7` | 16 → **22** |

- diff do compilado conferido campo a campo por id: dos **36 sobreviventes**,
  **7** mudaram — e mudaram **só `fonte`**. São as 3 Escocesas e a
  `londres-53d5b431` que dividem tag `[Fonte]` com uma linha trocada, a
  `manhattan-3e9e876d` que divide com a assinada, e as 2 assinadas.
  **Zero** mudança em `lances`, `sans`, `fenFinal` ou `meus`
- `repertorio:mapear`: corpus **igual** (11 cursos / 165 variantes / 2.434
  comentários / 2.890 posições) e o repertório sobe de **118 âncoras / 58 em
  prosa** para **128 / 71**. O grupo "coberta inteira" vai de 6 para 10 linhas e
  o "cauda de verdade" cai de 9 para 5
- typecheck ✔ · lint ✔ · **585 testes, 585 passando** ✔ · `validate:content` ✔ ·
  `compilar --check` sem diferença ✔ · `build` ✔

### O grupo "cauda de verdade" acabou

Das 5 que o mapa ainda lista, **3 estão fechadas por assinatura do professor**
(`caro-kann-d2337d9b`, `manhattan-6ac84e24`, `siciliana-e6e1e081`) e as outras
duas — `escandinava-60e836c1` e `escocesa-1778f8cb` — são linhas do **Krikor**,
do grupo J, que já passam na régua pela fonte delas e nunca estiveram neste
bloco.

**Placar da régua: de 24 linhas aprovadas para 31, de 41.**

### O que sobra, e é tudo dependente de dinheiro ou de tela

1. As **9 de "a fonte não cobre o ramo"** — quem sai do roteiro é o adversário,
   e elas dependem de comprar curso, não de escrever melhor. A lista está na §17.
2. O **Colle** (`pretas-colle-f0590dc0`), única linha sem fonte alguma:
   manter, trocar de abertura, ou comprar curso.
3. O campo `nivel` **ainda não separa nada na tela**. Com o Base agora em 11
   lances e o Avançado em 12, a diferença entre os dois níveis ficou de um lance
   só — se o filtro for construído, vale rever se 12 ainda é o número certo para
   o Avançado.

---

## 22. O Colle tinha fonte o tempo todo — e o Jobava virou linha, 7/9/2026

Fecha a última linha sem fonte do repertório. Era para ser uma decisão dura
entre três saídas ruins — assinar, trocar de abertura ou comprar curso. Não foi:
**as fontes já estavam no corpus**, como no Anti-London da §20 e no Magnus
Sicilian da §21. O que mudou é *por que* o mapa não as via.

### O achado: o mapa casa por POSIÇÃO, e a prosa estava na posição vizinha

O `repertorio:mapear` dá **2/16** ao Colle e vai continuar dando. Ele casa
linha e curso pela FEN, e nenhum dos 11 cursos do corpus joga um Colle: do
`2.Cf3` em diante, o corpus inteiro de `1.d4` vira Londres (`2.Bf4`, 21
variantes) ou Gambito da Dama (`2.c4`, 14). Só que **três cursos gratuitos
recomendam e explicam esta linha em prosa**, e dois deles a nomeiam.

**1. O Sielecki nomeia a nossa ordem branca inteira.** No comentário do `1…d5`,
que o `Short & Sweet: Sielecki's QGD` repete nas 8 variantes:

> *"Besides these two main options, White may play various offbeat systems on
> move 2 or on move 3, after 2.Nf3 Nf6 has been played. As a general concept, I
> recommend meeting these lines with a quick …c5 push, for example: A) 2.Nc3
> Nf6 3.Bf4 c5 **B) 2.Nf3 Nf6 3.e3 c5** C) 2.Nf3 Nf6 3.g3 c5 … playing with
> …Nf6 and …c5 is a logical response, attacking White's centre."*

O caso **B é o nosso Colle** e o **A é o nosso Jobava**, com o motivo escrito.

**2. O Kushager joga os nossos cinco primeiros lances pretos, na nossa ordem, e
explica cada um.** A variante *The London* do `Short & Sweet: 1.d4 d5` faz
`…d5, …Cf6, …e6, …c5, …Cc6` — idêntico a nós — e no `…e6` escreve a frase que
autoriza levar a receita dele do Londres para o Colle:

> *"The best move order for our setup. **Whatever White plays in the next couple
> of moves**, we would like to play …c5 and …Nc6 whenever possible."*

**3. O Neustroev chega na nossa posição final.** Medido casa a casa na
`chess.js`, na variante *The Impatient 3.dxc5: Mainline - 6.Nbd2, 7.Bd3* do
`Anti-London System`, depois do `8.O-O` dele:

```
nossa final (8...Bxc5), pretas : bc5 bc8 kg8 nc6 nf6 pa7 pb7 pd5 pe6 pf7 pg7 ph7 qd8 ra8 rf8
curso, após 8.O-O,      pretas : IDÊNTICAS, casa por casa
   brancas — só no curso : bf4 pc2
   brancas — só em nós   : bc1 pc3
```

**Duas unidades de diferença**: o bispo dele (f4 lá, ainda em c1 aqui) e o
peão-c (c2 lá, c3 aqui). Todo o resto — rei em g1, torres em a1 e f1, `Bd3`,
`Cd2`, `Cf3`, dama em d1, peões a2 b2 e3 f2 g2 h2 — bate. E o plano que ele
escreve ali é o nosso: *"The plan for black is to push the e5 pawn."*

> **Isto é diferente de uma assinatura do professor.** Nas três linhas assinadas
> (§19 e §21) a fonte **não tinha o que dizer**. Aqui ela tem, e diz — só não na
> posição que o mapa lê. A tag `[Fonte]` do Colle declara isso por escrito,
> porque o mapa vai mostrar `2/16, âncoras 0/3` para sempre.

### A decisão do Doug: duas linhas, não uma

O orçamento da §1 dava **uma** linha para os três sistemas (`2.Cf3` 14,4 %,
`2.e3` 12,2 %, `2.Cc3` 11,9 % — 38,5 % somados). Em 7/9/2026 o Doug deu **duas**,
e o motivo é medido: uma linha só não alcança as três fatias.

```
1.d4 d5 2.Cf3 Cf6 3.e3 e6 4.Bd3 c5 5.c3 Bd6 6.Cbd2 Cc6 7.O-O O-O 8.dxc5 Bxc5
1.d4 d5 2.e3  Cf6 3.Cf3 e6 4.Bd3 c5 5.c3 Bd6 6.Cbd2 Cc6 7.O-O O-O 8.dxc5 Bxc5
   -> MESMA posição final. O Colle cobre 26,6 % num jogo só.

1.d4 d5 2.Cc3 Cf6 3.e3 e6 4.Bd3 c5 …
   -> NÃO transpõe: com o cavalo dele em c3, o peão dele não cabe mais em c3.
```

O Jobava ganhou jogo próprio porque a ordem dele transpõe, **exata**, para um
capítulo de curso gratuito:

```
1.d4 d5 2.Bf4 c5 3.Cc3 Cc6 4.e4   (a ordem do curso, chegando pelo Londres)
1.d4 d5 2.Cc3 c5 3.Bf4 Cc6 4.e4   (a nossa, o Jobava de verdade)
   -> MESMA FEN, conferida na chess.js.
```

### O que o motor disse, e as três coisas que ele obrigou a declarar

Stockfish 18 lite-single de `public/engine/`, profundidade 20, MultiPV 5, em
7/9/2026.

| Posição | Medida | O que fizemos |
|---|---|---|
| Colle, final `8…Bxc5` | **igual** nas 5 primeiras; em 3 delas o lance preto seguinte é `…e5` | confirma o plano do Neustroev |
| Colle, 1ª linha do motor | `9.e4 Dc7 10.De2 Bd7 11.e5 Cg4 12.Bxh7+!` — e **igual** | o sacrifício em h7 entrou no comentário como aviso |
| Jobava, após `4.e4` | `4…cxd4` **igual** e 1º; as outras dão brancas +0,73 ou pior | é o nosso lance |
| Jobava, o aviso do curso | `4…dxe4 5.d5` dá **brancas +1,49** | o aviso confere, e entrou com o número |
| Jobava, após `4…cxd4` | `5.exd5` **igual**, `5.Cb5` pretas +0,38, **`5.Cxd5` pretas +0,40** | ⚠ o lance do curso é o **terceiro** |
| Jobava, após `8.Bg5` | `8…Cxd5` **pretas +1,17** e 1º | a armadilha confere |
| Jobava, após `9…Bb4+` | `10.Re2` pretas +1,18, **`10.Dd2` pretas +1,84** | ⚠ o lance do curso **não é o melhor dele** |
| Jobava, após `10.Dd2` | `10…Bxd2+` **pretas +2,08** e 1º; a continuação do motor é a nossa | é o nosso lance |
| Jobava, final `11…Cdb4` | **pretas +2,18** | ponto de parada bom |

As duas linhas com ⚠ são declaradas na tag `[Fonte]` **e no comentário que o
aluno lê**, porque mudam o que ele deve esperar do tabuleiro:

- **A armadilha só existe se ele jogar o `5.Cxd5`.** Os outros dois quintos
  lances não caem nela. O comentário do `4…cxd4` diz isso, com os três números.
- **O `10.Dd2` do curso não é o melhor dele.** Escolhemos o `10.Dd2` porque é o
  lance humano — bloquear o xeque oferecendo troca de damas — e a resposta ao
  `10.Re2` (`…Cf4+` e `…Txd8`) está escrita no comentário do `8…Cxd5`.

### A janela de órfãos, re-medida antes de escrever

| | número |
|---|---:|
| linhas em `repertorio_progresso` | **5** |
| contas com progresso | **1** — `alunoteste@alunos.olesc.local` |
| contas no Auth inteiro | **2** — `alunoteste` e `doug` |
| linhas do progresso que apontam para o Colle | **0** |

**Zero alunos reais**, e nenhuma linha gravada tocava o arquivo do Colle. No
fim não foi preciso gastar a janela: **nada morreu**.

### O contrato de 40 linhas do Base virou 41

`lib/repertorio/banco.test.ts:70` afirmava `nivel === "base"` em **40** — a meta
pedagógica do Base. A linha do Jobava a levou a **41**, e o teste, o título e o
comentário foram atualizados. Aproveitou-se para corrigir uma frase errada do
comentário: ele dizia que os 40 eram *"a mesma do teto de `aberturasInchadas`"*,
e não são — o `teto` daquela função conta linhas **por abertura** e continua em
40 (`lib/repertorio/linhas.ts:244`).

### Verificação

- `repertorio:compilar` → **42 linhas em 12 arquivos** (41 base, 1 avançado)
- **41 ids antes, 42 depois: 0 morreram, 1 nasceu** (`pretas-colle-0e2f8d38`).
  **0 alunos órfãos**
- diff do compilado conferido campo a campo por id: dos **41 sobreviventes**,
  **1** mudou — o `pretas-colle-f0590dc0`, e só em `nome`, `comentarios` e
  `fonte`. **Zero** mudança em `lances`, `sans`, `fenFinal` ou `meus` em
  qualquer linha
- `repertorio:mapear`: corpus **igual** (11 cursos / 165 variantes / 2.434
  comentários / 2.890 posições) e o repertório sobe de **128 âncoras / 71 em
  prosa** para **139 / 78**
- onde as duas caíram no mapa: o Jobava em **"só ordem de lances"**
  (`2/22` contígua, `20/22` total, volta no lance 3, **âncoras 7/10**) e o Colle
  segue em **"sem fonte"** (`2/16`, âncoras `0/3`) — **de propósito**, como a
  tag `[Fonte]` dele declara
- typecheck ✔ · lint ✔ · **585 testes, 585 passando** ✔ · `validate:content` ✔ ·
  `compilar --check` sem diferença ✔ · `build` ✔

**Placar da régua: de 31 linhas aprovadas para 33, de 42.** As duas novas são o
Colle (prosa de três fontes gratuitas, em posição vizinha — o mapa não confirma,
a tag declara) e o Jobava (posição, 20 de 22 meios-lances no curso).

### Cuidado ao ler o mapa daqui em diante

O grupo **"a fonte não cobre o ramo"** agora imprime **16 linhas**, e a §17 fala
em **9**. Não é regressão: o script agrupa as 42 linhas e a §17 tirava as 11 do
Krikor. As 7 a mais são justamente as do Krikor — `alapin` ×2, `escandinava` ×2,
`escocesa` ×1 e `philidor` ×2 —, que passam na régua pela fonte delas. **A lista
acionável continua sendo a de 9 da §17**, e ela não mudou.

### O que sobra

1. As **9 de "a fonte não cobre o ramo"** — quem sai do roteiro é o adversário.
   Dependem de comprar curso, não de escrever melhor. Lista na §17.
2. O campo `nivel` **ainda não separa nada na tela**. Com o Base em 11 lances e o
   Avançado em 12, os níveis seguem a um lance de distância.

**Nenhuma linha do repertório está sem fonte.** O grupo "sem fonte" do mapa tem
uma entrada, e ela é a que esta seção explica.
