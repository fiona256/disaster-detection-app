import { useEffect, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    TouchableOpacity,
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { API } from "../services/api";

export default function ProfileScreen({ navigation }: any) {

    const [username, setUsername] = useState("");
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadUser();
    }, []);

    const loadUser = async () => {

        const user = await AsyncStorage.getItem("username");

        if (user) {
            setUsername(user);
        }

        fetchReports(user);
    };

    const fetchReports = async (user: any) => {

        try {

            const res = await API.get("dangers/");

            // FILTER USER REPORTS
            const userReports = res.data.filter(
                (item: any) => item.created_by === user
            );

            setReports(userReports);

        } catch (error) {
            console.log(error);
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {

        await AsyncStorage.removeItem("token");
        await AsyncStorage.removeItem("username");

        navigation.replace("Login");
    };

    return (

        <View style={styles.container}>

            {/* PROFILE CARD */}
            <View style={styles.card}>

                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                        {username.charAt(0).toUpperCase()}
                    </Text>
                </View>

                <Text style={styles.name}>
                    {username}
                </Text>

                <Text style={styles.subtitle}>
                    Disaster Alert User
                </Text>

            </View>

            {/* STATS */}
            <View style={styles.statsCard}>

                <Text style={styles.statsTitle}>
                    Your Reports
                </Text>

                <Text style={styles.statsNumber}>
                    {reports.length}
                </Text>

            </View>

            {/* REPORTS */}
            <Text style={styles.sectionTitle}>
                Recent Uploads
            </Text>

            {loading ? (
                <ActivityIndicator
                    size="large"
                    color="#2563eb"
                />
            ) : (

                <FlatList
                    data={reports}
                    keyExtractor={(item: any) => item.id.toString()}
                    renderItem={({ item }: any) => (

                        <View style={styles.reportCard}>

                            <Text style={styles.reportType}>
                                {item.type}
                            </Text>

                            <Text style={styles.reportSeverity}>
                                Severity: {item.severity}
                            </Text>

                            <Text style={styles.reportAI}>
                                AI: {item.ai_status}
                            </Text>

                        </View>
                    )}
                />

            )}

            {/* LOGOUT */}
            <TouchableOpacity
                style={styles.logoutBtn}
                onPress={logout}
            >
                <Text style={styles.logoutText}>
                    Logout
                </Text>
            </TouchableOpacity>

        </View>
    );
}

const styles = StyleSheet.create({

    container: {
        flex: 1,
        backgroundColor: "#f1f5f9",
        padding: 20,
    },

    card: {
        backgroundColor: "#2563eb",
        borderRadius: 20,
        padding: 25,
        alignItems: "center",
        marginTop: 20,
    },

    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: "white",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 15,
    },

    avatarText: {
        fontSize: 30,
        fontWeight: "bold",
        color: "#2563eb",
    },

    name: {
        fontSize: 22,
        color: "white",
        fontWeight: "bold",
    },

    subtitle: {
        color: "#dbeafe",
        marginTop: 5,
    },

    statsCard: {
        backgroundColor: "white",
        marginTop: 20,
        padding: 20,
        borderRadius: 20,
        alignItems: "center",
    },

    statsTitle: {
        color: "gray",
    },

    statsNumber: {
        fontSize: 40,
        fontWeight: "bold",
        color: "#2563eb",
    },

    sectionTitle: {
        fontSize: 18,
        fontWeight: "bold",
        marginTop: 25,
        marginBottom: 10,
    },

    reportCard: {
        backgroundColor: "white",
        padding: 15,
        borderRadius: 15,
        marginBottom: 12,
    },

    reportType: {
        fontWeight: "bold",
        fontSize: 16,
    },

    reportSeverity: {
        color: "#ef4444",
        marginTop: 5,
    },

    reportAI: {
        marginTop: 5,
        color: "#2563eb",
    },

    logoutBtn: {
        backgroundColor: "#ef4444",
        padding: 15,
        borderRadius: 15,
        alignItems: "center",
        marginTop: 20,
    },

    logoutText: {
        color: "white",
        fontWeight: "bold",
    },
});