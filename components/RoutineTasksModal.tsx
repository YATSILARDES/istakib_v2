import React, { useState } from 'react';
import { RoutineTask, TaskStatus, StatusLabels } from '../types';
import { X, Plus, User, Trash2, CalendarCheck, CheckSquare, Square, Phone, MapPin, UserCircle, ArrowRightCircle, Check, Pencil, Save, XCircle } from 'lucide-react';
import LocationPreviewModal from './LocationPreviewModal';

interface RoutineTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: RoutineTask[];
  onAddTask: (content: string, assignee: string, customerName?: string, phoneNumber?: string, address?: string, locationCoordinates?: string, district?: string, city?: string) => void;
  onToggleTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onConvertTask: (taskId: string, targetStatus: TaskStatus) => void;
  onUpdateTask: (taskId: string, updatedData: Partial<RoutineTask>) => void;
}

const RoutineTasksModal: React.FC<RoutineTasksModalProps> = ({
  isOpen,
  onClose,
  tasks,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  onConvertTask,
  onUpdateTask
}) => {
  const [customerName, setCustomerName] = useState('');
  const [newTaskContent, setNewTaskContent] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [locationCoordinates, setLocationCoordinates] = useState('');
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [district, setDistrict] = useState('');
  const [city, setCity] = useState('');

  // Edit State
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  // Conversion State
  const [convertingTaskId, setConvertingTaskId] = useState<string | null>(null);
  const [targetStatus, setTargetStatus] = useState<TaskStatus>(TaskStatus.TO_CHECK);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTaskContent.trim()) {
      if (editingTaskId) {
        // Update existing task
        onUpdateTask(editingTaskId, {
          content: newTaskContent,
          customerName,
          phoneNumber,
          address,
          locationCoordinates,
          district,
          city
        });
        setEditingTaskId(null);
      } else {
        // Add new task with empty assignee (unassigned pool)
        onAddTask(newTaskContent, '', customerName, phoneNumber, address, locationCoordinates, district, city);
      }

      // Reset Form
      setNewTaskContent('');
      setCustomerName('');
      setPhoneNumber('');
      setAddress('');
      setLocationCoordinates('');
    }
  };

  const handleEditClick = (task: RoutineTask) => {
    setEditingTaskId(task.id);
    setNewTaskContent(task.content);
    setCustomerName(task.customerName || '');
    setPhoneNumber(task.phoneNumber || '');
    setAddress(task.address || '');
    setDistrict(task.district || '');
    setCity(task.city || '');
    setLocationCoordinates(task.locationCoordinates || '');
  };

  const cancelEdit = () => {
    setEditingTaskId(null);
    setNewTaskContent('');
    setCustomerName('');
    setPhoneNumber('');
    setAddress('');
    setDistrict('');
    setCity('');
    setLocationCoordinates('');
  };



  const handleStartConversion = (taskId: string) => {
    setConvertingTaskId(taskId);
    setTargetStatus(TaskStatus.TO_CHECK); // Default choice
  };

  const [activeTab, setActiveTab] = useState<'pool' | 'assigned' | 'completed'>('pool');
  const [activeDistrict, setActiveDistrict] = useState<string>('Tümü');

  const handleConfirmConversion = () => {
    if (convertingTaskId) {
      onConvertTask(convertingTaskId, targetStatus);
      setConvertingTaskId(null);
    }
  };

  // Filter Logic
  const poolTasks = tasks.filter(t => !t.isCompleted && (!t.assignee || t.assignee.trim() === ''));
  const assignedTasks = tasks.filter(t => !t.isCompleted && t.assignee && t.assignee.trim() !== '');
  const doneTasks = tasks.filter(t => t.isCompleted);

  // Get Unique Districts from Pool Tasks
  const uniqueDistricts = ['Tümü', ...Array.from(new Set(poolTasks.map(t => t.district).filter(d => d && d.trim() !== ''))).sort()];

  // Filter Pool Tasks by Active District
  const filteredPoolTasks = activeDistrict === 'Tümü'
    ? poolTasks
    : poolTasks.filter(t => t.district === activeDistrict);

  // Helper: Render Task Card
  const renderTaskCard = (task: RoutineTask, isCompletedView: boolean) => (
    <div key={task.id} className={`group flex items-start gap-3 border rounded-lg p-3 transition-all ${isCompletedView ? 'bg-slate-800/20 border-slate-700/50' : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'} ${editingTaskId === task.id ? 'ring-2 ring-purple-500/50 border-purple-500/50' : ''}`}>
      <button
        onClick={() => onToggleTask(task.id)}
        className={`mt-0.5 transition-colors ${isCompletedView ? 'text-emerald-500' : 'text-slate-400 hover:text-purple-400'}`}
        title={isCompletedView ? "Tamamlanmadı yap" : "Tamamlandı işaretle"}
      >
        {isCompletedView ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
      </button>

      <div className="flex-1 overflow-hidden">
        {/* Müşteri Bilgileri */}
        {(task.customerName || task.phoneNumber || task.address || task.district) && (
          <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 mb-1.5 text-xs ${isCompletedView ? 'opacity-70' : ''}`}>
            {task.customerName && (
              <span className={`${isCompletedView ? 'text-slate-400' : 'text-blue-400'} flex items-center gap-1`}>
                <UserCircle className="w-3 h-3" /> {task.customerName}
              </span>
            )}
            {task.phoneNumber && (
              <a
                href={`tel:${task.phoneNumber}`}
                className={`${isCompletedView ? 'text-slate-400 hover:text-emerald-300' : 'text-emerald-400 hover:text-emerald-300'} flex items-center gap-1 hover:underline`}
                onClick={(e) => e.stopPropagation()}
              >
                <Phone className="w-3 h-3" /> {task.phoneNumber}
              </a>
            )}
            {task.district && (
              <span className="bg-purple-900/30 text-purple-300 px-1.5 py-0.5 rounded border border-purple-800/30">
                {task.district}
              </span>
            )}
            {task.address && (
              <span className={`${isCompletedView ? 'text-slate-400' : 'text-amber-400'} flex items-center gap-1`}>
                <MapPin className="w-3 h-3" /> {task.address}
              </span>
            )}
          </div>
        )}

        {/* Eksik İçeriği */}
        <p className={`${isCompletedView ? 'text-slate-500 line-through' : 'text-slate-200'} text-sm leading-relaxed whitespace-pre-wrap break-all`}>{task.content}</p>

        {/* Alt Bilgiler (Tarih, Atama vs) */}
        {!isCompletedView && (
          <div className="flex items-center gap-2 mt-1.5">
            {task.assignee ? (
              <span className="text-xs bg-purple-900/30 text-purple-300 px-2 py-0.5 rounded border border-purple-800/50 flex items-center gap-1">
                <User className="w-3 h-3" /> {task.assignee}
              </span>
            ) : (
              <span className="text-[10px] text-slate-500 italic">Atanmadı</span>
            )}
            <span className="text-[10px] text-slate-500">{new Date(task.createdAt?.seconds ? task.createdAt.seconds * 1000 : task.createdAt).toLocaleDateString('tr-TR')}</span>
          </div>
        )}

        {/* Dönüştürme UI (Sadece tamamlananlar veya özel durumlarda görünürdü ama burada opsiyonel yapabiliriz) */}
        {/* Şu anki mantıkta sadece Tamamlananlarda gösteriyorduk ama aktiflerde de kişi kartı oluşturma butonu vardı. Her ikisine de ekleyelim mantıklıca. */}

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
            {/* Sadece İsim veya Telefon varsa dönüştürme mantıklı olur. Hem aktif hem tamamlanmış için açık kalsın. */}
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

      <div className="flex flex-col gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => handleEditClick(task)}
          className="p-1 text-slate-500 hover:text-blue-400 transition-colors"
          title="Düzenle"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDeleteTask(task.id)}
          className="p-1 text-slate-500 hover:text-red-400 transition-colors"
          title="Sil"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

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

          {/* Add/Edit Task Form */}
          <div className={`p-6 border-b border-slate-700 transition-colors ${editingTaskId ? 'bg-purple-900/10' : 'bg-slate-800/30'}`}>
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-slate-400">
                {editingTaskId ? 'Eksik Düzenleniyor...' : 'Buraya ekleyeceğiniz maddeler "Görev Dağıtımı" ekranında havuza düşecektir.'}
              </p>
              {editingTaskId && (
                <button onClick={cancelEdit} className="text-xs flex items-center gap-1 text-red-400 hover:text-red-300 bg-red-500/10 px-2 py-1 rounded">
                  <XCircle className="w-3 h-3" /> Vazgeç
                </button>
              )}
            </div>
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

              {/* İkinci Satır: Adres + İlçe + İl */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
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
                <div className="w-full sm:w-1/3 flex gap-3">
                  <input
                    type="text"
                    placeholder="İlçe"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-1/2 bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2.5 text-white focus:ring-2 focus:ring-purple-500 outline-none placeholder-slate-500"
                  />
                  <input
                    type="text"
                    placeholder="İl"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-1/2 bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2.5 text-white focus:ring-2 focus:ring-purple-500 outline-none placeholder-slate-500"
                  />
                </div>
              </div>

              {/* Konum Gösterimi */}
              {locationCoordinates && (
                <div className="flex items-center gap-2 mt-1 -mb-1">
                  <span className="text-[10px] text-blue-400 flex items-center gap-1 bg-slate-800/50 px-2 py-0.5 rounded border border-blue-500/20">
                    <MapPin className="w-3 h-3" /> Konum Eklendi
                  </span>
                  <button
                    type="button"
                    onClick={() => setLocationCoordinates('')}
                    className="text-slate-500 hover:text-red-400"
                    title="Konumu Kaldır"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

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
                  className={`px-5 py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-white ${editingTaskId ? 'bg-orange-500 hover:bg-orange-600' : 'bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed'}`}
                >
                  {editingTaskId ? <Save className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                  <span>{editingTaskId ? 'Güncelle' : 'Eksik Ekle'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Tab Navigation */}
          <div className="px-6 mt-4 border-b border-slate-700 flex gap-4 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab('pool')}
              className={`pb-3 text-sm font-medium transition-colors relative whitespace-nowrap ${activeTab === 'pool' ? 'text-purple-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Havuzdaki Eksikler
              <span className="ml-2 bg-slate-800 text-slate-400 text-[10px] px-2 py-0.5 rounded-full">{poolTasks.length}</span>
              {activeTab === 'pool' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500 rounded-t-full" />}
            </button>
            <button
              onClick={() => setActiveTab('assigned')}
              className={`pb-3 text-sm font-medium transition-colors relative whitespace-nowrap ${activeTab === 'assigned' ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Atanan Eksikler
              <span className="ml-2 bg-slate-800 text-slate-400 text-[10px] px-2 py-0.5 rounded-full">{assignedTasks.length}</span>
              {activeTab === 'assigned' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-t-full" />}
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`pb-3 text-sm font-medium transition-colors relative whitespace-nowrap ${activeTab === 'completed' ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Tamamlanan Eksikler
              <span className="ml-2 bg-slate-800 text-slate-400 text-[10px] px-2 py-0.5 rounded-full">{doneTasks.length}</span>
              {activeTab === 'completed' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-t-full" />}
            </button>
          </div>

          {/* District Filter Chips (Only for Pool Tasks) */}
          {activeTab === 'pool' && uniqueDistricts.length > 1 && (
            <div className="px-6 pt-3 pb-1 flex gap-2 overflow-x-auto no-scrollbar">
              {uniqueDistricts.map(dist => (
                <button
                  key={dist}
                  onClick={() => setActiveDistrict(dist)}
                  className={`text-xs px-3 py-1.5 rounded-full transition-colors whitespace-nowrap border ${activeDistrict === dist ? 'bg-purple-600 text-white border-purple-500' : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'}`}
                >
                  {dist}
                </button>
              ))}
            </div>
          )}

          {/* Task List Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">

            {/* VIEW: POOL TASKS */}
            {activeTab === 'pool' && (
              <div className="space-y-2">
                {filteredPoolTasks.length === 0 ? (
                  <div className="text-center py-10">
                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-600">
                      <CheckSquare className="w-8 h-8 opacity-50" />
                    </div>
                    <p className="text-slate-500 text-sm">
                      {activeDistrict !== 'Tümü' ? `"${activeDistrict}" ilçesinde eksik bulunamadı.` : 'Havuzda bekleyen eksik yok.'}
                    </p>
                  </div>
                ) : (
                  filteredPoolTasks.map(task => renderTaskCard(task, false))
                )}
              </div>
            )}

            {/* VIEW: ASSIGNED TASKS */}
            {activeTab === 'assigned' && (
              <div className="space-y-2">
                {assignedTasks.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-slate-500 text-sm">Henüz bir eksik atanmamış.</p>
                  </div>
                ) : (
                  assignedTasks.map(task => renderTaskCard(task, false))
                )}
              </div>
            )}

            {/* VIEW: COMPLETED TASKS */}
            {activeTab === 'completed' && (
              <div className="space-y-2 opacity-80">
                {doneTasks.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-slate-500 text-sm">Henüz tamamlanan eksik yok.</p>
                  </div>
                ) : (
                  doneTasks.map(task => renderTaskCard(task, true))
                )}
              </div>
            )}

          </div>

        </div>
      </div>
      <LocationPreviewModal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        onConfirm={(url) => {
          setLocationCoordinates(url);
          setShowLocationModal(false);
        }}
      />
    </div>
  );
};

export default RoutineTasksModal;
