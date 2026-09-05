import React, { useState, useEffect } from 'react';
import { quotationApi } from '../../api/quotationApi';
import { approvalApi } from '../../api/approvalApi';
import { ScrollText, FileText, CheckCircle, XCircle, Clock } from 'lucide-react';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLogs() {
      try {
        const [quoteRes, approvalRes] = await Promise.all([
          quotationApi.getQuotations(),
          approvalApi.getPendingApprovals().catch(() => ({ success: true, data: [] }))
        ]);
        
        let events = [];

        if (quoteRes.success) {
          quoteRes.data.forEach(q => {
            events.push({
              id: `q-${q.id}-created`,
              date: new Date(q.createdAt),
              type: 'QUOTATION',
              action: 'Quotation Created',
              details: `Quotation ${q.quotationNumber} was created for ${q.customer?.name}`,
              user: q.salesperson?.name || 'System',
              status: 'INFO'
            });

            if (q.status === 'ACCEPTED' || q.status === 'APPROVED' || q.status === 'REJECTED') {
              events.push({
                id: `q-${q.id}-status`,
                date: new Date(q.updatedAt),
                type: 'STATUS_CHANGE',
                action: `Status: ${q.status}`,
                details: `Quotation ${q.quotationNumber} transitioned to ${q.status}`,
                user: 'System',
                status: q.status === 'REJECTED' ? 'ERROR' : 'SUCCESS'
              });
            }
          });
        }

        if (approvalRes.success) {
          approvalRes.data.forEach(a => {
            events.push({
              id: `a-${a.id}`,
              date: new Date(a.createdAt),
              type: 'APPROVAL_REQUEST',
              action: 'Approval Requested',
              details: a.reason || `Approval requested by ${a.requestedBy?.name} for Quotation ${a.quotation?.quotationNumber}`,
              user: a.requestedBy?.name || 'System',
              status: 'WARNING'
            });
          });
        }

        // Sort by date descending
        events.sort((a, b) => b.date - a.date);
        setLogs(events);
      } catch (err) {
        console.error("Failed to load audit logs", err);
      } finally {
        setLoading(false);
      }
    }
    loadLogs();
  }, []);

  const getIcon = (type, status) => {
    if (status === 'SUCCESS') return <CheckCircle size={16} color="#10b981" />;
    if (status === 'ERROR') return <XCircle size={16} color="#ef4444" />;
    if (status === 'WARNING') return <Clock size={16} color="#f59e0b" />;
    return <FileText size={16} color="#3b82f6" />;
  };

  if (loading) return <div style={{ padding: '2rem' }}>Loading audit logs...</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <ScrollText size={28} color="#2563eb" />
        <h1 style={{ fontSize: '24px', fontWeight: '600', color: '#1a1f36', margin: 0 }}>Audit Logs</h1>
      </div>
      
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ padding: '16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontWeight: 600, color: '#475569' }}>
          Recent Activity
        </div>
        
        {logs.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No activity found.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {logs.map((log, i) => (
              <div key={log.id} style={{ 
                display: 'flex', gap: '16px', padding: '16px', 
                borderBottom: i < logs.length - 1 ? '1px solid #f1f5f9' : 'none',
                alignItems: 'flex-start'
              }}>
                <div style={{ marginTop: '2px' }}>
                  {getIcon(log.type, log.status)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.875rem' }}>{log.action}</span>
                    <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{log.date.toLocaleString()}</span>
                  </div>
                  <div style={{ color: '#475569', fontSize: '0.875rem', marginBottom: '4px' }}>{log.details}</div>
                  <div style={{ color: '#64748b', fontSize: '0.75rem' }}>Initiated by <strong>{log.user}</strong></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
