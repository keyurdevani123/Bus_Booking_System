# User Registration and Admin Management API

## Overview
This document describes the new endpoints for creating and managing admins and normal users.

## API Endpoints

### Admin Management

#### 1. Create Admin
- **URL**: `/admins`
- **Method**: `POST`
- **Body**:
```json
{
  "username": "admin123",
  "password": "securePassword123"
}
```
- **Success Response**: 
  - Code: 201
  - Content: `{ "message": "Admin created successfully", "username": "admin123" }`
- **Error Responses**:
  - 400: Missing username or password
  - 409: Admin already exists

#### 2. Get All Admins
- **URL**: `/admins`
- **Method**: `GET`
- **Success Response**: 
  - Code: 200
  - Content: Array of admin objects (without passwords)

#### 3. Delete Admin
- **URL**: `/admins/:id`
- **Method**: `DELETE`
- **Success Response**: 
  - Code: 200
  - Content: `{ "message": "Admin deleted successfully" }`

#### 4. Admin Login
- **URL**: `/auth/admin`
- **Method**: `POST`
- **Body**:
```json
{
  "username": "admin123",
  "password": "securePassword123"
}
```

---

### Normal User Management

#### 1. Register User
- **URL**: `/users`
- **Method**: `POST`
- **Body**:
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "userPassword123",
  "phone": "1234567890"
}
```
- **Success Response**: 
  - Code: 201
  - Content: 
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "1234567890"
  }
}
```
- **Error Responses**:
  - 400: Missing required fields
  - 409: User already exists

#### 2. User Login
- **URL**: `/auth/user`
- **Method**: `POST`
- **Body**:
```json
{
  "email": "john@example.com",
  "password": "userPassword123"
}
```
- **Success Response**: 
  - Code: 200
  - Content: 
```json
{
  "message": "Login successful",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "1234567890"
  }
}
```

#### 3. Get All Users
- **URL**: `/users`
- **Method**: `GET`
- **Success Response**: 
  - Code: 200
  - Content: Array of user objects (without passwords)

#### 4. Get User by ID
- **URL**: `/users/:id`
- **Method**: `GET`
- **Success Response**: 
  - Code: 200
  - Content: User object (without password)

#### 5. Update User
- **URL**: `/users/:id`
- **Method**: `PUT`
- **Body** (all fields optional):
```json
{
  "name": "John Updated",
  "email": "newemail@example.com",
  "phone": "9876543210",
  "password": "newPassword123"
}
```
- **Success Response**: 
  - Code: 200
  - Content: Updated user object

#### 6. Delete User
- **URL**: `/users/:id`
- **Method**: `DELETE`
- **Success Response**: 
  - Code: 200
  - Content: `{ "message": "User deleted successfully" }`

---

### Existing User Types

#### Checker (Bus Company User)
- **Create**: `POST /checkers` (with image upload)
- **Login**: `POST /auth/checker`
- **Get All**: `GET /checkers`
- **Delete**: `DELETE /checkers/:id`

---

## Security Notes

- All passwords are hashed using bcrypt before storage
- Passwords are never returned in API responses
- A default admin (`username: "admin"`, `password: "00000"`) is created automatically on server start

## Example Usage with cURL

### Create a new admin:
```bash
curl -X POST http://localhost:3200/admins \
  -H "Content-Type: application/json" \
  -d '{"username":"newadmin","password":"admin123"}'
```

### Register a new user:
```bash
curl -X POST http://localhost:3200/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane Doe","email":"jane@example.com","password":"pass123","phone":"1234567890"}'
```

### User login:
```bash
curl -X POST http://localhost:3200/auth/user \
  -H "Content-Type: application/json" \
  -d '{"email":"jane@example.com","password":"pass123"}'
```
