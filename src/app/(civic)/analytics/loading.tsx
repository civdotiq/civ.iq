import { Skeleton } from '@/components/SkeletonLoader';

export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="space-y-8">
        <div className="text-center space-y-4">
          <Skeleton className="h-10 w-64 mx-auto" />
          <Skeleton className="h-6 w-96 mx-auto" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <Skeleton className="h-6 w-48 mb-4" />
            <Skeleton className="h-64 w-full rounded" />
          </div>
          
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <Skeleton className="h-6 w-48 mb-4" />
            <Skeleton className="h-64 w-full rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}
