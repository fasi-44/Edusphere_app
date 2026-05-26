import { forwardRef } from "react";
import { View, StyleSheet } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { Feather } from "@expo/vector-icons";
import { COLORS } from "../lib/constants";

const BusMap = forwardRef(({ busData }, ref) => {
    return (
        <MapView
            ref={ref}
            style={{ flex: 1 }}
            initialRegion={{
                latitude: busData.latitude,
                longitude: busData.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            }}
            showsUserLocation
        >
            <Marker
                coordinate={{
                    latitude: busData.latitude,
                    longitude: busData.longitude,
                }}
                title={busData.staff_name || "Bus"}
                description={busData.speed ? `${Math.round(busData.speed)} km/h` : "Live"}
                rotation={busData.heading || 0}
            >
                <View style={styles.busMarker}>
                    <Feather name="navigation" size={18} color="#fff" />
                </View>
            </Marker>
        </MapView>
    );
});

const styles = StyleSheet.create({
    busMarker: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: COLORS.primary,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 3,
        borderColor: "#fff",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
});

export default BusMap;
