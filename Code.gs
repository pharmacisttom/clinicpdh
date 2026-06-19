// ==== Code.gs ====
// คำแนะนำ: นำโค้ดนี้ไปวางใน Google Apps Script (Extensions -> Apps Script จากหน้า Google Sheet)
// จากนั้นกด Deploy -> New deployment -> เลือก Web app -> Access: Anyone -> กด Deploy
// แล้วนำ Web app URL ที่ได้ไปใส่ในไฟล์ app.js ตัวแปร API_URL

const SPREADSHEET_ID = "18QUAMEGd4_runFgxfT8rXC0wTa205nCdCZ_Ho2bIsg4";

// รับ HTTP GET (ดึงข้อมูลทุกแท็บแบบ Dynamic)
function doGet(e) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const allSheets = ss.getSheets();
    const result = {};
    
    for (let s = 0; s < allSheets.length; s++) {
      const sheetName = allSheets[s].getName();
      if (sheetName === 'Users' || sheetName === 'Logs') continue;
      
      const data = allSheets[s].getDataRange().getValues();
      if (data.length === 0) continue;
      
      const headers = data[0];
      const rows = [];
      
      for (let i = 1; i < data.length; i++) {
        const rowData = {};
        for (let j = 0; j < headers.length; j++) {
          const key = headers[j] ? headers[j].toString().trim() : ("Column" + j);
          rowData[key] = data[i][j] !== undefined ? data[i][j] : "";
        }
        rowData['_rowIndex'] = i + 1; // เก็บหมายเลขแถวสำหรับการ Edit
        rows.push(rowData);
      }
      
      result[sheetName] = {
        headers: headers.map((h, i) => h ? h.toString().trim() : ("Column" + i)),
        rows: rows
      };
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
            status: 'success',
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
    const targetSheetName = payload.sheetName;
    if (!targetSheetName) throw new Error("ไม่พบข้อมูล sheetName");
    
    const targetSheet = ss.getSheetByName(targetSheetName);
    if (!targetSheet) throw new Error("ไม่พบแท็บ: " + targetSheetName);

    const d = payload.data;
    let photoUrl = "";
    
    // อ่าน Header ของแท็บเป้าหมาย
    const sheetData = targetSheet.getDataRange().getValues();
    let headers = [];
    if (sheetData.length > 0) {
      headers = sheetData[0].map(h => h ? h.toString().trim() : "");
    }
    
    // หาคอลัมน์ พิกัด และ รูปภาพ (หรือสร้างใหม่ถ้าไม่มี)
    let photoColIndex = headers.findIndex(h => {
      const hl = h.toLowerCase();
      return hl.includes("รูป") || hl.includes("ภาพ") || hl.includes("photo") || hl.includes("image");
    });
    if (photoColIndex === -1) {
      targetSheet.getRange(1, headers.length + 1).setValue("รูปภาพ");
      headers.push("รูปภาพ");
      photoColIndex = headers.length - 1;
    }
    
    let gpsColIndex = headers.findIndex(h => {
      const hl = h.toLowerCase();
      return hl.includes("พิกัด") || hl.includes("gps") || hl.includes("coordinate");
    });
    if (gpsColIndex === -1) {
      targetSheet.getRange(1, headers.length + 1).setValue("พิกัด");
      headers.push("พิกัด");
      gpsColIndex = headers.length - 1;
    }

    // ถ้าเป็นการแก้ไข ให้ดึงรูปลิงก์เดิมมาก่อน
    if (action === 'edit' && payload.rowIndex) {
       photoUrl = targetSheet.getRange(payload.rowIndex, photoColIndex + 1).getValue();
    }

    if (payload.photos && payload.photos.length > 0) {
      const FOLDER_ID = "1TS2WoCjMscxNv5y09g_6gPAF1yPgiqoe";
      let folder;
      try {
        folder = DriveApp.getFolderById(FOLDER_ID);
      } catch(e) {
        throw new Error("ไม่สามารถเข้าถึงโฟลเดอร์ Google Drive ได้ กรุณาตรวจสอบสิทธิ์หรือ Folder ID");
      }
      
      let newUrls = [];
      for (let i = 0; i < payload.photos.length; i++) {
        const photo = payload.photos[i];
        if (photo && photo.data) {
          const blob = Utilities.newBlob(Utilities.base64Decode(photo.data), photo.mimeType, targetSheetName + "_" + new Date().getTime() + "_" + i + ".jpg");
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
    
    // ประกอบข้อมูลให้ตรงตาม Header
    const rowData = [];
    for (let j = 0; j < headers.length; j++) {
      const h = headers[j];
      if (j === photoColIndex) {
        rowData.push(photoUrl);
      } else if (j === gpsColIndex) {
        rowData.push(d[h] !== undefined ? d[h] : (d['coordinates'] || d['พิกัด'] || ""));
      } else if (j === 0 && action === 'add') {
        // คอลัมน์แรก มักจะเป็น ลำดับ (n)
        rowData.push(targetSheet.getLastRow());
      } else {
        rowData.push(d[h] !== undefined ? d[h] : "");
      }
    }

    if (action === 'edit' && payload.rowIndex) {
      targetSheet.getRange(payload.rowIndex, 1, 1, rowData.length).setValues([rowData]);
    } else if (action === 'add') {
      targetSheet.appendRow(rowData);
    }
    
    try {
      const logsSheet = ss.getSheetByName("Logs");
      if (logsSheet) {
        const logAction = (action === 'edit') ? "แก้ไขข้อมูล" : "เพิ่มข้อมูลใหม่";
        const details = "ข้อมูลอ้างอิง: " + (rowData[1] || rowData[0] || "ไม่ระบุ");
        logsSheet.appendRow([new Date(), payload.username || "Unknown", logAction, details]);
      }
    } catch(err) {
      Logger.log("Log error: " + err);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ฟังก์ชันสำหรับเซ็ตอัปฐานข้อมูล (สร้างแท็บ Users และ Logs ให้โดยอัตโนมัติ)
function setupDatabase() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  // สร้างแท็บ Users
  let usersSheet = ss.getSheetByName("Users");
  if (!usersSheet) {
    usersSheet = ss.insertSheet("Users");
    usersSheet.appendRow(["Username", "Password", "Role", "Name"]);
    // เพิ่ม Admin เริ่มต้น
    usersSheet.appendRow(["admin", "adminadmin", "Admin", "ผู้ดูแลระบบ"]);
    usersSheet.getRange("A1:D1").setFontWeight("bold");
    Logger.log("สร้างแท็บ Users และเพิ่มไอดี admin สำเร็จ!");
  } else {
    Logger.log("แท็บ Users มีอยู่แล้ว");
  }
  
  // สร้างแท็บ Logs
  let logsSheet = ss.getSheetByName("Logs");
  if (!logsSheet) {
    logsSheet = ss.insertSheet("Logs");
    logsSheet.appendRow(["Timestamp", "Username", "Action", "Details"]);
    logsSheet.getRange("A1:D1").setFontWeight("bold");
    Logger.log("สร้างแท็บ Logs สำเร็จ!");
  } else {
    Logger.log("แท็บ Logs มีอยู่แล้ว");
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
