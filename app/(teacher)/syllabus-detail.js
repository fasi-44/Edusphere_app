import { useState, useCallback, useEffect } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Alert,
    Platform,
    TextInput,
    Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuthStore, useAppStore } from "../../store";
import { syllabusService } from "../../services/teacher";

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

function countItems(lessons) {
    let topics = 0;
    let subtopics = 0;
    (lessons || []).forEach((l) => {
        const t = l.topics || [];
        topics += t.length;
        t.forEach((tp) => { subtopics += (tp.subtopics || []).length; });
    });
    return { topics, subtopics };
}

// Helper to determine timeline state (matching web version logic)
function getTimelineState(item) {
    const status = item.status;
    const hasPlannedDates = !!(item.planned_start_date || item.planned_end_date);
    const isGrandfathered = (status === 'in_progress' || status === 'completed') && !hasPlannedDates;

    return {
        isUnconfigured: !hasPlannedDates && status !== 'in_progress' && status !== 'completed',
        isPlanned: status === 'planned' && hasPlannedDates,
        isStarted: status === 'in_progress',
        isCompleted: status === 'completed',
        isGrandfathered,
        canMarkProgress: status === 'in_progress' || status === 'completed',
    };
}

export default function TeacherSyllabusDetailScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const user = useAuthStore((s) => s.user);
    const academicYear = useAppStore((s) => s.academicYear);

    const skid = user?.skid;
    const teacherId = user?.school_user_id;
    const subjectName = params.subject_name || "Subject";

    const [syllabus, setSyllabus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [actionLoading, setActionLoading] = useState(null);

    // Configuration modal state
    const [showConfigModal, setShowConfigModal] = useState(false);
    const [configTarget, setConfigTarget] = useState(null); // {itemType, itemId, itemTitle, existingDates}

    const fetchSyllabus = useCallback(async () => {
        if (!skid || !teacherId) {
            setLoading(false);
            setRefreshing(false);
            return;
        }
        try {
            const listRes = await syllabusService.getSyllabusBySubject(
                skid, teacherId, academicYear?.id
            );
            const items = listRes?.data?.data || listRes?.data || [];
            const subjectId = params.subject_id ? parseInt(params.subject_id) : null;

            let match = null;
            if (Array.isArray(items)) {
                match = items.find((item) => {
                    if (subjectId && item.subject_id === subjectId) return true;
                    if (item.syllabus?.title?.toLowerCase().includes(subjectName.toLowerCase())) return true;
                    if (item.subject_name?.toLowerCase() === subjectName.toLowerCase()) return true;
                    return false;
                });
            }

            if (match?.syllabus?.id) {
                const detailRes = await syllabusService.getSyllabusDetail(
                    skid, match.syllabus.id, teacherId
                );
                const data = detailRes?.data?.data || detailRes?.data;
                if (data) {
                    setSyllabus({ ...data, subject_name: match.subject_name || subjectName });
                } else {
                    setSyllabus(null);
                }
            } else {
                setSyllabus(null);
            }
        } catch (err) {
            console.error("Syllabus fetch error:", err);
            setSyllabus(null);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [skid, teacherId, academicYear?.id, params.subject_id, subjectName]);

    useEffect(() => { fetchSyllabus(); }, [fetchSyllabus]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchSyllabus();
    }, [fetchSyllabus]);

    const showError = (msg) => {
        if (Platform.OS === "web") alert(msg);
        else Alert.alert("Error", msg);
    };

    // Open configuration modal
    const handleConfigureClick = (itemType, item) => {
        setConfigTarget({
            itemType,
            itemId: item.id,
            itemTitle: item.title,
            existingDates: {
                planned_start_date: item.planned_start_date,
                planned_end_date: item.planned_end_date,
                teacher_notes: item.teacher_notes,
            },
        });
        setShowConfigModal(true);
    };

    // Save configuration (called from modal)
    const handleConfigureSave = async (startDate, endDate, notes) => {
        if (!configTarget) return;
        setActionLoading(`configure-${configTarget.itemType}-${configTarget.itemId}`);
        try {
            await syllabusService.configureTimeline(skid, {
                item_type: configTarget.itemType,
                item_id: configTarget.itemId,
                planned_start_date: startDate,
                planned_end_date: endDate,
                teacher_notes: notes || undefined,
            });
            setShowConfigModal(false);
            setConfigTarget(null);
            await fetchSyllabus();
        } catch (err) {
            showError(err?.response?.data?.message || "Failed to configure timeline");
        } finally {
            setActionLoading(null);
        }
    };

    const handleStart = async (itemType, itemId) => {
        setActionLoading(`start-${itemType}-${itemId}`);
        try {
            await syllabusService.startItem(skid, { item_type: itemType, item_id: itemId });
            await fetchSyllabus();
        } catch (err) {
            showError(err?.response?.data?.message || "Failed to start item");
        } finally { setActionLoading(null); }
    };

    const handleMarkComplete = async (itemType, itemId, isCompleted) => {
        setActionLoading(`mark-${itemType}-${itemId}`);
        try {
            await syllabusService.markProgress(skid, {
                item_type: itemType, item_id: itemId, is_completed: isCompleted,
            });
            await fetchSyllabus();
        } catch (err) {
            showError(err?.response?.data?.message || "Failed to update progress");
        } finally { setActionLoading(null); }
    };

    const completionPct = syllabus?.completion_percentage || 0;

    return (
        <SafeAreaView className="flex-1 bg-[#f7f6f8]" edges={["top"]}>
            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {/* ── Header with gradient ── */}
                <View
                    className="px-6 pt-4 pb-8"
                    style={{
                        backgroundColor: "#7c3aed",
                        borderBottomLeftRadius: 32,
                        borderBottomRightRadius: 32,
                    }}
                >
                    {/* Top bar */}
                    <View className="flex-row items-center justify-between mb-6">
                        <TouchableOpacity
                            onPress={() => router.back()}
                            className="w-10 h-10 items-center justify-center rounded-full"
                            style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
                            activeOpacity={0.7}
                        >
                            <Text className="text-white text-xl">&#x2039;</Text>
                        </TouchableOpacity>
                        <Text className="font-lexend-semibold text-lg text-white">
                            Detailed Syllabus
                        </Text>
                        <View className="w-10" />
                    </View>

                    {/* Subject info */}
                    <Text className="font-lexend text-sm text-white/70 mb-1">
                        {syllabus?.title || subjectName}
                    </Text>
                    <View className="flex-row items-end justify-between">
                        <Text className="font-lexend-bold text-2xl text-white flex-1 mr-3">
                            {syllabus?.subject_name || subjectName}
                        </Text>
                        {syllabus && (
                            <View
                                className="rounded-full px-3 py-1"
                                style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
                            >
                                <Text className="font-lexend-medium text-xs text-white">
                                    {Math.round(completionPct)}% Complete
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Progress bar */}
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
                        <Text className="font-lexend-semibold text-base text-dark-700">
                            No syllabus found
                        </Text>
                        <Text className="font-lexend text-sm text-dark-400 text-center mt-1">
                            No syllabus has been created for this subject yet.
                        </Text>
                    </View>
                ) : (
                    <View className="px-4 py-6 mt-3">
                        {(syllabus.lessons || []).map((lesson, li) => (
                            <LessonSection
                                key={lesson.id}
                                lesson={lesson}
                                index={li}
                                totalLessons={(syllabus.lessons || []).length}
                                actionLoading={actionLoading}
                                onConfigureClick={handleConfigureClick}
                                onStart={handleStart}
                                onMarkComplete={handleMarkComplete}
                            />
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

            {/* Configuration Modal */}
            <ConfigureModal
                visible={showConfigModal}
                onClose={() => {
                    setShowConfigModal(false);
                    setConfigTarget(null);
                }}
                onSave={handleConfigureSave}
                configTarget={configTarget}
                loading={!!actionLoading}
            />
        </SafeAreaView>
    );
}

/* ═══════════════════════════════════════════════
   LESSON (Level 1) — Unit header row
   ═══════════════════════════════════════════════ */
function LessonSection({ lesson, index, totalLessons, actionLoading, onConfigureClick, onStart, onMarkComplete }) {
    const isActive = lesson.status === "in_progress";
    const isCompleted = lesson.status === "completed";
    const isPending = lesson.status === "planned";
    const isFuture = isPending && !lesson.planned_start_date && index > 0;

    const topicCount = (lesson.topics || []).length;
    const subtopicCount = (lesson.topics || []).reduce((acc, t) => acc + (t.subtopics || []).length, 0);

    return (
        <View className={`mb-6 ${isFuture ? "opacity-50" : ""}`}>
            {/* Unit header */}
            <View className="flex-row items-center gap-3 mb-4">
                <View
                    className="w-10 h-10 rounded-xl items-center justify-center"
                    style={{ backgroundColor: isFuture ? "#e2e8f0" : "rgba(124,58,237,0.1)" }}
                >
                    <Text style={{ color: isFuture ? "#94a3b8" : "#7c3aed", fontSize: 18 }}>
                        &#x1F4C1;
                    </Text>
                </View>
                <View className="flex-1">
                    <Text
                        className="font-lexend-bold text-lg leading-tight"
                        style={{ color: isFuture ? "#94a3b8" : "#0f172a" }}
                    >
                        Unit {index + 1}: {lesson.title}
                    </Text>
                    <Text className="font-lexend text-xs text-dark-400">
                        {isFuture
                            ? "Coming up next"
                            : `${topicCount} Topics \u2022 ${subtopicCount} Sub-topics`}
                    </Text>
                </View>
            </View>

            {/* Topics (Level 2) */}
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
                        <TopicCard
                            key={topic.id}
                            topic={topic}
                            lessonIndex={index}
                            topicIndex={ti}
                            actionLoading={actionLoading}
                            onConfigureClick={onConfigureClick}
                            onStart={onStart}
                            onMarkComplete={onMarkComplete}
                        />
                    ))}
                </View>
            )}
        </View>
    );
}

/* ═══════════════════════════════════════════════
   TOPIC (Level 2) — White card with border
   ═══════════════════════════════════════════════ */
function TopicCard({ topic, lessonIndex, topicIndex, actionLoading, onConfigureClick, onStart, onMarkComplete }) {
    const isActive = topic.status === "in_progress";
    const isCompleted = topic.status === "completed";
    const isPending = topic.status === "planned" && !topic.planned_start_date;
    const isConfigured = topic.status === "planned" && !!topic.planned_start_date;

    const statusBadge = isActive
        ? { bg: "#dcfce7", text: "#15803d", label: "ACTIVE" }
        : isCompleted
        ? { bg: "#dcfce7", text: "#15803d", label: "COMPLETED" }
        : isConfigured
        ? { bg: "#fef3c7", text: "#a16207", label: "CONFIGURED" }
        : { bg: "#f1f5f9", text: "#64748b", label: "PENDING" };

    // Pending topic with no config → dashed border card (using timeline state check)
    const tl = getTimelineState(topic);
    if (tl.isUnconfigured) {
        return (
            <View
                className="p-4 rounded-xl mb-4"
                style={{
                    backgroundColor: "rgba(255,255,255,0.6)",
                    borderWidth: 1,
                    borderStyle: "dashed",
                    borderColor: "#cbd5e1",
                }}
            >
                <View className="flex-row items-center justify-between">
                    <View className="flex-1 mr-3">
                        <Text className="font-lexend-semibold text-sm text-dark-400">
                            {lessonIndex + 1}.{topicIndex + 1} {topic.title}
                        </Text>
                        <Text className="font-lexend text-[10px] text-dark-400 uppercase tracking-wider mt-0.5">
                            Pending Configuration
                        </Text>
                    </View>
                    <TouchableOpacity
                        className="px-4 py-2 rounded-lg"
                        style={{ backgroundColor: "rgba(124,58,237,0.15)" }}
                        onPress={() => onConfigureClick("topic", topic)}
                        disabled={!!actionLoading}
                    >
                        {actionLoading === `configure-topic-${topic.id}` ? (
                            <ActivityIndicator size="small" color="#7c3aed" />
                        ) : (
                            <Text className="font-lexend-medium text-xs" style={{ color: "#7c3aed" }}>Configure</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View className="mb-4">
            {/* Topic card */}
            <View
                className="bg-white p-4 rounded-xl"
                style={{
                    borderWidth: 1,
                    borderColor: isActive ? "rgba(124,58,237,0.15)" : "#e2e8f0",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.04,
                    shadowRadius: 4,
                    elevation: 1,
                }}
            >
                {/* Title + status badge */}
                <View className="mb-2">
                    <Text
                        className="font-lexend-semibold text-sm"
                        style={{ color: isActive ? "#7c3aed" : isCompleted ? "#15803d" : "#334155" }}
                    >
                        {lessonIndex + 1}.{topicIndex + 1} {topic.title}
                    </Text>
                    <View className="mt-1 self-start rounded-full px-2 py-0.5" style={{ backgroundColor: statusBadge.bg }}>
                        <Text
                            className="font-lexend-bold uppercase tracking-wider"
                            style={{ fontSize: 9, color: statusBadge.text }}
                        >
                            {statusBadge.label}
                        </Text>
                    </View>
                </View>

                {/* Date + teacher row */}
                {(topic.planned_start_date || topic.completed_by) && (
                    <View className="mb-4">
                        {topic.planned_start_date && (
                            <View className="flex-row items-center">
                                <Text className="text-dark-400 text-xs mr-1">&#x1F4C5;</Text>
                                <Text className="font-lexend text-xs text-dark-400">
                                    {formatDateRange(topic.planned_start_date, topic.planned_end_date)}
                                </Text>
                            </View>
                        )}
                        {topic.completed_by && (
                            <View className="flex-row items-center mt-1">
                                <Text className="text-dark-400 text-xs mr-1">&#x1F464;</Text>
                                <Text className="font-lexend text-xs text-dark-400">
                                    {topic.completed_by}
                                </Text>
                            </View>
                        )}
                    </View>
                )}

                {/* Notes + description */}
                {(topic.teacher_notes || topic.description) && (
                    <View className="mb-4">
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

                {/* Action buttons */}
                {topic.editable !== false && (
                    <TopicActions
                        topic={topic}
                        actionLoading={actionLoading}
                        onConfigureClick={onConfigureClick}
                        onStart={onStart}
                        onMarkComplete={onMarkComplete}
                    />
                )}
            </View>

            {/* Subtopics (Level 3) */}
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
                            actionLoading={actionLoading}
                            onConfigureClick={onConfigureClick}
                            onStart={onStart}
                            onMarkComplete={onMarkComplete}
                        />
                    ))}
                </View>
            )}
        </View>
    );
}

function TopicActions({ topic, actionLoading, onConfigureClick, onStart, onMarkComplete }) {
    const busy = !!actionLoading;
    const isLoading = (type) => actionLoading === `${type}-topic-${topic.id}`;
    const tl = getTimelineState(topic);

    // Unconfigured → Only show Configure button (handled in parent, won't reach here)
    if (tl.isUnconfigured) {
        return null; // This case is handled in the dashed border card above
    }

    // Grandfathered (in_progress or completed but never configured) → Require configuration first
    if (tl.isGrandfathered) {
        return (
            <View className="flex-row items-center gap-2">
                <Text className="font-lexend text-xs text-orange-600 flex-1">
                    ⚠ Please configure timeline before marking progress
                </Text>
                <TouchableOpacity
                    className="px-4 py-2.5 rounded-lg"
                    style={{ backgroundColor: "rgba(124,58,237,0.15)" }}
                    onPress={() => onConfigureClick("topic", topic)}
                    disabled={busy}
                >
                    <Text className="font-lexend-medium text-xs" style={{ color: "#7c3aed" }}>Configure</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // Planned (configured but not started) → Start button only (no configure)
    if (tl.isPlanned) {
        return (
            <TouchableOpacity
                className="py-2.5 rounded-lg items-center"
                style={{ backgroundColor: "#7c3aed", shadowColor: "#7c3aed", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 3 }}
                onPress={() => onStart("topic", topic.id)}
                disabled={busy}
            >
                {isLoading("start") ? (
                    <ActivityIndicator size="small" color="#fff" />
                ) : (
                    <Text className="font-lexend-medium text-sm text-white">▶ Start</Text>
                )}
            </TouchableOpacity>
        );
    }

    // In progress (and configured) → Mark Complete button only (no configure)
    if (tl.isStarted) {
        return (
            <TouchableOpacity
                className="py-2.5 rounded-lg items-center"
                style={{ backgroundColor: "#7c3aed", shadowColor: "#7c3aed", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 3 }}
                onPress={() => onMarkComplete("topic", topic.id, true)}
                disabled={busy}
            >
                {isLoading("mark") ? (
                    <ActivityIndicator size="small" color="#fff" />
                ) : (
                    <Text className="font-lexend-medium text-sm text-white">✓ Mark Complete</Text>
                )}
            </TouchableOpacity>
        );
    }

    // Completed → green completed button with Undo
    if (tl.isCompleted) {
        return (
            <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                    <Text className="text-green-500 mr-1">✓</Text>
                    <Text className="font-lexend-medium text-sm text-green-600">Completed</Text>
                </View>
                {topic.editable !== false && (
                    <TouchableOpacity onPress={() => onMarkComplete("topic", topic.id, false)} disabled={busy}>
                        {isLoading("mark") ? (
                            <ActivityIndicator size="small" color="#7c3aed" />
                        ) : (
                            <Text className="font-lexend-medium text-xs" style={{ color: "#7c3aed" }}>Undo</Text>
                        )}
                    </TouchableOpacity>
                )}
            </View>
        );
    }

    return null;
}

/* ═══════════════════════════════════════════════
   SUBTOPIC (Level 3) — smaller card
   ═══════════════════════════════════════════════ */
function SubtopicCard({ subtopic, prefix, actionLoading, onConfigureClick, onStart, onMarkComplete }) {
    const busy = !!actionLoading;
    const isLoading = (type) => actionLoading === `${type}-subtopic-${subtopic.id}`;
    const tl = getTimelineState(subtopic);

    return (
        <View
            className="bg-white p-4 rounded-xl mb-3"
            style={{ borderWidth: 1, borderColor: "#e2e8f0" }}
        >
            {/* Header: title + badge */}
            <View className="mb-1">
                <Text className="font-lexend-medium text-sm text-dark-600">
                    {prefix} {subtopic.title}
                </Text>
                <View className="flex-row items-center justify-between mt-1">
                    {subtopic.completed_by && tl.isCompleted ? (
                        <View
                            className="rounded px-2 py-0.5"
                            style={{ backgroundColor: "rgba(124,58,237,0.08)" }}
                        >
                            <Text className="font-lexend-bold uppercase" style={{ fontSize: 9, color: "#7c3aed", letterSpacing: 0.5 }}>
                                By {subtopic.completed_by}
                            </Text>
                        </View>
                    ) : (
                        <View />
                    )}
                    {tl.isUnconfigured && subtopic.editable !== false && (
                        <TouchableOpacity onPress={() => onConfigureClick("subtopic", subtopic)}>
                            <Text className="font-lexend-semibold text-xs" style={{ color: "#7c3aed" }}>
                                Configure
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
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

            {/* Dates (for configured / completed subtopics) */}
            {(tl.isPlanned || tl.isStarted || tl.isCompleted) && (
                <View className="flex-row gap-3 mt-3 mb-3">
                    <View className="flex-1">
                        <Text className="font-lexend-bold text-[10px] text-dark-400 uppercase tracking-wider mb-1">
                            Start Date
                        </Text>
                        <View className="bg-dark-50 rounded-lg py-2 px-3">
                            <Text className="font-lexend text-xs text-dark-600">
                                {formatDateShort(subtopic.actual_start_date || subtopic.planned_start_date || subtopic.planned_completion_date) || "—"}
                            </Text>
                        </View>
                    </View>
                    <View className="flex-1">
                        <Text className="font-lexend-bold text-[10px] text-dark-400 uppercase tracking-wider mb-1">
                            Expected End
                        </Text>
                        <View className="bg-dark-50 rounded-lg py-2 px-3">
                            <Text className="font-lexend text-xs text-dark-600">
                                {formatDateShort(subtopic.actual_completion_date || subtopic.planned_end_date || subtopic.planned_completion_date) || "—"}
                            </Text>
                        </View>
                    </View>
                </View>
            )}

            {/* Grandfathered (in_progress but not configured) → Require configuration */}
            {tl.isGrandfathered && subtopic.editable !== false && (
                <View className="flex-row items-center gap-2">
                    <Text className="font-lexend text-xs text-orange-600 flex-1">
                        ⚠ Configure timeline first
                    </Text>
                    <TouchableOpacity
                        className="px-4 py-2.5 rounded-lg"
                        style={{ backgroundColor: "rgba(124,58,237,0.15)" }}
                        onPress={() => onConfigureClick("subtopic", subtopic)}
                        disabled={busy}
                    >
                        <Text className="font-lexend-medium text-xs" style={{ color: "#7c3aed" }}>Configure</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Configured but not started → Start button only (no configure) */}
            {tl.isPlanned && subtopic.editable !== false && (
                <TouchableOpacity
                    className="py-2.5 rounded-lg items-center"
                    style={{ backgroundColor: "#7c3aed" }}
                    onPress={() => onStart("subtopic", subtopic.id)}
                    disabled={busy}
                >
                    {isLoading("start") ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text className="font-lexend-bold text-sm text-white">▶ Start</Text>
                    )}
                </TouchableOpacity>
            )}

            {/* In progress (and configured) → Mark Complete button only (no configure) */}
            {tl.isStarted && subtopic.editable !== false && (
                <TouchableOpacity
                    className="py-2.5 rounded-lg items-center"
                    style={{ backgroundColor: "#7c3aed", shadowColor: "#7c3aed", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 3 }}
                    onPress={() => onMarkComplete("subtopic", subtopic.id, true)}
                    disabled={busy}
                >
                    {isLoading("mark") ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text className="font-lexend-medium text-sm text-white">✓ Mark Complete</Text>
                    )}
                </TouchableOpacity>
            )}

            {/* Completed button */}
            {tl.isCompleted && (
                <View className="flex-row items-center justify-between">
                    <TouchableOpacity
                        className="flex-1 py-2.5 rounded-lg flex-row items-center justify-center"
                        style={{ backgroundColor: "#22c55e" }}
                        activeOpacity={1}
                    >
                        <Text className="text-white mr-1.5">✓</Text>
                        <Text className="font-lexend-medium text-sm text-white">Completed</Text>
                    </TouchableOpacity>
                    {subtopic.editable !== false && (
                        <TouchableOpacity
                            className="ml-2 px-3 py-2.5"
                            onPress={() => onMarkComplete("subtopic", subtopic.id, false)}
                            disabled={busy}
                        >
                            {isLoading("mark") ? (
                                <ActivityIndicator size="small" color="#7c3aed" />
                            ) : (
                                <Text className="font-lexend-medium text-xs" style={{ color: "#7c3aed" }}>Undo</Text>
                            )}
                        </TouchableOpacity>
                    )}
                </View>
            )}
        </View>
    );
}

/* ═══════════════════════════════════════════════
   CONFIGURE MODAL — Timeline configuration
   ═══════════════════════════════════════════════ */
function ConfigureModal({ visible, onClose, onSave, configTarget, loading }) {
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [notes, setNotes] = useState("");
    const [errors, setErrors] = useState({});

    // Update fields when configTarget changes
    useEffect(() => {
        if (configTarget?.existingDates) {
            setStartDate(configTarget.existingDates.planned_start_date || "");
            setEndDate(configTarget.existingDates.planned_end_date || "");
            setNotes(configTarget.existingDates.teacher_notes || "");
        } else {
            setStartDate("");
            setEndDate("");
            setNotes("");
        }
        setErrors({});
    }, [configTarget]);

    const validate = () => {
        const newErrors = {};
        if (!startDate) newErrors.startDate = "Start date is required";
        if (!endDate) newErrors.endDate = "End date is required";
        if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
            newErrors.endDate = "End date must be on or after start date";
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = () => {
        if (!validate()) return;
        onSave(startDate, endDate, notes);
    };

    if (!configTarget) return null;

    const typeLabel = configTarget.itemType?.charAt(0).toUpperCase() + configTarget.itemType?.slice(1);

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View className="flex-1 bg-black/50 justify-center items-center px-4">
                <View className="bg-white rounded-2xl w-full max-w-lg" style={{ maxWidth: 500 }}>
                    {/* Header */}
                    <View className="px-6 pt-6 pb-4 border-b border-gray-200">
                        <Text className="font-lexend-bold text-xl text-dark-900">
                            Configure {typeLabel} Timeline
                        </Text>
                        <Text className="font-lexend text-sm text-dark-600 mt-1">
                            {configTarget.itemTitle}
                        </Text>
                    </View>

                    {/* Form */}
                    <ScrollView className="px-6 py-4" style={{ maxHeight: 400 }}>
                        {/* Start Date */}
                        <View className="mb-4">
                            <Text className="font-lexend-medium text-sm text-dark-700 mb-2">
                                Planned Start Date <Text className="text-red-500">*</Text>
                            </Text>
                            <TextInput
                                className="bg-gray-50 rounded-lg py-3 px-4 font-lexend text-sm text-dark-900"
                                style={{
                                    borderWidth: 1,
                                    borderColor: errors.startDate ? "#ef4444" : "#e2e8f0",
                                }}
                                placeholder="YYYY-MM-DD"
                                placeholderTextColor="#94a3b8"
                                value={startDate}
                                onChangeText={(val) => {
                                    setStartDate(val);
                                    if (errors.startDate) setErrors((prev) => ({ ...prev, startDate: "" }));
                                }}
                            />
                            {errors.startDate && (
                                <Text className="font-lexend text-xs text-red-500 mt-1">{errors.startDate}</Text>
                            )}
                        </View>

                        {/* End Date */}
                        <View className="mb-4">
                            <Text className="font-lexend-medium text-sm text-dark-700 mb-2">
                                Planned End Date <Text className="text-red-500">*</Text>
                            </Text>
                            <TextInput
                                className="bg-gray-50 rounded-lg py-3 px-4 font-lexend text-sm text-dark-900"
                                style={{
                                    borderWidth: 1,
                                    borderColor: errors.endDate ? "#ef4444" : "#e2e8f0",
                                }}
                                placeholder="YYYY-MM-DD"
                                placeholderTextColor="#94a3b8"
                                value={endDate}
                                onChangeText={(val) => {
                                    setEndDate(val);
                                    if (errors.endDate) setErrors((prev) => ({ ...prev, endDate: "" }));
                                }}
                            />
                            {errors.endDate && (
                                <Text className="font-lexend text-xs text-red-500 mt-1">{errors.endDate}</Text>
                            )}
                        </View>

                        {/* Notes */}
                        <View className="mb-2">
                            <Text className="font-lexend-medium text-sm text-dark-700 mb-2">
                                Notes (optional)
                            </Text>
                            <TextInput
                                className="bg-gray-50 rounded-lg py-3 px-4 font-lexend text-sm text-dark-900"
                                style={{ borderWidth: 1, borderColor: "#e2e8f0", minHeight: 80 }}
                                placeholder="Add any planning notes..."
                                placeholderTextColor="#94a3b8"
                                value={notes}
                                onChangeText={setNotes}
                                multiline
                                textAlignVertical="top"
                            />
                        </View>
                    </ScrollView>

                    {/* Footer */}
                    <View className="px-6 py-4 border-t border-gray-200 flex-row justify-end gap-3">
                        <TouchableOpacity
                            className="px-5 py-2.5 rounded-lg"
                            style={{ backgroundColor: "#f1f5f9" }}
                            onPress={onClose}
                            disabled={loading}
                        >
                            <Text className="font-lexend-medium text-sm text-dark-700">Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            className="px-5 py-2.5 rounded-lg"
                            style={{ backgroundColor: "#7c3aed" }}
                            onPress={handleSave}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text className="font-lexend-medium text-sm text-white">
                                    {configTarget.existingDates?.planned_start_date ? "Update" : "Configure"}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
