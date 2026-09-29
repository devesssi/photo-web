'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Camera, Sparkles, Sliders, RefreshCw, Upload, Download, Aperture, Sun, SwitchCamera, Image as ImageIcon } from 'lucide-react';

export default function Home() {
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [copilotData, setCopilotData] = useState<any>(null);
  const [enhancedImage, setEnhancedImage] = useState<string | null>(null);
  const [enhancing, setEnhancing] = useState(false);
  const [shutterFlash, setShutterFlash] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize WebRTC Camera Stream
  useEffect(() => {
    let stream: MediaStream | null = null;

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 1080 }, height: { ideal: 1350 } },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setCameraActive(true);
        }
      } catch (err) {
        console.warn('Camera access denied or unavailable:', err);
        setCameraActive(false);
      }
    }

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [facingMode]);

  // Flip Camera Front / Rear
  const toggleCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Handle Gallery Upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCapturedBlob(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setSelectedImage(event.target?.result as string);
        setCopilotData(null);
        setEnhancedImage(null);
      };
      reader.readAsDataURL(file);
    }
  };

  // Instant Shutter Snapshot from WebRTC Video
  const handleShutterSnap = () => {
    if (!videoRef.current || !canvasRef.current) return;
    setShutterFlash(true);
    setTimeout(() => setShutterFlash(false), 150);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = 1080;
    canvas.height = 1350;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            setCapturedBlob(blob);
            const dataUrl = canvas.toDataURL('image/jpeg');
            setSelectedImage(dataUrl);
            setCopilotData(null);
            setEnhancedImage(null);
            // Auto trigger copilot pose analysis
            analyzeBlob(blob);
          }
        },
        'image/jpeg',
        0.92
      );
    }
  };

  // Send Image Blob to Gemini Copilot
  const analyzeBlob = async (blob: Blob) => {
    setAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append('file', blob, 'capture.jpg');

      const response = await fetch('http://localhost:8000/api/v1/copilot/suggest-pose', {
        method: 'POST',
        body: formData,
      });
      if (response.ok) {
        const data = await response.json();
        setCopilotData(data);
      } else {
        alert('Copilot analysis failed. Check backend Uvicorn console logs.');
      }
    } catch (err) {
      console.error(err);
      alert('Network error communicating with copilot backend.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAnalyzePose = async () => {
    if (!capturedBlob && selectedImage) {
      const res = await fetch(selectedImage);
      const blob = await res.blob();
      analyzeBlob(blob);
    } else if (capturedBlob) {
      analyzeBlob(capturedBlob);
    }
  };

  // Send Image to Darkroom Engine
  const handleEnhanceImage = async () => {
    let blobToSend = capturedBlob;
    if (!blobToSend && selectedImage) {
      const res = await fetch(selectedImage);
      blobToSend = await res.blob();
    }
    if (!blobToSend) return;

    setEnhancing(true);
    try {
      const formData = new FormData();
      formData.append('file', blobToSend, 'capture.jpg');

      const response = await fetch('http://localhost:8000/api/v1/darkroom/enhance', {
        method: 'POST',
        body: formData,
      });
      if (response.ok) {
        const imageBlob = await response.blob();
        const url = URL.createObjectURL(imageBlob);
        setEnhancedImage(url);
      } else {
        alert('Darkroom processing failed.');
      }
    } catch (err) {
      console.error(err);
      alert('Network error communicating with darkroom engine.');
    } finally {
      setEnhancing(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#FAF7EE] bg-[radial-gradient(#121212_0.75px,transparent_0.75px)] [background-size:24px_24px] text-[#121212] font-mono selection:bg-[#FFE600] pb-12">
      
      {/* Top Retro Marquee Ticker */}
      <div className="bg-[#FFE600] border-b-4 border-[#121212] py-1 px-4 overflow-hidden whitespace-nowrap font-bold text-xs uppercase tracking-widest flex items-center shadow-[0_2px_0_#121212]">
        <div className="animate-marquee flex gap-8">
          <span>★ 35MM RETRO ENGINE ★ LIVE WEBRTC VIEW FINDER ★ REAL-TIME GEMINI POSE BLUEPRINT ★ INSTANT 4:5 DARKROOM ENHANCE ★</span>
          <span>★ 35MM RETRO ENGINE ★ LIVE WEBRTC VIEW FINDER ★ REAL-TIME GEMINI POSE BLUEPRINT ★ INSTANT 4:5 DARKROOM ENHANCE ★</span>
        </div>
      </div>

      {/* Header Bar */}
      <header className="max-w-5xl mx-auto my-6 px-4">
        <div className="border-4 border-[#121212] bg-white p-4 shadow-[6px_6px_0px_0px_#121212] flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="bg-[#FFE600] p-2 border-2 border-[#121212]">
              <Aperture className="w-6 h-6 text-[#121212]" />
            </div>
            <div>
              <h1 className="font-black text-xl tracking-wider text-[#121212]">AESTHETIC LENS v2.5</h1>
              <p className="text-xs font-semibold text-[#121212]/70 uppercase tracking-widest">AI Gemini Vision Copilot + 35mm Analog Darkroom</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-3 py-1 bg-[#FFE600] border-2 border-[#121212] text-xs font-bold uppercase shadow-[2px_2px_0px_0px_#121212]">
              ● ENGINE PORT 8000
            </span>
          </div>
        </div>
      </header>

      {/* Main Viewfinder Section */}
      <div className="max-w-5xl mx-auto px-4 mb-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          
          {/* Left Flanking Polaroid Card (Desktop Only) */}
          <div className="hidden md:block md:col-span-3 transform -rotate-2 hover:rotate-0 transition-transform duration-300">
            <div className="border-4 border-[#121212] bg-white p-3 shadow-[6px_6px_0px_0px_#121212] relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#FFE600] border-2 border-[#121212] px-3 py-0.5 text-[10px] font-bold tracking-widest shadow-[2px_2px_0px_0px_#121212] z-10 uppercase">
                35mm Benchmark
              </div>
              <div className="aspect-[3/4] bg-[#121212] overflow-hidden border-2 border-[#121212] mb-3 relative group">
                <img 
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80" 
                  alt="Café Lean Candid" 
                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-300"
                />
              </div>
              <div className="text-center font-bold text-xs uppercase tracking-tight">
                "SCENE: CAFÉ LEAN"
              </div>
              <div className="text-[10px] text-gray-500 text-center font-mono mt-1">
                NATURAL LIGHT // 45° GAZE
              </div>
            </div>
          </div>

          {/* Center Interactive Viewfinder */}
          <div className="col-span-1 md:col-span-6 border-4 border-[#121212] bg-white p-5 shadow-[8px_8px_0px_0px_#121212]">
            <div className="flex justify-between items-center mb-4 border-b-2 border-[#121212] pb-3">
              <h2 className="font-bold text-base flex items-center gap-2">
                <Camera className="w-5 h-5 text-[#FF4D2D]" />
                LIVE VIEW FINDER (4:5)
              </h2>
              <span className="text-xs bg-[#FFE600] border-2 border-[#121212] px-2 py-0.5 font-bold uppercase shadow-[2px_2px_0px_0px_#121212]">
                {cameraActive ? '🔴 LIVE 35MM' : 'GALLERY FRAME'}
              </span>
            </div>

            {/* 4:5 Camera Stream Viewfinder */}
            <div className="relative border-4 border-[#121212] bg-black aspect-[4/5] overflow-hidden mb-4 group shadow-[4px_4px_0px_0px_#121212]">
              
              {/* Shutter White Flash Overlay */}
              {shutterFlash && <div className="absolute inset-0 bg-white z-30 transition-opacity duration-150" />}

              {selectedImage ? (
                <img src={selectedImage} alt="Captured frame" className="w-full h-full object-cover" />
              ) : (
                <video ref={videoRef} playsInline autoPlay muted className="w-full h-full object-cover" />
              )}

              {/* Viewfinder Crosshairs & Frame Guide Overlay */}
              <div className="absolute inset-0 border-2 border-white/30 pointer-events-none flex items-center justify-center">
                <div className="w-12 h-12 border border-white/60 relative">
                  <div className="absolute top-1/2 left-0 right-0 border-t border-white/60" />
                  <div className="absolute left-1/2 top-0 bottom-0 border-l border-white/60" />
                </div>
              </div>

              {/* Camera Flip Control Button */}
              <button
                onClick={toggleCamera}
                className="absolute top-3 right-3 bg-white border-2 border-[#121212] p-2 shadow-[2px_2px_0px_0px_#121212] hover:bg-[#FFE600] transition-colors z-20"
                title="Flip Camera Lens"
              >
                <SwitchCamera className="w-4 h-4 text-[#121212]" />
              </button>

              {/* Hidden Canvas for Frame Capture */}
              <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* Shutter & Capture Controls */}
            <div className="flex items-center justify-between gap-3 mb-4 p-3 bg-[#FAF7EE] border-3 border-[#121212]">
              {/* Gallery Input Button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-[#121212] bg-white p-3 shadow-[3px_3px_0px_0px_#121212] hover:bg-[#FFE600] transition-colors flex items-center gap-1.5 text-xs font-bold uppercase"
              >
                <ImageIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Gallery</span>
              </button>

              {/* Main Shutter Snap Button */}
              <button
                onClick={handleShutterSnap}
                className="h-16 w-16 rounded-full bg-white border-4 border-[#121212] shadow-[4px_4px_0px_0px_#121212] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center group"
                title="Capture Frame"
              >
                <div className="h-10 w-10 rounded-full bg-[#FF4D2D] border-2 border-[#121212] group-hover:scale-105 transition-transform" />
              </button>

              {/* Reset to Camera Feed */}
              <button
                onClick={() => {
                  setSelectedImage(null);
                  setCopilotData(null);
                  setEnhancedImage(null);
                }}
                className="border-2 border-[#121212] bg-white p-3 shadow-[3px_3px_0px_0px_#121212] hover:bg-[#FFE600] transition-colors text-xs font-bold uppercase flex items-center gap-1"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">Reset</span>
              </button>

              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
                accept="image/*" 
                className="hidden" 
              />
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleAnalyzePose}
                disabled={!selectedImage || analyzing}
                className="border-3 border-[#121212] bg-[#FFE600] hover:bg-[#ffe000] text-[#121212] font-bold py-3 px-3 shadow-[4px_4px_0px_0px_#121212] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-xs uppercase tracking-wider"
              >
                {analyzing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                1. POSE COPILOT
              </button>

              <button
                onClick={handleEnhanceImage}
                disabled={!selectedImage || enhancing}
                className="border-3 border-[#121212] bg-[#FF4D2D] text-white hover:bg-[#e03e1f] font-bold py-3 px-3 shadow-[4px_4px_0px_0px_#121212] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-xs uppercase tracking-wider"
              >
                {enhancing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sliders className="w-4 h-4" />}
                2. DARKROOM ENHANCE
              </button>
            </div>
          </div>

          {/* Right Flanking Polaroid Card (Desktop Only) */}
          <div className="hidden md:block md:col-span-3 transform rotate-3 hover:rotate-0 transition-transform duration-300">
            <div className="border-4 border-[#121212] bg-white p-3 shadow-[6px_6px_0px_0px_#121212] relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#FFE600] border-2 border-[#121212] px-3 py-0.5 text-[10px] font-bold tracking-widest shadow-[2px_2px_0px_0px_#121212] z-10 uppercase">
                Streetwear Edit
              </div>
              <div className="aspect-[3/4] bg-[#121212] overflow-hidden border-2 border-[#121212] mb-3 relative group">
                <img 
                  src="https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80" 
                  alt="Elevator Fit Check" 
                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-300"
                />
              </div>
              <div className="text-center font-bold text-xs uppercase tracking-tight">
                "SCENE: FIT CHECK"
              </div>
              <div className="text-[10px] text-gray-500 text-center font-mono mt-1">
                CHEST HEIGHT // 30° SHOULDER
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Copilot Analysis Output Card */}
      {copilotData && (
        <section className="max-w-5xl mx-auto px-4 mb-12">
          <div className="border-4 border-[#121212] bg-[#FFE600] p-6 shadow-[8px_8px_0px_0px_#121212]">
            <div className="flex items-center justify-between border-b-4 border-[#121212] pb-3 mb-4">
              <h3 className="font-black text-xl tracking-tight uppercase flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-[#121212]" />
                COPILOT POSE BLUEPRINT
              </h3>
              <span className="bg-white border-2 border-[#121212] px-3 py-1 font-bold text-xs uppercase shadow-[2px_2px_0px_0px_#121212]">
                {copilotData.environment_detected}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="border-3 border-[#121212] bg-white p-4 shadow-[4px_4px_0px_0px_#121212]">
                <div className="text-xs font-bold uppercase text-[#FF4D2D] mb-1">HEAD & GAZE</div>
                <p className="text-sm font-semibold">{copilotData.pose_blueprint?.head_and_gaze}</p>
              </div>
              <div className="border-3 border-[#121212] bg-white p-4 shadow-[4px_4px_0px_0px_#121212]">
                <div className="text-xs font-bold uppercase text-[#FF4D2D] mb-1">HANDS & ARMS</div>
                <p className="text-sm font-semibold">{copilotData.pose_blueprint?.hands_and_arms}</p>
              </div>
              <div className="border-3 border-[#121212] bg-white p-4 shadow-[4px_4px_0px_0px_#121212]">
                <div className="text-xs font-bold uppercase text-[#FF4D2D] mb-1">TORSO & POSITIONING</div>
                <p className="text-sm font-semibold">{copilotData.pose_blueprint?.torso_and_legs}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="border-3 border-[#121212] bg-[#FAF7EE] p-4">
                <div className="font-bold text-xs uppercase flex items-center gap-1 mb-1">
                  <Sun className="w-4 h-4 text-[#FF4D2D]" /> LIGHTING CORRECTION
                </div>
                <p className="text-sm">{copilotData.lighting_fix}</p>
              </div>
              <div className="border-3 border-[#121212] bg-[#FAF7EE] p-4">
                <div className="font-bold text-xs uppercase flex items-center gap-1 mb-1">
                  <Camera className="w-4 h-4 text-[#FF4D2D]" /> CAMERA PLACEMENT TIP
                </div>
                <p className="text-sm">{copilotData.camera_placement_tip}</p>
              </div>
            </div>

            {/* Reference Images Grid */}
            {copilotData.matching_references && copilotData.matching_references.length > 0 && (
              <div>
                <h4 className="font-black text-sm uppercase tracking-wider mb-3">RECOMMENDED EDITORIAL BENCHMARKS</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {copilotData.matching_references.map((ref: any, idx: number) => (
                    <div key={idx} className="border-2 border-[#121212] bg-white p-2 shadow-[3px_3px_0px_0px_#121212]">
                      <img src={ref.preview_url} alt={ref.alt_description || 'Ref'} className="w-full aspect-[3/4] object-cover border border-[#121212] mb-1" />
                      <div className="text-[10px] font-bold truncate">BY {ref.photographer}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Enhanced Darkroom Output Section */}
      {enhancedImage && (
        <section className="max-w-5xl mx-auto px-4 mb-12">
          <div className="border-4 border-[#121212] bg-white p-6 shadow-[8px_8px_0px_0px_#121212]">
            <div className="flex items-center justify-between border-b-4 border-[#121212] pb-3 mb-4">
              <h3 className="font-black text-xl tracking-tight uppercase flex items-center gap-2">
                <Sliders className="w-6 h-6 text-[#FF4D2D]" />
                DARKROOM OUTPUT (4:5 MATTE + GRAIN)
              </h3>
              <a
                href={enhancedImage}
                download="aesthetic_darkroom.jpg"
                className="bg-[#FFE600] border-2 border-[#121212] px-3 py-1 font-bold text-xs uppercase flex items-center gap-1 shadow-[2px_2px_0px_0px_#121212]"
              >
                <Download className="w-4 h-4" /> DOWNLOAD HD
              </a>
            </div>
            <div className="max-w-md mx-auto aspect-[4/5] border-4 border-[#121212] shadow-[6px_6px_0px_0px_#121212] overflow-hidden">
              <img src={enhancedImage} alt="Enhanced Darkroom" className="w-full h-full object-cover" />
            </div>
          </div>
        </section>
      )}

      {/* Swipeable Horizontal 35mm Lookbook Carousel */}
      <section className="max-w-5xl mx-auto px-4">
        <div className="border-4 border-[#121212] bg-white p-6 shadow-[8px_8px_0px_0px_#121212]">
          <div className="flex items-center justify-between border-b-4 border-[#121212] pb-3 mb-6">
            <h3 className="font-black text-base md:text-lg tracking-wider uppercase">
              35MM LOOKBOOK // PRE-CURATED EDITORIAL BENCHMARKS
            </h3>
            <span className="bg-[#FFE600] border-2 border-[#121212] px-2 py-0.5 text-xs font-bold uppercase hidden sm:inline-block">
              SWIPE BENCHMARKS
            </span>
          </div>

          <div className="flex space-x-4 overflow-x-auto pb-4 snap-x scrollbar-thin">
            {[
              { img: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80', title: 'CAFÉ CANDID GAZE', tag: 'PORTRA 400' },
              { img: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80', title: 'ELEVATOR FIT CHECK', tag: 'TRI-X 400' },
              { img: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80', title: 'URBAN PAVEMENT WALK', tag: 'SUPERIA 400' },
              { img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80', title: 'GOLDEN HOUR SHADES', tag: 'CINESTILL 800' },
              { img: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80', title: 'ARCHITECTURAL LEAN', tag: 'EKTAR 100' },
            ].map((item, i) => (
              <div key={i} className="flex-none w-48 border-3 border-[#121212] bg-[#FAF7EE] p-2 shadow-[4px_4px_0px_0px_#121212] snap-start hover:-translate-y-1 transition-transform">
                <div className="aspect-[3/4] border-2 border-[#121212] bg-[#121212] overflow-hidden mb-2 relative">
                  <img src={item.img} alt={item.title} className="w-full h-full object-cover" />
                </div>
                <div className="text-[11px] font-bold truncate uppercase text-[#121212]">{item.title}</div>
                <div className="text-[9px] font-bold text-[#FF4D2D] uppercase tracking-wider">{item.tag}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

    </main>
  );
}
