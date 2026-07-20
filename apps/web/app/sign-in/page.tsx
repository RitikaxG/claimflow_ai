import { AuthShell } from "../../components/auth/auth-shell";
import { SignInForm } from "../../components/auth/auth-forms";

type Props = { searchParams: Promise<{ next?: string | string[] }> };

export const metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: Props) {
  const query = await searchParams;
  const nextPath = typeof query.next === "string" ? query.next : "/dashboard";
  return <AuthShell mode="sign-in"><SignInForm nextPath={nextPath} /></AuthShell>;
}
