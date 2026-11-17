import { Link } from 'react-router'
import { Logo } from './Logo'

export function SiteFooter() {
  return (
    <footer className="on-dark mt-24 bg-ink text-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[2fr_1fr_1fr]">
        <div>
          <Logo tone="white" />
          <p className="mt-3 max-w-sm text-sm text-white/80">
            Video courses for developers, designers and makers in India. Kalam is a demo project built for the Synent Technologies internship: courses and prices are illustrative.
          </p>
        </div>
        <nav aria-label="Footer" className="text-sm">
          <h2 className="mb-3 font-heading font-semibold">Learn</h2>
          <ul className="space-y-2 text-white/80">
            <li><Link className="hover:text-white" to="/courses">All courses</Link></li>
            <li><Link className="hover:text-white" to="/courses?price=free">Free courses</Link></li>
            <li><Link className="hover:text-white" to="/dashboard">My learning</Link></li>
          </ul>
        </nav>
        <div className="text-sm">
          <h2 className="mb-3 font-heading font-semibold">Account</h2>
          <ul className="space-y-2 text-white/80">
            <li><Link className="hover:text-white" to="/register">Create an account</Link></li>
            <li><Link className="hover:text-white" to="/forgot-password">Reset your password</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/15">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-white/70 sm:px-6">© 2026 Parfait Ahouanto. MIT licence.</p>
      </div>
    </footer>
  )
}
