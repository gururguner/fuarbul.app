import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { LoginForm } from "@/components/auth/LoginForm";
import { MainContainer } from "@/components/layout/MainContainer";
import { getPostAuthRedirectPath } from "@/lib/auth-redirect";

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath = getPostAuthRedirectPath(params.next);
  const session = await auth();

  if (session?.user) {
    redirect(nextPath);
  }

  return (
    <MainContainer className="flex min-h-[70vh] items-center justify-center py-10">
      <LoginForm nextPath={nextPath} />
    </MainContainer>
  );
}
