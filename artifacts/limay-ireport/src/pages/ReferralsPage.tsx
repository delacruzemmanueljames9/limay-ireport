import { useAuth } from '@/contexts/AuthContext'
import { useReferrals } from '@/hooks/useReferrals'
import { Layout } from '@/components/layout/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeftRight, CheckCircle, XCircle } from 'lucide-react'
import { useLocation } from 'wouter'
import { REFERRAL_STATUS_LABELS } from '@/types'
import type { Referral, ReferralStatus } from '@/types'

const STATUS_BADGE: Record<ReferralStatus, string> = {
  sent: 'bg-blue-100 text-blue-700 border-blue-200',
  received: 'bg-amber-100 text-amber-700 border-amber-200',
  acknowledged: 'bg-purple-100 text-purple-700 border-purple-200',
  completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
}

function ReferralRow({ referral, showActions, onUpdate }: { referral: Referral; showActions: boolean; onUpdate: (id: string, status: string) => void }) {
  const [, setLocation] = useLocation()
  return (
    <div
      className="border border-border rounded-lg p-4 hover:bg-muted/20 transition-colors cursor-pointer"
      onClick={() => referral.case_id && setLocation(`/cases/${referral.case_id}`)}
      data-testid={`referral-${referral.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs font-semibold text-primary">
              {(referral.case as any)?.case_number ?? 'No case number'}
            </span>
            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_BADGE[referral.status]}`}>
              {REFERRAL_STATUS_LABELS[referral.status]}
            </span>
          </div>
          <p className="text-sm font-medium">
            From: <span className="text-muted-foreground">{(referral.from_office as any)?.name ?? '—'}</span>
          </p>
          <p className="text-sm font-medium">
            To: <span className="text-muted-foreground">{(referral.to_office as any)?.name ?? '—'}</span>
          </p>
          {referral.referral_reason && (
            <p className="text-sm text-muted-foreground line-clamp-2">{referral.referral_reason}</p>
          )}
          <p className="text-xs text-muted-foreground">{new Date(referral.referral_date).toLocaleDateString('en-PH')}</p>
        </div>

        {showActions && (
          <div className="flex flex-col gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
            {referral.status === 'sent' && (
              <Button size="sm" variant="outline" onClick={() => onUpdate(referral.id, 'received')} data-testid={`button-receive-${referral.id}`}>
                <CheckCircle className="h-3 w-3 mr-1" /> Receive
              </Button>
            )}
            {referral.status === 'received' && (
              <Button size="sm" variant="outline" onClick={() => onUpdate(referral.id, 'acknowledged')} data-testid={`button-acknowledge-${referral.id}`}>
                Acknowledge
              </Button>
            )}
            {referral.status === 'acknowledged' && (
              <Button size="sm" onClick={() => onUpdate(referral.id, 'completed')} data-testid={`button-complete-${referral.id}`}>
                Complete
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function ReferralsPage() {
  const { profile } = useAuth()
  const { sent, received, loading, pulse, updateStatus } = useReferrals(profile?.office_id)
  const canWrite = profile?.role !== 'viewer'

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Referrals</h1>
            <p className="text-sm text-muted-foreground">Inter-agency case referrals for {profile?.office?.name ?? 'your office'}</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium mt-1" data-testid="referrals-live-indicator">
            <span className={`h-1.5 w-1.5 rounded-full bg-emerald-500 ${pulse ? 'animate-ping' : 'animate-pulse'}`} />
            LIVE
          </div>
        </div>

        <Tabs defaultValue="inbox">
          <TabsList>
            <TabsTrigger value="inbox" data-testid="tab-inbox">
              Received Inbox
              {received.filter(r => r.status === 'sent').length > 0 && (
                <span className="ml-2 bg-destructive text-destructive-foreground text-xs rounded-full px-1.5 py-0.5">
                  {received.filter(r => r.status === 'sent').length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="sent" data-testid="tab-sent">Sent Referrals</TabsTrigger>
          </TabsList>

          <TabsContent value="inbox" className="mt-4 space-y-3">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)
            ) : received.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ArrowLeftRight className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p>No referrals received yet</p>
              </div>
            ) : (
              received.map(r => (
                <ReferralRow key={r.id} referral={r} showActions={canWrite} onUpdate={updateStatus} />
              ))
            )}
          </TabsContent>

          <TabsContent value="sent" className="mt-4 space-y-3">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)
            ) : sent.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ArrowLeftRight className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p>No referrals sent yet</p>
              </div>
            ) : (
              sent.map(r => (
                <ReferralRow key={r.id} referral={r} showActions={false} onUpdate={updateStatus} />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  )
}
