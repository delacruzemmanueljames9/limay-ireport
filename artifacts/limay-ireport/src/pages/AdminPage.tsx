import { useState, useEffect } from 'react'
import { dbGet, dbInsert, dbUpdate, dbDelete } from '@/lib/api'
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
import { Plus, Pencil, Building2, Users, FileText, KeyRound, Trash2 } from 'lucide-react'
import type { Profile, Office } from '@/types'

const SUPABASE_URL = 'https://inovdbudrzicbgkcnbpd.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlub3ZkYnVkcnppY2Jna2NuYnBkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNDY1NzEsImV4cCI6MjA5NjgyMjU3MX0.fBJ418qpVpnGusbFPV9_GriTF2OttI7-lCHdLUxZbZU'

function getToken(): string {
  try {
    const raw = localStorage.getItem('sb-session')
    if (!raw) return SUPABASE_ANON_KEY
    const parsed = JSON.parse(raw) as { access_token?: string }
    return parsed.access_token ?? SUPABASE_ANON_KEY
  } catch {
    return SUPABASE_ANON_KEY
  }
}

interface ProfileWithOffice extends Profile {
  office?: { name: string } | null
}

function UserManagement() {
  const { offices } = useOffices()
  const [users, setUsers] = useState<ProfileWithOffice[]>([])
  const [loading, setLoading] = useState(true)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [passDialogOpen, setPassDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editUser, setEditUser] = useState<ProfileWithOffice | null>(null)
  const [deleteUser, setDeleteUser] = useState<ProfileWithOffice | null>(null)
  const [form, setForm] = useState({ full_name: '', role: 'encoder', office_id: '', is_active: true })
  const [addForm, setAddForm] = useState({ username: '', password: '', full_name: '', role: 'encoder', office_id: '' })
  const [newPassword, setNewPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [addError, setAddError] = useState('')
  const [passError, setPassError] = useState('')
  const [passSuccess, setPassSuccess] = useState('')
  const [deleteError, setDeleteError] = useState('')

  async function loadUsers() {
    const params = new URLSearchParams({ select: '*,office:offices(name)', order: 'full_name.asc' })
    const { data } = await dbGet<ProfileWithOffice[]>('profiles', params)
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
    setEditDialogOpen(false)
    loadUsers()
  }

  async function handleAddUser() {
    setAddError('')
    if (!addForm.username || !addForm.password || !addForm.full_name) {
      setAddError('Username, password, and full name are required.')
      return
    }
    if (addForm.password.length < 6) {
      setAddError('Password must be at least 6 characters.')
      return
    }
    setSaving(true)
    const email = addForm.username.includes('@') ? addForm.username : addForm.username + '@limay.gov.ph'

    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/create_user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          p_email: email,
          p_password: addForm.password,
          p_full_name: addForm.full_name,
          p_role: addForm.role,
          p_office_id: addForm.office_id || null,
        }),
      })

      const data = await res.json()

      if (!res.ok || data.code) {
        setAddError(data.message ?? data.hint ?? data.details ?? 'Failed to create user.')
        setSaving(false)
        return
      }

      setSaving(false)
      setAddDialogOpen(false)
      setAddForm({ username: '', password: '', full_name: '', role: 'encoder', office_id: '' })
      loadUsers()
    } catch {
      setAddError('Connection error. Please try again.')
      setSaving(false)
    }
  }

  async function handleChangePassword() {
    setPassError('')
    setPassSuccess('')
    if (!editUser || !newPassword) {
      setPassError('Password is required.')
      return
    }
    if (newPassword.length < 6) {
      setPassError('Password must be at least 6 characters.')
      return
    }
    setSaving(true)

    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/change_user_password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          p_user_id: editUser.id,
          p_new_password: newPassword,
        }),
      })

      const data = await res.json()

      if (!res.ok || data.code) {
        setPassError(data.message ?? data.hint ?? 'Failed to change password.')
      } else {
        setPassSuccess('Password changed successfully!')
        setNewPassword('')
      }
    } catch {
      setPassError('Connection error. Please try again.')
    }
    setSaving(false)
  }

  async function handleDeleteUser() {
    if (!deleteUser) return
    setDeleting(true)
    setDeleteError('')

    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/delete_user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ p_user_id: deleteUser.id }),
      })

      const data = await res.json()

      if (!res.ok || data.code) {
        setDeleteError(data.message ?? data.hint ?? 'Failed to delete user.')
        setDeleting(false)
        return
      }

      setDeleting(false)
      setDeleteDialogOpen(false)
      setDeleteUser(null)
      loadUsers()
    } catch {
      setDeleteError('Connection error. Please try again.')
      setDeleting(false)
    }
  }

  function openEdit(u: ProfileWithOffice) {
    setEditUser(u)
    setForm({ full_name: u.full_name, role: u.role, office_id: u.office_id ?? '', is_active: u.is_active })
    setEditDialogOpen(true)
  }

  function openChangePassword(u: ProfileWithOffice) {
    setEditUser(u)
    setNewPassword('')
    setPassError('')
    setPassSuccess('')
    setPassDialogOpen(true)
  }

  function openDelete(u: ProfileWithOffice) {
    setDeleteUser(u)
    setDeleteError('')
    setDeleteDialogOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{users.length} users registered</p>
        <Button onClick={() => { setAddError(''); setAddDialogOpen(true) }}>
          <Plus className="h-4 w-4 mr-1" /> Add User
        </Button>
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
                <tr key={u.id} className="border-b border-border">
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
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${
                      u.is_active
                        ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                        : 'bg-red-100 text-red-700 border-red-200'
                    }`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(u)}>
                        <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => openChangePassword(u)}>
                        <KeyRound className="h-3.5 w-3.5 mr-1" /> Password
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => openDelete(u)}>
                        <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit User</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Full Name</Label>
              <Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
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
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add User Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add New User</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Username</Label>
              <Input
                placeholder="e.g. juan.dela.cruz"
                value={addForm.username}
                onChange={e => setAddForm(f => ({ ...f, username: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Will become: {addForm.username || 'username'}@limay.gov.ph
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Password</Label>
              <Input
                type="password"
                placeholder="Min. 6 characters"
                value={addForm.password}
                onChange={e => setAddForm(f => ({ ...f, password: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Full Name</Label>
              <Input
                placeholder="Juan Dela Cruz"
                value={addForm.full_name}
                onChange={e => setAddForm(f => ({ ...f, full_name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={addForm.role} onValueChange={v => setAddForm(f => ({ ...f, role: v }))}>
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
              <Select value={addForm.office_id} onValueChange={v => setAddForm(f => ({ ...f, office_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select office" /></SelectTrigger>
                <SelectContent>
                  {offices.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {addError && <p className="text-xs text-destructive">{addError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddUser} disabled={saving}>
              {saving ? 'Creating...' : 'Create User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={passDialogOpen} onOpenChange={setPassDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Change Password — {editUser?.full_name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>New Password</Label>
              <Input
                type="password"
                placeholder="Min. 6 characters"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
              />
            </div>
            {passError && <p className="text-xs text-destructive">{passError}</p>}
            {passSuccess && <p className="text-xs text-emerald-600">{passSuccess}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPassDialogOpen(false)}>Close</Button>
            <Button onClick={handleChangePassword} disabled={saving}>
              {saving ? 'Changing...' : 'Change Password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete User</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <strong>{deleteUser?.full_name}</strong>? This action cannot be undone.
          </p>
          {deleteError && <p className="text-xs text-destructive">{deleteError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteUser} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete User'}
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
      await dbUpdate('offices', new URLSearchParams({ id: `eq.${editOffice.id}` }), form as Record<string, unknown>)
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
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4 mr-1" /> Add Office
        </Button>
      </div>
      {loading ? (
        Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)
      ) : (
        <div className="grid gap-3">
          {offices.map(o => (
            <div key={o.id} className="flex items-center justify-between border border-border rounded-lg px-4 py-3">
              <div>
                <p className="font-medium text-sm">{o.name}</p>
                <p className="text-xs text-muted-foreground">
                  {o.address ?? '—'} &bull; <span className="capitalize">{o.office_type}</span>
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => openEdit(o)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
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
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
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
            <Button onClick={handleSave} disabled={saving}>
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
              <tr key={i}>
                {Array.from({ length: 4 }).map((_, j) => (
                  <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                ))}
              </tr>
            ))
          ) : logs.length === 0 ? (
            <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No logs found</td></tr>
          ) : (
            logs.map(l => (
              <tr key={l.id} className="border-b border-border">
                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(l.created_at).toLocaleString('en-PH')}
                </td>
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
            <TabsTrigger value="users">
              <Users className="h-4 w-4 mr-1.5" /> User Management
            </TabsTrigger>
            <TabsTrigger value="offices">
              <Building2 className="h-4 w-4 mr-1.5" /> Offices
            </TabsTrigger>
            <TabsTrigger value="logs">
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
