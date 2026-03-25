import { useCallback, useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { useAuthStore, useAppStore } from "../../store";
import { classService, attendanceService } from "../../services/admin";

const STATUS_COLORS = {
  Present: { bg: "bg-green-100", text: "text-green-700", short: "P" },
  Absent: { bg: "bg-red-100", text: "text-red-700", short: "A" },
  Late: { bg: "bg-amber-100", text: "text-amber-700", short: "L" },
  Leave: { bg: "bg-blue-100", text: "text-blue-700", short: "Lv" },
  Medical_Leave: { bg: "bg-blue-100", text: "text-blue-700", short: "ML" },
  Excused: { bg: "bg-dark-100", text: "text-dark-600", short: "E" },
};

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`;
}

function getInitials(name) {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

export default function AttendanceViewScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const academicYear = useAppStore((s) => s.academicYear);
  const skid = user?.skid;
  const academicYearId = academicYear?.id;

  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [classesLoading, setClassesLoading] = useState(true);

  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Date navigation
  const changeDate = (days) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    setSelectedDate(formatDate(current));
  };

  // Fetch classes
  useFocusEffect(
    useCallback(() => {
      if (!skid) return;
      setClassesLoading(true);
      classService
        .getClasses(skid)
        .then((res) => {
          const list = res?.data?.classes || res?.data || [];
          setClasses(Array.isArray(list) ? list : []);
        })
        .catch(() => setClasses([]))
        .finally(() => setClassesLoading(false));
    }, [skid])
  );

  // Fetch sections when class changes
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

  // Fetch attendance when section + date selected
  const fetchAttendance = useCallback(async () => {
    if (!skid || !academicYearId || !selectedClass || !selectedSection) {
      setRecords([]);
      setStats(null);
      return;
    }
    setLoading(true);
    try {
      const res = await attendanceService.viewAttendance(skid, academicYearId, {
        classId: selectedClass,
        sectionId: selectedSection,
        date: selectedDate,
      });
      const data = res?.data || {};
      setRecords(data.records || []);
      setStats(data.statistics || null);
    } catch (err) {
      console.error("Attendance fetch error:", err);
      setRecords([]);
      setStats(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [skid, academicYearId, selectedClass, selectedSection, selectedDate]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAttendance();
  }, [fetchAttendance]);

  const renderRecord = ({ item }) => {
    const studentName = item.student?.name || item.student?.full_name ||
      `${item.student?.first_name || ""} ${item.student?.last_name || ""}`.trim() || "Student";
    const statusConfig = STATUS_COLORS[item.status] || { bg: "bg-dark-100", text: "text-dark-600", short: "?" };

    return (
      <View className="bg-white rounded-2xl p-4 mb-3 flex-row items-center shadow-sm">
        <View className="w-10 h-10 rounded-full bg-primary-100 items-center justify-center mr-3">
          <Text className="font-lexend-semibold text-xs text-primary-600">
            {getInitials(studentName)}
          </Text>
        </View>
        <View className="flex-1">
          <Text className="font-lexend-medium text-sm text-dark-900">
            {studentName}
          </Text>
          {(item.student?.roll_no || item.student?.roll_number) && (
            <Text className="font-lexend text-xs text-dark-400 mt-0.5">
              Roll #{item.student.roll_no || item.student.roll_number}
            </Text>
          )}
          {item.remarks && (
            <Text className="font-lexend text-xs text-dark-500 italic mt-0.5">
              {item.remarks}
            </Text>
          )}
        </View>
        <View className={`${statusConfig.bg} px-3 py-1.5 rounded-full`}>
          <Text className={`font-lexend-bold text-xs ${statusConfig.text}`}>
            {item.status || "N/A"}
          </Text>
        </View>
      </View>
    );
  };

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
          Attendance
        </Text>
      </View>

      {/* Filters */}
      <View className="bg-white px-6 py-4 mb-2">
        {/* Class filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, marginBottom: 10 }}
        >
          {classesLoading ? (
            <ActivityIndicator size="small" color="#6366f1" />
          ) : (
            classes.map((cls) => (
              <TouchableOpacity
                key={cls.id}
                className={`px-4 py-2 rounded-full ${
                  selectedClass === cls.id
                    ? "bg-primary-600"
                    : "bg-dark-50 border border-dark-200"
                }`}
                onPress={() => setSelectedClass(cls.id)}
              >
                <Text
                  className={`font-lexend-medium text-xs ${
                    selectedClass === cls.id ? "text-white" : "text-dark-700"
                  }`}
                >
                  {cls.class_name || cls.name}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>

        {/* Section filter */}
        {sections.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, marginBottom: 10 }}
          >
            {sections.map((sec) => (
              <TouchableOpacity
                key={sec.id}
                className={`px-4 py-2 rounded-full ${
                  selectedSection === sec.id
                    ? "bg-green-500"
                    : "bg-dark-50 border border-dark-200"
                }`}
                onPress={() => setSelectedSection(sec.id)}
              >
                <Text
                  className={`font-lexend-medium text-xs ${
                    selectedSection === sec.id ? "text-white" : "text-dark-700"
                  }`}
                >
                  {sec.section_name || sec.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Date Navigator */}
        <View className="flex-row items-center justify-between bg-dark-50 rounded-xl px-4 py-2.5">
          <TouchableOpacity onPress={() => changeDate(-1)}>
            <Text className="font-lexend-bold text-lg text-primary-600">
              &lsaquo;
            </Text>
          </TouchableOpacity>
          <Text className="font-lexend-semibold text-sm text-dark-900">
            {formatDateDisplay(selectedDate)}
          </Text>
          <TouchableOpacity onPress={() => changeDate(1)}>
            <Text className="font-lexend-bold text-lg text-primary-600">
              &rsaquo;
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats */}
      {stats && (
        <View className="flex-row px-6 gap-3 mb-3">
          <View className="flex-1 bg-white rounded-xl p-3 border border-dark-100">
            <View className="flex-row items-center gap-1.5 mb-1">
              <View className="w-2 h-2 rounded-full bg-blue-500" />
              <Text className="font-lexend-medium text-[10px] text-dark-400 uppercase tracking-wider">
                Total
              </Text>
            </View>
            <Text className="font-lexend-bold text-xl text-dark-900">
              {stats.total_students || 0}
            </Text>
          </View>
          <View className="flex-1 bg-white rounded-xl p-3 border border-dark-100">
            <View className="flex-row items-center gap-1.5 mb-1">
              <View className="w-2 h-2 rounded-full bg-green-500" />
              <Text className="font-lexend-medium text-[10px] text-dark-400 uppercase tracking-wider">
                Present
              </Text>
            </View>
            <Text className="font-lexend-bold text-xl text-dark-900">
              {stats.present || 0}
            </Text>
          </View>
          <View className="flex-1 bg-white rounded-xl p-3 border border-dark-100">
            <View className="flex-row items-center gap-1.5 mb-1">
              <View className="w-2 h-2 rounded-full bg-red-500" />
              <Text className="font-lexend-medium text-[10px] text-dark-400 uppercase tracking-wider">
                Absent
              </Text>
            </View>
            <Text className="font-lexend-bold text-xl text-dark-900">
              {stats.absent || 0}
            </Text>
          </View>
          <View className="flex-1 bg-white rounded-xl p-3 border border-dark-100">
            <View className="flex-row items-center gap-1.5 mb-1">
              <View className="w-2 h-2 rounded-full bg-primary-500" />
              <Text className="font-lexend-medium text-[10px] text-dark-400 uppercase tracking-wider">
                Rate
              </Text>
            </View>
            <Text className="font-lexend-bold text-xl text-dark-900">
              {stats.attendance_rate != null
                ? `${Math.round(stats.attendance_rate)}%`
                : "-"}
            </Text>
          </View>
        </View>
      )}

      {/* Content */}
      {!selectedClass || !selectedSection ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="font-lexend text-sm text-dark-400 text-center">
            Select a class and section to view attendance
          </Text>
        </View>
      ) : loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(item) => String(item.id || item.student?.id)}
          renderItem={renderRecord}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View className="items-center py-12">
              <Text className="font-lexend text-sm text-dark-400">
                No attendance records for this date
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
