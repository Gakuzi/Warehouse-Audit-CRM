
import React, { useState, useRef } from 'react';
import Modal from './ui/Modal';
import AudioRecorder from './AudioRecorder';
import { FaFileUpload, FaCamera, FaVideo, FaMicrophone } from 'react-icons/fa';

interface AddAttachmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onFilesConfirm: (files: File[]) => void;
}

type Step = 'select' | 'audio';

const AddAttachmentModal: React.FC<AddAttachmentModalProps> = ({ isOpen, onClose, onFilesConfirm }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const videoInputRef = useRef<HTMLInputElement>(null);
    const [step, setStep] = useState<Step>('select');

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            onFilesConfirm(Array.from(event.target.files));
        }
    };

    const handleAudioSave = (blob: Blob) => {
        const audioFile = new File([blob], `audio-recording-${Date.now()}.webm`, { type: blob.type });
        onFilesConfirm([audioFile]);
        setStep('select'); // Вернуться к выбору после сохранения
    };

    const SelectionButton: React.FC<{ icon: React.ReactNode, text: string, onClick: () => void }> = ({ icon, text, onClick }) => (
         <button onClick={onClick} className="flex flex-col items-center justify-center p-6 bg-gray-50 hover:bg-blue-100 rounded-lg text-center transition-colors w-full">
            {icon}
            <span className="font-semibold mt-2">{text}</span>
        </button>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Прикрепить к комментарию">
            {step === 'select' && (
                <div className="grid grid-cols-2 gap-4">
                    <input type="file" multiple ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                    <input type="file" accept="image/*" capture="environment" ref={imageInputRef} onChange={handleFileChange} className="hidden" />
                    <input type="file" accept="video/*" capture="environment" ref={videoInputRef} onChange={handleFileChange} className="hidden" />
                    
                    <SelectionButton
                        icon={<FaFileUpload size={24} className="text-blue-600" />}
                        text="Файл с диска"
                        onClick={() => fileInputRef.current?.click()}
                    />
                    <SelectionButton
                        icon={<FaCamera size={24} className="text-gray-600" />}
                        text="Сделать фото"
                        onClick={() => imageInputRef.current?.click()}
                    />
                     <SelectionButton
                        icon={<FaVideo size={24} className="text-orange-600" />}
                        text="Записать видео"
                        onClick={() => videoInputRef.current?.click()}
                    />
                    <SelectionButton
                        icon={<FaMicrophone size={24} className="text-red-600" />}
                        text="Записать аудио"
                        onClick={() => setStep('audio')}
                    />
                </div>
            )}
            {step === 'audio' && (
                <div>
                    <AudioRecorder onSave={handleAudioSave} />
                    <button type="button" onClick={() => setStep('select')} className="mt-4 w-full py-2 px-4 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Назад</button>
                </div>
            )}
        </Modal>
    );
};

export default AddAttachmentModal;
