import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { io } from "socket.io-client";
import "leaflet/dist/leaflet.css";
import api from "../api";

export default function CustomerTracking() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [riderPosition, setRiderPosition] = useState(null);
  const [status, setStatus] = useState("");
  const socketRef = useRef(null);

  // Fetch the order details once, on page load.
  useEffect(() => {
    api.get(`/orders/${orderId}`).then((res) => {
      setOrder(res.data.order);
      setStatus(res.data.order.status);
    });
  }, [orderId]);

  // Connect to Socket.IO and start listening for live location updates.
  useEffect(() => {
    const token = localStorage.getItem("token");
    const socket = io("http://localhost:5000", { auth: { token } });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("rider:join-delivery", { orderId });
    });

    socket.on("location:update", (data) => {
      setRiderPosition([data.latitude, data.longitude]);
    });

    socket.on("delivery:status", (data) => {
      setStatus(data.status);
    });

    // Clean up the connection when the component unmounts
    // (e.g., the user navigates away) — prevents memory leaks.
    return () => socket.disconnect();
  }, [orderId]);

  if (!order) return <p>Loading order...</p>;

  // Default map center: pickup location until the rider's live position arrives.
  const [pickupLng, pickupLat] = order.pickupLocation.coordinates;
  const center = riderPosition || [pickupLat, pickupLng];

  return (
    <div>
      <h2>Tracking Order {orderId}</h2>
      <p>Status: <strong>{status}</strong></p>

      <MapContainer center={center} zoom={14} style={{ height: "500px", width: "100%" }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        <Marker position={[pickupLat, pickupLng]}>
          <Popup>Pickup: {order.pickupLocation.address}</Popup>
        </Marker>
        {riderPosition && (
          <Marker position={riderPosition}>
            <Popup>Rider's current location</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}