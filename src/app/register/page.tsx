import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { MainContainer } from "@/components/layout/MainContainer";
import { getPostAuthRedirectPath } from "@/lib/auth-redirect";

type RegisterPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = await searchParams;
  const nextPath = getPostAuthRedirectPath(params.next);
  const session = await auth();

  if (session?.user) {
    redirect(nextPath);
  }

  return (
    <MainContainer className="flex min-h-[70vh] items-center justify-center py-10">
      <RegisterForm nextPath={nextPath} />
    </MainContainer>
  );
}
