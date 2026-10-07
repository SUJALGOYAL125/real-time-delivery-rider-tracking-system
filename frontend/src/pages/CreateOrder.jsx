import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

export default function CreateOrder() {
  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupLng, setPickupLng] = useState("");
  const [pickupLat, setPickupLat] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryLng, setDeliveryLng] = useState("");
  const [deliveryLat, setDeliveryLat] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await api.post("/orders", {
        pickupLocation: {
          coordinates: [parseFloat(pickupLng), parseFloat(pickupLat)],
          address: pickupAddress,
        },
        deliveryLocation: {
          coordinates: [parseFloat(deliveryLng), parseFloat(deliveryLat)],
          address: deliveryAddress,
        },
      });
      // Send the customer straight to tracking their new order.
      navigate(`/customer/track/${res.data.order._id}`);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create order");
    }
  };

  return (
    <div style={{ maxWidth: 500, margin: "50px auto" }}>
      <h2>Create Delivery Order</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <h4>Pickup</h4>
        <input placeholder="Address" value={pickupAddress} onChange={(e) => setPickupAddress(e.target.value)} required style={{ width: "100%", marginBottom: 8 }} />
        <input placeholder="Longitude" value={pickupLng} onChange={(e) => setPickupLng(e.target.value)} required style={{ width: "48%", marginRight: "4%" }} />
        <input placeholder="Latitude" value={pickupLat} onChange={(e) => setPickupLat(e.target.value)} required style={{ width: "48%" }} />

        <h4>Delivery</h4>
        <input placeholder="Address" value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} required style={{ width: "100%", marginBottom: 8 }} />
        <input placeholder="Longitude" value={deliveryLng} onChange={(e) => setDeliveryLng(e.target.value)} required style={{ width: "48%", marginRight: "4%" }} />
        <input placeholder="Latitude" value={deliveryLat} onChange={(e) => setDeliveryLat(e.target.value)} required style={{ width: "48%" }} />

        <button type="submit" style={{ width: "100%", marginTop: 15 }}>Create Order</button>
      </form>
    </div>
  );
}