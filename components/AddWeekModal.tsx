
import React, { useState } from 'react';
import Modal from './ui/Modal';
import { Plan } from '../types';

interface AddWeekModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddWeek: (title: string, startDate: string, endDate: string, plan: Plan) => void;
}

const AddWeekModal: React.FC<AddWeekModalProps> = ({ isOpen, onClose, onAddWeek }) => {
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');

  const generatePlanForDateRange = (start: string, end: string): Plan => {
      const plan: Plan = {};
      const currentDate = new Date(start + 'T00:00:00');
      const finalDate = new Date(end + 'T00:00:00');

      while(currentDate <= finalDate) {
          const dateString = currentDate.toISOString().split('T')[0];
          plan[dateString] = { tasks: [] };
          currentDate.setDate(currentDate.getDate() + 1);
      }
      return plan;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim() && startDate && endDate) {
      if (new Date(endDate) < new Date(startDate)) {
        alert("Дата окончания не может быть раньше даты начала.");
        return;
      }
      const newPlan = generatePlanForDateRange(startDate, endDate);
      onAddWeek(title.trim(), startDate, endDate, newPlan);
      handleClose();
    }
  };
  
  const handleClose = () => {
      setTitle('');
      setStartDate(new Date().toISOString().split('T')[0]);
      setEndDate('');
      onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Добавить новый этап">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
            <label htmlFor="weekTitle" className="block text-sm font-medium text-gray-700">Название этапа</label>
            <input
              id="weekTitle"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm"
              placeholder="Например, 'Этап 1: Сбор документов'"
              required
              autoFocus
            />
        </div>
        <div className="grid grid-cols-2 gap-4">
            <div>
                 <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">Дата начала</label>
                 <input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full mt-1 input"
                    required
                 />
            </div>
            <div>
                 <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">Дата окончания</label>
                 <input
                    id="endDate"
                    type="date"
                    value={endDate}
                    min={startDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full mt-1 input"
                    required
                 />
            </div>
        </div>
        <p className="text-xs text-gray-500">План будет автоматически заполнен днями из выбранного диапазона.</p>
        <div className="mt-4 flex justify-end space-x-2">
          <button type="button" onClick={handleClose} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300">
            Отмена
          </button>
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            Добавить
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AddWeekModal;