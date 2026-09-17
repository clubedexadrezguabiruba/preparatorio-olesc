import "server-only";
import { travaDoAluno } from "../aberturas/trava-banco.ts";
import { podeGravarLinha, TRAVA_POR_AULA } from "../aberturas/trava.ts";
import { criarClienteAdmin } from "../supabase/admin.ts";
import { linhaPorId } from "./banco.ts";
import { CORES, type Cor } from "./linhas.ts";
import {
  conferirLinha,
  depoisDoTreino,
  zerado,
  type ProgressoDaLinha,
} from "./treino.ts";

/** O que o navegador manda: o que foi **jogado**, nunca um "acertei". */
export type Treino = {
  cor: Cor;
  abertura: string;
  linhaId: string;
  /** Os lances do aluno, em UCI, na ordem de `meus`. */
  lances: string[];
  /**
   * A aula de abertura de onde a passada veio, quando veio de dentro de uma (17/9/2026). É o que
   * deixa o move trainer da aula gravar as linhas dela antes de a aula estar concluída — ver
   * `podeGravarLinha` em `lib/aberturas/trava.ts`. A página de treino não manda.
   */
  deAula?: string;
};

export type Resultado = { acertou: boolean; progresso: ProgressoDaLinha } | { erro: string };

const ABERTURA = /^[a-z0-9-]+$/;
const UCI = /^[a-h][1-8][a-h][1-8][qrbn]?$/;

/**
 * Confere a passada pela linha e grava o progresso.
 *
 * ## O acerto é derivado aqui, e não recebido
 *
 * O parâmetro é `lances`, e não `acertou`. É a diferença entre um servidor que
 * julga e um que anota o que lhe disseram: com um booleano vindo do navegador,
 * "decorei as 40 linhas" seria uma chamada de rede a escrever — e é este número
 * que vai dizer, no sábado, quem já pode jogar a abertura no torneio.
 *
 * A conferência é a mesma função que o tabuleiro do aluno usou para dizer
 * "certo" na tela (`lib/repertorio/treino.ts`): um juiz só, dois lugares.
 *
 * ## Quem escreve é a chave de serviço
 *
 * `repertorio_progresso` não tem política de `insert` nem de `update` para
 * ninguém (ver `0004_repertorio.sql`). A única chave que passa é a de serviço,
 * que roda só no servidor — e que **ignora toda a RLS**. Ela não sabe quem
 * pediu e não vai perguntar; por isso o `aluno` chega aqui já conferido pela
 * server action, tirado do cookie de sessão, e nunca de um id que veio no corpo
 * da chamada.
 *
 * ## Ler-e-gravar, e não uma função SQL
 *
 * A aritmética dos contadores está em `depoisDoTreino`, em TypeScript testado,
 * e não numa função do Postgres. Duas razões: ela fica num lugar só (a tela
 * mostra as bolinhas com a mesma conta), e não há `revoke execute` para alguém
 * esquecer de escrever na próxima migration.
 *
 * O que se paga: duas abas do mesmo aluno terminando a mesma linha no mesmo
 * segundo perdem **um** incremento. É o pior caso, e ele custa uma repetição a
 * mais numa linha que o aluno acabou de acertar duas vezes.
 *
 * ## A dica pedida antes do erro chega aqui como lista curta
 *
 * O cliente manda os lances até o ponto em que a dica foi pedida, e não um
 * "pedi ajuda". `conferirLinha` reprova lista curta por conta própria — parar
 * no meio não é acertar a linha —, então o custo da dica não precisou de uma
 * linha de código deste lado. É a mesma disciplina do resto do arquivo: o
 * servidor julga lances, e nada mais.
 *
 * ## A trava por aula
 *
 * Linha de aula de abertura não concluída é recusada, com a exceção da passada que vem de dentro
 * da própria aula (`deAula`). O professor passa sempre. A regra é `podeGravarLinha`, pura e testada.
 */
export async function gravarTreino(
  aluno: string,
  treino: Treino,
  papel: "aluno" | "professor" = "aluno",
): Promise<Resultado> {
  const { cor, abertura, linhaId, lances, deAula } = treino;

  if (!CORES.includes(cor)) return { erro: "cor desconhecida" };
  if (typeof abertura !== "string" || !ABERTURA.test(abertura)) return { erro: "treino malformado" };
  if (typeof linhaId !== "string") return { erro: "treino malformado" };
  if (!Array.isArray(lances) || lances.some((l) => typeof l !== "string" || !UCI.test(l))) {
    return { erro: "treino malformado" };
  }

  const linha = await linhaPorId(cor, abertura, linhaId);
  // Linha que não existe naquela abertura: ou o repertório mudou embaixo de uma
  // aba aberta, ou alguém inventou o id. Nos dois casos, não vira linha no banco.
  if (!linha) return { erro: "linha desconhecida" };
  // O teto antes de conferir: uma lista gigante não deve chegar ao juiz.
  if (lances.length > linha.meus.length) return { erro: "treino malformado" };
  if (deAula !== undefined && typeof deAula !== "string") return { erro: "treino malformado" };

  // A trava por aula (17/9/2026), no servidor: esconder o botão não tranca, porque a URL e esta
  // action ficam ao alcance de qualquer aba. O papel vem do perfil lido pela server action.
  if (TRAVA_POR_AULA) {
    const trava = await travaDoAluno({ id: aluno, papel });
    const aulas = trava.cursos.get(`${cor}/${abertura}`) ?? [];
    const liberada = podeGravarLinha({
      aulas,
      linhaId: linha.id,
      concluidas: new Set(trava.concluidas.keys()),
      quem: trava.quem,
      deAula,
      rodadasAbertas: new Set(trava.abertas.keys()),
    });
    if (!liberada) return { erro: "esta linha abre quando você concluir a aula dela" };
  }

  const acertou = conferirLinha(linha, lances);

  const admin = criarClienteAdmin();
  const { data: atual, error: erroAoLer } = await admin
    .from("repertorio_progresso")
    .select("acertos_seguidos, tentativas, erros, aprendida_em, ultima_em, degrau, revisar_em")
    .eq("aluno", aluno)
    .eq("linha", linha.id)
    .maybeSingle();

  if (erroAoLer) return { erro: erroAoLer.message };

  const anterior: ProgressoDaLinha = atual
    ? {
        acertosSeguidos: atual.acertos_seguidos,
        tentativas: atual.tentativas,
        erros: atual.erros,
        aprendidaEm: atual.aprendida_em,
        ultimaEm: atual.ultima_em,
        degrau: atual.degrau,
        revisarEm: atual.revisar_em,
      }
    : zerado();

  const progresso = depoisDoTreino(anterior, acertou, new Date().toISOString());

  const { error } = await admin.from("repertorio_progresso").upsert(
    {
      aluno,
      linha: linha.id,
      acertos_seguidos: progresso.acertosSeguidos,
      tentativas: progresso.tentativas,
      erros: progresso.erros,
      aprendida_em: progresso.aprendidaEm,
      ultima_em: progresso.ultimaEm,
      degrau: progresso.degrau,
      revisar_em: progresso.revisarEm,
    },
    { onConflict: "aluno,linha" },
  );

  if (error) return { erro: error.message };
  return { acertou, progresso };
}
