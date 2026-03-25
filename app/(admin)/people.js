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
import { dashboardService } from "../../services/admin";

const PeopleCard = ({ title, count, subtitle, color, onPress }) => (
  <TouchableOpacity
    className="bg-white rounded-2xl p-5 mb-3 flex-row items-center shadow-sm"
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View
      className={`w-12 h-12 rounded-xl ${color} items-center justify-center mr-4`}
    >
      <Text className="font-lexend-bold text-lg text-white">
        {title.charAt(0)}
      </Text>
    </View>
    <View className="flex-1">
      <Text className="font-lexend-semibold text-base text-dark-900">
        {title}
      </Text>
      <Text className="font-lexend text-xs text-dark-500 mt-0.5">
        {subtitle}
      </Text>
    </View>
    <View className="items-end">
      <Text className="font-lexend-bold text-2xl text-dark-900">{count}</Text>
      <Text className="font-lexend text-[10px] text-dark-400">Total</Text>
    </View>
    <Text className="font-lexend text-dark-300 text-2xl ml-3">&rsaquo;</Text>
  </TouchableOpacity>
);

export default function PeopleHub() {
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
  });

  const skid = user?.skid;
  const academicYearId = academicYear?.id;

  const fetchStats = useCallback(async () => {
    if (!skid || !academicYearId) return;
    try {
      const res = await dashboardService.getStats(skid, academicYearId);
      setStats(res?.data?.stats || res?.data || {});
    } catch (err) {
      console.error("People stats error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [skid, academicYearId]);

  useFocusEffect(
    useCallback(() => {
      fetchStats();
    }, [fetchStats])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchStats();
  }, [fetchStats]);

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
        <View className="px-6 pt-4 pb-2">
          <Text className="font-lexend-bold text-2xl text-dark-900">
            People
          </Text>
          <Text className="font-lexend text-sm text-dark-500 mt-1">
            Manage teachers, students & parents
          </Text>
        </View>

        {/* Overall Count */}
        <View className="px-6 pt-4 pb-6">
          <View className="bg-primary-600 rounded-2xl p-5">
            <Text className="font-lexend text-sm text-white/70">
              Total Users
            </Text>
            <Text className="font-lexend-bold text-3xl text-white mt-1">
              {stats.overall_users_count || 0}
            </Text>
          </View>
        </View>

        {/* People Cards */}
        <View className="px-6 pb-8">
          <PeopleCard
            title="Teachers"
            count={stats.teachers_count || 0}
            subtitle="View & manage all teachers"
            color="bg-blue-500"
            onPress={() => router.push("/(admin)/teacher-list")}
          />
          <PeopleCard
            title="Students"
            count={stats.students_count || 0}
            subtitle="View & manage all students"
            color="bg-green-500"
            onPress={() => router.push("/(admin)/student-list")}
          />
          <PeopleCard
            title="Parents"
            count={stats.parents_count || 0}
            subtitle="View & manage all parents"
            color="bg-purple-500"
            onPress={() => router.push("/(admin)/parent-list")}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
