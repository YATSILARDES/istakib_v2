/* eslint-disable no-undef */
// Scripts for firebase messaging service worker
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');

// Config from firebase.ts
const firebaseConfig = {
    apiKey: "AIzaSyD8BGX9HxswFXV3OtT4bqbIMN3DN9fkE4k",
    authDomain: "is-takip-11d57.firebaseapp.com",
    projectId: "is-takip-11d57",
    storageBucket: "is-takip-11d57.firebasestorage.app",
    messagingSenderId: "307165484762",
    appId: "1:307165484762:web:4b46898bf6917cf0dbb7e3",
    measurementId: "G-WXSRFSJKMH"
};

firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging so that it can handle background
// messages.
const messaging = firebase.messaging();

// Background Message Handler
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);

    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/icon.png' // Ensure icon exists or use default
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
