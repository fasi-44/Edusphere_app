import { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { useAuthStore, useAppStore } from "../../store";
import { expenseService } from "../../services/admin";

const CATEGORY_COLORS = {
  "Staff Salaries": "bg-blue-100 text-blue-700",
  "Electricity Bill": "bg-amber-100 text-amber-700",
  "Water Bill": "bg-cyan-100 text-cyan-700",
  "Maintenance": "bg-orange-100 text-orange-700",
  "Infrastructure": "bg-indigo-100 text-indigo-700",
  "Transport/Vehicle Service": "bg-violet-100 text-violet-700",
  "Functions/Events": "bg-pink-100 text-pink-700",
  "Other": "bg-dark-100 text-dark-700",
};

function getCategoryStyle(category) {
  const style = CATEGORY_COLORS[category];
  if (style) {
    const [bg, text] = style.split(" ");
    return { bg, text };
  }
  return { bg: "bg-dark-100", text: "text-dark-700" };
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
}

function formatCurrency(amount) {
  return `\u20B9${parseFloat(amount || 0).toLocaleString("en-IN")}`;
}

function getPaymentMethodLabel(method) {
  switch (method) {
    case "cash": return "Cash";
    case "online": return "Online";
    case "bank_transfer": return "Bank Transfer";
    case "cheque": return "Cheque";
    case "upi": return "UPI";
    default: return method || "";
  }
}

export default function ExpenseListScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const academicYear = useAppStore((s) => s.academicYear);
  const skid = user?.skid;
  const academicYearId = academicYear?.id;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expenses, setExpenses] = useState([]);
  const [totalExpense, setTotalExpense] = useState(0);

  const fetchExpenses = useCallback(async () => {
    if (!skid || !academicYearId) return;
    try {
      const res = await expenseService.getExpenses(skid, academicYearId);
      const list = res?.expenses || res?.data?.expenses || [];
      setExpenses(Array.isArray(list) ? list : []);

      const total = (Array.isArray(list) ? list : []).reduce(
        (sum, e) => sum + parseFloat(e.amount || 0),
        0
      );
      setTotalExpense(total);
    } catch (err) {
      console.error("Fetch expenses error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [skid, academicYearId]);

  useFocusEffect(
    useCallback(() => {
      fetchExpenses();
    }, [fetchExpenses])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchExpenses();
  }, [fetchExpenses]);

  const renderExpense = ({ item }) => {
    const catStyle = getCategoryStyle(item.expense_category);
    return (
      <View className="bg-white rounded-2xl p-4 mb-3 shadow-sm">
        <View className="flex-row items-start justify-between mb-2">
          <View className="flex-1 mr-3">
            <Text className="font-lexend-medium text-sm text-dark-900">
              {item.expense_category || "Expense"}
            </Text>
            {item.vendor_name ? (
              <Text className="font-lexend text-xs text-dark-500 mt-0.5">
                {item.vendor_name}
              </Text>
            ) : null}
            {item.description ? (
              <Text className="font-lexend text-xs text-dark-400 mt-0.5" numberOfLines={2}>
                {item.description}
              </Text>
            ) : null}
          </View>
          <Text className="font-lexend-bold text-base text-rose-600">
            {formatCurrency(item.amount)}
          </Text>
        </View>
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <View className={`${catStyle.bg} px-2.5 py-1 rounded-full`}>
              <Text className={`font-lexend-medium text-[10px] ${catStyle.text}`}>
                {item.expense_category || "Other"}
              </Text>
            </View>
            {item.payment_method && (
              <View className="bg-dark-50 px-2 py-1 rounded-full">
                <Text className="font-lexend text-[10px] text-dark-500">
                  {getPaymentMethodLabel(item.payment_method)}
                </Text>
              </View>
            )}
          </View>
          {item.expense_date && (
            <Text className="font-lexend text-xs text-dark-400">
              {formatDate(item.expense_date)}
            </Text>
          )}
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
            Expenses
          </Text>
          <Text className="font-lexend text-xs text-dark-500">
            {expenses.length} expense{expenses.length !== 1 ? "s" : ""}
          </Text>
        </View>
      </View>

      {/* Total Summary */}
      {totalExpense > 0 && (
        <View className="px-6 pb-3">
          <View className="bg-rose-50 rounded-xl p-4 flex-row items-center justify-between">
            <Text className="font-lexend-medium text-sm text-rose-700">
              Total Expenses
            </Text>
            <Text className="font-lexend-bold text-lg text-rose-700">
              {formatCurrency(totalExpense)}
            </Text>
          </View>
        </View>
      )}

      {/* List */}
      <FlatList
        data={expenses}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderExpense}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View className="items-center py-12">
            <Text className="font-lexend text-sm text-dark-400">
              No expenses recorded
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
