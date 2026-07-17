
import { Clock, DollarSign, Calendar, BarChart2, ArrowRight } from 'lucide-react';
import { today as todayStr } from '../../lib/format';

/**
 * DepartmentKpiStrip — compact 4-card KPI bar for ManagerDashboard.
 *
 * Renders read-only counts:
 *   - pending leaves
 *   - pending advances
 *   - today's interviews
 *   - today's ad-stats logs
 *
 * Each card is clickable and routes the user to the relevant module.
 *
 * Props:
 *   state:       full app state
 *   setActiveTab: from Layout
 */
export default function DepartmentKpiStrip({ state, setActiveTab }) {
    const today = todayStr();

    const pendingLeaves = (state.leaves || []).filter(l => l.status === 'Pending').length;
    const pendingAdvances = (state.advances || []).filter(a => a.status === 'Pending').length;
    const todaysInterviews = (state.interviews || []).filter(i => {
        // i.date may be a YYYY-MM-DD or full ISO; normalize to date only
        if (!i.date) return false;
        return i.date.substring(0, 10) === today;
    }).length;
    const todaysAdStats = (state.adStats || []).filter(s => s.date === today).length;

    const kpis = [
        {
            label: 'Pending Leaves',
            value: pendingLeaves,
            icon: Clock,
            color: 'text-amber-400 bg-amber-500/10',
            tab: 'HR',
        },
        {
            label: 'Pending Advances',
            value: pendingAdvances,
            icon: DollarSign,
            color: 'text-fuchsia-400 bg-fuchsia-500/10',
            tab: 'HR',
        },
        {
            label: "Today's Interviews",
            value: todaysInterviews,
            icon: Calendar,
            color: 'text-violet-400 bg-violet-500/10',
            tab: 'HR',
        },
        {
            label: 'Ad Stats Today',
            value: todaysAdStats,
            icon: BarChart2,
            color: 'text-emerald-400 bg-emerald-500/10',
            tab: 'Paid Ads',
        },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {kpis.map(k => {
                const Icon = k.icon;
                return (
                    <button
                        key={k.label}
                        onClick={() => setActiveTab?.(k.tab)}
                        className="glass-card p-4 rounded-2xl flex items-center justify-between hover:bg-slate-900/40 transition cursor-pointer text-left"
                    >
                        <div className="space-y-0.5 min-w-0">
                            <p className="text-2xs uppercase tracking-wider text-slate-500 font-semibold">{k.label}</p>
                            <p className="text-2xl font-extrabold text-glow text-slate-100">{k.value}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                            <div className={`p-2 rounded-lg ${k.color}`}>
                                <Icon className="w-4 h-4" />
                            </div>
                            <ArrowRight className="w-3 h-3 text-slate-600" />
                        </div>
                    </button>
                );
            })}
        </div>
    );
}
