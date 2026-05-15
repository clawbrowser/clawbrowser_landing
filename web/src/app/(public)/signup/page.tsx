import { redirect } from "next/navigation";
import { APP_SIGNUP_URL } from "@/lib/links";

export const metadata = {
  title: "Sign up",
};

export default function SignupPage() {
  redirect(APP_SIGNUP_URL);
}
