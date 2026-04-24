"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  Upload,
  ShieldCheck,
  Zap,
  Leaf,
  AlertCircle,
  ArrowRight,
  RefreshCcw,
  CheckCircle2,
  Clock,
  X
} from "lucide-react";
import Image from "next/image";

type AppState = "idle" | "camera" | "scanning" | "result";

interface AnalysisResult {
  label: string;
  confidence: number;
  freshness_score: number;
  details: {
    pesticides: string;
    bacteria: string;
    shelf_life: string;
  };
}

export default function FoodQualityApp() {
  const [state, setState] = useState<AppState>("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Start Camera
  const startCamera = async () => {
    try {
      setError(null);
      setState("camera");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera access error:", err);
      setError("Unable to access camera. Please check permissions.");
      setState("idle");
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  // Handle File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const imageData = event.target?.result as string;
      await analyzeImage(imageData);
    };
    reader.readAsDataURL(file);
  };

  // Re-usable Analysis Logic
  const analyzeImage = async (imageData: string) => {
    setState("scanning");
    setProgress(0);

    // Start progress animation
    const interval = setInterval(() => {
      setProgress(p => (p < 90 ? p + 2 : p));
    }, 50);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const response = await fetch(`${API_URL}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageData })
      });

      const data = await response.json();
      clearInterval(interval);
      setProgress(100);

      if (data.success) {
        setResult(data);
        setTimeout(() => setState("result"), 500);
      } else {
        throw new Error(data.error || "Analysis failed");
      }
    } catch (err) {
      console.error("Analysis error:", err);
      setError("Backend connection failed. Is the Flask server running?");
      clearInterval(interval);
      setState("idle");
    }
  };

  // Capture and Analyze
  const captureImage = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = canvas.toDataURL("image/jpeg");
    stopCamera();
    await analyzeImage(imageData);
  };

  const resetApp = () => {
    stopCamera();
    setState("idle");
    setProgress(0);
    setResult(null);
    setError(null);
  };

  return (
    <main className="min-h-screen hero-gradient overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 glass border-b border-white/10 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Leaf className="text-white w-5 h-5" />
          </div>
          <span className="font-bold text-xl tracking-tight">Mr. Food</span>
        </div>
        {error && (
          <div className="bg-red-500/20 text-red-500 px-4 py-1 rounded-full text-xs font-bold animate-pulse">
            {error}
          </div>
        )}
        <button className="px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-semibold hover:bg-primary/20 transition-all">
          Connect Device
        </button>
      </nav>

      <div className="container mx-auto px-6 pt-32 pb-20">
        <AnimatePresence mode="wait">
          {state === "idle" && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center text-center max-w-4xl mx-auto"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="relative w-full aspect-[21/9] rounded-[2rem] overflow-hidden shadow-2xl mb-12 border border-white/20"
              >
                <Image 
                  src="/hero.png" 
                  alt="Hero" 
                  fill 
                  className="object-cover" 
                  priority 
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-8 left-8 text-left">
                  <h2 className="text-3xl font-bold text-white">Live AI Bio-Scanning</h2>
                </div>
              </motion.div>

              <h1 className="text-5xl md:text-8xl font-black mb-6 leading-[0.9] tracking-tighter">
                REAL-TIME <br />
                <span className="text-primary italic">QUALITY SENSING.</span>
              </h1>

              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={startCamera}
                  className="px-10 py-5 bg-primary text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-3 hover:shadow-lg transition-all"
                >
                  <Camera className="w-6 h-6" />
                  Launch Camera
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-10 py-5 glass rounded-2xl font-bold text-lg flex items-center justify-center gap-3 hover:bg-white/10 transition-all"
                >
                  <Upload className="w-6 h-6" />
                  Upload Photo
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                />
              </div>
            </motion.div>
          )}

          {state === "camera" && (
            <motion.div
              key="camera"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-2xl mx-auto"
            >
              <div className="relative aspect-square glass rounded-[4rem] overflow-hidden border-4 border-primary/20 shadow-2xl">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                {/* Overlay UI */}
                <div className="absolute inset-0 border-[20px] border-black/20 pointer-events-none" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-primary/50 border-dashed rounded-3xl pointer-events-none" />

                <div className="absolute bottom-10 left-0 right-0 flex justify-center gap-6 px-10">
                  <button
                    onClick={resetApp}
                    className="p-5 bg-white/10 glass rounded-full text-white hover:bg-white/20 transition-all"
                  >
                    <X className="w-6 h-6" />
                  </button>
                  <button
                    onClick={captureImage}
                    className="p-6 bg-primary text-white rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all"
                  >
                    <div className="w-8 h-8 rounded-full border-4 border-white/50" />
                  </button>
                </div>
              </div>
              <canvas ref={canvasRef} className="hidden" />
            </motion.div>
          )}

          {state === "scanning" && (
            <motion.div
              key="scanning"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="max-w-md mx-auto text-center"
            >
              <div className="relative w-72 h-72 mx-auto mb-16">
                <div className="absolute inset-0 border-[6px] border-primary/10 rounded-full" />
                <motion.div
                  className="absolute inset-0 border-[6px] border-primary rounded-full border-t-transparent"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Zap className="w-20 h-20 text-primary animate-pulse" />
                </div>
                <div className="absolute inset-0 overflow-hidden rounded-full">
                  <div className="w-full h-2 bg-primary/60 blur-md scan-line" />
                </div>
              </div>
              <h2 className="text-4xl font-black mb-4 tracking-tight">AI ANALYZING...</h2>
              <div className="w-full h-4 bg-primary/10 rounded-full overflow-hidden mb-3 border border-white/5">
                <motion.div className="h-full bg-primary" animate={{ width: `${progress}%` }} />
              </div>
              <span className="text-[10px] font-black text-primary tracking-widest uppercase">
                Sending to Neural Engine
              </span>
            </motion.div>
          )}

          {state === "result" && result && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-6xl mx-auto"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <div className="lg:col-span-4 glass p-10 rounded-[3rem] text-center border border-white/20">
                  <div className="inline-flex px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-black mb-4">
                    IDENTIFIED: {result.label}
                  </div>
                  <h3 className="text-muted-foreground font-black text-xs tracking-widest mb-10 uppercase">Freshness Index</h3>
                  <div className="relative w-56 h-56 mx-auto flex items-center justify-center mb-10">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="112" cy="112" r="95" stroke="currentColor" strokeWidth="16" fill="transparent" className="text-primary/10" />
                      <motion.circle
                        cx="112" cy="112" r="95" stroke="currentColor" strokeWidth="16" strokeLinecap="round" fill="transparent"
                        strokeDasharray={2 * Math.PI * 95}
                        initial={{ strokeDashoffset: 2 * Math.PI * 95 }}
                        animate={{ strokeDashoffset: (2 * Math.PI * 95) * (1 - result.freshness_score / 100) }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        className="text-primary"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                      <span className="text-7xl font-black tracking-tighter">{result.freshness_score}</span>
                      <span className="text-[10px] font-black text-primary tracking-[0.2em]">SCORE</span>
                    </div>
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">Confidence: {result.confidence}%</p>
                </div>

                <div className="lg:col-span-8 space-y-10">
                  <div className="glass p-10 rounded-[3rem] border border-white/20">
                    <h3 className="text-2xl font-black mb-8">Bio-Data Report</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {[
                        { label: "Pesticides", value: result.details.pesticides, status: "Verified" },
                        { label: "Microbial Density", value: result.details.bacteria, status: "Low" },
                        { label: "Shelf Life", value: result.details.shelf_life, status: "Predicted" }
                      ].map((item, i) => (
                        <div key={i} className="bg-black/5 p-6 rounded-2xl border border-white/5">
                          <div className="text-[10px] font-black text-muted-foreground uppercase mb-2">{item.label}</div>
                          <div className="flex justify-between items-center">
                            <div className="text-xl font-bold">{item.value}</div>
                            <div className="text-[10px] font-black text-primary bg-primary/10 px-2 py-1 rounded">{item.status}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-center pt-6">
                    <button onClick={resetApp} className="px-12 py-5 bg-foreground text-background rounded-2xl font-black uppercase tracking-widest text-sm flex items-center gap-3">
                      <RefreshCcw className="w-5 h-5" />
                      New Scan
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}

