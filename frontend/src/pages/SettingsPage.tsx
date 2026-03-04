import React from 'react';
import { useAuthStore } from '@/stores/authStore';

export function SettingsPage() {
  const { user, logout } = useAuthStore();

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">설정</h1>

      <div className="bg-white rounded-xl border border-border divide-y divide-border">
        <div className="p-6">
          <h2 className="text-base font-semibold mb-4">계정 정보</h2>
          <div className="space-y-3 text-sm">
            <div className="flex">
              <span className="w-24 text-gray-500">이름</span>
              <span>{user?.name ?? '-'}</span>
            </div>
            <div className="flex">
              <span className="w-24 text-gray-500">이메일</span>
              <span>{user?.email}</span>
            </div>
            <div className="flex">
              <span className="w-24 text-gray-500">플랜</span>
              <span className="px-2 py-0.5 bg-secondary text-secondary-foreground rounded text-xs">
                {user?.plan === 'free' ? '무료 플랜 (월 5회)' : 'Pro 플랜'}
              </span>
            </div>
          </div>
        </div>

        <div className="p-6">
          <h2 className="text-base font-semibold mb-2">무료 플랜 제한</h2>
          <ul className="text-sm text-gray-500 space-y-1 list-disc list-inside">
            <li>월 5회 STT 처리</li>
            <li>최대 10개 회의록 저장</li>
          </ul>
          <button className="mt-4 px-4 py-2 bg-primary text-white rounded-md text-sm hover:bg-primary/90 transition-colors">
            Pro로 업그레이드
          </button>
        </div>

        <div className="p-6">
          <h2 className="text-base font-semibold mb-3 text-destructive">위험 구역</h2>
          <button
            onClick={() => { if (confirm('로그아웃 하시겠습니까?')) logout(); }}
            className="px-4 py-2 border border-destructive text-destructive rounded-md text-sm hover:bg-destructive/5 transition-colors"
          >
            로그아웃
          </button>
        </div>
      </div>
    </div>
  );
}
