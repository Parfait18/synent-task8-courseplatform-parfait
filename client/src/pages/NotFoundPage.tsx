import { Link } from 'react-router'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-[2.75rem] font-bold">Page not found</h1>
      <p className="mt-2 text-muted-foreground">The address may be mistyped, or the page has moved.</p>
      <Button asChild className="mt-6"><Link to="/">Go to the home page</Link></Button>
    </div>
  )
}
