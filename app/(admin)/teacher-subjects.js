import { useCallback, useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  FlatList,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { useAuthStore } from "../../store";
import { userService, subjectService, classService } from "../../services/admin";

export default function TeacherSubjectsScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const skid = user?.skid;

  const [loading, setLoading] = useState(true);
  const [teachers, setTeachers] = useState([]);
  const [allSubjects, setAllSubjects] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [assignedSubjectIds, setAssignedSubjectIds] = useState([]);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState([]);
  const [saving, setSaving] = useState(false);
  const [fetchingAssigned, setFetchingAssigned] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [teacherSearch, setTeacherSearch] = useState("");

  // Fetch teachers and subjects on mount
  useFocusEffect(
    useCallback(() => {
      if (!skid) return;
      const fetchData = async () => {
        try {
          const [teacherRes, classesRes] = await Promise.allSettled([
            userService.getTeachers(skid, { limit: 100 }),
            classService.getClasses(skid),
          ]);

          if (teacherRes.status === "fulfilled") {
            const list = teacherRes.value?.data?.teachers || teacherRes.value?.data || [];
            setTeachers(Array.isArray(list) ? list : []);
          }

          // Fetch subjects from all classes
          if (classesRes.status === "fulfilled") {
            const classList = classesRes.value?.data?.classes || classesRes.value?.data || [];
            if (Array.isArray(classList)) {
              const subjectResults = await Promise.allSettled(
                classList.map((cls) => subjectService.getSubjects(skid, cls.id))
              );
              const allSubs = [];
              const seenIds = new Set();
              subjectResults.forEach((r) => {
                if (r.status === "fulfilled") {
                  const subs = r.value?.data?.subjects || r.value?.data || [];
                  (Array.isArray(subs) ? subs : []).forEach((s) => {
                    if (!seenIds.has(s.id)) {
                      seenIds.add(s.id);
                      allSubs.push(s);
                    }
                  });
                }
              });
              setAllSubjects(allSubs);
            }
          }
        } catch (err) {
          console.error("Fetch data error:", err);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }, [skid])
  );

  // Fetch assigned subjects when teacher changes
  useEffect(() => {
    if (!skid || !selectedTeacher) {
      setAssignedSubjectIds([]);
      setSelectedSubjectIds([]);
      return;
    }
    setFetchingAssigned(true);
    subjectService
      .getTeacherSubjects(skid, selectedTeacher.id)
      .then((res) => {
        const ids = res?.data?.subject_ids || res?.subject_ids || [];
        const idList = Array.isArray(ids) ? ids : [];
        setAssignedSubjectIds(idList);
        setSelectedSubjectIds(idList);
      })
      .catch(() => {
        setAssignedSubjectIds([]);
        setSelectedSubjectIds([]);
      })
      .finally(() => setFetchingAssigned(false));
  }, [skid, selectedTeacher]);

  const toggleSubject = (subjectId) => {
    setSelectedSubjectIds((prev) =>
      prev.includes(subjectId)
        ? prev.filter((id) => id !== subjectId)
        : [...prev, subjectId]
    );
  };

  const handleSave = async () => {
    if (!selectedTeacher) return;
    setSaving(true);
    try {
      await subjectService.assignSubjectsToTeacher(
        skid,
        selectedTeacher.id,
        selectedSubjectIds
      );
      setAssignedSubjectIds(selectedSubjectIds);
      Alert.alert("Success", "Subject assignments updated!");
    } catch (err) {
      const msg = err?.response?.data?.message || err?.data?.message || "Save failed";
      Alert.alert("Error", msg);
    } finally {
      setSaving(false);
    }
  };

  const hasChanges =
    JSON.stringify([...assignedSubjectIds].sort()) !==
    JSON.stringify([...selectedSubjectIds].sort());

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
        <Text className="font-lexend-bold text-xl text-dark-900">
          Teacher-Subject Mapping
        </Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Teacher Dropdown */}
        <View className="px-6 pb-4">
          <Text className="font-lexend-semibold text-sm text-dark-400 uppercase tracking-wider mb-3">
            Select Teacher
          </Text>
          <TouchableOpacity
            className="bg-white rounded-xl px-4 py-3.5 flex-row items-center justify-between border border-dark-200"
            onPress={() => {
              setTeacherSearch("");
              setDropdownOpen(true);
            }}
          >
            <Text
              className={`font-lexend-medium text-sm ${
                selectedTeacher ? "text-dark-900" : "text-dark-400"
              }`}
            >
              {selectedTeacher
                ? `${selectedTeacher.first_name || ""} ${selectedTeacher.last_name || ""}`.trim() || "Teacher"
                : "Choose a teacher..."}
            </Text>
            <Text className="font-lexend text-dark-400 text-base">
              &rsaquo;
            </Text>
          </TouchableOpacity>
        </View>

        {/* Teacher Picker Modal */}
        <Modal
          visible={dropdownOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setDropdownOpen(false)}
        >
          <Pressable
            className="flex-1 bg-black/40"
            onPress={() => setDropdownOpen(false)}
          />
          <View className="bg-white rounded-t-3xl max-h-[70%] pb-6">
            <View className="px-6 pt-5 pb-3">
              <View className="flex-row items-center justify-between mb-4">
                <Text className="font-lexend-bold text-lg text-dark-900">
                  Select Teacher
                </Text>
                <TouchableOpacity onPress={() => setDropdownOpen(false)}>
                  <Text className="font-lexend-medium text-sm text-primary-600">
                    Close
                  </Text>
                </TouchableOpacity>
              </View>
              <TextInput
                className="bg-dark-50 rounded-xl px-4 py-3 font-lexend text-sm text-dark-900"
                placeholder="Search teachers..."
                placeholderTextColor="#94a3b8"
                value={teacherSearch}
                onChangeText={setTeacherSearch}
                autoFocus
              />
            </View>
            <FlatList
              data={teachers.filter((t) => {
                if (!teacherSearch.trim()) return true;
                const q = teacherSearch.toLowerCase();
                const name = `${t.first_name || ""} ${t.last_name || ""}`.toLowerCase();
                return (
                  name.includes(q) ||
                  (t.email || "").toLowerCase().includes(q)
                );
              })}
              keyExtractor={(item) => String(item.id)}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const name = `${item.first_name || ""} ${item.last_name || ""}`.trim();
                const isSelected = selectedTeacher?.id === item.id;
                return (
                  <TouchableOpacity
                    className={`mx-6 px-4 py-3.5 rounded-xl mb-1.5 flex-row items-center ${
                      isSelected ? "bg-primary-50" : "bg-white"
                    }`}
                    onPress={() => {
                      setSelectedTeacher(item);
                      setDropdownOpen(false);
                    }}
                  >
                    <View className="w-9 h-9 rounded-full bg-primary-100 items-center justify-center mr-3">
                      <Text className="font-lexend-semibold text-xs text-primary-600">
                        {(item.first_name?.[0] || "").toUpperCase()}
                        {(item.last_name?.[0] || "").toUpperCase()}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text
                        className={`font-lexend-medium text-sm ${
                          isSelected ? "text-primary-700" : "text-dark-900"
                        }`}
                      >
                        {name || "Teacher"}
                      </Text>
                      {item.email ? (
                        <Text className="font-lexend text-xs text-dark-400 mt-0.5">
                          {item.email}
                        </Text>
                      ) : null}
                    </View>
                    {isSelected && (
                      <Text className="font-lexend-semibold text-primary-600 text-sm">
                        ✓
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View className="items-center py-8">
                  <Text className="font-lexend text-sm text-dark-400">
                    No teachers found
                  </Text>
                </View>
              }
            />
          </View>
        </Modal>

        {/* Subject Selection */}
        {selectedTeacher && (
          <View className="px-6 pb-8">
            <Text className="font-lexend-semibold text-sm text-dark-400 uppercase tracking-wider mb-3">
              Assign Subjects to{" "}
              {selectedTeacher.first_name} {selectedTeacher.last_name}
            </Text>

            {fetchingAssigned ? (
              <View className="py-8 items-center">
                <ActivityIndicator size="small" color="#6366f1" />
              </View>
            ) : allSubjects.length === 0 ? (
              <View className="bg-white rounded-2xl p-6 items-center">
                <Text className="font-lexend text-sm text-dark-400">
                  No subjects available
                </Text>
              </View>
            ) : (
              <>
                <View className="flex-row flex-wrap gap-2 mb-6">
                  {allSubjects.map((sub) => {
                    const isSelected = selectedSubjectIds.includes(sub.id);
                    return (
                      <TouchableOpacity
                        key={sub.id}
                        className={`px-4 py-3 rounded-xl ${
                          isSelected
                            ? "bg-primary-100 border-2 border-primary-400"
                            : "bg-white border border-dark-200"
                        }`}
                        onPress={() => toggleSubject(sub.id)}
                      >
                        <Text
                          className={`font-lexend-medium text-sm ${
                            isSelected ? "text-primary-700" : "text-dark-700"
                          }`}
                        >
                          {isSelected ? "✓ " : ""}
                          {sub.subject_name || sub.name}
                        </Text>
                        {(sub.subject_code || sub.code) && (
                          <Text className="font-lexend text-[10px] text-dark-400 mt-0.5">
                            {sub.subject_code || sub.code}
                          </Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Save Button */}
                {hasChanges && (
                  <TouchableOpacity
                    className={`rounded-xl py-4 items-center ${
                      saving ? "bg-primary-400" : "bg-primary-600"
                    }`}
                    onPress={handleSave}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <Text className="font-lexend-semibold text-base text-white">
                        Save Assignments ({selectedSubjectIds.length} subject
                        {selectedSubjectIds.length !== 1 ? "s" : ""})
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        )}

        {!selectedTeacher && (
          <View className="px-6 py-16 items-center">
            <Text className="font-lexend text-sm text-dark-400">
              Select a teacher to manage subject assignments
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
