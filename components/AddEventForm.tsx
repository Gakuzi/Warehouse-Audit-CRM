
import React, { useState, useEffect, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';
import { Spinner } from './ui/Spinner';
import { Event } from '../types';
import { FaTimes, FaPaperclip } from 'react-icons/fa';
import AddAttachmentModal from './AddAttachmentModal';

interface AddEventFormProps {
  user: User;
  context: { weekId: string; taskId: string; projectId: string; };
  quotedEvent: Event | null;
  onClearQuote: () => void;
  onNewEvent: (event: Event) => void;
}

const AddEventForm: React.FC<AddEventFormProps> = ({ user, context, quotedEvent, onClearQuote, onNewEvent }) => {
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [filesToAttach, setFilesToAttach] = useState<File[]>([]);
    const [isAttachmentModalOpen, setIsAttachmentModalOpen] = useState(false);

    useEffect(() => {
        if(quotedEvent) {
            textareaRef.current?.focus();
        }
    }, [quotedEvent]);

    const uploadFiles = async (files: File[]) => {
        if (!files || files.length === 0) return [];
        
        const uploadPromises = files.map(async file => {
            const filePath = `${user.id}/${context.taskId}/${Date.now()}-${file.name}`;
            const { error: uploadError } = await supabase.storage.from('audit-files').upload(filePath, file);
            if (uploadError) throw uploadError;
            
            const { data } = supabase.storage.from('audit-files').getPublicUrl(filePath);
            return { name: file.name, url: data.publicUrl, type: file.type };
        });
    
        return Promise.all(uploadPromises);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim() && filesToAttach.length === 0) return;

        setLoading(true);
        try {
            const uploadedFiles = await uploadFiles(filesToAttach);
            const eventData = {
                project_id: context.projectId,
                week_id: context.weekId,
                task_id: context.taskId,
                user_id: user.id,
                author_email: user.email,
                type: 'comment' as const,
                content: content.trim(),
                parent_event_id: quotedEvent ? quotedEvent.id : null,
                data: uploadedFiles.length > 0 ? { file_urls: uploadedFiles } : {},
            };
    
            const { data, error } = await supabase.from('events').insert(eventData).select().single();
    
            if (error) {
                throw error;
            } else if (data) {
                onNewEvent(data as Event);
                setContent('');
                setFilesToAttach([]);
                onClearQuote();
            }
        } catch(err: any) {
            alert('Ошибка добавления комментария: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveFile = (indexToRemove: number) => {
        setFilesToAttach(currentFiles => currentFiles.filter((_, index) => index !== indexToRemove));
    };

    return (
        <div>
             {quotedEvent && (
                <div className="p-2 mb-2 bg-gray-100 rounded-md text-sm relative">
                    <p className="font-semibold text-gray-700">Ответ на сообщение от {quotedEvent.author_email}:</p>
                    <p className="text-gray-600 truncate">{quotedEvent.content}</p>
                    <button onClick={onClearQuote} className="absolute top-2 right-2 text-gray-500 hover:text-gray-800">
                        <FaTimes size={12}/>
                    </button>
                </div>
            )}
            <form onSubmit={handleSubmit}>
                <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    placeholder="Напишите комментарий..."
                    disabled={loading}
                />
                <div className="mt-2 flex flex-wrap gap-2">
                    {filesToAttach.map((file, index) => (
                        <div key={index} className="flex items-center gap-2 bg-gray-100 rounded-full px-3 py-1 text-sm">
                            <span className="max-w-xs truncate">{file.name}</span>
                            <button type="button" onClick={() => handleRemoveFile(index)} className="text-gray-500 hover:text-gray-800">
                                <FaTimes size={12} />
                            </button>
                        </div>
                    ))}
                </div>
                <div className="mt-2 flex justify-between items-center">
                    <button
                        type="button"
                        onClick={() => setIsAttachmentModalOpen(true)}
                        className="p-2 text-gray-500 hover:text-blue-600 rounded-full hover:bg-gray-100"
                        title="Прикрепить файлы"
                        disabled={loading}
                    >
                        <FaPaperclip size={18} />
                    </button>
                    <button
                        type="submit"
                        disabled={loading || (!content.trim() && filesToAttach.length === 0)}
                        className="w-32 py-2 px-4 btn-primary flex justify-center items-center"
                    >
                        {loading ? <Spinner size="sm" /> : 'Отправить'}
                    </button>
                </div>
            </form>
             <AddAttachmentModal
                isOpen={isAttachmentModalOpen}
                onClose={() => setIsAttachmentModalOpen(false)}
                onFilesConfirm={(newFiles) => {
                    setFilesToAttach(prev => [...prev, ...newFiles]);
                    setIsAttachmentModalOpen(false);
                }}
            />
        </div>
    );
};

export default AddEventForm;