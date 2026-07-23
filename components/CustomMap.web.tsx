import React, { useEffect, useRef, useState } from "react";
import { View, StyleSheet } from "react-native";

export default function CustomMap({ style, region, dangers }: any) {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);
    const markersRef = useRef<any[]>([]);
    const userMarkerRef = useRef<any>(null);
    const [leafletLoaded, setLeafletLoaded] = useState(false);

    // Dynamically load Leaflet assets if not present
    useEffect(() => {
        if ((window as any).L) {
            setLeafletLoaded(true);
            return;
        }

        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);

        const script = document.createElement("script");
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        script.onload = () => setLeafletLoaded(true);
        document.head.appendChild(script);
    }, []);

    // Initialize Map
    useEffect(() => {
        if (!leafletLoaded || !mapContainerRef.current || mapRef.current) return;

        const L = (window as any).L;
        const mapDiv = mapContainerRef.current;

        mapRef.current = L.map(mapDiv, {
            zoomControl: true,
        }).setView([region?.latitude || 0.3476, region?.longitude || 32.5825], 14);

        L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
            maxZoom: 20,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        }).addTo(mapRef.current);
    }, [leafletLoaded]);

    // Update center and markers
    useEffect(() => {
        if (!mapRef.current) return;
        const L = (window as any).L;

        const lat = region?.latitude || 0.3476;
        const lon = region?.longitude || 32.5825;

        // Set View
        mapRef.current.setView([lat, lon]);

        // Draw / Update User Marker (Blue circle)
        if (userMarkerRef.current) {
            userMarkerRef.current.setLatLng([lat, lon]);
        } else {
            userMarkerRef.current = L.circleMarker([lat, lon], {
                radius: 9,
                fillColor: "#3b82f6",
                color: "#ffffff",
                weight: 2,
                opacity: 1,
                fillOpacity: 0.9,
            }).addTo(mapRef.current).bindPopup("<b>You are here (Live Position)</b>");
        }

        // Clear dangers markers
        markersRef.current.forEach(m => m.remove());
        markersRef.current = [];

        // Plot dangers
        if (Array.isArray(dangers)) {
            dangers.forEach((d) => {
                if (d.ai_status === "Fake") return;
                const color = d.severity === "Critical" ? "#ef4444" : d.severity === "Medium" ? "#f59e0b" : "#10b981";
                const marker = L.circleMarker([d.latitude, d.longitude], {
                    radius: 7,
                    fillColor: color,
                    color: "#ffffff",
                    weight: 1.5,
                    opacity: 1,
                    fillOpacity: 0.8,
                }).addTo(mapRef.current).bindPopup(`
                    <div style="font-family: sans-serif; font-size: 12px; color: #0f172a; line-height: 1.3;">
                        <h4 style="margin:0 0 4px 0; color: #1e293b;">${d.type}</h4>
                        <b>Severity:</b> <span style="color: ${color}; font-weight: bold;">${d.severity}</span><br/>
                        <b>Source:</b> ${d.source || "User"}<br/>
                        <b>AI Verification:</b> ${d.ai_status || "Pending"}
                    </div>
                `);
                markersRef.current.push(marker);
            });
        }
    }, [leafletLoaded, region, dangers]);

    return (
        <View style={[style, styles.container]}>
            <div
                ref={mapContainerRef}
                style={{ width: "100%", height: "100%" }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: "#0f172a",
        position: "relative",
    },
});
