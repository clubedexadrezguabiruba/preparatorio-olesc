"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DrawShape } from "@lichess-org/chessground/draw";
import { LessonPlayer } from "@/components/lesson/LessonPlayer";
import { Lapis } from "@/components/editor/Lapis";
import { ListaDeDiagramas, type Diagrama } from "@/components/editor/ListaDeDiagramas";
import { PosicaoDoDiagrama } from "@/components/editor/PosicaoDoDiagrama";
import { conferirAula, publicarAula, recarregarAula, salvarAula } from "@/app/editor/acoes";
import {
  cabeMaisUmPasso,
  comCarimbo,
  comDesenho,
  comFala,
  comFenDoDiagrama,
  comPassoNovo,
  comTecnica,
  passoCru,
} from "@/lib/editor/edicoes";
import { filaDeGravacao, type Fila } from "@/lib/editor/fila";
import type { Conferencia } from "@/lib/editor/gate";
import { autoriaDoDesenho, desenhoDaAutoria } from "@/lib/chess/annotations";
import { montarQuadros } from "@/lib/lesson/roteiro";
import {
  MAX_PASSOS_INTRO,
  MAX_PASSOS_ROTEIRO,
  lessonSchema,
  type Lesson,
  type Position,
} from "@/lib/lesson/schema";

/**
 * A casca do modo editor: a aula como o aluno a vê, com a edição em cima dela.
 *
 * ## O modelo mental, em quatro palavras
 *
 * **eu edito → o sistema salva → eu confiro → eu publico.** Não há botão de
 * salvar: salvar é status ("✓ salvo há 3 s"), e `Ctrl+S` só força o que já ia
 * acontecer. Há dois botões, e eles são os dois momentos em que o Doug decide
 * alguma coisa: *Conferir* e *Publicar no curso*.
 *
 * ## O que é a verdade nesta tela
 *
 * `cru` — o JSON **exatamente como está no arquivo**, com a ordem de chaves do
 * arquivo. Não é o objeto que o Zod devolve: `lessonSchema.parse()` reordena as
 * chaves na ordem do schema, e salvar o resultado dele reescreveria as 547
 * linhas da N1-KPK para mudar uma fala. O Zod entra aqui como **juiz** — ele
 * diz se o que está na tela é uma aula válida e monta o objeto que o player
 * usa —, nunca como escritor.
 *
 * Quando o JSON deixa de ser válido no meio de uma edição, o player continua
 * mostrando a **última versão válida**. O contrário — a aula sumir e dar lugar
 * a uma mensagem de erro — perderia o lugar em que o professor estava.
 *
 * ## A gravação
 *
 * Mudança na tela é imediata. A gravação sai com meio segundo de atraso, e a
 * fila (`lib/editor/fila.ts`) garante **uma em voo por vez**: a segunda espera
 * a primeira voltar, e o estado do meio da digitação nunca chega ao disco. Cada
 * gravação leva o `baseHash` — o hash dos bytes que esta aba abriu ou gravou
 * por último —, e o servidor recusa se o arquivo em disco for outro. O caso
 * real disso não é o Doug em duas abas: é um agente editando o mesmo JSON
 * enquanto o editor está aberto.
 */

type Estado = "limpo" | "pendente" | "salvando" | "erro" | "conflito";

export function Editor({
  aula,
  textoInicial,
  hashInicial,
  positions,
  falaMaxCaracteres,
  conferenciaInicial,
  podePublicarInicial,
}: {
  aula: string;
  textoInicial: string;
  hashInicial: string;
  positions: Record<string, Position>;
  falaMaxCaracteres: number;
  conferenciaInicial: Conferencia | null;
  podePublicarInicial: { pode: boolean; motivo: string | null };
}) {
  const [cru, setCru] = useState<Record<string, unknown>>(
    () => JSON.parse(textoInicial) as Record<string, unknown>,
  );
  const [estado, setEstado] = useState<Estado>("limpo");
  const [recado, setRecado] = useState<string | null>(null);
  const [salvoEm, setSalvoEm] = useState<number | null>(null);
  const [agora, setAgora] = useState(() => Date.now());

  const [conferencia, setConferencia] = useState(conferenciaInicial);
  const [conferindo, setConferindo] = useState(false);
  const [publicavel, setPublicavel] = useState(podePublicarInicial);
  const [publicando, setPublicando] = useState(false);
  const [publicacao, setPublicacao] = useState<string | null>(null);

  /** Onde o tabuleiro está. Trocar isto remonta o player naquele diagrama. */
  const [alvo, setAlvo] = useState<{ etapa: "intro" | "objective"; passo: number }>({
    etapa: "objective",
    passo: 0,
  });
  /** Sobe a cada mudança estrutural (conferência, recarga) para remontar o player. */
  const [geracao, setGeracao] = useState(0);

  /**
   * A prévia: **ver a aula como o aluno a vê**, sem nada do editor por cima.
   *
   * Ela não é um modo novo do player, e essa é a decisão inteira: o player já
   * entrega a experiência do aluno quando não recebe nada — sem `edicao` não há
   * lápis, sem `startAt` a aula abre na etapa 1 e anda sozinha, sem `marcacao`
   * o botão direito volta a não desenhar, e sem `onStageDone` nada é gravado
   * como progresso. A prévia é o editor **parando de passar props**, não uma
   * segunda implementação da aula para divergir da primeira.
   */
  const [previa, setPrevia] = useState(false);

  const hash = useRef(hashInicial);
  const relogioDoDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * A última versão do JSON que o schema aceitou.
   *
   * O player precisa de uma `Lesson` para montar. Enquanto o professor apaga
   * uma fala inteira para reescrevê-la, o schema recusa — e é justamente o
   * momento em que ele mais precisa continuar vendo a aula.
   */
  const [ultimaValida, setUltimaValida] = useState<Lesson>(() => lessonSchema.parse(cru));
  const [issues, setIssues] = useState<string[]>([]);

  /**
   * Adota um JSON novo como o que está na tela, e julga na mesma passada.
   *
   * Um só caminho de entrada, chamado sempre de um evento — o lápis, a
   * conferência, a recarga. Julgar num `useEffect` sobre `cru` faria um segundo
   * render a cada tecla só para chegar à mesma conclusão que este julgamento já
   * tem na mão.
   */
  const adotar = useCallback((proximo: Record<string, unknown>) => {
    setCru(proximo);
    const julgada = lessonSchema.safeParse(proximo);
    if (julgada.success) {
      setUltimaValida(julgada.data);
      setIssues([]);
    } else {
      setIssues(julgada.error.issues.map((i) => `${i.path.join(".") || "(raiz)"}: ${i.message}`));
    }
  }, []);

  /** O "há 3 s" precisa de um relógio próprio; ninguém re-renderiza por tempo. */
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 5000);
    return () => clearInterval(t);
  }, []);

  /**
   * A fila nasce no primeiro uso, e não durante o render.
   *
   * Ela fecha sobre `hash.current`, que é uma referência: montá-la no corpo do
   * componente seria entregar a referência a uma função durante o render, e uma
   * referência lida no render é uma tela que não atualiza quando devia. Como
   * ela só é usada a partir de eventos (o lápis, o `Ctrl+S`, o "Conferir"),
   * criar preguiçosamente resolve sem truque.
   */
  const filaRef = useRef<Fila<Record<string, unknown>> | null>(null);
  const obterFila = useCallback(() => {
    filaRef.current ??= filaDeGravacao<Record<string, unknown>>(
      async (valor) => {
        setEstado("salvando");
        const r = await salvarAula(aula, JSON.stringify(valor), hash.current);
        if (r.ok) {
          hash.current = r.hash;
          setEstado("limpo");
          setSalvoEm(Date.now());
          setRecado(r.voz.length > 0 ? avisoDaVoz(r.voz.length) : null);
          // O rascunho mudou depois da última conferência: o direito de
          // publicar morre aqui, e a tela tem de dizer isso na hora.
          setPublicavel({ pode: false, motivo: "a aula mudou depois da conferência" });
        } else if (r.conflito) {
          setEstado("conflito");
          setRecado("o arquivo mudou fora do editor");
        } else {
          setEstado("erro");
          setRecado(r.erro);
        }
      },
      (erro) => {
        setEstado("erro");
        setRecado(erro instanceof Error ? erro.message : "não consegui salvar");
      },
    );
    return filaRef.current;
  }, [aula]);

  /** Muda o JSON na tela e agenda a gravação. É por aqui que passa toda edição. */
  const editar = useCallback(
    (proximo: Record<string, unknown>) => {
      const carimbado = comCarimbo(proximo);
      adotar(carimbado);
      setEstado("pendente");
      if (relogioDoDebounce.current) clearTimeout(relogioDoDebounce.current);
      relogioDoDebounce.current = setTimeout(() => obterFila().enfileirar(carimbado), 500);
    },
    [adotar, obterFila],
  );

  const forcarSalvamento = useCallback(() => {
    if (relogioDoDebounce.current) clearTimeout(relogioDoDebounce.current);
    obterFila().enfileirar(cru);
  }, [cru, obterFila]);

  /** Volta da prévia para a edição, remontando o player no diagrama de origem. */
  const sairDaPrevia = useCallback(() => {
    setPrevia(false);
    setGeracao((g) => g + 1);
  }, []);

  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        forcarSalvamento();
      }
      // `Escape` só sai da prévia. Na edição ele é do lapisinho, que cancela a
      // frase em curso — roubá-lo aqui apagaria o cancelamento de quem digita.
      if (e.key === "Escape" && previa) {
        e.preventDefault();
        sairDaPrevia();
      }
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [forcarSalvamento, previa, sairDaPrevia]);

  // ------------------------------------------------------- as edições

  const trocarFala = useCallback(
    (etapa: "intro" | "objective", passo: number, texto: string) => {
      editar(comFala(cru, etapa, passo, texto));
    },
    [cru, editar],
  );

  const trocarTitulo = useCallback((texto: string) => editar({ ...cru, title: texto }), [cru, editar]);

  /**
   * Troca a posição de um diagrama da apresentação — a "galeria".
   *
   * Não julga a FEN: quem julgou foi a tela (`PosicaoDoDiagrama` roda o mesmo
   * `fenProblem` do gate antes de chamar), e quem julga de novo é o gate. Aqui
   * é só a cirurgia no JSON.
   */
  const trocarFenDoDiagrama = useCallback(
    (fen: string | null) => {
      editar(comFenDoDiagrama(cru, alvo.passo, fen));
      // O tabuleiro tem de mostrar a posição nova: `startAt` só é lido na
      // montagem, e sem remontar o professor colaria uma FEN e não veria nada.
      setGeracao((g) => g + 1);
    },
    [cru, alvo.passo, editar],
  );

  const trocarTecnica = useCallback(
    (campo: "name" | "summary", texto: string) => editar(comTecnica(cru, campo, texto)),
    [cru, editar],
  );

  /**
   * O desenho do diagrama que está na tela, nos dois sentidos.
   *
   * O chessground devolve a **lista inteira** de formas depois de cada traço,
   * não um delta — então gravar é sempre reescrever o desenho daquele passo.
   * `autoriaDoDesenho` cuida da regra que o gate cobra e que ninguém vê ao
   * desenhar: apagar o último traço some com o campo, em vez de deixar `[]`.
   */
  const marcacao = useMemo(
    () => ({
      shapes: desenhoDaAutoria(passoCru(cru, alvo.etapa, alvo.passo)),
      onChange: (shapes: DrawShape[]) =>
        editar(comDesenho(cru, alvo.etapa, alvo.passo, autoriaDoDesenho(shapes))),
    }),
    [cru, alvo.etapa, alvo.passo, editar],
  );

  /** Cabe mais um diagrama nesta etapa? O teto é o do schema. */
  const cabeMais = useMemo(() => cabeMaisUmPasso(cru, alvo.etapa), [cru, alvo.etapa]);

  /**
   * O "+": um diagrama novo entra **antes** do índice pedido, e o tabuleiro vai
   * para ele.
   *
   * Três coisas acontecem juntas, e a terceira é a que não é óbvia:
   *
   * 1. o JSON ganha o passo (`comPassoNovo`, que o faz sem lance — ver lá o
   *    porquê: assim a etapa 3 não muda um byte);
   * 2. o palco vai para o diagrama novo, porque o gesto do professor é
   *    "acrescentar **para escrever agora**", e deixá-lo onde estava o
   *    obrigaria a caçar na coluna o passo que ele acabou de criar;
   * 3. **a conferência anterior é jogada fora.** Ela marcava diagramas por
   *    índice — `roteiro[3]` era o quarto selo —, e um passo inserido no meio
   *    empurra todos os de baixo. Manter as marcas acenderia a borda vermelha
   *    no diagrama errado, que é pior que não acender nenhuma: o professor
   *    consertaria uma fala que não tinha problema.
   */
  const acrescentarDiagrama = useCallback(
    (indice: number) => {
      if (!cabeMaisUmPasso(cru, alvo.etapa)) return;
      editar(comPassoNovo(cru, alvo.etapa, indice));
      setAlvo({ etapa: alvo.etapa, passo: indice });
      setGeracao((g) => g + 1);
      setConferencia(null);
      setPublicavel({ pode: false, motivo: "a aula ganhou um diagrama depois da conferência" });
    },
    [cru, alvo.etapa, editar],
  );

  // -------------------------------------------------- conferir e publicar

  async function conferir() {
    setConferindo(true);
    setRecado(null);
    try {
      // Nada de conferir por cima de uma gravação em voo: o gate leria o
      // arquivo pela metade do caminho.
      forcarSalvamento();
      await obterFila().aguardar();

      const r = await conferirAula(aula);
      setConferencia(r.conferencia);
      if (r.texto && r.hash) {
        // A passada A reescreve o rascunho — é ali que a etapa 3 nasce. Sem
        // adotar o texto de volta, a próxima gravação brigaria consigo mesma.
        hash.current = r.hash;
        adotar(JSON.parse(r.texto) as Record<string, unknown>);
        setGeracao((g) => g + 1);
      }
      setPublicavel(
        r.conferencia.verde
          ? { pode: true, motivo: null }
          : { pode: false, motivo: r.conferencia.impedimento ?? "a conferência encontrou problemas" },
      );
    } finally {
      setConferindo(false);
    }
  }

  async function publicar() {
    setPublicando(true);
    try {
      const r = await publicarAula(aula);
      setPublicacao(
        r.ok
          ? `publicada — ${r.promovidos.length} arquivo(s) em content/. ${r.gitStatus || "sem mudanças no git"}`
          : (r.motivo ?? "não deu para publicar"),
      );
      if (r.ok) setPublicavel({ pode: false, motivo: "já publicada" });
    } finally {
      setPublicando(false);
    }
  }

  async function recarregar() {
    const r = await recarregarAula(aula);
    if (!r) return;
    hash.current = r.hash;
    adotar(JSON.parse(r.texto) as Record<string, unknown>);
    setGeracao((g) => g + 1);
    setEstado("limpo");
    setRecado(null);
  }

  // ------------------------------------------------------------ a lista

  const problemas = useMemo(
    () => conferencia?.passadas.flatMap((p) => p.problemas) ?? [],
    [conferencia],
  );

  const diagramas = useMemo<Diagrama[]>(() => {
    const marcas = (etapa: "intro" | "objective", i: number) =>
      problemas.filter((p) => p.diagrama?.etapa === etapa && p.diagrama.indice === i).map((p) => p.code);

    if (alvo.etapa === "intro") {
      const intro = ultimaValida.stages.intro;
      if (!intro) return [];
      const fen =
        positions[
          (ultimaValida.stages.objective ?? ultimaValida.stages.guided ?? ultimaValida.stages.practice)!
            .positionId
        ].fen;
      return intro.passos.map((p, i) => ({
        fen: p.fen ?? fen,
        fala: p.fala,
        problemas: marcas("intro", i),
      }));
    }
    const objective = ultimaValida.stages.objective;
    if (!objective) return [];
    const quadros = montarQuadros(positions[objective.positionId].fen, objective.roteiro);
    return objective.roteiro.map((p, i) => ({
      fen: quadros[i].fen,
      fala: p.fala,
      problemas: marcas("objective", i),
    }));
  }, [alvo.etapa, ultimaValida, positions, problemas]);

  const etapasDisponiveis = (["intro", "objective"] as const).filter(
    (e) => ultimaValida.stages[e] !== undefined,
  );

  /**
   * A posição da aula — a que um diagrama da apresentação mostra quando não tem
   * `fen` própria. É a mesma conta do `useMemo` dos diagramas, e a ordem
   * (`objective`, depois `guided`, depois `practice`) é a do gate.
   */
  const fenDaAula =
    positions[
      (ultimaValida.stages.objective ??
        ultimaValida.stages.guided ??
        ultimaValida.stages.practice)!.positionId
    ].fen;

  /**
   * A FEN própria do diagrama selecionado: `null` quando ele mostra a da aula,
   * `undefined` quando não há diagrama (etapa sem passos, ou índice fora).
   *
   * Ela sai do **cru**, e não de `ultimaValida`: é o cru que vai ao disco, e
   * ler do objeto do Zod aqui abriria a porta para a tela mostrar uma posição e
   * o arquivo guardar outra.
   */
  const fenDoDiagrama: string | null | undefined = (() => {
    if (alvo.etapa !== "intro") return undefined;
    const passo = passoCru(cru, "intro", alvo.passo);
    if (!passo) return undefined;
    return typeof passo.fen === "string" ? passo.fen : null;
  })();

  if (previa) {
    /**
     * **A armadilha da prévia, e por isso ela está na tela e não num
     * comentário:** a etapa 3 não é escrita pela edição — ela é *derivada* do
     * roteiro pelo `--write`, que só roda em "Conferir". Entre uma edição do
     * roteiro e a conferência seguinte, o treino que o arquivo carrega é o
     * anterior, e a prévia o mostraria como se fosse o de agora. Quem confere
     * é `publicavel.pode`: ele já significa "a última conferência ficou verde
     * **e** o rascunho não mudou desde então", que é exatamente a condição em
     * que o treino do arquivo está em dia.
     */
    const treinoEmDia = publicavel.pode;
    const horaDaConferencia = conferencia
      ? new Date(conferencia.em).toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : null;

    return (
      <div className="flex h-dvh flex-col gap-3 p-3">
        <header className="flex flex-wrap items-center gap-3 rounded-lg border border-borda-fraca bg-carta px-3 py-2">
          <span className="rotulo text-tinta-fraca">Prévia de {aula}</span>
          <span className="text-sm text-tinta-media">
            A aula como o aluno a vê. Nada do que você fizer aqui é salvo, e nada conta como
            progresso.
          </span>
          <button
            type="button"
            onClick={sairDaPrevia}
            className="foco ml-auto rounded-md border border-borda px-3 py-1.5 text-sm"
          >
            Voltar a editar (Esc)
          </button>
        </header>

        {!treinoEmDia && (
          <p
            role="status"
            className="rounded-lg border border-aviso bg-aviso-superficie px-3 py-2 text-sm text-aviso-tinta"
          >
            O treino da etapa 3 é escrito pela conferência, não pela edição.{" "}
            {horaDaConferencia
              ? `A última foi às ${horaDaConferencia}, e o rascunho mudou depois dela — `
              : "Esta aula ainda não foi conferida — "}
            o treino que aparece abaixo pode ser o de antes. Confira para vê-lo em dia.
          </p>
        )}

        <main className="min-w-0 flex-1 overflow-y-auto">
          {/* Sem `startAt`, sem `edicao`, sem `marcacao`, sem `aoAndar`: é o
              aluno. A `key` remonta a aula do começo a cada entrada na prévia,
              senão a segunda visita abriria onde a primeira parou. */}
          <LessonPlayer
            key={`previa-${aula}-${geracao}`}
            bundle={{ lesson: ultimaValida, positions }}
          />
        </main>
      </div>
    );
  }

  return (
    /*
     * **A altura da página é FECHADA (`h-dvh`), e não um piso (`min-h-dvh`).**
     *
     * A coluna de selos tem `overflow-y-auto` — ela promete rolar por dentro.
     * Essa promessa só vale dentro de um pai que saiba onde termina: com um
     * piso, a coluna cresce em vez de rolar. Medido em 1366×768 em 10/9/2026,
     * com os 13 selos da N1-KPK: a coluna media **1245 px** e a página inteira
     * **1361**, contra 768 de janela — 593 px de rolagem, com o tabuleiro e os
     * botões empurrados junto. É o mesmo defeito que o palco tinha na largura
     * (ver `.aula-palco` em `app/globals.css`), na outra direção.
     *
     * `min-h-0` na linha abaixo é a outra metade: sem ele, um filho flex nunca
     * encolhe abaixo do próprio conteúdo, e a altura fechada aqui em cima não
     * chegaria à coluna.
     */
    <div className="flex h-dvh flex-col gap-3 p-3">
      <BarraDoEditor
        aula={aula}
        estado={estado}
        salvoEm={salvoEm}
        agora={agora}
        recado={recado}
        conferindo={conferindo}
        publicando={publicando}
        publicavel={publicavel}
        temConferenciaVerde={conferencia?.verde ?? false}
        aoVerPrevia={() => setPrevia(true)}
        aoConferir={conferir}
        aoPublicar={publicar}
        aoRecarregar={recarregar}
        aoForcar={forcarSalvamento}
      />

      {publicacao && (
        <p role="status" className="rounded-lg border border-borda-fraca bg-carta-alta px-3 py-2 text-sm text-tinta-media">
          {publicacao}
        </p>
      )}

      {problemas.length > 0 && (
        <ProblemasSemDiagrama problemas={problemas.filter((p) => !p.diagrama)} />
      )}

      {/* Só na apresentação, e a razão está no cabeçalho de `PosicaoDoDiagrama`:
          na aula assistida não existe "a posição deste diagrama". */}
      {alvo.etapa === "intro" && fenDoDiagrama !== undefined && (
        <PosicaoDoDiagrama
          key={alvo.passo}
          numero={alvo.passo + 1}
          fen={fenDoDiagrama}
          fenDaAula={fenDaAula}
          aoTrocar={trocarFenDoDiagrama}
        />
      )}

      <div className="flex min-h-0 flex-1 gap-4">
        <aside className="w-56 shrink-0 overflow-y-auto">
          <div className="mb-2 flex gap-1">
            {etapasDisponiveis.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => {
                  setAlvo({ etapa: e, passo: 0 });
                  setGeracao((g) => g + 1);
                }}
                className={`foco rotulo rounded-md px-2 py-1 ${
                  alvo.etapa === e ? "bg-carta-toque text-tinta" : "text-tinta-fraca hover:text-tinta"
                }`}
              >
                {e === "intro" ? "Apresentação" : "Aula assistida"}
              </button>
            ))}
          </div>
          <ListaDeDiagramas
            diagramas={diagramas}
            atual={alvo.passo}
            orientation={ultimaValida.orientation}
            cabeMais={cabeMais}
            aoAcrescentar={acrescentarDiagrama}
            aoEscolher={(i) => {
              setAlvo((a) => ({ ...a, passo: i }));
              setGeracao((g) => g + 1);
            }}
          />
          {!cabeMais && (
            <p className="mt-2 text-xs text-tinta-fraca">
              {/* O número sai da constante, e nunca do texto: um teto escrito à
                  mão vira mentira no dia em que o schema mudar — e ele mudou em
                  10/9/2026, 6→12 na apresentação e 24→40 na aula assistida. */}
              {alvo.etapa === "intro"
                ? `A apresentação chegou aos ${MAX_PASSOS_INTRO} diagramas — é o teto do formato.`
                : `A aula assistida chegou aos ${MAX_PASSOS_ROTEIRO} diagramas — é o teto do formato.`}
            </p>
          )}
        </aside>

        {/* `overflow-y-auto`: o palco tem altura própria (`--aula-teto`, no
            CSS) e não encolhe. Quando uma faixa de aviso aparece aqui em cima e
            sobra menos altura do que ele pede, quem rola é este painel — nunca
            a página, que voltaria a arrastar a coluna de selos junto. */}
        <main className="min-w-0 flex-1 overflow-y-auto">
          <LessonPlayer
            // Remonta quando o diagrama-alvo muda ou quando o arquivo é
            // reescrito por fora (conferência, recarga). Digitar **não**
            // remonta: `startAt` só é lido na montagem, e um remonte por letra
            // devolveria o tabuleiro ao primeiro diagrama a cada tecla.
            key={`${aula}-${alvo.etapa}-${alvo.passo}-${geracao}`}
            bundle={{ lesson: ultimaValida, positions }}
            startAt={{ stage: alvo.etapa, passo: alvo.passo, pausado: true }}
            marcacao={marcacao}
            aoAndar={(passo) => setAlvo((a) => (a.passo === passo ? a : { ...a, passo }))}
            edicao={{
              titulo: (valor) => (
                <Lapis
                  valor={valor}
                  rotulo="o título da aula"
                  multilinha={false}
                  aoSalvar={trocarTitulo}
                  className="titulo"
                />
              ),
              tecnica: (campo, valor) => (
                <Lapis
                  valor={valor}
                  rotulo={campo === "name" ? "o nome da técnica" : "o resumo da técnica"}
                  aoSalvar={(t) => trocarTecnica(campo, t)}
                />
              ),
              fala: (etapa, passo, valor) => (
                <Lapis
                  valor={valor}
                  rotulo={`a fala do diagrama ${passo + 1}`}
                  teto={falaMaxCaracteres}
                  aoSalvar={(t) => trocarFala(etapa, passo, t)}
                  className="text-sm leading-relaxed text-tinta-media"
                />
              ),
            }}
          />
        </main>
      </div>

      {issues.length > 0 && (
        <p role="alert" className="rounded-lg border border-erro bg-erro-superficie px-3 py-2 text-sm text-erro-tinta">
          Esta versão ainda não é uma aula válida, então ela não foi salva: {issues[0]}
        </p>
      )}
    </div>
  );
}

// --------------------------------------------------------------- a barra

function BarraDoEditor({
  aula,
  estado,
  salvoEm,
  agora,
  recado,
  conferindo,
  publicando,
  publicavel,
  temConferenciaVerde,
  aoVerPrevia,
  aoConferir,
  aoPublicar,
  aoRecarregar,
  aoForcar,
}: {
  aula: string;
  estado: Estado;
  salvoEm: number | null;
  agora: number;
  recado: string | null;
  conferindo: boolean;
  publicando: boolean;
  publicavel: { pode: boolean; motivo: string | null };
  temConferenciaVerde: boolean;
  aoConferir: () => void;
  aoVerPrevia: () => void;
  aoPublicar: () => void;
  aoRecarregar: () => void;
  aoForcar: () => void;
}) {
  return (
    <header className="flex flex-wrap items-center gap-3 rounded-lg border border-borda-fraca bg-carta px-3 py-2">
      <span className="rotulo text-tinta-fraca">Editando {aula}</span>

      <span role="status" className="text-sm text-tinta-media">
        {estado === "salvando" && "salvando…"}
        {estado === "pendente" && "com alterações"}
        {estado === "limpo" && salvoEm && `✓ salvo ${haQuantoTempo(agora - salvoEm)}`}
        {estado === "limpo" && !salvoEm && "✓ sem alterações"}
        {estado === "erro" && <span className="text-erro-tinta">{recado}</span>}
        {estado === "conflito" && <span className="text-erro-tinta">{recado}</span>}
      </span>

      {estado === "conflito" && (
        <button type="button" onClick={aoRecarregar} className="foco rotulo underline">
          recarregar do disco
        </button>
      )}
      {estado === "erro" && (
        <button type="button" onClick={aoForcar} className="foco rotulo underline">
          tentar de novo
        </button>
      )}
      {estado === "limpo" && recado && <span className="text-sm text-aviso-tinta">{recado}</span>}

      <div className="ml-auto flex gap-2">
        {/* "Ver como aluno" vem ANTES de Conferir, e a ordem é o ciclo: escrevo,
            olho, confiro, publico. Ela não desabilita nunca — a prévia lê a
            última versão válida na tela, que existe mesmo enquanto o JSON está
            quebrado no meio de uma frase. */}
        <button
          type="button"
          onClick={aoVerPrevia}
          className="foco rounded-md border border-borda px-3 py-1.5 text-sm"
        >
          Ver como aluno
        </button>
        <button
          type="button"
          onClick={aoConferir}
          disabled={conferindo}
          className="foco rounded-md border border-borda px-3 py-1.5 text-sm disabled:opacity-50"
        >
          {conferindo ? "conferindo…" : "Conferir"}
        </button>
        <button
          type="button"
          onClick={aoPublicar}
          disabled={!publicavel.pode || publicando}
          title={publicavel.motivo ?? undefined}
          className="foco rounded-md bg-metodo-cheio px-3 py-1.5 text-sm text-tinta-inversa disabled:opacity-50"
        >
          {publicando ? "publicando…" : "Publicar no curso"}
        </button>
      </div>

      {!publicavel.pode && publicavel.motivo && (
        <p className="w-full text-xs text-tinta-fraca">{publicavel.motivo}</p>
      )}
      {temConferenciaVerde && publicavel.pode && (
        <p className="w-full text-xs text-tinta-fraca">
          conferência verde — pode publicar
        </p>
      )}
    </header>
  );
}

function ProblemasSemDiagrama({
  problemas,
}: {
  problemas: Array<{ code: string; onde: string; message: string }>;
}) {
  if (problemas.length === 0) return null;
  return (
    <ul className="rounded-lg border border-erro bg-erro-superficie px-3 py-2 text-sm text-erro-tinta">
      {problemas.map((p, i) => (
        <li key={i}>
          {p.message} <span className="text-xs opacity-70">({p.onde})</span>
        </li>
      ))}
    </ul>
  );
}

// ------------------------------------------------------------- as contas

function haQuantoTempo(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 5) return "agora";
  if (s < 60) return `há ${s} s`;
  const m = Math.round(s / 60);
  return `há ${m} min`;
}

function avisoDaVoz(quantas: number): string {
  return quantas === 1
    ? "1 texto fora da régua da voz do curso"
    : `${quantas} textos fora da régua da voz do curso`;
}
