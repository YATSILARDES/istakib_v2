import React from 'react';
import { Home, Settings, BarChart2, FolderOpen, LogOut } from 'lucide-react';

interface SidebarProps {
    isOpen: boolean;
    activeTab: string;
    onTabChange: (tab: string) => void;
    isAdmin: boolean;
    onLogout?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, activeTab, onTabChange, isAdmin, onLogout }) => {
    const menuItems = [
        { id: 'dashboard', label: 'Panel', icon: Home },
        // { id: 'reports', label: 'Raporlar', icon: BarChart2 },
        { id: 'archive', label: 'Arşiv', icon: FolderOpen },
    ];

    if (isAdmin) {
        menuItems.push({ id: 'settings', label: 'Ayarlar', icon: Settings });
    }

    return (
        <div
            className={`
        fixed inset-y-0 left-0 z-50 w-44 bg-[#2c3e50] border-r border-[#34495e] shadow-2xl shadow-black/20
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0
        flex flex-col
      `}
        >
            {/* Logo Area */}
            <div className="h-20 flex items-center px-6 border-b border-[#34495e]">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white/10 rounded-xl shadow-lg flex items-center justify-center border border-white/10">
                        <span className="text-white font-bold text-lg">İ</span>
                    </div>
                    <span className="font-bold text-xl text-white tracking-tight">İş Takip</span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-6 space-y-2">
                {menuItems.map((item) => {
                    const isActive = activeTab === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => onTabChange(item.id)}
                            className={`
                w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200
                ${isActive
                                    ? 'bg-[#34495e] text-white shadow-sm ring-1 ring-white/10'
                                    : 'text-slate-400 hover:text-white hover:bg-[#34495e]'
                                }
              `}
                        >
                            <item.icon className={`w-5 h-5 ${isActive ? 'text-blue-400' : 'text-current'}`} />
                            {item.label}
                        </button>
                    );
                })}
            </nav>
        </div>
    );
};

export default Sidebar;
