import React from 'react';
import { GoogleMap, LoadScript, Marker, DirectionsRenderer } from '@react-google-maps/api';

const Map = ({ googleMapsApiKey, containerStyle, mapCenter, markers, directions }) => {
    return (
        <div>
            <h3>ルート地図</h3>
            {googleMapsApiKey && (
                <LoadScript googleMapsApiKey={googleMapsApiKey}>
                    <GoogleMap
                        mapContainerStyle={containerStyle}
                        center={mapCenter}
                        zoom={13}
                        onLoad={(map) => {
                            console.log('Map loaded:', map);
                        }}
                    >
                        {markers.map((marker, index) => (
                            <Marker key={index} position={marker} />
                        ))}
                        {directions && (
                            <DirectionsRenderer
                                directions={directions}
                                options={{ suppressMarkers: true }}
                            />
                        )}
                    </GoogleMap>
                </LoadScript>
            )}
        </div>
    );
};

export default Map;
