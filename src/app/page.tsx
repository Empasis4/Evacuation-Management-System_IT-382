import { redirect } from 'next/navigation';

/** Root page — redirect straight to dashboard */
export default function RootPage() {
  redirect('/dashboard');
}
