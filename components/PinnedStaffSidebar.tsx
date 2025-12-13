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
  onClose: () => void;
  isAdmin: boolean;
}

const PinnedStaffSidebar: React.FC<PinnedStaffSidebarProps> = ({
  pinnedStaff,
  tasks,
  routineTasks,
  onTaskClick,
  onToggleRoutineTask,
  onUnpin,
  onClose,
  isAdmin
}) => {
  // Hangi personelin listesi açık? (Accordian state)
  const [openStaff, setOpenStaff] = useState<Record<string, boolean>>({});

  const toggleStaff = (name: string) => {
    setOpenStaff(prev => ({ ...prev, [name]: !prev[name] }));
  };

  // Generate unique consistent color for each staff member
  const getStaffColor = (name: string) => {
    const colors = [
      'bg-blue-900/20 border-blue-700/40',
      'bg-purple-900/20 border-purple-700/40',
      'bg-emerald-900/20 border-emerald-700/40',
      'bg-amber-900/20 border-amber-700/40',
      'bg-rose-900/20 border-rose-700/40',
      'bg-cyan-900/20 border-cyan-700/40',
      'bg-pink-900/20 border-pink-700/40',
      'bg-indigo-900/20 border-indigo-700/40'
    ];

    // Simple hash to assign consistent color per name
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = ((hash << 5) - hash) + name.charCodeAt(i);
      hash = hash & hash;
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // Staff'a göre görevleri filtrele ve birleştir
  const getStaffCombinedTasks = (name: string) => {
    // 1. Rutin İşler (SIRALI: Atanma > Oluşturulma)
    const staffRoutineTasks = routineTasks.filter(t => {
      // 1. Name Check
      if (t.assignee !== name) return false;

      // 2. Date Check (Hide Future)
      let filterDate: Date | null = null;
      let hasSchedule = false;

      if (t.scheduledDate) {
        filterDate = new Date(t.scheduledDate.seconds ? t.scheduledDate.seconds * 1000 : t.scheduledDate);
        hasSchedule = true;
      } else if (t.createdAt) {
        // Legacy: Check if createdAt is in future
        const d = new Date(t.createdAt.seconds ? t.createdAt.seconds * 1000 : t.createdAt);
        const today = new Date();
        d.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);

        if (d.getTime() > today.getTime()) return false; // Hide Future Created (Legacy)
        return true; // Show Backlog
      } else {
        return true;
      }

      if (hasSchedule && filterDate) {
        const today = new Date();
        filterDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);
        const isToday = filterDate.getTime() === today.getTime();
        const isPast = filterDate.getTime() < today.getTime();

        if (isToday) return true;
        if (isPast && !t.isCompleted) return true;

        return false; // Future -> Hide
      }
      return true;
    }).sort((a, b) => {
      // 1. Tamamlanma durumu (Tamamlananlar en altta)
      if (a.isCompleted !== b.isCompleted) {
        return a.isCompleted ? 1 : -1;
      }

      // 2. Sort by Schedule Date if avail, else Created
      // (Simplified sort for sidebar)
      const getDate = (task: RoutineTask) => {
        if (task.scheduledDate) return new Date(task.scheduledDate.seconds ? task.scheduledDate.seconds * 1000 : task.scheduledDate).getTime();
        return task.createdAt?.seconds ? task.createdAt.seconds * 1000 : 0;
      };
      return getDate(a) - getDate(b);
    });

    // 2. Normal Görevler (Standart İşler)
    const staffStandardTasks = tasks.filter(t => {
      if (t.assignee !== name) return false;
      if (t.status === TaskStatus.CHECK_COMPLETED) return false;

      // Main Task Date Filtering
      if (t.scheduledDate) {
        const taskDate = new Date(t.scheduledDate.seconds ? t.scheduledDate.seconds * 1000 : t.scheduledDate);
        const today = new Date();
        taskDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);

        const isToday = taskDate.getTime() === today.getTime();
        const isPast = taskDate.getTime() < today.getTime(); // Rollover logic for main tasks? Assuming yes if incomplete.

        if (isToday) return true;
        if (isPast) return true; // Rollover

        return false; // Future
      }

      // Legacy 'date' string check could be here if needed, but Main Tasks usually use scheduledDate now.
      // If legacy date string exists and is future? 
      if (t.date) {
        const d = new Date(t.date);
        if (!isNaN(d.getTime())) {
          const today = new Date();
          d.setHours(0, 0, 0, 0);
          today.setHours(0, 0, 0, 0);
          if (d.getTime() > today.getTime()) return false; // Hide Future
        }
      }

      return true;
    });

    // Tipleri birleştirip tek liste yapıyoruz (render aşamasında ayıracağız)
    return {
      routine: staffRoutineTasks,
      standard: staffStandardTasks
    };
  };



  return (
    <div className="w-80 bg-slate-950/80 backdrop-blur-xl border-r border-white/5 flex flex-col h-full overflow-hidden shadow-2xl z-20">
      <div className="p-4 border-b border-white/5 bg-slate-900/50 flex items-center justify-between">
        <div>
          <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
            <UserCircle className="w-4 h-4" />
            Sahadaki Personel
          </h3>
          <p className="text-[10px] text-slate-500 mt-1">Sabitlenen listeler burada görünür.</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-slate-800 text-red-400 hover:text-red-300 rounded-lg transition-colors flex items-center gap-2 border border-red-500/10 bg-red-500/5"
          title="Paneli Gizle"
        >
          <span className="text-[10px] font-bold">GİZLE</span>
          <ChevronRight className="w-4 h-4 rotate-180" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
        {pinnedStaff.length === 0 && (
          <div className="flex flex-col items-center justify-center p-8 text-center opacity-50 mt-10">
            <UserCircle className="w-12 h-12 mb-3 text-slate-600" />
            <p className="text-sm text-slate-400">Henüz personel eklenmedi.</p>
            <p className="text-xs text-slate-600 mt-1">Yönetici panelinden personel sabitleyebilirsiniz.</p>
          </div>
        )}

        {pinnedStaff.map(staffName => {
          const { routine, standard } = getStaffCombinedTasks(staffName);
          const pendingRoutineCount = routine.filter(t => !t.isCompleted).length;
          const pendingStandardCount = standard.length; // Hepsi aktif kabul edelim
          const totalCount = pendingRoutineCount + pendingStandardCount;

          const isOpen = openStaff[staffName] ?? true; // Default open
          const staffColorClass = getStaffColor(staffName);

          return (
            <div key={staffName} className={`${staffColorClass} border border-white/5 rounded-xl overflow-hidden transition-all shadow-md shadow-black/20`}>
              {/* Header */}
              <div
                className={`flex items-center justify-between p-3 cursor-pointer hover:bg-white/5 transition-colors ${isOpen ? 'bg-slate-900/50' : ''}`}
                onClick={() => toggleStaff(staffName)}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <button onClick={(e) => { e.stopPropagation(); toggleStaff(staffName); }}>
                    {isOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                  </button>
                  <span className="font-medium text-slate-200 truncate text-sm">{staffName}</span>
                </div>
                <div className="flex items-center gap-2">
                  {totalCount > 0 && (
                    <span className="bg-red-500/20 text-red-400 text-xs font-bold px-2 py-0.5 rounded-full border border-red-500/30">
                      {totalCount}
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
                <div className="p-2 space-y-2 bg-slate-950/30 border-t border-white/5">
                  {/* STANDARD TASKS SECTION (IF ANY) */}
                  {standard.length > 0 && (
                    <div className="space-y-1 mb-2">
                      <div className="text-[10px] font-bold text-blue-400 uppercase tracking-widest pl-1">Saha Görevleri</div>
                      {standard.map(t => (
                        <div
                          key={t.id}
                          onClick={() => onTaskClick(t)}
                          className={`
                            p-3 rounded-xl border transition-all cursor-pointer group shadow-sm hover:translate-x-1
                            ${t.checkStatus === 'missing'
                              ? 'bg-slate-900/90 border-l-2 border-l-orange-500 border-white/5 hover:border-orange-500/50'
                              : t.checkStatus === 'clean'
                                ? 'bg-slate-900/90 border-l-2 border-l-emerald-500 border-white/5 hover:border-emerald-500/50'
                                : 'bg-slate-900/90 border-l-2 border-l-blue-500 border-white/5 hover:border-blue-500/50'
                            }
                          `}
                        >
                          <div className="flex items-start gap-2">
                            {/* Dot REMOVED */}
                            <div className="flex-1 min-w-0">
                              <div className={`text-xs font-medium leading-snug ${t.checkStatus === 'missing' ? 'text-orange-100' :
                                t.checkStatus === 'clean' ? 'text-emerald-100' : 'text-blue-100'
                                }`}>{t.title}</div>
                              {t.address && (
                                <div className={`flex items-center gap-1 mt-1 text-[10px] truncate ${t.checkStatus === 'missing' ? 'text-orange-300/70' :
                                  t.checkStatus === 'clean' ? 'text-emerald-300/70' : 'text-blue-300/70'
                                  }`}>
                                  <MapPin className="w-3 h-3 flex-shrink-0" />
                                  {t.address}
                                </div>
                              )}
                              <div className="mt-1 text-[10px] text-slate-500 font-mono">#{t.orderNumber} - {t.status}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ROUTINE TASKS SECTION */}
                  {routine.length > 0 && (
                    <div className="space-y-1">
                      {standard.length > 0 && <div className="text-[10px] font-bold text-purple-400 uppercase tracking-widest pl-1 mt-3">Eksikler / Notlar</div>}
                      {routine.map(t => (
                        <div key={t.id} className={`p-3 rounded-xl border transition-all hover:translate-x-1 ${t.isCompleted
                          ? 'bg-slate-900/40 border-slate-800 opacity-50'
                          : 'bg-slate-900/90 border-l-2 border-l-purple-500 border-white/5'
                          }`}>
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
                      ))}
                    </div>
                  )}

                  {routine.length === 0 && standard.length === 0 && (
                    <div className="text-center py-4 text-slate-500 text-xs italic">
                      Görev yok.
                    </div>
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
