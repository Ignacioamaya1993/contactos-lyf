import { auth } from "./firebaseConfig.js";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

// LOGIN
export function login(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

// LOGOUT
export function logout() {
  return signOut(auth);
}

// OBSERVADOR DE SESIÓN
export function authObserver(callback) {
  onAuthStateChanged(auth, user => {
    callback(user);
  });
}
