import { AuthShell } from "../../components/auth/auth-shell";
import { SignUpForm } from "../../components/auth/auth-forms";

export const metadata = { title: "Create account" };

export default function SignUpPage() {
  return <AuthShell mode="sign-up"><SignUpForm /></AuthShell>;
}
