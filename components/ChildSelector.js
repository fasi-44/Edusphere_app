import { useRef, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, Animated } from "react-native";
import { useParentStore } from "../store";

const SELECTOR_HEIGHT = 56;

function getInitials(name) {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * Hook that provides smooth hide-on-scroll-down, show-on-scroll-up behavior.
 * Returns { translateY, onScroll, selectorHeight } to wire into ChildSelector and ScrollView.
 */
export function useChildSelectorScroll() {
    const translateY = useRef(new Animated.Value(0)).current;
    const lastY = useRef(0);
    const hidden = useRef(false);

    const onScroll = useCallback((e) => {
        const currentY = e.nativeEvent.contentOffset.y;
        const diff = currentY - lastY.current;

        if (currentY <= 10) {
            // At top — always show
            if (hidden.current) {
                hidden.current = false;
                Animated.spring(translateY, {
                    toValue: 0,
                    useNativeDriver: true,
                    tension: 80,
                    friction: 12,
                }).start();
            }
        } else if (diff > 6 && !hidden.current) {
            // Scrolling down — hide
            hidden.current = true;
            Animated.spring(translateY, {
                toValue: -SELECTOR_HEIGHT,
                useNativeDriver: true,
                tension: 80,
                friction: 12,
            }).start();
        } else if (diff < -6 && hidden.current) {
            // Scrolling up — show
            hidden.current = false;
            Animated.spring(translateY, {
                toValue: 0,
                useNativeDriver: true,
                tension: 80,
                friction: 12,
            }).start();
        }

        lastY.current = currentY;
    }, []);

    return { translateY, onScroll, selectorHeight: SELECTOR_HEIGHT };
}

export default function ChildSelector({ translateY }) {
    const children = useParentStore((s) => s.children);
    const selectedChild = useParentStore((s) => s.selectedChild);
    const selectChild = useParentStore((s) => s.selectChild);

    if (!children || children.length === 0) return null;

    const content = (
        <View
            className="bg-white border-b border-dark-100"
            style={{ height: SELECTOR_HEIGHT }}
        >
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}
            >
                {children.map((child) => {
                    const isSelected = selectedChild?.student_id === child.student_id;
                    return (
                        <TouchableOpacity
                            key={child.student_id}
                            onPress={() => selectChild(child)}
                            activeOpacity={0.7}
                            className={`flex-row items-center px-4 py-2.5 rounded-full ${
                                isSelected ? "bg-primary-600" : "bg-dark-50"
                            }`}
                            style={isSelected ? {
                                shadowColor: "#6366f1",
                                shadowOffset: { width: 0, height: 3 },
                                shadowOpacity: 0.25,
                                shadowRadius: 6,
                                elevation: 4,
                            } : {}}
                        >
                            <View
                                className={`w-7 h-7 rounded-full items-center justify-center mr-2 ${
                                    isSelected ? "bg-white/20" : "bg-primary-100"
                                }`}
                            >
                                <Text
                                    className={`font-lexend-bold text-xs ${
                                        isSelected ? "text-white" : "text-primary-600"
                                    }`}
                                >
                                    {getInitials(child.full_name)}
                                </Text>
                            </View>
                            <View>
                                <Text
                                    className={`font-lexend-semibold text-sm ${
                                        isSelected ? "text-white" : "text-dark-700"
                                    }`}
                                    numberOfLines={1}
                                >
                                    {child.first_name}
                                </Text>
                                {child.class_name && (
                                    <Text
                                        className={`font-lexend text-[10px] ${
                                            isSelected ? "text-white/70" : "text-dark-400"
                                        }`}
                                    >
                                        {child.class_name}{child.section_name ? ` - ${child.section_name}` : ""}
                                    </Text>
                                )}
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );

    // If translateY is provided, wrap in Animated.View for scroll-hide behavior
    if (translateY) {
        return (
            <Animated.View
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    zIndex: 20,
                    transform: [{ translateY }],
                }}
            >
                {content}
            </Animated.View>
        );
    }

    return content;
}
