// Extend the Window interface globally
export {};

declare global {
  interface Window {
    YT: YT;
    ytPlayer: Player;
  }
}

// Define the YT namespace as an interface
export interface YT {
  Player: new (elementId: string, config: PlayerConfig) => Player;
  PlayerState: {
    ENDED: number;
    PLAYING: number;
    PAUSED: number;
    BUFFERING: number;
    CUED: number;
  };
}

export interface PlayerConfig {
  events?: {
    onReady?: (event: PlayerEvent) => void;
    onStateChange?: (event: PlayerEvent) => void;
    onError?: (event: PlayerEvent) => void;
  };
  videoId?: string;
  playerVars?: {
    autoplay?: 0 | 1;
    controls?: 0 | 1;
    rel?: 0 | 1;
    showinfo?: 0 | 1;
    [key: string]: number | string | boolean | undefined;
  };
}

export interface Player {
  playVideo(): void;
  pauseVideo(): void;
  stopVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getPlayerState(): number;
  getCurrentTime(): number;
  getDuration(): number;
  [key: string]: unknown;
}

export interface PlayerEvent {
  target: Player;
  data: number;
}