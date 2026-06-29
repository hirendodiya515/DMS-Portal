import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

export const generateDeviationPdf = async (deviation: any) => {
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
    doc.text("PRODUCT DEVIATION REPORT", pageWidth / 2, 20, { align: "center" });
    
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
    ['Serial Number', deviation.serialNumber, 'Status', deviation.status],
    ['Line', deviation.line, 'Creation Date', format(new Date(deviation.createdAt), 'dd MMM yyyy, hh:mm a')],
    ['Start Date', format(new Date(deviation.startDate), 'dd MMM yyyy'), 'End Date', format(new Date(deviation.endDate), 'dd MMM yyyy')],
    ['Quantity Produced', `${deviation.totalQuantityProduced} sqm`, 'Quantity Under Deviation', `${deviation.quantityUnderDeviation} sqm`],
    ['Created By', `${deviation.createdBy?.firstName} ${deviation.createdBy?.lastName}`, 'Nature of Deviation', deviation.natureOfDeviation]
  ];

  autoTable(doc, {
    startY: currentY,
    head: [['Deviation Details', '', '', '']],
    body: baseData,
    theme: 'grid',
    margin: { top: 35, bottom: 25 },
    headStyles: { fillColor: [41, 128, 185], textColor: 255, fontSize: 11, fontStyle: 'bold' },
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
  
  if (deviation.marketingPersonId) {
    sigData.push([
      'Marketing Person',
      `${deviation.marketingPerson?.firstName} ${deviation.marketingPerson?.lastName}\n\nStatus: Digitally Signed\nDate: ${deviation.marketingSignedAt ? format(new Date(deviation.marketingSignedAt), 'dd MMM yyyy, hh:mm a') : 'Pending'}`,
      deviation.marketingRemarks ? `"${deviation.marketingRemarks}"` : 'No remarks provided.'
    ]);
  }

  if (deviation.plantHeadId) {
    sigData.push([
      'Plant Head',
      `${deviation.plantHead?.firstName} ${deviation.plantHead?.lastName}\n\nStatus: Digitally Approved\nDate: ${deviation.plantHeadSignedAt ? format(new Date(deviation.plantHeadSignedAt), 'dd MMM yyyy, hh:mm a') : 'Pending'}`,
      deviation.plantHeadRemarks ? `"${deviation.plantHeadRemarks}"` : 'Approved.'
    ]);
  }

  if (deviation.ceoId) {
    sigData.push([
      'CEO',
      `${deviation.ceo?.firstName} ${deviation.ceo?.lastName}\n\nStatus: Digitally Approved\nDate: ${deviation.ceoSignedAt ? format(new Date(deviation.ceoSignedAt), 'dd MMM yyyy, hh:mm a') : 'Pending'}`,
      deviation.ceoRemarks ? `"${deviation.ceoRemarks}"` : 'Approved.'
    ]);
  }

  if (deviation.qualityHeadId) {
    sigData.push([
      'Quality Head',
      `${deviation.qualityHead?.firstName} ${deviation.qualityHead?.lastName}\n\nStatus: Digitally Approved\nDate: ${deviation.qualityHeadSignedAt ? format(new Date(deviation.qualityHeadSignedAt), 'dd MMM yyyy, hh:mm a') : 'Pending'}`,
      deviation.qualityHeadRemarks ? `"${deviation.qualityHeadRemarks}"` : 'Final Approval completed.'
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

  doc.save(`Product_Deviation_${deviation.serialNumber}.pdf`);
};
