# Bitespeed Identity Reconciliation Service

A sophisticated web service that helps identify and link customer contacts across multiple purchases, even when they use different email addresses and phone numbers. Built for FluxKart.com to help Doc Brown's time machine parts shopping experience! 🚗⚡

## 🎯 Problem Statement

Dr. Emmett Brown uses different email addresses and phone numbers for each purchase to avoid drawing attention to his time machine project. FluxKart.com needs to identify that all these different contact details belong to the same customer for a personalized experience.

## 🚀 Features

- **Smart Contact Linking**: Automatically links contacts that share email or phone number
- **Primary/Secondary Hierarchy**: Maintains chronological order with oldest contact as primary
- **Dynamic Merging**: Merges separate contact groups when new information creates connections
- **RESTful API**: Simple HTTP endpoints for contact identification and listing

- **SQLite Database**: Lightweight, embedded database for easy deployment

## 📋 API Specification

### Endpoint: `POST /api/v1/identify`

**Request Body:**
```json
{
  "email"?: string,
  "phoneNumber"?: string
}
```

**Response:**
```json
{
  "contact": {
    "primaryContactId": number,
    "emails": string[],
    "phoneNumbers": string[],
    "secondaryContactIds": number[]
  }
}
```

### Endpoint: `GET /api/v1/contacts`

**Query Parameters:**
- `limit` (optional): Number of contacts per page (1-100, default: 50)
- `page` (optional): Page number (default: 1)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": number,
      "phoneNumber": string | null,
      "email": string | null,
      "linkedId": number | null,
      "linkPrecedence": "primary" | "secondary",
      "createdAt": string,
      "updatedAt": string,
      "deletedAt": string | null
    }
  ],
  "pagination": {
    "currentPage": number,
    "totalPages": number,
    "totalContacts": number,
    "limit": number,
    "hasNext": boolean,
    "hasPrevious": boolean
  }
}
```

### Additional Endpoints

- `GET /api/v1/health` - Health check endpoint
- Returns 404 for all other routes

## 🛠 Tech Stack

- **Backend**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: SQLite3
- **Build Tool**: TypeScript Compiler

## 📊 Database Schema

```sql
CREATE TABLE contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phoneNumber TEXT,
  email TEXT,
  linkedId INTEGER,
  linkPrecedence TEXT CHECK(linkPrecedence IN ('primary', 'secondary')) NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  deletedAt DATETIME,
  FOREIGN KEY (linkedId) REFERENCES contacts (id)
);
```

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm

### Installation

1. **Clone and install dependencies:**
```bash
cd task_biteSpeed
npm install
```

2. **Build the project:**
```bash
npm run build
```

3. **Start the development server:**
```bash
npm run dev
```

4. **Or start the production server:**
```bash
npm start
```

The server will start on `http://localhost:3000`



```

## 📝 Usage Examples

### Example 1: First Contact
```bash
curl -X POST http://localhost:8000/api/v1/identify \
  -H "Content-Type: application/json" \
  -d '{"email": "lorraine@hillvalley.edu", "phoneNumber": "123456"}'
```

**Response:**
```json
{
  "contact": {
    "primaryContactId": 1,
    "emails": ["lorraine@hillvalley.edu"],
    "phoneNumbers": ["123456"],
    "secondaryContactIds": []
  }
}
```

### Example 2: Creating Secondary Contact
```bash
curl -X POST http://localhost:8000/api/v1/identify \
  -H "Content-Type: application/json" \
  -d '{"email": "mcfly@hillvalley.edu", "phoneNumber": "123456"}'
```

**Response:**
```json
{
  "contact": {
    "primaryContactId": 1,
    "emails": ["lorraine@hillvalley.edu", "mcfly@hillvalley.edu"],
    "phoneNumbers": ["123456"],
    "secondaryContactIds": [2]
  }
}
```

### Example 3: Merging Primary Contacts
When two separate primary contacts are linked through a new request:

```bash
# First create two separate contacts
curl -X POST http://localhost:8000/api/v1/identify \
  -H "Content-Type: application/json" \
  -d '{"email": "george@hillvalley.edu", "phoneNumber": "919191"}'

curl -X POST http://localhost:8000/api/v1/identify \
  -H "Content-Type: application/json" \
  -d '{"email": "biff@hillvalley.edu", "phoneNumber": "717171"}'

# Now link them with a request that has both contacts' information
curl -X POST http://localhost:8000/api/v1/identify \
  -H "Content-Type: application/json" \
  -d '{"email": "george@hillvalley.edu", "phoneNumber": "717171"}'
```

### Example 4: List All Contacts
```bash
# Get all contacts with default pagination
curl http://localhost:8000/api/v1/contacts

# Get contacts with custom pagination
curl "http://localhost:8000/api/v1/contacts?limit=10&page=1"

# Get only 5 contacts per page
curl "http://localhost:8000/api/v1/contacts?limit=5&page=2"
```

The older primary contact becomes the main primary, and the newer one becomes secondary.

## 🏗 Architecture

### Project Structure
```
src/
├── controllers/     # HTTP request handlers
│   └── ContactController.ts
├── database/        # Database layer
│   └── Database.ts
├── models/          # TypeScript interfaces
│   └── Contact.ts
├── services/        # Business logic
│   └── ContactService.ts
└── index.ts         # Application entry point
```

### Key Components

1. **ContactController**: Handles HTTP requests, validation, and responses
2. **ContactService**: Core business logic for contact linking and merging
3. **Database**: SQLite operations and queries
4. **Contact Models**: TypeScript interfaces for type safety

## 🔍 Business Logic

### Contact Linking Rules

1. **New Contact**: If no existing contacts match email or phone, create a new primary contact
2. **Existing Match**: If exact email+phone combination exists, return existing contact
3. **Partial Match**: If email OR phone matches existing contact, create secondary contact
4. **Multiple Primaries**: If request matches multiple primary contacts, merge them:
   - Oldest primary remains primary
   - Other primaries become secondary
   - All secondaries link to the oldest primary

### Edge Cases Handled

- ✅ Only email provided
- ✅ Only phone number provided  
- ✅ Merging multiple primary contact groups
- ✅ Preventing duplicate secondary contacts
- ✅ Maintaining chronological order
- ✅ Input validation and error handling

## 🛡 Error Handling

The service includes comprehensive error handling:

- **400 Bad Request**: Invalid email format, invalid phone format, missing required fields
- **500 Internal Server Error**: Database errors, unexpected server errors
- **404 Not Found**: Invalid endpoints

## 🌐 CORS Configuration

The API is configured to accept requests from any origin, making it accessible from web browsers, mobile apps, and other clients:

```javascript
// CORS is configured to allow:
- All origins (*)
- Methods: GET, POST, PUT, DELETE, OPTIONS
- Headers: Content-Type, Authorization, X-Requested-With
```


## 🔧 Configuration

### Environment Variables

- `PORT`: Server port (default: 8000)
- Database file is created as `contacts.db` in the project root

### Development vs Production

- **Development**: `npm run dev` - Uses ts-node for hot reloading
- **Production**: `npm run build && npm start` - Uses compiled JavaScript





