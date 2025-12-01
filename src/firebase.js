import firebase from 'firebase/compat/app';
import 'firebase/compat/database';

import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyDTzOREj0Kw4JEAZcqkVvEmADRyRaOyEOI",
    authDomain: "sales-management-app-d7599.firebaseapp.com",
    databaseURL: "https://sales-management-app-d7599-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "sales-management-app-d7599",
    storageBucket: "sales-management-app-d7599.firebasestorage.app",
    messagingSenderId: "188895291499",
    appId: "1:188895291499:web:411ba9abae00d62b33292e"
};

let app;
if (!firebase.apps.length) {
    app = firebase.initializeApp(firebaseConfig);
} else {
    app = firebase.app();
}

export const db = firebase.database();
export const firestore = getFirestore(app);
export default firebase;
