"use client";

import { Chess, type Square } from "chess.js";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as EventoDeMouse, type ReactNode, type RefObject } from "react";
import type { DrawShape } from "@lichess-org/chessground/draw";
import type { Key } from "@lichess-org/chessground/types";
import { adicionarAoAcervoV2Acao, conferirAulaV2Acao, guardarSnapshotDeRefazerV2, salvarDocumentoV2, type ResultadoDoConferirV2 } from "@/app/editor/v2/acoes";
import { ChessBoard } from "@/components/board/ChessBoard";
import { PromotionPicker, type PromotionChoice } from "@/components/board/PromotionPicker";
import { NagOverlay } from "@/components/board/NagOverlay";
import { desenhoDaAutoriaV2 } from "@/lib/chess/annotations";
import { PainelDeImportacao } from "@/components/editor-v2/PainelDeImportacao";
import { PainelDeLances } from "@/components/editor-v2/PainelDeLances";
import { DialogoConverterV1 } from "@/components/editor-v2/DialogoConverterV1";
import { DialogoPublicacoes } from "@/components/editor-v2/DialogoPublicacoes";
import { DialogoPublicar } from "@/components/editor-v2/DialogoPublicar";
import { PainelDeProblemas } from "@/components/editor-v2/PainelDeProblemas";
import { ListaDeCapitulos } from "@/components/editor-v2/ListaDeCapitulos";
import { ListaDeRevisoes } from "@/components/editor-v2/ListaDeRevisoes";
import { DialogoNovoCapitulo } from "@/components/editor-v2/DialogoNovoCapitulo";
import { DialogoTrocarPosicao } from "@/components/editor-v2/DialogoTrocarPosicao";
import { DialogoDoLance, type AcaoContextualV2 } from "@/components/editor-v2/DialogoDoLance";
import { DialogoDeCorte } from "@/components/editor-v2/DialogoDeCorte";
import { DialogoDuplicarCapitulo } from "@/components/editor-v2/DialogoDuplicarCapitulo";
import { DialogoExcluirCapitulo } from "@/components/editor-v2/DialogoExcluirCapitulo";
import { DialogoExportar } from "@/components/editor-v2/DialogoExportar";
import { DialogoCriarTreino } from "@/components/editor-v2/DialogoCriarTreino";
import { DialogoEditarTreino } from "@/components/editor-v2/DialogoEditarTreino";
import { DialogoPropriedadeTreino } from "@/components/editor-v2/DialogoPropriedadeTreino";
import { DialogoProveniencia } from "@/components/editor-v2/DialogoProveniencia";
import { DialogoPratica } from "@/components/editor-v2/DialogoPratica";
import { EditorDeIntroducao } from "@/components/editor-v2/EditorDeIntroducao";
import { PreviaDaIntroducao } from "@/components/editor-v2/PreviaDaIntroducao";
import { OrdemDaAula } from "@/components/editor-v2/OrdemDaAula";
import { DialogoMudarModo } from "@/components/editor-v2/DialogoMudarModo";
import type { ParteDaAulaV2 } from "@/lib/editor-v2/mudar-modo";
import type { ComandoDeIntroducaoV2 } from "@/lib/editor-v2/introducao";
import { planejarEstudo } from "@/lib/editor-v2/importar-estudo";
import { oQueAAulaInteiraTem } from "@/lib/editor-v2/frases";
import { ADVERSARIO_PADRAO, aplicarNovaPratica, prepararPratica } from "@/lib/editor-v2/pratica";
import type { PedidoDeImportacaoDeEstudo } from "@/components/editor-v2/PainelDoEstudo";
import { PreviaDaPratica } from "@/components/editor-v2/PreviaDaPratica";
import type { ObraDoRegistro } from "@/lib/editor-v2/acervo-em-disco";
import type { PraticaV2 } from "@/lib/editor-v2/modelo";
import { estadoDaProveniencia } from "@/lib/editor-v2/proveniencia";
import type { PosicaoDoAcervoV2 } from "@/lib/editor-v2/acervo";
import { PaletaDeDesenho } from "@/components/editor-v2/PaletaDeDesenho";
import { BarraDeAvaliacao } from "@/components/motor-do-professor/BarraDeAvaliacao";
import { FaixaDoMotor } from "@/components/motor-do-professor/FaixaDoMotor";
import { LinhasDoMotor } from "@/components/motor-do-professor/LinhasDoMotor";
import { useControlesDoMotor } from "@/components/motor-do-professor/useControlesDoMotor";
import { Dialogo } from "@/components/editor-v2/Dialogo";
import { Menu, type ItemDeMenu } from "@/components/editor-v2/Menu";
import { AulaComoAluno } from "@/components/editor-v2/AulaComoAluno";
import { formatarDuracao } from "@/lib/editor-v2/aula-como-aluno";
import { Previa } from "@/components/editor-v2/Previa";
import { PreviaDoTreino } from "@/components/editor-v2/PreviaDoTreino";
import type { Regua } from "@/lib/lesson/regua";
import {
  podePreverDaqui,
  previaDaAula,
  previaDoCapitulo,
  type Previa as PreviaV2,
} from "@/lib/editor-v2/previa";
import { legalDests, toBoardColor } from "@/lib/chess/dests";
import { analiseDaAula, mapaDaAnalise } from "@/lib/editor-v2/arvore";
import { desenhoDeFormas } from "@/lib/editor-v2/desenhos";
import {
  cliqueNaCasa,
  desistirDaSeta,
  escolherCor,
  escolherFerramenta,
  ESTADO_INICIAL_DA_PALETA,
  type EstadoDaPaleta,
} from "@/lib/editor-v2/paleta-de-desenho";
import { navegar } from "@/lib/editor-v2/navegacao";
import { useAbrirAjudaDosAtalhos, useAtalho, VistaDoTabuleiro } from "@/components/atalhos/Atalhos";
import { problemasVisiveisV2, resumoDosProblemasV2, type DestinoV2 } from "@/lib/editor-v2/diagnostico-visual";
import {
  aplicarNoHistorico,
  desfazer,
  executarComando,
  iniciarHistorico,
  refazer,
  type ComandoV2,
  type Historico,
} from "@/lib/editor-v2/comandos";
import type { RelatorioImportacao } from "@/lib/editor-v2/importar-pgn";
import type { NovoCapituloV2 } from "@/lib/editor-v2/novo-capitulo";
import type { AlvoDeRevisaoV2, PlanoDaTrocaV2 } from "@/lib/editor-v2/trocar-posicao";
import type { CapituloDuplicadoV2, PlanoDeExclusaoV2 } from "@/lib/editor-v2/capitulo";
import { orientacaoDaFen } from "@/lib/editor-v2/acoes-do-lance";
import type {
  AcaoDoLanceV2,
  ComecoDaquiV2,
  DuplicataIndependenteV2,
  PlanoDoCorteV2,
  TipoDeCorteV2,
  VarianteMostradaV2,
} from "@/lib/editor-v2/acoes-do-lance";
import type { ResolucoesV2 } from "@/lib/editor-v2/impacto";
import { novoIdDeNarracao, podeNarrar } from "@/lib/editor-v2/narracoes";
import type { TreinosPreparadosV2 } from "@/lib/editor-v2/treinos";
import { treinoJogavel, type TreinoJogavel } from "@/lib/editor-v2/treino-jogavel";
import type { PlanoDeRefazerTreinoV2 } from "@/lib/editor-v2/propriedade-treino";
import { revisoesPendentesV2 } from "@/lib/editor-v2/revisoes";
import { FEN_INICIAL_PADRAO, problemasDaAulaV2, resultadoDoTreinoV2, validarAulaV2, type AnaliseV2, type AulaV2, type ProblemaV2 } from "@/lib/editor-v2/modelo";
import { apagarRecuperacao, guardarRecuperacao, lerRecuperacao } from "@/lib/editor-v2/recuperacao";
import type { Position } from "@/lib/lesson/schema";

type Estado = "salvo" | "alterado" | "salvando" | "erro" | "conflito";
const SIMBOLOS_DE_QUALIDADE: Record<number, string> = { 1: "!", 2: "?", 3: "!!", 4: "??", 5: "!?", 6: "?!" };

const SEM_ACERVO: PosicaoDoAcervoV2[] = [];
const SEM_OBRAS: ObraDoRegistro[] = [];

function novoId(): string {
  return `n-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * A árvore de faz de conta da aula sem capítulo nenhum — §5.2.
 *
 * ## Por que um bolo de isopor, e não um `if` em cada linha
 *
 * Uma aula recém-criada não tem análise, e os ganchos do React não podem ser
 * condicionais: tudo o que é calculado aqui dentro — o mapa da partida, o
 * desenho selecionado, a posição do tabuleiro — roda **antes** de a tela decidir
 * o que desenhar. Espalhar `analise?.` por vinte expressões tornaria cada uma
 * delas ambígua ("isto pode ser nulo por quê?") para atender a um caso em que
 * nenhuma delas vai à tela.
 *
 * Este objeto é uma análise vazia e válida: os ganchos calculam sobre ele sem
 * estourar, e a tela devolve a porta da aula vazia antes de desenhar qualquer
 * coisa que dependa dele. Nada daqui chega ao documento — ele não é gravado nem
 * mostrado.
 */
const ANALISE_DE_FAZ_DE_CONTA: AnaliseV2 = {
  id: "",
  inicio: { tipo: "fen", fen: FEN_INICIAL_PADRAO },
  raizId: "no-vazio",
  nos: { "no-vazio": { id: "no-vazio", filhos: [] } },
};

/** A lista que a tela mostra nasce do fluxo; `capitulos` é só o cadastro. */
function capitulosNaOrdemDaAula(aula: AulaV2): AulaV2["capitulos"] {
  const porId = new Map(aula.capitulos.map((item) => [item.id, item]));
  return aula.fluxo.flatMap((etapa) => {
    if (etapa.tipo !== "capitulo") return [];
    const item = porId.get(etapa.entidadeId);
    return item ? [item] : [];
  });
}

/** Os treinos também são lidos do fluxo; o cadastro não ganha uma segunda ordem. */
function treinosNaOrdemDaAula(aula: AulaV2): AulaV2["treinos"] {
  const porId = new Map(aula.treinos.map((item) => [item.id, item]));
  return aula.fluxo.flatMap((etapa) => {
    if (etapa.tipo !== "treino") return [];
    const item = porId.get(etapa.entidadeId);
    return item ? [item] : [];
  });
}

export function EditorV2({ aulaId, documentoInicial, hashInicial, positions: posicoesDaAula, problemasDaOrigem = [], regua, professor = "professor", acervo = SEM_ACERVO, obras = SEM_OBRAS }: {
  aulaId: string;
  documentoInicial: AulaV2;
  hashInicial: string;
  positions: Record<string, Position>;
  /** A régua de voz, lida do documento pelo servidor (o navegador não lê disco). */
  regua?: Regua;
  /**
   * As conferências que só o servidor pode fazer — proveniência e certificação, que
   * comparam hashes. Elas não mudam enquanto o professor escreve: descrevem o arquivo
   * da posição, não o texto dele. Chegam prontas e se juntam às que a tela recalcula.
   */
  problemasDaOrigem?: ProblemaV2[];
  /** O nome de quem está editando: vai para a revisão de proveniência (§19.1). */
  professor?: string;
  /** Fatia 10: o acervo de `content/positions/`, para as portas que escolhem posição do curso. */
  acervo?: PosicaoDoAcervoV2[];
  /** As obras de `content/sources.json`, para "Adicionar ao acervo" (§17.1). */
  obras?: ObraDoRegistro[];
}) {
  /** O acervo cresce na sessão quando a prática adiciona uma posição nova. */
  const [acervoDaSessao, setAcervoDaSessao] = useState(acervo);
  /*
   * As posições que a tela conhece: as que a aula já usa e as do acervo. Sem as do acervo, um
   * capítulo recém-criado a partir dele acusaria "a posição não está no pacote" até o reload.
   */
  const positions = useMemo(
    () => ({ ...Object.fromEntries(acervoDaSessao.map((item) => [item.position.id, item.position])), ...posicoesDaAula }),
    [acervoDaSessao, posicoesDaAula],
  );
  const [historico, setHistorico] = useState<Historico<AulaV2>>(() => iniciarHistorico(documentoInicial));
  const [capituloId, setCapituloId] = useState(() => capitulosNaOrdemDaAula(documentoInicial)[0]?.id ?? "");
  const capitulosOrdenados = useMemo(() => capitulosNaOrdemDaAula(historico.presente), [historico.presente]);
  const treinosOrdenados = useMemo(() => treinosNaOrdemDaAula(historico.presente), [historico.presente]);
  const capitulo = capitulosOrdenados.find((item) => item.id === capituloId) ?? capitulosOrdenados[0];
  const analiseDoCapitulo = capitulo ? analiseDaAula(historico.presente, capitulo.analiseId) : historico.presente.analises[0];
  /** Ver `ANALISE_DE_FAZ_DE_CONTA`: a aula sem capítulo ainda precisa renderizar. */
  const analise = analiseDoCapitulo ?? ANALISE_DE_FAZ_DE_CONTA;
  const [nodeId, setNodeId] = useState(() => capitulo?.inicioNodeId ?? analise.raizId);
  const [estado, setEstado] = useState<Estado>("salvo");
  const [recado, setRecado] = useState<string | null>(null);
  const [recuperavel, setRecuperavel] = useState<{ aula: AulaV2; baseHash: string; em: string } | null>(null);
  const [conflitoAtual, setConflitoAtual] = useState<{ textoAtual: string | null; hashAtual: string | null } | null>(null);
  const [falhaRecuperacao, setFalhaRecuperacao] = useState(false);
  const [importando, setImportando] = useState(false);
  const [importacaoInicial, setImportacaoInicial] = useState<{ texto: string; nome: string | null } | null>(null);
  const [adicionando, setAdicionando] = useState(false);
  const [trocandoPosicao, setTrocandoPosicao] = useState(false);
  /*
   * As janelas desta rodada. Cada uma guarda o **alvo** dela, e não só um
   * booleano: o diálogo de excluir precisa saber qual capítulo, o do lance
   * precisa saber qual lance e qual das três ações. Um booleano por janela mais
   * um "alvo" compartilhado seria a mesma informação em dois lugares, e os dois
   * discordariam no dia em que uma fechasse sem limpar o outro.
   */
  const [duplicandoCapitulo, setDuplicandoCapitulo] = useState<string | null>(null);
  const [excluindoCapitulo, setExcluindoCapitulo] = useState<string | null>(null);
  const [acaoDoLance, setAcaoDoLance] = useState<{ acao: AcaoContextualV2; nodeId: string } | null>(null);
  const [cortando, setCortando] = useState<{ tipo: TipoDeCorteV2; nodeId: string; lance: string } | null>(null);
  const [exportando, setExportando] = useState(false);
  const [criandoTreino, setCriandoTreino] = useState<string | null>(null);
  const [editandoTreino, setEditandoTreino] = useState<string | null>(null);
  const [propriedadeTreino, setPropriedadeTreino] = useState<string | null>(null);
  /** §19.1 (fatia 10): a janela "De onde veio esta posição?", aberta para qual análise. */
  const [revisandoProveniencia, setRevisandoProveniencia] = useState<string | null>(null);
  /** §17.1 (fatia 10): a janela da prática ("nova" ou o id) e a prática sendo jogada na prévia. */
  const [editandoPratica, setEditandoPratica] = useState<string | null>(null);
  const [jogandoPratica, setJogandoPratica] = useState<PraticaV2 | null>(null);
  /** §7.1 e §18 (fatia 10): o editor da introdução (id `null` = criar), a prévia dela e a ordem da aula. */
  const [editandoIntroducao, setEditandoIntroducao] = useState<{ id: string | null; quadro?: string } | null>(null);
  const [previaDaIntroducao, setPreviaDaIntroducao] = useState<string | null>(null);
  const [vendoOrdem, setVendoOrdem] = useState(false);
  /** "Mudar para…" (pedido do Doug, 15/9/2026): a parte cujo modo muda — capítulo, treino ou quadro. */
  const [mudandoModo, setMudandoModo] = useState<ParteDaAulaV2 | null>(null);
  const [salvandoSnapshot, setSalvandoSnapshot] = useState(false);
  /**
   * A prévia (§15), em dois estados: a escolha do escopo, e a prévia rodando.
   *
   * A prévia rodando guarda o **cálculo**, e não o pedido: ela é um retrato do
   * documento no instante em que abriu, e é isso que a isola da autoria. Guardar só
   * "qual capítulo" a faria recalcular a cada tecla digitada atrás dela.
   */
  const [escolhendoPrevia, setEscolhendoPrevia] = useState(false);
  const [previa, setPrevia] = useState<PreviaV2 | null>(null);
  /** §16.4: o treino sendo jogado na prévia, traduzido no clique — ou por que não deu. */
  const [jogandoTreino, setJogandoTreino] = useState<
    { treinoId: string; titulo: string; perfil: "final-certificado" | "linha-autoral"; jogavel: TreinoJogavel | null; erro?: string } | null
  >(null);
  /**
   * A caixa da narração nova, aberta em qual lance de qual capítulo.
   *
   * É estado da sessão, não do documento: narração vazia não é válida (o schema pede
   * texto), então ela só nasce quando a caixa perde o foco com algo escrito. Trocar de
   * lance deixa de casar a chave, e a caixa some sem precisar de efeito.
   */
  const [escrevendoNarracao, setEscrevendoNarracao] = useState<string | null>(null);
  /**
   * §19.3: o último Conferir, e **qual documento** ele julgou.
   *
   * Guardar a referência do documento é o que apaga o veredito no primeiro lápis: qualquer
   * edição cria outro objeto, e a tela passa a dizer "a aula mudou depois disso". O servidor
   * confere de novo antes de publicar; isto só impede a tela de prometer o que não vale.
   */
  const [conferencia, setConferencia] = useState<{ resultado: Extract<ResultadoDoConferirV2, { ok: true }>; aula: AulaV2 } | null>(null);
  const [conferindo, setConferindo] = useState(false);
  const [publicandoAula, setPublicandoAula] = useState(false);
  /*
   * "Fazer a aula inteira como aluno" (pedido do Doug, 14/9/2026). `aulaFeita` guarda o documento que
   * ele fez — pela referência, como a conferência — para Publicar não perguntar de novo pela mesma versão.
   */
  const [fazendoComoAluno, setFazendoComoAluno] = useState(false);
  const [perguntandoAntesDePublicar, setPerguntandoAntesDePublicar] = useState(false);
  const [aulaFeita, setAulaFeita] = useState<{ aula: AulaV2; totalMs: number; em: Date; concluida: boolean } | null>(null);
  const [convertendoV1, setConvertendoV1] = useState(false);
  const [vendoPublicacoes, setVendoPublicacoes] = useState(false);
  const [publicada, setPublicada] = useState<string | null>(null);
  const botaoPublicar = useRef<HTMLButtonElement>(null);
  const botaoMaisAcoes = useRef<HTMLButtonElement>(null);
  /** Cresce a cada navegação por teclado; é o sinal para o foco seguir a seta (§16). */
  const [pedidoDeFoco, setPedidoDeFoco] = useState(0);
  const botaoImportar = useRef<HTMLButtonElement>(null);
  const botaoAdicionar = useRef<HTMLButtonElement>(null);
  const botaoTrocarPosicao = useRef<HTMLButtonElement>(null);
  const botaoPrevia = useRef<HTMLButtonElement>(null);
  const [sessaoId, setSessaoId] = useState<string | null>(null);
  const hash = useRef(hashInicial);
  const ultimoEnfileirado = useRef(documentoInicial);
  const fila = useRef(Promise.resolve());
  const maisRecente = useRef(documentoInicial);
  /** Liga a gravação imediata do próximo comando (a importação; ver o efeito do autossalvamento). */
  const gravarSemEspera = useRef(false);

  useEffect(() => {
    const chave = `editor-v2-sessao:${aulaId}`;
    let id = sessionStorage.getItem(chave);
    if (!id) { id = crypto.randomUUID(); sessionStorage.setItem(chave, id); }
    let ativo = true;
    queueMicrotask(() => { if (ativo) setSessaoId(id); });
    return () => { ativo = false; };
  }, [aulaId]);

  useEffect(() => {
    if (!sessaoId) return;
    void lerRecuperacao(aulaId, sessaoId).then((r) => {
      if (r && JSON.stringify(r.aula) !== JSON.stringify(documentoInicial)) setRecuperavel(r);
    }).catch(() => undefined);
  }, [aulaId, documentoInicial, sessaoId]);

  const aplicar = useCallback((comando: ComandoV2) => {
    setHistorico((atual) => {
      try {
        const proximo = executarComando(atual.presente, comando, positions);
        setRecado(null);
        return aplicarNoHistorico(atual, proximo);
      } catch (erro) {
        setRecado(erro instanceof Error ? erro.message : "não foi possível fazer esta edição");
        return atual;
      }
    });
  }, [positions]);

  useEffect(() => {
    if (ultimoEnfileirado.current === historico.presente) return;
    // A espera de 600 ms serve para a digitação. Depois de uma importação — muito conteúdo de uma vez,
    // e o professor costuma recarregar para ver o resultado — a gravação sai na hora: recarregar antes
    // dela perdia tudo, sem disco e sem recuperação (15/9/2026).
    const espera = gravarSemEspera.current ? 0 : 600;
    gravarSemEspera.current = false;
    ultimoEnfileirado.current = historico.presente;
    setEstado("alterado");
    const aula = historico.presente;
    maisRecente.current = aula;
    const baseHash = hash.current;
    if (!sessaoId) return;
    void guardarRecuperacao(aulaId, sessaoId, aula, baseHash)
      .then(() => setFalhaRecuperacao(false))
      .catch(() => setFalhaRecuperacao(true));
    const relogio = setTimeout(() => {
      fila.current = fila.current.then(async () => {
        setEstado("salvando");
        const resposta = await salvarDocumentoV2(aulaId, JSON.stringify(aula), hash.current);
        if (resposta.ok) {
          hash.current = resposta.hash;
          if (maisRecente.current === aula) {
            setEstado("salvo");
            setRecado(null);
            setConflitoAtual(null);
            await apagarRecuperacao(aulaId, sessaoId).catch(() => undefined);
          }
        } else if ("conflito" in resposta && resposta.conflito) {
          setEstado("conflito");
          setConflitoAtual(resposta.conflito);
          setRecado(null);
        } else {
          setEstado("erro");
          setRecado(resposta.erro);
        }
      }).catch(() => {
        setEstado("erro");
        setRecado("Não foi possível salvar. Suas mudanças continuam guardadas neste navegador.");
      });
    }, espera);
    return () => clearTimeout(relogio);
  }, [aulaId, historico.presente, sessaoId]);

  // Fatia 10: Ctrl+Z e Ctrl+Y pela tabela de atalhos (`lib/atalhos/tabela.ts`). Dentro de campo de
  // texto o registro deixa o desfazer nativo do texto agir (§6.1).
  useAtalho("desfazer", () => { setHistorico(desfazer); }, { emTodasAsCamadas: true });
  useAtalho("refazer", () => { setHistorico(refazer); }, { emTodasAsCamadas: true });

  /*
   * ## O teclado anda na árvore (§16)
   *
   * O atendedor é registrado **uma vez**, e não a cada lance selecionado: reinstalar o
   * ouvinte a cada tecla é o caminho curto para perder uma. Por isso a árvore e o
   * estado da janela de importação chegam por uma caixinha (`useRef`) que o React
   * atualiza depois de cada desenho, e o nó atual vem da própria `setNodeId`.
   *
   * `preventDefault` é obrigatório: sem ele a seta rola a página junto, e o professor
   * vê o tabuleiro subir enquanto tenta só avançar um lance.
   */
  const janelaAberta = importando || adicionando || trocandoPosicao || exportando
    || escolhendoPrevia || previa !== null
    || criandoTreino !== null || editandoTreino !== null || propriedadeTreino !== null || jogandoTreino !== null
    || duplicandoCapitulo !== null || excluindoCapitulo !== null || acaoDoLance !== null || cortando !== null
    || publicandoAula || vendoPublicacoes || convertendoV1 || revisandoProveniencia !== null || editandoPratica !== null || jogandoPratica !== null
    || editandoIntroducao !== null || previaDaIntroducao !== null || vendoOrdem || mudandoModo !== null
    || fazendoComoAluno || perguntandoAntesDePublicar;
  const estadoDoTeclado = useRef({ analise, janelaAberta });
  useEffect(() => { estadoDoTeclado.current = { analise, janelaAberta }; });

  const andarNaArvore = useCallback((acao: "anterior" | "proximo" | "acima" | "abaixo" | "inicio" | "fim") => {
    const { analise: arvore, janelaAberta: aberta } = estadoDoTeclado.current;
    if (aberta) return false;
    setNodeId((atual) => navegar(arvore, atual, acao));
    setPedidoDeFoco((pedido) => pedido + 1);
  }, []);
  useAtalho("lance-anterior", () => andarNaArvore("anterior"));
  useAtalho("lance-seguinte", () => andarNaArvore("proximo"));
  useAtalho("item-acima", () => andarNaArvore("acima"));
  useAtalho("item-abaixo", () => andarNaArvore("abaixo"));
  useAtalho("primeiro-lance", () => andarNaArvore("inicio"));
  useAtalho("ultimo-lance", () => andarNaArvore("fim"));

  const nodeIdAtual = analise.nos[nodeId] ? nodeId : capitulo?.inicioNodeId ?? analise.raizId;

  /*
   * Os problemas da aula que está na tela **agora**, e não os do arquivo no disco.
   * É esta a lista que o professor vê enquanto escreve: um erro que só aparecesse
   * ao salvar chegaria depois de ele já ter esquecido o que fez.
   */
  const problemas = useMemo(
    () => [...problemasDaAulaV2(historico.presente, positions), ...problemasDaOrigem],
    [historico.presente, positions, problemasDaOrigem],
  );
  const visiveis = useMemo(() => problemasVisiveisV2(historico.presente, problemas), [historico.presente, problemas]);
  const resumo = useMemo(() => resumoDosProblemasV2(problemas), [problemas]);

  /*
   * ## Por que isto é um `try`
   *
   * Reconstruir a posição de um nó exige jogar os lances desde a raiz, e um lance
   * impossível faz a chess.js estourar. Sem este `try`, a exceção sobe e **apaga a
   * tela inteira** — o professor recebe uma página em branco no exato momento em que
   * mais precisa de um dedo apontando para o lance errado.
   *
   * Com ele, a tela deixa de desenhar o tabuleiro (que de fato não existe) e mostra a
   * lista de problemas no lugar, com o botão que leva ao lance. O documento continua
   * intacto: nada aqui corrige nada sozinho.
   */
  /*
   * ## E por que é UMA passada, e não três
   *
   * Antes eram três percursos independentes — posição do nó, SAN de todos, numeração
   * de todos — e cada um rejogava a partida desde a raiz por nó. Numa partida de 60
   * lances (121 nós) isso media **758 ms** por recálculo, contra **24 ms** agora —
   * medido em Node, sem o relógio do navegador no meio. `mapaDaAnalise` faz os três
   * numa descida só, com um tabuleiro e `undo`.
   *
   * As dependências também mudaram: o mapa **não depende do nó selecionado**, então
   * trocar de lance na lista não recalcula a árvore — só lê `quadros[nodeIdAtual]`.
   */
  const mapa = useMemo(() => {
    try {
      return mapaDaAnalise(historico.presente, analise.id, positions);
    } catch {
      return null;
    }
  }, [analise.id, historico.presente, positions]);

  /**
   * O nome do lance como o painel o escreve — `12… Rd6` —, para as janelas.
   *
   * A raiz não tem lance: ela é "a posição inicial", e é assim que a janela a
   * chama. Chamá-la de `no-…-0` seria mostrar ao professor um id interno, que
   * §4 da especificação proíbe.
   */
  const nomeDoLance = (id: string): string => {
    const san = mapa?.sans[id];
    if (!san) return "a posição inicial";
    const rotulo = mapa?.rotulos[id];
    return rotulo ? `${rotulo} ${san}` : san;
  };

  /** De quem é a vez naquela posição: é o lado que o capítulo novo mostra. */
  const orientacaoDoLance = (id: string): "white" | "black" =>
    orientacaoDaFen(mapa?.quadros[id]?.fen ?? "");

  const derivado = mapa && mapa.quadros[nodeIdAtual]
    ? { quadro: mapa.quadros[nodeIdAtual], sans: mapa.sans, rotulos: mapa.rotulos }
    : null;

  const jogo = useMemo(() => new Chess(derivado?.quadro.fen), [derivado?.quadro.fen]);
  /*
   * O motor do professor (fatia 9, §23.1). Pausa com qualquer janela aberta — a prévia
   * inclusa, que roda o player do aluno e não pode disputar processador com a análise — e a
   * tecla L obedece à mesma guarda. Sem posição montável, a FEN vazia não analisa nada.
   */
  const motor = useControlesDoMotor(derivado?.quadro.fen ?? "", { pausado: janelaAberta });
  const selecionado = analise.nos[nodeIdAtual];
  /**
   * As setas e casas acesas do lance selecionado, nas cores que o professor escolheu.
   *
   * Entram pelo canal `desenhavel` — o de quem desenha com o mouse —, e não mais pelo
   * `shapes`, que é o dos desenhos automáticos do motor. Agora é o mesmo canal nos dois
   * sentidos: o que o arquivo guarda aparece ali, e o que o professor desenha ali volta
   * para o arquivo. Fossem dois canais, um traço apagado com o botão direito
   * continuaria na tela pelo outro.
   */
  /*
   * Memorizado de propósito: a lista é reconstruída a cada render, e o `ChessBoard`
   * reescreve as formas do tabuleiro sempre que a **identidade** dela muda. Sem o
   * `useMemo`, cada tecla digitada no comentário mandaria o tabuleiro redesenhar o
   * desenho inteiro — e redesenho no meio de um traço é traço perdido.
   */
  const desenhos = useMemo(() => desenhoDaAutoriaV2(selecionado.desenhos), [selecionado.desenhos]);
  const qualidadeSelecionada = selecionado.nags?.find((nag) => SIMBOLOS_DE_QUALIDADE[nag]);

  /**
   * O professor acabou de desenhar (ou apagar) alguma coisa nesta posição.
   *
   * O tabuleiro devolve o conjunto inteiro de formas depois de cada gesto; a tradução
   * para as quatro cores do arquivo está em `desenhos.ts`, e o comando cuida de não
   * gravar gesto sem efeito. `useCallback` porque a função desce até o chessground.
   */
  const aoDesenhar = useCallback((formas: DrawShape[]) => {
    aplicar({
      tipo: "DEFINIR_DESENHOS",
      analiseId: analise.id,
      nodeId: nodeIdAtual,
      desenhos: desenhoDeFormas(formas),
    });
  }, [analise.id, aplicar, nodeIdAtual]);

  const desenhavel = useMemo(() => ({ shapes: desenhos, onChange: aoDesenhar }), [desenhos, aoDesenhar]);

  /**
   * A paleta clicável de desenho (§10.2 e §25).
   *
   * O estado é da sessão, não do documento: qual ferramenta está na mão não é conteúdo
   * da aula, e por isso não entra no autosave nem no Desfazer. O que entra no Desfazer
   * é o traço, pelo mesmo comando do botão direito.
   */
  const [paletaGuardada, setPaleta] = useState({ estado: ESTADO_INICIAL_DA_PALETA, no: "" });
  /**
   * Uma seta pela metade pertence ao lance em que começou.
   *
   * O lance de origem viaja junto do estado, e a seta pendurada é **derivada**: trocar
   * de lance a esquece sem custar um efeito que chama `setState` — que é cascata de
   * render, e o lint do projeto recusa com razão.
   */
  const paleta = paletaGuardada.no === nodeIdAtual ? paletaGuardada.estado : desistirDaSeta(paletaGuardada.estado);
  const desenhando = paleta.ferramenta !== "mover";
  const mudarPaleta = useCallback((muda: (atual: EstadoDaPaleta) => EstadoDaPaleta) => {
    setPaleta((guardada) => ({
      estado: muda(guardada.no === nodeIdAtual ? guardada.estado : desistirDaSeta(guardada.estado)),
      no: nodeIdAtual,
    }));
  }, [nodeIdAtual]);

  const aoClicarNaCasa = useCallback((casa: string) => {
    const efeito = cliqueNaCasa(paleta, desenhos, casa);
    setPaleta({ estado: efeito.estado, no: nodeIdAtual });
    if (efeito.formas) {
      aplicar({
        tipo: "DEFINIR_DESENHOS",
        analiseId: analise.id,
        nodeId: nodeIdAtual,
        desenhos: desenhoDeFormas(efeito.formas),
      });
    }
  }, [analise.id, aplicar, desenhos, nodeIdAtual, paleta]);

  /**
   * Esc sai do desenho por degraus: primeiro esquece a seta pela metade, depois devolve
   * o tabuleiro ao movimento de peça. Um modo em que não se sabe sair é uma armadilha,
   * e a tecla de escapar é a que todo mundo já tenta.
   */
  useAtalho("sair-do-desenho", () => {
    if (estadoDoTeclado.current.janelaAberta) return false;
    setPaleta((guardada) => {
      const atual = guardada.estado;
      if (atual.ferramenta === "mover") return guardada;
      const estado = atual.origem ? desistirDaSeta(atual) : escolherFerramenta(atual, atual.ferramenta);
      return { ...guardada, estado };
    });
  });
  const narracoes = capitulo?.narracoes.filter((n) => n.nodeId === selecionado?.id) ?? [];

  /**
   * Fecha a janela de importação e devolve o foco ao botão que a abriu (§16).
   *
   * Sem isto, quem navega por teclado volta ao começo da página toda vez que fecha —
   * e precisa atravessar o cabeçalho inteiro para chegar de novo onde estava.
   */
  /*
   * "Nova aula → Importar do Lichess ou de um PGN" (pedido do Doug, 14/9/2026): o formulário já buscou
   * ou leu o PGN e o deixou nesta aba, com a chave da aula. A janela de importar abre sozinha com ele
   * lido, uma vez só — a chave é apagada ao ler, e recarregar a página não reabre a janela.
   */
  useEffect(() => {
    const chave = `editor-v2-importar-ao-abrir:${aulaId}`;
    let lido: { texto: string; nome: string | null } | null = null;
    try {
      const cru = JSON.parse(sessionStorage.getItem(chave) ?? "null") as { texto?: unknown; nome?: unknown } | null;
      if (cru && typeof cru.texto === "string" && cru.texto !== "") lido = { texto: cru.texto, nome: typeof cru.nome === "string" ? cru.nome : null };
    } catch { /* guardado quebrado ou armazenamento bloqueado: a aula abre vazia, e o botão Importar PGN continua ali */ }
    if (!lido) return;
    // A chave só é apagada quando a janela de fato abre: o modo estrito do React monta, desmonta e
    // monta de novo, e apagar na primeira montagem deixaria a segunda sem o PGN.
    let ativo = true;
    queueMicrotask(() => {
      if (!ativo) return;
      try { sessionStorage.removeItem(chave); } catch { /* sem armazenamento, nada a apagar */ }
      setImportacaoInicial(lido);
      setImportando(true);
    });
    return () => { ativo = false; };
  }, [aulaId]);

  const fecharImportacao = useCallback(() => {
    setImportando(false);
    setImportacaoInicial(null);
    (botaoImportar.current ?? botaoMaisAcoes.current)?.focus();
  }, []);

  /**
   * Fatia 10 (§13): o estudo do Lichess com os modos. A prática, se houver, entra no acervo pelo
   * servidor **antes** do comando; o resto é um comando só, com um Desfazer.
   */
  const importarEstudo = useCallback(async (pedido: PedidoDeImportacaoDeEstudo): Promise<string | null> => {
    const documento = historico.presente;
    gravarSemEspera.current = true;
    const plano = planejarEstudo(documento, pedido.leitura, { destinos: pedido.destinos, revisao: pedido.revisao }, positions);
    if (!plano.ok) return plano.mensagem;
    // Várias práticas desde 15/9/2026 (trava 9): cada posição entra no acervo, com o resultado que o
    // professor declarou para ela, e os ids são decididos em sequência para duas não colidirem.
    const praticas: AulaV2["praticas"] = [];
    const registros: AulaV2["proveniencia"] = [];
    let posicoes = positions;
    let comAsAnteriores = documento;
    for (const doEstudo of plano.plano.praticas) {
      const { fen, titulo, lado, numero } = doEstudo;
      const resposta = await adicionarAoAcervoV2Acao(JSON.stringify({ aulaId, fen, revisao: { ...pedido.revisao, fenRevisada: fen }, obra: pedido.obraDaPratica, resultadoDeclarado: pedido.resultadosDasPraticas[numero], etiqueta: titulo }));
      if (resposta.ok && resposta.avisos.length) plano.plano.avisos.push(...resposta.avisos);
      if (!resposta.ok) return `a prática «${titulo}» não entrou: ${resposta.mensagem}`;
      setAcervoDaSessao((atual) => atual.some((item) => item.position.id === resposta.item.position.id) ? atual : [...atual, resposta.item]);
      posicoes = { ...posicoes, [resposta.item.position.id]: resposta.item.position };
      const registro = { positionId: resposta.item.position.id, conteudoHash: resposta.item.conteudoHash, estado: resposta.item.position.status };
      const objetivo = resposta.item.position.expectedResult === "draw" ? "draw" : "win";
      const preparo = prepararPratica(comAsAnteriores, { titulo, positionId: resposta.item.position.id, ladoAluno: lado, objetivo, ...ADVERSARIO_PADRAO }, posicoes, registro);
      if (!preparo.ok) return `a prática «${titulo}» não entrou: ${preparo.mensagem}`;
      praticas.push(preparo.preparo.pratica);
      registros.push(registro);
      comAsAnteriores = aplicarNovaPratica(comAsAnteriores, preparo.preparo);
    }
    try {
      executarComando(documento, { tipo: "IMPORTAR_ESTUDO", plano: plano.plano, praticas, registrosDasPraticas: registros }, posicoes);
    } catch (erro) {
      return erro instanceof Error ? erro.message : "não foi possível importar o estudo";
    }
    aplicar({ tipo: "IMPORTAR_ESTUDO", plano: plano.plano, praticas, registrosDasPraticas: registros });
    const primeiro = plano.plano.capitulos[0];
    if (primeiro) { setCapituloId(primeiro.id); setNodeId(primeiro.inicioNodeId); }
    if (plano.plano.avisos.length) setRecado(`Estudo importado. Para revisar: ${plano.plano.avisos.join("; ")}.`);
    fecharImportacao();
    return null;
  }, [aplicar, aulaId, fecharImportacao, historico.presente, positions]);

  /**
   * Aplica a importação e leva a tela ao primeiro capítulo que entrou.
   *
   * Importar e continuar olhando para o capítulo antigo faria o professor duvidar de
   * que alguma coisa aconteceu. O primeiro capítulo novo é a resposta visível.
   */
  const importar = useCallback((relatorio: RelatorioImportacao, escolhidos: number[]): string | null => {
    gravarSemEspera.current = true;
    const primeiro = relatorio.jogos.find((jogo) => escolhidos.includes(jogo.numero) && jogo.capitulo);
    // Confere antes de aplicar: a recusa volta para a janela, que fica aberta com o texto do professor
    // (§8.3). Antes a janela fechava e o recado aparecia atrás dela, com o PGN colado perdido (15/9/2026).
    try {
      executarComando(historico.presente, { tipo: "IMPORTAR_JOGOS", relatorio, escolhidos }, positions);
    } catch (erro) {
      return erro instanceof Error ? erro.message : "não foi possível importar";
    }
    aplicar({ tipo: "IMPORTAR_JOGOS", relatorio, escolhidos });
    if (primeiro?.capitulo) {
      setCapituloId(primeiro.capitulo.id);
      setNodeId(primeiro.capitulo.inicioNodeId);
    }
    fecharImportacao();
    return null;
  }, [aplicar, fecharImportacao, historico.presente, positions]);

  /**
   * §15.1: a prévia abre com o documento **de agora**, calculado uma vez.
   *
   * O cálculo acontece aqui, e não dentro da prévia, por causa do isolamento que §15.1
   * pede: o que a prévia recebe é um retrato. Editar atrás dela — o que não dá, porque
   * ela toma a tela — não mudaria o que está tocando.
   */
  const daquiDisponivel = Boolean(capitulo && podePreverDaqui(capitulo, nodeIdAtual));
  const abrirPrevia = useCallback((escopo: "aula" | "capitulo" | "daqui") => {
    const documento = historico.presente;
    setPrevia(
      escopo === "aula" || !capitulo
        ? previaDaAula(documento, positions)
        : previaDoCapitulo(documento, positions, capitulo.id, escopo === "daqui" ? nodeIdAtual : undefined),
    );
    setEscolhendoPrevia(false);
  }, [capitulo, historico.presente, nodeIdAtual, positions]);

  /** Fechar devolve o foco ao botão que abriu (§15.1 e §25). */
  const fecharPrevia = useCallback(() => {
    setPrevia(null);
    botaoPrevia.current?.focus();
  }, []);

  const fecharPropriedade = useCallback(() => {
    const alvo = propriedadeTreino;
    setPropriedadeTreino(null);
    requestAnimationFrame(() => document.querySelector<HTMLButtonElement>(`[data-propriedade-treino-id="${alvo}"]`)?.focus());
  }, [propriedadeTreino]);

  const refazerTreinoDaAula = useCallback(async (plano: PlanoDeRefazerTreinoV2) => {
    setSalvandoSnapshot(true);
    const resposta = await guardarSnapshotDeRefazerV2(aulaId, JSON.stringify(historico.presente), plano.treinoId);
    setSalvandoSnapshot(false);
    if (!resposta.ok) {
      setRecado(resposta.erro);
      return;
    }
    aplicar({ tipo: "REFAZER_TREINO", plano });
    fecharPropriedade();
  }, [aplicar, aulaId, fecharPropriedade, historico.presente]);
  const fecharEscolhaDaPrevia = useCallback(() => {
    setEscolhendoPrevia(false);
    botaoPrevia.current?.focus();
  }, []);

  const fecharAdicionar = useCallback(() => {
    setAdicionando(false);
    botaoAdicionar.current?.focus();
  }, []);

  /**
   * Cria o capítulo e vai para ele — §8.3: "seleciona automaticamente o capítulo
   * e sua posição inicial".
   *
   * A seleção é movida **antes** de `aplicar` não por otimismo, e sim porque os
   * ids já existem: `prepararNovoCapitulo` os decidiu. Se o comando for recusado
   * (nome que colide, teto estourado), `aplicar` devolve o documento anterior e
   * a seleção cai de volta no capítulo válido mais próximo, porque `capitulo`
   * é resolvido contra a lista de verdade a cada render.
   */
  const criarCapitulo = useCallback((novo: NovoCapituloV2) => {
    aplicar({ tipo: "ADICIONAR_CAPITULO", novo });
    setCapituloId(novo.capituloId);
    setNodeId(novo.raizId);
    fecharAdicionar();
  }, [aplicar, fecharAdicionar]);

  const fecharTroca = useCallback(() => {
    setTrocandoPosicao(false);
    botaoTrocarPosicao.current?.focus();
  }, []);

  /**
   * Troca a posição inicial do capítulo aberto — §9.
   *
   * A seleção volta ao início do capítulo **antes** de aplicar porque o lance
   * que estava selecionado pode ser um dos que a poda leva: continuar apontando
   * para ele deixaria o painel olhando para um nó que não existe mais. A raiz da
   * análise sempre sobrevive à troca — é ela que recebe a posição nova.
   */
  const trocarPosicao = useCallback((plano: PlanoDaTrocaV2) => {
    setNodeId(analise.raizId);
    aplicar({ tipo: "TROCAR_POSICAO_INICIAL", plano });
    fecharTroca();
  }, [analise.raizId, aplicar, fecharTroca]);

  /** Leva a tela até o lugar do problema. É o que o botão da lista faz. */
  const irAoProblema = useCallback((destino: DestinoV2) => {
    // Nível e classe moram em "Mais opções" (fatia 8): o problema abre a janela certa.
    if (destino.maisOpcoes) { setVendoPublicacoes(true); return; }
    if (destino.janela?.tipo === "treino") { setEditandoTreino(destino.janela.treinoId); return; }
    if (destino.janela?.tipo === "introducao") {
      setEditandoIntroducao({ id: destino.janela.introducaoId, quadro: destino.janela.quadroId });
      return;
    }
    if (destino.janela?.tipo === "pratica") {
      setEditandoPratica(destino.janela.praticaId ?? historico.presente.praticas[0]?.id ?? "nova");
      return;
    }
    if (destino.janela?.tipo === "proveniencia") {
      if (destino.capituloId) setCapituloId(destino.capituloId);
      setRevisandoProveniencia(destino.janela.analiseId);
      return;
    }
    if (destino.capituloId) setCapituloId(destino.capituloId);
    if (destino.nodeId) setNodeId(destino.nodeId);
  }, [historico.presente.praticas]);

  /*
   * ## O despachante do menu do lance (§11.3)
   *
   * As onze ações não fazem onze coisas diferentes: quatro são edições diretas
   * (promover, comentar, anotar, criar variante), três abrem o diálogo de §8.3,
   * duas abrem o diálogo do corte, uma abre a exportação e uma está desligada.
   * Este despachante é o único lugar que sabe disso — o painel só diz qual foi.
   *
   * "Comentar" e "criar variante" não abrem janela nenhuma: a caixa de
   * comentário e o tabuleiro já estão na tela. O que a ação faz é **levar o
   * professor até eles** — selecionar o lance e pôr o foco no campo certo. Uma
   * janela para escrever um comentário que cabe na tela seria um passo a mais
   * para fazer o mesmo.
   */
  const campoDoComentario = useRef<HTMLTextAreaElement>(null);
  const [abaDoLance, setAbaDoLance] = useState<"fala" | "nota">("fala");
  const [dicaDaVariante, setDicaDaVariante] = useState(false);
  /** §10.1: o peão que chegou à última fileira espera a peça escolhida (15/9/2026: antes virava dama). */
  const [promocaoPendente, setPromocaoPendente] = useState<{ orig: Key; dest: Key } | null>(null);
  /** Quantas vezes a escolha da promoção foi cancelada: o tabuleiro devolve o peão à casa de saída. */
  const [promocoesDesfeitas, setPromocoesDesfeitas] = useState(0);
  /** §10.1: o lance novo onde já havia continuação cria uma variante, e a tela diz enquanto ele está selecionado. */
  const [varianteNova, setVarianteNova] = useState<string | null>(null);

  const aoAcaoDoLance = useCallback((acao: AcaoDoLanceV2["id"], alvo: string) => {
    setNodeId(alvo);
    if (acao === "principal") {
      const pai = Object.values(analise.nos).find((no) => no.filhos.includes(alvo));
      if (pai) aplicar({ tipo: "PROMOVER_VARIANTE", analiseId: analise.id, parentId: pai.id, nodeId: alvo });
      return;
    }
    if (acao === "comentar") {
      // O comentário mora na aba "Nota do professor"; o `requestAnimationFrame` espera a aba abrir e o
      // React trocar o `key` do campo (focar antes pegaria o campo do lance velho).
      setAbaDoLance("nota");
      requestAnimationFrame(() => campoDoComentario.current?.focus());
      return;
    }
    if (acao === "simbolo") {
      document.getElementById("simbolos-do-lance")?.querySelector("button")?.focus();
      return;
    }
    if (acao === "variante") {
      setDicaDaVariante(true);
      return;
    }
    if (acao === "mostrar-variante" || acao === "comecar-daqui" || acao === "duplicar-independente") {
      setAcaoDoLance({ acao, nodeId: alvo });
      return;
    }
    if (acao === "copiar-pgn") {
      setExportando(true);
      return;
    }
    if (acao === "substituir-continuacao" || acao === "excluir-daqui") {
      const rotulo = mapa?.rotulos[alvo];
      const san = mapa?.sans[alvo] ?? analise.nos[alvo]?.uci ?? "este lance";
      setCortando({ tipo: acao === "excluir-daqui" ? "excluir-daqui" : "substituir-continuacao", nodeId: alvo, lance: rotulo ? `${rotulo} ${san}` : san });
      return;
    }
    if (acao === "treino") setCriandoTreino(alvo);
  }, [analise, aplicar, mapa]);

  /** As marcas de revisão pendentes da aula inteira — §19.2. */
  const revisoes = useMemo(() => revisoesPendentesV2(historico.presente), [historico.presente]);

  const duplicarCapitulo = useCallback((novo: CapituloDuplicadoV2) => {
    aplicar({ tipo: "DUPLICAR_CAPITULO", novo });
    setCapituloId(novo.capituloId);
    setNodeId(novo.nos[Object.keys(novo.nos)[0]] ?? "");
    setDuplicandoCapitulo(null);
  }, [aplicar]);

  /**
   * Exclui o capítulo e devolve a seleção a um que exista.
   *
   * A seleção muda **antes** do comando, e não depois, pelo mesmo motivo da
   * criação: se o capítulo excluído continuasse selecionado por um render, o
   * painel tentaria desenhar uma partida que já não está na aula.
   */
  const excluirCapitulo = useCallback((plano: PlanoDeExclusaoV2, resolucoes: ResolucoesV2) => {
    const sobrando = capitulosOrdenados.find((item) => item.id !== plano.capituloId);
    if (sobrando) {
      setCapituloId(sobrando.id);
      setNodeId(sobrando.inicioNodeId);
    }
    aplicar({ tipo: "EXCLUIR_CAPITULO", plano, resolucoes });
    setExcluindoCapitulo(null);
  }, [aplicar, capitulosOrdenados]);

  const criarDoLance = useCallback((capituloNovoId: string, nodeNovoId: string, comando: ComandoV2) => {
    aplicar(comando);
    setCapituloId(capituloNovoId);
    setNodeId(nodeNovoId);
    setAcaoDoLance(null);
  }, [aplicar]);

  const cortar = useCallback((plano: PlanoDoCorteV2, resolucoes: ResolucoesV2) => {
    // A seleção volta ao lance que **fica**: o de partida na substituição, o pai
    // na exclusão. Continuar apontando para um nó apagado deixaria o painel
    // olhando para o vazio — o mesmo cuidado da troca de posição inicial.
    if (plano.tipo === "excluir-daqui") {
      const pai = Object.values(analise.nos).find((no) => no.filhos.includes(plano.nodeId));
      setNodeId(pai?.id ?? analise.raizId);
    } else {
      setNodeId(plano.nodeId);
    }
    aplicar({ tipo: "CORTAR", plano, resolucoes });
    setCortando(null);
  }, [analise, aplicar]);

  const jogarLance = (uci: string) => {
    const existente = selecionado.filhos.find((filho) => analise.nos[filho]?.uci === uci);
    if (existente) {
      setNodeId(existente);
      return;
    }
    const id = novoId();
    setVarianteNova(selecionado.filhos.length > 0 ? id : null);
    aplicar({ tipo: "ADICIONAR_LANCE", analiseId: analise.id, nodeId: selecionado.id, uci, novoNodeId: id, capituloId: capitulo.id });
    setNodeId(id);
  };

  const mover = (orig: Key, dest: Key) => {
    setDicaDaVariante(false);
    const peca = jogo.get(orig as Square);
    if (peca?.type === "p" && (dest[1] === "1" || dest[1] === "8")) {
      setPromocaoPendente({ orig, dest });
      return;
    }
    jogarLance(`${orig}${dest}`);
  };

  const desfazerTudo = () => {
    if (historico.presente === documentoInicial) return;
    const confirmou = window.confirm("Desfazer todas as alterações feitas desde que você abriu o editor? A aula inteira voltará ao estado daquela abertura.");
    if (!confirmou) return;
    const primeiro = capitulosNaOrdemDaAula(documentoInicial)[0];
    setHistorico((atual) => aplicarNoHistorico(atual, documentoInicial));
    if (primeiro) {
      setCapituloId(primeiro.id);
      setNodeId(primeiro.inicioNodeId);
    }
    setRecado(null);
  };

  /** Sair com a aula ainda sem gravar perderia a última mudança: pergunta antes. */
  const confirmarSaida = (evento: EventoDeMouse) => {
    if (estado === "salvo") return;
    if (!window.confirm("A aula ainda não terminou de salvar. Sair mesmo assim? A última mudança pode se perder.")) evento.preventDefault();
  };

  const baixarCopia = () => {
    const blob = new Blob([JSON.stringify(historico.presente, null, 2) + "\n"], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${aulaId}-editor-v2-recuperacao.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  /**
   * O botão Conferir. Só com a aula salva: o servidor julga o disco, e julgar outra coisa
   * que a tela mostra seria um verde sobre o que o professor não está vendo.
   *
   * Desde 15/9/2026 a conferência não escreve no documento (a tablebase saiu). Se o disco voltar
   * diferente — a aula guardada pela primeira vez —, o documento que volta substitui o presente
   * **sem** limpar o Desfazer.
   */
  /**
   * `depois: "publicar"` — o botão Publicar clicado sem conferência verde (achado do Doug, 14/9/2026:
   * "não achei o botão de publicar"). A conferência roda do mesmo jeito; verde, segue para a pergunta de
   * antes de publicar; com problema, o recado diz que ainda não dá e a lista mostra por quê.
   */
  const conferir = async (depois?: "publicar") => {
    if (estado !== "salvo" || conferindo) return;
    setConferindo(true);
    setRecado(null);
    try {
      const resposta = await conferirAulaV2Acao(aulaId);
      if (!resposta.ok) {
        setRecado(`Conferir falhou: ${resposta.erro}`);
        return;
      }
      let julgada = historico.presente;
      if (resposta.documento && resposta.documento.hash !== hash.current) {
        const validada = validarAulaV2(JSON.parse(resposta.documento.texto));
        if (validada.ok) {
          julgada = validada.aula;
          hash.current = resposta.documento.hash;
          maisRecente.current = julgada;
          ultimoEnfileirado.current = julgada;
          setHistorico((atual) => ({ ...atual, presente: julgada }));
        }
      }
      setConferencia({ resultado: resposta, aula: julgada });
      if (depois === "publicar") {
        if (resposta.publicar.pode) {
          if (aulaFeita?.aula === julgada) setPublicandoAula(true);
          else setPerguntandoAntesDePublicar(true);
        }
        // Sem verde, a própria faixa da conferência diz "Ainda não dá para publicar" e abre a lista —
        // um recado vermelho a mais repetia a mesma frase (revisão de experiência, 14/9/2026).
      }
    } catch {
      setRecado("Não foi possível conferir agora. Nada foi alterado.");
    } finally {
      setConferindo(false);
    }
  };

  /*
   * A lista da conferência se atualiza sozinha (achado do Doug, 14/9/2026). Antes, consertar um problema
   * deixava a lista velha na tela com "a aula mudou — confira de novo", e o Doug achou que o conserto não
   * tinha pegado. Agora, com o resultado aberto e a aula mudada, o editor confere de novo assim que o
   * autosave confirma ("✓ salvo"), com uma folga para não conferir a cada tecla. Fechar o resultado para.
   */
  const conferirDeNovo = useRef(conferir);
  useEffect(() => { conferirDeNovo.current = conferir; });
  const conferenciaVencida = conferencia !== null && conferencia.aula !== historico.presente;
  useEffect(() => {
    if (!conferenciaVencida || estado !== "salvo" || conferindo) return;
    const relogio = setTimeout(() => void conferirDeNovo.current(), 800);
    return () => clearTimeout(relogio);
  }, [conferenciaVencida, estado, conferindo, historico.presente]);

  const adotarVersaoDoDisco = async () => {
    if (!conflitoAtual?.textoAtual || !conflitoAtual.hashAtual) return;
    let cru: unknown;
    try { cru = JSON.parse(conflitoAtual.textoAtual); } catch { setRecado("A versão do disco não contém JSON válido."); return; }
    const validada = validarAulaV2(cru);
    if (!validada.ok) { setRecado("A versão do disco não é um documento v2 válido."); return; }
    const copiaLocal = { aula: historico.presente, baseHash: hash.current, em: new Date().toISOString() };
    if (!sessaoId) { setRecado("A sessão local ainda não está pronta. Tente novamente."); return; }
    try {
      await guardarRecuperacao(aulaId, sessaoId, copiaLocal.aula, copiaLocal.baseHash);
    } catch {
      setFalhaRecuperacao(true);
      setRecado("A versão do disco não foi aberta porque o navegador não confirmou a preservação da sua edição.");
      return;
    }
    setRecuperavel(copiaLocal);
    hash.current = conflitoAtual.hashAtual;
    maisRecente.current = validada.aula;
    ultimoEnfileirado.current = validada.aula;
    setHistorico(iniciarHistorico(validada.aula));
    setConflitoAtual(null);
    setRecado(null);
    setEstado("salvo");
  };

  /*
   * ## A porta da aula vazia (§5.2)
   *
   * Até esta rodada, uma aula sem capítulo mostrava a frase "esta aula ainda não
   * tem capítulo editável" e mais nada — um beco. Enquanto "Nova aula" não
   * existia, ninguém chegava lá; agora chega **toda** aula recém-criada, e a
   * primeira coisa que o professor vê não pode ser um aviso sem botão.
   *
   * §5.2: "criar abre a nova aula e oferece imediatamente **Adicionar
   * capítulo**". É isso que está aqui: o mesmo título, os mesmos dois botões que
   * criam conteúdo, e o mesmo diálogo da coluna da esquerda.
   */
  if (!capitulo) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4">
        <header className="flex flex-col gap-1">
          <h1 className="titulo">
            <input
              key={historico.presente.titulo}
              aria-label="Título da aula"
              defaultValue={historico.presente.titulo}
              onBlur={(e) => aplicar({ tipo: "RENOMEAR_AULA", titulo: e.currentTarget.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
                if (e.key === "Escape") { e.currentTarget.value = historico.presente.titulo; e.currentTarget.blur(); }
              }}
              className="foco -mx-1 w-full min-w-[12rem] rounded-md border border-transparent bg-transparent px-1 hover:border-borda focus:border-borda"
            />
          </h1>
          <p className="text-sm text-tinta-media">
            Comece pelo primeiro capítulo: uma posição para explicar, ou traga um estudo do Lichess.
          </p>
        </header>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            ref={botaoAdicionar}
            onClick={() => setAdicionando(true)}
            className="foco rounded-md bg-metodo-superficie/25 px-3 py-2 text-sm font-medium text-metodo-tinta-alta"
          >
            + Adicionar capítulo
          </button>
          <button type="button" ref={botaoImportar} onClick={() => setImportando(true)} className="foco rounded-md border border-borda px-3 py-2 text-sm text-tinta hover:bg-carta-toque">
            Importar do Lichess ou PGN
          </button>
          <span className={`self-center text-xs ${estado === "erro" || estado === "conflito" ? "text-erro-texto" : "text-tinta-fraca"}`}>
            {estado === "salvo" ? "✓ salvo" : estado === "alterado" ? "alterado" : estado === "salvando" ? "salvando…" : estado}
          </span>
        </div>

        {recado ? <p role="alert" className="rounded-lg border border-erro bg-erro-superficie/10 p-3 text-sm text-erro-texto">{recado}</p> : null}
        <PainelDeProblemas visiveis={visiveis} resumo={resumo} aoIr={irAoProblema} />
        {importando ? <PainelDeImportacao aula={historico.presente} aoAplicar={importar} aoFechar={fecharImportacao} aoImportarEstudo={importarEstudo} positions={positions} obras={obras} professor={professor} textoInicial={importacaoInicial?.texto} nomeInicial={importacaoInicial?.nome} /> : null}
        {adicionando ? (
          <DialogoNovoCapitulo
            aula={historico.presente}
            capituloAtualId=""
            orientacaoPadrao={historico.presente.metadados?.orientacaoPadrao ?? "white"}
            aoCriar={criarCapitulo}
            aoImportarDoLichess={() => { setAdicionando(false); setImportando(true); }}
            acervo={acervo}
            aoFechar={fecharAdicionar}
          />
        ) : null}
      </main>
    );
  }

  return (
    /*
     * ## A altura é FECHADA (`h-dvh`), e não um piso
     *
     * Medido em 10/09/2026 com uma partida de 60 lances: a lista de lances tem
     * `overflow-auto` — ela **promete** rolar por dentro —, mas sem nenhum pai de
     * altura fechada ela cresce em vez de rolar. Eram **4.420 px** de lista numa
     * página de 5.452 px, e quem rolava era a página inteira: o professor perdia o
     * tabuleiro de vista justamente enquanto procurava um lance lá embaixo.
     *
     * É o mesmo defeito que o editor v1 já tinha corrigido, e o conserto é o mesmo:
     * altura fechada aqui, `min-h-0` na linha de baixo (sem ele um filho flex nunca
     * encolhe abaixo do próprio conteúdo) e `overflow-y-auto` em cada coluna. Assim
     * as três colunas rolam por dentro e o tabuleiro fica onde está.
     *
     * **Só a partir de `lg`.** Em tela estreita o layout de três colunas não se
     * aplica, tudo empilha, e uma altura fechada espremeria a lista de lances até
     * zero — medido. Abaixo disso a página volta a rolar como antes. O plano (§16)
     * diz que o alvo da autoria é o desktop; isto não promete paridade no celular,
     * só evita quebrar o que já funcionava.
     */
    <VistaDoTabuleiro escopos={["editor"]}>
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-4 p-4 lg:h-dvh">
      {/* A barra do topo (revisão de experiência, 14/9/2026): o Doug achou a tela "poluída", com dez
          botões do mesmo peso. Como no editor do Lichess, fica à vista só o que se usa a toda hora —
          Desfazer, Refazer, Ver como aluno e Publicar —, e o resto mora no "⋯ Mais ações". */}
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 flex-1 items-baseline gap-3">
          {/* Pedido do Doug de 16/9/2026: depois de publicar não havia como fechar a aula e voltar ao início. */}
          <Link href="/editor" onClick={confirmarSaida} className="foco shrink-0 text-xs text-tinta-fraca hover:text-tinta">← Editor</Link>
          <h1 className="titulo min-w-0 flex-1">
            <input
              key={historico.presente.titulo}
              aria-label="Título da aula"
              title="Clique para mudar o título"
              defaultValue={historico.presente.titulo}
              onBlur={(e) => aplicar({ tipo: "RENOMEAR_AULA", titulo: e.currentTarget.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
                if (e.key === "Escape") { e.currentTarget.value = historico.presente.titulo; e.currentTarget.blur(); }
              }}
              className="foco -mx-1 w-full min-w-[12rem] truncate rounded-md border border-transparent bg-transparent px-1 hover:border-borda focus:border-borda"
            />
          </h1>
          <span
            title="A aula salva sozinha. O aluno só vê as mudanças depois de Publicar."
            className={`shrink-0 text-xs ${estado === "erro" || estado === "conflito" ? "text-erro-texto" : "text-tinta-fraca"}`}
          >
            {estado === "salvo" ? "✓ salvo" : estado === "alterado" ? "alterado" : estado === "salvando" ? "salvando…" : estado}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" aria-label="Desfazer" title="Desfazer (Ctrl+Z)" disabled={!historico.passados.length} onClick={() => setHistorico(desfazer)} className="foco flex min-h-9 min-w-9 items-center justify-center rounded-md border border-borda text-lg leading-none text-tinta hover:bg-carta-toque disabled:opacity-40"><span aria-hidden>↶</span></button>
          <button type="button" aria-label="Refazer" title="Refazer (Ctrl+Y)" disabled={!historico.futuros.length} onClick={() => setHistorico(refazer)} className="foco flex min-h-9 min-w-9 items-center justify-center rounded-md border border-borda text-lg leading-none text-tinta hover:bg-carta-toque disabled:opacity-40"><span aria-hidden>↷</span></button>
          <button type="button" ref={botaoPrevia} onClick={() => setEscolhendoPrevia(true)} className="foco min-h-9 rounded-md border border-borda px-3 text-sm text-tinta hover:bg-carta-toque">Ver como aluno</button>
          {/* Publicar está sempre na tela e confere sozinho antes (achado do Doug, 14/9/2026): nada publica
              sem conferência verde, só o caminho ficou à vista. */}
          <button
            type="button"
            ref={botaoPublicar}
            // Com a janela de publicar aberta, o botão dela é o único Publicar ligado (teste de uso de 15/9/2026):
            // este, atrás do véu, aparecia ligado ao lado de "Calculando o impacto…".
            disabled={estado !== "salvo" || conferindo || publicandoAula || perguntandoAntesDePublicar}
            title={estado !== "salvo" ? "Espere a aula salvar para publicar" : conferindo ? "Conferindo a aula…" : "Confere a aula e publica"}
            onClick={() => {
              const verde = conferencia && conferencia.aula === historico.presente && conferencia.resultado.publicar.pode;
              if (!verde) { void conferir("publicar"); return; }
              if (aulaFeita?.aula === historico.presente) setPublicandoAula(true);
              else setPerguntandoAntesDePublicar(true);
            }}
            className="foco min-h-9 rounded-md bg-metodo-cheio px-4 text-sm font-medium text-tinta-inversa hover:bg-metodo-cheio-toque disabled:opacity-40"
          >
            {conferindo ? "Conferindo…" : "Publicar"}
          </button>
          <MenuMaisAcoes
            refDoBotao={botaoMaisAcoes}
            itens={[
              { rotulo: "Importar do Lichess ou PGN…", aoEscolher: () => setImportando(true) },
              { rotulo: "Exportar…", ajuda: "Para o Lichess, ou uma cópia completa da aula", aoEscolher: () => setExportando(true) },
              { rotulo: "Conferir sem publicar", ajuda: "Mostra o que ainda impede publicar", disponivel: estado === "salvo" && !conferindo, motivo: "espere a aula salvar", aoEscolher: () => void conferir() },
              { rotulo: "Nível e publicações…", aoEscolher: () => setVendoPublicacoes(true) },
              ...(historico.presente.origem?.formato === "lesson-v1" && !historico.presente.origem.convertidaEm
                ? [{ rotulo: "Converter aula antiga…", aoEscolher: () => setConvertendoV1(true) }]
                : []),
              { rotulo: "Desfazer tudo…", ajuda: "Volta a aula a como estava quando você abriu", perigo: true, separar: true, disponivel: historico.presente !== documentoInicial, motivo: "nada mudou desde que você abriu", aoEscolher: desfazerTudo },
            ]}
          />
        </div>
      </header>

      {recuperavel ? (
        <section className="rounded-lg border border-aviso-superficie bg-aviso-superficie/10 p-3 text-sm text-aviso-tinta">
          Há uma versão local não concluída de {new Date(recuperavel.em).toLocaleString("pt-BR")}.
          <button type="button" className="foco ml-2 underline" onClick={() => { setHistorico(iniciarHistorico(recuperavel.aula)); hash.current = recuperavel.baseHash; setRecuperavel(null); }}>Recuperar</button>
          <button type="button" className="foco ml-3 underline" onClick={() => { if (sessaoId) void apagarRecuperacao(aulaId, sessaoId); setRecuperavel(null); }}>Descartar</button>
        </section>
      ) : null}
      {conflitoAtual ? (
        <section className="rounded-lg border border-erro bg-erro-superficie/10 p-3 text-sm text-erro-texto">
          <p>Outra aba gravou esta aula. Sua versão não foi sobrescrita.</p>
          <div className="mt-2 flex flex-wrap gap-3">
            <button type="button" className="foco underline" onClick={baixarCopia}>Baixar minha cópia</button>
            <button type="button" className="foco underline disabled:opacity-40" disabled={!conflitoAtual.textoAtual || !conflitoAtual.hashAtual} onClick={adotarVersaoDoDisco}>Abrir versão do disco</button>
          </div>
        </section>
      ) : null}
      {falhaRecuperacao ? (
        <section className="rounded-lg border border-aviso-superficie bg-aviso-superficie/10 p-3 text-sm text-aviso-tinta">
          O navegador não conseguiu guardar a cópia de recuperação. O autosave no disco ainda será tentado.
          <button type="button" className="foco ml-2 underline" onClick={baixarCopia}>Baixar cópia agora</button>
        </section>
      ) : null}
      {recado ? <p role="alert" className="rounded-lg border border-erro bg-erro-superficie/10 p-3 text-sm text-erro-texto">{recado}</p> : null}
      {publicada ? (
        <p role="status" className="rounded-lg border border-metodo-superficie bg-metodo-superficie/10 p-3 text-sm text-metodo-tinta-alta">
          Publicada neste computador ({publicada}). Os alunos do site recebem depois do commit, do push e do deploy.
          {/* Numa linha própria, à esquerda: no fim do texto, o painel flutuante da conferência cobria os botões. */}
          <span className="mt-2 flex flex-wrap gap-4">
            <Link href="/editor" onClick={confirmarSaida} className="foco font-medium underline">Voltar ao início do editor</Link>
            <button type="button" className="foco underline" onClick={() => setPublicada(null)}>Fechar aviso</button>
          </span>
        </p>
      ) : null}
      {perguntandoAntesDePublicar ? (
        <Dialogo
          titulo="Antes de publicar, quer fazer a aula inteira como aluno?"
          descricao={`${oQueAAulaInteiraTem(historico.presente.fluxo)}, do jeito que o aluno vai fazer. Nada é gravado, e no fim aparece quanto tempo cada etapa levou.`}
          largura="max-w-lg"
          aoFechar={() => { setPerguntandoAntesDePublicar(false); queueMicrotask(() => botaoPublicar.current?.focus()); }}
          rodape={(
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" onClick={() => { setPerguntandoAntesDePublicar(false); queueMicrotask(() => botaoPublicar.current?.focus()); }} className="foco rounded-md border border-borda px-3 py-2 text-sm text-tinta hover:bg-carta-toque">Cancelar</button>
              <button type="button" onClick={() => { setPerguntandoAntesDePublicar(false); setPublicandoAula(true); }} className="foco rounded-md border border-borda px-3 py-2 text-sm text-tinta hover:bg-carta-toque">Publicar sem fazer</button>
              <button type="button" onClick={() => { setPerguntandoAntesDePublicar(false); setFazendoComoAluno(true); }} className="foco rounded-md border border-metodo-superficie bg-metodo-superficie/25 px-3 py-2 text-sm font-medium text-metodo-tinta-alta">Fazer a aula inteira</button>
            </div>
          )}
        >
          {aulaFeita ? (
            <p className="text-sm text-tinta-media">
              Você fez uma versão anterior às {aulaFeita.em.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}, em {formatarDuracao(aulaFeita.totalMs)}; a aula mudou depois disso.
            </p>
          ) : null}
        </Dialogo>
      ) : null}

      {fazendoComoAluno ? (
        <AulaComoAluno
          aulaId={aulaId}
          documento={historico.presente}
          podePublicar={Boolean(conferencia && conferencia.aula === historico.presente && conferencia.resultado.publicar.pode)}
          aoTerminar={(resumo) => setAulaFeita({ aula: historico.presente, totalMs: resumo.totalMs, em: new Date(), concluida: resumo.concluida })}
          aoFechar={() => setFazendoComoAluno(false)}
          aoPublicar={() => { setFazendoComoAluno(false); setPublicandoAula(true); }}
        />
      ) : null}

      {publicandoAula ? (
        <DialogoPublicar
          aulaId={aulaId}
          aoFechar={() => { setPublicandoAula(false); queueMicrotask(() => botaoPublicar.current?.focus()); }}
          aoPublicar={(publicationId) => { setPublicandoAula(false); setPublicada(publicationId); queueMicrotask(() => botaoMaisAcoes.current?.focus()); }}
        />
      ) : null}
      {convertendoV1 ? (
        <DialogoConverterV1
          aulaId={aulaId}
          aula={historico.presente}
          aoFechar={() => { setConvertendoV1(false); queueMicrotask(() => botaoMaisAcoes.current?.focus()); }}
          aoConverter={() => {
            aplicar({ tipo: "CONVERTER_V1", convertidaEm: new Date().toISOString() });
            setConvertendoV1(false);
            queueMicrotask(() => botaoMaisAcoes.current?.focus());
          }}
        />
      ) : null}
      {vendoPublicacoes ? (
        <DialogoPublicacoes
          aulaId={aulaId}
          metadados={historico.presente.metadados}
          aoEditarMetadados={aplicar}
          aoReativar={(publicationId) => {
            // D11: o aluno passou a receber outra publicação. A conferência verde da tela era
            // sobre o documento contra a ativa de antes, e o botão Publicar não pode continuar
            // prometendo o que prometia.
            setConferencia(null);
            setRecado(`A publicação ${publicationId} voltou a ser a que o aluno recebe. O documento na tela continua o seu rascunho: confira de novo antes de publicar.`);
          }}
          aoFechar={() => { setVendoPublicacoes(false); queueMicrotask(() => botaoMaisAcoes.current?.focus()); }}
        />
      ) : null}
      {/* O resultado da conferência flutua no canto, sob a barra do topo, e não empurra o tabuleiro
          (revisão de experiência, 14/9/2026: a lista aberta descia a tela ~230 px). Enquanto ele está
          aberto, a lista viva some — as duas diziam a mesma frase. */}
      {conferencia ? (
        <div className="lg:fixed lg:right-4 lg:top-16 lg:z-30 lg:w-[30rem] lg:max-w-[calc(100vw-2rem)] lg:shadow-xl">
        <PainelDeProblemas
          visiveis={problemasVisiveisV2(historico.presente, conferencia.resultado.conferencia.problemas)}
          resumo={null}
          aoIr={irAoProblema}
          aoFechar={() => setConferencia(null)}
          conferencia={{
            em: conferencia.resultado.conferencia.em,
            erros: conferencia.resultado.conferencia.contagem.erros,
            avisos: conferencia.resultado.conferencia.contagem.avisos,
            podePublicar: conferencia.resultado.publicar.pode,
            impedimento: conferencia.resultado.conferencia.impedimento,
            vencida: conferencia.aula !== historico.presente,
          }}
        />
        </div>
      ) : null}
      {conferencia ? null : <PainelDeProblemas visiveis={visiveis} resumo={resumo} aoIr={irAoProblema} />}
      {/* §19.2: as marcas de revisão, juntas e com porta de saída — inclusive a
          do quadro de introdução, que era marcada e não tinha como ser resolvida. */}
      <ListaDeRevisoes
        revisoes={revisoes}
        aoIr={irAoProblema}
        aoResolver={(alvo: AlvoDeRevisaoV2) => aplicar({ tipo: "REVISAO_RESOLVIDA", alvo })}
        aoResolverTodas={(alvos: AlvoDeRevisaoV2[]) => aplicar({ tipo: "REVISOES_RESOLVIDAS", alvos })}
      />
      {importando ? <PainelDeImportacao aula={historico.presente} aoAplicar={importar} aoFechar={fecharImportacao} aoImportarEstudo={importarEstudo} positions={positions} obras={obras} professor={professor} textoInicial={importacaoInicial?.texto} nomeInicial={importacaoInicial?.nome} /> : null}
      {adicionando ? (
        <DialogoNovoCapitulo
          aula={historico.presente}
          capituloAtualId={capitulo.id}
          orientacaoPadrao={historico.presente.metadados?.orientacaoPadrao ?? capitulo.orientacao}
          aoCriar={criarCapitulo}
            aoImportarDoLichess={() => { setAdicionando(false); setImportando(true); }}
          acervo={acervo}
          aoFechar={fecharAdicionar}
        />
      ) : null}

      {trocandoPosicao ? (
        <DialogoTrocarPosicao
          aula={historico.presente}
          analiseId={analise.id}
          tituloDoCapitulo={capitulo.titulo}
          orientacao={capitulo.orientacao}
          positions={positions}
          aoTrocar={trocarPosicao}
          aoFechar={fecharTroca}
        />
      ) : null}

      {duplicandoCapitulo ? (
        <DialogoDuplicarCapitulo
          aula={historico.presente}
          capituloId={duplicandoCapitulo}
          positions={positions}
          aoDuplicar={duplicarCapitulo}
          aoFechar={() => setDuplicandoCapitulo(null)}
        />
      ) : null}

      {excluindoCapitulo ? (
        <DialogoExcluirCapitulo
          aula={historico.presente}
          capituloId={excluindoCapitulo}
          positions={positions}
          aoExcluir={excluirCapitulo}
          aoFechar={() => setExcluindoCapitulo(null)}
        />
      ) : null}

      {acaoDoLance ? (
        <DialogoDoLance
          aula={historico.presente}
          acao={acaoDoLance.acao}
          analiseId={analise.id}
          nodeId={acaoDoLance.nodeId}
          capituloId={capitulo.id}
          nomeSugerido={nomeDoLance(acaoDoLance.nodeId)}
          orientacaoPadrao={orientacaoDoLance(acaoDoLance.nodeId)}
          positions={positions}
          aoMostrarVariante={(novo: VarianteMostradaV2) => criarDoLance(novo.capituloId, novo.caminho.at(-1) ?? novo.inicioNodeId, { tipo: "MOSTRAR_VARIANTE", novo })}
          aoComecarDaqui={(novo: ComecoDaquiV2) => criarDoLance(novo.capituloId, novo.raizId, { tipo: "COMECAR_DAQUI", novo })}
          aoDuplicar={(novo: DuplicataIndependenteV2) => criarDoLance(novo.capituloId, novo.nos[acaoDoLance.nodeId], { tipo: "DUPLICAR_INDEPENDENTE", novo })}
          aoFechar={() => setAcaoDoLance(null)}
        />
      ) : null}

      {cortando ? (
        <DialogoDeCorte
          aula={historico.presente}
          tipo={cortando.tipo}
          analiseId={analise.id}
          nodeId={cortando.nodeId}
          lance={cortando.lance}
          positions={positions}
          aoCortar={cortar}
          aoFechar={() => setCortando(null)}
        />
      ) : null}

      {exportando ? (
        <DialogoExportar
          aula={historico.presente}
          analiseId={analise.id}
          nodeId={nodeIdAtual}
          capituloId={capitulo.id}
          positions={positions}
          aoFechar={() => { setExportando(false); botaoMaisAcoes.current?.focus(); }}
        />
      ) : null}

      {criandoTreino ? (
        <DialogoCriarTreino
          aula={historico.presente}
          capituloId={capitulo.id}
          nodeId={criandoTreino}
          positions={positions}
          aoCriar={(preparo: TreinosPreparadosV2) => {
            aplicar({ tipo: "ADICIONAR_TREINOS", preparo });
            setCriandoTreino(null);
          }}
          aoFechar={() => setCriandoTreino(null)}
        />
      ) : null}

      {editandoTreino ? (
        <DialogoEditarTreino
          aula={historico.presente}
          treinoId={editandoTreino}
          positions={positions}
          regua={regua}
          aoSalvar={(edicao) => {
            aplicar({ tipo: "EDITAR_TREINO", edicao });
            setEditandoTreino(null);
            requestAnimationFrame(() => document.querySelector<HTMLButtonElement>(`[data-treino-id="${editandoTreino}"]`)?.focus());
          }}
          aoFechar={() => {
            const alvo = editandoTreino;
            setEditandoTreino(null);
            requestAnimationFrame(() => document.querySelector<HTMLButtonElement>(`[data-treino-id="${alvo}"]`)?.focus());
          }}
        />
      ) : null}

      {revisandoProveniencia ? (
        <DialogoProveniencia
          aula={historico.presente}
          analiseId={revisandoProveniencia}
          professor={professor}
          aoRegistrar={(revisao, outras) => {
            aplicar(outras.length
              ? { tipo: "REGISTRAR_PROVENIENCIAS", itens: [{ analiseId: revisandoProveniencia, revisao }, ...outras] }
              : { tipo: "REGISTRAR_PROVENIENCIA", analiseId: revisandoProveniencia, revisao });
            setRevisandoProveniencia(null);
          }}
          aoFechar={() => setRevisandoProveniencia(null)}
        />
      ) : null}

      {editandoIntroducao ? (
        <EditorDeIntroducao
          aula={historico.presente}
          introducaoId={editandoIntroducao.id}
          quadroInicial={editandoIntroducao.quadro}
          positions={positions}
          aoComando={(comando: ComandoDeIntroducaoV2) => {
            // Confere antes, para a recusa aparecer na própria tela cheia, e não atrás dela.
            try { executarComando(historico.presente, comando, positions); } catch (erro) { return erro instanceof Error ? erro.message : "não foi possível fazer esta edição"; }
            aplicar(comando);
            if (comando.tipo === "ADICIONAR_INTRODUCAO") setEditandoIntroducao({ id: comando.introducaoId, quadro: comando.quadro.id });
            return null;
          }}
          aoPrever={setPreviaDaIntroducao}
          aoResolverRevisao={(quadroId) => {
            if (!editandoIntroducao.id) return;
            aplicar({ tipo: "REVISAO_RESOLVIDA", alvo: { introducaoId: editandoIntroducao.id, quadroId } });
          }}
          aoMudarModo={(quadroId) => {
            if (!editandoIntroducao.id) return;
            setMudandoModo({ tipo: "quadro", introducaoId: editandoIntroducao.id, quadroId });
            setEditandoIntroducao(null);
          }}
          aoFechar={() => {
            setEditandoIntroducao(null);
            requestAnimationFrame(() => document.querySelector<HTMLButtonElement>("[data-introducao]")?.focus());
          }}
        />
      ) : null}

      {previaDaIntroducao ? (
        <PreviaDaIntroducao aula={historico.presente} introducaoId={previaDaIntroducao} positions={positions} aoFechar={() => setPreviaDaIntroducao(null)} />
      ) : null}

      {vendoOrdem ? (
        <OrdemDaAula
          aula={historico.presente}
          aoMover={(etapaId, para) => aplicar({ tipo: "MOVER_ETAPA", etapaId, para })}
          aoFechar={() => { setVendoOrdem(false); requestAnimationFrame(() => document.querySelector<HTMLButtonElement>("[data-ordem-da-aula]")?.focus()); }}
        />
      ) : null}

      {mudandoModo ? (
        <DialogoMudarModo
          aula={historico.presente}
          parte={mudandoModo}
          positions={positions}
          aoMudar={(destino, mudanca) => {
            aplicar({ tipo: "MUDAR_MODO", parte: mudandoModo, destino });
            setMudandoModo(null);
            // A tela vai para a parte nova: o capítulo abre no tabuleiro; o treino e o quadro ganham o foco.
            const nova = mudanca.nova;
            const ordem = mudanca.aula.fluxo.flatMap((etapa) => etapa.tipo === "capitulo" ? mudanca.aula.capitulos.filter((c) => c.id === etapa.entidadeId) : []);
            const alvo = nova.tipo === "capitulo" ? ordem.find((c) => c.id === nova.capituloId) : ordem.find((c) => c.id === capitulo?.id) ?? ordem[0];
            if (alvo && alvo.id !== capitulo?.id) { setCapituloId(alvo.id); setNodeId(alvo.inicioNodeId); }
            if (nova.tipo === "quadro") setEditandoIntroducao({ id: nova.introducaoId, quadro: nova.quadroId });
            if (nova.tipo === "treino") requestAnimationFrame(() => document.querySelector<HTMLButtonElement>(`[data-treino-id="${nova.treinoId}"]`)?.focus());
            if (mudanca.avisos.length) setRecado(`Modo mudado. Para revisar: ${mudanca.avisos.join("; ")}.`);
          }}
          aoFechar={() => setMudandoModo(null)}
        />
      ) : null}

      {editandoPratica ? (
        <DialogoPratica
          aula={historico.presente}
          praticaId={editandoPratica === "nova" ? null : editandoPratica}
          positions={positions}
          acervo={acervoDaSessao}
          obras={obras}
          professor={professor}
          aoAdicionarAoAcervo={async (pedido) => {
            const resposta = await adicionarAoAcervoV2Acao(JSON.stringify(pedido));
            if (resposta.ok) setAcervoDaSessao((atual) => atual.some((item) => item.position.id === resposta.item.position.id) ? atual : [...atual, resposta.item].sort((a, b) => a.position.id.localeCompare(b.position.id)));
            return resposta;
          }}
          aoPrever={setJogandoPratica}
          aoSalvar={(preparo, nova) => {
            aplicar({ tipo: nova ? "ADICIONAR_PRATICA" : "EDITAR_PRATICA", preparo });
            setEditandoPratica(null);
            requestAnimationFrame(() => document.querySelector<HTMLButtonElement>("[data-pratica]")?.focus());
          }}
          aoExcluir={(praticaId) => {
            const pratica = historico.presente.praticas.find((item) => item.id === praticaId);
            if (!window.confirm(`Excluir a prática «${pratica?.titulo ?? ""}»? A aula fica sem avaliação e não publica até ter outra. O Desfazer devolve.`)) return;
            aplicar({ tipo: "EXCLUIR_PRATICA", praticaId });
            setEditandoPratica(null);
          }}
          aoFechar={() => {
            setEditandoPratica(null);
            requestAnimationFrame(() => document.querySelector<HTMLButtonElement>("[data-pratica]")?.focus());
          }}
        />
      ) : null}

      {jogandoPratica && positions[jogandoPratica.positionId] ? (
        <PreviaDaPratica pratica={jogandoPratica} posicao={positions[jogandoPratica.positionId]} aoFechar={() => setJogandoPratica(null)} />
      ) : null}

      {propriedadeTreino ? (
        <DialogoPropriedadeTreino
          aula={historico.presente}
          treinoId={propriedadeTreino}
          positions={positions}
          salvandoSnapshot={salvandoSnapshot}
          aoRefazer={(plano) => { void refazerTreinoDaAula(plano); }}
          aoTornarIndependente={() => {
            aplicar({ tipo: "TORNAR_TREINO_INDEPENDENTE", treinoId: propriedadeTreino });
            fecharPropriedade();
          }}
          aoFechar={fecharPropriedade}
        />
      ) : null}

      {/* §15.1: as três entradas da prévia. Uma janela com três botões, e não um menu
          suspenso: são três destinos, não três variações de um. */}
      {escolhendoPrevia ? (
        <Dialogo
          titulo="Ver como aluno"
          descricao="A aula aparece como o aluno a vê. Nada é gravado no progresso."
          largura="max-w-lg"
          aoFechar={fecharEscolhaDaPrevia}
          rodape={<button type="button" onClick={fecharEscolhaDaPrevia} className="foco rounded-md border border-borda px-3 py-2 text-sm text-tinta hover:bg-carta-toque">Cancelar</button>}
        >
          <div className="flex flex-col gap-2">
            <button type="button" onClick={() => { fecharEscolhaDaPrevia(); setFazendoComoAluno(true); }} className="foco rounded-md border border-metodo-superficie bg-metodo-superficie/10 px-3 py-2 text-left text-sm text-tinta hover:bg-carta-toque">
              Fazer a aula inteira como aluno
              <span className="block text-xs text-tinta-fraca">Introdução, capítulos, treinos e prática, do começo ao fim, com o tempo de cada etapa. Nada é gravado.</span>
            </button>
            <button type="button" onClick={() => abrirPrevia("aula")} className="foco rounded-md border border-borda px-3 py-2 text-left text-sm text-tinta hover:bg-carta-toque">
              Assistir aos capítulos
              <span className="block text-xs text-tinta-fraca">Todos os capítulos, na ordem do fluxo, com o retorno ao ponto de escolha quando duas linhas se comparam.</span>
            </button>
            <button type="button" onClick={() => abrirPrevia("capitulo")} className="foco rounded-md border border-borda px-3 py-2 text-left text-sm text-tinta hover:bg-carta-toque">
              Só este capítulo
              <span className="block text-xs text-tinta-fraca">«{capitulo.titulo}», do começo.</span>
            </button>
            <button
              type="button"
              disabled={!daquiDisponivel}
              onClick={() => abrirPrevia("daqui")}
              className="foco rounded-md border border-borda px-3 py-2 text-left text-sm text-tinta hover:bg-carta-toque disabled:opacity-40"
            >
              Daqui em diante
              <span className="block text-xs text-tinta-fraca">
                {daquiDisponivel
                  ? `A partir de ${nomeDoLance(nodeIdAtual)}.`
                  : "o lance selecionado não está no percurso deste capítulo — o capítulo reproduz só o percurso dele"}
              </span>
            </button>
          </div>
        </Dialogo>
      ) : null}

      {previa ? <Previa previa={previa} aoFechar={fecharPrevia} /> : null}

      {jogandoTreino?.jogavel ? (
        <PreviaDoTreino
          treinoId={jogandoTreino.treinoId}
          titulo={jogandoTreino.titulo}
          perfil={jogandoTreino.perfil}
          jogavel={jogandoTreino.jogavel}
          aoFechar={() => {
            const alvo = jogandoTreino.treinoId;
            setJogandoTreino(null);
            requestAnimationFrame(() => document.querySelector<HTMLButtonElement>(`[data-jogar-treino-id="${alvo}"]`)?.focus());
          }}
        />
      ) : null}
      {jogandoTreino && !jogandoTreino.jogavel ? (
        <Dialogo
          titulo="Este treino ainda não pode ser jogado"
          descricao={jogandoTreino.erro ?? "a tradução do treino falhou"}
          aoFechar={() => setJogandoTreino(null)}
          rodape={<button type="button" onClick={() => setJogandoTreino(null)} className="foco rounded-md border border-borda px-3 py-2 text-sm text-tinta hover:bg-carta-toque">Fechar</button>}
        >
          <p className="text-sm text-tinta-media">Abra a autoria do treino e corrija o que o rodapé apontar.</p>
        </Dialogo>
      ) : null}

      <div className="grid gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[14rem_minmax(20rem,38rem)_minmax(18rem,1fr)]">
        {/* A coluna da aula (revisão de experiência, 14/9/2026): uma linha por item, como a lista de
            capítulos do Lichess. O que se faz a toda hora — abrir, testar — fica na linha; o resto mora no
            "•••" de cada item. Sumiram as frases fixas e o campo solto do nome do capítulo. */}
        <aside className="cartao-vazio flex flex-col gap-4 p-3 lg:min-h-0 lg:overflow-y-auto">
          <button type="button" data-ordem-da-aula onClick={() => setVendoOrdem(true)} title="Ver e mudar a ordem de todas as etapas" className="foco w-full rounded-md border border-borda px-2 py-1.5 text-left text-xs text-tinta hover:bg-carta-toque">Ordem da aula · {historico.presente.fluxo.length} etapas…</button>

          <section className="flex flex-col gap-1">
            <CabecalhoDaSecao titulo="Introdução">
              {historico.presente.introducoes.length ? null : (
                <BotaoMais rotulo="+ Criar introdução" dado={{ "data-introducao": "nova" }} aoClicar={() => setEditandoIntroducao({ id: null })} />
              )}
            </CabecalhoDaSecao>
            {historico.presente.introducoes.length ? historico.presente.introducoes.map((introducao) => (
              <button key={introducao.id} type="button" data-introducao={introducao.id} onClick={() => setEditandoIntroducao({ id: introducao.id })} title="Abrir a introdução" className="foco flex w-full items-baseline justify-between gap-2 rounded-md px-2 py-2 text-left text-sm text-tinta hover:bg-carta-toque">
                <span className="leading-snug line-clamp-2 break-words">{introducao.titulo}</span>
                <span className="shrink-0 text-xs text-tinta-fraca">{introducao.quadros.length} quadro{introducao.quadros.length === 1 ? "" : "s"}</span>
              </button>
            )) : <p className="px-2 text-xs text-tinta-fraca">Opcional: slides antes dos capítulos.</p>}
          </section>

          <section className="flex flex-col gap-1">
            <CabecalhoDaSecao titulo="Capítulos">
              <BotaoMais rotulo="+ Adicionar capítulo" refDoBotao={botaoAdicionar} aoClicar={() => setAdicionando(true)} />
            </CabecalhoDaSecao>
            <ListaDeCapitulos
              capitulos={capitulosOrdenados}
              atualId={capitulo.id}
              aoEscolher={(item) => { setCapituloId(item.id); setNodeId(item.inicioNodeId); }}
              aoMover={(id, vao) => aplicar({ tipo: "MOVER_CAPITULO", capituloId: id, vao })}
              aoDuplicar={setDuplicandoCapitulo}
              aoExcluir={setExcluindoCapitulo}
              aoRenomear={(id, titulo) => aplicar({ tipo: "RENOMEAR_CAPITULO", capituloId: id, titulo })}
              aoTrocarOrientacao={(id, orientacao) => aplicar({ tipo: "DEFINIR_ORIENTACAO_CAPITULO", capituloId: id, orientacao })}
              aoMudarModo={(id) => setMudandoModo({ tipo: "capitulo", capituloId: id })}
              aoTrocarPosicao={(id) => {
                const alvo = capitulosOrdenados.find((item) => item.id === id);
                if (alvo && alvo.id !== capitulo.id) { setCapituloId(alvo.id); setNodeId(alvo.inicioNodeId); }
                setTrocandoPosicao(true);
              }}
              proveniencia={Object.fromEntries(capitulosOrdenados.flatMap((item) => {
                const dela = historico.presente.analises.find((a) => a.id === item.analiseId);
                const estadoDela = dela ? estadoDaProveniencia(dela) : "nao-se-aplica";
                return estadoDela === "nao-se-aplica" ? [] : [[item.id, estadoDela]];
              }))}
              aoProveniencia={(id) => {
                const alvo = capitulosOrdenados.find((item) => item.id === id);
                if (alvo) setRevisandoProveniencia(alvo.analiseId);
              }}
            />
          </section>

          <section className="flex flex-col gap-1">
            <CabecalhoDaSecao titulo="Treinos" />
            {treinosOrdenados.length ? (
              <ol className="flex flex-col gap-0.5" aria-label="Treinos da aula">
                {treinosOrdenados.map((treino) => {
                  const jogar = () => {
                    try {
                      setJogandoTreino({ treinoId: treino.id, titulo: treino.titulo, perfil: treino.perfil, jogavel: treinoJogavel(historico.presente, treino.id, positions) });
                    } catch (erro) {
                      setJogandoTreino({ treinoId: treino.id, titulo: treino.titulo, perfil: treino.perfil, jogavel: null, erro: erro instanceof Error ? erro.message : undefined });
                    }
                  };
                  return (
                    <li key={treino.id} className="flex items-stretch rounded-md hover:bg-carta-toque">
                      <button
                        type="button"
                        data-treino-id={treino.id}
                        onClick={() => setEditandoTreino(treino.id)}
                        title={`Editar o treino «${treino.titulo}»`}
                        className="foco min-w-0 flex-1 px-2 py-1.5 text-left text-sm text-tinta"
                      >
                        <span className="block leading-snug line-clamp-2 break-words">{treino.titulo}</span>
                        <span className="block text-xs text-tinta-fraca">
                          {treino.ladoAluno === "white" ? "Brancas" : "Pretas"} · {resultadoDoTreinoV2(treino) === "draw" ? "empate" : "vencer"} · {treino.questoes.length} pergunta{treino.questoes.length === 1 ? "" : "s"}
                          {treino.fonte !== "atual" ? <span className="text-aviso-tinta"> · a aula mudou</span> : null}
                        </span>
                      </button>
                      <button type="button" data-jogar-treino-id={treino.id} onClick={jogar} aria-label={`Testar o treino «${treino.titulo}»`} title="Testar como aluno" className="foco flex min-w-8 items-center justify-center rounded text-sm text-tinta-fraca hover:text-tinta">
                        <span aria-hidden>▶</span>
                      </button>
                      <Menu
                        rotulo={`Ações do treino «${treino.titulo}»`}
                        classeDoBotao="foco flex h-full min-w-8 items-center justify-center rounded text-tinta-fraca hover:text-tinta"
                        botao={<span aria-hidden>•••</span>}
                        itens={[
                          { rotulo: "Editar treino", aoEscolher: () => setEditandoTreino(treino.id) },
                          { rotulo: "Testar como aluno", aoEscolher: jogar },
                          { rotulo: "Ligação com a aula…", ajuda: treino.fonte === "atual" ? "Refazer a partir da aula, ou deixar independente" : "A aula mudou depois deste treino", aoEscolher: () => setPropriedadeTreino(treino.id) },
                          { rotulo: "Mudar para…", ajuda: "capítulo ou introdução", aoEscolher: () => setMudandoModo({ tipo: "treino", treinoId: treino.id }) },
                          { rotulo: "Excluir treino…", perigo: true, separar: true, aoEscolher: () => { if (window.confirm(`Excluir o treino «${treino.titulo}»? Ele sai da aula e da ordem das etapas. O Desfazer devolve.`)) aplicar({ tipo: "EXCLUIR_TREINO", treinoId: treino.id }); } },
                        ]}
                      />
                    </li>
                  );
                })}
              </ol>
            ) : <p className="px-2 text-xs text-tinta-fraca">Nasce de um lance: ••• → Criar treino daqui.</p>}
          </section>

          {/* §17.1 (fatia 10): a prática, a avaliação da aula. */}
          <section className="flex flex-col gap-1">
            <CabecalhoDaSecao titulo="Prática">
              {/* Nenhuma, uma ou várias (trava 9, 15/9/2026): o botão fica sempre. */}
              <BotaoMais rotulo="+ Criar prática" dado={{ "data-pratica": "nova" }} aoClicar={() => setEditandoPratica("nova")} />
            </CabecalhoDaSecao>
            {historico.presente.praticas.length ? historico.presente.praticas.map((pratica) => (
              <div key={pratica.id} className="flex items-stretch rounded-md hover:bg-carta-toque">
                <button type="button" data-pratica={pratica.id} onClick={() => setEditandoPratica(pratica.id)} title={`Editar a prática «${pratica.titulo}»`} className="foco min-w-0 flex-1 px-2 py-1.5 text-left text-sm text-tinta">
                  <span className="block leading-snug line-clamp-2 break-words">{pratica.titulo}</span>
                  <span className="block text-xs text-tinta-fraca">{pratica.ladoAluno === "white" ? "Brancas" : "Pretas"} · {pratica.objetivo === "win" ? "vencer" : "empatar"}</span>
                </button>
                <button type="button" onClick={() => setJogandoPratica(pratica)} aria-label={`Testar a prática «${pratica.titulo}»`} title="Jogar contra o computador" className="foco flex min-w-8 items-center justify-center rounded text-sm text-tinta-fraca hover:text-tinta">
                  <span aria-hidden>▶</span>
                </button>
              </div>
            )) : <p className="px-2 text-xs text-tinta-fraca">Opcional. Sem prática, o aluno fecha a aula marcando que assistiu.</p>}
          </section>
        </aside>

        <section className="cartao-vazio flex flex-col gap-3 p-3 lg:min-h-0 lg:overflow-y-auto">
          {derivado ? (
            <>
              {/* A barra ocupa o vão sempre, ligada ou não: o tabuleiro não muda de
                  tamanho quando o motor liga (§23.1). */}
              <div className="flex gap-1">
              <BarraDeAvaliacao altura={motor.estado.barra} orientacao={capitulo.orientacao} />
              <div className="relative min-w-0 flex-1">
              <ChessBoard
                fen={derivado.quadro.fen}
                orientation={capitulo.orientacao}
                shapes={motor.shapes}
                turnColor={toBoardColor(jogo.turn())}
                dests={legalDests(jogo)}
                lastMove={derivado.quadro.ultimoLance as [Key, Key] | null}
                check={jogo.inCheck()}
                onMove={mover}
                onSelect={aoClicarNaCasa}
                desenhavel={desenhavel}
                desenhando={desenhando}
                espessuraDeDesenhoUniforme
                revision={historico.passados.length + historico.futuros.length + promocoesDesfeitas}
                overlay={qualidadeSelecionada && derivado.quadro.ultimoLance
                  ? <NagOverlay casa={derivado.quadro.ultimoLance[1] as Key} orientation={capitulo.orientacao} simbolo={SIMBOLOS_DE_QUALIDADE[qualidadeSelecionada]} />
                  : undefined}
              />
              {promocaoPendente ? (
                <PromotionPicker
                  color={jogo.turn() === "w" ? "white" : "black"}
                  onChoose={(peca: PromotionChoice) => {
                    const { orig, dest } = promocaoPendente;
                    setPromocaoPendente(null);
                    jogarLance(`${orig}${dest}${peca}`);
                  }}
                  onCancel={() => {
                    setPromocaoPendente(null);
                    setPromocoesDesfeitas((n) => n + 1);
                  }}
                />
              ) : null}
              </div>
              </div>
              {/* §11.3, "criar variante daqui": a ação não abre janela — ela
                  põe o professor na posição certa e diz o gesto. A dica só
                  aparece quando ele pediu, e some no primeiro lance jogado. */}
              {/* A dica da variante só faz sentido com o tabuleiro no modo de mover
                  peça; com a seta na mão, "jogue no tabuleiro" seria uma instrução
                  que o clique seguinte não cumpre. */}
              {dicaDaVariante && !desenhando ? (
                <p role="status" className="rounded-md border border-metodo-superficie bg-metodo-superficie/10 p-2 text-center text-xs text-metodo-tinta">
                  Jogue no tabuleiro a partir de {nomeDoLance(nodeIdAtual)}: um lance diferente dos que já existem nasce como variante, e a continuação de agora fica onde está.
                </p>
              ) : null}
              {varianteNova && varianteNova === nodeIdAtual ? (
                <p role="status" className="rounded-md border border-metodo-superficie bg-metodo-superficie/10 p-2 text-center text-xs text-metodo-tinta">
                  Nasceu uma variante: {nomeDoLance(nodeIdAtual)}. A continuação que já existia segue como a principal.
                </p>
              ) : null}
              {/* §10.2 e §25: as ferramentas clicáveis, para o desenho ser descoberto
                  sem conhecer Shift/Alt. Os atalhos continuam valendo, e a legenda
                  deles mora no (?) da paleta desde a fatia 9. */}
              <PaletaDeDesenho
                estado={paleta}
                temDesenho={desenhos.length > 0}
                aoTrocarFerramenta={(ferramenta) => mudarPaleta((atual) => escolherFerramenta(atual, ferramenta))}
                aoTrocarCor={(cor) => mudarPaleta((atual) => escolherCor(atual, cor))}
                aoApagar={() => aplicar({ tipo: "DEFINIR_DESENHOS", analiseId: analise.id, nodeId: nodeIdAtual, desenhos: undefined })}
              />
            </>
          ) : (
            /* Sem tabuleiro possível, e dizendo por quê. A lista de problemas acima
               já nomeia o lance; aqui explica-se por que o tabuleiro sumiu, para o
               sumiço não parecer defeito do editor. */
            <p className="p-4 text-sm text-tinta-media">
              O tabuleiro não pode ser montado enquanto houver um lance impossível nesta partida — a posição
              seguinte a ele nunca existiu. A lista acima diz qual é o lance e leva até ele.
            </p>
          )}
        </section>

        <section className="cartao-vazio flex min-h-[32rem] flex-col gap-3 p-3 lg:min-h-0">
          {/* O motor do professor no topo (§23.1): desligado, uma linha só; ligado, cresce
              só as linhas pedidas. O espaço saiu das duas legendas fixas, que foram para
              os (?). */}
          <div className="flex shrink-0 flex-col gap-1 border-b border-borda-fraca pb-2">
            <FaixaDoMotor
              estado={motor.estado}
              ligado={motor.ligado}
              aoAlternar={motor.alternar}
              seta={motor.seta}
              aoAlternarSeta={motor.alternarSeta}
              linhas={motor.linhas}
              aoMudarLinhas={motor.mudarLinhas}
            />
            <LinhasDoMotor estado={motor.estado} quantas={motor.linhas} />
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-2">
            {/* Sem as posições reconstruídas não há SAN nem numeração; o painel cai
                para o UCI cru, que é feio mas legível, em vez de sumir junto com o
                tabuleiro. O professor continua conseguindo clicar no lance errado. */}
            <PainelDeLances
              analise={analise}
              sans={derivado?.sans ?? Object.fromEntries(Object.values(analise.nos).filter((no) => no.uci).map((no) => [no.id, no.uci!]))}
              rotulos={derivado?.rotulos ?? {}}
              selecionado={selecionado.id}
              focar={pedidoDeFoco}
              treinoNoNode={(id) => {
                const percurso = [capitulo.inicioNodeId, ...capitulo.caminho];
                const indice = percurso.indexOf(id);
                return indice < 0
                  ? { disponivel: false, motivo: "este lance está numa variante fora do percurso do capítulo" }
                  : indice === percurso.length - 1
                    ? { disponivel: false, motivo: "não há nenhum lance depois desta posição para virar treino" }
                    : { disponivel: true };
              }}
              onSelecionar={setNodeId}
              onPromover={(parentId, id) => aplicar({ tipo: "PROMOVER_VARIANTE", analiseId: analise.id, parentId, nodeId: id })}
              onAcao={aoAcaoDoLance}
            />
          </div>
          {/* O lance escolhido (revisão de experiência, 14/9/2026). O comentário já aparece na própria lista
              de lances, como no Lichess; aqui só se escreve. Comentário e narração pareciam a mesma coisa
              lado a lado, e viraram duas abas com o nome do que são: o que o aluno lê, e a nota do professor. */}
          <div className="flex flex-col gap-2 border-t border-borda-fraca pt-3 lg:max-h-[45%] lg:overflow-y-auto">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-tinta">{selecionado.uci ? nomeDoLance(selecionado.id) : "Posição inicial"}</p>
              {selecionado.uci ? (
                <div id="simbolos-do-lance" role="group" aria-label="Símbolo do lance" className="flex flex-wrap gap-1">
                  {Object.entries(SIMBOLOS_DE_QUALIDADE).map(([nag, simbolo]) => (
                    <button key={nag} type="button" aria-pressed={selecionado.nags?.includes(Number(nag)) ?? false} onClick={() => aplicar({ tipo: "ALTERNAR_NAG", analiseId: analise.id, nodeId: selecionado.id, nag: Number(nag) })} className={`foco min-h-8 min-w-8 rounded border px-1.5 text-sm ${selecionado.nags?.includes(Number(nag)) ? "border-aviso-superficie bg-aviso-superficie/10 text-aviso-tinta" : "border-borda text-tinta hover:bg-carta-toque"}`}>{simbolo}</button>
                  ))}
                </div>
              ) : null}
            </div>
            {selecionado.revisao ? (
              <p className="flex flex-wrap items-center gap-2 rounded-md border border-aviso-superficie bg-aviso-superficie/10 p-2 text-xs text-aviso-tinta">
                A posição inicial mudou depois que isto foi escrito — releia.
                <button type="button" onClick={() => aplicar({ tipo: "REVISAO_RESOLVIDA", alvo: { analiseId: analise.id, nodeId: selecionado.id } })} className="foco rounded border border-aviso-superficie px-2 py-1">
                  Já reli
                </button>
              </p>
            ) : null}
            <div role="tablist" aria-label="O que escrever neste lance" className="flex gap-1 border-b border-borda-fraca">
              {([["fala", `Fala para o aluno${narracoes.length ? ` (${narracoes.length})` : ""}`], ["nota", `Nota do professor${selecionado.comentario ? " ✓" : ""}`]] as const).map(([aba, rotulo]) => (
                <button
                  key={aba}
                  type="button"
                  role="tab"
                  aria-selected={abaDoLance === aba}
                  onClick={() => setAbaDoLance(aba)}
                  className={`foco -mb-px min-h-8 border-b-2 px-2 text-xs ${abaDoLance === aba ? "border-metodo-tinta font-medium text-tinta" : "border-transparent text-tinta-fraca hover:text-tinta"}`}
                >
                  {rotulo}
                </button>
              ))}
            </div>

            {abaDoLance === "nota" ? (
              <label className="flex flex-col gap-1 text-xs text-tinta-fraca">
                <span className="sr-only">Nota do professor</span>
                <textarea ref={campoDoComentario} aria-label="Nota do professor" key={selecionado.id + (selecionado.comentario ?? "")} defaultValue={selecionado.comentario ?? ""} onBlur={(e) => aplicar({ tipo: "EDITAR_COMENTARIO", analiseId: analise.id, nodeId: selecionado.id, comentario: e.currentTarget.value })} rows={3} className="foco resize-y rounded-md border border-borda bg-papel p-2 text-sm text-tinta" placeholder="Aparece na lista de lances e no PGN." />
              </label>
            ) : (
              <>
                {narracoes.map((narracao, ordem) => (
                  <div key={narracao.id} className="flex flex-col gap-1 text-xs text-tinta-fraca">
                    {narracao.revisao ? (
                      <p className="flex flex-wrap items-center gap-2 rounded-md border border-aviso-superficie bg-aviso-superficie/10 p-2 text-aviso-tinta">
                        A posição inicial mudou depois que esta fala foi escrita.
                        <button type="button" onClick={() => aplicar({ tipo: "REVISAO_RESOLVIDA", alvo: { capituloId: capitulo.id, narracaoId: narracao.id } })} className="foco rounded border border-aviso-superficie px-2 py-1">
                          Já reli
                        </button>
                      </p>
                    ) : null}
                    <textarea
                      aria-label={narracoes.length > 1 ? `Fala ${ordem + 1} de ${narracoes.length} para o aluno` : "Fala para o aluno"}
                      key={narracao.id + narracao.texto}
                      defaultValue={narracao.texto}
                      onBlur={(e) => aplicar({ tipo: "EDITAR_NARRACAO", capituloId: capitulo.id, narracaoId: narracao.id, texto: e.currentTarget.value })}
                      rows={4}
                      className="foco resize-y rounded-md border border-borda bg-papel p-2 text-sm text-tinta"
                      placeholder="Apague o texto para remover esta fala."
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="flex items-center gap-1.5 text-tinta" title="Sem marcar, a aula segue sozinha depois do tempo de leitura">
                        <input type="checkbox" checked={narracao.pausa === "manual"} onChange={(e) => aplicar({ tipo: "DEFINIR_PAUSA_DA_NARRACAO", capituloId: capitulo.id, narracaoId: narracao.id, pausa: e.currentTarget.checked ? "manual" : "temporizada" })} className="foco h-4 w-4 accent-metodo-superficie" />
                        Esperar o aluno clicar em Continuar
                      </label>
                      {narracoes.length > 1 ? (
                        <>
                          <button type="button" aria-disabled={ordem === 0} title={ordem === 0 ? "Já é a primeira fala deste lance" : undefined} aria-label={`Mover a narração ${ordem + 1} para antes`} onClick={() => aplicar({ tipo: "MOVER_NARRACAO", capituloId: capitulo.id, narracaoId: narracao.id, direcao: "acima" })} className="foco min-h-8 rounded border border-borda px-2 text-tinta aria-disabled:opacity-40">↑ Antes</button>
                          <button type="button" aria-disabled={ordem === narracoes.length - 1} title={ordem === narracoes.length - 1 ? "Já é a última fala deste lance" : undefined} aria-label={`Mover a narração ${ordem + 1} para depois`} onClick={() => aplicar({ tipo: "MOVER_NARRACAO", capituloId: capitulo.id, narracaoId: narracao.id, direcao: "abaixo" })} className="foco min-h-8 rounded border border-borda px-2 text-tinta aria-disabled:opacity-40">↓ Depois</button>
                        </>
                      ) : null}
                    </div>
                  </div>
                ))}
                {/* §12.2: criar. Sem esta porta, a narração só existia quando vinha de um PGN importado. */}
                {capitulo && podeNarrar(capitulo, selecionado.id) ? (
                  escrevendoNarracao === `${capitulo.id}:${selecionado.id}` ? (
                    <textarea
                      autoFocus
                      aria-label={narracoes.length ? `Fala ${narracoes.length + 1}, nova` : "Fala para o aluno, nova"}
                      rows={3}
                      onBlur={(e) => {
                        const texto = e.currentTarget.value;
                        setEscrevendoNarracao(null);
                        if (texto.trim()) aplicar({ tipo: "ADICIONAR_NARRACAO", capituloId: capitulo.id, nodeId: selecionado.id, narracaoId: novoIdDeNarracao(historico.presente, selecionado.id), texto });
                      }}
                      className="foco resize-y rounded-md border border-borda bg-papel p-2 text-sm text-tinta"
                      placeholder="O que o aluno lê neste lance. Deixe vazio para desistir."
                    />
                  ) : (
                    <button type="button" onClick={() => setEscrevendoNarracao(`${capitulo.id}:${selecionado.id}`)} className="foco min-h-8 w-fit rounded border border-borda px-2 text-xs text-tinta hover:bg-carta-toque">
                      {narracoes.length ? "+ Outra fala neste lance" : "+ Escrever fala para o aluno"}
                    </button>
                  )
                ) : capitulo ? (
                  <p className="text-xs text-tinta-fraca">Este lance está numa variante: o aluno só assiste à linha do capítulo.</p>
                ) : null}
              </>
            )}
          </div>
        </section>
      </div>
    </main>
    </VistaDoTabuleiro>
  );
}

/** O título de uma seção da coluna da aula, com a ação de acrescentar à direita. */
function CabecalhoDaSecao({ titulo, children }: { titulo: string; children?: ReactNode }) {
  return (
    <div className="flex min-h-8 items-center justify-between gap-2 px-2">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-tinta-fraca">{titulo}</h2>
      {children}
    </div>
  );
}

/** O "+" de uma seção. O nome acessível diz o que ele cria; na tela, só o sinal. */
function BotaoMais({ rotulo, aoClicar, refDoBotao, dado }: { rotulo: string; aoClicar: () => void; refDoBotao?: RefObject<HTMLButtonElement | null>; dado?: Record<string, string> }) {
  return (
    <button type="button" ref={refDoBotao} aria-label={rotulo} title={rotulo.slice(2)} onClick={aoClicar} {...dado} className="foco flex min-h-8 min-w-8 items-center justify-center rounded-md border border-borda text-base leading-none text-tinta hover:bg-carta-toque">
      <span aria-hidden>+</span>
    </button>
  );
}

/**
 * O "⋯ Mais ações" da barra do topo, com "Atalhos do teclado" no fim. É um componente à parte porque a
 * lista de atalhos mora no contexto do tabuleiro, que só existe dentro da tela do editor.
 */
function MenuMaisAcoes({ itens, refDoBotao }: { itens: ItemDeMenu[]; refDoBotao: RefObject<HTMLButtonElement | null> }) {
  const abrirAjuda = useAbrirAjudaDosAtalhos();
  return (
    <Menu
      rotulo="Mais ações"
      refDoBotao={refDoBotao}
      largura="w-72"
      itens={[...itens.slice(0, -1), { rotulo: "Atalhos do teclado", ajuda: "Também com a tecla ?", aoEscolher: abrirAjuda }, ...itens.slice(-1)]}
    />
  );
}
