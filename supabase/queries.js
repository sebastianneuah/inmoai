import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function saveSearchToSupabase(searchText) {
  const { error } = await supabase
    .from('busquedas')
    .insert([{ texto: searchText }]);

  if (error) console.error('Error guardando búsqueda:', error);
}

