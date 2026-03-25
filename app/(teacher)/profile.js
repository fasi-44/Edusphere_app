import { View, Text, ScrollView, TouchableOpacity, Alert, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore, useAppStore } from "../../store";
import { authService } from "../../services/authService";

const MenuItem = ({ title, subtitle, onPress }) => (
  <TouchableOpacity
    className="bg-white rounded-2xl p-4 mb-3 flex-row items-center shadow-sm"
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View className="flex-1">
      <Text className="font-lexend-medium text-sm text-dark-900">{title}</Text>
      {subtitle && (
        <Text className="font-lexend text-xs text-dark-500 mt-0.5">
          {subtitle}
        </Text>
      )}
    </View>
    <Text className="font-lexend text-dark-400 text-lg">&rsaquo;</Text>
  </TouchableOpacity>
);

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const resetApp = useAppStore((s) => s.reset);

  const handleLogout = () => {
    const doLogout = async () => {
      await authService.logout();
      logout();
      resetApp();
    };

    if (Platform.OS === "web") {
      if (confirm("Are you sure you want to sign out?")) doLogout();
    } else {
      Alert.alert("Logout", "Are you sure you want to sign out?", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign Out", style: "destructive", onPress: doLogout },
      ]);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-dark-50">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="items-center px-6 pt-6 pb-8">
          <View className="w-20 h-20 rounded-full bg-primary-100 items-center justify-center mb-4">
            <Text className="font-lexend-bold text-2xl text-primary-600">
              {user?.first_name?.charAt(0)?.toUpperCase() || "T"}
            </Text>
          </View>
          <Text className="font-lexend-bold text-xl text-dark-900">
            {user?.full_name || "Teacher"}
          </Text>
          <Text className="font-lexend text-sm text-dark-500 mt-1">
            {user?.email || ""}
          </Text>
          {user?.school_name && (
            <Text className="font-lexend text-xs text-dark-400 mt-0.5">
              {user.school_name}
            </Text>
          )}
          <View className="bg-primary-100 px-3 py-1 rounded-full mt-2">
            <Text className="font-lexend-medium text-xs text-primary-700">
              {user?.role_obj?.role_name || "Teacher"}
            </Text>
          </View>
        </View>

        <View className="px-6">
          <Text className="font-lexend-semibold text-sm text-dark-400 uppercase tracking-wider mb-3">
            Academic
          </Text>
          <MenuItem title="My Classes" subtitle="View assigned classes & sections" />
          <MenuItem title="Timetable" subtitle="View weekly schedule" />
          <MenuItem title="Attendance Records" subtitle="View attendance history" />
          <MenuItem title="Assignments" subtitle="Manage student assignments" />

          <Text className="font-lexend-semibold text-sm text-dark-400 uppercase tracking-wider mb-3 mt-6">
            Settings
          </Text>
          <MenuItem title="Notifications" subtitle="Manage push notifications" />
          <MenuItem title="About EduSphere" subtitle="Version 1.0.0" />

          <TouchableOpacity
            className="bg-red-50 rounded-2xl p-4 mb-8 mt-4 items-center"
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Text className="font-lexend-semibold text-sm text-red-600">
              Sign Out
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
