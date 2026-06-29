import React from 'react';
import './globals.css';
import Link from 'next/link';

export const metadata = {
  title: 'Visual WhatsApp Commerce',
  description: 'AI visual product search SaaS for WhatsApp',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-[#111b21] border-r border-[#222e35] flex flex-col justify-between">
          <div>
            <div className="p-6 border-b border-[#222e35] flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-[#00a884] flex items-center justify-center font-bold text-white">V</div>
              <div>
                <h1 className="font-bold text-sm tracking-wide text-white">VWC Platform</h1>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">Workspace Owner</p>
              </div>
            </div>

            <nav className="p-4 space-y-2">
              <Link href="/" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-[#202c33] transition-colors text-sm font-medium">
                <span>📊</span> <span>Dashboard</span>
              </Link>
              <Link href="/onboarding" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-[#202c33] transition-colors text-sm font-medium">
                <span>🔌</span> <span>WhatsApp Onboarding</span>
              </Link>
              <Link href="/catalog" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-[#202c33] transition-colors text-sm font-medium">
                <span>📁</span> <span>Product Catalog</span>
              </Link>
              <Link href="/bot-builder" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-[#202c33] transition-colors text-sm font-medium">
                <span>🤖</span> <span>Bot Flow Builder</span>
              </Link>
              <Link href="/sandbox" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-[#202c33] transition-colors text-sm font-medium">
                <span>🧪</span> <span>Testing Console</span>
              </Link>
              <Link href="/history" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-[#202c33] transition-colors text-sm font-medium">
                <span>📜</span> <span>Search Logs</span>
              </Link>
            </nav>
          </div>

          <div className="p-4 border-t border-[#222e35] flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center text-sm font-bold">JD</div>
            <div>
              <p className="text-sm font-semibold text-white">John Doe</p>
              <p className="text-xs text-gray-400">owner@textileco.com</p>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#0b141a]">
          <header className="h-16 border-b border-[#222e35] bg-[#111b21] px-8 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-semibold text-gray-400">Current Workspace:</span>
              <span className="bg-[#202c33] text-[#00a884] text-xs font-semibold px-3 py-1 rounded-full border border-[#00a884]/30">
                Textile Co - India
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
              <span className="text-xs text-gray-400 font-medium">WhatsApp Gateway: Connected</span>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-8">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
