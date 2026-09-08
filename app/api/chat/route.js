import { getSupabaseAdmin } from '../../../lib/supabase-server'

const endpoint = 'https://gptunnel.ru/v1/chat/completions'

export async function POST(request) {
  const body = await request.json().catch(() => ({}))
  const messages = Array.isArray(body.messages) ? body.messages.slice(-24) : []
  const visitorId = request.headers.get('x-husky-visitor') || crypto.randomUUID()
  const supabase = getSupabaseAdmin()
  const userContent = messages.at(-1)?.content || ''
  const { data: conversation, error: conversationError } = await supabase
    .from('conversations')
    .insert({ user_id: visitorId, title: 'Arisa chat' })
    .select('id')
    .single()

  if (conversationError) {
    console.error('[v0] Failed to create conversation:', conversationError.message)
    return Response.json({ error: 'Не удалось сохранить диалог.' }, { status: 500 })
  }

  const { error: userMessageError } = await supabase.from('messages').insert({
    conversation_id: conversation.id,
    user_id: visitorId,
    role: 'user',
    content: userContent,
  })

  if (userMessageError) {
    console.error('[v0] Failed to save user message:', userMessageError.message)
    return Response.json({ error: 'Не удалось сохранить сообщение.' }, { status: 500 })
  }

  const key = process.env.GPTUNNEL_API_KEY
  if (!key) return Response.json({ reply: 'Сообщение сохранено. AI backend пока не настроен.', visitorId }, { status: 200 })
  const upstream = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: key }, body: JSON.stringify({ model: process.env.GPTUNNEL_MODEL || 'deepseek-v4-flash', useWalletBalance: true, messages }) })
  const data = await upstream.json().catch(() => ({}))
  const reply = data?.choices?.[0]?.message?.content || data?.reply
  if (!upstream.ok || !reply) return Response.json({ error: 'Arisa temporarily unavailable.' }, { status: upstream.status || 502 })
  const { error: assistantMessageError } = await supabase.from('messages').insert({
    conversation_id: conversation.id,
    user_id: visitorId,
    role: 'assistant',
    content: reply,
  })
  if (assistantMessageError) console.error('[v0] Failed to save assistant message:', assistantMessageError.message)
  return Response.json({ reply, visitorId })
}
