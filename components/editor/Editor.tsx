"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LessonPlayer } from "@/components/lesson/LessonPlayer";
import { Lapis } from "@/components/editor/Lapis";
import { ListaDeDiagramas, type Diagrama } from "@/components/editor/ListaDeDiagramas";
import { conferirAula, publicarAula, recarregarAula, salvarAula } from "@/app/editor/acoes";
import { filaDeGravacao, type Fila } from "@/lib/editor/fila";
import type { Conferencia } from "@/lib/editor/gate";
import { montarQuadros } from "@/lib/lesson/roteiro";
import { lessonSchema, type Lesson, type Position } from "@/lib/lesson/schema";

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

  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        forcarSalvamento();
      }
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [forcarSalvamento]);

  // ------------------------------------------------------- as edições

  const trocarFala = useCallback(
    (etapa: "intro" | "objective", passo: number, texto: string) => {
      editar(comFala(cru, etapa, passo, texto));
    },
    [cru, editar],
  );

  const trocarTitulo = useCallback((texto: string) => editar({ ...cru, title: texto }), [cru, editar]);

  const trocarTecnica = useCallback(
    (campo: "name" | "summary", texto: string) => editar(comTecnica(cru, campo, texto)),
    [cru, editar],
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

  return (
    <div className="flex min-h-dvh flex-col gap-3 p-3">
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

      <div className="flex flex-1 gap-4">
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
            aoEscolher={(i) => {
              setAlvo((a) => ({ ...a, passo: i }));
              setGeracao((g) => g + 1);
            }}
          />
        </aside>

        <main className="min-w-0 flex-1">
          <LessonPlayer
            // Remonta quando o diagrama-alvo muda ou quando o arquivo é
            // reescrito por fora (conferência, recarga). Digitar **não**
            // remonta: `startAt` só é lido na montagem, e um remonte por letra
            // devolveria o tabuleiro ao primeiro diagrama a cada tecla.
            key={`${aula}-${alvo.etapa}-${alvo.passo}-${geracao}`}
            bundle={{ lesson: ultimaValida, positions }}
            startAt={{ stage: alvo.etapa, passo: alvo.passo, pausado: true }}
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

/**
 * O carimbo do professor: **data, sem hora**.
 *
 * Com hora, cada salvamento mudaria os bytes do rascunho e o `git diff` de uma
 * aula tocada e destocada no mesmo dia mostraria uma linha de ruído. Com data,
 * um dia de trabalho é um carimbo só.
 *
 * O aluno não vê nada disto: o campo existe para o professor saber, meses
 * depois, que aquela fala saiu da tela e não do livro. A voz da casa é a de um
 * professor que não fala do sistema.
 */
function comCarimbo(cru: Record<string, unknown>): Record<string, unknown> {
  const hoje = new Date().toISOString().slice(0, 10);
  const atual = cru.professor as { adaptouEm?: string } | undefined;
  if (atual?.adaptouEm === hoje) return cru;
  return { ...cru, professor: { ...atual, adaptouEm: hoje } };
}

/**
 * Troca a fala de um passo, preservando a ordem das chaves.
 *
 * A propagação por espalhamento (`{...obj, campo: novo}`) mantém a posição de
 * uma chave que já existe — e é isso que faz o `git diff` da aula mostrar uma
 * linha em vez do arquivo inteiro.
 */
function comFala(
  cru: Record<string, unknown>,
  etapa: "intro" | "objective",
  passo: number,
  texto: string,
): Record<string, unknown> {
  const stages = cru.stages as Record<string, unknown>;
  if (etapa === "intro") {
    const intro = stages.intro as { passos: Array<Record<string, unknown>> };
    const passos = intro.passos.map((p, i) => (i === passo ? { ...p, fala: texto } : p));
    return { ...cru, stages: { ...stages, intro: { ...intro, passos } } };
  }
  const objective = stages.objective as { roteiro: Array<Record<string, unknown>> };
  const roteiro = objective.roteiro.map((p, i) => (i === passo ? { ...p, fala: texto } : p));
  return { ...cru, stages: { ...stages, objective: { ...objective, roteiro } } };
}

function comTecnica(
  cru: Record<string, unknown>,
  campo: "name" | "summary",
  texto: string,
): Record<string, unknown> {
  const stages = cru.stages as Record<string, unknown>;
  const objective = stages.objective as { technique: Record<string, unknown> };
  return {
    ...cru,
    stages: {
      ...stages,
      objective: { ...objective, technique: { ...objective.technique, [campo]: texto } },
    },
  };
}
