'use client';

import { createLeadAction } from '@/app/actions/leads';
import { useFormStatus } from 'react-dom';
import { useActionState } from 'react';

function SubmitButton() {
  const { pending } = useFormStatus();
  
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-black text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-800 transition disabled:opacity-50"
    >
      {pending ? 'Saving...' : 'Save Lead'}
    </button>
  );
}

export default function NewLeadPage() {
  const [state, formAction] = useActionState(createLeadAction, { error: null });

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">New Lead</h1>
        <p className="mt-2 text-gray-600">Enter the details of your new prospect.</p>
      </div>

      <form action={formAction} className="space-y-6 bg-white p-8 rounded-xl shadow-sm border border-gray-200">
        {state?.error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100">
            {state.error}
          </div>
        )}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">

          <div>
            <label className="block text-sm font-medium text-gray-700">Full Name *</label>
            <input required type="text" name="name" className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Company</label>
            <input type="text" name="company" className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input type="email" name="email" className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Industry</label>
            <input type="text" name="industry" className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Pipeline Stage</label>
            <select name="stage" className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm">
              <option value="New">New</option>
              <option value="Researching">Researching</option>
              <option value="Qualified">Qualified</option>
              <option value="Outreach in Progress">Outreach in Progress</option>
              <option value="Meeting / Call">Meeting / Call</option>
            </select>
          </div>
        </div>
        
        <div className="pt-4 flex justify-end">
          <SubmitButton />
        </div>
      </form>
    </div>
  );
}
