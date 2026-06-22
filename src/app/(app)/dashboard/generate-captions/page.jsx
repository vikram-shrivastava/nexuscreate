"use client";

import { useState, useEffect } from "react";
import {
  Upload,
  FileVideo,
  Video,
  Loader2,
  X,
  AlertCircle,
  Home,
  Clock,
  Type,
  Zap,
  Sparkles,
  CheckCircle2,
  ArrowRight
} from "lucide-react";

import { Toaster, toast } from "sonner";
import { CldUploadWidget } from "next-cloudinary";
import { useRouter } from "next/navigation";

export default function GenerateCaptionsPage() {
  const router = useRouter();

  const [isPageLoading, setIsPageLoading] = useState(true);

  const [cloudinaryUrl, setCloudinaryUrl] = useState(null);
  const [publicId, setPublicId] = useState(null);
  const [originalSize, setOriginalSize] = useState(0);
  const [fileName, setFileName] = useState(null);
  const [fileType, setFileType] = useState(null);

  const [isQueued, setIsQueued] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsPageLoading(false), 400);
    return () => clearTimeout(timer);
  }, []);

  // Cloudinary Upload Success
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

  setFileName(
  `${info.original_filename || info.public_id}.${info.format}`
 );

setFileType(info.format);

setIsQueued(false);
setError(null);

toast.success("Video uploaded successfully!");
  }
};

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / k ** i) * 100) / 100 + " " + sizes[i];
  };

  // Generate Captions (Queue)
  const handleGenerateCaptions = async () => {
    if (!publicId) return toast.error("Upload a video first!");

    setError(null);

    try {
      const response = await fetch("/api/generate-captions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicId,
          cloudinaryUrl,
          originalSize,
          fileName,
          fileType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to enqueue job");
      }

      toast.success("Caption job queued successfully!");
      setIsQueued(true);

    } catch (err) {
      console.error(err);
      setError(err.message);
      toast.error(err.message);
    }
  };

const handleReset = () => {
  setCloudinaryUrl(null);
  setPublicId(null);
  setOriginalSize(0);
  setFileName(null);
  setFileType(null);
  setIsQueued(false);
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
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Generate Captions</h1>
            <p className="text-slate-500 mt-1 text-sm">Automatically generate and burn subtitles into your video using AI.</p>
          </div>
          
          {/* Usage Pill */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs font-medium text-slate-600 shadow-sm">
            <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
            <span>Auto-detect language enabled</span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto">

        {/* --- UPLOAD AREA --- */}
        {!cloudinaryUrl && (
          <div className="group relative bg-white border-2 border-dashed border-slate-200 rounded-2xl p-12 transition-all hover:border-indigo-400 hover:bg-indigo-50/10 cursor-pointer">
            <CldUploadWidget
              uploadPreset="Projects"
              onSuccess={handleUploadSuccess}
              options={{
                resourceType: "video",
                clientAllowedFormats: ["mp4", "mov"],
                maxFileSize: 500000000, // 500MB
              }}
              >
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

        {/* --- MAIN CONTENT --- */}
        {cloudinaryUrl && (
          <div className="grid lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Left Column: Preview */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-black rounded-2xl overflow-hidden shadow-lg ring-1 ring-slate-900/5 aspect-video relative">
                <video
                  src={cloudinaryUrl}
                  controls
                  className="w-full h-full object-contain"
                />
              </div>

              {/* File Info Card */}
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
                       {formatFileSize(originalSize)} • Ready for captions
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleReset}
                  disabled={isQueued}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Remove file"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Right Column: Controls or Queue Status */}
            <div className="lg:col-span-1">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm h-full flex flex-col">
                
                {/* --- QUEUE SUCCESS STATE --- */}
                {isQueued ? (
                  <div className="flex flex-col h-full">
                    <div className="flex items-center gap-2 mb-6">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-sm font-semibold text-slate-600 uppercase tracking-wider">Status: Processing</span>
                    </div>

                    <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
                        <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center relative">
                           <Sparkles className="w-8 h-8 text-indigo-600" />
                           <div className="absolute -right-1 -bottom-1 bg-white rounded-full p-1 shadow-sm">
                              <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                           </div>
                        </div>

                        <div>
                           <h3 className="text-lg font-bold text-slate-900 mb-2">Analyzing Audio...</h3>
                           <p className="text-sm text-slate-500 leading-relaxed">
                             We are transcribing your audio and syncing subtitles. This usually takes <strong>1-2 minutes</strong>.
                           </p>
                        </div>

                        <div className="bg-slate-50 rounded-lg p-3 w-full flex items-center justify-center gap-2 text-xs text-slate-500">
                           <Clock className="w-3.5 h-3.5" />
                           You can safely leave this page
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-100">
                       <button
                         onClick={() => router.push("/dashboard")}
                         className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold transition-all shadow-lg shadow-slate-200"
                       >
                         <Home className="w-4 h-4" />
                         Return to Dashboard
                       </button>
                    </div>
                  </div>
                ) : (
                  /* --- INITIAL ACTION STATE --- */
                  <div className="flex flex-col h-full">
                    <h3 className="font-semibold text-slate-900 mb-6 flex items-center gap-2">
                      <Type className="w-4 h-4 text-indigo-500" />
                      Configuration
                    </h3>

                    <div className="space-y-4 mb-8">
                       <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-3">
                             Caption Style
                          </label>
                          <div className="flex items-center gap-3">
                             <div className="h-10 w-10 bg-black rounded flex items-center justify-center text-white font-bold text-xs">
                                Aa
                             </div>
                             <div>
                                <p className="text-sm font-semibold text-slate-900">Modern Bold</p>
                                <p className="text-xs text-slate-500">White text, black outline</p>
                             </div>
                          </div>
                       </div>

                       {/* Error Display */}
                       {error && (
                        <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex gap-3">
                          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                          <p className="text-sm text-red-700">{error}</p>
                        </div>
                      )}
                    </div>

                    <div className="mt-auto">
                       <button
                        onClick={handleGenerateCaptions}
                        className="w-full group flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-all shadow-lg shadow-indigo-200"
                      >
                        <Sparkles className="w-4 h-4 text-indigo-200 group-hover:text-white transition-colors" />
                        Generate Captions
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                      <p className="text-center text-xs text-slate-400 mt-3">
                        Consumes 1 credit per minute of video
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
