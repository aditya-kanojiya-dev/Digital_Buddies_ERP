// Department constants — single source of truth
export const ALLOWED_TARGET_DEPTS = ['Developers', 'Video Editors', 'Graphic Designers', 'Videography/Photography', 'Paid Ads', 'Social Media'];

export const CREATIVE_DEPTS = ['Video Editors', 'Graphic Designers', 'Videography/Photography'];

export const DEPT_TIMELINE_RULES = {
  'Developers':              { mode: 'manual', label: 'Manual' },
  'Paid Ads':                { mode: 'manual', label: 'Manual' },
  'Video Editors':           { mode: 'select', options: [3, 5], label: 'Editors timeline' },
  'Graphic Designers':       { mode: 'select', options: [3, 5], label: 'Designers timeline' },
  'Videography/Photography': { mode: 'select', options: [3, 4, 5], label: 'Videography timeline' },
};

// Role constants — single source of truth for role strings
export const ROLES = {
  SUPER_ADMIN: 'Super Admin',
  MANAGER: 'Manager',
  HR: 'HR',
  EMPLOYEE: 'Employee',
  ADMIN: 'Admin',
};
