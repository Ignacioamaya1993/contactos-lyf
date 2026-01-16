import { authObserver, logout } from "./auth.js";
import { db } from "./firebaseConfig.js";

import {
  collection,
  getDocs,
  addDoc,
  getDoc,
  deleteDoc,
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
let pageSize = 50;
let editandoId = null;

let contactosCache = [];
let searchText = "";
let orderField = "apellido";
let orderDirection = "asc";

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
    cargarContactos(true);
  }
});

document.getElementById("logoutBtn")?.addEventListener("click", logout);

/* =====================
   CARGA DE CONTACTOS
===================== */
export async function cargarContactos(reset = true) {
  const tbody = document.getElementById("contactosBody");

  if (reset) {
    tbody.innerHTML = "";
    ultimoDoc = null;
    contactosCache = [];
  }

  try {
    let q = query(
      contactosRef,
      orderBy(orderField, orderDirection),
      limit(pageSize)
    );

    if (ultimoDoc) {
      q = query(
        contactosRef,
        orderBy(orderField, orderDirection),
        startAfter(ultimoDoc),
        limit(pageSize)
      );
    }

    const snapshot = await getDocs(q);

    if (snapshot.empty && reset) {
      tbody.innerHTML =
        `<tr><td colspan="8">No hay contactos</td></tr>`;
      return;
    }

    snapshot.forEach(d => {
      contactosCache.push({
        id: d.id,
        ...d.data()
      });
    });

    ultimoDoc = snapshot.docs[snapshot.docs.length - 1];

    renderTabla();

  } catch (err) {
    console.error(err);
    Swal.fire("Error", "No se pudieron cargar los contactos", "error");
  }
}

/* =====================
   RENDER TABLA
===================== */
function renderTabla() {
  const tbody = document.getElementById("contactosBody");
  tbody.innerHTML = "";

  const filtrados = contactosCache.filter(c => {
    const t = searchText.toLowerCase();
    return (
      c.nombreCompleto?.toLowerCase().includes(t) ||
      c.telefono?.toString().includes(t) ||
      c.afiliado?.toString().includes(t) ||
      c.grupoFamiliarId?.toLowerCase().includes(t)
    );
  });

  if (filtrados.length === 0) {
    tbody.innerHTML =
      `<tr><td colspan="8">Sin resultados</td></tr>`;
    return;
  }

  filtrados.forEach(c => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td><input type="checkbox" data-id="${c.id}"></td>
      <td>${c.nombreCompleto}</td>
      <td>${formatearFecha(c.fechaNacimiento)}</td>
      <td>${calcularEdad(c.fechaNacimiento)}</td>
      <td>${c.grupoFamiliarId || "-"}</td>
      <td>${c.telefono || "-"}</td>
      <td>${c.afiliado || "-"}</td>

      <td>
        <button data-edit="${c.id}">✏️</button>
        <button data-delete="${c.id}">🗑️</button>
      </td>
    `;

    tbody.appendChild(tr);
  });

  agregarEventosFila();
}

/* =====================
   EVENTOS FILA
===================== */
function agregarEventosFila() {
  document.querySelectorAll("[data-edit]").forEach(btn => {
    btn.onclick = () =>
      cargarContactoParaEdicion(btn.dataset.edit);
  });

  document.querySelectorAll("[data-delete]").forEach(btn => {
    btn.onclick = () =>
      eliminarContacto(btn.dataset.delete);
  });
}

/* =====================
   BUSCADOR / FILTROS
===================== */
document.getElementById("searchInput")
  ?.addEventListener("input", e => {
    searchText = e.target.value;
    renderTabla();
  });

document.getElementById("orderSelect")
  ?.addEventListener("change", e => {
    const [field, dir] = e.target.value.split("_");
    orderField = field;
    orderDirection = dir;
    cargarContactos(true);
  });

document.getElementById("pageSizeSelect")
  ?.addEventListener("change", e => {
    pageSize = Number(e.target.value);
    cargarContactos(true);
  });

/* =====================
   ALTA / EDICIÓN
===================== */
export async function guardarContacto(data) {
  const payload = {
    nombre: data.nombre,
    apellido: data.apellido,
    nombreCompleto: `${data.apellido} ${data.nombre}`,
    telefono: data.telefono,
    afiliado: data.afiliado || null,
    grupoFamiliarId: data.grupoFamiliarId || null,
    updatedAt: serverTimestamp()
  };

  if (data.fechaNacimiento) {
    payload.fechaNacimiento =
      Timestamp.fromDate(data.fechaNacimiento);
  }

  try {
    if (editandoId) {
      await updateDoc(doc(db, "contactos", editandoId), payload);
      editandoId = null;

      Swal.fire("Actualizado", "Contacto modificado correctamente", "success");
    } else {
      payload.createdAt = serverTimestamp();
      await addDoc(contactosRef, payload);

      Swal.fire("Guardado", "Contacto agregado correctamente", "success");
    }

    cargarContactos(true);
    limpiarFormulario();

  } catch (err) {
    console.error(err);
    Swal.fire("Error", "No se pudo guardar el contacto", "error");
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
    form.fechaNacimiento.value =
      c.fechaNacimiento.toDate().toISOString().split("T")[0];
  }
}

/* =====================
   ELIMINACIÓN DEFINITIVA
===================== */
async function eliminarContacto(id) {
  const result = await Swal.fire({
    title: "¿Eliminar contacto?",
    text: "Esta acción es permanente y no se puede deshacer",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Sí, eliminar",
    cancelButtonText: "Cancelar"
  });

  if (!result.isConfirmed) return;

  try {
    await deleteDoc(doc(db, "contactos", id));
    Swal.fire("Eliminado", "Contacto eliminado correctamente", "success");
    cargarContactos(true);
  } catch (err) {
    console.error(err);
    Swal.fire("Error", "No se pudo eliminar el contacto", "error");
  }
}

/* =====================
   FORM
===================== */
function limpiarFormulario() {
  document.getElementById("contactoForm")?.reset();
}

const form = document.getElementById("contactoForm");

if (form) {
  form.addEventListener("submit", async e => {
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
      Swal.fire("Datos incompletos", "Nombre, apellido y teléfono son obligatorios", "warning");
      return;
    }

    await guardarContacto(data);
  });
}

//exportar csv
function exportarCSV() {
  if (contactosCache.length === 0) {
    Swal.fire("Sin datos", "No hay contactos para exportar", "info");
    return;
  }

  const headers = [
    "Nombre Completo",
    "Fecha Nacimiento",
    "Edad",
    "Grupo Familiar",
    "Teléfono",
    "Afiliado"
  ];

  const rows = contactosCache.map(c => [
    c.nombreCompleto || "",
    c.fechaNacimiento ? formatearFecha(c.fechaNacimiento) : "",
    calcularEdad(c.fechaNacimiento),
    c.grupoFamiliarId || "",
    c.telefono || "",
    c.afiliado || ""
  ]);

  let csvContent =
    headers.join(";") + "\n" +
    rows.map(r => r.join(";")).join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "contactos.csv";
  link.click();

  URL.revokeObjectURL(url);
}

//exportar excel
function exportarExcel() {
  if (contactosCache.length === 0) {
    Swal.fire("Sin datos", "No hay contactos para exportar", "info");
    return;
  }

  const data = contactosCache.map(c => ({
    "Nombre Completo": c.nombreCompleto || "",
    "Fecha Nacimiento": c.fechaNacimiento ? formatearFecha(c.fechaNacimiento) : "",
    "Edad": calcularEdad(c.fechaNacimiento),
    "Grupo Familiar": c.grupoFamiliarId || "",
    "Teléfono": c.telefono || "",
    "Afiliado": c.afiliado || ""
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, "Contactos");

  XLSX.writeFile(workbook, "contactos.xlsx");
}

document.getElementById("btnExportCSV")
  ?.addEventListener("click", exportarCSV);

document.getElementById("btnExportExcel")
  ?.addEventListener("click", exportarExcel);