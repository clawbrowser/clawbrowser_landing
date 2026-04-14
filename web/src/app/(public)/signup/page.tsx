import { redirect } from "next/navigation";

export const metadata = {
  title: "Sign up",
};

export default function SignupPage() {
  redirect("https://app.qa.clawbrowser.ai/login");
}
