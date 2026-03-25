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
import { progressService } from "../../services/admin";

export default function ProgressCardScreen() {
  const router = useRouter();
  const { studentId, examId, studentName } = useLocalSearchParams();
  const user = useAuthStore((s) => s.user);
  const skid = user?.skid;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [progressData, setProgressData] = useState(null);

  const fetchProgress = useCallback(async () => {
    if (!skid || !studentId || !examId) return;
    try {
      const res = await progressService.getStudentProgress(skid, studentId, examId);
      setProgressData(res?.data || null);
    } catch (err) {
      console.error("Fetch student progress error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [skid, studentId, examId]);

  useFocusEffect(
    useCallback(() => {
      fetchProgress();
    }, [fetchProgress])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProgress();
  }, [fetchProgress]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-dark-50 items-center justify-center">
        <ActivityIndicator size="large" color="#6366f1" />
      </SafeAreaView>
    );
  }

  const subjects = progressData?.subject_details || [];

  // Calculate totals
  let totalObtained = 0;
  let totalMax = 0;
  let passedAll = true;
  subjects.forEach((sub) => {
    if (!sub.is_absent) {
      totalObtained += sub.total_marks || 0;
    }
    totalMax += sub.max_marks || 0;
    if (!sub.pass) passedAll = false;
  });
  const overallPercentage = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(1) : 0;

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
          <View className="flex-1">
            <Text className="font-lexend-bold text-xl text-dark-900">
              Progress Card
            </Text>
            {studentName && (
              <Text className="font-lexend text-xs text-dark-500">
                {studentName}
              </Text>
            )}
          </View>
        </View>

        {/* Overall Summary */}
        <View className="px-6 mb-4">
          <View className={`${passedAll ? "bg-green-500" : "bg-red-500"} rounded-2xl p-5`}>
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="font-lexend text-sm text-white/70">
                  Overall Result
                </Text>
                <Text className="font-lexend-bold text-3xl text-white mt-1">
                  {overallPercentage}%
                </Text>
              </View>
              <View className="bg-white/20 px-4 py-2 rounded-xl">
                <Text className="font-lexend-bold text-lg text-white">
                  {passedAll ? "PASS" : "FAIL"}
                </Text>
              </View>
            </View>
            <View className="flex-row gap-4 mt-3 pt-3 border-t border-white/20">
              <View>
                <Text className="font-lexend text-[10px] text-white/70">Obtained</Text>
                <Text className="font-lexend-bold text-base text-white">
                  {totalObtained}
                </Text>
              </View>
              <View>
                <Text className="font-lexend text-[10px] text-white/70">Total</Text>
                <Text className="font-lexend-bold text-base text-white">
                  {totalMax}
                </Text>
              </View>
              <View>
                <Text className="font-lexend text-[10px] text-white/70">Subjects</Text>
                <Text className="font-lexend-bold text-base text-white">
                  {subjects.length}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Subject Details */}
        <View className="px-6 pb-8">
          <Text className="font-lexend-semibold text-sm text-dark-400 uppercase tracking-wider mb-3">
            Subject-wise Marks
          </Text>

          {subjects.length === 0 ? (
            <View className="bg-white rounded-2xl p-8 items-center">
              <Text className="font-lexend text-sm text-dark-400">
                No subject data available
              </Text>
            </View>
          ) : (
            subjects.map((sub, index) => (
              <View
                key={index}
                className="bg-white rounded-2xl p-4 mb-3 shadow-sm"
              >
                <View className="flex-row items-start justify-between mb-2">
                  <View className="flex-1">
                    <Text className="font-lexend-semibold text-base text-dark-900">
                      {sub.subject_name}
                    </Text>
                    {sub.subject_code && (
                      <Text className="font-lexend text-xs text-dark-500">
                        {sub.subject_code}
                      </Text>
                    )}
                  </View>
                  {sub.is_absent ? (
                    <View className="bg-red-100 px-2.5 py-1 rounded-full">
                      <Text className="font-lexend-bold text-[10px] text-red-700">
                        ABSENT
                      </Text>
                    </View>
                  ) : (
                    <View
                      className={`${sub.pass ? "bg-green-100" : "bg-red-100"} px-2.5 py-1 rounded-full`}
                    >
                      <Text
                        className={`font-lexend-bold text-[10px] ${
                          sub.pass ? "text-green-700" : "text-red-700"
                        }`}
                      >
                        {sub.pass ? "PASS" : "FAIL"}
                      </Text>
                    </View>
                  )}
                </View>

                {!sub.is_absent && (
                  <View className="flex-row gap-3 pt-2 border-t border-dark-100">
                    {sub.has_internal_external && (
                      <>
                        <View className="flex-1 items-center">
                          <Text className="font-lexend text-[10px] text-dark-400">
                            Internal
                          </Text>
                          <Text className="font-lexend-bold text-sm text-blue-600">
                            {sub.internal_marks ?? "-"}
                          </Text>
                        </View>
                        <View className="flex-1 items-center">
                          <Text className="font-lexend text-[10px] text-dark-400">
                            External
                          </Text>
                          <Text className="font-lexend-bold text-sm text-indigo-600">
                            {sub.external_marks ?? "-"}
                          </Text>
                        </View>
                      </>
                    )}
                    <View className="flex-1 items-center">
                      <Text className="font-lexend text-[10px] text-dark-400">
                        Obtained
                      </Text>
                      <Text className="font-lexend-bold text-sm text-dark-900">
                        {sub.total_marks ?? "-"}
                      </Text>
                    </View>
                    <View className="flex-1 items-center">
                      <Text className="font-lexend text-[10px] text-dark-400">
                        Max
                      </Text>
                      <Text className="font-lexend-bold text-sm text-dark-900">
                        {sub.max_marks ?? "-"}
                      </Text>
                    </View>
                    {sub.grade && (
                      <View className="flex-1 items-center">
                        <Text className="font-lexend text-[10px] text-dark-400">
                          Grade
                        </Text>
                        <Text className="font-lexend-bold text-sm text-primary-600">
                          {sub.grade}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
