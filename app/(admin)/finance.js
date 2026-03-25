import { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { useAuthStore, useAppStore } from "../../store";
import { dashboardService } from "../../services/admin";

const FinanceCard = ({ title, subtitle, color, onPress }) => (
  <TouchableOpacity
    className="bg-white rounded-2xl p-5 mb-3 flex-row items-center shadow-sm"
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View
      className={`w-12 h-12 rounded-xl ${color} items-center justify-center mr-4`}
    >
      <Text className="font-lexend-bold text-lg text-white">
        {title.charAt(0)}
      </Text>
    </View>
    <View className="flex-1">
      <Text className="font-lexend-semibold text-base text-dark-900">
        {title}
      </Text>
      <Text className="font-lexend text-xs text-dark-500 mt-0.5">
        {subtitle}
      </Text>
    </View>
    <Text className="font-lexend text-dark-300 text-2xl">&rsaquo;</Text>
  </TouchableOpacity>
);

export default function FinanceHub() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const academicYear = useAppStore((s) => s.academicYear);

  const skid = user?.skid;
  const academicYearId = academicYear?.id;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expenseTotal, setExpenseTotal] = useState(0);

  const fetchFinanceData = useCallback(async () => {
    if (!skid || !academicYearId) {
      setLoading(false);
      return;
    }
    try {
      const currentMonth = new Date().getMonth() + 1;
      const res = await dashboardService.getExpenseBreakdown(
        skid,
        academicYearId,
        currentMonth
      );
      setExpenseTotal(res?.data?.breakdown?.total_expenses || res?.data?.total_expenses || 0);
    } catch (err) {
      // Expense data is optional for the hub
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [skid, academicYearId]);

  useFocusEffect(
    useCallback(() => {
      fetchFinanceData();
    }, [fetchFinanceData])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchFinanceData();
  }, [fetchFinanceData]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-dark-50 items-center justify-center">
        <ActivityIndicator size="large" color="#6366f1" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-dark-50">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View className="px-6 pt-4 pb-2">
          <Text className="font-lexend-bold text-2xl text-dark-900">
            Finance
          </Text>
          <Text className="font-lexend text-sm text-dark-500 mt-1">
            Manage fees & track expenses
          </Text>
        </View>

        {/* Expense Summary Card */}
        {expenseTotal > 0 && (
          <View className="px-6 pt-4 pb-6">
            <View className="bg-rose-500 rounded-2xl p-5">
              <Text className="font-lexend text-sm text-white/70">
                This Month's Expenses
              </Text>
              <Text className="font-lexend-bold text-3xl text-white mt-1">
                {"\u20B9"}{expenseTotal.toLocaleString("en-IN")}
              </Text>
            </View>
          </View>
        )}

        {/* Finance Menu Items */}
        <View className="px-6 pb-8">
          <Text className="font-lexend-semibold text-sm text-dark-400 uppercase tracking-wider mb-3">
            Fee Management
          </Text>
          <FinanceCard
            title="Fee Structures"
            subtitle="View fee structures by class"
            color="bg-emerald-500"
            onPress={() => router.push("/(admin)/fee-structures")}
          />

          <Text className="font-lexend-semibold text-sm text-dark-400 uppercase tracking-wider mb-3 mt-6">
            Expense Management
          </Text>
          <FinanceCard
            title="Expenses"
            subtitle="View and track school expenses"
            color="bg-rose-500"
            onPress={() => router.push("/(admin)/expense-list")}
          />

          <Text className="font-lexend-semibold text-sm text-dark-400 uppercase tracking-wider mb-3 mt-6">
            Salary Management
          </Text>
          <FinanceCard
            title="Salary Setup"
            subtitle="Configure staff salaries & allowances"
            color="bg-indigo-500"
            onPress={() => router.push("/(admin)/salary-setup")}
          />
          <FinanceCard
            title="Salary Payments"
            subtitle="Generate and track salary payments"
            color="bg-violet-500"
            onPress={() => router.push("/(admin)/salary-payments")}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
