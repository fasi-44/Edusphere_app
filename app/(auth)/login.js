import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Feather } from "@expo/vector-icons";
import { useAuthStore, useAppStore } from "../../store";
import { authService } from "../../services/authService";

const loginSchema = z.object({
  identifier: z.string().min(1, "Email or username is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function LoginScreen() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const initFromLogin = useAppStore((s) => s.initFromLogin);
  const [apiError, setApiError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: "",
      password: "",
    },
  });

  const onSubmit = async (data) => {
    setApiError("");
    try {
      const response = await authService.login({
        identifier: data.identifier,
        password: data.password,
      });

      setAuth(response);
      initFromLogin(response.user);
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        "Login failed. Please check your credentials.";
      setApiError(message);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View className="flex-1 justify-center px-8">
          {/* Logo + Header */}
          <View className="mb-10 items-center">
            <Image
              source={require("../../assets/edusphere-logo.png")}
              style={{ width: 280, height: 58 }}
              resizeMode="contain"
            />
            <Text className="font-lexend text-base text-dark-500 mt-4">
              Sign in to manage your academic journey
            </Text>
          </View>

          {/* API Error */}
          {apiError ? (
            <View className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
              <Text className="font-lexend text-sm text-red-600">
                {apiError}
              </Text>
            </View>
          ) : null}

          {/* Identifier Field */}
          <View className="mb-4">
            <Text className="font-lexend-medium text-sm text-dark-700 mb-2">
              Email or Username
            </Text>
            <Controller
              control={control}
              name="identifier"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  className="font-lexend border border-dark-200 rounded-xl px-4 py-3.5 text-base text-dark-900 bg-dark-50"
                  placeholder="Enter your email or username"
                  placeholderTextColor="#94a3b8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
            {errors.identifier && (
              <Text className="font-lexend text-red-500 text-xs mt-1">
                {errors.identifier.message}
              </Text>
            )}
          </View>

          {/* Password Field */}
          <View className="mb-6">
            <Text className="font-lexend-medium text-sm text-dark-700 mb-2">
              Password
            </Text>
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <View className="flex-row items-center border border-dark-200 rounded-xl bg-dark-50">
                  <TextInput
                    className="font-lexend flex-1 px-4 py-3.5 text-base text-dark-900"
                    placeholder="Enter your password"
                    placeholderTextColor="#94a3b8"
                    secureTextEntry={!showPassword}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                  <TouchableOpacity
                    className="px-4 py-3.5"
                    onPress={() => setShowPassword(!showPassword)}
                    activeOpacity={0.7}
                  >
                    <Feather
                      name={showPassword ? "eye" : "eye-off"}
                      size={20}
                      color="#94a3b8"
                    />
                  </TouchableOpacity>
                </View>
              )}
            />
            {errors.password && (
              <Text className="font-lexend text-red-500 text-xs mt-1">
                {errors.password.message}
              </Text>
            )}
          </View>

          {/* Login Button */}
          <TouchableOpacity
            className={`rounded-xl py-4 items-center mb-4 ${
              isSubmitting ? "bg-primary-400" : "bg-primary-600"
            }`}
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="font-lexend-semibold text-white text-base">
                Sign In
              </Text>
            )}
          </TouchableOpacity>

          {/* Forgot Password */}
          <TouchableOpacity className="items-center">
            <Text className="font-lexend-medium text-primary-600 text-sm">
              Forgot Password?
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
