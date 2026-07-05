export interface YouTubeVideo {
  videoId: string;
  title: string;
  thumbnail: string;
  channelName: string;
  duration?: string;
  viewCount?: string;
  publishedTime?: string;
}

export interface PlayerStatus {
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
  playbackRate: number;
  currentTime: number;
  duration: number;
}
