
import React, { useState } from 'react';
import { Task, RoutineTask, TaskStatus } from '../types';
import { User, ChevronDown, ChevronUp, MapPin, CheckSquare, Square, X, CheckCircle2, Phone, UserCircle } from 'lucide-react';

interface PinnedStaffSidebarProps {
  pinnedStaff: string[];
  tasks: Task[];
  routineTasks: RoutineTask[];
  onTaskClick: (task: Task) => void;
  onToggleRoutineTask: (taskId: string) => void;
  onToggleTaskVerification: (taskId: string) => void;
  onUnpin: (name: string) => void;
  isAdmin?: boolean; // Admin kontrolü için
}

const PinnedStaffSidebar: React.FC<PinnedStaffSidebarProps> = ({
  pinnedStaff,
  tasks,
  routineTasks,
  onTaskClick,
  onToggleRoutineTask,
  onToggleTaskVerification,
  onUnpin,
  isAdmin = false // Default false
}) => {
  // Varsayılan olarak tümü açık
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(
    pinnedStaff.reduce((acc, name) => ({ ...acc, [name]: true }), {})
  );

  const toggleSection = (name: string) => {
    setOpenSections(prev => ({ ...prev, [name]: !prev[name] }));
  };

  return (
    <div className="w-80 bg-slate-900 border-l border-slate-700 flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-slate-700 bg-slate-800">
        <h3 className="font-semibold text-slate-200 flex items-center gap-2">
          <User className="w-5 h-5 text-emerald-400" />
          Sahadaki Personel
        </h3>
        <p className="text-xs text-slate-500 mt-1">Sabitlenen listeler burada görünür.</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {pinnedStaff.map(staffName => {
          const staffTasks = tasks.filter(t => t.assignee === staffName)
            .sort((a, b) => (a.orderNumber || 0) - (b.orderNumber || 0));
          const staffRoutineTasks = routineTasks.filter(t => t.assignee === staffName)
            .sort((a, b) => {
              const aTime = a.createdAt?.toMillis?.() || a.createdAt || 0;
              const bTime = b.createdAt?.toMillis?.() || b.createdAt || 0;
              return aTime - bTime;
            });
          const isOpen = openSections[staffName];

          return (
            <div key={staffName} className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden">
              {/* Personel Başlığı */}
              <div
                className="flex items-center justify-between p-3 bg-slate-800 cursor-pointer hover:bg-slate-750 transition-colors"
                onClick={() => toggleSection(staffName)}
              >
                <div className="font-medium text-sm text-slate-200">{staffName}</div>
                <div className="flex items-center gap-1">
                  {isAdmin && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onUnpin(staffName); }}
                      className="text-slate-500 hover:text-red-400 p-1"
                      title="Listeyi Kaldır"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                  {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
              </div>

              {/* Liste İçeriği */}
              {isOpen && (
                <div className="p-3 space-y-4 border-t border-slate-700/50">

                  {/* Rutin İşler (Eksikler) */}
                  {staffRoutineTasks.length > 0 && (
                    <div>
                      <div className="text-[10px] font-bold text-purple-400 uppercase tracking-wider mb-2">Eksikler</div>
                      <div className="space-y-2">
                        {staffRoutineTasks.map(t => (
                          <div key={t.id} className="flex flex-col gap-1 text-sm group bg-slate-900/30 p-2 rounded border border-slate-700/50">
                            <div className="flex items-start gap-2">
                              <button
                                onClick={() => onToggleRoutineTask(t.id)}
                                className={`mt-0.5 flex-shrink-0 ${t.isCompleted ? 'text-emerald-500' : 'text-slate-500 hover:text-emerald-500'}`}
                              >
                                {t.isCompleted ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                              </button>
                              <div className="flex-1 min-w-0">
                                {/* Müşteri Bilgileri */}
                                {(t.customerName || t.phoneNumber || t.address) && (
                                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mb-1 text-[10px]">
                                    {t.customerName && (
                                      <span className="text-blue-400 flex items-center gap-0.5">
                                        <UserCircle className="w-2.5 h-2.5" /> {t.customerName}
                                      </span>
                                    )}
                                    {t.phoneNumber && (
                                      <a
                                        href={`tel:${t.phoneNumber}`}
                                        className="text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5 hover:underline"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <Phone className="w-2.5 h-2.5" /> {t.phoneNumber}
                                      </a>
                                    )}
                                    {t.address && (
                                      <span className="text-amber-400 flex items-center gap-0.5">
                                        <MapPin className="w-2.5 h-2.5" /> {t.address}
                                      </span>
                                    )}
                                  </div>
                                )}
                                <span className={`${t.isCompleted ? 'text-slate-600 line-through' : 'text-slate-300'} break-words whitespace-pre-wrap leading-tight text-xs`}>
                                  {t.content}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Müşteri Görevleri */}
                  {staffTasks.length > 0 ? (
                    <div>
                      <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-2">Müşteriler</div>
                      <div className="space-y-2">
                        {staffTasks.map(t => (
                          <div key={t.id} className="bg-slate-900/40 rounded border border-slate-700/50 p-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="cursor-pointer" onClick={() => onTaskClick(t)}>
                                <div className="text-xs font-medium text-slate-200 hover:text-blue-400 transition-colors">
                                  <span className="text-slate-500 mr-1">#{t.orderNumber}</span>
                                  {t.title}
                                </div>
                                <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                                  <MapPin className="w-3 h-3" /> {t.address || 'Adres yok'}
                                </div>
                              </div>

                              {/* Tik (Kontrol Edildi İşareti) */}
                              <button
                                onClick={() => onToggleTaskVerification(t.id)}
                                className={`p-1 rounded transition-colors ${t.isCheckVerified
                                  ? 'text-emerald-400 bg-emerald-900/20'
                                  : 'text-slate-600 hover:text-emerald-400 hover:bg-slate-700'
                                  }`}
                                title={t.isCheckVerified ? 'Kontrol onayını kaldır' : 'Kontrolü onayla'}
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    staffRoutineTasks.length === 0 && <div className="text-xs text-slate-600 italic text-center py-2">Görev yok.</div>
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
