import { useEffect } from "react";
import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { COLORS } from "../../lib/constants";
import { useAuthStore, useParentStore } from "../../store";
import { childrenService } from "../../services/parent";

export default function ParentLayout() {
    const user = useAuthStore((s) => s.user);
    const setChildren = useParentStore((s) => s.setChildren);
    const setLoading = useParentStore((s) => s.setLoading);

    useEffect(() => {
        async function fetchChildren() {
            if (!user?.skid || !user?.school_user_id) return;
            setLoading(true);
            try {
                const res = await childrenService.getChildren(user.skid, user.school_user_id);
                const data = res?.data?.data || res?.data || [];
                setChildren(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error("Failed to fetch children:", err);
                setChildren([]);
            } finally {
                setLoading(false);
            }
        }
        fetchChildren();
    }, [user?.skid, user?.school_user_id]);

    return (
        <Tabs
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
                name="timetable"
                options={{
                    title: "Timetable",
                    tabBarIcon: ({ color, size }) => (
                        <Feather name="calendar" size={20} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="fees"
                options={{
                    title: "Fees",
                    tabBarIcon: ({ color, size }) => (
                        <Feather name="credit-card" size={20} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="assignments"
                options={{
                    title: "Assignments",
                    tabBarIcon: ({ color, size }) => (
                        <Feather name="clipboard" size={20} color={color} />
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
            <Tabs.Screen name="syllabus-detail" options={{ href: null }} />
        </Tabs>
    );
}
