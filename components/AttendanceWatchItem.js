import { View, Text, TouchableOpacity } from "react-native";

function getInitials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function AttendanceWatchItem({ student, onPress }) {
  const name = student.full_name || `${student.first_name || ""} ${student.last_name || ""}`.trim();
  const rollNo = student.roll_no || student.roll_number || "";
  const classInfo = [student.class_name, student.section_name].filter(Boolean).join(" - ");

  return (
    <TouchableOpacity
      className="flex-row items-center bg-white rounded-2xl px-4 py-3 mb-2"
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Avatar */}
      <View className="w-10 h-10 rounded-full bg-red-100 items-center justify-center mr-3">
        <Text className="font-lexend-semibold text-sm text-red-600">
          {getInitials(name)}
        </Text>
      </View>

      {/* Info */}
      <View className="flex-1">
        <Text className="font-lexend-medium text-sm text-dark-900">
          {name || "Unknown"}
        </Text>
        <View className="flex-row items-center gap-2">
          {rollNo ? (
            <Text className="font-lexend text-xs text-dark-500">
              {rollNo}
            </Text>
          ) : null}
          {rollNo && classInfo ? (
            <Text className="text-dark-300 text-xs">|</Text>
          ) : null}
          {classInfo ? (
            <Text className="font-lexend text-xs text-dark-400">
              {classInfo}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Chevron */}
      <Text className="font-lexend text-dark-300 text-lg">&rsaquo;</Text>
    </TouchableOpacity>
  );
}
