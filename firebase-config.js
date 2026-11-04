// js/firebase-config.js
const firebaseConfig = {
    apiKey: "AIzaSyCqhSttXPpa51TV1wOiOyYy-NYqM7EV8w0",
    authDomain: "gyehormigon.firebaseapp.com",
    projectId: "gyehormigon",
    storageBucket: "gyehormigon.firebasestorage.app",
    messagingSenderId: "1002093938030",
    appId: "1:1002093938030:web:5b7a1e1ec4818895f2ad7f",
    measurementId: "G-HGF98N5H95"
};

firebase.initializeApp(firebaseConfig);
export const db = firebase.firestore();