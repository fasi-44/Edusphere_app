import { useEffect, useState, useCallback } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { useAuthStore, useAppStore } from "../../store";
import { studentTimetableService, studentAssignmentService } from "../../services/student";
import { announcementService } from "../../services/teacher";
import AnnouncementItem from "../../components/AnnouncementItem";

const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning";
    if (h < 17) return "Good Afternoon";
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

function parseTime(timeStr) {
    if (!timeStr) return null;
    const parts = timeStr.split(":");
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

export default function StudentHome() {
    const user = useAuthStore((s) => s.user);
    const academicYear = useAppStore((s) => s.academicYear);

    const skid = user?.skid;
    const studentId = user?.school_user_id;
    const academicYearId = academicYear?.id;

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [todayPeriods, setTodayPeriods] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [announcements, setAnnouncements] = useState([]);

    const fetchData = useCallback(async () => {
        if (!skid || !studentId || !academicYearId) return;
        const today = formatDate(new Date());

        try {
            const [timetableRes, assignmentRes, announcementRes] = await Promise.allSettled([
                studentTimetableService.getDailyTimetable(skid, studentId, today),
                studentAssignmentService.getAssignments(skid, { studentId, academicYearId }),
                announcementService.getAnnouncements(skid, {
                    academicYearId,
                    userRole: user?.role,
                    schoolUserId: studentId,
                    limit: 3,
                }),
            ]);

            if (timetableRes.status === "fulfilled") {
                const data = timetableRes.value?.data || [];
                setTodayPeriods(Array.isArray(data) ? data : []);
            }
            if (assignmentRes.status === "fulfilled") {
                const data = assignmentRes.value?.data || [];
                setAssignments(Array.isArray(data) ? data : []);
            }
            if (announcementRes.status === "fulfilled") {
                const list = announcementRes.value?.data?.announcements || announcementRes.value?.data || [];
                setAnnouncements(Array.isArray(list) ? list : []);
            }
        } catch (err) {
            console.error("Student dashboard error:", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [skid, studentId, academicYearId, user?.role]);

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [fetchData])
    );

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchData();
    }, [fetchData]);

    // Find current / next class
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    let currentClass = null;
    let nextClass = null;
    for (const p of todayPeriods) {
        const start = parseTime(p.start_time);
        const end = parseTime(p.end_time);
        if (start !== null && end !== null) {
            if (nowMinutes >= start && nowMinutes < end) currentClass = p;
            else if (nowMinutes < start && !nextClass) nextClass = p;
        }
    }

    const pendingAssignments = assignments.filter((a) => !a.is_completed);

    const today = new Date();
    const dateLabel = `${MONTH_NAMES[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()}`;

    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-dark-50 items-center justify-center">
                <ActivityIndicator size="large" color="#6366f1" />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-dark-50">
            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {/* Header */}
                <View className="flex-row items-center justify-between px-6 pt-4 pb-2">
                    <View className="flex-row items-center">
                        <View className="w-12 h-12 rounded-full bg-primary-100 items-center justify-center mr-3">
                            <Text className="font-lexend-bold text-lg text-primary-600">
                                {(user?.first_name?.[0] || "").toUpperCase()}
                                {(user?.last_name?.[0] || "").toUpperCase()}
                            </Text>
                        </View>
                        <View>
                            <Text className="font-lexend text-xs text-dark-500">Welcome back</Text>
                            <Text className="font-lexend-semibold text-base text-dark-900">
                                {user?.full_name || "Student"}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Greeting */}
                <View className="px-6 pt-4 pb-5">
                    <Text className="font-lexend-bold text-2xl text-dark-900">
                        {getGreeting()} 👋
                    </Text>
                    <Text className="font-lexend text-sm text-dark-500 mt-1">{dateLabel}</Text>
                </View>

                {/* Current / Next Class Card */}
                {(currentClass || nextClass) && (
                    <View className="px-6 mb-5">
                        {currentClass ? (
                            <View className="bg-primary-600 rounded-2xl p-5">
                                <View className="flex-row items-center bg-white/20 self-start rounded-full px-3 py-1 mb-3">
                                    <View className="w-2 h-2 rounded-full bg-white mr-2" />
                                    <Text className="font-lexend-bold text-xs text-white">Now</Text>
                                </View>
                                <Text className="font-lexend-bold text-xl text-white">
                                    {currentClass.subject_name}
                                </Text>
                                {currentClass.teacher_name && (
                                    <Text className="font-lexend-medium text-sm text-white/80 mt-0.5">
                                        {currentClass.teacher_name}
                                    </Text>
                                )}
                                <View className="flex-row mt-3 gap-4">
                                    <Text className="font-lexend text-sm text-white/70">
                                        {formatTimeDisplay(currentClass.start_time)} - {formatTimeDisplay(currentClass.end_time)}
                                    </Text>
                                </View>
                            </View>
                        ) : nextClass ? (
                            <View className="bg-white rounded-2xl p-5 border border-primary-200">
                                <View className="bg-primary-100 self-start rounded-full px-3 py-1 mb-3">
                                    <Text className="font-lexend-bold text-xs text-primary-700">Next Up</Text>
                                </View>
                                <Text className="font-lexend-bold text-xl text-dark-900">
                                    {nextClass.subject_name}
                                </Text>
                                {nextClass.teacher_name && (
                                    <Text className="font-lexend-medium text-sm text-dark-500 mt-0.5">
                                        {nextClass.teacher_name}
                                    </Text>
                                )}
                                <View className="flex-row mt-3 gap-4">
                                    <Text className="font-lexend text-sm text-dark-400">
                                        {formatTimeDisplay(nextClass.start_time)} - {formatTimeDisplay(nextClass.end_time)}
                                    </Text>
                                </View>
                            </View>
                        ) : null}
                    </View>
                )}

                {/* Quick Stats */}
                <View className="flex-row px-6 gap-3 mb-6">
                    <View className="flex-1 bg-white rounded-2xl p-4">
                        <Text className="font-lexend-medium text-[10px] text-dark-400 uppercase tracking-wider mb-1">
                            Today's Classes
                        </Text>
                        <Text className="font-lexend-bold text-2xl text-primary-600">
                            {todayPeriods.length}
                        </Text>
                    </View>
                    <View className="flex-1 bg-white rounded-2xl p-4">
                        <Text className="font-lexend-medium text-[10px] text-dark-400 uppercase tracking-wider mb-1">
                            Pending Tasks
                        </Text>
                        <Text className="font-lexend-bold text-2xl text-amber-600">
                            {pendingAssignments.length}
                        </Text>
                    </View>
                </View>

                {/* Announcements */}
                {announcements.length > 0 && (
                    <View className="px-6 mb-6">
                        <Text className="font-lexend-semibold text-lg text-dark-900 mb-3">
                            Announcements
                        </Text>
                        {announcements.slice(0, 3).map((item, i) => (
                            <AnnouncementItem key={item.id || i} announcement={item} />
                        ))}
                    </View>
                )}

                {/* Today's Schedule Preview */}
                {todayPeriods.length > 0 && (
                    <View className="px-6 mb-8">
                        <Text className="font-lexend-semibold text-lg text-dark-900 mb-3">
                            Today's Schedule
                        </Text>
                        {todayPeriods.map((p, i) => {
                            const start = parseTime(p.start_time);
                            const end = parseTime(p.end_time);
                            let status = "upcoming";
                            if (start !== null && end !== null) {
                                if (nowMinutes >= end) status = "completed";
                                else if (nowMinutes >= start) status = "ongoing";
                            }
                            return (
                                <View
                                    key={p.id || i}
                                    className={`bg-white rounded-xl p-3.5 mb-2 flex-row items-center ${status === "completed" ? "opacity-50" : ""}`}
                                >
                                    <View className={`w-1 h-10 rounded-full mr-3 ${
                                        status === "ongoing" ? "bg-primary-500" : status === "completed" ? "bg-green-400" : "bg-dark-200"
                                    }`} />
                                    <View className="flex-1">
                                        <Text className="font-lexend-semibold text-sm text-dark-900">
                                            {p.subject_name}
                                        </Text>
                                        {p.teacher_name && (
                                            <Text className="font-lexend text-xs text-dark-400">
                                                {p.teacher_name}
                                            </Text>
                                        )}
                                    </View>
                                    <Text className="font-lexend text-xs text-dark-400">
                                        {formatTimeDisplay(p.start_time)}
                                    </Text>
                                </View>
                            );
                        })}
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
