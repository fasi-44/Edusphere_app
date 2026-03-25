import { useCallback, useState } from "react";
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
import { dashboardService, announcementService } from "../../services/admin";
import StatCard from "../../components/StatCard";
import AnnouncementItem from "../../components/AnnouncementItem";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

const QuickAction = ({ title, subtitle, color, onPress }) => (
  <TouchableOpacity
    className={`${color} rounded-2xl p-4 flex-1 min-h-[80px] justify-between`}
    activeOpacity={0.8}
    onPress={onPress}
  >
    <Text className="font-lexend-semibold text-white text-sm">{title}</Text>
    <Text className="font-lexend text-white/70 text-xs mt-1">{subtitle}</Text>
  </TouchableOpacity>
);

export default function AdminDashboard() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const academicYear = useAppStore((s) => s.academicYear);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    students_count: 0,
    teachers_count: 0,
    parents_count: 0,
    overall_users_count: 0,
    today_attendance_present: 0,
    today_attendance_total_students: 0,
  });
  const [announcements, setAnnouncements] = useState([]);

  const skid = user?.skid;
  const academicYearId = academicYear?.id;

  const fetchDashboardData = useCallback(async () => {
    if (!skid || !academicYearId) return;

    try {
      const [statsRes, announcementRes] = await Promise.allSettled([
        dashboardService.getStats(skid, academicYearId),
        announcementService.getAnnouncements(skid, {
          academicYearId,
          userRole: user?.role,
          schoolUserId: user?.school_user_id,
          limit: 5,
        }),
      ]);

      if (statsRes.status === "fulfilled") {
        const res = statsRes.value;
        setStats(res?.data?.stats || res?.data || {});
      }
      if (announcementRes.status === "fulfilled") {
        const res = announcementRes.value;
        const list = res?.data?.announcements || res?.data || [];
        setAnnouncements(Array.isArray(list) ? list : []);
      }
    } catch (err) {
      console.error("Admin dashboard fetch error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [skid, academicYearId, user?.role, user?.school_user_id]);

  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, [fetchDashboardData])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboardData();
  }, [fetchDashboardData]);

  const attendancePercent =
    stats.today_attendance_total_students > 0
      ? Math.round(
          (stats.today_attendance_present /
            stats.today_attendance_total_students) *
            100
        )
      : 0;

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
                {user?.full_name || "Admin"}
              </Text>
            </View>
          </View>
          {academicYear && (
            <View className="bg-primary-100 px-3 py-1.5 rounded-full">
              <Text className="font-lexend-medium text-[10px] text-primary-700">
                {academicYear.year_name || academicYear.name}
              </Text>
            </View>
          )}
        </View>

        {/* Greeting */}
        <View className="px-6 pt-4 pb-5">
          <Text className="font-lexend-bold text-2xl text-dark-900">
            {getGreeting()} 👋
          </Text>
          <Text className="font-lexend text-sm text-dark-500 mt-1">
            Here's your school overview
          </Text>
        </View>

        {/* Stats Cards */}
        <View className="px-6 mb-2">
          <View className="flex-row gap-3 mb-3">
            <StatCard
              title="Total Students"
              value={stats.students_count || 0}
              variant="blue"
            />
            <StatCard
              title="Total Teachers"
              value={stats.teachers_count || 0}
              variant="orange"
            />
          </View>
          <View className="flex-row gap-3 mb-6">
            <StatCard
              title="Today's Attendance"
              value={`${stats.today_attendance_present || 0}/${stats.today_attendance_total_students || 0}`}
              subtitle={`${attendancePercent}%`}
              variant="green"
            />
            <StatCard
              title="Total Parents"
              value={stats.parents_count || 0}
              variant="purple"
            />
          </View>
        </View>

        {/* Quick Actions */}
        <View className="px-6 mb-6">
          <Text className="font-lexend-semibold text-lg text-dark-900 mb-3">
            Quick Actions
          </Text>
          <View className="flex-row gap-3 mb-3">
            <QuickAction
              title="People"
              subtitle="Manage users"
              color="bg-primary-600"
              onPress={() => router.push("/(admin)/people")}
            />
            <QuickAction
              title="Classes"
              subtitle="View classes"
              color="bg-secondary-600"
              onPress={() => router.push("/(admin)/academics")}
            />
          </View>
          <View className="flex-row gap-3">
            <QuickAction
              title="Announcements"
              subtitle="View & create"
              color="bg-amber-500"
              onPress={() => router.push("/(admin)/announcements")}
            />
            <QuickAction
              title="Finance"
              subtitle="Fees & expenses"
              color="bg-rose-500"
              onPress={() => router.push("/(admin)/finance")}
            />
          </View>
        </View>

        {/* Latest Announcements */}
        <View className="px-6 mb-8">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="font-lexend-semibold text-lg text-dark-900">
              Latest Announcements
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/(admin)/announcements")}
            >
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
            announcements
              .slice(0, 3)
              .map((item, i) => (
                <AnnouncementItem key={item.id || i} announcement={item} />
              ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
