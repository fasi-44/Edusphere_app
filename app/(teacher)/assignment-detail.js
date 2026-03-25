import { useEffect, useState, useCallback, useMemo } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Alert,
    Platform,
    Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuthStore, useAppStore } from "../../store";
import { assignmentService } from "../../services/teacher";

function getInitials(name) {
    if (!name) return "?";
    return name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
}

export default function AssignmentDetailScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const user = useAuthStore((s) => s.user);

    const skid = user?.skid;
    const teacherId = user?.school_user_id;

    const [assignment, setAssignment] = useState(null);
    const [students, setStudents] = useState([]);
    const [submissions, setSubmissions] = useState({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Edit mode for assignment text
    const [editing, setEditing] = useState(false);
    const [editText, setEditText] = useState("");

    const fetchDetail = useCallback(async () => {
        if (!skid || !id) return;
        try {
            const res = await assignmentService.getAssignmentDetail(skid, id);
            const data = res?.data;
            if (data) {
                setAssignment(data);
                setEditText(data.assignment_text || "");
                const studentList = data.students || [];
                setStudents(studentList);

                const initial = {};
                studentList.forEach((s) => {
                    initial[s.student_id] = {
                        is_completed: !!s.is_completed,
                        remarks: s.remarks || "",
                    };
                });
                setSubmissions(initial);
            }
        } catch (err) {
            console.error("Assignment detail error:", err);
        } finally {
            setLoading(false);
        }
    }, [skid, id]);

    useEffect(() => {
        fetchDetail();
    }, [fetchDetail]);

    const stats = useMemo(() => {
        const total = students.length;
        let completed = 0;
        Object.values(submissions).forEach((s) => {
            if (s.is_completed) completed++;
        });
        return { total, completed, pending: total - completed };
    }, [students, submissions]);

    const percentage = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

    const toggleStudent = (studentId) => {
        setSubmissions((prev) => ({
            ...prev,
            [studentId]: {
                ...prev[studentId],
                is_completed: !prev[studentId]?.is_completed,
            },
        }));
    };

    const setRemarks = (studentId, remarks) => {
        setSubmissions((prev) => ({
            ...prev,
            [studentId]: {
                ...prev[studentId],
                remarks,
            },
        }));
    };

    const markAllComplete = () => {
        setSubmissions((prev) => {
            const updated = { ...prev };
            students.forEach((s) => {
                updated[s.student_id] = {
                    ...updated[s.student_id],
                    is_completed: true,
                };
            });
            return updated;
        });
    };

    // Save submissions
    const handleSaveSubmissions = async () => {
        setSubmitting(true);
        try {
            const payload = {
                reviewer_id: teacherId,
                submissions: students.map((s) => ({
                    student_id: s.student_id,
                    is_completed: submissions[s.student_id]?.is_completed || false,
                    remarks: submissions[s.student_id]?.remarks || "",
                })),
            };
            await assignmentService.updateSubmissions(skid, id, payload);

            if (Platform.OS === "web") {
                alert("Submissions updated successfully!");
                router.replace("/(teacher)/assignments");
            } else {
                Alert.alert("Success", "Submissions updated successfully!", [
                    { text: "OK", onPress: () => router.replace("/(teacher)/assignments") },
                ]);
            }
        } catch (err) {
            const msg = err?.data?.message || "Failed to save submissions.";
            Platform.OS === "web" ? alert(msg) : Alert.alert("Error", msg);
        } finally {
            setSubmitting(false);
        }
    };

    // Update assignment text
    const handleUpdateText = async () => {
        if (!editText.trim()) return;
        try {
            await assignmentService.updateAssignment(skid, id, {
                assignment_text: editText.trim(),
            });
            setAssignment((prev) => ({ ...prev, assignment_text: editText.trim() }));
            setEditing(false);
        } catch (err) {
            const msg = err?.data?.message || "Failed to update assignment.";
            Platform.OS === "web" ? alert(msg) : Alert.alert("Error", msg);
        }
    };

    // Delete assignment
    const handleDelete = () => {
        const doDelete = async () => {
            try {
                await assignmentService.deleteAssignment(skid, id);
                router.replace("/(teacher)/assignments");
            } catch (err) {
                const msg = err?.data?.message || "Failed to delete assignment.";
                Platform.OS === "web" ? alert(msg) : Alert.alert("Error", msg);
            }
        };

        if (Platform.OS === "web") {
            if (confirm("Delete this assignment? This cannot be undone.")) doDelete();
        } else {
            Alert.alert("Delete Assignment", "Delete this assignment? This cannot be undone.", [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: doDelete },
            ]);
        }
    };

    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-dark-50 items-center justify-center">
                <ActivityIndicator size="large" color="#6366f1" />
            </SafeAreaView>
        );
    }

    if (!assignment) {
        return (
            <SafeAreaView className="flex-1 bg-dark-50 items-center justify-center px-6">
                <Text className="font-lexend text-sm text-dark-400">
                    Assignment not found.
                </Text>
                <TouchableOpacity className="mt-4" onPress={() => router.replace("/(teacher)/assignments")}>
                    <Text className="font-lexend-bold text-sm text-primary-600">Go Back</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-dark-50">
            {/* Header */}
            <View className="bg-white flex-row items-center px-4 pt-4 pb-3">
                <TouchableOpacity
                    className="w-9 h-9 rounded-full bg-dark-50 items-center justify-center mr-3"
                    onPress={() => router.replace("/(teacher)/assignments")}
                >
                    <Text className="font-lexend-bold text-lg text-dark-600">‹</Text>
                </TouchableOpacity>
                <View className="flex-1">
                    <Text className="font-lexend-bold text-lg text-dark-900" numberOfLines={1}>
                        {assignment.subject_name}
                    </Text>
                    <Text className="font-lexend text-xs text-dark-400">
                        {assignment.class_name}
                        {assignment.section_name ? ` - ${assignment.section_name}` : ""}
                    </Text>
                </View>
                <TouchableOpacity onPress={handleDelete}>
                    <Text className="text-red-500 text-lg">🗑</Text>
                </TouchableOpacity>
            </View>

            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                {/* Assignment Info Card */}
                <View className="mx-4 mt-4 bg-white rounded-2xl p-4">
                    <View className="flex-row items-center justify-between mb-2">
                        <Text className="font-lexend-bold text-[10px] text-dark-400 uppercase tracking-wider">
                            Assignment Details
                        </Text>
                        {!editing && (
                            <TouchableOpacity onPress={() => setEditing(true)}>
                                <Text className="font-lexend-medium text-xs text-primary-600">Edit</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                    {editing ? (
                        <View>
                            <TextInput
                                className="bg-dark-50 rounded-xl px-3 py-3 border border-dark-200 font-lexend text-sm text-dark-900 min-h-[80px]"
                                value={editText}
                                onChangeText={setEditText}
                                multiline
                                textAlignVertical="top"
                            />
                            <View className="flex-row gap-2 mt-3">
                                <TouchableOpacity
                                    className="flex-1 bg-dark-100 rounded-xl py-2.5 items-center"
                                    onPress={() => { setEditing(false); setEditText(assignment.assignment_text || ""); }}
                                >
                                    <Text className="font-lexend-semibold text-sm text-dark-600">Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    className="flex-1 bg-primary-600 rounded-xl py-2.5 items-center"
                                    onPress={handleUpdateText}
                                >
                                    <Text className="font-lexend-semibold text-sm text-white">Save</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <View>
                            {assignment.assignment_text ? (
                                <Text className="font-lexend text-sm text-dark-700 leading-5">
                                    {assignment.assignment_text}
                                </Text>
                            ) : null}
                            {assignment.assignment_drawing ? (
                                <Image
                                    source={{ uri: assignment.assignment_drawing }}
                                    className={`w-full rounded-xl ${assignment.assignment_text ? "mt-3" : ""}`}
                                    style={{ height: 200 }}
                                    resizeMode="contain"
                                />
                            ) : null}
                        </View>
                    )}

                    <View className="flex-row items-center mt-3 pt-3 border-t border-dark-100">
                        <Text className="text-dark-400 text-xs mr-1.5">📅</Text>
                        <Text className="font-lexend text-xs text-dark-500">
                            {assignment.assignment_date}
                        </Text>
                    </View>
                </View>

                {/* Stats */}
                <View className="flex-row px-4 pt-4 gap-3">
                    <View className="flex-1 bg-white rounded-xl p-3 border border-dark-100">
                        <View className="flex-row items-center gap-1.5 mb-1">
                            <View className="w-2 h-2 rounded-full bg-blue-500" />
                            <Text className="font-lexend-medium text-[10px] text-dark-400 uppercase tracking-wider">
                                Total
                            </Text>
                        </View>
                        <Text className="font-lexend-bold text-2xl text-dark-900">{stats.total}</Text>
                    </View>
                    <View className="flex-1 bg-white rounded-xl p-3 border border-dark-100">
                        <View className="flex-row items-center gap-1.5 mb-1">
                            <View className="w-2 h-2 rounded-full bg-green-500" />
                            <Text className="font-lexend-medium text-[10px] text-dark-400 uppercase tracking-wider">
                                Done
                            </Text>
                        </View>
                        <Text className="font-lexend-bold text-2xl text-dark-900">{stats.completed}</Text>
                    </View>
                    <View className="flex-1 bg-white rounded-xl p-3 border border-dark-100">
                        <View className="flex-row items-center gap-1.5 mb-1">
                            <View className="w-2 h-2 rounded-full bg-amber-500" />
                            <Text className="font-lexend-medium text-[10px] text-dark-400 uppercase tracking-wider">
                                Pending
                            </Text>
                        </View>
                        <Text className="font-lexend-bold text-2xl text-dark-900">{stats.pending}</Text>
                    </View>
                </View>

                {/* Student List Header */}
                <View className="flex-row items-center justify-between px-4 pt-4 pb-2">
                    <Text className="font-lexend-bold text-base text-dark-900">
                        Students ({stats.total})
                    </Text>
                    <TouchableOpacity onPress={markAllComplete}>
                        <Text className="font-lexend-bold text-sm text-primary-600">
                            Mark All Done
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Student Cards */}
                <View className="px-4 pb-28">
                    {students.map((student) => (
                        <StudentRow
                            key={student.student_id}
                            student={student}
                            isCompleted={submissions[student.student_id]?.is_completed || false}
                            remarks={submissions[student.student_id]?.remarks || ""}
                            onToggle={() => toggleStudent(student.student_id)}
                            onRemarksChange={(text) => setRemarks(student.student_id, text)}
                        />
                    ))}

                    {students.length === 0 && (
                        <View className="bg-white rounded-2xl p-8 items-center">
                            <Text className="font-lexend text-sm text-dark-400">
                                No students found for this assignment.
                            </Text>
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* Save Button */}
            {students.length > 0 && (
                <View className="absolute bottom-0 left-0 right-0 px-4 py-4 bg-white border-t border-dark-100">
                    <TouchableOpacity
                        className="bg-primary-600 rounded-xl py-3.5 flex-row items-center justify-center"
                        onPress={handleSaveSubmissions}
                        disabled={submitting}
                        activeOpacity={0.8}
                    >
                        {submitting ? (
                            <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                            <>
                                <Text className="text-white mr-2">✓</Text>
                                <Text className="font-lexend-bold text-base text-white">
                                    Save Submissions
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            )}
        </SafeAreaView>
    );
}

function StudentRow({ student, isCompleted, remarks, onToggle, onRemarksChange }) {
    const [showRemarks, setShowRemarks] = useState(false);

    return (
        <View className="bg-white rounded-2xl p-4 mb-3">
            <View className="flex-row items-center">
                {/* Avatar */}
                <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
                    isCompleted ? "bg-green-100" : "bg-primary-100"
                }`}>
                    <Text className={`font-lexend-bold text-sm ${
                        isCompleted ? "text-green-600" : "text-primary-600"
                    }`}>
                        {getInitials(student.student_name)}
                    </Text>
                </View>

                {/* Info */}
                <View className="flex-1">
                    <Text className="font-lexend-medium text-sm text-dark-900" numberOfLines={1}>
                        {student.student_name}
                    </Text>
                    {student.roll_no && (
                        <Text className="font-lexend text-xs text-dark-400">
                            Roll No: {student.roll_no}
                        </Text>
                    )}
                </View>

                {/* Toggle Button */}
                <TouchableOpacity
                    className={`rounded-xl px-4 py-2 flex-row items-center ${
                        isCompleted ? "bg-green-500" : "bg-dark-100"
                    }`}
                    onPress={onToggle}
                    activeOpacity={0.7}
                >
                    <Text className={`font-lexend-bold text-xs mr-1.5 ${
                        isCompleted ? "text-white" : "text-dark-500"
                    }`}>
                        ✓
                    </Text>
                    <Text className={`font-lexend-bold text-xs ${
                        isCompleted ? "text-white" : "text-dark-500"
                    }`}>
                        {isCompleted ? "Done" : "Pending"}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Remarks toggle */}
            <TouchableOpacity
                className="mt-2 pt-2 border-t border-dark-100"
                onPress={() => setShowRemarks(!showRemarks)}
            >
                <Text className="font-lexend-medium text-xs text-primary-600">
                    {showRemarks ? "Hide remarks" : remarks ? "View remarks" : "Add remarks"}
                </Text>
            </TouchableOpacity>

            {showRemarks && (
                <TextInput
                    className="bg-dark-50 rounded-lg px-3 py-2 mt-2 border border-dark-200 font-lexend text-xs text-dark-900"
                    placeholder="Add remarks..."
                    placeholderTextColor="#94a3b8"
                    value={remarks}
                    onChangeText={onRemarksChange}
                />
            )}
        </View>
    );
}
