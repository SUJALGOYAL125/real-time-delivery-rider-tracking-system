import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import CustomerTracking from "./pages/CustomerTracking";
import RiderDashboard from "./pages/RiderDashboard";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/customer/track/:orderId" element={<CustomerTracking />} />
        <Route path="/rider/dashboard" element={<RiderDashboard />} />
        <Route path="/" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;