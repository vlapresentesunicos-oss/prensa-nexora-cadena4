"use server";

import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function adminLogin(password: string) {
  const masterKey = process.env.STAFF_MASTER_KEY || "PrensaMaster2026!";
  let role = "editor";

  if (password === masterKey) {
    role = "admin";
  } else if (password === "Cadena4Redactor") {
    role = "director";
  } else if (password === "MovilCalle123") {
    role = "corresponsal";
  } else {
    // Buscar en la base de datos de staff
    const { data } = await supabaseAdmin
      .from("staff_passwords")
      .select("role")
      .eq("password", password)
      .maybeSingle();

    if (data && data.role) {
      role = data.role;
    } else {
      throw new Error("Clave de acceso no válida.");
    }
  }

  const cookieStore = await cookies();
  cookieStore.set("staff_role", role, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
  });

  return role;
}

export async function adminLogout() {
  const cookieStore = await cookies();
  cookieStore.delete("staff_role");
}

export async function getStaffRole() {
  const cookieStore = await cookies();
  return cookieStore.get("staff_role")?.value || "admin";
}
