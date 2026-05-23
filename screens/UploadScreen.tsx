import { useEffect, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    RefreshControl,
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

export default function UploadScreen() {

    const [reports, setReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [username, setUsername] = useState("");

    const API_URL = "http://192.168.150.204:8000/api/dangers/";

    useEffect(() => {
        init();
    }, []);

    const init = async () => {
        const user = await AsyncStorage.getItem("username");
        if (user) setUsername(user);

        fetchMyReports(user);
    };

    const fetchMyReports = async (user: any) => {

        try {
            setLoading(true);

            const res = await axios.get(API_URL);

            // 🔥 FILTER ONLY THIS USER
            const myData = res.data.filter(
                (item: any) => item.created_by === user
            );

            setReports(myData);

        } catch (error) {
            console.log(error);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchMyReports(username);
        setRefreshing(false);
    };

    const getColor = (status: string) => {
        if (status === "Verified") return "#22c55e";
        if (status === "Suspicious") return "#f59e0b";
        if (status === "Fake") return "#ef4444";
        return "#64748b";
    };

    return (

        <View style={styles.container}>

            {/* HEADER */}
            <Text style={styles.title}>
                My Uploads
            </Text>

            <Text style={styles.subtitle}>
                All danger reports submitted by you
            </Text>

            {/* LOADING */}
            {loading ? (
                <ActivityIndicator
                    size="large"
                    color="#2563eb"
                />
            ) : (

                <FlatList
                    data={reports}
                    keyExtractor={(item) => item.id.toString()}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                        />
                    }
                    renderItem={({ item }) => (

                        <View style={styles.card}>

                            <Text style={styles.type}>
                                {item.type}
                            </Text>

                            <Text style={styles.severity}>
                                Severity: {item.severity}
                            </Text>

                            <Text
                                style={[
                                    styles.ai,
                                    { color: getColor(item.ai_status) }
                                ]}
                            >
                                AI Status: {item.ai_status}
                            </Text>

                            <Text style={styles.location}>
                                📍 {item.latitude}, {item.longitude}
                            </Text>

                        </View>

                    )}
                />

            )}

        </View>
    );
}

const styles = StyleSheet.create({

    container: {
        flex: 1,
        backgroundColor: "#f1f5f9",
        padding: 20,
    },

    title: {
        fontSize: 24,
        fontWeight: "bold",
        marginTop: 30,
    },

    subtitle: {
        color: "gray",
        marginBottom: 20,
    },

    card: {
        backgroundColor: "white",
        padding: 15,
        borderRadius: 15,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },

    type: {
        fontSize: 16,
        fontWeight: "bold",
    },

    severity: {
        marginTop: 5,
        color: "#ef4444",
    },

    ai: {
        marginTop: 5,
        fontWeight: "600",
    },

    location: {
        marginTop: 5,
        color: "gray",
    },
});