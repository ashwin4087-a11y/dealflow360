import React, { useEffect, useState } from 'react';
import { X, Plus, Trash2, Check, RefreshCw } from 'lucide-react';
import { approvalApi } from '../../../api/approvalApi';

export default function TriggerRulesModal({ onClose }) {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    try {
      setLoading(true);
      const res = await approvalApi.getRules();
      setRules(res.data || []);
      setError(null);
    } catch (err) {
      setError("Failed to load trigger rules.");
    } finally {
      setLoading(false);
    }
  };

  const saveRules = async () => {
    try {
      setSaving(true);
      await approvalApi.saveRules(rules);
      onClose();
    } catch (err) {
      setError("Failed to save rules.");
      setSaving(false);
    }
  };

  const addRule = () => {
    setRules([...rules, {
      name: "New Rule",
      minBlendedDiscountPercent: "0.00",
      requiresLineViolation: false,
      requiresManager: true,
      requiresFinance: false,
      active: true,
      priority: rules.length + 1
    }]);
  };

  const updateRule = (index, field, value) => {
    const updated = [...rules];
    updated[index] = { ...updated[index], [field]: value };
    setRules(updated);
  };

  const removeRule = (index) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  return (
    <div className="simulator-overlay">
      <div className="simulator-panel" style={{ width: '800px', maxWidth: '95vw' }}>
        <header className="simulator-header">
          <div>
            <h2>Approval Trigger Rules</h2>
            <p className="simulator-note" style={{margin: '4px 0 0'}}>Configure automation logic for Deal Health evaluation.</p>
          </div>
          <button className="icon-button" onClick={onClose} disabled={saving}><X size={18} /></button>
        </header>

        <div className="simulator-body" style={{ background: '#fafbf9' }}>
          {error && <div className="alert-box error" style={{marginBottom: '16px'}}>{error}</div>}
          
          {loading ? (
            <div className="empty-state">Loading rules...</div>
          ) : (
            <div className="rules-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {rules.map((rule, index) => (
                <div key={index} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '6px', padding: '16px', position: 'relative' }}>
                  <button className="icon-button" onClick={() => removeRule(index)} style={{ position: 'absolute', top: '12px', right: '12px', color: 'var(--red)' }}><Trash2 size={16} /></button>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '12px' }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', fontWeight: 600 }}>
                      Rule Name
                      <input 
                        value={rule.name} 
                        onChange={(e) => updateRule(index, 'name', e.target.value)}
                        style={{ padding: '8px', border: '1px solid var(--border)', borderRadius: '4px' }} 
                      />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', fontWeight: 600 }}>
                      Min Discount %
                      <input 
                        type="number" 
                        step="0.01" 
                        value={rule.minBlendedDiscountPercent} 
                        onChange={(e) => updateRule(index, 'minBlendedDiscountPercent', e.target.value)}
                        style={{ padding: '8px', border: '1px solid var(--border)', borderRadius: '4px' }} 
                      />
                    </label>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '20px', fontSize: '13px', color: 'var(--ink)' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input type="checkbox" checked={rule.requiresLineViolation} onChange={(e) => updateRule(index, 'requiresLineViolation', e.target.checked)} />
                      Requires Line Violation
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input type="checkbox" checked={rule.requiresManager} onChange={(e) => updateRule(index, 'requiresManager', e.target.checked)} />
                      Requires Manager
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input type="checkbox" checked={rule.requiresFinance} onChange={(e) => updateRule(index, 'requiresFinance', e.target.checked)} />
                      Requires Finance
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input type="checkbox" checked={rule.active} onChange={(e) => updateRule(index, 'active', e.target.checked)} />
                      Active
                    </label>
                  </div>
                </div>
              ))}
              
              <button className="secondary-button" onClick={addRule} style={{ alignSelf: 'flex-start', marginTop: '4px' }}>
                <Plus size={14} /> Add Rule
              </button>
            </div>
          )}
        </div>

        <footer className="simulator-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button className="secondary-button" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="primary-button" onClick={saveRules} disabled={loading || saving}>
            {saving ? <RefreshCw size={14} className="spin" /> : <Check size={14} />} 
            Save Configuration
          </button>
        </footer>
      </div>
    </div>
  );
}
