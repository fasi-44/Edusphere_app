import { useCallback, useState, useMemo } from "react";
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

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const PAYMENT_METHODS = ["Bank Transfer", "Cash", "Cheque", "UPI", "Other"];

function formatCurrency(amount) {
  return `\u20B9${(amount || 0).toLocaleString("en-IN")}`;
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function SummaryCards({ payments }) {
  const totals = useMemo(() => {
    const result = { paid: 0, pending: 0, total: 0 };
    payments.forEach((p) => {
      const amount = parseFloat(String(p.net_amount_paid)) || 0;
      result.total += amount;
      if (p.status === "paid") result.paid += amount;
      else if (p.status === "pending") result.pending += amount;
    });
    return result;
  }, [payments]);

  return (
    <View className="flex-row gap-2 px-6 mb-3">
      <View className="flex-1 bg-green-50 rounded-xl p-3 items-center">
        <Text className="font-lexend text-[9px] text-green-600 uppercase tracking-wider">
          Paid
        </Text>
        <Text className="font-lexend-bold text-sm text-green-700 mt-0.5">
          {formatCurrency(totals.paid)}
        </Text>
      </View>
      <View className="flex-1 bg-amber-50 rounded-xl p-3 items-center">
        <Text className="font-lexend text-[9px] text-amber-600 uppercase tracking-wider">
          Pending
        </Text>
        <Text className="font-lexend-bold text-sm text-amber-700 mt-0.5">
          {formatCurrency(totals.pending)}
        </Text>
      </View>
      <View className="flex-1 bg-primary-50 rounded-xl p-3 items-center">
        <Text className="font-lexend text-[9px] text-primary-600 uppercase tracking-wider">
          Total
        </Text>
        <Text className="font-lexend-bold text-sm text-primary-700 mt-0.5">
          {formatCurrency(totals.total)}
        </Text>
      </View>
    </View>
  );
}

export default function SalaryPaymentsScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const academicYear = useAppStore((s) => s.academicYear);
  const skid = user?.skid;
  const academicYearId = academicYear?.id;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payments, setPayments] = useState([]);

  // Generate modal
  const [generateVisible, setGenerateVisible] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genMonth, setGenMonth] = useState(new Date().getMonth() + 1);
  const [genYear, setGenYear] = useState(new Date().getFullYear());

  // Pay modal
  const [payVisible, setPayVisible] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payingItem, setPayingItem] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("Bank Transfer");
  const [transactionRef, setTransactionRef] = useState("");

  const fetchPayments = useCallback(async () => {
    if (!skid || !academicYearId) return;
    try {
      const res = await salaryService.getSalaryPayments(skid, academicYearId);
      const list = res?.salary_payments || res?.payments || res?.data?.salary_payments || res?.data || [];
      setPayments(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Fetch salary payments error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [skid, academicYearId]);

  useFocusEffect(
    useCallback(() => {
      fetchPayments();
    }, [fetchPayments])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPayments();
  }, [fetchPayments]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await salaryService.generateSalaryPayments(skid, {
        academicYearId,
        month: genMonth,
        year: genYear,
      });
      setGenerateVisible(false);
      Alert.alert("Success", `Salary payments generated for ${MONTHS[genMonth - 1]} ${genYear}`);
      fetchPayments();
    } catch (err) {
      const msg = err?.response?.data?.message || "Generation failed";
      Alert.alert("Error", msg);
    } finally {
      setGenerating(false);
    }
  };

  const openPayModal = (item) => {
    setPayingItem(item);
    setPaymentMethod("Bank Transfer");
    setTransactionRef("");
    setPayVisible(true);
  };

  const handleMarkPaid = async () => {
    if (!payingItem) return;
    setPaying(true);
    try {
      const today = new Date();
      const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      await salaryService.markPaymentPaid(skid, payingItem.id, {
        payment_date: dateStr,
        payment_method: paymentMethod,
        transaction_reference: transactionRef || undefined,
        paid_by: user?.school_user_id || user?.id,
      });
      setPayVisible(false);
      fetchPayments();
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to mark as paid";
      Alert.alert("Error", msg);
    } finally {
      setPaying(false);
    }
  };

  const handleMarkUnpaid = (item) => {
    const doUnpaid = async () => {
      try {
        await salaryService.markPaymentUnpaid(skid, item.id);
        fetchPayments();
      } catch (err) {
        const msg = err?.response?.data?.message || "Failed to mark as unpaid";
        Alert.alert("Error", msg);
      }
    };
    if (Platform.OS === "web") {
      if (confirm("Mark this payment as unpaid?")) doUnpaid();
    } else {
      Alert.alert("Mark Unpaid", "Revert this payment to pending?", [
        { text: "Cancel", style: "cancel" },
        { text: "Mark Unpaid", onPress: doUnpaid },
      ]);
    }
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case "paid": return { bg: "bg-green-100", text: "text-green-700", label: "Paid" };
      case "cancelled": return { bg: "bg-red-100", text: "text-red-700", label: "Cancelled" };
      default: return { bg: "bg-amber-100", text: "text-amber-700", label: "Pending" };
    }
  };

  const renderPayment = ({ item }) => {
    const statusConfig = getStatusConfig(item.status);
    return (
      <View className="bg-white rounded-2xl p-4 mb-3 shadow-sm">
        <View className="flex-row items-start justify-between mb-2">
          <View className="flex-1">
            <Text className="font-lexend-semibold text-base text-dark-900">
              {item.staff_name || "Staff"}
            </Text>
            <Text className="font-lexend text-xs text-dark-500 mt-0.5">
              {MONTHS[(item.payment_month || 1) - 1]} {item.payment_year}
            </Text>
          </View>
          <View className={`${statusConfig.bg} px-2.5 py-1 rounded-full`}>
            <Text className={`font-lexend-bold text-[10px] ${statusConfig.text}`}>
              {statusConfig.label}
            </Text>
          </View>
        </View>

        {/* Amount */}
        <View className="bg-primary-50 rounded-xl p-3 mb-2">
          <Text className="font-lexend text-[10px] text-primary-500">Net Amount</Text>
          <Text className="font-lexend-bold text-xl text-primary-700">
            {formatCurrency(item.net_amount_paid)}
          </Text>
        </View>

        {/* Breakdown */}
        <View className="flex-row gap-3 mb-2">
          <View className="flex-1 items-center">
            <Text className="font-lexend text-[10px] text-dark-400">Basic</Text>
            <Text className="font-lexend-medium text-xs text-dark-900">
              {formatCurrency(item.basic_salary)}
            </Text>
          </View>
          {item.allowances_paid && (
            <View className="flex-1 items-center">
              <Text className="font-lexend text-[10px] text-green-600">Allowances</Text>
              <Text className="font-lexend-medium text-xs text-green-700">
                +{formatCurrency(
                  Object.values(item.allowances_paid || {}).reduce((a, b) => a + (b || 0), 0)
                )}
              </Text>
            </View>
          )}
          {item.deductions_applied && (
            <View className="flex-1 items-center">
              <Text className="font-lexend text-[10px] text-red-600">Deductions</Text>
              <Text className="font-lexend-medium text-xs text-red-700">
                -{formatCurrency(
                  Object.values(item.deductions_applied || {}).reduce((a, b) => a + (b || 0), 0)
                )}
              </Text>
            </View>
          )}
        </View>

        {/* Payment info */}
        {item.payment_date && (
          <Text className="font-lexend text-[10px] text-dark-400 mb-2">
            Paid on: {formatDate(item.payment_date)}
          </Text>
        )}

        {/* Actions */}
        {item.status === "pending" && (
          <TouchableOpacity
            className="bg-green-500 rounded-xl py-2.5 items-center mt-1"
            onPress={() => openPayModal(item)}
          >
            <Text className="font-lexend-semibold text-xs text-white">
              Mark as Paid
            </Text>
          </TouchableOpacity>
        )}
        {item.status === "paid" && (
          <TouchableOpacity
            className="bg-dark-100 rounded-xl py-2.5 items-center mt-1"
            onPress={() => handleMarkUnpaid(item)}
          >
            <Text className="font-lexend-semibold text-xs text-dark-600">
              Mark as Unpaid
            </Text>
          </TouchableOpacity>
        )}
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
            Salary Payments
          </Text>
          <Text className="font-lexend text-xs text-dark-500">
            {payments.length} payment{payments.length !== 1 ? "s" : ""}
          </Text>
        </View>
        <TouchableOpacity
          className="bg-primary-600 px-4 py-2 rounded-xl"
          onPress={() => setGenerateVisible(true)}
        >
          <Text className="font-lexend-semibold text-xs text-white">Generate</Text>
        </TouchableOpacity>
      </View>

      {/* Summary Cards */}
      {payments.length > 0 && <SummaryCards payments={payments} />}

      <FlatList
        data={payments}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderPayment}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View className="items-center py-12">
            <Text className="font-lexend text-sm text-dark-400">
              No salary payments yet
            </Text>
            <Text className="font-lexend text-xs text-dark-300 mt-1">
              Generate payments for a month to get started
            </Text>
          </View>
        }
      />

      {/* Generate Modal */}
      <Modal
        visible={generateVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setGenerateVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6">
            <Text className="font-lexend-bold text-lg text-dark-900 mb-4">
              Generate Salary Payments
            </Text>

            <Text className="font-lexend-medium text-xs text-dark-500 mb-2">
              Month
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, marginBottom: 16 }}
            >
              {MONTHS.map((m, i) => (
                <TouchableOpacity
                  key={m}
                  className={`px-4 py-2 rounded-xl ${
                    genMonth === i + 1
                      ? "bg-primary-600"
                      : "bg-dark-50 border border-dark-200"
                  }`}
                  onPress={() => setGenMonth(i + 1)}
                >
                  <Text
                    className={`font-lexend-medium text-xs ${
                      genMonth === i + 1 ? "text-white" : "text-dark-700"
                    }`}
                  >
                    {m.slice(0, 3)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text className="font-lexend-medium text-xs text-dark-500 mb-1">
              Year
            </Text>
            <TextInput
              className="bg-dark-50 rounded-xl px-4 py-3 font-lexend text-sm text-dark-900 mb-6"
              value={String(genYear)}
              onChangeText={(v) => setGenYear(parseInt(v, 10) || genYear)}
              keyboardType="numeric"
            />

            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 bg-dark-100 rounded-xl py-3 items-center"
                onPress={() => setGenerateVisible(false)}
              >
                <Text className="font-lexend-semibold text-sm text-dark-700">
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-primary-600 rounded-xl py-3 items-center"
                onPress={handleGenerate}
                disabled={generating}
              >
                {generating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text className="font-lexend-semibold text-sm text-white">
                    Generate
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Pay Modal */}
      <Modal
        visible={payVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setPayVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6">
            <Text className="font-lexend-bold text-lg text-dark-900 mb-1">
              Mark as Paid
            </Text>
            {payingItem && (
              <Text className="font-lexend text-sm text-dark-500 mb-4">
                {payingItem.staff_name} - {formatCurrency(payingItem.net_amount_paid)}
              </Text>
            )}

            <Text className="font-lexend-medium text-xs text-dark-500 mb-2">
              Payment Method
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, marginBottom: 16 }}
            >
              {PAYMENT_METHODS.map((method) => (
                <TouchableOpacity
                  key={method}
                  className={`px-4 py-2 rounded-xl ${
                    paymentMethod === method
                      ? "bg-primary-600"
                      : "bg-dark-50 border border-dark-200"
                  }`}
                  onPress={() => setPaymentMethod(method)}
                >
                  <Text
                    className={`font-lexend-medium text-xs ${
                      paymentMethod === method ? "text-white" : "text-dark-700"
                    }`}
                  >
                    {method}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text className="font-lexend-medium text-xs text-dark-500 mb-1">
              Transaction Reference (optional)
            </Text>
            <TextInput
              className="bg-dark-50 rounded-xl px-4 py-3 font-lexend text-sm text-dark-900 mb-6"
              value={transactionRef}
              onChangeText={setTransactionRef}
              placeholder="e.g., TXN123456"
              placeholderTextColor="#94a3b8"
            />

            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 bg-dark-100 rounded-xl py-3 items-center"
                onPress={() => setPayVisible(false)}
              >
                <Text className="font-lexend-semibold text-sm text-dark-700">
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-green-500 rounded-xl py-3 items-center"
                onPress={handleMarkPaid}
                disabled={paying}
              >
                {paying ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text className="font-lexend-semibold text-sm text-white">
                    Confirm Paid
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
