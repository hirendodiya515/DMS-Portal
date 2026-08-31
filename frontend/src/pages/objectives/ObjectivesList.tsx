import { Search, Target, ArrowRight, Edit, Trash2 } from "lucide-react";
import type { Objective } from "../../types/objective";

function getTypeColor(type: string) {
  switch (type) {
    case "quality":
      return "bg-blue-100 text-blue-800";
    case "environmental":
      return "bg-green-100 text-green-800";
    case "safety":
      return "bg-orange-100 text-orange-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

export function formatTypeLabel(type: string) {
  switch (type) {
    case "quality": return "QMS";
    case "environmental": return "EMS";
    case "safety": return "OHSMS";
    default: return type.toUpperCase();
  }
}

export function getQuickSignalBadge(status?: string) {
  switch (status) {
    case "achieved":
    case "on_track":
      return (
        <span
          className="inline-flex w-3 h-3 rounded-full bg-emerald-500 shadow-sm"
          title="On Track / Achieved"
        />
      );
    case "at_risk":
      return (
        <span
          className="inline-flex w-3 h-3 rounded-full bg-yellow-500 shadow-sm"
          title="At Risk"
        />
      );
    case "behind":
      return (
        <span
          className="inline-flex w-3 h-3 rounded-full bg-red-500 shadow-sm"
          title="Behind"
        />
      );
    default:
      return (
        <span
          className="inline-flex w-3 h-3 rounded-full bg-slate-300 shadow-sm"
          title="No Data"
        />
      );
  }
}

export function ObjectivesList({
  objectives,
  loading,
  searchTerm,
  setSearchTerm,
  filterType,
  setFilterType,
  filterDepartment,
  setFilterDepartment,
  departments,
  selectedFY,
  onViewDetails,
  onEdit,
  onCarryForward,
  onDelete,
}: {
  objectives: Objective[];
  loading: boolean;
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  filterType: string;
  setFilterType: (v: string) => void;
  filterDepartment: string;
  setFilterDepartment: (v: string) => void;
  departments: string[];
  selectedFY?: string;
  onViewDetails: (obj: Objective) => void;
  onAddMeasurement?: (obj: Objective) => void;
  onEdit?: (obj: Objective) => void;
  onCarryForward?: (obj: Objective) => void;
  onDelete?: (id: string) => void;
  user?: any;
}) {
  const filteredObjectives = objectives.filter(o => 
    (filterType === 'all' || o.type === filterType) &&
    (filterDepartment === 'all' || o.department === filterDepartment) &&
    (o.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
     o.description?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Filters and Search */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search objectives..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
        >
          <option value="all">All Types</option>
          <option value="quality">QMS</option>
          <option value="environmental">EMS</option>
          <option value="safety">OHSMS</option>
        </select>
        <select
          value={filterDepartment}
          onChange={(e) => setFilterDepartment(e.target.value)}
          className="px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
        >
          <option value="all">All Departments</option>
          {departments.map((dept) => (
            <option key={dept} value={dept}>{dept}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredObjectives.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200 shadow-sm">
          <Target className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-600">
            No objectives found for {selectedFY || 'selected filters'}
          </h3>
          <p className="text-slate-400 text-sm mt-1">
            Adjust year selector, filters, or create a new objective.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                  Signal
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                  Objective Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                  FY
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                  Owner
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                  Department
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                  Target
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                  Latest Actual
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredObjectives.map((objective) => {
                const fyDisplay = objective.financialYear ? `FY ${objective.financialYear}` : 'FY 2026-27';
                return (
                  <tr key={objective.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-4 text-center">
                      {getQuickSignalBadge(objective.progressStatus)}
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <div className="font-semibold text-slate-800 hover:text-blue-600 cursor-pointer" onClick={() => onViewDetails(objective)}>
                          {objective.name || "-"}
                        </div>
                        <div className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                          {objective.description}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {fyDisplay}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm font-medium text-slate-700">
                        {objective.owner
                          ? `${objective.owner.firstName} ${objective.owner.lastName}`
                          : "Unassigned"}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase ${getTypeColor(objective.type)}`}
                      >
                        {formatTypeLabel(objective.type)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">
                      {objective.department || "-"}
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm font-semibold text-slate-800">
                        {objective.target} <span className="text-slate-500 text-xs font-normal">({objective.uom})</span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {objective.higherIsBetter ? "↑ Higher" : "↓ Lower"}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-slate-800 text-sm">
                          {objective.latestValue !== null && objective.latestValue !== undefined ? (
                            objective.latestValue
                          ) : (
                            <span className="text-slate-400 font-normal">-</span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onViewDetails(objective)}
                          className="text-xs font-medium text-blue-600 hover:text-blue-800 px-2.5 py-1 rounded hover:bg-blue-50 transition-colors border border-blue-200"
                        >
                          View
                        </button>

                        {onCarryForward && (
                          <button
                            onClick={() => onCarryForward(objective)}
                            title="Carry Forward to Next Financial Year"
                            className="flex items-center gap-1 text-xs font-medium text-purple-600 hover:text-purple-800 px-2.5 py-1 rounded hover:bg-purple-50 transition-colors border border-purple-200"
                          >
                            <ArrowRight className="w-3 h-3" />
                            Carry
                          </button>
                        )}

                        {onEdit && (
                          <button
                            onClick={() => onEdit(objective)}
                            title="Edit Objective"
                            className="p-1 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}

                        {onDelete && (
                          <button
                            onClick={() => onDelete(objective.id)}
                            title="Delete Objective"
                            className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
