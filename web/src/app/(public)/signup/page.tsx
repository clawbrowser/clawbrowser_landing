import { redirect } from "next/navigation";
import { APP_LOGIN_URL } from "@/lib/links";

export const metadata = {
  title: "Sign up",
};

export default function SignupPage() {
  redirect(APP_LOGIN_URL);
}
