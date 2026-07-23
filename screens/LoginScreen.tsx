import { useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from "react-native";

import { API } from "../services/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function LoginScreen({ navigation }: any) {

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {

        if (!username.trim() || !password.trim()) {
            Alert.alert("Error", "All fields are required");
            return;
        }

        try {
            setLoading(true);

            const res = await API.post("login/", {
                username,
                password,
            });

            await AsyncStorage.setItem("token", res.data.access);

            navigation.replace("Main");

        } catch (err) {
            Alert.alert("Login Failed", "Invalid credentials");
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
            <ScrollView
                contentContainerStyle={styles.container}
                showsVerticalScrollIndicator={false}
            >

                {/* TOP SECTION */}
                <View style={styles.topSection}>

                    <Image
                        source={require("../assets/logo.png")}
                        style={styles.logo}
                    />

                    <Text style={styles.title}>
                        Disaster Alert System
                    </Text>

                    <Text style={styles.subtitle}>
                        Real-time emergency monitoring & AI-powered risk detection
                    </Text>

                    <Text style={styles.description}>
                        This system allows users to report, monitor, and analyze disaster
                        events in real time using geolocation and AI verification.
                    </Text>

                    <Text style={styles.trust}>
                        🔒 Secure Access • Encrypted Login • Verified Platform
                    </Text>

                </View>

                {/* LOGIN CARD */}
                <View style={styles.card}>

                    <Text style={styles.loginText}>
                        Welcome Back
                    </Text>

                    <Text style={styles.subLogin}>
                        Sign in to continue to your dashboard
                    </Text>

                    <TextInput
                        testID="username-input"
                        placeholder="Username"
                        placeholderTextColor="#94a3b8"
                        style={styles.input}
                        value={username}
                        onChangeText={setUsername}
                        autoCapitalize="none"
                    />

                    <TextInput
                        testID="password-input"
                        placeholder="Password"
                        placeholderTextColor="#94a3b8"
                        style={styles.input}
                        secureTextEntry
                        value={password}
                        onChangeText={setPassword}
                    />

                    <TouchableOpacity
                        testID="login-button"
                        style={styles.button}
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>
                                LOGIN
                            </Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => navigation.navigate("Signup")}
                    >
                        <Text style={styles.signup}>
                            Don't have an account? Sign Up
                        </Text>
                    </TouchableOpacity>

                </View>

                {/* FOOTER */}
                <Text style={styles.footer}>
                    © 2026 Disaster Alert System • Powered by GU Faculty of Computer Science
                </Text>

            </ScrollView>
        </KeyboardAvoidingView>
    );
}
const styles = StyleSheet.create({

    container: {
        flexGrow: 1,
        backgroundColor: "#0f172a",
        justifyContent: "center",
        padding: 20,
    },

    topSection: {
        alignItems: "center",
        marginBottom: 35,
    },

    logo: {
        width: 120,
        height: 120,
        resizeMode: "contain",
    },

    title: {
        color: "white",
        fontSize: 32,
        fontWeight: "bold",
        marginTop: 10,
        textAlign: "center",
    },

    subtitle: {
        color: "#cbd5e1",
        marginTop: 6,
        textAlign: "center",
        fontSize: 13,
    },

    description: {
        color: "#94a3b8",
        textAlign: "center",
        marginTop: 12,
        fontSize: 13,
        lineHeight: 18,
        paddingHorizontal: 10,
    },

    trust: {
        color: "#22c55e",
        marginTop: 10,
        fontSize: 12,
        fontWeight: "600",
        textAlign: "center",
    },

    card: {
        backgroundColor: "white",
        borderRadius: 20,
        padding: 25,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },

    loginText: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#0f172a",
    },

    subLogin: {
        color: "#64748b",
        marginBottom: 15,
        marginTop: 5,
        textAlign: "center",
    },

    input: {
        backgroundColor: "#f1f5f9",
        padding: 15,
        borderRadius: 12,
        marginBottom: 15,
        fontSize: 16,
    },

    button: {
        backgroundColor: "#2563eb",
        padding: 16,
        borderRadius: 12,
        alignItems: "center",
        marginTop: 10,
    },

    buttonText: {
        color: "white",
        fontWeight: "bold",
        fontSize: 16,
    },

    signup: {
        marginTop: 20,
        textAlign: "center",
        color: "#2563eb",
        fontWeight: "600",
    },

    footer: {
        color: "#94a3b8",
        textAlign: "center",
        marginTop: 20,
        fontSize: 11,
    },
});