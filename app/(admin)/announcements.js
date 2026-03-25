import { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { useAuthStore, useAppStore } from "../../store";
import { announcementService } from "../../services/admin";
import AnnouncementItem from "../../components/AnnouncementItem";
import { ANNOUNCEMENT_TYPE_CONFIG } from "../../lib/constants";

const FILTER_TYPES = [
  { key: null, label: "All" },
  ...Object.entries(ANNOUNCEMENT_TYPE_CONFIG).map(([key, config]) => ({
    key,
    label: config.label,
  })),
];

export default function AnnouncementsScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const academicYear = useAppStore((s) => s.academicYear);

  const skid = user?.skid;
  const academicYearId = academicYear?.id;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [selectedType, setSelectedType] = useState(null);

  const fetchAnnouncements = useCallback(async () => {
    if (!skid || !academicYearId) return;
    try {
      const res = await announcementService.getAnnouncements(skid, {
        academicYearId,
        userRole: user?.role,
        schoolUserId: user?.school_user_id,
        announcementType: selectedType,
      });
      const list = res?.data?.announcements || res?.data || [];
      setAnnouncements(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Fetch announcements error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [skid, academicYearId, user?.role, user?.school_user_id, selectedType]);

  useFocusEffect(
    useCallback(() => {
      fetchAnnouncements();
    }, [fetchAnnouncements])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAnnouncements();
  }, [fetchAnnouncements]);

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
      <View className="flex-row items-center justify-between px-6 pt-4 pb-3">
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
            Announcements
          </Text>
          <Text className="font-lexend text-xs text-dark-500">
            {announcements.length} announcement
            {announcements.length !== 1 ? "s" : ""}
          </Text>
        </View>
        <TouchableOpacity
          className="bg-primary-600 px-4 py-2 rounded-xl"
          onPress={() => router.push("/(admin)/announcement-create")}
        >
          <Text className="font-lexend-medium text-xs text-white">Create</Text>
        </TouchableOpacity>
      </View>

      {/* Type Filter */}
      <View className="pb-3">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 24, gap: 8 }}
        >
          {FILTER_TYPES.map((type) => (
            <TouchableOpacity
              key={String(type.key)}
              className={`px-4 py-2 rounded-full ${
                selectedType === type.key
                  ? "bg-primary-600"
                  : "bg-white border border-dark-200"
              }`}
              onPress={() => {
                setSelectedType(type.key);
                setLoading(true);
              }}
            >
              <Text
                className={`font-lexend-medium text-xs ${
                  selectedType === type.key ? "text-white" : "text-dark-700"
                }`}
              >
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* List */}
      <FlatList
        data={announcements}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <AnnouncementItem announcement={item} />}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View className="items-center py-12">
            <Text className="font-lexend text-sm text-dark-400">
              No announcements found
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
