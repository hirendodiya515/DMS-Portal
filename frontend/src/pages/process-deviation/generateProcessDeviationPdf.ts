import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

export const generateProcessDeviationPdf = async (deviation: any) => {
  const doc = new jsPDF();
  
  const logoUrl = '/logo.png';
  let logoBase64 = '';
  
  try {
    const response = await fetch(logoUrl);
    const blob = await response.blob();
    const reader = new FileReader();
    logoBase64 = await new Promise((resolve) => {
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Failed to load logo for PDF:', error);
  }

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  const addHeaderAndFooter = (doc: jsPDF, pageNumber: number, totalPages: number) => {
    if (logoBase64) {
      doc.addImage(logoBase64, 'PNG', 14, 10, 30, 15);
    }
    
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("PROCESS DEVIATION REPORT", pageWidth / 2, 20, { align: "center" });
    
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(14, 30, pageWidth - 14, 30);
    
    const footerY = pageHeight - 15;
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.text("This is a system generated report and digitally signed by all required authorities.", pageWidth / 2, footerY, { align: "center" });
    
    doc.setFont("helvetica", "normal");
    doc.text(`Page ${pageNumber} of ${totalPages}`, pageWidth - 14, footerY, { align: "right" });
  };

  let currentY = 35;

  // Base Info Table
  const baseData = [
    ['Serial Number', deviation.serialNumber, 'Status', deviation.status.replace(/_/g, ' ')],
    ['Department', deviation.department, 'Creation Date', format(new Date(deviation.createdAt), 'dd MMM yyyy, hh:mm a')],
    ['Line', deviation.line, 'Nature of Deviation', deviation.natureOfDeviation],
    ['Start Date', format(new Date(deviation.startDate), 'dd MMM yyyy'), 'End Date', format(new Date(deviation.endDate), 'dd MMM yyyy')],
    ['Parameter Deviation', deviation.parameterUnderDeviation, 'Spec of Parameter', deviation.parameterSpecification],
    ['Created By', `${deviation.createdBy?.firstName} ${deviation.createdBy?.lastName}`, '', '']
  ];

  autoTable(doc, {
    startY: currentY,
    head: [['Deviation Details', '', '', '']],
    body: baseData,
    theme: 'grid',
    margin: { top: 35, bottom: 25 },
    headStyles: { fillColor: [243, 156, 18], textColor: 255, fontSize: 11, fontStyle: 'bold' }, // Orange theme for process
    styles: { fontSize: 9, cellPadding: 4 },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: [245, 245, 245], cellWidth: 40 },
      1: { cellWidth: 50 },
      2: { fontStyle: 'bold', fillColor: [245, 245, 245], cellWidth: 40 },
      3: { cellWidth: 50 }
    },
    didDrawPage: (data) => {
      currentY = data.cursor ? data.cursor.y + 10 : currentY;
    }
  });

  // Deviation Details section
  autoTable(doc, {
    startY: currentY,
    head: [['Description of Deviation']],
    body: [[deviation.detailsOfDeviation]],
    theme: 'grid',
    margin: { top: 35, bottom: 25 },
    headStyles: { fillColor: [52, 73, 94], textColor: 255, fontSize: 10 },
    styles: { fontSize: 9, cellPadding: 5 },
    didDrawPage: (data) => {
      currentY = data.cursor ? data.cursor.y + 10 : currentY;
    }
  });

  // Action Plan Table
  const actionData = [
    ['Root Cause Analysis', deviation.rootCauseAnalysis || 'N/A'],
    ['Containment Action', deviation.containmentAction || 'N/A'],
    ['Corrective Action', deviation.correctiveAction || 'N/A']
  ];

  autoTable(doc, {
    startY: currentY,
    head: [['Action Plan Area', 'Details']],
    body: actionData,
    theme: 'grid',
    margin: { top: 35, bottom: 25 },
    headStyles: { fillColor: [41, 128, 185], textColor: 255, fontSize: 10 },
    styles: { fontSize: 9, cellPadding: 4 },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: [245, 245, 245], cellWidth: 50 },
      1: { cellWidth: 'auto' }
    },
    didDrawPage: (data) => {
      currentY = data.cursor ? data.cursor.y + 10 : currentY;
    }
  });

  // Build Signatures Data
  const sigData: string[][] = [];
  
  deviation.responsiblePersons?.forEach((rp: any) => {
    sigData.push([
      'Responsible Person',
      `${rp.user?.firstName} ${rp.user?.lastName}\n\nStatus: Digitally Signed\nDate: ${rp.signedAt ? format(new Date(rp.signedAt), 'dd MMM yyyy, hh:mm a') : 'Pending'}`,
      'Action plan submitted.'
    ]);
  });
  
  // Step 1: Functional Head
  if (deviation.functionalHeadId) {
    sigData.push([
      'Functional Head',
      `${deviation.functionalHead?.firstName} ${deviation.functionalHead?.lastName}\n\nStatus: Digitally Signed\nDate: ${deviation.functionalHeadSignedAt ? format(new Date(deviation.functionalHeadSignedAt), 'dd MMM yyyy, hh:mm a') : 'Pending'}`,
      deviation.functionalHeadRemarks ? `"${deviation.functionalHeadRemarks}"` : 'Approved.'
    ]);
  }

  // Step 2: QA Head
  if (deviation.qaHeadId) {
    sigData.push([
      'QA Head',
      `${deviation.qaHead?.firstName} ${deviation.qaHead?.lastName}\n\nStatus: Digitally Signed\nDate: ${deviation.qaHeadSignedAt ? format(new Date(deviation.qaHeadSignedAt), 'dd MMM yyyy, hh:mm a') : 'Pending'}`,
      deviation.qaHeadRemarks ? `"${deviation.qaHeadRemarks}"` : 'Approved.'
    ]);
  }

  // Step 3: Plant Head
  if (deviation.plantHeadId) {
    sigData.push([
      'Plant Head',
      `${deviation.plantHead?.firstName} ${deviation.plantHead?.lastName}\n\nStatus: Digitally Signed\nDate: ${deviation.plantHeadSignedAt ? format(new Date(deviation.plantHeadSignedAt), 'dd MMM yyyy, hh:mm a') : 'Pending'}`,
      deviation.plantHeadRemarks ? `"${deviation.plantHeadRemarks}"` : 'Approved.'
    ]);
  }

  // Step 4: Process Head
  if (deviation.processHeadId) {
    sigData.push([
      'Process Head',
      `${deviation.processHead?.firstName} ${deviation.processHead?.lastName}\n\nStatus: Digitally Signed\nDate: ${deviation.processHeadSignedAt ? format(new Date(deviation.processHeadSignedAt), 'dd MMM yyyy, hh:mm a') : 'Pending'}`,
      deviation.processHeadRemarks ? `"${deviation.processHeadRemarks}"` : 'Approved.'
    ]);
  }

  // Step 5: CEO
  if (deviation.ceoId) {
    sigData.push([
      'CEO',
      `${deviation.ceo?.firstName} ${deviation.ceo?.lastName}\n\nStatus: Digitally Approved\nDate: ${deviation.ceoSignedAt ? format(new Date(deviation.ceoSignedAt), 'dd MMM yyyy, hh:mm a') : 'Pending'}`,
      deviation.ceoRemarks ? `"${deviation.ceoRemarks}"` : 'Final Approval completed.'
    ]);
  }

  autoTable(doc, {
    startY: currentY,
    head: [['Role', 'Authority Name', 'Remarks']],
    body: sigData,
    theme: 'grid',
    margin: { top: 35, bottom: 25 },
    headStyles: { fillColor: [46, 204, 113], textColor: 255, fontSize: 10 },
    styles: { fontSize: 9, cellPadding: 5 },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: [245, 245, 245], cellWidth: 40 },
      1: { cellWidth: 60, fontStyle: 'bold', textColor: [40, 40, 40] },
      2: { cellWidth: 'auto', fontStyle: 'italic', textColor: [80, 80, 80] }
    }
  });

  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    addHeaderAndFooter(doc, i, pageCount);
  }

  doc.save(`Process_Deviation_${deviation.serialNumber}.pdf`);
};
