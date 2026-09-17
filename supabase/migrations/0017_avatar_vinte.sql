-- ---------------------------------------------------------------------------
-- 0017 — Vinte avatares (Doug, 17/9/2026: "mais 10, diferentes e criativos").
--
-- A 0016 já foi aplicada com o `check` dos dez primeiros, e migração aplicada não
-- se edita. Esta só troca a lista: os dez de antes continuam valendo, então
-- nenhuma linha gravada fica inválida — a troca é aditiva.
--
-- A lista tem de bater com `lib/avatar/avatares.ts`; `avatares.test.ts` lê a
-- última migração que define `perfis_avatar_valido` e compara.
-- ---------------------------------------------------------------------------

alter table public.perfis drop constraint if exists perfis_avatar_valido;
alter table public.perfis
  add constraint perfis_avatar_valido check (
    avatar is null or avatar in ('peao-heroi', 'peao-ninja', 'peao-promovido', 'torre-oculos', 'torre-foguete', 'cavalo-dj', 'cavalo-unicornio', 'bispo-soneca', 'dama-cafe', 'rei-sufoco', 'peao-mergulho', 'peao-skate', 'torre-farol', 'torre-bolo', 'cavalo-detetive', 'cavalo-astronauta', 'bispo-mago', 'bispo-pirata', 'dama-chiclete', 'rei-pipoca')
  );
