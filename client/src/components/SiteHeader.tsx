import { LogOut, Menu, UserRound } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { useAuth } from '@/auth/auth-context'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { Logo } from './Logo'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn('rounded-md px-3 py-2 font-medium transition-colors hover:bg-ink/5', isActive ? 'text-ink underline decoration-marigold decoration-[3px] underline-offset-[10px]' : 'text-graphite')

export function SiteHeader() {
  const { status, user, logout } = useAuth()
  const navigate = useNavigate()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const isSignedIn = status === 'authenticated'

  const links = [
    { to: '/courses', label: 'Courses' },
    ...(isSignedIn ? [{ to: '/dashboard', label: 'My learning' }] : []),
    ...(user?.role === 'admin' ? [{ to: '/admin', label: 'Admin' }] : []),
  ]

  async function handleSignOut() {
    await logout()
    toast.success('Signed out.')
    navigate('/')
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur supports-[backdrop-filter]:bg-paper/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link to="/" className="rounded-md" aria-label="Kalam home">
          <Logo />
        </Link>
        <nav aria-label="Main" className="ml-4 hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} className={linkClass}>
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto hidden items-center gap-2 md:flex">
          {status === 'anonymous' && (
            <>
              <Button asChild variant="ghost">
                <Link to="/login">Sign in</Link>
              </Button>
              <Button asChild className="bg-marigold font-semibold text-ink hover:bg-marigold/85">
                <Link to="/register">Create account</Link>
              </Button>
            </>
          )}
          {isSignedIn && user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2 bg-white">
                  <UserRound aria-hidden="true" />
                  <span className="max-w-40 truncate">{user.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel className="font-normal">
                  <p className="font-medium text-ink">{user.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => navigate('/dashboard')}>My learning</DropdownMenuItem>
                <DropdownMenuItem onSelect={handleSignOut}>
                  <LogOut aria-hidden="true" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="ml-auto md:hidden" aria-label="Open menu">
              <Menu aria-hidden="true" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72 bg-paper">
            <SheetHeader>
              <SheetTitle>
                <Logo />
              </SheetTitle>
              <SheetDescription>{user ? `Signed in as ${user.email}` : 'Browse courses or sign in.'}</SheetDescription>
            </SheetHeader>
            <nav aria-label="Mobile" className="flex flex-col gap-1 px-4" onClick={() => setIsMenuOpen(false)}>
              {links.map((link) => (
                <NavLink key={link.to} to={link.to} className={linkClass}>
                  {link.label}
                </NavLink>
              ))}
              {status === 'anonymous' && (
                <>
                  <NavLink to="/login" className={linkClass}>
                    Sign in
                  </NavLink>
                  <Button asChild className="mt-3 bg-marigold font-semibold text-ink hover:bg-marigold/85">
                    <Link to="/register">Create account</Link>
                  </Button>
                </>
              )}
              {isSignedIn && (
                <Button variant="outline" className="mt-3 justify-start bg-white" onClick={handleSignOut}>
                  <LogOut aria-hidden="true" /> Sign out
                </Button>
              )}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
