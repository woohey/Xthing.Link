import { useEffect, useRef } from 'react';

const VIDEO_URL =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_083109_283f3553-e28f-428b-a723-d639c617eb2b.mp4';
const VIDEO_MAX_OPACITY = 0.9;

export default function CinematicHero() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const restartTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const video = videoRef.current;

    if (!video) {
      return undefined;
    }

    const setOpacity = (value: number) => {
      video.style.opacity = String(Math.max(0, Math.min(VIDEO_MAX_OPACITY, value * VIDEO_MAX_OPACITY)));
    };

    const monitorVideo = () => {
      const { currentTime, duration } = video;

      if (Number.isFinite(duration) && duration > 0) {
        if (currentTime < 0.5) {
          setOpacity(currentTime / 0.5);
        } else if (duration - currentTime < 0.5) {
          setOpacity((duration - currentTime) / 0.5);
        } else {
          setOpacity(1);
        }
      }

      frameRef.current = window.requestAnimationFrame(monitorVideo);
    };

    const restartVideo = () => {
      setOpacity(0);
      restartTimerRef.current = window.setTimeout(() => {
        video.currentTime = 0;
        void video.play();
      }, 100);
    };

    video.addEventListener('ended', restartVideo);
    frameRef.current = window.requestAnimationFrame(monitorVideo);
    void video.play();

    return () => {
      video.removeEventListener('ended', restartVideo);

      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }

      if (restartTimerRef.current !== null) {
        window.clearTimeout(restartTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="cinematic-home-bg" aria-hidden="true">
      <video
        ref={videoRef}
        className="cinematic-home-bg__video"
        src={VIDEO_URL}
        muted
        playsInline
        preload="metadata"
      />
      <div className="cinematic-home-bg__gradient" />
      <div className="cinematic-home-bg__wash" />
    </div>
  );
}
