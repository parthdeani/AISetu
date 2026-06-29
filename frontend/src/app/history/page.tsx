"use client";

import React, { useEffect, useState } from 'react';
import { getApiUrl } from '../api-config';

export default function History() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchPhone, setSearchPhone] = useState('');

  const fetchLogs = (phone = '') => {
    setLoading(true);
    const url = getApiUrl(`/api/workspace/search-history?phone=${encodeURIComponent(phone)}`);
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        setLogs(data.items || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs(searchPhone);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">Visual Search History Audit Logs</h2>
        <p className="text-sm text-gray-400">Review search results and automation decisions triggered by incoming WhatsApp images</p>
      </div>

      {/* Filter Bar */}
      <form onSubmit={handleFilter} className="flex space-x-4 max-w-md bg-[#111b21] p-3 border border-[#222e35] rounded-xl glass">
        <input
          type="text"
          placeholder="Filter by customer phone..."
          value={searchPhone}
          onChange={(e) => setSearchPhone(e.target.value)}
          className="flex-1 bg-[#202c33] border border-[#374248] text-sm text-white rounded-lg px-4 py-2 outline-none focus:border-[#00a884]"
        />
        <button type="submit" className="bg-[#00a884] text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-[#009675] transition-colors">
          Search
        </button>
      </form>

      {/* Logs Table */}
      <div className="bg-[#111b21] border border-[#222e35] rounded-xl overflow-hidden glass">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Loading audit history...</div>
        ) : logs.length > 0 ? (
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-[#202c33]/40 text-xs font-bold uppercase text-gray-400 border-b border-[#222e35]">
              <tr>
                <th className="p-4">Customer Number</th>
                <th className="p-4">Uploaded Pattern</th>
                <th className="p-4">Returned Matches</th>
                <th className="p-4">Top Score</th>
                <th className="p-4">System Decision</th>
                <th className="p-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222e35]">
              {logs.map((log: any) => (
                <tr key={log.id} className="hover:bg-[#202c33]/25 transition-colors">
                  <td className="p-4 font-semibold text-white">
                    {log.customer?.phone_number || 'Sandbox Test User'}
                  </td>
                  <td className="p-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={log.uploaded_image_url} alt="User Pattern" className="w-12 h-12 rounded object-cover border border-[#374248]" />
                  </td>
                  <td className="p-4">{log.search_results?.length || 0} matched designs</td>
                  <td className="p-4 font-mono font-semibold text-white">
                    {log.search_results?.[0] ? `${log.search_results[0].code} (${log.search_results[0].similarity}%)` : 'None'}
                  </td>
                  <td className="p-4">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border bg-green-500/10 text-green-400 border-green-500/20">
                      Auto-Replied Catalog Link
                    </span>
                  </td>
                  <td className="p-4 text-xs text-gray-400">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-12 text-center text-gray-400">No search logs found in the database.</div>
        )}
      </div>
    </div>
  );
}
