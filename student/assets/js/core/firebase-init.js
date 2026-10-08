// ============================================================
// FIREBASE INIT - Centralized Firebase config
// ============================================================

const firebaseConfig = {
    apiKey: "AIzaSyAHmBCyGlSo1puz1LZ7k-4twg_XAcOqyRA",
    authDomain: "svgms-backend.firebaseapp.com",
    projectId: "svgms-backend",
    storageBucket: "svgms-backend.firebasestorage.app",
    messagingSenderId: "1065359559935",
    appId: "1:1065359559935:web:977cea73a68e05813750ca"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Export instances
const auth = firebase.auth();
const db = firebase.firestore();

// Enable offline persistence (optional)
db.enablePersistence()
    .catch(err => {
        console.log('⚠️ Firestore persistence error:', err);
    });

console.log('✅ Firebase initialized successfully');