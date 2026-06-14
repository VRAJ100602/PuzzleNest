import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, Animated } from 'react-native';
import NeonButton from '../Common/NeonButton';

const Sidebar = ({ currentScreen, onNavigate, user, onLogout }) => {
    const [collapsed, setCollapsed] = useState(false);

    return (
        <View style={[styles.sidebar, collapsed && styles.sidebarCollapsed]}>
            <View style={styles.header}>
                <Pressable onPress={() => setCollapsed(!collapsed)} style={styles.toggleBtn}>
                    <Text style={styles.toggleIcon}>≡</Text>
                </Pressable>
                {!collapsed && (
                    <Text style={styles.logoText}>PUZZLE <Text style={styles.logoHighlight}>HUB</Text></Text>
                )}
            </View>

            <View style={styles.navMenu}>
                <Pressable
                    style={[styles.navItem, currentScreen === 'home' && styles.navItemActive]}
                    onPress={() => onNavigate('home')}
                >
                    <Text style={[styles.navText, currentScreen === 'home' && styles.navTextActive]}>
                        🎮 {!collapsed && "Dashboard"}
                    </Text>
                </Pressable>

                <Pressable
                    style={[styles.navItem, currentScreen === 'multiplayer' && styles.navItemActive, currentScreen === 'multiplayer' && styles.navItemArena]}
                    onPress={() => onNavigate('multiplayer')}
                >
                    <Text style={[styles.navText, currentScreen === 'multiplayer' && styles.navTextArena]}>
                        ⚔️ {!collapsed && "Multiplayer"}
                    </Text>
                </Pressable>
                
                <Pressable
                    style={[styles.navItem, currentScreen === 'store' && styles.navItemActive]}
                    onPress={() => onNavigate('store')}
                >
                    <Text style={[styles.navText, currentScreen === 'store' && styles.navTextActive]}>
                        🛒 {!collapsed && "Store"}
                    </Text>
                </Pressable>

                <Pressable
                    style={[styles.navItem, currentScreen === 'leaderboards' && styles.navItemActive]}
                    onPress={() => onNavigate('leaderboards')}
                >
                    <Text style={[styles.navText, currentScreen === 'leaderboards' && styles.navTextActive]}>
                        🏆 {!collapsed && "Leaderboards"}
                    </Text>
                </Pressable>

                <Pressable
                    style={[styles.navItem, currentScreen === 'settings' && styles.navItemActive]}
                    onPress={() => onNavigate('settings')}
                >
                    <Text style={[styles.navText, currentScreen === 'settings' && styles.navTextActive]}>
                        ⚙️ {!collapsed && "Settings"}
                    </Text>
                </Pressable>
            </View>


            <View style={styles.footer}>
                {user ? (
                    <View style={styles.userSection}>
                        {!collapsed && <Text style={styles.greeting}>Hi, <Text style={styles.username}>{user.username}</Text></Text>}
                        <NeonButton title={collapsed ? "🚪" : "Logout"} variant="muted" onPress={onLogout} style={styles.authBtn} />
                    </View>
                ) : (
                    <View style={styles.authSection}>
                        <NeonButton title={collapsed ? "🔑" : "Login"} variant="primary" onPress={() => onNavigate('login')} style={styles.authBtn} />
                        {!collapsed && <NeonButton title="Register" variant="muted" onPress={() => onNavigate('register')} style={styles.authBtn} />}
                    </View>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    sidebar: {
        width: 250,
        backgroundColor: 'rgba(255, 255, 255, 0.72)',
        height: '100%',
        paddingVertical: 30,
        paddingHorizontal: 20,
        borderRightWidth: 1,
        borderRightColor: 'rgba(0,0,0,0.06)',
        justifyContent: 'space-between',
        ...Platform.select({
            web: {
                position: 'fixed',
                left: 0,
                top: 0,
                bottom: 0,
                zIndex: 100,
                backdropFilter: 'blur(20px) saturate(180%)',
                WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                boxShadow: '4px 0 24px rgba(0, 0, 0, 0.04)',
                transition: 'width 0.3s ease',
            }
        })
    },
    sidebarCollapsed: {
        width: 80,
        paddingHorizontal: 10,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 40,
        overflow: 'hidden'
    },
    toggleBtn: {
        padding: 5,
        marginRight: 10,
        ...Platform.select({ web: { cursor: 'pointer' } })
    },
    toggleIcon: {
        fontSize: 24,
        color: '#1C1C1E',
    },
    logoText: {
        fontSize: 24,
        fontWeight: '900',
        color: '#1C1C1E',
        letterSpacing: 1,
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    logoHighlight: {
        color: '#007AFF'
    },
    navMenu: {
        flex: 1
    },
    navItem: {
        paddingVertical: 15,
        paddingHorizontal: 15,
        borderRadius: 10,
        marginBottom: 10,
        backgroundColor: 'transparent',
        ...Platform.select({
            web: {
                transition: 'background-color 0.2s ease',
                cursor: 'pointer'
            }
        })
    },
    navItemActive: {
        backgroundColor: 'rgba(0, 122, 255, 0.1)'
    },
    navText: {
        fontSize: 16,
        color: '#68686E',
        fontWeight: '600',
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    navTextActive: {
        color: '#007AFF',
        fontWeight: 'bold'
    },
    navItemArena: {
        backgroundColor: 'rgba(255, 149, 0, 0.1)',
    },
    navTextArena: {
        color: '#FF9500',
        fontWeight: 'bold'
    },
    footer: {
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
        paddingTop: 20
    },
    userSection: {
        alignItems: 'center'
    },
    greeting: {
        color: '#68686E',
        fontSize: 14,
        marginBottom: 15,
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    username: {
        color: '#007AFF',
        fontWeight: 'bold'
    },
    authSection: {
        gap: 10
    },
    authBtn: {
        width: '100%',
        marginBottom: 10
    }
});

export default Sidebar;
