// test-invalid-location.js
//
// Confirms the Socket.IO location validation actually rejects bad data,
// not just that valid data is accepted (which we've already proven).
//
// Fill in RIDER_TOKEN and ORDER_ID (must be a delivery this rider is
// actually assigned to, so the join-delivery step succeeds), then run:
// node test-invalid-location.js

const { io } = require("socket.io-client");

const SOCKET_URL = "http://localhost:8080";
const RIDER_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2YWM1ZTM5NmVhZDdlNTkyYzJmNDkyOTYiLCJyb2xlIjoicmlkZXIiLCJpYXQiOjE3OTEzNTQ5NzMsImV4cCI6MTc5MTk1OTc3M30.pD_kq255vFBZhdebJZgkjdRBDkXs3Tx5tIAYeJvwc0M";
const ORDER_ID = "6ac5f2a4ead7e592c2f492b4";

const socket = io(SOCKET_URL, { auth: { token: RIDER_TOKEN } });

const testCases = [
  { label: "Out-of-range latitude (200)", payload: { orderId: ORDER_ID, latitude: 200, longitude: 77.21, timestamp: Date.now() } },
  { label: "Out-of-range longitude (-200)", payload: { orderId: ORDER_ID, latitude: 28.6, longitude: -200, timestamp: Date.now() } },
  { label: "Non-numeric latitude (string)", payload: { orderId: ORDER_ID, latitude: "not a number", longitude: 77.21, timestamp: Date.now() } },
  { label: "Valid coordinates (control case — should succeed)", payload: { orderId: ORDER_ID, latitude: 28.61, longitude: 77.21, timestamp: Date.now() } },
];

socket.on("connect", () => {
  console.log("Connected. Joining delivery...\n");
  socket.emit("rider:join-delivery", { orderId: ORDER_ID });

  setTimeout(() => runTests(), 1000); // small delay to ensure join completes first
});

socket.on("error", (err) => {
  console.log("Received error event:", err.error);
});

function runTests() {
  let i = 0;
  const interval = setInterval(() => {
    if (i >= testCases.length) {
      clearInterval(interval);
      console.log("\nAll test cases sent. Check error events above for each rejected case.");
      socket.disconnect();
      process.exit(0);
    }
    console.log(`Sending: ${testCases[i].label}`);
    socket.emit("rider:location", testCases[i].payload);
    i++;
  }, 1500); // space out sends so error responses are easy to match to each case
}