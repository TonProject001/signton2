import React, { useEffect, useState, useRef } from 'react';
import { useSignage } from '../context/SignageContext';
import { MediaType, Playlist } from '../types';
import { WifiOff, Clock } from 'lucide-react';

const DEVICE_ID = 'd1';

export const PlayerView: React.FC = () => {
  const { state, upsertDevice, getMediaById } = useSignage();
  const [activePlaylist, setActivePlaylist] = useState<Playlist | null>(null);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<number | null>(null);

  // 1. Device Registration & Heartbeat Logic
  useEffect(() => {
      const registerAndHeartbeat = () => {
          // Check if device exists in state to avoid overwriting custom names/locations set by Admin
          const existingDevice = state.devices.find(d => d.id === DEVICE_ID);
          
          if (!existingDevice) {
              // Register new device
              upsertDevice({
                  id: DEVICE_ID,
                  name: 'จอแสดงผลใหม่ (Auto)',
                  location: 'ระบุตำแหน่ง...',
                  status: 'online',
                  assignedPlaylistId: null,
                  lastPing: Date.now()
              });
          } else {
              // Just update status and ping
              upsertDevice({
                  id: DEVICE_ID,
                  status: 'online',
                  lastPing: Date.now()
              });
          }
      };

      // Initial call
      registerAndHeartbeat();

      // Heartbeat every 30 seconds
      const interval = setInterval(registerAndHeartbeat, 30000);
      return () => clearInterval(interval);
  }, [state.devices, upsertDevice]); // Dependencies ensure we know if device exists

  // 2. Playlist Scheduler Logic
  useEffect(() => {
    const checkSchedule = () => {
      const device = state.devices.find(d => d.id === DEVICE_ID);
      let targetPlaylist: Playlist | null = null;

      // A. Check for Forced/Assigned Playlist first
      if (device?.assignedPlaylistId) {
        targetPlaylist = state.playlists.find(p => p.id === device.assignedPlaylistId) || null;
      } 
      // B. Check Schedule
      else {
        const now = new Date();
        const currentDay = now.getDay(); // 0-6
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        targetPlaylist = state.playlists.find(p => {
           if (!p.schedule.active) return false;
           if (!p.schedule.days.includes(currentDay)) return false;
           return currentTime >= p.schedule.startTime && currentTime <= p.schedule.endTime;
        }) || null;
      }

      if (targetPlaylist) {
          if (!activePlaylist || activePlaylist.id !== targetPlaylist.id) {
              setActivePlaylist(targetPlaylist);
              setCurrentMediaIndex(0);
          } else {
              const currentContent = JSON.stringify(activePlaylist.items);
              const newContent = JSON.stringify(targetPlaylist.items);
              
              if (currentContent !== newContent) {
                  setActivePlaylist(targetPlaylist);
                  setCurrentMediaIndex(prev => prev >= targetPlaylist!.items.length ? 0 : prev);
              }
          }
      } else {
          setActivePlaylist(null);
      }
    };

    checkSchedule();
    const scheduleTimer = setInterval(checkSchedule, 2000); 
    return () => clearInterval(scheduleTimer);
  }, [state, activePlaylist]);

  // 3. Playback Logic
  const currentPlaylistItem = activePlaylist?.items[currentMediaIndex];
  const currentMedia = currentPlaylistItem ? getMediaById(currentPlaylistItem.mediaId) : null;
  const mediaId = currentMedia?.id;
  const mediaType = currentMedia?.type;
  const displayDurationMs = ((currentPlaylistItem?.duration || currentMedia?.duration || 10) * 1000);

  useEffect(() => {
    if (!mediaId || !mediaType || !activePlaylist) return;

    const handleNext = () => {
       setCurrentMediaIndex(prev => (prev + 1) % activePlaylist.items.length);
    };

    if (mediaType === MediaType.IMAGE) {
        if (timerRef.current) window.clearTimeout(timerRef.current);
        timerRef.current = window.setTimeout(handleNext, displayDurationMs);
    }

    return () => {
        if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [mediaId, mediaType, displayDurationMs, activePlaylist]);

  const onVideoEnded = () => {
      if (activePlaylist) {
        setCurrentMediaIndex(prev => (prev + 1) % activePlaylist.items.length);
      }
  };

  if (!activePlaylist || !currentMedia) {
    return (
      <div className="h-screen w-screen bg-black flex flex-col items-center justify-center text-slate-500">
        <Clock className="w-16 h-16 mb-4 opacity-50" />
        <h2 className="text-xl font-light">ไม่อยู่ในช่วงเวลาออกอากาศ</h2>
        <p className="text-sm mt-2">Device: {DEVICE_ID} (Online)</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-black overflow-hidden relative flex items-center justify-center">
      {currentMedia.type === MediaType.IMAGE && (
        <img
          key={currentMedia.id}
          src={currentMedia.url}
          alt={currentMedia.name}
          className="w-full h-full object-contain animate-fade-in" 
          style={{ maxWidth: '100%', maxHeight: '100%' }}
        />
      )}
      {currentMedia.type === MediaType.VIDEO && (
        <video
          key={currentMedia.id}
          ref={videoRef}
          src={currentMedia.url}
          autoPlay
          muted
          playsInline
          onEnded={onVideoEnded}
          className="w-full h-full object-contain animate-fade-in"
        />
      )}
    </div>
  );
};