import { Redirect } from "expo-router";
import { useAuthStore } from "../store";
import { ROLE_ROUTES } from "../lib/constants";

export default function Index() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const role = useAuthStore((s) => s.role);

  if (isAuthenticated) {
    const route = ROLE_ROUTES[role] || "/(tabs)";
    return <Redirect href={route} />;
  }

  return <Redirect href="/(auth)/login" />;
}
