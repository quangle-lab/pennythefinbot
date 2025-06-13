//quản lý và lấy dữ liệu từ sheets dưới dạng text

//kiểm tra và xác nhận tạo budget mới
function checkAndConfirmCreateBudget(newMonthText, sourceMonthText) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("💶Dự toán");
  if (!sheet) {
    return {
      exists: false,
      needsConfirmation: false,
      error: "❌ Không tìm thấy sheet '💶Dự toán'"
    };
  }

  const data = sheet.getDataRange().getValues();
  const timezone = Session.getScriptTimeZone();

  // Check if budget for newMonthText already exists
  const existingBudgetItems = [];
  const sourceMonthItems = [];

  data.forEach((row, index) => {
    if (index === 0) return; // Skip header

    const rowMonthText = Utilities.formatDate(row[0], timezone, "MM/yyyy");
    const group = row[1];
    const category = row[2];
    const amount = row[3];
    const note = row[4];

    if (rowMonthText === newMonthText) {
      existingBudgetItems.push({
        group: group,
        category: category,
        amount: amount,
        note: note || ''
      });
    }

    if (rowMonthText === sourceMonthText) {
      sourceMonthItems.push({
        group: group,
        category: category,
        amount: amount,
        note: note || ''
      });
    }
  });

  // Check if budget already exists for the new month
  if (existingBudgetItems.length > 0) {
    let message = `🔍 Tìm thấy dự toán hiện tại cho tháng *${newMonthText}* với ${existingBudgetItems.length} mục:\n\n`;

    // Group by category for better display
    const groupedItems = {};
    existingBudgetItems.forEach(item => {
      if (!groupedItems[item.group]) groupedItems[item.group] = [];
      groupedItems[item.group].push(`  • ${item.category}: €${item.amount}`);
    });

    Object.keys(groupedItems).forEach(group => {
      message += `**${group}:**\n${groupedItems[group].join('\n')}\n\n`;
    });

    message += `❓ Bạn có muốn ghi đè dự toán hiện tại bằng dữ liệu từ tháng *${sourceMonthText}* không?`;

    return {
      exists: true,
      needsConfirmation: true,
      existingItems: existingBudgetItems,
      sourceItems: sourceMonthItems,
      message: message,
      newMonthText: newMonthText,
      sourceMonthText: sourceMonthText
    };
  }

  // Check if source month has data
  if (sourceMonthItems.length === 0) {
    return {
      exists: false,
      needsConfirmation: false,
      error: `❌ Không tìm thấy dữ liệu dự toán cho tháng nguồn *${sourceMonthText}*`
    };
  }

  // No existing budget for new month, show what will be created
  let message = `📝 Tạo dự toán mới cho tháng *${newMonthText}* dựa trên tháng *${sourceMonthText}* với ${sourceMonthItems.length} mục:\n\n`;

  const groupedSourceItems = {};
  sourceMonthItems.forEach(item => {
    if (!groupedSourceItems[item.group]) groupedSourceItems[item.group] = [];
    groupedSourceItems[item.group].push(`  • ${item.category}: €${item.amount}`);
  });

  Object.keys(groupedSourceItems).forEach(group => {
    message += `**${group}:**\n${groupedSourceItems[group].join('\n')}\n\n`;
  });

  message += `❓ Bạn có muốn tạo dự toán này không?`;

  return {
    exists: false,
    needsConfirmation: true,
    sourceItems: sourceMonthItems,
    message: message,
    newMonthText: newMonthText,
    sourceMonthText: sourceMonthText
  };
}

//tạo budget cho tháng newMonthText (MM/yyyy) dựa trên tháng sourceMonthText (MM/yyyy)
function createNewBudget (newMonthText, sourceMonthText) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("💶Dự toán");
  const data = sheet.getDataRange().getValues();

  const timezone = Session.getScriptTimeZone();

  const newRows = [];
  data.forEach((row, index) => {
    if (index === 0) return;
    const rowMonthText = Utilities.formatDate(row[0], timezone, "MM/yyyy");
    if (rowMonthText === sourceMonthText) {
      const newRow = [...row];
      newRow[0] = newMonthText;
      newRows.push(newRow);
    }
  });

  if (newRows.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, newRows[0].length).setValues(newRows);
  }

  let confirmation = `✅Đã tạo budget mới cho tháng *${newMonthText}* trong tab *💶Dự toán* với ${newRows.length} mục`

  return confirmation;
}

//thực hiện tạo budget sau khi đã xác nhận
function executeConfirmedBudgetCreation(newMonthText, sourceMonthText, overwriteExisting = false) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("💶Dự toán");
    if (!sheet) {
      return {
        success: false,
        error: "❌ Không tìm thấy sheet '💶Dự toán'"
      };
    }

    // If overwriting existing budget, delete existing entries first
    if (overwriteExisting) {
      const data = sheet.getDataRange().getValues();
      const timezone = Session.getScriptTimeZone();
      const rowsToDelete = [];

      // Find rows to delete (in reverse order to avoid index shifting)
      for (let i = data.length - 1; i >= 1; i--) {
        const row = data[i];
        const rowMonthText = Utilities.formatDate(row[0], timezone, "MM/yyyy");
        if (rowMonthText === newMonthText) {
          rowsToDelete.push(i + 1); // +1 because sheet rows are 1-based
        }
      }

      // Delete existing rows
      rowsToDelete.forEach(rowIndex => {
        sheet.deleteRow(rowIndex);
      });
    }

    // Create new budget
    const result = createNewBudget(newMonthText, sourceMonthText);

    return {
      success: true,
      message: result,
      overwritten: overwriteExisting
    };

  } catch (error) {
    return {
      success: false,
      error: `❌ Lỗi khi tạo dự toán: ${error.toString()}`
    };
  }
}

//kiểm tra và xác nhận thay đổi budget
function checkAndConfirmBudgetChange(month, group, category, amount, note) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('💶Dự toán');
  if (!sheet) {
    return {
      exists: false,
      needsConfirmation: false,
      error: "❌ Không tìm thấy sheet '💶Dự toán'"
    };
  }

  const data = sheet.getDataRange().getValues();
  const timezone = Session.getScriptTimeZone();

  // Check if there's already a line with the same month, group, category
  for (let i = 1; i < data.length; i++) { // Skip header row
    const row = data[i];
    const dateCell = row[0];
    const groupCell = row[1];
    const categoryCell = row[2];
    const currentAmount = row[3];
    const currentNote = row[4];

    const rowMonth = Utilities.formatDate(new Date(dateCell), timezone, "MM/yyyy");

    if (rowMonth === month && groupCell === group && categoryCell === category) {
      // Found existing budget line
      let message = `🔍 Tìm thấy dự toán hiện tại cho *${category}* (${group}) tháng *${month}*:\n\n`;
      message += `📊 *Hiện tại*: €${currentAmount}`;
      if (currentNote) {
        message += ` - _${currentNote}_`;
      }
      message += `\n📝 *Mới*: €${amount}`;
      if (note) {
        message += ` - _${note}_`;
      }
      message += `\n\n❓ Bạn có muốn cập nhật dự toán này không?`;

      return {
        exists: true,
        needsConfirmation: true,
        existingRow: {
          rowNumber: i + 1,
          month: month,
          group: group,
          category: category,
          currentAmount: currentAmount,
          currentNote: currentNote || ''
        },
        newBudget: {
          month: month,
          group: group,
          category: category,
          amount: amount,
          note: note || ''
        },
        message: message
      };
    }
  }

  // No existing budget found
  return {
    exists: false,
    needsConfirmation: true,
    message: `📝 Tạo dự toán mới cho *${category}* (${group}) tháng *${month}*: €${amount}\n\n❓ Bạn có muốn thêm dự toán này không?`,
    newBudget: {
      month: month,
      group: group,
      category: category,
      amount: amount,
      note: note || ''
    }
  };
}

//thay đổi budget
function setBudgetChange(month, group, category, amount, note) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('💶Dự toán');
  if (!sheet) {
    Logger.log("Sheet '💶Dự toán' not found.");
    return "❌ Không tìm thấy sheet '💶Dự toán'";
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
  sheet.appendRow([month, group, category, amount, note]);
  return `➕ Đã thêm dự toán tháng ${month} cho *${category}* (${group}): €${amount}`;
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

    values.forEach(([muc, dudoan, thucte, chenhlech], index) => {
      if (index===0) return;      
      if (muc!==null && muc!=="" && dudoan!==null && thucte!==null && chenhlech!==null) {
        if (index >1) {
          dudoan = Math.round(dudoan * 100) / 100;
          thucte = Math.round(thucte * 100) / 100;
          chenhlech = Math.round(chenhlech * 100) / 100;
        }
        section += `- ${muc}|${dudoan}|${thucte}|${chenhlech}\n`;
      }
    });

    dataSections.push(section.trim());
  });

  //Trả lại A1 về ngày 1 của tháng hiện tại
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  dashboard.getRange("A1").setValue(Utilities.formatDate(firstOfMonth, ss.getSpreadsheetTimeZone(), "dd/MM/yyyy"));

  const monthDashboardData = `
  Tổng hợp giao dịch tháng ${monthText}\n
  Cho mỗi mục, các số liệu được liệt kê trong 4 cột là Mục, Dự đoán, Thực Tế, Chênh lệch. 
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
  promptParts.push("Các giao dịch tài chính được phân vào các nhóm/mục như sau:");

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

//kiểm tra giao dịch đã tồn tại và xử lý xác nhận thêm mới
function checkAndConfirmTransaction(transaction) {
  const { date, amount, description, bankComment, category, group } = transaction;

  // Validate input parameters
  if (!date || !amount || !description || !group) {
    return {
      exists: false,
      needsConfirmation: false,
      error: "❌ Thiếu thông tin bắt buộc: date, amount, description, group"
    };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(group);

  if (!sheet) {
    return {
      exists: false,
      needsConfirmation: false,
      error: `❌ Không tìm thấy sheet "${group}"`
    };
  }

  // Get all data from the sheet
  const data = sheet.getDataRange().getValues();
  const timezone = Session.getScriptTimeZone();

  // Parse input date for comparison
  let inputDate;
  try {
    // Handle different date formats
    if (typeof date === 'string') {
      const dateParts = date.split('/');
      if (dateParts.length === 3) {
        // DD/MM/YYYY format
        inputDate = new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`);
      } else {
        inputDate = new Date(date);
      }
    } else {
      inputDate = new Date(date);
    }
  } catch (e) {
    return {
      exists: false,
      needsConfirmation: false,
      error: `❌ Định dạng ngày không hợp lệ: ${date}`
    };
  }

  // Check for existing transactions (skip header row)
  const existingRows = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const rowDate = row[0]; // Column A: Date
    const rowDesc = row[1]; // Column B: Description
    const rowAmount = row[2]; // Column C: Amount
    const rowLocation = row[3]; // Column D: Location
    const rowCategory = row[4]; // Column E: Category
    const rowBankComment = row[5]; // Column F: Bank Comment

    // Compare dates
    let rowDateFormatted;
    try {
      rowDateFormatted = Utilities.formatDate(new Date(rowDate), timezone, "dd/MM/yyyy");
      const inputDateFormatted = Utilities.formatDate(inputDate, timezone, "dd/MM/yyyy");

      // Check for potential duplicates based on multiple criteria
      const dateMatch = rowDateFormatted === inputDateFormatted;
      const amountMatch = Math.abs(parseFloat(rowAmount) - parseFloat(amount)) < 0.01; // Allow small floating point differences
      const descMatch = rowDesc && description &&
        (rowDesc.toLowerCase().includes(description.toLowerCase()) ||
         description.toLowerCase().includes(rowDesc.toLowerCase()));
      const bankCommentMatch = bankComment && rowBankComment &&
        (rowBankComment.toLowerCase().includes(bankComment.toLowerCase()) ||
         bankComment.toLowerCase().includes(rowBankComment.toLowerCase()));

      // Consider it a potential duplicate if:
      // 1. Same date AND same amount, OR
      // 2. Same date AND similar description, OR
      // 3. Same amount AND same bank comment (if available)
      if ((dateMatch && amountMatch) ||
          (dateMatch && descMatch) ||
          (amountMatch && bankCommentMatch)) {
        existingRows.push({
          rowNumber: i + 1,
          date: rowDateFormatted,
          description: rowDesc,
          amount: rowAmount,
          location: rowLocation,
          category: rowCategory,
          bankComment: rowBankComment
        });
      }
    } catch (e) {
      // Skip rows with invalid dates
      continue;
    }
  }

  // Return results
  if (existingRows.length > 0) {
    let message = `🔍 Tìm thấy *${existingRows.length}* giao dịch tương tự trong *${group}*:\n\n`;
    existingRows.forEach((row, index) => {
      message += `- *Dòng ${row.rowNumber}*: ${row.date} - ${row.description} - €${row.amount} - ${row.category}\n`;
    });
    message += `\n*📝Giao dịch mới*: ${Utilities.formatDate(inputDate, timezone, "dd/MM/yyyy")} - ${description} - ${amount} - ${category || 'N/A'}\n\n`;
    message += `❓Bạn có muốn thêm giao dịch này không?`;

    return {
      exists: true,
      needsConfirmation: true,
      existingRows: existingRows,
      message: message,
      group: group,
      newTransaction: {
        date: inputDate,
        description: description,
        amount: amount,
        location: transaction.location || 'N/A',
        category: category || 'Khác',
        bankComment: bankComment || ''
      }
    };
  } else {
    return {
      exists: false,
      needsConfirmation: true,
      message: `🔍 Không tìm thấy giao dịch tương tự trong "${group}".\n`,
      group: group,
      newTransaction: {
        date: inputDate,
        description: description,
        amount: amount,
        location: transaction.location || 'N/A',
        category: category || 'Khác',
        bankComment: bankComment || ''
      }
    };
  }
}

//thêm giao dịch sau khi đã xác nhận
function addConfirmedTransaction(sheetName, transactionData) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      return {
        success: false,
        error: `❌ Không tìm thấy sheet "${sheetName}"`
      };
    }

    const { type, date, description, amount, location, category, bankComment } = transactionData;

    // Add the transaction to the sheet
    const lastRow = sheet.getLastRow();
    sheet.appendRow([
      date,
      description,
      amount,
      location,
      category,
      bankComment
    ]);

    const newRowNumber = lastRow + 1;    

    return {
      success: true,
      message: `${type} *${amount}* cho *${description}*\n ✏️_Ghi vào ${sheetName}, mục ${category}, dòng ${newRowNumber}_`,
      rowNumber: newRowNumber,
      sheetName: sheetName
    };

  } catch (error) {
    return {
      success: false,
      error: `❌ Lỗi khi thêm giao dịch: ${error.toString()}`
    };
  }
}

//lấy số dư hiện tại của Quỹ -- gia đình (rainy), mục đích (target) hoặc tiết kiệm (saving)
function getFundBalances(type) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();  

  // Map type to named range
  const typeToRangeMap = {
    "rainy": "sodu_QuyGiaDinh",
    "target": "sodu_QuyMucDich",
    "saving": "sodu_Tietkiem",
    "all": ["sodu_QuyGiaDinh", "sodu_QuyMucDich", "sodu_Tietkiem"]
  };

  // If specific type is requested
  if (type && type !== "all") {
    const rangeName = typeToRangeMap[type];
    if (!rangeName) {
      return {
        success: false,
        error: `❌ Loại quỹ không hợp lệ: "${type}". Các loại có sẵn: rainy, target, saving, all`
      };
    }

    try {
      const namedRange = ss.getRangeByName(rangeName);
      if (!namedRange) {
        return {
          success: false,
          error: `❌ Không tìm thấy named range: "${rangeName}"`
        };
      }

      const values = namedRange.getValues();
      const balances = {};
      let totalBalance = 0;

      values.forEach(([name, amount]) => {
        if (name && amount != null) {
          const numericAmount = parseFloat(amount) || 0;
          balances[name] = Math.round(numericAmount*100)/100;
          totalBalance += Math.round(numericAmount*100)/100;
        }
      });

      return {
        success: true,
        type: type,
        balances: balances,
        total: totalBalance,
        rangeName: rangeName
      };

    } catch (error) {
      return {
        success: false,
        error: `❌ Lỗi khi lấy dữ liệu từ "${rangeName}": ${error.toString()}`
      };
    }
  }

  // If "all" or no type specified, get all fund balances
  try {
    const allBalances = {};
    let grandTotal = 0;
    const rangeNames = typeToRangeMap.all;

    for (const rangeName of rangeNames) {
      const namedRange = ss.getRangeByName(rangeName);
      if (!namedRange) {
        console.warn(`Named range not found: ${rangeName}`);
        continue;
      }

      const values = namedRange.getValues();
      const fundBalances = {};
      let fundTotal = 0;

      values.forEach(([name, amount]) => {
        if (name && amount != null) {
          const numericAmount = parseFloat(amount) || 0;
          fundBalances[name] = Math.round(numericAmount*100)/100;
          fundTotal += Math.round(numericAmount*100)/100;
        }
      });

      // Map range name back to fund type
      const fundType = Object.keys(typeToRangeMap).find(key =>
        typeToRangeMap[key] === rangeName
      );

      allBalances[fundType] = {
        items: fundBalances,
        total: Math.round(fundTotal*100)/100,
        rangeName: rangeName
      };

      grandTotal += Math.round(fundTotal*100)/100;
    }

    return {
      success: true,
      type: "all",
      balances: allBalances,
      grandTotal: grandTotal
    };

  } catch (error) {
    return {
      success: false,
      error: `❌ Lỗi khi lấy tất cả số dư quỹ: ${error.toString()}`
    };
  }
}

//định dạng số dư quỹ để hiển thị
function formatFundBalances(balanceData) {
  if (!balanceData.success) {
    return balanceData.error;
  }

  if (balanceData.type === "all") {
    let message = "💰 **Tổng quan số dư các quỹ**\n";
    message += "=" .repeat(30) + "\n\n";

    const fundNames = {
      "rainy": "🛟 Quỹ Gia Đình",
      "target": "🎯 Quỹ Mục Đích",
      "saving": "💎 Tiết Kiệm"
    };

    Object.keys(balanceData.balances).forEach(fundType => {
      const fund = balanceData.balances[fundType];
      const fundName = fundNames[fundType] || fundType;

      message += `**${fundName}**\n`;

      if (Object.keys(fund.items).length > 0) {
        Object.entries(fund.items).forEach(([name, amount]) => {
          message += `  • ${name}: €${amount.toFixed(2)}\n`;
        });
        message += `  **Tổng: €${fund.total.toFixed(2)}**\n\n`;
      } else {
        message += `  _Không có dữ liệu_\n\n`;
      }
    });

    message += `🏦 **Tổng cộng tất cả quỹ: €${balanceData.grandTotal.toFixed(2)}**`;
    return message;

  } else {
    // Single fund type
    const fundNames = {
      "rainy": "🛟 Quỹ Gia Đình",
      "target": "🎯 Quỹ Mục Đích",
      "saving": "💎 Tiết Kiệm"
    };

    const fundName = fundNames[balanceData.type] || balanceData.type;
    let message = `💰 **${fundName}**\n`;
    message += "=" .repeat(20) + "\n\n";

    if (Object.keys(balanceData.balances).length > 0) {
      Object.entries(balanceData.balances).forEach(([name, amount]) => {
        message += `• ${name}: €${amount.toFixed(2)}\n`;
      });
      message += `\n**Tổng: €${balanceData.total.toFixed(2)}**`;
    } else {
      message += "_Không có dữ liệu_";
    }

    return message;
  }
}

