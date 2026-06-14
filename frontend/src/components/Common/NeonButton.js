import React, { useState } from 'react';
import { Pressable, Text, StyleSheet, Platform, ActivityIndicator } from 'react-native';

const NeonButton = ({ title, onPress, variant = 'primary', style, textStyle, loading = false, disabled = false }) => {
    const [isHovered, setIsHovered] = useState(false);

    // Dynamic styles based on variant and hover state
    const getStyles = () => {
        let backgroundColor = '#007AFF';
        let borderColor = '#007AFF';
        let darkBorderColor = '#0051A8';
        let textColor = '#FFFFFF';

        if (variant === 'primary') {
            borderColor = '#007AFF';
            darkBorderColor = '#0051A8';
            backgroundColor = isHovered ? '#006BE0' : '#007AFF';
        } else if (variant === 'purple') {
            borderColor = '#9D00FF';
            darkBorderColor = '#6B00B0';
            backgroundColor = isHovered ? '#8E00E6' : '#9D00FF';
        } else if (variant === 'success') {
            borderColor = '#34C759';
            darkBorderColor = '#208A39';
            backgroundColor = isHovered ? '#2FB350' : '#34C759';
        } else if (variant === 'orange') {
            borderColor = '#FF9500';
            darkBorderColor = '#CC7600';
            backgroundColor = isHovered ? '#E68600' : '#FF9500';
        } else if (variant === 'danger') {
            borderColor = '#FF3B30';
            darkBorderColor = '#C91F16';
            backgroundColor = isHovered ? '#E6352B' : '#FF3B30';
        } else if (variant === 'muted') {
            borderColor = '#D1D1D6';
            darkBorderColor = '#AEAEB2';
            backgroundColor = isHovered ? '#E5E5EA' : '#F2F2F7';
            textColor = '#1C1C1E';
        }

        if (disabled) {
            backgroundColor = '#E5E5EA';
            borderColor = '#D1D1D6';
            darkBorderColor = '#C7C7CC';
            textColor = '#AEAEB2';
        }

        return { backgroundColor, borderColor, darkBorderColor, textColor };
    };

    const colors = getStyles();

    return (
        <Pressable
            onPress={disabled || loading ? null : onPress}
            onHoverIn={() => !disabled && setIsHovered(true)}
            onHoverOut={() => setIsHovered(false)}
            style={({ pressed }) => {
                const isPressed = pressed && !disabled && !loading;
                return [
                    styles.button,
                    {
                        backgroundColor: colors.backgroundColor,
                        borderColor: colors.borderColor,
                        borderBottomColor: colors.darkBorderColor,
                        borderBottomWidth: isPressed ? 2 : 6,
                        transform: [
                            { translateY: isPressed ? 4 : isHovered ? -2 : 0 }
                        ]
                    },
                    Platform.select({
                        web: {
                            boxShadow: isPressed 
                                ? '0 2px 0 rgba(0,0,0,0.1)' 
                                : `0 4px 0 ${colors.darkBorderColor}, 0 6px 12px rgba(0,0,0,0.15)`,
                            cursor: disabled ? 'not-allowed' : 'pointer'
                        }
                    }),
                    style
                ];
            }}
            disabled={disabled}
        >
            {loading ? (
                <ActivityIndicator color={colors.textColor} size="small" />
            ) : (
                <Text style={[styles.text, { color: colors.textColor }, textStyle]}>
                    {title}
                </Text>
            )}
        </Pressable>
    );
};

const styles = StyleSheet.create({
    button: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        ...Platform.select({
            web: {
                transition: 'transform 0.1s ease, border-bottom-width 0.1s ease, box-shadow 0.1s ease, background-color 0.2s ease',
            },
            default: {
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.5,
                shadowRadius: 5,
                elevation: 3
            }
        })
    },
    text: {
        fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
        fontWeight: '700',
        fontSize: 15,
        letterSpacing: 0.5,
        textTransform: 'uppercase'
    }
});

export default NeonButton;
