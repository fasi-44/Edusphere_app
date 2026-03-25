import { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { useAuthStore, useAppStore } from "../../store";
import { timetableService } from "../../services/admin";

function formatDateTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

export default function TimetableListScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const academicYear = useAppStore((s) => s.academicYear);
  const skid = user?.skid;
  const academicYearId = academicYear?.id;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timetables, setTimetables] = useState([]);

  const fetchTimetables = useCallback(async () => {
    if (!skid || !academicYearId) return;
    try {
      const res = await timetableService.listTimetables(skid, academicYearId);
      const list = res?.data?.timetables || res?.data || [];
      setTimetables(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Fetch timetables error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [skid, academicYearId]);

  useFocusEffect(
    useCallback(() => {
      fetchTimetables();
    }, [fetchTimetables])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTimetables();
  }, [fetchTimetables]);

  const handleDelete = (tt) => {
    const doDelete = async () => {
      try {
        await timetableService.deleteTimetable(skid, tt.id);
        fetchTimetables();
      } catch (err) {
        const msg = err?.response?.data?.message || err?.data?.message || "Delete failed";
        Alert.alert("Error", msg);
      }
    };

    if (Platform.OS === "web") {
      if (confirm("Delete this timetable?")) doDelete();
    } else {
      Alert.alert("Delete Timetable", "Are you sure you want to delete this timetable?", [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: doDelete },
      ]);
    }
  };

  const renderTimetable = ({ item }) => (
    <TouchableOpacity
      className="bg-white rounded-2xl p-4 mb-3 shadow-sm"
      activeOpacity={0.7}
      onPress={() =>
        router.push({
          pathname: "/(admin)/timetable-view",
          params: { id: item.id },
        })
      }
    >
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-1">
          <Text className="font-lexend-semibold text-base text-dark-900">
            {item.class_name || "Class"}{" "}
            {item.section_name ? `- ${item.section_name}` : ""}
          </Text>
          {item.semester && (
            <Text className="font-lexend text-xs text-dark-500 mt-0.5">
              Semester {item.semester}
            </Text>
          )}
        </View>
        <View className="flex-row items-center gap-2">
          <View
            className={`px-2.5 py-1 rounded-full ${
              item.is_draft ? "bg-amber-100" : "bg-green-100"
            }`}
          >
            <Text
              className={`font-lexend-medium text-[10px] ${
                item.is_draft ? "text-amber-700" : "text-green-700"
              }`}
            >
              {item.is_draft ? "Draft" : "Final"}
            </Text>
          </View>
          <TouchableOpacity
            className="w-8 h-8 rounded-full bg-red-50 items-center justify-center"
            onPress={() => handleDelete(item)}
          >
            <Text className="text-red-600 text-xs">&#10005;</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View className="flex-row items-center justify-between pt-2 border-t border-dark-100">
        {item.total_periods && (
          <Text className="font-lexend text-xs text-dark-500">
            {item.total_periods} periods
          </Text>
        )}
        <Text className="font-lexend text-xs text-dark-400">
          {formatDateTime(item.created_at)}
        </Text>
      </View>

      <Text className="font-lexend text-[10px] text-primary-500 mt-2">
        Tap to view timetable &rsaquo;
      </Text>
    </TouchableOpacity>
  );

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
            Timetables
          </Text>
          <Text className="font-lexend text-xs text-dark-500">
            {timetables.length} timetable{timetables.length !== 1 ? "s" : ""}
          </Text>
        </View>
      </View>

      {/* List */}
      <FlatList
        data={timetables}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderTimetable}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View className="items-center py-12">
            <Text className="font-lexend text-sm text-dark-400">
              No timetables created yet
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
