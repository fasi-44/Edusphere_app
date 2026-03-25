import { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useAuthStore } from "../../store";
import { userService } from "../../services/admin";

const InfoRow = ({ label, value }) => {
  if (!value) return null;
  return (
    <View className="flex-row items-start py-3 border-b border-dark-100">
      <Text className="font-lexend text-xs text-dark-500 w-28">{label}</Text>
      <Text className="font-lexend-medium text-sm text-dark-900 flex-1">
        {value}
      </Text>
    </View>
  );
};

function formatDate(dateStr) {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
}

export default function TeacherDetailScreen() {
  const router = useRouter();
  const { id, name } = useLocalSearchParams();
  const user = useAuthStore((s) => s.user);
  const skid = user?.skid;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [teacher, setTeacher] = useState(null);

  const fetchTeacher = useCallback(async () => {
    if (!skid || !id) return;
    try {
      const res = await userService.getTeacherById(skid, id);
      setTeacher(res?.teacher_data || res?.data?.teacher_data || res?.data || null);
    } catch (err) {
      console.error("Fetch teacher detail error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [skid, id]);

  useFocusEffect(
    useCallback(() => {
      fetchTeacher();
    }, [fetchTeacher])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTeacher();
  }, [fetchTeacher]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-dark-50 items-center justify-center">
        <ActivityIndicator size="large" color="#6366f1" />
      </SafeAreaView>
    );
  }

  const displayName = teacher?.full_name ||
    (teacher ? `${teacher.first_name || ""} ${teacher.last_name || ""}`.trim() : "") ||
    name || "Teacher";
  const profile = teacher?.profile;

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
        <View className="flex-row items-center px-6 pt-4 pb-3">
          <TouchableOpacity
            onPress={() => router.back()}
            className="mr-3 w-9 h-9 rounded-full bg-white items-center justify-center shadow-sm"
          >
            <Text className="font-lexend-semibold text-dark-600 text-lg">
              &lsaquo;
            </Text>
          </TouchableOpacity>
          <Text className="font-lexend-bold text-xl text-dark-900 flex-1">
            Teacher Details
          </Text>
        </View>

        {/* Profile Card */}
        <View className="items-center px-6 pt-4 pb-6">
          <View className="w-20 h-20 rounded-full bg-blue-100 items-center justify-center mb-4">
            <Text className="font-lexend-bold text-2xl text-blue-600">
              {(teacher?.first_name?.[0] || displayName?.[0] || "T").toUpperCase()}
            </Text>
          </View>
          <Text className="font-lexend-bold text-xl text-dark-900">
            {displayName}
          </Text>
          {teacher?.email && (
            <Text className="font-lexend text-sm text-dark-500 mt-1">
              {teacher.email}
            </Text>
          )}
          <View className="flex-row items-center gap-2 mt-2">
            {profile?.designation && (
              <View className="bg-blue-100 px-3 py-1 rounded-full">
                <Text className="font-lexend-medium text-xs text-blue-700">
                  {profile.designation}
                </Text>
              </View>
            )}
            {profile?.employee_id && (
              <View className="bg-primary-100 px-3 py-1 rounded-full">
                <Text className="font-lexend-medium text-xs text-primary-700">
                  ID: {profile.employee_id}
                </Text>
              </View>
            )}
            <View className={`px-3 py-1 rounded-full ${teacher?.has_login ? "bg-green-100" : "bg-dark-100"}`}>
              <Text className={`font-lexend-medium text-xs ${teacher?.has_login ? "text-green-700" : "text-dark-500"}`}>
                {teacher?.has_login ? "Login Enabled" : "No Login"}
              </Text>
            </View>
          </View>
        </View>

        {/* Contact Actions */}
        {(teacher?.phone || teacher?.email) && (
          <View className="flex-row px-6 gap-3 mb-6">
            {teacher?.phone && (
              <TouchableOpacity
                className="flex-1 bg-green-50 rounded-xl py-3 items-center"
                onPress={() => Linking.openURL(`tel:${teacher.phone}`)}
              >
                <Text className="font-lexend-medium text-sm text-green-700">
                  Call
                </Text>
              </TouchableOpacity>
            )}
            {teacher?.email && (
              <TouchableOpacity
                className="flex-1 bg-blue-50 rounded-xl py-3 items-center"
                onPress={() => Linking.openURL(`mailto:${teacher.email}`)}
              >
                <Text className="font-lexend-medium text-sm text-blue-700">
                  Email
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Details */}
        <View className="px-6 pb-8">
          <View className="bg-white rounded-2xl p-5 shadow-sm">
            <Text className="font-lexend-semibold text-sm text-dark-400 uppercase tracking-wider mb-2">
              Personal Information
            </Text>
            <InfoRow label="Full Name" value={displayName} />
            <InfoRow label="Email" value={teacher?.email} />
            <InfoRow label="Phone" value={teacher?.phone} />
            <InfoRow label="Gender" value={teacher?.gender} />
            <InfoRow label="Date of Birth" value={formatDate(teacher?.date_of_birth)} />
            <InfoRow label="Address" value={teacher?.address || null} />
          </View>

          {/* Professional Info */}
          <View className="bg-white rounded-2xl p-5 shadow-sm mt-3">
            <Text className="font-lexend-semibold text-sm text-dark-400 uppercase tracking-wider mb-2">
              Professional Details
            </Text>
            <InfoRow label="Employee ID" value={profile?.employee_id} />
            <InfoRow label="Designation" value={profile?.designation} />
            <InfoRow label="Qualifications" value={profile?.qualifications} />
            <InfoRow label="Date of Joining" value={formatDate(profile?.date_of_joining)} />
            <InfoRow
              label="Salary"
              value={profile?.salary ? `\u20B9${parseFloat(profile.salary).toLocaleString("en-IN")}` : null}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
