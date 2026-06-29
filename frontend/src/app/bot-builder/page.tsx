"use client";

import React, { useState } from 'react';

const availableNodes = [
  { type: 'sendMessage', title: 'Send Message', desc: 'Send text/media content', icon: '💬', color: 'border-blue-500' },
  { type: 'askQuestion', title: 'Ask Question', desc: 'Wait for customer reply', icon: '❓', color: 'border-purple-500' },
  { type: 'buttons', title: 'Interactive Buttons', desc: 'Send quick reply actions', icon: '🔘', color: 'border-yellow-500' },
  { type: 'imageSearch', title: 'Visual Image Search', desc: 'Query vector db index', icon: '🖼️', color: 'border-green-500' },
  { type: 'humanTransfer', title: 'Human Transfer', desc: 'Hand off to live agent', icon: '👤', color: 'border-red-500' },
  { type: 'aiResponse', title: 'AI Assistant', desc: 'GPT/Claude smart response', icon: '🤖', color: 'border-cyan-500' },
];

const initialNodes = [
  { id: '1', type: 'trigger', title: 'Webhook Trigger', desc: 'Triggers on incoming message', x: 50, y: 150, data: {} },
  { id: '2', type: 'sendMessage', title: 'Welcome Message', desc: 'Please send product image', x: 280, y: 150, data: { message: 'Hello! Please send a product image to search in our catalog.' } },
  { id: '3', type: 'imageSearch', title: 'Visual Image Search', desc: 'Query vector db index', x: 520, y: 150, data: { threshold: 0.70 } },
];

export default function BotBuilder() {
  const [nodes, setNodes] = useState(initialNodes);
  const [selectedNode, setSelectedNode] = useState<any>(initialNodes[0]);
  const [flowName, setFlowName] = useState('Default WhatsApp Search Flow');
  const [isSaving, setIsSaving] = useState(false);

  const handleAddNode = (type: string) => {
    const template = availableNodes.find((n) => n.type === type);
    if (!template) return;

    const lastNode = nodes[nodes.length - 1];
    const newNode = {
      id: String(nodes.length + 1),
      type: template.type,
      title: template.title,
      desc: template.desc,
      x: lastNode ? lastNode.x + 220 : 100,
      y: lastNode ? lastNode.y : 150,
      data: {},
    };
    setNodes([...nodes, newNode]);
    setSelectedNode(newNode);
  };

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      alert('Flow saved successfully and set as active!');
    }, 800);
  };

  return (
    <div className="flex h-[calc(100vh-10rem)] -m-8 overflow-hidden">
      {/* Node Palette (Left Sidebar) */}
      <aside className="w-80 bg-[#111b21] border-r border-[#222e35] p-6 flex flex-col justify-between">
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Drag & Drop Nodes</h3>
            <p className="text-xs text-gray-400">Click any card to insert a step in your workspace flow</p>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[450px]">
            {availableNodes.map((n) => (
              <button
                key={n.type}
                onClick={() => handleAddNode(n.type)}
                className="w-full text-left p-3.5 bg-[#202c33]/40 border border-[#222e35] hover:border-[#00a884] rounded-xl flex items-start space-x-3 transition-all"
              >
                <span className="text-xl">{n.icon}</span>
                <div>
                  <h4 className="text-xs font-bold text-white">{n.title}</h4>
                  <p className="text-[10px] text-gray-400 mt-0.5">{n.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full bg-[#00a884] hover:bg-[#009675] text-white p-3 rounded-lg text-xs font-bold transition-all disabled:opacity-40"
        >
          {isSaving ? 'Saving Changes...' : 'Save & Publish Flow'}
        </button>
      </aside>

      {/* Editor Canvas (Middle Area) */}
      <section className="flex-1 bg-[#0b141a] relative overflow-hidden flex flex-col">
        {/* Canvas Header */}
        <div className="p-4 border-b border-[#222e35] bg-[#111b21]/50 flex items-center justify-between">
          <input
            type="text"
            value={flowName}
            onChange={(e) => setFlowName(e.target.value)}
            className="bg-transparent border-b border-transparent hover:border-gray-500 focus:border-[#00a884] text-sm font-semibold text-white outline-none px-2 py-1 max-w-sm transition-colors"
          />
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#00a884] bg-[#00a884]/10 border border-[#00a884]/20 px-2.5 py-1 rounded-full">
            Active
          </span>
        </div>

        {/* Canvas Grid Background */}
        <div
          className="flex-1 relative overflow-auto p-12"
          style={{
            backgroundImage: 'radial-gradient(#222e35 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        >
          {/* Render Nodes */}
          <div className="flex items-center space-x-12 min-w-max h-full">
            {nodes.map((n, idx) => (
              <React.Fragment key={n.id}>
                {/* Node Box */}
                <div
                  onClick={() => setSelectedNode(n)}
                  className={`w-52 p-4 bg-[#111b21] border rounded-xl cursor-pointer transition-all glass ${
                    selectedNode?.id === n.id ? 'border-[#00a884] ring-2 ring-[#00a884]/20' : 'border-[#222e35]'
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      {n.title}
                    </span>
                    <span className="text-xs">
                      {n.type === 'trigger' ? '⚡' : n.type === 'imageSearch' ? '🖼️' : '💬'}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 leading-relaxed truncate">{n.desc}</p>
                </div>

                {/* Connection Line Arrow */}
                {idx < nodes.length - 1 && (
                  <div className="flex items-center space-x-1 text-gray-600 font-semibold">
                    <span className="h-0.5 w-8 bg-[#222e35]"></span>
                    <span>➔</span>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* Configuration Sidebar (Right Panel) */}
      <aside className="w-80 bg-[#111b21] border-l border-[#222e35] p-6 space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Node Details</h3>
          <p className="text-xs text-gray-400">Configure parameters for selected workflow node</p>
        </div>

        {selectedNode ? (
          <div className="space-y-4">
            <div>
              <p className="text-[10px] text-gray-400 font-semibold uppercase">Node Type</p>
              <input
                type="text"
                readOnly
                value={selectedNode.title}
                className="w-full bg-[#202c33] border border-[#374248] rounded-lg p-2.5 text-xs text-white mt-1"
              />
            </div>

            {selectedNode.type === 'sendMessage' && (
              <div>
                <p className="text-[10px] text-gray-400 font-semibold uppercase">Message Body</p>
                <textarea
                  value={selectedNode.data?.message || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNodes(nodes.map((n) => (n.id === selectedNode.id ? { ...n, data: { ...n.data, message: val } } : n)));
                    setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, message: val } });
                  }}
                  rows={4}
                  className="w-full bg-[#202c33] border border-[#374248] rounded-lg p-2.5 text-xs text-white mt-1 outline-none focus:border-[#00a884]"
                />
              </div>
            )}

            {selectedNode.type === 'imageSearch' && (
              <div>
                <p className="text-[10px] text-gray-400 font-semibold uppercase">Minimum Similarity Threshold</p>
                <input
                  type="range"
                  min="50"
                  max="95"
                  step="5"
                  value={(selectedNode.data?.threshold || 0.70) * 100}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) / 100;
                    setNodes(nodes.map((n) => (n.id === selectedNode.id ? { ...n, data: { ...n.data, threshold: val } } : n)));
                    setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, threshold: val } });
                  }}
                  className="w-full accent-[#00a884] mt-2"
                />
                <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                  <span>Current: {(selectedNode.data?.threshold || 0.70) * 100}%</span>
                  <span>Target: Qdrant Match</span>
                </div>
              </div>
            )}

            <div>
              <p className="text-[10px] text-gray-400 font-semibold uppercase">Description</p>
              <input
                type="text"
                value={selectedNode.desc}
                onChange={(e) => {
                  const val = e.target.value;
                  setNodes(nodes.map((n) => (n.id === selectedNode.id ? { ...n, desc: val } : n)));
                  setSelectedNode({ ...selectedNode, desc: val });
                }}
                className="w-full bg-[#202c33] border border-[#374248] rounded-lg p-2.5 text-xs text-white mt-1 outline-none"
              />
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-400">Select a node from the canvas to edit its properties.</p>
        )}
      </aside>
    </div>
  );
}
