"use client";

import { useState, useEffect } from "react";
import {
  Upload,
  Video,
  Download,
  X,
  Check,
  Loader2,
  FileVideo,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Zap
} from "lucide-react";
import { Toaster, toast } from "sonner";
import { CldUploadWidget } from "next-cloudinary";

export default function CompressVideoPage() {
  const [isPageLoading, setIsPageLoading] = useState(true);

  // File states
  const [cloudinaryUrl, setCloudinaryUrl] = useState(null);
  const [publicId, setPublicId] = useState(null);
  const [originalSize, setOriginalSize] = useState(0);

  // Process states
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [progress, setProgress] = useState(0);
  const [compressedVideoUrl, setCompressedVideoUrl] = useState(null);
  const [compressedSize, setCompressedSize] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsPageLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  // Cloudinary Upload Handler
  const handleUploadSuccess = (result) => {
  if (result.event === "success") {
    const info = result.info;

    const allowedFormats = ["mp4", "mov"];
    const uploadedFormat = info.format?.toLowerCase();

    if (!allowedFormats.includes(uploadedFormat)) {
      toast.error("Only MP4 and MOV video formats are allowed.");
      return;
    }

    if (info.resource_type !== "video") {
      toast.error("Only video files are allowed.");
      return;
    }

    setCloudinaryUrl(info.secure_url);
    setPublicId(info.public_id);
    setOriginalSize(info.bytes);

    setIsComplete(false);
    setProgress(0);
    setError(null);

    toast.success("Video uploaded successfully!");
  }
};
  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const handleCompress = async () => {
    if (!publicId) return;

    setIsProcessing(true);
    setProgress(0);
    setError(null);

    // Mock progress simulation
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 5;
      });
    }, 200);

    try {
      const response = await fetch("/api/compress-video", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          publicId: publicId,
          originalSize: originalSize
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message);
      }

      const data = await response.json();
      
      // Complete progress
      clearInterval(progressInterval);
      setProgress(100);

      setCompressedVideoUrl(data.url);
      setCompressedSize(data.compressedSize);
      setIsComplete(true);

      toast.success("Compression complete!");
    } catch (err) {
      console.error("Compression error:", err);
      setError(err.message);
      toast.error("Compression failed. Please try again.");
      setProgress(0);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setCloudinaryUrl(null);
    setPublicId(null);
    setCompressedVideoUrl(null);
    setOriginalSize(0);
    setCompressedSize(0);
    setIsProcessing(false);
    setIsComplete(false);
    setProgress(0);
    setError(null);
  };

  if (isPageLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-80px)]">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-full font-['Inter',_sans-serif]">
      <Toaster position="top-right" />
      
      {/* --- PAGE HEADER --- */}
      <div className="max-w-5xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Compress Video</h1>
            <p className="text-slate-500 mt-1 text-sm">Reduce file size by up to 80% without sacrificing visual quality.</p>
          </div>
          
          {/* Usage Pill */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs font-medium text-slate-600 shadow-sm">
            <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
            <span>2/10 Free Credits Used</span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto">
        
        {/* --- UPLOAD STATE --- */}
        {!cloudinaryUrl && (
          <div className="group relative bg-white border-2 border-dashed border-slate-200 rounded-2xl p-12 transition-all hover:border-indigo-400 hover:bg-indigo-50/10 cursor-pointer">
            <CldUploadWidget
              uploadPreset="Projects"
              onSuccess={handleUploadSuccess}
              options={{
                resourceType: "video",
                clientAllowedFormats: ["mp4", "mov"],
                maxFileSize: 500000000, // 500MB
              }}>            
              {({ open }) => (
                <div onClick={() => open()} className="flex flex-col items-center justify-center text-center h-64">
                  <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform duration-300">
                    <Upload className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">
                    Upload your video
                  </h3>
                  <p className="text-slate-500 max-w-xs mx-auto mb-6">
                    Drag and drop or click to browse. Supports MP4 and MOV videos up to 500MB.                  
                  </p>
                  <button className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 font-medium rounded-xl shadow-sm hover:bg-slate-50 transition-colors">
                    Select File
                  </button>
                </div>
              )}
            </CldUploadWidget>
          </div>
        )}

        {/* --- PROCESSING / RESULT STATE --- */}
        {cloudinaryUrl && (
          <div className="grid lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Left Column: Video Preview */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-black rounded-2xl overflow-hidden shadow-lg ring-1 ring-slate-900/5 aspect-video relative group">
                <video
                  src={isComplete ? compressedVideoUrl : cloudinaryUrl}
                  controls
                  className="w-full h-full object-contain"
                />
                
                {/* Overlay Badge */}
                <div className="absolute top-4 left-4 px-3 py-1 bg-black/60 backdrop-blur-md text-white text-xs font-medium rounded-full border border-white/10">
                  {isComplete ? 'Optimized Preview' : 'Original Preview'}
                </div>
              </div>

              {/* File Info Strip */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
                    <FileVideo className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-medium text-slate-900 truncate max-w-[200px] md:max-w-xs">
                      {publicId}
                    </p>
                    <p className="text-xs text-slate-500">
                       {formatFileSize(originalSize)} • Ready to process
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleReset}
                  disabled={isProcessing}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                  title="Remove file"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Right Column: Controls & Stats */}
            <div className="lg:col-span-1">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm h-full flex flex-col">
                
                <h3 className="font-semibold text-slate-900 mb-6 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  Optimization Details
                </h3>

                {/* Progress Bar */}
                {isProcessing && (
                  <div className="mb-8">
                    <div className="flex justify-between text-xs font-medium text-slate-600 mb-2">
                      <span>Compressing...</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 transition-all duration-300 ease-out"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Error State */}
                {error && (
                  <div className="bg-red-50 border border-red-100 p-4 rounded-xl mb-6 flex gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                {/* Success Stats */}
                {isComplete ? (
                  <div className="space-y-6">
                    <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex gap-3 items-start">
                       <div className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                         <Check className="w-3 h-3 text-emerald-600" />
                       </div>
                       <div>
                         <p className="text-sm font-medium text-emerald-900">Success!</p>
                         <p className="text-xs text-emerald-700 mt-1">Video optimized perfectly.</p>
                       </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                         <span className="text-xs text-slate-500">Original Size</span>
                         <span className="text-sm font-medium text-slate-700">{formatFileSize(originalSize)}</span>
                      </div>
                      <div className="flex justify-center">
                        <ArrowRight className="w-4 h-4 text-slate-300 rotate-90 md:rotate-0" />
                      </div>
                      <div className="flex justify-between items-center p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                         <span className="text-xs text-indigo-600 font-medium">Optimized Size</span>
                         <span className="text-sm font-bold text-indigo-700">{formatFileSize(compressedSize)}</span>
                      </div>
                    </div>

                     <div className="pt-4 border-t border-slate-100 mt-auto">
                       <button
                          onClick={async () => {
                            const res = await fetch(compressedVideoUrl);
                            const blob = await res.blob();
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = `optimized-${publicId}.mp4`;
                            a.click();
                            URL.revokeObjectURL(url);
                          }}
                          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-all shadow-lg shadow-indigo-200"
                        >
                          <Download className="w-4 h-4" />
                          Download Video
                        </button>
                        <button 
                          onClick={handleReset}
                          className="w-full mt-3 py-2 text-sm text-slate-500 hover:text-slate-800 font-medium"
                        >
                          Compress another video
                        </button>
                     </div>
                  </div>
                ) : (
                  /* Default State - Action Button */
                  !isProcessing && (
                    <div className="mt-auto">
                       <div className="bg-slate-50 p-4 rounded-xl mb-6">
                          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Settings</h4>
                          <div className="flex items-center justify-between text-sm">
                             <span className="text-slate-700">Compression Level</span>
                             <span className="font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">High (Smart)</span>
                          </div>
                       </div>

                       <button
                        onClick={handleCompress}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold transition-all shadow-lg shadow-slate-200"
                      >
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        Start Compression
                      </button>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
