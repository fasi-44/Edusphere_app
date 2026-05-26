import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { COLORS } from "../../lib/constants";

export default function BusStaffLayout() {
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
                    title: "Scan",
                    tabBarIcon: ({ color }) => (
                        <Feather name="camera" size={20} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="report"
                options={{
                    title: "Report",
                    tabBarIcon: ({ color }) => (
                        <Feather name="list" size={20} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: "Profile",
                    tabBarIcon: ({ color }) => (
                        <Feather name="user" size={20} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}
