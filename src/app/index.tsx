import { Redirect } from 'expo-router';

import { useFarm } from '@/data/store';
import { useAuth } from '@/lib/auth';

/** Entry point: sign in first, then onboarding on first launch; worker phones go straight to Worker mode. */
export default function Index() {
  const farm = useFarm();
  const auth = useAuth();
  if (auth.status === 'signedOut') return <Redirect href="/sign-in" />;
  if (!farm.onboarded) return <Redirect href="/onboarding" />;
  if (farm.settings.workerMode) return <Redirect href="/worker" />;
  return <Redirect href="/today" />;
}
