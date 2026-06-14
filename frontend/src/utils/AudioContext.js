import React, { createContext, useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';

const PLAYLIST = [
    { title: "🎹 Lofi Study Beat", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
    { title: "🌧️ Cozy Autumn Rain", url: "https://actions.google.com/sounds/v1/water/rain_heavy_loud.ogg" },
    { title: "☕ Coffee Shop Ambience", url: "https://actions.google.com/sounds/v1/ambiences/coffee_shop_atmosphere.ogg" },
    { title: "🌌 Cyberpunk Ambient", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3" }
];

export const AudioContext = createContext({
    volume: 0.5,
    setVolume: () => {},
    isMuted: true,
    toggleMute: () => {},
    playlist: PLAYLIST,
    currentTrackIndex: 0,
    currentTrackTitle: PLAYLIST[0].title,
    nextTrack: () => {},
    prevTrack: () => {},
    playTrack: () => {}
});

export const AudioProvider = ({ children }) => {
    const [volume, setVolumeState] = useState(0.5);
    const [isMuted, setIsMuted] = useState(true);
    const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
    const audioRef = useRef(null);

    // Initialize Audio
    const loadTrack = (index) => {
        if (Platform.OS !== 'web') return;

        if (audioRef.current) {
            audioRef.current.pause();
        }

        const audio = new Audio(PLAYLIST[index].url);
        audio.loop = true;
        audio.volume = volume;
        audioRef.current = audio;

        if (!isMuted) {
            audio.play().catch(e => {
                console.log('Playback blocked by browser.', e);
                setIsMuted(true);
            });
        }
    };

    useEffect(() => {
        if (Platform.OS === 'web') {
            const savedVol = window.localStorage.getItem('music_volume');
            const savedMute = window.localStorage.getItem('music_muted');
            const savedTrack = window.localStorage.getItem('music_track_index');

            let vol = 0.5;
            let mute = true;
            let trIndex = 0;

            if (savedVol !== null) {
                vol = parseFloat(savedVol);
                setVolumeState(vol);
            }
            if (savedMute !== null) {
                mute = savedMute === 'true';
                setIsMuted(mute);
            }
            if (savedTrack !== null) {
                trIndex = parseInt(savedTrack, 10);
                setCurrentTrackIndex(trIndex);
            }

            const audio = new Audio(PLAYLIST[trIndex].url);
            audio.loop = true;
            audio.volume = vol;
            audioRef.current = audio;

            if (!mute) {
                audio.play().catch(e => {
                    console.log('Autoplay blocked. Interaction required.', e);
                    setIsMuted(true);
                });
            }
        }

        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    const setVolume = (val) => {
        setVolumeState(val);
        if (audioRef.current) {
            audioRef.current.volume = val;
        }
        if (Platform.OS === 'web') {
            window.localStorage.setItem('music_volume', val.toString());
        }
    };

    const toggleMute = () => {
        setIsMuted(prev => {
            const nextMuted = !prev;
            if (Platform.OS === 'web') {
                window.localStorage.setItem('music_muted', nextMuted.toString());
            }
            if (audioRef.current) {
                if (nextMuted) {
                    audioRef.current.pause();
                } else {
                    audioRef.current.play().catch(e => console.log(e));
                }
            }
            return nextMuted;
        });
    };

    const nextTrack = () => {
        const nextIdx = (currentTrackIndex + 1) % PLAYLIST.length;
        setCurrentTrackIndex(nextIdx);
        if (Platform.OS === 'web') {
            window.localStorage.setItem('music_track_index', nextIdx.toString());
        }
        loadTrack(nextIdx);
    };

    const prevTrack = () => {
        const prevIdx = (currentTrackIndex - 1 + PLAYLIST.length) % PLAYLIST.length;
        setCurrentTrackIndex(prevIdx);
        if (Platform.OS === 'web') {
            window.localStorage.setItem('music_track_index', prevIdx.toString());
        }
        loadTrack(prevIdx);
    };

    const playTrack = (index) => {
        setCurrentTrackIndex(index);
        if (Platform.OS === 'web') {
            window.localStorage.setItem('music_track_index', index.toString());
        }
        loadTrack(index);
    };

    return (
        <AudioContext.Provider value={{
            volume,
            setVolume,
            isMuted,
            toggleMute,
            playlist: PLAYLIST,
            currentTrackIndex,
            currentTrackTitle: PLAYLIST[currentTrackIndex].title,
            nextTrack,
            prevTrack,
            playTrack
        }}>
            {children}
        </AudioContext.Provider>
    );
};
