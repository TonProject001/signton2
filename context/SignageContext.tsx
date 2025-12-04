import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AppState, MediaItem, Playlist, MediaType, ScreenDevice } from '../types';
import { db } from '../services/firebase';
import { 
  collection, 
  onSnapshot, 
  deleteDoc, 
  doc, 
  setDoc, 
  updateDoc 
} from 'firebase/firestore';

// Initial Mock Data
const INITIAL_DATA: AppState = {
  mediaLibrary: [],
  playlists: [],
  devices: []
};

interface SignageContextType {
  state: AppState;
  addMedia: (item: MediaItem) => void;
  removeMedia: (id: string) => void;
  savePlaylist: (playlist: Playlist) => void;
  removePlaylist: (id: string) => void;
  updateDevicePlaylist: (deviceId: string, playlistId: string | null) => void;
  removeDevice: (deviceId: string) => void;
  upsertDevice: (device: Partial<ScreenDevice> & { id: string }) => void;
  refreshState: () => void;
  getMediaById: (id: string) => MediaItem | undefined;
}

const SignageContext = createContext<SignageContextType | undefined>(undefined);

export const SignageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(INITIAL_DATA);

  // --- Firestore Real-time Listeners ---

  useEffect(() => {
    // 1. Listen to Media Library
    const unsubMedia = onSnapshot(collection(db, "mediaLibrary"), (snapshot) => {
      const media = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MediaItem));
      setState(prev => ({ ...prev, mediaLibrary: media }));
    });

    // 2. Listen to Playlists
    const unsubPlaylists = onSnapshot(collection(db, "playlists"), (snapshot) => {
      const playlists = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Playlist));
      setState(prev => ({ ...prev, playlists: playlists }));
    });

    // 3. Listen to Devices
    const unsubDevices = onSnapshot(collection(db, "devices"), (snapshot) => {
      const devices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ScreenDevice));
      setState(prev => ({ ...prev, devices: devices }));
    });

    return () => {
      unsubMedia();
      unsubPlaylists();
      unsubDevices();
    };
  }, []);

  // --- Actions ---

  const addMedia = async (item: MediaItem) => {
    try {
        const { id, ...data } = item;
        await setDoc(doc(db, "mediaLibrary", item.id), data);
    } catch (e) {
        console.error("Error adding media: ", e);
    }
  };

  const removeMedia = async (id: string) => {
    try {
        await deleteDoc(doc(db, "mediaLibrary", id));
    } catch (e) {
        console.error("Error removing media: ", e);
    }
  };

  const savePlaylist = async (playlist: Playlist) => {
    try {
        const { id, ...data } = playlist;
        await setDoc(doc(db, "playlists", playlist.id), data);
    } catch (e) {
        console.error("Error saving playlist: ", e);
    }
  };

  const removePlaylist = async (id: string) => {
    try {
        await deleteDoc(doc(db, "playlists", id));
    } catch (e) {
        console.error("Error removing playlist: ", e);
    }
  };

  const updateDevicePlaylist = async (deviceId: string, playlistId: string | null) => {
    try {
        const deviceRef = doc(db, "devices", deviceId);
        await updateDoc(deviceRef, { assignedPlaylistId: playlistId });
    } catch (e) {
        console.error("Error updating device: ", e);
    }
  };

  const removeDevice = async (deviceId: string) => {
      try {
          await deleteDoc(doc(db, "devices", deviceId));
      } catch (e) {
          console.error("Error removing device: ", e);
      }
  };

  // Used for registering device or sending heartbeat
  const upsertDevice = async (device: Partial<ScreenDevice> & { id: string }) => {
      try {
          const deviceRef = doc(db, "devices", device.id);
          // merge: true allows updating specific fields (like lastPing) without overwriting name/location
          await setDoc(deviceRef, device, { merge: true });
      } catch (e) {
          console.error("Error upserting device: ", e);
      }
  };

  const refreshState = useCallback(() => {
     // No-op for Firestore
  }, []);

  const getMediaById = (id: string) => state.mediaLibrary.find(m => m.id === id);

  return (
    <SignageContext.Provider value={{ state, addMedia, removeMedia, savePlaylist, removePlaylist, updateDevicePlaylist, removeDevice, upsertDevice, refreshState, getMediaById }}>
      {children}
    </SignageContext.Provider>
  );
};

export const useSignage = () => {
  const context = useContext(SignageContext);
  if (!context) throw new Error("useSignage must be used within a SignageProvider");
  return context;
};