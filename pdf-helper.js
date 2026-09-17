/**
 * Smart College Timetable Scheduler - PDF Helper
 * Handles HTML-to-PDF export using jsPDF and html2canvas.
 */

class PDFHelper {
  constructor() {
    // Check if libraries are loaded
    if (typeof window.jspdf === 'undefined' || typeof window.html2canvas === 'undefined') {
      console.error("jsPDF or html2canvas is not loaded. PDF export will not function.");
    }
  }

  /**
   * Helper to capture an element and add it to jsPDF.
   * Returns a promise resolving to the pdf instance.
   */
  async addElementToPDF(element, pdf, isNewPage = false) {
    if (isNewPage) {
      pdf.addPage();
    }

    // Set options for html2canvas
    const options = {
      scale: 2, // High resolution
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    };

    const canvas = await window.html2canvas(element, options);
    const imgData = canvas.toDataURL('image/jpeg', 0.95);

    // Calculate dimensions to fit A4 Landscape (297mm x 210mm)
    const pdfWidth = 297;
    const pdfHeight = 210;
    
    // Maintain aspect ratio
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const ratio = canvasHeight / canvasWidth;
    
    let imgWidth = pdfWidth - 20; // 10mm margins on sides
    let imgHeight = imgWidth * ratio;
    
    // Check if height exceeds page limits
    if (imgHeight > (pdfHeight - 20)) {
      imgHeight = pdfHeight - 20;
      imgWidth = imgHeight / ratio;
    }

    // Center image
    const x = (pdfWidth - imgWidth) / 2;
    const y = (pdfHeight - imgHeight) / 2;

    pdf.addImage(imgData, 'JPEG', x, y, imgWidth, imgHeight);
    return pdf;
  }

  /**
   * Export a single class timetable
   */
  async exportSingleTimetable(classId, semester, academicYear) {
    const element = document.getElementById('timetable-print-block');
    if (!element) return;

    // Show loading indicator or change cursor
    document.body.style.cursor = 'wait';
    const btn = document.getElementById('btn-download-pdf');
    const originalText = btn.innerHTML;
    btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Generating PDF...`;
    btn.disabled = true;

    try {
      // Create PDF in landscape mode, A4
      const { jsPDF } = window.jspdf;
      let pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      pdf = await this.addElementToPDF(element, pdf, false);

      const filename = `Timetable_${classId.replace(/[^a-zA-Z0-9]/g, '_')}_${academicYear}.pdf`;
      pdf.save(filename);
    } catch (err) {
      console.error("Failed to generate PDF:", err);
      alert("Error occurred while generating PDF. Please try again.");
    } finally {
      document.body.style.cursor = 'default';
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  }

  /**
   * Generate and export full report containing all 3 class timetables and the workload report.
   */
  async exportFullReport(semester, academicYear, faculties, subjects, assignments, timetableData) {
    if (!timetableData) {
      alert("No timetable data found. Please generate the timetable first.");
      return;
    }

    document.body.style.cursor = 'wait';
    const btn = document.getElementById('btn-download-all-pdf');
    const originalText = btn.innerHTML;
    btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Creating Report...`;
    btn.disabled = true;

    // Create temporary off-screen rendering nodes
    const tempContainer = document.getElementById('pdf-rendering-temp');
    tempContainer.innerHTML = '';
    tempContainer.style.width = '1000px'; // fixed width to guarantee nice canvas sizing

    try {
      const { jsPDF } = window.jspdf;
      let pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const classes = ['I B.Voc SD & SA', 'II B.Voc SD & SA', 'III B.Voc SD & SA'];
      
      // Step 1: Render and add each class timetable
      for (let i = 0; i < classes.length; i++) {
        const clsName = classes[i];
        
        // Create timetable element
        const pageEl = document.createElement('div');
        pageEl.className = 'print-container';
        pageEl.style.padding = '30px';
        pageEl.style.backgroundColor = '#ffffff';
        pageEl.style.marginBottom = '40px';
        
        // ERP Header
        pageEl.innerHTML = `
          <div class="erp-timetable-header">
            <div class="header-main-title">CLASS TIME TABLE</div>
            <div class="header-metadata-grid">
              <div><strong>Department:</strong> B.Voc Software Development and System Administration</div>
              <div><strong>Programme:</strong> B.Voc SD & SA</div>
              <div><strong>Semester:</strong> <span>${semester}</span></div>
              <div><strong>Academic Year:</strong> <span>${academicYear}</span></div>
              <div><strong>Class:</strong> <span>${clsName}</span></div>
            </div>
          </div>
          <table class="timetable-grid" style="width: 100%; border-collapse: collapse; border: 2px solid #334155;">
            <thead>
              <tr style="background-color: #475569; color: white;">
                <th style="border: 1px solid #94a3b8; padding: 10px;">Day Order</th>
                <th style="border: 1px solid #94a3b8; padding: 10px;">Period 1</th>
                <th style="border: 1px solid #94a3b8; padding: 10px;">Period 2</th>
                <th style="border: 1px solid #94a3b8; padding: 10px;">Period 3</th>
                <th style="border: 1px solid #94a3b8; padding: 10px; background-color: #cbd5e1; color: #475569; font-weight: 700;">BREAK</th>
                <th style="border: 1px solid #94a3b8; padding: 10px;">Period 4</th>
                <th style="border: 1px solid #94a3b8; padding: 10px;">Period 5</th>
              </tr>
            </thead>
            <tbody id="temp-grid-body-${i}"></tbody>
          </table>
        `;

        tempContainer.appendChild(pageEl);

        // Populate the timetable body
        const tbody = document.getElementById(`temp-grid-body-${i}`);
        const days = ['A', 'B', 'C', 'D', 'E', 'F'];
        const classTimetable = timetableData[clsName];

        for (let d = 0; d < days.length; d++) {
          const tr = document.createElement('tr');
          
          // Day Order
          const tdDay = document.createElement('td');
          tdDay.style.border = '1px solid #94a3b8';
          tdDay.style.padding = '10px';
          tdDay.style.fontWeight = '700';
          tdDay.style.textAlign = 'center';
          tdDay.textContent = `${days[d]} Day`;
          tr.appendChild(tdDay);

          // P1, P2, P3
          for (let p = 0; p < 3; p++) {
            const subCode = classTimetable[d][p];
            const td = this.createGridCellElement(subCode, subjects, assignments, faculties);
            tr.appendChild(td);
          }

          // BREAK
          const tdBreak = document.createElement('td');
          tdBreak.className = 'break-column';
          tdBreak.style.border = '1px solid #94a3b8';
          tdBreak.style.backgroundColor = '#e2e8f0';
          tdBreak.style.textAlign = 'center';
          tdBreak.style.fontWeight = '700';
          tdBreak.style.fontSize = '10px';
          tdBreak.textContent = 'B\nR\nE\nA\nK';
          tr.appendChild(tdBreak);

          // P4, P5
          for (let p = 3; p < 5; p++) {
            const subCode = classTimetable[d][p];
            const td = this.createGridCellElement(subCode, subjects, assignments, faculties);
            tr.appendChild(td);
          }

          tbody.appendChild(tr);
        }

        // Add page to PDF
        pdf = await this.addElementToPDF(pageEl, pdf, i > 0);
      }

      // Step 2: Render and add the Faculty Workload Report
      const wlPageEl = document.createElement('div');
      wlPageEl.className = 'print-container';
      wlPageEl.style.padding = '30px';
      wlPageEl.style.backgroundColor = '#ffffff';
      
      wlPageEl.innerHTML = `
        <div class="erp-timetable-header" style="border-color: #7c3aed; background-color: #faf5ff;">
          <div class="header-main-title" style="color: #7c3aed;">FACULTY WORKLOAD REPORT</div>
          <div class="header-metadata-grid">
            <div><strong>Department:</strong> B.Voc Software Development and System Administration</div>
            <div><strong>Programme:</strong> B.Voc SD & SA</div>
            <div><strong>Semester:</strong> <span>${semester}</span></div>
            <div><strong>Academic Year:</strong> <span>${academicYear}</span></div>
          </div>
        </div>
        <table style="width: 100%; border-collapse: collapse; border: 2px solid #7c3aed;">
          <thead>
            <tr style="background-color: #7c3aed; color: white; text-align: left;">
              <th style="border: 1px solid #c084fc; padding: 12px;">Faculty Code</th>
              <th style="border: 1px solid #c084fc; padding: 12px;">Faculty Name</th>
              <th style="border: 1px solid #c084fc; padding: 12px;">Assigned Subjects (Weekly target hours)</th>
              <th style="border: 1px solid #c084fc; padding: 12px; text-align: center;">Total Scheduled Weekly Hours</th>
              <th style="border: 1px solid #c084fc; padding: 12px; text-align: center;">Workload Status</th>
            </tr>
          </thead>
          <tbody id="temp-wl-body"></tbody>
        </table>
      `;

      tempContainer.appendChild(wlPageEl);
      
      // Calculate Workload Data
      const wlBody = document.getElementById('temp-wl-body');
      for (const fac of faculties) {
        let actualHrs = 0;
        for (const clsName in timetableData) {
          for (let d = 0; d < 6; d++) {
            for (let p = 0; p < 5; p++) {
              const subCode = timetableData[clsName][d][p];
              if (subCode) {
                const mappedFac = assignments[subCode];
                if (mappedFac === fac.code) {
                  actualHrs++;
                }
              }
            }
          }
        }

        // Get subjects assigned
        const facSubs = subjects.filter(s => assignments[s.code] === fac.code);
        const subjectsStr = facSubs.map(s => `${s.name} (${s.weeklyHours}h)`).join(', ') || 'None';

        const tr = document.createElement('tr');
        
        const tdCode = document.createElement('td');
        tdCode.style.border = '1px solid #e2e8f0';
        tdCode.style.padding = '12px';
        tdCode.style.fontWeight = '700';
        tdCode.textContent = fac.code;
        tr.appendChild(tdCode);

        const tdName = document.createElement('td');
        tdName.style.border = '1px solid #e2e8f0';
        tdName.style.padding = '12px';
        tdName.textContent = fac.name;
        tr.appendChild(tdName);

        const tdSubs = document.createElement('td');
        tdSubs.style.border = '1px solid #e2e8f0';
        tdSubs.style.padding = '12px';
        tdSubs.style.color = '#475569';
        tdSubs.textContent = subjectsStr;
        tr.appendChild(tdSubs);

        const tdHrs = document.createElement('td');
        tdHrs.style.border = '1px solid #e2e8f0';
        tdHrs.style.padding = '12px';
        tdHrs.style.textAlign = 'center';
        tdHrs.style.fontWeight = '700';
        tdHrs.textContent = `${actualHrs} Hours`;
        tr.appendChild(tdHrs);

        const tdStatus = document.createElement('td');
        tdStatus.style.border = '1px solid #e2e8f0';
        tdStatus.style.padding = '12px';
        tdStatus.style.textAlign = 'center';
        const isOver = actualHrs > 18;
        tdStatus.innerHTML = isOver 
          ? `<span style="background-color: #fee2e2; color: #b91c1c; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600;">HIGH WORKLOAD</span>` 
          : `<span style="background-color: #d1fae5; color: #065f46; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600;">BALANCED</span>`;
        tr.appendChild(tdStatus);

        wlBody.appendChild(tr);
      }

      // Add workload page to PDF
      pdf = await this.addElementToPDF(wlPageEl, pdf, true);

      // Save Report PDF
      pdf.save(`BVoc_Full_Timetable_Report_${academicYear}.pdf`);
    } catch (err) {
      console.error("Error creating full report PDF:", err);
      alert("An error occurred during report assembly: " + err.message);
    } finally {
      // Cleanup
      tempContainer.innerHTML = '';
      document.body.style.cursor = 'default';
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  }

  /**
   * Helper to create inline styled td element for temp table rendering
   */
  createGridCellElement(subCode, subjects, assignments, faculties) {
    const td = document.createElement('td');
    td.style.border = '1px solid #94a3b8';
    td.style.padding = '10px';
    td.style.textAlign = 'center';
    td.style.fontSize = '12px';

    if (!subCode) {
      td.innerHTML = `<span style="color: #cbd5e1; font-style: italic;">No Class</span>`;
      return td;
    }

    const sub = subjects.find(s => s.code === subCode);
    const facCode = assignments[subCode] || '';
    const fac = faculties.find(f => f.code === facCode);
    const facultyName = fac ? fac.name : facCode;

    const subjectName = sub ? sub.name : subCode;
    const subType = sub ? sub.type.toLowerCase() : '';

    let cellHTML = `
      <div style="font-weight: 700; color: #4f46e5; margin-bottom: 2px;">${subjectName}</div>
      <div style="font-size: 10px; color: #64748b; font-weight: 600;">[${subCode}] - ${facultyName}</div>
    `;

    if (subType === 'lab') {
      cellHTML += `<span style="display: inline-block; font-size: 9px; background-color: #ccfbf1; color: #0f766e; padding: 1px 4px; border-radius: 4px; margin-top: 4px; font-weight: 700;">LAB SESSION</span>`;
    }

    td.innerHTML = cellHTML;
    return td;
  }
}

// Export for browser
if (typeof window !== 'undefined') {
  window.PDFHelper = PDFHelper;
}
