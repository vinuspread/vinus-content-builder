import { AdminNav } from '@/components/admin-nav'
import { BatchProvider } from '@/lib/batch-context'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <BatchProvider>
      <div className="min-h-screen flex flex-col">
        <AdminNav />
        <main className="flex-1 px-6 py-6">{children}</main>
      </div>
    </BatchProvider>
  )
}
