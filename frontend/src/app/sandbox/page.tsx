"use client";

import React, { useState, useRef, useEffect } from 'react';

export default function Sandbox() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [threshold, setThreshold] = useState(0.40);
  const [results, setResults] = useState<any[]>([]);
  const [showAllMatches, setShowAllMatches] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');

  const [rotation, setRotation] = useState(0);
  const [blur, setBlur] = useState(0);

  // Camera state
  const [mode, setMode] = useState<'upload' | 'camera'>('upload');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraActive(true);
    } catch (err: any) {
      setCameraError('Camera access denied or unavailable: ' + err.message);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const captureCameraPhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/png');
    setImagePreview(dataUrl);
    setRotation(0);
    setBlur(0);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `camera_capture_${Date.now()}.png`, { type: 'image/png' });
        setImageFile(file);
      }
    }, 'image/png');

    stopCamera();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setRotation(0);
      setBlur(0);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const processImageBeforeUpload = (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      if (!imagePreview) return reject('No image preview');
      const img = new Image();
      img.src = imagePreview;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject('Canvas context failed');

        // Calculate size for rotated canvas to avoid cropping
        const angleRad = (rotation * Math.PI) / 180;
        const absCos = Math.abs(Math.cos(angleRad));
        const absSin = Math.abs(Math.sin(angleRad));
        const width = img.width * absCos + img.height * absSin;
        const height = img.width * absSin + img.height * absCos;

        canvas.width = width;
        canvas.height = height;

        // Background filling
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        // Transformation matrix
        ctx.translate(width / 2, height / 2);
        ctx.rotate(angleRad);

        if (blur > 0) {
          ctx.filter = `blur(${blur}px)`;
        }

        ctx.drawImage(img, -img.width / 2, -img.height / 2);

        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject('Blob conversion failed');
        }, 'image/png');
      };
      img.onerror = () => reject('Image load failed');
    });
  };

  const handleRunSearch = async () => {
    if (!imageFile) return;
    setSearching(true);
    setError('');

    try {
      const processedBlob = await processImageBeforeUpload();
      const formData = new FormData();
      formData.append('image', processedBlob, 'sandbox_processed.png');

      const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
      const response = await fetch(`http://${host}:4000/api/live-test/search?threshold=${threshold}`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Visual search failed');
      const data = await response.json();
      setResults(data.results || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">Live Search & Real Camera Testing Console</h2>
        <p className="text-sm text-gray-400">Capture with real camera or upload images to verify instant product name updates & visual search matches</p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Control Panel */}
        <div className="p-6 bg-[#111b21] border border-[#222e35] rounded-2xl glass space-y-6">
          <div>
            {/* Mode Selection Tabs */}
            <div className="flex bg-[#202c33] p-1 rounded-xl mb-4 border border-[#374248]">
              <button
                onClick={() => { setMode('upload'); stopCamera(); }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                  mode === 'upload' ? 'bg-[#00a884] text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                📁 Upload File
              </button>
              <button
                onClick={() => { setMode('camera'); startCamera(); }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                  mode === 'camera' ? 'bg-[#00a884] text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                📷 Real Camera
              </button>
            </div>

            {mode === 'camera' ? (
              <div className="border border-dashed border-[#374248] rounded-xl p-3 text-center relative overflow-hidden flex flex-col items-center justify-center min-h-[240px] bg-black/40">
                {isCameraActive ? (
                  <div className="w-full space-y-3">
                    <video ref={videoRef} autoPlay playsInline className="w-full max-h-48 rounded-lg object-cover bg-black" />
                    <button
                      onClick={captureCameraPhoto}
                      className="w-full py-2 bg-[#00a884] hover:bg-[#009675] text-white text-xs font-bold rounded-lg transition-colors"
                    >
                      📸 Snap Photo
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 p-4">
                    <span className="text-3xl block">🎥</span>
                    {cameraError ? (
                      <p className="text-xs text-red-400 font-medium">{cameraError}</p>
                    ) : (
                      <p className="text-xs text-gray-400">Camera offline or snapshot captured.</p>
                    )}
                    <button
                      onClick={startCamera}
                      className="px-4 py-2 bg-[#202c33] hover:bg-[#2a3942] text-white text-xs font-bold rounded-lg border border-[#374248] transition-colors"
                    >
                      Turn On Camera
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="border border-dashed border-[#374248] rounded-xl p-8 text-center cursor-pointer hover:border-[#00a884] transition-all relative overflow-hidden flex items-center justify-center min-h-[220px]">
                {imagePreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="max-h-48 mx-auto rounded-lg object-contain transition-all"
                    style={{
                      transform: `rotate(${rotation}deg)`,
                      filter: `blur(${blur}px)`,
                    }}
                  />
                ) : (
                  <div className="space-y-2">
                    <span className="text-3xl block">🖼️</span>
                    <span className="text-xs text-gray-400 font-semibold uppercase block">Select Image File</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
            )}

            {/* Captured preview indicator if captured via camera */}
            {mode === 'camera' && imagePreview && !isCameraActive && (
              <div className="mt-3 p-3 bg-[#202c33] rounded-xl border border-[#374248] flex items-center space-x-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePreview} alt="Captured" className="w-12 h-12 rounded-lg object-cover border border-[#374248]" />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold text-white block truncate">Snapshot Ready</span>
                  <span className="text-[10px] text-gray-400">Captured from real camera</span>
                </div>
              </div>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-2">Rotate Image</h3>
            <input
              type="range"
              min="0"
              max="360"
              step="5"
              value={rotation}
              onChange={(e) => setRotation(parseInt(e.target.value))}
              className="w-full accent-[#00a884]"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1.5 font-mono">
              <span>0°</span>
              <span className="text-[#00a884] font-bold">Current: {rotation}°</span>
              <span>360°</span>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-2">Blur Image</h3>
            <input
              type="range"
              min="0"
              max="15"
              step="1"
              value={blur}
              onChange={(e) => setBlur(parseInt(e.target.value))}
              className="w-full accent-[#00a884]"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1.5 font-mono">
              <span>0px (Sharp)</span>
              <span className="text-[#00a884] font-bold">Current: {blur}px</span>
              <span>15px (Blurry)</span>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-2">Distance Metric Threshold</h3>
            <input
              type="range"
              min="0.2"
              max="0.95"
              step="0.05"
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
              className="w-full accent-[#00a884]"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1.5 font-mono">
              <span>Cosine Min: 20%</span>
              <span className="text-[#00a884] font-bold">Current: {Math.round(threshold * 100)}%</span>
            </div>
          </div>

          <button
            onClick={handleRunSearch}
            disabled={searching || !imageFile}
            className="w-full bg-[#00a884] hover:bg-[#009675] text-white p-3 rounded-lg text-xs font-bold transition-all disabled:opacity-40"
          >
            {searching ? 'Querying Vector Engine...' : 'Run Similarity Search'}
          </button>

          {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
        </div>

        {/* Right Match Results Panel */}
        <div className="md:col-span-2 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Detected Product Result</h3>
            {results.length > 1 && (
              <button
                onClick={() => setShowAllMatches(!showAllMatches)}
                className="text-xs text-gray-400 hover:text-white underline font-mono"
              >
                {showAllMatches ? '🔒 Show Only Top #1 Match' : `👁️ View All ${results.length} Secondary Candidates`}
              </button>
            )}
          </div>

          {searching ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <div className="w-8 h-8 rounded-full border-2 border-t-transparent border-[#00a884] animate-spin"></div>
              <p className="text-xs text-gray-400">Computing CLIP image embedding...</p>
            </div>
          ) : results.length > 0 ? (
            (() => {
              const displayList = showAllMatches ? results : [results[0]];
              return (
                <div className="space-y-6">
                  {displayList.map((r, index) => (
                    <div
                      key={r.productId}
                      className={`p-6 bg-[#111b21] rounded-2xl glass flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-6 relative transition-all ${
                        index === 0
                          ? 'border-2 border-[#00a884] shadow-2xl shadow-[#00a884]/20 bg-gradient-to-r from-[#00a884]/10 to-transparent'
                          : 'border border-[#222e35]'
                      }`}
                    >
                      {index === 0 && (
                        <div className="absolute -top-3 left-6 bg-[#00a884] text-white text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider shadow-lg flex items-center space-x-1.5">
                          <span>🏆</span>
                          <span>Detected Match (#1)</span>
                        </div>
                      )}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={r.imageUrl || 'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=200'}
                        alt={r.productName}
                        className="w-32 h-32 rounded-xl object-cover border border-[#374248] shadow-md mx-auto sm:mx-0"
                      />
                      <div className="flex-1 flex flex-col justify-between space-y-3 sm:space-y-0">
                        <div>
                          <div className="flex justify-between items-center flex-wrap gap-2">
                            <span className="text-xs font-mono font-bold text-[#00a884] uppercase bg-[#00a884]/10 px-2.5 py-1 rounded-lg border border-[#00a884]/20">
                              CODE: {r.productCode}
                            </span>
                            <span className={`text-sm font-extrabold ${index === 0 ? 'text-[#00a884]' : 'text-white'}`}>
                              {r.similarityScore}% Confidence Match
                            </span>
                          </div>
                          <h3 className="text-lg font-bold text-white mt-3 leading-snug">{r.productName}</h3>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-[#222e35]">
                          <span className="text-xs text-gray-400">Unit Price:</span>
                          <span className="text-base font-extrabold text-white">${Number(r.price).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()
          ) : (
            <div className="p-12 text-center border border-dashed border-[#222e35] rounded-2xl">
              <span className="text-3xl block mb-2">👁️</span>
              <p className="text-xs text-gray-400">Snap a photo with your real camera or upload an image and click Search to display vector matches.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

