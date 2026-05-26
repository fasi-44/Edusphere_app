import { useState, useRef, useEffect, useCallback } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    TextInput,
    FlatList,
    ActivityIndicator,
    Alert,
    StyleSheet,
    ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Feather } from "@expo/vector-icons";
import { useAuthStore, useAppStore } from "../../store";
import busScanService from "../../services/busStaff/busScanService";
import busLocationService from "../../services/busStaff/busLocationService";
import { startBusLocationTracking, stopBusLocationTracking } from "../../tasks/busLocationTask";
import { getSocket, disconnectSocket } from "../../lib/socket";
import { COLORS } from "../../lib/constants";

const SCAN_TYPE = { CHECK_IN: "CHECK_IN", CHECK_OUT: "CHECK_OUT" };

export default function BusScanScreen() {
    const user = useAuthStore((s) => s.user);
    const academicYear = useAppStore((s) => s.academicYear);

    const [permission, requestPermission] = useCameraPermissions();
    const [scannerActive, setScannerActive] = useState(false);
    const [activeScanType, setActiveScanType] = useState(SCAN_TYPE.CHECK_IN);
    const [scanning, setScanning] = useState(false);
    const [isLive, setIsLive] = useState(false);
    const [liveLoading, setLiveLoading] = useState(false);

    // Manual search
    const [query, setQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const searchTimeout = useRef(null);

    const skid = user?.skid;
    const academicYearId = academicYear?.id;

    // ── QR scan handler ──
    const handleBarcodeScanned = useCallback(async ({ data }) => {
        if (scanning) return;
        setScanning(true);
        setScannerActive(false);
        try {
            const res = await busScanService.scanQr(skid, {
                qr_data: data,
                scan_type: activeScanType,
                academic_year_id: academicYearId,
            });
            Alert.alert(
                "Success",
                `${activeScanType === SCAN_TYPE.CHECK_IN ? "Check-in" : "Check-out"} recorded`,
                [{ text: "OK" }]
            );
        } catch (err) {
            Alert.alert("Error", err?.response?.data?.message || "Failed to record scan");
        } finally {
            setScanning(false);
        }
    }, [scanning, skid, activeScanType, academicYearId]);

    // ── Student search ──
    useEffect(() => {
        setSelectedStudent(null);
        if (query.trim().length < 2) {
            setSearchResults([]);
            return;
        }
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(async () => {
            setSearchLoading(true);
            try {
                const res = await busScanService.searchStudents(skid, query.trim());
                setSearchResults(res?.data ?? []);
            } catch {
                setSearchResults([]);
            } finally {
                setSearchLoading(false);
            }
        }, 300);
        return () => clearTimeout(searchTimeout.current);
    }, [query, skid]);

    const handleManualScan = async (scanType) => {
        if (!selectedStudent) return;
        try {
            await busScanService.recordScan(skid, {
                student_user_id: selectedStudent.id,
                scan_type: scanType,
                academic_year_id: academicYearId,
            });
            Alert.alert(
                "Success",
                `${scanType === SCAN_TYPE.CHECK_IN ? "Check-in" : "Check-out"} recorded for ${selectedStudent.full_name}`,
                [{ text: "OK" }]
            );
            setQuery("");
            setSelectedStudent(null);
            setSearchResults([]);
        } catch (err) {
            Alert.alert("Error", err?.response?.data?.message || "Failed to record scan");
        }
    };

    // ── Go Live / Stop GPS ──
    const handleGoLive = async () => {
        setLiveLoading(true);
        try {
            getSocket(); // connect WebSocket
            await startBusLocationTracking();
            setIsLive(true);
        } catch (err) {
            Alert.alert("Error", err.message || "Failed to start location sharing");
        } finally {
            setLiveLoading(false);
        }
    };

    const handleStopLive = async () => {
        setLiveLoading(true);
        try {
            await stopBusLocationTracking();
            await busLocationService.stopTracking(skid);
            const socket = getSocket();
            socket?.emit("bus_stop_tracking", { skid });
            disconnectSocket();
            setIsLive(false);
        } catch {
            setIsLive(false);
        } finally {
            setLiveLoading(false);
        }
    };

    const startScanner = async (scanType) => {
        if (!permission?.granted) {
            const result = await requestPermission();
            if (!result.granted) {
                Alert.alert("Permission Required", "Camera access is needed to scan QR codes.");
                return;
            }
        }
        setActiveScanType(scanType);
        setScannerActive(true);
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Bus Scan</Text>
                    <Text style={styles.headerSub}>Scan or search to record</Text>
                </View>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                        {user?.first_name?.[0]}{user?.last_name?.[0]}
                    </Text>
                </View>
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
                {/* Live Location Toggle */}
                <TouchableOpacity
                    style={[styles.liveCard, isLive ? styles.liveCardActive : styles.liveCardInactive]}
                    onPress={isLive ? handleStopLive : handleGoLive}
                    disabled={liveLoading}
                    activeOpacity={0.8}
                >
                    {liveLoading ? (
                        <ActivityIndicator size="small" color={isLive ? "#fff" : COLORS.primary} />
                    ) : (
                        <View style={styles.liveInner}>
                            <View style={[styles.liveDot, { backgroundColor: isLive ? "#4ade80" : "#94a3b8" }]} />
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.liveTitle, isLive && { color: "#fff" }]}>
                                    {isLive ? "LIVE — Sharing Location" : "Location Sharing Off"}
                                </Text>
                                <Text style={[styles.liveSub, isLive && { color: "rgba(255,255,255,0.8)" }]}>
                                    {isLive ? "Tap to stop sharing with parents" : "Tap to start sharing your bus location"}
                                </Text>
                            </View>
                            <Feather name={isLive ? "radio" : "navigation"} size={20} color={isLive ? "#fff" : COLORS.textSecondary} />
                        </View>
                    )}
                </TouchableOpacity>

                {/* QR Scanner section */}
                {scannerActive ? (
                    <View style={styles.scannerContainer}>
                        <CameraView
                            style={StyleSheet.absoluteFillObject}
                            facing="back"
                            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                            onBarcodeScanned={handleBarcodeScanned}
                        />
                        {/* Overlay frame */}
                        <View style={styles.scanOverlay}>
                            <View style={styles.scanFrame} />
                            <Text style={styles.scanHint}>
                                Scanning for{" "}
                                <Text style={{ color: activeScanType === SCAN_TYPE.CHECK_IN ? "#60a5fa" : "#fb923c" }}>
                                    {activeScanType === SCAN_TYPE.CHECK_IN ? "Check-in" : "Check-out"}
                                </Text>
                            </Text>
                        </View>
                        <TouchableOpacity style={styles.cancelBtn} onPress={() => setScannerActive(false)}>
                            <Feather name="x" size={20} color="#fff" />
                            <Text style={styles.cancelBtnText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <>
                        {/* QR Scan buttons */}
                        <View style={styles.card}>
                            <Text style={styles.sectionTitle}>Scan QR Code</Text>
                            <View style={styles.row}>
                                <TouchableOpacity
                                    style={[styles.scanBtn, { backgroundColor: COLORS.primary }]}
                                    onPress={() => startScanner(SCAN_TYPE.CHECK_IN)}
                                    activeOpacity={0.8}
                                >
                                    <Feather name="log-in" size={18} color="#fff" />
                                    <Text style={styles.scanBtnText}>Check In</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.scanBtn, { backgroundColor: "#f97316" }]}
                                    onPress={() => startScanner(SCAN_TYPE.CHECK_OUT)}
                                    activeOpacity={0.8}
                                >
                                    <Feather name="log-out" size={18} color="#fff" />
                                    <Text style={styles.scanBtnText}>Check Out</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Manual entry */}
                        <View style={[styles.card, { marginTop: 12 }]}>
                            <Text style={styles.sectionTitle}>Manual Entry</Text>
                            <View style={styles.searchBox}>
                                <Feather name="search" size={16} color={COLORS.textSecondary} style={{ marginRight: 8 }} />
                                <TextInput
                                    style={styles.searchInput}
                                    value={query}
                                    onChangeText={setQuery}
                                    placeholder="Search by name or roll number..."
                                    placeholderTextColor={COLORS.textSecondary}
                                />
                                {searchLoading && <ActivityIndicator size="small" color={COLORS.primary} />}
                                {query.length > 0 && !searchLoading && (
                                    <TouchableOpacity onPress={() => { setQuery(""); setSearchResults([]); setSelectedStudent(null); }}>
                                        <Feather name="x" size={16} color={COLORS.textSecondary} />
                                    </TouchableOpacity>
                                )}
                            </View>

                            {/* Search results dropdown */}
                            {searchResults.length > 0 && (
                                <View style={styles.dropdown}>
                                    {searchResults.map((s) => (
                                        <TouchableOpacity
                                            key={s.id}
                                            style={styles.dropdownItem}
                                            onPress={() => {
                                                setSelectedStudent(s);
                                                setQuery(s.full_name);
                                                setSearchResults([]);
                                            }}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={styles.dropdownName}>{s.full_name}</Text>
                                            <Text style={styles.dropdownMeta}>
                                                {[s.roll_no && `Roll: ${s.roll_no}`, s.admission_number && `Adm: ${s.admission_number}`].filter(Boolean).join("  ·  ")}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}

                            {/* Selected student confirmation */}
                            {selectedStudent && (
                                <View style={styles.selectedBanner}>
                                    <Feather name="check-circle" size={14} color={COLORS.success} />
                                    <Text style={styles.selectedText}>
                                        {selectedStudent.full_name}
                                        {selectedStudent.roll_no ? `  ·  Roll: ${selectedStudent.roll_no}` : ""}
                                    </Text>
                                </View>
                            )}

                            {/* Manual action buttons */}
                            <View style={[styles.row, { marginTop: 12 }]}>
                                <TouchableOpacity
                                    style={[styles.scanBtn, { backgroundColor: selectedStudent ? COLORS.primary : "#c7d2fe", flex: 1 }]}
                                    onPress={() => handleManualScan(SCAN_TYPE.CHECK_IN)}
                                    disabled={!selectedStudent}
                                    activeOpacity={0.8}
                                >
                                    <Feather name="log-in" size={16} color="#fff" />
                                    <Text style={styles.scanBtnText}>Check In</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.scanBtn, { backgroundColor: selectedStudent ? "#f97316" : "#fed7aa", flex: 1 }]}
                                    onPress={() => handleManualScan(SCAN_TYPE.CHECK_OUT)}
                                    disabled={!selectedStudent}
                                    activeOpacity={0.8}
                                >
                                    <Feather name="log-out" size={16} color="#fff" />
                                    <Text style={styles.scanBtnText}>Check Out</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    liveCard: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
    },
    liveCardActive: {
        backgroundColor: "#16a34a",
        borderColor: "#16a34a",
    },
    liveCardInactive: {
        backgroundColor: "#fff",
        borderColor: "#e2e8f0",
    },
    liveInner: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    liveDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    liveTitle: {
        fontFamily: "Lexend_600SemiBold",
        fontSize: 14,
        color: "#0f172a",
    },
    liveSub: {
        fontFamily: "Lexend_400Regular",
        fontSize: 12,
        color: "#64748b",
        marginTop: 1,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
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
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.primary,
        justifyContent: "center",
        alignItems: "center",
    },
    avatarText: {
        fontFamily: "Lexend_600SemiBold",
        fontSize: 14,
        color: "#fff",
    },
    card: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: "#e2e8f0",
    },
    sectionTitle: {
        fontFamily: "Lexend_600SemiBold",
        fontSize: 14,
        color: "#0f172a",
        marginBottom: 12,
    },
    row: {
        flexDirection: "row",
        gap: 10,
    },
    scanBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingVertical: 12,
        borderRadius: 10,
    },
    scanBtnText: {
        fontFamily: "Lexend_600SemiBold",
        fontSize: 14,
        color: "#fff",
    },
    scannerContainer: {
        flex: 1,
        borderRadius: 16,
        overflow: "hidden",
        position: "relative",
    },
    scanOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: "center",
        alignItems: "center",
    },
    scanFrame: {
        width: 220,
        height: 220,
        borderWidth: 3,
        borderColor: "#fff",
        borderRadius: 12,
        backgroundColor: "transparent",
    },
    scanHint: {
        marginTop: 20,
        fontFamily: "Lexend_500Medium",
        fontSize: 14,
        color: "#fff",
    },
    cancelBtn: {
        position: "absolute",
        bottom: 24,
        alignSelf: "center",
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "rgba(0,0,0,0.5)",
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 24,
    },
    cancelBtnText: {
        fontFamily: "Lexend_500Medium",
        fontSize: 14,
        color: "#fff",
    },
    searchBox: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#e2e8f0",
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: "#f8fafc",
    },
    searchInput: {
        flex: 1,
        fontFamily: "Lexend_400Regular",
        fontSize: 14,
        color: "#0f172a",
    },
    dropdown: {
        marginTop: 4,
        borderWidth: 1,
        borderColor: "#e2e8f0",
        borderRadius: 10,
        backgroundColor: "#fff",
        overflow: "hidden",
    },
    dropdownItem: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#f1f5f9",
    },
    dropdownName: {
        fontFamily: "Lexend_500Medium",
        fontSize: 14,
        color: "#0f172a",
    },
    dropdownMeta: {
        fontFamily: "Lexend_400Regular",
        fontSize: 12,
        color: "#64748b",
        marginTop: 2,
    },
    selectedBanner: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginTop: 10,
        backgroundColor: "#f0fdf4",
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 7,
    },
    selectedText: {
        fontFamily: "Lexend_500Medium",
        fontSize: 13,
        color: "#166534",
    },
});
