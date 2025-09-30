
import React, { useState, useEffect } from 'react';
import Modal from './ui/Modal';
import { Week, WeekStatus } from '../types';

interface EditWeekModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdateWeek: (week: Week) => void;
  weekData: Week;
}

const EditWeekModal: React.FC<EditWeekModalProps> = ({ isOpen, onClose, onUpdateWeek, weekData }) => {
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<WeekStatus>('draft');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (weekData) {
      setTitle(weekData.title);
      setStatus(weekData.status);
      setStartDate(weekData.start_date?.split('T')[0] || '');
      setEndDate(weekData.end_date?.split('T')[0] || '');
    }
  }, [weekData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
     if (endDate && startDate && new Date(endDate) < new Date(startDate)) {
        alert("Дата окончания не может быть раньше даты начала.");
        return;
      }
    onUpdateWeek({ ...weekData, title, status, start_date: startDate, end_date: endDate });
  };
  
  if (!weekData) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Редактировать этап">
       <form onSubmit={handleSubmit} className="space-y-4">
            <div>
               <label htmlFor="editWeekTitle" className="block text-sm font-medium text-gray-700">Название этапа</label>
               <input
                type="text"
                id="editWeekTitle"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full mt-1 input"
                required
               />
            </div>
             <div className="grid grid-cols-2 gap-4">
                <div>
                    <label htmlFor="editStartDate" className="block text-sm font-medium text-gray-700">Дата начала</label>
                    <input
                        id="editStartDate"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full mt-1 input"
                        required
                    />
                </div>
                <div>
                    <label htmlFor="editEndDate" className="block text-sm font-medium text-gray-700">Дата окончания</label>
                    <input
                        id="editEndDate"
                        type="date"
                        value={endDate}
                        min={startDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full mt-1 input"
                        required
                    />
                </div>
            </div>
            <div>
               <label htmlFor="weekStatus" className="block text-sm font-medium text-gray-700">Статус</label>
               <select
                 id="weekStatus"
                 value={status}
                 onChange={(e) => setStatus(e.target.value as WeekStatus)}
                 className="w-full mt-1 input bg-white"
               >
                   <option value="draft">Черновик</option>
                   <option value="pending_approval">На согласовании</option>
                   <option value="approved">Утверждено</option>
                   <option value="changes_requested">Требует доработки</option>
               </select>
            </div>
            <div className="flex justify-end items-center pt-2">
               <button type="button" onClick={onClose} className="mr-2 px-4 py-2 bg-gray-200 rounded-md">Отмена</button>
               <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md">Сохранить</button>
           </div>
       </form>
    </Modal>
  );
};

export default EditWeekModal;
