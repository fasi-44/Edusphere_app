import { useState, useCallback, useEffect } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuthStore, useAppStore } from "../../store";
import { studentSyllabusService } from "../../services/student";

function formatDateShort(dateStr) {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`;
}

function formatDateRange(start, end) {
    if (!start) return "";
    const s = formatDateShort(start);
    const e = end ? formatDateShort(end) : "";
    return e ? `${s} - ${e}` : s;
}

export default function StudentSyllabusDetailScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const user = useAuthStore((s) => s.user);
    const academicYear = useAppStore((s) => s.academicYear);

    const skid = user?.skid;
    const studentId = user?.school_user_id;
    const teacherId = params.teacher_id ? parseInt(params.teacher_id) : null;
    const subjectName = params.subject_name || "Subject";

    const [syllabus, setSyllabus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchSyllabus = useCallback(async () => {
        if (!skid || !studentId || !academicYear?.id) {
            setLoading(false);
            setRefreshing(false);
            return;
        }
        try {
            const listRes = await studentSyllabusService.getSyllabusList(
                skid, academicYear.id, studentId
            );
            const items = listRes?.data?.data || listRes?.data || [];
            const subjectId = params.subject_id ? parseInt(params.subject_id) : null;

            let match = null;
            if (Array.isArray(items)) {
                match = items.find((item) => {
                    if (subjectId && item.subject_id === subjectId && (!teacherId || item.teacher_id === teacherId)) return true;
                    if (item.subject_name?.toLowerCase() === subjectName.toLowerCase() && (!teacherId || item.teacher_id === teacherId)) return true;
                    return false;
                });
            }

            if (match?.syllabus?.id) {
                const tId = match.teacher_id || teacherId;
                const detailRes = await studentSyllabusService.getSyllabusDetail(
                    skid, match.syllabus.id, tId
                );
                const data = detailRes?.data?.data || detailRes?.data;
                if (data) {
                    setSyllabus({
                        ...data,
                        subject_name: match.subject_name || subjectName,
                        teacher_name: match.teacher_name,
                    });
                } else {
                    setSyllabus(null);
                }
            } else {
                setSyllabus(null);
            }
        } catch (err) {
            console.error("Student syllabus fetch error:", err);
            setSyllabus(null);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [skid, studentId, academicYear?.id, teacherId, params.subject_id, subjectName]);

    useEffect(() => { fetchSyllabus(); }, [fetchSyllabus]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchSyllabus();
    }, [fetchSyllabus]);

    const completionPct = syllabus?.completion_percentage || 0;

    return (
        <SafeAreaView className="flex-1 bg-[#f7f6f8]" edges={["top"]}>
            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {/* ── Header ── */}
                <View
                    className="px-6 pt-4 pb-8"
                    style={{
                        backgroundColor: "#7c3aed",
                        borderBottomLeftRadius: 32,
                        borderBottomRightRadius: 32,
                    }}
                >
                    <View className="flex-row items-center justify-between mb-6">
                        <TouchableOpacity
                            onPress={() => router.back()}
                            className="w-10 h-10 items-center justify-center rounded-full"
                            style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
                        >
                            <Text className="text-white text-xl">&#x2039;</Text>
                        </TouchableOpacity>
                        <Text className="font-lexend-semibold text-lg text-white">
                            Syllabus Progress
                        </Text>
                        <View className="w-10" />
                    </View>

                    <Text className="font-lexend text-sm text-white/70 mb-1">
                        {syllabus?.teacher_name || syllabus?.title || subjectName}
                    </Text>
                    <View className="flex-row items-end justify-between">
                        <Text className="font-lexend-bold text-2xl text-white flex-1 mr-3">
                            {syllabus?.subject_name || subjectName}
                        </Text>
                        {syllabus && (
                            <View className="rounded-full px-3 py-1" style={{ backgroundColor: "rgba(255,255,255,0.2)" }}>
                                <Text className="font-lexend-medium text-xs text-white">
                                    {Math.round(completionPct)}% Complete
                                </Text>
                            </View>
                        )}
                    </View>

                    {syllabus && (
                        <View
                            style={{
                                marginTop: 16,
                                height: 8,
                                borderRadius: 9999,
                                backgroundColor: "rgba(255,255,255,0.2)",
                                overflow: "hidden",
                                flexDirection: "row",
                            }}
                        >
                            <View
                                style={{
                                    flex: Math.max(completionPct, 0),
                                    backgroundColor: "#ffffff",
                                    borderRadius: 9999,
                                }}
                            />
                            <View
                                style={{
                                    flex: Math.max(100 - completionPct, 0),
                                }}
                            />
                        </View>
                    )}
                </View>

                {/* ── Content ── */}
                {loading ? (
                    <View className="items-center py-16">
                        <ActivityIndicator size="large" color="#7c3aed" />
                    </View>
                ) : !syllabus ? (
                    <View className="px-6 py-16 items-center">
                        <Text className="text-4xl mb-3">&#x1F4DA;</Text>
                        <Text className="font-lexend-semibold text-base text-dark-700">No syllabus found</Text>
                        <Text className="font-lexend text-sm text-dark-400 text-center mt-1">
                            No syllabus has been published for this subject yet.
                        </Text>
                    </View>
                ) : (
                    <View className="px-4 py-6 mt-3">
                        {(syllabus.lessons || []).map((lesson, li) => (
                            <LessonSection key={lesson.id} lesson={lesson} index={li} />
                        ))}
                        {(syllabus.lessons || []).length === 0 && (
                            <View className="py-8 items-center">
                                <Text className="font-lexend text-sm text-dark-400 italic">
                                    No lessons added to this syllabus yet.
                                </Text>
                            </View>
                        )}
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

/* ── LESSON (Level 1) ── */
function LessonSection({ lesson, index }) {
    const isPending = lesson.status === "planned";
    const isFuture = isPending && !lesson.planned_start_date && index > 0;

    const topicCount = (lesson.topics || []).length;
    const subtopicCount = (lesson.topics || []).reduce((acc, t) => acc + (t.subtopics || []).length, 0);

    return (
        <View className={`mb-6 ${isFuture ? "opacity-50" : ""}`}>
            <View className="flex-row items-center gap-3 mb-4">
                <View
                    className="w-10 h-10 rounded-xl items-center justify-center"
                    style={{ backgroundColor: isFuture ? "#e2e8f0" : "rgba(124,58,237,0.1)" }}
                >
                    <Text style={{ color: isFuture ? "#94a3b8" : "#7c3aed", fontSize: 18 }}>&#x1F4C1;</Text>
                </View>
                <View className="flex-1">
                    <Text
                        className="font-lexend-bold text-lg leading-tight"
                        style={{ color: isFuture ? "#94a3b8" : "#0f172a" }}
                    >
                        Unit {index + 1}: {lesson.title}
                    </Text>
                    <Text className="font-lexend text-xs text-dark-400">
                        {isFuture ? "Coming up next" : `${topicCount} Topics \u2022 ${subtopicCount} Sub-topics`}
                    </Text>
                    {lesson.status === "completed" && lesson.completed_by && (
                        <Text className="font-lexend text-[10px] text-green-600 mt-0.5">
                            &#x2713; Completed by {lesson.completed_by}
                        </Text>
                    )}
                </View>
            </View>

            {!isFuture && (
                <View
                    className="mt-3"
                    style={{
                        borderLeftWidth: 2,
                        borderLeftColor: "rgba(124,58,237,0.2)",
                        marginLeft: 16,
                        paddingLeft: 16,
                    }}
                >
                    {(lesson.topics || []).map((topic, ti) => (
                        <TopicCard key={topic.id} topic={topic} lessonIndex={index} topicIndex={ti} />
                    ))}
                </View>
            )}
        </View>
    );
}

/* ── TOPIC (Level 2) ── */
function TopicCard({ topic, lessonIndex, topicIndex }) {
    const isActive = topic.status === "in_progress";
    const isCompleted = topic.status === "completed";
    const isPending = topic.status === "planned" && !topic.planned_start_date;

    const statusBadge = isActive
        ? { bg: "#dcfce7", text: "#15803d", label: "ACTIVE" }
        : isCompleted
        ? { bg: "#dcfce7", text: "#15803d", label: "COMPLETED" }
        : { bg: "#f1f5f9", text: "#64748b", label: "PENDING" };

    if (isPending) {
        return (
            <View
                className="p-4 rounded-xl mb-4"
                style={{ backgroundColor: "rgba(255,255,255,0.6)", borderWidth: 1, borderStyle: "dashed", borderColor: "#cbd5e1" }}
            >
                <Text className="font-lexend-semibold text-sm text-dark-400">
                    {lessonIndex + 1}.{topicIndex + 1} {topic.title}
                </Text>
                <Text className="font-lexend text-[10px] text-dark-400 uppercase tracking-wider mt-0.5">
                    Not started yet
                </Text>
            </View>
        );
    }

    return (
        <View className="mb-4">
            <View
                className="bg-white p-4 rounded-xl"
                style={{
                    borderWidth: 1,
                    borderColor: isActive ? "rgba(124,58,237,0.15)" : "#e2e8f0",
                    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
                }}
            >
                <View className="mb-2">
                    <Text
                        className="font-lexend-semibold text-sm"
                        style={{ color: isActive ? "#7c3aed" : isCompleted ? "#15803d" : "#334155" }}
                    >
                        {lessonIndex + 1}.{topicIndex + 1} {topic.title}
                    </Text>
                    <View className="mt-1 self-start rounded-full px-2 py-0.5" style={{ backgroundColor: statusBadge.bg }}>
                        <Text className="font-lexend-bold uppercase tracking-wider" style={{ fontSize: 9, color: statusBadge.text }}>
                            {statusBadge.label}
                        </Text>
                    </View>
                </View>

                {/* Date + teacher info */}
                <View className="mb-2">
                    {(topic.planned_start_date || topic.actual_start_date) && (
                        <View className="flex-row items-center">
                            <Text className="text-dark-400 text-xs mr-1">&#x1F4C5;</Text>
                            <Text className="font-lexend text-xs text-dark-400">
                                {formatDateRange(topic.actual_start_date || topic.planned_start_date, topic.actual_end_date || topic.planned_end_date)}
                            </Text>
                        </View>
                    )}
                    {topic.completed_by && (
                        <View className="flex-row items-center mt-1">
                            <Text className="text-dark-400 text-xs mr-1">&#x1F464;</Text>
                            <Text className="font-lexend text-xs text-dark-400">{topic.completed_by}</Text>
                        </View>
                    )}
                </View>

                {/* Notes + description */}
                {(topic.teacher_notes || topic.description) && (
                    <View className="mb-3">
                        {topic.teacher_notes && (
                            <Text className="font-lexend text-xs text-dark-600">
                                Note: {topic.teacher_notes}
                            </Text>
                        )}
                        {topic.description && (
                            <Text className="font-lexend text-xs text-dark-400 mt-1">
                                {topic.description}
                            </Text>
                        )}
                    </View>
                )}

                {/* Completed status */}
                {isCompleted && (
                    <View className="flex-row items-center mt-1">
                        <View
                            className="flex-1 py-2 rounded-lg flex-row items-center justify-center"
                            style={{ backgroundColor: "#22c55e" }}
                        >
                            <Text className="text-white mr-1.5">&#x2713;</Text>
                            <Text className="font-lexend-medium text-sm text-white">
                                Completed{topic.completed_by ? ` by ${topic.completed_by}` : ""}
                            </Text>
                        </View>
                    </View>
                )}

                {isActive && (
                    <View className="flex-row items-center mt-1">
                        <View
                            className="flex-1 py-2 rounded-lg flex-row items-center justify-center"
                            style={{ backgroundColor: "rgba(124,58,237,0.08)" }}
                        >
                            <Text className="font-lexend-medium text-sm" style={{ color: "#7c3aed" }}>In Progress</Text>
                        </View>
                    </View>
                )}
            </View>

            {/* Subtopics */}
            {(topic.subtopics || []).length > 0 && (
                <View
                    className="mt-2"
                    style={{
                        borderLeftWidth: 2,
                        borderLeftColor: "rgba(124,58,237,0.12)",
                        marginLeft: 8,
                        paddingLeft: 12,
                    }}
                >
                    {topic.subtopics.map((sub, si) => (
                        <SubtopicCard
                            key={sub.id}
                            subtopic={sub}
                            prefix={`${lessonIndex + 1}.${topicIndex + 1}.${si + 1}`}
                        />
                    ))}
                </View>
            )}
        </View>
    );
}

/* ── SUBTOPIC (Level 3) ── */
function SubtopicCard({ subtopic, prefix }) {
    const isCompleted = subtopic.status === "completed";
    const isInProgress = subtopic.status === "in_progress";

    return (
        <View className="bg-white p-4 rounded-xl mb-3" style={{ borderWidth: 1, borderColor: "#e2e8f0" }}>
            <View className="mb-1">
                <Text className="font-lexend-medium text-sm text-dark-600">
                    {prefix} {subtopic.title}
                </Text>
                {subtopic.completed_by && isCompleted && (
                    <View className="mt-1 self-start rounded px-2 py-0.5" style={{ backgroundColor: "rgba(124,58,237,0.08)" }}>
                        <Text className="font-lexend-bold uppercase" style={{ fontSize: 9, color: "#7c3aed", letterSpacing: 0.5 }}>
                            By {subtopic.completed_by}
                        </Text>
                    </View>
                )}
            </View>

            {(subtopic.description || subtopic.teacher_notes) && (
                <View className="mb-2">
                    {subtopic.teacher_notes && (
                        <Text className="font-lexend text-xs text-dark-600">
                            Note: {subtopic.teacher_notes}
                        </Text>
                    )}
                    {subtopic.description && (
                        <Text className="font-lexend text-xs text-dark-400 mt-1">
                            {subtopic.description}
                        </Text>
                    )}
                </View>
            )}

            {/* Dates */}
            {(isCompleted || isInProgress) && (
                <View className="flex-row gap-3 mt-3 mb-3">
                    <View className="flex-1">
                        <Text className="font-lexend-bold text-[10px] text-dark-400 uppercase tracking-wider mb-1">Start Date</Text>
                        <View className="bg-dark-50 rounded-lg py-2 px-3">
                            <Text className="font-lexend text-xs text-dark-600">
                                {formatDateShort(subtopic.actual_start_date || subtopic.planned_start_date || subtopic.planned_completion_date) || "\u2014"}
                            </Text>
                        </View>
                    </View>
                    <View className="flex-1">
                        <Text className="font-lexend-bold text-[10px] text-dark-400 uppercase tracking-wider mb-1">Expected End</Text>
                        <View className="bg-dark-50 rounded-lg py-2 px-3">
                            <Text className="font-lexend text-xs text-dark-600">
                                {formatDateShort(subtopic.actual_completion_date || subtopic.planned_end_date || subtopic.planned_completion_date) || "\u2014"}
                            </Text>
                        </View>
                    </View>
                </View>
            )}

            {isCompleted && (
                <View className="py-2 rounded-lg flex-row items-center justify-center" style={{ backgroundColor: "#22c55e" }}>
                    <Text className="text-white mr-1.5">&#x2713;</Text>
                    <Text className="font-lexend-medium text-sm text-white">Completed</Text>
                </View>
            )}

            {isInProgress && (
                <View className="py-2 rounded-lg flex-row items-center justify-center" style={{ backgroundColor: "rgba(124,58,237,0.08)" }}>
                    <Text className="font-lexend-medium text-sm" style={{ color: "#7c3aed" }}>In Progress</Text>
                </View>
            )}

            {!isCompleted && !isInProgress && (
                <Text className="font-lexend text-[10px] text-dark-400 italic mt-1">Not started yet</Text>
            )}
        </View>
    );
}
