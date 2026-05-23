import React, { useEffect, useState, useRef, useCallback } from "react";
import {
    StyleSheet,
    View,
    Dimensions,
    TouchableOpacity,
    Text,
    Modal,
    Button,
    Image,
    RefreshControl,
    ScrollView,
} from "react-native";

import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import * as Speech from "expo-speech";
import { Picker } from "@react-native-picker/picker";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface Danger {
    id: number;
    latitude: number;
    longitude: number;
    type: string;
    severity: string;
    image?: string;
}

export default function Home({ navigation }: any) {

    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [dangers, setDangers] = useState<Danger[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    const [dangerType, setDangerType] = useState("Pothole");
    const [dangerSeverity, setDangerSeverity] = useState("Low");
    const [dangerImage, setDangerImage] = useState<string | null>(null);

    const [reportModalVisible, setReportModalVisible] = useState(false);

    const [currentDanger, setCurrentDanger] = useState<Danger | null>(null);
    const [distanceText, setDistanceText] = useState("");

    const spokenRef = useRef<number | null>(null);

    const API_URL = "http://192.168.150.204:8000/api/dangers/";

    const [mapRegion, setMapRegion] = useState({
        latitude: 0.3476,
        longitude: 32.5825,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
    });

    // =========================
    // LOAD DATA + LOCATION
    // =========================
    useEffect(() => {
        fetchDangers();
        getLocation();
    }, []);

    // =========================
    // FETCH DANGERS (WITH TOKEN)
    // =========================
    const fetchDangers = async () => {
        try {
            const token = await AsyncStorage.getItem("token");

            const res = await axios.get(API_URL, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            setDangers(res.data);
        } catch (error) {
            console.log("Error fetching dangers:", error);
        }
    };

    // =========================
    // REFRESH
    // =========================
    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchDangers().finally(() => setRefreshing(false));
    }, []);

    // =========================
    // LOCATION TRACKING
    // =========================
    const getLocation = async () => {
        let { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== "granted") return;

        Location.watchPositionAsync(
            {
                accuracy: Location.Accuracy.High,
                distanceInterval: 5,
            },
            (loc) => {
                setLocation(loc);

                setMapRegion({
                    latitude: loc.coords.latitude,
                    longitude: loc.coords.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                });
            }
        );
    };

    // =========================
    // DISTANCE CALCULATION
    // =========================
    const getDistance = (
        lat1: number,
        lon1: number,
        lat2: number,
        lon2: number
    ) => {
        const R = 6371000;
        const dLat = ((lat2 - lat1) * Math.PI) / 180;
        const dLon = ((lon2 - lon1) * Math.PI) / 180;

        const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) ** 2;

        return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
    };

    // =========================
    // SMART VOICE WARNING SYSTEM
    // =========================
    useEffect(() => {
        if (!location || dangers.length === 0) return;

        let nearest: Danger | null = null;
        let min = Infinity;

        dangers.forEach((d) => {
            const dist = getDistance(
                location.coords.latitude,
                location.coords.longitude,
                d.latitude,
                d.longitude
            );

            if (dist < min) {
                min = dist;
                nearest = d;
            }
        });

        const meters = Math.round(min);

        setCurrentDanger(nearest);
        setDistanceText(`${meters}m ahead`);

        // 🔊 ONLY SPEAK WHEN DISTANCE CHANGES SIGNIFICANTLY
        if (nearest && meters <= 100) {
            if (spokenRef.current !== meters) {
                spokenRef.current = meters;

                Speech.stop();
                Speech.speak(
                    `${nearest.type} ahead. ${meters} meters remaining`,
                    {
                        language: "en",
                        rate: 0.9,
                    }
                );
            }
        }

        // reset when safe
        if (meters > 120) {
            spokenRef.current = null;
        }

    }, [location, dangers]);

    // =========================
    // IMAGE PICK
    // =========================
    const pickImage = async () => {
        const result = await ImagePicker.launchCameraAsync({
            quality: 0.5,
        });

        if (!result.canceled) {
            setDangerImage(result.assets[0].uri);
        }
    };

    // =========================
    // SUBMIT REPORT
    // =========================
    const submitReport = async () => {
        if (!location) return;

        const token = await AsyncStorage.getItem("token");

        const formData = new FormData();
        formData.append("type", dangerType);
        formData.append("severity", dangerSeverity);
        formData.append("latitude", String(location.coords.latitude));
        formData.append("longitude", String(location.coords.longitude));

        if (dangerImage) {
            formData.append("image", {
                uri: dangerImage,
                name: "danger.jpg",
                type: "image/jpeg",
            } as any);
        }

        try {
            await axios.post(API_URL, formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "multipart/form-data",
                },
            });

            alert("Danger reported successfully!");
            fetchDangers();

        } catch (err) {
            console.log(err);
        }

        setReportModalVisible(false);
        setDangerImage(null);
    };

    // =========================
    // UI
    // =========================
    return (
        <View style={{ flex: 1 }}>

            <ScrollView
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >

                <MapView
                    style={styles.map}
                    region={mapRegion}
                    showsUserLocation
                >
                    {dangers.map((d) => (
                        <Marker
                            key={d.id}
                            coordinate={{
                                latitude: d.latitude,
                                longitude: d.longitude,
                            }}
                            title={d.type}
                            description={d.severity}
                        />
                    ))}
                </MapView>

                {/* REPORT BUTTON */}
                <TouchableOpacity
                    style={styles.reportBtn}
                    onPress={() => setReportModalVisible(true)}
                >
                    <Text style={{ color: "white", fontSize: 30 }}>+</Text>
                </TouchableOpacity>

                {/* REPORT MODAL */}
                <Modal visible={reportModalVisible} transparent>
                    <View style={styles.modal}>
                        <View style={styles.modalBox}>

                            <Text style={{ fontSize: 18, marginBottom: 10 }}>
                                Report Danger
                            </Text>

                            <Picker
                                selectedValue={dangerType}
                                onValueChange={setDangerType}
                            >
                                <Picker.Item label="Pothole" value="Pothole" />
                                <Picker.Item label="Flood" value="Flood" />
                                <Picker.Item label="Accident" value="Accident" />
                            </Picker>

                            <Picker
                                selectedValue={dangerSeverity}
                                onValueChange={setDangerSeverity}
                            >
                                <Picker.Item label="Low" value="Low" />
                                <Picker.Item label="Medium" value="Medium" />
                                <Picker.Item label="High" value="High" />
                            </Picker>

                            <Button title="Take Photo" onPress={pickImage} />

                            {dangerImage && (
                                <Image
                                    source={{ uri: dangerImage }}
                                    style={{ width: 100, height: 100, marginTop: 10 }}
                                />
                            )}

                            <Button title="Submit" onPress={submitReport} />
                            <Button
                                title="Cancel"
                                onPress={() => setReportModalVisible(false)}
                            />

                        </View>
                    </View>
                </Modal>

            </ScrollView>
        </View>
    );
}

// =========================
const styles = StyleSheet.create({
    map: {
        width: Dimensions.get("window").width,
        height: Dimensions.get("window").height,
    },

    reportBtn: {
        position: "absolute",
        bottom: 40,
        right: 20,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: "green",
        justifyContent: "center",
        alignItems: "center",
    },

    modal: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },

    modalBox: {
        width: 300,
        backgroundColor: "white",
        padding: 20,
        borderRadius: 10,
    },
});