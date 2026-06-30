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

    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    const rightAlignX = pageWidth - 14;
    doc.text("Doc. no.: MR/L4/013", rightAlignX, 11, { align: "right" });
    doc.text("Issue no./date: 01/12.02.2020", rightAlignX, 15, { align: "right" });
    doc.text("Rev. no.: 01", rightAlignX, 19, { align: "right" });
    doc.text("Rev. date: 01.07.2026", rightAlignX, 23, { align: "right" });
    
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
  const pcsStr = deviation.quantityUnderDeviationPcs !== null && deviation.quantityUnderDeviationPcs !== undefined 
    ? `${deviation.quantityUnderDeviationPcs} pcs` 
    : 'N/A';
  const baseData = [
    ['Serial Number', deviation.serialNumber, 'Status', deviation.status],
    ['Line', deviation.line, 'Creation Date', format(new Date(deviation.createdAt), 'dd-MMM-yy, hh:mm a')],
    ['Start Date', format(new Date(deviation.startDate), 'dd-MMM-yy'), 'End Date', format(new Date(deviation.endDate), 'dd-MMM-yy')],
    ['Quantity Produced', `${deviation.totalQuantityProduced} sqm`, 'Qty Under Dev (sqm)', `${deviation.quantityUnderDeviation} sqm`],
    ['Qty Under Dev (pcs)', pcsStr, 'Nature of Deviation', deviation.natureOfDeviation],
    ['Created By', `${deviation.createdBy?.firstName} ${deviation.createdBy?.lastName}`, 'Initiator Name', deviation.initiatorName || 'N/A']
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
  const actionPlanData = [
    ['Root Cause Analysis', deviation.rootCauseAnalysis || 'N/A'],
    ['Containment Action', deviation.containmentAction || 'N/A'],
    ['Corrective Action', deviation.correctiveAction || 'N/A'],
    ['Disposal Action', deviation.disposalAction || 'N/A']
  ];

  if (deviation.actionPlanAttachments && deviation.actionPlanAttachments.length > 0) {
    actionPlanData.push(['Action Plan Attachments', deviation.actionPlanAttachments.map((f: any) => f.name).join(', ')]);
  }

  autoTable(doc, {
    startY: currentY,
    head: [['Action Plan Area', 'Details']],
    body: actionPlanData,
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
      `${rp.user?.firstName} ${rp.user?.lastName}\n\nStatus: Digitally Signed\nDate: ${rp.signedAt ? format(new Date(rp.signedAt), 'dd-MMM-yy, hh:mm a') : 'Pending'}`,
      'Action plan submitted.'
    ]);
  });
  
  if (deviation.marketingPersonId) {
    let mRemarks = deviation.marketingRemarks ? `"${deviation.marketingRemarks}"` : 'No remarks provided.';
    if (deviation.marketingAttachments && deviation.marketingAttachments.length > 0) {
      mRemarks += `\n\nAttachments: ${deviation.marketingAttachments.map((f: any) => f.name).join(', ')}`;
    }
    sigData.push([
      'Marketing Person',
      `${deviation.marketingPerson?.firstName} ${deviation.marketingPerson?.lastName}\n\nStatus: Digitally Signed\nDate: ${deviation.marketingSignedAt ? format(new Date(deviation.marketingSignedAt), 'dd-MMM-yy, hh:mm a') : 'Pending'}`,
      mRemarks
    ]);
  }

  if (deviation.plantHeadId) {
    let pRemarks = deviation.plantHeadRemarks ? `"${deviation.plantHeadRemarks}"` : 'Approved.';
    if (deviation.plantHeadAttachments && deviation.plantHeadAttachments.length > 0) {
      pRemarks += `\n\nAttachments: ${deviation.plantHeadAttachments.map((f: any) => f.name).join(', ')}`;
    }
    sigData.push([
      'Plant Head',
      `${deviation.plantHead?.firstName} ${deviation.plantHead?.lastName}\n\nStatus: Digitally Approved\nDate: ${deviation.plantHeadSignedAt ? format(new Date(deviation.plantHeadSignedAt), 'dd-MMM-yy, hh:mm a') : 'Pending'}`,
      pRemarks
    ]);
  }

  if (deviation.ceoId) {
    let cRemarks = deviation.ceoRemarks ? `"${deviation.ceoRemarks}"` : 'Approved.';
    if (deviation.ceoAttachments && deviation.ceoAttachments.length > 0) {
      cRemarks += `\n\nAttachments: ${deviation.ceoAttachments.map((f: any) => f.name).join(', ')}`;
    }
    sigData.push([
      'CEO',
      `${deviation.ceo?.firstName} ${deviation.ceo?.lastName}\n\nStatus: Digitally Approved\nDate: ${deviation.ceoSignedAt ? format(new Date(deviation.ceoSignedAt), 'dd-MMM-yy, hh:mm a') : 'Pending'}`,
      cRemarks
    ]);
  }

  if (deviation.qualityHeadId) {
    let qRemarks = deviation.qualityHeadRemarks ? `"${deviation.qualityHeadRemarks}"` : 'Final Approval completed.';
    if (deviation.qualityHeadAttachments && deviation.qualityHeadAttachments.length > 0) {
      qRemarks += `\n\nAttachments: ${deviation.qualityHeadAttachments.map((f: any) => f.name).join(', ')}`;
    }
    sigData.push([
      'Quality Head',
      `${deviation.qualityHead?.firstName} ${deviation.qualityHead?.lastName}\n\nStatus: Digitally Approved\nDate: ${deviation.qualityHeadSignedAt ? format(new Date(deviation.qualityHeadSignedAt), 'dd-MMM-yy, hh:mm a') : 'Pending'}`,
      qRemarks
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
