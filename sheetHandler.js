//quản lý và lấy dữ liệu từ sheets dưới dạng text


//---------------BUDGET-------------------//
//tạo budget có chọn lọc - chỉ tạo các dòng chưa tồn tại
function createBudgetSelectively(newMonthText, sourceMonthText) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("💶Dự toán");
  if (!sheet) {
    return {
      error: "❌ Không tìm thấy sheet '💶Dự toán'"
    };
  }

  const data = sheet.getDataRange().getValues();
  const timezone = Session.getScriptTimeZone();

  // Step 1: Check existing budget lines for the new month
  const existingBudgetLines = [];
  const existingCategories = new Set();

  data.forEach((row, index) => {
    if (index === 0) return; // Skip header

    const rowMonthText = Utilities.formatDate(row[0], timezone, "MM/yyyy");
    const group = row[1];
    const category = row[2];
    const amount = row[3];
    const note = row[4];

    if (rowMonthText === newMonthText) {
      existingBudgetLines.push({
        group: group,
        category: category,
        amount: amount,
        note: note || ''
      });
      existingCategories.add(category);
    }
  });

  // Step 2: Get source month data and filter out existing categories
  const sourceMonthItems = [];
  const newItemsToCreate = [];

  data.forEach((row, index) => {
    if (index === 0) return; // Skip header

    const rowMonthText = Utilities.formatDate(row[0], timezone, "MM/yyyy");
    const group = row[1];
    const category = row[2];
    const amount = row[3];
    const note = row[4];

    if (rowMonthText === sourceMonthText) {
      sourceMonthItems.push({
        group: group,
        category: category,
        amount: amount,
        note: note || ''
      });

      // Only add to creation list if category doesn't exist in new month
      if (!existingCategories.has(category)) {
        newItemsToCreate.push({
          group: group,
          category: category,
          amount: Math.round(amount*100)/100,  
          note: ''
        });
      }
    }
  });

  // Check if source month has data
  if (sourceMonthItems.length === 0) {
    return {
      error: `❌ Không tìm thấy dữ liệu dự toán cho tháng nguồn *${sourceMonthText}*`
    };
  }

  // Step 3: Create new budget lines (skip existing ones)
  let createdCount = 0;
  if (newItemsToCreate.length > 0) {
    const newRows = [];
    newItemsToCreate.forEach(item => {
      const newRow = [newMonthText, item.group, item.category, item.amount, item.note];
      newRows.push(newRow);
    });

    if (newRows.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, newRows[0].length).setValues(newRows);
      createdCount = newRows.length;
    }
  }

  // Step 4: Generate summary message
  let summary = `✅ **Tạo dự toán tháng ${newMonthText}:**\n\n`;

  if (createdCount > 0) {
    summary += `➕ Đã tạo ${createdCount} dự toán mới từ tháng ${sourceMonthText}\n`;

    // Group new items by category for display
    const groupedNewItems = {};
    newItemsToCreate.forEach(item => {
      if (!groupedNewItems[item.group]) groupedNewItems[item.group] = [];
      groupedNewItems[item.group].push(`  • ${item.category}: €${item.amount}`);
    });

    Object.keys(groupedNewItems).forEach(group => {
      summary += `\n**${group}:**\n${groupedNewItems[group].join('\n')}`;
    });
  } else {
    summary += `ℹ️ Không có dự toán mới nào được tạo (tất cả đã tồn tại)`;
  }

  if (existingBudgetLines.length > 0) {
    summary += `\n\n⚠️ Đã bỏ qua ${existingBudgetLines.length} dự toán đã tồn tại`;
  }

  return {
    success: true,
    summary: summary,
    existingLines: existingBudgetLines,
    createdCount: createdCount,
    skippedCount: existingBudgetLines.length,
    newMonthText: newMonthText,
    sourceMonthText: sourceMonthText
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

//---------------SPENDING-------------------//
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


//---------------FUNDS-------------------//
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

//---------------CONTEXT-------------------//
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