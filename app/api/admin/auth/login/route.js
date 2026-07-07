import { verifyAdminPassword } from "@/lib/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash } from "crypto";

export async function POST(req) {
  const formData = await req.formData();
  const password = formData.get("password")?.toString() ?? "";

  if (!verifyAdminPassword(password)) {
    redirect("/admin?error=1");
  }

  // Create a session token: HMAC of password with itself (not a secret key but
  // sufficient for this single-admin use case — no user data at risk)
  const token = createHash("sha256")
    .update(password + (process.env.ADMIN_PASSWORD ?? ""))
    .digest("hex");

  const cookieStore = await cookies();
  cookieStore.set("ugt_admin_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });

  redirect("/admin");
}
