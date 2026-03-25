import { useState, useCallback } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { useAuthStore, useAppStore, useParentStore } from "../../store";
import { studentAssignmentService } from "../../services/student";
import ChildSelector, { useChildSelectorScroll } from "../../components/ChildSelector";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

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

export default function ParentAssignmentsScreen() {
    const user = useAuthStore((s) => s.user);
    const academicYear = useAppStore((s) => s.academicYear);
    const selectedChild = useParentStore((s) => s.selectedChild);

    const skid = user?.skid;
    const studentId = selectedChild?.student_id;
    const academicYearId = academicYear?.id;

    const { translateY, onScroll, selectorHeight } = useChildSelectorScroll();
    const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchAssignments = useCallback(async () => {
        if (!skid || !studentId || !academicYearId) {
            setAssignments([]);
            setLoading(false);
            setRefreshing(false);
            return;
        }
        try {
            const res = await studentAssignmentService.getAssignments(skid, {
                studentId,
                academicYearId,
                date: selectedDate,
            });
            const list = res?.data || [];
            setAssignments(Array.isArray(list) ? list : []);
        } catch {
            setAssignments([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [skid, studentId, academicYearId, selectedDate]);

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

    const shiftDate = (days) => {
        const [y, m, d] = selectedDate.split("-");
        const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
        date.setDate(date.getDate() + days);
        setSelectedDate(formatDate(date));
    };

    const completed = assignments.filter((a) => a.is_completed);
    const pending = assignments.filter((a) => !a.is_completed);

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
                    <View className="bg-white px-6 pt-4 pb-3">
                        <Text className="font-lexend-bold text-xl text-dark-900 text-center">
                            Assignments
                        </Text>
                        <Text className="font-lexend text-xs text-dark-400 text-center mt-0.5">
                            {selectedChild.first_name}'s assignments
                        </Text>
                    </View>

                    {/* Date Navigator */}
                    <View className="bg-white px-6 pb-4">
                        <View className="flex-row items-center justify-between bg-dark-50 rounded-xl px-2 py-2">
                            <TouchableOpacity
                                className="w-9 h-9 rounded-full items-center justify-center bg-white"
                                onPress={() => shiftDate(-1)}
                            >
                                <Text className="font-lexend-bold text-lg text-dark-600">&#x2039;</Text>
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
                                <Text className="font-lexend-bold text-lg text-dark-600">&#x203A;</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {loading ? (
                            <View className="items-center py-16">
                                <ActivityIndicator size="large" color="#6366f1" />
                            </View>
                        ) : assignments.length === 0 ? (
                            <View className="px-6 py-16 items-center">
                                <Text className="text-4xl mb-3">&#x1F4DD;</Text>
                                <Text className="font-lexend-semibold text-base text-dark-700">
                                    No assignments for this day
                                </Text>
                            </View>
                        ) : (
                            <View className="px-4 pt-4 pb-8">
                                {pending.length > 0 && (
                                    <View className="mb-4">
                                        <Text className="font-lexend-semibold text-sm text-amber-600 mb-2 px-1">
                                            Pending ({pending.length})
                                        </Text>
                                        {pending.map((a) => (
                                            <AssignmentCard key={a.id} assignment={a} />
                                        ))}
                                    </View>
                                )}

                                {completed.length > 0 && (
                                    <View>
                                        <Text className="font-lexend-semibold text-sm text-green-600 mb-2 px-1">
                                            Completed ({completed.length})
                                        </Text>
                                        {completed.map((a) => (
                                            <AssignmentCard key={a.id} assignment={a} />
                                        ))}
                                    </View>
                                )}
                            </View>
                        )}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

function AssignmentCard({ assignment }) {
    const [expanded, setExpanded] = useState(false);
    const isDone = !!assignment.is_completed;
    const text = assignment.assignment_text || "";
    const isLong = text.length > 100;

    return (
        <TouchableOpacity
            className={`bg-white rounded-2xl p-4 mb-3 ${isDone ? "opacity-60" : ""}`}
            onPress={() => isLong && setExpanded(!expanded)}
            activeOpacity={isLong ? 0.7 : 1}
        >
            <View className="flex-row items-start justify-between mb-1">
                <View className="flex-1 mr-3">
                    <Text className="font-lexend-bold text-base text-dark-900" numberOfLines={1}>
                        {assignment.subject_name}
                    </Text>
                    <Text className="font-lexend text-xs text-dark-400 mt-0.5">
                        {assignment.class_name}
                        {assignment.section_name ? ` - ${assignment.section_name}` : ""}
                    </Text>
                </View>
                <View className={`rounded-full px-2.5 py-1 ${isDone ? "bg-green-100" : "bg-amber-100"}`}>
                    <Text className={`font-lexend-bold text-[10px] ${isDone ? "text-green-700" : "text-amber-700"}`}>
                        {isDone ? "Done" : "Pending"}
                    </Text>
                </View>
            </View>

            {assignment.teacher_name && (
                <View className="flex-row items-center mt-1">
                    <Text className="text-dark-400 text-xs mr-1">&#x1F464;</Text>
                    <Text className="font-lexend text-xs text-dark-400">{assignment.teacher_name}</Text>
                </View>
            )}

            {text ? (
                <Text
                    className="font-lexend text-sm text-dark-600 mt-2 leading-5"
                    numberOfLines={expanded ? undefined : 3}
                >
                    {text}
                </Text>
            ) : null}
            {isLong && (
                <Text className="font-lexend-medium text-xs text-primary-600 mt-1">
                    {expanded ? "Show less" : "Read more"}
                </Text>
            )}

            {/* Assignment Drawing */}
            {assignment.assignment_drawing ? (
                <Image
                    source={{ uri: assignment.assignment_drawing }}
                    className={`w-full rounded-xl ${text ? "mt-2" : "mt-2"}`}
                    style={{ height: 150 }}
                    resizeMode="contain"
                />
            ) : null}

            {assignment.remarks ? (
                <View className="mt-2 pt-2 border-t border-dark-100">
                    <Text className="font-lexend-medium text-[10px] text-dark-400 uppercase tracking-wider mb-1">
                        Remarks
                    </Text>
                    <Text className="font-lexend text-xs text-dark-600">{assignment.remarks}</Text>
                </View>
            ) : null}
        </TouchableOpacity>
    );
}
