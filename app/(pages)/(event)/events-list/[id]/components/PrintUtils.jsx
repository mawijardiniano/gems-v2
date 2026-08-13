"use client";

export function buildGuestRows(guests, extractGuestDetails, capitalizeName) {
  const sorted = [...guests].sort((a, b) => {
    const detailsA = extractGuestDetails(a);
    const detailsB = extractGuestDetails(b);
    const nameA = (detailsA.name || "").toLowerCase();
    const nameB = (detailsB.name || "").toLowerCase();
    if (nameA < nameB) return -1;
    if (nameA > nameB) return 1;
    return 0;
  });
  let rowIdx = 1;
  const rows = [];
  sorted.forEach((g) => {
    const details = extractGuestDetails(g);
    rows.push({
      isDepartmentHeader: false,
      data: [
        rowIdx++,
        capitalizeName(details.name),
        details.sex || "",
        details.genderPreference || "",
        details.age ?? "",
        details.status,
        details.department,
        details.positionDesignation || "",
        details.programYearSection || "",
        details.contact,
        details.email,
        "",
      ],
    });
  });
  return rows;
}

export function handlePrintGuests(guests, event, buildRows) {
  if (typeof window === "undefined") return;

  const rows = buildRows(guests)
    .map((row) => {
      if (row.isDepartmentHeader) {
        return `<tr><td colspan="12" style="background:#e6f0fa;font-weight:bold;text-align:left;padding:6px 10px;font-size:13px;border:1px solid #ccc;">${row.department}</td></tr>`;
      } else {
        return `<tr>${row.data
          .map(
            (cell) =>
              `<td style="border: 1px solid #ccc; padding:5px 6px; text-align: center; font-size: 11px; word-wrap: break-word; word-break: break-word; overflow-wrap: break-word;">${cell === undefined ? "" : cell}</td>`,
          )
          .join("")}</tr>`;
      }
    })
    .join("");

  const dateLabel = (event.start_dates || [])
    .map((d, i) => {
      const start = new Date(d).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      const end = event.end_dates?.[i]
        ? new Date(event.end_dates[i]).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : null;
      return end && end !== start ? `Day ${i + 1}: ${start} - ${end}` : `Day ${i + 1}: ${start}`;
    })
    .join(", ");

  const ACTIVITY_TYPES = [
    "Academic",
    "Administrative",
    "GAD",
    "Extension Research",
    "Students",
    "Others",
  ];

  const selectedType = event.type_of_activity;

  const typeOfActivityHTML = ACTIVITY_TYPES.map((type) => {
    const checked = type === selectedType ? "☑" : "☐";
    return `<span class="checkbox-item">${checked} ${type}</span>`;
  }).join("");

  const html = `<!DOCTYPE html>
<html>
<head>
  <title>${event.title || "Guest List"}</title>
  <style>
    @page { size: landscape; margin: 8mm; }
    body {
      font-family: Arial, sans-serif;
      padding: 0;
      margin: 0;
      color: #111;
    }
    h3 { margin: 0 0 6px; text-align: center; }
    h4 { margin: 2px 0; font-weight: 500; font-size: 12px; }
    .checkbox-item { display: inline-block; gap: 20px; font-size: 11px; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    th, td { word-wrap: break-word; word-break: break-word; overflow-wrap: break-word; }
  </style>
</head>
<body>
  <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; align-items: center; justify-items: center; margin-bottom: 2px; margin-top: 0;">
    <div style="display: flex; align-items: center; justify-content: center; height: 100%; width: 100%;">
      <img src="/getThemePhoto.png" alt="MarSULogo" width="70" style="display: block; margin: 4px auto;" />
    </div>
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; width: 100%;">
      <h2 style="margin: 0; font-size:15px; font-weight: bold; letter-spacing: 2px;">MARINDUQUE STATE UNIVERSITY</h2>
      <h3 style="margin: 0; font-weight: 400; font-size:13px;">Gender and Development Unit</h3>
    </div>
    <div></div>
  </div>
  <h3 style="margin: 0; font-weight: bold; text-align: center; font-size:14px;">UNIVERSITY ACTIVITY ATTENDANCE SHEET</h3>
  <div style="margin-left: 30px; margin-top: 4px;">
    <h4 style="font-weight: bold; font-size:12px;">I.<b style="margin-left: 20px;">Activity Information</b></h4>
    <div style="margin-left: 20px;">
      <h4 style="font-size:11px;"><span style="font-weight: bold;">Activity Title:</span> ${event.title || "Guest List"}</h4>
      <h4 style="font-size:11px;"><span style="font-weight: bold;">Type of Activity:</span> ${typeOfActivityHTML}</h4>
      <h4 style="font-size:11px;"><span style="font-weight: bold;">Date:</span>${dateLabel}</h4>
      <h4 style="font-size:11px;"><span style="font-weight: bold;">Venue:</span> ${event.venue || ""}</h4>
      <h4 style="font-size:11px;"><span style="font-weight: bold;">Organizing Office/Unit:</span> ${event.organizing_office_unit || ""}</h4>
    </div>
    <h4 style="margin:8px 0px 10px 0px; font-weight: bold; font-size:12px;">II.<b style="margin-left: 20px;">Participating Attendance</b></h4>
  </div>
  <table style="width: 100%; border-collapse: collapse; margin-top: 4px; border: 1px solid #ccc; table-layout: fixed;">
    <thead>
      <tr>
        <th style="border: 1px solid #ccc; padding: 5px 4px; text-align: center; font-size: 10px; background: #f5f5f5; width: 2%;">No.</th>
        <th style="border: 1px solid #ccc; padding: 5px 4px; text-align: center; font-size: 10px; background: #f5f5f5; width: 15%;">Full Name</th>
        <th style="border: 1px solid #ccc; padding: 5px 4px; text-align: center; font-size: 10px; background: #f5f5f5; width: 6%;">Sex</th>
        <th style="border: 1px solid #ccc; padding: 5px 4px; text-align: center; font-size: 10px; background: #f5f5f5; width: 6%;">Gender <br/> Identity</th>
        <th style="border: 1px solid #ccc; padding: 5px 4px; text-align: center; font-size: 10px; background: #f5f5f5; width: 2%;">Age</th>
        <th style="border: 1px solid #ccc; padding: 5px 4px; text-align: center; font-size: 10px; background: #f5f5f5; width: 7%;">Participant <br/> Type</th>
        <th style="border: 1px solid #ccc; padding: 5px 4px; text-align: center; font-size: 10px; background: #f5f5f5; width: 9%;">Department /<br/> Office /<br/> Organization</th>
        <th style="border: 1px solid #ccc; padding: 5px 4px; text-align: center; font-size: 10px; background: #f5f5f5; width: 12%;">Position /<br/> Designation <br/> (Employee/<br/>Stakeholders)</th>
        <th style="border: 1px solid #ccc; padding: 5px 4px; text-align: center; font-size: 10px; background: #f5f5f5; width: 12%;">Program / Year /<br/> Section <br/> (For Students)</th>
        <th style="border: 1px solid #ccc; padding: 5px 4px; text-align: center; font-size: 10px; background: #f5f5f5; width: 9%;">Contact No.</th>
        <th style="border: 1px solid #ccc; padding: 5px 4px; text-align: center; font-size: 10px; background: #f5f5f5; width: 12%;">Email Address</th>
        <th style="border: 1px solid #ccc; padding: 5px 4px; text-align: center; font-size: 10px; background: #f5f5f5; width: 8%;">Signature</th>
      </tr>
    </thead>
    <tbody>
      ${rows || '<tr><td colspan="12" style="border: 1px solid #ccc; padding: 6px; text-align: center; font-size: 12px;">No guests registered yet.</td></tr>'}
    </tbody>
  </table>
</body>
</html>`;

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const frameDoc = iframe.contentWindow?.document;
  if (!frameDoc) return;

  frameDoc.open();
  frameDoc.write(html);
  frameDoc.close();

  iframe.onload = () => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
  };
}

export function handleDownloadGuestsPdf(guests, event, buildRows) {
  if (typeof window === "undefined") return;

  const rows = buildRows(guests);

  const tableBody = rows.map((row) => {
    if (row.isDepartmentHeader) {
      return [
        {
          colSpan: 12,
          content: row.department || "",
          styles: {
            fontStyle: "bold",
            fillColor: [230, 240, 250],
            textColor: [17, 17, 17],
          },
        },
      ];
    }
    return row.data.map((cell) => (cell === undefined ? "" : String(cell)));
  });

  const dateLabel = (event.start_dates || [])
    .map((d, i) => {
      const start = new Date(d).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      const end = event.end_dates?.[i]
        ? new Date(event.end_dates[i]).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : null;
      return end && end !== start
        ? `Day ${i + 1}: ${start} - ${end}`
        : `Day ${i + 1}: ${start}`;
    })
    .join(", ");

  const ACTIVITY_TYPES = [
    "Academic",
    "Administrative",
    "GAD",
    "Extension Research",
    "Students",
    "Others",
  ];

  const selectedType = event.type_of_activity;

  // Use [X]/[ ] instead of ☑/☐ because jsPDF's built-in WinAnsi
  // fonts cannot render ☑/☐ characters.
  const typeOfActivityText = ACTIVITY_TYPES.map((type) => {
    const checked = type === selectedType ? "[X]" : "[ ]";
    return `${checked} ${type}`;
  }).join("   ");

  // Preload the university logo as a data URL so it can be embedded.
  const logoPromise = new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = "/getThemePhoto.png";
  });

  Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
    logoPromise,
  ])
    .then(([{ jsPDF }, autoTableModule, logoDataUrl]) => {
      const autoTable = autoTableModule.default;
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "legal",
      });

      const pageWidth = pdf.internal.pageSize.getWidth(); // ~356mm
      const margin = 8;
      let y = margin;

      if (logoDataUrl) {
        const logoWidth = 26;
        const leftThirdWidth = pageWidth / 3;
        const logoX = (leftThirdWidth - logoWidth) / 2;
        pdf.addImage(logoDataUrl, "PNG", logoX, y, logoWidth, 26);
      }


      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(14);
      pdf.text("MARINDUQUE STATE UNIVERSITY", pageWidth / 2, y + 10, {
        align: "center",
      });

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(11);
      pdf.text("Gender and Development Unit", pageWidth / 2, y + 17, {
        align: "center",
      });

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(13);
      pdf.text("UNIVERSITY ACTIVITY ATTENDANCE SHEET", pageWidth / 2, y + 26, {
        align: "center",
      });

      y += 34;

      pdf.setFontSize(10);
      pdf.text("I.  Activity Information", margin + 3, y);
      y += 5;

      const infoLines = [
        { label: "Activity Title:", value: event.title || "Guest List" },
        { label: "Type of Activity:", value: typeOfActivityText },
        { label: "Date:", value: dateLabel },
        { label: "Venue:", value: event.venue || "" },
        {
          label: "Organizing Office/Unit:",
          value: event.organizing_office_unit || "",
        },
      ];

      infoLines.forEach((line) => {
        pdf.setFont("helvetica", "bold");
        pdf.text(line.label, margin + 8, y);
        const labelWidth = pdf.getTextWidth(line.label);
        pdf.setFont("helvetica", "normal");
        const valueX = margin + 8 + labelWidth + 2;
        const maxTextWidth = pageWidth - margin - valueX - 5;
        const wrapped = pdf.splitTextToSize(line.value || "", maxTextWidth);
        pdf.text(wrapped, valueX, y);
        y += 5;
      });

      y += 2;
      pdf.setFont("helvetica", "bold");
      pdf.text("II.  Participating Attendance", margin + 3, y);
      y += 4;


      autoTable(pdf, {
        startY: y,
        head: [
          [
            "No.",
            "Full Name",
            "Sex",
            "Gender\nIdentity",
            "Age",
            "Participant\nType",
            "Department /\nOffice /\nOrganization",
            "Position /\nDesignation\n(Employee/\nStakeholders)",
            "Program / Year /\nSection\n(For Students)",
            "Contact\nNo.",
            "Email\nAddress",
            "Signature",
          ],
        ],
        body: tableBody,
        theme: "grid",
        styles: {
          fontSize: 7,
          cellPadding: 1.5,
          valign: "middle",
          halign: "center",
          lineColor: [180, 180, 180],
          lineWidth: 0.15,
          textColor: [17, 17, 17],
        },
        headStyles: {
          fillColor: [240, 240, 240],
          textColor: [17, 17, 17],
          fontStyle: "bold",
          halign: "center",
          valign: "middle",
        },
        columnStyles: {
          0: { cellWidth: 8 },
          1: { cellWidth: 50 },
          2: { cellWidth: 20 },
          3: { cellWidth: 20 },
          4: { cellWidth: 8 },
          5: { cellWidth: 25 },
          6: { cellWidth: 30 },
          7: { cellWidth: 40 },
          8: { cellWidth: 42 },
          9: { cellWidth: 30 },
          10: { cellWidth: 42 },
          11: { cellWidth: 25 },
        },
        margin: { left: margin, right: margin },
      });

      pdf.save(`${event.title || "guest-list"}-guests.pdf`);
    })
    .catch((err) => {
      console.error("PDF export failed", err);
      alert("Unable to generate PDF. Please try again.");
    });
}

export function handleDownloadBlankGuestsPdf(event) {
  if (typeof window === "undefined") return;

  const blankRowHtml = () =>
    `<tr>
  <td style="border: 1px solid #ccc; padding:10px; text-align: center; font-size: 12px; width: 5%;"></td>
  <td style="border: 1px solid #ccc; padding:10px; text-align: center; font-size: 12px; width: 22%;"></td>
  <td style="border: 1px solid #ccc; padding:10px; text-align: left; font-size: 12px; width: 6%;">[ ] Male<br/>[ ] Female</td>
  <td style="border: 1px solid #ccc; padding:10px; text-align: left; font-size: 12px; width: 8%;">[ ] Male<br/>[ ] Female<br/>[ ] LGBTQIA+</td>
  <td style="border: 1px solid #ccc; padding:10px; text-align: center; font-size: 12px; width: 4%;"></td>
  <td style="border: 1px solid #ccc; padding:10px; text-align: left; font-size: 12px; width: 8%;">[ ] Student<br/>[ ] Employee<br/>[ ] Stakeholder</td>
  <td style="border: 1px solid #ccc; padding:10px; text-align: center; font-size: 12px; width: 10%;"></td>
  <td style="border: 1px solid #ccc; padding:10px; text-align: center; font-size: 12px; width: 10%;"></td>
  <td style="border: 1px solid #ccc; padding:10px; text-align: center; font-size: 12px; width: 10%;"></td>
  <td style="border: 1px solid #ccc; padding:10px; text-align: center; font-size: 12px; width: 10%;"></td>
  <td style="border: 1px solid #ccc; padding:10px; text-align: center; font-size: 12px; width: 14%;"></td>
</tr>`;

  const blankRowsFirst = Array.from({ length: 5 }, blankRowHtml).join("");
  const blankRowsSecond = Array.from({ length: 9 }, blankRowHtml).join("");

  const tableHeader = `
<thead>
  <tr>
    <th style="border: 1px solid #ccc; padding: 6px; text-align: center; font-size: 12px; background: #f5f5f5; width: 5%;">No.</th>
    <th style="border: 1px solid #ccc; padding: 6px; text-align: center; font-size: 12px; background: #f5f5f5; width: 22%;">Full Name</th>
    <th style="border: 1px solid #ccc; padding: 6px; text-align: center; font-size: 12px; background: #f5f5f5; width: 6%;">Sex</th>
    <th style="border: 1px solid #ccc; padding: 6px; text-align: center; font-size: 12px; background: #f5f5f5; width: 8%;">Gender <br/> Identity</th>
    <th style="border: 1px solid #ccc; padding: 6px; text-align: center; font-size: 12px; background: #f5f5f5; width: 4%;">Age</th>
    <th style="border: 1px solid #ccc; padding: 6px; text-align: center; font-size: 12px; background: #f5f5f5; width: 8%;">Participant Type</th>
    <th style="border: 1px solid #ccc; padding: 6px; text-align: center; font-size: 12px; background: #f5f5f5; width: 10%;">Department / <br/>Office /<br/> Organization</th>
    <th style="border: 1px solid #ccc; padding: 6px; text-align: center; font-size: 12px; background: #f5f5f5; width: 10%;">Position /<br/> Designation <br/>(Employee/<br/>Stakeholders)</th>
    <th style="border: 1px solid #ccc; padding: 6px; text-align: center; font-size: 12px; background: #f5f5f5; width: 10%;">Program / Year / <br/> Section (For Student)</th>
    <th style="border: 1px solid #ccc; padding: 6px; text-align: center; font-size: 12px; background: #f5f5f5; width: 10%;">Contact No.</th>
    <th style="border: 1px solid #ccc; padding: 6px; text-align: center; font-size: 12px; background: #f5f5f5; width: 14%;">Signature</th>
  </tr>
</thead>
`;

  const dateLabel = (event.start_dates || [])
    .map((d, i) => {
      const start = new Date(d).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      const end = event.end_dates?.[i]
        ? new Date(event.end_dates[i]).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : null;
      return end && end !== start
        ? `Day ${i + 1}: ${start} - ${end}`
        : `Day ${i + 1}: ${start}`;
    })
    .join(", ");

  const ACTIVITY_TYPES = [
    "Academic",
    "Administrative",
    "GAD",
    "Extension Research",
    "Students",
    "Others",
  ];

  const selectedType = event.type_of_activity;

  const typeOfActivityHTML = ACTIVITY_TYPES.map((type) => {
    const checked = type === selectedType ? "☑" : "☐";
    return `<span class="checkbox-item">${checked} ${type}</span>`;
  }).join("");

  let tablesHtml = "";
  tablesHtml += `<table style="width: 100%; border-collapse: collapse; margin-top: 10px; border: 1px solid #ccc; page-break-after: always;">${tableHeader}<tbody>${blankRowsFirst}</tbody></table>`;
  tablesHtml += `<table style="width: 100%; border-collapse: collapse; margin-top: 10px; border: 1px solid #ccc;">${tableHeader}<tbody>${blankRowsSecond}</tbody></table>`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <title>${event.title || "Guest List"}</title>
  <style>
    @page { size: landscape; }
    body { font-family: Arial, sans-serif; padding: 24px; margin: 0; color: #111; }
    h3 { margin: 0 0 10px; text-align: center; }
    h4 { margin: 4px 0; font-weight: 500; }
    .checkbox-item { display: inline-block; gap: 30px; }
  </style>
</head>
<body>
<div style="display: grid; grid-template-columns: 1fr 1fr 1fr; align-items: center; justify-items: center; margin-bottom: 4px; margin-top: 0;">
  <div style="display: flex; align-items: center; justify-content: center; height: 100%; width: 100%;">
    <img src="/getThemePhoto.png" alt="MarSULogo" width="100" style="display: block; margin: 10px auto;" />
  </div>
  <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; width: 100%;">
    <h1 style="margin: 0; font-weight: bold; letter-spacing: 2px;">MARINDUQUE STATE UNIVERSITY</h1>
    <h3 style="margin: 0; font-weight: 400;">Gender and Development Unit</h3>
  </div>
  <div></div>
</div>
  <h3 style="margin: 0; font-weight: bold; text-align: center;">UNIVERSITY ACTIVITY ATTENDANCE SHEET</h3>
  <div style="margin-left: 50px;">
    <h4 style="font-weight: bold;">I.<b style="margin-left: 20px;">Activity Information</b></h4>
    <div style="margin-left: 30px;">
      <h4><span style="font-weight: bold;">Activity Title:</span> ${event.title || "Guest List"}</h4>
      <h4><span style="font-weight: bold;">Type of Activity:</span> ${typeOfActivityHTML}</h4>
      <h4><span style="font-weight: bold;">Date:</span>${dateLabel}</h4>
      <h4><span style="font-weight: bold;">Venue:</span> ${event.venue || ""}</h4>
      <h4><span style="font-weight: bold;">Organizing Office/Unit:</span> ${event.organizing_office_unit || ""}</h4>
    </div>
    <h4 style="margin:12px 0px 24px 0px; font-weight: bold;">II.<b style="margin-left: 20px;">Participating Attendance</b></h4>
  </div>
  ${tablesHtml}
</body>
</html>`;

  import("html2pdf.js")
    .then((html2pdf) => {
      html2pdf
        .default()
        .from(html)
        .set({
          margin: 0,
          filename: `${event.title || "guest-list"}-guests.pdf`,
          html2canvas: { scale: 2 },
          jsPDF: { orientation: "landscape", unit: "mm", format: "legal" },
        })
        .save();
    })
    .catch((err) => {
      console.error("PDF export failed", err);
      alert("Unable to generate PDF. Please try again.");
    });
}