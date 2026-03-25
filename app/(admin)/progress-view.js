import { useCallback, useState, useEffect } from "react";
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
import { examService, classService, progressService } from "../../services/admin";

export default function ProgressViewScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const academicYear = useAppStore((s) => s.academicYear);
  const skid = user?.skid;
  const academicYearId = academicYear?.id;

  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [examTypes, setExamTypes] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [selectedExamType, setSelectedExamType] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);

  // Data
  const [statistics, setStatistics] = useState(null);
  const [subjectAnalysis, setSubjectAnalysis] = useState([]);
  const [studentProgress, setStudentProgress] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load exam types and classes
  useFocusEffect(
    useCallback(() => {
      if (!skid) return;
      Promise.allSettled([
        examService.getExamTypes(skid),
        classService.getClasses(skid),
      ]).then(([examRes, classRes]) => {
        if (examRes.status === "fulfilled") {
          const list = examRes.value?.data?.exam_types || examRes.value?.data || [];
          setExamTypes(Array.isArray(list) ? list : []);
        }
        if (classRes.status === "fulfilled") {
          const list = classRes.value?.data?.classes || classRes.value?.data || [];
          setClasses(Array.isArray(list) ? list : []);
        }
        setInitialLoading(false);
      });
    }, [skid])
  );

  // Sections when class changes
  useEffect(() => {
    if (!skid || !selectedClass) {
      setSections([]);
      setSelectedSection(null);
      return;
    }
    classService
      .getSections(skid, selectedClass)
      .then((res) => {
        const list = res?.data?.sections || res?.data || [];
        setSections(Array.isArray(list) ? list : []);
      })
      .catch(() => setSections([]));
    setSelectedSection(null);
  }, [skid, selectedClass]);

  // Fetch progress when all filters selected
  const fetchProgress = useCallback(async () => {
    if (!skid || !academicYearId || !selectedExamType || !selectedClass || !selectedSection) {
      setStatistics(null);
      setSubjectAnalysis([]);
      setStudentProgress([]);
      return;
    }
    setLoading(true);
    try {
      const res = await progressService.getClassProgress(skid, academicYearId, selectedExamType, {
        classId: selectedClass,
        sectionId: selectedSection,
      });
      const data = res?.data || {};
      setStatistics(data.statistics || null);
      setSubjectAnalysis(data.subject_analysis || []);
      setStudentProgress(data.student_progress || []);
    } catch (err) {
      console.error("Fetch progress error:", err);
      setStatistics(null);
      setSubjectAnalysis([]);
      setStudentProgress([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [skid, academicYearId, selectedExamType, selectedClass, selectedSection]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProgress();
  }, [fetchProgress]);

  const getGradeColor = (status) => {
    if (status === "pass") return { bg: "bg-green-100", text: "text-green-700" };
    if (status === "fail") return { bg: "bg-red-100", text: "text-red-700" };
    return { bg: "bg-dark-100", text: "text-dark-600" };
  };

  const renderStudent = ({ item }) => {
    const statusColor = getGradeColor(item.status);
    return (
      <TouchableOpacity
        className="bg-white rounded-2xl p-4 mb-3 shadow-sm"
        activeOpacity={0.7}
        onPress={() =>
          router.push({
            pathname: "/(admin)/progress-card",
            params: {
              studentId: item.student_id,
              examId: selectedExamType,
              studentName: item.student_name,
            },
          })
        }
      >
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-row items-center flex-1">
            <View className="w-9 h-9 rounded-full bg-primary-100 items-center justify-center mr-3">
              <Text className="font-lexend-semibold text-xs text-primary-600">
                {(item.student_name || "?")
                  .split(" ")
                  .map((w) => w[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="font-lexend-medium text-sm text-dark-900">
                {item.student_name}
              </Text>
              {item.roll_no && (
                <Text className="font-lexend text-[10px] text-dark-400">
                  Roll #{item.roll_no}
                </Text>
              )}
            </View>
          </View>
          <View className={`${statusColor.bg} px-2.5 py-1 rounded-full`}>
            <Text className={`font-lexend-bold text-[10px] ${statusColor.text}`}>
              {(item.status || "").toUpperCase()}
            </Text>
          </View>
        </View>

        <View className="flex-row gap-3 pt-2 border-t border-dark-100">
          <View className="flex-1 items-center">
            <Text className="font-lexend text-[10px] text-dark-400">Total</Text>
            <Text className="font-lexend-bold text-sm text-dark-900">
              {item.total_marks ?? "-"}
            </Text>
          </View>
          <View className="flex-1 items-center">
            <Text className="font-lexend text-[10px] text-dark-400">Percentage</Text>
            <Text className="font-lexend-bold text-sm text-primary-600">
              {item.percentage != null ? `${Math.round(item.percentage)}%` : "-"}
            </Text>
          </View>
          {item.grade && (
            <View className="flex-1 items-center">
              <Text className="font-lexend text-[10px] text-dark-400">Grade</Text>
              <Text className="font-lexend-bold text-sm text-dark-900">
                {item.grade}
              </Text>
            </View>
          )}
        </View>

        <Text className="font-lexend text-[10px] text-primary-500 mt-2">
          Tap to view progress card &rsaquo;
        </Text>
      </TouchableOpacity>
    );
  };

  if (initialLoading) {
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
        <Text className="font-lexend-bold text-xl text-dark-900">
          Progress Reports
        </Text>
      </View>

      {/* Filters */}
      <View className="bg-white px-6 py-3 mb-2">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, marginBottom: 8 }}
        >
          {examTypes.map((et) => (
            <TouchableOpacity
              key={et.id}
              className={`px-3 py-1.5 rounded-full ${
                selectedExamType === et.id
                  ? "bg-primary-600"
                  : "bg-dark-50 border border-dark-200"
              }`}
              onPress={() => setSelectedExamType(et.id)}
            >
              <Text
                className={`font-lexend-medium text-[10px] ${
                  selectedExamType === et.id ? "text-white" : "text-dark-700"
                }`}
              >
                {et.exam_name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, marginBottom: sections.length > 0 ? 8 : 0 }}
        >
          {classes.map((cls) => (
            <TouchableOpacity
              key={cls.id}
              className={`px-3 py-1.5 rounded-full ${
                selectedClass === cls.id
                  ? "bg-blue-500"
                  : "bg-dark-50 border border-dark-200"
              }`}
              onPress={() => setSelectedClass(cls.id)}
            >
              <Text
                className={`font-lexend-medium text-[10px] ${
                  selectedClass === cls.id ? "text-white" : "text-dark-700"
                }`}
              >
                {cls.class_name || cls.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {sections.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {sections.map((sec) => (
              <TouchableOpacity
                key={sec.id}
                className={`px-3 py-1.5 rounded-full ${
                  selectedSection === sec.id
                    ? "bg-green-500"
                    : "bg-dark-50 border border-dark-200"
                }`}
                onPress={() => setSelectedSection(sec.id)}
              >
                <Text
                  className={`font-lexend-medium text-[10px] ${
                    selectedSection === sec.id ? "text-white" : "text-dark-700"
                  }`}
                >
                  {sec.section_name || sec.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Content */}
      {!selectedExamType || !selectedClass || !selectedSection ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="font-lexend text-sm text-dark-400 text-center">
            Select an exam, class and section to view progress
          </Text>
        </View>
      ) : loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      ) : (
        <FlatList
          data={studentProgress}
          keyExtractor={(item) => String(item.student_id)}
          renderItem={renderStudent}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListHeaderComponent={
            <>
              {/* Statistics */}
              {statistics && (
                <View className="flex-row gap-2 mb-4">
                  <View className="flex-1 bg-white rounded-xl p-3 items-center border border-dark-100">
                    <Text className="font-lexend text-[10px] text-dark-400">Total</Text>
                    <Text className="font-lexend-bold text-lg text-dark-900">
                      {statistics.total_students || 0}
                    </Text>
                  </View>
                  <View className="flex-1 bg-white rounded-xl p-3 items-center border border-dark-100">
                    <Text className="font-lexend text-[10px] text-green-600">Passed</Text>
                    <Text className="font-lexend-bold text-lg text-green-600">
                      {statistics.passed || 0}
                    </Text>
                  </View>
                  <View className="flex-1 bg-white rounded-xl p-3 items-center border border-dark-100">
                    <Text className="font-lexend text-[10px] text-red-600">Failed</Text>
                    <Text className="font-lexend-bold text-lg text-red-600">
                      {statistics.failed || 0}
                    </Text>
                  </View>
                  <View className="flex-1 bg-white rounded-xl p-3 items-center border border-dark-100">
                    <Text className="font-lexend text-[10px] text-primary-600">Avg %</Text>
                    <Text className="font-lexend-bold text-lg text-primary-600">
                      {statistics.average_percentage != null
                        ? `${Math.round(statistics.average_percentage)}%`
                        : "-"}
                    </Text>
                  </View>
                </View>
              )}

              {/* Subject Analysis */}
              {subjectAnalysis.length > 0 && (
                <View className="mb-4">
                  <Text className="font-lexend-semibold text-xs text-dark-400 uppercase tracking-wider mb-2">
                    Subject Analysis
                  </Text>
                  {subjectAnalysis.map((sub, i) => (
                    <View
                      key={i}
                      className="bg-white rounded-xl p-3 mb-2 border border-dark-100"
                    >
                      <Text className="font-lexend-medium text-sm text-dark-900 mb-2">
                        {sub.subject_name}
                        {sub.subject_code ? ` (${sub.subject_code})` : ""}
                      </Text>
                      <View className="flex-row gap-2">
                        <View className="flex-1 items-center">
                          <Text className="font-lexend text-[10px] text-dark-400">Avg</Text>
                          <Text className="font-lexend-bold text-xs text-dark-900">
                            {sub.average_marks != null ? Math.round(sub.average_marks) : "-"}
                          </Text>
                        </View>
                        <View className="flex-1 items-center">
                          <Text className="font-lexend text-[10px] text-dark-400">High</Text>
                          <Text className="font-lexend-bold text-xs text-green-600">
                            {sub.highest_marks ?? "-"}
                          </Text>
                        </View>
                        <View className="flex-1 items-center">
                          <Text className="font-lexend text-[10px] text-dark-400">Low</Text>
                          <Text className="font-lexend-bold text-xs text-red-600">
                            {sub.lowest_marks ?? "-"}
                          </Text>
                        </View>
                        <View className="flex-1 items-center">
                          <Text className="font-lexend text-[10px] text-dark-400">Pass%</Text>
                          <Text className="font-lexend-bold text-xs text-primary-600">
                            {sub.pass_percentage != null
                              ? `${Math.round(sub.pass_percentage)}%`
                              : "-"}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {studentProgress.length > 0 && (
                <Text className="font-lexend-semibold text-xs text-dark-400 uppercase tracking-wider mb-2">
                  Student Results
                </Text>
              )}
            </>
          }
          ListEmptyComponent={
            <View className="items-center py-12">
              <Text className="font-lexend text-sm text-dark-400">
                No progress data available
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
