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
import { useRouter, useFocusEffect } from "expo-router";
import { useAuthStore, useAppStore } from "../../store";
import { dashboardService } from "../../services/teacher";
import { announcementService } from "../../services/teacher";
import StatCard from "../../components/StatCard";
import AnnouncementItem from "../../components/AnnouncementItem";
import AttendanceWatchItem from "../../components/AttendanceWatchItem";

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

export default function TeacherDashboard() {
    const router = useRouter();
    const user = useAuthStore((s) => s.user);
    const academicYear = useAppStore((s) => s.academicYear);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [studentCount, setStudentCount] = useState(0);
    const [absenteesData, setAbsenteesData] = useState({ count: 0, preview: [] });
    const [announcements, setAnnouncements] = useState([]);
    const [attendanceTab, setAttendanceTab] = useState("today");

    const skid = user?.skid;
    const teacherId = user?.school_user_id;
    const academicYearId = academicYear?.id;

    const fetchDashboardData = useCallback(async () => {
        if (!skid || !teacherId || !academicYearId) return;

        try {
            const today = formatDate(new Date());
            const yesterday = formatDate(
                new Date(Date.now() - 86400000)
            );

            const [studentRes, absenteesRes, announcementRes] = await Promise.allSettled([
                dashboardService.getStudentCount(skid, teacherId),
                dashboardService.getAbsenteesCount(skid, academicYearId, today),
                announcementService.getAnnouncements(skid, {
                    academicYearId,
                    userRole: user?.role,
                    schoolUserId: user?.school_user_id,
                    limit: 5,
                }),
            ]);

            // API response shape: { code, data: {...}, message, status }
            // axios interceptor already unwraps response.data, so .value = { code, data, ... }
            if (studentRes.status === "fulfilled") {
                const res = studentRes.value;
                setStudentCount(res?.data?.count ?? 0);
            }
            if (absenteesRes.status === "fulfilled") {
                const res = absenteesRes.value;
                setAbsenteesData({
                    count: res?.data?.count ?? 0,
                    preview: res?.data?.preview || [],
                });
            }
            if (announcementRes.status === "fulfilled") {
                const res = announcementRes.value;
                const list = res?.data?.announcements || res?.data || [];
                setAnnouncements(Array.isArray(list) ? list : []);
            }
        } catch (err) {
            console.error("Dashboard fetch error:", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [skid, teacherId, academicYearId, user?.role, user?.school_user_id]);

    useFocusEffect(
        useCallback(() => {
            fetchDashboardData();
        }, [fetchDashboardData])
    );

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchDashboardData();
    }, [fetchDashboardData]);

    // Fetch yesterday's absentees when tab switches
    const [yesterdayData, setYesterdayData] = useState(null);
    useEffect(() => {
        if (attendanceTab === "yesterday" && !yesterdayData && skid && academicYearId) {
            const yesterday = formatDate(new Date(Date.now() - 86400000));
            dashboardService
                .getAbsenteesCount(skid, academicYearId, yesterday)
                .then((res) => {
                    setYesterdayData({
                        count: res?.data?.count ?? 0,
                        preview: res?.data?.preview || [],
                    });
                })
                .catch(() => setYesterdayData({ count: 0, preview: [] }));
        }
    }, [attendanceTab, yesterdayData, skid, academicYearId]);

    const attendanceList =
        attendanceTab === "today"
            ? absenteesData.preview
            : yesterdayData?.preview || [];

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
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
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
                            <Text className="font-lexend text-xs text-dark-500">
                                Welcome back
                            </Text>
                            <Text className="font-lexend-semibold text-base text-dark-900">
                                {user?.full_name || "Teacher"}
                            </Text>
                        </View>
                    </View>
                    <TouchableOpacity className="w-10 h-10 rounded-full bg-white items-center justify-center shadow-sm">
                        <Text className="text-dark-500 text-lg">&#9881;</Text>
                    </TouchableOpacity>
                </View>

                {/* Greeting */}
                <View className="px-6 pt-4 pb-5">
                    <Text className="font-lexend-bold text-2xl text-dark-900">
                        {getGreeting()} 👋
                    </Text>
                    <Text className="font-lexend text-sm text-dark-500 mt-1">
                        Here is your daily summary.
                    </Text>
                </View>

                {/* Stat Cards */}
                <View className="flex-row px-6 gap-3 mb-6">
                    <StatCard
                        title="Students assigned to you"
                        value={studentCount}
                        variant="blue"
                    />
                    <StatCard
                        title="Today's Absentees"
                        value={absenteesData.count}
                        variant="orange"
                    />
                </View>

                {/* Announcements */}
                <View className="px-6 mb-6">
                    <View className="flex-row items-center justify-between mb-3">
                        <Text className="font-lexend-semibold text-lg text-dark-900">
                            Latest Announcements
                        </Text>
                        <TouchableOpacity onPress={() => router.push("/(teacher)/announcements")}>
                            <Text className="font-lexend-medium text-sm text-primary-600">
                                View all
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {announcements.length === 0 ? (
                        <View className="bg-white rounded-2xl p-6 items-center">
                            <Text className="font-lexend text-sm text-dark-400">
                                No announcements at this time
                            </Text>
                        </View>
                    ) : (
                        announcements.slice(0, 3).map((item, i) => (
                            <AnnouncementItem key={item.id || i} announcement={item} />
                        ))
                    )}
                </View>

                {/* Attendance Watch */}
                <View className="px-6 mb-8">
                    <View className="flex-row items-center justify-between mb-3">
                        <Text className="font-lexend-semibold text-lg text-dark-900">
                            Attendance Watch
                        </Text>
                        <View className="flex-row bg-dark-100 rounded-full p-0.5">
                            <TouchableOpacity
                                className={`px-4 py-1.5 rounded-full ${attendanceTab === "today" ? "bg-white shadow-sm" : ""
                                    }`}
                                onPress={() => setAttendanceTab("today")}
                            >
                                <Text
                                    className={`font-lexend-medium text-xs ${attendanceTab === "today"
                                        ? "text-dark-900"
                                        : "text-dark-500"
                                        }`}
                                >
                                    Today
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                className={`px-4 py-1.5 rounded-full ${attendanceTab === "yesterday" ? "bg-white shadow-sm" : ""
                                    }`}
                                onPress={() => setAttendanceTab("yesterday")}
                            >
                                <Text
                                    className={`font-lexend-medium text-xs ${attendanceTab === "yesterday"
                                        ? "text-dark-900"
                                        : "text-dark-500"
                                        }`}
                                >
                                    Yesterday
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {attendanceList.length === 0 ? (
                        <View className="bg-white rounded-2xl p-6 items-center">
                            <Text className="font-lexend text-sm text-dark-400">
                                No absentees recorded
                            </Text>
                        </View>
                    ) : (
                        attendanceList.map((student, i) => (
                            <AttendanceWatchItem
                                key={student.id || student.student_id || i}
                                student={student}
                            />
                        ))
                    )}

                    <TouchableOpacity className="mt-3 items-center">
                        <Text className="font-lexend-medium text-sm text-primary-600">
                            View full attendance log &rarr;
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
