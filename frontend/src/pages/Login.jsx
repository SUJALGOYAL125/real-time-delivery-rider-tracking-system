import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await api.post("/auth/login", { email, password });
      // Save token + role so other pages know who's logged in
      // and ProtectedRoute can check it without re-fetching.
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("role", res.data.user.role);
      localStorage.setItem("userId", res.data.user.id);

      // Send each role to their own starting page.
      if (res.data.user.role === "customer") navigate("/customer/orders");
      else if (res.data.user.role === "rider") navigate("/rider/dashboard");
      else navigate("/admin/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Login failed");
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "50px auto" }}>
      <h2>Login</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <input type="email" placeholder="Email" value={email}
          onChange={(e) => setEmail(e.target.value)} required style={{ width: "100%", marginBottom: 10 }} />
        <input type="password" placeholder="Password" value={password}
          onChange={(e) => setPassword(e.target.value)} required style={{ width: "100%", marginBottom: 10 }} />
        <button type="submit" style={{ width: "100%" }}>Login</button>
      </form>
    </div>
  );
}