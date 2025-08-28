export default function HomePage() {
  return (
    <main className="min-h-screen p-8">
      <h1 className="text-4xl font-bold mb-4">CIV.IQ - Civic Information Hub</h1>
      <p className="text-xl text-gray-600 mb-8">
        Know your representatives and stay informed about your government
      </p>
      <div className="space-y-4">
        <a
          href="/representatives"
          className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Find Your Representatives
        </a>
      </div>
    </main>
  );
}
