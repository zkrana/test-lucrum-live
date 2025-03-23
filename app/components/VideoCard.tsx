import React, { useState } from 'react';
import { PlayIcon } from '@heroicons/react/24/solid';
import Image from 'next/image';

interface VideoCardProps {
  title: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  onVideoComplete?: () => void;
}

export default function VideoCard({ title, description, videoUrl, thumbnailUrl, onVideoComplete }: VideoCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  const handleVideoClick = React.useCallback(() => {
    if (videoRef.current) {
      videoRef.current.play()
        .then(() => setIsPlaying(true))
        .catch((error) => {
          console.error('Error playing video:', error);
          setIsPlaying(false);
        });
    }
  }, []);

  const handleVideoEnded = React.useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    // Ensure onVideoComplete is called with a slight delay to allow state updates
    setTimeout(() => {
      onVideoComplete?.();
    }, 100);
  }, [onVideoComplete]);

  // Reset video state when unmounting
  React.useEffect(() => {
    return () => {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
      setIsPlaying(false);
    };
  }, []);

  return (
    <div className="relative rounded-lg overflow-hidden shadow-lg bg-white">
      <div 
        className="relative aspect-video w-full cursor-pointer group"
        onClick={handleVideoClick}
      >
        {thumbnailUrl ? (
          <>
            <Image
              src={thumbnailUrl}
              alt={title}
              width={640}
              height={360}
              className="w-full h-full object-cover"
            />
            {!isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 transition-opacity group-hover:bg-opacity-60">
                <PlayIcon className="w-16 h-16 text-white opacity-80 group-hover:opacity-100 transition-opacity" />
              </div>
            )}
          </>
        ) : (
          <>
            <video
              ref={videoRef}
              src={videoUrl}
              className="w-full h-full object-cover"
              muted={!isPlaying}
              loop={false}
              playsInline
              controls={isPlaying}
              onEnded={handleVideoEnded}
              autoPlay={false}
              preload="metadata"
            />
            {!isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 transition-opacity group-hover:bg-opacity-60">
                <PlayIcon className="w-16 h-16 text-white opacity-80 group-hover:opacity-100 transition-opacity" />
              </div>
            )}
          </>
        )}
      </div>
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        {description && (
          <p className="text-sm text-gray-600">{description}</p>
        )}
      </div>
    </div>
  );
}