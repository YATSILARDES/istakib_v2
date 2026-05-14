import React from 'react';
import { SurveyData } from '../types';

interface ProjectInfoFormProps {
    surveyData: SurveyData;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onHeaderImageChange?: (e: React.ChangeEvent<HTMLInputElement>) => void; // Keeping prop optional to avoid breaking parent usage immediately, but removing usage
}

const InfoInput: React.FC<{ label: string, name: string, type: string, value: string | number, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, placeholder?: string }> = ({ label, name, type, value, onChange, placeholder }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-slate-600 mb-1">{label}</label>
        <input
            type={type}
            id={name}
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
        />
    </div>
);

export const ProjectInfoForm: React.FC<ProjectInfoFormProps> = ({ surveyData, onChange }) => {
    return (
        <div className="bg-white p-6 rounded-lg shadow-md print-container">
            <h2 className="text-xl font-bold text-slate-800 border-b pb-3 mb-4">Proje Bilgileri</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoInput label="Müşteri Adı Soyadı" name="customerName" type="text" value={surveyData.customerName} onChange={onChange} placeholder="Örn: Ahmet Yılmaz" />
                <InfoInput label="Keşif Tarihi" name="surveyDate" type="date" value={surveyData.surveyDate} onChange={onChange} />
                <div className="md:col-span-2">
                    <InfoInput label="Adres" name="address" type="text" value={surveyData.address} onChange={onChange} placeholder="Örn: Cumhuriyet Mah. Atatürk Cad. No:1 D:5" />
                </div>
                <InfoInput label="Teknisyen Adı" name="technicianName" type="text" value={surveyData.technicianName} onChange={onChange} placeholder="Örn: Mehmet Öztürk" />
                <div>
                    <label htmlFor="phoneNumber" className="block text-sm font-medium text-slate-600 mb-1">Telefon Numarası</label>
                    <input
                        type="text"
                        id="phoneNumber"
                        name="phoneNumber"
                        value={surveyData.phoneNumber}
                        onChange={onChange}
                        placeholder="05XX XXX XX XX"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    />
                </div>


            </div>
        </div>
    );
};