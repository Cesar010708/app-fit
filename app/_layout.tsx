import { useEffect, useState, useRef } from 'react';
import { Stack, useRouter } from 'expo-router';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export default function RootLayout() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const router = useRouter();
  const redirected = useRef(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      redirected.current = false;
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session === undefined || redirected.current) return;

    if (!session) {
      redirected.current = true;
      router.replace('/(auth)/login');
      return;
    }

    supabase.from('profiles').select('name').eq('id', session.user.id).single()
      .then(({ data }) => {
        redirected.current = true;
        if (data?.name) router.replace('/(tabs)');
        else router.replace('/onboarding');
      });
  }, [session]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="onboarding" />
    </Stack>
  );
}
