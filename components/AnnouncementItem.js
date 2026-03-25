import { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { PRIORITY_CONFIG, ANNOUNCEMENT_TYPE_CONFIG } from "../lib/constants";

const DESC_CHAR_LIMIT = 90;

export default function AnnouncementItem({ announcement, onPress }) {
    const priority = announcement.priority?.toUpperCase() || "NORMAL";
    const rawType = announcement.announcement_type || announcement.type || "GENERAL";
    const type = rawType.toUpperCase().replace(/\s+/g, "_");

    const priorityConfig = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.NORMAL;
    const typeConfig = ANNOUNCEMENT_TYPE_CONFIG[type] || ANNOUNCEMENT_TYPE_CONFIG.GENERAL;

    const isUrgent = priority === "URGENT";

    const [expanded, setExpanded] = useState(false);

    const description = announcement.content || announcement.description || announcement.message || "";
    const isLong = description.length > DESC_CHAR_LIMIT;

    const handlePress = () => {
        if (onPress) return onPress();
        if (isLong) setExpanded((prev) => !prev);
    };

    return (
        <TouchableOpacity
            className={`rounded-2xl p-4 mb-3 ${isUrgent ? "bg-slate-700" : "bg-white"}`}
            onPress={handlePress}
            activeOpacity={0.7}
        >
            {/* Priority Badge */}
            <View className="flex-row items-center mb-2">
                <View className={`flex-row items-center px-2.5 py-1 rounded-full ${isUrgent ? "bg-red-500/20" : priorityConfig.badgeColor}`}>
                    <View className={`w-1.5 h-1.5 rounded-full mr-1.5 ${isUrgent ? "bg-red-400" : priorityConfig.dotColor}`} />
                    <Text className={`font-lexend-semibold text-[10px] uppercase ${isUrgent ? "text-red-400" : priorityConfig.textColor}`}>
                        {priorityConfig.label}
                    </Text>
                </View>

                {typeConfig && (
                    <View className={`ml-2 px-2 py-0.5 rounded-full ${isUrgent ? "bg-white/10" : typeConfig.color}`}>
                        <Text className={`font-lexend text-[10px] ${isUrgent ? "text-white/70" : typeConfig.textColor}`}>
                            {typeConfig.label}
                        </Text>
                    </View>
                )}
            </View>

            {/* Title */}
            <Text
                className={`font-lexend-semibold text-sm mb-1.5 ${isUrgent ? "text-white" : "text-dark-900"}`}
                numberOfLines={2}
            >
                {announcement.title}
            </Text>

            {/* Description - accordion */}
            {description ? (
                <View>
                    <Text
                        className={`font-lexend text-xs leading-5 ${isUrgent ? "text-slate-300" : "text-dark-500"}`}
                        numberOfLines={expanded ? undefined : 2}
                        ellipsizeMode="tail"
                    >
                        {description}
                    </Text>
                    {isLong && (
                        <Text
                            className={`font-lexend-medium text-[11px] mt-1.5 ${
                                isUrgent ? "text-slate-400" : "text-primary-600"
                            }`}
                        >
                            {expanded ? "Show less" : "Read more"}
                        </Text>
                    )}
                </View>
            ) : null}
        </TouchableOpacity>
    );
}
