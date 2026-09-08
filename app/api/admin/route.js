import { getSupabaseAdmin } from '../../../lib/supabase-server'

export async function GET(request) {
  const secret = process.env.ADMIN_SECRET
  if (!secret || request.headers.get('x-admin-secret') !== secret) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = getSupabaseAdmin()
  const [{ data: users }, { data: conversations }, { data: messages }] = await Promise.all([
    supabase.from('profiles').select('id, display_name, created_at').order('created_at', { ascending: false }),
    supabase.from('conversations').select('id, user_id, title, created_at, updated_at').order('updated_at', { ascending: false }),
    supabase.from('messages').select('id, conversation_id, user_id, role, content, created_at').order('created_at', { ascending: false }).limit(500),
  ])
  return Response.json({ users: users || [], conversations: conversations || [], messages: messages || [] })
}
