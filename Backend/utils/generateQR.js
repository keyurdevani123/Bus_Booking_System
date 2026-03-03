const fs = require("fs");
const path = require("path");
const QRCode = require("qrcode");
const PDFDocument = require("pdfkit");

function generateQRCodeAndPDF(
  id,
  phone,
  randomNumber,
  email,
  departure,
  arrival,
  departure_time,
  arrival_time,
  arrivalDate,
  Date,
  bus_number,
  routenumber,
  price,
  seatNumbers,
  tempBookId
) {
  // QR encodes concise verifiable booking info
  const qrCodeData = [
    `ID:${id}`,
    `REF:${randomNumber}`,
    `${departure}→${arrival}`,
    `DATE:${Date}`,
    `DEP:${departure_time} ARR:${arrival_time}`,
    `SEATS:${seatNumbers}`,
    `BUS:${bus_number}`,
    `FARE:Rs.${price}`,
  ].join("\n");
  const qrPath = "/tmp/qrcode.png";
  const pdfPath = `/tmp/${tempBookId}.pdf`;

  return new Promise((resolve, reject) => {
    QRCode.toFile(qrPath, qrCodeData, { width: 150, margin: 1 }, function (err) {
      if (err) return reject(err);

      const doc = new PDFDocument({ size: "A4", margin: 0 });
      const stream = fs.createWriteStream(pdfPath);
      doc.pipe(stream);

      const W = doc.page.width;   // 595
      const pad = 40;

      // ── Header banner ──────────────────────────────────────────────────────
      doc.rect(0, 0, W, 72).fill("#000991");
      doc
        .font("Helvetica-Bold")
        .fontSize(22)
        .fillColor("#FFFFFF")
        .text("BusBazaar Travel Pass", pad, 18, { width: W - pad * 2, align: "center" });
      doc
        .fontSize(11)
        .fillColor("rgba(255,255,255,0.75)")
        .text("Keep this ticket safe – show QR at boarding", pad, 46, { width: W - pad * 2, align: "center" });

      // ── Border box ─────────────────────────────────────────────────────────
      doc.rect(pad, 88, W - pad * 2, 380).lineWidth(1.5).strokeColor("#FF7F3E").stroke();

      // ── QR code (right side) ───────────────────────────────────────────────
      doc.image(qrPath, W - pad - 145, 100, { width: 135 });
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("#555")
        .text("Scan at boarding", W - pad - 145, 238, { width: 135, align: "center" });

      // ── Section: Passenger ────────────────────────────────────────────────
      const lx = pad + 12;  // label x
      const vx = lx + 110;  // value x
      let y = 108;

      const row = (label, value, yPos) => {
        doc.font("Helvetica").fontSize(11).fillColor("#888").text(label, lx, yPos);
        doc.font("Helvetica-Bold").fontSize(11).fillColor("#111").text(String(value), vx, yPos);
      };

      doc.font("Helvetica-Bold").fontSize(10).fillColor("#000991").text("PASSENGER DETAILS", lx, y);
      y += 16;
      doc.moveTo(lx, y).lineTo(W / 2 - 10, y).lineWidth(0.5).strokeColor("#ddd").stroke();
      y += 8;

      row("Booking ID:",  id,    y); y += 20;
      row("Email:",       email, y); y += 20;
      row("Phone:",       phone, y); y += 20;
      row("Seat(s):",     seatNumbers, y); y += 20;
      row("Bus No.:",     bus_number,  y); y += 20;
      row("Route:",       routenumber, y); y += 20;

      // ── Divider ────────────────────────────────────────────────────────────
      y += 6;
      doc.moveTo(pad + 12, y).lineTo(W - pad - 12, y).lineWidth(1).strokeColor("#000991").stroke();
      y += 12;

      // ── Section: Journey ──────────────────────────────────────────────────
      doc.font("Helvetica-Bold").fontSize(10).fillColor("#000991").text("JOURNEY DETAILS", lx, y);
      y += 16;
      doc.moveTo(lx, y).lineTo(W - pad - 12, y).lineWidth(0.5).strokeColor("#ddd").stroke();
      y += 8;

      // Two-column layout for journey info
      const colA_label = lx;
      const colA_val   = lx + 100;
      const colB_label = W / 2 + 10;
      const colB_val   = colB_label + 100;

      const dualRow = (l1, v1, l2, v2, yPos) => {
        doc.font("Helvetica").fontSize(11).fillColor("#888");
        doc.text(l1, colA_label, yPos); doc.text(l2, colB_label, yPos);
        doc.font("Helvetica-Bold").fontSize(11).fillColor("#111");
        doc.text(String(v1), colA_val, yPos); doc.text(String(v2), colB_val, yPos);
      };

      dualRow("From:",           departure,      "To:",          arrival,     y); y += 22;
      dualRow("Dep. Date:",      Date,            "Arr. Date:",    arrivalDate, y); y += 22;
      dualRow("Dep. Time:",      departure_time,  "Arr. Time:",   arrival_time, y); y += 22;

      // ── Price banner ───────────────────────────────────────────────────────
      y += 8;
      doc.rect(pad + 12, y, W - pad * 2 - 24, 32).fill("#000991");
      doc
        .font("Helvetica-Bold").fontSize(14).fillColor("#FFFFFF")
        .text(`Total Fare: Rs. ${price}.00`, pad + 12, y + 9, { width: W - pad * 2 - 24, align: "center" });

      // ── Footer ─────────────────────────────────────────────────────────────
      y += 50;
      doc
        .font("Helvetica").fontSize(9).fillColor("#aaa")
        .text("This is a computer-generated ticket and does not require a signature.", pad, y, { width: W - pad * 2, align: "center" });

      doc.end();

      stream.on("finish", () => {
        console.log("PDF generated:", pdfPath);
        resolve(pdfPath);
      });
      stream.on("error", reject);
    });
  });
}

module.exports = generateQRCodeAndPDF;
