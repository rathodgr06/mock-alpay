# Alpay Payment Gateway Mock Server

A comprehensive mock server implementation of the Alpay Payment Gateway API v1.4 specification, built with Node.js and Express.

## Features

- ✅ All API endpoints from the official documentation
- ✅ JWT Bearer Token authentication
- ✅ Basic Authentication for login
- ✅ Mock transaction scenarios (success, failed, pending)
- ✅ Proper error codes and status responses
- ✅ Asynchronous transaction processing simulation
- ✅ In-memory storage for transactions and mandates

## Installation

1. Clone or create the project directory
2. Install dependencies:

```bash
npm install
```

## Running the Server

### Development mode (with auto-restart):
```bash
npm run dev
```

### Production mode:
```bash
npm start
```

The server will start on `http://localhost:5001`

## API Documentation

### Base URL: `http://localhost:5001`

### Authentication

1. **Basic Authentication** (for login only):
   - Username: `demo`
   - Password: `demo123`

2. **Bearer Token** (for all other APIs):
   - Obtain token from `/api/v1/login` endpoint
   - Include in header: `Authorization: Bearer <token>`
   - Token expires in 30 minutes

## Available Endpoints

### 1. Login
```
POST /api/v1/login
Authorization: Basic <base64(username:password)>

Request:
{
  "username": "demo",
  "password": "demo123"
}

Response:
{
  "token": "eyJ...",
  "username": "demo",
  "expires_in": 1800,
  "message": "Login successful",
  "status": "200"
}
```

### 2. Name Enquiry
```
POST /api/v1/nameenquiry
Authorization: Bearer <token>

Request:
{
  "accountNumber": "233241234567",
  "channel": "INTERBANK",
  "institutionCode": "300591",
  "transactionId": "TXN123456"
}
```

### 3. Send Money
```
POST /api/v1/sendmoney
Authorization: Bearer <token>

Request:
{
  "accountName": "JOHN DOE",
  "accountNumber": "233241234567",
  "amount": 100.00,
  "channel": "INTERBANK",
  "institutionCode": "300591",
  "transactionId": "TXN123457",
  "creditNarration": "Payment for services",
  "currency": "GHS"
}
```



## Test Data

### Test Credentials
- Username: `demo`, Password: `demo123`
- Username: `testuser1`, Password: `password123`
- Username: `testuser2`, Password: `password456`

### Mobile Money Numbers (MSISDN)

**Success Transactions:**
- `233241234567` (MTN)
- `233201234567` (Vodafone)
- `233501234567` (AirtelTigo)

**Failed Transactions:**
- `233240000000`
- `233200000000`
- `233500100000`

**Pending Transactions:**
- `233249999999`
- `233209999999`
- `233509999999`

### Bank Account Numbers

**Success Transactions:**
- `1234567890`
- `0987654321`
- `1122334455`

**Failed Transactions:**
- `0000000000`
- `1111111111`
- `2222222222`

**Pending Transactions:**
- `9999999999`
- `8888888888`
- `7777777777`

## Status Codes

The server returns appropriate status codes as per the API specification:

- `200` - Success
- `202` - Request is being processed
- `303` - Other error
- `401` - Unauthorized
- `404` - No Record found/Account not found
- `405` - Request institution is unavailable
- `419` - Request is pending completion
- `422` - Not processable Entity
- `424` - Request failed
- `500` - System error

## Example Usage

### 1. Login and Get Token

```bash
curl -X POST http://localhost:5001/api/v1/login \
  -H "Authorization: Basic ZGVtbzpkZW1vMTIz" \
  -H "Content-Type: application/json" \
  -d '{"username": "demo", "password": "demo123"}'
```

### 2. Perform Name Enquiry

```bash
curl -X POST http://localhost:5001/api/v1/nameenquiry \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "accountNumber": "233241234567",
    "channel": "INTERBANK",
    "institutionCode": "300591",
    "transactionId": "TXN123456"
  }'
```
