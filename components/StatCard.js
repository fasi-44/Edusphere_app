import { View, Text, TouchableOpacity } from "react-native";

const GRADIENTS = {
  blue: ["#1e40af", "#3b82f6"],
  orange: ["#c2410c", "#f97316"],
  green: ["#15803d", "#22c55e"],
  purple: ["#7e22ce", "#a855f7"],
};

export default function StatCard({
  title,
  value,
  subtitle,
  variant = "blue",
  onPress,
}) {
  const colors = GRADIENTS[variant] || GRADIENTS.blue;

  const Wrapper = onPress ? TouchableOpacity : View;
  const wrapperProps = onPress
    ? { onPress, activeOpacity: 0.85 }
    : {};

  return (
    <Wrapper
      className="flex-1 rounded-2xl p-4 min-h-[110px] justify-between"
      style={{ backgroundColor: colors[0] }}
      {...wrapperProps}
    >
      {subtitle && (
        <View className="self-start bg-white/20 rounded-full px-2.5 py-1 mb-2">
          <Text className="font-lexend-medium text-[10px] text-white">
            {subtitle}
          </Text>
        </View>
      )}
      <Text className="font-lexend-bold text-3xl text-white">{value}</Text>
      <Text className="font-lexend text-xs text-white/70">{title}</Text>
    </Wrapper>
  );
}
