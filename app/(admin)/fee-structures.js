import { useCallback, useState } from "react";
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { useAuthStore, useAppStore } from "../../store";
import { feeService } from "../../services/admin";

function formatCurrency(amount) {
  return `\u20B9${(amount || 0).toLocaleString("en-IN")}`;
}

function getRecurrenceLabel(item) {
  if (!item.is_recurring) return "One-time";
  if (item.recurrence_type === "MONTHLY" && item.recurrence_months) {
    return `${formatCurrency(item.recurrence_amount)}/mo \u00D7 ${item.recurrence_months}`;
  }
  return item.recurrence_type || "Recurring";
}

export default function FeeStructuresScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const academicYear = useAppStore((s) => s.academicYear);
  const skid = user?.skid;
  const academicYearId = academicYear?.id;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feeItems, setFeeItems] = useState([]);

  const fetchStructures = useCallback(async () => {
    if (!skid || !academicYearId) return;
    try {
      const res = await feeService.getFeeStructures(skid, academicYearId);
      const list = res?.data || [];
      setFeeItems(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Fetch fee structures error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [skid, academicYearId]);

  useFocusEffect(
    useCallback(() => {
      fetchStructures();
    }, [fetchStructures])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchStructures();
  }, [fetchStructures]);

  // Group fee items by class
  const sections = (() => {
    const classMap = {};
    feeItems.forEach((item) => {
      const classId = item.class_id;
      const className = item.class?.class_name || `Class ${classId}`;
      if (!classMap[classId]) {
        classMap[classId] = { title: className, classId, data: [], total: 0 };
      }
      classMap[classId].data.push(item);
      classMap[classId].total += item.amount || 0;
    });
    return Object.values(classMap);
  })();

  const renderItem = ({ item }) => (
    <View className="bg-white mx-6 px-4 py-3 border-b border-dark-100">
      <View className="flex-row items-center justify-between">
        <View className="flex-1 mr-3">
          <Text className="font-lexend-medium text-sm text-dark-900">
            {item.fee_name}
          </Text>
          <View className="flex-row items-center gap-2 mt-1">
            <Text className="font-lexend text-[10px] text-dark-400">
              {getRecurrenceLabel(item)}
            </Text>
            {item.is_mandatory && (
              <View className="bg-red-50 px-1.5 py-0.5 rounded">
                <Text className="font-lexend text-[10px] text-red-600">
                  Mandatory
                </Text>
              </View>
            )}
            {item.allows_installments && (
              <View className="bg-blue-50 px-1.5 py-0.5 rounded">
                <Text className="font-lexend text-[10px] text-blue-600">
                  Installments
                </Text>
              </View>
            )}
          </View>
        </View>
        <Text className="font-lexend-bold text-sm text-dark-900">
          {formatCurrency(item.amount)}
        </Text>
      </View>
    </View>
  );

  const renderSectionHeader = ({ section }) => (
    <View className="mx-6 mt-4 bg-white rounded-t-2xl px-4 pt-4 pb-2">
      <View className="flex-row items-center justify-between">
        <Text className="font-lexend-bold text-base text-dark-900">
          {section.title}
        </Text>
        <Text className="font-lexend-bold text-base text-emerald-600">
          {formatCurrency(section.total)}
        </Text>
      </View>
      <Text className="font-lexend text-xs text-dark-400 mt-0.5">
        {section.data.length} fee{section.data.length !== 1 ? "s" : ""}
      </Text>
    </View>
  );

  const renderSectionFooter = () => (
    <View className="mx-6 bg-white rounded-b-2xl h-3 mb-3 shadow-sm" />
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
            Fee Structures
          </Text>
          <Text className="font-lexend text-xs text-dark-500">
            {feeItems.length} fee{feeItems.length !== 1 ? "s" : ""} across{" "}
            {sections.length} class{sections.length !== 1 ? "es" : ""}
          </Text>
        </View>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        renderSectionFooter={renderSectionFooter}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View className="items-center py-12">
            <Text className="font-lexend text-sm text-dark-400">
              No fee structures configured
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
