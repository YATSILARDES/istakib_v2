export enum TaskStatus {
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
  title: string;
  jobDescription?: string; // İşin Tanımı (Örn: Mutfak Dolabı)
  description?: string;
  status: TaskStatus;
  assignee?: string; // Görünen İsim
  assigneeEmail?: string; // Yetkilendirme için E-posta
  // New Customer Details
  date?: string;
  address?: string;
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
  isCheckVerified?: boolean;
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
  [TaskStatus.TO_CHECK]: 'Kontrolü Yapılacak İşler',
  [TaskStatus.CHECK_COMPLETED]: 'Kontrolü Yapılan İşler',
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
  email: string;      // Login Email ve Benzersiz ID
  name: string;       // Personel Adı (Görev filtreleme için)
  allowedColumns: TaskStatus[];
  role: 'admin' | 'staff';
  canAccessRoutineTasks?: boolean; // Eksikler Havuzu
  canAccessAssignment?: boolean;   // Görev Dağıtımı
  canAddCustomers?: boolean;       // Müşteri Ekle
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
  assignedAt?: any; // Atanma Zamanı (Sıralama için)
}