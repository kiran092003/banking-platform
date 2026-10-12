import type { ReactNode } from 'react';
import { FileLock2, Landmark, ScrollText, ShieldCheck } from 'lucide-react';

const ASSURANCES = [
  {
    icon: FileLock2,
    title: '256-bit TLS encryption',
    detail: 'End-to-end encrypted transport with short-lived access tokens.',
  },
  {
    icon: ShieldCheck,
    title: 'Role-based access control',
    detail: 'Every request is authorised server-side against your role.',
  },
  {
    icon: ScrollText,
    title: 'Audit-logged transactions',
    detail: 'Each ledger movement is published as an immutable event.',
  },
];

/** Split layout shared by sign-in and registration. */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-canvas">
      <section className="relative hidden w-[55%] flex-col justify-between bg-navy p-12 lg:flex">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-base bg-cobalt">
            <Landmark className="h-4 w-4 text-white" aria-hidden="true" />
          </div>
          <span className="text-[15px] font-semibold text-white">Banking Platform</span>
        </div>

        <div className="max-w-lg">
          <h1 className="text-[36px] font-bold leading-[44px] tracking-[-0.025em] text-white">
            Enterprise treasury and real-time core banking infrastructure.
          </h1>
          <p className="mt-4 text-sm leading-6 text-slate-400">
            Designed for high-throughput transactional integrity, immutable audit streams
            and deterministic ledger reconciliation.
          </p>

          <ul className="mt-10 space-y-3">
            {ASSURANCES.map((item) => (
              <li
                key={item.title}
                className="flex gap-3 rounded-card border border-white/10 bg-white/[0.03] p-4"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-base bg-white/5">
                  <item.icon className="h-4 w-4 text-slate-300" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-white">{item.title}</p>
                  <p className="mt-0.5 text-[13px] leading-[18px] text-slate-400">
                    {item.detail}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="label-badge text-slate-600">ISO 20022 financial messaging standard</p>
      </section>

      <section className="flex w-full items-center justify-center px-4 py-10 sm:px-8 lg:w-[45%]">
        {children}
      </section>
    </div>
  );
}
