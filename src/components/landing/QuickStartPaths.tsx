import Link from 'next/link';

// Example high-profile representatives (can be updated)
const EXAMPLE_REPS = [
  { id: 'J000294', name: 'Hakeem Jeffries', title: 'House Minority Leader' },
  { id: 'T000250', name: 'John Thune', title: 'Senate Majority Leader' },
  { id: 'J000299', name: 'Mike Johnson', title: 'Speaker of the House' },
];

export default function QuickStartPaths() {
  return (
    <section className="max-w-6xl mx-auto px-grid-2 sm:px-grid-3 pt-grid-2 pb-grid-4 sm:pb-grid-6">
      <div className="mb-grid-2 sm:mb-grid-3 text-center">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 aicher-heading">QUICK START</h2>
        <p className="text-xs text-gray-600 mt-1">Alternative ways to explore the platform</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-grid-3 sm:gap-grid-4">
        {/* Federal */}
        <div className="border-l-4 border-l-black pl-grid-2 sm:pl-grid-3">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-grid-2">
            Federal
          </h3>
          <div className="space-y-grid-2">
            {/* Example Profiles */}
            <div className="aicher-card p-grid-2 sm:p-grid-3 flex flex-col">
              <h4 className="text-xs sm:text-sm font-semibold text-gray-900 mb-1 aicher-heading">
                EXAMPLE PROFILES
              </h4>
              <p className="text-[10px] sm:text-xs text-gray-600 mb-grid-1">
                See what congressional member profiles look like
              </p>
              <div className="space-y-1">
                {EXAMPLE_REPS.map(rep => (
                  <Link
                    key={rep.id}
                    href={`/representative/${rep.id}`}
                    className="block border-2 border-gray-200 px-3 py-2.5 min-h-[44px] aicher-hover text-[10px] sm:text-xs"
                  >
                    <div className="font-semibold text-gray-900">{rep.name}</div>
                    <div className="text-gray-600">{rep.title}</div>
                  </Link>
                ))}
              </div>
            </div>
            {/* Federal data links */}
            <div className="flex flex-col gap-1">
              <Link
                href="/representatives"
                className="block aicher-card px-3 py-2.5 min-h-[44px] aicher-hover"
              >
                <div className="text-xs font-semibold text-gray-900">All Representatives</div>
                <div className="text-[10px] text-gray-600">535 members of Congress</div>
              </Link>
              <Link
                href="/districts"
                className="block aicher-card px-3 py-2.5 min-h-[44px] aicher-hover"
              >
                <div className="text-xs font-semibold text-gray-900">All Districts</div>
                <div className="text-[10px] text-gray-600">435 congressional districts</div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
