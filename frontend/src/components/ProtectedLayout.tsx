import React from 'react';
import { Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Settings, LogOut, Mic } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

export function ProtectedLayout() {
  const { user, logout } = useAuthStore();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <div className="min-h-screen flex">
      {/* 사이드바 */}
      <aside className="w-56 border-r border-border bg-white flex flex-col">
        <div className="p-4 border-b border-border">
          <Link to="/dashboard" className="flex items-center gap-2 font-bold text-primary text-lg">
            <Mic className="w-5 h-5" />
            AutoMOM
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          <NavItem to="/dashboard" icon={<LayoutDashboard className="w-4 h-4" />} label="대시보드" />
          <NavItem to="/settings" icon={<Settings className="w-4 h-4" />} label="설정" />
        </nav>

        <div className="p-3 border-t border-border">
          <div className="text-xs text-gray-500 mb-2 truncate">{user.email}</div>
          <span className="inline-block px-2 py-0.5 bg-secondary text-secondary-foreground rounded text-xs mb-3">
            {user.plan === 'free' ? '무료 플랜' : 'Pro'}
          </span>
          <button
            onClick={logout}
            className="flex items-center gap-2 w-full text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            로그아웃
          </button>
        </div>
      </aside>

      {/* 메인 */}
      <main className="flex-1 overflow-y-auto bg-muted">
        <Outlet />
      </main>
    </div>
  );
}

function NavItem({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  const location = useLocation();
  const active = location.pathname.startsWith(to);
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
        active ? 'bg-accent text-accent-foreground font-medium' : 'text-gray-600 hover:bg-secondary'
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}
