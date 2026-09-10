/**
 * Uma gravação em voo por arquivo, e a mais nova vence.
 *
 * ## O problema que isto resolve
 *
 * A tela do editor muda na hora e grava depois. Se o Doug digitar três letras
 * em meio segundo, saem três pedidos de gravação do **arquivo inteiro**. Sem
 * fila, eles viajam juntos e quem chega por último ganha o disco — e a rede não
 * promete que a ordem de chegada é a ordem de partida. O arquivo pode acabar
 * com o estado do meio da digitação, sem erro nenhum na tela.
 *
 * O Next 16 despacha Server Actions **uma de cada vez por cliente**
 * (`node_modules/next/dist/docs/01-app/02-guides/server-actions.md`), o que
 * ajuda — mas ele serializa *todas* as ações, sem saber qual arquivo cada uma
 * toca, e essa garantia é declarada lá como detalhe de implementação. A fila
 * aqui é por arquivo e é nossa.
 *
 * ## A regra
 *
 * Uma gravação em voo. Enquanto ela não volta, o que chegar fica guardado como
 * **pendente**, e um pendente novo **substitui** o antigo em vez de entrar numa
 * fila. Isso é correto porque cada gravação leva o arquivo inteiro: o estado de
 * dois caracteres atrás não é um passo do caminho, é lixo. O que sobra no fim é
 * sempre o mais novo — que é o que o Doug está vendo na tela.
 *
 * Não há retentativa aqui: quem falha, falha para a tela, e a tela decide (o
 * conflito de `baseHash` é o caso interessante, e ele precisa de resposta
 * humana, não de mais uma tentativa).
 *
 * ## O que a fila faz com um erro que escapa
 *
 * Ela **segura**, e chama `aoFalhar`. Uma promessa rejeitada solta aqui viraria
 * `unhandledRejection` — no navegador, um erro vermelho no console de uma
 * gravação que a tela já tratou; e a fila é justamente o lugar onde ninguém
 * está esperando o resultado (quem chamou `enfileirar` foi embora). Segurar
 * sem avisar seria pior, e por isso o padrão de `aoFalhar` é gritar no console.
 */

export type Fila<T> = {
  /** Pede a gravação deste valor. Volta na hora; a gravação acontece depois. */
  enfileirar: (valor: T) => void;
  /** Tem gravação em voo ou pendente? É o que acende o "salvando…" da tela. */
  ocupada: () => boolean;
  /** Resolve quando não há mais nada em voo nem pendente. Para testes e para o `Ctrl+S`. */
  aguardar: () => Promise<void>;
};

export function filaDeGravacao<T>(
  enviar: (valor: T) => Promise<void>,
  aoFalhar: (erro: unknown, valor: T) => void = (erro) =>
    console.error("[editor] a gravação falhou e ninguém tratou:", erro),
): Fila<T> {
  let emVoo = false;
  let temPendente = false;
  let pendente: T | undefined;
  let ociosos: Array<() => void> = [];

  function avisarOciosos() {
    const fila = ociosos;
    ociosos = [];
    for (const resolver of fila) resolver();
  }

  function bombear() {
    if (emVoo || !temPendente) return;
    const valor = pendente as T;
    temPendente = false;
    pendente = undefined;
    emVoo = true;
    // `void` de propósito: quem chamou `enfileirar` já foi embora. O `catch`
    // vem **antes** do `finally` para que o encerramento da fila aconteça nos
    // dois caminhos e não sobre promessa rejeitada nenhuma para ninguém pegar.
    void enviar(valor)
      .catch((erro: unknown) => aoFalhar(erro, valor))
      .finally(() => {
        emVoo = false;
        if (temPendente) bombear();
        else avisarOciosos();
      });
  }

  return {
    enfileirar(valor: T) {
      pendente = valor;
      temPendente = true;
      bombear();
    },
    ocupada() {
      return emVoo || temPendente;
    },
    aguardar() {
      if (!emVoo && !temPendente) return Promise.resolve();
      return new Promise<void>((resolver) => ociosos.push(resolver));
    },
  };
}
