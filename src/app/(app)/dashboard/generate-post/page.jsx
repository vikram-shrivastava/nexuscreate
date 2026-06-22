"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation"; // Added for navigation
import {
  Upload,
  FileText,
  Download,
  X,
  Check,
  Loader2,
  FileVideo,
  ImageIcon,
  Copy,
  Sparkles,
  MessageSquare,
  Zap,
  ArrowRight // Changed icon
} from "lucide-react";
import { Toaster, toast } from "sonner";
import { CldUploadWidget } from "next-cloudinary";

export default function GeneratePostPage() {
  const router = useRouter();
  
  // --- State ---
  const [cloudinaryUrl, setCloudinaryUrl] = useState(null);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileType, setFileType] = useState(null);
  
  // Processing State
  const [isProcessing, setIsProcessing] = useState(false);
  const [projectId, setProjectId] = useState(null); // Store Project ID for polling
  
  const [isComplete, setIsComplete] = useState(false);
  const [PublicId,setPublicId]=useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [selectedPlatform, setSelectedPlatform] = useState("linkedin");
  const [generatedPosts, setGeneratedPosts] = useState({});
  const [copiedPlatform, setCopiedPlatform] = useState(null);
  const fileInputRef = useRef(null);

  // --- Platforms Config ---
  const platforms = [
    { 
      id: "linkedin", 
      name: "LinkedIn", 
      icon: "💼", 
      color: "text-blue-700", 
      bg: "bg-blue-50", 
      border: "border-blue-200",
      activeClass: "bg-blue-600 text-white shadow-md shadow-blue-200",
      maxLength: 3000 
    },
    { 
      id: "instagram", 
      name: "Instagram", 
      icon: "📸", 
      color: "text-pink-700", 
      bg: "bg-pink-50", 
      border: "border-pink-200",
      activeClass: "bg-pink-600 text-white shadow-md shadow-pink-200",
      maxLength: 2200 
    },
    { 
      id: "twitter", 
      name: "Twitter", 
      icon: "🐦", 
      color: "text-sky-700", 
      bg: "bg-sky-50", 
      border: "border-sky-200",
      activeClass: "bg-sky-500 text-white shadow-md shadow-sky-200",
      maxLength: 280 
    },
  ];

  useEffect(() => {
    const timer = setTimeout(() => setIsPageLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  // --- POLLING LOGIC ---
  useEffect(() => {
    let intervalId;

    const checkStatus = async () => {
      if (!projectId || !isProcessing) return;

      try {
        // Replace this URL with your actual endpoint to fetch a single Project by ID
        const res = await fetch(`/api/getProjectbyid/?id=${projectId}`); 
        
        if (res.ok) {
          const projectData = await res.json();
          
          // Check if the generatedPost field is populated in the DB
          if (projectData && projectData.generatedPost) {
             // If stored as string in DB, parse it. If object, use directly.
             const parsedPosts = typeof projectData.generatedPost === 'string' 
               ? JSON.parse(projectData.generatedPost) 
               : projectData.generatedPost;

             setGeneratedPosts(parsedPosts);
             setIsProcessing(false);
             setIsComplete(true);
             toast.success("Post generation complete!");
             clearInterval(intervalId);
          }
        }
      } catch (error) {
        console.error("Polling error:", error);
        // We don't stop polling on error immediately in case it's a transient network issue
      }
    };

    if (isProcessing && projectId) {
      // Poll every 5 seconds
      intervalId = setInterval(checkStatus, 5000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isProcessing, projectId]);


  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const handleUploadSuccess = (result) => {

    const format = result?.info?.format?.toLowerCase();

    const allowedFormats = ["mp4", "mov"];

    if (!allowedFormats.includes(format)) {
      toast.error("Only MP4 and MOV videos are allowed.");
      return;
    }


    const url = result?.info?.secure_url;

    if (!url) {
      toast.error("Upload failed. Try again.");
      return;
    }

    setCloudinaryUrl(url);
    setSelectedFile({
      name: result.info.original_filename + "." + result.info.format,
      size: result.info.bytes,
      type: "video",
      PublicId: result.info.public_id
    });

    setFileType("video");
    setMediaPreview(url);
    setIsComplete(false);
    setProjectId(null);

    toast.success("Video uploaded successfully!");
  };
  const handleGenerate = async () => {
    if (!cloudinaryUrl) {
      toast.error("Please upload a media file first.");
      return;
    }

    setIsProcessing(true);
    setIsComplete(false);

    try {
      const response = await fetch('/api/generate-post', {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaUrl: cloudinaryUrl,
          fileName: selectedFile.name,
          fileType: fileType,
          platform: "all",
          publicId:selectedFile.PublicId,
          originalSize: selectedFile.size
        })
      });

      if (!response.ok) {
        throw new Error("Failed to initiate generation");
      }

      const data = await response.json();
      
      // The API now returns a Project ID immediately saying "Queued"
      if (data.projectId) {
         setProjectId(data.projectId);
         toast.info("Added to generation queue. Please wait...");
         // The useEffect hook above will now take over and poll for results
      } else {
         throw new Error("No project ID returned");
      }

    } catch (error) {
      console.error(error);
      toast.error('An error occurred while starting generation.');
      setIsProcessing(false);
    }
  };

  const handleCopy = (platformId) => {
    const postText = generatedPosts[platformId]?.[`post_text_${platformId}`];
    if (postText) {
      navigator.clipboard.writeText(postText);
      setCopiedPlatform(platformId);
      toast.success(`${platformId} post copied to clipboard!`);
      setTimeout(() => setCopiedPlatform(null), 2000);
    }
  };

  const handleDownloadAll = () => {
    let content = "";
    platforms.forEach((platform) => {
      const postText = generatedPosts[platform.id]?.[`post_text_${platform.id}`];
      if (postText) content += `=== ${platform.name.toUpperCase()} ===\n\n${postText}\n\n\n`;
    });
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `social-posts-${selectedFile?.name?.slice(0,20) || "media"}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("All posts downloaded!");
  };

  const handleReset = () => {
    setSelectedFile(null);
    setFileType(null);
    setIsProcessing(false);
    setIsComplete(false);
    setGeneratedPosts({});
    setMediaPreview(null);
    setCloudinaryUrl(null);
    setProjectId(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleGoToDashboard = () => {
    router.push('/dashboard'); 
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
      <div className="max-w-6xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">AI Post Generator</h1>
            <p className="text-slate-500 mt-1 text-sm">Turn your videos into viral social media posts instantly.</p>
          </div>
          
          {/* Usage Pill */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs font-medium text-slate-600 shadow-sm">
            <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
            <span>3 Credits / Generation</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto">

        {/* --- UPLOAD STATE --- */}
        {!selectedFile && (
          <div className="group relative bg-white border-2 border-dashed border-slate-200 rounded-2xl p-12 transition-all hover:border-indigo-400 hover:bg-indigo-50/10 cursor-pointer">
            <CldUploadWidget
              uploadPreset="Projects"
              onSuccess={handleUploadSuccess}
              options={{
                resourceType: "video",
                clientAllowedFormats: ["mp4", "mov"],
                maxFileSize: 100000000, // 100 MB (optional)
              }}>
              {({ open }) => (
                <button onClick={() => open()} className="flex flex-col items-center justify-center text-center h-64 w-full focus:outline-none">
                  <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform duration-300">
                    <Upload className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">
                    Upload Media
                  </h3>
                  <p className="text-slate-500 max-w-xs mx-auto mb-6">
                    Only MP4 and MOV Videos are Supported. We'll analyze the visual content to write your copy.
                  </p>
                  <span className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 font-medium rounded-xl shadow-sm hover:bg-slate-50 transition-colors">
                    Select File
                  </span>
                </button>
              )}
            </CldUploadWidget>
          </div>
        )}

        {/* --- WORKSPACE --- */}
        {selectedFile && (
          <div className="grid lg:grid-cols-5 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* LEFT COLUMN: Media Preview */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-lg ring-1 ring-slate-900/5 relative group">
                {mediaPreview && (
                   fileType === "video" ? (
                      <video src={mediaPreview} controls className="w-full h-auto object-contain max-h-[400px]" />
                   ) : (
                      <img src={mediaPreview} alt="Preview" className="w-full h-auto object-contain max-h-[400px]" />
                   )
                )}
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
                    {fileType === "video" ? <FileVideo className="w-5 h-5 text-indigo-600" /> : <ImageIcon className="w-5 h-5 text-indigo-600" />}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-medium text-slate-900 truncate max-w-[180px]">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-slate-500">
                       {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                </div>
                {/* Disable remove button while processing */}
                <button
                  onClick={handleReset}
                  disabled={isProcessing}
                  className={`p-2 rounded-lg transition-colors ${isProcessing ? 'text-slate-300 cursor-not-allowed' : 'text-slate-400 hover:text-red-500 hover:bg-red-50'}`}
                  title="Remove file"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Action Button (Left Side if not complete) */}
              {!isComplete && !isProcessing && (
                 <button 
                    onClick={handleGenerate} 
                    className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 font-semibold"
                 >
                    <Sparkles className="w-5 h-5 text-amber-300" />
                    <span>Generate All Posts</span>
                 </button>
              )}

              {/* Processing State */}
              {isProcessing && (
                  <div className="bg-white border border-indigo-100 rounded-xl p-6 text-center shadow-sm animate-pulse">
                      <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
                      <h3 className="font-medium text-slate-900">Generating Content...</h3>
                      <p className="text-xs text-slate-500 mt-2 mb-4">This might take a moment. You can stay here or check your dashboard later.</p>
                      
                      <button 
                        onClick={handleGoToDashboard}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium"
                      >
                        <span>Go to Dashboard</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                  </div>
              )}
            </div>

            {/* RIGHT COLUMN: Results */}
            <div className="lg:col-span-3">
                {/* Default Placeholder */}
                {!isComplete && !isProcessing && (
                    <div className="h-full min-h-[300px] bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center p-8">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                            <MessageSquare className="w-8 h-8 text-slate-300" />
                        </div>
                        <h3 className="text-slate-900 font-medium mb-1">No Posts Generated Yet</h3>
                        <p className="text-sm text-slate-500 max-w-xs">Upload your media and click 'Generate' to see AI-written posts for LinkedIn, Instagram, and Twitter.</p>
                    </div>
                )}
                
                {/* Processing Placeholder (Right Side) */}
                 {isProcessing && (
                    <div className="h-full min-h-[300px] bg-slate-50 border-2 border-dashed border-indigo-200 rounded-2xl flex flex-col items-center justify-center text-center p-8">
                         <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center shadow-sm mb-4 animate-bounce">
                            <Sparkles className="w-8 h-8 text-indigo-400" />
                        </div>
                        <h3 className="text-slate-900 font-medium mb-1">AI is Working Magic</h3>
                        <p className="text-sm text-slate-500 max-w-xs">Analysing visuals, writing captions, and formatting for platforms...</p>
                    </div>
                 )}

                {/* Results View */}
                {isComplete && (
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-full">
                        {/* Success Header */}
                        <div className="bg-emerald-50 border-b border-emerald-100 px-6 py-3 flex items-center gap-2">
                            <Check className="w-4 h-4 text-emerald-600" />
                            <span className="text-sm font-medium text-emerald-800">Content Generated Successfully</span>
                        </div>

                        {/* Platform Tabs */}
                        <div className="border-b border-slate-200 p-2 bg-slate-50/50">
                            <div className="flex space-x-2 overflow-x-auto scrollbar-none">
                                {platforms.map((platform) => (
                                    <button
                                        key={platform.id}
                                        onClick={() => setSelectedPlatform(platform.id)}
                                        className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all flex items-center gap-2 ${
                                            selectedPlatform === platform.id 
                                                ? platform.activeClass
                                                : `bg-white text-slate-600 hover:bg-slate-100 border border-slate-200`
                                        }`}
                                    >
                                        <span>{platform.icon}</span>
                                        {platform.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 p-6 bg-white">
                           {platforms.map((platform) => 
                              selectedPlatform === platform.id && (
                                  <div key={platform.id} className="animate-in fade-in duration-300">
                                      <div className="flex items-center justify-between mb-4">
                                          <h3 className="font-bold text-slate-800 text-lg">{platform.name} Draft</h3>
                                          <span className={`text-xs font-medium px-2 py-1 rounded-full bg-slate-100 text-slate-500`}>
                                              {generatedPosts[platform.id]?.[`post_text_${platform.id}`]?.length || 0} / {platform.maxLength} chars
                                          </span>
                                      </div>

                                      <div className="relative group">
                                          <textarea
                                              readOnly
                                              className="w-full h-64 p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                              value={generatedPosts[platform.id]?.[`post_text_${platform.id}`] || "Generating content..."}
                                          />
                                          
                                          <div className="absolute bottom-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                              <button 
                                                onClick={() => handleCopy(platform.id)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg shadow-sm text-xs font-medium text-slate-700 hover:text-indigo-600 hover:border-indigo-200 transition-all"
                                              >
                                                  {copiedPlatform === platform.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                                  {copiedPlatform === platform.id ? "Copied" : "Copy Text"}
                                              </button>
                                          </div>
                                      </div>
                                  </div>
                              )
                           )}
                        </div>

                        {/* Footer Actions */}
                        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                            <button
                                onClick={handleDownloadAll}
                                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-sm font-medium transition-colors"
                            >
                                <Download className="w-4 h-4" />
                                Download All (.txt)
                            </button>
                        </div>
                    </div>
                )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
