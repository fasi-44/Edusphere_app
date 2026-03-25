import { useCallback, useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { useAuthStore } from "../../store";
import { examService, classService, subjectService } from "../../services/admin";

export default function ExamSubjectsScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const skid = user?.skid;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter state
  const [examTypes, setExamTypes] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedExamType, setSelectedExamType] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);

  // Configs
  const [configs, setConfigs] = useState([]);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Form fields
  const [formSubjectId, setFormSubjectId] = useState(null);
  const [hasInternalExternal, setHasInternalExternal] = useState(false);
  const [internalMax, setInternalMax] = useState("");
  const [externalMax, setExternalMax] = useState("");
  const [totalMax, setTotalMax] = useState("");
  const [minPassing, setMinPassing] = useState("");
  const [weightage, setWeightage] = useState("");

  // Fetch exam types and classes on mount
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
        setLoading(false);
      });
    }, [skid])
  );

  // Fetch subjects when class changes
  useEffect(() => {
    if (!skid || !selectedClass) {
      setSubjects([]);
      return;
    }
    subjectService
      .getSubjects(skid, selectedClass)
      .then((res) => {
        const list = res?.data?.subjects || res?.data || [];
        setSubjects(Array.isArray(list) ? list : []);
      })
      .catch(() => setSubjects([]));
  }, [skid, selectedClass]);

  // Fetch configs when exam type + class selected
  const fetchConfigs = useCallback(async () => {
    if (!skid || !selectedExamType || !selectedClass) {
      setConfigs([]);
      return;
    }
    try {
      const res = await examService.getExamConfigs(skid, {
        examTypeId: selectedExamType,
        classId: selectedClass,
      });
      const list = res?.data?.configs || res?.data?.exam_configs || res?.data || [];
      setConfigs(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Fetch configs error:", err);
      setConfigs([]);
    } finally {
      setRefreshing(false);
    }
  }, [skid, selectedExamType, selectedClass]);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchConfigs();
  }, [fetchConfigs]);

  const openCreateModal = () => {
    setEditingItem(null);
    setFormSubjectId(null);
    setHasInternalExternal(false);
    setInternalMax("");
    setExternalMax("");
    setTotalMax("100");
    setMinPassing("35");
    setWeightage("100");
    setModalVisible(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFormSubjectId(item.subject_id);
    setHasInternalExternal(item.has_internal_external || false);
    setInternalMax(String(item.internal_max_marks || ""));
    setExternalMax(String(item.external_max_marks || ""));
    setTotalMax(String(item.total_max_marks || ""));
    setMinPassing(String(item.min_passing_marks || ""));
    setWeightage(String(item.weightage_percentage || ""));
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!formSubjectId) {
      Alert.alert("Error", "Please select a subject");
      return;
    }
    if (!totalMax) {
      Alert.alert("Error", "Total max marks is required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        exam_type_id: selectedExamType,
        class_id: selectedClass,
        subject_id: formSubjectId,
        has_internal_external: hasInternalExternal,
        internal_max_marks: hasInternalExternal ? parseFloat(internalMax) || 0 : 0,
        external_max_marks: hasInternalExternal ? parseFloat(externalMax) || 0 : 0,
        total_max_marks: parseFloat(totalMax) || 100,
        min_passing_marks: parseFloat(minPassing) || 0,
        weightage_percentage: parseFloat(weightage) || 100,
      };
      if (editingItem) {
        await examService.updateExamConfig(skid, editingItem.id, payload);
      } else {
        await examService.createExamConfig(skid, payload);
      }
      setModalVisible(false);
      fetchConfigs();
    } catch (err) {
      const msg = err?.response?.data?.message || "Save failed";
      Alert.alert("Error", msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (item) => {
    const doDelete = async () => {
      try {
        await examService.deleteExamConfig(skid, item.id);
        fetchConfigs();
      } catch (err) {
        const msg = err?.response?.data?.message || "Delete failed";
        Alert.alert("Error", msg);
      }
    };
    if (Platform.OS === "web") {
      if (confirm("Delete this configuration?")) doDelete();
    } else {
      Alert.alert("Delete Config", "Remove this subject configuration?", [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: doDelete },
      ]);
    }
  };

  const renderConfig = ({ item }) => {
    const subject = subjects.find((s) => s.id === item.subject_id);
    const subjectName = subject?.subject_name || "Subject";
    const subjectCode = subject?.subject_code;
    return (
    <View className="bg-white rounded-2xl p-4 mb-3 shadow-sm">
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-1">
          <Text className="font-lexend-semibold text-base text-dark-900">
            {subjectName}
          </Text>
          {subjectCode && (
            <Text className="font-lexend text-xs text-dark-500 mt-0.5">
              {subjectCode}
            </Text>
          )}
        </View>
        <View className="flex-row gap-2">
          <TouchableOpacity
            className="w-8 h-8 rounded-full bg-blue-50 items-center justify-center"
            onPress={() => openEditModal(item)}
          >
            <Text className="text-blue-600 text-sm">&#9998;</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="w-8 h-8 rounded-full bg-red-50 items-center justify-center"
            onPress={() => handleDelete(item)}
          >
            <Text className="text-red-600 text-sm">&#128465;</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View className="flex-row gap-3 pt-2 border-t border-dark-100">
        <View className="flex-1 items-center">
          <Text className="font-lexend text-[10px] text-dark-400">Max</Text>
          <Text className="font-lexend-bold text-sm text-dark-900">
            {item.total_max_marks || "-"}
          </Text>
        </View>
        <View className="flex-1 items-center">
          <Text className="font-lexend text-[10px] text-dark-400">Pass</Text>
          <Text className="font-lexend-bold text-sm text-dark-900">
            {item.min_passing_marks || "-"}
          </Text>
        </View>
        {item.has_internal_external && (
          <>
            <View className="flex-1 items-center">
              <Text className="font-lexend text-[10px] text-dark-400">Int.</Text>
              <Text className="font-lexend-bold text-sm text-blue-600">
                {item.internal_max_marks || "-"}
              </Text>
            </View>
            <View className="flex-1 items-center">
              <Text className="font-lexend text-[10px] text-dark-400">Ext.</Text>
              <Text className="font-lexend-bold text-sm text-indigo-600">
                {item.external_max_marks || "-"}
              </Text>
            </View>
          </>
        )}
        <View className="flex-1 items-center">
          <Text className="font-lexend text-[10px] text-dark-400">Weight</Text>
          <Text className="font-lexend-bold text-sm text-dark-900">
            {item.weightage_percentage || 100}%
          </Text>
        </View>
      </View>
    </View>
    );
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
            Exam Subject Config
          </Text>
          <Text className="font-lexend text-xs text-dark-500">
            Configure marks per subject
          </Text>
        </View>
      </View>

      {/* Filters */}
      <View className="bg-white px-6 py-4 mb-2">
        <Text className="font-lexend-medium text-xs text-dark-500 mb-2">
          Exam Type
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, marginBottom: 12 }}
        >
          {examTypes.map((et) => (
            <TouchableOpacity
              key={et.id}
              className={`px-4 py-2 rounded-full ${
                selectedExamType === et.id
                  ? "bg-primary-600"
                  : "bg-dark-50 border border-dark-200"
              }`}
              onPress={() => setSelectedExamType(et.id)}
            >
              <Text
                className={`font-lexend-medium text-xs ${
                  selectedExamType === et.id ? "text-white" : "text-dark-700"
                }`}
              >
                {et.exam_name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text className="font-lexend-medium text-xs text-dark-500 mb-2">
          Class
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {classes.map((cls) => (
            <TouchableOpacity
              key={cls.id}
              className={`px-4 py-2 rounded-full ${
                selectedClass === cls.id
                  ? "bg-green-500"
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
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      {!selectedExamType || !selectedClass ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="font-lexend text-sm text-dark-400 text-center">
            Select an exam type and class to view configurations
          </Text>
        </View>
      ) : (
        <>
          {/* Add button */}
          <View className="px-6 mb-2">
            <TouchableOpacity
              className="bg-primary-600 rounded-xl py-3 items-center"
              onPress={openCreateModal}
            >
              <Text className="font-lexend-semibold text-sm text-white">
                + Add Subject Config
              </Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={configs}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderConfig}
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
              <View className="items-center py-12">
                <Text className="font-lexend text-sm text-dark-400">
                  No subject configurations yet
                </Text>
              </View>
            }
          />
        </>
      )}

      {/* Create/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6 max-h-[85%]">
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text className="font-lexend-bold text-lg text-dark-900 mb-4">
                {editingItem ? "Edit Configuration" : "Add Subject Configuration"}
              </Text>

              {/* Subject Selector */}
              <Text className="font-lexend-medium text-xs text-dark-500 mb-2">
                Subject *
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, marginBottom: 16 }}
              >
                {subjects
                  .filter((sub) => {
                    if (editingItem) return true;
                    const configuredIds = configs.map((c) => c.subject_id);
                    return !configuredIds.includes(sub.id);
                  })
                  .map((sub) => (
                  <TouchableOpacity
                    key={sub.id}
                    className={`px-4 py-2 rounded-xl ${
                      formSubjectId === sub.id
                        ? "bg-primary-600"
                        : "bg-dark-50 border border-dark-200"
                    }`}
                    onPress={() => setFormSubjectId(sub.id)}
                  >
                    <Text
                      className={`font-lexend-medium text-xs ${
                        formSubjectId === sub.id ? "text-white" : "text-dark-700"
                      }`}
                    >
                      {sub.subject_name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Internal/External toggle */}
              <TouchableOpacity
                className="flex-row items-center mb-4"
                onPress={() => setHasInternalExternal(!hasInternalExternal)}
              >
                <View
                  className={`w-5 h-5 rounded border-2 mr-3 items-center justify-center ${
                    hasInternalExternal
                      ? "bg-primary-600 border-primary-600"
                      : "border-dark-300"
                  }`}
                >
                  {hasInternalExternal && (
                    <Text className="text-white text-[10px] font-lexend-bold">
                      &#10003;
                    </Text>
                  )}
                </View>
                <Text className="font-lexend-medium text-sm text-dark-900">
                  Has Internal & External marks
                </Text>
              </TouchableOpacity>

              {hasInternalExternal && (
                <View className="flex-row gap-3 mb-4">
                  <View className="flex-1">
                    <Text className="font-lexend-medium text-xs text-dark-500 mb-1">
                      Internal Max
                    </Text>
                    <TextInput
                      className="bg-dark-50 rounded-xl px-4 py-3 font-lexend text-sm text-dark-900"
                      value={internalMax}
                      onChangeText={setInternalMax}
                      keyboardType="numeric"
                      placeholder="20"
                      placeholderTextColor="#94a3b8"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="font-lexend-medium text-xs text-dark-500 mb-1">
                      External Max
                    </Text>
                    <TextInput
                      className="bg-dark-50 rounded-xl px-4 py-3 font-lexend text-sm text-dark-900"
                      value={externalMax}
                      onChangeText={setExternalMax}
                      keyboardType="numeric"
                      placeholder="80"
                      placeholderTextColor="#94a3b8"
                    />
                  </View>
                </View>
              )}

              <View className="flex-row gap-3 mb-4">
                <View className="flex-1">
                  <Text className="font-lexend-medium text-xs text-dark-500 mb-1">
                    Total Max Marks *
                  </Text>
                  <TextInput
                    className="bg-dark-50 rounded-xl px-4 py-3 font-lexend text-sm text-dark-900"
                    value={totalMax}
                    onChangeText={setTotalMax}
                    keyboardType="numeric"
                    placeholder="100"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
                <View className="flex-1">
                  <Text className="font-lexend-medium text-xs text-dark-500 mb-1">
                    Min Passing
                  </Text>
                  <TextInput
                    className="bg-dark-50 rounded-xl px-4 py-3 font-lexend text-sm text-dark-900"
                    value={minPassing}
                    onChangeText={setMinPassing}
                    keyboardType="numeric"
                    placeholder="35"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
              </View>

              <Text className="font-lexend-medium text-xs text-dark-500 mb-1">
                Weightage %
              </Text>
              <TextInput
                className="bg-dark-50 rounded-xl px-4 py-3 font-lexend text-sm text-dark-900 mb-6"
                value={weightage}
                onChangeText={setWeightage}
                keyboardType="numeric"
                placeholder="100"
                placeholderTextColor="#94a3b8"
              />

              <View className="flex-row gap-3">
                <TouchableOpacity
                  className="flex-1 bg-dark-100 rounded-xl py-3 items-center"
                  onPress={() => setModalVisible(false)}
                >
                  <Text className="font-lexend-semibold text-sm text-dark-700">
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 bg-primary-600 rounded-xl py-3 items-center"
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text className="font-lexend-semibold text-sm text-white">
                      {editingItem ? "Update" : "Create"}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
