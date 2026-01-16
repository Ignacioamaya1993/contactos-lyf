// Firebase core
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";

// Auth
import { getAuth } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

// Firestore
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// Configuración de tu proyecto
const firebaseConfig = {
  apiKey: "AIzaSyBT17d-_EXElhvRbdCZWSh-xbkJkl1kqTU",
  authDomain: "contactos-lyf.firebaseapp.com",
  projectId: "contactos-lyf",
  storageBucket: "contactos-lyf.firebasestorage.app",
  messagingSenderId: "96526481064",
  appId: "1:96526481064:web:9b5cb6fbac542bd22fb49d"
};

// Inicializar Firebase
export const app = initializeApp(firebaseConfig);

// Servicios
export const auth = getAuth(app);
export const db = getFirestore(app);
