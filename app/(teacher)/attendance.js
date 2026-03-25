import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Platform,
    Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { useAuthStore, useAppStore } from "../../store";
import { attendanceService, classService } from "../../services/teacher";

const STATUS_OPTIONS = [
    { key: "Present", short: "P", color: "text-green-600", activeBg: "bg-green-100" },
    { key: "Absent", short: "A", color: "text-red-600", activeBg: "bg-red-100" },
    { key: "Late", short: "L", color: "text-amber-600", activeBg: "bg-amber-100" },
    { key: "Excused", short: "E", color: "text-dark-500", activeBg: "bg-dark-200" },
];

const FILTER_HEIGHT = 145;

function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

function formatDateDisplay(dateStr) {
    const [y, m, d] = dateStr.split("-");
    return `${m}/${d}/${y}`;
}

function getInitials(name) {
    if (!name) return "?";
    return name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
}

export default function AttendanceScreen() {
    const user = useAuthStore((s) => s.user);
    const academicYear = useAppStore((s) => s.academicYear);

    const skid = user?.skid;
    const academicYearId = academicYear?.id;

    const [classes, setClasses] = useState([]);
    const [sections, setSections] = useState([]);
    const [selectedClass, setSelectedClass] = useState(null);
    const [selectedSection, setSelectedSection] = useState(null);
    const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));

    const [students, setStudents] = useState([]);
    const [attendance, setAttendance] = useState({});
    const [existingRecords, setExistingRecords] = useState(null);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [classesLoading, setClassesLoading] = useState(true);

    const [showClassPicker, setShowClassPicker] = useState(false);
    const [showSectionPicker, setShowSectionPicker] = useState(false);

    // Animated filter collapse
    const scrollY = useRef(new Animated.Value(0)).current;
    const filterHeight = scrollY.interpolate({
        inputRange: [0, FILTER_HEIGHT],
        outputRange: [FILTER_HEIGHT, 0],
        extrapolate: "clamp",
    });
    const filterOpacity = scrollY.interpolate({
        inputRange: [0, FILTER_HEIGHT * 0.6],
        outputRange: [1, 0],
        extrapolate: "clamp",
    });

    // Fetch classes on focus
    useFocusEffect(
        useCallback(() => {
            if (!skid) return;
            setClassesLoading(true);
            classService
                .getClasses(skid)
                .then((res) => {
                    const list = res?.data || [];
                    setClasses(Array.isArray(list) ? list : []);
                })
                .catch(() => setClasses([]))
                .finally(() => setClassesLoading(false));
        }, [skid])
    );

    // Fetch sections when class changes
    useEffect(() => {
        if (!skid || !selectedClass) {
            setSections([]);
            setSelectedSection(null);
            return;
        }
        classService
            .getSections(skid, selectedClass.id)
            .then((res) => {
                const list = res?.data || [];
                setSections(Array.isArray(list) ? list : []);
            })
            .catch(() => setSections([]));
    }, [skid, selectedClass]);

    // Fetch ALL students (paginated loop) + existing attendance
    const fetchStudentsAndAttendance = useCallback(async () => {
        if (!skid || !academicYearId || !selectedSection) return;
        setLoading(true);
        try {
            const studentList = await attendanceService.getAllStudentsInSection(
                skid, academicYearId, selectedSection.id
            );
            setStudents(studentList);

            let records = [];
            try {
                const attendanceRes = await attendanceService.viewAttendance(skid, academicYearId, {
                    class_id: selectedClass.id,
                    section_id: selectedSection.id,
                    date: selectedDate,
                });
                records = attendanceRes?.data?.records || [];
            } catch {
                records = [];
            }

            if (Array.isArray(records) && records.length > 0) {
                setExistingRecords(records);
                const initialAttendance = {};
                studentList.forEach((s) => {
                    const existing = records.find((r) => r.student?.id === s.id);
                    initialAttendance[s.id] = existing?.status || "";
                });
                setAttendance(initialAttendance);
            } else {
                setExistingRecords(null);
                const initialAttendance = {};
                studentList.forEach((s) => {
                    initialAttendance[s.id] = "";
                });
                setAttendance(initialAttendance);
            }
        } catch (err) {
            console.error("Attendance fetch error:", err);
        } finally {
            setLoading(false);
        }
    }, [skid, academicYearId, selectedClass, selectedSection, selectedDate]);

    useEffect(() => {
        fetchStudentsAndAttendance();
    }, [fetchStudentsAndAttendance]);

    const setStudentStatus = (studentId, status) => {
        setAttendance((prev) => ({ ...prev, [studentId]: status }));
    };

    const markAllPresent = () => {
        const updated = {};
        students.forEach((s) => {
            updated[s.id] = "Present";
        });
        setAttendance(updated);
    };

    const resetForm = () => {
        setSelectedClass(null);
        setSelectedSection(null);
        setSections([]);
        setStudents([]);
        setAttendance({});
        setExistingRecords(null);
        setSelectedDate(formatDate(new Date()));
        scrollY.setValue(0);
    };

    const stats = useMemo(() => {
        const counts = { Present: 0, Absent: 0, Late: 0, Excused: 0 };
        Object.values(attendance).forEach((s) => {
            if (counts[s] !== undefined) counts[s]++;
        });
        return counts;
    }, [attendance]);

    const handleSubmit = async () => {
        if (!selectedClass || !selectedSection) return;

        const unmarked = students.filter((s) => !attendance[s.id]);
        if (unmarked.length > 0) {
            const msg = `${unmarked.length} student(s) not marked. Mark all before submitting.`;
            if (Platform.OS === "web") alert(msg);
            else Alert.alert("Incomplete", msg);
            return;
        }

        setSubmitting(true);
        try {
            const isEditMode = !!existingRecords;

            const records = students.map((s) => {
                const rec = {
                    student_id: s.id,
                    class_id: selectedClass.id,
                    section_id: selectedSection.id,
                    date: selectedDate,
                    status: attendance[s.id],
                };
                if (isEditMode) {
                    const existing = existingRecords.find((r) => r.student?.id === s.id);
                    if (existing?.id) rec.attendance_id = existing.id;
                }
                return rec;
            });

            const payload = {
                records,
                date: selectedDate,
                section_id: selectedSection.id,
                academic_year_id: academicYearId,
            };

            if (isEditMode) {
                await attendanceService.updateBulkAttendance(skid, payload);
            } else {
                await attendanceService.recordBulkAttendance(skid, payload);
            }

            const successMsg = isEditMode
                ? `Attendance updated for ${students.length} student(s)`
                : `Attendance marked for ${students.length} student(s)`;

            if (Platform.OS === "web") {
                alert(successMsg);
                resetForm();
            } else {
                Alert.alert("Success", successMsg, [
                    { text: "OK", onPress: resetForm },
                ]);
            }
        } catch (err) {
            const errMsg = err?.data?.message || "Failed to submit attendance.";
            if (Platform.OS === "web") alert(errMsg);
            else Alert.alert("Error", errMsg);
        } finally {
            setSubmitting(false);
        }
    };

    const hasStudents = selectedClass && selectedSection && !loading && students.length > 0;

    return (
        <SafeAreaView className="flex-1 bg-dark-50">
            {/* Title - always visible */}
            <View className="bg-white px-6 pt-4 pb-3 z-20">
                <Text className="font-lexend-bold text-xl text-dark-900 text-center">
                    Attendance
                </Text>
            </View>

            {/* Collapsible Filters */}
            <Animated.View
                style={{
                    height: hasStudents ? filterHeight : FILTER_HEIGHT,
                    opacity: hasStudents ? filterOpacity : 1,
                    overflow: (showClassPicker || showSectionPicker) ? "visible" : "hidden",
                    backgroundColor: "#ffffff",
                    zIndex: 40,
                }}
            >
                <View className="px-6 pb-4">
                    {/* Class + Section row */}
                    <View className="flex-row gap-3 mb-3" style={{ zIndex: 50 }}>
                        {/* Class Picker */}
                        <View className="flex-1 z-30">
                            <TouchableOpacity
                                className="flex-row items-center bg-dark-50 rounded-xl px-3 py-2.5 border border-dark-200"
                                onPress={() => {
                                    setShowClassPicker(!showClassPicker);
                                    setShowSectionPicker(false);
                                }}
                            >
                                <Text className="text-primary-600 mr-2">📚</Text>
                                <Text className="font-lexend-semibold text-sm text-dark-900 flex-1" numberOfLines={1}>
                                    {selectedClass?.class_name || "Select Class"}
                                </Text>
                                <Text className="text-dark-400 text-xs">▼</Text>
                            </TouchableOpacity>
                            {showClassPicker && (
                                <View className="absolute top-12 left-0 right-0 bg-white rounded-xl border border-dark-200 shadow-lg" style={{ zIndex: 100 }}>
                                    {classesLoading ? (
                                        <View className="p-4 items-center">
                                            <ActivityIndicator size="small" color="#6366f1" />
                                        </View>
                                    ) : (
                                        classes.map((cls) => (
                                            <TouchableOpacity
                                                key={cls.id}
                                                className={`px-4 py-3 border-b border-dark-100 ${selectedClass?.id === cls.id ? "bg-primary-50" : ""}`}
                                                onPress={() => {
                                                    setSelectedClass(cls);
                                                    setSelectedSection(null);
                                                    setShowClassPicker(false);
                                                }}
                                            >
                                                <Text className={`font-lexend-medium text-sm ${selectedClass?.id === cls.id ? "text-primary-600" : "text-dark-800"}`}>
                                                    {cls.class_name}
                                                </Text>
                                            </TouchableOpacity>
                                        ))
                                    )}
                                </View>
                            )}
                        </View>

                        {/* Section Picker */}
                        <View className="flex-1 z-30">
                            <TouchableOpacity
                                className="flex-row items-center bg-dark-50 rounded-xl px-3 py-2.5 border border-dark-200"
                                onPress={() => {
                                    if (!selectedClass) return;
                                    setShowSectionPicker(!showSectionPicker);
                                    setShowClassPicker(false);
                                }}
                            >
                                <Text className="text-primary-600 mr-2">📋</Text>
                                <Text className="font-lexend-semibold text-sm text-dark-900 flex-1" numberOfLines={1}>
                                    {selectedSection?.section_name || selectedSection?.name || "Section"}
                                </Text>
                                <Text className="text-dark-400 text-xs">▼</Text>
                            </TouchableOpacity>
                            {showSectionPicker && (
                                <View className="absolute top-12 left-0 right-0 bg-white rounded-xl border border-dark-200 shadow-lg" style={{ zIndex: 100 }}>
                                    {sections.length === 0 ? (
                                        <View className="p-4 items-center">
                                            <Text className="font-lexend text-sm text-dark-400">No sections</Text>
                                        </View>
                                    ) : (
                                        sections.map((sec) => (
                                            <TouchableOpacity
                                                key={sec.id}
                                                className={`px-4 py-3 border-b border-dark-100 ${selectedSection?.id === sec.id ? "bg-primary-50" : ""}`}
                                                onPress={() => {
                                                    setSelectedSection(sec);
                                                    setShowSectionPicker(false);
                                                }}
                                            >
                                                <Text className={`font-lexend-medium text-sm ${selectedSection?.id === sec.id ? "text-primary-600" : "text-dark-800"}`}>
                                                    {sec.section_name || sec.name}
                                                </Text>
                                            </TouchableOpacity>
                                        ))
                                    )}
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Date */}
                    <View className="flex-row items-center bg-dark-50 rounded-xl px-3 py-2.5 border border-dark-200" style={{ zIndex: 1 }}>
                        <Text className="text-primary-600 mr-2">📅</Text>
                        <Text className="font-lexend-semibold text-sm text-dark-900 flex-1">
                            {formatDateDisplay(selectedDate)}
                        </Text>
                    </View>
                </View>
            </Animated.View>

            {/* Content */}
            {!selectedClass || !selectedSection ? (
                <View className="flex-1 items-center justify-center px-6" style={{ zIndex: 1 }}>
                    <Text className="font-lexend text-sm text-dark-400 text-center">
                        Select a class and section to mark attendance.
                    </Text>
                </View>
            ) : loading ? (
                <View className="flex-1 items-center justify-center" style={{ zIndex: 1 }}>
                    <ActivityIndicator size="large" color="#6366f1" />
                </View>
            ) : (
                <View className="flex-1" style={{ zIndex: 1 }}>
                    {/* Sticky Stats + Header */}
                    <View className="bg-dark-50">
                        <View className="flex-row px-4 pt-3 pb-2 gap-3">
                            <StatChip label="Present" count={stats.Present} dotColor="bg-green-500" />
                            <StatChip label="Absent" count={stats.Absent} dotColor="bg-red-500" />
                            <StatChip label="Late" count={stats.Late} dotColor="bg-amber-500" />
                        </View>
                        <View className="flex-row items-center justify-between px-6 pt-2 pb-2">
                            <Text className="font-lexend-bold text-base text-dark-900">
                                Student List ({students.length})
                            </Text>
                            <TouchableOpacity onPress={markAllPresent}>
                                <Text className="font-lexend-bold text-sm text-primary-600">
                                    Mark All Present
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Student List */}
                    <Animated.FlatList
                        data={students}
                        keyExtractor={(item) => item.id.toString()}
                        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
                        onScroll={Animated.event(
                            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                            { useNativeDriver: false }
                        )}
                        onScrollBeginDrag={() => {
                            setShowClassPicker(false);
                            setShowSectionPicker(false);
                        }}
                        scrollEventThrottle={16}
                        renderItem={({ item }) => (
                            <StudentCard
                                student={item}
                                status={attendance[item.id] || ""}
                                onStatusChange={(status) => setStudentStatus(item.id, status)}
                            />
                        )}
                        ListEmptyComponent={
                            <View className="items-center py-12">
                                <Text className="font-lexend text-sm text-dark-400">
                                    No students found in this section.
                                </Text>
                            </View>
                        }
                    />

                    {/* Action Buttons */}
                    {students.length > 0 && (
                        <View className="absolute bottom-0 left-0 right-0 px-4 py-4 bg-white border-t border-dark-100 flex-row gap-3">
                            <TouchableOpacity
                                className="bg-dark-100 rounded-xl py-3.5 items-center px-5"
                                onPress={resetForm}
                                activeOpacity={0.7}
                            >
                                <Text className="font-lexend-bold text-base text-dark-600">
                                    Cancel
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                className="flex-1 bg-primary-600 rounded-xl py-3.5 flex-row items-center justify-center"
                                onPress={handleSubmit}
                                disabled={submitting}
                                activeOpacity={0.8}
                            >
                                {submitting ? (
                                    <ActivityIndicator size="small" color="#ffffff" />
                                ) : (
                                    <>
                                        <Text className="text-white mr-2">✓</Text>
                                        <Text className="font-lexend-bold text-base text-white">
                                            {existingRecords ? "Update Attendance" : "Submit Attendance"}
                                        </Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            )}
        </SafeAreaView>
    );
}

function StatChip({ label, count, dotColor }) {
    return (
        <View className="flex-1 bg-white rounded-xl p-3 border border-dark-100">
            <View className="flex-row items-center gap-1.5 mb-1">
                <View className={`w-2 h-2 rounded-full ${dotColor}`} />
                <Text className="font-lexend-medium text-[10px] text-dark-400 uppercase tracking-wider">
                    {label}
                </Text>
            </View>
            <Text className="font-lexend-bold text-2xl text-dark-900">{count}</Text>
        </View>
    );
}

function StudentCard({ student, status, onStatusChange }) {
    const name = student.full_name || student.name || "Unknown";
    const rollNo = student.profile?.roll_no || student.roll_no || "";

    return (
        <View className="bg-white rounded-2xl p-4 mb-3">
            <View className="flex-row items-center mb-3">
                <View className="w-12 h-12 rounded-full bg-primary-100 items-center justify-center mr-3">
                    <Text className="font-lexend-bold text-base text-primary-600">
                        {getInitials(name)}
                    </Text>
                </View>
                <View className="flex-1">
                    <Text className="font-lexend-bold text-base text-dark-900" numberOfLines={1}>
                        {name}
                    </Text>
                    {rollNo ? (
                        <Text className="font-lexend text-sm text-dark-400">
                            ID: {rollNo}
                        </Text>
                    ) : null}
                </View>
            </View>

            <View className="flex-row gap-2 pt-2 border-t border-dark-100">
                {STATUS_OPTIONS.map((opt) => {
                    const isActive = status === opt.key;
                    return (
                        <TouchableOpacity
                            key={opt.key}
                            className={`flex-1 items-center py-2 rounded-lg ${isActive ? opt.activeBg : "bg-transparent"}`}
                            onPress={() => onStatusChange(opt.key)}
                            activeOpacity={0.7}
                        >
                            <Text className={`font-lexend-bold text-sm ${isActive ? opt.color : "text-dark-400"}`}>
                                {opt.short}
                            </Text>
                            <Text
                                className={`font-lexend-medium text-[10px] ${isActive ? opt.color : "text-dark-400"}`}
                                style={{ opacity: isActive ? 1 : 0.7 }}
                            >
                                {opt.key}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}
