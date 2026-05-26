import { io } from "socket.io-client";
import { useAuthStore } from "../store/useAuthStore";

const SOCKET_URL =
    (process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:5000/api").replace("/api", "");

let socket = null;

export function getSocket() {
    if (socket?.connected) return socket;

    const token = useAuthStore.getState().token;
    socket = io(SOCKET_URL, {
        auth: { token },
        transports: ["websocket"],
        reconnection: true,
        reconnectionDelay: 2000,
        reconnectionAttempts: 10,
    });
    return socket;
}

export function disconnectSocket() {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
}
