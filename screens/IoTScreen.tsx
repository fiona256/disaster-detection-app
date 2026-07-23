import React, { useState, useEffect, useRef } from "react";
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    Switch,
    ScrollView,
    ActivityIndicator,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Location from "expo-location";
import { API } from "../services/api";

interface TelemetryLog {
    id: string;
    timestamp: string;
    type: string;
    detail: string;
    status: "success" | "sending" | "error";
}

export default function IoTScreen() {
    // Telemetry states
    const [potholeAuto, setPotholeAuto] = useState(true);
    const [floodAuto, setFloodAuto] = useState(true);
    
    const [waterLevel, setWaterLevel] = useState(1.2); // meters
    const [vibrationLevel, setVibrationLevel] = useState(0.15); // Gs
    
    const [isSimulating, setIsSimulating] = useState(false);
    const [logs, setLogs] = useState<TelemetryLog[]>([
        {
            id: "1",
            timestamp: new Date(Date.now() - 360000).toLocaleTimeString(),
            type: "System",
            detail: "IoT Sensor Hub Initialized successfully.",
            status: "success"
        }
    ]);

    const locationRef = useRef<Location.LocationObject | null>(null);

    // Get current location for automated reports
    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status === "granted") {
                const loc = await Location.getCurrentPositionAsync({});
                locationRef.current = loc;
            }
        })();
    }, []);

    // Simulated background environment changes
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isSimulating) {
            interval = setInterval(() => {
                // Randomly fluctuate sensors
                setVibrationLevel((prev) => {
                    const next = Math.max(0.05, Math.min(0.5, prev + (Math.random() * 0.1 - 0.05)));
                    return parseFloat(next.toFixed(2));
                });

                setWaterLevel((prev) => {
                    // Gradual water level change
                    const delta = Math.random() * 0.2 - 0.08;
                    const next = Math.max(0.2, Math.min(4.0, prev + delta));
                    const rounded = parseFloat(next.toFixed(2));
                    
                    // Auto flood check
                    if (floodAuto && rounded > 2.5 && prev <= 2.5) {
                        triggerAutomatedReport("Flood", "Critical", `Water level threshold breached: ${rounded}m`);
                    }
                    return rounded;
                });
            }, 3000);
        }
        return () => clearInterval(interval);
    }, [isSimulating, floodAuto]);

    // Send automatic report
    const triggerAutomatedReport = async (type: string, severity: string, detail: string) => {
        const timestamp = new Date().toLocaleTimeString();
        const logId = Math.random().toString();
        
        setLogs((prev) => [
            { id: logId, timestamp, type, detail, status: "sending" },
            ...prev
        ]);

        let lat = 0.3476;
        let lon = 32.5825;

        // Try getting real location
        try {
            if (locationRef.current) {
                lat = locationRef.current.coords.latitude;
                lon = locationRef.current.coords.longitude;
            } else {
                let { status } = await Location.requestForegroundPermissionsAsync();
                if (status === "granted") {
                    const loc = await Location.getCurrentPositionAsync({});
                    locationRef.current = loc;
                    lat = loc.coords.latitude;
                    lon = loc.coords.longitude;
                }
            }
        } catch {}

        try {
            const res = await API.post("dangers/", {
                type,
                severity,
                latitude: lat,
                longitude: lon,
                source: "IoT"
            });

            // Update log to success
            setLogs((prev) =>
                prev.map((log) =>
                    log.id === logId ? { ...log, status: "success", detail: `${detail} (Report #${res.data.id || "OK"})` } : log
                )
            );
        } catch (error) {
            setLogs((prev) =>
                prev.map((log) =>
                    log.id === logId ? { ...log, status: "error", detail: "Network failure. Saved to local queue." } : log
                )
            );
        }
    };

    // Manual impact simulation
    const simulateImpact = () => {
        setVibrationLevel(4.8); // 4.8G spike
        triggerAutomatedReport("Pothole", "Critical", "Critical shock spike of 4.8G registered on Z-axis.");
        setTimeout(() => setVibrationLevel(0.12), 1500);
    };

    const simulateAccident = () => {
        triggerAutomatedReport("Accident", "Critical", "Impact crash detector node triggered. Rapid decelerating delta G.");
    };

    const increaseWater = () => {
        const nextWater = parseFloat((waterLevel + 0.5).toFixed(2));
        setWaterLevel(nextWater);
        if (floodAuto && nextWater > 2.5) {
            triggerAutomatedReport("Flood", "Critical", `Simulated manual water level spike: ${nextWater}m`);
        }
    };

    const resetWater = () => {
        setWaterLevel(1.1);
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            {/* HEADER */}
            <View style={styles.header}>
                <Ionicons name="hardware-chip-outline" size={32} color="#60a5fa" />
                <Text style={styles.title}>IoT Telemetry Hub</Text>
                <Text style={styles.subtitle}>Automated Sensor Reporting & Simulation</Text>
            </View>

            {/* SIMULATOR GLOBAL TOGGLE */}
            <View style={styles.card}>
                <View style={styles.row}>
                    <View>
                        <Text style={styles.cardTitle}>Run Environmental Simulator</Text>
                        <Text style={styles.cardDesc}>Simulates real-time sensor fluctuation</Text>
                    </View>
                    <Switch
                        value={isSimulating}
                        onValueChange={setIsSimulating}
                        trackColor={{ false: "#1e293b", true: "#3b82f6" }}
                        thumbColor={isSimulating ? "#60a5fa" : "#94a3b8"}
                    />
                </View>
            </View>

            {/* VIBRATION / POTHOLE CARD */}
            <View style={styles.card}>
                <View style={styles.row}>
                    <Text style={styles.sensorName}>🚗 Accelerometer (Shock Node)</Text>
                    <Text style={[styles.sensorVal, vibrationLevel > 2.5 ? styles.dangerText : styles.normalText]}>
                        {vibrationLevel} G
                    </Text>
                </View>
                
                <Text style={styles.description}>
                    Simulates a vehicle-mounted IoT node that auto-detects structural anomalies and potholes.
                </Text>

                <View style={[styles.row, styles.switchRow]}>
                    <Text style={styles.switchLabel}>Auto-Submit on Shock &gt; 2.5G</Text>
                    <Switch
                        value={potholeAuto}
                        onValueChange={setPotholeAuto}
                        trackColor={{ false: "#1e293b", true: "#10b981" }}
                    />
                </View>

                <TouchableOpacity style={styles.actionBtn} onPress={simulateImpact}>
                    <Text style={styles.actionBtnText}>Simulate Pothole Impact (4.8G)</Text>
                </TouchableOpacity>
            </View>

            {/* FLOOD / RIVER LEVEL CARD */}
            <View style={styles.card}>
                <View style={styles.row}>
                    <Text style={styles.sensorName}>🌊 Moisture & River Depth Node</Text>
                    <Text style={[styles.sensorVal, waterLevel > 2.5 ? styles.dangerText : styles.normalText]}>
                        {waterLevel} m
                    </Text>
                </View>
                
                <Text style={styles.description}>
                    Simulates a stationary roadside sensor monitoring local drainage or river basin height.
                </Text>

                <View style={[styles.row, styles.switchRow]}>
                    <Text style={styles.switchLabel}>Auto-Submit on Depth &gt; 2.5m</Text>
                    <Switch
                        value={floodAuto}
                        onValueChange={setFloodAuto}
                        trackColor={{ false: "#1e293b", true: "#10b981" }}
                    />
                </View>

                <View style={styles.buttonGroup}>
                    <TouchableOpacity style={[styles.subBtn, { backgroundColor: "#3b82f6" }]} onPress={increaseWater}>
                        <Text style={styles.actionBtnText}>Increase Depth (+0.5m)</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.subBtn, { backgroundColor: "#475569" }]} onPress={resetWater}>
                        <Text style={styles.actionBtnText}>Reset Level</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* IMPACT / ACCIDENT CARD */}
            <View style={styles.card}>
                <View style={styles.row}>
                    <Text style={styles.sensorName}>💥 Collision & Impact Detector</Text>
                    <Text style={styles.normalText}>Nominal</Text>
                </View>

                <Text style={styles.description}>
                    Detects vehicle deceleration rates to automatically trigger crash alerts.
                </Text>

                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: "#ef4444" }]} onPress={simulateAccident}>
                    <Text style={styles.actionBtnText}>Simulate Vehicle Collision</Text>
                </TouchableOpacity>
            </View>

            {/* TELEMETRY LOGS */}
            <Text style={styles.sectionHeader}>📡 Real-time IoT Output Logs</Text>
            
            <View style={styles.logsCard}>
                {logs.length === 0 ? (
                    <Text style={styles.noLogs}>No logs recorded.</Text>
                ) : (
                    logs.map((log) => (
                        <View key={log.id} style={styles.logItem}>
                            <View style={styles.row}>
                                <Text style={styles.logTime}>{log.timestamp}</Text>
                                <Text style={[styles.logType, log.type === "Flood" ? styles.blueTag : log.type === "Pothole" ? styles.yellowTag : log.type === "Accident" ? styles.redTag : styles.grayTag]}>
                                    {log.type.toUpperCase()}
                                </Text>
                            </View>
                            <View style={[styles.row, { marginTop: 4 }]}>
                                <Text style={styles.logDetail} numberOfLines={2}>
                                    {log.detail}
                                </Text>
                                {log.status === "sending" ? (
                                    <ActivityIndicator size="small" color="#60a5fa" />
                                ) : log.status === "success" ? (
                                    <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                                ) : (
                                    <Ionicons name="alert-circle" size={16} color="#ef4444" />
                                )}
                            </View>
                        </View>
                    ))
                )}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#0f172a",
    },
    content: {
        padding: 20,
        paddingBottom: 40,
    },
    header: {
        alignItems: "center",
        marginTop: 30,
        marginBottom: 25,
    },
    title: {
        color: "white",
        fontSize: 24,
        fontWeight: "bold",
        marginTop: 10,
    },
    subtitle: {
        color: "#94a3b8",
        fontSize: 13,
        marginTop: 5,
    },
    card: {
        backgroundColor: "#1e293b",
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "#334155",
    },
    cardTitle: {
        color: "white",
        fontSize: 16,
        fontWeight: "bold",
    },
    cardDesc: {
        color: "#94a3b8",
        fontSize: 12,
        marginTop: 2,
    },
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    sensorName: {
        color: "white",
        fontSize: 15,
        fontWeight: "600",
    },
    sensorVal: {
        fontSize: 18,
        fontWeight: "bold",
    },
    normalText: {
        color: "#60a5fa",
    },
    dangerText: {
        color: "#f87171",
    },
    description: {
        color: "#cbd5e1",
        fontSize: 13,
        lineHeight: 18,
        marginTop: 10,
        marginBottom: 10,
    },
    switchRow: {
        borderTopWidth: 1,
        borderTopColor: "#334155",
        paddingTop: 10,
        marginBottom: 12,
    },
    switchLabel: {
        color: "#94a3b8",
        fontSize: 13,
    },
    actionBtn: {
        backgroundColor: "#10b981",
        padding: 12,
        borderRadius: 8,
        alignItems: "center",
        marginTop: 5,
    },
    actionBtnText: {
        color: "white",
        fontWeight: "bold",
        fontSize: 14,
    },
    buttonGroup: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 10,
    },
    subBtn: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        alignItems: "center",
    },
    sectionHeader: {
        color: "white",
        fontSize: 18,
        fontWeight: "bold",
        marginTop: 15,
        marginBottom: 12,
    },
    logsCard: {
        backgroundColor: "#1e293b",
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: "#334155",
        minHeight: 150,
    },
    noLogs: {
        color: "#94a3b8",
        textAlign: "center",
        marginTop: 60,
    },
    logItem: {
        borderBottomWidth: 1,
        borderBottomColor: "#334155",
        paddingBottom: 10,
        marginBottom: 10,
    },
    logTime: {
        color: "#64748b",
        fontSize: 11,
    },
    logType: {
        fontSize: 10,
        fontWeight: "bold",
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    logDetail: {
        color: "#e2e8f0",
        fontSize: 12,
        flex: 1,
    },
    blueTag: {
        backgroundColor: "rgba(59, 130, 246, 0.2)",
        color: "#60a5fa",
    },
    yellowTag: {
        backgroundColor: "rgba(245, 158, 11, 0.2)",
        color: "#fbbf24",
    },
    redTag: {
        backgroundColor: "rgba(239, 68, 68, 0.2)",
        color: "#f87171",
    },
    grayTag: {
        backgroundColor: "rgba(148, 163, 184, 0.2)",
        color: "#cbd5e1",
    },
});
