import { useState, useRef } from 'react';
import { 
  Users, Calendar, Clock, DollarSign, Send, Star, ShieldCheck, Briefcase, Plus, 
  Trash2, Edit2, Check, X, Printer, Key, RefreshCw, Activity
} from 'lucide-react';
import { useToast } from '../shared/Toast';
import { db } from '../../data/db';
import { emailService } from '../../lib/emailService';
import { DatePicker, Modal, ConfirmDialog } from '../ui';
import { today as todayStr, genId } from '../../lib/format';
import AttendanceLeaves from './HR/AttendanceLeaves';
import TimesheetAudit from './HR/TimesheetAudit';
import SalaryAdvances from './HR/SalaryAdvances';
import ConnectLeads from './HR/ConnectLeads';
import Interviews from './HR/Interviews';
import ClientFeedback from './HR/ClientFeedback';
import SecurityOps from './HR/SecurityOps';

const STATUS_COLORS = {
  Invited: 'bg-amber-500/10 text-amber-400 border border-amber-500/15',
  Active: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15',
  Suspended: 'bg-rose-500/10 text-rose-400 border border-rose-500/15',
  Terminated: 'bg-slate-800 text-slate-500 border border-slate-800'
};

export default function HR({ state, updateState, user = { role: 'Super Admin', id: 'EMP01' } }) {
  const toast = useToast();
  const { employees, attendance, leaves, advances, clients, devProjects, interviews, feedback, dailyOps, timelogs, tasks, attendanceDocs } = state;

  // Active sub-tab inside HR
  const [activeSubTab, setActiveSubTab] = useState('employees');
  const [inviteSubmitting, setInviteSubmitting] = useState(false);

  // Form states for Employees
  const [empName, setEmpName] = useState('');
  const [empEmail, setEmpEmail] = useState('');
  const [empDept, setEmpDept] = useState(['Developers']);
  const [empSalary, setEmpSalary] = useState('');
  const [empHire, setEmpHire] = useState(new Date().toISOString().split('T')[0]);
  const [editingEmpId, setEditingEmpId] = useState(null);

  // New form states for Employee Invitation System
  const [empPhone, setEmpPhone] = useState('');
  const [empDesignation, setEmpDesignation] = useState('');
  const [empRole, setEmpRole] = useState('Employee');
  const [empManagerId, setEmpManagerId] = useState('');
  const [empSubType, setEmpSubType] = useState('');

  // Modals / Popups state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [createdInviteInfo, setCreatedInviteInfo] = useState(null);
  const [empSearch, setEmpSearch] = useState('');
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [selectedActivityEmp, setSelectedActivityEmp] = useState(null);
  const [selectedEmp, setSelectedEmp] = useState(null);

  // Form states for Interview
  const [candName, setCandName] = useState('');
  const [candPos, setCandPos] = useState('');
  const [candDate, setCandDate] = useState('');
  const [candTime, setCandTime] = useState('10:00');
  const [candInterviewer, setCandInterviewer] = useState('');
  const [candLink, setCandLink] = useState('');

  // Form states for Routing Clients to Devs
  const [routeClientName, setRouteClientName] = useState('');
  const [routeDevId, setRouteDevId] = useState('');
  const [routeProjectName, setRouteProjectName] = useState('');

  // Form states for Client Feedback
  const [fbClient, setFbClient] = useState('');
  const [fbDept, setFbDept] = useState('Paid Ads');
  const [fbRating, setFbRating] = useState('5');
  const [fbComment, setFbComment] = useState('');

  // Form states for Leaves
  const [leaveEmpId, setLeaveEmpId] = useState('');
  const [leaveStart, setLeaveStart] = useState('');
  const [leaveEnd, setLeaveEnd] = useState('');
  const [leaveType, setLeaveType] = useState('Casual Leave');
  const [leaveReason, setLeaveReason] = useState('');

  // Form states for Advances
  const [advEmpId, setAdvEmpId] = useState('');
  const [advAmount, setAdvAmount] = useState('');
  const [advReason, setAdvReason] = useState('');

  // Clock in/out states
  const [clockEmpId, setClockEmpId] = useState('');
  const [clockInTime, setClockInTime] = useState('09:00');
  const [clockOutTime, setClockOutTime] = useState('18:00');

  // Pay slip modal state
  const [selectedPayslipEmp, setSelectedPayslipEmp] = useState(null);

  // Escrow & Operations local state
  const [escrows, setEscrows] = useState([]);
  const [escrowOpen, setEscrowOpen] = useState(false);
  const [escrowName, setEscrowName] = useState('');
  const [escrowAmount, setEscrowAmount] = useState('');
  const [newOpsText, setNewOpsText] = useState('');
  const [confirmState, setConfirmState] = useState({ open: false, message: '', onConfirm: null });

  // -------------------------
  // EMPLOYEE CRUD & INVITATION FUNCTIONS
  // -------------------------
  const resetForm = () => {
    setEditingEmpId(null);
    setEmpName('');
    setEmpEmail('');
    setEmpSalary('');
    setEmpPhone('');
    setEmpDesignation('');
    setEmpRole('Employee');
    setEmpManagerId('');
    setEmpDept(['Developers']);
    setEmpSubType('');
  };

  const createInviteAndNotify = async ({ name, email, employeeId, type }) => {
    const inviteToken = crypto.randomUUID();
    const normalizedEmail = email.toLowerCase().trim();
    const newInvite = {
      id: genId('INV'),
      employeeId,
      email: normalizedEmail,
      token: inviteToken,
      expiresAt: new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString(),
      accepted: false,
      createdBy: user?.id || 'EMP01',
      createdAt: new Date().toISOString()
    };

    try {
      await db.addEmployeeInvite(newInvite);
    } catch (inviteErr) {
      toast.error(`Could not save invite record: ${inviteErr.message}`);
      return false;
    }

    updateState({
      employeeInvites: [...(state.employeeInvites || []), newInvite]
    });

    try {
      await emailService.sendWelcomeEmail({ name, email: normalizedEmail });
    } catch (emailErr) {
      console.warn(`[Invite] Email failed (${type}):`, emailErr.message);
      toast.warning('Invite generated but email could not be sent.');
    }

    setCreatedInviteInfo({ name, email: normalizedEmail, type });
    setShowInviteModal(true);
    return true;
  };

  const handleSaveEmployee = async (e) => {
    e.preventDefault();
    if (!empName || !empSalary || !empEmail) return;
    setInviteSubmitting(true);

    try {
      if (editingEmpId) {
        const updatedFields = {
          name: empName,
          email: empEmail.toLowerCase().trim(),
          phone: empPhone,
          department: empDept,
          designation: empDesignation || `${empDept[0] || 'General'} Specialist`,
          role: empRole,
          managerId: empManagerId || 'EMP01',
          salary: parseFloat(empSalary),
          joinDate: empHire
        };

        // ponytail: optimistic update — local state first, persist in background
        const updated = employees.map(emp =>
          emp.id === editingEmpId ? { ...emp, ...updatedFields, subType: empDept.includes('Videography/Photography') ? empSubType : '' } : emp
        );
        updateState({ employees: updated });
        resetForm();

        // Background persist — warn on failure but don't revert
        db.updateEmployee(editingEmpId, updatedFields).catch(err => {
          console.error('[HR] Employee update failed:', err);
          toast.warning(`Changes saved locally but cloud sync failed: ${err.message}`);
        });
        db.updateEmployee(editingEmpId, { subType: empDept.includes('Videography/Photography') ? empSubType : '' }).catch(() => {});

        toast.success('Employee details updated.');
      } else {
        const nextNum = employees.reduce((max, e) => {
          const num = parseInt(e.id.replace('EMP', ''), 10);
          return isNaN(num) ? max : (num > max ? num : max);
        }, 0) + 1;
        const employeeId = `EMP${String(nextNum).padStart(2, '0')}`;
        const normalizedEmail = empEmail.toLowerCase().trim();

        const newEmp = {
          id: employeeId,
          name: empName,
          email: normalizedEmail,
          phone: empPhone || "+91 99999 99999",
          role: empRole,
          department: empDept,
          designation: empDesignation || `${empDept[0] || 'General'} Specialist`,
          subType: empDept.includes('Videography/Photography') ? empSubType : '',
          salary: parseFloat(empSalary),
          joinDate: empHire,
          bio: "Company team member.",
          skills: "Operations",
          managerId: empManagerId || "EMP01",
          password: null,
          status: 'Invited',
          mustChangePassword: true,
          avatar: ""
        };

        try {
          await db.addEmployee(newEmp);
        } catch (empErr) {
          toast.error(`Could not create employee record: ${empErr.message}`);
          return;
        }

        updateState({ employees: [...employees, newEmp] });

        await createInviteAndNotify({ name: empName, email: normalizedEmail, employeeId, type: 'create' });
        resetForm();
      }
    } finally {
      setInviteSubmitting(false);
    }
  };

  const handleEditEmployee = (emp) => {
    setEditingEmpId(emp.id);
    setEmpName(emp.name);
    setEmpEmail(emp.email);
    setEmpDept(Array.isArray(emp.department) ? emp.department : [emp.department || 'Developers']);
    setEmpSalary(emp.salary);
    setEmpHire(emp.joinDate || new Date().toISOString().split('T')[0]);
    setEmpPhone(emp.phone || '');
    setEmpDesignation(emp.designation || '');
    setEmpRole(emp.role || 'Employee');
    setEmpManagerId(emp.managerId || '');
    setEmpSubType(emp.subType || '');
  };

  const handleDeleteEmployee = async (id) => {
    setConfirmState({
      open: true,
      message: 'Are you sure you want to terminate this employee profile?',
      onConfirm: async () => {
        setConfirmState({ open: false, message: '', onConfirm: null });
        try {
          await db.deleteEmployee(id);
          const updated = employees.filter(emp => emp.id !== id);
          updateState({ employees: updated });
          toast.success('Employee terminated.');
        } catch (err) {
          toast.error(`Could not terminate: ${err.message}`);
        }
      }
    });
  };

  const handleToggleSuspend = async (emp) => {
    const nextStatus = emp.status === 'Suspended' ? 'Active' : 'Suspended';
    setConfirmState({
      open: true,
      message: `Are you sure you want to change status to ${nextStatus} for ${emp.name}?`,
      onConfirm: async () => {
        setConfirmState({ open: false, message: '', onConfirm: null });
        try {
          await db.updateEmployee(emp.id, { status: nextStatus });
          const updated = employees.map(e => e.id === emp.id ? { ...e, status: nextStatus } : e);
          updateState({ employees: updated });
          toast.success(`Employee status updated to ${nextStatus}`);
        } catch (err) {
          toast.error(`Could not update status: ${err.message}`);
        }
      }
    });
  };

  const handleResendInvite = async (emp) => {
    const updated = employees.map((e) =>
      e.id === emp.id ? { ...e, status: 'Invited', mustChangePassword: true } : e
    );
    updateState({ employees: updated });

    const ok = await createInviteAndNotify({ name: emp.name, email: emp.email, employeeId: emp.id, type: 'resend' });
    if (ok) toast.success(`Invitation resent to ${emp.name}`);
  };

  const handleResetPassword = async (emp) => {
    setConfirmState({
      open: true,
      message: `Are you sure you want to reset password for ${emp.name}?`,
      onConfirm: async () => {
        setConfirmState({ open: false, message: '', onConfirm: null });
        const updated = employees.map((e) =>
          e.id === emp.id ? { ...e, status: 'Invited', mustChangePassword: true } : e
        );
        updateState({ employees: updated });
        const ok = await createInviteAndNotify({ name: emp.name, email: emp.email, employeeId: emp.id, type: 'reset' });
        if (ok) toast.success(`Password setup link sent to ${emp.name}.`);
      }
    });
  };

  const handleViewActivity = (emp) => {
    setSelectedActivityEmp(emp);
    setShowActivityModal(true);
  };

  // -------------------------
  // INTERVIEW FUNCTIONS
  // -------------------------
  const handleScheduleInterview = (e) => {
    e.preventDefault();
    if (!candName || !candPos || !candDate) return;

    const dateTime = candDate + 'T' + (candTime || '10:00') + ':00';

    const newInt = {
      id: genId('INT'),
      candidateName: candName,
      position: candPos,
      date: dateTime,
      interviewerId: candInterviewer || 'EMP01',
      status: 'Scheduled',
      link: candLink || ''
    };

    updateState({ interviews: [...interviews, newInt] });
    toast.success(`Interview scheduled for ${candName}`);
    setCandName('');
    setCandPos('');
    setCandDate('');
    setCandTime('10:00');
    setCandLink('');
  };

  // -------------------------
  // CLIENT ROUTING FUNCTIONS
  // -------------------------
  const handleRouteClient = (e) => {
    e.preventDefault();
    if (!routeClientName || !routeDevId) return;

    const newProj = {
      id: genId('PROJ'),
      name: routeProjectName || `${routeClientName} Website Setup`,
      client: routeClientName,
      description: 'Incoming website client routed to Dev channel.',
      status: 'Backlog',
      devId: routeDevId,
      deadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };

    const newClient = {
      id: genId('CL'),
      name: routeClientName,
      email: '',
      phone: '',
      details: 'Routed website lead.',
      department: 'Developers',
      budget: 120000,
      startDate: new Date().toISOString().split('T')[0],
      status: 'Active'
    };

    updateState({
      devProjects: [...devProjects, newProj],
      clients: [...clients, newClient]
    });

    toast.success(`"${routeClientName}" routed to Developer`);
    setRouteClientName('');
    setRouteProjectName('');
  };

  // -------------------------
  // FEEDBACK FUNCTIONS
  // -------------------------
  const handleAddFeedback = (e) => {
    e.preventDefault();
    if (!fbClient || !fbComment) return;

    const newFb = {
      id: genId('FB'),
      clientName: fbClient,
      department: fbDept,
      rating: parseInt(fbRating),
      comment: fbComment,
      date: new Date().toISOString().split('T')[0]
    };

    updateState({ feedback: [...feedback, newFb] });
    toast.success('Client feedback compiled.');
    setFbClient('');
    setFbComment('');
  };

  // -------------------------
  // LEAVE REQUESTS & ATTENDANCE
  // -------------------------
  const handleApplyLeave = (e) => {
    e.preventDefault();
    if (!leaveEmpId || !leaveStart) return;

    const newLeave = {
      id: genId('LV'),
      employeeId: leaveEmpId,
      startDate: leaveStart,
      endDate: leaveEnd || leaveStart,
      type: leaveType,
      reason: leaveReason,
      status: 'Pending'
    };

    updateState({ leaves: [...leaves, newLeave] });
    toast.success('Leave request submitted.');
    setLeaveReason('');
  };

  const handleUpdateLeaveStatus = (leaveId, nextStatus) => {
    const updated = leaves.map(l => {
      if (l.id === leaveId) {
        return { ...l, status: nextStatus };
      }
      return l;
    });
    updateState({ leaves: updated });
  };

  const handleClockIn = (e) => {
    e.preventDefault();
    if (!clockEmpId) return;

    const newAtt = {
      id: genId('ATT'),
      employeeId: clockEmpId,
      logDate: new Date().toISOString().split('T')[0],
      clockIn: clockInTime,
      clockOut: clockOutTime,
      status: 'Present',
      type: 'Office',
      breaks: '[]'
    };

    updateState({ attendance: [...attendance, newAtt] });
    toast.success('Clock-in time registered.');
  };

  // -------------------------
  // ADVANCES & SALARY PAYOUT LOGIC
  // -------------------------
  const handleRequestAdvance = (e) => {
    e.preventDefault();
    if (!advEmpId || !advAmount) return;

    const newAdv = {
      id: genId('ADV'),
      employeeId: advEmpId,
      amount: parseFloat(advAmount),
      date: new Date().toISOString().split('T')[0],
      status: 'Pending',
      reason: advReason
    };

    updateState({ advances: [...advances, newAdv] });
    toast.success('Advance request submitted for approval.');
    setAdvAmount('');
    setAdvReason('');
  };

  const handleUpdateAdvanceStatus = (advId, nextStatus) => {
    const updated = advances.map(a => {
      if (a.id === advId) {
        return { ...a, status: nextStatus };
      }
      return a;
    });
    updateState({ advances: updated });
  };

  const getEmployeePayrollDetails = (emp) => {
    const base = emp.salary;
    const approvedLeavesCount = leaves.filter(l => l.employeeId === emp.id && l.status === 'Approved').length;
    const leaveDeduction = approvedLeavesCount * (base * 0.03);
    const approvedAdvancesSum = advances
      .filter(a => a.employeeId === emp.id && a.status === 'Approved')
      .reduce((sum, current) => sum + current.amount, 0);

    const totalSalary = Math.max(0, base - leaveDeduction - approvedAdvancesSum);
    return {
      base,
      leaveDeduction,
      advancesDeduction: approvedAdvancesSum,
      totalSalary,
      leavesCount: approvedLeavesCount
    };
  };

  // Export Timelog report CSV
  const handleExportTimelogs = () => {
    let csv = 'Employee Name,Task ID,Date Logged,Hours,Description\n';
    timelogs.forEach(log => {
      const emp = employees.find(e => e.id === log.employeeId);
      csv += `"${emp?.name || 'Staff'}","${log.taskId}","${log.date}",${log.hours},"${log.description}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `HR_Audit_Timelog_Report.csv`;
    a.click();
    toast.success('Report downloaded.');
  };

  // ── Escrow handlers ────────────────────────────────────────────────────
  const handleAddEscrow = (e) => {
    e.preventDefault();
    if (!escrowName || !escrowAmount) return;
    setEscrows(prev => [...prev, {
      id: genId('ESC'),
      name: escrowName.trim(),
      amount: parseFloat(escrowAmount),
      status: 'Pending'
    }]);
    setEscrowName('');
    setEscrowAmount('');
    setEscrowOpen(false);
    toast.success('Escrow entry added');
  };

  const handleToggleEscrow = (id) => {
    setEscrows(prev => prev.map(e =>
      e.id === id ? { ...e, status: e.status === 'Verified' ? 'Pending' : 'Verified' } : e
    ));
  };

  // ── Daily Ops handler ──────────────────────────────────────────────────
  const handleAddOps = (e) => {
    e.preventDefault();
    if (!newOpsText.trim()) return;
    const newOps = {
      id: genId('OPS'),
      task: newOpsText.trim(),
      status: 'Pending'
    };
    updateState({ dailyOps: [...dailyOps, newOps] });
    setNewOpsText('');
    toast.success('Operation task added');
  };

  // ── Attendance document upload ─────────────────────────────────────────
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docLabel, setDocLabel] = useState('');
  const fileInputRef = useRef(null);

  const handleUploadAttendanceDoc = async (e) => {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file || !docLabel.trim()) return;
    setUploadingDoc(true);
    try {
      const reader = new FileReader();
      const dataUrl = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const newDoc = {
        id: genId('ADOC'),
        label: docLabel.trim(),
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        dataUrl,
        uploadedAt: new Date().toISOString().split('T')[0]
      };
      updateState({ attendanceDocs: [...(attendanceDocs || []), newDoc] });
      toast.success('Attendance document uploaded');
      setDocLabel('');
      fileInputRef.current.value = '';
    } catch (err) {
      toast.error(`Upload failed: ${err.message}`);
    } finally {
      setUploadingDoc(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in print:bg-white print:text-black">
      {/* Sub tabs navigation */}
      <div className="flex gap-2 overflow-x-auto flex-nowrap pb-4 border-b border-slate-800 print:hidden scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent -mx-2 px-2">
        {[
          { id: 'employees', label: 'Employee Roster', icon: Users },
          { id: 'attendance', label: 'Attendance & Leaves', icon: Clock },
          { id: 'timelogs', label: 'Timesheet Audit Logs', icon: Calendar },
          { id: 'salary', label: 'Salary & Advances', icon: DollarSign },
          { id: 'router', label: 'Connect Leads', icon: Briefcase },
          { id: 'interviews', label: 'Interviews', icon: Calendar },
          { id: 'feedback', label: 'Client Feedback', icon: Star },
          { id: 'security', label: 'Security & Operations', icon: ShieldCheck }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition flex-shrink-0 ${
                activeSubTab === tab.id 
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20' 
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <Icon className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* -------------------------
          MODAL: PAY SLIP VIEWER
          ------------------------- */}
      {selectedPayslipEmp && (() => {
        const pay = getEmployeePayrollDetails(selectedPayslipEmp);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 print:static print:bg-white print:text-black print:p-0">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-xl w-full space-y-6 relative print:border-none print:bg-white print:text-black print:p-0 print:static">
              
              {/* Brand Header */}
              <div className="flex justify-between items-start border-b border-slate-800 pb-4 print:border-black">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-100 print:text-black">DIGITAL BUDDIES SOLUTIONS</h2>
                  <p className="text-xs text-slate-400 print:text-black">12, Space Hub Towers, Bengaluru - 560001</p>
                </div>
                <div className="text-right">
                  <span className="text-xs bg-violet-600/10 text-violet-400 px-3 py-1.5 rounded-xl font-bold print:hidden">
                    SALARY PAY SLIP
                  </span>
                </div>
              </div>

              {/* Meta information */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-slate-400 print:text-black">Employee ID: <span className="font-semibold text-slate-200 print:text-black">{selectedPayslipEmp.id}</span></p>
                  <p className="text-slate-400 print:text-black">Employee Name: <span className="font-semibold text-slate-200 print:text-black">{selectedPayslipEmp.name}</span></p>
                  <p className="text-slate-400 print:text-black">Department: <span className="font-semibold text-slate-200 print:text-black">{selectedPayslipEmp.department}</span></p>
                </div>
                <div className="text-right">
                  <p className="text-slate-400 print:text-black">Pay Period: <span className="font-semibold text-slate-200 print:text-black">June 2026</span></p>
                  <p className="text-slate-400 print:text-black">Date of Issue: <span className="font-semibold text-slate-200 print:text-black">{new Date().toLocaleDateString()}</span></p>
                </div>
              </div>

              {/* Earnings & Deductions Table */}
              <div className="border border-slate-800 rounded-xl overflow-x-auto print:border-black">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-bold print:border-black print:bg-slate-100 print:text-black">
                      <th className="py-2.5 px-4">Earnings / Allowances</th>
                      <th className="py-2.5 px-4 text-right">Amount (₹)</th>
                      <th className="py-2.5 px-4 border-l border-slate-800 print:border-black">Deductions</th>
                      <th className="py-2.5 px-4 text-right border-l border-slate-800 print:border-black font-bold">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40 text-slate-300 print:text-black print:divide-black">
                    <tr>
                      <td className="py-2.5 px-4">Basic Pay</td>
                      <td className="py-2.5 px-4 text-right">₹{pay.base.toLocaleString()}</td>
                      <td className="py-2.5 px-4 border-l border-slate-800 print:border-black">Leave Deductions ({pay.leavesCount})</td>
                      <td className="py-2.5 px-4 text-right border-l border-slate-800 print:border-black text-rose-400">-₹{pay.leaveDeduction.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4">HRA Allowances</td>
                      <td className="py-2.5 px-4 text-right">₹0</td>
                      <td className="py-2.5 px-4 border-l border-slate-800 print:border-black">Advances Offsets</td>
                      <td className="py-2.5 px-4 text-right border-l border-slate-800 print:border-black text-rose-400">-₹{pay.advancesDeduction.toLocaleString()}</td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-950/45 border-t border-slate-800 text-slate-100 font-bold print:border-black print:text-black print:bg-slate-100">
                      <td className="py-2.5 px-4">Gross Earnings</td>
                      <td className="py-2.5 px-4 text-right">₹{pay.base.toLocaleString()}</td>
                      <td className="py-2.5 px-4 border-l border-slate-800 print:border-black">Total Deductions</td>
                      <td className="py-2.5 px-4 text-right border-l border-slate-800 print:border-black text-rose-400">
                        -₹{(pay.leaveDeduction + pay.advancesDeduction).toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Net pay highlight */}
              <div className="bg-slate-950 p-4 rounded-xl flex items-center justify-between border border-slate-800 print:border-black print:bg-slate-100">
                <span className="text-sm font-bold text-slate-300 print:text-black">Net Salary Payout</span>
                <span className="text-xl font-extrabold text-emerald-400 print:text-black">
                  ₹{pay.totalSalary.toLocaleString()}
                </span>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-8 pt-8 text-2xs text-slate-400 print:text-black">
                <div className="space-y-4">
                  <div className="border-b border-slate-800 w-32 print:border-black" />
                  <p>Employee Signature</p>
                </div>
                <div className="space-y-4 text-right flex flex-col items-end">
                  <div className="border-b border-slate-800 w-32 print:border-black" />
                  <p>HR Manager / Director</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4 border-t border-slate-900 print:hidden">
                <button
                  onClick={() => window.print()}
                  className="flex-1 bg-violet-600 hover:bg-violet-700 py-3 rounded-xl text-white font-bold flex items-center justify-center gap-2 transition"
                >
                  <Printer className="w-4 h-4" /> Print PDF Slip
                </button>
                <button
                  onClick={() => setSelectedPayslipEmp(null)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 py-3 rounded-xl text-slate-200 font-bold transition"
                >
                  Close
                </button>
              </div>

            </div>
          </div>
        );
      })()}
            {/* -------------------------
          SUBTAB: EMPLOYEES
          ------------------------- */}
      {activeSubTab === 'employees' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">
          <div className="glass-panel p-4 sm:p-6 rounded-2xl lg:col-span-2 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-slate-100">Registered Team Directory</h3>
              <div className="flex items-center gap-3">
                <div className="relative flex-1 sm:flex-initial">
                  <input type="text" value={empSearch} onChange={e => setEmpSearch(e.target.value)}
                    className="w-full sm:w-52 glass-input pl-9 pr-3 py-2 rounded-xl text-xs"
                    placeholder="Search by name, email..." />
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
                <span className="text-2xs text-slate-400 font-mono font-medium whitespace-nowrap">{employees.length} total</span>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: 'Active', count: employees.filter(e => (e.status || 'Active') === 'Active').length, color: 'text-emerald-400', icon: Check, bg: 'bg-emerald-500/10', ring: 'ring-emerald-500/20' },
                { label: 'Invited', count: employees.filter(e => (e.status || 'Active') === 'Invited').length, color: 'text-amber-400', icon: Send, bg: 'bg-amber-500/10', ring: 'ring-amber-500/20' },
                { label: 'Suspended', count: employees.filter(e => (e.status || 'Active') === 'Suspended').length, color: 'text-rose-400', icon: X, bg: 'bg-rose-500/10', ring: 'ring-rose-500/20' },
                { label: 'Payroll', count: `₹${employees.reduce((s, e) => s + (e.salary || 0), 0).toLocaleString()}`, color: 'text-violet-400', icon: DollarSign, bg: 'bg-violet-500/10', ring: 'ring-violet-500/20' },
              ].map(s => (
                <div key={s.label} className={`${s.bg} ring-1 ${s.ring} rounded-xl px-4 py-3 flex items-center gap-3`}>
                  <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center shrink-0`}>
                    <s.icon className={`w-4 h-4 ${s.color}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-3xs text-slate-500 uppercase tracking-wider font-medium">{s.label}</p>
                    <p className={`text-sm font-extrabold ${s.color} leading-tight`}>{s.count}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Employee cards — responsive grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 max-h-[55vh] overflow-y-auto pr-1">
              {employees.filter(emp => {
                const q = empSearch.toLowerCase();
                return !q || emp.name.toLowerCase().includes(q) || emp.email.toLowerCase().includes(q) || emp.id.toLowerCase().includes(q) || (emp.designation || '').toLowerCase().includes(q);
              }).map(emp => {
                const statusVal = emp.status || (emp.mustChangePassword ? 'Invited' : 'Active');
                const deptStr = Array.isArray(emp.department) ? emp.department.join(' + ') : emp.department;
                const empTasks = (tasks || []).filter(t => t.assignedTo === emp.id);
                const pendingTasks = empTasks.filter(t => ['New', 'In Progress', 'Review'].includes(t.status)).length;
                const empHours = (timelogs || []).filter(l => l.employeeId === emp.id).reduce((s, l) => s + (l.hours || 0), 0);
                return (
                  <button key={emp.id} onClick={() => setSelectedEmp(emp)}
                    className="glass-card p-4 rounded-xl border border-slate-800/40 text-left hover:border-violet-500/30 hover:bg-slate-800/20 transition group cursor-pointer">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-violet-600 flex items-center justify-center font-bold text-white text-xs shrink-0 group-hover:scale-105 transition">
                        {emp.name.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-slate-100 text-sm truncate">{emp.name}</div>
                        <div className="text-3xs text-slate-500 truncate">{emp.designation || deptStr || 'Staff'}</div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-3xs font-medium shrink-0 ${STATUS_COLORS[statusVal] || 'bg-slate-800 text-slate-400'}`}>
                        {statusVal}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>{pendingTasks} active task{pendingTasks !== 1 ? 's' : ''}</span>
                      <span>{empHours.toFixed(1)}h logged</span>
                      {emp.salary > 0 && <span className="font-mono">₹{emp.salary.toLocaleString()}</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="glass-panel p-4 sm:p-6 rounded-2xl space-y-4 lg:col-span-1">
            <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
              {editingEmpId ? <Edit2 className="w-5 h-5 text-violet-400" /> : <Plus className="w-5 h-5 text-violet-400" />}
              {editingEmpId ? 'Modify Staff Details' : 'Invite New Employee'}
            </h3>
            
            <form onSubmit={handleSaveEmployee} className="space-y-4">
              <div>
                <label className="block text-3xs text-slate-400 uppercase tracking-wider mb-1 font-semibold">Full Name</label>
                <input
                  type="text"
                  value={empName}
                  onChange={(e) => setEmpName(e.target.value)}
                  className="w-full glass-input p-3 rounded-xl text-sm animate-fade-in"
                  placeholder="Sneha Rao"
                  required
                />
              </div>

              <div>
                <label className="block text-3xs text-slate-400 uppercase tracking-wider mb-1 font-semibold">Work Email</label>
                <input
                  type="email"
                  value={empEmail}
                  onChange={(e) => setEmpEmail(e.target.value)}
                  className="w-full glass-input p-3 rounded-xl text-sm font-mono"
                  placeholder="sneha@digitalbuddies.in"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-3xs text-slate-400 uppercase tracking-wider mb-1 font-semibold">Phone Number</label>
                  <input
                    type="text"
                    value={empPhone}
                    onChange={(e) => setEmpPhone(e.target.value)}
                    className="w-full glass-input p-3 rounded-xl text-xs font-mono"
                    placeholder="+91 99999 99999"
                  />
                </div>
                <div>
                  <label className="block text-3xs text-slate-400 uppercase tracking-wider mb-1 font-semibold">Designation</label>
                  <input
                    type="text"
                    value={empDesignation}
                    onChange={(e) => setEmpDesignation(e.target.value)}
                    className="w-full glass-input p-3 rounded-xl text-xs"
                    placeholder="Senior Developer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-3xs text-slate-400 uppercase tracking-wider mb-2 font-semibold">Department(s)</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Paid Ads', 'Social Media', 'Video Editors', 'Graphic Designers', 'Videography/Photography', 'Developers', 'HR', 'Management'].map(dept => (
                      <label key={dept} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition text-xs ${
                        empDept.includes(dept)
                          ? 'bg-violet-500/15 border-violet-500/30 text-violet-300'
                          : 'bg-slate-900/40 border-slate-800/50 text-slate-400 hover:border-slate-700'
                      }`}>
                        <input type="checkbox" checked={empDept.includes(dept)}
                          onChange={() => setEmpDept(prev =>
                            prev.includes(dept) ? prev.filter(d => d !== dept) : [...prev, dept]
                          )}
                          className="sr-only" />
                        {dept === 'Videography/Photography' ? 'Videography' : dept === 'HR' ? 'HR & Admin' : dept}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  {empDept.includes('Videography/Photography') && (
                    <div>
                      <label className="block text-3xs text-slate-400 uppercase tracking-wider mb-1 font-semibold">Role Type</label>
                      <select
                        value={empSubType}
                        onChange={(e) => setEmpSubType(e.target.value)}
                        className="w-full glass-input p-3 rounded-xl text-xs"
                      >
                        <option value="">-- Select Role --</option>
                        <option value="Videographer">Videographer</option>
                        <option value="Content Creator">Content Creator / Influencer</option>
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="block text-3xs text-slate-400 uppercase tracking-wider mb-1 font-semibold">Base Salary (₹)</label>
                  <input
                    type="number"
                    value={empSalary}
                    onChange={(e) => setEmpSalary(e.target.value)}
                    className="w-full glass-input p-3 rounded-xl text-sm font-mono"
                    placeholder="60000"
                    required
                  />
                </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-3xs text-slate-400 uppercase tracking-wider mb-1 font-semibold">System Role</label>
                  <select
                    value={empRole}
                    onChange={(e) => setEmpRole(e.target.value)}
                    disabled={user.role !== 'Super Admin'}
                    className="w-full glass-input p-3 rounded-xl text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="Employee">Employee</option>
                    <option value="Manager">Manager</option>
                    <option value="HR">HR</option>
                    <option value="Super Admin">Super Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-3xs text-slate-400 uppercase tracking-wider mb-1 font-semibold">Join Date</label>
                  <DatePicker value={empHire} onChange={setEmpHire} />
                </div>
              </div>
              <div>
                <label className="block text-3xs text-slate-400 uppercase tracking-wider mb-1 font-semibold">Report Manager</label>
                <select
                  value={empManagerId}
                  onChange={(e) => setEmpManagerId(e.target.value)}
                  className="w-full glass-input p-3 rounded-xl text-xs"
                >
                  <option value="">-- Choose Manager --</option>
                  {employees.filter(e => e.role === 'Manager' || e.role === 'Super Admin').map(mgr => (
                    <option key={mgr.id} value={mgr.id}>{mgr.name} ({mgr.id})</option>
                  ))}
                </select>
              </div>
              
              <button
                type="submit"
                disabled={inviteSubmitting}
                className="w-full bg-neon-gradient hover:opacity-95 text-white font-medium py-3 rounded-xl shadow-md transition disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer inline-flex items-center justify-center gap-2"
              >
                {inviteSubmitting ? (
                  <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing...</>
                ) : editingEmpId ? 'Save Changes' : 'Invite Staff Member'}
              </button>

              {editingEmpId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="w-full bg-slate-800 text-slate-200 py-2.5 rounded-xl text-sm hover:bg-slate-700 transition cursor-pointer"
                >
                  Cancel Edit
                </button>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Employee detail modal */}
      {selectedEmp && (() => {
        const statusVal = selectedEmp.status || (selectedEmp.mustChangePassword ? 'Invited' : 'Active');
        const deptStr = Array.isArray(selectedEmp.department) ? selectedEmp.department.join(' + ') : selectedEmp.department;
        const empTasks = (tasks || []).filter(t => t.assignedTo === selectedEmp.id);
        const completedTasks = empTasks.filter(t => t.status === 'Completed').length;
        const pendingTasks = empTasks.filter(t => ['New', 'In Progress', 'Review'].includes(t.status)).length;
        const overdueTasks = empTasks.filter(t => t.status !== 'Completed' && t.dueDate && t.dueDate < todayStr()).length;
        const empHours = (timelogs || []).filter(l => l.employeeId === selectedEmp.id).reduce((s, l) => s + (l.hours || 0), 0);
        const reportManager = employees.find(e => e.id === selectedEmp.managerId);
        return (
          <Modal open={!!selectedEmp} title="Employee Profile" onClose={() => setSelectedEmp(null)} size="lg">
            <div className="space-y-5">
              {/* Header */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-violet-600 flex items-center justify-center font-bold text-white text-lg shrink-0">
                  {selectedEmp.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-extrabold text-slate-100 truncate">{selectedEmp.name}</h3>
                  <p className="text-sm text-slate-400">{selectedEmp.designation || deptStr || 'Staff'}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-3xs font-medium ${STATUS_COLORS[statusVal] || 'bg-slate-800 text-slate-400'}`}>
                      {statusVal}
                    </span>
                    <span className="text-3xs text-slate-500">{selectedEmp.role}</span>
                  </div>
                </div>
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  ['Email', selectedEmp.email, 'font-mono text-xs'],
                  ['Phone', selectedEmp.phone || '—', 'font-mono text-xs'],
                  ['Department', deptStr || '—', ''],
                  ['Salary', selectedEmp.salary ? `₹${selectedEmp.salary.toLocaleString()}` : '—', 'font-mono text-xs'],
                  ['Join Date', selectedEmp.hireDate || '—', ''],
                  ['Report Manager', reportManager?.name || '—', ''],
                ].map(([label, value, cls]) => (
                  <div key={label} className="bg-slate-900/40 rounded-lg p-3">
                    <p className="text-3xs text-slate-500 uppercase tracking-wider mb-0.5">{label}</p>
                    <p className={`text-xs text-slate-200 font-medium truncate ${cls}`}>{value}</p>
                  </div>
                ))}
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  [empTasks.length, 'Total Tasks', 'text-violet-400'],
                  [completedTasks, 'Completed', 'text-emerald-400'],
                  [pendingTasks, 'Pending', 'text-amber-400'],
                  [overdueTasks, 'Overdue', 'text-rose-400'],
                ].map(([val, lbl, tone]) => (
                  <div key={lbl} className="text-center p-2 rounded-lg bg-slate-900/40">
                    <p className={`text-sm font-bold ${tone}`}>{val}</p>
                    <p className="text-3xs text-slate-500">{lbl}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-fuchsia-400 font-bold">
                <Clock className="w-4 h-4" /> {empHours.toFixed(1)} total hours logged
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800/40">
                <button onClick={() => { setSelectedEmp(null); handleEditEmployee(selectedEmp); }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-violet-600/15 text-violet-400 text-xs font-semibold hover:bg-violet-600/25 transition">
                  <Edit2 className="w-3.5 h-3.5" /> Edit Profile
                </button>
                <button onClick={() => { setSelectedEmp(null); handleViewActivity(selectedEmp); }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800/60 text-slate-300 text-xs font-semibold hover:bg-slate-800 transition">
                  <Activity className="w-3.5 h-3.5" /> Activity Logs
                </button>
                {statusVal === 'Invited' && (
                  <button onClick={() => { handleResendInvite(selectedEmp); }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500/10 text-amber-400 text-xs font-semibold hover:bg-amber-500/20 transition">
                    <RefreshCw className="w-3.5 h-3.5" /> Resend Invite
                  </button>
                )}
                {user.role === 'Super Admin' && (
                  <>
                    <button onClick={() => { handleToggleSuspend(selectedEmp); }}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                        statusVal === 'Suspended' ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' : 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
                      }`}>
                      {statusVal === 'Suspended' ? <><Check className="w-3.5 h-3.5" /> Activate</> : <><X className="w-3.5 h-3.5" /> Suspend</>}
                    </button>
                    <button onClick={() => { handleResetPassword(selectedEmp); }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-violet-600/15 text-violet-400 text-xs font-semibold hover:bg-violet-600/25 transition">
                      <Key className="w-3.5 h-3.5" /> Reset Password
                    </button>
                    <button onClick={() => { handleDeleteEmployee(selectedEmp.id); setSelectedEmp(null); }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-600/15 text-rose-400 text-xs font-semibold hover:bg-rose-600/25 transition">
                      <Trash2 className="w-3.5 h-3.5" /> Terminate
                    </button>
                  </>
                )}
              </div>
            </div>
          </Modal>
        );
      })()}

      {/* -------------------------
          SUBTAB: ATTENDANCE & LEAVES
          ------------------------- */}
      {activeSubTab === 'attendance' && (
        <AttendanceLeaves
          employees={employees}
          leaves={leaves}
          attendance={attendance}
          attendanceDocs={attendanceDocs}
          leaveEmpId={leaveEmpId} setLeaveEmpId={setLeaveEmpId}
          leaveStart={leaveStart} setLeaveStart={setLeaveStart}
          leaveEnd={leaveEnd} setLeaveEnd={setLeaveEnd}
          leaveType={leaveType} setLeaveType={setLeaveType}
          leaveReason={leaveReason} setLeaveReason={setLeaveReason}
          clockEmpId={clockEmpId} setClockEmpId={setClockEmpId}
          clockInTime={clockInTime} setClockInTime={setClockInTime}
          clockOutTime={clockOutTime} setClockOutTime={setClockOutTime}
          docLabel={docLabel} setDocLabel={setDocLabel}
          uploadingDoc={uploadingDoc}
          fileInputRef={fileInputRef}
          handleApplyLeave={handleApplyLeave}
          handleUpdateLeaveStatus={handleUpdateLeaveStatus}
          handleClockIn={handleClockIn}
          handleUploadAttendanceDoc={handleUploadAttendanceDoc}
        />
      )}

      {/* -------------------------
          SUBTAB: TIMESHEETS AUDIT LOGS
          ------------------------- */}
      {activeSubTab === 'timelogs' && (
        <TimesheetAudit
          employees={employees}
          timelogs={timelogs}
          tasks={tasks}
          handleExportTimelogs={handleExportTimelogs}
        />
      )}

      {/* -------------------------
          SUBTAB: SALARY & ADVANCES
          ------------------------- */}
      {activeSubTab === 'salary' && (
        <SalaryAdvances
          employees={employees}
          advances={advances}
          advEmpId={advEmpId} setAdvEmpId={setAdvEmpId}
          advAmount={advAmount} setAdvAmount={setAdvAmount}
          advReason={advReason} setAdvReason={setAdvReason}
          handleRequestAdvance={handleRequestAdvance}
          handleUpdateAdvanceStatus={handleUpdateAdvanceStatus}
          getEmployeePayrollDetails={getEmployeePayrollDetails}
          setSelectedPayslipEmp={setSelectedPayslipEmp}
        />
      )}

      {/* -------------------------
          SUBTAB: CLIENT ROUTER
          ------------------------- */}
      {activeSubTab === 'router' && (
        <ConnectLeads
          employees={employees}
          devProjects={devProjects}
          routeClientName={routeClientName} setRouteClientName={setRouteClientName}
          routeProjectName={routeProjectName} setRouteProjectName={setRouteProjectName}
          routeDevId={routeDevId} setRouteDevId={setRouteDevId}
          handleRouteClient={handleRouteClient}
        />
      )}

      {/* -------------------------
          SUBTAB: INTERVIEWS
          ------------------------- */}
      {activeSubTab === 'interviews' && (
        <Interviews
          employees={employees}
          interviews={interviews}
          candName={candName} setCandName={setCandName}
          candPos={candPos} setCandPos={setCandPos}
          candDate={candDate} setCandDate={setCandDate}
          candTime={candTime} setCandTime={setCandTime}
          candInterviewer={candInterviewer} setCandInterviewer={setCandInterviewer}
          candLink={candLink} setCandLink={setCandLink}
          handleScheduleInterview={handleScheduleInterview}
        />
      )}

      {/* -------------------------
          SUBTAB: CLIENT FEEDBACK
          ------------------------- */}
      {activeSubTab === 'feedback' && (
        <ClientFeedback
          feedback={feedback}
          fbClient={fbClient} setFbClient={setFbClient}
          fbDept={fbDept} setFbDept={setFbDept}
          fbRating={fbRating} setFbRating={setFbRating}
          fbComment={fbComment} setFbComment={setFbComment}
          handleAddFeedback={handleAddFeedback}
        />
      )}

      {/* -------------------------
          SUBTAB: PAYMENT SECURITY & OPERATIONS
          ------------------------- */}
      {activeSubTab === 'security' && (
        <SecurityOps
          dailyOps={dailyOps}
          updateState={updateState}
          escrows={escrows} setEscrows={setEscrows}
          escrowOpen={escrowOpen} setEscrowOpen={setEscrowOpen}
          escrowName={escrowName} setEscrowName={setEscrowName}
          escrowAmount={escrowAmount} setEscrowAmount={setEscrowAmount}
          newOpsText={newOpsText} setNewOpsText={setNewOpsText}
          handleAddEscrow={handleAddEscrow}
          handleToggleEscrow={handleToggleEscrow}
          handleAddOps={handleAddOps}
        />
      )}

      {/* -------------------------
          INVITE LINK MODAL
          ------------------------- */}
      {showInviteModal && createdInviteInfo && (() => {
        // Build the one-time invite link using the token stored on the invite record
        const inviteRecord = (state.employeeInvites || [])
          .filter(inv => inv.email === createdInviteInfo.email)
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
        const inviteLink = inviteRecord
          ? `${window.location.origin}?invite=${inviteRecord.token}`
          : window.location.origin;

        const isReset  = createdInviteInfo.type === 'reset';
        const isResend = createdInviteInfo.type === 'resend';
        const headerTitle = isReset ? 'Password reset — new link generated' : isResend ? 'Invite resent — new link generated' : 'Employee created — invite link ready';
        const headerSub   = `Share this link with ${createdInviteInfo.name} via WhatsApp or any chat`;

        const waMessage = `Hi ${createdInviteInfo.name}! 👋\n\nYou've been invited to join the Digital Buddies ERP portal.\n\nClick the link below to set your password and get started — it expires in 7 hours and works only once:\n\n🔗 ${inviteLink}\n\nWelcome to the team! 🎉`;
        const waUrl = `https://wa.me/?text=${encodeURIComponent(waMessage)}`;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-violet-500/20 rounded-2xl p-6 max-w-md w-full space-y-5 shadow-2xl">

              {/* Header */}
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2.5">
                  <div className="bg-green-500/15 p-2 rounded-xl">
                    <Check className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-100">{headerTitle}</h3>
                    <p className="text-xs text-slate-400">{headerSub}</p>
                  </div>
                </div>
                <button onClick={() => { setShowInviteModal(false); setCreatedInviteInfo(null); }} className="text-slate-500 hover:text-slate-300 transition cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Invite link card */}
              <div className="bg-slate-950 border border-violet-500/20 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-500 uppercase tracking-wider flex-shrink-0">For</span>
                  <span className="text-xs text-slate-200 font-semibold">{createdInviteInfo.name}</span>
                </div>
                <div className="border-t border-slate-800/60" />
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-500 uppercase tracking-wider flex-shrink-0">Email</span>
                  <span className="text-xs text-slate-300 font-mono">{createdInviteInfo.email}</span>
                </div>
                <div className="border-t border-slate-800/60" />
                <div className="space-y-2">
                  <span className="text-xs text-slate-500 uppercase tracking-wider block">One-time invite link</span>
                  <div className="bg-slate-900 border border-violet-500/30 rounded-lg px-3 py-2 flex items-center gap-2">
                    <span className="text-xs text-violet-300 font-mono break-all flex-1 select-all">{inviteLink}</span>
                    <button
                      onClick={() => { navigator.clipboard.writeText(inviteLink); toast.success('Invite link copied!'); }}
                      className="flex-shrink-0 text-slate-500 hover:text-violet-300 transition cursor-pointer"
                      title="Copy link"
                    >
                      <Key className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Expiry note */}
              <p className="text-xs text-amber-500/80 flex items-start gap-1.5">
                <Key className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                This link expires in 7 hours and becomes invalid after the employee uses it once. If it expires, use "Resend Invite" to generate a new one.
              </p>

              {/* Share buttons */}
              <div className="space-y-2">
                <p className="text-xs text-slate-500 font-medium">Share via</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => { navigator.clipboard.writeText(inviteLink); toast.success('Invite link copied to clipboard.'); }}
                    className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold py-2.5 px-3 rounded-xl transition cursor-pointer"
                  >
                    <Key className="w-3.5 h-3.5" /> Copy link
                  </button>
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#25D366] text-xs font-semibold py-2.5 px-3 rounded-xl transition"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    WhatsApp
                  </a>
                </div>
              </div>

              <button
                onClick={() => { setShowInviteModal(false); setCreatedInviteInfo(null); }}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-semibold py-2.5 rounded-xl transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        );
      })()}

      {/* -------------------------
          LOGIN ACTIVITY HISTORY MODAL
          ------------------------- */}
      {showActivityModal && selectedActivityEmp && (() => {
        const activityLogs = (state.loginActivity || []).filter(log => log.employeeId === selectedActivityEmp.id);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-2xl w-full space-y-4 relative shadow-2xl">
              <div className="flex justify-between items-start border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-md font-bold text-slate-100 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-violet-400" />
                    Login Activity Logs
                  </h3>
                  <p className="text-3xs text-slate-400">
                    Showing sessions history for <span className="text-slate-200 font-bold">{selectedActivityEmp.name}</span>
                  </p>
                </div>
                <button onClick={() => { setShowActivityModal(false); setSelectedActivityEmp(null); }} className="text-slate-400 hover:text-slate-200">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                <table className="w-full text-left border-collapse text-2xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase">
                      <th className="py-2 px-3">Login Time</th>
                      <th className="py-2 px-3">Logout Time</th>
                      <th className="py-2 px-3">IP Address</th>
                      <th className="py-2 px-3">Device / Browser</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40 text-slate-300">
                    {activityLogs.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-500">
                          <Activity className="w-6 h-6 text-slate-600 mx-auto mb-2" />
                          <p className="text-xs">No login session logs found.</p>
                        </td>
                      </tr>
                    ) : (
                      activityLogs.map(log => (
                        <tr key={log.id} className="hover:bg-slate-950/20">
                          <td className="py-2.5 px-3 font-mono text-violet-300">{log.loginAt}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-400">
                            {log.logoutAt ? (
                              <span className="text-emerald-400">{log.logoutAt}</span>
                            ) : (
                              <span className="text-amber-400 font-semibold animate-pulse">Active Session</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-300">{log.ipAddress}</td>
                          <td className="py-2.5 px-3 truncate max-w-[200px]" title={log.device}>
                            {log.device}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-800">
                <button
                  onClick={() => { setShowActivityModal(false); setSelectedActivityEmp(null); }}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold py-2.5 px-5 rounded-xl transition cursor-pointer"
                >
                  Close Log History
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      <ConfirmDialog
        open={confirmState.open}
        onClose={() => setConfirmState({ open: false, message: '', onConfirm: null })}
        onConfirm={confirmState.onConfirm}
        message={confirmState.message}
      />
    </div>
  );
}