import React from "react";
import MapView, { Marker } from "react-native-maps";

export default function CustomMap({ style, region, showsUserLocation, dangers }: any) {
    return (
        <MapView
            style={style}
            region={region}
            showsUserLocation={showsUserLocation}
        >
            {Array.isArray(dangers) && dangers
                .filter((d: any) => d && typeof d.latitude === "number" && typeof d.longitude === "number" && !isNaN(d.latitude) && !isNaN(d.longitude))
                .map((d: any) => (
                    <Marker
                        key={d.id}
                        coordinate={{
                            latitude: d.latitude,
                            longitude: d.longitude,
                        }}
                        title={d.type}
                        description={d.severity}
                    />
                ))}
        </MapView>
    );
}
