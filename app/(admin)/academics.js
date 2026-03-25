import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

const MenuItem = ({ title, subtitle, color, onPress, disabled }) => (
  <TouchableOpacity
    className={`bg-white rounded-2xl p-5 mb-3 flex-row items-center shadow-sm ${disabled ? "opacity-50" : ""}`}
    onPress={disabled ? undefined : onPress}
    activeOpacity={disabled ? 1 : 0.7}
  >
    <View
      className={`w-10 h-10 rounded-xl ${color} items-center justify-center mr-4`}
    >
      <Text className="font-lexend-bold text-base text-white">
        {title.charAt(0)}
      </Text>
    </View>
    <View className="flex-1">
      <Text className="font-lexend-medium text-sm text-dark-900">{title}</Text>
      <Text className="font-lexend text-xs text-dark-500 mt-0.5">
        {subtitle}
      </Text>
    </View>
    {disabled ? (
      <View className="bg-dark-100 px-2 py-1 rounded-full">
        <Text className="font-lexend text-[10px] text-dark-400">Soon</Text>
      </View>
    ) : (
      <Text className="font-lexend text-dark-300 text-xl">&rsaquo;</Text>
    )}
  </TouchableOpacity>
);

export default function AcademicsHub() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-dark-50">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="px-6 pt-4 pb-2">
          <Text className="font-lexend-bold text-2xl text-dark-900">
            Academics
          </Text>
          <Text className="font-lexend text-sm text-dark-500 mt-1">
            Manage classes, attendance & more
          </Text>
        </View>

        <View className="px-6 pt-4 pb-8">
          <Text className="font-lexend-semibold text-sm text-dark-400 uppercase tracking-wider mb-3">
            Class Management
          </Text>
          <MenuItem
            title="Classes & Sections"
            subtitle="View and manage classes, sections"
            color="bg-blue-500"
            onPress={() => router.push("/(admin)/class-list")}
          />
          <MenuItem
            title="Subjects"
            subtitle="Manage subjects by class"
            color="bg-indigo-500"
            onPress={() => router.push("/(admin)/subject-list")}
          />
          <MenuItem
            title="Teacher-Subject Mapping"
            subtitle="Assign teachers to subjects"
            color="bg-violet-500"
            onPress={() => router.push("/(admin)/teacher-subjects")}
          />

          <Text className="font-lexend-semibold text-sm text-dark-400 uppercase tracking-wider mb-3 mt-6">
            Daily Operations
          </Text>
          <MenuItem
            title="Attendance"
            subtitle="View and track attendance"
            color="bg-green-500"
            onPress={() => router.push("/(admin)/attendance-view")}
          />
          <MenuItem
            title="Timetable"
            subtitle="View class timetables"
            color="bg-amber-500"
            onPress={() => router.push("/(admin)/timetable-list")}
          />

          <Text className="font-lexend-semibold text-sm text-dark-400 uppercase tracking-wider mb-3 mt-6">
            Exams & Results
          </Text>
          <MenuItem
            title="Exam Types"
            subtitle="Configure exam types and categories"
            color="bg-rose-500"
            onPress={() => router.push("/(admin)/exam-types")}
          />
          <MenuItem
            title="Exam Subject Config"
            subtitle="Set marks per subject per exam"
            color="bg-pink-500"
            onPress={() => router.push("/(admin)/exam-subjects")}
          />
          <MenuItem
            title="Progress Reports"
            subtitle="View class and student progress"
            color="bg-teal-500"
            onPress={() => router.push("/(admin)/progress-view")}
          />
          <MenuItem
            title="Syllabus"
            subtitle="Track syllabus completion"
            color="bg-cyan-500"
            onPress={() => router.push("/(admin)/syllabus-list")}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
