import Link from 'next/link';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 hidden md:block">
        <div className="p-6">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Growth OS</h1>
        </div>
        <nav className="mt-6 px-4 space-y-2">
          <Link href="/" className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
            Dashboard
          </Link>
          <Link href="/leads" className="block px-4 py-2 font-medium text-black bg-gray-100 rounded-lg">
            Leads
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1">
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800">Pipeline</h2>
          <form action="/api/auth/logout" method="POST">
            <button type="submit" className="text-sm font-medium text-gray-600 hover:text-black">
              Sign out
            </button>
          </form>
        </header>
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
