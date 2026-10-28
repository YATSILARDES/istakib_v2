import React, { useState, useEffect } from 'react';
import { Task, TaskStatus, StatusLabels } from '../types';
import {
  X,
  Save,
  Calendar,
  MapPin,
  Phone,
  FileText,
  User,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  PhoneCall,
  Share2,
  Flame,
  Wrench,
  ClipboardCheck,
  ScanBarcode,
  Camera,
  Image as ImageIcon,
  Loader2,
  Send,
  ChevronLeft,
  ChevronDown,
  Check,
  Navigation
} from 'lucide-react';
import { Scanner } from './Scanner';
import CameraCapture from './CameraCapture';
import LocationPreviewModal from './LocationPreviewModal';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Partial<Task>) => void;
  onDelete?: (taskId: string) => void;
  task?: Task; // If provided, we are editing
  nextOrderNumber: number;
  isAdmin?: boolean; // Yönetici yetkisi
  existingTasks: Task[]; // Duplicate check için
}

type TabType = 'personal' | 'control' | 'service';

const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  task,
  nextOrderNumber,
  isAdmin = false,
  existingTasks
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('personal');
  const [formData, setFormData] = useState<Partial<Task>>({
    title: '',
    jobDescription: '',
    status: TaskStatus.TO_CHECK,
    assignee: '',
    date: '',
    address: '',
    district: '',
    city: '',
    locationCoordinates: '',
    phone: '',
    tenantName: '',
    tenantPhone: '',
    generalNote: '',
    teamNote: '',
    checkStatus: null,
    gasOpeningDate: '',
    gasNote: '',
    serviceSerialNumber: '',
    serialNumberImage: '',
    serviceNote: '',
    isProjectDrawn: false
  });

  const [selectedStatus, setSelectedStatus] = useState<TaskStatus>(TaskStatus.TO_CHECK);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showPhoneSelector, setShowPhoneSelector] = useState(false);

  const handleHeaderCall = () => {
    if (formData.phone && formData.tenantPhone) {
      setShowPhoneSelector(true);
    } else if (formData.phone) {
      window.location.href = `tel:${formData.phone}`;
    } else if (formData.tenantPhone) {
      window.location.href = `tel:${formData.tenantPhone}`;
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    setIsDeleting(false);
    setActiveTab('personal');
    setShowScanner(false);
    setShowCamera(false);
    setShowImagePreview(false);

    if (task) {
      setFormData({ ...task });
      setSelectedStatus(task.status || TaskStatus.TO_CHECK);
    } else {
      const initialStatus = TaskStatus.TO_CHECK;
      setFormData({
        title: '',
        jobDescription: '',
        status: initialStatus,
        assignee: '',
        date: new Date().toISOString().split('T')[0],
        address: '',
        district: '',
        city: '',
        locationCoordinates: '',
        phone: '',
        tenantName: '',
        tenantPhone: '',
        generalNote: '',
        teamNote: '',
        checkStatus: null,
        orderNumber: nextOrderNumber,
        gasOpeningDate: '',
        gasNote: '',
        serviceSerialNumber: '',
        serialNumberImage: '',
        serviceNote: '',
        isProjectDrawn: false
      });
      setSelectedStatus(initialStatus);
    }
  }, [task, isOpen]);

  useEffect(() => {
    if (isOpen && !task) {
      setFormData((prev) => ({
        ...prev,
        orderNumber: nextOrderNumber
      }));
    }
  }, [nextOrderNumber, isOpen, task]);

  if (!isOpen) return null;

  // Form Save
  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // Duplicate Check
    if (formData.title) {
      const duplicate = existingTasks.find(
        (t) =>
          t.title.trim().toLowerCase() === formData.title?.trim().toLowerCase() &&
          t.id !== task?.id
      );

      if (duplicate) {
        if (!confirm('Aynı isimde kayıtlı kişi bulunmaktadır. Yine de kaydedilsin mi?')) {
          return;
        }
      }
    }

    const dataToSave = { ...formData, status: selectedStatus };
    if (selectedStatus === TaskStatus.GAS_OPENED && !dataToSave.gasOpeningDate) {
      dataToSave.gasOpeningDate = new Date().toISOString().split('T')[0];
    }
    onSave(dataToSave);
    onClose();
  };

  // Quick "Gönder" button handler
  const handleSendStatus = () => {
    if (formData.title) {
      const duplicate = existingTasks.find(
        (t) =>
          t.title.trim().toLowerCase() === formData.title?.trim().toLowerCase() &&
          t.id !== task?.id
      );

      if (duplicate) {
        if (!confirm('Aynı isimde kayıtlı kişi bulunmaktadır. Yine de gönderilsin mi?')) {
          return;
        }
      }
    }

    const updated = { ...formData, status: selectedStatus };
    if (selectedStatus === TaskStatus.GAS_OPENED && !updated.gasOpeningDate) {
      updated.gasOpeningDate = new Date().toISOString().split('T')[0];
    }
    onSave(updated);
    onClose();
  };

  const handleDeleteClick = () => {
    setIsDeleting(true);
  };

  const handleConfirmDelete = () => {
    if (task && onDelete) {
      onDelete(task.id);
      onClose();
    }
  };

  const handleCancelDelete = () => {
    setIsDeleting(false);
  };

  const handleShare = async () => {
    const cleanAddress = (formData.address || '').replace(/https?:\/\/[^\s]+/g, '').trim();

    let addressLine = cleanAddress;
    if (formData.district) addressLine += ` / ${formData.district}`;
    if (formData.city) addressLine += ` / ${formData.city}`;

    let shareText = `👤 ${formData.title || 'Müşteri'}`;
    if (formData.tenantName || formData.tenantPhone) {
      shareText += `\n📞 Ev Sahibi Tel: ${formData.phone || 'Yok'}`;
      if (formData.tenantName) shareText += `\n👤 Kiracı: ${formData.tenantName}`;
      if (formData.tenantPhone) shareText += `\n📞 Kiracı Tel: ${formData.tenantPhone}`;
    } else {
      shareText += `\n📞 ${formData.phone || 'Telefon Yok'}`;
    }
    shareText += `\n🏠 ${addressLine || 'Adres Yok'}`;

    if (formData.locationCoordinates) {
      shareText += `\n\n📍 Konum:\n${formData.locationCoordinates}`;
    }
    const shareData = {
      title: 'Müşteri Bilgileri',
      text: shareText
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareText);
        alert('Müşteri bilgileri panoya kopyalandı.');
      }
    } catch (err) {
      console.error('Sharing failed', err);
    }
  };

  const handleScanSuccess = (decodedText: string) => {
    setFormData({ ...formData, serviceSerialNumber: decodedText });
    setShowScanner(false);
  };

  const handlePhotoCapture = async (base64Data: string) => {
    try {
      setIsUploading(true);
      setFormData((prev) => ({ ...prev, serialNumberImage: base64Data }));
      alert('Fotoğraf başarıyla eklendi!');
    } catch (error) {
      console.error('Fotoğraf kaydedilemedi:', error);
      alert(`Fotoğraf kaydedilemedi.\nDetay: ${(error as any).message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteImage = async () => {
    if (!formData.serialNumberImage) return;
    if (!confirm('Fotoğrafı silmek istediğinize emin misiniz?')) return;
    try {
      setFormData((prev) => ({ ...prev, serialNumberImage: '' }));
    } catch (error) {
      console.error('Silme başarısız:', error);
    }
  };

  const isEdit = !!task;

  // Responsive check for Mobile vs Desktop (PC)
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const renderSidebarItem = (id: TabType, label: string, icon: React.ReactNode) => (
    <button
      type="button"
      onClick={() => setActiveTab(id)}
      className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors border-l-4 ${activeTab === id
        ? 'bg-slate-800 border-blue-500 text-blue-400'
        : 'border-transparent text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
        }`}
    >
      {icon}
      {label}
    </button>
  );

  // =========================================================================
  // 1. DESKTOP MODAL (ORIGINAL CLASSIC SLATE DESIGN FOR PC / LOCALHOST)
  // =========================================================================
  if (!isMobile) {
    return (
    <>
      {showScanner && (
        <Scanner
          onScanSuccess={handleScanSuccess}
          onClose={() => setShowScanner(false)}
        />
      )}



      {showCamera && (
        <CameraCapture
          onCapture={handlePhotoCapture}
          onClose={() => setShowCamera(false)}
        />
      )}

      {showImagePreview && formData.serialNumberImage && (
        <div className="fixed inset-0 z-[210] bg-black/90 flex items-center justify-center p-4" onClick={() => setShowImagePreview(false)}>
          <button className="absolute top-4 right-4 text-white p-2 hover:bg-white/10 rounded-full">
            <X className="w-8 h-8" />
          </button>
          <img src={formData.serialNumberImage} alt="Seri No" className="max-w-full max-h-full object-contain rounded-lg" />
        </div>
      )}

      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden flex flex-col h-[90vh]">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-700 bg-slate-800">
            {/* Desktop Header */}
            <div className="hidden md:flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2 whitespace-nowrap">
                  {isEdit ? `Müşteri Düzenle (#${task.orderNumber})` : `Yeni Müşteri (#${nextOrderNumber})`}
                </h2>

                {/* Desktop Status Selector Removed */}
              </div>

              <div className="flex items-center gap-2">
                {isEdit && (formData.phone || formData.tenantPhone) && (
                  <button
                    type="button"
                    onClick={handleHeaderCall}
                    className="text-slate-400 hover:text-emerald-400 p-2 rounded-lg hover:bg-slate-700 transition-all"
                    title="Arama Yap"
                  >
                    <Phone className="w-5 h-5" />
                  </button>
                )}
                {isEdit && (
                  <button
                    onClick={handleShare}
                    className="text-slate-400 hover:text-blue-400 p-2 rounded-lg hover:bg-slate-700 transition-all"
                    title="Bilgileri Paylaş"
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
                )}
                <button onClick={onClose} className="text-slate-400 hover:text-white p-2 transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Mobile Header */}
            <div className="md:hidden flex items-center justify-between gap-3">
              <div className="flex-1">
                <select
                  value={activeTab}
                  onChange={(e) => setActiveTab(e.target.value as TabType)}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-base text-white focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                >
                  <option value="personal">👤 Kişi Bilgileri</option>
                  <option value="service">🔧 Servis ve Gaz Açım</option>
                  <option value="control">📋 Kontrol</option>
                </select>
              </div>

              <div className="flex items-center gap-1">
                <button onClick={onClose} className="text-slate-400 hover:text-white p-2 transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>

          {/* Body Container */}
          <div className="flex flex-1 overflow-hidden">

            {/* Left Sidebar */}
            <div className="w-64 bg-slate-900 border-r border-slate-700 flex flex-col py-4 hidden md:flex">
              <div className="px-4 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Bilgi Kartları</div>
              {renderSidebarItem('personal', 'Kişi Bilgileri', <User className="w-4 h-4" />)}
              {renderSidebarItem('service', 'Servis ve Gaz Açım', <Wrench className="w-4 h-4" />)}
              {renderSidebarItem('control', 'Kontrol Elemanı', <ClipboardCheck className="w-4 h-4" />)}
            </div>


            {/* Right Content */}
            <div className="flex-1 bg-slate-800/50 flex flex-col overflow-hidden">
              <form id="taskForm" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">

                {/* --- PERSONAL INFO TAB --- */}
                {activeTab === 'personal' && (
                  <div className="space-y-6 animate-fadeIn">
                    <div className="flex items-center gap-2 text-lg font-medium text-slate-200 border-b border-slate-700 pb-2">
                      <User className="w-5 h-5 text-blue-400" /> Kişi Bilgileri
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-400">Adı Soyadı</label>
                        <input required type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value.toLocaleUpperCase('tr-TR') })}
                          className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-400">İşin Tanımı</label>
                        <input type="text" value={formData.jobDescription || ''} onChange={(e) => setFormData({ ...formData, jobDescription: e.target.value.toLocaleUpperCase('tr-TR') })}
                          className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-400">Telefon</label>
                        <div className="flex gap-2">
                          <input type="text" inputMode="text" value={formData.phone || ''} onChange={(e) => setFormData({ ...formData, phone: e.target.value.toLocaleUpperCase('tr-TR') })}
                            className="flex-1 bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                          {formData.phone && (
                            <a href={`tel:${formData.phone}`} className="bg-green-600 hover:bg-green-500 text-white p-2.5 rounded-lg">
                              <PhoneCall className="w-5 h-5" />
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-400">İşi Yapan Usta</label>
                        <input type="text" value={formData.assignee || ''} onChange={(e) => setFormData({ ...formData, assignee: e.target.value.toLocaleUpperCase('tr-TR') })}
                          className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 p-3 bg-slate-700/30 rounded-lg border border-slate-600/50">
                      <input
                        type="checkbox"
                        checked={formData.isProjectDrawn || false}
                        onChange={(e) => setFormData({ ...formData, isProjectDrawn: e.target.checked })}
                        className="w-4 h-4 rounded border-slate-600 text-blue-600 focus:ring-blue-500 bg-slate-700 cursor-pointer"
                        id="projectDrawn"
                      />
                      <label htmlFor="projectDrawn" className="text-sm font-medium text-slate-300 select-none cursor-pointer flex-1">
                        Proje Çizildi
                      </label>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-400">Adres</label>
                      <div className="relative">
                        <input type="text" value={formData.address || ''} onChange={(e) => setFormData({ ...formData, address: e.target.value.toLocaleUpperCase('tr-TR') })}
                          className="w-full bg-slate-700/50 border border-slate-600 rounded-lg pl-4 pr-10 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                        <button
                          type="button"
                          onClick={() => setShowLocationModal(true)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-400 transition-colors p-1"
                          title="Konum Ekle"
                        >
                          <MapPin className="w-4 h-4" />
                        </button>
                      </div>

                      {/* İlçe ve İl */}
                      <div className="flex gap-4">
                        <div className="flex-1 space-y-2">
                          <label className="text-sm font-medium text-slate-400">İlçe</label>
                          <input type="text" value={formData.district || ''} onChange={(e) => setFormData({ ...formData, district: e.target.value.toLocaleUpperCase('tr-TR') })}
                            className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                        <div className="flex-1 space-y-2">
                          <label className="text-sm font-medium text-slate-400">İl</label>
                          <input type="text" value={formData.city || ''} onChange={(e) => setFormData({ ...formData, city: e.target.value.toLocaleUpperCase('tr-TR') })}
                            className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                      </div>
                      {/* Konum Koordinat Gösterimi */}
                      {formData.locationCoordinates && (
                        <div className="flex items-center gap-2 mt-1">
                          <a
                            href={formData.locationCoordinates}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-slate-800 text-blue-400 text-xs px-2 py-1 rounded flex items-center gap-1 hover:text-blue-300 transition-colors border border-slate-600/50"
                          >
                            <MapPin className="w-3 h-3" />
                            Konum Kaydı Var (Haritada Aç)
                          </a>
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, locationCoordinates: '' }))}
                            className="text-slate-500 hover:text-red-400"
                            title="Konumu Sil"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Kiracı Bilgileri */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-800/40 rounded-xl border border-slate-700/60">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Kiracı Adı Soyadı</label>
                        <input
                          type="text"
                          value={formData.tenantName || ''}
                          onChange={(e) => setFormData({ ...formData, tenantName: e.target.value.toLocaleUpperCase('tr-TR') })}
                          className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Kiracı Telefon</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            inputMode="text"
                            value={formData.tenantPhone || ''}
                            onChange={(e) => setFormData({ ...formData, tenantPhone: e.target.value.toLocaleUpperCase('tr-TR') })}
                            className="flex-1 bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                          {formData.tenantPhone && (
                            <a href={`tel:${formData.tenantPhone}`} className="bg-emerald-600 hover:bg-emerald-500 text-white p-2.5 rounded-lg flex items-center justify-center" title="Kiracıyı Ara">
                              <PhoneCall className="w-5 h-5" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-400">Genel Not</label>
                      <textarea rows={3} value={formData.generalNote || ''} onChange={(e) => setFormData({ ...formData, generalNote: e.target.value.toLocaleUpperCase('tr-TR') })}
                        className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                  </div>
                )}

                {/* --- SERVICE & GAS INFO TAB --- */}
                {activeTab === 'service' && (
                  <div className="space-y-6 animate-fadeIn">
                    <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                      <div className="flex items-center gap-2 text-lg font-medium text-slate-200">
                        <Wrench className="w-5 h-5 text-blue-400" /> Servis ve Gaz Açım Bilgileri
                      </div>
                    </div>

                    {/* Gaz Açım Bölümü */}
                    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-700/50 pb-2">
                        <div className="flex items-center gap-2 text-orange-400 font-medium">
                          <Flame className="w-4 h-4" /> Gaz Açım Detayları
                        </div>
                        {/* DemirDöküm Button */}

                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-400 flex items-center gap-2">
                            <Calendar className="w-4 h-4" /> Gaz Açım Tarihi
                          </label>
                          <input
                            type="date"
                            value={formData.gasOpeningDate || ''}
                            onChange={(e) => setFormData({ ...formData, gasOpeningDate: e.target.value })}
                            className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-orange-500 outline-none"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-400">Gaz Açım Notu</label>
                        <textarea
                          rows={2}
                          value={formData.gasNote || ''}
                          onChange={(e) => setFormData({ ...formData, gasNote: e.target.value.toLocaleUpperCase('tr-TR') })}
                          className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-orange-500 outline-none"
                        />
                      </div>
                    </div>

                    {/* Servis Bölümü */}
                    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 space-y-4">
                      <div className="flex items-center gap-2 text-blue-400 font-medium border-b border-slate-700/50 pb-2">
                        <Wrench className="w-4 h-4" /> Servis Detayları
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-400">Cihaz Seri Numarası / Barkod</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={formData.serviceSerialNumber || ''}
                            onChange={(e) => setFormData({ ...formData, serviceSerialNumber: e.target.value.toLocaleUpperCase('tr-TR') })}
                            className="flex-1 bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setShowScanner(true)}
                            className="bg-slate-700 hover:bg-slate-600 text-blue-400 px-3 py-2 rounded-lg transition-colors flex items-center gap-2 border border-slate-600"
                            title="Barkod Tara"
                          >
                            <ScanBarcode className="w-5 h-5" />
                            <span className="hidden sm:inline text-sm">Barkod</span>
                          </button>
                        </div>
                      </div>

                      {/* Fotoğraf Alanı */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-400">Seri No Fotoğrafı</label>
                        <div className="flex items-center gap-4">
                          {formData.serialNumberImage ? (
                            <div className="relative group">
                              <img
                                src={formData.serialNumberImage}
                                alt="Seri No"
                                className="w-24 h-24 object-cover rounded-lg border border-slate-600 cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => setShowImagePreview(true)}
                              />
                              <button
                                type="button"
                                onClick={handleDeleteImage}
                                className="absolute -top-2 -right-2 bg-red-600 text-white p-1 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="w-24 h-24 bg-slate-700/50 border border-slate-600 border-dashed rounded-lg flex items-center justify-center text-slate-500">
                              <ImageIcon className="w-8 h-8" />
                            </div>
                          )}

                          <div className="flex flex-col gap-2">
                            <button
                              type="button"
                              onClick={() => setShowCamera(true)}
                              disabled={isUploading}
                              className="bg-slate-700 hover:bg-slate-600 text-blue-400 px-4 py-2 rounded-lg transition-colors flex items-center gap-2 border border-slate-600"
                            >
                              {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
                              <span>{isUploading ? 'Yükleniyor...' : 'Fotoğraf Çek'}</span>
                            </button>
                            <p className="text-xs text-slate-500">
                              * Fotoğraflar otomatik sıkıştırılır.
                            </p>
                          </div>
                        </div>
                      </div>



                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-400">Servis Notu</label>
                        <textarea
                          rows={3}
                          value={formData.serviceNote || ''}
                          onChange={(e) => setFormData({ ...formData, serviceNote: e.target.value.toLocaleUpperCase('tr-TR') })}
                          className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* --- CONTROL STAFF INFO TAB --- */}
                {activeTab === 'control' && (
                  <div className="space-y-6 animate-fadeIn">
                    <div className="flex items-center gap-2 text-lg font-medium text-slate-200 border-b border-slate-700 pb-2">
                      <ClipboardCheck className="w-5 h-5 text-emerald-400" /> Kontrol Elemanı Bilgileri
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Eksik Var Butonu */}
                      <div
                        onClick={() => setFormData({ ...formData, checkStatus: formData.checkStatus === 'missing' ? null : 'missing' })}
                        className={`p-4 rounded-xl border flex flex-col items-center gap-2 cursor-pointer transition-all ${formData.checkStatus === 'missing'
                          ? 'bg-orange-600/20 border-orange-500 text-orange-400'
                          : 'bg-slate-700/30 border-slate-700 text-slate-400 hover:bg-slate-700/50'
                          }`}
                      >
                        <AlertTriangle className={`w-8 h-8 ${formData.checkStatus === 'missing' ? 'text-orange-500' : 'text-slate-500'}`} />
                        <span className="font-medium">Eksik Var</span>
                      </div>

                      {/* Eksik Yok Butonu */}
                      <div
                        onClick={() => setFormData({ ...formData, checkStatus: formData.checkStatus === 'clean' ? null : 'clean' })}
                        className={`p-4 rounded-xl border flex flex-col items-center gap-2 cursor-pointer transition-all ${formData.checkStatus === 'clean'
                          ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400'
                          : 'bg-slate-700/30 border-slate-700 text-slate-400 hover:bg-slate-700/50'
                          }`}
                      >
                        <CheckCircle2 className={`w-8 h-8 ${formData.checkStatus === 'clean' ? 'text-emerald-500' : 'text-slate-500'}`} />
                        <span className="font-medium">Eksik Yok</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-emerald-400 flex items-center gap-2">
                        <FileText className="w-4 h-4" /> Kontrol Ekibi Notu
                      </label>
                      <textarea
                        rows={6}
                        value={formData.teamNote || ''}
                        onChange={(e) => setFormData({ ...formData, teamNote: e.target.value })}
                        className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-emerald-500/50 outline-none"
                      />
                    </div>
                  </div>
                )}

              </form>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-700 bg-slate-800 flex flex-col md:flex-row justify-between items-center gap-3">

            {/* Durum Seçici (Özellikle mobil cihazlar için) */}
            <div className="w-full md:w-auto md:hidden mb-2 md:mb-0">
              <label className="block text-xs font-medium text-slate-400 mb-1">Durum (Kategori) Seç</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as TaskStatus })}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {Object.entries(StatusLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            {/* Delete Button (Only for Edit Mode and Admin) */}
            <div className="flex-1">
              {isEdit && onDelete && isAdmin && (
                isDeleting ? (
                  <div className="flex items-center gap-3 animate-fadeIn">
                    <span className="text-sm text-red-400 font-medium flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" />
                      Silmek istediğinize emin misiniz?
                    </span>
                    <button onClick={handleConfirmDelete} className="text-xs bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded">Evet</button>
                    <button onClick={handleCancelDelete} className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded">İptal</button>
                  </div>
                ) : (
                  <button onClick={handleDeleteClick} className="flex items-center gap-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3 py-2 rounded-lg transition-all text-sm">
                    <Trash2 className="w-4 h-4" /> Kaydı Sil
                  </button>
                )
              )}
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-700 transition-colors">Vazgeç</button>
              <button type="button" onClick={handleSubmit} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all">
                <Save className="w-4 h-4" /> {isEdit ? 'Kaydet' : 'Oluştur'}
              </button>
            </div>
          </div>
        </div >
      </div >
      <LocationPreviewModal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        onConfirm={(url) => {
          setFormData(prev => ({ ...prev, locationCoordinates: url }));
          setShowLocationModal(false);
        }}
      />
    </>
  );
}

  // =========================================================================
  // 2. MOBILE MODAL (MODERN WARM ORANGE TOUCH-OPTIMIZED ERP DESIGN)
  // =========================================================================
  return (
    <>
      {/* Sub Modals */}
      {showScanner && (
        <Scanner
          onScanSuccess={handleScanSuccess}
          onClose={() => setShowScanner(false)}
        />
      )}

      {showCamera && (
        <CameraCapture
          onCapture={handlePhotoCapture}
          onClose={() => setShowCamera(false)}
        />
      )}

      {showImagePreview && formData.serialNumberImage && (
        <div
          className="fixed inset-0 z-[220] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setShowImagePreview(false)}
        >
          <button className="absolute top-4 right-4 text-white p-2 hover:bg-white/10 rounded-full">
            <X className="w-8 h-8" />
          </button>
          <img
            src={formData.serialNumberImage}
            alt="Seri No"
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
          />
        </div>
      )}

      {/* MAIN MODAL / FULL-SCREEN CONTAINER */}
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 backdrop-blur-sm p-0 md:p-4">
        <div className="bg-white w-full h-full md:h-[92vh] md:max-w-5xl md:rounded-2xl shadow-2xl overflow-hidden flex flex-col font-sans">
          
          {/* ================================================================= */}
          {/* 1. TOP ORANGE ERP HEADER BAR */}
          {/* ================================================================= */}
          <div className="sticky top-0 z-30 px-3.5 py-2.5 bg-gradient-to-r from-[#e65100] via-[#f57c00] to-[#fb8c00] text-white flex items-center justify-between shadow-md shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 active:scale-95 flex items-center justify-center text-white transition-all shadow-xs shrink-0"
                title="Kapat"
              >
                <ChevronLeft className="w-6 h-6 stroke-[2.5] -ml-0.5" />
              </button>
              <div className="min-w-0">
                <h2 className="text-sm font-black tracking-tight text-white uppercase truncate">
                  {isEdit ? (formData.title || 'Kişi Kartı') : 'Yeni Müşteri Kartı'}
                </h2>
                <p className="text-[11px] text-orange-100 font-medium truncate">
                  Sıra #{formData.orderNumber || nextOrderNumber} {formData.district ? `• ${formData.district}` : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {(formData.phone || formData.tenantPhone) && (
                <button
                  type="button"
                  onClick={handleHeaderCall}
                  className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-all active:scale-95 shadow-xs"
                  title="Arama Yap"
                >
                  <Phone className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={handleShare}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-all active:scale-95 shadow-xs"
                title="Müşteri Bilgilerini Paylaş"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ================================================================= */}
          {/* 2. MAIN BODY: LEFT PANEL TABS + RIGHT FUNCTIONAL VIEW */}
          {/* ================================================================= */}
          <div className="flex flex-1 overflow-hidden min-h-0 bg-[#f8fafc]">
            
            {/* --- LEFT PANEL TABS (Vertical Sidebar) --- */}
            <div className="w-[84px] sm:w-24 md:w-56 bg-[#0f172a] text-slate-400 flex flex-col shrink-0 border-r border-slate-800 select-none">
              <div className="p-2.5 md:p-3 text-[10px] font-black uppercase tracking-widest text-slate-500 hidden md:block">
                İşlem Sekmeleri
              </div>

              <div className="flex-1 flex flex-col gap-1.5 p-1.5 md:p-2 overflow-y-auto">
                {/* 1. Kişi Bilgileri */}
                <button
                  type="button"
                  onClick={() => setActiveTab('personal')}
                  className={`w-full flex flex-col md:flex-row items-center gap-1.5 md:gap-3 p-2.5 md:px-3 md:py-3 rounded-xl text-center md:text-left transition-all ${
                    activeTab === 'personal'
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black shadow-md shadow-orange-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60 font-medium'
                  }`}
                >
                  <User className="w-5 h-5 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[11px] md:text-xs leading-tight block">Kişi Bilgileri</span>
                    <span className="text-[9px] opacity-75 hidden md:block font-normal truncate">
                      Adres, tel, usta
                    </span>
                  </div>
                </button>

                {/* 2. Kontrol Ekibi */}
                <button
                  type="button"
                  onClick={() => setActiveTab('control')}
                  className={`w-full flex flex-col md:flex-row items-center gap-1.5 md:gap-3 p-2.5 md:px-3 md:py-3 rounded-xl text-center md:text-left transition-all ${
                    activeTab === 'control'
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black shadow-md shadow-orange-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60 font-medium'
                  }`}
                >
                  <div className="relative">
                    <ClipboardCheck className="w-5 h-5 shrink-0" />
                    {formData.checkStatus === 'missing' && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-orange-500 rounded-full ring-2 ring-[#0f172a]" />
                    )}
                    {formData.checkStatus === 'clean' && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-[#0f172a]" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] md:text-xs leading-tight block">Kontrol Ekibi</span>
                    <span className="text-[9px] opacity-75 hidden md:block font-normal truncate">
                      Eksik durumu & not
                    </span>
                  </div>
                </button>

                {/* 3. Gaz Açım & Servis */}
                <button
                  type="button"
                  onClick={() => setActiveTab('service')}
                  className={`w-full flex flex-col md:flex-row items-center gap-1.5 md:gap-3 p-2.5 md:px-3 md:py-3 rounded-xl text-center md:text-left transition-all ${
                    activeTab === 'service'
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black shadow-md shadow-orange-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60 font-medium'
                  }`}
                >
                  <div className="relative">
                    <Flame className="w-5 h-5 shrink-0" />
                    {(formData.gasOpeningDate || formData.serviceSerialNumber) && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 rounded-full ring-2 ring-[#0f172a]" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] md:text-xs leading-tight block">Gaz Açım & Servis</span>
                    <span className="text-[9px] opacity-75 hidden md:block font-normal truncate">
                      Tarih, barkod, foto
                    </span>
                  </div>
                </button>
              </div>

              {/* Order Number Badge at bottom of left panel */}
              <div className="p-2.5 border-t border-slate-800 text-center shrink-0">
                <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider">Sıra No</span>
                <span className="text-xs font-mono font-black text-orange-400">
                  #{formData.orderNumber || nextOrderNumber}
                </span>
              </div>
            </div>

            {/* --- RIGHT FUNCTIONAL CONTENT PANE --- */}
            <div className="flex-1 bg-[#f8fafc] flex flex-col overflow-hidden min-h-0">
              <form
                id="taskForm"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSubmit();
                }}
                className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5"
              >
                {/* ========================================================= */}
                {/* TAB 1: KİŞİ BİLGİLERİ */}
                {/* ========================================================= */}
                {activeTab === 'personal' && (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                      <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                        <User className="w-4 h-4" />
                      </div>
                      <h3 className="font-black text-slate-800 text-sm md:text-base">Müşteri & Kişi Bilgileri</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Adı Soyadı */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                          Adı Soyadı <span className="text-red-500">*</span>
                        </label>
                        <input
                          required
                          type="text"
                          value={formData.title || ''}
                          onChange={(e) =>
                            setFormData({ ...formData, title: e.target.value.toLocaleUpperCase('tr-TR') })
                          }
                          className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 shadow-xs transition-all"
                        />
                      </div>

                      {/* Telefon */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                          Telefon Numarası
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            inputMode="text"
                            value={formData.phone || ''}
                            onChange={(e) =>
                              setFormData({ ...formData, phone: e.target.value.toLocaleUpperCase('tr-TR') })
                            }
                            className="flex-1 bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 shadow-xs transition-all"
                          />
                          {formData.phone && (
                            <a
                              href={`tel:${formData.phone}`}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white p-2.5 rounded-xl flex items-center justify-center active:scale-95 transition-all shadow-md shadow-emerald-600/20 shrink-0"
                              title="Hemen Ara"
                            >
                              <PhoneCall className="w-5 h-5" />
                            </a>
                          )}
                        </div>
                      </div>

                      {/* İşin Tanımı */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                          İşin Tanımı
                        </label>
                        <input
                          type="text"
                          value={formData.jobDescription || ''}
                          onChange={(e) =>
                            setFormData({ ...formData, jobDescription: e.target.value.toLocaleUpperCase('tr-TR') })
                          }
                          className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 shadow-xs transition-all"
                        />
                      </div>

                      {/* İşi Yapan Usta */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                          İşi Yapan Usta / Personel
                        </label>
                        <input
                          type="text"
                          value={formData.assignee || ''}
                          onChange={(e) =>
                            setFormData({ ...formData, assignee: e.target.value.toLocaleUpperCase('tr-TR') })
                          }
                          className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 shadow-xs transition-all"
                        />
                      </div>
                    </div>

                    {/* Proje Çizildi Onay Kutusu */}
                    <div
                      onClick={() => setFormData({ ...formData, isProjectDrawn: !formData.isProjectDrawn })}
                      className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer select-none transition-all ${
                        formData.isProjectDrawn
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                          formData.isProjectDrawn
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-slate-400 bg-white'
                        }`}
                      >
                        {formData.isProjectDrawn && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                      <span className="text-xs md:text-sm font-black">
                        Proje Çizildi (Bu müşterinin projesi hazır)
                      </span>
                    </div>

                    {/* Adres, İlçe, İl */}
                    <div className="space-y-2.5">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                        Adres ve Konum
                      </label>
                      <div className="relative">
                        <textarea
                          rows={3}
                          value={formData.address || ''}
                          onChange={(e) =>
                            setFormData({ ...formData, address: e.target.value.toLocaleUpperCase('tr-TR') })
                          }
                          className="w-full bg-white border border-slate-300 rounded-xl pl-3.5 pr-11 py-2.5 text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 shadow-xs resize-y min-h-[75px] transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowLocationModal(true)}
                          className="absolute right-2.5 top-3 text-orange-600 hover:text-orange-700 p-1.5 rounded-lg hover:bg-orange-50 transition-all"
                          title="Konum Koordinatı Ekle / Haritada Seç"
                        >
                          <MapPin className="w-5 h-5" />
                        </button>
                      </div>

                      {/* İlçe ve İl */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <input
                            type="text"
                            value={formData.district || ''}
                            onChange={(e) =>
                              setFormData({ ...formData, district: e.target.value.toLocaleUpperCase('tr-TR') })
                            }
                            className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 shadow-xs transition-all"
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            value={formData.city || ''}
                            onChange={(e) =>
                              setFormData({ ...formData, city: e.target.value.toLocaleUpperCase('tr-TR') })
                            }
                            className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 shadow-xs transition-all"
                          />
                        </div>
                      </div>

                      {/* Konum Kaydı Mevcutsa */}
                      {formData.locationCoordinates && (
                        <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 text-xs font-semibold">
                          <Navigation className="w-4 h-4 text-blue-600 shrink-0" />
                          <a
                            href={formData.locationCoordinates}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline flex-1 truncate hover:text-blue-900"
                          >
                            Konum Kayıtlı (Google Haritalar'da Aç)
                          </a>
                          <button
                            type="button"
                            onClick={() => setFormData((prev) => ({ ...prev, locationCoordinates: '' }))}
                            className="text-slate-400 hover:text-red-500 p-1"
                            title="Konumu Kaldır"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Kiracı Bilgileri */}
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                      <div className="flex items-center gap-1.5 text-xs font-black text-slate-700 uppercase tracking-wider">
                        <User className="w-4 h-4 text-orange-600" />
                        <span>Kiracı Bilgileri</span>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                          Kiracı Adı Soyadı
                        </label>
                        <input
                          type="text"
                          value={formData.tenantName || ''}
                          onChange={(e) =>
                            setFormData({ ...formData, tenantName: e.target.value.toLocaleUpperCase('tr-TR') })
                          }
                          className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 shadow-xs transition-all"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                          Kiracı Telefon
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            inputMode="text"
                            value={formData.tenantPhone || ''}
                            onChange={(e) =>
                              setFormData({ ...formData, tenantPhone: e.target.value.toLocaleUpperCase('tr-TR') })
                            }
                            className="flex-1 bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 shadow-xs transition-all"
                          />
                          {formData.tenantPhone && (
                            <a
                              href={`tel:${formData.tenantPhone}`}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white p-2.5 rounded-xl flex items-center justify-center active:scale-95 transition-all shadow-md shadow-emerald-600/20 shrink-0"
                              title="Kiracıyı Ara"
                            >
                              <PhoneCall className="w-5 h-5" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Genel Not */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                        Genel Notlar
                      </label>
                      <textarea
                        rows={3}
                        value={formData.generalNote || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, generalNote: e.target.value.toLocaleUpperCase('tr-TR') })
                        }
                        className="w-full bg-white border border-slate-300 rounded-xl p-3.5 text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 shadow-xs transition-all"
                      />
                    </div>
                  </div>
                )}

                {/* ========================================================= */}
                {/* TAB 2: KONTROL EKİBİ */}
                {/* ========================================================= */}
                {activeTab === 'control' && (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                        <ClipboardCheck className="w-4 h-4" />
                      </div>
                      <h3 className="font-black text-slate-800 text-sm md:text-base">Kontrol Ekibi İşlemleri</h3>
                    </div>

                    {/* Eksik Var / Eksik Yok Butonları */}
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      {/* Eksik Var */}
                      <button
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            checkStatus: formData.checkStatus === 'missing' ? null : 'missing'
                          })
                        }
                        className={`p-4 rounded-2xl border text-center flex flex-col items-center gap-2.5 transition-all active:scale-95 ${
                          formData.checkStatus === 'missing'
                            ? 'bg-orange-50 border-orange-500 text-orange-700 shadow-md shadow-orange-500/20 ring-2 ring-orange-400/40'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 shadow-xs'
                        }`}
                      >
                        <AlertTriangle
                          className={`w-9 h-9 ${
                            formData.checkStatus === 'missing' ? 'text-orange-500 animate-bounce' : 'text-slate-400'
                          }`}
                        />
                        <span className="font-black text-sm">Eksik Var</span>
                        <span className="text-[10px] text-slate-400">Tadilat / düzeltme gerekli</span>
                      </button>

                      {/* Eksik Yok */}
                      <button
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            checkStatus: formData.checkStatus === 'clean' ? null : 'clean'
                          })
                        }
                        className={`p-4 rounded-2xl border text-center flex flex-col items-center gap-2.5 transition-all active:scale-95 ${
                          formData.checkStatus === 'clean'
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-md shadow-emerald-500/20 ring-2 ring-emerald-400/40'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 shadow-xs'
                        }`}
                      >
                        <CheckCircle2
                          className={`w-9 h-9 ${
                            formData.checkStatus === 'clean' ? 'text-emerald-500' : 'text-slate-400'
                          }`}
                        />
                        <span className="font-black text-sm">Eksik Yok (Temiz)</span>
                        <span className="text-[10px] text-slate-400">Kontrol onaylandı</span>
                      </button>
                    </div>

                    {/* Kontrol Ekibi Notu */}
                    <div className="space-y-1.5 pt-2">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-emerald-600" />
                        Kontrol Ekibi Notu & Eksikler Listesi
                      </label>
                      <textarea
                        rows={6}
                        value={formData.teamNote || ''}
                        onChange={(e) => setFormData({ ...formData, teamNote: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-xl p-3.5 text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 shadow-xs transition-all"
                      />
                    </div>
                  </div>
                )}

                {/* ========================================================= */}
                {/* TAB 3: GAZ AÇIM & SERVİS */}
                {/* ========================================================= */}
                {activeTab === 'service' && (
                  <div className="space-y-5 animate-fadeIn">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                      <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                        <Flame className="w-4 h-4" />
                      </div>
                      <h3 className="font-black text-slate-800 text-sm md:text-base">Gaz Açım ve Servis Bilgileri</h3>
                    </div>

                    {/* 1. Gaz Açım Bölümü */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                      <div className="flex items-center gap-2 text-orange-600 font-black text-xs uppercase tracking-wider pb-1 border-b border-slate-100">
                        <Flame className="w-4 h-4" /> Gaz Açım Detayları
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-orange-500" /> Gaz Açım Tarihi
                        </label>
                        <input
                          type="date"
                          value={formData.gasOpeningDate || ''}
                          onChange={(e) => setFormData({ ...formData, gasOpeningDate: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 shadow-xs transition-all"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                          Gaz Açım Randevu / Eksik Notu
                        </label>
                        <textarea
                          rows={2}
                          value={formData.gasNote || ''}
                          onChange={(e) =>
                            setFormData({ ...formData, gasNote: e.target.value.toLocaleUpperCase('tr-TR') })
                          }
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 shadow-xs transition-all"
                        />
                      </div>
                    </div>

                    {/* 2. Servis & Cihaz Seri Numarası Bölümü */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                      <div className="flex items-center gap-2 text-blue-600 font-black text-xs uppercase tracking-wider pb-1 border-b border-slate-100">
                        <Wrench className="w-4 h-4" /> Servis & Cihaz Bilgileri
                      </div>

                      {/* Seri No / Barkod */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                          Cihaz Seri Numarası / Barkod
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={formData.serviceSerialNumber || ''}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                serviceSerialNumber: e.target.value.toLocaleUpperCase('tr-TR')
                              })
                            }
                            className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 shadow-xs transition-all"
                          />
                          <button
                            type="button"
                            onClick={() => setShowScanner(true)}
                            className="bg-blue-600 hover:bg-blue-500 active:scale-95 text-white px-3.5 py-2.5 rounded-xl transition-all shadow-md shadow-blue-600/20 flex items-center gap-1.5 text-xs font-bold shrink-0"
                            title="Barkod Oku"
                          >
                            <ScanBarcode className="w-4 h-4" />
                            <span className="hidden sm:inline">Tara</span>
                          </button>
                        </div>
                      </div>

                      {/* Seri No Fotoğrafı */}
                      <div className="space-y-1.5 pt-1">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                          Seri Numarası Fotoğrafı
                        </label>
                        <div className="flex items-center gap-3">
                          {formData.serialNumberImage ? (
                            <div className="relative group shrink-0">
                              <img
                                src={formData.serialNumberImage}
                                alt="Seri No"
                                className="w-20 h-20 object-cover rounded-xl border border-slate-300 cursor-pointer hover:opacity-85 transition-opacity shadow-xs"
                                onClick={() => setShowImagePreview(true)}
                              />
                              <button
                                type="button"
                                onClick={handleDeleteImage}
                                className="absolute -top-1.5 -right-1.5 bg-red-600 text-white p-1 rounded-full shadow-md hover:bg-red-700 active:scale-95 transition-all"
                                title="Fotoğrafı Kaldır"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="w-20 h-20 bg-slate-100 border border-slate-300 border-dashed rounded-xl flex items-center justify-center text-slate-400 shrink-0">
                              <ImageIcon className="w-7 h-7 stroke-[1.5]" />
                            </div>
                          )}

                          <div className="space-y-1">
                            <button
                              type="button"
                              onClick={() => setShowCamera(true)}
                              disabled={isUploading}
                              className="bg-slate-800 hover:bg-slate-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 active:scale-95"
                            >
                              {isUploading ? (
                                <Loader2 className="w-4 h-4 animate-spin text-orange-400" />
                              ) : (
                                <Camera className="w-4 h-4 text-orange-400" />
                              )}
                              <span>{isUploading ? 'Yükleniyor...' : 'Fotoğraf Çek'}</span>
                            </button>
                            <p className="text-[10px] text-slate-500">
                              * Fotoğraflar otomatik sıkıştırılarak cihaza kaydedilir.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Servis Notu */}
                      <div className="space-y-1.5 pt-1">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                          Servis Notu
                        </label>
                        <textarea
                          rows={2}
                          value={formData.serviceNote || ''}
                          onChange={(e) =>
                            setFormData({ ...formData, serviceNote: e.target.value.toLocaleUpperCase('tr-TR') })
                          }
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 shadow-xs transition-all"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </form>
            </div>
          </div>

          {/* ================================================================= */}
          {/* 4. FOOTER ACTION BAR */}
          {/* ================================================================= */}
          <div className="px-4 py-3 border-t border-slate-200 bg-white flex items-center justify-between gap-3 shrink-0">
            {/* Delete button (For Admins in edit mode) */}
            <div className="flex-1 min-w-0">
              {isEdit && onDelete && isAdmin && (
                isDeleting ? (
                  <div className="flex items-center gap-2 animate-fadeIn">
                    <span className="text-xs text-red-600 font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Silinsin mi?
                    </span>
                    <button
                      type="button"
                      onClick={handleConfirmDelete}
                      className="text-xs bg-red-600 hover:bg-red-700 text-white font-bold px-2.5 py-1 rounded-lg transition-colors shadow-xs"
                    >
                      Evet
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelDelete}
                      className="text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-2.5 py-1 rounded-lg transition-colors"
                    >
                      İptal
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleDeleteClick}
                    className="flex items-center gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 px-2.5 py-1.5 rounded-xl transition-all text-xs font-bold"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Kaydı Sil</span>
                  </button>
                )
              )}
            </div>

            {/* Cancel & Save Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-xs transition-colors"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={() => handleSubmit()}
                className="px-5 py-2 bg-gradient-to-r from-[#f57c00] to-[#e65100] hover:from-[#e65100] hover:to-[#d84315] text-white font-black text-xs rounded-xl shadow-md shadow-orange-500/30 active:scale-95 transition-all flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>{isEdit ? 'Değişiklikleri Kaydet' : 'Müşteriyi Kaydet'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* STATUS CHANGER MODAL / BOTTOM SHEET WITH GÖNDER BUTTON */}
      {showStatusModal && (
        <div
          className="fixed inset-0 z-[250] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn"
          onClick={() => setShowStatusModal(false)}
        >
          <div
            className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-scaleIn font-sans"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 py-3.5 bg-gradient-to-r from-[#e65100] via-[#f57c00] to-[#fb8c00] text-white flex items-center justify-between shadow-xs shrink-0">
              <div className="min-w-0">
                <h3 className="font-black text-sm uppercase tracking-tight">İş Durumunu Değiştir</h3>
                <p className="text-[11px] text-orange-100 font-medium truncate">
                  {formData.title || 'Müşteri'} • #{formData.orderNumber || nextOrderNumber}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowStatusModal(false)}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Status Options */}
            <div className="p-4 overflow-y-auto space-y-2 flex-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Aktarılacak Aşamayı Seçin:
              </span>
              {Object.entries(StatusLabels).map(([key, label]) => {
                const isSelected = selectedStatus === key;
                return (
                  <div
                    key={key}
                    onClick={() => {
                      const newStatus = key as TaskStatus;
                      setSelectedStatus(newStatus);
                      setFormData((prev) => {
                        const next = { ...prev, status: newStatus };
                        if (newStatus === TaskStatus.GAS_OPENED && !next.gasOpeningDate) {
                          next.gasOpeningDate = new Date().toISOString().split('T')[0];
                        }
                        return next;
                      });
                    }}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all active:scale-[0.99] ${
                      isSelected
                        ? 'bg-orange-50 border-orange-500 shadow-xs ring-2 ring-orange-500/20'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'border-orange-500 bg-orange-500 text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <span
                        className={`text-xs font-bold truncate ${
                          isSelected ? 'text-orange-950 font-black' : 'text-slate-700'
                        }`}
                      >
                        {label}
                      </span>
                    </div>

                    {task?.status === key && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 shrink-0">
                        Mevcut
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer with GÖNDER button */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setShowStatusModal(false)}
                className="flex-1 py-2.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl transition-all"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowStatusModal(false);
                  handleSendStatus();
                }}
                className="flex-1 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 active:scale-95 text-white font-black text-xs rounded-xl shadow-md shadow-orange-500/30 flex items-center justify-center gap-1.5 transition-all"
              >
                <Send className="w-4 h-4" />
                <span>Gönder</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Location Modal */}
      <LocationPreviewModal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        onConfirm={(url) => {
          setFormData((prev) => ({ ...prev, locationCoordinates: url }));
          setShowLocationModal(false);
        }}
      />

      {/* Phone Selector Modal */}
      {showPhoneSelector && (
        <div
          className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 animate-in fade-in duration-150"
          onClick={() => setShowPhoneSelector(false)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-2xl p-4 shadow-2xl space-y-3 animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-800">Arama Yap</h3>
                <p className="text-[11px] text-slate-500 font-medium truncate max-w-[240px]">
                  {formData.title || 'Müşteri'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPhoneSelector(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:text-slate-700 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              {formData.phone && (
                <a
                  href={`tel:${formData.phone}`}
                  onClick={() => setShowPhoneSelector(false)}
                  className="flex items-center justify-between p-3 rounded-xl bg-orange-50 hover:bg-orange-100/70 border border-orange-200 transition-all active:scale-[0.98]"
                >
                  <div className="min-w-0">
                    <span className="text-[10px] font-black uppercase text-orange-700 tracking-wider block">
                      🏠 Ev Sahibi
                    </span>
                    <span className="text-xs font-bold text-slate-800 block truncate">
                      {formData.title || 'Ev Sahibi'}
                    </span>
                    <span className="text-xs font-semibold text-orange-950 font-mono">
                      {formData.phone}
                    </span>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-xs shrink-0">
                    <Phone className="w-4 h-4" />
                  </div>
                </a>
              )}

              {formData.tenantPhone && (
                <a
                  href={`tel:${formData.tenantPhone}`}
                  onClick={() => setShowPhoneSelector(false)}
                  className="flex items-center justify-between p-3 rounded-xl bg-blue-50 hover:bg-blue-100/70 border border-blue-200 transition-all active:scale-[0.98]"
                >
                  <div className="min-w-0">
                    <span className="text-[10px] font-black uppercase text-blue-700 tracking-wider block">
                      🔑 Kiracı
                    </span>
                    <span className="text-xs font-bold text-slate-800 block truncate">
                      {formData.tenantName || 'Kiracı'}
                    </span>
                    <span className="text-xs font-semibold text-blue-950 font-mono">
                      {formData.tenantPhone}
                    </span>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
                    <Phone className="w-4 h-4" />
                  </div>
                </a>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowPhoneSelector(false)}
              className="w-full py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Vazgeç
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default TaskModal;