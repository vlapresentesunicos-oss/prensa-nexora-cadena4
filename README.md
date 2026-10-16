 🏛️ Prensa NexoraOne • Suite Enterprise de Periodismo & Omnicanal

> **Firma Desarrolladora & Propiedad Intelectual:** Nexora One © Todos los derechos reservados.  
> **Cliente Oficial:** Cadena 4 (Ituzaingó, Corrientes)

---

## 📌 Visión General
**Prensa NexoraOne** es una suite de redacción periodística inteligente de clase mundial, autónoma y desacoplada, diseñada para transformar la cobertura en vivo, la producción audiovisual y la distribución omnicanal de noticias para medios de comunicación y cadenas de radiodifusión.

Resuelve de forma definitiva las limitaciones de los plugins tradicionales de CMS:
1. **Redacción y Cobertura en Vivo con IA (Nora Live):** Análisis multimodal de reportes de voz, fotografías y filmaciones cortas de video en siniestros (hasta 60s), redactando en pirámide invertida y en estricto **Español Neutro Latino**.
2. **Cerebro Evolutivo & Memoria Persistente (MongoDB Atlas):** Nora aprende dinámicamente de cada corrección y tarea editorial asignada.
3. **Distribución Omnicanal Instantánea (1-Clic):** Publica automáticamente en:
   - **WordPress Oficial de Cadena 4** vía REST API v2 con carga automática de imagen destacada a la biblioteca de medios.
   - **Redes Sociales:** Instagram Feed, Fanpage de Facebook, hilos de X y canales de Telegram.
   - **Automatizadores No-Code:** Make.com, n8n y Zapier vía Webhooks con reintentos exponenciales.
4. **Flashes Noticiosos & Auto-Clipper de Radio/TV:** Recorta transmisiones diarias de YouTube/radio y ensambla noticieros de 1 a 5 minutos con reproductor exclusivo sin anuncios.
5. **Terminal de Calle Fuera de Línea (Offline-First PWA):** Los movileros pueden grabar audios, tomar fotos y filmar siniestros incluso **sin señal de internet**. Los reportes se resguardan en la memoria interna (IndexedDB) y se auto-sincronizan al recuperar 4G.

---

## 🛠️ Instalación y Puesta en Marcha Local

### 1. Requisitos Previos
* Node.js v18.18+ o v20+
* NPM o PNPM

### 2. Instalación de Dependencias
```bash
npm install
```

### 3. Configuración de Variables de Entorno
Copia el archivo `.env.example` a `.env.local` y completa las credenciales del cliente:
```bash
cp .env.example .env.local
```

### 4. Ejecución en Desarrollo
```bash
npm run dev
```
Accede desde tu navegador a: `http://localhost:3000` (Redirecciona a `/admin`).

---

## 🔒 Cascada Multi-Proveedor (Garantía Cero Caídas)
Nora no se cae jamás porque utiliza un disyuntor en cascada:
1. **Nivel 1 (Primario):** Groq LPUs (`Llama-3.3-70b-versatile` & `whisper-large-v3`) con respuesta en < 0.8s a costo $0.
2. **Nivel 2 (Redundancia):** Google Gemini 2.5 Flash Multi-Key (3 claves rotativas en paralelo).
3. **Nivel 3 (Razonamiento Profundo):** SambaNova Cloud (`DeepSeek-R1-Distill-Llama-70B`).
4. **Nivel 4 (Local):** Degradación graciosa sin pantallas rojas 500.

---

## 🌐 Conexión con WordPress (Cadena 4)
No requiere instalar plugins en el servidor de WordPress del cliente:
1. En el panel de WordPress de Cadena 4, ir a: `Usuarios > Tu perfil`.
2. Bajar a la sección **Contraseñas de aplicación**.
3. Escribir un nombre (ej. `Prensa NexoraOne`) y presionar **Añadir nueva contraseña de aplicación**.
4. Copiar la contraseña generada (formato `xxxx xxxx xxxx xxxx`) y pegarla en el archivo `.env.local` o en la pantalla `/admin/distribution`.

---

## 🗄️ Esquema de Base de Datos
El script maestro para Supabase se encuentra en:
📁 `supabase/schema_prensa_nexora.sql`
Copia todo el contenido en el **SQL Editor** de Supabase y presiona **Run**.
