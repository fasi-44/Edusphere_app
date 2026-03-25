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

export default function StudentDetailScreen() {
  const router = useRouter();
  const { id, name } = useLocalSearchParams();
  const user = useAuthStore((s) => s.user);
  const skid = user?.skid;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [student, setStudent] = useState(null);

  const fetchStudent = useCallback(async () => {
    if (!skid || !id) return;
    try {
      const res = await userService.getStudentById(skid, id);
      setStudent(res?.student || res?.data?.student || res?.data || null);
    } catch (err) {
      console.error("Fetch student detail error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [skid, id]);

  useFocusEffect(
    useCallback(() => {
      fetchStudent();
    }, [fetchStudent])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchStudent();
  }, [fetchStudent]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-dark-50 items-center justify-center">
        <ActivityIndicator size="large" color="#6366f1" />
      </SafeAreaView>
    );
  }

  const displayName = student?.full_name ||
    (student ? `${student.first_name || ""} ${student.last_name || ""}`.trim() : "") ||
    name || "Student";
  const className = student?.class?.class_name;
  const sectionName = student?.section?.section_name;
  const profile = student?.profile;
  const rollNo = profile?.roll_no;
  const parent = student?.parent;

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
            Student Details
          </Text>
        </View>

        {/* Profile Card */}
        <View className="items-center px-6 pt-4 pb-6">
          <View className="w-20 h-20 rounded-full bg-green-100 items-center justify-center mb-4">
            <Text className="font-lexend-bold text-2xl text-green-600">
              {(student?.first_name?.[0] || displayName?.[0] || "S").toUpperCase()}
            </Text>
          </View>
          <Text className="font-lexend-bold text-xl text-dark-900">
            {displayName}
          </Text>
          {className && (
            <Text className="font-lexend text-sm text-dark-500 mt-1">
              {className}
              {sectionName ? ` - ${sectionName}` : ""}
            </Text>
          )}
          <View className="flex-row items-center gap-2 mt-2">
            {rollNo && (
              <View className="bg-green-100 px-3 py-1 rounded-full">
                <Text className="font-lexend-medium text-xs text-green-700">
                  Roll #{rollNo}
                </Text>
              </View>
            )}
            <View className={`px-3 py-1 rounded-full ${student?.has_login ? "bg-blue-100" : "bg-dark-100"}`}>
              <Text className={`font-lexend-medium text-xs ${student?.has_login ? "text-blue-700" : "text-dark-500"}`}>
                {student?.has_login ? "Login Enabled" : "No Login"}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Stats */}
        <View className="flex-row px-6 gap-3 mb-6">
          <View className="flex-1 bg-white rounded-2xl p-4 items-center shadow-sm">
            <Text className="font-lexend text-xs text-dark-500">Class</Text>
            <Text className="font-lexend-bold text-base text-dark-900 mt-1">
              {className || "-"}
            </Text>
          </View>
          <View className="flex-1 bg-white rounded-2xl p-4 items-center shadow-sm">
            <Text className="font-lexend text-xs text-dark-500">Section</Text>
            <Text className="font-lexend-bold text-base text-dark-900 mt-1">
              {sectionName || "-"}
            </Text>
          </View>
        </View>

        {/* Details */}
        <View className="px-6 pb-8">
          <View className="bg-white rounded-2xl p-5 shadow-sm">
            <Text className="font-lexend-semibold text-sm text-dark-400 uppercase tracking-wider mb-2">
              Personal Information
            </Text>
            <InfoRow label="Full Name" value={displayName} />
            <InfoRow label="Email" value={student?.email} />
            <InfoRow label="Phone" value={student?.phone} />
            <InfoRow label="Gender" value={student?.gender} />
            <InfoRow label="Date of Birth" value={formatDate(student?.date_of_birth)} />
            <InfoRow label="Blood Group" value={profile?.blood_group} />
            <InfoRow label="Address" value={student?.address || null} />
            <InfoRow label="Nationality" value={profile?.nationality} />
            <InfoRow label="Religion" value={profile?.religion} />
            <InfoRow label="Category" value={profile?.category} />
            <InfoRow label="Mother Tongue" value={profile?.mother_tongue} />
          </View>

          {/* Admission Info */}
          <View className="bg-white rounded-2xl p-5 shadow-sm mt-3">
            <Text className="font-lexend-semibold text-sm text-dark-400 uppercase tracking-wider mb-2">
              Admission Details
            </Text>
            <InfoRow label="Admission No" value={profile?.admission_number} />
            <InfoRow label="Admission Date" value={formatDate(profile?.admission_date)} />
            <InfoRow label="Aadhar No" value={profile?.aadhar_number} />
            <InfoRow label="Emergency Contact" value={profile?.emergency_contact} />
          </View>

          {/* Parent Info */}
          {parent && (
            <View className="bg-white rounded-2xl p-5 shadow-sm mt-3">
              <Text className="font-lexend-semibold text-sm text-dark-400 uppercase tracking-wider mb-2">
                Parent / Guardian
              </Text>
              <InfoRow label="Relation" value={parent.relation_type} />
              <InfoRow label="Father" value={parent.father_full_name} />
              <InfoRow label="Father Phone" value={parent.father_phone} />
              <InfoRow label="Father Occupation" value={parent.father_occupation} />
              <InfoRow label="Father Qualification" value={parent.father_qualification} />
              <InfoRow label="Mother" value={parent.mother_full_name} />
              <InfoRow label="Mother Phone" value={parent.mother_phone} />
              <InfoRow label="Mother Occupation" value={parent.mother_occupation} />
              <InfoRow label="Mother Qualification" value={parent.mother_qualification} />
              <InfoRow label="Email" value={parent.email} />
              <InfoRow label="Address" value={parent.address} />
              <InfoRow
                label="City / State"
                value={[parent.city, parent.state].filter(Boolean).join(", ") || null}
              />
              <InfoRow label="Postal Code" value={parent.postal_code} />
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
