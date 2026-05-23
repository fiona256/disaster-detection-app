import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import HomeScreen from "../screens/HomeScreen";
import UploadScreen from "../screens/UploadScreen";
import ProfileScreen from "../screens/ProfileScreen";

import Ionicons from "@expo/vector-icons/Ionicons";

const Tab = createBottomTabNavigator();

export default function BottomTabs() {

    return (

        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: "#2563eb",
                tabBarInactiveTintColor: "gray",
                tabBarStyle: {
                    height: 65,
                    paddingBottom: 8,
                    paddingTop: 8,
                    borderTopWidth: 0,
                    elevation: 10,
                    backgroundColor: "#fff",
                },
            }}
        >

            {/* HOME */}
            <Tab.Screen
                name="Home"
                component={HomeScreen}
                options={{
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons
                            name="home"
                            color={color}
                            size={size}
                        />
                    ),
                }}
            />

            {/* UPLOAD */}
            <Tab.Screen
                name="Upload"
                component={UploadScreen}
                options={{
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons
                            name="cloud-upload"
                            color={color}
                            size={size}
                        />
                    ),
                }}
            />

            {/* PROFILE */}
            <Tab.Screen
                name="Profile"
                component={ProfileScreen}
                options={{
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons
                            name="person"
                            color={color}
                            size={size}
                        />
                    ),
                }}
            />

        </Tab.Navigator>
    );
}