import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
    apiKey: "AIzaSyB5Ad050Ceto_eTAzYHkt_GmzQD5eixoF8",
    authDomain: "iplauction-c0bd1.firebaseapp.com",
    databaseURL: "https://iplauction-c0bd1-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "iplauction-c0bd1",
    storageBucket: "iplauction-c0bd1.firebasestorage.app",
    messagingSenderId: "342166286925",
    appId: "1:342166286925:web:b192241147c862ac85e204"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
