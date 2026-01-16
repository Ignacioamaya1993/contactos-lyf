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

function formatearFecha(timestamp) {
  if (!timestamp) return "-";

  const date = timestamp.toDate();
  return date.toLocaleDateString("es-AR");
}


// Protección de la página
authObserver(user => {
  if (!user) {
    window.location.href = "/pages/login.html";
  } else {
    document.getElementById("status").textContent =
      `Bienvenido ${user.email}`;

    cargarContactos();
  }
});

// Logout
document.getElementById("logoutBtn").onclick = () => {
  logout();
};

// Leer contactos
async function cargarContactos() {
  const tbody = document.getElementById("contactosBody");
  tbody.innerHTML = "";

  try {
    const q = query(
      collection(db, "contactos"),
      orderBy("apellido")
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7">No hay contactos cargados</td>
        </tr>
      `;
      return;
    }

    snapshot.forEach(doc => {
      const c = doc.data();

      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>
          <input type="checkbox" data-id="${doc.id}">
        </td>
        <td>${c.nombreCompleto}</td>
        <td>${formatearFecha(c.fechaNacimiento)}</td>
        <td>${c.edad ?? "-"}</td>
        <td>${c.grupoFamiliarId || "-"}</td>
        <td>${c.telefono || "-"}</td>
        <td>${c.activo ? "Sí" : "No"}</td>
      `;

      tbody.appendChild(tr);
    });

  } catch (error) {
    console.error("Error cargando contactos:", error);
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
