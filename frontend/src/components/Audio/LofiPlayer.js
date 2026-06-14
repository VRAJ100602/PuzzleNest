import React, { useContext, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, Animated } from 'react-native';
import { AudioContext } from '../../utils/AudioContext';
import GlassCard from '../Common/GlassCard';

const LofiPlayer = () => {
    const {
        isMuted,
        toggleMute,
        currentTrackTitle,
        nextTrack,
        prevTrack,
        volume,
        setVolume
    } = useContext(AudioContext);

    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (!isMuted) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.4, duration: 800, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true })
                ])
            ).start();
        } else {
            pulseAnim.setValue(1);
        }
    }, [isMuted]);

    if (Platform.OS !== 'web') return null;

    return (
        <GlassCard style={styles.floatingContainer}>
            <View style={styles.musicRow}>
                {/* Visualizer / Disc */}
                <Animated.View style={[styles.disc, { transform: [{ scale: pulseAnim }] }, !isMuted && styles.discActive]}>
                    <Text style={{ fontSize: 14 }}>🎵</Text>
                </Animated.View>

                {/* Track Details */}
                <View style={styles.details}>
                    <Text style={styles.nowPlaying}>NOW PLAYING</Text>
                    <Text style={styles.trackTitle} numberOfLines={1}>
                        {currentTrackTitle}
                    </Text>
                </View>
            </View>

            {/* Controls */}
            <View style={styles.controls}>
                <Pressable onPress={prevTrack} style={styles.btn}>
                    <Text style={styles.btnText}>⏮️</Text>
                </Pressable>
                <Pressable onPress={toggleMute} style={[styles.playBtn, !isMuted && styles.playBtnActive]}>
                    <Text style={styles.playBtnText}>{isMuted ? '▶️ Play' : '⏸️ Pause'}</Text>
                </Pressable>
                <Pressable onPress={nextTrack} style={styles.btn}>
                    <Text style={styles.btnText}>⏭️</Text>
                </Pressable>
            </View>

            {/* Volume control */}
            <View style={styles.volumeRow}>
                <Text style={{ fontSize: 12, marginRight: 6 }}>🔈</Text>
                <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.05" 
                    value={volume} 
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    style={styles.slider}
                />
                <Text style={{ fontSize: 12, marginLeft: 6 }}>🔊</Text>
            </View>
        </GlassCard>
    );
};

const styles = StyleSheet.create({
    floatingContainer: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        width: 260,
        padding: 16,
        zIndex: 9999,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.4)',
        boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
    },
    musicRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    disc: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(0, 0, 0, 0.05)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    discActive: {
        backgroundColor: 'rgba(0, 122, 255, 0.15)',
    },
    details: {
        flex: 1,
    },
    nowPlaying: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#68686E',
        letterSpacing: 1,
        marginBottom: 2,
    },
    trackTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1C1C1E',
        fontFamily: 'Outfit, sans-serif',
    },
    controls: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    btn: {
        padding: 6,
        backgroundColor: 'rgba(0,0,0,0.03)',
        borderRadius: 8,
    },
    btnText: {
        fontSize: 14,
    },
    playBtn: {
        flex: 1,
        marginHorizontal: 12,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#007AFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    playBtnActive: {
        backgroundColor: '#FF3B30',
    },
    playBtnText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 12,
        fontFamily: 'Outfit, sans-serif',
    },
    volumeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
    },
    slider: {
        flex: 1,
        cursor: 'pointer',
        accentColor: '#007AFF',
    }
});

export default LofiPlayer;
