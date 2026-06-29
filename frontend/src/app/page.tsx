"use client";

import React, { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const COLORS = ['#00a884', '#007eb9', '#e0b200'];

export default function Dashboard() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('http://localhost:4000/api/workspace/dashboard-metrics')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load metrics');
        return res.json();
      })
      .then((data) => {
        setMetrics(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="w-10 h-10 rounded-full border-2 border-t-transparent border-[#00a884] animate-spin"></div>
        <p className="text-sm text-gray-400">Loading workspace dashboard metrics...</p>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="p-6 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl max-w-lg mx-auto text-center mt-12">
        <h3 className="font-bold text-lg mb-2">Failed to load system metrics</h3>
        <p className="text-sm">{error || 'Make sure NestJS backend is running at http://localhost:4000'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">Workspace Overview</h2>
        <p className="text-sm text-gray-400">Real-time statistics of visual WhatsApp commerce queries</p>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="p-6 bg-[#111b21] border border-[#222e35] rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">Total Customers</p>
            <h3 className="text-3xl font-extrabold text-white mt-2">{metrics.totalCustomers}</h3>
          </div>
          <span className="text-3xl">👥</span>
        </div>

        <div className="p-6 bg-[#111b21] border border-[#222e35] rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">Total Messages</p>
            <h3 className="text-3xl font-extrabold text-white mt-2">{metrics.totalMessages}</h3>
          </div>
          <span className="text-3xl">💬</span>
        </div>

        <div className="p-6 bg-[#111b21] border border-[#222e35] rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">Image Searches</p>
            <h3 className="text-3xl font-extrabold text-[#00a884] mt-2">{metrics.totalSearches}</h3>
          </div>
          <span className="text-3xl">🖼️</span>
        </div>

        <div className="p-6 bg-[#111b21] border border-[#222e35] rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">Product Catalog</p>
            <h3 className="text-3xl font-extrabold text-white mt-2">{metrics.totalProducts}</h3>
          </div>
          <span className="text-3xl">📦</span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Daily Searches (Line) */}
        <div className="md:col-span-2 p-6 bg-[#111b21] border border-[#222e35] rounded-xl">
          <h4 className="text-sm font-semibold text-white mb-6 uppercase tracking-wider">Daily Image Searches</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metrics.charts.dailySearches}>
                <XAxis dataKey="date" stroke="#8a969c" fontSize={11} tickLine={false} />
                <YAxis stroke="#8a969c" fontSize={11} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#111b21', borderColor: '#222e35' }} />
                <Line type="monotone" dataKey="count" stroke="#00a884" strokeWidth={3} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* WhatsApp Usage Breakdown (Pie) */}
        <div className="p-6 bg-[#111b21] border border-[#222e35] rounded-xl flex flex-col justify-between">
          <h4 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">WhatsApp Interaction Types</h4>
          <div className="h-48 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={metrics.charts.whatsappUsage}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="count"
                  nameKey="type"
                >
                  {metrics.charts.whatsappUsage.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#111b21', borderColor: '#222e35' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-4">
            {metrics.charts.whatsappUsage.map((d: any, i: number) => (
              <div key={d.type} className="flex justify-between items-center text-xs">
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }}></span>
                  <span className="text-gray-400">{d.type}</span>
                </div>
                <span className="font-semibold text-white">{d.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Grid: Product Trends & Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Product Trends (Bar) */}
        <div className="md:col-span-2 p-6 bg-[#111b21] border border-[#222e35] rounded-xl">
          <h4 className="text-sm font-semibold text-white mb-6 uppercase tracking-wider">Most Searched Categories</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.charts.productTrends}>
                <XAxis dataKey="name" stroke="#8a969c" fontSize={11} tickLine={false} />
                <YAxis stroke="#8a969c" fontSize={11} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#111b21', borderColor: '#222e35' }} />
                <Bar dataKey="searches" fill="#00a884" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live System Log */}
        <div className="p-6 bg-[#111b21] border border-[#222e35] rounded-xl flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">Live System Logs</h4>
            <div className="space-y-4">
              <div className="flex items-start space-x-3 text-xs">
                <span className="text-green-400">●</span>
                <div>
                  <p className="font-semibold text-white">Visual Search Query Resolved</p>
                  <p className="text-gray-400">Calculated database cosine similarity index</p>
                </div>
              </div>
              <div className="flex items-start space-x-3 text-xs">
                <span className="text-orange-400">●</span>
                <div>
                  <p className="font-semibold text-white">Storage gateway initialized</p>
                  <p className="text-gray-400">Bypassed S3 endpoint, using local sandbox fallback</p>
                </div>
              </div>
              <div className="flex items-start space-x-3 text-xs">
                <span className="text-green-400">●</span>
                <div>
                  <p className="font-semibold text-white">Zero-dependency mode activated</p>
                  <p className="text-gray-400">Connected to MongoDB Atlas cluster0</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
