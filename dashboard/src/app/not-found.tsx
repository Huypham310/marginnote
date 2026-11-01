import Link from "next/link";

export default function NotFound() {
  return (
    <section className="py-16 text-center">
      <h1 className="text-xl font-semibold">Not found</h1>
      <p className="mt-2 text-sm text-slate-500">That page or highlight doesn&apos;t exist (anymore).</p>
      <Link href="/" className="mt-4 inline-block text-sm text-blue-600 hover:underline">Back to the library</Link>
    </section>
  );
}
