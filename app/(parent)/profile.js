import { View, Text, ScrollView, TouchableOpacity, Alert, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore, useAppStore, useParentStore } from "../../store";
import { authService } from "../../services/authService";

export default function ParentProfileScreen() {
    const user = useAuthStore((s) => s.user);
    const logout = useAuthStore((s) => s.logout);
    const resetApp = useAppStore((s) => s.reset);
    const resetParent = useParentStore((s) => s.reset);
    const children = useParentStore((s) => s.children);

    const handleLogout = () => {
        const doLogout = async () => {
            await authService.logout();
            resetParent();
            logout();
            resetApp();
        };

        if (Platform.OS === "web") {
            if (confirm("Are you sure you want to sign out?")) doLogout();
        } else {
            Alert.alert("Logout", "Are you sure you want to sign out?", [
                { text: "Cancel", style: "cancel" },
                { text: "Sign Out", style: "destructive", onPress: doLogout },
            ]);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-dark-50">
            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                <View className="items-center px-6 pt-6 pb-8">
                    <View className="w-20 h-20 rounded-full bg-primary-100 items-center justify-center mb-4">
                        <Text className="font-lexend-bold text-2xl text-primary-600">
                            {user?.first_name?.charAt(0)?.toUpperCase() || "P"}
                        </Text>
                    </View>
                    <Text className="font-lexend-bold text-xl text-dark-900">
                        {user?.full_name || "Parent"}
                    </Text>
                    <Text className="font-lexend text-sm text-dark-500 mt-1">
                        {user?.email || ""}
                    </Text>
                    <View className="bg-primary-100 px-3 py-1 rounded-full mt-2">
                        <Text className="font-lexend-medium text-xs text-primary-700">Parent</Text>
                    </View>
                </View>

                <View className="px-6">
                    {/* Children Section */}
                    {children.length > 0 && (
                        <>
                            <Text className="font-lexend-semibold text-sm text-dark-400 uppercase tracking-wider mb-3">
                                My Children
                            </Text>
                            {children.map((child) => (
                                <View
                                    key={child.student_id}
                                    className="bg-white rounded-2xl p-4 mb-3 flex-row items-center"
                                    style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 }}
                                >
                                    <View className="w-10 h-10 rounded-full bg-primary-50 items-center justify-center mr-3">
                                        <Text className="font-lexend-bold text-sm text-primary-600">
                                            {child.first_name?.charAt(0)?.toUpperCase() || "?"}
                                        </Text>
                                    </View>
                                    <View className="flex-1">
                                        <Text className="font-lexend-medium text-sm text-dark-900">
                                            {child.full_name}
                                        </Text>
                                        <Text className="font-lexend text-xs text-dark-400 mt-0.5">
                                            {child.class_name || ""}
                                            {child.section_name ? ` - ${child.section_name}` : ""}
                                            {child.roll_no ? ` | Roll: ${child.roll_no}` : ""}
                                        </Text>
                                    </View>
                                    {child.relation_type && (
                                        <View className="bg-dark-50 rounded-full px-2.5 py-1">
                                            <Text className="font-lexend text-[10px] text-dark-500 capitalize">
                                                {child.relation_type}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            ))}
                        </>
                    )}

                    <Text className="font-lexend-semibold text-sm text-dark-400 uppercase tracking-wider mb-3 mt-4">
                        Account
                    </Text>
                    <MenuItem title="Phone" subtitle={user?.phone || "Not set"} />
                    <MenuItem title="Email" subtitle={user?.email || "Not set"} />

                    <Text className="font-lexend-semibold text-sm text-dark-400 uppercase tracking-wider mb-3 mt-4">
                        Settings
                    </Text>
                    <MenuItem title="Notifications" subtitle="Manage push notifications" />
                    <MenuItem title="About EduSphere" subtitle="Version 1.0.0" />

                    <TouchableOpacity
                        className="bg-red-50 rounded-2xl p-4 mb-8 mt-4 items-center"
                        onPress={handleLogout}
                        activeOpacity={0.7}
                    >
                        <Text className="font-lexend-semibold text-sm text-red-600">Sign Out</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

function MenuItem({ title, subtitle, onPress }) {
    return (
        <TouchableOpacity
            className="bg-white rounded-2xl p-4 mb-3 flex-row items-center shadow-sm"
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View className="flex-1">
                <Text className="font-lexend-medium text-sm text-dark-900">{title}</Text>
                {subtitle && (
                    <Text className="font-lexend text-xs text-dark-500 mt-0.5">{subtitle}</Text>
                )}
            </View>
            <Text className="font-lexend text-dark-400 text-lg">&#x203A;</Text>
        </TouchableOpacity>
    );
}
