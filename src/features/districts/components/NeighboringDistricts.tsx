'use client';

import React from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { ExternalLink } from 'lucide-react';

interface NeighboringDistrictsProps {
  currentDistrict: string;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function NeighboringDistricts({ currentDistrict }: NeighboringDistrictsProps) {
  const { data, error, isLoading } = useSWR(
    `/api/districts/${currentDistrict}/neighbors`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000, // Cache for 5 minutes
    }
  );

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Neighboring Districts</h2>
        <div className="animate-pulse">
          <div className="space-y-2">
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data?.neighbors?.length) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Neighboring Districts</h2>
        <p className="text-gray-500">No neighboring districts data available.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Neighboring Districts</h2>
      <div className="space-y-3">
        {data.neighbors.map((neighbor: { id: string; name: string }) => (
          <Link
            key={neighbor.id}
            href={`/districts/${neighbor.id}`}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
          >
            <div>
              <div className="font-semibold text-gray-900">{neighbor.id}</div>
              <div className="text-sm text-gray-600">{neighbor.name}</div>
            </div>
            <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
          </Link>
        ))}
      </div>
      <div className="mt-4 pt-3 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          Based on geographic adjacency. Click to explore neighboring districts.
        </p>
      </div>
    </div>
  );
}
