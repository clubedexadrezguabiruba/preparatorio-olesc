import "server-only";
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
 * "decorei as 42 linhas" seria uma chamada de rede a escrever — e é este número
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
 */
export async function gravarTreino(aluno: string, treino: Treino): Promise<Resultado> {
  const { cor, abertura, linhaId, lances } = treino;

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

  const acertou = conferirLinha(linha, lances);

  const admin = criarClienteAdmin();
  const { data: atual, error: erroAoLer } = await admin
    .from("repertorio_progresso")
    .select("acertos_seguidos, tentativas, erros, aprendida_em, ultima_em")
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
    },
    { onConflict: "aluno,linha" },
  );

  if (error) return { erro: error.message };
  return { acertou, progresso };
}
