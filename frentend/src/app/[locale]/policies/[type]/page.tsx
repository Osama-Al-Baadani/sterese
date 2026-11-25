import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAppConfig } from "@/lib/api";
import Footer from "@/components/Footer";
import Header from "@/components/Header";

type PolicyType = "terms" | "privacy" | "return";
const VALID_TYPES: PolicyType[] = ["terms", "privacy", "return"];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ type: string }>;
}): Promise<Metadata> {
  const { type } = await params;
  const config = await getAppConfig();
  const policy = VALID_TYPES.includes(type as PolicyType) ? config.policies[type as PolicyType] : null;
  return { title: policy?.title ?? "السياسات", alternates: { canonical: `/policies/${type}` } };
}

export default async function PolicyPage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  if (!VALID_TYPES.includes(type as PolicyType)) notFound();

  const config = await getAppConfig();
  const policy = config.policies[type as PolicyType];

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6 lg:px-8">
          {!policy ? (
            <p className="text-navy-500">هذه الصفحة غير متوفرة حالياً.</p>
          ) : (
            <>
              <h1 className="mb-8 text-3xl font-extrabold text-navy-900">{policy.title}</h1>
              <div className="space-y-6">
                {policy.sections.map((s, i) => (
                  <div key={i}>
                    <h2 className="mb-2 font-bold text-navy-900">{s.heading}</h2>
                    <p className="leading-7 whitespace-pre-line text-navy-600">{s.body}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </main>
      <Footer settings={config.storeSettings} />
    </>
  );
}
