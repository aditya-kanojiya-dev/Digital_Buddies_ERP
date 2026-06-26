# Supabase Integration Guide (For the CTO)

This guide provides instructions and SQL scripts to migrate your **NeoMax CMS** local storage database adapter to a live shared PostgreSQL database on **Supabase**.

---

## Step 1: Create a Supabase Project

1. Go to [Supabase](https://supabase.com/) and sign up / log in.
2. Click **New Project** and choose a name (e.g. `neomax-cms`), database password, and regional host location.
3. Once the database is initialized, navigate to the **SQL Editor** on the sidebar.

---

## Step 2: Run the SQL Initialization Script

Copy and paste the following schema queries into the Supabase SQL editor and click **Run** to generate the database schema and enable Row-Level Security (RLS).

```sql
-- 1. Create Employees table
CREATE TABLE employees (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    department TEXT NOT NULL,
    salary NUMERIC NOT NULL,
    hire_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'Active'
);

-- 2. Create Clients table
CREATE TABLE clients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    details TEXT,
    department TEXT NOT NULL,
    budget NUMERIC NOT NULL DEFAULT 0,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'Active'
);

-- 3. Create Ads Performance stats table
CREATE TABLE ad_stats (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    client_id TEXT REFERENCES clients(id) ON DELETE CASCADE,
    log_date DATE NOT NULL DEFAULT CURRENT_DATE,
    budget NUMERIC NOT NULL,
    active_ads INT NOT NULL DEFAULT 0,
    lost_ads INT NOT NULL DEFAULT 0
);

-- 4. Create Content Calendar table
CREATE TABLE smm_calendar (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    post_date DATE NOT NULL,
    post_time TIME NOT NULL,
    platform TEXT NOT NULL,
    caption TEXT,
    status TEXT NOT NULL DEFAULT 'Draft'
);

-- 5. Create Dev Projects table
CREATE TABLE dev_projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    client_name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'Backlog',
    dev_id TEXT REFERENCES employees(id) ON DELETE SET NULL,
    deadline DATE
);

-- 6. Create Attendance logs table
CREATE TABLE attendance (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    employee_id TEXT REFERENCES employees(id) ON DELETE CASCADE,
    log_date DATE NOT NULL DEFAULT CURRENT_DATE,
    clock_in TIME NOT NULL,
    clock_out TIME,
    status TEXT NOT NULL DEFAULT 'Present'
);

-- 7. Create Leave requests table
CREATE TABLE leaves (
    id TEXT PRIMARY KEY,
    employee_id TEXT REFERENCES employees(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    type TEXT NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending'
);

-- 8. Create Advance salary logs
CREATE TABLE advances (
    id TEXT PRIMARY KEY,
    employee_id TEXT REFERENCES employees(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    log_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'Pending',
    reason TEXT NOT NULL
);

-- 9. Create Feedback table
CREATE TABLE client_feedback (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    client_name TEXT NOT NULL,
    department TEXT NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    log_date DATE NOT NULL DEFAULT CURRENT_DATE
);

-- Index optimization for performance queries
CREATE INDEX idx_attendance_employee ON attendance(employee_id);
CREATE INDEX idx_leaves_employee ON leaves(employee_id);
CREATE INDEX idx_advances_employee ON advances(employee_id);
CREATE INDEX idx_ad_stats_client ON ad_stats(client_id);
```

---

## Step 3: Install the Supabase JS SDK

In your React workspace terminal, install the official Supabase library:
```bash
npm install @supabase/supabase-js
```

---

## Step 4: Configure environment credentials

Create a `.env` file in the root of your project:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key-here
```

---

## Step 5: Replace db.js with the Supabase client implementation

Overwrite `src/data/db.js` with the client SDK implementation below. This code reads database values directly from your remote PostgreSQL instance:

```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const db = {
  // Employees
  getEmployees: async () => {
    const { data, error } = await supabase.from('employees').select('*');
    if (error) throw error;
    return data;
  },
  addEmployee: async (emp) => {
    const { data, error } = await supabase.from('employees').insert([emp]).select();
    if (error) throw error;
    return data[0];
  },
  updateEmployee: async (empId, updatedFields) => {
    const { data, error } = await supabase.from('employees').update(updatedFields).eq('id', empId).select();
    if (error) throw error;
    return data;
  },
  deleteEmployee: async (empId) => {
    const { data, error } = await supabase.from('employees').delete().eq('id', empId).select();
    if (error) throw error;
    return data;
  },

  // Clients
  getClients: async () => {
    const { data, error } = await supabase.from('clients').select('*');
    if (error) throw error;
    return data;
  },
  addClient: async (client) => {
    const { data, error } = await supabase.from('clients').insert([client]).select();
    if (error) throw error;
    return data[0];
  },

  // Ad Stats
  getAdStats: async () => {
    const { data, error } = await supabase.from('ad_stats').select('*');
    if (error) throw error;
    return data;
  },
  addAdStat: async (stat) => {
    const mappedStat = {
      client_id: stat.clientId,
      log_date: stat.date,
      budget: stat.budget,
      active_ads: stat.activeAds,
      lost_ads: stat.lostAds
    };
    const { data, error } = await supabase.from('ad_stats').insert([mappedStat]).select();
    if (error) throw error;
    return data[0];
  },

  // SMM Content Calendar
  getSmmCalendar: async () => {
    const { data, error } = await supabase.from('smm_calendar').select('*');
    if (error) throw error;
    return data;
  },
  addCalendarPost: async (post) => {
    const mappedPost = {
      id: post.id,
      title: post.title,
      post_date: post.date,
      post_time: post.time,
      platform: post.platform,
      caption: post.caption,
      status: post.status
    };
    const { data, error } = await supabase.from('smm_calendar').insert([mappedPost]).select();
    if (error) throw error;
    return data[0];
  },

  // Dev Projects
  getDevProjects: async () => {
    const { data, error } = await supabase.from('dev_projects').select('*');
    if (error) throw error;
    return data.map(p => ({
      id: p.id,
      name: p.name,
      client: p.client_name,
      description: p.description,
      status: p.status,
      devId: p.dev_id,
      deadline: p.deadline
    }));
  },
  addDevProject: async (project) => {
    const mappedProject = {
      id: project.id,
      name: project.name,
      client_name: project.client,
      description: project.description,
      status: project.status,
      dev_id: project.devId,
      deadline: project.deadline
    };
    const { data, error } = await supabase.from('dev_projects').insert([mappedProject]).select();
    if (error) throw error;
    return data[0];
  },
  updateProjectStatus: async (projId, nextStatus) => {
    const { data, error } = await supabase.from('dev_projects').update({ status: nextStatus }).eq('id', projId).select();
    if (error) throw error;
    return data;
  },

  // Leaves
  getLeaves: async () => {
    const { data, error } = await supabase.from('leaves').select('*');
    if (error) throw error;
    return data.map(l => ({
      id: l.id,
      employeeId: l.employee_id,
      startDate: l.start_date,
      endDate: l.end_date,
      type: l.type,
      reason: l.reason,
      status: l.status
    }));
  },
  addLeave: async (leave) => {
    const mapped = {
      id: leave.id,
      employee_id: leave.employeeId,
      start_date: leave.startDate,
      end_date: leave.endDate,
      type: leave.type,
      reason: leave.reason,
      status: leave.status
    };
    const { data, error } = await supabase.from('leaves').insert([mapped]).select();
    if (error) throw error;
    return data[0];
  },
  updateLeaveStatus: async (leaveId, nextStatus) => {
    const { data, error } = await supabase.from('leaves').update({ status: nextStatus }).eq('id', leaveId).select();
    if (error) throw error;
    return data;
  }
};
```
This is fully compatible with the React frontend codebase and swaps in instantly when you are ready to configure shared database hosting!
