import { authObserver, logout } from "./auth.js";
import { db } from "./firebaseConfig.js";

import {
  collection,
  getDocs,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// Referencia a la colección
const contactosRef = collection(db, "contactos");

// 🔐 Protección de la página
authObserver(user => {
  if (!user) {
    window.location.href = "/pages/login.html";
  } else {
    document.getElementById("status").textContent =
      `Bienvenido ${user.email}`;

    cargarContactos();
  }
});

// 🚪 Logout
document.getElementById("logoutBtn").onclick = () => {
  logout();
};

// 📥 Leer contactos
async function cargarContactos() {
  const lista = document.getElementById("contactosList");
  lista.innerHTML = "Cargando contactos...";

  try {
    const q = query(
      collection(db, "contactos"),
      orderBy("apellido")
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      lista.innerHTML = "<p>No hay contactos cargados</p>";
      return;
    }

    lista.innerHTML = "";

    snapshot.forEach(doc => {
      const c = doc.data();

      const item = document.createElement("div");
      item.className = "contacto";

      item.innerHTML = `
        <strong>${c.nombreCompleto}</strong><br>
        Tel: ${c.telefono || "-"}<br>
        Afiliado: ${c.afiliado || "-"}
      `;

      lista.appendChild(item);
    });

  } catch (error) {
    console.error(error);
    lista.innerHTML = "Error al cargar contactos";
  }
}

// Alta de contacto
export async function addContacto(data) {
  return await addDoc(contactosRef, {
    nombre: data.nombre,
    apellido: data.apellido,
    telefono: data.telefono,
    afiliado: data.afiliado || null,
    activo: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}
