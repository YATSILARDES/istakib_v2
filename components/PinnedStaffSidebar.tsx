import React, { useState } from 'react';
import { RoutineTask, Task, TaskStatus } from '../types';
import { ChevronRight, ChevronDown, CheckSquare, Square, UserCircle, Phone, MapPin, PinOff, AlertCircle } from 'lucide-react';

interface PinnedStaffSidebarProps {
  pinnedStaff: string[];
  tasks: Task[]; // Normal Görevler (Referans için)
  routineTasks: RoutineTask[]; // Eksik Listesi
  onTaskClick: (task: Task) => void;
  onToggleRoutineTask: (taskId: string) => void;
  onToggleTaskVerification: (taskId: string) => void;
  onUnpin: (staffName: string) => void;
  isAdmin: boolean;
}

const PinnedStaffSidebar: React.FC<PinnedStaffSidebarProps> = ({
  pinnedStaff,
  tasks,
  routineTasks,
  onTaskClick,
  onToggleRoutineTask,
  onUnpin,
  isAdmin
}) => {
  // Hangi personelin listesi açık? (Accordian state)
  const [openStaff, setOpenStaff] = useState<Record<string, boolean>>({});

  const toggleStaff = (name: string) => {
    setOpenStaff(prev => ({ ...prev, [name]: !prev[name] }));
  };

  // Staff'a göre görevleri filtrele
  const getStaffRoutineTasks = (name: string) => {
    return routineTasks.filter(t => t.assignee === name)
      .sort((a, b) => {
        if (a.isCompleted === b.isCompleted) {
          // Create At check
          const aTime = a.createdAt?.toMillis?.() || 0;
          const bTime = b.createdAt?.toMillis?.() || 0;
          return aTime - bTime;
        }
        return a.isCompleted ? 1 : -1;
      });
  };

  if (pinnedStaff.length === 0) return null;

  return (
    <div className="w-80 bg-slate-900 border-r border-slate-700 flex flex-col h-full overflow-hidden shadow-2xl z-20">
      <div className="p-4 border-b border-slate-700 bg-slate-800/50">
        <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
          <UserCircle className="w-4 h-4" />
          Sahadaki Personel
        </h3>
        <p className="text-[10px] text-slate-500 mt-1">Sabitlenen listeler burada görünür.</p>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
        {pinnedStaff.map(staffName => {
          const staffTasks = getStaffRoutineTasks(staffName);
          const pendingCount = staffTasks.filter(t => !t.isCompleted).length;
          const isOpen = openStaff[staffName] ?? true; // Default open

          return (
            <div key={staffName} className="bg-slate-800/30 border border-slate-700/50 rounded-lg overflow-hidden transition-all">
              {/* Header */}
              <div
                className={`flex items-center justify-between p-3 cursor-pointer hover:bg-slate-700/50 transition-colors ${isOpen ? 'bg-slate-800' : ''}`}
                onClick={() => toggleStaff(staffName)}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <button onClick={(e) => { e.stopPropagation(); toggleStaff(staffName); }}>
                    {isOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                  </button>
                  <span className="font-medium text-slate-200 truncate text-sm">{staffName}</span>
                </div>
                <div className="flex items-center gap-2">
                  {pendingCount > 0 && (
                    <span className="bg-red-500/20 text-red-400 text-xs font-bold px-2 py-0.5 rounded-full border border-red-500/30">
                      {pendingCount}
                    </span>
                  )}
                  {isAdmin && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onUnpin(staffName); }}
                      className="text-slate-500 hover:text-red-400 transition-colors"
                      title="Listeyi Kaldır"
                    >
                      <PinOff className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Content */}
              {isOpen && (
                <div className="p-2 space-y-2 bg-slate-900/30 border-t border-slate-700/50">
                  {staffTasks.length === 0 ? (
                    <div className="text-center py-4 text-slate-500 text-xs italic">
                      Görev yok.
                    </div>
                  ) : (
                    staffTasks.map(t => (
                      <div key={t.id} className={`p-2.5 rounded border transition-all ${t.isCompleted ? 'bg-slate-800/40 border-slate-700 opacity-60' : 'bg-slate-800 border-slate-600 hover:border-blue-500/50'}`}>
                        <div className="flex items-start gap-2.5">
                          <button
                            onClick={() => onToggleRoutineTask(t.id)}
                            className={`mt-0.5 flex-shrink-0 ${t.isCompleted ? 'text-emerald-500' : 'text-slate-400 hover:text-emerald-400'}`}
                          >
                            {t.isCompleted ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                          </button>

                          <div className="flex-1 min-w-0">
                            {/* Badges */}
                            {(t.customerName || t.phoneNumber) && (
                              <div className="flex flex-wrap gap-1 mb-1">
                                {t.customerName && <span className="text-[10px] px-1 bg-blue-900/40 text-blue-300 rounded border border-blue-500/20 truncate max-w-full">{t.customerName}</span>}
                                {t.phoneNumber && <span className="text-[10px] px-1 bg-emerald-900/40 text-emerald-300 rounded border border-emerald-500/20">{t.phoneNumber}</span>}
                              </div>
                            )}

                            <div className={`text-xs leading-relaxed break-words whitespace-pre-wrap ${t.isCompleted ? 'text-slate-500 line-through' : 'text-slate-300'}`}>
                              {t.content}
                            </div>

                            {t.address && (
                              <div className="mt-1.5 flex items-start gap-1 text-[10px] text-slate-500">
                                <MapPin className="w-3 h-3 flex-shrink-0 mt-px" />
                                <span className="truncate">{t.address}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PinnedStaffSidebar;
