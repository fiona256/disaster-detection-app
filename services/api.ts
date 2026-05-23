import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const API = axios.create({
    baseURL: "http://192.168.150.204:8000/api/",
});

API.interceptors.request.use(
    async (config) => {

        const token = await AsyncStorage.getItem("token");

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    },

    (error) => Promise.reject(error)
);