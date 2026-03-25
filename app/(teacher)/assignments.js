import { useEffect, useState, useCallback, useMemo } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    RefreshControl,
    Alert,
    Platform,
    Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { useAuthStore, useAppStore } from "../../store";
import { assignmentService } from "../../services/teacher";
import DrawingCanvas from "../../components/DrawingCanvas";

const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

function formatDateDisplay(dateStr) {
    const [y, m, d] = dateStr.split("-");
    const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    return `${DAY_NAMES[date.getDay()]}, ${MONTH_NAMES[date.getMonth()]} ${date.getDate()}`;
}

function isToday(dateStr) {
    return dateStr === formatDate(new Date());
}

export default function AssignmentsScreen() {
    const router = useRouter();
    const user = useAuthStore((s) => s.user);
    const academicYear = useAppStore((s) => s.academicYear);

    const skid = user?.skid;
    const teacherId = user?.school_user_id;
    const academicYearId = academicYear?.id;

    const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Create form state
    const [showForm, setShowForm] = useState(false);
    const [teacherClasses, setTeacherClasses] = useState([]);
    const [classesLoading, setClassesLoading] = useState(false);
    const [selectedCombo, setSelectedCombo] = useState(null);
    const [showComboPicker, setShowComboPicker] = useState(false);
    const [assignmentText, setAssignmentText] = useState("");
    const [assignmentDrawing, setAssignmentDrawing] = useState(null);
    const [showDrawingCanvas, setShowDrawingCanvas] = useState(false);
    const [creating, setCreating] = useState(false);

    // Fetch teacher class/subject combos (for create form)
    useEffect(() => {
        if (!skid || !teacherId) return;
        setClassesLoading(true);
        assignmentService
            .getTeacherClasses(skid, teacherId)
            .then((res) => {
                const list = res?.data || [];
                setTeacherClasses(Array.isArray(list) ? list : []);
            })
            .catch(() => setTeacherClasses([]))
            .finally(() => setClassesLoading(false));
    }, [skid, teacherId]);

    // Fetch assignments for selected date
    const fetchAssignments = useCallback(async () => {
        if (!skid || !teacherId || !academicYearId) return;
        try {
            const res = await assignmentService.listAssignments(skid, {
                teacherId,
                date: selectedDate,
                academicYearId,
            });
            const list = res?.data || [];
            setAssignments(Array.isArray(list) ? list : []);
        } catch {
            setAssignments([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [skid, teacherId, academicYearId, selectedDate]);

    useFocusEffect(
        useCallback(() => {
            setLoading(true);
            fetchAssignments();
        }, [fetchAssignments])
    );

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchAssignments();
    }, [fetchAssignments]);

    // Date navigation
    const shiftDate = (days) => {
        const [y, m, d] = selectedDate.split("-");
        const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
        date.setDate(date.getDate() + days);
        setSelectedDate(formatDate(date));
    };

    // Create assignment
    const handleCreate = async () => {
        if (!selectedCombo) {
            const msg = "Please select a class & subject.";
            Platform.OS === "web" ? alert(msg) : Alert.alert("Required", msg);
            return;
        }
        if (!assignmentText.trim() && !assignmentDrawing) {
            const msg = "Please enter assignment text or draw something.";
            Platform.OS === "web" ? alert(msg) : Alert.alert("Required", msg);
            return;
        }
        if (showDrawingCanvas && !assignmentDrawing) {
            const msg = "Please draw something or remove the drawing canvas.";
            Platform.OS === "web" ? alert(msg) : Alert.alert("Required", msg);
            return;
        }

        setCreating(true);
        try {
            const payload = {
                teacher_id: teacherId,
                class_id: selectedCombo.class_id,
                section_id: selectedCombo.section_id,
                subject_id: selectedCombo.subject_id,
                academic_year_id: academicYearId,
                assignment_date: selectedDate,
            };
            if (assignmentText.trim()) payload.assignment_text = assignmentText.trim();
            if (assignmentDrawing) payload.assignment_drawing = assignmentDrawing;

            await assignmentService.createAssignment(skid, payload);

            setAssignmentText("");
            setAssignmentDrawing(null);
            setShowDrawingCanvas(false);
            setSelectedCombo(null);
            setShowForm(false);
            fetchAssignments();

            const msg = "Assignment created successfully!";
            Platform.OS === "web" ? alert(msg) : Alert.alert("Success", msg);
        } catch (err) {
            const msg = err?.data?.message || "Failed to create assignment.";
            Platform.OS === "web" ? alert(msg) : Alert.alert("Error", msg);
        } finally {
            setCreating(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-dark-50">
            {/* Header */}
            <View className="bg-white flex-row items-center justify-between px-6 pt-4 pb-3">
                <Text className="font-lexend-bold text-xl text-dark-900">
                    Assignments
                </Text>
                <TouchableOpacity
                    className="w-9 h-9 rounded-full bg-primary-600 items-center justify-center"
                    onPress={() => setShowForm(!showForm)}
                    activeOpacity={0.8}
                >
                    <Text className="text-white text-xl leading-none" style={{ marginTop: -1 }}>
                        {showForm ? "✕" : "+"}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Date Navigator */}
            <View className="bg-white px-6 pb-4">
                <View className="flex-row items-center justify-between bg-dark-50 rounded-xl px-2 py-2">
                    <TouchableOpacity
                        className="w-9 h-9 rounded-full items-center justify-center bg-white"
                        onPress={() => shiftDate(-1)}
                    >
                        <Text className="font-lexend-bold text-lg text-dark-600">‹</Text>
                    </TouchableOpacity>
                    <View className="items-center">
                        <Text className="font-lexend-semibold text-sm text-dark-900">
                            {formatDateDisplay(selectedDate)}
                        </Text>
                        {isToday(selectedDate) && (
                            <Text className="font-lexend-medium text-[10px] text-primary-600 uppercase tracking-wider">
                                Today
                            </Text>
                        )}
                    </View>
                    <TouchableOpacity
                        className="w-9 h-9 rounded-full items-center justify-center bg-white"
                        onPress={() => shiftDate(1)}
                    >
                        <Text className="font-lexend-bold text-lg text-dark-600">›</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {/* Create Assignment Form */}
                {showForm && (
                    <View className="mx-4 mt-4 bg-white rounded-2xl p-5" style={{ zIndex: 50 }}>
                        <View className="flex-row items-center justify-between mb-4">
                            <Text className="font-lexend-bold text-base text-dark-900">
                                New Assignment
                            </Text>
                            <TouchableOpacity onPress={() => { setShowForm(false); setShowComboPicker(false); }}>
                                <Text className="font-lexend-bold text-lg text-dark-400">✕</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Class/Subject Combo Picker */}
                        <View className="mb-3" style={{ zIndex: 60 }}>
                            <Text className="font-lexend-medium text-xs text-dark-500 mb-1.5 uppercase tracking-wider">
                                Class & Subject
                            </Text>
                            <TouchableOpacity
                                className="flex-row items-center bg-dark-50 rounded-xl px-3 py-2.5 border border-dark-200"
                                onPress={() => setShowComboPicker(!showComboPicker)}
                            >
                                <Text className="font-lexend-semibold text-sm text-dark-900 flex-1" numberOfLines={1}>
                                    {selectedCombo
                                        ? `${selectedCombo.class_name} - ${selectedCombo.section_name} - ${selectedCombo.subject_name}`
                                        : "Select class & subject"}
                                </Text>
                                <Text className="text-dark-400 text-xs">▼</Text>
                            </TouchableOpacity>
                            {showComboPicker && (
                                <View
                                    className="absolute top-16 left-0 right-0 bg-white rounded-xl border border-dark-200 shadow-lg max-h-52"
                                    style={{ zIndex: 100 }}
                                >
                                    <ScrollView nestedScrollEnabled>
                                        {classesLoading ? (
                                            <View className="p-4 items-center">
                                                <ActivityIndicator size="small" color="#6366f1" />
                                            </View>
                                        ) : teacherClasses.length === 0 ? (
                                            <View className="p-4 items-center">
                                                <Text className="font-lexend text-sm text-dark-400">
                                                    No classes assigned
                                                </Text>
                                            </View>
                                        ) : (
                                            teacherClasses.map((combo, i) => {
                                                const key = `${combo.class_id}-${combo.section_id}-${combo.subject_id}`;
                                                const isActive = selectedCombo &&
                                                    selectedCombo.class_id === combo.class_id &&
                                                    selectedCombo.section_id === combo.section_id &&
                                                    selectedCombo.subject_id === combo.subject_id;
                                                return (
                                                    <TouchableOpacity
                                                        key={key}
                                                        className={`px-4 py-3 border-b border-dark-100 ${isActive ? "bg-primary-50" : ""}`}
                                                        onPress={() => {
                                                            setSelectedCombo(combo);
                                                            setShowComboPicker(false);
                                                        }}
                                                    >
                                                        <Text className={`font-lexend-medium text-sm ${isActive ? "text-primary-600" : "text-dark-800"}`}>
                                                            {combo.class_name} - {combo.section_name}
                                                        </Text>
                                                        <Text className="font-lexend text-xs text-dark-400 mt-0.5">
                                                            {combo.subject_name}
                                                        </Text>
                                                    </TouchableOpacity>
                                                );
                                            })
                                        )}
                                    </ScrollView>
                                </View>
                            )}
                        </View>

                        {/* Assignment Text — always visible */}
                        <View className="mb-3">
                            <Text className="font-lexend-medium text-xs text-dark-500 mb-1.5 uppercase tracking-wider">
                                Assignment Details
                            </Text>
                            <TextInput
                                className="bg-dark-50 rounded-xl px-3 py-3 border border-dark-200 font-lexend text-sm text-dark-900 min-h-[80px]"
                                placeholder="Enter assignment instructions..."
                                placeholderTextColor="#94a3b8"
                                value={assignmentText}
                                onChangeText={setAssignmentText}
                                multiline
                                textAlignVertical="top"
                            />
                        </View>

                        {/* Add Drawing button */}
                        {!showDrawingCanvas && !assignmentDrawing && (
                            <TouchableOpacity
                                className="flex-row items-center mb-3"
                                onPress={() => setShowDrawingCanvas(true)}
                            >
                                <Text className="font-lexend-semibold text-xs text-primary-600">
                                    + Add Drawing
                                </Text>
                            </TouchableOpacity>
                        )}

                        {/* Drawing Canvas */}
                        {showDrawingCanvas && (
                            <View className="mb-3">
                                <View className="flex-row items-center justify-between mb-1.5">
                                    <Text className="font-lexend-medium text-xs text-dark-500 uppercase tracking-wider">
                                        Drawing
                                    </Text>
                                    <TouchableOpacity onPress={() => { setShowDrawingCanvas(false); setAssignmentDrawing(null); }}>
                                        <Text className="font-lexend-bold text-xs text-red-500">Remove</Text>
                                    </TouchableOpacity>
                                </View>
                                <DrawingCanvas
                                    onDrawingChange={setAssignmentDrawing}
                                    height={250}
                                />
                            </View>
                        )}

                        {/* Drawing thumbnail when canvas hidden */}
                        {!showDrawingCanvas && assignmentDrawing && (
                            <View className="flex-row items-center mb-3 px-3 py-2 bg-dark-50 rounded-xl border border-dark-200">
                                <Image
                                    source={{ uri: assignmentDrawing }}
                                    style={{ width: 40, height: 30, borderRadius: 4 }}
                                    resizeMode="contain"
                                />
                                <Text className="font-lexend text-xs text-dark-500 flex-1 ml-2">Drawing attached</Text>
                                <TouchableOpacity onPress={() => setShowDrawingCanvas(true)} className="mr-2">
                                    <Text className="font-lexend-bold text-xs text-primary-600">Edit</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => setAssignmentDrawing(null)}>
                                    <Text className="font-lexend-bold text-xs text-red-500">Remove</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Create Button */}
                        <TouchableOpacity
                            className="bg-primary-600 rounded-xl py-3 items-center"
                            onPress={handleCreate}
                            disabled={creating || (!assignmentText.trim() && !assignmentDrawing) || (showDrawingCanvas && !assignmentDrawing)}
                            activeOpacity={0.8}
                            style={(!assignmentText.trim() && !assignmentDrawing) || (showDrawingCanvas && !assignmentDrawing) ? { opacity: 0.5 } : {}}
                        >
                            {creating ? (
                                <ActivityIndicator size="small" color="#ffffff" />
                            ) : (
                                <Text className="font-lexend-bold text-sm text-white">
                                    Create Assignment
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                )}

                {/* Assignments List */}
                <View className="px-4 pt-4 pb-8">
                    <View className="flex-row items-center justify-between mb-3">
                        <Text className="font-lexend-semibold text-base text-dark-900">
                            {assignments.length > 0
                                ? `${assignments.length} Assignment${assignments.length > 1 ? "s" : ""}`
                                : "No Assignments"}
                        </Text>
                    </View>

                    {loading ? (
                        <View className="items-center py-16">
                            <ActivityIndicator size="large" color="#6366f1" />
                        </View>
                    ) : assignments.length === 0 ? (
                        <View className="bg-white rounded-2xl p-8 items-center">
                            <Text className="text-4xl mb-3">📝</Text>
                            <Text className="font-lexend-semibold text-base text-dark-700">
                                No assignments for this day
                            </Text>
                            <Text className="font-lexend text-sm text-dark-400 mt-1 text-center">
                                Tap the + button to create one.
                            </Text>
                        </View>
                    ) : (
                        assignments.map((assignment) => (
                            <AssignmentCard
                                key={assignment.id}
                                assignment={assignment}
                                onPress={() =>
                                    router.push({
                                        pathname: "/(teacher)/assignment-detail",
                                        params: { id: assignment.id },
                                    })
                                }
                            />
                        ))
                    )}
                </View>
            </ScrollView>

        </SafeAreaView>
    );
}

function AssignmentCard({ assignment, onPress }) {
    const stats = assignment.completion_stats;
    const total = stats?.total || 0;
    const completed = stats?.completed || 0;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return (
        <TouchableOpacity
            className="bg-white rounded-2xl p-4 mb-3"
            onPress={onPress}
            activeOpacity={0.7}
        >
            {/* Subject + Class */}
            <View className="flex-row items-start justify-between mb-2">
                <View className="flex-1 mr-3">
                    <Text className="font-lexend-bold text-base text-dark-900" numberOfLines={1}>
                        {assignment.subject_name}
                    </Text>
                    <Text className="font-lexend text-xs text-dark-400 mt-0.5">
                        {assignment.class_name}
                        {assignment.section_name ? ` - ${assignment.section_name}` : ""}
                    </Text>
                </View>
                <View className="bg-primary-50 rounded-full px-2.5 py-1">
                    <Text className="font-lexend-bold text-[10px] text-primary-600">
                        {completed}/{total}
                    </Text>
                </View>
            </View>

            {/* Assignment Text */}
            {assignment.assignment_text ? (
                <Text className="font-lexend text-sm text-dark-600 mb-3" numberOfLines={2}>
                    {assignment.assignment_text}
                </Text>
            ) : null}

            {/* Assignment Drawing */}
            {assignment.assignment_drawing ? (
                <Image
                    source={{ uri: assignment.assignment_drawing }}
                    className="w-full rounded-xl mb-3"
                    style={{ height: 120 }}
                    resizeMode="contain"
                />
            ) : null}

            {/* Progress Bar */}
            <View style={{ height: 8, backgroundColor: "#e2e8f0", borderRadius: 999, overflow: "hidden" }}>
                <View
                    style={{
                        height: 8,
                        borderRadius: 999,
                        backgroundColor: percentage === 100 ? "#22c55e" : "#6366f1",
                        width: `${percentage}%`,
                    }}
                />
            </View>
            <View className="flex-row items-center justify-between mt-1.5">
                <Text className="font-lexend-medium text-[10px] text-dark-400">
                    {percentage}% completed
                </Text>
                {stats?.pending > 0 && (
                    <Text className="font-lexend-medium text-[10px] text-amber-600">
                        {stats.pending} pending
                    </Text>
                )}
            </View>
        </TouchableOpacity>
    );
}
