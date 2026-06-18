// ==== Code.gs ====
// คำแนะนำ: นำโค้ดนี้ไปวางใน Google Apps Script (Extensions -> Apps Script จากหน้า Google Sheet)
// จากนั้นกด Deploy -> New deployment -> เลือก Web app -> Access: Anyone -> กด Deploy
// แล้วนำ Web app URL ที่ได้ไปใส่ในไฟล์ app.js ตัวแปร API_URL

const SPREADSHEET_ID = "18QUAMEGd4_runFgxfT8rXC0wTa205nCdCZ_Ho2bIsg4";

// รับ HTTP GET (สำหรับการดึงข้อมูลคลินิกทั้งหมด)
function doGet(e) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheets()[0]; // ดึงแท็บแรกสุดเสมอ ไม่ต้องกังวลเรื่องชื่อชีต
    if (!sheet) throw new Error("ไม่พบแท็บชีต");
    
    const data = sheet.getDataRange().getValues();
    const result = [];
    
    // วนลูปอ่านข้อมูลข้ามแถวแรก (Header)
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      // แมพคอลัมน์จาก Sheet ให้ตรงกับตัวแปร (เรียงตามลำดับคอลัมน์ใน Sheet)
      result.push({
        n: row[0],
        name: row[1],
        clinicCode: row[2],
        oldClinicCode: row[3],
        licensee: row[4],
        operator: row[5],
        licenseNum: row[6],
        licenseeCode: row[7],
        address: row[8],
        subdistrict: row[9],
        district: row[10],
        operatingHours: row[11],
        phone: row[12],
        wasteDisposal: row[13],
        expiryDate: row[14],
        currentExpiry: row[15],
        notes: row[16],
        equipment: row[17],
        coordinates: row[18]
      });
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success", data: result }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// รับ HTTP POST (สำหรับการเพิ่มหรืออัปเดตข้อมูล)
function doPost(e) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheets()[0];
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action; // 'add' หรือ 'edit'
    const d = payload.data;
    
    // สร้าง Array ข้อมูลสำหรับ 1 แถว (เรียงตามคอลัมน์ใน Sheet)
    const rowData = [
      "", // n (ควรจะมีระบบรันเลข หรือเว้นไว้)
      d.name,
      d.clinicCode,
      d.oldClinicCode,
      d.licensee,
      d.operator,
      d.licenseNum,
      d.licenseeCode,
      d.address,
      d.subdistrict,
      d.district,
      d.operatingHours,
      d.phone,
      d.wasteDisposal,
      d.expiryDate,
      d.currentExpiry,
      d.notes,
      d.equipment || "",
      d.coordinates
    ];

    if (action === 'edit' && payload.rowIndex) {
      // อัปเดตข้อมูลแถวเดิม (rowIndex ได้มาจากหน้าเว็บ)
      sheet.getRange(payload.rowIndex, 1, 1, rowData.length).setValues([rowData]);
    } else {
      // เพิ่มข้อมูลแถวใหม่ (n = ลำดับสุดท้าย + 1)
      const lastRow = sheet.getLastRow();
      rowData[0] = lastRow; // เซ็ตเลขลำดับ n
      sheet.appendRow(rowData);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// อนุญาตให้ยิง request ข้ามโดเมนได้ (CORS) สำหรับ Web app
function doOptions(e) {
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader("Access-Control-Allow-Origin", "*")
    .setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    .setHeader("Access-Control-Allow-Headers", "Content-Type");
}
