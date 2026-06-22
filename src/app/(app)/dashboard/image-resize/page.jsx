"use client";

import { useState, useEffect, useRef } from "react";
import {
  Upload,
  Maximize2,
  Download,
  X,
  Check,
  Loader2,
  Image as ImageIcon,
  Smartphone,
  Monitor,
  Instagram,
  Linkedin,
  Twitter,
  Youtube,
  Facebook,
  Trash2,
  Zap,
  Settings2,
  ArrowRight,
  Layers
} from "lucide-react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { Toaster, toast } from "sonner";
import { CldUploadWidget } from "next-cloudinary";

export default function ImageResizePage() {
  const [isPageLoading, setIsPageLoading] = useState(true);

  // Uploaded images state
  const [uploadedImages, setUploadedImages] = useState([]);

  // Process states
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [progress, setProgress] = useState(0);

  // Selected platforms
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);

  // Results
  const [resizedImages, setResizedImages] = useState({});

  const widgetRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setIsPageLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  // Platform Presets Configuration
  const platformPresets = [
    { id: "instagram-post", name: "IG Post", icon: Instagram, width: 1080, height: 1080, ratio: "1:1", color: "text-pink-600", bg: "bg-pink-50", border: "border-pink-100", category: "Social" },
    { id: "instagram-story", name: "IG Story", icon: Instagram, width: 1080, height: 1920, ratio: "9:16", color: "text-pink-600", bg: "bg-pink-50", border: "border-pink-100", category: "Social" },
    { id: "facebook-post", name: "FB Post", icon: Facebook, width: 1200, height: 630, ratio: "1.91:1", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100", category: "Social" },
    { id: "twitter-post", name: "X Post", icon: Twitter, width: 1200, height: 675, ratio: "16:9", color: "text-sky-600", bg: "bg-sky-50", border: "border-sky-100", category: "Social" },
    { id: "linkedin-post", name: "LinkedIn", icon: Linkedin, width: 1200, height: 627, ratio: "1.91:1", color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-100", category: "Social" },
    { id: "youtube-thumb", name: "Thumbnail", icon: Youtube, width: 1280, height: 720, ratio: "16:9", color: "text-red-600", bg: "bg-red-50", border: "border-red-100", category: "Video" },
    { id: "desktop-wall", name: "Desktop", icon: Monitor, width: 1920, height: 1080, ratio: "16:9", color: "text-slate-600", bg: "bg-slate-100", border: "border-slate-200", category: "Device" },
    { id: "mobile-wall", name: "Mobile", icon: Smartphone, width: 1080, height: 1920, ratio: "9:16", color: "text-slate-600", bg: "bg-slate-100", border: "border-slate-200", category: "Device" },
  ];

  // Group by category
  const groupedPlatforms = platformPresets.reduce((acc, p) => {
    acc[p.category] = acc[p.category] || [];
    acc[p.category].push(p);
    return acc;
  }, {});

  const handleUploadSuccess = (result) => {
  if (result?.event === "success") {

    const info = result.info;

    const allowedFormats = [
      "jpg",
      "jpeg",
      "png",
      "webp"
    ];

    const uploadedFormat = info.format?.toLowerCase();

    if (!allowedFormats.includes(uploadedFormat)) {
      toast.error("Only JPG, JPEG, PNG and WEBP images are allowed.");
      return;
    }

    if (info.resource_type !== "image") {
      toast.error("Only image files are allowed.");
      return;
    }


    setUploadedImages((prev) => {

      if (prev.find((p) => p.public_id === info.public_id)) {
        return prev;
      }

      return [
        ...prev,
        {
          secure_url: info.secure_url,
          public_id: info.public_id,
          bytes: info.bytes,
          original_filename:
            info.original_filename || info.public_id,
          format: info.format,
          width: info.width,
          height: info.height,
        },
      ];
    });


    toast.success(`Added ${info.original_filename || "image"}`);

    setIsComplete(false);
    setProgress(0);
  }
};
  const removeUploadedImage = (publicId) => {
    setUploadedImages((prev) => prev.filter((p) => p.public_id !== publicId));
    setResizedImages((prev) => {
      const copy = { ...prev };
      delete copy[publicId];
      return copy;
    });
  };

  const togglePlatform = (platformId) => {
    setSelectedPlatforms((prev) => 
      prev.includes(platformId) ? prev.filter((p) => p !== platformId) : [...prev, platformId]
    );
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const handleResize = async () => {
    if (!uploadedImages.length) return toast.error("Upload at least one image");
    if (!selectedPlatforms.length) return toast.error("Select at least one platform");

    setIsProcessing(true);
    setProgress(5);
    const result = {};

    try {
      const totalTasks = uploadedImages.length * selectedPlatforms.length;
      let completed = 0;

      for (const img of uploadedImages) {
        const key = img.public_id || img.original_filename;
        result[key] = {};

        for (const platformId of selectedPlatforms) {
          const preset = platformPresets.find((p) => p.id === platformId);
          if (!preset) continue;

          const body = {
            publicId: img.public_id,
            cloudinaryUrl: img.secure_url,
            width: preset.width,
            height: preset.height,
            fileName: `${img.original_filename}.${img.format}`,
          };

          const resp = await fetch("/api/image-resize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });

          const data = await resp.json();

          if (!resp.ok) {
            console.error("Resize failed", data);
          } else {
            result[key][platformId] = {
              url: data.resizedUrl,
              width: preset.width,
              height: preset.height,
              platformName: preset.name,
              name: img.original_filename || key,
            };
          }
          
          completed++;
          setProgress(Math.round((completed / totalTasks) * 100));
        }
      }

      setResizedImages(result);
      setIsComplete(true);
      toast.success("All images resized successfully!");
    } catch (err) {
      console.error("Resize error:", err);
      toast.error("Processing failed");
    } finally {
      setIsProcessing(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  const handleDownloadSingle = async (imageKey, platformId) => {
    const img = resizedImages[imageKey]?.[platformId];
    if (!img) return;
    
    toast.promise(
      fetch(img.url).then(res => res.blob()).then(blob => {
        saveAs(blob, `${img.name}_${img.platformName}.jpg`);
      }),
      {
        loading: 'Downloading...',
        success: 'Downloaded successfully',
        error: 'Download failed'
      }
    );
  };

  const handleDownloadAll = async () => {
    const entries = Object.entries(resizedImages);
    if (!entries.length) return;

    toast.promise(
      (async () => {
        const zip = new JSZip();
        const folder = zip.folder("NexusCreate_Resized");

        for (const [imageKey, platforms] of entries) {
          for (const [platformId, img] of Object.entries(platforms)) {
            const r = await fetch(img.url);
            const blob = await r.blob();
            folder.file(`${img.name}_${img.platformName}.jpg`, blob);
          }
        }
        const content = await zip.generateAsync({ type: "blob" });
        saveAs(content, "Resized_Images.zip");
      })(),
      {
        loading: 'Zipping images...',
        success: 'ZIP file downloaded',
        error: 'Failed to create ZIP'
      }
    );
  };

  const handleReset = () => {
    setUploadedImages([]);
    setSelectedPlatforms([]);
    setResizedImages({});
    setIsProcessing(false);
    setIsComplete(false);
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
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Magic Resize</h1>
            <p className="text-slate-500 mt-1 text-sm">Instantly crop and resize multiple images for every social platform.</p>
          </div>
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs font-medium text-slate-600 shadow-sm">
            <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
            <span>Batch Processing Active</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-8">

        {/* --- LEFT PANEL: CONFIGURATION --- */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* 1. Upload Section */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <div className="bg-indigo-100 p-1 rounded text-indigo-600"><ImageIcon size={16} /></div>
                Source Images
              </h3>
              {uploadedImages.length > 0 && (
                 <button onClick={handleReset} className="text-xs text-red-500 hover:text-red-600 font-medium">Reset All</button>
              )}
            </div>

            {uploadedImages.length === 0 ? (
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-indigo-400 hover:bg-indigo-50/30 transition-all cursor-pointer">
                 <CldUploadWidget 
                  uploadPreset="Projects" 
                  onSuccess={handleUploadSuccess}
                  options={{
                    multiple: true,
                    resourceType: "image",
                    clientAllowedFormats: ["jpg", "jpeg", "png", "webp"],
                    maxFileSize: 20000000, // 20MB
                  }}
                  >
                  {({ open }) => (
                    <div onClick={() => open()}>
                      <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Upload size={20} />
                      </div>
                      <p className="text-sm font-medium text-slate-900">Click to Upload</p>
                      <p className="text-xs text-slate-500 mt-1">
                        JPG, JPEG, PNG, WEBP (Max 20MB)
                      </p>
                    </div>
                  )}
                </CldUploadWidget>
              </div>
            ) : (
              <div className="space-y-3">
                {uploadedImages.map((img) => (
                  <div key={img.public_id} className="flex items-center gap-3 p-2 border border-slate-100 rounded-lg bg-slate-50 group">
                    <img src={img.secure_url} alt="thumbnail" className="w-10 h-10 rounded object-cover bg-white" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-700 truncate">{img.original_filename}</p>
                      <p className="text-[10px] text-slate-400">{img.width}x{img.height} • {formatFileSize(img.bytes)}</p>
                    </div>
                    <button 
                      onClick={() => removeUploadedImage(img.public_id)}
                      className="p-1.5 text-slate-400 hover:text-red-500 rounded-md hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <div className="pt-2">
                   <CldUploadWidget 
                     uploadPreset="Projects" 
                     onSuccess={handleUploadSuccess}
                     options={{
                      multiple: true,
                      resourceType: "image",
                      clientAllowedFormats: ["jpg", "jpeg", "png", "webp"],
                      maxFileSize: 20000000, // 20MB
                     }}
                    >
                    {({ open }) => (
                      <button onClick={() => open()} className="w-full py-2 text-xs font-medium text-indigo-600 border border-dashed border-indigo-200 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">
                        + Add more images
                      </button>
                    )}
                  </CldUploadWidget>
                </div>
              </div>
            )}
          </div>

          {/* 2. Platform Selection */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-4">
               <div className="bg-purple-100 p-1 rounded text-purple-600"><Settings2 size={16} /></div>
               Select Targets
            </h3>
            
            <div className="space-y-5 max-h-[400px] overflow-y-auto pr-1 scrollbar-thin">
              {Object.entries(groupedPlatforms).map(([category, platforms]) => (
                <div key={category}>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{category}</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {platforms.map((p) => {
                      const isSelected = selectedPlatforms.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          onClick={() => togglePlatform(p.id)}
                          className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                            isSelected 
                              ? `bg-slate-900 border-slate-900 text-white shadow-md` 
                              : `bg-white border-slate-100 text-slate-600 hover:border-indigo-200 hover:bg-slate-50`
                          }`}
                        >
                          <div className="flex items-center justify-between w-full mb-2">
                            <p className={`text-xs font-semibold ${isSelected ? 'text-white' : 'text-slate-800'}`}>{p.name}</p>
                            <p className={`text-[10px] ${isSelected ? 'text-slate-400' : 'text-slate-400'}`}>{p.ratio}</p>
                          </div>
                          <div className="flex items-center gap-2 w-full mt-auto">
                             <p className={`text-[10px] font-mono ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                               {p.width}x{p.height}
                             </p>
                             {isSelected && <Check size={12} className="ml-auto text-emerald-400" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Action Button */}
          <button
            onClick={handleResize}
            disabled={isProcessing || !uploadedImages.length || !selectedPlatforms.length}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl font-semibold text-lg shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
          >
            {isProcessing ? <Loader2 className="animate-spin" /> : <Maximize2 size={20} />}
            {isProcessing ? "Processing..." : "Resize Images"}
          </button>
        </div>


        {/* --- RIGHT PANEL: RESULTS --- */}
        <div className="lg:col-span-8">
          {!isComplete && !isProcessing ? (
            <div className="h-full min-h-[400px] bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center p-8">
               <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                  <Layers className="w-10 h-10 text-slate-300" />
               </div>
               <h3 className="text-slate-900 font-medium text-lg">Workspace Empty</h3>
               <p className="text-slate-500 max-w-sm mt-2">
                 Upload images and select platforms on the left to generate optimized assets here.
               </p>
            </div>
          ) : (
            <div className="space-y-6">
               {/* Header */}
               {isComplete && (
                 <div className="flex items-center justify-between bg-emerald-50 border border-emerald-100 p-4 rounded-xl">
                    <div className="flex items-center gap-3">
                       <div className="bg-emerald-100 p-2 rounded-full text-emerald-600"><Check size={18} /></div>
                       <div>
                          <h3 className="font-semibold text-emerald-900">Ready for Download</h3>
                          <p className="text-xs text-emerald-700">
                             Processed {Object.keys(resizedImages).length} images into {Object.keys(resizedImages).length * selectedPlatforms.length} variations.
                          </p>
                       </div>
                    </div>
                    <button 
                      onClick={handleDownloadAll}
                      className="px-4 py-2 bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-100 rounded-lg text-sm font-medium shadow-sm flex items-center gap-2 transition-colors"
                    >
                       <Download size={16} /> Download All (ZIP)
                    </button>
                 </div>
               )}

               {/* Progress Bar (if processing) */}
               {isProcessing && (
                 <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center">
                    <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
                    <p className="text-slate-700 font-medium mb-4">Optimizing & Resizing...</p>
                    <div className="w-full max-w-md mx-auto h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-600 transition-all duration-300" style={{ width: `${progress}%` }} />
                    </div>
                 </div>
               )}

               {/* Image Grids */}
               {Object.entries(resizedImages).map(([imageKey, platforms]) => (
                  <div key={imageKey} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
                     <div className="bg-slate-50/50 px-6 py-3 border-b border-slate-100 flex items-center justify-between">
                        <h4 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                           <ImageIcon size={14} className="text-slate-400" /> {imageKey}
                        </h4>
                        <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-500">
                           {Object.keys(platforms).length} Variations
                        </span>
                     </div>
                     
                     <div className="p-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {Object.entries(platforms).map(([platformId, info]) => (
                           <div key={platformId} className="group relative border border-slate-100 rounded-xl overflow-hidden hover:shadow-md transition-all bg-slate-50">
                              <div className="aspect-square relative overflow-hidden bg-slate-100">
                                 <img src={info.url} alt="resized" className="w-full h-full object-contain p-2" />
                                 {/* Hover Overlay */}
                                 <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[1px]">
                                    <button 
                                       onClick={() => handleDownloadSingle(imageKey, platformId)}
                                       className="p-2 bg-white rounded-full text-slate-900 hover:text-indigo-600 transition-colors shadow-lg"
                                       title="Download"
                                    >
                                       <Download size={16} />
                                    </button>
                                    <a 
                                       href={info.url} 
                                       target="_blank" 
                                       rel="noreferrer"
                                       className="p-2 bg-white rounded-full text-slate-900 hover:text-indigo-600 transition-colors shadow-lg"
                                       title="View Full"
                                    >
                                       <Maximize2 size={16} />
                                    </a>
                                 </div>
                              </div>
                              <div className="p-3 bg-white border-t border-slate-100">
                                 <p className="text-xs font-semibold text-slate-900 truncate">{info.platformName}</p>
                                 <p className="text-[10px] text-slate-500 mt-0.5">{info.width} × {info.height}</p>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
