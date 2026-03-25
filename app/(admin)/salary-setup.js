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
  ScrollView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { useAuthStore, useAppStore } from "../../store";
import { salaryService } from "../../services/admin";

function formatCurrency(amount) {
  return `\u20B9${(amount || 0).toLocaleString("en-IN")}`;
}

export default function SalarySetupScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const academicYear = useAppStore((s) => s.academicYear);
  const skid = user?.skid;
  const academicYearId = academicYear?.id;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [setups, setSetups] = useState([]);
  const [staffList, setStaffList] = useState([]);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Form
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [basicSalary, setBasicSalary] = useState("");
  const [hra, setHra] = useState("");
  const [da, setDa] = useState("");
  const [transport, setTransport] = useState("");
  const [pf, setPf] = useState("");
  const [tax, setTax] = useState("");

  const fetchData = useCallback(async () => {
    if (!skid || !academicYearId) return;
    try {
      const [setupRes, staffRes] = await Promise.allSettled([
        salaryService.getSalarySetups(skid, academicYearId),
        salaryService.getStaffList(skid),
      ]);
      if (setupRes.status === "fulfilled") {
        const res = setupRes.value;
        const list = res?.salary_setups || res?.data?.salary_setups || res?.data || [];
        setSetups(Array.isArray(list) ? list : []);
      }
      if (staffRes.status === "fulfilled") {
        const res = staffRes.value;
        const list = res?.staff || res?.data?.staff || res?.data || [];
        setStaffList(Array.isArray(list) ? list : []);
      }
    } catch (err) {
      console.error("Fetch salary setup error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [skid, academicYearId]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const openCreateModal = () => {
    setEditingItem(null);
    setSelectedStaff(null);
    setBasicSalary("");
    setHra("");
    setDa("");
    setTransport("");
    setPf("");
    setTax("");
    setModalVisible(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setSelectedStaff(item.staff_id);
    setBasicSalary(String(item.basic_salary || ""));
    setHra(String(item.allowances?.hra || ""));
    setDa(String(item.allowances?.da || ""));
    setTransport(String(item.allowances?.transport || ""));
    setPf(String(item.deductions?.pf || ""));
    setTax(String(item.deductions?.tax || ""));
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!selectedStaff) {
      Alert.alert("Error", "Please select a staff member");
      return;
    }
    if (!basicSalary) {
      Alert.alert("Error", "Basic salary is required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        staff_id: selectedStaff,
        basic_salary: parseFloat(basicSalary) || 0,
        allowances: {
          hra: parseFloat(hra) || 0,
          da: parseFloat(da) || 0,
          transport: parseFloat(transport) || 0,
        },
        deductions: {
          pf: parseFloat(pf) || 0,
          tax: parseFloat(tax) || 0,
        },
        academic_year_id: academicYearId,
      };
      if (editingItem) {
        payload.id = editingItem.id;
        await salaryService.updateSalarySetup(skid, payload);
      } else {
        await salaryService.createSalarySetup(skid, payload);
      }
      setModalVisible(false);
      fetchData();
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
        await salaryService.deleteSalarySetup(skid, item.id);
        fetchData();
      } catch (err) {
        const msg = err?.response?.data?.message || "Delete failed";
        Alert.alert("Error", msg);
      }
    };
    if (Platform.OS === "web") {
      if (confirm("Delete this salary setup?")) doDelete();
    } else {
      Alert.alert("Delete Setup", `Remove salary setup for ${item.staff_name}?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: doDelete },
      ]);
    }
  };

  const renderSetup = ({ item }) => (
    <View className="bg-white rounded-2xl p-4 mb-3 shadow-sm">
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-1">
          <Text className="font-lexend-semibold text-base text-dark-900">
            {item.staff_name || "Staff"}
          </Text>
          {item.employee_id && (
            <Text className="font-lexend text-xs text-dark-500 mt-0.5">
              ID: {item.employee_id}
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

      {/* Salary breakdown */}
      <View className="flex-row gap-3 pt-2 border-t border-dark-100 mb-2">
        <View className="flex-1 items-center">
          <Text className="font-lexend text-[10px] text-dark-400">Basic</Text>
          <Text className="font-lexend-bold text-sm text-dark-900">
            {formatCurrency(item.basic_salary)}
          </Text>
        </View>
        <View className="flex-1 items-center">
          <Text className="font-lexend text-[10px] text-dark-400">Gross</Text>
          <Text className="font-lexend-bold text-sm text-green-600">
            {formatCurrency(item.gross_salary)}
          </Text>
        </View>
        <View className="flex-1 items-center">
          <Text className="font-lexend text-[10px] text-dark-400">Net</Text>
          <Text className="font-lexend-bold text-sm text-primary-600">
            {formatCurrency(item.net_salary)}
          </Text>
        </View>
      </View>

      {/* Allowances & Deductions */}
      <View className="flex-row gap-2">
        {item.allowances && Object.keys(item.allowances).some((k) => item.allowances[k] > 0) && (
          <View className="flex-1">
            <Text className="font-lexend text-[10px] text-green-600 mb-1">Allowances</Text>
            {Object.entries(item.allowances).map(
              ([key, val]) =>
                val > 0 && (
                  <Text key={key} className="font-lexend text-[10px] text-dark-500">
                    {key.toUpperCase()}: {formatCurrency(val)}
                  </Text>
                )
            )}
          </View>
        )}
        {item.deductions && Object.keys(item.deductions).some((k) => item.deductions[k] > 0) && (
          <View className="flex-1">
            <Text className="font-lexend text-[10px] text-red-600 mb-1">Deductions</Text>
            {Object.entries(item.deductions).map(
              ([key, val]) =>
                val > 0 && (
                  <Text key={key} className="font-lexend text-[10px] text-dark-500">
                    {key.toUpperCase()}: {formatCurrency(val)}
                  </Text>
                )
            )}
          </View>
        )}
      </View>

      <View className="flex-row items-center pt-2 mt-2 border-t border-dark-100">
        <View className={`w-2 h-2 rounded-full ${item.is_active !== false ? "bg-green-500" : "bg-dark-300"} mr-2`} />
        <Text className="font-lexend text-[10px] text-dark-500">
          {item.is_active !== false ? "Active" : "Inactive"}
        </Text>
      </View>
    </View>
  );

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
            Salary Setup
          </Text>
          <Text className="font-lexend text-xs text-dark-500">
            {setups.length} staff salar{setups.length !== 1 ? "ies" : "y"}
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
        data={setups}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderSetup}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View className="items-center py-12">
            <Text className="font-lexend text-sm text-dark-400">
              No salary setups configured yet
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
          <View className="bg-white rounded-t-3xl p-6 max-h-[85%]">
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text className="font-lexend-bold text-lg text-dark-900 mb-4">
                {editingItem ? "Edit Salary Setup" : "Add Salary Setup"}
              </Text>

              {/* Staff selector */}
              <Text className="font-lexend-medium text-xs text-dark-500 mb-2">
                Staff Member *
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, marginBottom: 16 }}
              >
                {staffList.map((staff) => (
                  <TouchableOpacity
                    key={staff.id}
                    className={`px-4 py-2 rounded-xl ${
                      selectedStaff === staff.id
                        ? "bg-primary-600"
                        : "bg-dark-50 border border-dark-200"
                    }`}
                    onPress={() => setSelectedStaff(staff.id)}
                  >
                    <Text
                      className={`font-lexend-medium text-xs ${
                        selectedStaff === staff.id ? "text-white" : "text-dark-700"
                      }`}
                    >
                      {staff.name || staff.full_name ||
                        `${staff.first_name || ""} ${staff.last_name || ""}`.trim()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Basic Salary */}
              <Text className="font-lexend-medium text-xs text-dark-500 mb-1">
                Basic Salary *
              </Text>
              <TextInput
                className="bg-dark-50 rounded-xl px-4 py-3 font-lexend text-sm text-dark-900 mb-4"
                value={basicSalary}
                onChangeText={setBasicSalary}
                keyboardType="numeric"
                placeholder="25000"
                placeholderTextColor="#94a3b8"
              />

              {/* Allowances */}
              <Text className="font-lexend-semibold text-xs text-green-600 uppercase tracking-wider mb-2">
                Allowances
              </Text>
              <View className="flex-row gap-3 mb-4">
                <View className="flex-1">
                  <Text className="font-lexend text-[10px] text-dark-400 mb-1">HRA</Text>
                  <TextInput
                    className="bg-dark-50 rounded-xl px-4 py-3 font-lexend text-sm text-dark-900"
                    value={hra}
                    onChangeText={setHra}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
                <View className="flex-1">
                  <Text className="font-lexend text-[10px] text-dark-400 mb-1">DA</Text>
                  <TextInput
                    className="bg-dark-50 rounded-xl px-4 py-3 font-lexend text-sm text-dark-900"
                    value={da}
                    onChangeText={setDa}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
                <View className="flex-1">
                  <Text className="font-lexend text-[10px] text-dark-400 mb-1">Transport</Text>
                  <TextInput
                    className="bg-dark-50 rounded-xl px-4 py-3 font-lexend text-sm text-dark-900"
                    value={transport}
                    onChangeText={setTransport}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
              </View>

              {/* Deductions */}
              <Text className="font-lexend-semibold text-xs text-red-600 uppercase tracking-wider mb-2">
                Deductions
              </Text>
              <View className="flex-row gap-3 mb-6">
                <View className="flex-1">
                  <Text className="font-lexend text-[10px] text-dark-400 mb-1">PF</Text>
                  <TextInput
                    className="bg-dark-50 rounded-xl px-4 py-3 font-lexend text-sm text-dark-900"
                    value={pf}
                    onChangeText={setPf}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
                <View className="flex-1">
                  <Text className="font-lexend text-[10px] text-dark-400 mb-1">Tax</Text>
                  <TextInput
                    className="bg-dark-50 rounded-xl px-4 py-3 font-lexend text-sm text-dark-900"
                    value={tax}
                    onChangeText={setTax}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
              </View>

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
