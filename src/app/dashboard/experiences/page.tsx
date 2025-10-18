import { redirect } from 'next/navigation';
import { createClient } from '~/lib/supabase/server';
import { ExperienceList } from '~/components/experiences/ExperienceList';

export default async function ExperiencesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return <ExperienceList />;
}

