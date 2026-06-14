import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, ScrollView, TouchableOpacity } from 'react-native';
import GlassCard from '../components/Common/GlassCard';
import NeonButton from '../components/Common/NeonButton';
import { api } from '../utils/api';

const mockAvatars = [
    { id: 'a1', name: 'Ninja', price: 100, icon: '🥷' },
    { id: 'a2', name: 'Wizard', price: 150, icon: '🧙' },
    { id: 'a3', name: 'Astronaut', price: 200, icon: '👨‍🚀' },
    { id: 'a4', name: 'Alien', price: 250, icon: '👽' }
];

const mockColors = [
    { id: 'c1', name: 'Neon Green', price: 50, color: '#39FF14' },
    { id: 'c2', name: 'Cyber Blue', price: 50, color: '#00FFFF' },
    { id: 'c3', name: 'Hot Pink', price: 50, color: '#FF69B4' },
    { id: 'c4', name: 'Gold', price: 100, color: '#FFD700' }
];

const StoreScreen = ({ onGoBack }) => {
    const [coins, setCoins] = useState(0);
    const [purchasedIds, setPurchasedIds] = useState([]);

    useEffect(() => {
        const fetchCoinsAndPurchases = async () => {
            try {
                const me = await api.getMe();
                if (me) {
                    setCoins(me.coins || 0);
                    let purchases = [];
                    if (me.store_purchases) {
                        try {
                            purchases = typeof me.store_purchases === 'string' ? JSON.parse(me.store_purchases) : me.store_purchases;
                        } catch (e) {
                            purchases = [];
                        }
                    }
                    setPurchasedIds(purchases);
                }
            } catch (e) {
                console.warn('Failed to fetch user data', e);
            }
        };
        fetchCoinsAndPurchases();
    }, []);

    const handlePurchase = async (item) => {
        if (purchasedIds.includes(item.id)) return;
        if (coins < item.price) {
            alert('Not enough coins!');
            return;
        }
        try {
            const res = await api.purchaseItem(item.id, item.price);
            if (res) {
                setCoins(res.coins);
                setPurchasedIds(res.store_purchases || []);
                alert(`Successfully purchased ${item.name}!`);
            }
        } catch (e) {
            alert(e.message || "Failed to purchase item");
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.header}>
                <NeonButton title="⬅ Back" onPress={onGoBack} style={styles.backBtn} variant="secondary" />
                <View style={styles.titleContainer}>
                    <Text style={styles.title}>🛒 Store</Text>
                    <Text style={styles.coinsText}>🪙 {coins} Coins</Text>
                </View>
            </View>

            <View style={styles.content}>
                <GlassCard style={styles.card}>
                    <Text style={styles.sectionTitle}>Avatars</Text>
                    <View style={styles.grid}>
                        {mockAvatars.map(avatar => {
                            const isOwned = purchasedIds.includes(avatar.id);
                            return (
                                <View key={avatar.id} style={styles.itemCard}>
                                    <Text style={styles.itemIcon}>{avatar.icon}</Text>
                                    <Text style={styles.itemName}>{avatar.name}</Text>
                                    <TouchableOpacity 
                                        style={[
                                            styles.buyBtn, 
                                            isOwned && styles.buyBtnUnlocked,
                                            coins < avatar.price && !isOwned && styles.buyBtnDisabled
                                        ]}
                                        onPress={() => handlePurchase(avatar)}
                                        disabled={isOwned}
                                    >
                                        <Text style={styles.buyBtnText}>
                                            {isOwned ? 'Unlocked' : `🪙 ${avatar.price}`}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            );
                        })}
                    </View>
                </GlassCard>

                <GlassCard style={styles.card}>
                    <Text style={styles.sectionTitle}>Colors</Text>
                    <View style={styles.grid}>
                        {mockColors.map(color => {
                            const isOwned = purchasedIds.includes(color.id);
                            return (
                                <View key={color.id} style={styles.itemCard}>
                                    <View style={[styles.colorPreview, { backgroundColor: color.color }]} />
                                    <Text style={styles.itemName}>{color.name}</Text>
                                    <TouchableOpacity 
                                        style={[
                                            styles.buyBtn, 
                                            isOwned && styles.buyBtnUnlocked,
                                            coins < color.price && !isOwned && styles.buyBtnDisabled
                                        ]}
                                        onPress={() => handlePurchase(color)}
                                        disabled={isOwned}
                                    >
                                        <Text style={styles.buyBtnText}>
                                            {isOwned ? 'Unlocked' : `🪙 ${color.price}`}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            );
                        })}
                    </View>
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
        alignItems: 'center',
        justifyContent: 'flex-start'
    },
    backBtn: {
        marginRight: 20
    },
    titleContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        flex: 1,
        alignItems: 'center'
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#1C1C1E',
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    coinsText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFD700',
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
        backgroundColor: 'rgba(255, 215, 0, 0.1)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        overflow: 'hidden',
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
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1C1C1E',
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
        paddingBottom: 10,
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 20,
        justifyContent: 'flex-start'
    },
    itemCard: {
        width: 130,
        backgroundColor: 'rgba(255,255,255,0.4)',
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.6)',
    },
    itemIcon: {
        fontSize: 48,
        marginBottom: 10
    },
    colorPreview: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginBottom: 10,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.8)'
    },
    itemName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1C1C1E',
        marginBottom: 10,
        textAlign: 'center',
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    },
    buyBtn: {
        backgroundColor: '#4CAF50',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        width: '100%',
        alignItems: 'center'
    },
    buyBtnDisabled: {
        backgroundColor: '#9E9E9E'
    },
    buyBtnUnlocked: {
        backgroundColor: '#007AFF'
    },
    buyBtnText: {
        color: 'white',
        fontWeight: 'bold',
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    }
});

export default StoreScreen;
