import { useState, useEffect, useCallback, useRef } from "react";
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useAuthStore, useAppStore, useParentStore } from "../../store";
import busLocationService from "../../services/busStaff/busLocationService";
import { getSocket, disconnectSocket } from "../../lib/socket";
import { COLORS } from "../../lib/constants";
import BusMap from "../../components/BusMap";

export default function BusTrackerScreen() {
    const user = useAuthStore((s) => s.user);
    const selectedChild = useParentStore((s) => s.selectedChild);
    const children = useParentStore((s) => s.children);

    const skid = user?.skid;
    const childId = selectedChild?.student_id || selectedChild?.id || children?.[0]?.student_id;

    const [loading, setLoading] = useState(true);
    const [busData, setBusData] = useState(null);
    const [error, setError] = useState(null);
    const mapRef = useRef(null);

    // Fetch initial location
    const fetchLocation = useCallback(async () => {
        if (!skid || !childId) {
            setLoading(false);
            setError("No child selected");
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const res = await busLocationService.getChildBusLocation(skid, childId);
            setBusData(res?.data ?? res ?? null);
        } catch {
            setError("Could not load bus location");
            setBusData(null);
        } finally {
            setLoading(false);
        }
    }, [skid, childId]);

    useEffect(() => {
        fetchLocation();
    }, [fetchLocation]);

    // Connect WebSocket when bus is active
    useEffect(() => {
        if (!busData?.is_active || !busData?.bus_staff_user_id) return;

        const socket = getSocket();

        socket.emit("join_bus_room", { skid, bus_staff_user_id: busData.bus_staff_user_id });

        socket.on("bus_location_update", (data) => {
            setBusData((prev) => ({
                ...prev,
                latitude: data.latitude,
                longitude: data.longitude,
                heading: data.heading,
                speed: data.speed,
                is_active: true,
            }));
            mapRef.current?.animateToRegion({
                latitude: data.latitude,
                longitude: data.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            }, 500);
        });

        socket.on("bus_stopped", () => {
            setBusData((prev) => prev ? { ...prev, is_active: false } : prev);
        });

        socket.on("connect", () => {
            socket.emit("join_bus_room", { skid, bus_staff_user_id: busData.bus_staff_user_id });
        });

        return () => {
            socket.off("bus_location_update");
            socket.off("bus_stopped");
            socket.emit("leave_bus_room", { skid, bus_staff_user_id: busData.bus_staff_user_id });
            disconnectSocket();
        };
    }, [busData?.is_active, busData?.bus_staff_user_id, skid]);

    if (loading) {
        return (
            <SafeAreaView style={styles.center}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Finding your child's bus...</Text>
            </SafeAreaView>
        );
    }

    if (error || !busData) {
        return (
            <SafeAreaView style={styles.center}>
                <Feather name="alert-circle" size={48} color="#cbd5e1" />
                <Text style={styles.emptyTitle}>Unable to load</Text>
                <Text style={styles.emptyText}>{error || "No bus data available"}</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={fetchLocation} activeOpacity={0.8}>
                    <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    if (!busData.is_active) {
        return (
            <SafeAreaView style={styles.center}>
                <Feather name="navigation" size={48} color="#cbd5e1" />
                <Text style={styles.emptyTitle}>Bus Not Active</Text>
                <Text style={styles.emptyText}>
                    {busData.staff_name
                        ? `${busData.staff_name} is not currently sharing location`
                        : "No active bus for your child right now"}
                </Text>
                <TouchableOpacity style={styles.retryBtn} onPress={fetchLocation} activeOpacity={0.8}>
                    <Text style={styles.retryText}>Refresh</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={["top"]}>
            {/* Header info */}
            <View style={styles.header}>
                <View style={[styles.liveDot, { backgroundColor: "#4ade80" }]} />
                <View style={{ flex: 1 }}>
                    <Text style={styles.headerTitle}>{busData.staff_name || "Bus"}</Text>
                    <Text style={styles.headerSub}>
                        {busData.speed ? `${Math.round(busData.speed)} km/h` : "Live"}
                        {busData.updated_at && `  ·  ${new Date(busData.updated_at).toLocaleTimeString("en-GB")}`}
                    </Text>
                </View>
                <TouchableOpacity onPress={fetchLocation} activeOpacity={0.7}>
                    <Feather name="refresh-cw" size={18} color={COLORS.textSecondary} />
                </TouchableOpacity>
            </View>

            {/* Map */}
            <BusMap ref={mapRef} busData={busData} />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#f8fafc",
        padding: 24,
        gap: 12,
    },
    loadingText: {
        fontFamily: "Lexend_400Regular",
        fontSize: 14,
        color: "#64748b",
        marginTop: 8,
    },
    emptyTitle: {
        fontFamily: "Lexend_600SemiBold",
        fontSize: 18,
        color: "#334155",
    },
    emptyText: {
        fontFamily: "Lexend_400Regular",
        fontSize: 14,
        color: "#94a3b8",
        textAlign: "center",
    },
    retryBtn: {
        marginTop: 8,
        backgroundColor: COLORS.primary,
        paddingHorizontal: 24,
        paddingVertical: 10,
        borderRadius: 10,
    },
    retryText: {
        fontFamily: "Lexend_600SemiBold",
        fontSize: 14,
        color: "#fff",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#e2e8f0",
    },
    liveDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    headerTitle: {
        fontFamily: "Lexend_600SemiBold",
        fontSize: 16,
        color: "#0f172a",
    },
    headerSub: {
        fontFamily: "Lexend_400Regular",
        fontSize: 12,
        color: "#64748b",
    },
});
