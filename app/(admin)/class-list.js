import { useCallback, useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  FlatList,
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
import { classService } from "../../services/admin";

export default function ClassListScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const skid = user?.skid;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [sections, setSections] = useState([]);
  const [sectionsLoading, setSectionsLoading] = useState(false);

  // Modal states
  const [showClassModal, setShowClassModal] = useState(false);
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [editingSection, setEditingSection] = useState(null);
  const [formName, setFormName] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);

  const fetchClasses = useCallback(async () => {
    if (!skid) return;
    try {
      const res = await classService.getClasses(skid);
      const list = res?.data?.classes || res?.data || [];
      setClasses(Array.isArray(list) ? list : []);
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

  // Fetch sections when class selected
  useEffect(() => {
    if (!skid || !selectedClass) {
      setSections([]);
      return;
    }
    setSectionsLoading(true);
    classService
      .getSections(skid, selectedClass.id)
      .then((res) => {
        const list = res?.data?.sections || res?.data || [];
        setSections(Array.isArray(list) ? list : []);
      })
      .catch(() => setSections([]))
      .finally(() => setSectionsLoading(false));
  }, [skid, selectedClass]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchClasses();
  }, [fetchClasses]);

  // Class CRUD
  const openCreateClass = () => {
    setEditingClass(null);
    setFormName("");
    setShowClassModal(true);
  };

  const openEditClass = (cls) => {
    setEditingClass(cls);
    setFormName(cls.class_name || cls.name || "");
    setShowClassModal(true);
  };

  const handleSaveClass = async () => {
    if (!formName.trim()) {
      Alert.alert("Validation", "Please enter a class name");
      return;
    }
    setFormSubmitting(true);
    try {
      if (editingClass) {
        await classService.updateClass(skid, editingClass.id, {
          class_name: formName.trim(),
        });
      } else {
        await classService.createClass(skid, { class_name: formName.trim() });
      }
      setShowClassModal(false);
      fetchClasses();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.data?.message || "Operation failed";
      Alert.alert("Error", msg);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteClass = (cls) => {
    const doDelete = async () => {
      try {
        await classService.deleteClass(skid, cls.id);
        if (selectedClass?.id === cls.id) setSelectedClass(null);
        fetchClasses();
      } catch (err) {
        const msg = err?.response?.data?.message || err?.data?.message || "Delete failed";
        Alert.alert("Error", msg);
      }
    };

    if (Platform.OS === "web") {
      if (confirm(`Delete class "${cls.class_name || cls.name}"?`)) doDelete();
    } else {
      Alert.alert(
        "Delete Class",
        `Are you sure you want to delete "${cls.class_name || cls.name}"?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: doDelete },
        ]
      );
    }
  };

  // Section CRUD
  const openCreateSection = () => {
    setEditingSection(null);
    setFormName("");
    setShowSectionModal(true);
  };

  const openEditSection = (sec) => {
    setEditingSection(sec);
    setFormName(sec.section_name || sec.name || "");
    setShowSectionModal(true);
  };

  const handleSaveSection = async () => {
    if (!formName.trim()) {
      Alert.alert("Validation", "Please enter a section name");
      return;
    }
    setFormSubmitting(true);
    try {
      if (editingSection) {
        await classService.updateSection(skid, editingSection.id, {
          section_name: formName.trim(),
          class_id: selectedClass.id,
        });
      } else {
        await classService.createSection(skid, {
          section_name: formName.trim(),
          class_id: selectedClass.id,
        });
      }
      setShowSectionModal(false);
      // Re-fetch sections
      const res = await classService.getSections(skid, selectedClass.id);
      const list = res?.data?.sections || res?.data || [];
      setSections(Array.isArray(list) ? list : []);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.data?.message || "Operation failed";
      Alert.alert("Error", msg);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteSection = (sec) => {
    const doDelete = async () => {
      try {
        await classService.deleteSection(skid, sec.id);
        const res = await classService.getSections(skid, selectedClass.id);
        const list = res?.data?.sections || res?.data || [];
        setSections(Array.isArray(list) ? list : []);
      } catch (err) {
        const msg = err?.response?.data?.message || err?.data?.message || "Delete failed";
        Alert.alert("Error", msg);
      }
    };

    if (Platform.OS === "web") {
      if (confirm(`Delete section "${sec.section_name || sec.name}"?`)) doDelete();
    } else {
      Alert.alert(
        "Delete Section",
        `Are you sure you want to delete "${sec.section_name || sec.name}"?`,
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
          <View>
            <Text className="font-lexend-bold text-xl text-dark-900">
              Classes & Sections
            </Text>
            <Text className="font-lexend text-xs text-dark-500">
              {classes.length} class{classes.length !== 1 ? "es" : ""}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          className="bg-primary-600 px-4 py-2 rounded-xl"
          onPress={openCreateClass}
        >
          <Text className="font-lexend-medium text-xs text-white">
            + Class
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Class List */}
        <View className="px-6 pb-4">
          <Text className="font-lexend-semibold text-sm text-dark-400 uppercase tracking-wider mb-3">
            Select a Class
          </Text>
          {classes.map((cls) => {
            const isSelected = selectedClass?.id === cls.id;
            return (
              <TouchableOpacity
                key={cls.id}
                className={`bg-white rounded-2xl p-4 mb-3 flex-row items-center shadow-sm ${
                  isSelected ? "border-2 border-primary-400" : ""
                }`}
                onPress={() => setSelectedClass(cls)}
                activeOpacity={0.7}
              >
                <View
                  className={`w-11 h-11 rounded-xl ${
                    isSelected ? "bg-primary-600" : "bg-primary-100"
                  } items-center justify-center mr-3`}
                >
                  <Text
                    className={`font-lexend-bold text-base ${
                      isSelected ? "text-white" : "text-primary-600"
                    }`}
                  >
                    {(cls.class_name || cls.name || "C").charAt(0)}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="font-lexend-semibold text-base text-dark-900">
                    {cls.class_name || cls.name}
                  </Text>
                  <View className="flex-row items-center mt-0.5">
                    {cls.section_count != null && (
                      <Text className="font-lexend text-xs text-dark-500 mr-3">
                        {cls.section_count} section{cls.section_count !== 1 ? "s" : ""}
                      </Text>
                    )}
                    {cls.student_count != null && (
                      <Text className="font-lexend text-xs text-dark-400">
                        {cls.student_count} student{cls.student_count !== 1 ? "s" : ""}
                      </Text>
                    )}
                  </View>
                </View>
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    className="w-8 h-8 rounded-full bg-blue-50 items-center justify-center"
                    onPress={() => openEditClass(cls)}
                  >
                    <Text className="text-blue-600 text-xs">&#9998;</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="w-8 h-8 rounded-full bg-red-50 items-center justify-center"
                    onPress={() => handleDeleteClass(cls)}
                  >
                    <Text className="text-red-600 text-xs">&#10005;</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Sections for Selected Class */}
        {selectedClass && (
          <View className="px-6 pb-8">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="font-lexend-semibold text-sm text-dark-400 uppercase tracking-wider">
                Sections in {selectedClass.class_name || selectedClass.name}
              </Text>
              <TouchableOpacity
                className="bg-green-500 px-3 py-1.5 rounded-lg"
                onPress={openCreateSection}
              >
                <Text className="font-lexend-medium text-xs text-white">
                  + Section
                </Text>
              </TouchableOpacity>
            </View>

            {sectionsLoading ? (
              <View className="py-8 items-center">
                <ActivityIndicator size="small" color="#6366f1" />
              </View>
            ) : sections.length === 0 ? (
              <View className="bg-white rounded-2xl p-6 items-center">
                <Text className="font-lexend text-sm text-dark-400">
                  No sections added yet
                </Text>
              </View>
            ) : (
              sections.map((sec) => (
                <View
                  key={sec.id}
                  className="bg-white rounded-2xl p-4 mb-3 shadow-sm"
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text className="font-lexend-semibold text-base text-dark-900">
                        {sec.section_name || sec.name}
                      </Text>
                      <View className="flex-row items-center mt-1">
                        {sec.teacher_name ? (
                          <View className="flex-row items-center">
                            <Text className="font-lexend text-xs text-dark-500">
                              Teacher:{" "}
                            </Text>
                            <Text className="font-lexend-medium text-xs text-primary-600">
                              {sec.teacher_name}
                            </Text>
                          </View>
                        ) : (
                          <Text className="font-lexend text-xs text-dark-400 italic">
                            No class teacher assigned
                          </Text>
                        )}
                      </View>
                      {sec.student_count != null && (
                        <View className="bg-green-50 self-start px-2 py-0.5 rounded-full mt-1.5">
                          <Text className="font-lexend-medium text-[10px] text-green-700">
                            {sec.student_count} student{sec.student_count !== 1 ? "s" : ""}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View className="flex-row gap-2">
                      <TouchableOpacity
                        className="w-8 h-8 rounded-full bg-blue-50 items-center justify-center"
                        onPress={() => openEditSection(sec)}
                      >
                        <Text className="text-blue-600 text-xs">&#9998;</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        className="w-8 h-8 rounded-full bg-red-50 items-center justify-center"
                        onPress={() => handleDeleteSection(sec)}
                      >
                        <Text className="text-red-600 text-xs">&#10005;</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Class Create/Edit Modal */}
      <Modal
        visible={showClassModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowClassModal(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl px-6 pt-6 pb-10">
            <Text className="font-lexend-bold text-lg text-dark-900 mb-4">
              {editingClass ? "Edit Class" : "Create Class"}
            </Text>
            <Text className="font-lexend-medium text-sm text-dark-700 mb-2">
              Class Name
            </Text>
            <TextInput
              className="bg-dark-50 rounded-xl px-4 py-3 font-lexend text-sm text-dark-900 border border-dark-200 mb-5"
              placeholder="e.g. Class 1, Grade 10"
              placeholderTextColor="#94a3b8"
              value={formName}
              onChangeText={setFormName}
              autoFocus
            />
            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 bg-dark-100 rounded-xl py-3.5 items-center"
                onPress={() => setShowClassModal(false)}
              >
                <Text className="font-lexend-semibold text-sm text-dark-600">
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`flex-1 rounded-xl py-3.5 items-center ${
                  formSubmitting ? "bg-primary-400" : "bg-primary-600"
                }`}
                onPress={handleSaveClass}
                disabled={formSubmitting}
              >
                {formSubmitting ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text className="font-lexend-semibold text-sm text-white">
                    {editingClass ? "Update" : "Create"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Section Create/Edit Modal */}
      <Modal
        visible={showSectionModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSectionModal(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl px-6 pt-6 pb-10">
            <Text className="font-lexend-bold text-lg text-dark-900 mb-4">
              {editingSection ? "Edit Section" : "Create Section"}
            </Text>
            <Text className="font-lexend-medium text-sm text-dark-700 mb-2">
              Section Name
            </Text>
            <TextInput
              className="bg-dark-50 rounded-xl px-4 py-3 font-lexend text-sm text-dark-900 border border-dark-200 mb-5"
              placeholder="e.g. A, B, Section 1"
              placeholderTextColor="#94a3b8"
              value={formName}
              onChangeText={setFormName}
              autoFocus
            />
            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 bg-dark-100 rounded-xl py-3.5 items-center"
                onPress={() => setShowSectionModal(false)}
              >
                <Text className="font-lexend-semibold text-sm text-dark-600">
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`flex-1 rounded-xl py-3.5 items-center ${
                  formSubmitting ? "bg-primary-400" : "bg-primary-600"
                }`}
                onPress={handleSaveSection}
                disabled={formSubmitting}
              >
                {formSubmitting ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text className="font-lexend-semibold text-sm text-white">
                    {editingSection ? "Update" : "Create"}
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
