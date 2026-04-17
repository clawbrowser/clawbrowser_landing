import { redirect } from "next/navigation";
import { APP_LOGIN_URL } from "@/lib/links";

export const metadata = {
  title: "Log in",
};

export default function LoginPage() {
  redirect(APP_LOGIN_URL);
}
