import api from './api';

export const CompetencyAPI = {
    // Competencies
    getCompetencies: () => api.get('/competencies'),
    createCompetency: (data: any) => api.post('/competencies', data),
    updateCompetency: (id: string, data: any) => api.put(`/competencies/${id}`, data),
    deleteCompetency: (id: string) => api.delete(`/competencies/${id}`),

    // Roles
    getJobRoles: () => api.get('/competencies/roles'),
    createJobRole: (data: any) => api.post('/competencies/roles', data),
    updateJobRole: (id: string, data: any) => api.put(`/competencies/roles/${id}`, data),
    deleteJobRole: (id: string) => api.delete(`/competencies/roles/${id}`),

    // Requirements
    getRequirements: (roleId: string) => api.get(`/competencies/requirements/${roleId}`),
    addRequirement: (data: any) => api.post('/competencies/requirements', data),
    deleteRequirement: (roleId: string, competencyId: string) => api.delete(`/competencies/requirements/${roleId}/${competencyId}`),

    // Skills
    getEmployeeSkills: (employeeId: string) => api.get(`/competencies/skills/${employeeId}`),
    rateSkill: (data: any) => api.post('/competencies/skills', data),

    // Gap Analysis & Summaries
    getGapAnalysis: (employeeId: string, roleId: string) => api.get(`/competencies/gap-analysis`, { params: { employeeId, roleId } }),
    getDepartmentSummary: () => api.get('/competencies/summary/departments'),
    getDepartmentUserSummary: (dept: string) => api.get(`/competencies/summary/department/${dept}`),
    getCompetencyGapSummary: () => api.get('/competencies/summary/competency-gaps'),

    // Training
    getTrainingPrograms: () => api.get('/competencies/training-programs'),
    createTrainingProgram: (data: any) => api.post('/competencies/training-programs', data),
    getTrainingPlan: (employeeId: string) => api.get(`/competencies/training-plans/${employeeId}`),
    assignTraining: (data: any) => api.post('/competencies/training-plans', data),
    updateTrainingStatus: (id: string, data: any) => api.put(`/competencies/training-plans/${id}/status`, data),
};
