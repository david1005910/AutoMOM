import React, { useState } from 'react';
import type { ActionItem } from '@/types/meeting';

const PRIORITY_LABEL: Record<ActionItem['priority'], string> = {
  high: '높음',
  medium: '보통',
  low: '낮음',
};

const PRIORITY_COLOR: Record<ActionItem['priority'], string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-green-100 text-green-700',
};

interface ActionItemListProps {
  items: ActionItem[];
  onUpdate?: (items: ActionItem[]) => void;
}

export function ActionItemList({ items, onUpdate }: ActionItemListProps) {
  const [checked, setChecked] = useState<Set<number>>(new Set());

  const toggle = (i: number) => {
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  if (items.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="pb-2 w-6"></th>
            <th className="pb-2 font-medium text-gray-600">할 일</th>
            <th className="pb-2 font-medium text-gray-600">담당자</th>
            <th className="pb-2 font-medium text-gray-600">기한</th>
            <th className="pb-2 font-medium text-gray-600">우선순위</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i} className="border-b border-border/50 last:border-0">
              <td className="py-2 pr-2">
                <input
                  type="checkbox"
                  checked={checked.has(i)}
                  onChange={() => toggle(i)}
                  className="rounded border-gray-300 text-primary"
                />
              </td>
              <td className={`py-2 pr-4 ${checked.has(i) ? 'line-through text-gray-400' : ''}`}>
                {item.task}
              </td>
              <td className="py-2 pr-4 text-gray-600">{item.owner}</td>
              <td className="py-2 pr-4 text-gray-500">{item.due_date ?? '-'}</td>
              <td className="py-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLOR[item.priority]}`}>
                  {PRIORITY_LABEL[item.priority]}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
