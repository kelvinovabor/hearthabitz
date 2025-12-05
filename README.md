# 📱 Hearthabitz Mobile API Usage Guide

This guide explains how to start the **Hearthabitz Backend API**
into your PC/mobile application.\
It includes full endpoint documentation, usage examples, and how to
connect from and start.



# 🚀 1. Base URL

### **Development Base URL**

    http://localhost:3000/api/

> ⚠️ **Mobile devices cannot access `localhost`, `127.0.0.1`, or
> `0.0.0.0` running on your laptop.**\
> You must use your **computer's local IP address**.

### **Example Local Network URL**

    http://192.168.1.20:3000/api/


# ▶️ 2. How to Start the Backend (Important for Mobile Developers)

### Step 1 --- Install dependencies

    npm install

### Step 2 --- Start PostgreSQL

On Windows:

    net start postgresql-x64-16

### Step 3 --- Create the database

    psql -U postgres
    CREATE DATABASE hearthabitz;

### Step 4 --- Start the server

    npm start

# 5. Authentication Flow

The Hearthabitz backend uses:

-   Username + Password\
-   Optional MFA (TOTP)\
-   Session-based authentication

### Required Header

    sessiontoken: your-session-token-here



# 🧩 4. API Endpoints

## 📝 4.1 Register --- `POST /register`

``` json
{
  "username": "user@example.com",
  "password": "MyPassword123"
}
```

Response:

``` json
{
  "message": "Account created. Please set up MFA.",
  "requiresMfa": true,
  "mfaSessionToken": "uuid-here",
  "otpAuthUri": "otpauth://totp/Hearthabitz:user@example.com?secret=BASE32SECRET&issuer=Hearthabitz",
  "manualEntryKey": "BASE32SECRET"
}
```

------------------------------------------------------------------------

## 🔢 4.2 Verify MFA --- `POST /mfa/verify`

``` json
{
  "mfaSessionToken": "uuid-from-register-or-login",
  "code": "123456"
}



## 🔐 4.3 Login --- `POST /login`

``` json
{
  "username": "user@example.com",
  "password": "MyPassword123"
}



## 📤 4.4 Submit Data --- `POST /data`

Headers:

    sessiontoken: session-id

Request:

``` json
{
  "username": "user@example.com",
  "payload": {
    "objects": []
  }
}

