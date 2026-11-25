begin;

-- Aggiorna il modello per le inizializzazioni future. Le categorie registrate restano intatte.
create or replace function public.swm_init_cocktail_categories(target_restaurant uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform 1 from public.swm_restaurants where id = target_restaurant for no key update;
  if not found then
    raise exception 'Ristorante non trovato o accesso negato' using errcode = '42501';
  end if;

  insert into public.swm_cocktail_categories (restaurant_id, name_it, name_en, position)
  select target_restaurant, labels.name_it, labels.name_en, labels.position
  from (values
    ('Cocktail', 'Cocktails', 0),
    ('Signature Cocktail', 'Signature Cocktails', 10),
    ('Aperitivi e Spritz', 'Aperitifs & Spritz', 20),
    ('Birre', 'Beers', 30),
    ('Cocktail analcolici', 'Mocktails', 40),
    ('Soft Drink', 'Soft Drinks', 50),
    ('Distillati', 'Spirits', 60),
    ('Digestivi', 'Digestifs', 70),
    ('Caffetteria', 'Coffee & Hot Drinks', 80)
  ) as labels(name_it, name_en, position)
  where not exists (select 1 from public.swm_cocktail_categories where restaurant_id = target_restaurant)
  on conflict (restaurant_id, name_it) do nothing;
end;
$$;

commit;
