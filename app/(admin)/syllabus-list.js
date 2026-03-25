import { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { useAuthStore, useAppStore } from "../../store";
import { syllabusService } from "../../services/admin";

export default function SyllabusListScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const academicYear = useAppStore((s) => s.academicYear);
  const skid = user?.skid;
  const academicYearId = academicYear?.id;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syllabusList, setSyllabusList] = useState([]);

  const fetchSyllabus = useCallback(async () => {
    if (!skid || !academicYearId) return;
    try {
      const res = await syllabusService.getSyllabusList(skid, academicYearId);
      const list = res?.data?.syllabi || res?.data?.syllabus_list || res?.data || [];
      setSyllabusList(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Fetch syllabus error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [skid, academicYearId]);

  useFocusEffect(
    useCallback(() => {
      fetchSyllabus();
    }, [fetchSyllabus])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchSyllabus();
  }, [fetchSyllabus]);

  const getStatusInfo = (status) => {
    switch (status) {
      case "in_progress":
        return { bg: "bg-blue-100", text: "text-blue-700", label: "In Progress" };
      case "completed":
        return { bg: "bg-green-100", text: "text-green-700", label: "Completed" };
      case "planned":
      default:
        return { bg: "bg-slate-100", text: "text-slate-600", label: "Planned" };
    }
  };

  const renderItem = ({ item }) => {
    const status = getStatusInfo(item.status);

    return (
      <TouchableOpacity
        className="bg-white rounded-2xl p-4 mb-3 shadow-sm"
        activeOpacity={0.7}
        onPress={() =>
          router.push({
            pathname: "/(admin)/syllabus-detail",
            params: {
              syllabus_id: item.id,
              title: item.title || "",
              subject_name:
                item.subject_name || item.subject?.subject_name || "Subject",
            },
          })
        }
      >
        {/* Subject + Status */}
        <View className="flex-row items-start justify-between mb-1">
          <View className="flex-1 mr-2">
            <Text className="font-lexend-semibold text-base text-dark-900">
              {item.subject_name || item.subject?.subject_name || "Subject"}
            </Text>
          </View>
          <View className={`px-2.5 py-1 rounded-full ${status.bg}`}>
            <Text className={`font-lexend-bold text-[10px] ${status.text}`}>
              {status.label}
            </Text>
          </View>
        </View>

        {/* Title */}
        {item.title && (
          <Text className="font-lexend text-xs text-dark-500 mb-2">
            {item.title}
          </Text>
        )}

        {/* Description */}
        {item.description && (
          <Text
            className="font-lexend text-xs text-dark-400 mb-3"
            numberOfLines={2}
          >
            {item.description}
          </Text>
        )}

        {/* Details row */}
        <View className="flex-row flex-wrap gap-x-4 gap-y-1.5 mb-2">
          {item.estimated_duration_hours != null && (
            <View className="flex-row items-center gap-1">
              <Text className="text-dark-400 text-xs">&#x1F552;</Text>
              <Text className="font-lexend text-[10px] text-dark-500">
                {item.estimated_duration_hours} hrs
              </Text>
            </View>
          )}
          {item.academic_year_name && (
            <View className="flex-row items-center gap-1">
              <Text className="text-dark-400 text-xs">&#x1F4C5;</Text>
              <Text className="font-lexend text-[10px] text-dark-500">
                {item.academic_year_name}
              </Text>
            </View>
          )}
          {item.creator_name && (
            <View className="flex-row items-center gap-1">
              <Text className="text-dark-400 text-xs">&#x1F464;</Text>
              <Text className="font-lexend text-[10px] text-dark-500">
                {item.creator_name}
              </Text>
            </View>
          )}
        </View>

        {/* Tap hint */}
        <View className="flex-row items-center justify-end pt-2 border-t border-dark-100">
          <Text className="font-lexend text-[10px] text-primary-500">
            View Details &#x203A;
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-dark-50 items-center justify-center">
        <ActivityIndicator size="large" color="#6366f1" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-dark-50">
      {/* Header */}
      <View className="flex-row items-center px-6 pt-4 pb-3">
        <TouchableOpacity
          onPress={() => router.back()}
          className="mr-3 w-9 h-9 rounded-full bg-white items-center justify-center shadow-sm"
        >
          <Text className="font-lexend-semibold text-dark-600 text-lg">
            &lsaquo;
          </Text>
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="font-lexend-bold text-xl text-dark-900">
            Syllabus
          </Text>
          <Text className="font-lexend text-xs text-dark-500">
            {syllabusList.length} syllab{syllabusList.length !== 1 ? "i" : "us"}
          </Text>
        </View>
      </View>

      <FlatList
        data={syllabusList}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View className="items-center py-12">
            <Text className="font-lexend text-sm text-dark-400">
              No syllabus data available
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
