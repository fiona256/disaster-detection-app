import { useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
} from "react-native";

import axios from "axios";

export default function SignupScreen({ navigation }: any) {

    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const API_URL = "http://192.168.150.204:8000/api/signup/";

    // =========================
    // VALIDATION
    // =========================
    const isValidEmail = (email: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const isStrongPassword = (password: string) => {
        const strongRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/;
        return strongRegex.test(password);
    };

    const sanitize = (text: string) => text.trim();

    // =========================
    // SIGNUP HANDLER
    // =========================
    const handleSignup = async () => {

        const cleanUsername = sanitize(username);
        const cleanEmail = sanitize(email);

        if (!cleanUsername || !cleanEmail || !password) {
            Alert.alert("Error", "All fields are required");
            return;
        }

        if (!isValidEmail(cleanEmail)) {
            Alert.alert("Invalid Email", "Enter a valid email address");
            return;
        }

        if (!isStrongPassword(password)) {
            Alert.alert(
                "Weak Password",
                "Password must be 8+ chars with letters and numbers"
            );
            return;
        }

        try {
            setLoading(true);

            await axios.post(API_URL, {
                username: cleanUsername,
                email: cleanEmail,
                password: password,
            });

            Alert.alert("Success", "Account created successfully");

            navigation.replace("Login");

        } catch (error: any) {

            console.log(error?.response?.data || error);

            const message =
                error?.response?.data?.error ||
                "Signup failed. Try again.";

            Alert.alert("Error", message);

        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>

            <Text style={styles.title}>
                Create Account
            </Text>

            <TextInput
                placeholder="Username"
                placeholderTextColor="#94a3b8"
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
            />

            <TextInput
                placeholder="Email"
                placeholderTextColor="#94a3b8"
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
            />

            <TextInput
                placeholder="Password"
                placeholderTextColor="#94a3b8"
                secureTextEntry
                style={styles.input}
                value={password}
                onChangeText={setPassword}
            />

            <TouchableOpacity
                style={styles.button}
                onPress={handleSignup}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.buttonText}>
                        SIGN UP
                    </Text>
                )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.goBack()}>
                <Text style={styles.link}>
                    Already have an account?
                </Text>
            </TouchableOpacity>

        </View>
    );
}

// =========================
// STYLES (FIXED ERROR HERE)
// =========================
const styles = StyleSheet.create({

    container: {
        flex: 1,
        justifyContent: "center",
        padding: 20,
        backgroundColor: "#0f172a",
    },

    title: {
        color: "white",
        fontSize: 28,
        fontWeight: "bold",
        marginBottom: 30,
        textAlign: "center",
    },

    input: {
        backgroundColor: "white",
        padding: 15,
        borderRadius: 12,
        marginBottom: 15,
    },

    button: {
        backgroundColor: "#2563eb",
        padding: 16,
        borderRadius: 12,
        alignItems: "center",
    },

    buttonText: {
        color: "white",
        fontWeight: "bold",
    },

    link: {
        color: "#60a5fa",
        textAlign: "center",
        marginTop: 20,
    },
});