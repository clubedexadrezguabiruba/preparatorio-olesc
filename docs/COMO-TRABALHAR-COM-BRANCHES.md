# Como trabalhar com branches, sem levar susto

Escrito em 2026-09-08, depois de um merge que quase enterrou 30 commits. Este
documento é para o Doug, que não é programador — cada termo é explicado na
primeira vez que aparece, e todo comando é para copiar e colar.

Se você lembrar de **uma** coisa deste arquivo, que seja a regra 1.

---

## 1. O vocabulário, em cinco linhas

- **Commit** — uma foto salva do projeto, com um bilhete dizendo o que mudou.
  Seu histórico é uma pilha de fotos.
- **Branch** (ramo) — uma linha paralela de commits. Você sai do tronco,
  trabalha em paz, e depois junta de volta. O tronco chama-se `main`.
- **`origin`** — o apelido do GitHub. É o servidor.
- **Merge** — juntar duas linhas de commits numa só.
- **Vercel** — publica o que estiver no `main` **do GitHub**. Ela não olha o seu
  computador. Enquanto você não empurra, o site não muda.

---

## 2. O detalhe que causa quase todo problema: existem TRÊS mains

Esta é a parte que ninguém explica, e é a raiz do susto de setembro.

| o nome | o que é de verdade |
|---|---|
| `main` | o `main` **no seu computador** |
| `origin/main` | a **lembrança** do seu computador de como o main do GitHub estava **da última vez que você perguntou** |
| o main do GitHub | a verdade — e você só a conhece **depois** de perguntar |

**O git nunca pergunta sozinho.** Se você não pedir, seu computador segue
acreditando numa lembrança de meses atrás, e trabalha em cima dela sem
reclamar. É por isso que o problema só aparece no fim, na hora de juntar.

### O que aconteceu, em quatro passos

Você tem três pastas do mesmo projeto, cada uma numa branch — isso chama-se
*worktree*, e é legítimo:

    Desktop/preparatorio-olesc              -> main             <- esta ficou parada
    Desktop/preparatorio-olesc-finais       -> meio-jogo-livros
    Desktop/preparatorio-olesc-repertorio   -> repertorio

1. Você trabalhou na pasta `-finais`, e aquele trabalho chegou ao main do
   GitHub — **30 commits**, incluindo a saída do módulo de meio-jogo.
2. A pasta `preparatorio-olesc` nunca perguntou nada ao GitHub. O `main` dela
   ficou parado em janeiro.
3. A branch `repertorio` nasceu **desse main velho**.
4. Você construiu um andar novo sobre uma fundação de janeiro, enquanto a casa
   ganhava outros três andares.

Ninguém errou um comando. Só faltou perguntar ao servidor.

---

## 3. As cinco regras

### Regra 1 — Todo trabalho começa perguntando ao servidor

```bash
git checkout main
git pull
```

`pull` = perguntar ao GitHub **e** trazer o que houver de novo. É o passo que
faltou em setembro. Se você fizer só isto e mais nada deste documento, já evita
a maior parte dos sustos.

### Regra 2 — A branch nasce do main recém-atualizado

```bash
git checkout -b tatica-textos
```

Cria a branch e já entra nela. O nome é livre; use algo que diga o assunto.

Se você pulou a regra 1, **esta branch já nasce velha** — e o problema só vai
aparecer semanas depois.

### Regra 3 — Antes de mesclar, traga o main para dentro da SUA branch

Nunca o contrário.

```bash
git fetch origin
git merge origin/main
npm test
```

`fetch` = perguntar sem mexer no seu trabalho. Depois o `main` entra na sua
branch, e você resolve os conflitos **no seu terreno**, com calma, testando.

Só quando estiver verde é que o `main` recebe alguma coisa — e recebe algo já
pronto.

Deu ruim no meio? `git merge --abort` desfaz tudo e ninguém viu.

### Regra 4 — Branch tem prazo de validade: dias, não meses

Quanto mais tempo uma branch fica aberta, mais o tronco anda sem ela. Uma
branch de três dias tem dois commits de distância; uma de três meses tem trinta,
e cada um deles é uma chance de conflito.

Se um trabalho vai demorar, aplique a regra 3 **de vez em quando**, não só no
fim.

### Regra 5 — Nunca `--force` num push

`--force` é a palavra que apaga o trabalho dos outros (e o seu). Se um push for
recusado, isso é o git te protegendo: a resposta certa é sempre a regra 3, nunca
forçar.

---

## 4. O exame de sangue

Antes de qualquer coisa grande — abrir tarefa, mesclar, publicar — rode isto:

```bash
git fetch origin
echo "meus commits que o servidor nao tem:  $(git log --oneline origin/main..HEAD | wc -l)"
echo "commits do servidor que eu nao tenho: $(git log --oneline HEAD..origin/main | wc -l)"
```

Como ler o resultado:

| resultado | significa | o que fazer |
|---|---|---|
| `0` e `0` | está tudo igual | pode ir |
| algo e `0` | só você andou | merge limpo, sem susto |
| `0` e algo | só o servidor andou | `git pull` resolve |
| **algo e algo** | **divergiram** | **regra 3.** Não mescle às cegas |

Em setembro de 2026 o exame deu **3 e 30**. É esse último caso, e é o que exige
cuidado.

---

## 5. A receita completa de uma tarefa

```bash
# 1. começar
git checkout main
git pull
git checkout -b nome-da-tarefa

# 2. trabalhar, salvando de vez em quando
git add -A
git commit -m "o que mudou"

# 3. antes de juntar: trazer o servidor para dentro
git fetch origin
git merge origin/main
npm test

# 4. juntar e publicar
git push origin HEAD:nome-da-tarefa    # a branch, para conferir na Vercel
git push origin HEAD:main              # o tronco, que vai para producao
```

O passo 3 é o que separa um merge de cinco minutos de um merge de duas horas.

---

## 6. Sobre as três pastas

As três pastas dividem o **mesmo** histórico do git. Isso quer dizer:

- Um `git fetch` em **qualquer** uma delas atualiza a lembrança do servidor para
  **todas**. Você não precisa repetir em cada pasta.
- Mas cada pasta tem a **sua** branch, e cada branch anda sozinha. Atualizar uma
  não atualiza as outras.
- A mesma branch não pode estar aberta em duas pastas ao mesmo tempo — o git
  recusa, e está certo.

**Consequência prática:** a pasta `preparatorio-olesc`, que segura o `main`, é a
que mais envelhece, porque é a que você menos abre. Ela é justamente a que
precisa de `git pull` com mais frequência — é dela que as branches nascem.

---

## 7. Um remote falso que existia e foi removido

Até 2026-09-08 havia um "servidor" chamado `repertorio` que apontava para uma
**pasta do próprio computador**, não para o GitHub. Um `git push repertorio` por
engano mandaria código para o lugar errado, em silêncio.

Foi removido. Hoje só existe `origin`, que é o GitHub. Confira quando quiser:

```bash
git remote -v
```

Se um dia aparecer algo que não seja `origin` apontando para `github.com`,
desconfie.
