import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";

export default function BusMap() {
    return (
        <View style={styles.container}>
            <Feather name="map-pin" size={48} color="#cbd5e1" />
            <Text style={styles.text}>Map is only available on mobile devices</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        gap: 12,
    },
    text: {
        fontFamily: "Lexend_400Regular",
        fontSize: 14,
        color: "#94a3b8",
        textAlign: "center",
    },
});
