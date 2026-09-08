"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

import { Professor } from "./Professor";

/**
 * O professor no painel, clicável — e o retrato de perto que o clique abre.
 *
 * ## Por que é um componente à parte, e não um estado dentro de `Professor`
 *
 * `Professor` é, por contrato escrito no próprio arquivo, **uma imagem só, sem
 * estado**. Ele é usado no meio de um painel de altura fechada e a única coisa
 * que se espera dele é ocupar uma largura e desenhar uma figura. Enfiar aqui
 * dentro um diálogo, um relógio e um contador de visitas transformaria o
 * retrato num componente que precisa ser entendido antes de ser usado.
 *
 * Então o retrato continua burro e este daqui é o que fala: ele embrulha o
 * `Professor` num botão e é o dono da janela. Quem quiser o retrato calado
 * continua importando `Professor` direto.
 *
 * ## O botão que não pode parecer botão
 *
 * O contrato do retrato — nada de `rounded-full`, `ring-*`, `border-*` ou
 * `bg-*` — vale igual aqui, e por um motivo mais forte: o que faz o desenho
 * pertencer à cena é o alfa dele encostar direto no papel. Um botão com fundo
 * ou borda devolveria exatamente o balãozinho que a primeira versão do retrato
 * foi recusada por parecer.
 *
 * O que sobra para dizer "isto se aperta" é o cursor, um levantar de 2 px no
 * `hover` (dentro de `motion-safe`, como o resto do projeto) e o anel de foco
 * do teclado, que é `outline` — desenhado **fora** do botão, contra o painel,
 * e não em volta da figura.
 *
 * ## As duas falas, e por que a contagem vive num `ref`
 *
 * Elas **alternam**, e não param na última: se apresenta, cobra estudo, se
 * apresenta de novo. O índice é `vezes % FALAS.length`, e a primeira versão
 * disto saturava (`Math.min`) — da terceira vez em diante o professor só sabia
 * cobrar. O Doug clicou quatro vezes e viu; saturar deixa o brinquedo sem
 * corda depois do segundo toque, e a graça dele é justamente ter corda.
 *
 * Acrescentar uma terceira fala é acrescentar uma linha ao array: a volta é
 * pelo tamanho, não pelo número dois.
 *
 * A
 * fala que está na tela mora em `useState` e é **congelada no instante em que a
 * janela abre**. Se ela fosse derivada do contador, incrementar o contador ao
 * abrir trocaria o texto no meio da própria visita — o aluno veria o "olá"
 * virar "eu já te disse oi" na frente dele. Por isso o contador é um `ref`:
 * ele não precisa provocar redesenho, e não deve.
 *
 * A contagem morre com a montagem, e é de propósito: ela é a memória *desta
 * sessão de estudo*. Voltar amanhã e ouvir o "olá" de novo é o certo; guardar
 * em `localStorage` que alguém já ouviu uma piada é estado demais para o que a
 * coisa vale.
 *
 * ## O relógio de 7 segundos, e quando ele para
 *
 * A janela fecha sozinha em {@link NA_TELA_MS}. **Mas o relógio pausa enquanto
 * o ponteiro está em cima ou o foco está dentro** — a janela existe para o
 * aluno olhar o desenho de perto, e uma janela que some no meio da olhada
 * trabalha contra o próprio motivo de existir. É também o que impede o caso
 * chato do teclado: quem chegou no botão "Fechar" com `Tab` não perde o alvo
 * debaixo do dedo.
 *
 * ## O teclado da aula, e por que o ouvinte é de captura
 *
 * A aula escuta `espaço`, `←` e `→` na janela para andar nos lances (ver
 * `Passada.tsx`). Com esta janela aberta, essas teclas **não podem** chegar
 * lá: o aluno apertaria espaço para dispensar o retrato e o tabuleiro andaria
 * um lance atrás dele. O ouvinte abaixo é de captura, e `stopPropagation` na
 * captura interrompe o percurso inteiro do evento — inclusive os ouvintes de
 * bolha da própria janela. É o mesmo mecanismo do `SeletorDeLinha`, e é o que
 * faz a janela ser modal sem `<dialog>`.
 *
 * ## O retrato de perto é outro arquivo, e é outro RECORTE
 *
 * `professor-inteiro-v1.webp` tem 983×1346, resolução nativa e sem
 * reamostragem. Dois motivos para não reusar o do painel:
 *
 * **Resolução.** O do painel tem 360 px de largura; ampliá-lo até meia tela
 * deixaria o rosto borrado, que é exatamente o que o aluno abriu a janela para
 * não ver.
 *
 * **Enquadramento.** O recorte do painel é estreito de propósito — o paletó
 * sai pelas laterais para não virar mancha de capa a 112 px, e ali isso
 * funciona porque a figura está solta sobre o papel, sem moldura por perto.
 * Dentro de um cartão com borda, o mesmo corte lê como defeito: o ombro
 * encosta na borda e parece decepado. Aqui entra a figura **inteira**, com 12
 * px de margem em volta.
 *
 * Trocar de recorte **não custou nada ao pin**, e isso é aritmética: o pin na
 * tela vale `59 × altura_exibida / altura_do_recorte`, e a largura não entra na
 * conta. O estreito (1338 de altura) dava 31,0 px de pin a 702 px de exibição;
 * a figura inteira (1346) dá 30,8. Meio pixel.
 *
 * **O que nenhum dos dois entrega:** o wordmark do broche não é legível, e não
 * há tamanho que resolva. Medido na arte-mãe, a caixa-alta dele tem ~8,6 px e o
 * traço fino da serifa fica abaixo de 1,5 px — abaixo disso o traço não
 * sobrevive à rasterização, e a arte é raster, não vetor. A tabela dos
 * patamares está em `scripts/professor.py`, na seção "O pin do clube". A 31 px
 * o aluno vê o cavalo em mosaico e sabe que há uma plaquinha escrita embaixo
 * dele; ler as letras, não lê. Para ler seria preciso outra arte, exportada
 * maior.
 */

/** As duas falas. A primeira é a apresentação; a segunda vale da segunda vez em diante. */
const FALAS = [
  "Olá, sou eu mesmo, professor Douglas, vamos estudar juntos.",
  "Eu já te disse oi, agora vamos estudar!",
] as const;

/** Quanto o retrato fica na tela antes de fechar sozinho, quando ninguém o segura. */
const NA_TELA_MS = 7000;

/** As teclas que a aula escuta na janela, e que o retrato aberto tem de engolir. */
const DA_AULA = new Set(["ArrowLeft", "ArrowRight", " ", "Spacebar"]);

export function ProfessorSeApresenta({ largura = 112 }: { largura?: number }) {
  const [fala, setFala] = useState<string | null>(null);
  const [segurado, setSegurado] = useState(false);
  const vezesRef = useRef(0);
  const gatilhoRef = useRef<HTMLButtonElement | null>(null);
  const fecharRef = useRef<HTMLButtonElement | null>(null);
  const caixaRef = useRef<HTMLDivElement | null>(null);

  const aberto = fala !== null;
  /*
   * O mesmo "está aberto", numa referência — e ela existe por causa de uma
   * corrida que eu vi acontecer no navegador.
   *
   * O ouvinte de teclado abaixo mora num `useEffect`, e efeito roda **depois**
   * do commit. Entre o clique que abre a janela e o ouvinte existir há alguns
   * milissegundos, e um espaço apertado nessa fresta chega à aula: o tabuleiro
   * anda um lance atrás do véu. Medido: aconteceu na primeira tentativa e não
   * reproduziu nas seguintes, que é a assinatura de corrida.
   *
   * A correção é não depender do efeito para saber se a janela está aberta. O
   * ouvinte fica montado a vida toda do componente e pergunta a esta
   * referência, que `abrir` escreve **de forma síncrona**, dentro do próprio
   * manipulador de clique — antes de qualquer redesenho.
   */
  const abertoRef = useRef(false);

  const fechar = useCallback(() => {
    abertoRef.current = false;
    setFala(null);
    setSegurado(false);
    gatilhoRef.current?.focus();
  }, []);

  const abrir = useCallback(() => {
    abertoRef.current = true;
    // O índice dá a volta: as falas **alternam**, e não saturam na última.
    setFala(FALAS[vezesRef.current % FALAS.length]);
    vezesRef.current += 1;
    setSegurado(false);
  }, []);

  /* O relógio. Parado enquanto alguém está olhando — ver o bloco lá em cima. */
  useEffect(() => {
    if (!aberto || segurado) return;
    const id = window.setTimeout(fechar, NA_TELA_MS);
    return () => window.clearTimeout(id);
  }, [aberto, segurado, fechar]);

  /*
   * `Esc` fecha; as teclas da aula morrem aqui. Captura, e não bolha:
   * `stopPropagation` na captura interrompe o percurso inteiro do evento,
   * inclusive os ouvintes de bolha da própria janela — que é onde a aula
   * escuta.
   *
   * **Montado sempre, e não só quando a janela abre** — ver `abertoRef` acima.
   * O custo é um ouvinte de teclado por retrato; o que ele compra é não haver
   * instante nenhum em que a janela está aberta e as teclas passam.
   */
  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (!abertoRef.current) return;
      if (evento.key === "Escape") {
        evento.stopPropagation();
        fechar();
        return;
      }
      if (DA_AULA.has(evento.key)) evento.stopPropagation();
    }

    window.addEventListener("keydown", aoTeclar, true);
    return () => window.removeEventListener("keydown", aoTeclar, true);
  }, [fechar]);

  /* O foco entra na janela quando ela abre. Sem isso, quem usa teclado
     continuaria no botão que ficou atrás do véu, e o `Tab` seguinte passearia
     pela aula escondida. */
  useEffect(() => {
    if (aberto) caixaRef.current?.focus();
  }, [aberto]);

  return (
    <>
      <button
        ref={gatilhoRef}
        type="button"
        onClick={abrir}
        aria-haspopup="dialog"
        aria-expanded={aberto}
        title="Ver o professor de perto"
        aria-label="Ver o professor de perto"
        className="foco block cursor-pointer rounded-sm transition-transform motion-safe:hover:-translate-y-0.5"
      >
        <Professor largura={largura} />
      </button>

      {aberto ? (
        <div
          /*
           * O véu cobre a janela inteira, e o clique nele fecha — mas só o
           * clique NELE: `currentTarget` é o véu, `target` é o que foi
           * apertado. Sem essa comparação, clicar no próprio retrato fecharia
           * a janela que o aluno acabou de abrir para olhá-lo.
           */
          onClick={(evento) => {
            if (evento.target === evento.currentTarget) fechar();
          }}
          className="veu-do-professor fixed inset-0 z-50 flex items-center justify-center bg-veu p-4 backdrop-blur-[2px]"
        >
          <div
            ref={caixaRef}
            role="dialog"
            aria-modal="true"
            aria-label="O professor Douglas"
            tabIndex={-1}
            onMouseEnter={() => setSegurado(true)}
            onMouseLeave={() => setSegurado(false)}
            onFocus={(evento) => {
              /*
               * **O foco no PRÓPRIO contêiner não conta, e essa exceção é um
               * defeito consertado.** Ao abrir, o efeito lá em cima manda o
               * foco para esta `div` — é o que impede o teclado de continuar
               * na aula escondida atrás do véu. Sem esta linha, esse foco
               * automático marcaria "alguém está olhando" no mesmo instante em
               * que a janela nasce, o relógio nunca começaria, e a janela
               * **nunca fecharia sozinha**.
               *
               * O navegador headless da conferência não dispara evento de foco
               * quando a página não está em primeiro plano, então ele passava
               * verde e escondia isto. Só segura o relógio o foco que caiu num
               * controle de verdade aqui dentro — quem chegou no "Fechar" com
               * `Tab` está olhando; quem acabou de abrir, não necessariamente.
               */
              if (evento.target !== evento.currentTarget) setSegurado(true);
            }}
            onBlur={(evento) => {
              // Só solta o relógio quando o foco sai da janela de vez — trocar
              // de um controle para outro aqui dentro não é "parou de olhar".
              if (!evento.currentTarget.contains(evento.relatedTarget)) setSegurado(false);
            }}
            onKeyDown={(evento) => {
              /*
               * A prisão de foco, e ela cabe em três linhas porque a janela tem
               * **um** controle. `Tab` aqui dentro só pode levar ao "Fechar";
               * deixá-lo escapar seria mandar o teclado passear pela aula que
               * está atrás do véu, com `aria-modal` dizendo que ela não existe.
               */
              if (evento.key !== "Tab") return;
              evento.preventDefault();
              fecharRef.current?.focus();
            }}
            className="professor-de-perto flex max-h-full flex-col items-center gap-3 rounded-xl bg-carta p-4 shadow-xl ring-1 ring-borda outline-none sm:flex-row sm:items-start sm:gap-5 sm:p-6"
          >
            {/*
             * O tamanho sai de uma LARGURA calculada, e não de `max-h` — e a
             * diferença não é de estilo, é de defeito consertado.
             *
             * Com `w-auto h-auto max-h-[78vh]`, quem decidia o tamanho era o
             * *bitmap*: o `next/image` escolhe um candidato do `srcset` pelo
             * `sizes`, e com `width` automático o elemento assume o tamanho
             * natural do arquivo que chegou. Medido: o `sizes` de 480px fazia o
             * professor sair com 480×657 numa tela de 1440×900 onde cabiam
             * 702px de altura — a janela existe para ele aparecer grande, e ele
             * aparecia pequeno porque o arquivo era pequeno.
             *
             * Com a largura explícita o CSS manda, e o bitmap volta a ser só
             * nitidez. `min(largura da tela, altura da tela × razão)` é a
             * mesma conta que `object-contain` faria, escrita à mão: a razão do
             * recorte é 983/1346 = 0,730, então 78vh de altura pedem 57vh de
             * largura. Os dois pares são diferentes porque os arranjos são:
             * empilhado (celular) o balão come altura abaixo dele; lado a lado
             * (`sm`) o balão não disputa altura nenhuma.
             *
             * `max-w-[983px]` é o teto nativo: passar disso seria ampliar, e
             * ampliar é o que este arquivo existe para evitar.
             */}
            <Image
              src="/professor-inteiro-v1.webp"
              alt="O professor Douglas, de perto"
              width={983}
              height={1346}
              sizes="(min-width: 640px) 46vw, 88vw"
              className="h-auto w-[min(88vw,44vh)] max-w-[983px] sm:w-[min(46vw,57vh)]"
            />

            {/*
             * `mt` em `vh`, e não um número de pixels: lado a lado, o balão
             * tem de nascer na altura do ROSTO dele, e a altura do retrato é
             * ela mesma uma fração da tela (78vh). Um `mt` em px acertaria a
             * mira num monitor e erraria em todos os outros.
             *
             * A conta: 12vh de recuo mais os 24px do bico dentro do balão
             * põem o bico a ~19% da altura da figura. No painel ele fica a
             * 22% — a altura dos olhos (ver `Comentario.tsx`). É a mesma
             * relação, e é o que faz o balão ler como fala em vez de legenda.
             */}
            <div className="flex min-w-0 flex-col items-center gap-3 sm:mt-[12vh] sm:items-start">
              {/*
               * O balão, com o mesmo desenho do painel — mesma cor, mesma
               * borda, mesmo raio. É a mesma pessoa falando; um segundo estilo
               * de balão faria a janela parecer outro produto.
               *
               * **O bico troca de lado com o arranjo, e não some.** Empilhado
               * ele nasce em cima, apontando para o retrato que está acima;
               * lado a lado ele nasce à esquerda, como no painel. São duas
               * metades de borda cada um — o quadrado girado 45° só mostra as
               * duas que ficam de fora da caixa.
               */}
              <div className="relative max-w-xs rounded-lg border border-borda-fraca bg-carta-alta px-4 py-3.5 text-center text-sm leading-relaxed text-tinta-media sm:max-w-sm sm:text-left">
                <span
                  aria-hidden
                  className="absolute -top-2 left-1/2 size-4 -translate-x-1/2 rotate-45 border-t border-l border-borda-fraca bg-carta-alta sm:hidden"
                />
                <span
                  aria-hidden
                  className="absolute top-6 -left-2 hidden size-4 rotate-45 border-b border-l border-borda-fraca bg-carta-alta sm:block"
                />
                {fala}
              </div>

              <button
                ref={fecharRef}
                type="button"
                onClick={fechar}
                className="foco cursor-pointer rounded-md border border-borda bg-carta-alta px-3.5 py-1.5 text-sm text-tinta-media transition hover:bg-carta-toque hover:text-tinta"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
