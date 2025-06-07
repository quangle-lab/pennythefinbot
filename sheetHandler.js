//quản lý và lấy dữ liệu từ sheets dưới dạng text

//tạo budget cho tháng newMonthText (MM/yyyy) dựa trên tháng sourceMonthText (MM/yyyy)
function createNewBudget (newMonthText, sourceMonthText) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("💶Dự toán");
  const data = sheet.getDataRange().getValues();  

  const timezone = Session.getScriptTimeZone();

  const newRows = [];
  data.forEach((row, index) => {
    if (index === 0) return;
    rowMonthText = Utilities.formatDate(row[0], timezone, "MM/yyyy");
    if (rowMonthText === sourceMonthText) {      
      const newRow = [...row];
      newRow[0] = newMonthText;
      newRows.push(newRow);
    }
  });
  sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, newRows[0].length).setValues(newRows);

  let confirmation = `✅Đã tạo budget mới cho tháng *${newMonthText}* trong tab *💶Dự toán*`

  return confirmation;
}

//thay đổi budget
function setBudgetChange(month, group, category, amount, note) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('💶Dự toán');
  if (!sheet) {
    Logger.log("Sheet '💶Dự toán' not found.");
    return;
  }

  const data = sheet.getDataRange().getValues();
  const timezone = Session.getScriptTimeZone();

  for (let i = 1; i < data.length; i++) { // Skip header row
    const row = data[i];
    const dateCell = row[0];
    const groupCell = row[1];
    const categoryCell = row[2];

    const rowMonth = Utilities.formatDate(new Date(dateCell), timezone, "MM/yyyy");

    if (rowMonth === month && groupCell === group && categoryCell === category) {
      sheet.getRange(i + 1, 4).setValue(amount);  // Column D = amount
      sheet.getRange(i + 1, 5).setValue(note);    // Column E = ghi chú
      return `✅ Đã cập nhật dự toán tháng ${rowMonth} cho *${category}* (${group}): €${amount}`; // Stop after first match
    }
  }
  
  // Nếu chưa có, thêm mới
  const parts = month.split("/");
  const date = new Date(`${parts[1]}-${parts[0]}-01`);
  sheet.appendRow([date, group, category, amount, note]);
  return `➕ Đã thêm dự toán tháng ${rowMonth} cho *${category}* (${group}): €${amount}`;
}

//lấy dữ liệu dự toán cho tháng monthText (MM/yyyy)
function getBudgetData (monthText) {  
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("💶Dự toán");
  const data = sheet.getDataRange().getValues();

  const timezone = Session.getScriptTimeZone();

  const monthRows = data.filter((row,index) => {
    if (index === 0) return;
    const date = row[0]; // Giả sử cột A là ngày tháng
    const formatted = Utilities.formatDate(new Date(date), timezone, "MM/yyyy");
    return formatted === monthText;
  });

  const summary = {};
  monthRows.forEach(row => {
    const tab = row[1];
    const category = row[2];
    const budget = row[3];
    if (!summary[tab]) summary[tab] = [];
    summary[tab].push(`- ${category}: €${budget.toFixed(2)}`);
  });

  let monthBudgetData = `Dự toán của tháng *${monthText}*\n============`;
  for (const tab in summary) {
    monthBudgetData += `\n\n*${tab}*\n${summary[tab].join("\n")}`;
  }

  return monthBudgetData;
}

//lấy dữ liệu dashboard cho tháng monthText (MM/yyyy)
function getDashboardData (monthText) {  

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dashboard = ss.getSheetByName("🛤️ Dashboard");

  let firstofMonthText = "01/" + monthText

  // 1. Ghi tháng vào ô A1 để các số liệu cập nhật
  dashboard.getRange("A1").setValue(firstofMonthText);

  // 2. Các named range cần lấy dữ liệu
  const rangeNames = [
    "thongke_ThuNhap",
    "thongke_ChiPhiCoDinh",
    "thongke_ChiPhiBienDoi",    
    "thongke_QuyGiaDinh",
    "thongke_QuyMucDich",
    "thongke_TietKiem"
  ];

  const dataSections = [];

  rangeNames.forEach(name => {
    const range = ss.getRangeByName(name);
    if (!range) return;

    const values = range.getValues();
    const label = name.replace("thongke_", "").replace(/([A-Z])/g, ' $1').trim();

    let section = `📊 ${label}:\n`;

    values.forEach(([muc, dudoan, thucte]) => {
      if (muc && dudoan && thucte != null) {
        roundedDuDoan = Math.round(dudoan * 100) / 100;
        roundedThucTe = Math.round(thucte * 100) / 100;
        section += `- ${muc}|${roundedDuDoan}|${roundedThucTe}\n`;
      }
    });

    dataSections.push(section.trim());
  });

  //Trả lại A1 về ngày 1 của tháng hiện tại
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  dashboard.getRange("A1").setValue(Utilities.formatDate(firstOfMonth, ss.getSpreadsheetTimeZone(), "dd/MM/yyyy"));

  const monthDashboardData = `
  Tổng hợp giao dịch tháng ${monthText}\n\n. 
  Cho mỗi mục, các số liệu trả về lần lượt trong 4 cột là Mục, Dự đoán, Thực Tế, Chênh lệch. 
    - Đối với các giao dịch chi, 
        - số chênh lệch âm nghĩa là chi nhiều hơn dự tính - xấu
        - dương nghĩa là chi ít hơn dự tính - tốt
    - Đối với các mục Thu trong các Quỹ, Lương và Thu nhập khác nhóm phần Thu Nhập, các mục chi cho Quỹ Gia Đình, Quỹ Mục Đích và Tiết Kiệm trong Chi phí cố định
        - số chênh lệch âm nghĩa là thu ít hơn dự tính - xấu
        - dương nghĩa là thu nhiều hơn dự tính - tốt
    ${dataSections.join("\n\n")}
  `;  
  return monthDashboardData;
}

//lấy danh sách các nhóm và mục giao dịch
function getTxCat() {
  const namedRanges = [
    "ThuNhap",
    "ChiPhiCoDinh",
    "ChiPhiBienDoi",
    "QuyGiaDinh",
    "QuyMucDich",
    "TietKiem"
  ];

  const catTxSheet = SpreadsheetApp.openById(SPREADSHEET_ID);

  const promptParts = [];
  promptParts.push("Các giao dịch tài chính được phân vào các nhóm:");

  namedRanges.forEach((rangeName, index) => {
    const namedRange = catTxSheet.getRangeByName(rangeName);
    if (!namedRange) return;

    const sheet = namedRange.getSheet();
    const startRow = namedRange.getRow();    
    const numRows = namedRange.getNumRows();

    // Mở rộng từ cột A đến C => width = 3
    const fullRange = sheet.getRange(startRow, 1, numRows, 3);
    const values = fullRange.getValues();

    // Lấy tên nhóm từ cột A (duy nhất trong đoạn này)
    const uniqueGroupNames = [...new Set(values.map(row => row[0]).filter(name => !!name))];
    const groupName = uniqueGroupNames[0] || rangeName;

    const items = [];
    values.forEach(([, muc, mieuta]) => {
      if (muc && mieuta) {
        items.push(`  ${muc}: ${mieuta}`);
      }
    });

    if (items.length > 0) {
      promptParts.push(`\n${index + 1}/ ${groupName}:\n${items.join('\n')}`);
    }
  });
  
  const instructionCatPrompt = promptParts.join("\n");
  return instructionCatPrompt;
}

//lấy hoàn cảnh gia đình
function getFamilyContext() {
  const props = PropertiesService.getScriptProperties();
  const sheetName = props.getProperty('sheet_ContextConfig') || '🤖Tùy chỉnh Prompts';

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return "";

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);

  const contextMap = new Map (); // Nhóm -> array of lines

  rows.forEach(([nhom, ten, noidung]) => {
    if (!nhom || !ten || !noidung) return;
    if (!contextMap.has(nhom)) contextMap.set(nhom, []);
    contextMap.get(nhom).push(`- ${ten}: ${noidung}`);
  });

  const parts = [];

  if (contextMap.has("Hoàn cảnh")) {
    parts.push("🏠 Hoàn cảnh hộ gia đình:");
    parts.push(...contextMap.get("Hoàn cảnh"));
  }

  let contextPrompt = parts.join("\n");
  return contextPrompt;
}

//lấy chỉ dẫn phân loại giao dịch
function getCategoriseInstructions() {
  const props = PropertiesService.getScriptProperties();
  const sheetName = props.getProperty('sheet_ContextConfig') || '🤖Tùy chỉnh Prompts';

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return "";

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);

  const contextMap = new Map (); // Nhóm -> array of lines

  rows.forEach(([nhom, ten, noidung]) => {
    if (!nhom || !ten || !noidung) return;
    if (!contextMap.has(nhom)) contextMap.set(nhom, []);
    contextMap.get(nhom).push(`- ${ten}: ${noidung}`);
  });

  const parts = [];

   if (contextMap.has("Chỉ dẫn phân loại")) {
    parts.push("🔍 Hướng dẫn phân loại giao dịch:");
    parts.push(...contextMap.get("Chỉ dẫn phân loại"));
  }

  let contextPrompt = parts.join("\n");  
  return contextPrompt;
}

//lấy chỉ dẫn tạo dự toán chi tiêu
function getBudgetInstructions() {
  const props = PropertiesService.getScriptProperties();
  const sheetName = props.getProperty('sheet_ContextConfig') || '🤖Tùy chỉnh Prompts';

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return "";

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);

  const contextMap = new Map (); // Nhóm -> array of lines

  rows.forEach(([nhom, ten, noidung]) => {
    if (!nhom || !ten || !noidung) return;
    if (!contextMap.has(nhom)) contextMap.set(nhom, []);
    contextMap.get(nhom).push(`- ${ten}: ${noidung}`);
  });

  const parts = [];

  if (contextMap.has("Chỉ dẫn dự toán")) {
    parts.push("💶 Hướng dẫn dự toán:");
    parts.push(...contextMap.get("Chỉ dẫn dự toán"));
  }

  let contextPrompt = parts.join("\n");  
  return contextPrompt;
}

//lấy dữ liệu chi tiêu của tháng monthText theo type -- cố định (fix) hoặc biến đổi (var)
function getExpenseTx (monthText, type) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dashboard = ss.getSheetByName("🛤️ Dashboard");

  let firstofMonthText = "01/" + monthText

  // 1. Ghi tháng vào ô A1 để các số liệu cập nhật
  dashboard.getRange("A1").setValue(firstofMonthText);

  // 2. Các named range cần lấy dữ liệu
  const rangeNames = [
    "thongke_ThuNhap",
    "thongke_ChiPhiCoDinh",
    "thongke_ChiPhiBienDoi",    
    "thongke_QuyGiaDinh",
    "thongke_QuyMucDich",
    "thongke_TietKiem"
  ];
}

//lấy số dư hiện tại của Quỹ -- gia đình (rainy), mục đích (target) hoặc tiết kiệm (saving)
function getFundBalances (type) {
//TODO
}

//lấy dữ liệu có/nợ của quỹ của tháng monnthText theo type -- gia đình (rainy), mục đích (target) hoặc tiết kiệm (saving)
function getFundTx (monthText, type) {
//TODO
}
