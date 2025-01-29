import React from 'react';
import { LayoutDashboard, GitBranch, Settings, Users, Activity } from 'lucide-react';

export function DashboardSidebar() {
  return (
    <div className="w-64 bg-white shadow-sm min-h-[calc(100vh-4rem)]">
      <nav className="mt-5 px-2">
        <div className="space-y-1">
          <SidebarItem icon={LayoutDashboard} text="Overview" active />
          <SidebarItem icon={GitBranch} text="Pipelines" />
          <SidebarItem icon={Activity} text="Analytics" />
          <SidebarItem icon={Users} text="Team" />
          <SidebarItem icon={Settings} text="Settings" />
        </div>
      </nav>
    </div>
  );
}

function SidebarItem({ 
  icon: Icon, 
  text, 
  active 
}: { 
  icon: React.ElementType; 
  text: string; 
  active?: boolean;
}) {
  return (
    <button
      className={`
        group flex items-center px-2 py-2 text-sm font-medium rounded-md w-full
        ${active 
          ? 'bg-indigo-50 text-indigo-600' 
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        }
      `}
    >
      <Icon className={`
        mr-3 h-5 w-5
        ${active ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-500'}
      `} />
      {text}
    </button>
  );
}