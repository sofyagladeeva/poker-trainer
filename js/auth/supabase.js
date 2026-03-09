import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL      = 'https://cmekgmzctrffebmyfrzd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_RDgxtQgHwtHWCUJDc4_6Sg_IxT-_p01';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function signUp(email, password) {
  return supabase.auth.signUp({ email, password });
}

export async function signIn(email, password) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signInWithGoogle() {
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + window.location.pathname }
  });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function saveHandResult({ userId, hand, situationType, heroPos, actionTaken, correct }) {
  return supabase.from('hand_results').insert({
    user_id:        userId,
    hand,
    situation_type: situationType,
    hero_pos:       heroPos,
    action_taken:   actionTaken,
    correct
  });
}
