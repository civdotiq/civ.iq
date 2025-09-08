import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="mx-auto h-12 w-auto flex justify-center">
          <div className="text-2xl font-bold text-civiq-red">CIV.IQ</div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Federal Civic Intelligence Platform
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Connecting citizens with their federal representatives
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="space-y-6">
            <Link
              href="/districts"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-civiq-blue hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-civiq-blue"
            >
              View Congressional Districts
            </Link>

            <div className="text-center">
              <p className="text-xs text-gray-500">
                Real-time data from Congress.gov, FEC, and Census Bureau
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
