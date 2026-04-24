import { LoginClient } from "./LoginClient";

type Props = {
  searchParams: Promise<{ reason?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const { reason } = await searchParams;
  return <LoginClient showIdleExpired={reason === "idle"} />;
}
