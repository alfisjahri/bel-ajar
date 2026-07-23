import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://osexzklsavnnijbsmdxa.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_RYpxtOLDMNYAqw62a5DnuA_kar42_dU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
