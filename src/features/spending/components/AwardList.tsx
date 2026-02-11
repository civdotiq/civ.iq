'use client';

import type { FederalAward } from '@/types/spending';
import { formatCompactCurrency } from '../utils/format';

interface AwardListProps {
  awards: FederalAward[];
  title: string;
  maxItems?: number;
}

export default function AwardList({ awards, title, maxItems = 10 }: AwardListProps) {
  const displayed = awards.slice(0, maxItems);

  return (
    <div className="border-2 border-black dark:border-[#333333] bg-white dark:bg-[#222226] p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{title}</h3>
      {displayed.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">
          No {title.toLowerCase()} found for this district and fiscal year.
        </p>
      ) : (
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {displayed.map(award => (
            <a
              key={award.id}
              href={award.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block py-4 first:pt-0 last:pb-0 hover:bg-gray-50 dark:hover:bg-[#2a2a2e] -mx-2 px-2 transition-colors"
            >
              <div className="flex justify-between items-start gap-4">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {award.recipientName}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{award.agency}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
                    {award.description}
                  </p>
                </div>
                <p className="text-base font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                  {formatCompactCurrency(award.amount)}
                </p>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
