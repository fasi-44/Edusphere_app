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

export default function ParentListScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const skid = user?.skid;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [parents, setParents] = useState([]);
  const [search, setSearch] = useState("");

  const fetchParents = useCallback(async () => {
    if (!skid) return;
    try {
      const res = await userService.getParents(skid, { limit: 100 });
      const list = res?.data?.parents || res?.data || [];
      setParents(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Fetch parents error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [skid]);

  useFocusEffect(
    useCallback(() => {
      fetchParents();
    }, [fetchParents])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchParents();
  }, [fetchParents]);

  const filtered = parents.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const name = (p.full_name || `${p.first_name || ""} ${p.last_name || ""}`).toLowerCase();
    return (
      name.includes(q) ||
      (p.email || "").toLowerCase().includes(q) ||
      (p.phone || "").includes(q) ||
      (p.profile?.father_full_name || "").toLowerCase().includes(q) ||
      (p.profile?.mother_full_name || "").toLowerCase().includes(q) ||
      (p.profile?.father_phone || "").includes(q) ||
      (p.profile?.mother_phone || "").includes(q)
    );
  });

  const renderParent = ({ item }) => {
    const displayName =
      item.full_name ||
      `${item.first_name || ""} ${item.last_name || ""}`.trim();
    const profile = item.profile;

    return (
    <TouchableOpacity
      className="bg-white rounded-2xl p-4 mb-3 flex-row items-center shadow-sm"
      activeOpacity={0.7}
      onPress={() =>
        router.push({
          pathname: "/(admin)/parent-detail",
          params: { data: JSON.stringify(item) },
        })
      }
    >
      <View className="w-11 h-11 rounded-full bg-purple-100 items-center justify-center mr-3">
        <Text className="font-lexend-semibold text-sm text-purple-600">
          {getInitials(item.first_name, item.last_name)}
        </Text>
      </View>
      <View className="flex-1">
        <Text className="font-lexend-medium text-sm text-dark-900">
          {displayName}
        </Text>
        {item.email ? (
          <Text className="font-lexend text-xs text-dark-500 mt-0.5">
            {item.email}
          </Text>
        ) : null}
        {(profile?.father_phone || item.phone) && (
          <Text className="font-lexend text-xs text-dark-400 mt-0.5">
            {profile?.father_phone || item.phone}
          </Text>
        )}
        {profile?.relation_type && (
          <Text className="font-lexend text-xs text-primary-600 mt-0.5">
            {profile.relation_type}
          </Text>
        )}
      </View>
      <Text className="font-lexend text-dark-300 text-xl">&rsaquo;</Text>
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
            Parents
          </Text>
          <Text className="font-lexend text-xs text-dark-500">
            {filtered.length} parent{filtered.length !== 1 ? "s" : ""}
          </Text>
        </View>
      </View>

      {/* Search */}
      <View className="px-6 pb-3">
        <TextInput
          className="bg-white rounded-xl px-4 py-3 font-lexend text-sm text-dark-900 shadow-sm"
          placeholder="Search parents..."
          placeholderTextColor="#94a3b8"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderParent}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View className="items-center py-12">
            <Text className="font-lexend text-sm text-dark-400">
              {search ? "No parents match your search" : "No parents found"}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
