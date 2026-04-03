import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function generateMarksPDF(
  title: string,
  marks: Array<{
    studentName: string;
    regNo: string;
    subject: string;
    obtained: number;
    max: number;
  }>
) {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.setTextColor(30, 64, 175);
  doc.text(title, 14, 22);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);

  const rows = marks.map(m => [
    m.studentName,
    m.regNo,
    m.subject,
    `${m.obtained}/${m.max}`,
    `${Math.round((m.obtained / m.max) * 100)}%`,
    (m.obtained / m.max) * 100 >= 40 ? 'Pass' : 'Fail',
  ]);

  autoTable(doc, {
    startY: 36,
    head: [['Student', 'Reg No', 'Subject', 'Marks', '%', 'Status']],
    body: rows,
    theme: 'striped',
    headStyles: { fillColor: [30, 64, 175] },
  });

  // Summary
  const total = marks.length;
  const avg = total > 0 ? Math.round(marks.reduce((s, m) => s + (m.obtained / m.max) * 100, 0) / total) : 0;
  const passCount = marks.filter(m => (m.obtained / m.max) * 100 >= 40).length;

  const finalY = (doc as any).lastAutoTable?.finalY ?? 100;
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text(`Summary: ${total} students | Avg: ${avg}% | Pass: ${passCount}/${total}`, 14, finalY + 12);

  return doc;
}

export function generateCSV(
  marks: Array<{ studentName: string; regNo: string; subject: string; obtained: number; max: number }>
): string {
  const header = 'Student,Reg No,Subject,Marks Obtained,Max Marks,Percentage,Status\n';
  const rows = marks.map(m => {
    const pct = Math.round((m.obtained / m.max) * 100);
    return `"${m.studentName}","${m.regNo}","${m.subject}",${m.obtained},${m.max},${pct}%,${pct >= 40 ? 'Pass' : 'Fail'}`;
  }).join('\n');
  return header + rows;
}
