import type { ReactNode } from 'react'

/** Narrow centred column used by every account page. */
export function AuthShell({ title, intro, children, footer }: { title: string; intro?: ReactNode; children?: ReactNode; footer?: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-12 sm:py-16">
      <div className="rounded-2xl border border-line bg-white p-6 shadow-[0_1px_0_rgb(27_37_96/0.04)] sm:p-8">
        <h1 className="text-[1.5625rem] font-bold">{title}</h1>
        {intro && <div className="mt-2 text-muted-foreground">{intro}</div>}
        {children && <div className="mt-6">{children}</div>}
      </div>
      {footer && <div className="mt-5 text-center text-sm text-muted-foreground">{footer}</div>}
    </div>
  )
}
