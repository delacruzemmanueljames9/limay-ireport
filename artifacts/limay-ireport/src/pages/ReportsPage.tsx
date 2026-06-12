import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Layout } from '@/components/layout/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Printer, Download, FileText } from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { CASE_TYPE_LABELS, CASE_STATUS_LABELS } from '@/types'
import type { CaseType, CaseStatus } from '@/types'

interface ReportRow {
  case_type: CaseType
  status: CaseStatus
  count: number
}

export default function ReportsPage() {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 1)
    return d.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])
  const [filterType, setFilterType] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [rows, setRows] = useState<ReportRow[]>([])
  const [loading, setLoading] = useState(false)
  const [generated, setGenerated] = useState(false)
  const reportRef = useRef<HTMLDivElement>(null)

  async function generateReport() {
    setLoading(true)
    let query = supabase
      .from('cases')
      .select('case_type, status')
      .gte('date_filed', startDate)
      .lte('date_filed', endDate)

    if (filterType !== 'all') query = query.eq('case_type', filterType)
    if (filterStatus !== 'all') query = query.eq('status', filterStatus)

    const { data } = await query
    const counts: Record<string, ReportRow> = {}
    ;(data ?? []).forEach((c: { case_type: CaseType; status: CaseStatus }) => {
      const key = `${c.case_type}_${c.status}`
      if (!counts[key]) counts[key] = { case_type: c.case_type, status: c.status, count: 0 }
      counts[key].count++
    })
    setRows(Object.values(counts).sort((a, b) => b.count - a.count))
    setGenerated(true)
    setLoading(false)
  }

  const chartData = Object.entries(
    rows.reduce((acc: Record<string, Record<string, number>>, row) => {
      const type = CASE_TYPE_LABELS[row.case_type] ?? row.case_type
      if (!acc[type]) acc[type] = {}
      acc[type][CASE_STATUS_LABELS[row.status] ?? row.status] = row.count
      return acc
    }, {})
  ).map(([name, statuses]) => ({ name, ...statuses }))

  const total = rows.reduce((s, r) => s + r.count, 0)

  function handlePrint() { window.print() }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports / Ulat</h1>
          <p className="text-sm text-muted-foreground">Generate summary reports for cases</p>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader><CardTitle className="text-base">Report Parameters</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label>Start Date / Simula</Label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} data-testid="input-start-date" />
              </div>
              <div className="space-y-1.5">
                <Label>End Date / Katapusan</Label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} data-testid="input-end-date" />
              </div>
              <div className="space-y-1.5">
                <Label>Case Type</Label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger data-testid="select-report-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {Object.entries(CASE_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger data-testid="select-report-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {Object.entries(CASE_STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={generateReport} disabled={loading} data-testid="button-generate-report">
                <FileText className="h-4 w-4 mr-2" /> {loading ? 'Generating...' : 'Generate Report'}
              </Button>
              {generated && (
                <Button variant="outline" onClick={handlePrint} data-testid="button-print-report">
                  <Printer className="h-4 w-4 mr-2" /> Print
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {generated && (
          <div ref={reportRef} className="space-y-6">
            {/* Print letterhead (hidden on screen, shown when printing) */}
            <div className="print-only hidden text-center border-b-2 border-gray-800 pb-4 mb-4">
              <p className="text-sm">Republic of the Philippines</p>
              <p className="text-sm">Province of Bataan</p>
              <p className="text-lg font-bold">MUNICIPALITY OF LIMAY</p>
              <p className="text-sm">Municipal Hall, Limay, Bataan</p>
              <p className="text-sm">Tel. No.: (047) XXX-XXXX</p>
              <div className="mt-3">
                <p className="text-base font-bold">LIMAY iREPORT SYSTEM — Summary Report</p>
                <p className="text-sm">Period: {new Date(startDate).toLocaleDateString('en-PH')} to {new Date(endDate).toLocaleDateString('en-PH')}</p>
              </div>
            </div>

            {/* Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Summary — {total} case{total !== 1 ? 's' : ''} from {new Date(startDate).toLocaleDateString('en-PH')} to {new Date(endDate).toLocaleDateString('en-PH')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-border bg-muted/40">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Case Type</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, i) => (
                        <tr key={i} className="border-b border-border">
                          <td className="px-4 py-3">{CASE_TYPE_LABELS[row.case_type]}</td>
                          <td className="px-4 py-3">{CASE_STATUS_LABELS[row.status]}</td>
                          <td className="px-4 py-3 text-right font-bold">{row.count}</td>
                        </tr>
                      ))}
                      <tr className="bg-muted/40 font-semibold">
                        <td className="px-4 py-3" colSpan={2}>TOTAL</td>
                        <td className="px-4 py-3 text-right">{total}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Chart */}
            {chartData.length > 0 && (
              <Card className="no-print">
                <CardHeader><CardTitle className="text-base">Visual Breakdown</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      {Object.keys(CASE_STATUS_LABELS).map((s, i) => {
                        const colors = ['#1B3A6B', '#F5A623', '#10B981', '#8B5CF6', '#6B7280']
                        return <Bar key={s} dataKey={CASE_STATUS_LABELS[s as CaseStatus]} fill={colors[i % colors.length]} />
                      })}
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </Layout>
  )
}
