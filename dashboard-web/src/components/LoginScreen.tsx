'use client'
import { useState } from 'react'

const CLOUD_API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface Props {
  onLogin: (token: string, user: any) => void
}

export function LoginScreen({ onLogin }: Props) {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch(`${CLOUD_API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Login failed')
        setLoading(false)
        return
      }

      // Persist to localStorage
      localStorage.setItem('dp_token', data.token)
      localStorage.setItem('dp_role',  data.user.role)
      localStorage.setItem('dp_user',  JSON.stringify(data.user))

      onLogin(data.token, data.user)
    } catch {
      setError('Cannot reach server — is the backend running on port 3001?')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex items-center gap-3 justify-center mb-10">
          <svg width="36" height="36" viewBox="0 0 44 44" fill="none">
            <rect x="2"  y="28" width="7"  height="14" rx="1.5" fill="#2563EB" />
            <rect x="13" y="18" width="7"  height="24" rx="1.5" fill="#3B82F6" />
            <rect x="24" y="10" width="7"  height="32" rx="1.5" fill="#60A5FA" />
            <polyline points="5,27 16,17 27,9 38,4" stroke="#93C5FD" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <circle cx="38" cy="4" r="3" fill="#93C5FD" />
          </svg>
          <span className="text-2xl font-black text-white tracking-tight">DroidPulse</span>
        </div>

        {/* Card */}
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-8">
          <div className="text-[10px] font-mono text-gray-500 tracking-widest mb-6 text-center">
            SIGN IN TO DASHBOARD
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <div className="text-[9px] font-mono text-gray-600 tracking-widest mb-1.5">EMAIL</div>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@droidpulse.dev"
                required
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-4 py-2.5 text-sm font-mono text-white placeholder-gray-700 outline-none focus:border-blue-600 transition-colors"
              />
            </div>

            <div>
              <div className="text-[9px] font-mono text-gray-600 tracking-widest mb-1.5">PASSWORD</div>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-4 py-2.5 text-sm font-mono text-white placeholder-gray-700 outline-none focus:border-blue-600 transition-colors"
              />
            </div>

            {error && (
              <div className="text-[10px] font-mono text-red-400 bg-red-950 border border-red-900 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-mono text-xs font-bold tracking-widest py-3 rounded-lg transition-colors mt-2"
            >
              {loading ? 'SIGNING IN...' : 'SIGN IN'}
            </button>
          </form>

          {/* Default credentials hint */}
          <div className="mt-6 pt-5 border-t border-[#1e1e1e]">
            <div className="text-[9px] font-mono text-gray-700 tracking-widest mb-2">DEFAULT CREDENTIALS</div>
            <div className="space-y-1 text-[10px] font-mono">
              <div className="flex justify-between">
                <span className="text-gray-600">email</span>
                <span
                  className="text-gray-500 cursor-pointer hover:text-gray-300"
                  onClick={() => setEmail('admin@droidpulse.dev')}
                >
                  admin@droidpulse.dev
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">password</span>
                <span
                  className="text-gray-500 cursor-pointer hover:text-gray-300"
                  onClick={() => setPassword('admin123')}
                >
                  admin123
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mt-6 text-[9px] font-mono text-gray-700">
          DROIDPULSE ANALYTICS PLATFORM
        </div>
      </div>
    </div>
  )
}
