import Link from "next/link";

export default function TermsPage() {
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

      <div className="mx-auto max-w-4xl px-4 py-12 space-y-6">
        <h1 className="text-3xl font-extrabold text-slate-900">Terms of Service &amp; Privacy Policy</h1>
        <p className="text-sm text-slate-600 leading-relaxed">
          ChargeShare operates as a peer-to-peer EV charging marketplace enabling verified property hosts to share private AC/DC charging points with registered EV drivers in compliance with Ministry of Power EV charging guidelines.
        </p>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4 text-sm text-slate-600">
          <p><strong className="text-slate-900">Tariffs &amp; Billing:</strong> Hosts set per-hour or per-kWh rates transparently prior to checkout. Applicable payment gateway charges and GST are itemized on every receipt.</p>
          <p><strong className="text-slate-900">Cancellations:</strong> Bookings cancelled at least 30 minutes prior to the scheduled slot or unactivated due to host unavailability qualify for an automated full refund.</p>
          <p><strong className="text-slate-900">Data Privacy:</strong> Exact driveway gate instructions and 6-digit relay PINs are shared exclusively with confirmed drivers during active booking windows.</p>
        </div>
      </div>
    </main>
  );
}
