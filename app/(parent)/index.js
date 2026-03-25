import { useState, useCallback } from "react";
import {
    View,
    Text,
    ScrollView,
    ActivityIndicator,
    RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { useAuthStore, useParentStore } from "../../store";
import { studentTimetableService } from "../../services/student";
import ChildSelector, { useChildSelectorScroll } from "../../components/ChildSelector";

function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
}

function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

function formatTimeDisplay(timeStr) {
    if (!timeStr) return "";
    const [h, m] = timeStr.split(":");
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${String(h12).padStart(2, "0")}:${m} ${ampm}`;
}

export default function ParentHomeScreen() {
    const user = useAuthStore((s) => s.user);
    const selectedChild = useParentStore((s) => s.selectedChild);
    const childrenLoading = useParentStore((s) => s.loading);

    const { translateY, onScroll, selectorHeight } = useChildSelectorScroll();
    const [todaySchedule, setTodaySchedule] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = useCallback(async () => {
        if (!user?.skid || !selectedChild?.student_id) {
            setTodaySchedule([]);
            setLoading(false);
            setRefreshing(false);
            return;
        }
        try {
            const today = formatDate(new Date());
            const res = await studentTimetableService.getDailyTimetable(
                user.skid,
                selectedChild.student_id,
                today
            );
            const data = res?.data?.data || res?.data || [];
            setTodaySchedule(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Parent dashboard fetch error:", err);
            setTodaySchedule([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user?.skid, selectedChild?.student_id]);

    useFocusEffect(
        useCallback(() => {
            setLoading(true);
            fetchData();
        }, [fetchData])
    );

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchData();
    }, [fetchData]);

    const greeting = getGreeting();

    return (
        <SafeAreaView className="flex-1 bg-dark-50">
            {/* Child Selector - Flipkart style top tabs */}
            <ChildSelector translateY={translateY} />

            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                onScroll={onScroll}
                scrollEventThrottle={16}
                contentContainerStyle={{ paddingTop: selectorHeight }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {/* Header */}
                <View className="px-6 pt-5 pb-4 bg-white">
                    <View className="flex-row items-center mb-3">
                        <View className="w-12 h-12 rounded-full bg-primary-100 items-center justify-center mr-3">
                            <Text className="font-lexend-bold text-lg text-primary-600">
                                {user?.first_name?.charAt(0)?.toUpperCase() || "P"}
                            </Text>
                        </View>
                        <View className="flex-1">
                            <Text className="font-lexend text-sm text-dark-400">
                                Welcome back
                            </Text>
                            <Text className="font-lexend-bold text-lg text-dark-900">
                                {user?.full_name || "Parent"}
                            </Text>
                        </View>
                    </View>
                    <Text className="font-lexend-semibold text-xl text-dark-800">
                        {greeting} &#x1F44B;
                    </Text>
                </View>

                {childrenLoading ? (
                    <View className="items-center py-16">
                        <ActivityIndicator size="large" color="#6366f1" />
                        <Text className="font-lexend text-sm text-dark-400 mt-3">
                            Loading children...
                        </Text>
                    </View>
                ) : !selectedChild ? (
                    <View className="px-6 py-16 items-center">
                        <Text className="font-lexend-semibold text-base text-dark-500">
                            No children linked
                        </Text>
                        <Text className="font-lexend text-sm text-dark-400 mt-1 text-center">
                            Contact your school admin to link your children to your account.
                        </Text>
                    </View>
                ) : (
                    <View className="px-6 pt-5">
                        {/* Selected Child Info Card */}
                        <View className="bg-primary-600 rounded-3xl p-5 mb-5"
                            style={{
                                shadowColor: "#6366f1",
                                shadowOffset: { width: 0, height: 6 },
                                shadowOpacity: 0.3,
                                shadowRadius: 12,
                                elevation: 8,
                            }}
                        >
                            <View className="flex-row items-center mb-3">
                                <View className="w-11 h-11 rounded-full bg-white/20 items-center justify-center mr-3">
                                    <Text className="font-lexend-bold text-lg text-white">
                                        {selectedChild.first_name?.charAt(0)?.toUpperCase() || "?"}
                                    </Text>
                                </View>
                                <View className="flex-1">
                                    <Text className="font-lexend-bold text-lg text-white">
                                        {selectedChild.full_name}
                                    </Text>
                                    <Text className="font-lexend text-sm text-white/70">
                                        {selectedChild.class_name || ""}
                                        {selectedChild.section_name ? ` - ${selectedChild.section_name}` : ""}
                                    </Text>
                                </View>
                            </View>
                            <View className="flex-row gap-3">
                                {selectedChild.roll_no && (
                                    <View className="bg-white/15 rounded-2xl px-3 py-2">
                                        <Text className="font-lexend text-[10px] text-white/60 uppercase tracking-widest">Roll No</Text>
                                        <Text className="font-lexend-bold text-sm text-white">{selectedChild.roll_no}</Text>
                                    </View>
                                )}
                                {selectedChild.relation_type && (
                                    <View className="bg-white/15 rounded-2xl px-3 py-2">
                                        <Text className="font-lexend text-[10px] text-white/60 uppercase tracking-widest">Relation</Text>
                                        <Text className="font-lexend-bold text-sm text-white capitalize">{selectedChild.relation_type}</Text>
                                    </View>
                                )}
                            </View>
                        </View>

                        {/* Quick Stats */}
                        <View className="flex-row gap-3 mb-5">
                            <View className="flex-1 bg-white rounded-2xl p-4"
                                style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 }}
                            >
                                <Text className="font-lexend text-[10px] text-dark-400 uppercase tracking-widest mb-1">Today's Classes</Text>
                                <Text className="font-lexend-bold text-2xl text-primary-600">
                                    {loading ? "..." : todaySchedule.length}
                                </Text>
                            </View>
                            <View className="flex-1 bg-white rounded-2xl p-4"
                                style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 }}
                            >
                                <Text className="font-lexend text-[10px] text-dark-400 uppercase tracking-widest mb-1">Class</Text>
                                <Text className="font-lexend-bold text-lg text-dark-700" numberOfLines={1}>
                                    {selectedChild.class_name || "-"}
                                </Text>
                            </View>
                        </View>

                        {/* Today's Schedule */}
                        <View className="mb-6">
                            <Text className="font-lexend-semibold text-base text-dark-800 mb-3">
                                Today's Schedule
                            </Text>
                            {loading ? (
                                <ActivityIndicator size="small" color="#6366f1" />
                            ) : todaySchedule.length === 0 ? (
                                <View className="bg-white rounded-2xl p-5 items-center">
                                    <Text className="font-lexend text-sm text-dark-400 italic">
                                        No classes scheduled for today.
                                    </Text>
                                </View>
                            ) : (
                                todaySchedule.map((period, index) => (
                                    <View
                                        key={period.id || index}
                                        className="bg-white rounded-2xl p-4 mb-2.5 flex-row items-center"
                                        style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 }}
                                    >
                                        <View className="w-10 h-10 rounded-xl bg-primary-50 items-center justify-center mr-3">
                                            <Text className="font-lexend-bold text-sm text-primary-600">
                                                {period.period_number}
                                            </Text>
                                        </View>
                                        <View className="flex-1">
                                            <Text className="font-lexend-semibold text-sm text-dark-800">
                                                {period.subject_name}
                                            </Text>
                                            {period.teacher_name && (
                                                <Text className="font-lexend text-xs text-dark-400 mt-0.5">
                                                    {period.teacher_name}
                                                </Text>
                                            )}
                                        </View>
                                        <Text className="font-lexend text-xs text-dark-400">
                                            {formatTimeDisplay(period.start_time)}
                                        </Text>
                                    </View>
                                ))
                            )}
                        </View>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
