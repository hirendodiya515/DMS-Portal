import api from './api';

export const pfmeaApi = {
  // GET all PFMEA projects
  getAll: async () => {
    const response = await api.get('/pfmea');
    return response.data;
  },

  // GET a specific PFMEA project by ID (includes its worksheetRows)
  getOne: async (id: string) => {
    const response = await api.get(`/pfmea/${id}`);
    return response.data;
  },

  // CREATE a new PFMEA project
  create: async (data: any) => {
    const response = await api.post('/pfmea', data);
    return response.data;
  },

  // UPDATE an existing PFMEA project (top-level info)
  update: async (id: string, data: any) => {
    const response = await api.put(`/pfmea/${id}`, data);
    return response.data;
  },

  // DELETE a PFMEA project entirely
  delete: async (id: string) => {
    const response = await api.delete(`/pfmea/${id}`);
    return response.data;
  },

  // ===================== ROW OPERATIONS =====================

  // ADD a new row to the worksheet
  addRow: async (pfmeaId: string, rowData: any) => {
    const response = await api.post(`/pfmea/${pfmeaId}/rows`, rowData);
    return response.data;
  },

  // UPDATE an existing row (saves real-time edit changes)
  updateRow: async (pfmeaId: string, rowId: string, rowData: any) => {
    const response = await api.put(`/pfmea/${pfmeaId}/rows/${rowId}`, rowData);
    return response.data;
  },

  // DELETE a row from the worksheet
  deleteRow: async (pfmeaId: string, rowId: string) => {
    const response = await api.delete(`/pfmea/${pfmeaId}/rows/${rowId}`);
    return response.data;
  }
};
