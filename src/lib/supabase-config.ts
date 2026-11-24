export function supabaseConfig() {
  // Entrambe le variabili servono al server e vengono lette all'avvio dell'app.
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY } = process.env;
  const url = NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  return url && key ? { url, key } : null;
}
