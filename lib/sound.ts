/**
 * O som da série de puzzles — **sintetizado por WebAudio, sem nenhum arquivo de
 * áudio.**
 *
 * ## De onde isto veio, e o que mudou
 *
 * Do **laboratório de finais**, onde os seis sons foram desenhados a partir de
 * medição e aprovados de ouvido. Os corpos de síntese em `VARIANTS` são cópia
 * literal: nenhum número foi tocado. Mexer num timbre aqui faria os dois
 * projetos soarem diferente sem ninguém ter decidido isso — quem quiser mudar
 * um som muda no laboratório, mede na `/sons` de lá, e traz o resultado.
 *
 * Três coisas ficaram para trás de propósito, porque aqui não se desenha som:
 * a rota `/sons`, a medição (`lib/spectrum.ts`, `measureBuffer`,
 * `renderSynthesis`) e a troca de variante em sessão (`overrideVariant`,
 * `playVariant`). O que resta é o que a série usa.
 *
 * **A API pública é síncrona, de propósito.** `playMove()`, `playCheck()` e
 * companhia não devolvem promessa e não pedem `await`: quem chama é o `Serie`
 * no meio de um `useCallback`, e transformar um efeito colateral de som em algo
 * que se espera contaminaria o componente inteiro. Sem arquivo para baixar,
 * isso sai de graça.
 *
 * **Restrição dos navegadores.** Nenhum áudio toca antes de um gesto do usuário.
 * `armAudioOnFirstGesture()` cria e destrava o `AudioContext` no primeiro toque
 * ou tecla da página; depois disso o lance do adversário pode soar sozinho,
 * porque o clique que abriu a série já foi o gesto.
 *
 * A preferência liga/desliga mora no `localStorage` — só ela.
 */

import { findEffect, type EffectName } from "./sound-catalog.ts";

const STORAGE_KEY = "preparatorio-olesc:som";

let context: AudioContext | null = null;
let enabled = true;
let loaded = false;
const listeners = new Set<() => void>();

/* ------------------------------------------------------------------ *
 * Preferência
 * ------------------------------------------------------------------ */

function load(): void {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    enabled = window.localStorage.getItem(STORAGE_KEY) !== "off";
  } catch {
    // Navegador com armazenamento bloqueado: fica ligado, sem quebrar a série.
  }
}

export function isSoundOn(): boolean {
  load();
  return enabled;
}

export function setSoundOn(on: boolean): void {
  load();
  enabled = on;
  try {
    window.localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
  } catch {
    // Sem armazenamento a preferência vale só para esta sessão.
  }
  if (on) resume();
  for (const listener of listeners) listener();
}

export function subscribeSound(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/* ------------------------------------------------------------------ *
 * O contexto de áudio
 * ------------------------------------------------------------------ */

type AudioContextConstructor = typeof AudioContext;

function createContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    return new Ctor();
  } catch {
    return null;
  }
}

function resume(): void {
  context ??= createContext();
  if (context?.state === "suspended") void context.resume();
}

/**
 * Destrava o áudio no primeiro gesto da página. Devolve a função que remove os
 * ouvintes — é o que o `useEffect` do componente precisa devolver.
 *
 * Sem arquivo para baixar, isto voltou a ser uma linha. A versão com amostras
 * fazia `fetch` na montagem e `decodeAudioData` no gesto, em duas fases; a
 * camada inteira saiu quando nenhuma amostra foi aprovada.
 */
export function armAudioOnFirstGesture(): () => void {
  if (typeof window === "undefined") return () => {};
  const unlock = () => resume();
  const options = { once: true, passive: true } as const;
  window.addEventListener("pointerdown", unlock, options);
  window.addEventListener("keydown", unlock, options);
  return () => {
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };
}

/* ------------------------------------------------------------------ *
 * Síntese
 * ------------------------------------------------------------------ */

/**
 * **`BaseAudioContext`, e não `AudioContext`.** É o que permite renderizar a
 * síntese num `OfflineAudioContext` e medi-la com a mesma FFT usada nas
 * referências — a única maneira de conferir um som sem ter ouvido.
 */
type ToneSpec = {
  /** Frequência inicial, em hertz. */
  freq: number;
  /** Frequência final, quando o som desliza. */
  to?: number;
  type?: OscillatorType;
  /** Duração em segundos, incluindo o `hold`. */
  duration: number;
  /** Volume de pico, de 0 a 1. */
  gain: number;
  /** Atraso em relação ao início, em segundos. */
  delay?: number;
  /**
   * Segundos em volume cheio antes da queda começar. Ausente = percussivo, que
   * é o caso de quase tudo aqui. Existe para o zumbido da recusa, que é um
   * **platô** e não um decaimento — ver o corpo de `recusa` em `SYNTHESIS`.
   */
  hold?: number;
  /**
   * Segundos até o pico. O padrão de 8 ms é o do resto da família: abaixo disso
   * o alto-falante estala, e é o suficiente para soar percussivo.
   *
   * Subir este número é o que faz um som soar **macio**. Não é o mesmo que
   * abaixar o agudo: um ataque de 22 ms tira a "unha" do som — o clique do
   * primeiro instante — sem mexer em parcial nenhuma. É a alavanca que a
   * captura de hoje usa.
   */
  attack?: number;
};

function tone(ctx: BaseAudioContext, spec: ToneSpec): void {
  const start = ctx.currentTime + (spec.delay ?? 0);
  const end = start + spec.duration;

  const oscillator = ctx.createOscillator();
  oscillator.type = spec.type ?? "sine";
  oscillator.frequency.setValueAtTime(spec.freq, start);
  if (spec.to !== undefined) oscillator.frequency.exponentialRampToValueAtTime(spec.to, end);

  // Ataque de 8 ms e queda exponencial: sem o ataque o alto-falante estala.
  const envelope = ctx.createGain();
  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.exponentialRampToValueAtTime(spec.gain, start + (spec.attack ?? 0.008));
  if (spec.hold) {
    // Segura no pico até 12 ms do fim, no máximo: o `exponentialRampToValueAtTime`
    // precisa de tempo para descer, senão o corte estala.
    envelope.gain.setValueAtTime(spec.gain, Math.min(start + 0.008 + spec.hold, end - 0.012));
  }
  envelope.gain.exponentialRampToValueAtTime(0.0001, end);

  oscillator.connect(envelope).connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(end + 0.02);
}

type NoiseSpec = {
  duration: number;
  gain: number;
  type: BiquadFilterType;
  /** Frequência de corte do filtro, em hertz. Num `bandpass`, o centro da banda. */
  cutoff: number;
  /**
   * Largura da banda, para `bandpass`: quanto maior, mais estreita. Existe porque
   * um `highpass` abre uma prateleira plana até Nyquist, e com ~900 bins acima de
   * 2 kHz ela domina qualquer média espectral — foi o erro medido que levou o
   * achatamento da captura de 0,023 para 0,498.
   */
  q?: number;
  delay?: number;
  /**
   * Expoente da queda do ruído: 2 apaga rápido (um "toc"), 1 sustenta o dobro do
   * tempo (um chiado que fica). É a alavanca que decide se o ruído aparece só no
   * ataque ou também na cauda.
   */
  shape?: number;
};

/**
 * Um chiado curto e filtrado.
 *
 * **Por que ruído importa aqui, e não é só tempero.** O centro espectral é média
 * ponderada sobre *todos* os bins, e existem ~900 bins acima de 2 kHz contra ~90
 * abaixo. Um som gravado tem um piso de banda larga no agudo que puxa o centroide
 * para cima mesmo quando a parcial dominante é grave — a referência da captura
 * mede 2209 Hz com a parcial mais forte em 215 Hz, o que só é possível assim.
 * Osciladores puros não têm esse piso: a primeira versão de `captura` mediu
 * centroide 957 Hz contra 2209 do alvo justamente por ser limpa demais no alto.
 * É também o que faz um som sintetizado parecer objeto em vez de apito.
 */
function noise(ctx: BaseAudioContext, spec: NoiseSpec): void {
  const start = ctx.currentTime + (spec.delay ?? 0);
  const frames = Math.max(1, Math.floor(ctx.sampleRate * spec.duration));
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  const shape = spec.shape ?? 2;
  for (let i = 0; i < frames; i += 1) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / frames) ** shape;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = spec.type;
  filter.frequency.value = spec.cutoff;
  if (spec.q !== undefined) filter.Q.value = spec.q;

  const envelope = ctx.createGain();
  envelope.gain.value = spec.gain;

  source.connect(filter).connect(envelope).connect(ctx.destination);
  source.start(start);
}

/**
 * Um cacho de parciais tocado em **duas camadas**: um impacto curto e alto, e um
 * anel longo e baixo por baixo dele.
 *
 * Existe porque essa é a forma de um som de captura gravado, e ela não sai de
 * uma camada só. A referência do Chess.com cai 23 dB nos primeiros 30 ms — isso
 * é o impacto — e depois **fica**: um platô perto de −32 dB até os 100 ms, que
 * ainda se ouve aos 200. Uma camada única ou morre cedo demais (e o som fica
 * seco) ou sustenta alto demais (e vira sino).
 *
 * As duas camadas usam **o mesmo cacho**, e isso também é medido: o centroide da
 * referência quase não se move da cabeça para a cauda (2252 → 2165 Hz). Se o
 * anel tivesse só as parciais graves, o som escureceria ao morrer — que é o que
 * a captura anterior fazia (1605 → 735 Hz).
 *
 * O anel entra 12 ms depois do impacto: dá para ouvir o golpe antes de o anel
 * começar, e é o que separa "peça batendo" de "peça ressoando".
 */
function cluster(
  ctx: BaseAudioContext,
  partials: readonly { freq: number; type?: OscillatorType; weight: number }[],
  layers: {
    impact: number;
    ring: number;
    impactMs: number;
    ringMs: number;
    /** Segundos até o pico de cada parcial. Ver `attack` em `ToneSpec`. */
    attack?: number;
    /** Segundos de atraso do golpe inteiro — é o que põe o segundo golpe no ar. */
    delay?: number;
  },
): void {
  const delay = layers.delay ?? 0;
  for (const partial of partials) {
    const spec = {
      freq: partial.freq,
      type: partial.type ?? ("sine" as OscillatorType),
      attack: layers.attack,
    };
    tone(ctx, {
      ...spec,
      duration: layers.impactMs / 1000,
      gain: layers.impact * partial.weight,
      delay,
    });
    tone(ctx, {
      ...spec,
      duration: layers.ringMs / 1000,
      gain: layers.ring * partial.weight,
      delay: delay + 0.012,
    });
  }
}

/** O "toc" da peça na madeira: ruído passa-baixa que apaga rápido. */
function thud(
  ctx: BaseAudioContext,
  duration: number,
  gain: number,
  cutoff: number,
  delay = 0,
): void {
  noise(ctx, { duration, gain, type: "lowpass", cutoff, delay });
}

/**
 * O portão único de todo som da série, em três guardas:
 *
 * 1. preferência desligada → nada;
 * 2. sem contexto, ou contexto travado → nada (é o navegador, não nós);
 * 3. senão, toca a variante escolhida do efeito.
 *
 * O caso 2 inclui o som que dispara no mesmo tique do primeiro gesto: `resume()`
 * é assíncrono, então aquele som sai mudo. É uma perda de um efeito na vida da
 * página, e o preço de não ter API assíncrona no componente da série.
 */
function play(name: EffectName): void {
  if (!isSoundOn()) return;
  resume();
  if (!context || context.state !== "running") return;
  synthesisFor(name)(context);
}

/* ------------------------------------------------------------------ *
 * Os seis efeitos
 * ------------------------------------------------------------------ */

/**
 * As seis sínteses, num mapa em vez de closures soltas — é o que permite * renderizar cada uma num `OfflineAudioContext` e medi-la — é assim que elas foram conferidas no
 * laboratório.
 *
 * **De onde saíram os números de `captura`, `xeque` e `recusa`.** O Doug testou
 * e reprovou os três, e pediu "algo bem parecido, mas não igual" aos sons do
 * Chess.com, apontando os arquivos de referência. Os sons deles são
 * proprietários e **nada deles entra aqui** — o que entra é síntese nossa, com
 * os parâmetros derivados de uma medição: FFT de 2048 pontos com janela de Hann
 * em três fatias (ataque, corpo, cauda), mais envelope RMS em janelas de 5 ms.
 * As medidas estão citadas em cada corpo. Os três diagnósticos que mudaram o
 * desenho:
 *
 * 1. **A captura deles é tonal, não ruído.** Achatamento espectral 0,017 — um
 *    cacho inarmônico ressonante. A versão anterior era estouro de ruído
 *    filtrado, que é outra família de som.
 * 2. **O xeque deles não é melodia, e é curto.** Dois transientes (15 e 25 ms) e
 *    tudo abaixo de −40 dB em 50 ms, com o brilho no ataque. A versão original
 *    eram duas notas 880→1175 Hz, e melodia soa de brinquedo.
 * 3. **A recusa deles é platô, não decaimento.** Fica dentro de 6 dB do pico de
 *    10 a 95 ms e depois cai um penhasco. A versão anterior deslizava 220→120 Hz
 *    decaindo o tempo todo.
 *
 * `lance`, `acerto` e `conclusao` **não mudaram uma linha**: foram aprovados.
 *
 * **Ao medir, confie no RMS e não no pico.** Toda camada de ruído usa
 * `Math.random()`, então cada renderização é uma realização diferente: medindo o
 * `lance` cinco vezes seguidas na `/sons`, o pico deu −16,96 · −16,80 · −15,48 ·
 * −15,70 · −16,15 dBFS — 1,5 dB de espalhamento só por sorteio. O RMS das mesmas
 * cinco variou 0,65 dB. Perseguir uma diferença de 1 dB no pico é perseguir
 * ruído; o equilíbrio entre os efeitos foi ajustado pelo RMS.
 *
 * O equilíbrio de hoje, por RMS, do mais alto para o mais baixo: conclusão −33,4
 * · captura −36,4 · acerto −38,8 · xeque −39,4 · lance −43,0 · recusa −44,8. A
 * captura fica 6,5 dB acima do lance e o xeque 3,6 dB, que é a ordem pedida; a
 * recusa é a mais baixa das seis, porque errar tem de ser barato.
 *
 * **Cada efeito tem uma ou mais variantes**, com id `v1`, `v2`, … A que toca é a
 * do `chosenVariant` do catálogo. Aqui cada efeito tem uma só — a escolhida; as
 * descartadas continuam clicáveis na `/sons` do laboratório, com as medidas,
 * porque é lá que um som volta a ser questionado.
 */
/**
 * Os dois golpes da captura. Cada peça tem o seu cacho, e o segundo é **mais
 * grave** que o primeiro: é a peça capturada pousando depois de ser empurrada.
 *
 * Não há parcial nenhuma acima de 800 Hz nos dois, e isso é a escolha, não um
 * descuido — ver a história no comentário de `captura`.
 */
const GOLPE_DA_PECA = [
  { freq: 112, type: "triangle" as OscillatorType, weight: 1.0 },
  { freq: 336, weight: 0.42 },
  { freq: 520, weight: 0.3 },
  { freq: 760, weight: 0.18 },
] as const;

const GOLPE_DA_CAPTURADA = [
  { freq: 96, type: "triangle" as OscillatorType, weight: 1.0 },
  { freq: 288, weight: 0.38 },
  { freq: 448, weight: 0.24 },
] as const;

export const VARIANTS: Record<EffectName, Record<string, (ctx: BaseAudioContext) => void>> = {
  lance: {
    /** Peça pousando: um toc seco e grave. Aprovado — não mexer. */
    v1: (ctx) => {
      thud(ctx, 0.05, 0.22, 1100);
      tone(ctx, { freq: 190, to: 130, type: "triangle", duration: 0.07, gain: 0.16 });
    },
  },

  /**
   * Captura: **duas peças graves se tocando.**
   *
   * Este som levou quatro reprovações, e a lição que sobrou não é sobre timbre —
   * é sobre método:
   *
   * | | o que era | alvo | veredito |
   * |---|---|---|---|
   * | v1 | um golpe, cacho 215–1464 Hz sobre ruído | `capture.mp3` do Chess.com | "horrível" |
   * | v3 | duplo toque claro, 28 ms, brilho 1000 Hz | `Capture.mp3` do Lichess | reprovada em uso |
   * | v4 | duas camadas, anel de 240 ms, brilho 2150 | `capture.mp3` do Chess.com | reprovada |
   * | v5 | igual à v4, anel de 160 ms | `capture.mp3` do Chess.com | reprovada |
   * | **v6** | **dois golpes graves, nada acima de 800 Hz** | **nenhum** | **aprovada** |
   *
   * As três primeiras eram cada vez mais fiéis à referência — a v4 fechou o
   * envelope e o centroide do Chess.com quase em cima (−40 dB em 100 ms contra
   * 105; brilho 2152 contra 2252) — e **nenhuma foi aprovada**. Fidelidade não
   * era o pedido: o pedido era um som que não incomode uma criança resolvendo
   * vinte puzzles seguidos no celular. As duas referências são de sites onde o
   * som toca uma vez por lance de uma partida, não vinte vezes em cinco minutos.
   *
   * **O que a v6 mantém da medição** é a única coisa que se provou estrutural: a
   * captura são **dois** impactos, não um — a peça que empurra a outra e depois
   * pousa, que foi o que a curva de envelope do Lichess mostrou (golpe em 0 ms,
   * outro em 35, a −10 dB). O resto desceu: nada acima de 800 Hz nos dois
   * cachos, contra parciais até 6100 Hz na v4. O centro espectral mede 430 Hz,
   * onde a v3 media 1000 e a v4 media 2150.
   *
   * **Como foi escolhida.** Seis hipóteses graves, todas niveladas em −38,5
   * dBFS para a comparação ser de timbre e não de volume, ouvidas sozinhas e
   * dentro de uma mini-partida. As cinco descartadas, para ninguém repetir o
   * experimento: madeira seca (brilho 376, 70 ms) · a mesma com anel de 380 ms
   * (407, 210 ms) · feltro, sem ruído e com ataque de 22 ms (278, 105 ms) ·
   * suave e curta, sem anel (362, 55 ms) · a v3 um tom abaixo (604, 95 ms).
   *
   * **O id `v6` é rótulo histórico**, não índice: é o nome pelo qual a decisão
   * foi tomada, e renomear faria a conversa não bater mais com o código.
   */
  captura: {
    v6: (ctx) => {
      // O golpe da peça que come. O corte do ruído em 900 Hz é o que tira o
      // "tic" de cima do impacto: o mesmo thud a 3000 Hz soa como unha na mesa.
      thud(ctx, 0.014, 0.0805, 900);
      cluster(ctx, GOLPE_DA_PECA, {
        impact: 0.249,
        ring: 0.0146,
        impactMs: 60,
        ringMs: 150,
        // 10 ms em vez de 8: dois milissegundos que tiram a borda do ataque sem
        // tirar a percussão. É a alavanca do "macio" — ver `attack` em ToneSpec.
        attack: 0.01,
      });
      // A peça capturada pousando, 34 ms depois: mais grave, mais fraca e com o
      // ataque ainda mais lento. É a segunda peça, não um eco da primeira.
      thud(ctx, 0.012, 0.0439, 800, 0.034);
      cluster(ctx, GOLPE_DA_CAPTURADA, {
        impact: 0.139,
        ring: 0.0117,
        impactMs: 70,
        ringMs: 170,
        attack: 0.012,
        delay: 0.034,
      });
    },
  },

  /**
   * Xeque: um toque **curto** e brilhante, com dois transientes.
   *
   * **A leitura errada que me custou uma reprovação.** A versão anterior durava
   * 170 ms e ficava ressoando. Eu tinha tomado o centroide de 3576 Hz medido a
   * **100 ms** como prova de uma "cauda brilhante" e construído uma cauda longa.
   * Mas a referência decai 40 dB em 35 ms: a 100 ms ela já está 40 dB abaixo, e
   * aquele 3576 Hz é o espectro de um resíduo quase inaudível. Medir no lugar
   * errado é pior do que não medir.
   *
   * O que a curva de envelope da referência diz, em janelas de 5 ms e dB
   * relativos ao pico:
   *
   * ```
   *   -32 -27  -3   0  -19 -14 -25 -26 -37 -39 -40
   *     0   5  10  15   20  25  30  35  40  45  50 ms
   * ```
   *
   * Dois picos — 15 ms e 25 ms — e **tudo abaixo de −40 dB em 50 ms**. E na fatia
   * de corpo, a 30 ms, o centroide mede 2637 Hz contra 3613 Hz do ataque: o som
   * **escurece** enquanto morre, como qualquer impacto. O brilho está no ataque,
   * não no que sobra. Parciais medidas no ataque: 668 · 883 · 1055 · 1335 · 1464,
   * mais 2304 no segundo transiente.
   */
  xeque: {
    /**
     * **v2 — mais brilhante. Aprovada como definitiva.**
     *
     * O Doug ouviu quatro hipóteses na `/sons` e escolheu esta. A ideia: o que
     * faltava às tentativas anteriores era brilho — a referência mede centro
     * espectral de 3613 Hz no ataque, e esta variante mede 3683. O balanço é o
     * inverso do óbvio: cacho grave enxuto, grupo agudo dominante, e o corte do
     * ruído de impacto em 5000 Hz em vez de 3200.
     *
     * Medida: 30 ms audíveis, −40 dB em 25, RMS −39,4 dBFS, centroide 3683 Hz,
     * achatamento 0,082, parciais 4414 · 2950 · 2304 · 1055 · 3919 Hz.
     *
     * **O id continua `v2` de propósito**, e não foi renumerado para `v1`: é o
     * nome pelo qual a decisão foi tomada, e renomear faria a conversa não bater
     * mais com o código.
     *
     * **As três hipóteses descartadas**, com as medidas, para ninguém repetir o
     * experimento:
     *
     * | | hipótese | audível | centroide | achatamento |
     * |---|---|---|---|---|
     * | v1 | impacto grave + cacho 668–1464 Hz + agudos discretos | 35 ms | 2553 Hz | 0,061 |
     * | v3 | tinido de barra metálica (520 · 1435 · 2808 · 4643 Hz) | 55 ms | 1799 Hz | 0,009 |
     * | v4 | o som de lance mais um marcador agudo (a proposta do Lichess, issue 8365) | 50 ms | 2053 Hz | 0,029 |
     *
     * A v4 acertava o achatamento do alvo (0,029 contra 0,028) e a v3 era a mais
     * tonal das quatro; nenhuma das duas tinha o brilho. Vale registrar que
     * centroide e achatamento **não** se acertam juntos quando o brilho vem de
     * ruído — ver a nota de `noise()`.
     */
    v2: (ctx) => {
      // Os ganhos estão 1,27× acima do primeiro desenho (+2,1 dB), de quando as
      // quatro variantes foram igualadas em RMS para a comparação ser de timbre e
      // não de volume. O nível resultante — −39,4 dBFS — é o que fica: 3,5 dB
      // acima do lance e 3 dB abaixo da captura, que é a ordem pedida.
      thud(ctx, 0.01, 0.127, 5000, 0.005);
      tone(ctx, { freq: 245, to: 205, type: "triangle", duration: 0.024, gain: 0.114 });
      // O cacho grave fica em segundo plano.
      tone(ctx, { freq: 883, type: "sine", duration: 0.03, gain: 0.076 });
      tone(ctx, { freq: 1055, type: "sine", duration: 0.028, gain: 0.108 });
      tone(ctx, { freq: 1464, type: "sine", duration: 0.026, gain: 0.095 });
      // E o grupo agudo manda. São parciais **discretas**, não ruído: é o que põe
      // massa em 2–6 kHz sem espalhar energia por centenas de bins.
      tone(ctx, { freq: 2304, type: "sine", duration: 0.026, gain: 0.165 });
      tone(ctx, { freq: 2950, type: "sine", duration: 0.024, gain: 0.19 });
      tone(ctx, { freq: 3900, type: "sine", duration: 0.02, gain: 0.152 });
      tone(ctx, { freq: 5100, type: "sine", duration: 0.016, gain: 0.108 });
      tone(ctx, { freq: 6400, type: "sine", duration: 0.013, gain: 0.07 });
      // Segundo transiente, a 15 ms: o segundo pico da curva de envelope da
      // referência, curto e mais agudo que o primeiro.
      thud(ctx, 0.008, 0.064, 7000, 0.015);
      tone(ctx, { freq: 4400, type: "sine", duration: 0.018, gain: 0.089, delay: 0.015 });
    },
  },
  recusa: {
    v1: (ctx) => {
      // Os ganhos são baixos por medida, não por gosto: a primeira versão usava
      // 0,085 / 0,026 / 0,020 e mediu **RMS −37,35 dBFS — o segundo mais alto dos
      // seis**, quando a recusa tem de ser o mais baixo. Pico enganava (era o mais
      // baixo), mas um platô de 90 ms sustenta energia que um "toc" de 45 ms não
      // sustenta, e é o RMS que acompanha o que se percebe como volume. Estes
      // valores são os de então multiplicados por 0,45, ou seja −7 dB.
      tone(ctx, { freq: 115, type: "sawtooth", duration: 0.095, gain: 0.038, hold: 0.068 });
      tone(ctx, { freq: 575, type: "sine", duration: 0.09, gain: 0.012, hold: 0.064 });
      tone(ctx, { freq: 690, type: "sine", duration: 0.09, gain: 0.009, hold: 0.064 });
    },
  },

  acerto: {
    /** Lance certo: dois graus subindo. Aprovado — não mexer. */
    v1: (ctx) => {
      tone(ctx, { freq: 660, type: "sine", duration: 0.09, gain: 0.14 });
      tone(ctx, { freq: 880, type: "sine", duration: 0.12, gain: 0.13, delay: 0.08 });
    },
  },

  /**
   * Xeque-mate: **duas batidas, a segunda mais grave.**
   *
   * O Doug pediu um som próprio para o mate — até aqui ele tocava o acorde de
   * `conclusao` — e apontou o `game-end.mp3` do Chess.com como referência. O
   * arquivo é proprietário e **nada dele entra no projeto**: o que entra são as
   * medidas abaixo, e síntese nossa escrita a partir delas. Alterar o arquivo
   * deles "um por cento" não faria outra obra — faria obra **derivada**, que é
   * exatamente o que a licença deles proíbe. Medir e recompor, não.
   *
   * O que a medição diz, em janelas de 5 ms e dB relativos ao pico:
   *
   * ```
   *    0 -12 -43 -53 … -49  -1  -4 -20 -42
   *    0   5  10  15 … 120 125 130 135 140 ms
   * ```
   *
   * Duas batidas curtíssimas — −40 dB em 10 ms cada — separadas por **125 ms**
   * de quase silêncio, a segunda tão alta quanto a primeira. E a direção que
   * decide o gesto: o centroide cai de 862 Hz na primeira para 484 Hz na
   * segunda. **Desce.** É o que faz aquilo soar como "acabou" em vez de um
   * lance duplo: a segunda batida é mais grave, mais pesada, e fecha.
   *
   * Parciais medidas: 609 · 1008 · 1125 · 1430 · 1758 Hz na primeira; 375 ·
   * 586 · 703 · 211 na segunda. Achatamento 0,008 — tonal, quase sem ruído.
   *
   * A hipótese descartada, para ninguém repetir o experimento: uma **v2** com as
   * mesmas duas batidas e uma nota de 98 Hz atravessando por baixo, sustentada
   * 200 ms além da segunda batida (audível 335 ms contra 130 da v1, RMS 1 dB
   * acima). Era o mate com mais peso; o Doug ouviu as duas e ficou com a seca.
   */
  mate: {
    v1: (ctx) => {
      // Batida 1: o cacho claro, curto.
      thud(ctx, 0.01, 0.06, 2200);
      tone(ctx, { freq: 122, to: 110, type: "triangle", duration: 0.13, gain: 0.15 });
      tone(ctx, { freq: 609, type: "sine", duration: 0.1, gain: 0.13 });
      tone(ctx, { freq: 1008, type: "sine", duration: 0.075, gain: 0.085 });
      tone(ctx, { freq: 1430, type: "sine", duration: 0.055, gain: 0.05 });
      // Batida 2, 125 ms depois e mais grave: a direção medida na referência.
      // Dura o dobro da primeira — é a que fica no ar, e é ela que fecha.
      thud(ctx, 0.012, 0.07, 1600, 0.125);
      tone(ctx, { freq: 96, to: 84, type: "triangle", duration: 0.22, gain: 0.16, delay: 0.125 });
      tone(ctx, { freq: 375, type: "sine", duration: 0.2, gain: 0.14, delay: 0.125 });
      tone(ctx, { freq: 586, type: "sine", duration: 0.15, gain: 0.09, delay: 0.125 });
      tone(ctx, { freq: 703, type: "sine", duration: 0.11, gain: 0.06, delay: 0.125 });
    },

  },

  conclusao: {
    /** Etapa concluída: o acorde de dó maior, quebrado. Aprovado — não mexer. */
    v1: (ctx) => {
      tone(ctx, { freq: 523.25, type: "sine", duration: 0.16, gain: 0.15 });
      tone(ctx, { freq: 659.25, type: "sine", duration: 0.16, gain: 0.14, delay: 0.11 });
      tone(ctx, { freq: 783.99, type: "sine", duration: 0.34, gain: 0.14, delay: 0.22 });
    },
  },
};

/**
 * Qual variante toca neste efeito. A escolha é uma linha de `chosenVariant` no
 * catálogo, escrita à mão depois da audição — não há troca em tempo de execução:
 * a bancada que comparava variantes ficou no laboratório.
 */
function chosenVariantFor(effect: EffectName): string {
  return findEffect(effect).chosenVariant;
}

/**
 * O corpo de síntese que toca. Cai na **primeira variante declarada** se o id não
 * existir, em vez de explodir: um catálogo com id errado tem de soar, não de
 * emudecer a série.
 *
 * A reserva não pode ser `bodies.v1`: o `xeque` foi resolvido na `v2` e não tem
 * `v1` — os ids são rótulos históricos da decisão, não índices.
 */
function synthesisFor(effect: EffectName) {
  const bodies = VARIANTS[effect];
  return bodies[chosenVariantFor(effect)] ?? Object.values(bodies)[0];
}

/** Peça pousando: um toc seco e grave. */
export function playMove(): void {
  play("lance");
}

/** Captura: mais áspera e mais longa que um lance comum. */
export function playCapture(): void {
  play("captura");
}

/** Xeque: o lance com brilho, para acordar. */
export function playCheck(): void {
  play("xeque");
}

/** Recusa: um zumbido baixo. Nunca estridente — errar aqui é barato. */
export function playRefusal(): void {
  play("recusa");
}

/** Puzzle resolvido sem mate: dois graus subindo. */
export function playSuccess(): void {
  play("acerto");
}

/** Xeque-mate: as duas batidas, a segunda mais grave. */
export function playMate(): void {
  play("mate");
}

/** A rodada inteira concluída: o acorde de dó maior, quebrado. */
export function playComplete(): void {
  play("conclusao");
}

/**
 * O som certo para um lance, pelo que o lance foi.
 *
 * **Mate não passa por aqui**: quem dá mate toca `playComplete()`, e não o xeque.
 * Ver como o `Serie` chama — é a mesma regra do laboratório.
 */
export function playForMove({
  capture = false,
  check = false,
}: {
  capture?: boolean;
  check?: boolean;
}): void {
  if (check) playCheck();
  else if (capture) playCapture();
  else playMove();
}
