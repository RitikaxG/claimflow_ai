import { LandingPage } from "../components/marketing/landing-page";
import { getCurrentUser } from "../lib/auth/session";

export default async function HomePage() {
  const user = await getCurrentUser();
  return <LandingPage user={user} />;
}
