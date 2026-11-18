import Link from "next/link";

export default function SafetyPage() {
  return (
    <main className="min-h-screen bg-[#f8fafc] text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-lg font-extrabold tracking-tight text-[#0b2447]">
            Charge<span className="text-[#12965f]">Share</span>
          </Link>
          <Link href="/" className="rounded-full bg-[#0b2447] px-4 py-2 text-xs font-semibold text-white">
            Back to Network
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-12 space-y-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#12965f]">Electrical Safety &amp; Payments</p>
          <h1 className="mt-2 text-3xl font-extrabold text-slate-900">Safety Information</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Drivers should confirm charger compatibility and site access instructions before travelling.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-base font-bold text-slate-900">1. Electrical &amp; Earthing Checks</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-600 list-disc pl-4">
              <li>Dedicated MCB / RCCB circuit protection (32A for 7.4 kW Type 2; 16A industrial socket for 3.3 kW).</li>
              <li>Verified earthing loop impedance and weather-sealed IP65 outdoor enclosure.</li>
              <li>AIS-138 / IEC 62196-2 compliant Type 2 and CCS2 connectors.</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-base font-bold text-slate-900">2. Payment &amp; PIN Unlock</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-600 list-disc pl-4">
              <li>Payments are processed through Razorpay before a booking is confirmed.</li>
              <li>Power relay unlocks strictly when the driver enters their unique 6-digit booking PIN.</li>
            </ul>
            <p className="mt-3 text-sm text-slate-600">
              Refunds are issued only when a slot cannot be honoured (double-booking); for anything else contact support.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
