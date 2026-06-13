import { useState, useEffect } from 'react'
import { dbGet, dbInsert, dbUpdate } from '@/lib/api'
import { useOffices } from '@/hooks/useOffices'
import { Layout } from '@/components/layout/Layout'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Pencil, Building2, Users, FileText } from 'lucide-react'
import type { Profile, Office } from '@/types'

interface ProfileWithEmail extends Profile {
  email?: string
}

function UserManagement() {
  const { offices } = useOffices()
  const [users, setUsers] = useState<ProfileWithEmail[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editUser, setEditUser] = useState<Profile | null>(null)
  const [form, setForm] = useState({ full_name: '', role: 'encoder', office_id: '', is_active: true })
  const [saving, setSaving] = useState(false)

  async function loadUsers() {
    const params = new URLSearchParams({ select: '*,office:offices(*)', order: 'full_name.asc' })
    const { data } = await dbGet<ProfileWithEmail[]>('profiles', params)
    setUsers(data ?? [])
    setLoading(false)
  }

  useEffect(() => { loadUsers() }, [])

  async function handleSave() {
    if (!editUser) return
    setSaving(true)
    await dbUpdate(
      'profiles',
      new URLSearchParams({ id: `eq.${editUser.id}` }),
      {
        full_name: form.full_name,
        role: form.role,
        office_id: form.office_id || null,
        is_active: form.is_active,
      }
    )
    setSaving(false)
    setDialogOpen(false)
    loadUsers()
  }

  function openEdit(u: Profile) {
    setEditUser(u)
    setForm({ full_name: u.full_name, role: u.role, office_id: u.office_id ?? '', is_active: u.is_active })
    setDialogOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{users.length} users registered</p>
      </div>

      {loading ? (
        Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Office</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-border" data-testid={`row-user-${u.id}`}>
                  <td className="px-4 py-3 font-medium">{u.full_name}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${
                      u.role === 'super_admin' ? 'bg-primary/10 text-primary border-primary/20' :
                      u.role === 'encoder' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                      'bg-gray-100 text-gray-600 border-gray-200'
                    }`}>{u.role.replace('_', ' ')}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{u.office?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${u.is_active ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(u)} data-testid={`button-edit-user-${u.id}`}>
                      <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit User</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Full Name</Label>
              <Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} data-testid="input-user-name" />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                  <SelectItem value="encoder">Encoder</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Office</Label>
              <Select value={form.office_id} onValueChange={v => setForm(f => ({ ...f, office_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select office" /></SelectTrigger>
                <SelectContent>
                  {offices.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
              <Label>Active account</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} data-testid="button-save-user">
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function OfficeManagement() {
  const { offices, loading } = useOffices()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editOffice, setEditOffice] = useState<Office | null>(null)
  const [form, setForm] = useState({ name: '', office_type: 'barangay', address: '', contact_number: '' })
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    if (editOffice) {
      await dbUpdate(
        'offices',
        new URLSearchParams({ id: `eq.${editOffice.id}` }),
        form as Record<string, unknown>
      )
    } else {
      await dbInsert('offices', form as Record<string, unknown>)
    }
    setSaving(false)
    setDialogOpen(false)
  }

  function openAdd() {
    setEditOffice(null)
    setForm({ name: '', office_type: 'barangay', address: '', contact_number: '' })
    setDialogOpen(true)
  }

  function openEdit(o: Office) {
    setEditOffice(o)
    setForm({ name: o.name, office_type: o.office_type, address: o.address ?? '', contact_number: o.contact_number ?? '' })
    setDialogOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openAdd} data-testid="button-add-office">
          <Plus className="h-4 w-4 mr-1" /> Add Office
        </Button>
      </div>
      {loading ? (
        Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)
      ) : (
        <div className="grid gap-3">
          {offices.map(o => (
            <div key={o.id} className="flex items-center justify-between border border-border rounded-lg px-4 py-3" data-testid={`office-${o.id}`}>
              <div>
                <p className="font-medium text-sm">{o.name}</p>
                <p className="text-xs text-muted-foreground">{o.address ?? '—'} &bull; <span className="capitalize">{o.office_type}</span></p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => openEdit(o)}><Pencil className="h-3.5 w-3.5" /></Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editOffice ? 'Edit Office' : 'Add Office'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Office Name</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} data-testid="input-office-name" />
            </div>
            <div className="space-y-1.5">
              <Label>Office Type</Label>
              <Select value={form.office_type} onValueChange={v => setForm(f => ({ ...f, office_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="barangay">Barangay</SelectItem>
                  <SelectItem value="pnp">PNP</SelectItem>
                  <SelectItem value="mswd">MSWD</SelectItem>
                  <SelectItem value="munisipyo">Munisipyo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Address</Label>
              <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Contact Number</Label>
              <Input value={form.contact_number} onChange={e => setForm(f => ({ ...f, contact_number: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} data-testid="button-save-office">
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SystemLogs() {
  const [logs, setLogs] = useState<{ id: string; case_id: string; old_status: string; new_status: string; created_at: string }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const params = new URLSearchParams({ select: '*', order: 'created_at.desc', limit: '100' })
    dbGet<typeof logs>('case_status_logs', params).then(({ data }) => {
      setLogs(data ?? [])
      setLoading(false)
    })
  }, [])

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-border bg-muted/40">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Timestamp</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Case ID</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Old Status</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">New Status</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>{Array.from({ length: 4 }).map((_, j) => <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>)}</tr>
            ))
          ) : logs.length === 0 ? (
            <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No logs found</td></tr>
          ) : (
            logs.map(l => (
              <tr key={l.id} className="border-b border-border" data-testid={`log-${l.id}`}>
                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{new Date(l.created_at).toLocaleString('en-PH')}</td>
                <td className="px-4 py-3 font-mono text-xs">{l.case_id.slice(0, 8)}…</td>
                <td className="px-4 py-3 text-xs capitalize">{l.old_status ?? '—'}</td>
                <td className="px-4 py-3 text-xs capitalize font-medium">{l.new_status}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

export default function AdminPage() {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
          <p className="text-sm text-muted-foreground">System administration and management</p>
        </div>

        <Tabs defaultValue="users">
          <TabsList>
            <TabsTrigger value="users" data-testid="tab-users">
              <Users className="h-4 w-4 mr-1.5" /> User Management
            </TabsTrigger>
            <TabsTrigger value="offices" data-testid="tab-offices">
              <Building2 className="h-4 w-4 mr-1.5" /> Offices
            </TabsTrigger>
            <TabsTrigger value="logs" data-testid="tab-logs">
              <FileText className="h-4 w-4 mr-1.5" /> System Logs
            </TabsTrigger>
          </TabsList>
          <TabsContent value="users" className="mt-4">
            <Card><CardContent className="p-4"><UserManagement /></CardContent></Card>
          </TabsContent>
          <TabsContent value="offices" className="mt-4">
            <Card><CardContent className="p-4"><OfficeManagement /></CardContent></Card>
          </TabsContent>
          <TabsContent value="logs" className="mt-4">
            <Card><SystemLogs /></Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  )
}
