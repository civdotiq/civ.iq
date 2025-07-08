import { RepresentativeCardSkeleton } from '@/components/SkeletonLoader';

export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <RepresentativeCardSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}
