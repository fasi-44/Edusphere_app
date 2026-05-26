import { useState, useCallback } from "react";
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    StyleSheet,
    RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useAuthStore, useAppStore } from "../../store";
import busScanService from "../../services/busStaff/busScanService";
import { COLORS } from "../../lib/constants";

function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDate(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${dd}/${mm}/${yyyy}  ${hh}:${min}`;
}

function shiftDate(dateStr, days) {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function displayDate(dateStr) {
    const [y, m, day] = dateStr.split("-");
    return `${day}/${m}/${y}`;
}

export default function BusReportScreen() {
    const user = useAuthStore((s) => s.user);
    const academicYear = useAppStore((s) => s.academicYear);

    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [date, setDate] = useState(todayStr());
    const [filterType, setFilterType] = useState("ALL"); // ALL | CHECK_IN | CHECK_OUT

    const skid = user?.skid;
    const academicYearId = academicYear?.id;

    const fetchRecords = useCallback(async (selectedDate = date) => {
        if (!skid) return;
        try {
            const res = await busScanService.getRecords(skid, {
                academicYearId,
                date: selectedDate,
            });
            setRecords(res?.data ?? []);
        } catch {
            setRecords([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [skid, academicYearId, date]);

    useFocusEffect(
        useCallback(() => {
            setLoading(true);
            fetchRecords(date);
        }, [date])
    );

    const changeDate = (days) => {
        const newDate = shiftDate(date, days);
        if (newDate > todayStr()) return; // don't go into future
        setDate(newDate);
        setLoading(true);
        fetchRecords(newDate);
    };

    const filtered = filterType === "ALL"
        ? records
        : records.filter((r) => r.scan_type === filterType);

    const checkins = records.filter((r) => r.scan_type === "CHECK_IN").length;
    const checkouts = records.filter((r) => r.scan_type === "CHECK_OUT").length;

    const renderItem = ({ item, index }) => (
        <View style={styles.row}>
            <Text style={styles.indexCell}>{index + 1}</Text>
            <View style={{ flex: 1 }}>
                <Text style={styles.studentName}>{item.student_name || `ID: ${item.student_user_id}`}</Text>
                <Text style={styles.meta}>{formatDate(item.scanned_at)}</Text>
            </View>
            <View style={[styles.badge, item.scan_type === "CHECK_IN" ? styles.badgeIn : styles.badgeOut]}>
                <Text style={[styles.badgeText, item.scan_type === "CHECK_IN" ? styles.badgeTextIn : styles.badgeTextOut]}>
                    {item.scan_type === "CHECK_IN" ? "In" : "Out"}
                </Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Tracking Report</Text>
                <Text style={styles.headerSub}>Bus scan history</Text>
            </View>

            {/* Date navigator */}
            <View style={styles.dateNav}>
                <TouchableOpacity onPress={() => changeDate(-1)} style={styles.navBtn} activeOpacity={0.7}>
                    <Feather name="chevron-left" size={20} color={COLORS.primary} />
                </TouchableOpacity>
                <Text style={styles.dateText}>{displayDate(date)}</Text>
                <TouchableOpacity
                    onPress={() => changeDate(1)}
                    style={[styles.navBtn, date === todayStr() && styles.navBtnDisabled]}
                    disabled={date === todayStr()}
                    activeOpacity={0.7}
                >
                    <Feather name="chevron-right" size={20} color={date === todayStr() ? "#cbd5e1" : COLORS.primary} />
                </TouchableOpacity>
            </View>

            {/* Summary chips */}
            <View style={styles.summary}>
                {[
                    { label: "All", value: "ALL", count: records.length, color: "#6366f1" },
                    { label: "Check-in", value: "CHECK_IN", count: checkins, color: "#3b82f6" },
                    { label: "Check-out", value: "CHECK_OUT", count: checkouts, color: "#f97316" },
                ].map((chip) => (
                    <TouchableOpacity
                        key={chip.value}
                        onPress={() => setFilterType(chip.value)}
                        style={[styles.chip, filterType === chip.value && { backgroundColor: chip.color }]}
                        activeOpacity={0.8}
                    >
                        <Text style={[styles.chipText, filterType === chip.value && { color: "#fff" }]}>
                            {chip.label} ({chip.count})
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* List */}
            {loading ? (
                <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={(item) => String(item.id)}
                    renderItem={renderItem}
                    contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => { setRefreshing(true); fetchRecords(date); }}
                            colors={[COLORS.primary]}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Feather name="inbox" size={40} color="#cbd5e1" />
                            <Text style={styles.emptyText}>No records for this date</Text>
                        </View>
                    }
                    ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    header: {
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#e2e8f0",
    },
    headerTitle: {
        fontFamily: "Lexend_700Bold",
        fontSize: 20,
        color: "#0f172a",
    },
    headerSub: {
        fontFamily: "Lexend_400Regular",
        fontSize: 12,
        color: "#64748b",
        marginTop: 1,
    },
    dateNav: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
        paddingVertical: 12,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#e2e8f0",
    },
    navBtn: {
        padding: 6,
    },
    navBtnDisabled: {
        opacity: 0.3,
    },
    dateText: {
        fontFamily: "Lexend_600SemiBold",
        fontSize: 16,
        color: "#0f172a",
        minWidth: 110,
        textAlign: "center",
    },
    summary: {
        flexDirection: "row",
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    chip: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: "#f1f5f9",
        alignItems: "center",
    },
    chipText: {
        fontFamily: "Lexend_500Medium",
        fontSize: 12,
        color: "#475569",
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: "#e2e8f0",
        gap: 10,
    },
    indexCell: {
        fontFamily: "Lexend_400Regular",
        fontSize: 12,
        color: "#94a3b8",
        width: 24,
        textAlign: "center",
    },
    studentName: {
        fontFamily: "Lexend_600SemiBold",
        fontSize: 14,
        color: "#0f172a",
    },
    meta: {
        fontFamily: "Lexend_400Regular",
        fontSize: 12,
        color: "#64748b",
        marginTop: 2,
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    badgeIn: { backgroundColor: "#dbeafe" },
    badgeOut: { backgroundColor: "#ffedd5" },
    badgeText: {
        fontFamily: "Lexend_600SemiBold",
        fontSize: 12,
    },
    badgeTextIn: { color: "#1d4ed8" },
    badgeTextOut: { color: "#c2410c" },
    empty: {
        alignItems: "center",
        paddingTop: 60,
        gap: 12,
    },
    emptyText: {
        fontFamily: "Lexend_400Regular",
        fontSize: 14,
        color: "#94a3b8",
    },
});
