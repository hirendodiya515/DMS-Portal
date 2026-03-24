import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { Plus, Eye, FileText } from 'lucide-react';
import { DeviationDetailsModal } from './DeviationDetailsModal';
import { generateDeviationPdf } from './generateDeviationPdf';

export function ListTab() {
  const [deviations, setDeviations] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDeviationId, setSelectedDeviationId] = useState<string | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    fetchDeviations();
  }, []);

  useEffect(() => {
    if (id && deviations.length > 0) {
      const targetDev = deviations.find((d: any) => d.id === id);
      if (targetDev && !isModalOpen) {
        handleView(targetDev.id);
        navigate('/product-deviation', { replace: true });
      }
    }
  }, [id, deviations]);

  const fetchDeviations = async () => {
    try {
      const response = await api.get('/product-deviation');
      setDeviations(response.data);
    } catch (err) {
      console.error('Failed to fetch deviations:', err);
    }
  };

  const handleCreateNew = () => {
    setSelectedDeviationId(null);
    setIsCreatingNew(true);
    setIsModalOpen(true);
  };

  const handleView = (id: string) => {
    setSelectedDeviationId(id);
    setIsCreatingNew(false);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedDeviationId(null);
    setIsCreatingNew(false);
    fetchDeviations(); // Refresh list just in case
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-slate-800">Deviation List</h2>
        <button
          onClick={handleCreateNew}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition shadow-lg shadow-blue-500/30 font-medium"
        >
          <Plus className="w-4 h-4" />
          Create New
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="py-3.5 pl-6 pr-3 text-left text-sm font-semibold text-slate-700">Sr No. / Title</th>
              <th className="py-3.5 px-3 text-left text-sm font-semibold text-slate-700">Created By</th>
              <th className="py-3.5 px-3 text-left text-sm font-semibold text-slate-700">Created On</th>
              <th className="py-3.5 px-3 text-left text-sm font-semibold text-slate-700">Status</th>
              <th className="py-3.5 px-6 text-right text-sm font-semibold text-slate-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {deviations.map((dev: any) => (
              <tr key={dev.id} className="hover:bg-slate-50 transition-colors">
                <td className="whitespace-nowrap py-4 pl-6 pr-3 text-sm font-medium text-slate-800">
                  {dev.serialNumber} <span className="text-slate-500 font-normal">({dev.line})</span>
                </td>
                <td className="whitespace-nowrap py-4 px-3 text-sm text-slate-500">
                  {dev.createdBy?.firstName} {dev.createdBy?.lastName}
                </td>
                <td className="whitespace-nowrap py-4 px-3 text-sm text-slate-500">
                  {new Date(dev.createdAt).toLocaleDateString()}
                </td>
                <td className="whitespace-nowrap py-4 px-3 text-sm">
                  <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
                    dev.status === 'CLOSED' ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' :
                    dev.status === 'OPEN' ? 'bg-rose-50 text-rose-700 ring-rose-600/20' :
                    'bg-amber-50 text-amber-800 ring-amber-600/20'
                  }`}>
                    {dev.status.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="whitespace-nowrap py-4 px-6 text-sm">
                  <div className="flex items-center justify-end gap-3 w-full">
                    {dev.status === 'CLOSED' && (
                      <button
                        onClick={() => generateDeviationPdf(dev)}
                        className="text-emerald-600 hover:text-emerald-800 font-medium flex items-center gap-1 transition-colors bg-emerald-50 px-2 py-1 rounded-md"
                        title="Download PDF Report"
                      >
                        <FileText className="w-4 h-4" /> PDF
                      </button>
                    )}
                    <button
                      onClick={() => handleView(dev.id)}
                      className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 transition-colors bg-blue-50 px-2 py-1 rounded-md"
                    >
                      <Eye className="w-4 h-4" /> View
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {deviations.length === 0 && (
              <tr>
                <td colSpan={5} className="py-4 text-center text-sm text-gray-500">
                  No deviations found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <DeviationDetailsModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          deviationId={selectedDeviationId}
          isNew={isCreatingNew}
        />
      )}
    </div>
  );
}
