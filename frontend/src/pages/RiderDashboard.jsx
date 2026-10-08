import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import api from "../api";

// Must match the port your api.js uses (8080 = through NGINX, 5000 = direct).
const SOCKET_URL = "http://localhost:8080";

// What the next button should do at each stage of a delivery.
const NEXT_STEP = {
  RIDER_ASSIGNED: { status: "RIDER_PICKED_UP", label: "Mark Picked Up" },
  RIDER_PICKED_UP: { status: "OUT_FOR_DELIVERY", label: "Start Delivery" },
  OUT_FOR_DELIVERY: { status: "DELIVERED", label: "Mark Delivered" },
};

export default function RiderDashboard() {
  const [isOnline, setIsOnline] = useState(false);
  const [requests, setRequests] = useState([]); // incoming delivery requests
  const [activeOrder, setActiveOrder] = useState(null); // { orderId, status }
  const [message, setMessage] = useState("");
  const socketRef = useRef(null);
  const watchIdRef = useRef(null);

  // Connect the socket once. The server automatically puts a rider into
  // their personal room on connect, so delivery:new reaches us here.
  useEffect(() => {
    const token = localStorage.getItem("token");
    const socket = io(SOCKET_URL, { auth: { token } });
    socketRef.current = socket;

    socket.on("delivery:new", (data) => {
      // Avoid duplicates if the same request somehow arrives twice.
      setRequests((prev) =>
        prev.some((r) => r.orderId === data.orderId) ? prev : [...prev, data]
      );
    });

    socket.on("error", (err) => setMessage(err.error));

    return () => {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
      socket.disconnect();
    };
  }, []);

  // Go online: send one real GPS reading so nearby-rider search can find us.
  const goOnline = () => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        await api.patch("/riders/availability", {
          isAvailable: true,
          isOnline: true,
          latitude,
          longitude,
        });
        setIsOnline(true);
        setMessage("");
      },
      () => setMessage("Location permission is required to go online.")
    );
  };

  // Stream the rider's live GPS to the customer for this delivery.
  const startTracking = (orderId) => {
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        socketRef.current.emit("rider:location", {
          orderId,
          latitude,
          longitude,
          timestamp: Date.now(),
        });
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
  };

  const acceptOrder = async (orderId) => {
    try {
      await api.post(`/riders/orders/${orderId}/accept`);
      // Accepting is atomic on the server: if another rider got there
      // first, we land in the catch block below with a 409.
      setRequests((prev) => prev.filter((r) => r.orderId !== orderId));
      setActiveOrder({ orderId, status: "RIDER_ASSIGNED" });
      setMessage("");
      socketRef.current.emit("rider:join-delivery", { orderId });
      startTracking(orderId);
    } catch (err) {
      // Another rider took it (or it's gone): remove it from our list.
      setRequests((prev) => prev.filter((r) => r.orderId !== orderId));
      setMessage(err.response?.data?.error || "Could not accept order");
    }
  };

  const advanceStatus = async () => {
    const next = NEXT_STEP[activeOrder.status];
    try {
      await api.patch(`/riders/orders/${activeOrder.orderId}/status`, {
        status: next.status,
      });
      if (next.status === "DELIVERED") {
        stopTracking();
        setActiveOrder(null);
        setMessage("Delivery complete. You're available for new orders.");
      } else {
        setActiveOrder({ ...activeOrder, status: next.status });
      }
    } catch (err) {
      setMessage(err.response?.data?.error || "Could not update status");
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: "40px auto" }}>
      <h2>Rider Dashboard</h2>

      {!isOnline ? (
        <button onClick={goOnline}>Go Online</button>
      ) : (
        <p>You're online and available for deliveries.</p>
      )}

      {message && <p style={{ color: "#b45309" }}>{message}</p>}

      {activeOrder ? (
        <div style={{ border: "1px solid #ccc", padding: 15, marginTop: 20 }}>
          <h3>Active delivery</h3>
          <p>Order: {activeOrder.orderId}</p>
          <p>Status: <strong>{activeOrder.status}</strong></p>
          <p>Sharing your live location with the customer.</p>
          <button onClick={advanceStatus}>
            {NEXT_STEP[activeOrder.status].label}
          </button>
        </div>
      ) : (
        <div style={{ marginTop: 20 }}>
          <h3>Incoming requests</h3>
          {requests.length === 0 && <p>No new requests right now.</p>}
          {requests.map((r) => (
            <div key={r.orderId} style={{ border: "1px solid #ccc", padding: 12, marginBottom: 10 }}>
              <p><strong>Pickup:</strong> {r.pickupLocation.address}</p>
              <p><strong>Delivery:</strong> {r.deliveryLocation.address}</p>
              <button onClick={() => acceptOrder(r.orderId)}>Accept</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}