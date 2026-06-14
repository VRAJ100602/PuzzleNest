import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, Platform } from 'react-native';
import GlassCard from '../components/Common/GlassCard';
import NeonButton from '../components/Common/NeonButton';
import { api } from '../utils/api';

const RegisterScreen = ({ onRegisterSuccess, onNavigate }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleRegister = async () => {
        if (!username || !password || !confirmPassword) {
            setError("Please fill in all fields.");
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        if (password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }

        setLoading(true);
        setError('');

        try {
            await api.register(username, password);
            const user = await api.getMe();
            onRegisterSuccess(user);
        } catch (err) {
            setError(err.message || "Failed to register. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <GlassCard style={styles.card}>
                <Text style={styles.title}>Create Account</Text>
                <Text style={styles.subtitle}>Register to track statistics across devices</Text>

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Username</Text>
                    <TextInput
                        value={username}
                        onChangeText={setUsername}
                        style={styles.input}
                        placeholder="Enter username"
                        placeholderTextColor="#555566"
                        autoCapitalize="none"
                    />
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Password</Text>
                    <TextInput
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        style={styles.input}
                        placeholder="Enter password (min 6 characters)"
                        placeholderTextColor="#555566"
                        autoCapitalize="none"
                    />
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Confirm Password</Text>
                    <TextInput
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry
                        style={styles.input}
                        placeholder="Re-enter password"
                        placeholderTextColor="#555566"
                        autoCapitalize="none"
                    />
                </View>

                <NeonButton
                    title="Register"
                    variant="purple"
                    loading={loading}
                    onPress={handleRegister}
                    style={styles.submitBtn}
                />

                <Pressable onPress={() => onNavigate('login')} style={styles.loginLink}>
                    <Text style={styles.loginLinkText}>
                        Already have an account? <Text style={styles.loginLinkHighlight}>Login</Text>
                    </Text>
                </Pressable>

                <Pressable onPress={() => onNavigate('home')} style={styles.backLink}>
                    <Text style={styles.backLinkText}>Play as Guest</Text>
                </Pressable>
            </GlassCard>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 50,
        paddingHorizontal: 20,
        ...Platform.select({
            web: {
                animation: 'fadeSlideIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            }
        })
    },
    card: {
        width: '100%',
        maxWidth: 400,
        paddingVertical: 35,
        paddingHorizontal: 25,
        alignItems: 'center'
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: '#1C1C1E',
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    subtitle: {
        fontSize: 14,
        color: '#68687E',
        marginTop: 5,
        marginBottom: 25,
        textAlign: 'center',
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    errorText: {
        color: '#FF3366',
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 15,
        textAlign: 'center',
        width: '100%',
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    inputContainer: {
        width: '100%',
        marginBottom: 18
    },
    label: {
        color: '#68687E',
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        marginBottom: 8,
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    input: {
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.12)',
        borderRadius: 8,
        color: '#1C1C1E',
        paddingVertical: 12,
        paddingHorizontal: 16,
        fontSize: 15,
        outlineStyle: 'none',
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
        ...Platform.select({
            web: {
                transition: 'all 0.2s ease-in-out',
            }
        })
    },
    submitBtn: {
        width: '100%',
        paddingVertical: 14,
        marginTop: 10
    },
    loginLink: {
        marginTop: 20,
        padding: 5
    },
    loginLinkText: {
        color: '#8F8FA3',
        fontSize: 13,
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    loginLinkHighlight: {
        color: '#9D00FF',
        fontWeight: '700'
    },
    backLink: {
        marginTop: 12,
        padding: 5
    },
    backLinkText: {
        color: '#555566',
        fontSize: 13,
        fontWeight: '600',
        textTransform: 'uppercase',
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    }
});

export default RegisterScreen;
