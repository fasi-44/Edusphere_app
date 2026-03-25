import { useCallback, useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Alert,
  Platform,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { useAuthStore } from "../../store";
import { classService, subjectService, userService } from "../../services/admin";

export default function SubjectListScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const skid = user?.skid;

  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [subjectName, setSubjectName] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);

  const fetchClasses = useCallback(async () => {
    if (!skid) return;
    try {
      const res = await classService.getClasses(skid);
      const list = res?.data?.classes || res?.data || [];
      const classList = Array.isArray(list) ? list : [];
      setClasses(classList);
      if (!selectedClass && classList.length > 0) {
        setSelectedClass(classList[0]);
      }
    } catch (err) {
      console.error("Fetch classes error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [skid]);

  useFocusEffect(
    useCallback(() => {
      fetchClasses();
    }, [fetchClasses])
  );

  // Fetch subjects when class changes
  const fetchSubjects = useCallback(async () => {
    if (!skid || !selectedClass) {
      setSubjects([]);
      return;
    }
    setSubjectsLoading(true);
    try {
      const res = await subjectService.getSubjects(skid, selectedClass.id);
      const list = res?.data?.subjects || res?.data || [];
      setSubjects(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Fetch subjects error:", err);
      setSubjects([]);
    } finally {
      setSubjectsLoading(false);
    }
  }, [skid, selectedClass]);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchClasses();
    fetchSubjects();
  }, [fetchClasses, fetchSubjects]);

  const openCreate = () => {
    setEditingSubject(null);
    setSubjectName("");
    setSubjectCode("");
    setShowModal(true);
  };

  const openEdit = (sub) => {
    setEditingSubject(sub);
    setSubjectName(sub.subject_name || sub.name || "");
    setSubjectCode(sub.subject_code || sub.code || "");
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!subjectName.trim()) {
      Alert.alert("Validation", "Please enter a subject name");
      return;
    }
    if (!subjectCode.trim()) {
      Alert.alert("Validation", "Please enter a subject code");
      return;
    }
    setFormSubmitting(true);
    try {
      const payload = {
        subject_name: subjectName.trim(),
        subject_code: subjectCode.trim(),
        class_id: selectedClass.id,
      };
      if (editingSubject) {
        await subjectService.updateSubject(skid, editingSubject.id, payload);
      } else {
        await subjectService.createSubject(skid, payload);
      }
      setShowModal(false);
      fetchSubjects();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.data?.message || "Operation failed";
      Alert.alert("Error", msg);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = (sub) => {
    const doDelete = async () => {
      try {
        await subjectService.deleteSubject(skid, sub.id);
        fetchSubjects();
      } catch (err) {
        const msg = err?.response?.data?.message || err?.data?.message || "Delete failed";
        Alert.alert("Error", msg);
      }
    };

    if (Platform.OS === "web") {
      if (confirm(`Delete subject "${sub.subject_name || sub.name}"?`)) doDelete();
    } else {
      Alert.alert(
        "Delete Subject",
        `Are you sure you want to delete "${sub.subject_name || sub.name}"?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: doDelete },
        ]
      );
    }
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
      <View className="flex-row items-center justify-between px-6 pt-4 pb-3">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => router.back()}
            className="mr-3 w-9 h-9 rounded-full bg-white items-center justify-center shadow-sm"
          >
            <Text className="font-lexend-semibold text-dark-600 text-lg">
              &lsaquo;
            </Text>
          </TouchableOpacity>
          <Text className="font-lexend-bold text-xl text-dark-900">
            Subjects
          </Text>
        </View>
        {selectedClass && (
          <TouchableOpacity
            className="bg-primary-600 px-4 py-2 rounded-xl"
            onPress={openCreate}
          >
            <Text className="font-lexend-medium text-xs text-white">
              + Subject
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Class Filter Chips */}
      <View className="pb-3">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 24, gap: 8 }}
        >
          {classes.map((cls) => (
            <TouchableOpacity
              key={cls.id}
              className={`px-4 py-2 rounded-full ${
                selectedClass?.id === cls.id
                  ? "bg-primary-600"
                  : "bg-white border border-dark-200"
              }`}
              onPress={() => setSelectedClass(cls)}
            >
              <Text
                className={`font-lexend-medium text-xs ${
                  selectedClass?.id === cls.id ? "text-white" : "text-dark-700"
                }`}
              >
                {cls.class_name || cls.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Subject List */}
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View className="px-6 pb-8">
          {subjectsLoading ? (
            <View className="py-12 items-center">
              <ActivityIndicator size="large" color="#6366f1" />
            </View>
          ) : subjects.length === 0 ? (
            <View className="bg-white rounded-2xl p-8 items-center mt-4">
              <Text className="font-lexend text-sm text-dark-400">
                No subjects for this class
              </Text>
            </View>
          ) : (
            subjects.map((sub) => (
              <View
                key={sub.id}
                className="bg-white rounded-2xl p-4 mb-3 shadow-sm"
              >
                <View className="flex-row items-start justify-between">
                  <View className="flex-1">
                    <Text className="font-lexend-semibold text-base text-primary-600">
                      {sub.subject_name || sub.name}
                    </Text>
                    {(sub.subject_code || sub.code) && (
                      <Text className="font-lexend text-xs text-dark-500 mt-0.5">
                        Code: {sub.subject_code || sub.code}
                      </Text>
                    )}
                    {sub.teachers && sub.teachers.length > 0 ? (
                      <View className="flex-row flex-wrap mt-2 gap-1">
                        {sub.teachers.map((t, i) => (
                          <View
                            key={i}
                            className="bg-blue-50 px-2 py-0.5 rounded-full"
                          >
                            <Text className="font-lexend-medium text-[10px] text-blue-700">
                              {t.first_name} {t.last_name}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <Text className="font-lexend text-xs text-dark-400 italic mt-1">
                        No teachers assigned
                      </Text>
                    )}
                  </View>
                  <View className="flex-row gap-2 ml-3">
                    <TouchableOpacity
                      className="w-8 h-8 rounded-full bg-blue-50 items-center justify-center"
                      onPress={() => openEdit(sub)}
                    >
                      <Text className="text-blue-600 text-xs">&#9998;</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="w-8 h-8 rounded-full bg-red-50 items-center justify-center"
                      onPress={() => handleDelete(sub)}
                    >
                      <Text className="text-red-600 text-xs">&#10005;</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Subject Create/Edit Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl px-6 pt-6 pb-10">
            <Text className="font-lexend-bold text-lg text-dark-900 mb-4">
              {editingSubject ? "Edit Subject" : "Create Subject"}
            </Text>
            <Text className="font-lexend-medium text-sm text-dark-700 mb-2">
              Subject Name
            </Text>
            <TextInput
              className="bg-dark-50 rounded-xl px-4 py-3 font-lexend text-sm text-dark-900 border border-dark-200 mb-4"
              placeholder="e.g. Mathematics, English"
              placeholderTextColor="#94a3b8"
              value={subjectName}
              onChangeText={setSubjectName}
              autoFocus
            />
            <Text className="font-lexend-medium text-sm text-dark-700 mb-2">
              Subject Code
            </Text>
            <TextInput
              className="bg-dark-50 rounded-xl px-4 py-3 font-lexend text-sm text-dark-900 border border-dark-200 mb-5"
              placeholder="e.g. MATH, ENG"
              placeholderTextColor="#94a3b8"
              value={subjectCode}
              onChangeText={setSubjectCode}
              autoCapitalize="characters"
            />
            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 bg-dark-100 rounded-xl py-3.5 items-center"
                onPress={() => setShowModal(false)}
              >
                <Text className="font-lexend-semibold text-sm text-dark-600">
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`flex-1 rounded-xl py-3.5 items-center ${
                  formSubmitting ? "bg-primary-400" : "bg-primary-600"
                }`}
                onPress={handleSave}
                disabled={formSubmitting}
              >
                {formSubmitting ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text className="font-lexend-semibold text-sm text-white">
                    {editingSubject ? "Update" : "Create"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
