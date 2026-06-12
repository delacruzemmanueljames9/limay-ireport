import { useState, useEffect } from 'react'
import { useLocation } from 'wouter'
import { FolderOpen, Clock, CheckCircle, ArrowLeftRight, AlertTriangle, TrendingUp } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Layout } from '@/components/layout/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
} from 'recharts'
import { CASE_TYPE_LABELS, CASE_STATUS_LABELS } from '@/types'
import type { CaseStatus, CaseType } from '@/types'

const STATUS_COLORS: Record<string, string> = {
  open: '#2B5BA8',
  ongoing: '#F59E0B',
  resolved: '#10B981',
  referred: '#8B5CF6',
  closed: '#6B7280',
}

const TYPE_COLORS = ['#1B3A6B', '#F5A623', '#10B981', '#8B5CF6']

export default function DashboardPage() {
  const { profile } = useAuth()
  const [, setLocation] = useLocation()
  const [stats, setStats] = useState({ total: 0, open: 0, ongoing: 0, resolved: 0, pending_referrals: 0 })
  const [monthlyData, setMonthlyData] = useState<{ month: string; cases: number }[]>([])
  const [typeData, setTypeData] = useState<{ name: string; value: number }[]>([])
  const [recentLogs, setRecentLogs] = useState<{ id: string; new_status: string; created_at: string; case_id: string }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [casesRes, referralsRes, logsRes] = await Promise.all([
        supabase.from('cases').select('id, status, case_type, created_at'),
        supabase.from('referrals').select('id, status').eq('status', 'sent'),
        supabase.from('case_status_logs').select('id, new_status, created_at, case_id').order('created_at', { ascending: false }).limit(10),
      ])

      const cases = (casesRes.data ?? []) as { id: string; status: CaseStatus; case_type: CaseType; created_at: string }[]
      setStats({
        total: cases.length,
        open: cases.filter(c => c.status === 'open').length,
        ongoing: cases.filter(c => c.status === 'ongoing').length,
        resolved: cases.filter(c => c.status === 'resolved').length,
        pending_referrals: (referralsRes.data ?? []).length,
      })

      // Monthly data (last 6 months)
      const now = new Date()
      const monthly: Record<string, number> = {}
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const key = d.toLocaleString('en-PH', { month: 'short' })
        monthly[key] = 0
      }
      cases.forEach(c => {
        const d = new Date(c.created_at)
        const key = d.toLocaleString('en-PH', { month: 'short' })
        if (key in monthly) monthly[key]++
      })
      setMonthlyData(Object.entries(monthly).map(([month, cases]) => ({ month, cases })))

      // Type breakdown
      const typeCounts: Record<string, number> = {}
      cases.forEach(c => {
        typeCounts[c.case_type] = (typeCounts[c.case_type] ?? 0) + 1
      })
      setTypeData(Object.entries(typeCounts).map(([key, value]) => ({
        name: CASE_TYPE_LABELS[key as CaseType] ?? key,
        value,
      })))

      setRecentLogs((logsRes.data ?? []) as typeof recentLogs)
      setLoading(false)
    }
    load()
  }, [])

  const statCards = [
    { label: 'Total Cases', value: stats.total, icon: FolderOpen, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Open / Bukas', value: stats.open, icon: AlertTriangle, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Ongoing', value: stats.ongoing, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Resolved / Nalutas', value: stats.resolved, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ]

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            {profile?.office?.name ?? 'All offices'} &mdash; Overview
          </p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map(({ label, value, icon: Icon, color, bg }) => (
            <Card key={label} data-testid={`stat-${label.toLowerCase().replace(/\s+/g, '-')}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
                    <p className={`text-3xl font-bold mt-1 ${color}`}>
                      {loading ? '—' : value}
                    </p>
                  </div>
                  <div className={`${bg} p-2.5 rounded-lg`}>
                    <Icon className={`h-5 w-5 ${color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Pending referrals alert */}
        {stats.pending_referrals > 0 && (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            <ArrowLeftRight className="h-4 w-4 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-800">
              <span className="font-semibold">{stats.pending_referrals}</span> pending referral{stats.pending_referrals > 1 ? 's' : ''} awaiting response
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Monthly trend */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> Monthly Case Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="cases" stroke="hsl(218,64%,28%)" strokeWidth={2} dot={{ fill: 'hsl(218,64%,28%)' }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Case by type */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Cases by Type</CardTitle>
            </CardHeader>
            <CardContent>
              {typeData.length === 0 ? (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={typeData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                      {typeData.map((_, i) => <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent activity */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {recentLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Walang datos / No recent activity</p>
            ) : (
              <div className="space-y-2">
                {recentLogs.map(log => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0 cursor-pointer hover:bg-muted/30 -mx-2 px-2 rounded"
                    onClick={() => setLocation(`/cases/${log.case_id}`)}
                    data-testid={`activity-log-${log.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[log.new_status] ?? '#6B7280' }} />
                      <span className="text-sm text-foreground">
                        Status changed to <span className="font-medium">{CASE_STATUS_LABELS[log.new_status as CaseStatus] ?? log.new_status}</span>
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(log.created_at).toLocaleDateString('en-PH')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
