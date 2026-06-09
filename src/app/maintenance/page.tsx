import Image from "next/image";

export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <main className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-3xl flex-col items-center justify-center text-center">
        <div className="mb-10 rounded-2xl bg-white px-8 py-5 shadow-2xl shadow-slate-950/20">
          <Image
            alt="fuarbul logosu"
            className="h-24 w-auto"
            height={96}
            priority
            src="/logo.png"
            width={260}
          />
        </div>

        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.22em] text-emerald-300">
          Yapım aşamasında
        </p>
        <h1 className="text-4xl font-bold tracking-normal sm:text-5xl">
          Fuarbul yakında yayında!
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-200">
          Türkiye’deki fuarları keşfetmeni kolaylaştıracak yeni bir platform
          hazırlıyoruz.
          <br />
          Çok yakında burada olacağız.
        </p>
      </main>
    </div>
  );
}
