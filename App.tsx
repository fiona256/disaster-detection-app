import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import LoginScreen from "./screens/LoginScreen";
import SignupScreen from "./screens/SignupScreen";

import BottomTabs from "./navigation/BottomTabs";

const Stack = createNativeStackNavigator();

export default function App() {

  return (

    <NavigationContainer>

      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >

        {/* LOGIN */}
        <Stack.Screen
          name="Login"
          component={LoginScreen}
        />

        {/* SIGN UP */}
        <Stack.Screen
          name="Signup"
          component={SignupScreen}
        />

        {/* MAIN APP */}
        <Stack.Screen
          name="Main"
          component={BottomTabs}
        />

      </Stack.Navigator>

    </NavigationContainer>
  );
}