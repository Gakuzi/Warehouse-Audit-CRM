
import React, { useState, useEffect } from 'react';
import Modal from './ui/Modal';
import { Week, Plan } from '../types';
import { supabase } from '../services/supabaseClient';
import { Spinner } from './ui/Spinner';

interface EditWeekModalProps {
  isOpen: boolean;
  onClose: () => void;
  week: Week;
}

const EditWeekModal: React.FC<EditWeekModalProps> = ({ isOpen, onClose, week }) => {
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (week) {
      setTitle(week.title);
      setStartDate(week.start_date);
      setEndDate(week.end_date);
    }
  }, [week]);
  
  const mergeAndUpdatePlan = (start: string, end: string): Plan => {
      const newPlan: Plan = {};
      const currentDate = new Date(start + 'T00:00:00');
      const finalDate = new Date(end + 'T00:00:00');

      while(currentDate <= finalDate) {
          const dateString = currentDate.toISOString().split('T')[0];
          // If this date existed in the old plan, keep its tasks
          if (week.plan[dateString]) {
            newPlan[dateString] = week.plan[dateString];
          } else {
            newPlan[dateString] = { tasks: [] };
          }
          currentDate.setDate(currentDate.getDate() + 1);
      }
      return newPlan;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const updatedPlan = mergeAndUpdatePlan(startDate, endDate);

    const { error } = await supabase
      .from('weeks')
      .update({ title, start_date: startDate, end_date: endDate, plan: updatedPlan })
      .eq('id', week.id);

    if (error) {
      alert('Ошибка обновления: ' + error.message);
    } else {
      onClose();
    }
    setLoading(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Редактировать этап">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="editWeekTitle" className="block text-sm font-medium text-gray-700">Название этапа</label>
          <input id="editWeekTitle" type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full mt-1 input" required />
        </div>
        <div className="grid grid-cols-2 gap-4">
            <div>
                 <label htmlFor="editStartDate" className="block text-sm font-medium text-gray-700">Дата начала</label>
                 <input id="editStartDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full mt-1 input" required />
            </div>
            <div>
                 <label htmlFor="editEndDate" className="block text-sm font-medium text-gray-700">Дата окончания</label>
                 <input id="editEndDate" type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} className="w-full mt-1 input" required />
            </div>
        </div>
        <p className="text-xs text-gray-500">При изменении дат, дни, не входящие в новый диапазон, будут удалены.</p>
        <div className="mt-4 flex justify-end">
          <button type="button" onClick={onClose} className="mr-2 btn-secondary">Отмена</button>
          <button type="submit" disabled={loading} className="btn-primary w-28">
            {loading ? <Spinner size="sm" /> : 'Сохранить'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default EditWeekModal;