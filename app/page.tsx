import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export const instant = false;

export default async function HomePage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/resources");
  } else {
    redirect("/login");
  }
}
