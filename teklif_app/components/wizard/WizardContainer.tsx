import React, { useState } from 'react';
import { SurveyData, Room, Appliance, PricingItem, PricingSubItem, ExtraOffer, Radiator, ApplianceDefinition, ColumnData } from '../../types';
import { ProjectInfoForm } from '../ProjectInfoForm';
import { RoomList } from '../RoomList';
import { ApplianceList } from '../ApplianceList';
import { PricingForm } from '../PricingForm';
import { ColumnCalculation } from '../ColumnCalculation';
import { Summary } from '../Summary';
import { ChevronRight, ChevronLeft, CheckCircle } from 'lucide-react';

interface WizardContainerProps {
    surveyData: SurveyData;
    // Handlers
    onProjectInfoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onHeaderImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;

    // Room Handlers
    onAddRoom: () => void;
    onUpdateRoom: (roomId: number, field: keyof Room, value: string | number | boolean | Radiator[]) => void;
    onDeleteRoom: (roomId: number) => void;
    radiatorMeterPrice: number;
    radiatorValvePrice: number;
    onRadiatorPriceChange: (field: 'radiatorMeterPrice' | 'radiatorValvePrice', value: number) => void;
    radiatorModels: string[];
    onAddRadiatorModel: (name: string) => void;
    onDeleteRadiatorModel: (name: string) => void;

    // Appliance Handlers
    onAddAppliance: (type: string, price?: number) => void;
    onUpdateAppliance: (id: string, updates: Partial<Appliance>) => void;
    onDeleteAppliance: (index: number) => void;
    onAddApplianceSubItem: (applianceId: string, name: string) => void;
    onUpdateApplianceSubItem: (applianceId: string, subId: string, updates: Partial<PricingSubItem>) => void;
    onDeleteApplianceSubItem: (applianceId: string, subId: string) => void;
    onAddExtraOffer: (name: string, price: number) => void;
    onDeleteExtraOffer: (id: string) => void;
    applianceDefinitions: ApplianceDefinition[];
    applianceModelMap: Record<string, string[]>;
    onAddDefinition: (name?: string, consumptionKw?: number) => void;
    onUpdateDefinition: (oldType: string, newName: string) => void;
    onDeleteDefinition: (type: string) => void;
    onAddModel: (type: string, modelName?: string) => void;
    onUpdateModel: (type: string, oldModel: string, newModel: string) => void;
    onDeleteModel: (type: string, model: string) => void;

    // Pricing Handlers
    onPricingItemChange: (itemId: number, newValues: Partial<PricingItem>) => void;
    onAddPricingItem: (name: string) => void;
    onDeletePricingItem: (id: number) => void;
    onAddOption: (itemId: number, optionName: string) => void;
    onDeleteOption: (itemId: number, optionName: string) => void;
    onAddSubItem: (itemId: number, subItemName: string) => void;
    onDeleteSubItem: (itemId: number, subItemId: string) => void;

    // Column Handlers
    onColumnChange: (data: ColumnData) => void;

    // Summary Handlers
    totalConsumptionKw: number;
    costAnalysis: {
        baseRawCost: number;
        baseFinalPrice: number;
        columnFinalPrice: number;
        grandTotal: number;
    };
    onFinalBidChange: (value: number) => void;
    onAgreedPriceChange: (value: number) => void;
    onSaveTemplate: () => void;
    onResetTemplate: (e: React.MouseEvent) => void;
    onDownloadProject: () => void;
    onLoadProject: (e: React.ChangeEvent<HTMLInputElement>) => void;

    // Global Prices & Suggestions
    globalPrices: Record<string, number>;
    suggestions: string[];
    onFinish: () => void;
}

const STEPS = [
    { id: 0, title: 'Müşteri Bilgileri', description: 'Müşteri ve proje detayları' },
    { id: 1, title: 'Isıtma Tesisatı', description: 'Tesisat, işçilik ve ekstralar' },
    { id: 2, title: 'Odalar & Radyatörler', description: 'Oda ölçüleri ve petek seçimleri' },
    { id: 3, title: 'Cihazlar', description: 'Kombi, ocak ve diğer cihazlar' },
    { id: 4, title: 'Kolon Tesisatı', description: 'Kolon hesabı ve detayları' },
    { id: 5, title: 'Özet & Sonuç', description: 'Teklif özeti ve işlemler' },
];

export const WizardContainer: React.FC<WizardContainerProps> = (props) => {
    const [currentStep, setCurrentStep] = useState(0);

    const handleNext = () => {
        if (currentStep < STEPS.length - 1) {
            setCurrentStep(prev => prev + 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            props.onFinish();
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const renderStepContent = () => {
        switch (currentStep) {
            case 0:
                return (
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <h2 className="text-xl font-bold text-slate-800 mb-4">Müşteri Bilgileri</h2>
                        <ProjectInfoForm
                            surveyData={props.surveyData}
                            onChange={props.onProjectInfoChange}
                            onHeaderImageChange={props.onHeaderImageChange}
                        />
                    </div>
                );
            case 1:
                return (
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <h2 className="text-xl font-bold text-slate-800 mb-4">Isıtma Tesisatı</h2>
                        <PricingForm
                            items={props.surveyData.pricingItems}
                            onItemChange={props.onPricingItemChange}
                            onAddItem={props.onAddPricingItem}
                            onDeleteItem={props.onDeletePricingItem}
                            onAddOption={props.onAddOption}
                            onDeleteOption={props.onDeleteOption}
                            onAddSubItem={props.onAddSubItem}
                            onDeleteSubItem={props.onDeleteSubItem}
                            suggestions={props.suggestions}
                            globalPrices={props.globalPrices}
                        />
                    </div>
                );
            case 2:
                return (
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <h2 className="text-xl font-bold text-slate-800 mb-4">Odalar ve Radyatör Seçimi</h2>
                        <RoomList
                            rooms={props.surveyData.rooms}
                            onAddRoom={props.onAddRoom}
                            onUpdateRoom={props.onUpdateRoom}
                            onDeleteRoom={props.onDeleteRoom}
                            radiatorMeterPrice={props.radiatorMeterPrice}
                            radiatorValvePrice={props.radiatorValvePrice}
                            onPriceChange={props.onRadiatorPriceChange}
                            radiatorModels={props.radiatorModels}
                            onAddRadiatorModel={props.onAddRadiatorModel}
                            onDeleteRadiatorModel={props.onDeleteRadiatorModel}
                            suggestions={props.suggestions}
                            globalPrices={props.globalPrices}
                        />
                    </div>
                );
            case 3:
                return (
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <h2 className="text-xl font-bold text-slate-800 mb-4">Cihaz Seçimi</h2>
                        <ApplianceList
                            appliances={props.surveyData.appliances}
                            extraOffers={props.surveyData.extraOffers}
                            onAddAppliance={props.onAddAppliance}
                            onUpdateAppliance={props.onUpdateAppliance}
                            onDeleteAppliance={props.onDeleteAppliance}
                            handleAddApplianceSubItem={props.onAddApplianceSubItem}
                            handleUpdateApplianceSubItem={props.onUpdateApplianceSubItem}
                            handleDeleteApplianceSubItem={props.onDeleteApplianceSubItem}
                            onAddExtraOffer={props.onAddExtraOffer}
                            onDeleteExtraOffer={props.onDeleteExtraOffer}
                            globalPrices={props.globalPrices}
                            applianceDefinitions={props.applianceDefinitions}
                            applianceModelMap={props.applianceModelMap}
                            onAddDefinition={props.onAddDefinition}
                            onUpdateDefinition={props.onUpdateDefinition}
                            onDeleteDefinition={props.onDeleteDefinition}
                            onAddModel={props.onAddModel}
                            onUpdateModel={props.onUpdateModel}
                            onDeleteModel={props.onDeleteModel}
                            suggestions={props.suggestions}
                        />
                    </div>
                );
            case 4:
                return (
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <h2 className="text-xl font-bold text-slate-800 mb-4">Kolon Tesisatı Hesabı</h2>
                        <ColumnCalculation
                            globalPrices={props.globalPrices}
                            data={props.surveyData.columnData}
                            onChange={props.onColumnChange}
                        />
                    </div>
                );
            case 5:
                return (
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <h2 className="text-xl font-bold text-slate-800 mb-4">Teklif Özeti</h2>
                        <Summary
                            totalConsumptionKw={props.totalConsumptionKw}
                            calculatedRawCost={props.costAnalysis.baseRawCost}
                            effectiveSellingPrice={props.costAnalysis.baseFinalPrice}
                            surveyData={props.surveyData}
                            onFinalBidChange={props.onFinalBidChange}
                            onAgreedPriceChange={props.onAgreedPriceChange}
                            onSaveTemplate={props.onSaveTemplate}
                            onResetTemplate={props.onResetTemplate}
                            onDownloadProject={props.onDownloadProject}
                            onLoadProject={props.onLoadProject}
                        />
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            {/* Stepper Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-2xl font-bold text-slate-800">Teklif Sihirbazı</h1>
                    <span className="text-sm text-slate-500">Adım {currentStep + 1} / {STEPS.length}</span>
                </div>
                <div className="relative">
                    <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-slate-200">
                        <div
                            style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
                            className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-600 transition-all duration-500"
                        ></div>
                    </div>
                    <div className="hidden sm:flex justify-between text-xs text-slate-500 px-1">
                        {STEPS.map((step, index) => (
                            <div key={step.id} className={`flex flex-col items-center ${index <= currentStep ? 'text-blue-600 font-medium' : ''}`}>
                                <span>{step.title}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Step Content */}
            <div className="mb-8 min-h-[400px]">
                {renderStepContent()}
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200 sticky bottom-4 z-10">
                <button
                    onClick={handleBack}
                    disabled={currentStep === 0}
                    className={`flex items-center px-6 py-3 rounded-lg font-medium transition-colors ${currentStep === 0
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                        }`}
                >
                    <ChevronLeft className="w-5 h-5 mr-2" />
                    Geri
                </button>

                <div className="text-center hidden sm:block">
                    <h3 className="font-medium text-slate-800">{STEPS[currentStep].title}</h3>
                    <p className="text-sm text-slate-500">{STEPS[currentStep].description}</p>
                </div>

                <button
                    onClick={handleNext}
                    className={`flex items-center px-6 py-3 rounded-lg font-medium transition-colors ${currentStep === STEPS.length - 1
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                >
                    {currentStep === STEPS.length - 1 ? (
                        <span className="flex items-center">Tamamlandı <CheckCircle className="w-5 h-5 ml-2" /></span>
                    ) : (
                        <span className="flex items-center">İleri <ChevronRight className="w-5 h-5 ml-2" /></span>
                    )}
                </button>
            </div>
        </div>
    );
};
