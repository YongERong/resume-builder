import { redirect } from 'next/navigation';
import { createClient } from '~/lib/supabase/server';

export default async function ProjectsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Redirect to dashboard which now shows projects
  redirect('/dashboard');
}

