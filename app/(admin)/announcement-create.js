import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuthStore, useAppStore } from "../../store";
import { announcementService } from "../../services/admin";
import { ANNOUNCEMENT_TYPE_CONFIG, PRIORITY_CONFIG } from "../../lib/constants";

const TYPES = Object.entries(ANNOUNCEMENT_TYPE_CONFIG).map(([key, config]) => ({
  value: key,
  label: config.label,
}));

const PRIORITIES = Object.entries(PRIORITY_CONFIG).map(([key, config]) => ({
  value: key,
  label: config.label,
}));

export default function CreateAnnouncementScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const academicYear = useAppStore((s) => s.academicYear);

  const skid = user?.skid;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("GENERAL");
  const [priority, setPriority] = useState("NORMAL");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert("Validation", "Please enter a title");
      return;
    }
    if (!description.trim()) {
      Alert.alert("Validation", "Please enter a description");
      return;
    }

    setSubmitting(true);
    try {
      await announcementService.createAnnouncement(skid, {
        academic_year_id: academicYear?.id,
        title: title.trim(),
        description: description.trim(),
        announcement_type: type,
        priority,
        target_audience: "ALL Users",
        target_classes: [],
        target_sections: [],
        target_users: [],
        is_published: true,
        publish_date: new Date().toISOString(),
        expiry_date: null,
        attachments: [],
        created_by: user?.school_user_id,
      });

      if (Platform.OS === "web") {
        alert("Announcement created successfully!");
      } else {
        Alert.alert("Success", "Announcement created successfully!");
      }
      router.back();
    } catch (err) {
      const msg =
        err?.response?.data?.message || "Failed to create announcement";
      Alert.alert("Error", msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-dark-50">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="flex-row items-center px-6 pt-4 pb-4">
          <TouchableOpacity
            onPress={() => router.back()}
            className="mr-3 w-9 h-9 rounded-full bg-white items-center justify-center shadow-sm"
          >
            <Text className="font-lexend-semibold text-dark-600 text-lg">
              &lsaquo;
            </Text>
          </TouchableOpacity>
          <Text className="font-lexend-bold text-xl text-dark-900 flex-1">
            Create Announcement
          </Text>
        </View>

        <View className="px-6 pb-8">
          {/* Title */}
          <View className="mb-4">
            <Text className="font-lexend-medium text-sm text-dark-700 mb-2">
              Title
            </Text>
            <TextInput
              className="bg-white rounded-xl px-4 py-3 font-lexend text-sm text-dark-900 shadow-sm"
              placeholder="Enter announcement title"
              placeholderTextColor="#94a3b8"
              value={title}
              onChangeText={setTitle}
            />
          </View>

          {/* Description */}
          <View className="mb-4">
            <Text className="font-lexend-medium text-sm text-dark-700 mb-2">
              Description
            </Text>
            <TextInput
              className="bg-white rounded-xl px-4 py-3 font-lexend text-sm text-dark-900 shadow-sm min-h-[120px]"
              placeholder="Enter announcement description"
              placeholderTextColor="#94a3b8"
              value={description}
              onChangeText={setDescription}
              multiline
              textAlignVertical="top"
            />
          </View>

          {/* Type Selector */}
          <View className="mb-4">
            <Text className="font-lexend-medium text-sm text-dark-700 mb-2">
              Type
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {TYPES.map((t) => (
                <TouchableOpacity
                  key={t.value}
                  className={`px-4 py-2 rounded-full ${
                    type === t.value
                      ? "bg-primary-600"
                      : "bg-white border border-dark-200"
                  }`}
                  onPress={() => setType(t.value)}
                >
                  <Text
                    className={`font-lexend-medium text-xs ${
                      type === t.value ? "text-white" : "text-dark-700"
                    }`}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Priority Selector */}
          <View className="mb-6">
            <Text className="font-lexend-medium text-sm text-dark-700 mb-2">
              Priority
            </Text>
            <View className="flex-row gap-2">
              {PRIORITIES.map((p) => (
                <TouchableOpacity
                  key={p.value}
                  className={`px-4 py-2 rounded-full flex-1 items-center ${
                    priority === p.value
                      ? "bg-primary-600"
                      : "bg-white border border-dark-200"
                  }`}
                  onPress={() => setPriority(p.value)}
                >
                  <Text
                    className={`font-lexend-medium text-xs ${
                      priority === p.value ? "text-white" : "text-dark-700"
                    }`}
                  >
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            className={`rounded-xl py-4 items-center ${
              submitting ? "bg-primary-400" : "bg-primary-600"
            }`}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="font-lexend-semibold text-base text-white">
                Publish Announcement
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
