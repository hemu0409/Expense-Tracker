// Firebase Configuration
// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC0zRQkN1MiTWp4gGPr83m2ZcvCIUcoyPs",
  authDomain: "expense-tracker-e4051.firebaseapp.com",
  projectId: "expense-tracker-e4051",
  storageBucket: "expense-tracker-e4051.firebasestorage.app",
  messagingSenderId: "573528801427",
  appId: "1:573528801427:web:aa38c5bc36ef5a0bd04d66",
  measurementId: "G-1FYHKR8RV2"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = firebase.auth();
const db = firebase.firestore();

// Export for use in other files
window.auth = auth;
window.db = db;
