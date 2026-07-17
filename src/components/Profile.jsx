import { useState } from 'react';
import { User, Mail, Calendar, Code, Save, Image, Shield, Briefcase } from 'lucide-react';
import DOMPurify from 'dompurify';
import { useToast } from './shared/Toast';
import { Button, Card, Field, Input, Textarea } from './ui';

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
      reader.onloadend = () => setAvatar(reader.result);
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
        };
      }
      return emp;
    });
    updateState({ employees: updatedEmployees });
    const session = sessionStorage.getItem('neomax_session');
    if (session) {
      try {
        const s = JSON.parse(session);
        s.user.name = name;
        s.user.avatar = avatar;
        sessionStorage.setItem('neomax_session', JSON.stringify(s));
      } catch {}
    }
    toast.success('Profile updated');
  };

  return (
    <div className="space-y-5 sm:space-y-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-5 sm:mb-6">
        <div className="bg-neon-gradient p-2.5 rounded-xl text-white shadow-lg shadow-fuchsia-600/20">
          <User className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-100">My Profile</h2>
          <p className="text-xs text-slate-400 mt-0.5">Manage your personal information</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card className="p-4 sm:p-6 space-y-5">
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-violet-650 flex items-center justify-center text-white font-bold text-2xl overflow-hidden mb-4 border-2 border-violet-500/30">
              {avatar ? (
                <img src={avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                (user.name || 'U').charAt(0).toUpperCase()
              )}
            </div>
            <label className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold px-4 py-2 rounded-xl cursor-pointer transition-colors inline-flex items-center gap-2">
              <Image className="w-4 h-4" /> Upload Photo
              <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
            </label>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-slate-400">
              <Mail className="w-4 h-4" /> {user.email}
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <Briefcase className="w-4 h-4" /> {employee?.designation || '—'}
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <Calendar className="w-4 h-4" /> Joined {employee?.joinDate || '—'}
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <Code className="w-4 h-4" /> {employee?.department || '—'}
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-violet-400" />
              <span className="text-xs font-bold text-violet-300 bg-violet-500/15 px-2 py-0.5 rounded-full">{user.role}</span>
            </div>
          </div>
        </Card>

        <Card className="p-4 sm:p-6 lg:col-span-2">
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Full Name" htmlFor="pname" required>
                <Input id="pname" value={name} onChange={e => setName(e.target.value)} required />
              </Field>
              <Field label="Phone" htmlFor="pphone">
                <Input id="pphone" value={phone} onChange={e => setPhone(e.target.value)} />
              </Field>
            </div>
            <Field label="Bio" htmlFor="pbio">
              <Textarea id="pbio" value={bio} onChange={e => setBio(e.target.value)} rows={3} placeholder="Tell us about yourself..." />
            </Field>
            <Field label="Skills" htmlFor="pskills" hint="Comma-separated list of your skills">
              <Input id="pskills" value={skills} onChange={e => setSkills(e.target.value)} placeholder="React, Design, Marketing..." />
            </Field>
            <Button type="submit" icon={Save}>Save Profile</Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
