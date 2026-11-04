-- Bar Boschetto: eseguire in Supabase > SQL Editor > Run.
-- Corregge soltanto il codice dei conflitti nella funzione esistente.
-- Non modifica dati, revisioni, controlli, autorizzazioni o altre funzioni.
begin;
do $patch$
declare
  target regprocedure := to_regprocedure('public.bb_save_state(bigint,jsonb,boolean)');
  definition text;
begin
  if target is null then raise exception 'Funzione bb_save_state non trovata: nessuna modifica eseguita'; end if;
  definition := pg_get_functiondef(target);
  if position('STATE_CONFLICT' in definition)=0
     or position('IMPORT_REQUIRES_EMPTY_STATE' in definition)=0 then
    raise exception 'Funzione diversa da quella prevista: nessuna modifica eseguita';
  end if;
  if position('''40001''' in definition)>0 then
    execute replace(definition, '''40001''', '''PT409''');
  elsif position('''PT409''' in definition)=0 then
    raise exception 'Codice conflitto non riconosciuto: nessuna modifica eseguita';
  end if;
end
$patch$;
commit;

-- Entrambi i risultati devono essere true.
select
  position('''40001''' in pg_get_functiondef('public.bb_save_state(bigint,jsonb,boolean)'::regprocedure))=0 as codice_40001_rimosso,
  position('''PT409''' in pg_get_functiondef('public.bb_save_state(bigint,jsonb,boolean)'::regprocedure))>0 as conflitto_http_409;
