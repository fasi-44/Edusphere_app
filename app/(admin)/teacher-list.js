import { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { useAuthStore } from "../../store";
import { userService } from "../../services/admin";

function getInitials(firstName, lastName) {
  return (
    (firstName?.[0] || "").toUpperCase() + (lastName?.[0] || "").toUpperCase()
  );
}

export default function TeacherListScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const skid = user?.skid;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [teachers, setTeachers] = useState([]);
  const [search, setSearch] = useState("");

  const fetchTeachers = useCallback(async () => {
    if (!skid) return;
    try {
      const res = await userService.getTeachers(skid, { limit: 100 });
      const list = res?.data?.teachers || res?.data || [];
      setTeachers(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Fetch teachers error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [skid]);

  useFocusEffect(
    useCallback(() => {
      fetchTeachers();
    }, [fetchTeachers])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTeachers();
  }, [fetchTeachers]);

  const filtered = teachers.filter((t) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const name = `${t.first_name || ""} ${t.last_name || ""}`.toLowerCase();
    return (
      name.includes(q) ||
      (t.email || "").toLowerCase().includes(q) ||
      (t.phone || "").includes(q)
    );
  });

  const renderTeacher = ({ item }) => (
    <TouchableOpacity
      className="bg-white rounded-2xl p-4 mb-3 flex-row items-center shadow-sm"
      activeOpacity={0.7}
      onPress={() =>
        router.push({
          pathname: "/(admin)/teacher-detail",
          params: { id: item.id, name: `${item.first_name || ""} ${item.last_name || ""}` },
        })
      }
    >
      <View className="w-11 h-11 rounded-full bg-blue-100 items-center justify-center mr-3">
        <Text className="font-lexend-semibold text-sm text-blue-600">
          {getInitials(item.first_name, item.last_name)}
        </Text>
      </View>
      <View className="flex-1">
        <Text className="font-lexend-medium text-sm text-dark-900">
          {item.first_name} {item.last_name}
        </Text>
        {item.email && (
          <Text className="font-lexend text-xs text-dark-500 mt-0.5">
            {item.email}
          </Text>
        )}
        {item.phone && (
          <Text className="font-lexend text-xs text-dark-400 mt-0.5">
            {item.phone}
          </Text>
        )}
      </View>
      <Text className="font-lexend text-dark-300 text-xl">&rsaquo;</Text>
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
            Teachers
          </Text>
          <Text className="font-lexend text-xs text-dark-500">
            {filtered.length} teacher{filtered.length !== 1 ? "s" : ""}
          </Text>
        </View>
      </View>

      {/* Search */}
      <View className="px-6 pb-3">
        <TextInput
          className="bg-white rounded-xl px-4 py-3 font-lexend text-sm text-dark-900 shadow-sm"
          placeholder="Search teachers..."
          placeholderTextColor="#94a3b8"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderTeacher}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View className="items-center py-12">
            <Text className="font-lexend text-sm text-dark-400">
              {search ? "No teachers match your search" : "No teachers found"}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
