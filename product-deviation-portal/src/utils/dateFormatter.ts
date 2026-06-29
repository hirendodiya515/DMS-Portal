import { format } from 'date-fns';

export const formatDate = (date: any): string => {
  if (!date) return 'N/A';
  try {
    return format(new Date(date), 'dd-MMM-yy');
  } catch (e) {
    return 'N/A';
  }
};

export const formatDateTime = (date: any): string => {
  if (!date) return 'N/A';
  try {
    return format(new Date(date), 'dd-MMM-yy, hh:mm a');
  } catch (e) {
    return 'N/A';
  }
};
