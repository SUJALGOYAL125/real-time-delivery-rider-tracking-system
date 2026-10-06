import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import api from "../api";

export default function RiderDashboard() {
  const [activeOrderId, setActiveOrderId] = useState(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const socketRef = useRef(null);
  const watchIdRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const socket = io("http://localhost:5000", { auth: { token } });
    socketRef.current = socket;
    return () => socket.disconnect();
  }, []);

  const goOnline = () => {
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      await api.patch("/riders/availability", { isAvailable: true, isOnline: true, latitude, longitude });
      setIsAvailable(true);
    });
  };

  // NEW: resume tracking on an order you're already assigned to,
  // instead of only supporting brand-new accepts.
  const resumeTracking = (orderId) => {
    setActiveOrderId(orderId);
    socketRef.current.emit("rider:join-delivery", { orderId });
    startTracking(orderId);
  };

  const startTracking = (orderId) => {
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        socketRef.current.emit("rider:location", { orderId, latitude, longitude, timestamp: Date.now() });
      },
      (err) => console.error("GPS error:", err),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );
  };

  const stopTracking = () => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setActiveOrderId(null);
  };

  return (
    <div>
      <h2>Rider Dashboard</h2>
      {!isAvailable ? (
        <button onClick={goOnline}>Go Online</button>
      ) : (
        <p>You're online and available.</p>
      )}

      {!activeOrderId ? (
        <div>
          <p>Enter an order ID you're assigned to (temporary, until an order list page exists):</p>
          <input id="manualOrderId" placeholder="Order ID" />
          <button onClick={() => resumeTracking(document.getElementById("manualOrderId").value)}>
            Start Tracking This Order
          </button>
        </div>
      ) : (
        <div>
          <p>Actively tracking order: {activeOrderId}</p>
          <button onClick={stopTracking}>Stop Tracking</button>
        </div>
      )}
    </div>
  );
}