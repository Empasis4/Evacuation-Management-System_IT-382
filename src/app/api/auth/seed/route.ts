import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET() {
  const log: string[] = [];
  try {
    log.push('Start seeding');
    const supabase = createServiceClient();
    const email = 'admin@gmail.com';
    const password = 'password123';

    log.push('Calling createUser');
    const { data: userData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: 'System Administrator' }
    });

    let userId = userData?.user?.id;

    if (authError) {
      log.push('Auth error: ' + authError.message);
      const { data: listData, error: listError } = await supabase.auth.admin.listUsers();
      if (listError) {
        log.push('List users error: ' + listError.message);
        throw listError;
      }
      userId = listData.users.find(u => u.email === email)?.id;
      log.push('Found existing user ID: ' + userId);
    }

    if (!userId) {
      return NextResponse.json({ success: false, log, error: 'Could not resolve user ID' });
    }

    log.push('Upserting profile');
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({ id: userId, full_name: 'System Administrator', role: 'admin' });

    if (profileError) {
      log.push('Profile error: ' + profileError.message);
      throw profileError;
    }

    return NextResponse.json({ success: true, log, message: 'Admin account is active' });
  } catch (err: any) {
    return NextResponse.json({ success: false, log, error: err.message || String(err) });
  }
}
