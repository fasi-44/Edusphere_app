import "../global.css";
import { useEffect, useState } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator, Platform } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import {
  useFonts,
  Lexend_100Thin,
  Lexend_200ExtraLight,
  Lexend_300Light,
  Lexend_400Regular,
  Lexend_500Medium,
  Lexend_600SemiBold,
  Lexend_700Bold,
  Lexend_800ExtraBold,
  Lexend_900Black,
} from "@expo-google-fonts/lexend";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useAuthStore } from "../store";
import { ROLE_ROUTES } from "../lib/constants";

if (Platform.OS !== "web") {
  SplashScreen.preventAutoHideAsync();
}

function useStoreHydration() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });

    if (useAuthStore.persist.hasHydrated()) {
      setHydrated(true);
    }

    return unsub;
  }, []);

  return hydrated;
}

const ROLE_GROUPS = ["(teacher)", "(student)", "(parent)", "(admin)"];

function AuthGate() {
  const segments = useSegments();
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const role = useAuthStore((s) => s.role);
  const hydrated = useStoreHydration();

  useEffect(() => {
    if (!hydrated) return;

    const inAuthGroup = segments[0] === "(auth)";
    const inRoleGroup = ROLE_GROUPS.includes(segments[0]);

    if (!isAuthenticated && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (isAuthenticated && inAuthGroup) {
      const route = ROLE_ROUTES[role] || "/(admin)";
      router.replace(route);
    } else if (isAuthenticated && !inRoleGroup && !inAuthGroup) {
      const route = ROLE_ROUTES[role] || "/(admin)";
      router.replace(route);
    }
  }, [isAuthenticated, segments, hydrated, role]);

  if (!hydrated) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Lexend_100Thin,
    Lexend_200ExtraLight,
    Lexend_300Light,
    Lexend_400Regular,
    Lexend_500Medium,
    Lexend_600SemiBold,
    Lexend_700Bold,
    Lexend_800ExtraBold,
    Lexend_900Black,
  });

  useEffect(() => {
    if ((fontsLoaded || fontError) && Platform.OS !== "web") {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <AuthGate />
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}
