import React, { useContext } from 'react';
import { View, Text, StyleSheet, Platform, ScrollView, Switch } from 'react-native';
import GlassCard from '../components/Common/GlassCard';
import NeonButton from '../components/Common/NeonButton';
import { SettingsContext } from '../contexts/SettingsContext';

const SettingsScreen = ({ user, onLogout, onGoBack }) => {
    const { 
        isDarkMode, toggleDarkMode, 
        soundEnabled, toggleSound, 
        hapticsEnabled, toggleHaptics 
    } = useContext(SettingsContext);

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.header}>
                <NeonButton title="⬅ Back" onPress={onGoBack} style={styles.backBtn} variant="secondary" />
                <Text style={styles.title}>⚙️ Settings</Text>
            </View>

            <View style={styles.content}>
                <GlassCard style={styles.card}>
                    <Text style={styles.sectionTitle}>Preferences</Text>
                    

                    <View style={styles.settingRow}>
                        <Text style={styles.settingLabel}>Sound Effects</Text>
                        <Switch
                            trackColor={{ false: "#767577", true: "#81b0ff" }}
                            thumbColor={soundEnabled ? "#34C759" : "#f4f3f4"}
                            onValueChange={toggleSound}
                            value={soundEnabled}
                        />
                    </View>

                    <View style={styles.settingRow}>
                        <Text style={styles.settingLabel}>Haptic Feedback</Text>
                        <Switch
                            trackColor={{ false: "#767577", true: "#81b0ff" }}
                            thumbColor={hapticsEnabled ? "#FF9500" : "#f4f3f4"}
                            onValueChange={toggleHaptics}
                            value={hapticsEnabled}
                        />
                    </View>
                </GlassCard>

                <GlassCard style={styles.card}>
                    <Text style={styles.sectionTitle}>Account Details</Text>
                    
                    {user ? (
                        <View>
                            <View style={styles.accountInfo}>
                                <Text style={styles.accountLabel}>Username:</Text>
                                <Text style={styles.accountValue}>{user.username}</Text>
                            </View>
                            <View style={styles.accountInfo}>
                                <Text style={styles.accountLabel}>Status:</Text>
                                <Text style={styles.accountValueActive}>Online</Text>
                            </View>
                            <View style={styles.logoutWrapper}>
                                <NeonButton title="Logout" variant="danger" onPress={onLogout} />
                            </View>
                        </View>
                    ) : (
                        <View>
                            <Text style={styles.guestText}>You are currently playing as a Guest. Login to save your progress permanently.</Text>
                        </View>
                    )}
                </GlassCard>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 40,
        paddingTop: 40,
        paddingBottom: 50,
        alignItems: 'center',
        width: '100%'
    },
    header: {
        width: '100%',
        maxWidth: 700,
        marginBottom: 30,
        flexDirection: 'row',
        alignItems: 'center'
    },
    backBtn: {
        marginRight: 20
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#1C1C1E',
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    content: {
        width: '100%',
        maxWidth: 700,
        gap: 20
    },
    card: {
        padding: 24,
        marginBottom: 20
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1C1C1E',
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
        paddingBottom: 10,
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    settingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20
    },
    settingLabel: {
        fontSize: 18,
        color: '#68686E',
        fontWeight: '600',
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    accountInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 15
    },
    accountLabel: {
        fontSize: 16,
        color: '#68686E',
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    accountValue: {
        fontSize: 16,
        color: '#1C1C1E',
        fontWeight: 'bold',
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    accountValueActive: {
        fontSize: 16,
        color: '#34C759',
        fontWeight: 'bold',
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    logoutWrapper: {
        marginTop: 20,
        alignItems: 'center'
    },
    guestText: {
        fontSize: 15,
        color: '#68686E',
        lineHeight: 22,
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    }
});

export default SettingsScreen;
