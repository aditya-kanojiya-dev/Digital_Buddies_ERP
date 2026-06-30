import React, { useState } from 'react';
import { User, Mail, Phone, Calendar, Code, Heart, Save, Image, Shield, Briefcase } from 'lucide-react';
import DOMPurify from 'dompurify';
import { useToast } from './shared/Toast';
import { logger } from '../lib/logger';

export default function Profile({ user, state, updateState }) {
  const toast = useToast();
  const employee = state.employees.find(e => e.id === user.id);

  const [name, setName] = useState(employee?.name || '');
  const [phone, setPhone] = useState(employee?.phone || '');
  const [bio, setBio] = useState(employee?.bio || '');
  const [skills, setSkills] = useState(employee?.skills || '');
  const [avatar, setAvatar] = useState(employee?.avatar || '');

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!name) return;

    const updatedEmployees = state.employees.map(emp => {
      if (emp.id === user.id) {
        return {
          ...emp,
          name: DOMPurify.sanitize(name),
          phone: DOMPurify.sanitize(phone),
          bio: DOMPurify.sanitize(bio),
          skills: DOMPurify.sanitize(skills),
          avatar
          // password is intentionally excluded — use ChangePassword modal
        };
      }
      return emp;
    });

    updateState({ employees: updatedEmployees });

    // Sync session storage profile avatar
    const session = sessionStorage.getItem('neomax_session');
    if (session) {
      try {
        const u = JSON.parse(session);
        u.name = DOMPurify.sanitize(name);
        u.avatar = avatar;
        sessionStorage.setItem('neomax_session', JSON.stringify(u));
      } catch (err) {
        logger.error('[Profile] session update failed:', err);
      }
    }

    toast.success('Profile saved.');
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
      {/* Header Profile Cover card */}
      <div className="glass-panel p-8 rounded-3xl flex flex-col md:flex-row items-center gap-6 relative overflow-hidden border border-violet-500/10">
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-violet-600/10 rounded-full blur-3xl" />

        {/* Avatar Upload Frame */}
        <div className="relative group">
          <div className="w-24 h-24 rounded-full bg-violet-600/20 border-2 border-violet-500/30 flex items-center justify-center overflow-hidden">
            {avatar ? (
              <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl font-bold text-violet-400">{name.charAt(0)}</span>
            )}
          </div>
          <label className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition duration-200">
            <Image className="w-5 h-5 text-white" />
            <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
          </label>
        </div>

        <div className="text-center md:text-left space-y-1">
          <div className="flex flex-wrap justify-center md:justify-start items-center gap-2">
            <h2 className="text-2xl font-bold text-slate-100">{name}</h2>
            <span className="bg-violet-500/10 border border-violet-500/20 text-violet-400 text-3xs px-2.5 py-0.5 rounded-full font-bold uppercase font-mono">
              {employee?.role || 'Employee'}
            </span>
          </div>
          <p className="text-sm text-slate-400">{employee?.designation || 'Specialist'}</p>
          <p className="text-xs text-slate-500">{employee?.department} Department</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Profile details form - Left */}
        <div className="glass-panel p-6 rounded-2xl md:col-span-2 space-y-6">
          <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
            <User className="w-5 h-5 text-violet-450" /> Personal Biography
          </h3>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full glass-input p-3 rounded-xl text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Contact Phone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full glass-input p-3 rounded-xl text-sm"
                  placeholder="+91 99999 99999"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Personal Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full glass-input p-3 rounded-xl text-sm h-28"
                placeholder="Tell us about yourself..."
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Key Skills (Comma separated)</label>
              <textarea
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                className="w-full glass-input p-3 rounded-xl text-sm h-16"
                placeholder="React, CSS, Brand Consulting..."
              />
            </div>

            {/* Password changes are handled exclusively via the ChangePassword modal */}
            <p className="text-2xs text-slate-500 border-t border-slate-900 pt-4">
              To change your password, use the <span className="text-violet-400 font-semibold">Change Password</span> option from your account menu.
            </p>

            <button
              type="submit"
              className="bg-neon-gradient hover:opacity-95 text-white font-bold py-3 px-6 rounded-xl flex items-center gap-2 transition duration-205 cursor-pointer shadow-md"
            >
              <Save className="w-4 h-4" /> Save Workspace Profile
            </button>
          </form>
        </div>

        {/* Account Info details card - Right */}
        <div className="glass-panel p-6 rounded-2xl space-y-6 md:col-span-1">
          <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
            <Shield className="w-5 h-5 text-fuchsia-450" /> System Details
          </h3>

          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between py-2 border-b border-slate-900">
              <span className="text-slate-400 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Email</span>
              <span className="text-slate-200 font-mono">{employee?.email}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-slate-900">
              <span className="text-slate-400 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Hired Date</span>
              <span className="text-slate-200">{employee?.joinDate}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-slate-900">
              <span className="text-slate-400 flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5" /> Designation</span>
              <span className="text-slate-200">{employee?.designation}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-slate-400 flex items-center gap-1.5"><Code className="w-3.5 h-3.5" /> Dept</span>
              <span className="text-slate-200">{employee?.department}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
