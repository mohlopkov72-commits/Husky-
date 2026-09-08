'use client'

import { useState } from 'react'

export default function AdminPage() {
  const [secret, setSecret] = useState('')
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function loadDashboard(event) {
    event.preventDefault()
    setLoading(true)
    setError('')
    const response = await fetch('/api/admin', { headers: { 'x-admin-secret': secret } })
    const payload = await response.json().catch(() => ({}))
    setLoading(false)
    if (!response.ok) {
      setData(null)
      setError('Неверный секрет администратора.')
      return
    }
    setData(payload)
  }

  return (
    <main style={{ minHeight: '100vh', background: '#081018', color: '#e6f0f5', padding: 32, fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <h1 style={{ marginBottom: 8 }}>Huskyweb — админ-панель</h1>
        <p style={{ color: '#9db0bb', marginTop: 0 }}>Пользователи и сообщения Arisa из Supabase.</p>
        <form onSubmit={loadDashboard} style={{ display: 'flex', gap: 12, margin: '28px 0' }}>
          <input aria-label="Секрет администратора" type="password" value={secret} onChange={(event) => setSecret(event.target.value)} placeholder="ADMIN_SECRET" style={{ flex: 1, maxWidth: 420, padding: 12, borderRadius: 8, border: '1px solid #29404e', background: '#101d26', color: 'inherit' }} />
          <button type="submit" disabled={loading || !secret} style={{ padding: '12px 18px', border: 0, borderRadius: 8, background: '#67e8f9', color: '#071117', fontWeight: 700 }}>{loading ? 'Загрузка…' : 'Открыть'}</button>
        </form>
        {error && <p role="alert" style={{ color: '#fb7185' }}>{error}</p>}
        {data && <section style={{ display: 'grid', gap: 24 }}>
          <div style={{ display: 'flex', gap: 24 }}>
            <strong>Профилей: {data.users.length}</strong>
            <strong>Диалогов: {data.conversations.length}</strong>
            <strong>Сообщений: {data.messages.length}</strong>
          </div>
          <div style={{ overflowX: 'auto', border: '1px solid #29404e', borderRadius: 10 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr><th style={{ textAlign: 'left', padding: 12 }}>Время</th><th style={{ textAlign: 'left', padding: 12 }}>Посетитель</th><th style={{ textAlign: 'left', padding: 12 }}>Роль</th><th style={{ textAlign: 'left', padding: 12 }}>Сообщение</th></tr></thead>
              <tbody>{data.messages.map((message) => <tr key={message.id} style={{ borderTop: '1px solid #1c303b' }}><td style={{ padding: 12, whiteSpace: 'nowrap' }}>{new Date(message.created_at).toLocaleString('ru-RU')}</td><td style={{ padding: 12, fontFamily: 'monospace' }}>{message.user_id}</td><td style={{ padding: 12 }}>{message.role}</td><td style={{ padding: 12, whiteSpace: 'pre-wrap' }}>{message.content}</td></tr>)}</tbody>
            </table>
          </div>
        </section>}
      </div>
    </main>
  )
}
