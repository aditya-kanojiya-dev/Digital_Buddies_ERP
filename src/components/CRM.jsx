import React, { useState } from 'react';
import { Plus, Download, FileText, Briefcase, DollarSign, UserCheck } from 'lucide-react';
import { useToast } from './shared/Toast';

export default function CRM({ state, updateState }) {
  const toast = useToast();
  const { leads, clients, proposals, invoices } = state;

  // CRM Sub tabs
  const [crmSubTab, setCrmSubTab] = useState('leads');

  // Form states for Lead creation
  const [leadName, setLeadName] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [leadBudget, setLeadBudget] = useState('');
  const [leadSource, setLeadSource] = useState('Website Lead');

  // Form states for Proposal creation
  const [propClient, setPropClient] = useState('');
  const [propTitle, setPropTitle] = useState('');
  const [propCost, setPropCost] = useState('');
  const [propDetails, setPropDetails] = useState('');

  // Form states for Invoice creation
  const [invClient, setInvClient] = useState('');
  const [invAmount, setInvAmount] = useState('');
  const [invDue, setInvDue] = useState(new Date(Date.now() + 15*24*60*60*1000).toISOString().split('T')[0]);

  // Lead stages
  const stages = ['Lead', 'Qualified', 'Proposal Sent', 'Won'];

  const handleCreateLead = (e) => {
    e.preventDefault();
    if (!leadName) return;

    const newLead = {
      id: `LD${Date.now()}`,
      name: leadName,
      email: leadEmail,
      phone: leadPhone,
      budget: parseFloat(leadBudget) || 100000,
      source: leadSource,
      status: 'Lead'
    };

    updateState({ leads: [...leads, newLead] });
    toast.success(`Lead "${leadName}" added to CRM pipeline`);
    setLeadName('');
    setLeadEmail('');
    setLeadPhone('');
    setLeadBudget('');
  };

  const handleUpdateLeadStatus = (leadId, nextStatus) => {
    // If Won, optionally prompt to create Client
    const lead = leads.find(l => l.id === leadId);
    
    if (nextStatus === 'Won' && lead) {
      const confirmClient = window.confirm(`Lead "${lead.name}" Won! Add to Client roster?`);
      if (confirmClient) {
        const newClient = {
          id: `CL${Date.now()}`,
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          details: `Acquired from ${lead.source}.`,
          department: 'Developers', // Default
          budget: lead.budget,
          startDate: new Date().toISOString().split('T')[0],
          status: 'Active'
        };
        updateState({ clients: [...clients, newClient] });
      }
    }

    const updated = leads.map(l => l.id === leadId ? { ...l, status: nextStatus } : l);
    updateState({ leads: updated });
  };

  const handleCreateProposal = (e) => {
    e.preventDefault();
    if (!propClient || !propCost) return;

    const newProp = {
      id: `PRP${Date.now()}`,
      clientId: propClient,
      title: propTitle || 'Business Proposal Retainer',
      cost: parseFloat(propCost),
      details: propDetails,
      status: 'Sent',
      date: new Date().toISOString().split('T')[0]
    };

    updateState({ proposals: [...proposals, newProp] });

    // Download Proposal Text
    const propText = `
========================================
DIGITAL BUDDIES BUSINESS PROPOSAL
========================================
Proposal Reference: ${newProp.id}
Client: ${newProp.clientId}
Date: ${newProp.date}

Project Scope:
${newProp.title}

Cost Estimate Retainer: ₹${newProp.cost.toLocaleString()}

Deliverable Terms:
${newProp.details || 'Regular consulting and execution of deliverables as finalized.'}

Thank you for selecting Digital Buddies.
========================================
`;
    const blob = new Blob([propText], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Proposal_${newProp.id}.txt`;
    a.click();

    toast.success('Proposal saved and exported.');
    setPropTitle('');
    setPropCost('');
    setPropDetails('');
  };

  const handleCreateInvoice = (e) => {
    e.preventDefault();
    if (!invClient || !invAmount) return;

    const newInv = {
      id: `INV${Date.now()}`,
      clientId: invClient,
      amount: parseFloat(invAmount),
      dueDate: invDue,
      status: 'Unpaid'
    };

    updateState({ invoices: [...invoices, newInv] });

    const invoiceText = `
========================================
INVOICE - DIGITAL BUDDIES
========================================
Invoice Reference: ${newInv.id}
Client: ${newInv.clientId}
Due Date: ${newInv.dueDate}

Total Amount Due: ₹${newInv.amount.toLocaleString()}
Payment Status: UNPAID

Bank Wire Instructions:
Bank: space Bank Ltd.
A/C No: 1234567890
IFSC: SPACE000123
========================================
`;
    const blob = new Blob([invoiceText], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Invoice_${newInv.id}.txt`;
    a.click();

    toast.success('Invoice logged and downloaded.');
    setInvAmount('');
  };

  const handleToggleInvoicePaid = (invId) => {
    const updated = invoices.map(i => {
      if (i.id === invId) {
        return { ...i, status: i.status === 'Paid' ? 'Unpaid' : 'Paid' };
      }
      return i;
    });
    updateState({ invoices: updated });
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Sub tabs navigation */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-4">
        {[
          { id: 'leads', label: 'Lead Funnel Pipeline', icon: Briefcase },
          { id: 'clients', label: 'Client Directory', icon: UserCheck },
          { id: 'proposals', label: 'Proposal Center', icon: FileText },
          { id: 'invoices', label: 'Invoice Ledger', icon: DollarSign }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setCrmSubTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
                crmSubTab === tab.id 
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20' 
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* -------------------------
          SUBTAB: LEADS FUNNEL
          ------------------------- */}
      {crmSubTab === 'leads' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {stages.map(stage => {
              const stageLeads = leads.filter(l => l.status === stage);
              return (
                <div key={stage} className="bg-slate-950/45 p-4 rounded-xl border border-slate-900 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-slate-300">{stage}</h3>
                    <span className="bg-slate-800 text-slate-300 text-3xs px-2 py-0.5 rounded-full font-mono">
                      {stageLeads.length}
                    </span>
                  </div>

                  <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                    {stageLeads.length === 0 ? (
                      <p className="text-3xs text-slate-600 text-center py-8">No leads</p>
                    ) : (
                      stageLeads.map(ld => (
                        <div key={ld.id} className="glass-card p-4 rounded-xl space-y-2 border-l-2 border-l-violet-500">
                          <div>
                            <h4 className="font-bold text-xs text-slate-200">{ld.name}</h4>
                            <p className="text-3xs text-slate-400">{ld.email}</p>
                            <p className="text-3xs text-slate-500 font-mono mt-1">Budget: ₹{ld.budget.toLocaleString()}</p>
                          </div>
                          <div className="flex gap-1 justify-end pt-1">
                            {stage !== 'Lead' && (
                              <button
                                onClick={() => handleUpdateLeadStatus(ld.id, stages[stages.indexOf(stage) - 1])}
                                className="px-1.5 py-0.5 bg-slate-850 hover:bg-slate-750 text-slate-300 rounded text-3xs transition cursor-pointer"
                              >
                                ◀
                              </button>
                            )}
                            {stage !== 'Won' && (
                              <button
                                onClick={() => handleUpdateLeadStatus(ld.id, stages[stages.indexOf(stage) + 1])}
                                className="px-1.5 py-0.5 bg-violet-600 hover:bg-violet-700 text-white rounded text-3xs transition cursor-pointer font-bold"
                              >
                                ▶
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Lead Creation Form */}
          <div className="glass-panel p-6 rounded-2xl max-w-xl mx-auto space-y-5">
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Plus className="w-5 h-5 text-violet-400" /> Log Incoming Lead
            </h3>
            <form onSubmit={handleCreateLead} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Company / Lead Name</label>
                  <input
                    type="text"
                    value={leadName}
                    onChange={(e) => setLeadName(e.target.value)}
                    className="w-full glass-input p-3 rounded-xl text-sm"
                    placeholder="Alpha Gyms"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Project Budget (₹)</label>
                  <input
                    type="number"
                    value={leadBudget}
                    onChange={(e) => setLeadBudget(e.target.value)}
                    className="w-full glass-input p-3 rounded-xl text-sm"
                    placeholder="200000"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Email</label>
                  <input
                    type="email"
                    value={leadEmail}
                    onChange={(e) => setLeadEmail(e.target.value)}
                    className="w-full glass-input p-3 rounded-xl text-sm"
                    placeholder="info@leads.com"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Phone</label>
                  <input
                    type="text"
                    value={leadPhone}
                    onChange={(e) => setLeadPhone(e.target.value)}
                    className="w-full glass-input p-3 rounded-xl text-sm"
                    placeholder="+91 99999..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Lead Traffic Source</label>
                <select
                  value={leadSource}
                  onChange={(e) => setLeadSource(e.target.value)}
                  className="w-full glass-input p-3 rounded-xl text-sm"
                >
                  <option value="Website Lead">Website Lead</option>
                  <option value="Cold Outreach">Cold Outreach</option>
                  <option value="Referral">Referral Referral</option>
                  <option value="Meta Ads">Meta Ads</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full bg-violet-650 hover:bg-violet-755 py-3 rounded-xl text-sm text-white font-bold transition cursor-pointer"
              >
                Log Lead Profile
              </button>
            </form>
          </div>
        </div>
      )}

      {/* -------------------------
          SUBTAB: CLIENTS
          ------------------------- */}
      {crmSubTab === 'clients' && (
        <div className="glass-panel p-6 rounded-2xl space-y-6">
          <h3 className="text-lg font-bold text-slate-100">Retained Client Directory</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase">
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4">Project Retainer Budget</th>
                  <th className="py-3 px-4">Start Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-slate-300">
                {clients.map(c => (
                  <tr key={c.id} className="hover:bg-slate-900/20">
                    <td className="py-3.5 px-4 font-semibold text-slate-200">{c.name}</td>
                    <td className="py-3.5 px-4">{c.email}</td>
                    <td className="py-3.5 px-4">{c.phone || '--'}</td>
                    <td className="py-3.5 px-4 font-mono">₹{c.budget.toLocaleString()}</td>
                    <td className="py-3.5 px-4">{c.startDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* -------------------------
          SUBTAB: PROPOSALS
          ------------------------- */}
      {crmSubTab === 'proposals' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="glass-panel p-6 rounded-2xl lg:col-span-1 space-y-5">
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <FileText className="w-5 h-5 text-violet-400" /> Create Business Proposal
            </h3>
            <form onSubmit={handleCreateProposal} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Target Client</label>
                <input
                  type="text"
                  value={propClient}
                  onChange={(e) => setPropClient(e.target.value)}
                  className="w-full glass-input p-3 rounded-xl text-sm"
                  placeholder="e.g. Horizon Tech"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Proposal Subject Title</label>
                <input
                  type="text"
                  value={propTitle}
                  onChange={(e) => setPropTitle(e.target.value)}
                  className="w-full glass-input p-3 rounded-xl text-sm"
                  placeholder="e.g. Mobile App Redesign Campaign"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Cost Quotation Estimate (₹)</label>
                <input
                  type="number"
                  value={propCost}
                  onChange={(e) => setPropCost(e.target.value)}
                  className="w-full glass-input p-3 rounded-xl text-sm"
                  placeholder="150000"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Scope & Detail Specifications</label>
                <textarea
                  value={propDetails}
                  onChange={(e) => setPropDetails(e.target.value)}
                  className="w-full glass-input p-3 rounded-xl text-sm h-20"
                  placeholder="Write terms, deliverables here..."
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-violet-650 hover:bg-violet-755 py-3 rounded-xl text-sm text-white font-bold transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" /> Download & Save Proposal
              </button>
            </form>
          </div>

          <div className="glass-panel p-6 rounded-2xl lg:col-span-2 space-y-6">
            <h3 className="text-lg font-bold text-slate-100">Sent Proposals History</h3>
            <div className="space-y-4">
              {proposals.map(p => (
                <div key={p.id} className="glass-card p-5 rounded-2xl flex items-center justify-between border-l-2 border-l-violet-500">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-2xs bg-violet-600/15 text-violet-400 px-2 py-0.5 rounded font-mono font-bold">
                        {p.status}
                      </span>
                      <span className="text-3xs text-slate-400">{p.date}</span>
                    </div>
                    <h4 className="font-bold text-sm text-slate-200">{p.title}</h4>
                    <p className="text-xs text-slate-450">Client Reference: {p.clientId}</p>
                  </div>
                  <span className="text-emerald-400 font-bold font-mono text-sm">
                    ₹{p.cost.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* -------------------------
          SUBTAB: INVOICES
          ------------------------- */}
      {crmSubTab === 'invoices' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="glass-panel p-6 rounded-2xl lg:col-span-1 space-y-5">
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-violet-400" /> Issue Invoice Bill
            </h3>
            <form onSubmit={handleCreateInvoice} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Choose Client Roster</label>
                <select
                  value={invClient}
                  onChange={(e) => setInvClient(e.target.value)}
                  className="w-full glass-input p-3 rounded-xl text-sm"
                  required
                >
                  <option value="">-- Select Client --</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Billing Amount (₹)</label>
                <input
                  type="number"
                  value={invAmount}
                  onChange={(e) => setInvAmount(e.target.value)}
                  className="w-full glass-input p-3 rounded-xl text-sm"
                  placeholder="80000"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Due Date</label>
                <input
                  type="date"
                  value={invDue}
                  onChange={(e) => setInvDue(e.target.value)}
                  className="w-full glass-input p-3 rounded-xl text-sm"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-violet-650 hover:bg-violet-755 py-3 rounded-xl text-sm text-white font-bold transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" /> Download & Save Invoice
              </button>
            </form>
          </div>

          <div className="glass-panel p-6 rounded-2xl lg:col-span-2 space-y-6">
            <h3 className="text-lg font-bold text-slate-100">Invoice Ledger Payments</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase">
                    <th className="py-3 px-4">Invoice ID</th>
                    <th className="py-3 px-4">Client</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Payment Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 text-slate-350">
                  {invoices.map(inv => (
                    <tr key={inv.id} className="hover:bg-slate-900/20">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-300">{inv.id}</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-200">{inv.clientId}</td>
                      <td className="py-3.5 px-4">{inv.dueDate}</td>
                      <td className="py-3.5 px-4 font-mono">₹{inv.amount.toLocaleString()}</td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-3xs font-bold uppercase ${
                          inv.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleToggleInvoicePaid(inv.id)}
                          className="bg-slate-900/60 hover:bg-slate-900 px-2 py-1 rounded border border-slate-800 transition cursor-pointer text-3xs font-bold"
                        >
                          Mark {inv.status === 'Paid' ? 'Unpaid' : 'Paid'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
