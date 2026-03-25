import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { useAuthStore, useParentStore } from "../../store";
import { studentTimetableService } from "../../services/student";
import ChildSelector, { useChildSelectorScroll } from "../../components/ChildSelector";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const FULL_DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
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

function getWeekDays(referenceDate) {
    const day = referenceDate.getDay();
    const monday = new Date(referenceDate);
    monday.setDate(referenceDate.getDate() - ((day === 0 ? 7 : day) - 1));
    const days = [];
    for (let i = 0; i < 6; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        days.push(d);
    }
    return days;
}

function parseTime(timeStr) {
    if (!timeStr) return null;
    const parts = timeStr.split(":");
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

function formatTimeDisplay(timeStr) {
    if (!timeStr) return "";
    const [h, m] = timeStr.split(":");
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${String(h12).padStart(2, "0")}:${m} ${ampm}`;
}

function getPeriodStatus(startTime, endTime) {
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const start = parseTime(startTime);
    const end = parseTime(endTime);
    if (start === null || end === null) return "upcoming";
    if (nowMinutes >= end) return "completed";
    if (nowMinutes >= start && nowMinutes < end) return "ongoing";
    return "upcoming";
}

function isToday(date) {
    const today = new Date();
    return (
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
    );
}

function isPast(date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d < today;
}

export default function ParentTimetableScreen() {
    const user = useAuthStore((s) => s.user);
    const selectedChild = useParentStore((s) => s.selectedChild);

    const { translateY, onScroll, selectorHeight } = useChildSelectorScroll();
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [periods, setPeriods] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const skid = user?.skid;
    const studentId = selectedChild?.student_id;

    const weekDays = useMemo(() => getWeekDays(selectedDate), [
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
    ]);

    const fetchTimetable = useCallback(async () => {
        if (!skid || !studentId) {
            setPeriods([]);
            setLoading(false);
            setRefreshing(false);
            return;
        }
        try {
            const dateStr = formatDate(selectedDate);
            const res = await studentTimetableService.getDailyTimetable(skid, studentId, dateStr);
            const data = res?.data?.data || res?.data || [];
            setPeriods(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Parent timetable fetch error:", err);
            setPeriods([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [skid, studentId, selectedDate]);

    useFocusEffect(
        useCallback(() => {
            setLoading(true);
            fetchTimetable();
        }, [fetchTimetable])
    );

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchTimetable();
    }, [fetchTimetable]);

    const isTodaySelected = isToday(selectedDate);
    const isPastDate = isPast(selectedDate);

    const firstNextUpIndex = useMemo(() => {
        if (!isTodaySelected) return -1;
        for (let i = 0; i < periods.length; i++) {
            if (getPeriodStatus(periods[i].start_time, periods[i].end_time) === "upcoming") return i;
        }
        return -1;
    }, [periods, isTodaySelected]);

    const dateLabel = `${FULL_DAY_NAMES[selectedDate.getDay()]}, ${MONTH_NAMES[selectedDate.getMonth()]} ${selectedDate.getDate()}`;

    return (
        <SafeAreaView className="flex-1 bg-dark-50">
            <ChildSelector translateY={translateY} />

            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                onScroll={onScroll}
                scrollEventThrottle={16}
                contentContainerStyle={{ paddingTop: selectorHeight }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {!selectedChild ? (
                    <View className="px-6 py-16 items-center">
                        <Text className="font-lexend text-sm text-dark-400 italic">
                            No child selected.
                        </Text>
                    </View>
                ) : (
                    <>
                        {/* Header + Day Selector */}
                        <View className="bg-white pb-5">
                            <View className="px-6 pt-4 pb-2">
                                <Text className="font-lexend-bold text-2xl text-dark-900">Timetable</Text>
                                <Text className="font-lexend text-sm text-dark-500 mt-0.5">
                                    {selectedChild.first_name}'s schedule - {dateLabel}
                                </Text>
                            </View>

                            {/* Week Day Selector */}
                            <View className="flex-row px-6 pt-3 gap-2">
                                {weekDays.map((day) => {
                                    const isSelected =
                                        day.getDate() === selectedDate.getDate() &&
                                        day.getMonth() === selectedDate.getMonth();
                                    const isTodayDay = isToday(day);
                                    return (
                                        <TouchableOpacity
                                            key={day.toISOString()}
                                            className={`flex-1 items-center justify-center h-20 rounded-3xl ${
                                                isSelected ? "bg-primary-600" : "bg-dark-50"
                                            }`}
                                            style={isSelected ? {
                                                shadowColor: "#6366f1",
                                                shadowOffset: { width: 0, height: 6 },
                                                shadowOpacity: 0.35,
                                                shadowRadius: 10,
                                                elevation: 8,
                                                transform: [{ scale: 1.08 }],
                                            } : {
                                                transform: [{ scale: 0.92 }],
                                            }}
                                            onPress={() => setSelectedDate(new Date(day))}
                                            activeOpacity={0.7}
                                        >
                                            <Text className={`font-lexend-semibold text-xs mb-1 ${
                                                isSelected ? "text-white/80" : "text-dark-400"
                                            }`}>
                                                {DAY_NAMES[day.getDay()]}
                                            </Text>
                                            <Text className={`font-lexend-bold text-xl ${
                                                isSelected ? "text-white" : "text-dark-700"
                                            }`}>
                                                {day.getDate()}
                                            </Text>
                                            {isTodayDay && isSelected && (
                                                <View className="w-1.5 h-1.5 rounded-full bg-white mt-1.5" />
                                            )}
                                            {isTodayDay && !isSelected && (
                                                <View className="w-1.5 h-1.5 rounded-full bg-primary-600 mt-1.5" />
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>

                        {/* Timeline */}
                        {loading ? (
                            <View className="items-center py-16">
                                <ActivityIndicator size="large" color="#6366f1" />
                            </View>
                        ) : periods.length === 0 ? (
                            <View className="px-6 py-16 items-center">
                                <Text className="font-lexend text-sm text-dark-400 italic">
                                    No classes scheduled for this day.
                                </Text>
                            </View>
                        ) : (
                            <View className="px-6 pb-8">
                                <View className="ml-3 pl-8 border-l-2 border-primary-200">
                                    {periods.map((period, index) => {
                                        let status;
                                        if (isPastDate) {
                                            status = "completed";
                                        } else if (isTodaySelected) {
                                            status = getPeriodStatus(period.start_time, period.end_time);
                                            if (status === "upcoming" && index === firstNextUpIndex) status = "next";
                                        } else {
                                            status = "upcoming";
                                        }

                                        const isOngoing = status === "ongoing";
                                        const isCompleted = status === "completed";
                                        const isNext = status === "next";

                                        return (
                                            <View key={period.id || index} className="relative mb-6">
                                                <TimelineDot status={status} />
                                                {isOngoing ? (
                                                    <OngoingCard period={period} />
                                                ) : (
                                                    <PeriodCard period={period} status={status} isCompleted={isCompleted} isNext={isNext} />
                                                )}
                                            </View>
                                        );
                                    })}

                                    {/* End marker */}
                                    <View className="relative pb-4">
                                        <View
                                            className="absolute bg-dark-200 rounded-full"
                                            style={{ width: 12, height: 12, left: -39, top: 4 }}
                                        />
                                        <Text className="font-lexend text-sm text-dark-400 italic pl-1">
                                            No further classes scheduled.
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        )}
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

function TimelineDot({ status }) {
    const isOngoing = status === "ongoing";
    const isCompleted = status === "completed";
    const isNext = status === "next";

    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (!isOngoing) return;
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.8, duration: 1000, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
            ])
        );
        animation.start();
        return () => animation.stop();
    }, [isOngoing]);

    const opacityAnim = pulseAnim.interpolate({
        inputRange: [1, 1.8],
        outputRange: [0.6, 0],
    });

    let dotClasses = "bg-white border-[3px] border-dark-300";
    if (isCompleted) dotClasses = "bg-green-500 border-2 border-white";
    if (isOngoing) dotClasses = "bg-primary-600 border-[3px] border-white";
    if (isNext) dotClasses = "bg-white border-[3px] border-primary-400";

    return (
        <View style={{ position: "absolute", width: 22, height: 22, left: -43, top: isOngoing ? 30 : 20, zIndex: 10, alignItems: "center", justifyContent: "center" }}>
            {isOngoing && (
                <Animated.View style={{ position: "absolute", width: 22, height: 22, borderRadius: 11, backgroundColor: "#6366f1", transform: [{ scale: pulseAnim }], opacity: opacityAnim }} />
            )}
            <View className={`rounded-full ${dotClasses}`} style={{ width: 22, height: 22 }}>
                {isCompleted && (
                    <Text className="text-white text-[10px] font-bold text-center leading-4">✓</Text>
                )}
            </View>
        </View>
    );
}

function OngoingCard({ period }) {
    const router = useRouter();
    const navigateToSyllabus = () => {
        router.push({
            pathname: "/(parent)/syllabus-detail",
            params: {
                subject_name: period.subject_name,
                subject_id: period.subject_id || "",
                teacher_id: period.teacher_id || "",
            },
        });
    };

    return (
        <TouchableOpacity
            className="rounded-3xl overflow-hidden bg-white"
            onPress={navigateToSyllabus}
            activeOpacity={0.8}
        >
            <View className="bg-primary-600 px-5 pt-4 pb-5">
                <View className="flex-row items-center bg-white/20 self-start rounded-full px-3 py-1 mb-3">
                    <View className="w-2 h-2 rounded-full bg-white mr-2" />
                    <Text className="font-lexend-bold text-xs text-white">Now</Text>
                </View>
                <Text className="font-lexend-bold text-2xl text-white">{period.subject_name}</Text>
                {period.teacher_name && (
                    <Text className="font-lexend-medium text-sm text-white/80 mt-0.5">
                        {period.teacher_name}
                    </Text>
                )}
            </View>
            <View className="p-5">
                <View className="flex-row gap-3">
                    <View className="flex-1 bg-primary-50 rounded-2xl p-3">
                        <Text className="font-lexend-bold text-[10px] text-primary-400 uppercase tracking-widest mb-1.5">Time</Text>
                        <Text className="font-lexend-bold text-sm text-dark-700">
                            {formatTimeDisplay(period.start_time)} - {formatTimeDisplay(period.end_time)}
                        </Text>
                    </View>
                    {period.teacher_name && (
                        <View className="flex-1 bg-primary-50 rounded-2xl p-3">
                            <Text className="font-lexend-bold text-[10px] text-primary-400 uppercase tracking-widest mb-1.5">Teacher</Text>
                            <Text className="font-lexend-bold text-sm text-dark-700" numberOfLines={1}>
                                {period.teacher_name}
                            </Text>
                        </View>
                    )}
                </View>
                <Text className="font-lexend text-xs text-primary-500 mt-3 text-center">
                    Tap to view syllabus &#x203A;
                </Text>
            </View>
        </TouchableOpacity>
    );
}

function PeriodCard({ period, status, isCompleted, isNext }) {
    const router = useRouter();
    const navigateToSyllabus = () => {
        router.push({
            pathname: "/(parent)/syllabus-detail",
            params: {
                subject_name: period.subject_name,
                subject_id: period.subject_id || "",
                teacher_id: period.teacher_id || "",
            },
        });
    };

    let statusLabel = "Upcoming";
    let statusColor = "text-dark-400";
    let statusBg = "";
    if (isCompleted) { statusLabel = "Completed"; statusColor = "text-green-700"; statusBg = "bg-green-100"; }
    else if (isNext) { statusLabel = "Next Up"; statusColor = "text-primary-700"; statusBg = "bg-primary-100"; }

    return (
        <TouchableOpacity
            className={`bg-white rounded-3xl p-5 ${isCompleted ? "opacity-60" : ""}`}
            onPress={navigateToSyllabus}
            activeOpacity={0.7}
        >
            <View className="mb-2">
                {statusBg ? (
                    <View className={`self-start rounded-full px-2.5 py-0.5 ${statusBg}`}>
                        <Text className={`font-lexend-bold text-[10px] uppercase tracking-widest ${statusColor}`}>{statusLabel}</Text>
                    </View>
                ) : (
                    <Text className={`font-lexend-bold text-[10px] uppercase tracking-widest ${statusColor}`}>{statusLabel}</Text>
                )}
            </View>

            <Text className="font-lexend-bold text-[17px] text-dark-800 mt-1">{period.subject_name}</Text>

            {period.teacher_name && (
                <View className="flex-row items-center mt-2">
                    <Text className="text-dark-400 text-sm mr-1.5">&#x1F464;</Text>
                    <Text className="font-lexend-medium text-sm text-dark-500">{period.teacher_name}</Text>
                </View>
            )}

            <View className="flex-row items-center mt-1">
                <Text className="text-dark-400 text-sm mr-1.5">&#x23F1;</Text>
                <Text className="font-lexend-medium text-sm text-dark-500">
                    {formatTimeDisplay(period.start_time)} - {formatTimeDisplay(period.end_time)}
                </Text>
            </View>

            <Text className="font-lexend text-[10px] text-primary-500 mt-2">
                View syllabus &#x203A;
            </Text>
        </TouchableOpacity>
    );
}
