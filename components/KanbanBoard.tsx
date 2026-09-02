
import React, { useState, useEffect } from 'react';
import { Task, TaskStatus, StatusLabels, RoutineTask } from '../types';
import { MoreVertical, ClipboardList, ClipboardCheck, Banknote, Flame, Wrench, Circle, Phone, MapPin, CheckCircle2, Search, CheckSquare, Square, UserCircle, Share2, PhoneCall, Plus, X, User, Clock, Star, ChevronRight } from 'lucide-react';

interface KanbanBoardProps {
  tasks: Task[];
  routineTasks: RoutineTask[];
  onTaskClick: (task: Task) => void;
  onToggleRoutineTask: (taskId: string) => void;
  visibleColumns?: TaskStatus[];
  showRoutineColumn?: boolean;
  myTasks?: Task[]; // Assigned Standard Tasks for the viewer
  staffName?: string; // Staff name for column header
  isCompact?: boolean; // New prop for Split View
  staffList?: { name: string; email: string }[];
  hideCreator?: boolean;
  onTaskUpdate?: (taskId: string, updates: Partial<Task>) => void;
  onRoutineTaskUpdate?: (taskId: string, updates: Partial<RoutineTask>) => void;
  isDarkMode?: boolean;
}

const StatusIcon = ({ status }: { status: TaskStatus | 'ROUTINE' }) => {
  switch (status) {
    case 'ROUTINE': return <CheckSquare className="w-4 h-4 text-purple-400" />;
    case TaskStatus.TO_CHECK: return <ClipboardList className="w-4 h-4 text-slate-400" />;
    case TaskStatus.CHECK_COMPLETED: return <ClipboardCheck className="w-4 h-4 text-emerald-400" />;
    case TaskStatus.PROJECT_TO_BE_DRAWN: return <Wrench className="w-4 h-4 text-amber-400" />;
    case TaskStatus.DEPOSIT_PAID: return <Banknote className="w-4 h-4 text-green-400" />;
    case TaskStatus.GAS_OPENED: return <Flame className="w-4 h-4 text-orange-400" />;
    case TaskStatus.SERVICE_DIRECTED: return <Wrench className="w-4 h-4 text-blue-400" />;
    default: return <Circle className="w-4 h-4 text-gray-400" />;
  }
};

const KanbanBoard: React.FC<KanbanBoardProps> = ({
  tasks,
  routineTasks,
  onTaskClick,
  onToggleRoutineTask,
  visibleColumns,
  showRoutineColumn = true,
  myTasks = [], // Destructure NEW prop
  staffName, // Destructure NEW prop
  isCompact = false,
  staffList = [],
  hideCreator = false,
  onTaskUpdate,
  onRoutineTaskUpdate,
  isDarkMode = false
}) => {
  // State to track search queries for each column
  const [searchTerms, setSearchTerms] = useState<Record<string, string>>({});
  const [districtFilters, setDistrictFilters] = useState<Record<string, string>>({});

  // --- NEW ASSIGNMENT STATE ---
  const [contextMenuState, setContextMenuState] = useState<{ visible: boolean, x: number, y: number, task: Task | RoutineTask | null, taskType: 'main' | 'routine', openUpwards?: boolean }>({ visible: false, x: 0, y: 0, task: null, taskType: 'main' });
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignTargetTask, setAssignTargetTask] = useState<{task: Task | RoutineTask, type: 'main' | 'routine'} | null>(null);
  const [assignStaffName, setAssignStaffName] = useState<string>('');
  const [assignDate, setAssignDate] = useState<string>('');

  useEffect(() => {
    const handleClick = () => setContextMenuState(prev => ({ ...prev, visible: false }));
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const handleContextMenu = (e: React.MouseEvent, task: Task | RoutineTask, taskType: 'main' | 'routine' = 'main') => {
    e.preventDefault();
    e.stopPropagation();

    const x = e.clientX;
    let y = e.clientY;
    
    // Yüksekliği taşma kontrolü (Ana menü için)
    if (y + 130 > window.innerHeight) {
      y = window.innerHeight - 130;
    }

    // Gönder alt menüsünün aşağı taşma durumu kontrolü (yaklaşık 280px yükseklik)
    const openUpwards = e.clientY + 280 > window.innerHeight;

    setContextMenuState({
      visible: true,
      x,
      y,
      task,
      taskType,
      openUpwards
    });
  };

  const openAssignModal = (task: Task | RoutineTask, type: 'main' | 'routine') => {
    setAssignTargetTask({ task, type });
    setShowAssignModal(true);
    setAssignStaffName(task.assignee || (staffList && staffList.length > 0 ? staffList[0].name : ''));
    
    let initialDateStr = '';
    if ('scheduledDate' in task && task.scheduledDate) {
      const d = new Date((task.scheduledDate as any).seconds ? (task.scheduledDate as any).seconds * 1000 : task.scheduledDate);
      if (!isNaN(d.getTime())) {
        initialDateStr = d.toISOString().split('T')[0];
      }
    } else if ('assignedAt' in task && task.assignedAt) {
      const d = new Date((task.assignedAt as any).seconds ? (task.assignedAt as any).seconds * 1000 : task.assignedAt);
      if (!isNaN(d.getTime())) {
        initialDateStr = d.toISOString().split('T')[0];
      }
    }
    if (!initialDateStr) {
        initialDateStr = new Date().toISOString().split('T')[0];
    }
    setAssignDate(initialDateStr);
  };

  const handleAssignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (assignTargetTask && assignStaffName && assignDate) {
      const selectedStaff = staffList?.find(s => s.name === assignStaffName);
      const targetDate = new Date(assignDate);
      targetDate.setHours(9, 0, 0, 0);

      if (assignTargetTask.type === 'main') {
        if (onTaskUpdate) {
          onTaskUpdate(assignTargetTask.task.id, {
            assignee: assignStaffName,
            assigneeEmail: selectedStaff?.email || '',
            scheduledDate: targetDate
          });
        }
      } else {
        if (onRoutineTaskUpdate) {
          onRoutineTaskUpdate(assignTargetTask.task.id, {
            assignee: assignStaffName,
            assignedAt: targetDate,
            scheduledDate: targetDate
          });
        }
      }
      setShowAssignModal(false);
    }
  };

  // Define the order explicitly including the new column
  const allColumns = [
    TaskStatus.PROJECT_TO_BE_DRAWN,
    TaskStatus.TO_CHECK,
    TaskStatus.CHECK_COMPLETED,
    TaskStatus.DEPOSIT_PAID,
    TaskStatus.GAS_OPENED,
    TaskStatus.SERVICE_DIRECTED,
    TaskStatus.COMBI_REPLACEMENT_RENOVATION
  ];

  const columns = visibleColumns
    ? (visibleColumns as string[])
    : allColumns;

  const handleSearchChange = (status: string, value: string) => {
    setSearchTerms(prev => ({
      ...prev,
      [status]: value
    }));
  };

  const getFilteredTasks = (status: string) => {
    const term = (searchTerms[status] || '').toLocaleLowerCase('tr').trim();
    const districtFilter = districtFilters[status];
    
    let columnTasks = [];
    if (status === 'MIXED') {
      columnTasks = tasks;
    } else if (status === TaskStatus.PROJECT_TO_BE_DRAWN) {
      columnTasks = tasks.filter(t => 
        t.status === TaskStatus.PROJECT_TO_BE_DRAWN || 
        (t.status === TaskStatus.CHECK_COMPLETED && !t.isProjectDrawn)
      );
    } else if (status === TaskStatus.CHECK_COMPLETED) {
      columnTasks = tasks.filter(t => t.status === TaskStatus.CHECK_COMPLETED);
    } else {
      columnTasks = tasks.filter(t => t.status === status);
    }

    if (districtFilter) {
      columnTasks = columnTasks.filter(t => t.district === districtFilter);
    }

    if (!term) return columnTasks;

    return columnTasks.filter(task => {
      return (
        task.title.toLocaleLowerCase('tr').includes(term) ||
        (task.jobDescription && task.jobDescription.toLocaleLowerCase('tr').includes(term)) ||
        task.orderNumber.toString().includes(term) ||
        (task.phone && task.phone.includes(term)) ||
        (task.address && task.address.toLocaleLowerCase('tr').includes(term))
      );
    });
  };

  // REWRITTEN: Returns { routine, standard } object
  const getFilteredPersonalTasks = () => {
    const term = (searchTerms['ROUTINE'] || '').toLocaleLowerCase('tr').trim();
    const matchesTerm = (text: string) => text.toLocaleLowerCase('tr').includes(term);

    // Sort Routine Tasks: Incomplete first, then by DAILY ORDER (if set), then by Assignment Time
    const sortedRoutine = [...routineTasks].sort((a, b) => {
      // 1. Completion Status (Incomplete first)
      if (a.isCompleted !== b.isCompleted) {
        return a.isCompleted ? 1 : -1;
      }

      // 2. Daily Order (Explicit ordering from Assignment View)
      if (a.dailyOrder !== 0 || b.dailyOrder !== 0) {
        // If one is 0 (undefined/unset), push it to bottom or keep relative?
        // Let's assume 0 means "unsorted" or "bottom".
        if (a.dailyOrder !== 0 && b.dailyOrder !== 0) return a.dailyOrder - b.dailyOrder;
        if (a.dailyOrder !== 0) return -1;
        if (b.dailyOrder !== 0) return 1;
      }

      // 3. Assignment Time (Fallback)
      const aAssign = a.assignedAt?.toMillis?.() || a.assignedAt || 0;
      const bAssign = b.assignedAt?.toMillis?.() || b.assignedAt || 0;

      if (aAssign !== bAssign) {
        return aAssign - bAssign; // Oldest first
      }

      // 4. Creation Time (Last Resort)
      const aCreate = a.createdAt?.toMillis?.() || a.createdAt || 0;
      const bCreate = b.createdAt?.toMillis?.() || b.createdAt || 0;
      return aCreate - bCreate;
    });

    const filteredRoutine = !term ? sortedRoutine : sortedRoutine.filter(t =>
      matchesTerm(t.content) ||
      (t.customerName && matchesTerm(t.customerName)) ||
      (t.address && matchesTerm(t.address)) ||
      (t.phoneNumber && matchesTerm(t.phoneNumber))
    );

    // Filter AND Sort Standard Tasks (myTasks)
    const sortedStandard = [...myTasks].sort((a, b) => {
      // 1. Daily Order
      if (a.dailyOrder !== 0 || b.dailyOrder !== 0) {
        if (a.dailyOrder !== 0 && b.dailyOrder !== 0) return a.dailyOrder - b.dailyOrder;
        if (a.dailyOrder !== 0) return -1;
        if (b.dailyOrder !== 0) return 1;
      }
      // 2. Order Number (Fallback)
      return (a.orderNumber || 0) - (b.orderNumber || 0);
    });

    const filteredStandard = !term ? sortedStandard : sortedStandard.filter(t =>
      matchesTerm(t.title) ||
      matchesTerm(t.address || '') ||
      t.orderNumber.toString().includes(term)
    );

    return { routine: filteredRoutine, standard: filteredStandard };
  };

  // Destructure filtered results
  const { routine: filteredRoutine, standard: filteredStandard } = getFilteredPersonalTasks();

  return (
    <>
      {/* --- CONTEXT MENU --- */}
      {contextMenuState.visible && contextMenuState.task && (
        <div 
          className="fixed bg-white border border-slate-200 shadow-xl rounded-lg py-1 z-50 min-w-[160px] animate-in fade-in zoom-in-95 duration-100"
          style={{ top: contextMenuState.y, left: contextMenuState.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button 
            onClick={() => {
              setContextMenuState(prev => ({ ...prev, visible: false }));
              openAssignModal(contextMenuState.task!, contextMenuState.taskType!);
            }}
            className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2 font-medium border-b border-slate-100"
          >
            <User className="w-4 h-4" />
            Görev Ata
          </button>
          
          {contextMenuState.taskType === 'main' && (
            <div className="relative group">
              <button className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-600 flex items-center justify-between font-medium">
                <div className="flex items-center gap-2">
                  <Share2 className="w-4 h-4" />
                  Gönder
                </div>
                <ChevronRight className="w-4 h-4" />
              </button>
              
              {/* Gönder Alt Menüsü (Sağa açılır) */}
              <div className={`absolute ${contextMenuState.openUpwards ? 'bottom-0' : 'top-0'} left-[95%] hidden group-hover:flex flex-col bg-white border border-slate-200 shadow-xl rounded-lg py-1 min-w-[220px]`}>
                {Object.entries(StatusLabels).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => {
                       if (onTaskUpdate) {
                         onTaskUpdate(contextMenuState.task!.id, { status: key as TaskStatus });
                       }
                       setContextMenuState(prev => ({ ...prev, visible: false }));
                    }}
                    className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-600 font-medium"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => {
               if (contextMenuState.taskType === 'main' && onTaskUpdate) {
                 onTaskUpdate(contextMenuState.task!.id, { isPriority: !contextMenuState.task!.isPriority });
               } else if (contextMenuState.taskType === 'routine' && onRoutineTaskUpdate) {
                 onRoutineTaskUpdate(contextMenuState.task!.id, { isPriority: !contextMenuState.task!.isPriority });
               }
               setContextMenuState(prev => ({ ...prev, visible: false }));
            }}
            className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-yellow-50 hover:text-yellow-600 flex items-center gap-2 font-medium border-t border-slate-100"
          >
            <Star className={`w-4 h-4 ${contextMenuState.task!.isPriority ? 'fill-current text-yellow-500' : ''}`} />
            {contextMenuState.task!.isPriority ? 'Öncelikli İşlerden Çıkar' : 'Öncelikli İşlere Ekle'}
          </button>
        </div>
      )}

      {/* --- ASSIGN MODAL --- */}
      {showAssignModal && assignTargetTask && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-700 flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-600" />
                Görevi Ustaya Ata
              </h3>
              <button onClick={() => setShowAssignModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-4 bg-slate-100 p-3 rounded-lg border border-slate-200">
                <div className="text-xs font-bold text-slate-500 mb-1">Seçili İş:</div>
                <div className="font-semibold text-slate-800">
                  {assignTargetTask.type === 'main' ? (assignTargetTask.task as Task).title : (assignTargetTask.task as RoutineTask).content}
                </div>
                {assignTargetTask.task.address && <div className="text-xs text-slate-500 truncate mt-1"><MapPin className="inline w-3 h-3 mr-1"/>{assignTargetTask.task.address}</div>}
              </div>
              
              <form onSubmit={handleAssignSubmit} className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Usta (Personel) Seçimi</label>
                  <select
                    value={assignStaffName}
                    onChange={(e) => setAssignStaffName(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500"
                  >
                    <option value="" disabled>Personel Seçin</option>
                    {staffList?.map(staff => (
                      <option key={staff.email} value={staff.name}>{staff.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Atanacak Tarih</label>
                  <input
                    type="date"
                    value={assignDate}
                    onChange={(e) => setAssignDate(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500"
                  />
                </div>
                <button type="submit" disabled={!assignStaffName || !assignDate} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 mt-2">
                  <User className="w-4 h-4" />
                  Görevi Ata
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

    <div className={`flex-1 overflow-x-auto overflow-y-hidden ${isCompact ? 'p-2' : 'p-6'}`}>
      <div className={`flex ${isCompact ? 'gap-3 min-w-full' : 'gap-6 min-w-[1500px]'} h-full transition-all`}>
        {showRoutineColumn && (
          <div className={`flex-1 flex flex-col ${isCompact ? 'min-w-[200px]' : 'min-w-[280px]'} ${!isDarkMode ? 'bg-[#1e293b]/40 border-white/10' : 'bg-slate-100/80 border-slate-200'} rounded-2xl border backdrop-blur-sm self-start max-h-full`}>
            {/* Header */}
            <div className={`p-4 border-b flex items-center justify-between rounded-t-2xl ${!isDarkMode ? 'border-white/10 bg-purple-500/10' : 'border-slate-200 bg-purple-500/5'}`}>
              <div className={`flex items-center gap-2 font-semibold ${!isDarkMode ? 'text-purple-300' : 'text-purple-700'}`}>
                <StatusIcon status="ROUTINE" />
                <span className="truncate">{staffName ? `${staffName} Eksik Listesi` : 'Personel Eksik Listesi'}</span>
                <span className={`ml-2 px-2 py-0.5 text-xs border rounded-full ${!isDarkMode ? 'bg-purple-900/50 border-purple-500/30 text-purple-300' : 'bg-purple-100 border-purple-200 text-purple-700'}`}>
                  {filteredRoutine.filter(t => !t.isCompleted).length + filteredStandard.length}
                </span>
              </div>
            </div>

            {/* Search Bar */}
            <div className={`px-3 py-2 border-b ${!isDarkMode ? 'border-white/10' : 'border-slate-200'}`}>
              <div className="relative group">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-purple-600 transition-colors" />
                <input
                  type="text"
                  placeholder="Ara (İçerik, Müşteri...)"
                  value={searchTerms['ROUTINE'] || ''}
                  onChange={(e) => handleSearchChange('ROUTINE', e.target.value)}
                  className={`w-full border rounded-xl py-1.5 pl-8 pr-3 text-xs focus:outline-none focus:ring-1 transition-all ${!isDarkMode ? 'bg-[#1e293b]/60 border-white/10 text-white placeholder-slate-500 focus:border-purple-400/30 focus:ring-purple-500/20' : 'bg-white border-slate-200 text-slate-700 placeholder-slate-400 focus:border-purple-500/30 focus:ring-purple-500/20'}`}
                />
              </div>
            </div>

            {/* Tasks List */}
            <div className="flex-1 overflow-y-auto p-3 pb-20 space-y-3 custom-scrollbar">
              {/* STANDARD TASKS SECTION */}
              {filteredStandard.length > 0 && (
                <div className="mb-4 space-y-3">
                  <div className="text-[10px] font-bold text-blue-600 uppercase tracking-widest pl-1">Saha Görevleri ({filteredStandard.length})</div>
                  {filteredStandard.map(t => (
                    <div
                      key={t.id}
                      onClick={() => onTaskClick(t)}
                      className={`
                        h-28 flex flex-col justify-between p-3 rounded-xl border transition-all cursor-pointer group shadow-md hover:shadow-xl hover:-translate-y-1
                        ${t.checkStatus === 'missing'
                          ? 'bg-gradient-to-br from-white to-orange-50 border-l-[6px] border-l-orange-500 border-slate-200'
                          : t.checkStatus === 'clean'
                            ? 'bg-gradient-to-br from-white to-emerald-50 border-l-[6px] border-l-emerald-500 border-slate-200'
                            : 'bg-gradient-to-br from-white to-slate-50 border-l-[6px] border-l-blue-500 border-slate-200'
                        }
                      `}

                    >
                      <div className="flex items-start gap-3">
                        {/* <div className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" /> REMOVED Dot, using Border-L instead for cleaner look */}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-slate-700 font-medium leading-snug group-hover:text-blue-600 transition-colors flex items-center gap-1">
                            {t.title}
                          </div>
                          {t.address && (
                            <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-500 truncate">
                              <MapPin className="w-3 h-3 flex-shrink-0" />
                              {t.address}
                            </div>
                          )}
                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-[10px] text-slate-500 font-mono bg-slate-100 px-1.5 py-0.5 rounded">#{t.orderNumber}</span>
                            <span className="text-[10px] text-blue-600 font-medium">{StatusLabels[t.status]}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ROUTINE TASKS SECTION */}
              {filteredRoutine.length > 0 && (
                <div className="space-y-3">
                  {filteredStandard.length > 0 && <div className="text-[10px] font-bold text-purple-600 uppercase tracking-widest pl-1 pt-2 border-t border-slate-200">Eksikler / Notlar ({filteredRoutine.length})</div>}
                  {filteredRoutine.map(t => (
                    <div key={t.id} onContextMenu={(e) => handleContextMenu(e, t, 'routine')} className={`h-28 flex flex-col justify-between p-3 rounded-xl border transition-all shadow-md hover:shadow-xl hover:-translate-y-1 ${t.isCompleted
                      ? 'bg-slate-100 border-slate-200 text-slate-500 opacity-60'
                      : 'bg-gradient-to-br from-white to-slate-50 border-slate-200 hover:border-purple-500/30'
                      }`}>
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => onToggleRoutineTask(t.id)}
                          className={`mt-0.5 flex-shrink-0 transition-colors ${t.isCompleted ? 'text-emerald-500' : 'text-slate-300 hover:text-emerald-500'}`}
                        >
                          {t.isCompleted ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                        </button>

                        <div className="flex-1 min-w-0">
                          {/* Customer Info Badges */}
                          {(t.customerName || t.phoneNumber || t.address) && (
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-2">
                              {t.customerName && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-600 border border-blue-100">
                                  <UserCircle className="w-3 h-3" /> {t.customerName}
                                </span>
                              )}
                              {t.phoneNumber && (
                                <a href={`tel:${t.phoneNumber}`} onClick={e => e.stopPropagation()} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100">
                                  <Phone className="w-3 h-3" /> {t.phoneNumber}
                                </a>
                              )}
                              {t.address && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-600 border border-amber-100">
                                  <MapPin className="w-3 h-3" /> {t.address}
                                </span>
                              )}
                            </div>
                          )}

                          <div className={`text-sm break-words leading-relaxed whitespace-pre-wrap ${t.isCompleted ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                            {t.content}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {filteredRoutine.length === 0 && filteredStandard.length === 0 && (
                <div className={`flex flex-col items-center justify-center h-20 border-2 border-dashed rounded-lg ${!isDarkMode ? 'border-white/10 text-slate-500' : 'border-slate-300/50 text-slate-400'}`}>
                  <span className="text-xs opacity-70">
                    {searchTerms['ROUTINE'] ? 'Sonuç bulunamadı' : 'Eksik iş yok'}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- EXISTING KANBAN COLUMNS --- */}
        {columns.map((status) => {
          const filteredTasks = getFilteredTasks(status);
          const searchTerm = searchTerms[status] || '';

          return (
            <div key={status} className={`flex-1 flex flex-col ${isCompact ? 'min-w-[200px]' : 'min-w-[280px]'} ${!isDarkMode ? 'bg-[#1e293b]/40 border-white/10' : 'bg-slate-100/80 border-slate-200'} rounded-2xl border backdrop-blur-sm`}>
              {/* Column Header */}
              <div className={`p-4 border-b flex items-center justify-between ${!isDarkMode ? 'border-white/10' : 'border-slate-200'}`}>
                <div className={`flex items-center gap-2 font-semibold ${!isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                  {status !== 'MIXED' && <StatusIcon status={status as TaskStatus} />}
                  <span className="truncate">{status === 'MIXED' ? 'Tüm İşler' : StatusLabels[status as TaskStatus]}</span>
                  <span className={`ml-2 px-2 py-0.5 text-xs border rounded-full ${!isDarkMode ? 'bg-white/10 border-white/20 text-slate-300' : 'bg-white border-slate-200 text-slate-500'}`}>
                    {status === 'MIXED'
                      ? tasks.length
                      : status === TaskStatus.PROJECT_TO_BE_DRAWN 
                        ? tasks.filter(t => t.status === TaskStatus.PROJECT_TO_BE_DRAWN || (t.status === TaskStatus.CHECK_COMPLETED && !t.isProjectDrawn)).length 
                        : tasks.filter(t => t.status === status).length}
                  </span>
                </div>
                <button className="text-slate-400 hover:text-slate-600">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>

              {/* Search & Filter Bar */}
              <div className={`px-3 py-2 border-b flex flex-col gap-2 ${!isDarkMode ? 'border-white/10' : 'border-slate-200'}`}>
                <div className="relative group">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                  <input
                    type="text"
                    placeholder="Ara (İsim, No, Adres...)"
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(status, e.target.value)}
                    className={`w-full border rounded-xl py-1.5 pl-8 pr-3 text-xs focus:outline-none focus:ring-1 transition-all ${!isDarkMode ? 'bg-[#1e293b]/60 border-white/10 text-white placeholder-slate-500 focus:border-blue-400/30 focus:ring-blue-500/20' : 'bg-white border-slate-200 text-slate-700 placeholder-slate-400 focus:border-blue-500/30 focus:ring-blue-500/20'}`}
                  />
                </div>
                  <select
                    value={districtFilters[status] || ''}
                    onChange={(e) => setDistrictFilters(prev => ({ ...prev, [status]: e.target.value }))}
                    className={`w-full border rounded-xl py-1.5 px-2.5 text-xs focus:outline-none focus:ring-1 transition-all ${!isDarkMode ? 'bg-[#1e293b]/60 border-white/10 text-white focus:border-blue-400/30 focus:ring-blue-500/20' : 'bg-slate-50 border-slate-200 text-slate-700 focus:border-blue-500/30 focus:ring-blue-500/20'}`}
                  >
                    <option value="">Tüm İlçeler</option>
                    {Array.from(new Set(
                      tasks
                        .filter(t => {
                          if (status === TaskStatus.PROJECT_TO_BE_DRAWN) {
                            return t.status === TaskStatus.PROJECT_TO_BE_DRAWN || (t.status === TaskStatus.CHECK_COMPLETED && !t.isProjectDrawn);
                          }
                          return t.status === status;
                        })
                        .map(t => t.district)
                        .filter(Boolean)
                    )).sort().map(d => (
                      <option key={d as string} value={d as string}>{d as string}</option>
                    ))}
                  </select>
              </div>

              {/* Tasks Container */}
              <div className="flex-1 overflow-y-auto p-3 pb-20 space-y-3 custom-scrollbar">
                {filteredTasks.map(task => (
                  <div
                    key={task.id}
                    onClick={() => onTaskClick(task)}
                    onContextMenu={(e) => handleContextMenu(e, task)}
                    className={`
                      h-28 flex flex-col justify-between px-3 py-3 rounded-xl border transition-all cursor-pointer group relative shadow-md hover:shadow-xl hover:-translate-y-1
                      ${task.isWaiting
                        ? 'bg-blue-100 border-l-[8px] border-l-blue-600 border-blue-200 shadow-[0_0_15px_-5px_rgba(37,99,235,0.4)]'
                        : (task.status === TaskStatus.GAS_OPENED && ((Date.now() - (task.updatedAt?.toMillis?.() || task.updatedAt || Date.now())) / (1000 * 60 * 60 * 24)) > 2)
                        ? 'bg-rose-100 border-l-[8px] border-l-rose-600 border-rose-300 shadow-[0_0_20px_-5px_rgba(225,29,72,0.6)]'
                        : task.checkStatus === 'missing'
                        ? 'bg-red-100 border-l-[8px] border-l-red-600 border-red-200 shadow-[0_0_15px_-5px_rgba(220,38,38,0.4)]'
                        : task.checkStatus === 'clean'
                          ? 'bg-green-100 border-l-[8px] border-l-green-600 border-green-200 shadow-[0_0_15px_-5px_rgba(22,163,74,0.4)]'
                          : (!task.isProjectDrawn && task.status === TaskStatus.CHECK_COMPLETED)
                            ? 'bg-gradient-to-br from-white to-orange-50 border-l-[6px] border-l-orange-500 border-slate-200 shadow-[0_0_15px_-5px_rgba(249,115,22,0.3)]'
                            : 'bg-gradient-to-br from-white to-slate-50 border-l-[6px] border-l-slate-400 border-slate-200 hover:border-l-blue-500'
                      }
                    `}
                  >
                    {/* Row Number Badge - Compact */}
                    <div className={`absolute top-2 right-2 text-[10px] font-mono font-bold opacity-90 ${task.checkStatus === 'missing' ? 'text-red-700 bg-red-200 px-1.5 py-0.5 rounded border border-red-300' :
                      task.checkStatus === 'clean' ? 'text-green-700 bg-green-200 px-1.5 py-0.5 rounded border border-green-300' : 'text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded'
                      }`}>
                      #{task.orderNumber}
                    </div>

                    <div className="flex items-center gap-2 mb-1 pr-8">
                      <h4 className={`font-bold text-sm leading-snug transition-colors line-clamp-1 ${task.checkStatus === 'missing' ? 'text-red-900 group-hover:text-red-700' : task.checkStatus === 'clean' ? 'text-green-900 group-hover:text-green-700' : 'text-slate-800 group-hover:text-blue-700'}`}>
                        {task.title}
                      </h4>
                    </div>
                    {/* Job Description - Fainter Tone */}
                    {task.jobDescription && (
                      <div className="mb-2 text-xs font-medium text-slate-500/80 truncate">
                        {task.jobDescription}
                      </div>
                    )}

                    {/* OLD PROJECT MISSING BADGE REMOVED FROM HERE */}

                    {/* Address - Colorful */}
                    {task.address && (
                      <div className="flex items-center gap-1.5 text-xs text-sky-700 font-medium bg-sky-50/50 p-1 -ml-1 rounded-lg">
                        <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-sky-500" />
                        <span className="truncate max-w-[200px]">{task.address}</span>
                      </div>
                    )}

                    {onTaskUpdate && task.status === TaskStatus.GAS_OPENED && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onTaskUpdate(task.id, { isWaiting: !task.isWaiting });
                        }}
                        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 px-3 py-1 rounded-lg text-[11px] font-bold shadow-md transition-all active:scale-95 border-2 ${
                          task.isWaiting 
                            ? 'bg-blue-600 text-white border-blue-400 opacity-90' 
                            : 'bg-white/90 text-slate-700 border-slate-200 hover:border-blue-500 opacity-0 group-hover:opacity-100 hover:bg-blue-50'
                        } whitespace-nowrap`}
                      >
                        {task.isWaiting ? 'BEKLİYOR' : 'Beklemeye Al'}
                      </button>
                    )}
                    {/* Created By Info */}
                    {!hideCreator && task.createdBy && (
                      <div className="absolute bottom-2 right-2 text-[11px] text-slate-500 font-bold flex items-center gap-1 bg-white/50 px-1.5 py-0.5 rounded-md shadow-sm border border-slate-100">
                        <span className="text-[9px] text-slate-400 font-normal italic">Ekleyen:</span>
                        {(() => {
                          const emailLower = task.createdBy?.toLowerCase() || '';

                          // 0. Manual Overrides (Admins)
                          const knownNames: Record<string, string> = {
                            'caner192@hotmail.com': 'CANER ÇELİK',
                            'canercelik1994@gmail.com': 'CANER ÇELİK',
                            'admin@onaymuhendislik.com': 'CANER ÇELİK',
                            'demo@onay.com': 'DEMO'
                          };

                          if (knownNames[emailLower]) return knownNames[emailLower];

                          // 1. Try to find in staffList
                          const found = staffList.find(s => s.email.toLowerCase() === emailLower);
                          if (found) return found.name;

                          // 2. Fallback: Parse Name from Email
                          const emailName = (task.createdBy || '').split('@')[0];
                          return emailName
                            .split(/[._]/)
                            .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
                            .join(' ');
                        })()}
                      </div>
                    )}
                  </div>
                ))}

                {filteredTasks.length === 0 && (
                  <div className={`flex flex-col items-center justify-center h-20 border-2 border-dashed rounded-lg ${!isDarkMode ? 'border-white/10 text-slate-500' : 'border-slate-300/50 text-slate-400'}`}>
                    <span className="text-xs opacity-70">
                      {searchTerm ? 'Sonuç bulunamadı' : 'İş kaydı yok'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div >
    </>
  );
};

export default KanbanBoard;