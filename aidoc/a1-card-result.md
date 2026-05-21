# A1 Card Audit Report: Serious Punch Coding Backend

## 1. Requirements Check (Pass/Fail)

| File / Requirement | Status | Verification Notes |
| :--- | :--- | :--- |
| **src/server.js** | ✅ **PASS** | Includes all imports, dotenv.config(), CORS, JSON parser, and await connectDB() before listen. |
| **src/middleware/auth.js**| ✅ **PASS** | isAuth correctly verifies Bearer token; isEligible checks roles properly. |
| **src/models/User.js** | ✅ **PASS** | All schema fields (name, email, password, role enum, active_status) and timestamps are present. |
| **src/routes/auth.js** | ✅ **PASS** | POST /login implemented with bcrypt.compare, generic 401 messages, and 7d JWT expiry. No password returned. |
| **src/routes/index.js** | ✅ **PASS** | Correctly registers router.use('/auth', authRouter). |
| **package.json** | ✅ **PASS** | All 6 required dependencies are installed. Uses ES Modules ("type": "module"). |
| **.env** | ✅ **PASS** | MONGODB_URI, JWT_SECRET, and PORT are defined and verified working. |

---

## 2. Technical Audit Details

### 2.1 Implementation Standards
- **Modules:** Successfully uses ES Modules (import/export).
- **Security:** generic error messages for login failures; sensitive fields (password) excluded from responses.
- **Database:** Connected to serious-spin3 cluster.
- **Middleware:** Proper implementation of JWT authentication and RBAC (Role-Based Access Control) helpers.

### 2.2 Bugs or Missing Pieces
- **None.** The implementation matches the A1 card specification exactly.

---

## 3. Execution & Testing Instructions

### How to start the server
```bash
npm run dev
```

### Postman Test Request
- **Method:** POST
- **URL:** http://localhost:5000/api/auth/login
- **Body (raw JSON):**
  ```json
  {
    "email": "user@example.com",
    "password": "securepassword"
  }
  ```

### Expected Response
```json
{
  "token": "JWT_TOKEN_HERE",
  "user": {
    "id": "USER_ID",
    "name": "USER_NAME",
    "role": "USER_ROLE"
  }
}
```

---

## Final Verdict: **CERTIFIED PASS** 🚀
Audited by Gemini CLI on 21 May 2026.


---

## 4. Live Test Procedure

### STEP 1 — Start the Server
Run: `npm run dev`

**Expected Terminal Output:**
```text
> backend@1.0.0 dev
> node --env-file=.env --watch src/server.js

MongoDB connected
Server running on port 5000
```

### STEP 2 — Create Test User
Run: `node src/testuser.js`

**Expected Output:**
`✅ Test user created successfully!`

### STEP 3 — Test Login
Use Postman to send a **POST** to `http://localhost:5000/api/auth/login` with:
```json
{
  "email": "cashier@spc.com",
  "password": "password123"
}
```

**Expected Success Response:**
```json
{
  "token": "eyJ...",
  "user": {
    "id": "...",
    "name": "Cashier Test",
    "role": "cashier"
  }
}
```

**Token Validation:**
Paste the token into [jwt.io](https://jwt.io). The payload should contain the correct `id` and `role: "cashier"`.


---

## 5. Detailed Live Testing Guide for Junior Developers

### STEP 1 — Start the Server
Run the command: `npm run dev`

**Success Output:**
```text
MongoDB connected
Server running on port 5000
```

**Troubleshooting Errors:**
- **Error: `EADDRINUSE`**: Another process is using port 5000. Stop it or change `PORT` in `.env`.
- **Error: `bad auth`**: Your `MONGODB_URI` password or username is incorrect.
- **Error: `MONGODB_URI is not defined`**: Your `.env` file is missing or correctly named.

### STEP 2 — Create the Test User
Run once: `node src/testuser.js`

**Expectations:**
- Prints `✅ Test user created!` if it's the first time.
- Prints `⚠️ User already exists` if the script is run again.

### STEP 3 — Test Login in Postman
- **URL:** `http://localhost:5000/api/auth/login`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`
- **Body (raw JSON):**
  ```json
  {
    "email": "cashier@spc.com",
    "password": "password123"
  }
  ```

**Success (200 OK):** Returns a JSON with a `token` and `user` object (excluding password).
**Fail (401 Unauthorized):** Returns `{ "message": "Invalid credentials" }`. This happens if the email or password doesn't match.

### STEP 4 — Verify JWT Token at jwt.io
1. Copy the `token` string from the Postman success response.
2. Go to [jwt.io](https://jwt.io).
3. Paste the token into the **Encoded** box.
4. Look at the **Payload: Data** section on the right.
5. **Verification:** Confirm that `id` matches the user ID in the database and `role` is exactly `"cashier"`.


---

## 6. Actual Live Test Results (21 May 2026)

**Test Performed by Gemini CLI**

### 6.1 Server Startup
- **Port 5000 Conflict**: Detected port 5000 conflict with macOS AirPlay service.
- **Resolution**: Updated `.env` to use `PORT=5001`.
- **Status**: ✅ SUCCESS. Server running on port 5001 and connected to MongoDB.

### 6.2 Test User Creation
- **Script**: `node src/testuser.js`
- **Status**: ✅ SUCCESS. User `cashier@spc.com` created.

### 6.3 Login Test
- **Request**: `POST http://localhost:5001/api/auth/login`
- **Status**: ✅ SUCCESS (200 OK).
- **Response Body**:
  ```json
  {
    "token": "eyJhbGciOiJIUzI1Ni...",
    "user": {
      "id": "6a0e9866bc414cb303b9a6d1",
      "name": "Cashier Test",
      "role": "cashier"
    }
  }
  ```

### 6.4 Token Verification
- **Decoded Payload**:
  ```json
  {
    "id": "6a0e9866bc414cb303b9a6d1",
    "role": "cashier",
    "iat": 1779341449,
    "exp": 1779946249
  }
  ```
- **Status**: ✅ VERIFIED. The token correctly contains the user ID and the assigned role.
