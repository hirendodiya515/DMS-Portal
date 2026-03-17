import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateFeedbackPdf = (feedback: any) => {
  const doc = new jsPDF();
  
  // Set default font
  doc.setFont('helvetica');

  // Colors as strict tuples
  const primaryColor: [number, number, number] = [30, 64, 175]; // text-blue-800
  const redColor: [number, number, number] = [220, 38, 38]; // text-red-600
  const greenColor: [number, number, number] = [21, 128, 61]; // text-green-700
  const amberColor: [number, number, number] = [217, 119, 6]; // text-amber-600

  // 1. Header Section
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 210, 30, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('Customer Satisfaction Report', 105, 18, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const dateStr = new Date(feedback.createdAt).toLocaleDateString('en-US', { 
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
  doc.text(`Generated: ${dateStr}`, 105, 26, { align: 'center' });

  // Reset text color for body
  doc.setTextColor(50, 50, 50);

  // 2. Customer Details Section
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Customer Information', 14, 45);
  doc.setLineWidth(0.5);
  doc.setDrawColor(200, 200, 200);
  doc.line(14, 48, 196, 48);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Company Name: ${feedback.companyName}`, 14, 56);
  doc.text(`Contact Person: ${feedback.contactPerson}`, 14, 64);
  doc.text(`Email Address: ${feedback.email}`, 105, 56);
  doc.text(`Product Provided: ${feedback.product || 'N/A'}`, 105, 64);

  // 3. CSI Score Section
  const itemCSI = Math.round(
    ((feedback.qualityRating + feedback.deliveryRating + feedback.packagingRating + 
    feedback.supportRating + feedback.responseRating + feedback.complaintRating + 
    feedback.documentationRating + feedback.overallRating) / 40) * 100
  );

  doc.text('Customer Satisfaction Index (CSI):', 14, 78);
  
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  if (itemCSI >= 80) {
    doc.setTextColor(greenColor[0], greenColor[1], greenColor[2]);
  } else if (itemCSI >= 60) {
    doc.setTextColor(amberColor[0], amberColor[1], amberColor[2]);
  } else {
    doc.setTextColor(redColor[0], redColor[1], redColor[2]);
  }
  doc.text(`${itemCSI}%`, 80, 79);
  
  // Reset body color
  doc.setTextColor(50, 50, 50);

  // 4. Detailed Ratings Table
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Detailed Ratings', 14, 95);
  doc.line(14, 98, 196, 98);

  const tableData = [
    ['Quality of Glass', feedback.qualityRating, ''],
    ['Delivery Performance', feedback.deliveryRating, ''],
    ['Packaging Quality', feedback.packagingRating, ''],
    ['Technical Support', feedback.supportRating, ''],
    ['Response Time', feedback.responseRating, ''],
    ['Complaint Handling', feedback.complaintRating, ''],
    ['Document Accuracy', feedback.documentationRating, ''],
    ['Overall Experience', feedback.overallRating, ''],
  ];

  autoTable(doc, {
    startY: 105,
    head: [['Category', 'Score (1-5)', 'Rating']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: primaryColor, textColor: 255, halign: 'center' },
    columnStyles: {
      0: { cellWidth: 80, fontStyle: 'bold' },
      1: { cellWidth: 40, halign: 'center', fontStyle: 'bold' },
      2: { cellWidth: 60, halign: 'center' }
    },
    styles: { fontSize: 11, cellPadding: 5, valign: 'middle' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    
    // Custom logic to color the 'Score' column dynamically
    didParseCell: function(data) {
      if (data.section === 'body' && data.column.index === 1) {
        const score = Number(data.cell.raw);
        if (score >= 4) {
          data.cell.styles.textColor = greenColor;
        } else if (score === 3) {
          data.cell.styles.textColor = amberColor;
        } else {
          data.cell.styles.textColor = redColor;
        }
      }
    },
    // Programmatically draw visual dots for the rating since Unicode emojis don't render in default JS pdf fonts
    didDrawCell: function(data) {
      if (data.section === 'body' && data.column.index === 2) {
        const score = Number((data.row.raw as any[])[1]);
        const startX = data.cell.x + 10;
        const startY = data.cell.y + data.cell.height / 2;
        const radius = 2.5;
        const spacing = 8;
        
        for (let i = 0; i < 5; i++) {
          if (i < score) {
            if (score >= 4) doc.setFillColor(greenColor[0], greenColor[1], greenColor[2]);
            else if (score === 3) doc.setFillColor(amberColor[0], amberColor[1], amberColor[2]);
            else doc.setFillColor(redColor[0], redColor[1], redColor[2]);
          } else {
            doc.setFillColor(226, 232, 240); // slate-200 (gray) background dot
          }
          doc.circle(startX + (i * spacing), startY, radius, 'F');
        }
      }
    }
  });

  // 5. Suggestions and Recommendations
  // @ts-ignore - jspdf-autotable adds lastAutoTable to doc
  const finalY = doc.lastAutoTable.finalY + 15;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(50, 50, 50);
  doc.text('Additional Feedback', 14, finalY);
  doc.line(14, finalY + 3, 196, finalY + 3);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Would Recommend to Others:', 14, finalY + 13);
  
  doc.setFont('helvetica', 'normal');
  const reco = feedback.recommendation;
  if (reco === 'Yes') doc.setTextColor(greenColor[0], greenColor[1], greenColor[2]);
  else if (reco === 'No') doc.setTextColor(redColor[0], redColor[1], redColor[2]);
  else doc.setTextColor(amberColor[0], amberColor[1], amberColor[2]);
  doc.text(reco, 75, finalY + 13);

  doc.setTextColor(50, 50, 50);
  doc.setFont('helvetica', 'bold');
  doc.text('Suggestions for Improvement:', 14, finalY + 23);
  
  doc.setFont('helvetica', 'normal');
  const suggestionText = feedback.suggestion || 'No additional suggestions provided.';
  
  // Word wrap for long suggestions
  const textLines = doc.splitTextToSize(suggestionText, 180);
  doc.text(textLines, 14, finalY + 31);


  // 6. Footer (Page numbers)
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text(
      'System Generated Report - Internal Use Only',
      105,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
    doc.text(
      `Page ${i} of ${pageCount}`,
      196,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'right' }
    );
  }

  // Download the PDF
  const filename = `Feedback_${feedback.companyName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
};
