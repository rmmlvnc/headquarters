import { requireSupabase } from './supabase';
export async function signIn(email: string, password: string) {
  const { data, error } = await requireSupabase().auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error) throw error;
  if (!data.session) throw new Error('Login did not return a session. Please retry.');
  return data.session;
}
export async function registerMember(input: { email: string; password: string; fullName: string; mobileNumber: string }) {
  const { data, error } = await requireSupabase().auth.signUp({
    email: input.email.trim().toLowerCase(), password: input.password,
    options: { data: { full_name: input.fullName.trim(), mobile_number: input.mobileNumber.trim() } },
  });
  if (error) throw error;
  return data;
}
export async function signOut() {
  const { error } = await requireSupabase().auth.signOut({ scope: 'local' });
  if (error) throw error;
}
export function authError(error: unknown) {
  return error instanceof Error ? error.message : 'Unable to connect. Please try again.';
}
