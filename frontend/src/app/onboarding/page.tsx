"use client";

import React, { useState } from 'react';

const steps = [
  { title: 'Connect Facebook', desc: 'Authorize Meta Business permission API' },
  { title: 'Select WABA', desc: 'Choose WhatsApp Business Account' },
  { title: 'Configure Number', desc: 'Select and link active phone number' },
  { title: 'Verify Connection', desc: 'Perform webhook endpoint handshake' },
  { title: 'Activate Sandbox', desc: 'Platform ready to process images' },
];

export default function Onboarding() {
  const [currentStep, setCurrentStep] = useState(0);
  const [fbConnected, setFbConnected] = useState(false);
  const [wabaSelected, setWabaSelected] = useState('');
  const [phoneSelected, setPhoneSelected] = useState('');
  const [verificationToken, setVerificationToken] = useState('vwc_verify_token_secure');

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">WhatsApp Account Onboarding</h2>
        <p className="text-sm text-gray-400">Configure and link your official Meta WhatsApp Business Cloud API</p>
      </div>

      {/* Progress Tracker */}
      <div className="grid grid-cols-5 gap-4">
        {steps.map((s, idx) => (
          <div key={s.title} className="space-y-2">
            <div className={`h-1.5 rounded-full transition-all duration-500 ${
              idx <= currentStep ? 'bg-[#00a884]' : 'bg-[#222e35]'
            }`}></div>
            <div>
              <p className={`text-[11px] font-bold uppercase tracking-wider ${
                idx <= currentStep ? 'text-[#00a884]' : 'text-gray-400'
              }`}>Step {idx + 1}</p>
              <p className="text-xs font-semibold text-white truncate">{s.title}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Wizard Step Canvas */}
      <div className="p-8 bg-[#111b21] border border-[#222e35] rounded-2xl glass min-h-[350px] flex flex-col justify-between">
        <div className="space-y-6">
          {currentStep === 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Connect Facebook Account</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Connect your business Facebook page to link your Meta Business Manager. This grants our system permission to query and reply to customer WhatsApp messages.
              </p>
              <div className="pt-4">
                {fbConnected ? (
                  <div className="flex items-center space-x-3 text-green-400 font-semibold text-sm">
                    <span>✅ Connected as Meta Business Manager: <strong>Textile Hub Corp</strong></span>
                  </div>
                ) : (
                  <button
                    onClick={() => setFbConnected(true)}
                    className="bg-[#1877f2] hover:bg-[#166fe5] text-white px-6 py-3 rounded-lg font-bold text-sm flex items-center space-x-3 transition-colors"
                  >
                    <span>📘</span> <span>Login with Facebook Business</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Select WhatsApp Business Account</h3>
              <p className="text-sm text-gray-400">
                Select the WhatsApp Business Account (WABA) from your Meta dashboard:
              </p>
              <div className="space-y-3 max-w-md pt-2">
                <label className="block">
                  <select
                    value={wabaSelected}
                    onChange={(e) => setWabaSelected(e.target.value)}
                    className="w-full bg-[#202c33] border border-[#374248] text-white rounded-lg p-3 outline-none focus:border-[#00a884] text-sm"
                  >
                    <option value="">-- Choose Account --</option>
                    <option value="waba_01">Textile Retail Account (ID: 87524982759)</option>
                    <option value="waba_02">Embroidery Wholesale Account (ID: 98124971255)</option>
                  </select>
                </label>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Configure Phone Number</h3>
              <p className="text-sm text-gray-400">
                Select the active phone number linked to your WhatsApp Business API:
              </p>
              <div className="space-y-3 max-w-md pt-2">
                <label className="block">
                  <select
                    value={phoneSelected}
                    onChange={(e) => setPhoneSelected(e.target.value)}
                    className="w-full bg-[#202c33] border border-[#374248] text-white rounded-lg p-3 outline-none focus:border-[#00a884] text-sm"
                  >
                    <option value="">-- Choose Phone Number --</option>
                    <option value="ph_01">+91 98765 43210 (Verified - Active)</option>
                    <option value="ph_02">+91 87654 32109 (Verified - Pending webhook setup)</option>
                  </select>
                </label>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Verify Webhook Integration</h3>
              <p className="text-sm text-gray-400">
                Configure your Meta Developer Webhook callback to point to the following URL endpoint:
              </p>
              <div className="space-y-4 max-w-lg pt-2">
                <div>
                  <p className="text-xs text-gray-400 font-semibold uppercase">Callback URL</p>
                  <div className="bg-[#202c33] border border-[#374248] rounded-lg p-3 text-xs font-mono mt-1 text-white flex justify-between items-center">
                    <span>https://platform.whatsappcommerce.com/api/whatsapp/webhook</span>
                    <button className="text-xs text-[#00a884] font-semibold hover:underline">Copy</button>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-gray-400 font-semibold uppercase">Verify Token</p>
                  <input
                    type="text"
                    value={verificationToken}
                    readOnly
                    className="w-full bg-[#202c33] border border-[#374248] rounded-lg p-3 text-xs font-mono mt-1 text-white outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-4 text-center py-6">
              <span className="text-5xl">🎉</span>
              <h3 className="text-xl font-bold text-white mt-4">WhatsApp Cloud API Activated!</h3>
              <p className="text-sm text-gray-400 max-w-md mx-auto leading-relaxed">
                Your Official Meta WhatsApp gateway is configured and live. Customers can now send images to search your product designs.
              </p>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center pt-6 border-t border-[#222e35] mt-8">
          <button
            onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
            disabled={currentStep === 0}
            className="px-5 py-2.5 bg-[#202c33] text-white hover:bg-[#2a3942] rounded-lg disabled:opacity-40 text-sm font-semibold transition-colors"
          >
            Back
          </button>

          {currentStep < 4 ? (
            <button
              onClick={() => setCurrentStep((prev) => prev + 1)}
              disabled={
                (currentStep === 0 && !fbConnected) ||
                (currentStep === 1 && !wabaSelected) ||
                (currentStep === 2 && !phoneSelected)
              }
              className="px-5 py-2.5 bg-[#00a884] hover:bg-[#009675] disabled:opacity-40 text-white rounded-lg text-sm font-bold transition-colors"
            >
              Continue
            </button>
          ) : (
            <button
              onClick={() => (window.location.href = '/')}
              className="px-6 py-2.5 bg-[#00a884] hover:bg-[#009675] text-white rounded-lg text-sm font-bold transition-colors"
            >
              Go to Dashboard
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
