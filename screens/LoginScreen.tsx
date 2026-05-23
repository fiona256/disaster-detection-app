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

import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function LoginScreen({ navigation }: any) {

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const API_URL = "http://192.168.150.204:8000/api/login/";

    const handleLogin = async () => {

        if (!username || !password) {
            Alert.alert("Error", "All fields are required");
            return;
        }

        try {
            setLoading(true);

            const res = await axios.post(API_URL, {
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

                <View style={styles.topSection}>
                    <Image
                        source={require("../assets/logo.png")}
                        style={styles.logo}
                    />

                    <Text style={styles.title}>
                        Disaster Alert
                    </Text>

                    <Text style={styles.subtitle}>
                        Emergency monitoring system
                    </Text>
                </View>

                <View style={styles.card}>

                    <Text style={styles.loginText}>
                        Welcome Back
                    </Text>

                    <TextInput
                        placeholder="Username"
                        placeholderTextColor="#94a3b8"
                        style={styles.input}
                        value={username}
                        onChangeText={setUsername}
                    />

                    <TextInput
                        placeholder="Password"
                        placeholderTextColor="#94a3b8"
                        style={styles.input}
                        secureTextEntry
                        value={password}
                        onChangeText={setPassword}
                    />

                    <TouchableOpacity
                        style={styles.button}
                        onPress={handleLogin}
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
        marginBottom: 40,
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
    },

    subtitle: {
        color: "#cbd5e1",
        marginTop: 5,
    },

    card: {
        backgroundColor: "white",
        borderRadius: 20,
        padding: 25,
    },

    loginText: {
        fontSize: 24,
        fontWeight: "bold",
        marginBottom: 20,
        color: "#0f172a",
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
});