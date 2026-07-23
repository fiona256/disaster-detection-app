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
    Switch,
    ActivityIndicator,
} from "react-native";

import CustomMap from "../components/CustomMap";
import * as Location from "expo-location";
import * as Speech from "expo-speech";
import { Picker } from "@react-native-picker/picker";
import * as ImagePicker from "expo-image-picker";
import { Accelerometer, Barometer, Gyroscope, LightSensor } from "expo-sensors";
import { API, syncOfflineQueue } from "../services/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { io } from "socket.io-client";
import { CameraView, useCameraPermissions } from "expo-camera";

interface Danger {
    id: number;
    latitude: number;
    longitude: number;
    type: string;
    severity: string;
    image?: string;
    source?: string;
}

export default function Home({ navigation }: any) {

    const getAPIHost = () => {
        const base = API.defaults.baseURL || "http://10.40.1.82:8000/api/";
        const match = base.match(/^(https?:\/\/[^\/]+)/);
        return match ? match[1] : "http://10.40.1.82:8000";
    };

    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [dangers, setDangers] = useState<Danger[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    const [dangerType, setDangerType] = useState("Pothole");
    const [dangerSeverity, setDangerSeverity] = useState("Low");
    const [dangerImage, setDangerImage] = useState<string | null>(null);

    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [aiScore, setAiScore] = useState<number | null>(null);
    const [aiComment, setAiComment] = useState<string | null>(null);

    const [reportModalVisible, setReportModalVisible] = useState(false);

    // Embedded Camera View Integration
    const [showEmbeddedCamera, setShowEmbeddedCamera] = useState(false);
    const [cameraPermission, requestCameraPermission] = useCameraPermissions();
    const cameraRef = useRef<any>(null);

    const [currentDanger, setCurrentDanger] = useState<Danger | null>(null);
    const [distanceText, setDistanceText] = useState("");

    const spokenRef = useRef<number | null>(null);
    const lastSpokenDangerIdRef = useRef<number | null>(null);
    const lastTriggeredRef = useRef<number>(0);
    const lastSpokenTimeRef = useRef<number>(0);

    const [autoPotholeEnabled, setAutoPotholeEnabled] = useState(false);
    const [currentG, setCurrentG] = useState(1.0);
    const [devMenuVisible, setDevMenuVisible] = useState(true);

    // Onboard Smartphone IoT Nodes
    const [onboardMonitorExpanded, setOnboardMonitorExpanded] = useState(false);
    const [pressureVal, setPressureVal] = useState(1013.2); // hPa
    const [rotationVal, setRotationVal] = useState(0.02); // rad/s
    const [lightVal, setLightVal] = useState(320); // lux
    const [temperatureVal, setTemperatureVal] = useState(35.5); // °C

    const lastBarometerTriggerRef = useRef<number>(0);
    const lastGyroTriggerRef = useRef<number>(0);
    const lastLightTriggerRef = useRef<number>(0);
    const lastTempTriggerRef = useRef<number>(0);

    // Premium Warning Pulse Overlay State
    const [warningOverlayVisible, setWarningOverlayVisible] = useState(false);
    const [warningOverlayType, setWarningOverlayType] = useState("");
    const [warningOverlayDist, setWarningOverlayDist] = useState<number>(0);

    // Network / Sync Queue States
    const [isOnline, setIsOnline] = useState(true);
    const [offlineQueueCount, setOfflineQueueCount] = useState(0);

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
        if (typeof window !== "undefined") {
            (window as any).setDangerImageMock = () => {
                const blob = new Blob([new Uint8Array([1, 2, 3])], { type: "image/jpeg" });
                const blobUrl = URL.createObjectURL(blob);
                setDangerImage(blobUrl);
                setAiScore(null);
                setAiComment(null);
            };
        }
    }, []);

    // =========================
    // FETCH DANGERS
    // =========================
    const fetchDangers = async () => {
        try {
            const res = await API.get("dangers/");
            const data = Array.isArray(res.data) ? res.data : [];
            setDangers(data);
            await AsyncStorage.setItem("mock_dangers", JSON.stringify(data));
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
        if (!location) return;

        const checkProximity = async () => {
            try {
                const res = await API.get("dangers/proximity", {
                    params: {
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude,
                        radius: 500
                    }
                });

                const nearby = Array.isArray(res.data) ? res.data : [];
                if (nearby.length > 0) {
                    const nearest = nearby[0];
                    const meters = nearest.distance_meters;

                    setCurrentDanger(nearest);
                    setDistanceText(`${meters}m ahead`);

                    // 🔊 ONLY SPEAK ONCE WHEN ENTERING THE WARNING ZONE (< 100m)
                    if (meters <= 100) {
                        setWarningOverlayVisible(true);
                        setWarningOverlayType(nearest.type);
                        setWarningOverlayDist(meters);

                        if (lastSpokenDangerIdRef.current !== nearest.id && Date.now() - lastSpokenTimeRef.current > 6000) {
                            lastSpokenDangerIdRef.current = nearest.id;
                            lastSpokenTimeRef.current = Date.now();

                            // Trigger physical tactile haptic pulses
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

                            try {
                                Speech.stop();
                                Speech.speak(
                                    `Warning: ${nearest.type} ahead. Approximately ${meters} meters.`,
                                    {
                                        language: "en",
                                        rate: 0.9,
                                    }
                                );
                            } catch {}
                        }
                    } else {
                        // Reset overlay if closest is further than 100m
                        setWarningOverlayVisible(false);
                    }
                } else {
                    setCurrentDanger(null);
                    setDistanceText("");
                    setWarningOverlayVisible(false);
                    lastSpokenDangerIdRef.current = null;
                }
            } catch (err) {
                console.log("Error querying proximity dangers:", err);
                
                // Offline fallback - search locally from cached dangers
                let nearest: Danger | null = null;
                let min = Infinity;

                for (const d of dangers) {
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
                }

                const meters = Math.round(min);
                if (nearest && meters <= 500) {
                    setCurrentDanger(nearest);
                    setDistanceText(`${meters}m ahead`);

                    if (meters <= 100) {
                        setWarningOverlayVisible(true);
                        setWarningOverlayType(nearest.type);
                        setWarningOverlayDist(meters);

                        if (lastSpokenDangerIdRef.current !== nearest.id && Date.now() - lastSpokenTimeRef.current > 6000) {
                            lastSpokenDangerIdRef.current = nearest.id;
                            lastSpokenTimeRef.current = Date.now();
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                            try {
                                Speech.stop();
                                Speech.speak(`Warning: ${nearest.type} ahead. Approximately ${meters} meters.`, { language: "en", rate: 0.9 });
                            } catch {}
                        }
                    } else {
                        setWarningOverlayVisible(false);
                    }
                } else {
                    setCurrentDanger(null);
                    setDistanceText("");
                    setWarningOverlayVisible(false);
                    lastSpokenDangerIdRef.current = null;
                }
            }
        };

        checkProximity();
    }, [location, dangers]);

    // =========================
    // ACCELEROMETER ROAD IMPACT DETECTOR
    // =========================
    useEffect(() => {
        let subscription: any;
        let accelSimInterval: NodeJS.Timeout;

        const startAccelerometer = async () => {
            const isAvail = await Accelerometer.isAvailableAsync();
            if (autoPotholeEnabled) {
                if (isAvail) {
                    Accelerometer.setUpdateInterval(20);
                    let ema = 1.0;
                    subscription = Accelerometer.addListener((data) => {
                        const magnitude = Math.sqrt(data.x * data.x + data.y * data.y + data.z * data.z);
                        ema = 0.9 * ema + 0.1 * magnitude;
                        const shock = Math.abs(magnitude - ema);
                        setCurrentG(parseFloat(magnitude.toFixed(2)));

                        if (shock > 1.5) {
                            triggerAutoPothole(magnitude);
                        }
                    });
                } else {
                    // Fallback to virtual accelerometer fluctuation on web browser
                    accelSimInterval = setInterval(() => {
                        const randShock = Math.random();
                        let gVal = 1.0 + (Math.random() * 0.2 - 0.1);
                        if (randShock > 0.97) {
                            gVal = 2.65; // transient road shock pothole trigger!
                            triggerAutoPothole(gVal);
                        }
                        setCurrentG(parseFloat(gVal.toFixed(2)));
                    }, 1000);
                }
            } else {
                setCurrentG(1.0);
            }
        };

        startAccelerometer();

        return () => {
            if (subscription) subscription.remove();
            if (accelSimInterval) clearInterval(accelSimInterval);
        };
    }, [autoPotholeEnabled]);

    const triggerAutoPothole = async (gForce: number) => {
        const now = Date.now();
        // 8 seconds cool-down between reports to avoid duplicate posts
        if (now - lastTriggeredRef.current < 8000) return;

        // Filter out hand-shaking and false triggers: only detect if vehicle speed is > 1.5 m/s (approx 5.4 km/h)
        const speed = location?.coords?.speed;
        if (speed !== null && speed !== undefined && speed < 1.5) {
            console.log("Pothole shock ignored: vehicle is stationary or moving too slowly:", speed);
            return;
        }

        lastTriggeredRef.current = now;

        const lat = location?.coords?.latitude || 0.3476;
        const lon = location?.coords?.longitude || 32.5825;

        try {
            Speech.stop();
            Speech.speak(`Road hazard detected. Pothole recorded.`, {
                language: "en",
                rate: 0.95
            });
            lastSpokenTimeRef.current = Date.now();

            await API.post("dangers/", {
                type: "Pothole",
                severity: "Critical",
                latitude: lat,
                longitude: lon,
                source: "IoT"
            });

            fetchDangers();
        } catch (err) {
            console.log("Auto report upload error:", err);
        }
    };

    // ==========================================
    // MULTI-SENSOR ONBOARD IOT TELEMETRY HOOK
    // ==========================================
    useEffect(() => {
        let baroSub: any = null;
        let gyroSub: any = null;
        let lightSub: any = null;
        let accelSub: any = null;
        let simInterval: any = null;
        let accelInterval: any = null;

        const startSensorTelemetry = async () => {
            const baroAvail = await Barometer.isAvailableAsync();
            const gyroAvail = await Gyroscope.isAvailableAsync();
            const lightAvail = await LightSensor.isAvailableAsync();
            const accelAvail = await Accelerometer.isAvailableAsync();

            if (autoPotholeEnabled) {
                // 1. Native Barometer Setup
                if (baroAvail) {
                    Barometer.setUpdateInterval(1000);
                    baroSub = Barometer.addListener((data) => {
                        setPressureVal(parseFloat(data.pressure.toFixed(1)));
                        checkBarometerThreshold(data.pressure);
                    });
                }

                // 2. Native Gyroscope Setup
                if (gyroAvail) {
                    Gyroscope.setUpdateInterval(50);
                    gyroSub = Gyroscope.addListener((data) => {
                        const magnitude = Math.sqrt(data.x * data.x + data.y * data.y + data.z * data.z);
                        setRotationVal(parseFloat(magnitude.toFixed(2)));
                        checkGyroThreshold(magnitude);
                    });
                }

                // 3. Native Light Sensor Setup
                if (lightAvail) {
                    lightSub = LightSensor.addListener((data) => {
                        setLightVal(data.illuminance);
                        checkLightThreshold(data.illuminance);
                    });
                }

                // 4. Native Accelerometer Setup
                if (accelAvail) {
                    Accelerometer.setUpdateInterval(100);
                    accelSub = Accelerometer.addListener((data) => {
                        const force = Math.sqrt(data.x * data.x + data.y * data.y + data.z * data.z);
                        setCurrentG(parseFloat(force.toFixed(2)));
                        checkAccelerometerThreshold(force);
                    });
                }

                // 5. Virtual Telemetry Fluctuation for Web falls (if native is unavailable)
                if (!baroAvail || !gyroAvail || !lightAvail || !accelAvail) {
                    simInterval = setInterval(() => {
                        if (!baroAvail) {
                            setPressureVal((prev) => {
                                const next = prev + (Math.random() * 0.4 - 0.2);
                                const rounded = parseFloat(next.toFixed(1));
                                checkBarometerThreshold(rounded);
                                return rounded;
                            });
                        }
                        if (!gyroAvail) {
                            setRotationVal((prev) => {
                                const next = Math.max(0.01, prev + (Math.random() * 0.04 - 0.02));
                                const rounded = parseFloat(next.toFixed(2));
                                checkGyroThreshold(rounded);
                                return rounded;
                            });
                        }
                        if (!lightAvail) {
                            setLightVal((prev) => {
                                const next = Math.max(10, Math.min(1000, prev + (Math.random() * 40 - 20)));
                                const rounded = Math.round(next);
                                checkLightThreshold(rounded);
                                return rounded;
                            });
                        }
                        // Thermometer is always virtual
                        setTemperatureVal((prev) => {
                            const next = Math.max(34, Math.min(39, prev + (Math.random() * 0.2 - 0.1)));
                            const rounded = parseFloat(next.toFixed(1));
                            checkTempThreshold(rounded);
                            return rounded;
                        });
                    }, 2000);

                    if (!accelAvail) {
                        accelInterval = setInterval(() => {
                            setCurrentG((prev) => {
                                const spike = Math.random() > 0.96 ? parseFloat((2.6 + Math.random() * 1.5).toFixed(2)) : parseFloat((0.95 + Math.random() * 0.1).toFixed(2));
                                checkAccelerometerThreshold(spike);
                                return spike;
                            });
                        }, 500);
                    }
                }
            } else {
                // Nominal baseline values when disabled
                setPressureVal(1013.2);
                setRotationVal(0.02);
                setLightVal(320);
                setTemperatureVal(35.5);
                setCurrentG(1.0);
            }
        };

        startSensorTelemetry();

        return () => {
            if (baroSub) baroSub.remove();
            if (gyroSub) gyroSub.remove();
            if (lightSub) lightSub.remove();
            if (accelSub) accelSub.remove();
            if (simInterval) clearInterval(simInterval);
            if (accelInterval) clearInterval(accelInterval);
        };
    }, [autoPotholeEnabled]);

    // ==========================================
    // TELEMETRY THRESHOLD LOGIC
    // ==========================================
    const checkBarometerThreshold = async (pressure: number) => {
        if (pressure < 990) {
            const now = Date.now();
            if (now - lastBarometerTriggerRef.current < 20000) return; // 20s cooldown
            lastBarometerTriggerRef.current = now;

            triggerOnboardAlert("Flood", "Critical", `Barometer breach: ${pressure}hPa. Potential storm front detected.`);
        }
    };

    const checkAccelerometerThreshold = async (gForce: number) => {
        if (gForce > 2.5) {
            const now = Date.now();
            if (now - lastTriggeredRef.current < 20000) return; // 20s cooldown
            lastTriggeredRef.current = now;

            triggerOnboardAlert("Pothole", "Critical", `Vibration Accelerometer shock spike of ${gForce.toFixed(2)}G registered.`);
        }
    };

    const checkGyroThreshold = async (rotation: number) => {
        if (rotation > 6.0) {
            const now = Date.now();
            if (now - lastGyroTriggerRef.current < 20000) return; // 20s cooldown
            lastGyroTriggerRef.current = now;

            triggerOnboardAlert("Accident", "Critical", `Gyroscope spin spike: ${rotation.toFixed(1)} rad/s. Rollover event.`);
        }
    };

    const checkLightThreshold = async (light: number, forceSpeed?: number) => {
        const speed = forceSpeed !== undefined ? forceSpeed : location?.coords?.speed;
        if (light < 5 && speed !== null && speed !== undefined && speed > 10) {
            const now = Date.now();
            if (now - lastLightTriggerRef.current < 20000) return; // 20s cooldown
            lastLightTriggerRef.current = now;

            triggerOnboardAlert("Accident", "Medium", `Ambient light drop to ${light} lux at speed. Blackout tunnel risk.`);
        }
    };

    const checkTempThreshold = async (temp: number) => {
        if (temp > 46.0) {
            const now = Date.now();
            if (now - lastTempTriggerRef.current < 20000) return; // 20s cooldown
            lastTempTriggerRef.current = now;

            triggerOnboardAlert("Accident", "Critical", `Critical temperature hazard detected: ${temp}°C. Fire alert logged.`);
        }
    };

    const triggerOnboardAlert = async (type: string, severity: string, comment: string) => {
        const lat = location?.coords?.latitude || 0.3476;
        const lon = location?.coords?.longitude || 32.5825;

        try {
            try {
                Speech.stop();
                Speech.speak(`Onboard alert. ${comment}`, { language: "en", rate: 0.95 });
                lastSpokenTimeRef.current = Date.now();
            } catch (speechErr) {
                console.log("Speech synthesis unsupported or failed:", speechErr);
            }

            await API.post("dangers/", {
                type,
                severity,
                latitude: lat,
                longitude: lon,
                source: "IoT",
                ai_status: "Verified",
                ai_score: 98,
                ai_comment: `Onboard Node Telemetry: ${comment}`
            });

            fetchDangers();
        } catch (err) {
            console.log("Failed to upload onboard alert:", err);
        }
    };

    // ==========================================
    // OFFLINE QUEUE MONITOR & BACKGROUND SYNC
    // ==========================================
    useEffect(() => {
        const checkConnectivityAndSync = async () => {
            try {
                // Quick connectivity ping request bypasses mocking
                const host = getAPIHost();
                const res = await fetch(`${host}/api/dangers`, { method: "GET" });
                if (res.ok) {
                    setIsOnline(true);
                    const synced = await syncOfflineQueue();
                    if (synced > 0) {
                        fetchDangers();
                    }
                } else {
                    setIsOnline(false);
                }
            } catch (e) {
                setIsOnline(false);
            }

            // Update offline queue counter badge
            try {
                const queueStr = await AsyncStorage.getItem("offline_danger_queue");
                const queue = queueStr ? JSON.parse(queueStr) : [];
                setOfflineQueueCount(queue.length);
            } catch {}
        };

        checkConnectivityAndSync();
        const interval = setInterval(checkConnectivityAndSync, 5000);

        return () => clearInterval(interval);
    }, []);

    // ==========================================
    // REAL-TIME WEBSOCKET SYNC
    // ==========================================
    useEffect(() => {
        const host = getAPIHost();
        const socket = io(host);

        socket.on("new_danger", (newDanger: Danger) => {
            setDangers((prev) => {
                if (prev.some((d) => d.id === newDanger.id)) return prev;
                return [newDanger, ...prev];
            });
        });

        socket.on("danger_deleted", (deletedId: number) => {
            setDangers((prev) => prev.filter((d) => d.id !== deletedId));
        });

        socket.on("danger_updated", (updatedDanger: any) => {
            setDangers((prev) =>
                prev.map((d) => (d.id === updatedDanger.id ? updatedDanger : d))
            );
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    // =========================
    // IMAGE PICK
    // =========================
    const pickImage = async () => {
        const result = await ImagePicker.launchCameraAsync({
            quality: 0.5,
        });

        if (!result.canceled) {
            const imageUri = result.assets[0].uri;
            setDangerImage(imageUri);
            setAiScore(null);
            setAiComment(null);
        }
    };

    // ==========================================
    // EMBEDDED CAMERA FUNCTIONS
    // ==========================================
    const handleUseEmbeddedCamera = async () => {
        if (!cameraPermission || !cameraPermission.granted) {
            const res = await requestCameraPermission();
            if (!res.granted) {
                alert("Camera permission is required to use the embedded camera!");
                return;
            }
        }
        setShowEmbeddedCamera(true);
    };

    const takeEmbeddedPhoto = async () => {
        if (cameraRef.current) {
            try {
                const options = { quality: 0.5 };
                const photo = await cameraRef.current.takePictureAsync(options);
                if (photo && photo.uri) {
                    setDangerImage(photo.uri);
                    setShowEmbeddedCamera(false);
                    setAiScore(null);
                    setAiComment(null);
                }
            } catch (err: any) {
                alert("Failed to capture photo: " + err.message);
            }
        }
    };

    // =========================
    // SUBMIT REPORT
    // =========================
    const submitReport = async () => {
        setIsAnalyzing(true);
        const formData = new FormData();
        formData.append("type", dangerType);
        formData.append("severity", dangerSeverity);
        const lat = location ? location.coords.latitude : 0.3476;
        const lng = location ? location.coords.longitude : 32.5825;
        formData.append("latitude", String(lat));
        formData.append("longitude", String(lng));
        formData.append("source", "User");

        if (dangerImage) {
            if (typeof window !== "undefined" && (dangerImage.startsWith("blob:") || dangerImage.startsWith("data:"))) {
                try {
                    const response = await fetch(dangerImage);
                    const blob = await response.blob();
                    formData.append("image", blob, "danger.jpg");
                } catch (e) {
                    console.error("Failed to convert image to blob", e);
                    formData.append("image", {
                        uri: dangerImage,
                        name: "danger.jpg",
                        type: "image/jpeg",
                    } as any);
                }
            } else {
                formData.append("image", {
                    uri: dangerImage,
                    name: "danger.jpg",
                    type: "image/jpeg",
                } as any);
            }
        }

        try {
            await API.post("dangers/", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });

            alert("Danger reported successfully!");
            fetchDangers();
            setReportModalVisible(false);
            setDangerImage(null);
            setAiScore(null);
            setAiComment(null);
        } catch (err) {
            console.log(err);
            alert("Report failed: Telemetry metrics did not pass validation.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    // =========================
    // UI
    // =========================
    return (
        <View style={{ flex: 1 }}>

            {/* STATUS BAR SYNC BAR */}
            <View style={[styles.statusBar, isOnline ? styles.statusBarOnline : styles.statusBarOffline]}>
                <Text style={styles.statusBarText}>
                    {isOnline 
                        ? "🟢 Live Production Sync Mode Active" 
                        : `⚠️ Connection Offline: ${offlineQueueCount} reports queued`}
                </Text>
            </View>

            <ScrollView
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >

                <CustomMap
                    style={styles.map}
                    region={mapRegion}
                    showsUserLocation
                    dangers={dangers}
                />

                {/* SMARTPHONE IOT TELEMETRY MONITOR PANEL */}
                <View style={styles.autoPotholePanel}>
                    <TouchableOpacity 
                        testID="iot-monitor-toggle"
                        onPress={() => setOnboardMonitorExpanded(!onboardMonitorExpanded)}
                        style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
                    >
                        <View style={{ flex: 1, paddingRight: 10 }}>
                            <Text style={styles.panelTitle}>📱 Smartphone IoT Node Monitor</Text>
                            <Text style={{ color: "#94a3b8", fontSize: 11, marginTop: 2 }}>
                                {onboardMonitorExpanded ? "Tap to collapse monitor" : "Tap to expand onboard sensors"}
                            </Text>
                        </View>
                        <Switch
                            value={autoPotholeEnabled}
                            onValueChange={(val) => {
                                setAutoPotholeEnabled(val);
                                try {
                                    Speech.stop();
                                    Speech.speak(`Onboard sensors automatic tracking turned ${val ? "on" : "off"}.`, { language: "en" });
                                } catch {}
                            }}
                            trackColor={{ false: "#767577", true: "#10b981" }}
                        />
                    </TouchableOpacity>

                    {onboardMonitorExpanded && (
                        <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.15)", paddingTop: 10 }}>
                            {/* Accelerometer */}
                            <View style={styles.telemetryRow}>
                                <Text style={styles.telemetryLabel}>🚗 Accelerometer:</Text>
                                <Text style={[styles.telemetryValue, currentG > 1.8 ? styles.alertValue : styles.nominalValue]}>
                                    {currentG} G {currentG > 1.8 ? "(⚠️ Shock)" : "(Nominal)"}
                                </Text>
                            </View>

                            {/* Barometer */}
                            <View style={styles.telemetryRow}>
                                <Text style={styles.telemetryLabel}>💨 Barometer:</Text>
                                <Text style={[styles.telemetryValue, pressureVal < 990 ? styles.alertValue : styles.nominalValue]}>
                                    {pressureVal} hPa {pressureVal < 990 ? "(⚠️ Low)" : "(Nominal)"}
                                </Text>
                            </View>

                            {/* Gyroscope */}
                            <View style={styles.telemetryRow}>
                                <Text style={styles.telemetryLabel}>🔄 Gyroscope:</Text>
                                <Text style={[styles.telemetryValue, rotationVal > 6.0 ? styles.alertValue : styles.nominalValue]}>
                                    {rotationVal} rad/s {rotationVal > 6.0 ? "(⚠️ High)" : "(Nominal)"}
                                </Text>
                            </View>

                            {/* Light Sensor */}
                            <View style={styles.telemetryRow}>
                                <Text style={styles.telemetryLabel}>☀️ Light Sensor:</Text>
                                <Text style={[styles.telemetryValue, lightVal < 5 ? styles.alertValue : styles.nominalValue]}>
                                    {lightVal} lux {lightVal < 5 ? "(⚠️ Dark)" : "(Nominal)"}
                                </Text>
                            </View>

                            {/* Thermometer */}
                            <View style={styles.telemetryRow}>
                                <Text style={styles.telemetryLabel}>🌡️ Thermometer:</Text>
                                <Text style={[styles.telemetryValue, temperatureVal > 46.0 ? styles.alertValue : styles.nominalValue]}>
                                    {temperatureVal} °C {temperatureVal > 46.0 ? "(⚠️ Heatwave)" : "(Nominal)"}
                                </Text>
                            </View>

                            {/* Dev diagnostics toggle */}
                            <TouchableOpacity
                                onPress={() => setDevMenuVisible(!devMenuVisible)}
                                style={{
                                    marginTop: 14,
                                    paddingVertical: 8,
                                    borderTopWidth: 1,
                                    borderTopColor: "rgba(255,255,255,0.15)",
                                    flexDirection: "row",
                                    justifyContent: "space-between",
                                    alignItems: "center"
                                }}
                            >
                                <Text style={{ color: "#94a3b8", fontSize: 11, fontWeight: "bold" }}>
                                    {devMenuVisible ? "▼ Hide Diagnostics Console" : "▶ Open Diagnostics Suite"}
                                </Text>
                            </TouchableOpacity>

                            {devMenuVisible && (
                                <View style={{ marginTop: 8 }}>
                                    <Text style={{ color: "#cbd5e1", fontSize: 11, fontWeight: "600", marginBottom: 6 }}>
                                        Test Threshold Spikes (Web Simulation):
                                    </Text>
                                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                                        <TouchableOpacity 
                                            testID="spike-temp-button"
                                            style={styles.spikeBtn} 
                                            onPress={() => {
                                                setTemperatureVal(48.5);
                                                checkTempThreshold(48.5);
                                                setTimeout(() => setTemperatureVal(35.2), 4000);
                                            }}
                                        >
                                            <Text style={styles.spikeBtnText}>Spike Temp (48.5°C)</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity 
                                            style={styles.spikeBtn} 
                                            onPress={() => {
                                                setRotationVal(7.8);
                                                checkGyroThreshold(7.8);
                                                setTimeout(() => setRotationVal(0.04), 4000);
                                            }}
                                        >
                                            <Text style={styles.spikeBtnText}>Spike Gyro (7.8 rad/s)</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity 
                                            style={styles.spikeBtn} 
                                            onPress={() => {
                                                setPressureVal(985.4);
                                                checkBarometerThreshold(985.4);
                                                setTimeout(() => setPressureVal(1013.1), 4000);
                                            }}
                                        >
                                            <Text style={styles.spikeBtnText}>Spike Baro (985.4 hPa)</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity 
                                            style={styles.spikeBtn} 
                                            onPress={() => {
                                                setLightVal(2);
                                                checkLightThreshold(2, 12.5); // Simulate driving speed safely without mutating state
                                                setTimeout(() => setLightVal(350), 4000);
                                            }}
                                        >
                                            <Text style={styles.spikeBtnText}>Spike Light (2 lux)</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}
                        </View>
                    )}
                    {autoPotholeEnabled && !onboardMonitorExpanded && (
                        <Text style={styles.panelGValue}>
                            Live Accelerometer: {currentG} G {currentG > 1.8 ? "⚠️ Impact!" : "✅ Nominal"}
                        </Text>
                    )}
                </View>

                {/* REPORT BUTTON */}
                <TouchableOpacity
                    testID="report-danger-button"
                    style={styles.reportBtn}
                    onPress={() => setReportModalVisible(true)}
                >
                    <Text style={{ color: "white", fontSize: 30 }}>+</Text>
                </TouchableOpacity>

                {/* REPORT MODAL */}
                <Modal visible={reportModalVisible} transparent>
                    <View style={styles.modal}>
                        <View style={styles.modalBox}>

                            <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 15, textAlign: "center" }}>
                                Report Danger
                            </Text>

                            <Text style={{ fontSize: 12, color: "#64748b", marginBottom: 2 }}>Danger Type:</Text>
                            <View style={{ borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 8, marginBottom: 12, overflow: "hidden" }}>
                                <Picker
                                    selectedValue={dangerType}
                                    onValueChange={setDangerType}
                                    enabled={!isAnalyzing && !aiScore}
                                >
                                    <Picker.Item label="Pothole" value="Pothole" />
                                    <Picker.Item label="Flood" value="Flood" />
                                    <Picker.Item label="Accident" value="Accident" />
                                </Picker>
                            </View>

                            <Text style={{ fontSize: 12, color: "#64748b", marginBottom: 2 }}>Severity:</Text>
                            <View style={{ borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 8, marginBottom: 15, overflow: "hidden" }}>
                                <Picker
                                    selectedValue={dangerSeverity}
                                    onValueChange={setDangerSeverity}
                                    enabled={!isAnalyzing && !aiScore}
                                >
                                    <Picker.Item label="Low" value="Low" />
                                    <Picker.Item label="Medium" value="Medium" />
                                    <Picker.Item label="Critical" value="Critical" />
                                </Picker>
                            </View>

                            <TouchableOpacity 
                                style={{ backgroundColor: "#8b5cf6", padding: 12, borderRadius: 8, alignItems: "center", marginBottom: 12 }} 
                                onPress={handleUseEmbeddedCamera}
                                disabled={isAnalyzing}
                            >
                                <Text style={{ color: "white", fontWeight: "bold" }}>🎥 Use Embedded Camera</Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={{ backgroundColor: "#2563eb", padding: 12, borderRadius: 8, alignItems: "center", marginBottom: 12 }} 
                                onPress={pickImage}
                                disabled={isAnalyzing}
                            >
                                <Text style={{ color: "white", fontWeight: "bold" }}>📸 Use System Camera App</Text>
                            </TouchableOpacity>

                            {isAnalyzing && (
                                <View style={{ marginVertical: 15, alignItems: "center" }}>
                                    <ActivityIndicator size="small" color="#2563eb" />
                                    <Text style={{ fontSize: 13, color: "#475569", marginTop: 8 }}>
                                        🤖 Analyzing image with Computer Vision...
                                    </Text>
                                </View>
                            )}

                            {aiScore !== null && (
                                <View style={{ marginVertical: 10, padding: 10, borderRadius: 8, backgroundColor: "rgba(16, 185, 129, 0.1)", borderWidth: 1, borderColor: "rgba(16, 185, 129, 0.3)" }}>
                                    <Text style={{ fontSize: 12, fontWeight: "bold", color: "#10b981" }}>
                                        🤖 Camera AI Detection Confirmed:
                                    </Text>
                                    <Text style={{ fontSize: 14, fontWeight: "bold", color: "#0f172a", marginTop: 4 }}>
                                        {dangerType} ({aiScore}% Confidence)
                                    </Text>
                                    <Text style={{ fontSize: 12, color: "#64748b", marginTop: 2, fontStyle: "italic" }}>
                                        {aiComment}
                                    </Text>
                                </View>
                            )}

                            {dangerImage && (
                                <View style={{ alignItems: "center", marginBottom: 15 }}>
                                    <Image
                                        source={{ uri: dangerImage }}
                                        style={{ width: 120, height: 120, borderRadius: 8, borderWidth: 1, borderColor: "#e2e8f0" }}
                                    />
                                </View>
                            )}

                            <View style={{ gap: 8, marginTop: 10 }}>
                                <TouchableOpacity 
                                    style={{ backgroundColor: "#10b981", padding: 12, borderRadius: 8, alignItems: "center" }}
                                    onPress={submitReport}
                                    disabled={isAnalyzing}
                                >
                                    <Text style={{ color: "white", fontWeight: "bold" }}>Submit Alert</Text>
                                </TouchableOpacity>

                                <TouchableOpacity 
                                    style={{ backgroundColor: "#ef4444", padding: 12, borderRadius: 8, alignItems: "center" }}
                                    onPress={() => {
                                        setReportModalVisible(false);
                                        setDangerImage(null);
                                        setAiScore(null);
                                        setAiComment(null);
                                    }}
                                >
                                    <Text style={{ color: "white", fontWeight: "bold" }}>Cancel</Text>
                                </TouchableOpacity>
                            </View>

                        </View>
                    </View>
                </Modal>

                {/* EMBEDDED CAMERA VIEW MODAL */}
                <Modal visible={showEmbeddedCamera} animationType="slide" transparent={false}>
                    <View style={{ flex: 1, backgroundColor: "black" }}>
                        <CameraView
                            ref={cameraRef}
                            style={{ flex: 1 }}
                            facing="back"
                        >
                            <View style={{ flex: 1, justifyContent: "flex-end", paddingBottom: 40, alignItems: "center" }}>
                                <View style={{ flexDirection: "row", gap: 30 }}>
                                    <TouchableOpacity
                                        style={{
                                            backgroundColor: "rgba(0,0,0,0.6)",
                                            paddingHorizontal: 20,
                                            paddingVertical: 12,
                                            borderRadius: 20,
                                            borderWidth: 1,
                                            borderColor: "white"
                                        }}
                                        onPress={() => setShowEmbeddedCamera(false)}
                                        disabled={isAnalyzing}
                                    >
                                        <Text style={{ color: "white", fontWeight: "bold" }}>Cancel</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={{
                                            backgroundColor: "#e11d48",
                                            width: 70,
                                            height: 70,
                                            borderRadius: 35,
                                            justifyContent: "center",
                                            alignItems: "center",
                                            borderWidth: 3,
                                            borderColor: "white"
                                        }}
                                        onPress={takeEmbeddedPhoto}
                                        disabled={isAnalyzing}
                                    >
                                        {isAnalyzing ? (
                                            <ActivityIndicator size="small" color="white" />
                                        ) : (
                                            <Text style={{ color: "white", fontSize: 24 }}>📸</Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </CameraView>
                    </View>
                </Modal>

            </ScrollView>

            {/* FULL-SCREEN PULSING WARNING OVERLAY */}
            {warningOverlayVisible && (
                <View style={styles.warningOverlay}>
                    <View style={styles.warningOverlayBox}>
                        <Text style={styles.warningOverlayTitle}>🚨 HAZARD WARNING 🚨</Text>
                        <Text style={styles.warningOverlayText}>{warningOverlayType} ahead!</Text>
                        <Text style={styles.warningOverlayDist}>Approximately {warningOverlayDist}m away</Text>
                        <Text style={styles.warningOverlaySub}>Slow down and exercise caution.</Text>
                    </View>
                </View>
            )}
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

    autoPotholePanel: {
        position: "absolute",
        top: 50,
        left: 20,
        right: 20,
        backgroundColor: "rgba(15, 23, 42, 0.85)",
        padding: 15,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.15)",
        zIndex: 10,
    },

    panelTitle: {
        color: "white",
        fontSize: 15,
        fontWeight: "bold",
    },

    panelGValue: {
        color: "#10b981",
        fontSize: 13,
        marginTop: 6,
        fontWeight: "600",
    },

    telemetryRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginVertical: 4,
    },
    telemetryLabel: {
        color: "#cbd5e1",
        fontSize: 13,
    },
    telemetryValue: {
        fontSize: 13,
        fontWeight: "bold",
    },
    nominalValue: {
        color: "#10b981",
    },
    alertValue: {
        color: "#f87171",
    },
    spikeBtn: {
        backgroundColor: "rgba(255, 255, 255, 0.1)",
        paddingVertical: 6,
        paddingHorizontal: 8,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.15)",
        marginTop: 4,
    },
    spikeBtnText: {
        color: "white",
        fontSize: 10,
        fontWeight: "600",
    },

    statusBar: {
        width: "100%",
        paddingVertical: 10,
        alignItems: "center",
        justifyContent: "center",
        zIndex: 20,
    },
    statusBarOnline: {
        backgroundColor: "#10b981",
    },
    statusBarOffline: {
        backgroundColor: "#f59e0b",
    },
    statusBarText: {
        color: "white",
        fontSize: 12,
        fontWeight: "bold",
    },
    warningOverlay: {
        position: "absolute",
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "rgba(239, 68, 68, 0.4)",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 99,
    },
    warningOverlayBox: {
        backgroundColor: "rgba(15, 23, 42, 0.95)",
        padding: 25,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: "#ef4444",
        alignItems: "center",
        width: 280,
    },
    warningOverlayTitle: {
        color: "#ef4444",
        fontSize: 20,
        fontWeight: "bold",
        marginBottom: 8,
    },
    warningOverlayText: {
        color: "white",
        fontSize: 18,
        fontWeight: "bold",
        textAlign: "center",
        marginBottom: 6,
    },
    warningOverlayDist: {
        color: "#f59e0b",
        fontSize: 15,
        fontWeight: "600",
        marginBottom: 10,
    },
    warningOverlaySub: {
        color: "#94a3b8",
        fontSize: 12,
        fontStyle: "italic",
    },
});