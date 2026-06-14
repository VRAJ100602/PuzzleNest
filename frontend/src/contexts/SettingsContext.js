import React, { createContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';

export const SettingsContext = createContext();

export const SettingsProvider = ({ children }) => {
    const isDarkMode = false;
    const toggleDarkMode = () => {};
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [hapticsEnabled, setHapticsEnabled] = useState(true);

    useEffect(() => {
        if (Platform.OS === 'web') {
            const loadSettings = () => {
                try {
                    const savedSound = localStorage.getItem('soundEnabled');
                    if (savedSound !== null) setSoundEnabled(JSON.parse(savedSound));

                    const savedHaptics = localStorage.getItem('hapticsEnabled');
                    if (savedHaptics !== null) setHapticsEnabled(JSON.parse(savedHaptics));
                } catch (e) {
                    console.warn('Failed to load settings from localStorage', e);
                }
            };
            loadSettings();
        }
    }, []);

    const toggleSound = () => {
        setSoundEnabled(prev => {
            const newValue = !prev;
            if (Platform.OS === 'web') {
                try {
                    localStorage.setItem('soundEnabled', JSON.stringify(newValue));
                } catch (e) {
                    // Ignore
                }
            }
            return newValue;
        });
    };

    const toggleHaptics = () => {
        setHapticsEnabled(prev => {
            const newValue = !prev;
            if (Platform.OS === 'web') {
                try {
                    localStorage.setItem('hapticsEnabled', JSON.stringify(newValue));
                } catch (e) {
                    // Ignore
                }
            }
            return newValue;
        });
    };

    return (
        <SettingsContext.Provider
            value={{
                isDarkMode,
                toggleDarkMode,
                soundEnabled,
                toggleSound,
                hapticsEnabled,
                toggleHaptics
            }}
        >
            {children}
        </SettingsContext.Provider>
    );
};
