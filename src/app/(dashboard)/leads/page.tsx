import { LeadService } from '@/services/lead';
import { drizzle } from 'drizzle-orm/d1';
import Link from 'next/link';
import { archiveLeadAction } from '@/app/actions/leads';

export const runtime = 'edge';

export default async function LeadsPage() {
  const env = (process as any).env;
  const db = drizzle(env.DB);
  const service = new LeadService(db);
  
  const leads = await service.listLeads();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Active Leads</h1>
        <Link 
          href="/leads/new" 
          className="bg-black text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-800 transition"
        >
          + New Lead
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Company</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Stage</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {leads.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                  No active leads found. Start building your pipeline!
                </td>
              </tr>
            ) : (
              leads.map((lead: any) => (
                <tr key={lead.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{lead.name}</div>
                    <div className="text-sm text-gray-500">{lead.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-700">{lead.company || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {lead.stage}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <form action={archiveLeadAction.bind(null, lead.id)}>
                      <button type="submit" className="text-red-600 hover:text-red-900">Archive</button>
                    </form>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
