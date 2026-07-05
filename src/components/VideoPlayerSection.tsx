import React, { useState, useEffect, useRef } from "react";
import { YouTubeVideo, PlayerStatus } from "../types";
import { 
  Search, Play, Pause, Volume2, VolumeX, RotateCcw, FastForward, 
  ChevronRight, Sliders, Youtube, Zap, Sparkles, Clock, X, Repeat, 
  Layers, Plus, Trash2, ListMusic, ChevronDown, ChevronUp, SkipBack, SkipForward 
} from "lucide-react";

interface VideoPlayerSectionProps {
  id: string;
  title: string;
  accentColor: "indigo" | "emerald";
  initialVideoId: string;
  isApiReady: boolean;
  shortcuts: {
    playPause: string;
    mute: string;
    rewind: string;
    forward: string;
    speedDown: string;
    speedUp: string;
  };
}

export default function VideoPlayerSection({
  id,
  title,
  accentColor,
  initialVideoId,
  isApiReady,
  shortcuts,
}: VideoPlayerSectionProps) {
  const [videoId, setVideoId] = useState<string>(initialVideoId);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<YouTubeVideo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Loop toggle and Paginated search pool states
  const [isLoop, setIsLoop] = useState<boolean>(false);
  const isLoopRef = useRef<boolean>(false);
  const [poolPage, setPoolPage] = useState<number>(0);
  const itemsPerPage = 4;

  useEffect(() => {
    isLoopRef.current = isLoop;
  }, [isLoop]);

  // Playlist state variables and refs
  const [playlist, setPlaylist] = useState<YouTubeVideo[]>(() => {
    try {
      const stored = localStorage.getItem(`dualtube_playlist_${id}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [showPlaylist, setShowPlaylist] = useState<boolean>(true);
  const [autoPlayNext, setAutoPlayNext] = useState<boolean>(true);
  const [currentVideo, setCurrentVideo] = useState<YouTubeVideo | null>(null);

  const playlistRef = useRef<YouTubeVideo[]>(playlist);
  const videoIdRef = useRef<string>(videoId);
  const autoPlayNextRef = useRef<boolean>(autoPlayNext);

  useEffect(() => {
    playlistRef.current = playlist;
  }, [playlist]);

  useEffect(() => {
    videoIdRef.current = videoId;
  }, [videoId]);

  useEffect(() => {
    autoPlayNextRef.current = autoPlayNext;
  }, [autoPlayNext]);

  // Intelligent search bar additions: autocomplete and previous searches history
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(`dualtube_history_${id}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [focusedSuggestionIdx, setFocusedSuggestionIdx] = useState<number>(-1);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const [playerStatus, setPlayerStatus] = useState<PlayerStatus>({
    isPlaying: false,
    isMuted: false,
    volume: 50,
    playbackRate: 1.0,
    currentTime: 0,
    duration: 0,
  });

  const playerRef = useRef<any>(null);
  const containerId = `yt-iframe-${id}`;

  // Save search query to history
  const saveSearchToHistory = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setSearchHistory((prev) => {
      const filtered = prev.filter((item) => item.toLowerCase() !== trimmed.toLowerCase());
      const updated = [trimmed, ...filtered].slice(0, 10);
      try {
        localStorage.setItem(`dualtube_history_${id}`, JSON.stringify(updated));
      } catch (err) {
        console.error("Failed to save history:", err);
      }
      return updated;
    });
  };

  // Remove single item from search history
  const removeFromHistory = (itemToRemove: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setSearchHistory((prev) => {
      const updated = prev.filter((item) => item !== itemToRemove);
      try {
        localStorage.setItem(`dualtube_history_${id}`, JSON.stringify(updated));
      } catch (err) {
        console.error("Failed to update history:", err);
      }
      return updated;
    });
  };

  // Clear all search history
  const clearHistory = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setSearchHistory([]);
    try {
      localStorage.removeItem(`dualtube_history_${id}`);
    } catch (err) {
      console.error("Failed to clear history:", err);
    }
  };

  // Debounced Auto-suggestion fetching as user types
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      try {
        const res = await fetch(`/api/suggest?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.suggestions || []);
        }
      } catch (err) {
        console.error("Error fetching suggestions:", err);
      }
    }, 250);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // Click outside listener to automatically close autocomplete suggestions/history dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Helper utility to extract video ID from pasted URL
  function extractVideoId(urlOrQuery: string): string | null {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
    const match = urlOrQuery.match(regExp);
    if (match && match[2].length === 11) {
      return match[2];
    }
    return null;
  }

  // Initialize YouTube Player
  useEffect(() => {
    if (!isApiReady || !videoId) return;

    // Check if player already exists
    if (playerRef.current) {
      try {
        playerRef.current.loadVideoById(videoId);
        return;
      } catch (e) {
        console.error("Error loading video in existing player:", e);
      }
    }

    // Set up new player
    try {
      playerRef.current = new (window as any).YT.Player(containerId, {
        videoId: videoId,
        playerVars: {
          autoplay: 0,
          enablejsapi: 1,
          origin: window.location.origin,
          rel: 0,
          modestbranding: 1,
        },
        events: {
          onReady: (event: any) => {
            playerRef.current = event.target;
            // Set initial volume to 50%
            event.target.setVolume(50);
          },
          onStateChange: (event: any) => {
            const state = event.data;
            if (state === 0) {
              if (isLoopRef.current) {
                try {
                  event.target.seekTo(0);
                  event.target.playVideo();
                } catch (loopErr) {
                  console.error("Error looping video:", loopErr);
                }
              } else if (autoPlayNextRef.current && playlistRef.current.length > 0) {
                const currentList = playlistRef.current;
                const currentId = videoIdRef.current;
                const currentIndex = currentList.findIndex(item => item.videoId === currentId);
                let nextId = "";
                if (currentIndex !== -1) {
                  const nextIndex = (currentIndex + 1) % currentList.length;
                  nextId = currentList[nextIndex].videoId;
                } else {
                  nextId = currentList[0].videoId;
                }
                if (nextId) {
                  setVideoId(nextId);
                }
              }
            }
            setPlayerStatus((prev) => ({
              ...prev,
              isPlaying: state === 1, // 1 is PLAYING
            }));
          },
        },
      });
    } catch (err) {
      console.error("Failed to initialize YT Player", err);
    }
  }, [isApiReady, videoId]);

  // Poll player status for time, volume, rate updates to sync custom controls
  useEffect(() => {
    let interval: any;
    if (isApiReady) {
      interval = setInterval(() => {
        try {
          const player = playerRef.current;
          if (player && typeof player.getPlayerState === "function") {
            const state = player.getPlayerState();
            const isPlaying = state === 1;
            const isMuted = player.isMuted();
            const volume = player.getVolume();
            const rate = player.getPlaybackRate();
            const curTime = player.getCurrentTime();
            const dur = player.getDuration();

            setPlayerStatus({
              isPlaying,
              isMuted,
              volume,
              playbackRate: rate,
              currentTime: curTime,
              duration: dur || 0,
            });

            // Dynamic capture of current video information via YouTube IFrame API
            if (typeof player.getVideoData === "function") {
              const videoData = player.getVideoData();
              if (videoData && videoData.video_id) {
                const vidId = videoData.video_id;
                const titleStr = videoData.title || "Đang phát...";
                const authorStr = videoData.author || "Kênh YouTube";
                
                // Avoid infinite updates
                setCurrentVideo((prev) => {
                  if (!prev || prev.videoId !== vidId || prev.title !== titleStr || prev.channelName !== authorStr) {
                    return {
                      videoId: vidId,
                      title: titleStr,
                      thumbnail: `https://img.youtube.com/vi/${vidId}/mqdefault.jpg`,
                      channelName: authorStr,
                    };
                  }
                  return prev;
                });
              }
            }
          }
        } catch (e) {
          // Ignore silent player initialization exceptions
        }
      }, 300);
    }
    return () => clearInterval(interval);
  }, [isApiReady]);

  // Listen for global master control events
  useEffect(() => {
    const handleMasterPlay = () => {
      const player = playerRef.current;
      if (player && typeof player.playVideo === "function") {
        try {
          player.playVideo();
        } catch (e) {
          console.error("Master play error:", e);
        }
      }
    };

    const handleMasterPause = () => {
      const player = playerRef.current;
      if (player && typeof player.pauseVideo === "function") {
        try {
          player.pauseVideo();
        } catch (e) {
          console.error("Master pause error:", e);
        }
      }
    };

    const handleMasterMute = () => {
      const player = playerRef.current;
      if (player && typeof player.mute === "function") {
        try {
          player.mute();
        } catch (e) {
          console.error("Master mute error:", e);
        }
      }
    };

    const handleMasterUnmute = () => {
      const player = playerRef.current;
      if (player && typeof player.unMute === "function") {
        try {
          player.unMute();
        } catch (e) {
          console.error("Master unmute error:", e);
        }
      }
    };

    window.addEventListener("dualtube-master-play", handleMasterPlay);
    window.addEventListener("dualtube-master-pause", handleMasterPause);
    window.addEventListener("dualtube-master-mute", handleMasterMute);
    window.addEventListener("dualtube-master-unmute", handleMasterUnmute);

    return () => {
      window.removeEventListener("dualtube-master-play", handleMasterPlay);
      window.removeEventListener("dualtube-master-pause", handleMasterPause);
      window.removeEventListener("dualtube-master-mute", handleMasterMute);
      window.removeEventListener("dualtube-master-unmute", handleMasterUnmute);
    };
  }, []);

  // Bind Keyboard Shortcuts specifically for this Player
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      const isTyping = document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA";
      if (isTyping) return;

      const key = e.key.toLowerCase();
      const player = playerRef.current;
      if (!player || typeof player.getPlayerState !== "function") return;

      if (key === shortcuts.playPause.toLowerCase()) {
        e.preventDefault();
        const state = player.getPlayerState();
        if (state === 1) {
          player.pauseVideo();
        } else {
          player.playVideo();
        }
      } else if (key === shortcuts.mute.toLowerCase()) {
        e.preventDefault();
        if (player.isMuted()) {
          player.unMute();
        } else {
          player.mute();
        }
      } else if (key === shortcuts.rewind.toLowerCase()) {
        e.preventDefault();
        const cur = player.getCurrentTime();
        player.seekTo(Math.max(0, cur - 10), true);
      } else if (key === shortcuts.forward.toLowerCase()) {
        e.preventDefault();
        const cur = player.getCurrentTime();
        const dur = player.getDuration();
        player.seekTo(Math.min(dur || 999999, cur + 10), true);
      } else if (key === shortcuts.speedDown.toLowerCase()) {
        e.preventDefault();
        const curRate = player.getPlaybackRate();
        const rates = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
        const idx = rates.indexOf(curRate);
        if (idx > 0) {
          player.setPlaybackRate(rates[idx - 1]);
        }
      } else if (key === shortcuts.speedUp.toLowerCase()) {
        e.preventDefault();
        const curRate = player.getPlaybackRate();
        const rates = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
        const idx = rates.indexOf(curRate);
        if (idx !== -1 && idx < rates.length - 1) {
          player.setPlaybackRate(rates[idx + 1]);
        } else if (idx === -1) {
          player.setPlaybackRate(1.0);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isApiReady, shortcuts]);

  // Search YouTube Helper
  const triggerSearchWithQuery = async (query: string) => {
    if (!query.trim()) return;
    setError(null);
    setPoolPage(0);

    // Check if it's a direct video link first
    const directId = extractVideoId(query);
    if (directId) {
      setVideoId(directId);
      setSearchQuery("");
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsLoading(true);
    setIsSearching(true);

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) {
        throw new Error("Không thể kết nối đến máy chủ tìm kiếm");
      }
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch (err: any) {
      console.error(err);
      setError("Đã xảy ra lỗi khi tìm kiếm video. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  };

  // Search YouTube Handler
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    saveSearchToHistory(searchQuery);
    setShowDropdown(false);
    await triggerSearchWithQuery(searchQuery);
  };

  // Selection from suggestions or history
  const selectQuery = (query: string) => {
    setSearchQuery(query);
    setShowDropdown(false);
    setSuggestions([]);
    setFocusedSuggestionIdx(-1);
    saveSearchToHistory(query);
    triggerSearchWithQuery(query);
  };

  // Select video from results
  const selectVideo = (id: string) => {
    setVideoId(id);
    setSearchResults([]);
    setIsSearching(false);
    setSearchQuery("");
    setShowDropdown(false);
  };

  // Playlist helper operations
  const addToPlaylist = (video: YouTubeVideo) => {
    if (playlist.some(item => item.videoId === video.videoId)) {
      return;
    }
    const updated = [...playlist, video];
    setPlaylist(updated);
    try {
      localStorage.setItem(`dualtube_playlist_${id}`, JSON.stringify(updated));
    } catch (err) {
      console.error("Failed to save playlist:", err);
    }
  };

  const removeFromPlaylist = (videoIdToRemove: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const updated = playlist.filter(item => item.videoId !== videoIdToRemove);
    setPlaylist(updated);
    try {
      localStorage.setItem(`dualtube_playlist_${id}`, JSON.stringify(updated));
    } catch (err) {
      console.error("Failed to update playlist:", err);
    }
  };

  const clearPlaylist = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setPlaylist([]);
    try {
      localStorage.removeItem(`dualtube_playlist_${id}`);
    } catch (err) {
      console.error("Failed to clear playlist:", err);
    }
  };

  const playNextVideo = () => {
    if (playlist.length === 0) return;
    const currentIndex = playlist.findIndex(item => item.videoId === videoId);
    if (currentIndex !== -1) {
      const nextIndex = (currentIndex + 1) % playlist.length;
      setVideoId(playlist[nextIndex].videoId);
    } else {
      setVideoId(playlist[0].videoId);
    }
  };

  const playPrevVideo = () => {
    if (playlist.length === 0) return;
    const currentIndex = playlist.findIndex(item => item.videoId === videoId);
    if (currentIndex !== -1) {
      const prevIndex = (currentIndex - 1 + playlist.length) % playlist.length;
      setVideoId(playlist[prevIndex].videoId);
    } else {
      setVideoId(playlist[playlist.length - 1].videoId);
    }
  };

  // Direct Control Triggers
  const togglePlay = () => {
    const player = playerRef.current;
    if (player && typeof player.getPlayerState === "function") {
      const state = player.getPlayerState();
      if (state === 1) {
        player.pauseVideo();
      } else {
        player.playVideo();
      }
    }
  };

  const toggleMute = () => {
    const player = playerRef.current;
    if (player && typeof player.mute === "function") {
      if (player.isMuted()) {
        player.unMute();
      } else {
        player.mute();
      }
    }
  };

  const seek = (seconds: number) => {
    const player = playerRef.current;
    if (player && typeof player.getCurrentTime === "function") {
      const cur = player.getCurrentTime();
      player.seekTo(cur + seconds, true);
    }
  };

  const changeSpeed = (multiplier: number) => {
    const player = playerRef.current;
    if (player && typeof player.getPlaybackRate === "function") {
      const curRate = player.getPlaybackRate();
      const rates = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
      const idx = rates.indexOf(curRate);
      if (multiplier > 0 && idx < rates.length - 1) {
        player.setPlaybackRate(rates[idx + 1]);
      } else if (multiplier < 0 && idx > 0) {
        player.setPlaybackRate(rates[idx - 1]);
      }
    }
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (playerRef.current && typeof playerRef.current.seekTo === "function") {
      playerRef.current.seekTo(time, true);
      setPlayerStatus((prev) => ({ ...prev, currentTime: time }));
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseInt(e.target.value);
    if (playerRef.current && typeof playerRef.current.setVolume === "function") {
      playerRef.current.setVolume(vol);
      if (vol > 0 && playerStatus.isMuted) {
        playerRef.current.unMute();
      }
      setPlayerStatus((prev) => ({ ...prev, volume: vol }));
    }
  };

  // Helper to format duration in seconds to string
  function formatTime(seconds: number): string {
    if (isNaN(seconds) || seconds === undefined) return "0:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const sStr = s < 10 ? `0${s}` : `${s}`;
    if (h > 0) {
      const mStr = m < 10 ? `0${m}` : `${m}`;
      return `${h}:${mStr}:${sStr}`;
    }
    return `${m}:${sStr}`;
  }

  // Accent styling configurations matching Elegant Dark specifications
  const themeClasses = {
    indigo: {
      border: "border-red-500/10",
      focusBorder: "focus:border-red-600 focus:ring-red-600/5",
      text: "text-red-500",
      bg: "bg-red-600",
      bgHover: "hover:bg-red-700",
      buttonBg: "bg-red-600/10 text-red-400 border border-red-600/20 hover:bg-red-600/20",
      accentGlow: "shadow-red-600/5",
      kbdBorder: "border-red-500/20",
    },
    emerald: {
      border: "border-blue-500/10",
      focusBorder: "focus:border-blue-500 focus:ring-blue-500/5",
      text: "text-blue-400",
      bg: "bg-blue-600",
      bgHover: "hover:bg-blue-700",
      buttonBg: "bg-blue-600/10 text-blue-400 border border-blue-500/20 hover:bg-blue-600/20",
      accentGlow: "shadow-blue-600/5",
      kbdBorder: "border-blue-500/20",
    }
  }[accentColor];

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const activeItems = searchQuery.trim() ? suggestions : searchHistory;
    if (!showDropdown) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        setShowDropdown(true);
      }
      return;
    }

    if (activeItems.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedSuggestionIdx((prev) => (prev < activeItems.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedSuggestionIdx((prev) => (prev > 0 ? prev - 1 : activeItems.length - 1));
    } else if (e.key === "Escape") {
      setShowDropdown(false);
      setFocusedSuggestionIdx(-1);
    } else if (e.key === "Enter") {
      if (focusedSuggestionIdx >= 0 && focusedSuggestionIdx < activeItems.length) {
        e.preventDefault();
        selectQuery(activeItems[focusedSuggestionIdx]);
      }
    }
  };

  return (
    <div className={`p-5 rounded-2xl border border-white/10 bg-[#0c0c0c] shadow-xl ${themeClasses.accentGlow} flex flex-col gap-4 h-full`}>
      {/* Title Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <h2 className="text-sm font-bold tracking-wider text-white flex items-center gap-2 uppercase">
          <span className={`w-2.5 h-2.5 rounded-full ${themeClasses.bg} shadow-lg`} />
          {title}
        </h2>
        <div className="flex items-center gap-1.5 font-mono text-[10px] text-gray-500 bg-black/40 px-2 py-0.5 rounded border border-white/5">
          <Youtube size={12} className={accentColor === "indigo" ? "text-red-600" : "text-blue-500"} />
          <span>{accentColor === "indigo" ? "DECK A" : "DECK B"}</span>
        </div>
      </div>

      {/* Search Input Bar */}
      <form onSubmit={handleSearch} className="relative flex gap-2">
        <div className="relative flex-1" ref={searchContainerRef}>
          <input
            type="text"
            placeholder="Tìm kiếm hoặc dán link YouTube..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowDropdown(true);
              setFocusedSuggestionIdx(-1);
            }}
            onFocus={() => {
              setShowDropdown(true);
              setFocusedSuggestionIdx(-1);
            }}
            onKeyDown={handleInputKeyDown}
            className={`w-full py-2.5 pl-10 pr-4 rounded-xl border border-white/5 bg-[#161616] text-sm text-gray-200 placeholder:text-gray-600 transition-colors outline-none ${themeClasses.focusBorder}`}
          />
          <Search size={16} className="absolute left-3.5 top-3.5 text-gray-600" />

          {/* Autocomplete suggestions and Search History dropdown panel */}
          {showDropdown && (
            (() => {
              const activeItems = searchQuery.trim() ? suggestions : searchHistory;
              if (activeItems.length === 0 && searchQuery.trim()) return null; // Let results handle it or show "no suggestions"
              if (activeItems.length === 0 && !searchQuery.trim()) return null; // No history to show

              return (
                <div className="absolute top-full left-0 w-full mt-1.5 bg-[#0e0e0e] border border-white/10 rounded-xl shadow-2xl shadow-black z-30 overflow-hidden flex flex-col divide-y divide-white/5">
                  {/* Header row */}
                  <div className="flex items-center justify-between px-3 py-2 text-[10px] font-mono text-gray-500 uppercase select-none bg-black/20">
                    <span>{searchQuery.trim() ? "Gợi ý tìm kiếm" : "Lịch sử tìm kiếm"}</span>
                    {!searchQuery.trim() && searchHistory.length > 0 && (
                      <button
                        type="button"
                        onClick={clearHistory}
                        className="hover:text-red-500 transition-colors text-[9px] uppercase tracking-wider font-semibold underline cursor-pointer"
                      >
                        Xóa tất cả
                      </button>
                    )}
                  </div>

                  {/* Items list */}
                  <div className="max-h-[240px] overflow-y-auto py-1 custom-scrollbar">
                    {activeItems.map((item, index) => {
                      const isFocused = index === focusedSuggestionIdx;
                      return (
                        <div
                          key={index}
                          onClick={() => selectQuery(item)}
                          onMouseEnter={() => setFocusedSuggestionIdx(index)}
                          className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs transition-colors cursor-pointer ${
                            isFocused ? "bg-white/5 text-white font-medium" : "text-gray-300 hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            {searchQuery.trim() ? (
                              <Search size={13} className={`${themeClasses.text} flex-shrink-0`} />
                            ) : (
                              <Clock size={13} className="text-gray-500 flex-shrink-0" />
                            )}
                            <span className="truncate">{item}</span>
                          </div>

                          {!searchQuery.trim() && (
                            <button
                              type="button"
                              onClick={(e) => removeFromHistory(item, e)}
                              className="p-1 text-gray-600 hover:text-red-500 rounded transition-colors cursor-pointer"
                              title="Xóa khỏi lịch sử"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()
          )}
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className={`px-5 py-2.5 rounded-xl font-bold text-xs tracking-wider transition-colors uppercase cursor-pointer ${
            isLoading 
              ? "bg-[#161616] text-gray-600 border border-white/5" 
              : `${themeClasses.bg} text-white ${themeClasses.bgHover} active:scale-98`
          }`}
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-neutral-500 border-t-transparent rounded-full animate-spin" />
          ) : (
            "Phát"
          )}
        </button>
      </form>

      {/* Search results as a high-performance paginated Group Pool */}
      {isSearching && (
        <div className="p-3.5 rounded-xl border border-white/10 bg-[#0f0f0f] flex flex-col gap-3 shadow-lg relative transition-all duration-300 animate-fadeIn">
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Layers size={13} className={themeClasses.text} />
              <span className="text-xs font-bold uppercase tracking-wider text-white">
                Bể Video Tìm Kiếm ({searchResults.length} video)
              </span>
            </div>
            <div className="flex items-center gap-3">
              {searchResults.length > itemsPerPage && (
                <div className="flex items-center gap-2 text-xs font-mono">
                  <button
                    type="button"
                    disabled={poolPage === 0}
                    onClick={() => setPoolPage(prev => Math.max(0, prev - 1))}
                    className={`px-2 py-1 rounded bg-[#161616] border border-white/5 text-[9px] uppercase font-bold tracking-wider transition-colors select-none ${
                      poolPage === 0 ? "opacity-30 cursor-not-allowed" : "hover:bg-white/10 hover:text-white cursor-pointer"
                    }`}
                  >
                    Trước
                  </button>
                  <span className="text-gray-400 text-[10px]">
                    Trang {poolPage + 1} / {Math.ceil(searchResults.length / itemsPerPage)}
                  </span>
                  <button
                    type="button"
                    disabled={poolPage >= Math.ceil(searchResults.length / itemsPerPage) - 1}
                    onClick={() => setPoolPage(prev => Math.min(Math.ceil(searchResults.length / itemsPerPage) - 1, prev + 1))}
                    className={`px-2 py-1 rounded bg-[#161616] border border-white/5 text-[9px] uppercase font-bold tracking-wider transition-colors select-none ${
                      poolPage >= Math.ceil(searchResults.length / itemsPerPage) - 1 ? "opacity-30 cursor-not-allowed" : "hover:bg-white/10 hover:text-white cursor-pointer"
                    }`}
                  >
                    Sau
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  setIsSearching(false);
                  setSearchResults([]);
                  setPoolPage(0);
                }}
                className="text-[9px] text-gray-500 hover:text-red-500 uppercase tracking-wider font-semibold cursor-pointer transition-colors"
              >
                Xóa tìm kiếm
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-gray-500 text-xs flex flex-col items-center gap-2 font-mono">
              <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin border-neutral-400" />
              <span>ĐANG KẾT NỐI & NẠP KẾT QUẢ TỪ YOUTUBE...</span>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="py-8 text-center text-gray-500 text-xs">
              Không tìm thấy video nào. Hãy nhập từ khóa khác hoặc dán link trực tiếp!
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-0.5">
              {searchResults.slice(poolPage * itemsPerPage, (poolPage + 1) * itemsPerPage).map((video) => (
                <div
                  key={video.videoId}
                  className="flex gap-2.5 p-2 rounded-lg bg-[#161616]/40 hover:bg-[#161616] border border-transparent hover:border-white/5 transition-all text-left group items-start relative"
                >
                  <button
                    type="button"
                    onClick={() => selectVideo(video.videoId)}
                    className="flex flex-1 gap-2.5 min-w-0 text-left items-start cursor-pointer"
                  >
                    <div className="relative flex-shrink-0 w-24 aspect-video rounded overflow-hidden bg-black border border-white/5">
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                      />
                      {video.duration && video.duration !== "Video" && (
                        <span className="absolute bottom-1 right-1 bg-black/85 px-1 py-0.5 rounded text-[8px] text-gray-300 font-mono">
                          {video.duration}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col gap-0.5 justify-center">
                      <h4 className="text-[11px] font-medium text-gray-300 line-clamp-2 leading-tight group-hover:text-white transition-colors">
                        {video.title}
                      </h4>
                      <span className="text-[10px] text-gray-500 truncate mt-0.5">
                        {video.channelName}
                      </span>
                      {video.viewCount && video.viewCount !== "Nguồn: Gemini AI" && (
                        <span className="text-[9px] text-gray-600 truncate">
                          {video.viewCount}
                        </span>
                      )}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      addToPlaylist(video);
                    }}
                    disabled={playlist.some(item => item.videoId === video.videoId)}
                    className={`absolute bottom-2 right-2 p-1.5 rounded transition-all flex items-center justify-center border cursor-pointer ${
                      playlist.some(item => item.videoId === video.videoId)
                        ? "bg-white/5 border-white/5 text-gray-600 cursor-not-allowed"
                        : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white hover:border-white/20 hover:scale-110"
                    }`}
                    title={playlist.some(item => item.videoId === video.videoId) ? "Đã có trong danh sách phát" : "Thêm vào danh sách phát"}
                  >
                    <Plus size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Video Screen Panel */}
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black shadow-inner border border-white/5 group">
        <div id={containerId} className="w-full h-full" />
        
        {/* Dark Overlay when loading/paused */}
        {!isApiReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/95 flex-col gap-3">
            <div className={`w-8 h-8 border-4 border-[#161616] border-t-${accentColor === "indigo" ? "red-600" : "blue-600"} rounded-full animate-spin`} />
            <p className="text-xs text-gray-500 font-mono">Đang khởi tạo YouTube API...</p>
          </div>
        )}
      </div>

      {/* Active Track Metadata & Save to Playlist */}
      {currentVideo && (
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#161616]/40 border border-white/5 animate-fadeIn">
          <div className="flex gap-2.5 min-w-0 flex-1 items-center">
            <div className="relative flex-shrink-0 w-12 aspect-video rounded overflow-hidden bg-black border border-white/5">
              <img
                src={currentVideo.thumbnail}
                alt={currentVideo.title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <h3 className="text-xs font-bold text-gray-200 truncate leading-snug hover:text-white transition-colors" title={currentVideo.title}>
                {currentVideo.title}
              </h3>
              <p className="text-[10px] text-gray-500 truncate mt-0.5 font-mono">
                {currentVideo.channelName}
              </p>
            </div>
          </div>
          
          <button
            type="button"
            onClick={() => addToPlaylist(currentVideo)}
            disabled={playlist.some(item => item.videoId === currentVideo.videoId)}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all flex items-center gap-1.5 cursor-pointer select-none ${
              playlist.some(item => item.videoId === currentVideo.videoId)
                ? "bg-white/5 border-white/10 text-gray-600 cursor-not-allowed"
                : `${themeClasses.buttonBg}`
            }`}
          >
            <span>{playlist.some(item => item.videoId === currentVideo.videoId) ? "Đã lưu" : "+ Playlist"}</span>
          </button>
        </div>
      )}

      {/* Active Custom Status & Progress Bar */}
      <div className="flex flex-col gap-2.5">
        {/* Custom Seekbar Slider */}
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono text-gray-400 tracking-tight w-12 text-right">
            {formatTime(playerStatus.currentTime)}
          </span>
          <input
            type="range"
            min={0}
            max={playerStatus.duration || 100}
            value={playerStatus.currentTime}
            onChange={handleSeekChange}
            className={`flex-1 h-1.5 rounded-full cursor-pointer appearance-none bg-[#161616] outline-none ${accentColor === "indigo" ? "accent-red-600" : "accent-blue-600"} [&::-webkit-slider-runnable-track]:bg-[#161616] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:hover:scale-125`}
          />
          <span className="text-[11px] font-mono text-gray-400 tracking-tight w-12 text-left">
            {formatTime(playerStatus.duration)}
          </span>
        </div>

        {/* Dashboard Control Row */}
        <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-[#161616]/40 border border-white/5">
          {/* Play/Pause Mute controls */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={togglePlay}
              type="button"
              className={`p-2.5 rounded-lg cursor-pointer ${themeClasses.buttonBg} transition-all hover:scale-105 active:scale-95`}
              title={`Phát/Tạm dừng [Phím tắt: ${shortcuts.playPause.toUpperCase()}]`}
            >
              {playerStatus.isPlaying ? <Pause size={14} /> : <Play size={14} />}
            </button>
            <button
              onClick={() => seek(-10)}
              type="button"
              className={`p-2.5 rounded-lg cursor-pointer ${themeClasses.buttonBg} transition-all hover:scale-105 active:scale-95`}
              title={`Lùi lại 10 giây [Phím tắt: ${shortcuts.rewind.toUpperCase()}]`}
            >
              <RotateCcw size={14} />
            </button>
            <button
              onClick={() => seek(10)}
              type="button"
              className={`p-2.5 rounded-lg cursor-pointer ${themeClasses.buttonBg} transition-all hover:scale-105 active:scale-95`}
              title={`Tiến lên 10 giây [Phím tắt: ${shortcuts.forward.toUpperCase()}]`}
            >
              <FastForward size={14} />
            </button>
            <button
              onClick={() => setIsLoop(!isLoop)}
              type="button"
              className={`p-2.5 rounded-lg cursor-pointer transition-all hover:scale-105 active:scale-95 border ${
                isLoop 
                  ? `${accentColor === "indigo" ? "bg-red-500/15 border-red-500/40 text-red-400 font-bold" : "bg-emerald-500/15 border-emerald-500/40 text-emerald-400 font-bold"}` 
                  : `${themeClasses.buttonBg} border-transparent text-gray-400 hover:text-white`
              }`}
              title="Tự động phát lặp lại (Loop)"
            >
              <Repeat size={14} />
            </button>
            {playlist.length > 0 && (
              <>
                <button
                  onClick={playPrevVideo}
                  type="button"
                  className={`p-2.5 rounded-lg cursor-pointer transition-all hover:scale-105 active:scale-95 ${themeClasses.buttonBg}`}
                  title="Bài trước trong danh sách phát"
                >
                  <SkipBack size={14} />
                </button>
                <button
                  onClick={playNextVideo}
                  type="button"
                  className={`p-2.5 rounded-lg cursor-pointer transition-all hover:scale-105 active:scale-95 ${themeClasses.buttonBg}`}
                  title="Bài tiếp theo trong danh sách phát"
                >
                  <SkipForward size={14} />
                </button>
              </>
            )}
          </div>

          {/* Volume controls */}
          <div className="flex items-center gap-2 flex-1 max-w-[140px]">
            <button
              onClick={toggleMute}
              type="button"
              className="text-gray-400 hover:text-white transition-all cursor-pointer"
              title={`Bật/Tắt tiếng [Phím tắt: ${shortcuts.mute.toUpperCase()}]`}
            >
              {playerStatus.isMuted || playerStatus.volume === 0 ? (
                <VolumeX size={15} />
              ) : (
                <Volume2 size={15} />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={100}
              value={playerStatus.isMuted ? 0 : playerStatus.volume}
              onChange={handleVolumeChange}
              className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-neutral-300"
            />
          </div>

          {/* Speed settings */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => changeSpeed(-1)}
              type="button"
              className="text-[10px] py-1 px-1.5 font-mono rounded bg-black hover:bg-[#161616] text-gray-400 hover:text-white transition-all border border-white/5 cursor-pointer"
              title={`Giảm tốc độ [Phím tắt: ${shortcuts.speedDown}]`}
            >
              {shortcuts.speedDown}
            </button>
            <span className="text-[11px] font-mono text-gray-200 font-bold bg-black px-2 py-1 rounded border border-white/5">
              {playerStatus.playbackRate.toFixed(2)}x
            </span>
            <button
              onClick={() => changeSpeed(1)}
              type="button"
              className="text-[10px] py-1 px-1.5 font-mono rounded bg-black hover:bg-[#161616] text-gray-400 hover:text-white transition-all border border-white/5 cursor-pointer"
              title={`Tăng tốc độ [Phím tắt: ${shortcuts.speedUp.toUpperCase()}]`}
            >
              {shortcuts.speedUp.toUpperCase()}
            </button>
          </div>
        </div>
      </div>

      {/* Playlist Section */}
      <div className="rounded-xl border border-white/5 bg-[#0e0e0e]/50 p-3 flex flex-col gap-2.5">
        <div className="flex items-center justify-between pb-1.5 border-b border-white/5">
          <button
            type="button"
            onClick={() => setShowPlaylist(!showPlaylist)}
            className="flex items-center gap-2 text-xs font-bold text-gray-300 hover:text-white uppercase tracking-wider cursor-pointer select-none transition-colors"
          >
            <ListMusic size={14} className={themeClasses.text} />
            <span>Danh sách phát ({playlist.length})</span>
            {showPlaylist ? <ChevronDown size={12} className="text-gray-500" /> : <ChevronRight size={12} className="text-gray-500" />}
          </button>
          
          {showPlaylist && playlist.length > 0 && (
            <div className="flex items-center gap-3">
              {/* Autoplay next toggle inside playlist header */}
              <label className="flex items-center gap-1.5 text-[10px] text-gray-500 cursor-pointer select-none hover:text-gray-400">
                <input
                  type="checkbox"
                  checked={autoPlayNext}
                  onChange={(e) => setAutoPlayNext(e.target.checked)}
                  className="rounded border-white/10 bg-black text-red-500 focus:ring-0 focus:ring-offset-0 h-3 w-3 cursor-pointer"
                />
                <span>Tự động chuyển bài</span>
              </label>
              <button
                type="button"
                onClick={clearPlaylist}
                className="text-[9px] uppercase tracking-wider font-semibold text-gray-500 hover:text-red-500 transition-colors cursor-pointer underline"
              >
                Xóa tất cả
              </button>
            </div>
          )}
        </div>

        {showPlaylist && (
          <div className="flex flex-col gap-1.5">
            {playlist.length === 0 ? (
              <div className="py-5 text-center text-[11px] text-gray-600 font-mono">
                Danh sách phát trống. Hãy thêm video từ ô tìm kiếm hoặc gợi ý nhanh!
              </div>
            ) : (
              <div className="max-h-[160px] overflow-y-auto flex flex-col gap-1.5 custom-scrollbar pr-0.5">
                {playlist.map((item, index) => {
                  const isActive = item.videoId === videoId;
                  return (
                    <div
                      key={item.videoId + "-" + index}
                      className={`flex items-center justify-between gap-2 p-1.5 rounded-lg border transition-all ${
                        isActive
                          ? `bg-white/5 ${themeClasses.border}`
                          : "bg-[#161616]/20 border-transparent hover:bg-[#161616]/40 hover:border-white/5"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setVideoId(item.videoId)}
                        className="flex gap-2 min-w-0 flex-1 text-left items-center cursor-pointer group"
                      >
                        <span className="text-[10px] font-mono text-gray-600 w-4 text-center group-hover:text-white">
                          {index + 1}
                        </span>
                        <div className="relative flex-shrink-0 w-10 aspect-video rounded overflow-hidden bg-black border border-white/5">
                          <img
                            src={item.thumbnail}
                            alt={item.title}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                          <h4 className={`text-[11px] font-medium truncate ${isActive ? "text-white font-bold" : "text-gray-400 group-hover:text-white"}`}>
                            {item.title}
                          </h4>
                          <span className="text-[9px] text-gray-600 truncate mt-0.5">
                            {item.channelName}
                          </span>
                        </div>
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => removeFromPlaylist(item.videoId, e)}
                          className="p-1 text-gray-600 hover:text-red-500 rounded transition-colors cursor-pointer"
                          title="Xóa khỏi danh sách phát"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Shortcuts Mapping Legend Helper */}
      <div className="mt-auto pt-3 grid grid-cols-3 gap-1.5 text-[10px] font-mono text-gray-500 border-t border-white/5">
        <div className="flex items-center gap-1">
          <kbd className={`px-1.5 py-0.5 rounded bg-black border ${themeClasses.kbdBorder} text-[9px] text-gray-400 font-bold shadow`}>
            {shortcuts.playPause.toUpperCase()}
          </kbd>
          <span>Chạy / Dừng</span>
        </div>
        <div className="flex items-center gap-1">
          <kbd className={`px-1.5 py-0.5 rounded bg-black border ${themeClasses.kbdBorder} text-[9px] text-gray-400 font-bold shadow`}>
            {shortcuts.mute.toUpperCase()}
          </kbd>
          <span>Tắt / Mở âm</span>
        </div>
        <div className="flex items-center gap-1">
          <kbd className={`px-1.5 py-0.5 rounded bg-black border ${themeClasses.kbdBorder} text-[9px] text-gray-400 font-bold shadow`}>
            {shortcuts.rewind.toUpperCase()}
          </kbd>
          <span>Lùi 10s</span>
        </div>
        <div className="flex items-center gap-1">
          <kbd className={`px-1.5 py-0.5 rounded bg-black border ${themeClasses.kbdBorder} text-[9px] text-gray-400 font-bold shadow`}>
            {shortcuts.forward.toUpperCase()}
          </kbd>
          <span>Tiến 10s</span>
        </div>
        <div className="flex items-center gap-1">
          <kbd className={`px-1.5 py-0.5 rounded bg-black border ${themeClasses.kbdBorder} text-[9px] text-gray-400 font-bold shadow`}>
            {shortcuts.speedDown.toUpperCase()}
          </kbd>
          <span>Chậm lại</span>
        </div>
        <div className="flex items-center gap-1">
          <kbd className={`px-1.5 py-0.5 rounded bg-black border ${themeClasses.kbdBorder} text-[9px] text-gray-400 font-bold shadow`}>
            {shortcuts.speedUp.toUpperCase()}
          </kbd>
          <span>Nhanh lên</span>
        </div>
      </div>
    </div>
  );
}
