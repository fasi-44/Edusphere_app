import { useEffect, useState, useCallback } from "react";
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
import { useRouter } from "expo-router";
import { useAuthStore, useAppStore } from "../../store";
import { announcementService } from "../../services/teacher";
import { ANNOUNCEMENT_TYPE_CONFIG, PRIORITY_CONFIG } from "../../lib/constants";
import AnnouncementItem from "../../components/AnnouncementItem";

const TYPE_FILTERS = [
    { key: null, label: "All" },
    { key: "General", label: "General" },
    { key: "Academic", label: "Academic" },
    { key: "Examination", label: "Examination" },
    { key: "Event", label: "Event" },
    { key: "Holiday", label: "Holiday" },
    { key: "Urgent", label: "Urgent" },
    { key: "Fee Related", label: "Fee Related" },
    { key: "SPORTS", label: "Sports" },
];

const PRIORITY_FILTERS = [
    { key: null, label: "All" },
    { key: "URGENT", label: "Urgent" },
    { key: "HIGH", label: "High" },
    { key: "NORMAL", label: "Normal" },
    { key: "LOW", label: "Low" },
];

export default function AnnouncementsList() {
    const router = useRouter();
    const user = useAuthStore((s) => s.user);
    const academicYear = useAppStore((s) => s.academicYear);

    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedType, setSelectedType] = useState(null);
    const [selectedPriority, setSelectedPriority] = useState(null);

    const skid = user?.skid;
    const academicYearId = academicYear?.id;

    const fetchAnnouncements = useCallback(async () => {
        if (!skid || !academicYearId) return;

        try {
            const res = await announcementService.getAnnouncements(skid, {
                academicYearId,
                userRole: user?.role,
                schoolUserId: user?.school_user_id,
                announcementType: selectedType,
                priority: selectedPriority,
            });
            const list = res?.data?.announcements || res?.data || [];
            setAnnouncements(Array.isArray(list) ? list : []);
        } catch (err) {
            console.error("Announcements fetch error:", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [skid, academicYearId, user?.role, user?.school_user_id, selectedType, selectedPriority]);

    useEffect(() => {
        setLoading(true);
        fetchAnnouncements();
    }, [fetchAnnouncements]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchAnnouncements();
    }, [fetchAnnouncements]);

    const renderFilterChip = (item, isSelected, onSelect) => (
        <TouchableOpacity
            key={item.label}
            className={`px-4 py-2 rounded-full mr-2 ${
                isSelected ? "bg-primary-600" : "bg-white"
            }`}
            onPress={() => onSelect(isSelected ? null : item.key)}
            activeOpacity={0.7}
        >
            <Text
                className={`font-lexend-medium text-xs ${
                    isSelected ? "text-white" : "text-dark-600"
                }`}
            >
                {item.label}
            </Text>
        </TouchableOpacity>
    );

    const renderHeader = () => (
        <View className="mb-2">
            {/* Type Filters */}
            <View className="mb-3">
                <Text className="font-lexend-medium text-xs text-dark-400 mb-2 px-1">
                    Type
                </Text>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                >
                    {TYPE_FILTERS.map((item) =>
                        renderFilterChip(
                            item,
                            selectedType === item.key,
                            setSelectedType
                        )
                    )}
                </ScrollView>
            </View>

            {/* Priority Filters */}
            <View className="mb-3">
                <Text className="font-lexend-medium text-xs text-dark-400 mb-2 px-1">
                    Priority
                </Text>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                >
                    {PRIORITY_FILTERS.map((item) =>
                        renderFilterChip(
                            item,
                            selectedPriority === item.key,
                            setSelectedPriority
                        )
                    )}
                </ScrollView>
            </View>
        </View>
    );

    return (
        <SafeAreaView className="flex-1 bg-dark-50">
            {/* Header */}
            <View className="flex-row items-center px-6 pt-4 pb-3">
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="w-10 h-10 rounded-full bg-white items-center justify-center mr-3"
                >
                    <Text className="text-dark-700 text-lg">&larr;</Text>
                </TouchableOpacity>
                <Text className="font-lexend-semibold text-xl text-dark-900">
                    Announcements
                </Text>
            </View>

            <View className="flex-1 px-6">
                <FlatList
                    data={announcements}
                    keyExtractor={(item, i) => item.id?.toString() || i.toString()}
                    renderItem={({ item }) => (
                        <AnnouncementItem announcement={item} />
                    )}
                    ListHeaderComponent={renderHeader}
                    ListEmptyComponent={
                        loading ? (
                            <View className="items-center py-12">
                                <ActivityIndicator size="large" color="#6366f1" />
                            </View>
                        ) : (
                            <View className="bg-white rounded-2xl p-8 items-center">
                                <Text className="font-lexend text-sm text-dark-400">
                                    No announcements found
                                </Text>
                            </View>
                        )
                    }
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 24 }}
                />
            </View>
        </SafeAreaView>
    );
}
