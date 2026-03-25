import { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuthStore, useAppStore } from "../../store";
import { syllabusService } from "../../services/admin";

/* ── Helpers ── */

function formatDateShort(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  const months = [
    "Jan","Feb","Mar","Apr","May","Jun",
    "Jul","Aug","Sep","Oct","Nov","Dec",
  ];
  return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`;
}

function formatDateRange(start, end) {
  if (!start) return "";
  const s = formatDateShort(start);
  const e = end ? formatDateShort(end) : "";
  return e ? `${s} - ${e}` : s;
}

function getStatusInfo(status) {
  switch (status) {
    case "in_progress":
      return { bg: "#dbeafe", text: "#1d4ed8", label: "IN PROGRESS" };
    case "completed":
      return { bg: "#dcfce7", text: "#15803d", label: "COMPLETED" };
    case "planned":
    default:
      return { bg: "#f1f5f9", text: "#64748b", label: "PLANNED" };
  }
}

function isOverdue(item) {
  if (item.status === "completed") return false;
  if (!item.planned_end_date) return false;
  return new Date(item.planned_end_date) < new Date();
}

/* ══════════════════════════════════════════════════
   MAIN SCREEN
   ══════════════════════════════════════════════════ */

export default function AdminSyllabusDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const user = useAuthStore((s) => s.user);
  const skid = user?.skid;

  const syllabusId = params.syllabus_id;
  const syllabusTitle = params.title || "Syllabus";
  const subjectName = params.subject_name || "";

  const [syllabus, setSyllabus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Teacher selector
  // selectedTeacher can be:
  //   null                                          → no selection
  //   { teacher_id, teacher_name, ... }             → individual teacher
  //   { _combined: true, teacherIds: [], label: ""} → combined view
  const [teachers, setTeachers] = useState([]);
  const [loadingTeachers, setLoadingTeachers] = useState(true);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [showTeacherPicker, setShowTeacherPicker] = useState(false);

  // Fetch teachers assigned to this syllabus
  const fetchTeachers = useCallback(async () => {
    if (!skid || !syllabusId) return;
    try {
      setLoadingTeachers(true);
      const res = await syllabusService.getTeachersForSyllabus(skid, syllabusId);
      const list = res?.data?.teachers || res?.data?.data || res?.data || [];
      const teacherList = Array.isArray(list) ? list : [];
      setTeachers(teacherList);
      // Auto-select: single teacher → select them; multiple → combined view
      if (teacherList.length === 1) {
        setSelectedTeacher(teacherList[0]);
      } else if (teacherList.length > 1) {
        setSelectedTeacher({
          _combined: true,
          teacherIds: teacherList.map((t) => t.teacher_id),
          label: `All Teachers (${teacherList.length})`,
        });
      }
    } catch (err) {
      console.error("Fetch teachers error:", err);
    } finally {
      setLoadingTeachers(false);
    }
  }, [skid, syllabusId]);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  // Fetch syllabus detail filtered by selected teacher or combined
  const fetchDetail = useCallback(async () => {
    if (!skid || !syllabusId) return;
    try {
      const opts = {};
      if (selectedTeacher?._combined) {
        opts.teacherIds = selectedTeacher.teacherIds;
      } else if (selectedTeacher) {
        opts.teacherId = selectedTeacher.teacher_id;
      }
      const res = await syllabusService.getSyllabusDetail(skid, syllabusId, opts);
      const data = res?.data?.data || res?.data;
      setSyllabus(data || null);
    } catch (err) {
      console.error("Fetch syllabus detail error:", err);
      setSyllabus(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [skid, syllabusId, selectedTeacher]);

  useEffect(() => {
    setLoading(true);
    fetchDetail();
  }, [fetchDetail]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDetail();
  }, [fetchDetail]);

  const completionPct = syllabus?.completion_percentage || 0;
  const displaySubject = syllabus?.subject_name || subjectName || "Subject";
  const displayTitle = syllabus?.title || syllabusTitle;

  return (
    <SafeAreaView className="flex-1 bg-[#f7f6f8]" edges={["top"]}>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* ── Purple Header ── */}
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
              Syllabus Tracking
            </Text>
            <View className="w-10" />
          </View>

          {/* Subject info */}
          <Text className="font-lexend text-sm text-white/70 mb-1">
            {displayTitle}
          </Text>
          <View className="flex-row items-end justify-between">
            <Text className="font-lexend-bold text-2xl text-white flex-1 mr-3">
              {displaySubject}
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
              <View style={{ flex: Math.max(100 - completionPct, 0) }} />
            </View>
          )}
        </View>

        {/* ── Teacher Selector ── */}
        {!loadingTeachers && teachers.length > 0 && (
          <View className="mx-4 mt-4">
            <Text className="font-lexend-medium text-xs text-dark-500 mb-2">
              Viewing Teacher Progress
            </Text>
            <TouchableOpacity
              className="bg-white rounded-xl px-4 py-3 flex-row items-center justify-between"
              style={{
                borderWidth: 1,
                borderColor: selectedTeacher
                  ? selectedTeacher._combined
                    ? "#8b5cf6"
                    : "#7c3aed"
                  : "#e2e8f0",
              }}
              onPress={() => setShowTeacherPicker(true)}
            >
              <View className="flex-1">
                {selectedTeacher?._combined ? (
                  <View>
                    <Text className="font-lexend-semibold text-sm text-dark-900">
                      {selectedTeacher.label}
                    </Text>
                    <Text className="font-lexend text-xs text-dark-400 mt-0.5">
                      Combined progress from {selectedTeacher.teacherIds.length}{" "}
                      teacher{selectedTeacher.teacherIds.length !== 1 ? "s" : ""}
                    </Text>
                  </View>
                ) : selectedTeacher ? (
                  <View>
                    <Text className="font-lexend-semibold text-sm text-dark-900">
                      {selectedTeacher.teacher_name}
                    </Text>
                    <Text className="font-lexend text-xs text-dark-400 mt-0.5">
                      {Math.round(selectedTeacher.completion_percentage || 0)}%
                      completed
                      {selectedTeacher.sections?.length
                        ? ` \u2022 ${selectedTeacher.sections
                            .map(
                              (s) =>
                                `${s.class_name || ""} ${s.section_name || ""}`
                            )
                            .join(", ")}`
                        : ""}
                    </Text>
                  </View>
                ) : (
                  <Text className="font-lexend text-sm text-dark-400">
                    Select a teacher to view progress...
                  </Text>
                )}
              </View>
              <Text className="text-dark-400 text-lg ml-2">&#x25BE;</Text>
            </TouchableOpacity>
          </View>
        )}

        {loadingTeachers && (
          <View className="items-center py-4 mt-4">
            <ActivityIndicator size="small" color="#7c3aed" />
            <Text className="font-lexend text-xs text-dark-400 mt-2">
              Loading teachers...
            </Text>
          </View>
        )}

        {!loadingTeachers && teachers.length === 0 && (
          <View className="mx-4 mt-4 bg-amber-50 rounded-xl px-4 py-3">
            <Text className="font-lexend text-xs text-amber-700">
              No teachers assigned to this syllabus yet.
            </Text>
          </View>
        )}

        {/* ── Content ── */}
        {loading ? (
          <View className="items-center py-16">
            <ActivityIndicator size="large" color="#7c3aed" />
          </View>
        ) : !syllabus ? (
          <View className="px-6 py-16 items-center">
            <Text className="text-4xl mb-3">&#x1F4DA;</Text>
            <Text className="font-lexend-semibold text-base text-dark-700">
              No syllabus data
            </Text>
            <Text className="font-lexend text-sm text-dark-400 text-center mt-1">
              {selectedTeacher?._combined
                ? "No combined progress data available yet."
                : selectedTeacher
                ? "No progress data for this teacher yet."
                : "Select a teacher above to view their progress."}
            </Text>
          </View>
        ) : (
          <View className="px-4 py-6 mt-1">
            {/* Summary stats */}
            <SummaryStats syllabus={syllabus} />

            {/* Lessons hierarchy */}
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

      {/* ── Teacher Picker Modal ── */}
      <TeacherPickerModal
        visible={showTeacherPicker}
        teachers={teachers}
        selectedTeacher={selectedTeacher}
        onSelect={(teacher) => {
          setSelectedTeacher(teacher);
          setShowTeacherPicker(false);
        }}
        onClose={() => setShowTeacherPicker(false)}
      />
    </SafeAreaView>
  );
}

/* ══════════════════════════════════════════════════
   SUMMARY STATS — Quick overview cards
   ══════════════════════════════════════════════════ */

function SummaryStats({ syllabus }) {
  const lessons = syllabus.lessons || [];
  let totalTopics = 0,
    completedTopics = 0,
    totalSubtopics = 0,
    completedSubtopics = 0,
    overdueCount = 0;

  lessons.forEach((l) => {
    if (isOverdue(l)) overdueCount++;
    (l.topics || []).forEach((t) => {
      totalTopics++;
      if (t.status === "completed") completedTopics++;
      if (isOverdue(t)) overdueCount++;
      (t.subtopics || []).forEach((st) => {
        totalSubtopics++;
        if (st.status === "completed" || st.is_completed) completedSubtopics++;
        if (isOverdue(st)) overdueCount++;
      });
    });
  });

  return (
    <View className="flex-row gap-2 mb-5">
      <View className="flex-1 bg-white rounded-xl p-3 items-center">
        <Text className="font-lexend-bold text-lg text-primary-600">
          {lessons.length}
        </Text>
        <Text className="font-lexend text-[10px] text-dark-400">Lessons</Text>
      </View>
      <View className="flex-1 bg-white rounded-xl p-3 items-center">
        <Text className="font-lexend-bold text-lg text-blue-600">
          {completedTopics}/{totalTopics}
        </Text>
        <Text className="font-lexend text-[10px] text-dark-400">Topics</Text>
      </View>
      <View className="flex-1 bg-white rounded-xl p-3 items-center">
        <Text className="font-lexend-bold text-lg text-indigo-600">
          {completedSubtopics}/{totalSubtopics}
        </Text>
        <Text className="font-lexend text-[10px] text-dark-400">
          Subtopics
        </Text>
      </View>
      {overdueCount > 0 && (
        <View className="flex-1 bg-red-50 rounded-xl p-3 items-center">
          <Text className="font-lexend-bold text-lg text-red-600">
            {overdueCount}
          </Text>
          <Text className="font-lexend text-[10px] text-red-500">Overdue</Text>
        </View>
      )}
    </View>
  );
}

/* ══════════════════════════════════════════════════
   LESSON (Level 1) — Unit header + topics
   ══════════════════════════════════════════════════ */

function LessonSection({ lesson, index }) {
  const [expanded, setExpanded] = useState(
    lesson.status === "in_progress" || index === 0
  );
  const topicCount = (lesson.topics || []).length;
  const subtopicCount = (lesson.topics || []).reduce(
    (acc, t) => acc + (t.subtopics || []).length,
    0
  );
  const status = getStatusInfo(lesson.status);
  const overdue = isOverdue(lesson);
  const completionPct = lesson.completion_percentage || 0;

  return (
    <View className="mb-5">
      {/* Unit header */}
      <TouchableOpacity
        className="flex-row items-center gap-3 mb-2"
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View
          className="w-10 h-10 rounded-xl items-center justify-center"
          style={{ backgroundColor: "rgba(124,58,237,0.1)" }}
        >
          <Text style={{ color: "#7c3aed", fontSize: 18 }}>&#x1F4C1;</Text>
        </View>
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="font-lexend-bold text-base text-dark-900 flex-1">
              Unit {index + 1}: {lesson.title}
            </Text>
            <Text
              className="font-lexend text-xs"
              style={{ color: expanded ? "#7c3aed" : "#94a3b8" }}
            >
              {expanded ? "▲" : "▼"}
            </Text>
          </View>
          <View className="flex-row items-center gap-2 mt-1">
            <View
              className="rounded-full px-2 py-0.5"
              style={{ backgroundColor: status.bg }}
            >
              <Text
                className="font-lexend-bold uppercase tracking-wider"
                style={{ fontSize: 8, color: status.text }}
              >
                {status.label}
              </Text>
            </View>
            {overdue && (
              <View className="rounded-full px-2 py-0.5 bg-red-100">
                <Text
                  className="font-lexend-bold uppercase tracking-wider"
                  style={{ fontSize: 8, color: "#dc2626" }}
                >
                  OVERDUE
                </Text>
              </View>
            )}
            <Text className="font-lexend text-[10px] text-dark-400">
              {topicCount} Topics {"\u2022"} {subtopicCount} Sub-topics
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Lesson progress bar */}
      {completionPct > 0 && (
        <View className="ml-13 mb-2" style={{ marginLeft: 52 }}>
          <View className="bg-dark-100 h-1.5 rounded-full overflow-hidden">
            <View
              className="h-full rounded-full bg-primary-500"
              style={{ width: `${Math.min(completionPct, 100)}%` }}
            />
          </View>
          <Text className="font-lexend text-[9px] text-dark-400 mt-0.5">
            {Math.round(completionPct)}% complete
          </Text>
        </View>
      )}

      {/* Date range */}
      {lesson.planned_start_date && (
        <View
          className="flex-row items-center ml-13 mb-2"
          style={{ marginLeft: 52 }}
        >
          <Text className="text-dark-400 text-xs mr-1">&#x1F4C5;</Text>
          <Text className="font-lexend text-[10px] text-dark-400">
            {formatDateRange(lesson.planned_start_date, lesson.planned_end_date)}
          </Text>
        </View>
      )}

      {/* Topics (Level 2) */}
      {expanded && (
        <View
          className="mt-2"
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
            />
          ))}
          {(lesson.topics || []).length === 0 && (
            <Text className="font-lexend text-xs text-dark-400 italic py-3">
              No topics in this lesson.
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

/* ══════════════════════════════════════════════════
   TOPIC (Level 2) — White card, read-only
   ══════════════════════════════════════════════════ */

function TopicCard({ topic, lessonIndex, topicIndex }) {
  const [expanded, setExpanded] = useState(topic.status === "in_progress");
  const status = getStatusInfo(topic.status);
  const overdue = isOverdue(topic);
  const hasSubtopics = (topic.subtopics || []).length > 0;
  const completionPct = topic.completion_percentage || 0;

  // Unconfigured topics → dashed style
  const isUnconfigured =
    !topic.planned_start_date &&
    topic.status !== "in_progress" &&
    topic.status !== "completed";

  if (isUnconfigured) {
    return (
      <View
        className="p-4 rounded-xl mb-3"
        style={{
          backgroundColor: "rgba(255,255,255,0.6)",
          borderWidth: 1,
          borderStyle: "dashed",
          borderColor: "#cbd5e1",
        }}
      >
        <Text className="font-lexend-semibold text-sm text-dark-400">
          {lessonIndex + 1}.{topicIndex + 1} {topic.title}
        </Text>
        <Text className="font-lexend text-[10px] text-dark-400 uppercase tracking-wider mt-0.5">
          Not yet configured by teacher
        </Text>
      </View>
    );
  }

  return (
    <View className="mb-3">
      <TouchableOpacity
        className="bg-white p-4 rounded-xl"
        style={{
          borderWidth: 1,
          borderColor:
            topic.status === "in_progress"
              ? "rgba(124,58,237,0.15)"
              : "#e2e8f0",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.04,
          shadowRadius: 4,
          elevation: 1,
        }}
        onPress={() => hasSubtopics && setExpanded(!expanded)}
        activeOpacity={hasSubtopics ? 0.7 : 1}
      >
        {/* Title + status */}
        <View className="flex-row items-start justify-between mb-1">
          <View className="flex-1 mr-2">
            <Text
              className="font-lexend-semibold text-sm"
              style={{
                color:
                  topic.status === "in_progress"
                    ? "#7c3aed"
                    : topic.status === "completed"
                    ? "#15803d"
                    : "#334155",
              }}
            >
              {lessonIndex + 1}.{topicIndex + 1} {topic.title}
            </Text>
          </View>
          <View className="flex-row items-center gap-1.5">
            <View
              className="rounded-full px-2 py-0.5"
              style={{ backgroundColor: status.bg }}
            >
              <Text
                className="font-lexend-bold uppercase tracking-wider"
                style={{ fontSize: 8, color: status.text }}
              >
                {status.label}
              </Text>
            </View>
            {overdue && (
              <View className="rounded-full px-2 py-0.5 bg-red-100">
                <Text
                  className="font-lexend-bold uppercase tracking-wider"
                  style={{ fontSize: 8, color: "#dc2626" }}
                >
                  OVERDUE
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Progress bar */}
        {completionPct > 0 && (
          <View className="mb-2">
            <View className="bg-dark-100 h-1.5 rounded-full overflow-hidden">
              <View
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(completionPct, 100)}%`,
                  backgroundColor:
                    topic.status === "completed" ? "#22c55e" : "#7c3aed",
                }}
              />
            </View>
            <Text className="font-lexend text-[9px] text-dark-400 mt-0.5">
              {Math.round(completionPct)}% complete
            </Text>
          </View>
        )}

        {/* Date + completed by */}
        {(topic.planned_start_date || topic.completed_by) && (
          <View className="mb-2">
            {topic.planned_start_date && (
              <View className="flex-row items-center">
                <Text className="text-dark-400 text-xs mr-1">&#x1F4C5;</Text>
                <Text className="font-lexend text-xs text-dark-400">
                  {formatDateRange(
                    topic.planned_start_date,
                    topic.planned_end_date
                  )}
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
          <View className="mb-1">
            {topic.teacher_notes && (
              <Text className="font-lexend text-xs text-dark-600">
                Note: {topic.teacher_notes}
              </Text>
            )}
            {topic.description && (
              <Text className="font-lexend text-xs text-dark-400 mt-0.5">
                {topic.description}
              </Text>
            )}
          </View>
        )}

        {/* Expand indicator for subtopics */}
        {hasSubtopics && (
          <View className="flex-row items-center justify-center pt-2 border-t border-dark-100 mt-2">
            <Text className="font-lexend text-[10px] text-dark-400 mr-1">
              {topic.subtopics.length} subtopic
              {topic.subtopics.length !== 1 ? "s" : ""}
            </Text>
            <Text className="text-dark-400 text-xs">
              {expanded ? "▲" : "▼"}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Subtopics (Level 3) */}
      {expanded && hasSubtopics && (
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

/* ══════════════════════════════════════════════════
   SUBTOPIC (Level 3) — smaller read-only card
   ══════════════════════════════════════════════════ */

function SubtopicCard({ subtopic, prefix }) {
  const status = getStatusInfo(subtopic.status);
  const overdue = isOverdue(subtopic);
  const isCompleted = subtopic.status === "completed" || subtopic.is_completed;

  return (
    <View
      className="bg-white p-3 rounded-xl mb-2"
      style={{ borderWidth: 1, borderColor: "#e2e8f0" }}
    >
      {/* Title + status */}
      <View className="flex-row items-start justify-between mb-1">
        <View className="flex-row items-center flex-1 mr-2">
          {/* Status dot */}
          <View
            className="w-5 h-5 rounded-full items-center justify-center mr-2"
            style={{
              backgroundColor: isCompleted
                ? "#dcfce7"
                : subtopic.status === "in_progress"
                ? "#dbeafe"
                : "#f1f5f9",
            }}
          >
            {isCompleted ? (
              <Text style={{ fontSize: 10, color: "#15803d" }}>&#10003;</Text>
            ) : subtopic.status === "in_progress" ? (
              <View
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: "#3b82f6" }}
              />
            ) : (
              <View
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: "#94a3b8" }}
              />
            )}
          </View>
          <Text className="font-lexend-medium text-sm text-dark-600 flex-1">
            {prefix} {subtopic.title}
          </Text>
        </View>
        <View className="flex-row items-center gap-1">
          {overdue && (
            <View className="rounded-full px-1.5 py-0.5 bg-red-100">
              <Text
                className="font-lexend-bold uppercase"
                style={{ fontSize: 7, color: "#dc2626" }}
              >
                OVERDUE
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Completed by */}
      {subtopic.completed_by && isCompleted && (
        <View
          className="self-start rounded px-2 py-0.5 mb-1 ml-7"
          style={{ backgroundColor: "rgba(124,58,237,0.08)" }}
        >
          <Text
            className="font-lexend-bold uppercase"
            style={{ fontSize: 9, color: "#7c3aed", letterSpacing: 0.5 }}
          >
            By {subtopic.completed_by}
          </Text>
        </View>
      )}

      {/* Description / notes */}
      {(subtopic.description || subtopic.teacher_notes) && (
        <View className="ml-7 mb-1">
          {subtopic.teacher_notes && (
            <Text className="font-lexend text-xs text-dark-600">
              Note: {subtopic.teacher_notes}
            </Text>
          )}
          {subtopic.description && (
            <Text className="font-lexend text-xs text-dark-400 mt-0.5">
              {subtopic.description}
            </Text>
          )}
        </View>
      )}

      {/* Dates */}
      {(subtopic.planned_start_date ||
        subtopic.planned_end_date ||
        subtopic.planned_completion_date) && (
        <View className="flex-row gap-3 ml-7 mt-2">
          <View className="flex-1">
            <Text className="font-lexend-bold text-[9px] text-dark-400 uppercase tracking-wider mb-0.5">
              Start
            </Text>
            <View className="bg-dark-50 rounded-lg py-1.5 px-2">
              <Text className="font-lexend text-[10px] text-dark-600">
                {formatDateShort(
                  subtopic.actual_start_date ||
                    subtopic.planned_start_date ||
                    subtopic.planned_completion_date
                ) || "\u2014"}
              </Text>
            </View>
          </View>
          <View className="flex-1">
            <Text className="font-lexend-bold text-[9px] text-dark-400 uppercase tracking-wider mb-0.5">
              End
            </Text>
            <View className="bg-dark-50 rounded-lg py-1.5 px-2">
              <Text className="font-lexend text-[10px] text-dark-600">
                {formatDateShort(
                  subtopic.actual_completion_date ||
                    subtopic.planned_end_date ||
                    subtopic.planned_completion_date
                ) || "\u2014"}
              </Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

/* ══════════════════════════════════════════════════
   TEACHER PICKER MODAL
   ══════════════════════════════════════════════════ */

function TeacherPickerModal({
  visible,
  teachers,
  selectedTeacher,
  onSelect,
  onClose,
}) {
  const getCompletionColor = (pct) => {
    if (pct >= 80) return "#22c55e";
    if (pct >= 50) return "#f59e0b";
    if (pct >= 20) return "#f97316";
    return "#ef4444";
  };

  const isCombinedSelected = !!selectedTeacher?._combined;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white rounded-t-3xl max-h-[70%]">
          {/* Header */}
          <View className="px-6 pt-6 pb-4 border-b border-dark-100">
            <View className="flex-row items-center justify-between">
              <Text className="font-lexend-bold text-lg text-dark-900">
                Select Teacher
              </Text>
              <TouchableOpacity onPress={onClose}>
                <Text className="font-lexend text-sm text-dark-400">
                  Close
                </Text>
              </TouchableOpacity>
            </View>
            <Text className="font-lexend text-xs text-dark-400 mt-1">
              View syllabus progress by teacher or combined
            </Text>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16 }}>
            {/* ── Combined Progress Option ── */}
            {teachers.length > 1 && (
              <View className="mb-3">
                <TouchableOpacity
                  className="flex-row items-center p-4 rounded-xl mb-2"
                  style={{
                    backgroundColor: isCombinedSelected
                      ? "#f5f3ff"
                      : "#faf5ff",
                    borderWidth: 1,
                    borderColor: isCombinedSelected ? "#7c3aed" : "#e9d5ff",
                  }}
                  onPress={() =>
                    onSelect({
                      _combined: true,
                      teacherIds: teachers.map((t) => t.teacher_id),
                      label: `Combined Progress (${teachers.length} teachers)`,
                    })
                  }
                  activeOpacity={0.7}
                >
                  <View
                    className="w-10 h-10 rounded-full items-center justify-center mr-3"
                    style={{ backgroundColor: "rgba(124,58,237,0.15)" }}
                  >
                    <Text style={{ fontSize: 18 }}>&#x1F465;</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="font-lexend-semibold text-sm text-dark-900">
                      Combined Progress
                    </Text>
                    <Text className="font-lexend text-[10px] text-dark-400 mt-0.5">
                      All {teachers.length} teachers
                    </Text>
                  </View>
                  {isCombinedSelected && (
                    <Text style={{ color: "#7c3aed", fontSize: 16 }}>
                      &#10003;
                    </Text>
                  )}
                </TouchableOpacity>

                {/* Divider */}
                <View className="flex-row items-center my-2">
                  <View className="flex-1 h-px bg-dark-100" />
                  <Text className="font-lexend text-[10px] text-dark-400 mx-3">
                    Individual Teachers
                  </Text>
                  <View className="flex-1 h-px bg-dark-100" />
                </View>
              </View>
            )}

            {/* ── Individual Teachers ── */}
            {teachers.map((item) => {
              const isSelected =
                !selectedTeacher?._combined &&
                selectedTeacher?.teacher_id === item.teacher_id;
              const pct = Math.round(item.completion_percentage || 0);
              const color = getCompletionColor(pct);

              return (
                <TouchableOpacity
                  key={String(item.teacher_id)}
                  className="flex-row items-center p-4 rounded-xl mb-2"
                  style={{
                    backgroundColor: isSelected ? "#f5f3ff" : "#ffffff",
                    borderWidth: 1,
                    borderColor: isSelected ? "#7c3aed" : "#e2e8f0",
                  }}
                  onPress={() => onSelect(item)}
                  activeOpacity={0.7}
                >
                  {/* Avatar */}
                  <View
                    className="w-10 h-10 rounded-full items-center justify-center mr-3"
                    style={{ backgroundColor: "rgba(124,58,237,0.1)" }}
                  >
                    <Text className="font-lexend-bold text-sm text-primary-600">
                      {(item.teacher_name || "T")
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </Text>
                  </View>

                  {/* Info */}
                  <View className="flex-1">
                    <Text className="font-lexend-semibold text-sm text-dark-900">
                      {item.teacher_name}
                    </Text>
                    {item.sections?.length > 0 && (
                      <Text className="font-lexend text-[10px] text-dark-400 mt-0.5">
                        {item.sections
                          .map(
                            (s) =>
                              `${s.class_name || ""} ${s.section_name || ""}`
                          )
                          .join(", ")}
                      </Text>
                    )}
                  </View>

                  {/* Completion badge */}
                  <View className="items-end">
                    <Text
                      className="font-lexend-bold text-sm"
                      style={{ color }}
                    >
                      {pct}%
                    </Text>
                    <View className="w-12 h-1.5 rounded-full bg-dark-100 mt-1 overflow-hidden">
                      <View
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(pct, 100)}%`,
                          backgroundColor: color,
                        }}
                      />
                    </View>
                  </View>

                  {/* Selected indicator */}
                  {isSelected && (
                    <View className="ml-2">
                      <Text style={{ color: "#7c3aed", fontSize: 16 }}>
                        &#10003;
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}

            {teachers.length === 0 && (
              <View className="items-center py-8">
                <Text className="font-lexend text-sm text-dark-400">
                  No teachers found
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
