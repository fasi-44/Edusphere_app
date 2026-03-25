import { useCallback, useState } from "react";
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
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { useAuthStore } from "../../store";
import { examService } from "../../services/admin";

const CATEGORIES = ["Formative", "Summative", "Annual"];

export default function ExamTypesScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const skid = user?.skid;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [examTypes, setExamTypes] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Form state
  const [examName, setExamName] = useState("");
  const [examCode, setExamCode] = useState("");
  const [category, setCategory] = useState("Formative");
  const [sequenceOrder, setSequenceOrder] = useState("");

  const fetchExamTypes = useCallback(async () => {
    if (!skid) return;
    try {
      const res = await examService.getExamTypes(skid);
      const list = res?.data?.exam_types || res?.data || [];
      setExamTypes(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Fetch exam types error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [skid]);

  useFocusEffect(
    useCallback(() => {
      fetchExamTypes();
    }, [fetchExamTypes])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchExamTypes();
  }, [fetchExamTypes]);

  const openCreateModal = () => {
    setEditingItem(null);
    setExamName("");
    setExamCode("");
    setCategory("Formative");
    setSequenceOrder("");
    setModalVisible(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setExamName(item.exam_name || "");
    setExamCode(item.exam_code || "");
    setCategory(item.exam_category || "Formative");
    setSequenceOrder(String(item.sequence_order || ""));
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!examName.trim() || !examCode.trim()) {
      Alert.alert("Error", "Exam name and code are required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        exam_name: examName.trim(),
        exam_code: examCode.trim().toUpperCase(),
        exam_category: category,
        sequence_order: sequenceOrder ? parseInt(sequenceOrder, 10) : 1,
        is_active: true,
      };
      if (editingItem) {
        await examService.updateExamType(skid, editingItem.id, payload);
      } else {
        await examService.createExamType(skid, payload);
      }
      setModalVisible(false);
      fetchExamTypes();
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
        await examService.deleteExamType(skid, item.id);
        fetchExamTypes();
      } catch (err) {
        const msg = err?.response?.data?.message || "Delete failed";
        Alert.alert("Error", msg);
      }
    };
    if (Platform.OS === "web") {
      if (confirm("Delete this exam type?")) doDelete();
    } else {
      Alert.alert("Delete Exam Type", `Delete "${item.exam_name}"?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: doDelete },
      ]);
    }
  };

  const getCategoryColor = (cat) => {
    switch (cat) {
      case "Formative": return { bg: "bg-blue-100", text: "text-blue-700" };
      case "Summative": return { bg: "bg-purple-100", text: "text-purple-700" };
      case "Annual": return { bg: "bg-amber-100", text: "text-amber-700" };
      default: return { bg: "bg-dark-100", text: "text-dark-600" };
    }
  };

  const renderItem = ({ item }) => {
    const catColor = getCategoryColor(item.exam_category);
    return (
      <View className="bg-white rounded-2xl p-4 mb-3 shadow-sm">
        <View className="flex-row items-start justify-between mb-2">
          <View className="flex-1">
            <Text className="font-lexend-semibold text-base text-dark-900">
              {item.exam_name}
            </Text>
            <View className="flex-row items-center gap-2 mt-1.5">
              <View className="bg-primary-100 px-2 py-0.5 rounded-full">
                <Text className="font-lexend-medium text-[10px] text-primary-700">
                  {item.exam_code}
                </Text>
              </View>
              <View className={`${catColor.bg} px-2 py-0.5 rounded-full`}>
                <Text className={`font-lexend-medium text-[10px] ${catColor.text}`}>
                  {item.exam_category}
                </Text>
              </View>
              {item.sequence_order && (
                <Text className="font-lexend text-[10px] text-dark-400">
                  #{item.sequence_order}
                </Text>
              )}
            </View>
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
        <View className="flex-row items-center pt-2 border-t border-dark-100">
          <View className={`w-2 h-2 rounded-full ${item.is_active !== false ? "bg-green-500" : "bg-dark-300"} mr-2`} />
          <Text className="font-lexend text-xs text-dark-500">
            {item.is_active !== false ? "Active" : "Inactive"}
          </Text>
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
            Exam Types
          </Text>
          <Text className="font-lexend text-xs text-dark-500">
            {examTypes.length} exam type{examTypes.length !== 1 ? "s" : ""}
          </Text>
        </View>
        <TouchableOpacity
          className="bg-primary-600 px-4 py-2 rounded-xl"
          onPress={openCreateModal}
        >
          <Text className="font-lexend-semibold text-xs text-white">+ Add</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={examTypes}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View className="items-center py-12">
            <Text className="font-lexend text-sm text-dark-400">
              No exam types configured yet
            </Text>
          </View>
        }
      />

      {/* Create/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6 max-h-[80%]">
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text className="font-lexend-bold text-lg text-dark-900 mb-4">
                {editingItem ? "Edit Exam Type" : "Add Exam Type"}
              </Text>

              <Text className="font-lexend-medium text-xs text-dark-500 mb-1">
                Exam Name *
              </Text>
              <TextInput
                className="bg-dark-50 rounded-xl px-4 py-3 font-lexend text-sm text-dark-900 mb-4"
                value={examName}
                onChangeText={setExamName}
                placeholder="e.g., First Term Examination"
                placeholderTextColor="#94a3b8"
              />

              <Text className="font-lexend-medium text-xs text-dark-500 mb-1">
                Exam Code *
              </Text>
              <TextInput
                className="bg-dark-50 rounded-xl px-4 py-3 font-lexend text-sm text-dark-900 mb-4"
                value={examCode}
                onChangeText={setExamCode}
                placeholder="e.g., FTE or FA1"
                placeholderTextColor="#94a3b8"
                maxLength={20}
                autoCapitalize="characters"
              />

              <Text className="font-lexend-medium text-xs text-dark-500 mb-2">
                Category
              </Text>
              <View className="flex-row gap-2 mb-4">
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    className={`px-4 py-2 rounded-xl ${
                      category === cat
                        ? "bg-primary-600"
                        : "bg-dark-50 border border-dark-200"
                    }`}
                    onPress={() => setCategory(cat)}
                  >
                    <Text
                      className={`font-lexend-medium text-xs ${
                        category === cat ? "text-white" : "text-dark-700"
                      }`}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text className="font-lexend-medium text-xs text-dark-500 mb-1">
                Sequence Order
              </Text>
              <TextInput
                className="bg-dark-50 rounded-xl px-4 py-3 font-lexend text-sm text-dark-900 mb-6"
                value={sequenceOrder}
                onChangeText={setSequenceOrder}
                placeholder="1"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
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
