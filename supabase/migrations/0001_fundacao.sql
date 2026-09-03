-- ---------------------------------------------------------------------------
-- F0 — A fundação: quem é o aluno, e o que ele já resolveu.
--
-- Duas tabelas, e nenhuma a mais. Repertório, tarefas, partidas e quiz entram
-- nas fases em que a tela que os usa existir — tabela criada antes da tela é
-- tabela que ninguém sabe se está certa.
--
-- ## O login sem e-mail
--
-- O Supabase Auth exige e-mail e senha. Os alunos têm 8 a 15 anos e não vão
-- ter e-mail. Então o par que o aluno digita é **usuário + PIN**, e o e-mail é
-- sintético: `<usuario>@alunos.olesc.local`. Ele nunca aparece na tela, nunca
-- recebe mensagem, e existe só porque o Auth pede um.
--
-- O `usuario` mora aqui em `perfis`, com `unique`, e é ele que o site consulta.
-- O e-mail é derivado dele por uma função só (`emailDoUsuario`, em
-- `lib/auth/usuario.ts`) — duas receitas para montar o mesmo e-mail seriam duas
-- chances de o aluno não conseguir entrar com o PIN certo.
-- ---------------------------------------------------------------------------

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- perfis
-- ---------------------------------------------------------------------------

create table if not exists public.perfis (
  id          uuid primary key references auth.users (id) on delete cascade,
  usuario     text not null unique,
  nome        text not null,
  papel       text not null default 'aluno' check (papel in ('aluno', 'professor')),
  -- A equipe da OLESC: masculina, feminina, ou nenhuma (o professor).
  equipe      text check (equipe in ('M', 'F')),
  -- O tabuleiro na ordem fixada no congresso técnico. 1 a 6 (4 titulares e até
  -- 2 reservas). Nulo enquanto a escalação não sair — ela sai no Sábado 4.
  tabuleiro   smallint check (tabuleiro between 1 and 6),
  -- O rating estimado na entrada. Serve para escolher a faixa em que a série
  -- de tática começa, não para ranquear ninguém.
  rating      integer,
  criado_em   timestamptz not null default now()
);

comment on table public.perfis is
  'Um por conta. O aluno não se cadastra: o professor cria a conta e entrega usuário e PIN em papel.';

create index if not exists perfis_equipe_idx on public.perfis (equipe);

-- ---------------------------------------------------------------------------
-- tentativas_puzzle
-- ---------------------------------------------------------------------------

create table if not exists public.tentativas_puzzle (
  id          bigint generated always as identity primary key,
  aluno       uuid not null references public.perfis (id) on delete cascade,
  -- O id do puzzle no banco do Lichess (`content/puzzles/<tema>/<faixa>.json`).
  puzzle_id   text not null,
  -- A tag do Lichess pela qual o puzzle foi servido — o tema em que o aluno
  -- **estava**, que nem sempre é o único tema do puzzle.
  tema        text not null,
  acertou     boolean not null,
  tempo_ms    integer not null check (tempo_ms >= 0),
  -- Onde: a série do tema, o aquecimento, a prova, ou o modo torneio.
  modo        text not null default 'serie'
                check (modo in ('aquecimento', 'serie', 'prova', 'torneio')),
  criada_em   timestamptz not null default now()
);

comment on table public.tentativas_puzzle is
  'Uma linha por puzzle tentado. Só o servidor escreve aqui — ver a política de RLS.';

create index if not exists tentativas_aluno_idx on public.tentativas_puzzle (aluno, criada_em desc);
create index if not exists tentativas_tema_idx  on public.tentativas_puzzle (aluno, tema);

-- ---------------------------------------------------------------------------
-- Quem é professor
--
-- A política de `perfis` precisa saber se quem consulta é professor, e essa
-- resposta está **dentro de `perfis`**. Consultar a tabela de dentro da própria
-- política é recursão: o Postgres recusa.
--
-- `security definer` roda a função com os privilégios de quem a criou, o que a
-- isenta de RLS e corta a recursão. `search_path` vazio é o que impede alguém
-- de plantar um `perfis` numa schema própria e sequestrar a resposta.
-- ---------------------------------------------------------------------------

create or replace function public.eh_professor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.perfis
    where id = (select auth.uid()) and papel = 'professor'
  );
$$;

-- ---------------------------------------------------------------------------
-- RLS
--
-- **A gravação de tentativa não tem política nenhuma, e isso é a decisão, não
-- um esquecimento.** Sem política de `insert`, nem o aluno logado nem o
-- anônimo escrevem aqui: a única chave que passa é a `service_role`, que só
-- existe no servidor. Quem grava é a server action, depois de reconferir o
-- lance contra o JSON do puzzle.
--
-- O motivo é simples: a conferência do lance roda no navegador para a resposta
-- ser instantânea, e o navegador é do aluno. Se o `insert` fosse dele, "acertei
-- 300 puzzles" seria uma chamada de rede a escrever.
-- ---------------------------------------------------------------------------

alter table public.perfis             enable row level security;
alter table public.tentativas_puzzle  enable row level security;

drop policy if exists perfis_le_o_seu on public.perfis;
create policy perfis_le_o_seu on public.perfis
  for select to authenticated
  using (id = (select auth.uid()) or public.eh_professor());

drop policy if exists perfis_atualiza_o_seu on public.perfis;
create policy perfis_atualiza_o_seu on public.perfis
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

drop policy if exists tentativas_le_as_suas on public.tentativas_puzzle;
create policy tentativas_le_as_suas on public.tentativas_puzzle
  for select to authenticated
  using (aluno = (select auth.uid()) or public.eh_professor());

-- ---------------------------------------------------------------------------
-- O perfil nasce junto com a conta
--
-- O professor cria a conta pela API de admin, passando nome, usuário, equipe e
-- papel em `raw_user_meta_data`. Este gatilho é o que transforma isso numa
-- linha de `perfis` — sem ele, criar a conta e criar o perfil seriam duas
-- chamadas, e a segunda falharia calada deixando um aluno que entra e não
-- existe.
-- ---------------------------------------------------------------------------

create or replace function public.ao_criar_conta()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfis (id, usuario, nome, papel, equipe, tabuleiro, rating)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'usuario', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'nome', 'Sem nome'),
    coalesce(new.raw_user_meta_data ->> 'papel', 'aluno'),
    nullif(new.raw_user_meta_data ->> 'equipe', ''),
    nullif(new.raw_user_meta_data ->> 'tabuleiro', '')::smallint,
    nullif(new.raw_user_meta_data ->> 'rating', '')::integer
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists ao_criar_conta on auth.users;
create trigger ao_criar_conta
  after insert on auth.users
  for each row execute function public.ao_criar_conta();
