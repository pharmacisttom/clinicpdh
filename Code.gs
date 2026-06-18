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
        coordinates: row[18],
        photoUrl: row[19] || ""
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
    const action = payload.action; // 'add', 'edit', 'login'
    
    // ==========================================
    // ACTION: LOGIN
    // ==========================================
    if (action === 'login') {
      const usersSheet = ss.getSheetByName("Users");
      if (!usersSheet) {
        return ContentService.createTextOutput(JSON.stringify({ success: false, message: "ไม่พบแท็บ Users ในระบบ" })).setMimeType(ContentService.MimeType.JSON);
      }
      
      const usersData = usersSheet.getDataRange().getValues();
      for (let i = 1; i < usersData.length; i++) {
        const row = usersData[i];
        if (row[0] == payload.username && row[1] == payload.password) {
          try {
            const logsSheet = ss.getSheetByName("Logs");
            if (logsSheet) logsSheet.appendRow([new Date(), payload.username, "เข้าสู่ระบบ", "สำเร็จ"]);
          } catch(e) {}
          
          return ContentService.createTextOutput(JSON.stringify({
            success: true,
            user: { username: row[0], role: row[2], name: row[3] }
          })).setMimeType(ContentService.MimeType.JSON);
        }
      }
      
      try {
        const logsSheet = ss.getSheetByName("Logs");
        if (logsSheet) logsSheet.appendRow([new Date(), payload.username, "พยายามเข้าสู่ระบบ", "รหัสผ่านผิดพลาด"]);
      } catch(e) {}
      
      return ContentService.createTextOutput(JSON.stringify({ success: false, message: "Username หรือ Password ไม่ถูกต้อง" })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // ==========================================
    // ACTION: ADD / EDIT
    // ==========================================
    const d = payload.data;
    let photoUrl = "";
    
    // ถ้าเป็นการแก้ไข ให้ดึงรูปลิงก์เดิมมาก่อน
    if (action === 'edit' && payload.rowIndex) {
       photoUrl = sheet.getRange(payload.rowIndex, 20).getValue();
    }

    if (payload.photos && payload.photos.length > 0) {
      const folderName = "Clinic_Photos";
      const folders = DriveApp.getFoldersByName(folderName);
      let folder;
      if (folders.hasNext()) {
        folder = folders.next();
      } else {
        folder = DriveApp.createFolder(folderName);
      }
      
      let newUrls = [];
      for (let i = 0; i < payload.photos.length; i++) {
        const photo = payload.photos[i];
        if (photo && photo.data) {
          const blob = Utilities.newBlob(Utilities.base64Decode(photo.data), photo.mimeType, "Clinic_" + new Date().getTime() + "_" + i + ".jpg");
          const file = folder.createFile(blob);
          file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          newUrls.push(file.getUrl());
        }
      }
      
      if (newUrls.length > 0) {
        if (photoUrl && photoUrl.toString().trim() !== "") {
          photoUrl = photoUrl + "," + newUrls.join(",");
        } else {
          photoUrl = newUrls.join(",");
        }
      }
    }
    
    const rowData = [
      "",
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
      d.coordinates,
      photoUrl
    ];

    if (action === 'edit' && payload.rowIndex) {
      sheet.getRange(payload.rowIndex, 1, 1, rowData.length).setValues([rowData]);
    } else if (action === 'add') {
      const lastRow = sheet.getLastRow();
      rowData[0] = lastRow;
      sheet.appendRow(rowData);
    }
    
    try {
      const logsSheet = ss.getSheetByName("Logs");
      if (logsSheet) {
        const logAction = (action === 'edit') ? "แก้ไขข้อมูล" : "เพิ่มข้อมูลใหม่";
        const details = "คลินิก: " + d.name;
        logsSheet.appendRow([new Date(), payload.username || "Unknown", logAction, details]);
      }
    } catch(err) {}
    
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
