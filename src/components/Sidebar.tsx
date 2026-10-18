import React from 'react';
import {
  LayoutDashboard,
  Sparkles,
  FileText,
  ShoppingBag,
  Building2,
  Users,
  Receipt,
  FileCheck2,
  CreditCard,
  Calculator,
  BarChart3,
  Sliders,
  Share2,
  Settings,
  CheckCircle2,
} from 'lucide-react';
import { BusinessProfile } from '../types/index.ts';

export type NavTab =
  | 'dashboard'
  | 'documents'
  | 'invoices'
  | 'purchase-bills'
  | 'customers'
  | 'suppliers'
  | 'expenses'
  | 'purchase-orders'
  | 'approvals'
  | 'payments'
  | 'gst'
  | 'reports'
  | 'automations'
  | 'integrations'
  | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  pendingReviewsCount: number;
  pendingApprovalsCount?: number;
  unpaidCount?: number;
  unpaidInvoicesCount?: number;
  profile: BusinessProfile | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  pendingReviewsCount,
  pendingApprovalsCount = 0,
  unpaidCount,
  unpaidInvoicesCount,
  profile,
}) => {
  const displayUnpaid = unpaidCount ?? unpaidInvoicesCount ?? 0;

  const coreNavItems = [
    {
      id: 'dashboard' as NavTab,
      label: 'Overview',
      icon: LayoutDashboard,
    },
    {
      id: 'documents' as NavTab,
      label: 'Invoices / Documents',
      icon: FileText,
      badge: pendingReviewsCount > 0 ? `${pendingReviewsCount}` : 'AI',
      badgeColor: pendingReviewsCount > 0 ? 'bg-amber-500 text-white' : 'bg-indigo-600 text-white',
    },
    {
      id: 'suppliers' as NavTab,
      label: 'Vendors',
      icon: Building2,
    },
    {
      id: 'customers' as NavTab,
      label: 'Customers',
      icon: Users,
    },
    {
      id: 'expenses' as NavTab,
      label: 'Expenses',
      icon: Receipt,
    },
    {
      id: 'purchase-orders' as NavTab,
      label: 'Purchase Orders',
      icon: ShoppingBag,
    },
    {
      id: 'approvals' as NavTab,
      label: 'Approvals',
      icon: FileCheck2,
      badge: pendingApprovalsCount > 0 ? `${pendingApprovalsCount} Pending` : undefined,
      badgeColor: 'bg-rose-500 text-white',
    },
    {
      id: 'payments' as NavTab,
      label: 'Payments',
      icon: CreditCard,
      badge: displayUnpaid > 0 ? `${displayUnpaid}` : undefined,
      badgeColor: 'bg-slate-700 text-slate-200',
    },
  ];

  const complianceNavItems = [
    {
      id: 'gst' as NavTab,
      label: 'GST & Compliance',
      icon: Calculator,
      tag: 'GSTR-1/3B',
    },
    {
      id: 'reports' as NavTab,
      label: 'Analytics',
      icon: BarChart3,
    },
    {
      id: 'automations' as NavTab,
      label: 'Automations',
      icon: Sliders,
    },
    {
      id: 'integrations' as NavTab,
      label: 'Sync & Exports',
      icon: Share2,
    },
    {
      id: 'settings' as NavTab,
      label: 'Settings',
      icon: Settings,
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-200 flex flex-col h-screen border-r border-slate-800 shrink-0">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 font-black text-xl">
            O
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-lg font-bold tracking-tight text-white">Ozio</h1>
              <span className="text-[10px] font-semibold bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded border border-blue-400/30">
                FINANCE OS
              </span>
            </div>
            <p className="text-xs text-slate-400">AI Financial Operations</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
        <div className="px-3 pb-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
          Core Workflows
        </div>
        {coreNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 font-semibold'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${item.badgeColor}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        <div className="pt-4 px-3 pb-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
          Tax & Intelligence
        </div>
        {complianceNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 font-semibold'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.tag && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-medium border border-slate-700">
                  {item.tag}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Profile Footer */}
      <div className="p-3.5 border-t border-slate-800 bg-slate-950/60">
        <div
          onClick={() => onSelectTab('settings')}
          className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/60 cursor-pointer transition-colors"
        >
          <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-blue-400">
            {profile?.business_name ? profile.business_name.substring(0, 2).toUpperCase() : 'AP'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">
              {profile?.business_name || 'ApexTech Solutions'}
            </p>
            <p className="text-[11px] text-slate-400 truncate flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              GSTIN: {profile?.gstin ? `${profile.gstin.substring(0, 7)}...` : '27AABCA...'}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};
