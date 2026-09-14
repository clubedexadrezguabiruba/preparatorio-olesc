/**
 * Importar do Lichess por endereço — especificação §13.2, plano final §11.
 *
 * ## A regra de segurança, numa frase
 *
 * O servidor **nunca busca o endereço que o professor colou**. Ele reconhece a forma do
 * endereço, tira dele só os identificadores (8 letras e números) e **monta** o endereço oficial
 * da API. Um link para qualquer outro lugar — outro site, um IP da rede interna, um `lichess.org`
 * falso com usuário e senha na frente — não chega a virar requisição.
 *
 * ## Os três formatos aceitos, conferidos na especificação oficial em 14/09/2026
 *
 * (`lichess-org/api`, `doc/specs/lichess-api.yaml`)
 *
 * | O professor cola | O servidor busca |
 * |---|---|
 * | `lichess.org/AbCdEfGh` (partida, com ou sem cor e lance) | `GET /game/export/AbCdEfGh?clocks=false&evals=false` |
 * | `lichess.org/study/AbCdEfGh/IjKlMnOp` (capítulo) | `GET /api/study/AbCdEfGh/IjKlMnOp.pgn?orientation=true&clocks=false` |
 * | `lichess.org/study/AbCdEfGh` (estudo inteiro) | `GET /api/study/AbCdEfGh.pgn?orientation=true&clocks=false` |
 *
 * `orientation=true` traz a tag `[Orientation]` de cada capítulo — é por ela que o importador
 * sabe o lado do aluno. Relógio fica fora: não é conteúdo de aula.
 *
 * Sem autenticação, a API só entrega estudo **público**: privado e não listado voltam como
 * "não encontrado", e a mensagem manda exportar o arquivo (OAuth é posterior, §13.2).
 *
 * ## Limites
 *
 * Tamanho (o mesmo teto do documento, 2 MB), tempo máximo, cancelamento pelo professor e
 * redirecionamento seguido à mão, só se continuar em `lichess.org`.
 */

export type EnderecoLichess =
  | { tipo: "partida"; partidaId: string; api: string }
  | { tipo: "capitulo"; estudoId: string; capituloId: string; api: string }
  | { tipo: "estudo"; estudoId: string; api: string };

export const HOST_DA_API = "https://lichess.org";
export const LIMITE_DE_BYTES = 2 * 1024 * 1024;
export const TEMPO_MAXIMO_MS = 20_000;
const MAX_REDIRECIONAMENTOS = 3;

const ID = /^[A-Za-z0-9]{8}$/;

export type LeituraDoEndereco = { ok: true; endereco: EnderecoLichess } | { ok: false; mensagem: string };

/** Reconhece o endereço colado. Não faz rede. */
export function lerEnderecoLichess(colado: string): LeituraDoEndereco {
  const texto = colado.trim();
  if (!texto) return { ok: false, mensagem: "cole o endereço de uma partida, de um capítulo ou de um estudo do Lichess" };
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(texto) ? texto : `https://${texto}`);
  } catch {
    return { ok: false, mensagem: "isto não é um endereço — copie o link da barra do navegador, com o lichess.org na frente" };
  }
  const host = url.hostname.toLowerCase();
  if (url.username || url.password || (host !== "lichess.org" && host !== "www.lichess.org")) {
    return { ok: false, mensagem: "só endereços do lichess.org são aceitos — de outros sites, baixe o PGN e use o arquivo" };
  }
  if (url.port && url.port !== "443") return { ok: false, mensagem: "este endereço do Lichess tem uma porta estranha; copie o link de novo da barra do navegador" };

  const partes = url.pathname.split("/").filter(Boolean);
  if (partes[0] === "study") {
    const [, estudoId, capituloId, ...resto] = partes;
    if (!estudoId || !ID.test(estudoId) || resto.length) return { ok: false, mensagem: "o endereço do estudo não tem a forma lichess.org/study/XXXXXXXX" };
    if (capituloId) {
      if (!ID.test(capituloId)) return { ok: false, mensagem: "o capítulo do estudo não tem a forma lichess.org/study/XXXXXXXX/YYYYYYYY" };
      return { ok: true, endereco: { tipo: "capitulo", estudoId, capituloId, api: `${HOST_DA_API}/api/study/${estudoId}/${capituloId}.pgn?orientation=true&clocks=false` } };
    }
    return { ok: true, endereco: { tipo: "estudo", estudoId, api: `${HOST_DA_API}/api/study/${estudoId}.pgn?orientation=true&clocks=false` } };
  }
  // Partida: /AbCdEfGh, /AbCdEfGhIjKl (id com o sufixo do jogador), /AbCdEfGh/black, /AbCdEfGh#23.
  const primeiro = partes[0] ?? "";
  if (partes.length <= 2 && /^[A-Za-z0-9]{8}([A-Za-z0-9]{4})?$/.test(primeiro) && (!partes[1] || /^(white|black)$/.test(partes[1]))) {
    const partidaId = primeiro.slice(0, 8);
    return { ok: true, endereco: { tipo: "partida", partidaId, api: `${HOST_DA_API}/game/export/${partidaId}?clocks=false&evals=false` } };
  }
  return { ok: false, mensagem: "este endereço do Lichess não é de partida, capítulo nem estudo — os três formatos aceitos são lichess.org/XXXXXXXX, lichess.org/study/XXXXXXXX e lichess.org/study/XXXXXXXX/YYYYYYYY" };
}

export type BuscaDoLichess =
  | { ok: true; pgn: string; endereco: EnderecoLichess; bytes: number }
  | { ok: false; mensagem: string };

type Buscador = (url: string, init: { headers: Record<string, string>; redirect: "manual"; signal: AbortSignal }) => Promise<Response>;

/**
 * Busca o PGN no endereço **montado**. `buscar` é injetável para o teste não depender da rede.
 * `sinal` é o cancelamento do professor; o tempo máximo é somado a ele.
 */
export async function buscarPgnDoLichess(
  colado: string,
  { buscar = fetch as Buscador, sinal, tempoMaximoMs = TEMPO_MAXIMO_MS, limiteDeBytes = LIMITE_DE_BYTES }: { buscar?: Buscador; sinal?: AbortSignal; tempoMaximoMs?: number; limiteDeBytes?: number } = {},
): Promise<BuscaDoLichess> {
  const leitura = lerEnderecoLichess(colado);
  if (!leitura.ok) return leitura;
  const { endereco } = leitura;
  const relogio = new AbortController();
  const prazo = setTimeout(() => relogio.abort(), tempoMaximoMs);
  const cancelar = () => relogio.abort();
  sinal?.addEventListener("abort", cancelar);
  try {
    let alvo = endereco.api;
    for (let salto = 0; ; salto += 1) {
      const resposta = await buscar(alvo, { headers: { Accept: "application/x-chess-pgn" }, redirect: "manual", signal: relogio.signal });
      if (resposta.status >= 300 && resposta.status < 400) {
        const proximo = resposta.headers.get("location");
        if (!proximo || salto >= MAX_REDIRECIONAMENTOS) return { ok: false, mensagem: "o Lichess redirecionou demais; tente de novo mais tarde ou use o arquivo" };
        const url = new URL(proximo, alvo);
        if (url.protocol !== "https:" || url.hostname !== "lichess.org") return { ok: false, mensagem: "o Lichess mandou buscar em outro endereço, fora do lichess.org — por segurança nada foi baixado" };
        alvo = url.toString();
        continue;
      }
      if (resposta.status === 404 || resposta.status === 403 || resposta.status === 401) {
        return {
          ok: false,
          mensagem: endereco.tipo === "partida"
            ? "o Lichess não encontrou esta partida — confira o endereço"
            : "o Lichess não entregou este estudo: ele é privado, não listado ou não existe. Abra o estudo no Lichess, exporte o PGN (menu ☰ → Exportar/Baixar) e suba o arquivo aqui",
        };
      }
      if (resposta.status === 429) return { ok: false, mensagem: "o Lichess pediu para esperar (muitas buscas seguidas); tente de novo em um minuto" };
      if (!resposta.ok) return { ok: false, mensagem: `o Lichess respondeu com erro ${resposta.status}; tente de novo mais tarde ou use o arquivo` };

      const declarado = Number(resposta.headers.get("content-length") ?? "0");
      if (declarado > limiteDeBytes) return { ok: false, mensagem: `o PGN tem ${Math.ceil(declarado / 1024)} KB, e o limite é ${Math.round(limiteDeBytes / 1024)} KB` };
      const pgn = await lerComLimite(resposta, limiteDeBytes);
      if (pgn === null) return { ok: false, mensagem: `o PGN passou de ${Math.round(limiteDeBytes / 1024)} KB e a busca foi interrompida` };
      if (!pgn.trim()) return { ok: false, mensagem: "o Lichess devolveu um PGN vazio — o estudo pode não ter capítulos públicos" };
      return { ok: true, pgn, endereco, bytes: new TextEncoder().encode(pgn).length };
    }
  } catch (erro) {
    if (relogio.signal.aborted) {
      return { ok: false, mensagem: sinal?.aborted ? "busca cancelada — nada foi importado" : `o Lichess não respondeu em ${Math.round(tempoMaximoMs / 1000)} s; tente de novo ou use o arquivo` };
    }
    return { ok: false, mensagem: `não foi possível falar com o Lichess (${erro instanceof Error ? erro.message : "erro de rede"}); confira a internet ou use o arquivo` };
  } finally {
    clearTimeout(prazo);
    sinal?.removeEventListener("abort", cancelar);
  }
}

async function lerComLimite(resposta: Response, limite: number): Promise<string | null> {
  if (!resposta.body) {
    const texto = await resposta.text();
    return new TextEncoder().encode(texto).length > limite ? null : texto;
  }
  const leitor = resposta.body.getReader();
  const pedacos: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await leitor.read();
    if (done) break;
    total += value.byteLength;
    if (total > limite) {
      await leitor.cancel();
      return null;
    }
    pedacos.push(value);
  }
  const junto = new Uint8Array(total);
  let posicao = 0;
  for (const pedaco of pedacos) { junto.set(pedaco, posicao); posicao += pedaco.byteLength; }
  return new TextDecoder("utf-8").decode(junto);
}
