import React, { useState } from 'react';
import { 
  Users, Calendar, Clock, DollarSign, Send, Star, ShieldCheck, Briefcase, Plus, 
  Trash2, Edit2, Check, X, Printer, Download, Key, RefreshCw, Activity
} from 'lucide-react';
import { useToast } from '../shared/Toast';
import { db } from '../../data/db';
import { emailService } from '../../lib/emailService';
import { DatePicker } from '../ui';

const todayStr = () => new Date().toISOString().split('T')[0];

export default function HR({ state, updateState, user = { role: 'Super Admin', id: 'EMP01' } }) {
  const toast = useToast();
  const { employees, attendance, leaves, advances, clients, devProjects, interviews, feedback, dailyOps, timelogs, tasks } = state;

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

  // Modals / Popups state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [createdInviteInfo, setCreatedInviteInfo] = useState(null);
  const [empSearch, setEmpSearch] = useState('');
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [selectedActivityEmp, setSelectedActivityEmp] = useState(null);

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

        try {
          await db.updateEmployee(editingEmpId, updatedFields);
        } catch (err) {
          toast.error(`Could not save changes: ${err.message}`);
          return;
        }

        const updated = employees.map(emp =>
          emp.id === editingEmpId ? { ...emp, ...updatedFields } : emp
        );
        updateState({ employees: updated });
        toast.success('Employee details updated.');
        resetForm();
      } else {
        // Find maximum numeric value in existing employee IDs
        const nextNum = employees.reduce((max, e) => {
          const num = parseInt(e.id.replace('EMP', ''), 10);
          return isNaN(num) ? max : (num > max ? num : max);
        }, 0) + 1;
        const employeeId = `EMP${String(nextNum).padStart(2, '0')}`;
  const inviteToken =
    'tok_' + Math.random().toString(36).substring(2, 10);

  const normalizedEmail =
    empEmail.toLowerCase().trim();

        const newEmp = {
          id: employeeId,
          name: empName,
          email: normalizedEmail,
          phone: empPhone || "+91 99999 99999",
          role: empRole,
          department: empDept,
          designation: empDesignation || `${empDept[0] || 'General'} Specialist`,
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

        const newInvite = {
          id: `INV${Date.now()}`,
          employeeId: employeeId,
          email: normalizedEmail,
          token: inviteToken,
          expiresAt: new Date(Date.now() + 7*60*60*1000).toISOString(),
          accepted: false,
          createdBy: user?.id || 'EMP01',
          createdAt: new Date().toISOString()
        };

        // Step 1a: Write employee row to Supabase FIRST.
        try {
          await db.addEmployee(newEmp);
        } catch (empErr) {
          toast.error(`Could not create employee record: ${empErr.message}`);
          return;
        }

        // Step 1b: Write invite record while HR session is still active
        try {
          await db.addEmployeeInvite(newInvite);
        } catch (inviteErr) {
          toast.error(`Could not save invite record: ${inviteErr.message}`);
          return;
        }

        updateState({
          employees: [...employees, newEmp],
          employeeInvites: [...(state.employeeInvites || []), newInvite]
        });

        // Step 2: Send welcome email (non-fatal)
        try {
          await emailService.sendWelcomeEmail({
            name: empName,
            email: normalizedEmail
          });
        } catch (emailErr) {
          console.warn('[Invite] Welcome email failed:', emailErr.message);
          toast.warning('Employee created but welcome email could not be sent. Share credentials manually.');
        }

        setCreatedInviteInfo({
          name: empName,
          email: normalizedEmail,
          type: 'create'
        });
        setShowInviteModal(true);
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
  };

  const handleDeleteEmployee = async (id) => {
    if (window.confirm('Are you sure you want to terminate this employee profile?')) {
      try {
        await db.deleteEmployee(id);
        const updated = employees.filter(emp => emp.id !== id);
        updateState({ employees: updated });
        toast.success('Employee terminated.');
      } catch (err) {
        toast.error(`Could not terminate: ${err.message}`);
      }
    }
  };

  const handleToggleSuspend = async (emp) => {
    const nextStatus = emp.status === 'Suspended' ? 'Active' : 'Suspended';
    if (!window.confirm(`Are you sure you want to change status to ${nextStatus} for ${emp.name}?`)) return;
    try {
      await db.updateEmployee(emp.id, { status: nextStatus });
      const updated = employees.map(e => e.id === emp.id ? { ...e, status: nextStatus } : e);
      updateState({ employees: updated });
      toast.success(`Employee status updated to ${nextStatus}`);
    } catch (err) {
      toast.error(`Could not update status: ${err.message}`);
    }
  };

  const handleResendInvite = async (emp) => {
    const inviteToken =
      'tok_' + Math.random().toString(36).substring(2, 10);
  
    const normalizedEmail =
      emp.email.toLowerCase().trim();
  
    const newInvite = {
      id: `INV${Date.now()}`,
      employeeId: emp.id,
      email: normalizedEmail,
      token: inviteToken,
      expiresAt: new Date(
        Date.now() + 7 * 60 * 60 * 1000
      ).toISOString(),
      accepted: false,
      createdBy: user?.id || 'EMP01',
      createdAt: new Date().toISOString()
    };
  
    const updated = employees.map((e) =>
      e.id === emp.id
        ? {
            ...e,
            status: 'Invited',
            mustChangePassword: true
          }
        : e
    );
  
    try {
      await db.addEmployeeInvite(newInvite);
    } catch (inviteErr) {
      toast.error(
        `Could not save invite record: ${inviteErr.message}`
      );
      return;
    }
  
    updateState({
      employees: updated,
      employeeInvites: [
        ...(state.employeeInvites || []),
        newInvite
      ]
    });
  
    try {
      await emailService.sendWelcomeEmail({
        name: emp.name,
        email: normalizedEmail
      });
    } catch (emailErr) {
      console.warn(
        '[ResendInvite] Email failed:',
        emailErr.message
      );
  
      toast.warning(
        'Invite generated but email could not be sent.'
      );
    }
  
    setCreatedInviteInfo({
      name: emp.name,
      email: normalizedEmail,
      type: 'resend'
    });
  
    setShowInviteModal(true);
    toast.success(`Invitation resent to ${emp.name}`);
  };

  const handleResetPassword = async (emp) => {
    if (
      !window.confirm(
        `Are you sure you want to reset password for ${emp.name}?`
      )
    ) {
      return;
    }
  
    const inviteToken =
      'tok_' + Math.random().toString(36).substring(2, 10);
  
    const normalizedEmail =
      emp.email.toLowerCase().trim();
  
    const newInvite = {
      id: `INV${Date.now()}`,
      employeeId: emp.id,
      email: normalizedEmail,
      token: inviteToken,
      expiresAt: new Date(
        Date.now() + 7 * 60 * 60 * 1000
      ).toISOString(),
      accepted: false,
      createdBy: user?.id || 'EMP01',
      createdAt: new Date().toISOString()
    };
  
    try {
      await db.addEmployeeInvite(newInvite);
    } catch (inviteErr) {
      toast.error(
        `Could not save invite record: ${inviteErr.message}`
      );
      return;
    }
  
    const updated = employees.map((e) =>
      e.id === emp.id
        ? {
            ...e,
            status: 'Invited',
            mustChangePassword: true
          }
        : e
    );
  
    updateState({
      employees: updated,
      employeeInvites: [
        ...(state.employeeInvites || []),
        newInvite
      ]
    });
  
    try {
      await emailService.sendWelcomeEmail({
        name: emp.name,
        email: normalizedEmail
      });
    } catch (emailErr) {
      console.warn(
        '[ResetPassword] Email failed:',
        emailErr.message
      );
  
      toast.warning(
        'Password reset link generated but email could not be sent.'
      );
    }
  
    setCreatedInviteInfo({
      name: emp.name,
      email: normalizedEmail,
      type: 'reset'
    });
  
    setShowInviteModal(true);
  
    toast.success(
      `Password setup link sent to ${emp.name}.`
    );
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
      id: `INT${Date.now()}`,
      candidateName: candName,
      position: candPos,
      date: dateTime,
      interviewerId: candInterviewer || 'EMP01',
      status: 'Scheduled',
      link: candLink || 'https://meet.google.com'
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
      id: `PROJ${Date.now()}`,
      name: routeProjectName || `${routeClientName} Website Setup`,
      client: routeClientName,
      description: 'Incoming website client routed to Dev channel.',
      status: 'Backlog',
      devId: routeDevId,
      deadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };

    const newClient = {
      id: `CL${Date.now()}`,
      name: routeClientName,
      email: 'routed@neomax.com',
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
      id: `FB${Date.now()}`,
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
      id: `LV${Date.now()}`,
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
      id: `ATT${Date.now()}`,
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
      id: `ADV${Date.now()}`,
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
      id: `ESC${Date.now()}`,
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
      id: `OPS${Date.now()}`,
      task: newOpsText.trim(),
      status: 'Pending'
    };
    updateState({ dailyOps: [...dailyOps, newOps] });
    setNewOpsText('');
    toast.success('Operation task added');
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 print:hidden">
          <div className="glass-panel p-6 rounded-2xl lg:col-span-2 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-slate-100">Registered Team Directory</h3>
              <div className="flex items-center gap-3">
                <div className="relative flex-1 sm:flex-initial">
                  <input type="text" value={empSearch} onChange={e => setEmpSearch(e.target.value)}
                    className="w-full sm:w-48 glass-input pl-8 pr-3 py-2 rounded-xl text-xs"
                    placeholder="Search members..." />
                  <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
                <span className="text-2xs text-slate-400 font-mono font-medium whitespace-nowrap">{employees.length} total</span>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Active', count: employees.filter(e => (e.status || 'Active') === 'Active').length, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                { label: 'Invited', count: employees.filter(e => (e.status || 'Active') === 'Invited').length, color: 'text-amber-400', bg: 'bg-amber-500/10' },
                { label: 'Suspended', count: employees.filter(e => (e.status || 'Active') === 'Suspended').length, color: 'text-rose-400', bg: 'bg-rose-500/10' },
                { label: 'Total Payroll', count: `₹${employees.reduce((s, e) => s + (e.salary || 0), 0).toLocaleString()}`, color: 'text-violet-400', bg: 'bg-violet-500/10' },
              ].map(s => (
                <div key={s.label} className={`${s.bg} rounded-xl px-4 py-3 border border-slate-800/40`}>
                  <p className="text-3xs text-slate-500 uppercase tracking-wider">{s.label}</p>
                  <p className={`text-sm font-bold ${s.color} mt-0.5`}>{s.count}</p>
                </div>
              ))}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-xs font-semibold uppercase">
                    <th className="py-3 px-4">Employee Details</th>
                    <th className="py-3 px-4">Role / Department</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Salary</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {employees.filter(emp => {
                    const q = empSearch.toLowerCase();
                    return !q || emp.name.toLowerCase().includes(q) || emp.email.toLowerCase().includes(q) || emp.id.toLowerCase().includes(q) || (emp.designation || '').toLowerCase().includes(q);
                  }).map(emp => {
                    const statusColors = {
                      Invited: 'bg-amber-500/10 text-amber-400 border border-amber-500/15',
                      Active: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15',
                      Suspended: 'bg-rose-500/10 text-rose-400 border border-rose-500/15',
                      Terminated: 'bg-slate-800 text-slate-500 border border-slate-800'
                    };
                    const statusVal = emp.status || (emp.mustChangePassword ? 'Invited' : 'Active');
                    
                    return (
                      <tr key={emp.id} className="text-slate-300 hover:bg-slate-900/25">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-violet-600 flex items-center justify-center font-bold text-white text-xs">
                              {emp.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                                {emp.name}
                                <span className="text-4xs text-slate-400 font-mono">({emp.id})</span>
                              </div>
                              <div className="text-2xs text-slate-400 font-mono">{emp.email}</div>
                              {emp.phone && <div className="text-3xs text-slate-500">{emp.phone}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="text-xs font-semibold text-slate-200">{emp.designation || `${Array.isArray(emp.department) ? emp.department[0] : emp.department} Staff`}</div>
                          <div className="text-3xs text-slate-400 uppercase tracking-wider">{emp.role} • {Array.isArray(emp.department) ? emp.department.join(' + ') : emp.department}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-3xs font-medium ${statusColors[statusVal] || 'bg-slate-800 text-slate-400'}`}>
                            {statusVal}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-xs font-mono">₹{(emp.salary || 0).toLocaleString()}</td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex gap-1.5 justify-end">
                            {/* View Activity */}
                            <button
                              onClick={() => handleViewActivity(emp)}
                              className="p-1.5 hover:bg-slate-800/60 rounded text-slate-400 hover:text-slate-200 transition cursor-pointer"
                              title="View Activity Logs"
                            >
                              <Activity className="w-3.5 h-3.5" />
                            </button>

                            {/* Resend Invite */}
                            {statusVal === 'Invited' && (
                              <button
                                onClick={() => handleResendInvite(emp)}
                                className="p-1.5 hover:bg-amber-500/10 rounded text-amber-400 transition cursor-pointer"
                                title="Resend Welcome Invitation"
                              >
                                <RefreshCw className="w-3.5 h-3.5 animate-spin-hover" />
                              </button>
                            )}

                            {/* Edit Employee details */}
                            <button
                              onClick={() => handleEditEmployee(emp)}
                              className="p-1.5 hover:bg-violet-600/20 rounded text-violet-400 transition cursor-pointer"
                              title="Edit Profile"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Actions restricted to Super Admin only */}
                            {user.role === 'Super Admin' && (
                              <>
                                {/* Suspend/Activate */}
                                <button
                                  onClick={() => handleToggleSuspend(emp)}
                                  className={`p-1.5 rounded transition cursor-pointer ${
                                    statusVal === 'Suspended' 
                                      ? 'hover:bg-emerald-600/20 text-emerald-400' 
                                      : 'hover:bg-rose-600/20 text-rose-400'
                                  }`}
                                  title={statusVal === 'Suspended' ? 'Unsuspend / Activate' : 'Suspend Account'}
                                >
                                  {statusVal === 'Suspended' ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                                </button>

                                {/* Reset Password */}
                                <button
                                  onClick={() => handleResetPassword(emp)}
                                  className="p-1.5 hover:bg-violet-600/20 rounded text-violet-400 transition cursor-pointer"
                                  title="Reset Password & Set Force Change"
                                >
                                  <Key className="w-3.5 h-3.5" />
                                </button>

                                {/* Terminate Profile */}
                                <button
                                  onClick={() => handleDeleteEmployee(emp.id)}
                                  className="p-1.5 hover:bg-rose-600/20 rounded text-rose-400 transition cursor-pointer"
                                  title="Terminate / Delete Profile"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl space-y-6 lg:col-span-1">
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

      {/* -------------------------
          SUBTAB: ATTENDANCE & LEAVES
          ------------------------- */}
      {activeSubTab === 'attendance' && (
        <div className="space-y-6 print:hidden">
          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Pending Leaves', count: leaves.filter(l => l.status === 'Pending').length, color: 'text-amber-400', bg: 'bg-amber-500/10' },
              { label: 'Approved', count: leaves.filter(l => l.status === 'Approved').length, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
              { label: 'Rejected', count: leaves.filter(l => l.status === 'Rejected').length, color: 'text-rose-400', bg: 'bg-rose-500/10' },
              { label: 'Today Logged', count: attendance.filter(a => a.logDate === todayStr() || a.date === todayStr()).length, color: 'text-blue-400', bg: 'bg-blue-500/10' },
            ].map(s => (
              <div key={s.label} className={`${s.bg} rounded-xl px-4 py-3 border border-slate-800/40`}>
                <p className="text-3xs text-slate-500 uppercase tracking-wider">{s.label}</p>
                <p className={`text-sm font-bold ${s.color} mt-0.5`}>{s.count}</p>
              </div>
            ))}
          </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Leaves Manager */}
          <div className="glass-panel p-6 rounded-2xl space-y-6">
            <h3 className="text-lg font-semibold text-slate-100">Leave Requests & Approvals</h3>
            
            <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
              {leaves.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center border border-dashed border-slate-800/60 rounded-xl">
                  <Clock className="w-8 h-8 text-slate-600 mb-2" />
                  <p className="text-xs text-slate-500">No leave requests logged yet.</p>
                </div>
              ) : (
                leaves.map(l => {
                  const emp = employees.find(e => e.id === l.employeeId);
                  return (
                    <div key={l.id} className="glass-card p-4 rounded-xl flex items-center justify-between border-l-4 border-l-amber-500">
                      <div className="space-y-1">
                        <div className="font-semibold text-sm text-slate-200">
                          {emp ? emp.name : 'Unknown Staff'}
                        </div>
                        <div className="text-xs text-slate-400">
                          {l.type} | {l.startDate} to {l.endDate}
                        </div>
                        <div className="text-xs text-slate-500 italic">" {l.reason} "</div>
                      </div>
                      
                      <div className="flex gap-2">
                        {l.status === 'Pending' ? (
                          <>
                            <button
                              onClick={() => handleUpdateLeaveStatus(l.id, 'Approved')}
                              className="p-1 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/40 rounded transition"
                              title="Approve"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleUpdateLeaveStatus(l.id, 'Rejected')}
                              className="p-1 bg-rose-500/20 text-rose-400 hover:bg-rose-500/40 rounded transition"
                              title="Reject"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                            l.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                          }`}>
                            {l.status}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <form onSubmit={handleApplyLeave} className="border-t border-slate-900 pt-6 space-y-4">
              <h4 className="font-bold text-sm text-slate-300">Submit Leave Application</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Employee</label>
                  <select
                    value={leaveEmpId}
                    onChange={(e) => setLeaveEmpId(e.target.value)}
                    className="w-full glass-input p-2.5 rounded-xl text-xs"
                    required
                  >
                    <option value="">-- Choose Member --</option>
                    {employees.map(e => (
                      <option key={e.id} value={e.id}>{e.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Leave Type</label>
                  <select
                    value={leaveType}
                    onChange={(e) => setLeaveType(e.target.value)}
                    className="w-full glass-input p-2.5 rounded-xl text-xs"
                  >
                    <option value="Sick Leave">Sick Leave</option>
                    <option value="Casual Leave">Casual Leave</option>
                    <option value="Maternity/Paternity">Maternity/Paternity</option>
                    <option value="Unpaid Leave">Unpaid Leave</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <DatePicker label="Start Date" value={leaveStart} onChange={setLeaveStart} required />
                <DatePicker label="End Date" value={leaveEnd} onChange={setLeaveEnd} />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Reason Description</label>
                <input
                  type="text"
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  className="w-full glass-input p-2.5 rounded-xl text-xs"
                  placeholder="Reason detail..."
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-violet-600 hover:bg-violet-700 py-2.5 rounded-xl text-xs font-semibold text-white transition"
              >
                Submit Request
              </button>
            </form>
          </div>

          {/* Clock Register */}
          <div className="glass-panel p-6 rounded-2xl space-y-6">
            <h3 className="text-lg font-semibold text-slate-100">Clock-In & Attendance Register</h3>
            
            <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
              {attendance.map(a => {
                const emp = employees.find(e => e.id === a.employeeId);
                return (
                  <div key={a.id} className="glass-card p-4 rounded-xl flex items-center justify-between border-l-4 border-l-blue-500">
                    <div className="space-y-1">
                      <div className="font-semibold text-sm text-slate-200">
                        {emp ? emp.name : 'Unknown Staff'}
                      </div>
                      <div className="text-xs text-slate-400">
                        Date Log: {a.logDate || a.date} | Mode: {a.type || 'Office'}
                      </div>
                    </div>
                    <div className="text-right text-xs text-slate-300">
                      <div>Clock In: <span className="font-mono text-emerald-400 font-semibold">{a.clockIn}</span></div>
                      <div>Clock Out: <span className="font-mono text-slate-400">{a.clockOut || '--:--'}</span></div>
                    </div>
                  </div>
                );
              })}
            </div>

            <form onSubmit={handleClockIn} className="border-t border-slate-900 pt-6 space-y-4">
              <h4 className="font-bold text-sm text-slate-300 font-sans">Register Day Timestamp</h4>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1">
                  <label className="block text-xs text-slate-400 mb-1">Employee</label>
                  <select
                    value={clockEmpId}
                    onChange={(e) => setClockEmpId(e.target.value)}
                    className="w-full glass-input p-2.5 rounded-xl text-xs"
                    required
                  >
                    <option value="">-- Select --</option>
                    {employees.map(e => (
                      <option key={e.id} value={e.id}>{e.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Clock In</label>
                  <input
                    type="time"
                    value={clockInTime}
                    onChange={(e) => setClockInTime(e.target.value)}
                    className="w-full glass-input p-2.5 rounded-xl text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Clock Out</label>
                  <input
                    type="time"
                    value={clockOutTime}
                    onChange={(e) => setClockOutTime(e.target.value)}
                    className="w-full glass-input p-2.5 rounded-xl text-xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 py-2.5 rounded-xl text-xs font-semibold text-white transition"
              >
                Log Stamp
              </button>
            </form>
          </div>
        </div>
      </div>
      )}

      {/* -------------------------
          SUBTAB: TIMESHEETS AUDIT LOGS
          ------------------------- */}
      {activeSubTab === 'timelogs' && (
        <div className="glass-panel p-6 rounded-2xl space-y-6 print:hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-100">Timesheet Audit Ledger</h3>
              <p className="text-xs text-slate-400">View and audit all hours logged by team members against task contexts.</p>
            </div>
            <button
              onClick={handleExportTimelogs}
              className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Download className="w-4 h-4" /> Export Timesheets (.csv)
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase">
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Task Reference</th>
                  <th className="py-3 px-4">Date Logged</th>
                  <th className="py-3 px-4">Hours Logged</th>
                  <th className="py-3 px-4">Work Description Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-slate-300">
                {timelogs.map(log => {
                  const emp = employees.find(e => e.id === log.employeeId);
                  const task = tasks.find(t => t.id === log.taskId);
                  return (
                    <tr key={log.id} className="hover:bg-slate-900/20">
                      <td className="py-3.5 px-4 font-semibold text-slate-200">{emp?.name || 'Staff'}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-violet-400">{task?.title || 'General Activity'}</td>
                      <td className="py-3.5 px-4">{log.date}</td>
                      <td className="py-3.5 px-4 font-mono font-bold">{log.hours} Hrs</td>
                      <td className="py-3.5 px-4 text-slate-400 italic line-clamp-1">"{log.description}"</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* -------------------------
          SUBTAB: SALARY & ADVANCES
          ------------------------- */}
      {activeSubTab === 'salary' && (
        <div className="space-y-6 print:hidden">
          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Payroll', count: `₹${employees.reduce((s, e) => s + (e.salary || 0), 0).toLocaleString()}`, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
              { label: 'Pending Advances', count: advances.filter(a => a.status === 'Pending').length, color: 'text-amber-400', bg: 'bg-amber-500/10' },
              { label: 'Approved Advances', count: advances.filter(a => a.status === 'Approved').length, color: 'text-violet-400', bg: 'bg-violet-500/10' },
              { label: 'Total Advances', count: `₹${advances.filter(a => a.status === 'Approved').reduce((s, a) => s + a.amount, 0).toLocaleString()}`, color: 'text-rose-400', bg: 'bg-rose-500/10' },
            ].map(s => (
              <div key={s.label} className={`${s.bg} rounded-xl px-4 py-3 border border-slate-800/40`}>
                <p className="text-3xs text-slate-500 uppercase tracking-wider">{s.label}</p>
                <p className={`text-sm font-bold ${s.color} mt-0.5`}>{s.count}</p>
              </div>
            ))}
          </div>

          <div className="glass-panel p-6 rounded-2xl space-y-6">
            <h3 className="text-lg font-semibold text-slate-100">Advance Salary Requests</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {advances.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center col-span-2 border border-dashed border-slate-800/60 rounded-xl">
                  <DollarSign className="w-8 h-8 text-slate-600 mb-2" />
                  <p className="text-xs text-slate-500">No advance requests logged yet.</p>
                </div>
              ) : (
                advances.map(a => {
                  const emp = employees.find(e => e.id === a.employeeId);
                  return (
                    <div key={a.id} className="glass-card p-4 rounded-xl flex items-center justify-between border-l-4 border-l-fuchsia-500">
                      <div className="space-y-1">
                        <div className="font-semibold text-sm text-slate-200">{emp ? emp.name : 'Unknown Staff'}</div>
                        <div className="text-xs text-slate-400">Request: ₹{a.amount.toLocaleString()} on {a.date}</div>
                        <div className="text-xs text-slate-500">Reason: "{a.reason}"</div>
                      </div>

                      <div className="flex gap-1">
                        {a.status === 'Pending' ? (
                          <>
                            <button
                              onClick={() => handleUpdateAdvanceStatus(a.id, 'Approved')}
                              className="p-1 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/40 rounded transition"
                              title="Approve"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleUpdateAdvanceStatus(a.id, 'Rejected')}
                              className="p-1 bg-rose-500/20 text-rose-400 hover:bg-rose-500/40 rounded transition"
                              title="Reject"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            a.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                          }`}>
                            {a.status}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <form onSubmit={handleRequestAdvance} className="border-t border-slate-900 pt-6 space-y-4">
              <h4 className="font-bold text-sm text-slate-300">Create Advance Request Form</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Employee Profile</label>
                  <select
                    value={advEmpId}
                    onChange={(e) => setAdvEmpId(e.target.value)}
                    className="w-full glass-input p-2.5 rounded-xl text-xs"
                    required
                  >
                    <option value="">-- Choose Member --</option>
                    {employees.map(e => (
                      <option key={e.id} value={e.id}>{e.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Request Amount (₹)</label>
                  <input
                    type="number"
                    value={advAmount}
                    onChange={(e) => setAdvAmount(e.target.value)}
                    className="w-full glass-input p-2.5 rounded-xl text-xs"
                    placeholder="10000"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Deduction Reason</label>
                  <input
                    type="text"
                    value={advReason}
                    onChange={(e) => setAdvReason(e.target.value)}
                    className="w-full glass-input p-2.5 rounded-xl text-xs"
                    placeholder="House rent prepayment..."
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-fuchsia-600 hover:bg-fuchsia-700 py-2.5 rounded-xl text-xs font-semibold text-white transition"
              >
                Log Request
              </button>
            </form>
          </div>

          {/* Salary Event Logic Ledger */}
          <div className="glass-panel p-6 rounded-2xl space-y-6">
            <h3 className="text-lg font-semibold text-slate-100 flex items-center justify-between">
              <span>Salary Ledger (Total Salary Calculation)</span>
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-xs font-semibold uppercase">
                    <th className="py-2.5 px-4">Employee</th>
                    <th className="py-2.5 px-4">Base</th>
                    <th className="py-2.5 px-4 text-rose-400">Leave Ded.</th>
                    <th className="py-2.5 px-4 text-amber-500">Advance Ded.</th>
                    <th className="py-2.5 px-4 text-emerald-400 font-bold">Total Payout</th>
                    <th className="py-2.5 px-4 text-right">Reciept</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 text-xs">
                  {employees.map(emp => {
                    const pay = getEmployeePayrollDetails(emp);
                    return (
                      <tr key={emp.id} className="text-slate-300 text-xs hover:bg-slate-900/25">
                        <td className="py-3 px-4 font-semibold text-slate-200">{emp.name}</td>
                        <td className="py-3 px-4 font-mono">₹{pay.base.toLocaleString()}</td>
                        <td className="py-3 px-4 text-rose-400 font-mono">-₹{pay.leaveDeduction.toLocaleString()}</td>
                        <td className="py-3 px-4 text-amber-500 font-mono">-₹{pay.advancesDeduction.toLocaleString()}</td>
                        <td className="py-3 px-4 text-emerald-400 font-bold font-mono text-sm">
                          ₹{pay.totalSalary.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setSelectedPayslipEmp(emp)}
                            className="bg-violet-600/15 hover:bg-violet-600/30 text-violet-400 px-3 py-1.5 rounded-xl border border-violet-500/20 transition flex items-center gap-1.5 ml-auto text-xs cursor-pointer font-bold"
                          >
                            <Printer className="w-3.5 h-3.5" /> Payslip
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------
          SUBTAB: CLIENT ROUTER
          ------------------------- */}
      {activeSubTab === 'router' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 print:hidden">
          <div className="glass-panel p-6 rounded-2xl lg:col-span-1 space-y-6">
            <h3 className="text-lg font-semibold text-slate-100">Connect Website Client to Dev</h3>
            <form onSubmit={handleRouteClient} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Company/Client Name</label>
                <input
                  type="text"
                  value={routeClientName}
                  onChange={(e) => setRouteClientName(e.target.value)}
                  className="w-full glass-input p-3 rounded-xl text-sm"
                  placeholder="e.g. Aura Cosmetics"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Project Objective</label>
                <input
                  type="text"
                  value={routeProjectName}
                  onChange={(e) => setRouteProjectName(e.target.value)}
                  className="w-full glass-input p-3 rounded-xl text-sm"
                  placeholder="e.g. E-Commerce Redesign"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Assign Development Lead</label>
                <select
                  value={routeDevId}
                  onChange={(e) => setRouteDevId(e.target.value)}
                  className="w-full glass-input p-3 rounded-xl text-sm"
                  required
                >
                  <option value="">-- Choose Dev --</option>
                  {employees.filter(e => e.department?.includes('Developers')).map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="w-full bg-violet-600 hover:bg-violet-700 py-3 rounded-xl text-white font-medium transition flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" /> Route Project Lead
              </button>
            </form>
          </div>

          <div className="glass-panel p-6 rounded-2xl lg:col-span-2 space-y-6">
            <h3 className="text-lg font-semibold text-slate-100">Routed Technical Clients</h3>
            
            <div className="space-y-4">
              {devProjects.map(proj => {
                const dev = employees.find(e => e.id === proj.devId);
                return (
                  <div key={proj.id} className="glass-card p-4 rounded-xl flex items-center justify-between border-l-4 border-l-violet-500">
                    <div className="space-y-0.5">
                      <div className="font-semibold text-slate-200">{proj.name}</div>
                      <div className="text-xs text-slate-400">Client: {proj.client}</div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs bg-slate-900 text-slate-300 px-3 py-1 rounded-full">
                        Lead Developer: {dev ? dev.name : 'Unassigned'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* -------------------------
          SUBTAB: INTERVIEWS
          ------------------------- */}
      {activeSubTab === 'interviews' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 print:hidden">
          <div className="glass-panel p-6 rounded-2xl lg:col-span-1 space-y-6">
            <h3 className="text-lg font-semibold text-slate-100">Schedule Interview</h3>
            <form onSubmit={handleScheduleInterview} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Candidate Name</label>
                <input
                  type="text"
                  value={candName}
                  onChange={(e) => setCandName(e.target.value)}
                  className="w-full glass-input p-3 rounded-xl text-sm"
                  placeholder="John Doe"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Target Position</label>
                <input
                  type="text"
                  value={candPos}
                  onChange={(e) => setCandPos(e.target.value)}
                  className="w-full glass-input p-3 rounded-xl text-sm"
                  placeholder="Senior React Developer"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Interview Date</label>
                  <DatePicker value={candDate} onChange={setCandDate} placeholderText="Select date" required />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Time</label>
                  <input
                    type="time"
                    value={candTime}
                    onChange={(e) => setCandTime(e.target.value)}
                    className="w-full glass-input p-3 rounded-xl text-xs"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Assigned Interviewer</label>
                <select
                  value={candInterviewer}
                  onChange={(e) => setCandInterviewer(e.target.value)}
                  className="w-full glass-input p-3 rounded-xl text-xs"
                >
                  <option value="">-- Select Interviewer --</option>
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Virtual Meeting Link</label>
                <input
                  type="url"
                  value={candLink}
                  onChange={(e) => setCandLink(e.target.value)}
                  className="w-full glass-input p-3 rounded-xl text-sm"
                  placeholder="https://meet.google.com/abc-defg"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-violet-600 hover:bg-violet-700 py-3 rounded-xl text-white font-medium shadow-md transition"
              >
                Confirm Schedule
              </button>
            </form>
          </div>

          <div className="glass-panel p-6 rounded-2xl lg:col-span-2 space-y-6">
            <h3 className="text-lg font-semibold text-slate-100">Schedule Interview Roster</h3>
            
            <div className="space-y-4">
              {interviews.map(i => {
                const interviewer = employees.find(e => e.id === i.interviewerId);
                return (
                  <div key={i.id} className="glass-card p-4 rounded-xl flex items-center justify-between border-l-4 border-l-violet-500">
                    <div className="space-y-1">
                      <div className="font-semibold text-slate-100">{i.candidateName}</div>
                      <div className="text-xs text-slate-400">{i.position} | Interviewer: {interviewer ? interviewer.name : 'HR'}</div>
                      <div className="text-xs text-violet-400">{new Date(i.date).toLocaleString()}</div>
                    </div>
                    <div>
                      <a
                        href={i.link}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded text-xs transition font-semibold"
                      >
                        Join Meet
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* -------------------------
          SUBTAB: CLIENT FEEDBACK
          ------------------------- */}
      {activeSubTab === 'feedback' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 print:hidden">
          <div className="glass-panel p-6 rounded-2xl lg:col-span-1 space-y-6">
            <h3 className="text-lg font-semibold text-slate-100">Log Clients Feedback</h3>
            <form onSubmit={handleAddFeedback} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Company/Client Name</label>
                <input
                  type="text"
                  value={fbClient}
                  onChange={(e) => setFbClient(e.target.value)}
                  className="w-full glass-input p-3 rounded-xl text-sm"
                  placeholder="Luna Fashion"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Department Rated</label>
                  <select
                    value={fbDept}
                    onChange={(e) => setFbDept(e.target.value)}
                    className="w-full glass-input p-3 rounded-xl text-sm"
                  >
                    <option value="Paid Ads">Paid Ads</option>
                    <option value="Social Media">Social Media</option>
                    <option value="Developers">Developers</option>
                    <option value="Video Editors">Video Editors</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Rating Score</label>
                  <select
                    value={fbRating}
                    onChange={(e) => setFbRating(e.target.value)}
                    className="w-full glass-input p-3 rounded-xl text-sm"
                  >
                    <option value="5">⭐⭐⭐⭐⭐ (5/5)</option>
                    <option value="4">⭐⭐⭐⭐ (4/5)</option>
                    <option value="3">⭐⭐⭐ (3/5)</option>
                    <option value="2">⭐⭐ (2/5)</option>
                    <option value="1">⭐ (1/5)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Feedback Brief</label>
                <textarea
                  value={fbComment}
                  onChange={(e) => setFbComment(e.target.value)}
                  className="w-full glass-input p-3 rounded-xl h-24 text-sm"
                  placeholder="They loved the layout, wanted earlier postings..."
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-violet-600 hover:bg-violet-700 py-3 rounded-xl text-white font-medium shadow-md transition"
              >
                Log Feedback
              </button>
            </form>
          </div>

          <div className="glass-panel p-6 rounded-2xl lg:col-span-2 space-y-6">
            <h3 className="text-lg font-semibold text-slate-100 font-sans">Compiled Feedback Logs</h3>
            
            <div className="space-y-4">
              {feedback.map(fb => (
                <div key={fb.id} className="glass-card p-5 rounded-2xl flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-slate-200">{fb.clientName}</h4>
                      <p className="text-xs text-slate-400">Department: {fb.department} | {fb.date}</p>
                    </div>
                    <span className="text-amber-400 font-bold flex gap-0.5">
                      {'⭐'.repeat(fb.rating)}
                    </span>
                  </div>
                  <p className="text-sm text-slate-300 italic">" {fb.comment} "</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* -------------------------
          SUBTAB: PAYMENT SECURITY & OPERATIONS
          ------------------------- */}
      {activeSubTab === 'security' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 print:hidden">
          <div className="glass-panel p-6 rounded-2xl space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-100">Payment Security & Escrows</h3>
              <button onClick={() => setEscrowOpen(true)}
                className="p-1.5 hover:bg-fuchsia-500/15 rounded text-fuchsia-400 transition cursor-pointer" title="Add Escrow">
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {escrowOpen && (
              <form onSubmit={handleAddEscrow} className="glass-card p-4 rounded-xl space-y-3 border border-fuchsia-500/20">
                <input type="text" value={escrowName} onChange={e => setEscrowName(e.target.value)}
                  className="w-full glass-input p-2.5 rounded-xl text-xs" placeholder="Project / Milestone name" required />
                <div className="flex gap-2">
                  <input type="number" value={escrowAmount} onChange={e => setEscrowAmount(e.target.value)}
                    className="flex-1 glass-input p-2.5 rounded-xl text-xs font-mono" placeholder="Amount (₹)" required />
                  <button type="submit" className="bg-fuchsia-600 hover:bg-fuchsia-700 px-3 rounded-xl text-xs font-bold text-white transition cursor-pointer">Add</button>
                  <button type="button" onClick={() => setEscrowOpen(false)} className="bg-slate-800 hover:bg-slate-700 px-3 rounded-xl text-xs text-slate-300 transition cursor-pointer">Cancel</button>
                </div>
              </form>
            )}

            <div className="space-y-4">
              {escrows.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center border border-dashed border-slate-800/60 rounded-xl">
                  <ShieldCheck className="w-8 h-8 text-slate-600 mb-2" />
                  <p className="text-xs text-slate-500">No escrow entries yet.</p>
                </div>
              ) : escrows.map(esc => (
                <div key={esc.id} className="glass-card p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-sm text-slate-200">{esc.name}</div>
                    <div className="text-xs text-slate-400">Budget Escrow: ₹{esc.amount.toLocaleString()}</div>
                  </div>
                  <button onClick={() => handleToggleEscrow(esc.id)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition cursor-pointer ${
                      esc.status === 'Verified'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-amber-500/10 hover:text-amber-400 hover:border-amber-500/20'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/20'
                    }`}>
                    {esc.status === 'Verified' ? 'Verified' : 'Pending Verification'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl space-y-6">
            <h3 className="text-lg font-semibold text-slate-100">Daily Operations Checklist</h3>

            <form onSubmit={handleAddOps} className="flex items-center gap-2">
              <input type="text" value={newOpsText} onChange={e => setNewOpsText(e.target.value)}
                className="flex-1 glass-input p-2.5 rounded-xl text-xs" placeholder="New operation task..." required />
              <button type="submit" className="bg-violet-600 hover:bg-violet-700 px-3 py-2.5 rounded-xl text-xs font-bold text-white transition cursor-pointer flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </form>

            <div className="space-y-3">
              {dailyOps.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center border border-dashed border-slate-800/60 rounded-xl">
                  <Activity className="w-8 h-8 text-slate-600 mb-2" />
                  <p className="text-xs text-slate-500">No operations logged yet.</p>
                </div>
              ) : dailyOps.map(op => (
                <div key={op.id} className="flex items-center gap-3 p-3 bg-slate-950/45 rounded-xl border border-slate-900">
                  <input
                    type="checkbox"
                    checked={op.status === 'Completed'}
                    onChange={() => {
                      const updated = dailyOps.map(item => {
                        if (item.id === op.id) {
                          return { ...item, status: item.status === 'Completed' ? 'Pending' : 'Completed' };
                        }
                        return item;
                      });
                      updateState({ dailyOps: updated });
                    }}
                    className="w-4.5 h-4.5 border-slate-800 rounded accent-violet-600 focus:ring-0 cursor-pointer"
                  />
                  <span className={`text-sm ${op.status === 'Completed' ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                    {op.task}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
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

    </div>
  );
}