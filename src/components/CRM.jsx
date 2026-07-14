import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  Plus, Download, Briefcase, DollarSign, UserCheck, FileText, Search,
  X, Edit3, Trash2, Upload, Check, AlertCircle, Save, Users, User,
  Filter, ArrowLeft, TrendingUp
} from 'lucide-react';
import { useToast } from './shared/Toast';
import { Modal, ConfirmDialog, Button, DatePicker } from './ui';
import { DonutChart, BarChart } from './ui';
import { db } from '../data/db';
import { today as todayStr } from '../lib/format';
import * as XLSX from 'xlsx';

const LEAD_SOURCES = ['Website Lead', 'Cold Outreach', 'Referral', 'Meta Ads', 'LinkedIn', 'Google Ads', 'Other'];
const LEAD_STAGES = ['Lead', 'Qualified', 'Proposal Sent', 'Won', 'Lost'];
const DEPARTMENTS = ['General', 'Developers', 'Social Media', 'Paid Ads', 'Video Editors', 'Graphic Designers', 'Videography/Photography', 'HR'];

export default function CRM({ state, updateState }) {
  const toast = useToast();
  const { leads, clients, proposals, invoices, projects, employees } = state;

  const [crmSubTab, setCrmSubTab] = useState('leads');

  // Drag state
  const [dragOverStage, setDragOverStage] = useState(null);

  // ── Modal states ──────────────────────────────────────────────────────────
  const [showAddClient, setShowAddClient] = useState(false);
  const [showCSVImport, setShowCSVImport] = useState(false);
  const [showLeadDetail, setShowLeadDetail] = useState(false);
  const [showClientDetail, setShowClientDetail] = useState(false);

  // ── Selected items ────────────────────────────────────────────────────────
  const [selectedLead, setSelectedLead] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);

  // ── Client form state ─────────────────────────────────────────────────────
  const [clientForm, setClientForm] = useState({
    name: '', email: '', phone: '', department: 'General', budget: '',
    startDate: todayStr(), status: 'Active', notes: '', assignedTo: '', source: 'Direct Add',
  });
  const resetClientForm = () => setClientForm({
    name: '', email: '', phone: '', department: 'General', budget: '',
    startDate: todayStr(), status: 'Active', notes: '', assignedTo: '', source: 'Direct Add',
  });
  const fillClientForm = (data) => setClientForm(prev => ({ ...prev, ...data }));

  // ── Lead form states ──────────────────────────────────────────────────────
  const [leadName, setLeadName] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [leadBudget, setLeadBudget] = useState('');
  const [leadSource, setLeadSource] = useState('Website Lead');
  const [leadAssignedTo, setLeadAssignedTo] = useState('');
  const [leadNotes, setLeadNotes] = useState('');

  // ── Proposal / Invoice form states ────────────────────────────────────────
  const [propClient, setPropClient] = useState('');
  const [propTitle, setPropTitle] = useState('');
  const [propCost, setPropCost] = useState('');
  const [propDetails, setPropDetails] = useState('');
  const [invClient, setInvClient] = useState('');
  const [invAmount, setInvAmount] = useState('');
  const [invDue, setInvDue] = useState(new Date(Date.now() + 15*24*60*60*1000).toISOString().split('T')[0]);

  // ── Client directory filters ──────────────────────────────────────────────
  const [clientSearch, setClientSearch] = useState('');
  const [clientDeptFilter, setClientDeptFilter] = useState('');
  const [clientStatusFilter, setClientStatusFilter] = useState('');

  // ── CSV Import state ─────────────────────────────────────────────────────
  const [csvStep, setCsvStep] = useState(1);
  const [csvRawData, setCsvRawData] = useState([]);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvMapping, setCsvMapping] = useState({});
  const [csvPreview, setCsvPreview] = useState([]);
  const [csvErrors, setCsvErrors] = useState([]);
  const fileInputRef = useRef(null);

  // ════════════════════════════════════════════════════════════════════════
  //  COMPUTED
  // ════════════════════════════════════════════════════════════════════════

  const filteredClients = useMemo(() => {
    let list = [...clients];
    if (clientSearch) {
      const q = clientSearch.toLowerCase();
      list = list.filter(c => c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q));
    }
    if (clientDeptFilter) list = list.filter(c => c.department === clientDeptFilter);
    if (clientStatusFilter) list = list.filter(c => c.status === clientStatusFilter);
    return list;
  }, [clients, clientSearch, clientDeptFilter, clientStatusFilter]);

  const totalBilled = (clientId) =>
    invoices.filter(i => i.clientId === clientId && i.status === 'Paid').reduce((s, i) => s + (i.amount || 0), 0);

  const stageLeads = (stage) => leads.filter(l => l.status === stage).length;
  const totalLeads = leads.length;
  const wonLeads = leads.filter(l => l.status === 'Won').length;
  const lostLeads = leads.filter(l => l.status === 'Lost').length;
  const conversionRate = totalLeads > 0 ? ((wonLeads / totalLeads) * 100).toFixed(1) : '0.0';

  const leadSourceData = useMemo(() => {
    const counts = {};
    leads.forEach(l => {
      const src = l.source || 'Unknown';
      counts[src] = (counts[src] || 0) + 1;
    });
    return Object.entries(counts).map(([label, value]) => ({ label, value }));
  }, [leads]);

  const stageFunnelData = useMemo(() => {
    return LEAD_STAGES.filter(s => s !== 'Lost').map(stage => ({
      label: stage,
      value: leads.filter(l => l.status === stage).length,
    }));
  }, [leads]);

  // ════════════════════════════════════════════════════════════════════════
  //  LEAD HANDLERS
  // ════════════════════════════════════════════════════════════════════════

  const handleCreateLead = (e) => {
    e.preventDefault();
    if (!leadName) return;
    const newLead = {
      id: `LD${Date.now()}`,
      name: leadName, email: leadEmail, phone: leadPhone,
      budget: parseFloat(leadBudget) || 100000, source: leadSource,
      status: 'Lead', assignedTo: leadAssignedTo || null, notes: leadNotes || '',
    };
    updateState({ leads: [...leads, newLead] });
    toast.success(`Lead "${leadName}" added`);
    setLeadName(''); setLeadEmail(''); setLeadPhone(''); setLeadBudget('');
    setLeadNotes(''); setLeadAssignedTo('');
  };

  const handleDragStart = (e, leadId) => {
    e.dataTransfer.setData('text/plain', leadId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOverStage = (e, stage) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverStage(stage);
  };

  const handleDropOnStage = (e, targetStage) => {
    e.preventDefault();
    setDragOverStage(null);
    const leadId = e.dataTransfer.getData('text/plain');
    if (!leadId) return;
    const lead = leads.find(l => l.id === leadId);
    if (!lead || lead.status === targetStage) return;

    // Lost stage prompts for reason
    if (targetStage === 'Lost') {
      setSelectedLead(lead);
      setShowLostPrompt(true);
      return;
    }

    doLeadStatusChange(leadId, targetStage);
  };

  const doLeadStatusChange = (leadId, targetStage) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;

    const updated = leads.map(l => l.id === leadId ? { ...l, status: targetStage } : l);
    const notifs = [];

    // Won → prompt to convert to client
    if (targetStage === 'Won' && lead) {
      fillClientForm({
        name: lead.name, email: lead.email || '', phone: lead.phone || '',
        source: 'Lead Conversion', convertedFromLeadId: lead.id,
        notes: `Acquired from ${lead.source || 'Unknown source'}.\n${lead.notes || ''}`,
        budget: String(lead.budget || ''),
      });
      setShowAddClient(true);
    }

    updateState({ leads: updated, ...(notifs.length ? { notifications: notifs } : {}) });
    toast.success(`Lead moved to ${targetStage}`);
  };

  // Lost reason prompt
  const [showLostPrompt, setShowLostPrompt] = useState(false);
  const [lostReason, setLostReason] = useState('');

  const handleConfirmLost = () => {
    if (!selectedLead) return;
    const updated = leads.map(l =>
      l.id === selectedLead.id
        ? { ...l, status: 'Lost', notes: l.notes ? `${l.notes}\nLost reason: ${lostReason}` : `Lost reason: ${lostReason}` }
        : l
    );
    updateState({ leads: updated });
    toast.success('Lead marked as Lost');
    setShowLostPrompt(false);
    setLostReason('');
    setSelectedLead(null);
  };

  // Open lead detail
  const handleOpenLeadDetail = (lead) => {
    setSelectedLead(lead);
    setShowLeadDetail(true);
  };

  // ════════════════════════════════════════════════════════════════════════
  //  CLIENT HANDLERS
  // ════════════════════════════════════════════════════════════════════════

  const handleSaveClient = (e) => {
    e.preventDefault();
    if (!clientForm.name) return;
    const clientId = selectedClient?.id || `CL${Date.now()}`;
    const newClient = {
      id: clientId,
      name: clientForm.name,
      email: clientForm.email,
      phone: clientForm.phone,
      department: clientForm.department,
      budget: parseFloat(clientForm.budget) || 0,
      startDate: clientForm.startDate || todayStr(),
      status: clientForm.status,
      notes: clientForm.notes || '',
      assignedTo: clientForm.assignedTo || null,
      source: clientForm.source || 'Direct Add',
      convertedFromLeadId: clientForm.convertedFromLeadId || null,
    };

    if (selectedClient) {
      updateState({ clients: clients.map(c => c.id === clientId ? { ...c, ...newClient } : c) });
      toast.success('Client updated');
    } else {
      updateState({ clients: [...clients, newClient] });
      toast.success(`Client "${clientForm.name}" added`);
    }
    setShowAddClient(false);
    setShowClientDetail(false);
    setSelectedClient(null);
    resetClientForm();
  };

  const handleDeleteClient = async () => {
    if (!selectedClient) return;
    const fresh = await db.deleteClient(selectedClient.id);
    updateState({ clients: fresh });
    toast.success('Client deleted');
    setShowClientDetail(false);
    setSelectedClient(null);
  };

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // ════════════════════════════════════════════════════════════════════════
  //  CSV/EXCEL IMPORT
  // ════════════════════════════════════════════════════════════════════════

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();

    if (ext === 'csv') {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const text = evt.target.result;
        import('papaparse').then(({ default: Papa }) => {
          const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
          processParsedData(parsed.data, parsed.meta.fields);
        });
      };
      reader.readAsText(file);
    } else if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        if (json.length > 0) {
          processParsedData(json, Object.keys(json[0]));
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      toast.error('Please upload a .csv or .xlsx/.xls file');
    }
  };

  const processParsedData = (data, fields) => {
    setCsvRawData(data);
    setCsvHeaders(fields);
    setCsvPreview(data.slice(0, 5));

    // Auto-map fields
    const autoMap = {};
    const fieldMap = {
      'name': ['name', 'client', 'company', 'client name', 'company name', 'lead name'],
      'email': ['email', 'e-mail', 'mail', 'email address'],
      'phone': ['phone', 'mobile', 'telephone', 'contact', 'phone number'],
      'department': ['department', 'dept', 'service', 'type'],
      'budget': ['budget', 'amount', 'revenue', 'value', 'project budget'],
      'startDate': ['start date', 'start', 'start_date', 'date'],
      'status': ['status', 'state', 'current status'],
      'notes': ['notes', 'note', 'comments', 'remarks', 'description'],
    };
    fields.forEach(f => {
      const lower = f.toLowerCase().trim();
      for (const [key, aliases] of Object.entries(fieldMap)) {
        if (aliases.includes(lower) && !autoMap[key]) {
          autoMap[key] = f;
          break;
        }
      }
    });
    setCsvMapping(autoMap);
    setCsvErrors([]);
    setCsvStep(2);
  };

  const handleCsvImport = () => {
    const errors = [];
    const valid = [];
    const mappedKeys = Object.keys(csvMapping).filter(k => csvMapping[k]);

    csvRawData.forEach((row, i) => {
      if (!row[csvMapping['name']]?.trim()) {
        errors.push(`Row ${i + 2}: missing name (skipped)`);
        return;
      }
      const name = row[csvMapping['name']]?.trim();
      const email = csvMapping['email'] ? (row[csvMapping['email']] || '') : '';
      const phone = csvMapping['phone'] ? (row[csvMapping['phone']] || '') : '';

      // Duplicate check
      const dup = clients.find(c => c.email && email && c.email.toLowerCase() === email.toLowerCase());
      if (dup) {
        errors.push(`Row ${i + 2}: "${name}" — email "${email}" already exists as "${dup.name}" (skipped)`);
        return;
      }

      valid.push({
        id: `CL${Date.now()}_${i}`,
        name,
        email,
        phone,
        department: csvMapping['department'] ? (row[csvMapping['department']] || 'General') : 'General',
        budget: csvMapping['budget'] ? parseFloat(row[csvMapping['budget']]) || 0 : 0,
        startDate: csvMapping['startDate'] ? (row[csvMapping['startDate']] || todayStr()) : todayStr(),
        status: csvMapping['status'] ? (row[csvMapping['status']] || 'Active') : 'Active',
        notes: csvMapping['notes'] ? (row[csvMapping['notes']] || '') : '',
        source: 'CSV Import',
        assignedTo: null,
      });
    });

    if (valid.length === 0) {
      setCsvErrors(errors);
      toast.warning('No valid rows to import');
      return;
    }

    updateState({ clients: [...clients, ...valid] });
    setCsvErrors(errors);
    setCsvStep(3);

    const msg = `${valid.length} client${valid.length > 1 ? 's' : ''} imported`;
    const errMsg = errors.length > 0 ? `, ${errors.length} skipped` : '';
    toast.success(`${msg}${errMsg}`);
  };

  const resetCSV = () => {
    setCsvStep(1);
    setCsvRawData([]);
    setCsvHeaders([]);
    setCsvMapping({});
    setCsvPreview([]);
    setCsvErrors([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Proposal / Invoice handlers ───────────────────────────────────────────

  const handleCreateProposal = (e) => {
    e.preventDefault();
    if (!propClient || !propCost) return;
    const client = clients.find(c => c.id === propClient);
    const newProp = {
      id: `PRP${Date.now()}`,
      clientId: propClient,
      clientName: client?.name || propClient,
      title: propTitle || 'Business Proposal Retainer',
      cost: parseFloat(propCost),
      details: propDetails,
      status: 'Sent',
      date: todayStr(),
    };
    updateState({ proposals: [...proposals, newProp] });
    const propText = `
========================================
DIGITAL BUDDIES BUSINESS PROPOSAL
========================================
Reference: ${newProp.id}
Client: ${client?.name || propClient}
Date: ${newProp.date}

Project: ${newProp.title}
Cost: ₹${newProp.cost.toLocaleString()}
Details: ${newProp.details || '—'}
========================================
`;
    const blob = new Blob([propText], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Proposal_${newProp.id}.txt`;
    a.click();
    toast.success('Proposal saved and exported.');
    setPropTitle(''); setPropCost(''); setPropDetails('');
  };

  const handleCreateInvoice = (e) => {
    e.preventDefault();
    if (!invClient || !invAmount) return;
    const client = clients.find(c => c.id === invClient);
    const newInv = {
      id: `INV${Date.now()}`,
      clientId: invClient,
      clientName: client?.name || invClient,
      amount: parseFloat(invAmount),
      dueDate: invDue,
      status: 'Unpaid',
    };
    updateState({ invoices: [...invoices, newInv] });
    const invText = `
========================================
INVOICE - DIGITAL BUDDIES
========================================
Reference: ${newInv.id}
Client: ${client?.name || invClient}
Due: ${newInv.dueDate}
Amount: ₹${newInv.amount.toLocaleString()}
Status: UNPAID
========================================
`;
    const blob = new Blob([invText], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Invoice_${newInv.id}.txt`;
    a.click();
    toast.success('Invoice logged.');
    setInvAmount('');
  };

  const handleToggleInvoicePaid = (invId) => {
    const updated = invoices.map(i =>
      i.id === invId ? { ...i, status: i.status === 'Paid' ? 'Unpaid' : 'Paid' } : i
    );
    updateState({ invoices: updated });
  };

  // ════════════════════════════════════════════════════════════════════════
  //  UTILITY
  // ════════════════════════════════════════════════════════════════════════

  const clientProposals = (clientId) => proposals.filter(p => p.clientId === clientId);
  const clientInvoices = (clientId) => invoices.filter(i => i.clientId === clientId);
  const clientProjects = (clientId) => projects.filter(p => p.clientId === clientId);
  const empName = (id) => employees.find(e => e.id === id)?.name || 'Unassigned';

  // ── Client form field helper ──────────────────────────────────────────────
  const ClientFormFields = ({ prefix }) => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Client Name *</label>
          <input type="text" value={clientForm.name} onChange={e => setClientForm(p => ({ ...p, name: e.target.value }))}
            className="w-full glass-input p-2.5 rounded-xl text-sm" required />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Email</label>
          <input type="email" value={clientForm.email} onChange={e => setClientForm(p => ({ ...p, email: e.target.value }))}
            className="w-full glass-input p-2.5 rounded-xl text-sm" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Phone</label>
          <input type="text" value={clientForm.phone} onChange={e => setClientForm(p => ({ ...p, phone: e.target.value }))}
            className="w-full glass-input p-2.5 rounded-xl text-sm" />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Department</label>
          <select value={clientForm.department} onChange={e => setClientForm(p => ({ ...p, department: e.target.value }))}
            className="w-full glass-input p-2.5 rounded-xl text-sm">
            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Budget (₹)</label>
          <input type="number" value={clientForm.budget} onChange={e => setClientForm(p => ({ ...p, budget: e.target.value }))}
            className="w-full glass-input p-2.5 rounded-xl text-sm" />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Status</label>
          <select value={clientForm.status} onChange={e => setClientForm(p => ({ ...p, status: e.target.value }))}
            className="w-full glass-input p-2.5 rounded-xl text-sm">
            <option value="Active">Active</option>
            <option value="Paused">Paused</option>
            <option value="Churned">Churned</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Account Owner</label>
          <select value={clientForm.assignedTo} onChange={e => setClientForm(p => ({ ...p, assignedTo: e.target.value }))}
            className="w-full glass-input p-2.5 rounded-xl text-sm">
            <option value="">— Unassigned —</option>
            {employees.filter(e => e.role === 'Manager' || e.role === 'Super Admin').map(e =>
              <option key={e.id} value={e.id}>{e.name}</option>
            )}
          </select>
        </div>
        <div>
          <DatePicker label="Start Date" value={clientForm.startDate}
            onChange={v => setClientForm(p => ({ ...p, startDate: v }))} />
        </div>
      </div>
      <div>
        <label className="block text-xs text-slate-400 mb-1">Notes</label>
        <textarea value={clientForm.notes} onChange={e => setClientForm(p => ({ ...p, notes: e.target.value }))}
          className="w-full glass-input p-2.5 rounded-xl text-sm h-20" />
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Tab bar ── */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-4">
        {[
          { id: 'leads', label: 'Lead Pipeline', icon: Briefcase },
          { id: 'clients', label: 'Client Directory', icon: UserCheck },
          { id: 'proposals', label: 'Proposals', icon: FileText },
          { id: 'invoices', label: 'Invoices', icon: DollarSign },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setCrmSubTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
                crmSubTab === tab.id
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}>
              <Icon className="w-4 h-4" /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* TAB: LEAD PIPELINE                                                */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {crmSubTab === 'leads' && (
        <div className="space-y-6">
          {/* Funnel Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-panel p-5 rounded-2xl">
              <h3 className="text-sm font-semibold text-slate-200 mb-3">Funnel Stages</h3>
              <BarChart data={stageFunnelData} height={180} color="#a78bfa" />
            </div>
            <div className="glass-panel p-5 rounded-2xl">
              <h3 className="text-sm font-semibold text-slate-200 mb-3">Lead Sources</h3>
              <DonutChart data={leadSourceData} size={140} thickness={20} centerLabel="leads" />
            </div>
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-4 gap-4">
            <div className="glass-card p-3 rounded-xl text-center">
              <p className="text-xs text-slate-400">Total Leads</p>
              <p className="text-lg font-bold text-glow">{totalLeads}</p>
            </div>
            <div className="glass-card p-3 rounded-xl text-center">
              <p className="text-xs text-slate-400">Won</p>
              <p className="text-lg font-bold text-emerald-400">{wonLeads}</p>
            </div>
            <div className="glass-card p-3 rounded-xl text-center">
              <p className="text-xs text-slate-400">Lost</p>
              <p className="text-lg font-bold text-rose-400">{lostLeads}</p>
            </div>
            <div className="glass-card p-3 rounded-xl text-center">
              <p className="text-xs text-slate-400">Conv. Rate</p>
              <p className="text-lg font-bold text-violet-400">{conversionRate}%</p>
            </div>
          </div>

          {/* Pipeline columns */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {LEAD_STAGES.map(stage => {
              const stageLeadsArr = leads.filter(l => l.status === stage);
              const isOver = dragOverStage === stage;
              return (
                <div key={stage}
                  className={`glass-panel rounded-xl border-l-4 flex flex-col min-h-[250px] ${
                    stage === 'Won' ? 'border-l-emerald-500' :
                    stage === 'Lost' ? 'border-l-rose-500' :
                    stage === 'Proposal Sent' ? 'border-l-amber-500' :
                    stage === 'Qualified' ? 'border-l-blue-500' :
                    'border-l-violet-500'
                  } ${isOver ? 'ring-2 ring-violet-500/50' : ''}`}
                  onDragOver={(e) => handleDragOverStage(e, stage)}
                  onDragLeave={() => setDragOverStage(null)}
                  onDrop={(e) => handleDropOnStage(e, stage)}
                >
                  <div className="p-3 border-b border-slate-800/60 flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-300 uppercase">{stage}</h3>
                    <span className="bg-slate-800 text-slate-300 text-3xs px-2 py-0.5 rounded-full font-mono">{stageLeadsArr.length}</span>
                  </div>
                  <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[350px]">
                    {stageLeadsArr.length === 0 ? (
                      <div className="flex items-center justify-center h-16 border border-dashed border-slate-800 rounded-lg">
                        <p className="text-3xs text-slate-600">Drop leads here</p>
                      </div>
                    ) : (
                      stageLeadsArr.map(ld => (
                        <div key={ld.id} draggable
                          onDragStart={(e) => handleDragStart(e, ld.id)}
                          className="glass-card p-3 rounded-xl space-y-1.5 cursor-grab active:cursor-grabbing"
                          onClick={() => handleOpenLeadDetail(ld)}
                        >
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-xs text-slate-200">{ld.name}</h4>
                          </div>
                          {ld.email && <p className="text-3xs text-slate-400">{ld.email}</p>}
                          <div className="flex items-center justify-between text-3xs">
                            <span className="text-slate-500 font-mono">₹{(ld.budget || 0).toLocaleString()}</span>
                            <span className="text-slate-600">{ld.source}</span>
                          </div>
                          {ld.assignedTo && (
                            <p className="text-3xs text-violet-400 flex items-center gap-1">
                              <User className="w-3 h-3" /> {empName(ld.assignedTo)}
                            </p>
                          )}
                          {ld.notes && (
                            <p className="text-3xs text-slate-500 line-clamp-1 italic">{ld.notes}</p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Lead creation form */}
          <div className="glass-panel p-5 rounded-2xl max-w-2xl mx-auto space-y-4">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Plus className="w-5 h-5 text-violet-400" /> Log Incoming Lead
            </h3>
            <form onSubmit={handleCreateLead} className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Name *</label>
                  <input type="text" value={leadName} onChange={e => setLeadName(e.target.value)}
                    className="w-full glass-input p-2.5 rounded-xl text-sm" required />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Budget</label>
                  <input type="number" value={leadBudget} onChange={e => setLeadBudget(e.target.value)}
                    className="w-full glass-input p-2.5 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Source</label>
                  <select value={leadSource} onChange={e => setLeadSource(e.target.value)}
                    className="w-full glass-input p-2.5 rounded-xl text-sm">
                    {LEAD_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Email</label>
                  <input type="email" value={leadEmail} onChange={e => setLeadEmail(e.target.value)}
                    className="w-full glass-input p-2.5 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Phone</label>
                  <input type="text" value={leadPhone} onChange={e => setLeadPhone(e.target.value)}
                    className="w-full glass-input p-2.5 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Assign to</label>
                  <select value={leadAssignedTo} onChange={e => setLeadAssignedTo(e.target.value)}
                    className="w-full glass-input p-2.5 rounded-xl text-sm">
                    <option value="">— Unassigned —</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Notes</label>
                <input type="text" value={leadNotes} onChange={e => setLeadNotes(e.target.value)}
                  className="w-full glass-input p-2.5 rounded-xl text-sm" placeholder="Lead details, context..." />
              </div>
              <button type="submit"
                className="w-full bg-violet-600 hover:bg-violet-700 py-2.5 rounded-xl text-sm text-white font-bold transition">
                Log Lead
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* TAB: CLIENT DIRECTORY                                             */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {crmSubTab === 'clients' && (
        <div className="space-y-6">
          {/* Toolbar */}
          <div className="glass-card p-4 rounded-2xl flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400" />
              <input type="text" value={clientSearch} onChange={e => setClientSearch(e.target.value)}
                className="flex-1 bg-transparent text-sm text-slate-200 outline-none" placeholder="Search by name or email..." />
            </div>
            <select value={clientDeptFilter} onChange={e => setClientDeptFilter(e.target.value)}
              className="glass-input p-2 rounded-lg text-xs">
              <option value="">All Depts</option>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select value={clientStatusFilter} onChange={e => setClientStatusFilter(e.target.value)}
              className="glass-input p-2 rounded-lg text-xs">
              <option value="">All Status</option>
              <option value="Active">Active</option>
              <option value="Paused">Paused</option>
              <option value="Churned">Churned</option>
            </select>
            <button onClick={() => { resetClientForm(); setSelectedClient(null); setShowAddClient(true); }}
              className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition">
              <Plus className="w-4 h-4" /> Add Client
            </button>
            <button onClick={() => { resetCSV(); setShowCSVImport(true); }}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition">
              <Upload className="w-4 h-4" /> CSV/Excel Import
            </button>
          </div>

          {/* Client table */}
          <div className="glass-panel p-5 rounded-2xl overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase">
                  <th className="py-3 px-3">Client</th>
                  <th className="py-3 px-3">Email</th>
                  <th className="py-3 px-3">Dept</th>
                  <th className="py-3 px-3">Budget</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Owner</th>
                  <th className="py-3 px-3">Total Billed</th>
                  <th className="py-3 px-3">Source</th>
                  <th className="py-3 px-3">Start</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {filteredClients.length === 0 ? (
                  <tr><td colSpan="9" className="text-center py-8 text-slate-500 text-xs">No clients found</td></tr>
                ) : (
                  filteredClients.map(c => (
                    <tr key={c.id} className="text-slate-300 hover:bg-slate-900/30 cursor-pointer"
                      onClick={() => { setSelectedClient(c); setShowClientDetail(true); }}>
                      <td className="py-3 px-3 font-semibold text-slate-200">{c.name}</td>
                      <td className="py-3 px-3">{c.email || '-'}</td>
                      <td className="py-3 px-3 text-violet-400">{c.department}</td>
                      <td className="py-3 px-3 font-mono">₹{(c.budget || 0).toLocaleString()}</td>
                      <td className="py-3 px-3">
                        <span className={`text-3xs px-2 py-0.5 rounded font-semibold ${
                          c.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400' :
                          c.status === 'Paused' ? 'bg-amber-500/10 text-amber-400' :
                          'bg-rose-500/10 text-rose-400'
                        }`}>{c.status}</span>
                      </td>
                      <td className="py-3 px-3 text-xs">{c.assignedTo ? empName(c.assignedTo) : '-'}</td>
                      <td className="py-3 px-3 font-mono text-emerald-400">₹{totalBilled(c.id).toLocaleString()}</td>
                      <td className="py-3 px-3 text-slate-500">{c.source || '-'}</td>
                      <td className="py-3 px-3 text-slate-500">{c.startDate}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* TAB: PROPOSALS                                                    */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {crmSubTab === 'proposals' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="glass-panel p-5 rounded-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <FileText className="w-5 h-5 text-violet-400" /> Create Proposal
            </h3>
            <form onSubmit={handleCreateProposal} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Client</label>
                <select value={propClient} onChange={e => setPropClient(e.target.value)}
                  className="w-full glass-input p-2.5 rounded-xl text-sm" required>
                  <option value="">— Select —</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Title</label>
                <input type="text" value={propTitle} onChange={e => setPropTitle(e.target.value)}
                  className="w-full glass-input p-2.5 rounded-xl text-sm" required />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Cost (₹)</label>
                <input type="number" value={propCost} onChange={e => setPropCost(e.target.value)}
                  className="w-full glass-input p-2.5 rounded-xl text-sm" required />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Details</label>
                <textarea value={propDetails} onChange={e => setPropDetails(e.target.value)}
                  className="w-full glass-input p-2.5 rounded-xl text-sm h-20" />
              </div>
              <button type="submit"
                className="w-full bg-violet-600 hover:bg-violet-700 py-2.5 rounded-xl text-sm text-white font-bold transition flex items-center justify-center gap-2">
                <Download className="w-4 h-4" /> Save & Download
              </button>
            </form>
          </div>
          <div className="lg:col-span-2 glass-panel p-5 rounded-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-100">Proposals</h3>
            {proposals.length === 0 ? (
              <p className="text-slate-500 text-xs text-center py-6">No proposals yet</p>
            ) : (
              <div className="space-y-3">
                {proposals.map(p => (
                  <div key={p.id} className="glass-card p-4 rounded-xl flex items-center justify-between border-l-2 border-l-violet-500">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-3xs bg-violet-600/15 text-violet-400 px-2 py-0.5 rounded font-mono font-bold">{p.status}</span>
                        <span className="text-3xs text-slate-500">{p.date}</span>
                      </div>
                      <h4 className="font-bold text-sm text-slate-200">{p.title}</h4>
                      <p className="text-xs text-slate-400">Client: {p.clientName || p.clientId}</p>
                    </div>
                    <span className="text-emerald-400 font-bold font-mono text-sm">₹{(p.cost || 0).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* TAB: INVOICES                                                     */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {crmSubTab === 'invoices' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="glass-panel p-5 rounded-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-violet-400" /> Issue Invoice
            </h3>
            <form onSubmit={handleCreateInvoice} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Client</label>
                <select value={invClient} onChange={e => setInvClient(e.target.value)}
                  className="w-full glass-input p-2.5 rounded-xl text-sm" required>
                  <option value="">— Select —</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Amount (₹)</label>
                <input type="number" value={invAmount} onChange={e => setInvAmount(e.target.value)}
                  className="w-full glass-input p-2.5 rounded-xl text-sm" required />
              </div>
              <div>
                <DatePicker label="Due Date" value={invDue} onChange={setInvDue} required />
              </div>
              <button type="submit"
                className="w-full bg-violet-600 hover:bg-violet-700 py-2.5 rounded-xl text-sm text-white font-bold transition flex items-center justify-center gap-2">
                <Download className="w-4 h-4" /> Save & Download
              </button>
            </form>
          </div>
          <div className="lg:col-span-2 glass-panel p-5 rounded-2xl space-y-4 overflow-x-auto">
            <h3 className="text-base font-bold text-slate-100">Invoice Ledger</h3>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase">
                  <th className="py-3 px-3">ID</th>
                  <th className="py-3 px-3">Client</th>
                  <th className="py-3 px-3">Due</th>
                  <th className="py-3 px-3">Amount</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {invoices.length === 0 ? (
                  <tr><td colSpan="6" className="text-center py-8 text-slate-500">No invoices yet</td></tr>
                ) : (
                  invoices.map(inv => (
                    <tr key={inv.id} className="text-slate-300 hover:bg-slate-900/20">
                      <td className="py-3 px-3 font-mono font-bold">{inv.id}</td>
                      <td className="py-3 px-3 font-semibold text-slate-200">{inv.clientName || inv.clientId}</td>
                      <td className="py-3 px-3">{inv.dueDate}</td>
                      <td className="py-3 px-3 font-mono">₹{(inv.amount || 0).toLocaleString()}</td>
                      <td className="py-3 px-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-3xs font-bold uppercase ${
                          inv.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                        }`}>{inv.status}</span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button onClick={() => handleToggleInvoicePaid(inv.id)}
                          className="bg-slate-900/60 hover:bg-slate-900 px-2 py-1 rounded border border-slate-800 transition text-3xs font-bold">
                          Mark {inv.status === 'Paid' ? 'Unpaid' : 'Paid'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/*  MODALS / DRAWERS                                                */}
      {/* ════════════════════════════════════════════════════════════════════ */}

      {/* ── Add / Edit Client Modal ── */}
      <Modal open={showAddClient} onClose={() => { setShowAddClient(false); resetClientForm(); }}
        title={selectedClient ? 'Edit Client' : 'Add Client'}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setShowAddClient(false); resetClientForm(); }}>Cancel</Button>
            <Button variant="primary" onClick={handleSaveClient}> {selectedClient ? 'Update' : 'Add'} Client</Button>
          </>
        }>
        <ClientFormFields />
      </Modal>

      {/* ── CSV Import Modal ── */}
      <Modal open={showCSVImport} onClose={() => { resetCSV(); setShowCSVImport(false); }}
        title="Import Clients from CSV/Excel" size="lg"
        footer={csvStep === 2 ? (
          <>
            <Button variant="ghost" onClick={resetCSV}>Back</Button>
            <Button variant="primary" onClick={handleCsvImport} icon={Upload}>Import {csvRawData.length} rows</Button>
          </>
        ) : csvStep === 3 ? (
          <Button variant="ghost" onClick={() => { resetCSV(); setShowCSVImport(false); }}>Done</Button>
        ) : null}>
        {csvStep === 1 && (
          <div className="space-y-4 text-center py-6">
            <div className="border-2 border-dashed border-slate-700 rounded-2xl p-8 hover:border-violet-500/50 transition cursor-pointer"
              onClick={() => fileInputRef.current?.click()}>
              <Upload className="w-10 h-10 text-slate-500 mx-auto mb-3" />
              <p className="text-sm text-slate-400">Click to upload a <strong>.csv</strong> or <strong>.xlsx</strong> file</p>
              <p className="text-xs text-slate-600 mt-1">The first row should contain column headers (Name, Email, Phone, Budget, etc.)</p>
              <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} className="hidden" />
            </div>
          </div>
        )}
        {csvStep === 2 && (
          <div className="space-y-4">
            <p className="text-xs text-slate-400">Map your file columns to client fields. Auto-detected mappings are pre-filled.</p>
            <div className="grid grid-cols-2 gap-3">
              {['name', 'email', 'phone', 'department', 'budget', 'startDate', 'status', 'notes'].map(field => (
                <div key={field}>
                  <label className="block text-xs text-slate-400 mb-1 capitalize">{field === 'startDate' ? 'Start Date' : field}</label>
                  <select value={csvMapping[field] || ''} onChange={e => setCsvMapping(p => ({ ...p, [field]: e.target.value }))}
                    className="w-full glass-input p-2 rounded-lg text-xs">
                    <option value="">— Skip —</option>
                    {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              ))}
            </div>
            {csvPreview.length > 0 && (
              <div className="mt-4">
                <p className="text-xs text-slate-400 mb-2">Preview (first {csvPreview.length} rows):</p>
                <div className="overflow-x-auto border border-slate-800 rounded-xl">
                  <table className="text-xs w-full">
                    <thead><tr className="bg-slate-900/60 text-slate-400">
                      {['#', ...Object.values(csvMapping).filter(Boolean)].map((h, i) => <th key={i} className="p-2 text-left">{i === 0 ? '#' : h}</th>)}
                    </tr></thead>
                    <tbody>
                      {csvPreview.map((row, i) => (
                        <tr key={i} className="border-t border-slate-800/40 text-slate-300">
                          <td className="p-2 text-slate-500">{i + 1}</td>
                          {Object.values(csvMapping).filter(Boolean).map((h, j) => <td key={j} className="p-2">{row[h] || '-'}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
        {csvStep === 3 && (
          <div className="space-y-4 text-center py-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-400 mb-3">
              <Check className="w-7 h-7" />
            </div>
            <p className="text-sm font-semibold text-slate-200">Import Complete</p>
            <p className="text-xs text-slate-400">
              {csvRawData.length - csvErrors.length} clients imported successfully.
              {csvErrors.length > 0 && ` ${csvErrors.length} rows skipped.`}
            </p>
            {csvErrors.length > 0 && (
              <div className="mt-4 max-h-32 overflow-y-auto border border-rose-500/20 rounded-xl p-3 bg-rose-500/5">
                {csvErrors.map((err, i) => <p key={i} className="text-3xs text-rose-400 text-left">{err}</p>)}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ── Lead Detail Drawer ── */}
      {showLeadDetail && selectedLead && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={() => { setShowLeadDetail(false); setSelectedLead(null); }} />
          <aside className="fixed right-0 top-0 h-full w-full max-w-md glass-panel border-l border-violet-500/15 z-50 flex flex-col shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex items-start justify-between gap-3 flex-shrink-0">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className={`text-3xs px-2 py-0.5 rounded font-mono font-semibold ${
                    selectedLead.status === 'Won' ? 'bg-emerald-500/10 text-emerald-400' :
                    selectedLead.status === 'Lost' ? 'bg-rose-500/10 text-rose-400' :
                    selectedLead.status === 'Proposal Sent' ? 'bg-amber-500/10 text-amber-400' :
                    'bg-violet-500/10 text-violet-400'
                  }`}>{selectedLead.status}</span>
                </div>
                <h3 className="font-bold text-lg text-slate-100">{selectedLead.name}</h3>
                <p className="text-xs text-slate-400">{selectedLead.email} {selectedLead.phone && `· ${selectedLead.phone}`}</p>
                <p className="text-xs text-slate-500">Budget: ₹{(selectedLead.budget || 0).toLocaleString()} · Source: {selectedLead.source}</p>
                {selectedLead.assignedTo && (
                  <p className="text-xs text-violet-400 flex items-center gap-1"><User className="w-3 h-3" /> {empName(selectedLead.assignedTo)}</p>
                )}
                {selectedLead.notes && <p className="text-xs text-slate-400 mt-2 italic">{selectedLead.notes}</p>}
              </div>
              <button onClick={() => { setShowLeadDetail(false); setSelectedLead(null); }}
                className="text-slate-500 hover:text-slate-200 transition p-1 flex-shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 p-5 space-y-4 overflow-y-auto">
              {selectedLead.status !== 'Won' && selectedLead.status !== 'Lost' && (
                <div>
                  <h4 className="text-3xs uppercase tracking-wider text-slate-500 mb-2 font-semibold">Actions</h4>
                  <div className="flex flex-wrap gap-2">
                    {LEAD_STAGES.map(s => {
                      if (s === selectedLead.status || s === 'Won') return null;
                      return (
                        <button key={s} onClick={() => { doLeadStatusChange(selectedLead.id, s); setShowLeadDetail(false); }}
                          className={`px-3 py-1.5 rounded-lg text-3xs font-bold transition ${
                            s === 'Lost' ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20' :
                            'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}>
                          {s === 'Lost' ? 'Mark Lost' : `Move to ${s}`}
                        </button>
                      );
                    })}
                    {selectedLead.status !== 'Won' && (
                      <button onClick={() => {
                        doLeadStatusChange(selectedLead.id, 'Won');
                        setShowLeadDetail(false);
                      }}
                        className="px-3 py-1.5 rounded-lg text-3xs font-bold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20">
                        Won → Convert to Client
                      </button>
                    )}
                  </div>
                </div>
              )}
              <div>
                <h4 className="text-3xs uppercase tracking-wider text-slate-500 mb-2 font-semibold">Activity Timeline</h4>
                <p className="text-xs text-slate-600 italic">Timeline tracking coming in next release.</p>
              </div>
            </div>
          </aside>
        </>
      )}

      {/* ── Client Detail Drawer ── */}
      {showClientDetail && selectedClient && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={() => { setShowClientDetail(false); setSelectedClient(null); }} />
          <aside className="fixed right-0 top-0 h-full w-full max-w-md glass-panel border-l border-violet-500/15 z-50 flex flex-col shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex items-start justify-between gap-3 flex-shrink-0">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className={`text-3xs px-2 py-0.5 rounded font-mono font-semibold ${
                    selectedClient.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400' :
                    selectedClient.status === 'Paused' ? 'bg-amber-500/10 text-amber-400' :
                    'bg-rose-500/10 text-rose-400'
                  }`}>{selectedClient.status}</span>
                </div>
                <h3 className="font-bold text-lg text-slate-100">{selectedClient.name}</h3>
                <p className="text-xs text-slate-400">{selectedClient.email} {selectedClient.phone && `· ${selectedClient.phone}`}</p>
                <p className="text-xs text-slate-500">Dept: {selectedClient.department} · Budget: ₹{(selectedClient.budget || 0).toLocaleString()}</p>
                {selectedClient.assignedTo && <p className="text-xs text-violet-400 flex items-center gap-1"><User className="w-3 h-3" /> {empName(selectedClient.assignedTo)}</p>}
              </div>
              <button onClick={() => { setShowClientDetail(false); setSelectedClient(null); }}
                className="text-slate-500 hover:text-slate-200 transition p-1 flex-shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 p-5 space-y-4 overflow-y-auto">
              {/* Edit / Delete buttons */}
              <div className="flex gap-2">
                <button onClick={() => { fillClientForm(selectedClient); setShowAddClient(true); }}
                  className="flex-1 bg-violet-600/20 hover:bg-violet-600/30 text-violet-400 px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border border-violet-500/20">
                  <Edit3 className="w-3.5 h-3.5" /> Edit
                </button>
                <button onClick={() => setShowDeleteConfirm(true)}
                  className="flex-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border border-rose-500/20">
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>

              {/* Notes */}
              {selectedClient.notes && (
                <div className="glass-card p-3 rounded-xl">
                  <h4 className="text-3xs uppercase tracking-wider text-slate-500 font-semibold mb-1">Notes</h4>
                  <p className="text-xs text-slate-400 whitespace-pre-wrap">{selectedClient.notes}</p>
                </div>
              )}

              {/* Proposals */}
              <div>
                <h4 className="text-3xs uppercase tracking-wider text-slate-500 font-semibold mb-2 flex items-center gap-1">
                  <FileText className="w-3 h-3" /> Proposals ({clientProposals(selectedClient.id).length})
                </h4>
                <div className="space-y-2">
                  {clientProposals(selectedClient.id).map(p => (
                    <div key={p.id} className="glass-card p-3 rounded-xl flex justify-between items-center">
                      <div>
                        <p className="text-xs font-semibold text-slate-200">{p.title}</p>
                        <p className="text-3xs text-slate-500">{p.status} · {p.date}</p>
                      </div>
                      <span className="text-xs font-bold text-emerald-400">₹{(p.cost || 0).toLocaleString()}</span>
                    </div>
                  ))}
                  {clientProposals(selectedClient.id).length === 0 && (
                    <p className="text-xs text-slate-600 italic">No proposals</p>
                  )}
                </div>
              </div>

              {/* Invoices */}
              <div>
                <h4 className="text-3xs uppercase tracking-wider text-slate-500 font-semibold mb-2 flex items-center gap-1">
                  <DollarSign className="w-3 h-3" /> Invoices ({clientInvoices(selectedClient.id).length})
                </h4>
                <div className="space-y-2">
                  {clientInvoices(selectedClient.id).map(inv => (
                    <div key={inv.id} className="glass-card p-3 rounded-xl flex justify-between items-center">
                      <div>
                        <p className="text-xs font-semibold text-slate-200">{inv.id}</p>
                        <p className="text-3xs text-slate-500">Due: {inv.dueDate}</p>
                      </div>
                      <span className={`text-xs font-bold ${inv.status === 'Paid' ? 'text-emerald-400' : 'text-amber-400'}`}>
                        ₹{(inv.amount || 0).toLocaleString()}
                      </span>
                    </div>
                  ))}
                  {clientInvoices(selectedClient.id).length === 0 && (
                    <p className="text-xs text-slate-600 italic">No invoices</p>
                  )}
                </div>
              </div>

              {/* Projects */}
              <div>
                <h4 className="text-3xs uppercase tracking-wider text-slate-500 font-semibold mb-2 flex items-center gap-1">
                  <Briefcase className="w-3 h-3" /> Projects ({clientProjects(selectedClient.id).length})
                </h4>
                <div className="space-y-2">
                  {clientProjects(selectedClient.id).map(p => (
                    <div key={p.id} className="glass-card p-3 rounded-xl">
                      <p className="text-xs font-semibold text-slate-200">{p.name}</p>
                      <p className="text-3xs text-slate-500">Status: {p.status} · Due: {p.deadline || '-'}</p>
                    </div>
                  ))}
                  {clientProjects(selectedClient.id).length === 0 && (
                    <p className="text-xs text-slate-600 italic">No projects</p>
                  )}
                </div>
              </div>
            </div>
          </aside>
        </>
      )}

      {/* ── Lost Reason Modal ── */}
      <Modal open={showLostPrompt} onClose={() => { setShowLostPrompt(false); setLostReason(''); }}
        title="Why was this lead lost?" size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setShowLostPrompt(false); setLostReason(''); }}>Cancel</Button>
            <Button variant="danger" onClick={handleConfirmLost} disabled={!lostReason.trim()}>Confirm Lost</Button>
          </>
        }>
        <textarea value={lostReason} onChange={e => setLostReason(e.target.value)}
          className="w-full glass-input p-3 rounded-xl text-sm h-24" placeholder="e.g. Budget too low, went with competitor, not a fit..." autoFocus />
      </Modal>

      {/* ── Delete Client Confirm ── */}
      <ConfirmDialog open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteClient}
        title="Delete Client?"
        message={`This will permanently remove "${selectedClient?.name}" and all associated data. This cannot be undone.`}
        confirmLabel="Delete Forever"
      />
    </div>
  );
}
