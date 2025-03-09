declare global {
  interface Window {
    YT: {
      Player: new (elementId: string, config: YT.PlayerConfig) => YT.Player;
      PlayerState: {
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    ytPlayer: YT.Player;
  }
}

declare namespace YT {
  interface PlayerConfig {
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
      [key: string]: any;
    };
  }

  interface Player {
    playVideo(): void;
    pauseVideo(): void;
    stopVideo(): void;
    seekTo(seconds: number, allowSeekAhead: boolean): void;
    getPlayerState(): number;
    getCurrentTime(): number;
    getDuration(): number;
    [key: string]: any;
  }

  interface PlayerEvent {
    target: Player;
    data: number;
  }
}

export {};