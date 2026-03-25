import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { COLORS } from "../../lib/constants";

export default function AdminLayout() {
  return (
    <Tabs
      backBehavior="history"
      screenOptions={{
        lazy: true,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopWidth: 1,
          borderTopColor: "#e2e8f0",
          height: 60,
          paddingBottom: 6,
          paddingTop: 6,
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarLabelStyle: {
          fontFamily: "Lexend_500Medium",
          fontSize: 10,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Feather name="home" size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="people"
        options={{
          title: "People",
          tabBarIcon: ({ color, size }) => (
            <Feather name="users" size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="academics"
        options={{
          title: "Academics",
          tabBarIcon: ({ color, size }) => (
            <Feather name="book-open" size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="finance"
        options={{
          title: "Finance",
          tabBarIcon: ({ color, size }) => (
            <Feather name="dollar-sign" size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Feather name="user" size={20} color={color} />
          ),
        }}
      />
      {/* Hidden screens - navigated via router.push */}
      <Tabs.Screen name="teacher-list" options={{ href: null }} />
      <Tabs.Screen name="student-list" options={{ href: null }} />
      <Tabs.Screen name="parent-list" options={{ href: null }} />
      <Tabs.Screen name="parent-detail" options={{ href: null }} />
      <Tabs.Screen name="teacher-detail" options={{ href: null }} />
      <Tabs.Screen name="student-detail" options={{ href: null }} />
      <Tabs.Screen name="announcements" options={{ href: null }} />
      <Tabs.Screen name="announcement-create" options={{ href: null }} />
      <Tabs.Screen name="fee-structures" options={{ href: null }} />
      <Tabs.Screen name="expense-list" options={{ href: null }} />
      <Tabs.Screen name="class-list" options={{ href: null }} />
      <Tabs.Screen name="subject-list" options={{ href: null }} />
      <Tabs.Screen name="teacher-subjects" options={{ href: null }} />
      <Tabs.Screen name="attendance-view" options={{ href: null }} />
      <Tabs.Screen name="timetable-list" options={{ href: null }} />
      <Tabs.Screen name="timetable-view" options={{ href: null }} />
      <Tabs.Screen name="exam-types" options={{ href: null }} />
      <Tabs.Screen name="exam-subjects" options={{ href: null }} />
      <Tabs.Screen name="progress-view" options={{ href: null }} />
      <Tabs.Screen name="progress-card" options={{ href: null }} />
      <Tabs.Screen name="syllabus-list" options={{ href: null }} />
      <Tabs.Screen name="syllabus-detail" options={{ href: null }} />
      <Tabs.Screen name="salary-setup" options={{ href: null }} />
      <Tabs.Screen name="salary-payments" options={{ href: null }} />
    </Tabs>
  );
}
