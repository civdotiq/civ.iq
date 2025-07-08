import { Skeleton } from '@/components/SkeletonLoader';

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse">
        <Skeleton className="w-32 h-32 rounded-full" />
      </div>
    </div>
  );
}