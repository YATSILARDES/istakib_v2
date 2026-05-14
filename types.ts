import { Timestamp } from 'firebase/firestore';

export enum TaskStatus {
  PROJECT_TO_BE_DRAWN = 'PROJECT_TO_BE_DRAWN',
  TO_CHECK = 'TO_CHECK',
  CHECK_COMPLETED = 'CHECK_COMPLETED',
  DEPOSIT_PAID = 'DEPOSIT_PAID',
  GAS_OPENED = 'GAS_OPENED',
  SERVICE_DIRECTED = 'SERVICE_DIRECTED'
}

export interface StaffMember {
  name: string;
  email: string;
}

export interface Task {
  id: string;
  orderNumber: number; // Sıra Numarası
  dailyOrder?: number; // Günlük Sıralama (Drag and Drop)
  title: string;
  jobDescription?: string; // İşin Tanımı (Örn: Mutfak Dolabı)
  description?: string;
  status: TaskStatus;
  assignee?: string; // Görünen İsim
  assigneeEmail?: string; // Yetkilendirme için E-posta
  // New Customer Details
  date?: string;
  address?: string;
  locationCoordinates?: string; // Konum Koordinatları (Lat, Lng)
  district?: string; // İlçe (Yeni: Gruplama için)
  city?: string; // İl
  phone?: string;
  generalNote?: string; // Kişi Bilgileri içindeki not

  // Check Info (Kontrol Elemanı Bilgileri)
  teamNote?: string; // Kontrol Ekibi Notu
  checkStatus?: 'missing' | 'clean' | null; // Kontrol Durumu (Eksik Var / Eksik Yok)

  // Gas Opening Info (Gaz Açım Bilgileri)
  gasOpeningDate?: string;
  gasNote?: string;

  // Service Info (Servis Bilgileri)
  serviceSerialNumber?: string;
  serialNumberImage?: string; // Base64 formatında fotoğraf verisi
  serviceNote?: string; // Seri No Fotoğraf URL

  createdBy?: string;
  lastUpdatedBy?: string;
  createdAt?: any;
  updatedAt?: any; // Son Güncelleme
  scheduledDate?: any; // Atanan Tarih (Firestore Timestamp)
  isCheckVerified?: boolean;
  isProjectDrawn?: boolean; // Proje Çizildi Durumu
  isWaiting?: boolean; // Beklemede Durumu (Mavi kart için)
}

export interface AudioConfig {
  sampleRate: number;
}

export interface ConnectionState {
  isConnected: boolean;
  isSpeaking: boolean;
  error: string | null;
}

// Helper for type-safe keys
export const StatusLabels: Record<TaskStatus, string> = {
  [TaskStatus.PROJECT_TO_BE_DRAWN]: 'Projesi Çizilecek İşler',
  [TaskStatus.TO_CHECK]: 'Kontrolü Yapılacak İşler',
  [TaskStatus.CHECK_COMPLETED]: 'Kontrol Edildi',
  [TaskStatus.DEPOSIT_PAID]: 'Depozito Yatırıldı',
  [TaskStatus.GAS_OPENED]: 'Gaz Açıldı',
  [TaskStatus.SERVICE_DIRECTED]: 'Servis Yönlendirildi'
};

export interface AppSettings {
  notifications: Partial<Record<TaskStatus, string[]>>;
  pinnedStaff?: string[]; // Geriye dönük uyumluluk (sadece isimler)
  staffList?: StaffMember[]; // İsim ve Email eşleşmesi
}

export interface UserPermission {
  email: string;
  name: string; // Kullanıcının adı soyadı
  allowedColumns: TaskStatus[];
  role: 'admin' | 'staff' | 'manager'; // manager tüm yetkilere sahip olacak
  canAccessRoutineTasks?: boolean; // Eksikler havuzuna erişim
  canAccessAssignment?: boolean;   // Görev dağıtımı yapabilme
  canAddCustomers?: boolean;       // Yeni müşteri ekleyebilme
  isEngineer?: boolean;            // Mühendis (Teklif Klasörü) yetkisi
  canAccessQuotations?: boolean;   // Teklif Yönetimi erişimi
  canAccessStock?: boolean;        // Stok Listesi erişimi
}

export interface RoutineTask {
  id: string;
  content: string;
  isCompleted: boolean;
  assignee?: string; // Görünen İsim
  assigneeEmail?: string; // Yetkilendirme için E-posta
  createdAt: any;
  createdBy?: string;
  customerName?: string; // Müşteri Adı Soyadı
  phoneNumber?: string; // Telefon Numarası
  address?: string; // Adres
  locationCoordinates?: string; // Konum Koordinatları
  assignedAt?: any; // Atanma Zamanı (Sıralama için)
  district?: string; // İlçe
  city?: string; // İl
  scheduledDate?: any; // Yeni: Planlanan Tarih
  completedAt?: any; // Tamamlanma Zamanı
  dailyOrder?: number; // Günlük Sıralama
}

export interface StaffLocation {
  userId: string;
  userName: string;
  latitude: number;
  longitude: number;
  timestamp: any; // Firestore Timestamp
  status: 'active' | 'inactive';
}

export interface Quotation {
  id: string;
  customerName: string;
  totalAmount: number;
  authorEmail: string;
  authorName: string;
  createdAt: any;
  updatedAt?: any;
  status: 'draft' | 'sent' | 'approved' | 'rejected';
  data?: any;
  fileName?: string; // İndirilen JSON dosya adı
}

export interface BarcodeData {
  originalCode: string;
  year: number;
  week: number;
  productionDate: any;
  expiryDate: any;
  status: 'safe' | 'warning' | 'expired' | 'invalid';
  monthsLeft: number;
  scannedAt?: any;
}

export interface OutboundBarcodeData extends BarcodeData {
  customerName: string;
  outputDate: any; // Çıkış Tarihi
}

export interface StockCombi {
  id: string;
  brand: string;
  model: string;
  capacity: string;
  quantity: number;
  barcodes?: BarcodeData[];
  outboundBarcodes?: OutboundBarcodeData[]; // Çıkış Yapılan Barkodlar
  createdAt?: any;
  updatedAt?: any;
}

export interface StockRadiator {
  id: string;
  brand: string;
  height: string; // Yükseklik (örn: 600)
  length: string; // Uzunluk (örn: 1000)
  quantity: number;
  createdAt?: any;
  updatedAt?: any;
}

export interface StockGenericItem {
  id: string;
  brand: string;
  model: string;
  feature: string; // Generic field for Capacity, KW, BTU, Liters etc.
  quantity: number;
  barcodes?: BarcodeData[];
  outboundBarcodes?: OutboundBarcodeData[];
  createdAt?: any;
  updatedAt?: any;
}