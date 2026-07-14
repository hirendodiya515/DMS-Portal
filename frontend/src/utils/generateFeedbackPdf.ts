import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateFeedbackPdf = (feedback: any) => {
  const doc = new jsPDF();
  const primaryColor: [number, number, number] = [30, 64, 175];
  const secondaryColor: [number, number, number] = [71, 85, 105];
  const redColor: [number, number, number] = [220, 38, 38];
  const greenColor: [number, number, number] = [21, 128, 61];
  const amberColor: [number, number, number] = [217, 119, 6];

  const drawHeader = (_pageNum: number) => {
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('Customer Satisfaction Report', 105, 18, { align: 'center' });
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const rawDate = feedback.createdAt || feedback.created_at;
    const dateStr = rawDate
      ? new Date(rawDate).toLocaleDateString('en-US', {
          year: 'numeric', month: 'long', day: 'numeric',
          hour: '2-digit', minute: '2-digit',
        })
      : new Date().toLocaleDateString();
    doc.text(`Downloaded: ${dateStr}`, 105, 27, { align: 'center' });
  };

  const drawFooter = () => {
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(9);
      doc.setTextColor(150, 150, 150);
      const ph = doc.internal.pageSize.getHeight();
      doc.text('Borosil Renewables Ltd – Confidential Feedback Report', 105, ph - 12, { align: 'center' });
      doc.text(`Page ${i} of ${pageCount}`, 196, ph - 12, { align: 'right' });
    }
  };

  // --- Start Page 1 ---
  drawHeader(1);
  doc.setTextColor(50, 50, 50);

  // --- 2. Customer Information ---
  let currentY = 50;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('Customer & Representative Details', 14, currentY);
  currentY += 4;
  doc.setLineWidth(0.5);
  doc.setDrawColor(220, 227, 235);
  doc.line(14, currentY, 196, currentY);
  currentY += 10;

  const companyName   = feedback.companyName || feedback.company_name || 'N/A';
  const contactPerson  = feedback.contactPerson || feedback.contact_person || 'N/A';
  const email         = feedback.email || 'N/A';
  const product       = feedback.product || 'Borosil Solar Glass';
  const plantLocation = feedback.plantLocation || feedback.plant_location || 'N/A';
  const officeLocation = feedback.officeLocation || feedback.office_location || 'N/A';
  const repDesig      = feedback.representativeDesignation || feedback.representative_designation || 'N/A';
  const brlRep        = feedback.brlRepresentativeName || feedback.brl_representative_name || 'N/A';

  const drawInfoRow = (label1: string, val1: string, label2: string, val2: string, y: number) => {
    doc.setFontSize(9);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.text(label1, 14, y);
    doc.text(label2, 105, y);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);
    doc.text(String(val1), 45, y);
    doc.text(String(val2), 140, y);
  };

  drawInfoRow('Organization:', companyName, 'Email Address:', email, currentY); currentY += 8;
  drawInfoRow('Contact Person:', contactPerson, 'Designation:', repDesig, currentY); currentY += 8;
  drawInfoRow('Product Name:', product, 'Plant Location:', plantLocation, currentY); currentY += 8;
  drawInfoRow('BRL Representative:', brlRep, 'Office Location:', officeLocation, currentY); currentY += 12;

  // --- 3. CSI Score ---
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, currentY, 182, 20, 2, 2, 'F');
  
  const ratings = [
    feedback.thicknessDimensionQualityRating, feedback.surfaceVisualQualityRating,
    feedback.breakagesRating, feedback.edgeGrindingQualityRating,
    feedback.arCoatingQualityRating, feedback.packingLoadingQualityRating,
    feedback.powerOutputOfModulesRating || feedback.power_output_of_modules_rating,
    feedback.pricingRating, feedback.deliveryLeadTimeRating,
    feedback.afterSalesServiceResponseRating, feedback.salesTeamApproachRating,
  ].map(v => (typeof v === 'number' ? v : 0));

  const sum = ratings.reduce((a, b) => a + b, 0);
  const maxScore = ratings.length * 5;
  const itemCSI = maxScore > 0 ? Math.round((sum / maxScore) * 100) : 0;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text('Customer Satisfaction Index (CSI):', 20, currentY + 12);

  doc.setFontSize(22);
  if (itemCSI >= 80) doc.setTextColor(greenColor[0], greenColor[1], greenColor[2]);
  else if (itemCSI >= 60) doc.setTextColor(amberColor[0], amberColor[1], amberColor[2]);
  else doc.setTextColor(redColor[0], redColor[1], redColor[2]);
  doc.text(`${itemCSI}%`, 85, currentY + 13);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  const csiLabel = itemCSI >= 85 ? 'EXCELLENT' : itemCSI >= 70 ? 'GOOD' : itemCSI >= 60 ? 'ACCEPTABLE' : 'ACTION REQUIRED';
  doc.text(csiLabel, 110, currentY + 12);
  currentY += 30;

  // --- 4. Detailed Ratings Table ---
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('Performance Evaluation Metrics', 14, currentY);
  currentY += 6;

  const categories = [
    { label: 'Thickness & Dimension Quality', rating: feedback.thicknessDimensionQualityRating, comment: feedback.thicknessDimensionQualityComment },
    { label: 'Surface & Visual Quality', rating: feedback.surfaceVisualQualityRating, comment: feedback.surfaceVisualQualityComment },
    { label: 'Glass Breakages', rating: feedback.breakagesRating, comment: feedback.breakagesComment },
    { label: 'Edge Grinding Quality', rating: feedback.edgeGrindingQualityRating, comment: feedback.edgeGrindingQualityComment },
    { label: 'AR Coating Quality', rating: feedback.arCoatingQualityRating, comment: feedback.arCoatingQualityComment },
    { label: 'Packing & Loading Quality', rating: feedback.packingLoadingQualityRating, comment: feedback.packingLoadingQualityComment },
    { label: 'Power Output of Modules', rating: feedback.powerOutputOfModulesRating || feedback.power_output_of_modules_rating, comment: feedback.powerOutputOfModulesComment || feedback.power_output_of_modules_comment },
    { label: 'Competitive Pricing', rating: feedback.pricingRating, comment: feedback.pricingComment },
    { label: 'Delivery Lead Time', rating: feedback.deliveryLeadTimeRating, comment: feedback.deliveryLeadTimeComment },
    { label: 'After-Sales Service & Response', rating: feedback.afterSalesServiceResponseRating, comment: feedback.afterSalesServiceResponseComment },
    { label: 'Sales Team Approach', rating: feedback.salesTeamApproachRating, comment: feedback.salesTeamApproachComment },
  ];

  autoTable(doc, {
    startY: currentY,
    head: [['Quality & Service Category', 'Score', 'Visual Rating', 'Specific Remarks']],
    body: categories.map(c => [c.label, c.rating || 0, '', c.comment || '-']),
    theme: 'grid',
    headStyles: { fillColor: primaryColor, textColor: 255, halign: 'left', fontStyle: 'bold', fontSize: 10 },
    columnStyles: {
      0: { cellWidth: 65, fontStyle: 'bold' },
      1: { cellWidth: 15, halign: 'center', fontStyle: 'bold' },
      2: { cellWidth: 35, halign: 'center' },
      3: { cellWidth: 67, fontSize: 8, textColor: [80, 80, 80] },
    },
    styles: { fontSize: 9, cellPadding: 4, valign: 'middle' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    didDrawCell(data) {
      if (data.section === 'body' && data.column.index === 2) {
        const score = Number((data.row.raw as any[])[1]);
        const startX = data.cell.x + 5;
        const cy = data.cell.y + data.cell.height / 2;
        const r = 2;
        const gap = 6;
        for (let i = 0; i < 5; i++) {
          if (i < score) {
            if (score >= 4) doc.setFillColor(greenColor[0], greenColor[1], greenColor[2]);
            else if (score === 3) doc.setFillColor(amberColor[0], amberColor[1], amberColor[2]);
            else doc.setFillColor(redColor[0], redColor[1], redColor[2]);
          } else {
            doc.setFillColor(230, 235, 240);
          }
          doc.circle(startX + i * gap, cy, r, 'F');
        }
      }
    },
  });

  // --- 5. Additional Feedback (Handle new page) ---
  // @ts-ignore
  let finalY = doc.lastAutoTable.finalY + 15;
  if (finalY > 210) {
    doc.addPage();
    drawHeader(2);
    finalY = 50;
  }

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('Qualitative Feedback & Insights', 14, finalY);
  doc.setLineWidth(0.5);
  doc.setDrawColor(220, 227, 235);
  doc.line(14, finalY + 3, 196, finalY + 3);
  finalY += 12;

  const drawFeedbackSection = (title: string, content: string) => {
    if (!content) return;
    if (finalY > 260) {
      doc.addPage();
      drawHeader(2);
      finalY = 50;
    }
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text(title, 14, finalY);
    finalY += 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    const lines = doc.splitTextToSize(content, 180);
    doc.text(lines, 14, finalY);
    finalY += (lines.length * 5) + 8;
  };

  const reco = feedback.recommendation || 'N/A';
  const overallSat = feedback.overallSatisfaction || feedback.overall_satisfaction || 'N/A';
  const reason = feedback.procurementReason || feedback.procurement_reason;
  const expectations = feedback.expectations;
  const suggestion = feedback.suggestion || 'No additional suggestions provided.';

  drawFeedbackSection('Recommendation Status:', reco);
  drawFeedbackSection('Overall Satisfaction Level:', overallSat);
  if (reason) drawFeedbackSection('Reasons for External Sourcing:', reason);
  if (expectations) drawFeedbackSection('Customer Expectations & Future Requirements:', expectations);
  drawFeedbackSection('Suggestions for Product/Service Improvement:', suggestion);

  drawFooter();

  const safeName = companyName.replace(/\s+/g, '_');
  doc.save(`Feedback_Report_${safeName}.pdf`);
};

