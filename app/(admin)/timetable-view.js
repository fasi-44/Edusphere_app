import { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useAuthStore } from "../../store";
import { timetableService } from "../../services/admin";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SHORT_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatTimeDisplay(timeStr) {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${h12}:${m} ${ampm}`;
}

export default function TimetableViewScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const user = useAuthStore((s) => s.user);
  const skid = user?.skid;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timetable, setTimetable] = useState(null);
  const [timeSlots, setTimeSlots] = useState([]);
  const [entries, setEntries] = useState({});
  const [timetableByDay, setTimetableByDay] = useState({});
  const [selectedDay, setSelectedDay] = useState(
    DAYS[new Date().getDay() === 0 ? 0 : new Date().getDay() - 1] || "Monday"
  );

  const fetchTimetable = useCallback(async () => {
    if (!skid || !id) return;
    try {
      const res = await timetableService.viewTimetable(skid, id);
      const data = res?.data || {};
      setTimetable(data.timetable || data);
      setTimeSlots(data.time_slots || []);
      setEntries(data.entries || {});
      setTimetableByDay(data.timetable_by_day || {});
    } catch (err) {
      console.error("Fetch timetable error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [skid, id]);

  useFocusEffect(
    useCallback(() => {
      fetchTimetable();
    }, [fetchTimetable])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTimetable();
  }, [fetchTimetable]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-dark-50 items-center justify-center">
        <ActivityIndicator size="large" color="#6366f1" />
      </SafeAreaView>
    );
  }

  // Build periods for the selected day
  const dayPeriods = timetableByDay[selectedDay] || [];

  // If we have entries in key format "Day-TimeRange", build from that
  const periodsFromEntries = timeSlots.map((slot) => {
    const key = `${selectedDay}-${slot.time_display}`;
    const entry = entries[key];
    return {
      ...slot,
      entry,
    };
  });

  const displayPeriods = dayPeriods.length > 0 ? dayPeriods : periodsFromEntries;

  return (
    <SafeAreaView className="flex-1 bg-dark-50">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View className="flex-row items-center px-6 pt-4 pb-3">
          <TouchableOpacity
            onPress={() => router.back()}
            className="mr-3 w-9 h-9 rounded-full bg-white items-center justify-center shadow-sm"
          >
            <Text className="font-lexend-semibold text-dark-600 text-lg">
              &lsaquo;
            </Text>
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="font-lexend-bold text-xl text-dark-900">
              Timetable
            </Text>
            {timetable && (
              <Text className="font-lexend text-xs text-dark-500">
                {timetable.class_name || ""}{" "}
                {timetable.section_name ? `- ${timetable.section_name}` : ""}
              </Text>
            )}
          </View>
        </View>

        {/* Config Info */}
        {timetable?.configuration && (
          <View className="flex-row px-6 gap-3 mb-4">
            <View className="flex-1 bg-white rounded-xl p-3 items-center shadow-sm">
              <Text className="font-lexend text-[10px] text-dark-400">Periods</Text>
              <Text className="font-lexend-bold text-base text-dark-900">
                {timetable.configuration.total_periods || timetable.total_periods || "-"}
              </Text>
            </View>
            <View className="flex-1 bg-white rounded-xl p-3 items-center shadow-sm">
              <Text className="font-lexend text-[10px] text-dark-400">Start</Text>
              <Text className="font-lexend-bold text-base text-dark-900">
                {formatTimeDisplay(timetable.configuration.school_start_time) || "-"}
              </Text>
            </View>
            <View className="flex-1 bg-white rounded-xl p-3 items-center shadow-sm">
              <Text className="font-lexend text-[10px] text-dark-400">Duration</Text>
              <Text className="font-lexend-bold text-base text-dark-900">
                {timetable.configuration.period_duration || "-"} min
              </Text>
            </View>
          </View>
        )}

        {/* Day Selector */}
        <View className="px-6 mb-4">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {DAYS.map((day, i) => (
              <TouchableOpacity
                key={day}
                className={`px-4 py-2.5 rounded-xl ${
                  selectedDay === day
                    ? "bg-primary-600"
                    : "bg-white border border-dark-200"
                }`}
                onPress={() => setSelectedDay(day)}
              >
                <Text
                  className={`font-lexend-semibold text-xs ${
                    selectedDay === day ? "text-white" : "text-dark-700"
                  }`}
                >
                  {SHORT_DAYS[i]}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Periods */}
        <View className="px-6 pb-8">
          {displayPeriods.length === 0 ? (
            <View className="bg-white rounded-2xl p-8 items-center">
              <Text className="font-lexend text-sm text-dark-400">
                No periods scheduled for {selectedDay}
              </Text>
            </View>
          ) : (
            displayPeriods.map((period, index) => {
              const isLunch = period.is_lunch;
              // Handle both data shapes
              const subject = period.entry?.subject?.subject_name ||
                period.subject_name || null;
              const teacher = period.entry?.teacher
                ? `${period.entry.teacher.first_name || ""} ${period.entry.teacher.last_name || ""}`.trim()
                : period.teacher_name || null;
              const room = period.entry?.room || period.room_number || null;
              const timeDisplay = period.time_display ||
                (period.start_time && period.end_time
                  ? `${formatTimeDisplay(period.start_time)} - ${formatTimeDisplay(period.end_time)}`
                  : "");

              if (isLunch) {
                return (
                  <View
                    key={index}
                    className="bg-amber-50 rounded-2xl p-4 mb-3 items-center border border-amber-200"
                  >
                    <Text className="font-lexend-semibold text-sm text-amber-700">
                      LUNCH BREAK
                    </Text>
                    {timeDisplay && (
                      <Text className="font-lexend text-xs text-amber-500 mt-0.5">
                        {timeDisplay}
                      </Text>
                    )}
                  </View>
                );
              }

              return (
                <View
                  key={index}
                  className="bg-white rounded-2xl p-4 mb-3 shadow-sm"
                >
                  {/* Period number & time */}
                  <View className="flex-row items-center justify-between mb-2">
                    <View className="bg-primary-100 px-2.5 py-1 rounded-full">
                      <Text className="font-lexend-medium text-[10px] text-primary-700">
                        {period.label || `Period ${period.period_number || index + 1}`}
                      </Text>
                    </View>
                    {timeDisplay && (
                      <Text className="font-lexend-medium text-xs text-dark-500">
                        {timeDisplay}
                      </Text>
                    )}
                  </View>

                  {/* Subject */}
                  {subject ? (
                    <>
                      <Text className="font-lexend-bold text-base text-primary-600">
                        {subject}
                      </Text>
                      {teacher && (
                        <Text className="font-lexend text-sm text-dark-500 mt-1">
                          {teacher}
                        </Text>
                      )}
                      {room && (
                        <View className="bg-dark-50 self-start px-2 py-0.5 rounded-full mt-1.5">
                          <Text className="font-lexend-medium text-[10px] text-dark-600">
                            Room: {room}
                          </Text>
                        </View>
                      )}
                    </>
                  ) : (
                    <Text className="font-lexend text-sm text-dark-400 italic">
                      Free Period
                    </Text>
                  )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
