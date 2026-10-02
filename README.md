# Thikana 🏠

**Thikana** is a React-based student housing platform designed to help students find PGs, rooms, and flats near colleges in Bardoli.

The name **"Thikana"** means *place/address* in Gujarati.

The application allows students to browse available places, filter listings by budget and type, view property details, and message owners. Property owners can create and manage their own listings.

> **Project status:** Demo prototype / learning project

## ✨ Features

### 🔍 Browse & Search

Students can browse available housing listings and filter them by:

- Area or nearby landmark
- Property type
- Gender preference
- Monthly budget

Supported property types:

- PG
- Room
- Flat

### 🏠 Property Listings

Owners can create housing listings with:

- Property title
- Nearby landmark or area
- Property type
- Gender preference
- Monthly rent
- Description
- Amenities
- Up to 5 photos

Available amenities include:

- WiFi
- Food included
- Parking
- AC
- Power backup
- Attached bathroom

### 👤 User Accounts

Users can create an account and choose between two roles:

- **Student** — looking for a place
- **Owner** — listing a place

Authentication is handled using Firebase Authentication with email and password.

### 💬 Student–Owner Messaging

Students can message the owner of a listing directly from the property details page.

Users can view their conversations through an inbox and continue conversations related to specific listings.

### 📋 Owner Dashboard

Owners can:

- View their listings
- Add new listings
- Open listing details
- Remove their listings

### 🖼️ Image Handling

Property photos are resized in the browser before being stored with the listing data. The application supports up to five photos per listing.

## 🛠️ Technologies Used

- **React.js** — Frontend UI
- **JavaScript** — Application logic
- **Firebase Authentication** — User authentication
- **Firebase Firestore** — Users and property listings
- **Tailwind CSS** — Styling
- **Vite** — Development and build tooling
- **Lucide React** — Icons

## 🏗️ How It Works

The application has two main user flows.

### Student Flow

```text
Create account
      ↓
Choose "Student"
      ↓
Browse listings
      ↓
Search / Filter
      ↓
Open property
      ↓
View rent, photos & amenities
      ↓
Message owner
```

### Owner Flow

```text
Create account
      ↓
Choose "Owner"
      ↓
List a place
      ↓
Add property details
      ↓
Add amenities & photos
      ↓
Publish listing
      ↓
Manage listings
      ↓
Receive messages from students
```

## 🔥 Firebase Integration

Thikana uses Firebase for application data and authentication.

### Firebase Authentication

User accounts are created and authenticated using Firebase Authentication.

User profile information is stored in a Firestore `users` collection.

### Cloud Firestore

The application uses Firestore collections for:

- `users`
- `listings`

Listings are loaded from Firestore when the application starts, and new listings are saved directly to the `listings` collection.

Conversation data is also persisted through Firestore using a shared Thikana document.

## 📁 Project Structure

```text
thikana/
├── public/
├── src/
│   ├── App.jsx
│   ├── firebase.js
│   └── main.jsx
├── .firebase/
├── .github/
├── firebase.json
├── package.json
├── vite.config.js
└── README.md
```

## 🚀 Getting Started

### Prerequisites

Make sure you have:

- Node.js
- npm
- A Firebase project

### 1. Clone the repository

```bash
git clone https://github.com/vikash-ai-dev/thikana.git
```

### 2. Open the project

```bash
cd thikana
```

### 3. Install dependencies

```bash
npm install
```

### 4. Configure Firebase

Create/configure your Firebase project and connect the application through the Firebase configuration used by the project.

### 5. Start the development server

```bash
npm run dev
```

Vite will provide a local development URL in the terminal.

## 🎯 Project Purpose

Thikana was created as a hands-on learning project to understand how a React frontend can work with Firebase services to build a data-driven application.

Through this project, I practiced:

- React component development
- React state management
- Form handling
- Conditional rendering
- Filtering and searching data
- Firebase Authentication
- Cloud Firestore
- CRUD operations
- Image processing in the browser
- Building role-based application flows
- Connecting frontend UI with a cloud database

## ⚠️ Current Limitations

Thikana is currently a **demo prototype** rather than a production-ready housing platform.

Some areas that would need further development for a production application include:

- Stronger Firestore security rules
- Proper image storage using Firebase Storage
- Real-time messaging architecture
- Listing verification workflow
- Better notification handling
- Production deployment and monitoring
- More robust validation and error handling

## 👨‍💻 Author

**Vikash Patel**

GitHub: [vikash-ai-dev](https://github.com/vikash-ai-dev)

## 📄 License

This project is a learning/demo project.