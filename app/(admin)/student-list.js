import { useCallback, useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuthStore, useAppStore } from "../../store";
import { userService, classService } from "../../services/admin";

function getInitials(item) {
  if (item.first_name || item.last_name) {
    return (
      (item.first_name?.[0] || "") + (item.last_name?.[0] || "")
    ).toUpperCase();
  }
  if (item.full_name) {
    return item.full_name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  return "?";
}

export default function StudentListScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const academicYear = useAppStore((s) => s.academicYear);
  const skid = user?.skid;
  const academicYearId = academicYear?.id;

  const [initialLoad, setInitialLoad] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");

  // Class/Section filters
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);

  // Fetch classes on mount
  useEffect(() => {
    if (!skid) return;
    classService
      .getClasses(skid)
      .then((res) => {
        const list = res?.data?.classes || res?.data || [];
        setClasses(Array.isArray(list) ? list : []);
      })
      .catch(() => {});
  }, [skid]);

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

  // Fetch students — uses inSection endpoint when section is selected
  const fetchStudents = useCallback(async () => {
    if (!skid) return;
    setLoading(true);
    try {
      let list;
      if (selectedSection && academicYearId) {
        const res = await userService.getStudentsBySection(
          skid,
          academicYearId,
          selectedSection
        );
        list = res?.data || [];
      } else {
        const res = await userService.getStudents(skid);
        list = res?.data || [];
      }
      setStudents(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Fetch students error:", err);
    } finally {
      setLoading(false);
      setInitialLoad(false);
      setRefreshing(false);
    }
  }, [skid, academicYearId, selectedSection]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchStudents();
  }, [fetchStudents]);

  // Client-side filtering: class filter (when no section selected) + search
  const filtered = students.filter((s) => {
    // Class filter — only needed when showing all students (no section selected)
    if (selectedClass && !selectedSection) {
      const studentClassId = s.class?.id || s.profile?.class_id;
      if (studentClassId !== selectedClass) return false;
    }
    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      const name = (
        s.full_name ||
        `${s.first_name || ""} ${s.last_name || ""}`
      ).toLowerCase();
      return (
        name.includes(q) ||
        (s.profile?.roll_no || "").toString().includes(q) ||
        (s.email || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Resolve class/section display names from filter state or student data
  const selectedClassName = classes.find((c) => c.id === selectedClass)?.class_name;
  const selectedSectionName = sections.find((s) => s.id === selectedSection)?.section_name;

  const renderStudent = ({ item }) => {
    const displayName =
      item.full_name ||
      `${item.first_name || ""} ${item.last_name || ""}`.trim();
    // Use nested objects from main endpoint, or fall back to selected filter names for inSection endpoint
    const className = item.class?.class_name || item.class_name || selectedClassName;
    const sectionName = item.section?.section_name || item.section_name || selectedSectionName;
    const rollNo = item.profile?.roll_no || item.roll_number;

    return (
      <TouchableOpacity
        className="bg-white rounded-2xl p-4 mb-3 flex-row items-center shadow-sm"
        activeOpacity={0.7}
        onPress={() =>
          router.push({
            pathname: "/(admin)/student-detail",
            params: { id: item.id, name: displayName },
          })
        }
      >
        <View className="w-11 h-11 rounded-full bg-green-100 items-center justify-center mr-3">
          <Text className="font-lexend-semibold text-sm text-green-600">
            {getInitials(item)}
          </Text>
        </View>
        <View className="flex-1">
          <Text className="font-lexend-medium text-sm text-dark-900">
            {displayName}
          </Text>
          <View className="flex-row items-center mt-0.5">
            {className && (
              <Text className="font-lexend text-xs text-dark-500">
                {className}
                {sectionName ? ` - ${sectionName}` : ""}
              </Text>
            )}
            {rollNo && (
              <Text className="font-lexend text-xs text-dark-400 ml-2">
                Roll #{rollNo}
              </Text>
            )}
          </View>
        </View>
        <Text className="font-lexend text-dark-300 text-xl">&rsaquo;</Text>
      </TouchableOpacity>
    );
  };

  if (initialLoad) {
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
            Students
          </Text>
          <Text className="font-lexend text-xs text-dark-500">
            {filtered.length} student{filtered.length !== 1 ? "s" : ""}
          </Text>
        </View>
      </View>

      {/* Filters */}
      <View className="px-6 pb-2">
        <ScrollableFilter
          items={[
            { id: null, name: "All Classes" },
            ...classes.map((c) => ({ id: c.id, name: c.class_name || c.name })),
          ]}
          selected={selectedClass}
          onSelect={(id) => setSelectedClass(id)}
        />
        {sections.length > 0 && (
          <ScrollableFilter
            items={[
              { id: null, name: "All Sections" },
              ...sections.map((s) => ({
                id: s.id,
                name: s.section_name || s.name,
              })),
            ]}
            selected={selectedSection}
            onSelect={(id) => setSelectedSection(id)}
            style={{ marginTop: 8 }}
          />
        )}
      </View>

      {/* Search */}
      <View className="px-6 pb-3">
        <TextInput
          className="bg-white rounded-xl px-4 py-3 font-lexend text-sm text-dark-900 shadow-sm"
          placeholder="Search students..."
          placeholderTextColor="#94a3b8"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Loader or List */}
      {loading && !refreshing ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      ) : (
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderStudent}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View className="items-center py-12">
            <Text className="font-lexend text-sm text-dark-400">
              {search ? "No students match your search" : "No students found"}
            </Text>
          </View>
        }
      />
      )}
    </SafeAreaView>
  );
}

function ScrollableFilter({ items, selected, onSelect, style }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={style}
      contentContainerStyle={{ gap: 8 }}
    >
      {items.map((item) => (
        <TouchableOpacity
          key={String(item.id)}
          className={`px-4 py-2 rounded-full ${
            selected === item.id
              ? "bg-primary-600"
              : "bg-white border border-dark-200"
          }`}
          onPress={() => onSelect(item.id)}
        >
          <Text
            className={`font-lexend-medium text-xs ${
              selected === item.id ? "text-white" : "text-dark-700"
            }`}
          >
            {item.name}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
