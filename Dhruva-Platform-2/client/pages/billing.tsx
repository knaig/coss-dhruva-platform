import Head from "next/head";
import AuthGuard from "../components/Auth/AuthGuard";

export default function Billing() {
  return (
    <AuthGuard requireAuth={true} requiredRole="ADMIN">
      <Head>
        <title>Billing Dashboard</title>
      </Head>
      <h1>Dhruva Billing</h1>
    </AuthGuard>
  );
}
