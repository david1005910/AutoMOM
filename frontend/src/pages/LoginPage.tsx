import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mic } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

type Mode = 'login' | 'register';

export function LoginPage() {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login({ email, password });
      } else {
        await register({ email, password, name });
      }
      navigate('/dashboard');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message;
      setError(msg ?? '오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted">
      <div className="bg-white rounded-xl shadow-sm border border-border p-8 w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Mic className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-xl font-bold">AutoMOM</h1>
        </div>

        <div className="flex mb-6 border border-border rounded-lg overflow-hidden">
          {(['login', 'register'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(''); }}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                mode === m ? 'bg-primary text-white' : 'text-gray-500 hover:bg-muted'
              }`}
            >
              {m === 'login' ? '로그인' : '회원가입'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="홍길동"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="user@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">패스워드</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder={mode === 'register' ? '8자 이상, 대문자+숫자 포함' : '••••••••'}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? '처리 중...' : mode === 'login' ? '로그인' : '회원가입'}
          </button>
        </form>
      </div>
    </div>
  );
}
