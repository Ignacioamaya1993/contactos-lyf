import { authObserver, logout } from "./auth.js";
import { db } from "./firebaseConfig.js";

import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  query,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  Timestamp
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

/* =====================
   CONFIGURACIÓN
===================== */
const contactosRef = collection(db, "contactos");
let ultimoDoc = null;
let pageSize = 20;
let editandoId = null;

/* =====================
   HELPERS
===================== */
function formatearFecha(timestamp) {
  if (!timestamp) return "-";
  return timestamp.toDate().toLocaleDateString("es-AR");
}

function calcularEdad(timestamp) {
  if (!timestamp) return "-";
  const hoy = new Date();
  const nac = timestamp.toDate();
  let edad = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
  return edad;
}

/* =====================
   AUTH
===================== */
authObserver(user => {
  if (!user) {
    window.location.href = "/pages/login.html";
  } else {
    document.getElementById("status").textContent =
      `Bienvenido ${user.email}`;
    cargarContactos();
  }
});

document.getElementById("logoutBtn").onclick = logout;

/* =====================
   CARGA DE CONTACTOS
===================== */
export async function cargarContactos(reset = true) {
  const tbody = document.getElementById("contactosBody");

  if (reset) {
    tbody.innerHTML = "";
    ultimoDoc = null;
  }

  try {
    let q = query(
      contactosRef,
      orderBy("apellido"),
      limit(pageSize)
    );

    if (ultimoDoc) {
      q = query(
        contactosRef,
        orderBy("apellido"),
        startAfter(ultimoDoc),
        limit(pageSize)
      );
    }

    const snapshot = await getDocs(q);

    if (snapshot.empty && reset) {
      tbody.innerHTML = `
        <tr><td colspan="8">No hay contactos</td></tr>
      `;
      return;
    }

    snapshot.forEach(d => {
      const c = d.data();
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td><input type="checkbox" data-id="${d.id}"></td>
        <td>${c.nombreCompleto}</td>
        <td>${formatearFecha(c.fechaNacimiento)}</td>
        <td>${calcularEdad(c.fechaNacimiento)}</td>
        <td>${c.grupoFamiliarId || "-"}</td>
        <td>${c.telefono || "-"}</td>
        <td>${c.activo ? "Sí" : "No"}</td>
        <td>
          <button data-edit="${d.id}">✏️</button>
          <button data-delete="${d.id}">🗑️</button>
        </td>
      `;

      tbody.appendChild(tr);
    });

    ultimoDoc = snapshot.docs[snapshot.docs.length - 1];

    agregarEventosFila();

  } catch (err) {
    console.error("Error cargando contactos", err);
  }
}

/* =====================
   EVENTOS EDITAR / ELIMINAR
===================== */
function agregarEventosFila() {
  document.querySelectorAll("[data-edit]").forEach(btn => {
    btn.onclick = () => cargarContactoParaEdicion(btn.dataset.edit);
  });

  document.querySelectorAll("[data-delete]").forEach(btn => {
    btn.onclick = () => eliminarContacto(btn.dataset.delete);
  });
}

/* =====================
   ALTA / EDICIÓN
===================== */
export async function guardarContacto(data) {
  const payload = {
    nombre: data.nombre,
    apellido: data.apellido,
    nombreCompleto: `${data.nombre} ${data.apellido}`,
    telefono: data.telefono,
    afiliado: data.afiliado || null,
    grupoFamiliarId: data.grupoFamiliarId || null,
    activo: true,
    updatedAt: serverTimestamp()
  };

  if (data.fechaNacimiento) {
    payload.fechaNacimiento = Timestamp.fromDate(data.fechaNacimiento);
  }

  try {
    if (editandoId) {
      await updateDoc(doc(db, "contactos", editandoId), payload);
      editandoId = null;
    } else {
      payload.createdAt = serverTimestamp();
      await addDoc(contactosRef, payload);
    }

    cargarContactos(true);
    limpiarFormulario();

  } catch (err) {
    console.error("Error guardando contacto", err);
  }
}

async function cargarContactoParaEdicion(id) {
  const ref = doc(db, "contactos", id);
  const snap = await getDoc(ref);

  if (!snap.exists()) return;

  const c = snap.data();
  const form = document.getElementById("contactoForm");

  editandoId = id;

  form.nombre.value = c.nombre || "";
  form.apellido.value = c.apellido || "";
  form.telefono.value = c.telefono || "";
  form.afiliado.value = c.afiliado || "";
  form.grupoFamiliarId.value = c.grupoFamiliarId || "";

  if (c.fechaNacimiento) {
    const fecha = c.fechaNacimiento.toDate()
      .toISOString()
      .split("T")[0];
    form.fechaNacimiento.value = fecha;
  }
}

/* =====================
   ELIMINACIÓN LÓGICA
===================== */
async function eliminarContacto(id) {
  if (!confirm("¿Desactivar este contacto?")) return;

  await updateDoc(doc(db, "contactos", id), {
    activo: false,
    updatedAt: serverTimestamp()
  });

  cargarContactos(true);
}

/* =====================
   FORM
===================== */
function limpiarFormulario() {
  document.querySelector("#contactoForm")?.reset();
}

// =====================
// SUBMIT DEL FORMULARIO
// =====================
const form = document.getElementById("contactoForm");

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = {
      nombre: form.nombre.value.trim(),
      apellido: form.apellido.value.trim(),
      telefono: form.telefono.value.trim(),
      afiliado: form.afiliado.value.trim(),
      grupoFamiliarId: form.grupoFamiliarId.value.trim(),
      fechaNacimiento: form.fechaNacimiento.value
        ? new Date(form.fechaNacimiento.value)
        : null
    };

    if (!data.nombre || !data.apellido || !data.telefono) {
      alert("Nombre, apellido y teléfono son obligatorios");
      return;
    }

    await guardarContacto(data);
  });
}

/* =====================
   PAGINACIÓN
===================== */
document.getElementById("btnCargarMas")?.addEventListener("click", () => {
  cargarContactos(false);
});

