import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
// Support the variable already configured in this project.
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_KEY;
export const configurationError = !url || !key
  ? 'Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env, then restart Expo.'
  : key.startsWith('sb_secret_')
    ? 'Use a Supabase publishable key in the app, never a secret key.'
    : null;
export const supabase = configurationError ? null : createClient(url!, key!, {
  auth: {
    ...(Platform.OS !== 'web' ? { storage: AsyncStorage } : {}),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
export function requireSupabase() {
  if (!supabase) throw new Error(configurationError || 'Supabase is not configured.');
  return supabase;
}

