interface Stat {
  label: string;
  value: string;
}

const stats: Stat[] = [
  { label: 'Federal Representatives', value: '540' },
  { label: 'State Legislative Districts', value: '7,383' },
  { label: 'Coverage', value: '50 States + DC + 5 Territories' },
  { label: 'Data Source', value: 'Updated Daily from Official APIs' },
];

export default function PlatformStats() {
  return (
    <section className="border-t-2 border-b-2 border-gray-200 py-grid-3 sm:py-grid-4">
      <div className="max-w-6xl mx-auto px-grid-2 sm:px-grid-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-grid-3 sm:gap-grid-4">
          {stats.map((stat, index) => (
            <div key={index} className="text-center sm:text-left">
              <div className="text-lg sm:text-xl font-bold text-black aicher-heading">
                {stat.value}
              </div>
              <div className="text-xs sm:text-sm text-gray-600 mt-grid-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
