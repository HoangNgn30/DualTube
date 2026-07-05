import React, { useState, useEffect } from "react";
import VideoPlayerSection from "./components/VideoPlayerSection";
import PokemonStickers from "./components/PokemonStickers";
import { Youtube, Monitor, Keyboard, Heart, Lightbulb, Play, Pause, SquarePlay, Volume2, VolumeX, RotateCcw } from "lucide-react";

declare global {
  interface Window {
    onYouTubeIframeAPIReady?: () => void;
    YT?: any;
  }
}

export default function App() {
  const [isApiReady, setIsApiReady] = useState<boolean>(false);

  // Load the official YouTube IFrame Player API
  useEffect(() => {
    // If window.YT already exists, we are ready
    if (window.YT && window.YT.Player) {
      setIsApiReady(true);
      return;
    }

    // Check if the script tag is already loaded/loading
    const existingScript = document.querySelector(
      'script[src="https://www.youtube.com/iframe_api"]'
    );

    const handleAPIReady = () => {
      setIsApiReady(true);
    };

    if (existingScript) {
      if (window.onYouTubeIframeAPIReady) {
        const oldCallback = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
          oldCallback();
          handleAPIReady();
        };
      } else {
        window.onYouTubeIframeAPIReady = handleAPIReady;
      }
    } else {
      // Create and load the script element
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      // Register the global hook
      window.onYouTubeIframeAPIReady = handleAPIReady;
    }
  }, []);

  // Shortcut definitions for both player modules
  const leftShortcuts = {
    playPause: "q",
    mute: "w",
    rewind: "a",
    forward: "s",
    speedDown: "z",
    speedUp: "x",
  };

  const rightShortcuts = {
    playPause: "p",
    mute: "o",
    rewind: "k",
    forward: "l",
    speedDown: ",",
    speedUp: ".",
  };

  const [isMasterPlaying, setIsMasterPlaying] = useState<boolean>(false);
  const [isMasterMuted, setIsMasterMuted] = useState<boolean>(false);
  const [resetConfirm, setResetConfirm] = useState<boolean>(false);

  useEffect(() => {
    if (resetConfirm) {
      const timer = setTimeout(() => {
        setResetConfirm(false);
      }, 4000); // Reset confirmation state after 4 seconds of inactivity
      return () => clearTimeout(timer);
    }
  }, [resetConfirm]);

  const toggleMasterPlay = () => {
    if (isMasterPlaying) {
      window.dispatchEvent(new CustomEvent("dualtube-master-pause"));
      setIsMasterPlaying(false);
    } else {
      window.dispatchEvent(new CustomEvent("dualtube-master-play"));
      setIsMasterPlaying(true);
    }
  };

  const toggleMasterMute = () => {
    if (isMasterMuted) {
      window.dispatchEvent(new CustomEvent("dualtube-master-unmute"));
      setIsMasterMuted(false);
    } else {
      window.dispatchEvent(new CustomEvent("dualtube-master-mute"));
      setIsMasterMuted(true);
    }
  };

  const handleResetAll = () => {
    if (!resetConfirm) {
      setResetConfirm(true);
    } else {
      // Clear all dualtube-related keys
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith("dualtube_")) {
          localStorage.removeItem(key);
        }
      });
      // Force reload to completely reset all players, playlists, stickers, and defaults
      window.location.reload();
    }
  };

  return (
    <div className="relative min-h-screen bg-[#0a0a0a] text-gray-200 flex flex-col font-sans selection:bg-red-600 selection:text-white overflow-x-hidden pb-12">
      {/* Decorative Pokemon Stickers layer */}
      <PokemonStickers />

      {/* Header Panel matching Elegant Dark theme */}
      <header className="h-14 border-b border-white/10 flex items-center justify-between px-6 bg-[#0f0f0f] sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center shadow-lg shadow-red-600/25">
            <div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[10px] border-l-white border-b-[6px] border-b-transparent ml-0.5"></div>
          </div>
          <span className="font-bold text-base tracking-tight text-white uppercase flex items-center gap-1.5">
            DualTube <span className="text-red-600 font-extrabold bg-red-600/10 px-1.5 py-0.5 rounded text-[10px] tracking-widest">PRO</span>
          </span>
        </div>

        {/* Header Right Area with Master Sync Controls and Reset Button */}
        <div className="flex items-center gap-3">
          {/* Master Global Controls for both Videos */}
          <div className="flex items-center gap-2 bg-[#161616] border border-white/10 px-3 py-1 rounded-full shadow-inner">
            <span className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-wider mr-1 bg-white/5 px-2 py-0.5 rounded">
              ĐỒNG BỘ
            </span>
            <button
              onClick={toggleMasterPlay}
              className={`p-1.5 rounded-full cursor-pointer transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 select-none ${
                isMasterPlaying 
                  ? "bg-red-600 hover:bg-red-500 text-white shadow-[0_0_10px_rgba(220,38,38,0.5)]" 
                  : "bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/5"
              }`}
              title={isMasterPlaying ? "Tạm dừng cả 2 video" : "Phát đồng thời cả 2 video"}
            >
              {isMasterPlaying ? <Pause size={11} className="fill-current" /> : <Play size={11} className="fill-current" />}
              <span>{isMasterPlaying ? "Dừng cả 2" : "Phát cả 2"}</span>
            </button>

            <button
              onClick={toggleMasterMute}
              className={`p-1.5 rounded-full cursor-pointer transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 select-none ${
                isMasterMuted 
                  ? "bg-amber-600 hover:bg-amber-500 text-white shadow-[0_0_10px_rgba(217,119,6,0.5)]" 
                  : "bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/5"
              }`}
              title={isMasterMuted ? "Bật âm thanh cả 2 video" : "Tắt âm thanh cả 2 video"}
            >
              {isMasterMuted ? <VolumeX size={11} /> : <Volume2 size={11} />}
              <span>{isMasterMuted ? "Mở âm" : "Tắt âm"}</span>
            </button>
          </div>

          {/* Reset All Applet State Button with 2-step click confirmation */}
          <button
            onClick={handleResetAll}
            className={`p-1.5 h-8 rounded-full cursor-pointer transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider px-3.5 select-none ${
              resetConfirm
                ? "bg-red-600 text-white border border-red-500 animate-pulse shadow-[0_0_15px_rgba(220,38,38,0.6)]"
                : "bg-[#161616] hover:bg-red-950/40 text-gray-400 hover:text-red-400 border border-white/10 hover:border-red-900/30"
            }`}
            title={resetConfirm ? "Click thêm lần nữa để xác nhận xóa sạch toàn bộ thiết lập" : "Khôi phục toàn bộ ứng dụng về mặc định ban đầu"}
          >
            <RotateCcw size={11} className={resetConfirm ? "animate-spin" : ""} />
            <span>{resetConfirm ? "Chắc chắn?" : "Đặt lại"}</span>
          </button>
        </div>


      </header>

      {/* Main Dual Player Grid Stage */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 flex flex-col gap-6">

        {/* Dual Panels Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          {/* Video Player 1 (Left Column - Indigo Accent represents DECK A with Red accents) */}
          <VideoPlayerSection
            id="left-player"
            title="DECK A"
            accentColor="indigo"
            initialVideoId="WKVJAMarzCc"  //Video mac dinh
            isApiReady={isApiReady}
            shortcuts={leftShortcuts}
          />

          {/* Video Player 2 (Right Column - Emerald Accent represents DECK B with Blue accents) */}
          <VideoPlayerSection
            id="right-player"
            title="DECK B"
            accentColor="emerald"
            initialVideoId="vHZoX0VnTC8" 
            isApiReady={isApiReady}
            shortcuts={rightShortcuts}
          />
        </div>

        {/* Unified Keyboard Shortcuts Cheat Sheet section */}
        <section className="mt-4 p-6 rounded-2xl border border-white/5 bg-[#0f0f0f] flex flex-col gap-5 shadow-lg">
          <div className="flex items-center gap-2 pb-2 border-b border-white/10">
            <Keyboard size={18} className="text-gray-400" />
            <h3 className="text-sm font-semibold tracking-wide text-white uppercase">
              BẢNG HƯỚNG DẪN PHÍM TẮT ĐIỀU KHIỂN NHANH TOÀN DIỆN
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left player instructions */}
            <div className="flex flex-col gap-3">
              <h4 className="text-xs font-semibold text-red-500 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                MÀN HÌNH BÊN TRÁI [ DECK A ]
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between items-center bg-[#161616] p-2.5 rounded border border-white/5">
                  <span className="text-gray-400">Phát / Tạm dừng:</span>
                  <kbd className="px-2 py-0.5 rounded bg-[#0a0a0a] border border-white/10 text-white font-bold font-mono shadow">Q</kbd>
                </div>
                <div className="flex justify-between items-center bg-[#161616] p-2.5 rounded border border-white/5">
                  <span className="text-gray-400">Bật / Tắt âm:</span>
                  <kbd className="px-2 py-0.5 rounded bg-[#0a0a0a] border border-white/10 text-white font-bold font-mono shadow">W</kbd>
                </div>
                <div className="flex justify-between items-center bg-[#161616] p-2.5 rounded border border-white/5">
                  <span className="text-gray-400">Lùi lại 10 giây:</span>
                  <kbd className="px-2 py-0.5 rounded bg-[#0a0a0a] border border-white/10 text-white font-bold font-mono shadow">A</kbd>
                </div>
                <div className="flex justify-between items-center bg-[#161616] p-2.5 rounded border border-white/5">
                  <span className="text-gray-400">Tua tới 10 giây:</span>
                  <kbd className="px-2 py-0.5 rounded bg-[#0a0a0a] border border-white/10 text-white font-bold font-mono shadow">S</kbd>
                </div>
                <div className="flex justify-between items-center bg-[#161616] p-2.5 rounded border border-white/5">
                  <span className="text-gray-400">Giảm tốc độ phát:</span>
                  <kbd className="px-2 py-0.5 rounded bg-[#0a0a0a] border border-white/10 text-white font-bold font-mono shadow">Z</kbd>
                </div>
                <div className="flex justify-between items-center bg-[#161616] p-2.5 rounded border border-white/5">
                  <span className="text-gray-400">Tăng tốc độ phát:</span>
                  <kbd className="px-2 py-0.5 rounded bg-[#0a0a0a] border border-white/10 text-white font-bold font-mono shadow">X</kbd>
                </div>
              </div>
            </div>

            {/* Right player instructions */}
            <div className="flex flex-col gap-3">
              <h4 className="text-xs font-semibold text-blue-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                MÀN HÌNH BÊN PHẢI [ DECK B ]
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between items-center bg-[#161616] p-2.5 rounded border border-white/5">
                  <span className="text-gray-400">Phát / Tạm dừng:</span>
                  <kbd className="px-2 py-0.5 rounded bg-[#0a0a0a] border border-white/10 text-white font-bold font-mono shadow">P</kbd>
                </div>
                <div className="flex justify-between items-center bg-[#161616] p-2.5 rounded border border-white/5">
                  <span className="text-gray-400">Bật / Tắt âm:</span>
                  <kbd className="px-2 py-0.5 rounded bg-[#0a0a0a] border border-white/10 text-white font-bold font-mono shadow">O</kbd>
                </div>
                <div className="flex justify-between items-center bg-[#161616] p-2.5 rounded border border-white/5">
                  <span className="text-gray-400">Lùi lại 10 giây:</span>
                  <kbd className="px-2 py-0.5 rounded bg-[#0a0a0a] border border-white/10 text-white font-bold font-mono shadow">K</kbd>
                </div>
                <div className="flex justify-between items-center bg-[#161616] p-2.5 rounded border border-white/5">
                  <span className="text-gray-400">Tua tới 10 giây:</span>
                  <kbd className="px-2 py-0.5 rounded bg-[#0a0a0a] border border-white/10 text-white font-bold font-mono shadow">L</kbd>
                </div>
                <div className="flex justify-between items-center bg-[#161616] p-2.5 rounded border border-white/5">
                  <span className="text-gray-400">Giảm tốc độ phát:</span>
                  <kbd className="px-2 py-0.5 rounded bg-[#0a0a0a] border border-white/10 text-white font-bold font-mono shadow">,</kbd>
                </div>
                <div className="flex justify-between items-center bg-[#161616] p-2.5 rounded border border-white/5">
                  <span className="text-gray-400">Tăng tốc độ phát:</span>
                  <kbd className="px-2 py-0.5 rounded bg-[#0a0a0a] border border-white/10 text-white font-bold font-mono shadow">.</kbd>
                </div>
              </div>
            </div>
          </div>
        </section>

      </main>


    </div>
  );
}
