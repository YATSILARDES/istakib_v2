import React, { useState } from 'react';
import { RoutineTask, TaskStatus, StatusLabels } from '../types';
import { X, Plus, User, Trash2, CalendarCheck, CheckSquare, Square, Phone, MapPin, UserCircle, ArrowRightCircle, Check } from 'lucide-react';
import LocationPreviewModal from './LocationPreviewModal';

interface RoutineTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: RoutineTask[];
  onAddTask: (content: string, assignee: string, customerName?: string, phoneNumber?: string, address?: string) => void;
  onToggleTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onConvertTask: (taskId: string, targetStatus: TaskStatus) => void;
}

const RoutineTasksModal: React.FC<RoutineTasksModalProps> = ({
  isOpen,
  onClose,
  tasks,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  onConvertTask
}) => {
  const [customerName, setCustomerName] = useState('');
  const [newTaskContent, setNewTaskContent] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [showLocationModal, setShowLocationModal] = useState(false);

  // Conversion State
  const [convertingTaskId, setConvertingTaskId] = useState<string | null>(null);
  const [targetStatus, setTargetStatus] = useState<TaskStatus>(TaskStatus.TO_CHECK);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTaskContent.trim()) {
      // Add with empty assignee (unassigned pool)
      onAddTask(newTaskContent, '', customerName, phoneNumber, address);
      setNewTaskContent('');
      setCustomerName('');
      setPhoneNumber('');
      setAddress('');
    }
  };

  const activeTasks = tasks.filter(t => !t.isCompleted);
  const completedTasks = tasks.filter(t => t.isCompleted);

  const handleStartConversion = (taskId: string) => {
    setConvertingTaskId(taskId);
    setTargetStatus(TaskStatus.TO_CHECK); // Default choice
  };

  const handleConfirmConversion = () => {
    if (convertingTaskId) {
      onConvertTask(convertingTaskId, targetStatus);
      setConvertingTaskId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between bg-slate-800">
          <div className="flex items-center gap-3">
            <div className="bg-purple-600 p-2 rounded-lg">
              <CalendarCheck className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-white">Eksikler Havuzu (Veri Girişi)</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-2 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">

          {/* Add Task Form */}
          <div className="p-6 bg-slate-800/30 border-b border-slate-700">
            <p className="text-sm text-slate-400 mb-4">Buraya ekleyeceğiniz maddeler "Görev Dağıtımı" ekranında havuza düşecektir.</p>
            <form onSubmit={handleSubmit} className="space-y-3">
              {/* İlk Satır: Müşteri Adı + Telefon */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="relative">
                  <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Müşteri Adı Soyadı"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-lg pl-10 pr-4 py-2.5 text-white focus:ring-2 focus:ring-purple-500 outline-none placeholder-slate-500"
                  />
                </div>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="tel"
                    placeholder="Telefon Numarası"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-lg pl-10 pr-4 py-2.5 text-white focus:ring-2 focus:ring-purple-500 outline-none placeholder-slate-500"
                  />
                </div>
              </div>

              {/* İkinci Satır: Adres */}
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Adres"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-slate-700/50 border border-slate-600 rounded-lg pl-10 pr-9 py-2.5 text-white focus:ring-2 focus:ring-purple-500 outline-none placeholder-slate-500"
                />
                <button
                  type="button"
                  onClick={() => setShowLocationModal(true)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-purple-400 transition-colors p-1"
                  title="Konum Ekle"
                >
                  <MapPin className="w-4 h-4" />
                </button>
              </div>

              {/* Üçüncü Satır: Eksik + Ekle Butonu */}
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="Eksik malzeme, yapılacak tamirat veya not girin... *"
                  value={newTaskContent}
                  onChange={(e) => setNewTaskContent(e.target.value)}
                  className="flex-1 bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-purple-500 outline-none placeholder-slate-500"
                />
                <button
                  type="submit"
                  disabled={!newTaskContent.trim()}
                  className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  <span>Eksik Ekle</span>
                </button>
              </div>
            </form>
          </div>

          {/* Task List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">

            {/* Active Tasks */}
            <div>
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Havuzdaki Eksikler ({activeTasks.length})</h3>
              <div className="space-y-2">
                {activeTasks.length === 0 ? (
                  <p className="text-slate-600 italic text-sm">Havuz boş.</p>
                ) : (
                  activeTasks.map(task => (
                    <div key={task.id} className="group flex items-start gap-3 bg-slate-800/50 border border-slate-700 hover:border-slate-600 rounded-lg p-3 transition-all">
                      <button
                        onClick={() => onToggleTask(task.id)}
                        className="mt-0.5 text-slate-400 hover:text-purple-400 transition-colors"
                        title="Tamamlandı işaretle"
                      >
                        <Square className="w-5 h-5" />
                      </button>
                      <div className="flex-1 overflow-hidden">
                        {/* Müşteri Bilgileri */}
                        {(task.customerName || task.phoneNumber || task.address) && (
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-1.5 text-xs">
                            {task.customerName && (
                              <span className="text-blue-400 flex items-center gap-1">
                                <UserCircle className="w-3 h-3" /> {task.customerName}
                              </span>
                            )}
                            {task.phoneNumber && (
                              <a
                                href={`tel:${task.phoneNumber}`}
                                className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Phone className="w-3 h-3" /> {task.phoneNumber}
                              </a>
                            )}
                            {task.address && (
                              <span className="text-amber-400 flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> {task.address}
                              </span>
                            )}
                          </div>
                        )}
                        {/* Eksik İçeriği */}
                        <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap break-all">{task.content}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          {task.assignee ? (
                            <span className="text-xs bg-purple-900/30 text-purple-300 px-2 py-0.5 rounded border border-purple-800/50 flex items-center gap-1">
                              <User className="w-3 h-3" /> {task.assignee}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500 italic">Atanmadı</span>
                          )}
                          <span className="text-[10px] text-slate-500">{new Date(task.createdAt).toLocaleDateString('tr-TR')}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => onDeleteTask(task.id)}
                        className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 p-1 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Completed Tasks */}
            {completedTasks.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Tamamlananlar ({completedTasks.length})</h3>
                <div className="space-y-2 opacity-60">
                  {completedTasks.map(task => (
                    <div key={task.id}>
                      <div className="flex items-start gap-3 bg-slate-800/20 border border-slate-700/50 rounded-lg p-3">
                        <button
                          onClick={() => onToggleTask(task.id)}
                          className="text-emerald-500 mt-0.5"
                        >
                          <CheckSquare className="w-5 h-5" />
                        </button>
                        <div className="flex-1 overflow-hidden">
                          {/* Müşteri Bilgileri */}
                          {(task.customerName || task.phoneNumber || task.address) && (
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-1 text-xs opacity-70">
                              {task.customerName && (
                                <span className="text-slate-400 flex items-center gap-1">
                                  <UserCircle className="w-3 h-3" /> {task.customerName}
                                </span>
                              )}
                              {task.phoneNumber && (
                                <a
                                  href={`tel:${task.phoneNumber}`}
                                  className="text-slate-400 hover:text-emerald-300 flex items-center gap-1 hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Phone className="w-3 h-3" /> {task.phoneNumber}
                                </a>
                              )}
                              {task.address && (
                                <span className="text-slate-400 flex items-center gap-1">
                                  <MapPin className="w-3 h-3" /> {task.address}
                                </span>
                              )}
                            </div>
                          )}
                          <p className="text-slate-500 line-through text-sm whitespace-pre-wrap break-all">{task.content}</p>

                          {/* Dönüştürme UI */}
                          {convertingTaskId === task.id ? (
                            <div className="mt-2 p-2 bg-slate-800 border border-slate-700 rounded-lg animate-in fade-in slide-in-from-top-1">
                              <p className="text-xs text-slate-300 mb-2 font-medium">Bu eksik için kart oluşturulacak:</p>
                              <div className="flex gap-2">
                                <select
                                  value={targetStatus}
                                  onChange={(e) => setTargetStatus(e.target.value as TaskStatus)}
                                  className="flex-1 bg-slate-900 border border-slate-600 rounded text-xs text-white px-2 py-1 outline-none focus:border-purple-500"
                                >
                                  {Object.entries(StatusLabels).map(([key, label]) => (
                                    <option key={key} value={key}>{label}</option>
                                  ))}
                                </select>
                                <button
                                  onClick={handleConfirmConversion}
                                  className="bg-purple-600 hover:bg-purple-500 text-white px-2 py-1 rounded text-xs flex items-center gap-1 transition-colors"
                                >
                                  <Check className="w-3 h-3" />
                                  Oluştur
                                </button>
                                <button
                                  onClick={() => setConvertingTaskId(null)}
                                  className="bg-slate-700 hover:bg-slate-600 text-slate-300 px-2 py-1 rounded text-xs transition-colors"
                                >
                                  İptal
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="mt-2">
                              {/* Sadece İsim veya Telefon varsa dönüştürme mantıklı olur */}
                              {(task.customerName || task.phoneNumber) && (
                                <button
                                  onClick={() => handleStartConversion(task.id)}
                                  className="text-[10px] flex items-center gap-1 text-slate-500 hover:text-blue-400 transition-colors border border-slate-700 hover:border-blue-400/50 px-2 py-1 rounded bg-slate-900/50"
                                  title="Bu kişiyi ana listeye taşı"
                                >
                                  <ArrowRightCircle className="w-3 h-3" />
                                  Kişi Kartı Oluştur
                                </button>
                              )}
                            </div>
                          )}

                        </div>
                        <button
                          onClick={() => onDeleteTask(task.id)}
                          className="text-slate-600 hover:text-red-400 p-1 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
      <LocationPreviewModal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        onConfirm={(url) => {
          setAddress(prev => prev ? `${prev} ${url}` : url);
          setShowLocationModal(false);
        }}
      />
    </div>
  );
};

export default RoutineTasksModal;
