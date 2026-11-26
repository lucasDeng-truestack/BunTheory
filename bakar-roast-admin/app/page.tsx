import { redirect } from "next/navigation";

// This app only serves the admin. The root sends you to the admin home (which gates on login).
export default function Home() {
  redirect("/admin");
}
