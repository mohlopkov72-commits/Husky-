import { getSupabaseAdmin } from '../../../lib/supabase-server'

const endpoint = 'https://gptunnel.ru/v1/chat/completions'

export async function POST(request) {
  const body = await request.json().catch(() => ({}))
  const messages = Array.isArray(body.messages) ? body.messages.slice(-24) : []
  const visitorId = request.headers.get('x-husky-visitor') || crypto.randomUUID()
  const supabase = getSupabaseAdmin()
  const { data: conversation } = await supabase.from('conversations').insert({ user_id: visitorId, title: 'Arisa chat' }).select('id').single()
  if (conversation) await supabase.from('messages').insert({ conversation_id: conversation.id, user_id: visitorId, role: 'user', content: messages.at(-1)?.content || '' })
  const key = process.env.GPTUNNEL_API_KEY
  if (!key) return Response.json({ error: 'AI backend is not configured.' }, { status: 503 })
  const upstream = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: key }, body: JSON.stringify({ model: process.env.GPTUNNEL_MODEL || 'deepseek-v4-flash', useWalletBalance: true, messages }) })
  const data = await upstream.json().catch(() => ({}))
  const reply = data?.choices?.[0]?.message?.content || data?.reply
  if (!upstream.ok || !reply) return Response.json({ error: 'Arisa temporarily unavailable.' }, { status: upstream.status || 502 })
  if (conversation) await supabase.from('messages').insert({ conversation_id: conversation.id, user_id: visitorId, role: 'assistant', content: reply })
  return Response.json({ reply, visitorId })
}
