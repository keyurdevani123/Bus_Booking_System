# Unified Signup System - Implementation Guide

## Overview
Users can now sign up through a unified signup page that lets them choose between creating a Normal User account or an Admin account. Both types are properly stored in their respective database collections.

## How It Works

### Frontend Flow:
1. User clicks "Sign Up" in navbar
2. Presented with two options:
   - **Normal User** - For booking tickets
   - **Admin** - For managing the system
3. Based on selection, fills out appropriate form
4. Data is validated on frontend (password match, required fields)
5. API call is made to appropriate endpoint
6. Success/error messages displayed
7. Redirect to login page

### Database Storage:
- **Normal Users** → Stored in `users` collection
- **Admins** → Stored in `admins` collection

## API Endpoints

### User Signup
**POST /users**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securePassword123",
  "phone": "1234567890"
}
```
**Response (201 Created):**
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

### Admin Signup
**POST /admins**
```json
{
  "username": "admin123",
  "email": "admin@example.com",
  "password": "securePassword123",
  "role": "admin"
}
```
**Valid Roles:**
- `super_admin` - Full system access
- `admin` - Limited management access
- `moderator` - View-only access

**Response (201 Created):**
```json
{
  "message": "Admin created successfully",
  "admin": {
    "id": "607f1f77bcf86cd799439011",
    "username": "admin123",
    "email": "admin@example.com",
    "role": "admin"
  }
}
```

## Frontend Pages

### New/Updated Pages:
1. **`/signup`** - Unified signup page with type selection
2. **`/user/login`** - User login page
3. **`/admin/login`** - Admin login page

### Removed Pages:
- `/user/signup` - Combined into `/signup`
- `/admin/signup` - Combined into `/signup`

## Database Collections

### Users Collection
```
{
  _id: ObjectId,
  name: String,
  email: String (unique),
  password: String (hashed),
  phone: String,
  createdAt: Date
}
```

### Admins Collection
```
{
  _id: ObjectId,
  username: String (unique),
  email: String,
  password: String (hashed),
  role: String (super_admin, admin, moderator),
  createdAt: Date
}
```

## Validation & Features

### Frontend Validation:
✅ All required fields must be filled
✅ Passwords must match (confirmation)
✅ Email format validation (HTML5)
✅ Phone format validation
✅ Real-time role description display (Admin only)

### Backend Validation:
✅ Duplicate email check (Users)
✅ Duplicate username check (Admins)
✅ Role validation (must be one of valid roles)
✅ Password hashing with bcrypt
✅ Required fields validation

### Security:
✅ Passwords stored as bcrypt hashes (10 salt rounds)
✅ Passwords never returned in API responses
✅ Unique email/username constraints
✅ No sensitive data in frontend storage (except token)

## Testing the Implementation

### Create a Normal User:
```bash
curl -X POST http://localhost:3200/users \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Jane Doe",
    "email":"jane@example.com",
    "password":"pass123",
    "phone":"9876543210"
  }'
```

### Create an Admin:
```bash
curl -X POST http://localhost:3200/admins \
  -H "Content-Type: application/json" \
  -d '{
    "username":"newadmin",
    "email":"admin@example.com",
    "password":"adminpass123",
    "role":"admin"
  }'
```

### Verify User was Created:
```bash
curl http://localhost:3200/users
```

### Verify Admin was Created:
```bash
curl http://localhost:3200/admins
```

## Error Handling

### Common Errors:
| Error | Status | Cause |
|-------|--------|-------|
| "All fields are required" | 400 | Missing required fields |
| "User already exists" | 409 | Email already registered |
| "Admin already exists" | 409 | Username already exists |
| "Passwords do not match" | - | Frontend validation failure |
| "Invalid role" | 400 | Invalid admin role selected |

## File Structure
```
Frontend (E-Ticket-Frontend/src/):
├── pages/
│   ├── Signup.js (NEW - unified signup)
│   ├── UserLogin.js
│   └── [removed] UserSignup.js, AdminSignup.js
├── components/
│   └── Navbar.js (updated - single signup link)
├── services/
│   └── api.js (updated - signup methods)
├── styles/
│   └── Auth.css (updated - signup type styles)
└── App.js (updated - unified route)

Backend (E-Ticket-Project-Backend-main/):
├── model/
│   ├── User.js
│   └── Admin.js (updated - added email, role, createdAt)
├── controllers/
│   ├── userController.js
│   └── adminController.js (updated - role support)
├── routes/
│   ├── user.js
│   └── admin.js
└── server.js
```

## Next Steps
1. Start the backend: `npm start` in `E-Ticket-Project-Backend-main/`
2. Start the frontend: `npm start` in `E-Ticket-Frontend/`
3. Navigate to `http://localhost:3000` (or 3001)
4. Click "Sign Up" to test the unified signup flow
5. Check MongoDB to verify documents are created
