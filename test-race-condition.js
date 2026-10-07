const axios = require("axios");

const BASE_URL = "http://localhost:8080/api";

const RIDER_1_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2YWM1ZTM5NmVhZDdlNTkyYzJmNDkyOTYiLCJyb2xlIjoicmlkZXIiLCJpYXQiOjE3OTEzNTQ5NzMsImV4cCI6MTc5MTk1OTc3M30.pD_kq255vFBZhdebJZgkjdRBDkXs3Tx5tIAYeJvwc0M";
const RIDER_2_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2YWM1ZTg1M2VhZDdlNTkyYzJmNDkyYTkiLCJyb2xlIjoicmlkZXIiLCJpYXQiOjE3OTEzNTcxOTQsImV4cCI6MTc5MTk2MTk5NH0.EJMXSjJ2rV0xvespWtbsYpF57u3IwBFzzCgMmK450is";
const ORDER_ID = "6ac5f2a4ead7e592c2f492b4";

async function attemptAccept(token, label) {
  try {
    const res = await axios.post(
      `${BASE_URL}/riders/orders/${ORDER_ID}/accept`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return { label, success: true, status: res.status, data: res.data };
  } catch (err) {
    return {
      label,
      success: false,
      status: err.response?.status,
      error: err.response?.data,
    };
  }
}

async function runTest() {
  console.log("Firing both accept requests simultaneously...\n");

  const [result1, result2] = await Promise.all([
    attemptAccept(RIDER_1_TOKEN, "Rider 1"),
    attemptAccept(RIDER_2_TOKEN, "Rider 2"),
  ]);

  console.log(`${result1.label}: ${result1.success ? "SUCCESS" : "FAILED"} (status ${result1.status})`);
  console.log(`${result2.label}: ${result2.success ? "SUCCESS" : "FAILED"} (status ${result2.status})\n`);

  const successCount = [result1, result2].filter((r) => r.success).length;

  if (successCount === 1) {
    console.log("✅ PASS — exactly one rider successfully accepted the order. Race condition fix confirmed working.");
  } else if (successCount === 0) {
    console.log("⚠️ Neither request succeeded — check that the order exists and is in SEARCHING_RIDER status before running this test.");
  } else {
    console.log("❌ FAIL — both requests succeeded. This would mean the order was double-assigned, a real bug.");
  }
}

runTest();