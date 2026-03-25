import { useState, useCallback } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { useAuthStore, useAppStore, useParentStore } from "../../store";
import { feeService } from "../../services/parent";
import ChildSelector, { useChildSelectorScroll } from "../../components/ChildSelector";

const STATUS_CONFIG = {
    PAID: { label: "Paid", bg: "bg-green-100", text: "text-green-700" },
    PARTIAL: { label: "Partial", bg: "bg-amber-100", text: "text-amber-700" },
    PENDING: { label: "Pending", bg: "bg-orange-100", text: "text-orange-700" },
    OVERDUE: { label: "Overdue", bg: "bg-red-100", text: "text-red-700" },
    CANCELLED: { label: "Cancelled", bg: "bg-dark-100", text: "text-dark-500" },
};

function formatCurrency(amount) {
    if (amount == null) return "₹0";
    return `₹${Number(amount).toLocaleString("en-IN")}`;
}

function formatDate(dateStr) {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

function StatusBadge({ status }) {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
    return (
        <View className={`rounded-full px-2.5 py-1 ${config.bg}`}>
            <Text className={`font-lexend-bold text-[10px] ${config.text}`}>{config.label}</Text>
        </View>
    );
}

export default function ParentFeesScreen() {
    const user = useAuthStore((s) => s.user);
    const academicYear = useAppStore((s) => s.academicYear);
    const selectedChild = useParentStore((s) => s.selectedChild);

    const skid = user?.skid;
    const studentId = selectedChild?.student_id;
    const academicYearId = academicYear?.id;

    const { translateY, onScroll, selectorHeight } = useChildSelectorScroll();
    const [summary, setSummary] = useState(null);
    const [fees, setFees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchFees = useCallback(async () => {
        if (!skid || !studentId || !academicYearId) {
            setSummary(null);
            setFees([]);
            setLoading(false);
            setRefreshing(false);
            return;
        }
        try {
            const res = await feeService.getStudentFeeSummary(skid, studentId, academicYearId);
            const data = res?.data?.data || res?.data || {};
            setSummary({
                total_amount: data.total_amount || 0,
                total_paid: data.total_paid || 0,
                total_discount: data.total_discount || 0,
                balance: data.balance || 0,
            });
            setFees(Array.isArray(data.fees) ? data.fees : []);
        } catch (err) {
            console.error("Fee fetch error:", err);
            setSummary(null);
            setFees([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [skid, studentId, academicYearId]);

    useFocusEffect(
        useCallback(() => {
            setLoading(true);
            fetchFees();
        }, [fetchFees])
    );

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchFees();
    }, [fetchFees]);

    return (
        <SafeAreaView className="flex-1 bg-dark-50">
            <ChildSelector translateY={translateY} />

            {!selectedChild ? (
                <View className="flex-1 items-center justify-center" style={{ paddingTop: selectorHeight }}>
                    <Text className="font-lexend text-sm text-dark-400 italic">No child selected.</Text>
                </View>
            ) : (
                <ScrollView
                    className="flex-1"
                    showsVerticalScrollIndicator={false}
                    onScroll={onScroll}
                    scrollEventThrottle={16}
                    contentContainerStyle={{ paddingTop: selectorHeight }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                >
                    {/* Header */}
                    <View className="bg-white px-6 pt-4 pb-4">
                        <Text className="font-lexend-bold text-xl text-dark-900">Fee Details</Text>
                        <Text className="font-lexend text-xs text-dark-400 mt-0.5">
                            {selectedChild.first_name}'s fee summary
                            {academicYear?.name ? ` - ${academicYear.name}` : ""}
                        </Text>
                    </View>
                        {loading ? (
                            <View className="items-center py-16">
                                <ActivityIndicator size="large" color="#6366f1" />
                            </View>
                        ) : !summary ? (
                            <View className="px-6 py-16 items-center">
                                <Text className="font-lexend-semibold text-base text-dark-500">
                                    No fee data available
                                </Text>
                                <Text className="font-lexend text-sm text-dark-400 mt-1 text-center">
                                    Fees have not been assigned yet for this academic year.
                                </Text>
                            </View>
                        ) : (
                            <View className="px-4 pt-4 pb-8">
                                {/* Summary Cards */}
                                <View className="flex-row flex-wrap gap-2.5 mb-5">
                                    <SummaryCard
                                        label="Total"
                                        value={formatCurrency(summary.total_amount)}
                                        color="primary"
                                    />
                                    <SummaryCard
                                        label="Paid"
                                        value={formatCurrency(summary.total_paid)}
                                        color="green"
                                    />
                                    <SummaryCard
                                        label="Discount"
                                        value={formatCurrency(summary.total_discount)}
                                        color="blue"
                                    />
                                    <SummaryCard
                                        label="Balance"
                                        value={formatCurrency(summary.balance)}
                                        color="red"
                                    />
                                </View>

                                {/* Fee Breakdown */}
                                <Text className="font-lexend-semibold text-base text-dark-800 mb-3 px-1">
                                    Fee Breakdown
                                </Text>

                                {fees.length === 0 ? (
                                    <View className="bg-white rounded-2xl p-5 items-center">
                                        <Text className="font-lexend text-sm text-dark-400 italic">
                                            No fees assigned.
                                        </Text>
                                    </View>
                                ) : (
                                    fees.map((fee) => (
                                        <FeeCard key={fee.id} fee={fee} skid={skid} />
                                    ))
                                )}
                            </View>
                        )}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

function SummaryCard({ label, value, color }) {
    const colorMap = {
        primary: { bg: "bg-primary-50", text: "text-primary-700", value: "text-primary-600" },
        green: { bg: "bg-green-50", text: "text-green-700", value: "text-green-600" },
        blue: { bg: "bg-blue-50", text: "text-blue-700", value: "text-blue-600" },
        red: { bg: "bg-red-50", text: "text-red-700", value: "text-red-600" },
    };
    const c = colorMap[color] || colorMap.primary;

    return (
        <View
            className={`${c.bg} rounded-2xl p-3.5`}
            style={{ width: "48%", flexGrow: 1 }}
        >
            <Text className={`font-lexend text-[10px] uppercase tracking-widest ${c.text} mb-1`}>
                {label}
            </Text>
            <Text className={`font-lexend-bold text-lg ${c.value}`}>{value}</Text>
        </View>
    );
}

function FeeCard({ fee, skid }) {
    const [expanded, setExpanded] = useState(false);
    const [installments, setInstallments] = useState([]);
    const [installmentsLoading, setInstallmentsLoading] = useState(false);

    const feeName = fee.fee_structure?.fee_name || "Fee";
    const description = fee.fee_structure?.description || "";
    const isRecurring = fee.fee_structure?.is_recurring;
    const recurrenceType = fee.fee_structure?.recurrence_type;
    const recurrenceAmount = fee.fee_structure?.recurrence_amount;
    const recurrenceMonths = fee.fee_structure?.recurrence_months;
    const hasInstallments = fee.has_installments;

    const handleToggle = async () => {
        if (!expanded && hasInstallments && installments.length === 0) {
            setInstallmentsLoading(true);
            try {
                const res = await feeService.getInstallments(skid, fee.id);
                const data = res?.data?.data || res?.data || [];
                setInstallments(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error("Installments fetch error:", err);
            } finally {
                setInstallmentsLoading(false);
            }
        }
        setExpanded(!expanded);
    };

    return (
        <View className="bg-white rounded-2xl mb-3 overflow-hidden"
            style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 }}
        >
            <TouchableOpacity
                className="p-4"
                onPress={handleToggle}
                activeOpacity={0.7}
            >
                {/* Top row: name + status */}
                <View className="flex-row items-start justify-between mb-2">
                    <View className="flex-1 mr-3">
                        <Text className="font-lexend-semibold text-[15px] text-dark-800">
                            {feeName}
                        </Text>
                        {description ? (
                            <Text className="font-lexend text-xs text-dark-400 mt-0.5" numberOfLines={1}>
                                {description}
                            </Text>
                        ) : null}
                    </View>
                    <StatusBadge status={fee.status} />
                </View>

                {/* Tags row */}
                <View className="flex-row flex-wrap gap-1.5 mb-3">
                    {isRecurring && (
                        <View className="bg-indigo-50 rounded-full px-2 py-0.5">
                            <Text className="font-lexend text-[10px] text-indigo-600">
                                {recurrenceType || "Recurring"}
                            </Text>
                        </View>
                    )}
                    {isRecurring && recurrenceAmount && recurrenceMonths && (
                        <View className="bg-dark-50 rounded-full px-2 py-0.5">
                            <Text className="font-lexend text-[10px] text-dark-500">
                                {formatCurrency(recurrenceAmount)} x {recurrenceMonths} months
                            </Text>
                        </View>
                    )}
                    {hasInstallments && (
                        <View className="bg-purple-50 rounded-full px-2 py-0.5">
                            <Text className="font-lexend text-[10px] text-purple-600">Installment Mode</Text>
                        </View>
                    )}
                </View>

                {/* Amount row */}
                <View className="flex-row justify-between">
                    <AmountBlock label="Total" value={formatCurrency(fee.total_amount)} />
                    <AmountBlock label="Paid" value={formatCurrency(fee.paid_amount)} color="text-green-600" />
                    <AmountBlock label="Discount" value={formatCurrency(fee.discount_amount)} color="text-blue-600" />
                    <AmountBlock label="Balance" value={formatCurrency(fee.balance_amount)} color="text-red-600" />
                </View>

                {/* Expand indicator */}
                {hasInstallments && (
                    <View className="items-center mt-3">
                        <Text className="font-lexend text-xs text-primary-500">
                            {expanded ? "Hide installments ▲" : "View installments ▼"}
                        </Text>
                    </View>
                )}

                {/* Payment history toggle for non-installment fees */}
                {!hasInstallments && fee.payments && fee.payments.length > 0 && (
                    <View className="items-center mt-3">
                        <Text className="font-lexend text-xs text-primary-500">
                            {expanded ? "Hide payments ▲" : `View payments (${fee.payments.length}) ▼`}
                        </Text>
                    </View>
                )}
            </TouchableOpacity>

            {/* Expanded: Installments or Payments */}
            {expanded && (
                <View className="px-4 pb-4 border-t border-dark-100 pt-3">
                    {hasInstallments ? (
                        installmentsLoading ? (
                            <ActivityIndicator size="small" color="#6366f1" />
                        ) : installments.length === 0 ? (
                            <Text className="font-lexend text-xs text-dark-400 italic text-center py-2">
                                No installments found.
                            </Text>
                        ) : (
                            installments.map((inst) => (
                                <InstallmentRow key={inst.id} installment={inst} />
                            ))
                        )
                    ) : fee.payments && fee.payments.length > 0 ? (
                        fee.payments
                            .filter((p) => !p.is_cancelled)
                            .map((payment) => (
                                <PaymentRow key={payment.id} payment={payment} />
                            ))
                    ) : (
                        <Text className="font-lexend text-xs text-dark-400 italic text-center py-2">
                            No payment history.
                        </Text>
                    )}
                </View>
            )}
        </View>
    );
}

function AmountBlock({ label, value, color = "text-dark-700" }) {
    return (
        <View className="items-center">
            <Text className="font-lexend text-[9px] text-dark-400 uppercase tracking-widest mb-0.5">
                {label}
            </Text>
            <Text className={`font-lexend-bold text-sm ${color}`}>{value}</Text>
        </View>
    );
}

function InstallmentRow({ installment }) {
    const isDue = installment.status !== "PAID" && installment.due_date;
    const dueDate = new Date(installment.due_date);
    const isOverdue = isDue && dueDate < new Date();

    return (
        <View className="flex-row items-center py-2.5 border-b border-dark-50">
            {/* Number circle */}
            <View className={`w-7 h-7 rounded-full items-center justify-center mr-3 ${
                installment.status === "PAID" ? "bg-green-100" : isOverdue ? "bg-red-100" : "bg-dark-100"
            }`}>
                <Text className={`font-lexend-bold text-xs ${
                    installment.status === "PAID" ? "text-green-600" : isOverdue ? "text-red-600" : "text-dark-500"
                }`}>
                    {installment.installment_number}
                </Text>
            </View>

            {/* Details */}
            <View className="flex-1">
                <Text className="font-lexend-medium text-sm text-dark-800">
                    {installment.installment_name || `Installment ${installment.installment_number}`}
                </Text>
                <View className="flex-row items-center mt-0.5">
                    <Text className="font-lexend text-[11px] text-dark-400">
                        Due: {formatDate(installment.due_date)}
                    </Text>
                    {isOverdue && (
                        <View className="bg-red-50 rounded-full px-1.5 py-0.5 ml-2">
                            <Text className="font-lexend-bold text-[9px] text-red-600">OVERDUE</Text>
                        </View>
                    )}
                </View>
            </View>

            {/* Amount + Status */}
            <View className="items-end">
                <Text className="font-lexend-bold text-sm text-dark-800">
                    {formatCurrency(installment.amount)}
                </Text>
                {installment.paid_amount > 0 && (
                    <Text className="font-lexend text-[10px] text-green-600">
                        Paid: {formatCurrency(installment.paid_amount)}
                    </Text>
                )}
                {installment.balance_amount > 0 && (
                    <Text className="font-lexend text-[10px] text-red-500">
                        Due: {formatCurrency(installment.balance_amount)}
                    </Text>
                )}
                {installment.status === "PAID" && (
                    <Text className="font-lexend-bold text-[10px] text-green-600 mt-0.5">✓ Paid</Text>
                )}
            </View>
        </View>
    );
}

function PaymentRow({ payment }) {
    return (
        <View className="flex-row items-center py-2.5 border-b border-dark-50">
            <View className="w-7 h-7 rounded-full bg-green-100 items-center justify-center mr-3">
                <Text className="font-lexend-bold text-xs text-green-600">✓</Text>
            </View>
            <View className="flex-1">
                <Text className="font-lexend-medium text-sm text-dark-800">
                    {payment.payment_mode}
                </Text>
                <Text className="font-lexend text-[11px] text-dark-400">
                    {formatDate(payment.payment_date)}
                    {payment.receipt_number ? ` | ${payment.receipt_number}` : ""}
                </Text>
            </View>
            <Text className="font-lexend-bold text-sm text-green-600">
                {formatCurrency(payment.amount_paid)}
            </Text>
        </View>
    );
}
