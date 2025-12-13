import React, { useEffect, useRef } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../src/firebase';

interface LocationTrackerProps {
    userEmail: string | null;
    userName: string | null;
    userRole: string | null;
}

const LocationTracker: React.FC<LocationTrackerProps> = ({ userEmail, userName, userRole }) => {
    const lastUpdateRef = useRef<number>(0);

    useEffect(() => {
        if (!userEmail) return;

        // Background Geolocation is limited on web, but works while tab is active
        const watchId = navigator.geolocation.watchPosition(
            async (position) => {
                const now = Date.now();
                // Update at most every 2 minutes (120000ms) to save battery and reads
                // OR if accurate enough?
                // Let's do 1 minute for "Live" feel, or 30 seconds? 
                // User asked for "Live". Let's do 30 seconds threshold.
                if (now - lastUpdateRef.current < 30000) return;

                try {
                    const { latitude, longitude, accuracy, heading, speed } = position.coords;

                    await setDoc(doc(db, 'user_locations', userEmail), {
                        lat: latitude,
                        lng: longitude,
                        accuracy,
                        heading,
                        speed,
                        updatedAt: serverTimestamp(),
                        userName: userName || userEmail,
                        userRole: userRole || 'staff',
                        email: userEmail
                    }, { merge: true });

                    lastUpdateRef.current = now;
                } catch (error) {
                    console.error("Error updating location:", error);
                }
            },
            (error) => {
                console.error("Location tracking error:", error);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );

        return () => {
            navigator.geolocation.clearWatch(watchId);
        };
    }, [userEmail, userName, userRole]);

    return null; // Invisible component
};

export default LocationTracker;
