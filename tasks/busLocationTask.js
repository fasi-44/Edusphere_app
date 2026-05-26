import * as TaskManager from "expo-task-manager";
import * as Location from "expo-location";
import { getSocket } from "../lib/socket";
import busLocationService from "../services/busStaff/busLocationService";
import { useAuthStore } from "../store/useAuthStore";

export const BUS_LOCATION_TASK = "BUS_LOCATION_TRACKING";

// Define background task — must be at module level
TaskManager.defineTask(BUS_LOCATION_TASK, ({ data, error }) => {
    if (error || !data) return;

    const { locations } = data;
    const loc = locations?.[0];
    if (!loc) return;

    const user = useAuthStore.getState().user;
    if (!user?.skid) return;

    const payload = {
        skid: user.skid,
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        heading: loc.coords.heading ?? null,
        speed: loc.coords.speed ? Math.round(loc.coords.speed * 3.6) : null, // m/s → km/h
    };

    // Try WebSocket first, fall back to REST
    const socket = getSocket();
    if (socket?.connected) {
        socket.emit("bus_location_update", payload);
    } else {
        busLocationService.updateLocation(user.skid, payload).catch(() => {});
    }
});

export async function startBusLocationTracking() {
    const { status: fg } = await Location.requestForegroundPermissionsAsync();
    if (fg !== "granted") throw new Error("Foreground location permission denied");

    const { status: bg } = await Location.requestBackgroundPermissionsAsync();
    if (bg !== "granted") throw new Error("Background location permission denied");

    await Location.startLocationUpdatesAsync(BUS_LOCATION_TASK, {
        accuracy: Location.Accuracy.High,
        timeInterval: 10000,      // every 10 seconds
        distanceInterval: 10,     // or every 10 meters moved
        foregroundService: {
            notificationTitle: "Bus Scan Active",
            notificationBody: "Sharing live location with parents",
            notificationColor: "#6366f1",
        },
        showsBackgroundLocationIndicator: true,
    });
}

export async function stopBusLocationTracking() {
    const isRunning = await TaskManager.isTaskRegisteredAsync(BUS_LOCATION_TASK);
    if (isRunning) {
        await Location.stopLocationUpdatesAsync(BUS_LOCATION_TASK);
    }
}
