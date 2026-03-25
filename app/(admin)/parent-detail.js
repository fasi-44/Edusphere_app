import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";

const InfoRow = ({ label, value }) => {
  if (!value) return null;
  return (
    <View className="flex-row items-start py-3 border-b border-dark-100">
      <Text className="font-lexend text-xs text-dark-500 w-28">{label}</Text>
      <Text className="font-lexend-medium text-sm text-dark-900 flex-1">
        {value}
      </Text>
    </View>
  );
};

export default function ParentDetailScreen() {
  const router = useRouter();
  const { data: dataStr } = useLocalSearchParams();

  let parent = null;
  try {
    parent = dataStr ? JSON.parse(dataStr) : null;
  } catch {
    parent = null;
  }

  const profile = parent?.profile;
  const displayName =
    parent?.full_name ||
    `${parent?.first_name || ""} ${parent?.last_name || ""}`.trim() ||
    "Parent";

  // Collect callable phone numbers
  const phones = [profile?.father_phone, profile?.mother_phone].filter(Boolean);

  return (
    <SafeAreaView className="flex-1 bg-dark-50">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
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
          <Text className="font-lexend-bold text-xl text-dark-900 flex-1">
            Parent Details
          </Text>
        </View>

        {/* Profile Card */}
        <View className="items-center px-6 pt-4 pb-6">
          <View className="w-20 h-20 rounded-full bg-purple-100 items-center justify-center mb-4">
            <Text className="font-lexend-bold text-2xl text-purple-600">
              {(parent?.first_name?.[0] || displayName?.[0] || "P").toUpperCase()}
            </Text>
          </View>
          <Text className="font-lexend-bold text-xl text-dark-900">
            {displayName}
          </Text>
          {parent?.email ? (
            <Text className="font-lexend text-sm text-dark-500 mt-1">
              {parent.email}
            </Text>
          ) : null}
          <View className="flex-row items-center gap-2 mt-2">
            {profile?.relation_type && (
              <View className="bg-purple-100 px-3 py-1 rounded-full">
                <Text className="font-lexend-medium text-xs text-purple-700">
                  {profile.relation_type}
                </Text>
              </View>
            )}
            <View
              className={`px-3 py-1 rounded-full ${
                parent?.has_login ? "bg-green-100" : "bg-dark-100"
              }`}
            >
              <Text
                className={`font-lexend-medium text-xs ${
                  parent?.has_login ? "text-green-700" : "text-dark-500"
                }`}
              >
                {parent?.has_login ? "Login Enabled" : "No Login"}
              </Text>
            </View>
          </View>
        </View>

        {/* Contact Actions */}
        {(phones.length > 0 || parent?.email) && (
          <View className="flex-row px-6 gap-3 mb-6">
            {phones[0] && (
              <TouchableOpacity
                className="flex-1 bg-green-50 rounded-xl py-3 items-center"
                onPress={() => Linking.openURL(`tel:${phones[0]}`)}
              >
                <Text className="font-lexend-medium text-sm text-green-700">
                  Call
                </Text>
              </TouchableOpacity>
            )}
            {parent?.email && (
              <TouchableOpacity
                className="flex-1 bg-blue-50 rounded-xl py-3 items-center"
                onPress={() => Linking.openURL(`mailto:${parent.email}`)}
              >
                <Text className="font-lexend-medium text-sm text-blue-700">
                  Email
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Details */}
        <View className="px-6 pb-8">
          {/* Father Info */}
          <View className="bg-white rounded-2xl p-5 shadow-sm">
            <Text className="font-lexend-semibold text-sm text-dark-400 uppercase tracking-wider mb-2">
              Father Information
            </Text>
            <InfoRow label="Full Name" value={profile?.father_full_name} />
            <InfoRow label="Phone" value={profile?.father_phone} />
            <InfoRow label="Occupation" value={profile?.father_occupation} />
            <InfoRow label="Qualification" value={profile?.father_qualification} />
          </View>

          {/* Mother Info */}
          <View className="bg-white rounded-2xl p-5 shadow-sm mt-3">
            <Text className="font-lexend-semibold text-sm text-dark-400 uppercase tracking-wider mb-2">
              Mother Information
            </Text>
            <InfoRow label="Full Name" value={profile?.mother_full_name} />
            <InfoRow label="Phone" value={profile?.mother_phone} />
            <InfoRow label="Occupation" value={profile?.mother_occupation} />
            <InfoRow label="Qualification" value={profile?.mother_qualification} />
          </View>

          {/* Contact & Address */}
          <View className="bg-white rounded-2xl p-5 shadow-sm mt-3">
            <Text className="font-lexend-semibold text-sm text-dark-400 uppercase tracking-wider mb-2">
              Contact & Address
            </Text>
            <InfoRow label="Email" value={parent?.email} />
            <InfoRow label="Phone" value={parent?.phone} />
            <InfoRow label="Address" value={profile?.address} />
            <InfoRow
              label="City / State"
              value={
                [profile?.city, profile?.state].filter(Boolean).join(", ") ||
                null
              }
            />
            <InfoRow label="Postal Code" value={profile?.postal_code} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
