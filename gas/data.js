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
  let summary = `✅ *Tạo dự toán tháng ${newMonthText}*\:\n\n`;

  if (createdCount > 0) {
    summary += `➕ Đã tạo ${createdCount} dự toán mới từ tháng ${sourceMonthText}\n`;

    // Group new items by category for display
    const groupedNewItems = {};
    newItemsToCreate.forEach(item => {
      if (!groupedNewItems[item.group]) groupedNewItems[item.group] = [];
      groupedNewItems[item.group].push(`  • ${item.category}: €${item.amount}`);
    });

    Object.keys(groupedNewItems).forEach(group => {
      summary += `\n*${group}*\:\n${groupedNewItems[group].join('\n')}`;
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
      return `✅ Đã cập nhật dự toán tháng ${rowMonth} cho *${category}* \(${group}\)\: €${amount}`; // Stop after first match
    }
  }

  // Nếu chưa có, thêm mới  
  sheet.appendRow([month, group, category, amount, note]);
  return `➕ Đã thêm dự toán tháng ${month} cho *${category}* \(${group}\)\: €${amount}`;
}

//helper function để format số với dấu phân cách hàng nghìn
function formatNumberWithSeparator(number) {
  return number.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
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
    summary[tab].push(`- ${category}: €${formatNumberWithSeparator(budget)}`);
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
    const rowAmount = row[2]; // Column C: Amount
    const rowLocation = row[3]; // Column D: Location
    const rowCategory = row[4]; // Column E: Category
    const rowBankComment = row[5]; // Column F: Bank Comment
    const rowId = row[6]; // Column G: ID

    // Compare dates
    let rowDateFormatted;
    try {
      rowDateFormatted = Utilities.formatDate(new Date(rowDate), timezone, "dd/MM/yyyy");
      const inputDateFormatted = Utilities.formatDate(inputDate, timezone, "dd/MM/yyyy");

      // Check for potential duplicates based on multiple criteria
      const dateMatch = rowDateFormatted === inputDateFormatted;
      const amountMatch = Math.abs(parseFloat(rowAmount) - parseFloat(amount)) < 0.01; // Allow small floating point differences
      const bankCommentMatch = bankComment && rowBankComment &&
        (rowBankComment.toLowerCase().includes(bankComment.toLowerCase()) ||
         bankComment.toLowerCase().includes(rowBankComment.toLowerCase()));

      // Consider it a potential duplicate if:
      // 1. Same date AND same amount, OR
      // 2. Same date AND similar description, OR
      // 3. Same amount AND same bank comment (if available)
      if ((dateMatch && amountMatch) ||
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

  // Prepare transaction data
  const transactionData = {
    type: transaction.type || '💸Chi',
    date: Utilities.formatDate(inputDate, timezone, "dd/MM/yyyy"),
    description: description,
    amount: amount,
    location: transaction.location || 'N/A',
    category: category || 'Khác',
    bankComment: bankComment || ''
  };

  // Always add the transaction first
  const addResult = addConfirmedTransaction(group, transactionData);
  
  if (!addResult.success) {
    return {
      exists: false,
      needsConfirmation: false,
      error: addResult.error
    };
  }

  // Return results
  if (existingRows.length > 0) {
    // Create message with existing row information
    let message = addResult.message;
    message += `\n\n🔍 *Tìm thấy ${existingRows.length} giao dịch tương tự*\:\n`;
    existingRows.forEach((row, index) => {
      message += `\- *Dòng ${row.rowNumber}*\: ${row.date} \- ${row.description} \- €${row.amount}\n`;
    });
    message += `\n❓Bạn có muốn giữ giao dịch mới này không?`;

    // Create buttons with simple callback data (transaction ID and existing row numbers)
    const existingRowNumbers = existingRows.map(row => row.rowNumber).join(',');
    const confirmationKeyboard = createDuplicateConfirmationKeyboard(addResult.transactionId, group, existingRowNumbers);

    return {
      exists: true,
      needsConfirmation: true,
      existingRows: existingRows,
      message: message,
      group: group,
      transactionId: addResult.transactionId,
      replyMarkup: confirmationKeyboard
    };
  } else {
    return {
      exists: false,
      needsConfirmation: false,
      message: addResult.message,
      group: group,
      transactionId: addResult.transactionId,
      replyMarkup: addResult.replyMarkup
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

    // Generate unique transaction ID
    const transactionId = generateTransactionId();

    // Add the transaction to the sheet with ID in column G
    const lastRow = sheet.getLastRow();
    sheet.appendRow([
      date,
      description,
      amount,
      location,
      category,
      bankComment,
      transactionId
    ]);

    const newRowNumber = lastRow + 1;

    // Calculate remaining amount for the category
    const remainingData = getCategoryRemainingAmount(sheetName, category);
    let remainingMessage = "";
    
    if (remainingData.success) {
      const remaining = remainingData.remaining;
      const budget = remainingData.budget;      
      
      if (budget > 0) {
        if (remaining >= 0) {
          remainingMessage = `💶còn: €${remaining.toFixed(2)}`;
        } else {
          remainingMessage = `⚠️đã vượt: €${Math.abs(remaining).toFixed(2)}`;
        }
      }
    }

    // Create delete button for the transaction
    const deleteKeyboard = createDeleteKeyboard(transactionId, sheetName);
    
    return {
      success: true,
      message: `${type} *${amount}* cho *${description}*\n _✏️${sheetName}, mục ${category}, ${remainingMessage}_\n_\(ID\: ${transactionId}\)_`,
      rowNumber: newRowNumber,
      sheetName: sheetName,
      transactionId: transactionId,
      replyMarkup: deleteKeyboard
    };

  } catch (error) {
    return {
      success: false,
      error: `❌ Lỗi khi thêm giao dịch: ${error.toString()}`
    };
  }
}


//---------------BALANCES MANAGEMENT-------------------//
//tính dự toán còn lại cho một mục cụ thể trong một nhóm
function getCategoryRemainingAmount(group, category) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Map group names to their corresponding named range
    const groupToRangeMap = {
      "💰Thu nhập": "thongke_ThuNhap",
      "🏡Chi phí cố định": "thongke_ChiPhiCoDinh", 
      "🛒Chi phí biến đổi": "thongke_ChiPhiBienDoi",
      "🛟Quỹ gia đình": "thongke_QuyGiaDinh",
      "🎯Quỹ mục đích": "thongke_QuyMucDich",
      "🫙Tiết kiệm": "thongke_TietKiem"
    };    

    const rangeName = groupToRangeMap[group];
    if (!rangeName) {
      return {
        success: false,
        error: `❌ Không tìm thấy nhóm "${group}"`
      };
    }

    const range = ss.getRangeByName(rangeName);
    if (!range) {
      return {
        success: false,
        error: `❌ Không tìm thấy named range "${rangeName}"`
      };
    }

    const values = range.getValues();
    let budget = 0;
    let actual = 0;
    let remaining = 0;

    // Find the category in the range
    for (let i = 1; i < values.length; i++) { // Skip header row
      const row = values[i];
      if (row[0] === category) { // Category is in first column
        budget = parseFloat(row[1]) || 0; // Budget is in second column
        actual = parseFloat(row[2]) || 0; // Actual is in third column
        remaining = budget - actual;
        break;
      }
    }

    return {
      success: true,
      group: group,
      category: category,
      budget: Math.round(budget * 100) / 100,
      actual: Math.round(actual * 100) / 100,
      remaining: Math.round(remaining * 100) / 100
    };

  } catch (error) {
    return {
      success: false,
      error: `❌ Lỗi khi tính số tiền còn lại: ${error.toString()}`
    };
  }
}

//lấy số dư hiện tại của Quỹ -- gia đình (family), mục tiêu (target) hoặc tiết kiệm (saving)
function getFundBalances(type) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();  

  // Map type to named range
  const typeToRangeMap = {
    "family": "sodu_QuyGiaDinh",
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
    let message = "💰*Tổng quan số dư các quỹ*\n";
    message += "\-" .repeat(15) + "\n";

    const fundNames = {
      "rainy": "🛟Quỹ Gia Đình",
      "target": "🎯Quỹ Mục Đích",
      "saving": "💎Tiết Kiệm"
    };

    Object.keys(balanceData.balances).forEach(fundType => {
      const fund = balanceData.balances[fundType];
      const fundName = fundNames[fundType] || fundType;

      message += `*${fundName}*\n`;

      if (Object.keys(fund.items).length > 0) {
        Object.entries(fund.items).forEach(([name, amount]) => {
          message += `  • ${name}: €${amount.toFixed(2)}\n`;
        });
        message += `  *Tổng\: €${fund.total.toFixed(2)}*\n\n`;
      } else {
        message += `  _Không có dữ liệu_\n\n`;
      }
    });

    message += `🏦 *Tổng cộng tất cả quỹ\: €${balanceData.grandTotal.toFixed(2)}*`;
    return message;

  } else {
    // Single fund type
    const fundNames = {
      "rainy": "🛟Quỹ Gia Đình",
      "target": "🎯Quỹ Mục Đích",
      "saving": "💎Tiết Kiệm"
    };

    const fundName = fundNames[balanceData.type] || balanceData.type;
    let message = `💰*${fundName}*\n`;
    message += "\-" .repeat(15) + "\n";

    if (Object.keys(balanceData.balances).length > 0) {
      Object.entries(balanceData.balances).forEach(([name, amount]) => {
        message += `• ${name}: €${amount.toFixed(2)}\n`;
      });
      message += `\n*Tổng\: €${balanceData.total.toFixed(2)}*`;
    } else {
      message += "_Không có dữ liệu_";
    }

    return message;
  }
}

//lấy dữ liệu số dư tài khoản ngân hàng từ dashboard
function getBankAccountBalances() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const props = PropertiesService.getScriptProperties();
    
    // Get the named range from sheet settings
    const rangeName = props.getProperty('bankAccountBalanceRange') || 'sodu_TaiKhoanNganHang';
    
    const namedRange = ss.getRangeByName(rangeName);
    if (!namedRange) {
      return {
        success: false,
        error: `❌ Không tìm thấy named range: "${rangeName}"`
      };
    }

    const values = namedRange.getValues();
    const timezone = Session.getScriptTimeZone();
    
    // Expected columns: Group Name, Bank Account Balance, Difference, Bank Account Number, Update Date
    const bankBalances = [];
    let totalBankBalance = 0;
    let totalDifference = 0;

    // Skip header row if exists
    const startRow = values[0][0] && values[0][0].toString().toLowerCase().includes('group') ? 1 : 0;

    for (let i = startRow; i < values.length; i++) {
      const row = values[i];
      
      // Check if row has valid data
      if (row[0] && row[1] !== null && row[1] !== undefined) {
        const groupName = row[0];
        const bankBalance = parseFloat(row[1]) || 0;
        const difference = parseFloat(row[2]) || 0;
        const accountNumber = row[3] || '';
        const updateDate = row[4] || '';      

        bankBalances.push({
          groupName: groupName,
          bankBalance: Math.round(bankBalance * 100) / 100,
          difference: Math.round(difference * 100) / 100,          
          accountNumber: accountNumber,
          updateDate: Utilities.formatDate(updateDate, timezone, "dd/MM/yyyy")
        });

        totalBankBalance += Math.round(bankBalance * 100) / 100;
        totalDifference += Math.round(difference * 100) / 100;
      }
    }

    return {
      success: true,
      bankBalances: bankBalances,
      totalBankBalance: totalBankBalance,
      totalDifference: totalDifference,
      rangeName: rangeName,
      lastUpdated: new Date().toISOString()
    };

  } catch (error) {
    return {
      success: false,
      error: `❌ Lỗi khi lấy dữ liệu số dư tài khoản ngân hàng: ${error.toString()}`
    };
  }
}

//định dạng số dư tài khoản ngân hàng để hiển thị
function formatBankAccountBalances(balanceData) {
  if (!balanceData.success) {
    return balanceData.error;
  }

  let message = "🏦*Số dư tài khoản ngân hàng*\n";
  message += "\-" .repeat(15) + "\n";

  if (balanceData.bankBalances.length === 0) {
    message += "_Không có dữ liệu số dư tài khoản ngân hàng_\n";
    return message;
  }

  // Group display names mapping, exclude "Quỹ mục tiêu" and "Tiết kiệm" as they do not have email notifications
  const groupDisplayNames = {
    "Chi phí cố định": "🏡Chi phí cố định",
    "Chi phí biến đổi": "🛒Chi phí biến đổi", 
    "Quỹ gia đình": "🛟Quỹ gia đình",
  };

  balanceData.bankBalances.forEach(account => {
    const displayName = groupDisplayNames[account.groupName] || account.groupName;
    
    message += `*${displayName}*: `;
    message += ` *€${account.bankBalance.toFixed(2)}*`;  
    
    if (account.accountNumber) {
      message += ` trong TK số: ${account.accountNumber}.`;
    }
    
    if (account.updateDate) {
      message += ` _Cập nhật: ${account.updateDate}_\n\n`;
    }
  });

  //message += "=" .repeat(35) + "\n";
  //message += `**Tổng số dư TK: €${balanceData.totalBankBalance.toFixed(2)}**\n`;

  return message;
}

//cập nhật số dư tài khoản ngân hàng
function updateBankAccountBalance(accountNumber, newBalance, updateDate) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const props = PropertiesService.getScriptProperties();
    
    // Get the named range from sheet settings
    const rangeName = props.getProperty('bankAccountBalanceRange') || 'sodu_TaiKhoanNganHang';
    
    const namedRange = ss.getRangeByName(rangeName);
    if (!namedRange) {
      return {
        success: false,
        error: `❌ Không tìm thấy named range: "${rangeName}"`
      };
    }

    const values = namedRange.getValues();
    const timezone = Session.getScriptTimeZone();
    
    // Parse the new balance
    const balanceAmount = parseFloat(newBalance.replace(/[€,\s]/g, '')) || 0;
    const formattedBalance = Math.round(balanceAmount * 100) / 100;
    
    // Parse the update date
    let parsedDate;
    try {
      const dateParts = updateDate.split('/');
      if (dateParts.length === 3) {
        parsedDate = new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`);
      } else {
        parsedDate = new Date(updateDate);
      }
    } catch (e) {
      parsedDate = new Date();
    }
    
    const formattedDate = Utilities.formatDate(parsedDate, timezone, "dd/MM/yyyy");
    
    // Find the row with matching account number
    let foundRow = -1;
    let currentBalance = 0;
    let groupName = '';
    
    // Skip header row if exists
    const startRow = values[0][0] && values[0][0].toString().toLowerCase().includes('group') ? 1 : 0;
    
    for (let i = startRow; i < values.length; i++) {
      const row = values[i];
      const rowAccountNumber = row[3] || ''; // Column D: Account Number
      
      if (rowAccountNumber && rowAccountNumber.toString().trim() === accountNumber.toString().trim()) {
        foundRow = i;        
        groupName = row[0] || ''; // Column A: Group Name
        currentBalance = row[1] || 0; // Column B: Current Balance  
        break;
      }
    }
    
    if (foundRow === -1) {
      return {
        success: false,
        error: `❌ Không tìm thấy tài khoản với số: ${accountNumber}`
      };
    }        
    
    // Update the 2nd and 5th columns of the range
    // Column 2: Bank Account Balance, Column 5: Update Date
    sheet = namedRange.getSheet ();
    sheet.getRange(namedRange.getRow()+foundRow, namedRange.getColumn()+1).setValue(formattedBalance); // 2nd column: Balance    
    sheet.getRange(namedRange.getRow()+foundRow, namedRange.getColumn()+4).setValue(formattedDate); // 5th column: Update Date

    // Calculate difference
    const difference = sheet.getRange(namedRange.getRow()+foundRow, namedRange.getColumn()+2).getValue();
    
    return {
      success: true,
      accountNumber: accountNumber,
      oldBalance: Math.round(currentBalance * 100) / 100,
      newBalance: formattedBalance,      
      difference: difference,
      groupName: groupName,
      updateDate: formattedDate,
      message: `✅ Đã cập nhật số dư tài khoản *${groupName}*(_#${accountNumber}_)\n💰 Từ: €${Math.round(currentBalance * 100) / 100} → €${formattedBalance}\n📊 Chênh lệch với tính toán: €${Math.round(difference * 100) / 100}`
    };
    
  } catch (error) {
    return {
      success: false,
      error: `❌ Lỗi khi cập nhật số dư tài khoản: ${error.toString()}`
    };
  }
}

//---------------TRANSACTION ID MANAGEMENT-------------------//
//tìm dòng giao dịch theo ID
function findTransactionRowById(sheetName, transactionId) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      return {
        success: false,
        error: `❌ Không tìm thấy sheet "${sheetName}"`
      };
    }

    const data = sheet.getDataRange().getValues();

    // Search for the transaction ID in column G (index 6)
    for (let i = 1; i < data.length; i++) { // Skip header row
      const row = data[i];
      const rowId = row[6]; // Column G: ID

      if (rowId === transactionId) {
        return {
          success: true,
          rowNumber: i + 1,
          rowData: {
            date: row[0],
            description: row[1],
            amount: row[2],
            location: row[3],
            category: row[4],
            bankComment: row[5],
            id: row[6]
          }
        };
      }
    }

    return {
      success: false,
      error: `❌ Không tìm thấy giao dịch với ID: ${transactionId}`
    };

  } catch (error) {
    return {
      success: false,
      error: `❌ Lỗi khi tìm giao dịch: ${error.toString()}`
    };
  }
}

//cập nhật giao dịch theo ID
function updateTransactionById(sheetName, transactionId, updatedData) {
  try {
    const findResult = findTransactionRowById(sheetName, transactionId);

    if (!findResult.success) {
      return findResult;
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);
    const rowNumber = findResult.rowNumber;

    // Update the row with new data, keeping the same ID
    const { date, description, amount, location, category, bankComment } = updatedData;

    sheet.getRange(rowNumber, 1, 1, 7).setValues([[
      date || findResult.rowData.date,
      description || findResult.rowData.description,
      amount || findResult.rowData.amount,
      location || findResult.rowData.location,
      category || findResult.rowData.category,
      bankComment || findResult.rowData.bankComment,
      transactionId // Keep the same ID
    ]]);

    return {
      success: true,
      message: `✅ Đã cập nhật giao dịch ID: ${transactionId}`,
      rowNumber: rowNumber,
      transactionId: transactionId
    };

  } catch (error) {
    return {
      success: false,
      error: `❌ Lỗi khi cập nhật giao dịch: ${error.toString()}`
    };
  }
}

//xóa giao dịch theo ID
function deleteTransactionById(sheetName, transactionId) {
  try {
    const findResult = findTransactionRowById(sheetName, transactionId);

    if (!findResult.success) {
      return findResult;
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);
    const rowNumber = findResult.rowNumber;

    // Delete the row
    sheet.deleteRow(rowNumber);

    return {
      success: true,
      message: `✅ Đã xóa giao dịch ID: ${transactionId}`,
      deletedTransaction: findResult.rowData
    };

  } catch (error) {
    return {
      success: false,
      error: `❌ Lỗi khi xóa giao dịch: ${error.toString()}`
    };
  }
}

//tạo ID cho các giao dịch chưa có ID (migration function)
function migrateTransactionID(sheetName = null) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // Define all transaction group sheets
    const transactionSheets = [
      "💰Thu nhập",
      "🏡Chi phí cố định",
      "🛒Chi phí biến đổi",
      "🛟Quỹ gia đình",
      "✈️Quỹ mục đích",
      "🫙Tiết kiệm"
    ];

    // Determine which sheets to process
    const sheetsToProcess = sheetName ? [sheetName] : transactionSheets;

    let totalProcessed = 0;
    let totalUpdated = 0;
    const results = [];

    sheetsToProcess.forEach(currentSheetName => {
      const sheet = ss.getSheetByName(currentSheetName);

      if (!sheet) {
        results.push({
          sheetName: currentSheetName,
          success: false,
          error: `❌ Không tìm thấy sheet "${currentSheetName}"`
        });
        return;
      }

      const data = sheet.getDataRange().getValues();
      let sheetUpdated = 0;
      let sheetProcessed = 0;

      // Process each row (skip header row)
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        sheetProcessed++;

        // Check if row has data and if ID column (column G, index 6) is empty
        if (row[0] && row[1] && (!row[6] || row[6].toString().trim() === '')) {
          // Generate new ID
          const newId = generateTransactionId();

          // Update the ID column (column G)
          sheet.getRange(i + 1, 7).setValue(newId);
          sheetUpdated++;

          Logger.log(`Generated ID for ${currentSheetName} row ${i + 1}: ${newId}`);
        }
      }

      totalProcessed += sheetProcessed;
      totalUpdated += sheetUpdated;

      results.push({
        sheetName: currentSheetName,
        success: true,
        processed: sheetProcessed,
        updated: sheetUpdated,
        message: `✅ ${currentSheetName}: ${sheetUpdated}/${sheetProcessed} giao dịch được cập nhật ID`
      });
    });

    // Generate summary message
    let summaryMessage = `🆔 **Tạo ID cho giao dịch hoàn tất**\n`;
    summaryMessage += `📊 Tổng kết: ${totalUpdated}/${totalProcessed} giao dịch được cập nhật ID\n\n`;

    results.forEach(result => {
      if (result.success) {
        summaryMessage += `${result.message}\n`;
      } else {
        summaryMessage += `${result.error}\n`;
      }
    });

    return {
      success: true,
      totalProcessed: totalProcessed,
      totalUpdated: totalUpdated,
      results: results,
      message: summaryMessage
    };

  } catch (error) {
    return {
      success: false,
      error: `❌ Lỗi khi tạo ID: ${error.toString()}`
    };
  }
}

//kiểm tra các giao dịch thiếu ID
function checkMissingTxID(sheetName = null) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // Define all transaction group sheets
    const transactionSheets = [
      "💰Thu nhập",
      "🏡Chi phí cố định",
      "🛒Chi phí biến đổi",
      "🛟Quỹ gia đình",
      "✈️Quỹ mục đích",
      "🫙Tiết kiệm"
    ];

    // Determine which sheets to check
    const sheetsToCheck = sheetName ? [sheetName] : transactionSheets;

    let totalTransactions = 0;
    let totalMissing = 0;
    const results = [];

    sheetsToCheck.forEach(currentSheetName => {
      const sheet = ss.getSheetByName(currentSheetName);

      if (!sheet) {
        results.push({
          sheetName: currentSheetName,
          success: false,
          error: `❌ Không tìm thấy sheet "${currentSheetName}"`
        });
        return;
      }

      const data = sheet.getDataRange().getValues();
      let sheetTotal = 0;
      let sheetMissing = 0;
      const missingRows = [];

      // Check each row (skip header row)
      for (let i = 1; i < data.length; i++) {
        const row = data[i];

        // Count rows with transaction data
        if (row[0] && row[1]) {
          sheetTotal++;

          // Check if ID column (column G, index 6) is empty
          if (!row[6] || row[6].toString().trim() === '') {
            sheetMissing++;
            missingRows.push({
              rowNumber: i + 1,
              date: row[0],
              description: row[1],
              amount: row[2]
            });
          }
        }
      }

      totalTransactions += sheetTotal;
      totalMissing += sheetMissing;

      results.push({
        sheetName: currentSheetName,
        success: true,
        total: sheetTotal,
        missing: sheetMissing,
        missingRows: missingRows,
        message: `📋 ${currentSheetName}: ${sheetMissing}/${sheetTotal} giao dịch thiếu ID`
      });
    });

    // Generate summary message
    let summaryMessage = `🔍 **Kiểm tra ID giao dịch**\n`;
    summaryMessage += `📊 Tổng kết: ${totalMissing}/${totalTransactions} giao dịch thiếu ID\n\n`;

    results.forEach(result => {
      if (result.success) {
        summaryMessage += `${result.message}\n`;
        if (result.missing > 0 && result.missingRows.length <= 5) {
          // Show first few missing transactions as examples
          result.missingRows.slice(0, 3).forEach(row => {
            summaryMessage += `  • Dòng ${row.rowNumber}: ${row.date} - ${row.description}\n`;
          });
          if (result.missingRows.length > 3) {
            summaryMessage += `  • ... và ${result.missingRows.length - 3} giao dịch khác\n`;
          }
        }
      } else {
        summaryMessage += `${result.error}\n`;
      }
    });

    return {
      success: true,
      totalTransactions: totalTransactions,
      totalMissing: totalMissing,
      results: results,
      message: summaryMessage
    };

  } catch (error) {
    return {
      success: false,
      error: `❌ Lỗi khi kiểm tra ID: ${error.toString()}`
    };
  }
}

//---------------SEARCH-------------------//
//tìm kiếm giao dịch theo các tiêu chí
function searchTx(searchParams) {
  const { startDate, endDate, groups, categories, keywords } = searchParams;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const timezone = Session.getScriptTimeZone();

  // Get all available transaction groups (sheet names)
  const availableGroups = [
    "💰Thu nhập",
    "🏡Chi phí cố định",
    "🛒Chi phí biến đổi",
    "🛟Quỹ gia đình",
    "✈️Quỹ mục đích",
    "🫙Tiết kiệm"
  ];

  // Determine which groups to search
  let groupsToSearch = groups && groups.length > 0 ? groups : availableGroups;

  // Parse date filters
  let startDateObj = null;
  let endDateObj = null;

  if (startDate) {
    try {
      const dateParts = startDate.split('/');
      if (dateParts.length === 3) {
        startDateObj = new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`);
      }
    } catch (e) {
      Logger.log(`Invalid start date format: ${startDate}`);
    }
  }

  if (endDate) {
    try {
      const dateParts = endDate.split('/');
      if (dateParts.length === 3) {
        endDateObj = new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`);
      }
    } catch (e) {
      Logger.log(`Invalid end date format: ${endDate}`);
    }
  }

  const searchResults = [];
  let totalMatches = 0;

  // Search through each group
  groupsToSearch.forEach(groupName => {
    const sheet = ss.getSheetByName(groupName);
    if (!sheet) {
      Logger.log(`Sheet not found: ${groupName}`);
      return;
    }

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return; // Skip if no data (only header)

    const groupMatches = [];

    // Search through each transaction (skip header row)
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const rowDate = row[0];
      const rowDesc = row[1] || '';
      const rowAmount = row[2];
      const rowLocation = row[3] || '';
      const rowCategory = row[4] || '';
      const rowBankComment = row[5] || '';
      const rowId = row[6] || '';

      // Skip empty rows
      if (!rowDate || !rowDesc) continue;

      let matches = true;

      // Date range filter
      if (startDateObj || endDateObj) {
        try {
          const transactionDate = new Date(rowDate);
          if (startDateObj && transactionDate < startDateObj) matches = false;
          if (endDateObj && transactionDate > endDateObj) matches = false;
        } catch (e) {
          matches = false; // Skip rows with invalid dates
        }
      }

      // Category filter
      if (matches && categories && categories.length > 0) {
        matches = categories.some(cat =>
          rowCategory.toLowerCase().includes(cat.toLowerCase())
        );
      }

      // Keywords filter (search in description and bank comment)
      if (matches && keywords && keywords.length > 0) {
          matches = keywords.some(keyword =>
            rowDesc.toLowerCase().includes(keyword.toLowerCase()) ||
            rowBankComment.toLowerCase().includes(keyword.toLowerCase())
        );
      }

      if (matches) {
        groupMatches.push({
          date: rowDate,
          description: rowDesc,
          amount: rowAmount,
          location: rowLocation,
          category: rowCategory,
          bankComment: rowBankComment,
          id: rowId,
          rowNumber: i + 1
        });
        totalMatches++;
      }
    }

    if (groupMatches.length > 0) {
      searchResults.push({
        groupName: groupName,
        transactions: groupMatches
      });
    }
  });

  return {
    success: true,
    results: searchResults,
    totalMatches: totalMatches,
    searchParams: searchParams
  };
}

//định dạng kết quả tìm kiếm theo cấu trúc phân cấp
function formatSearchResults(searchData) {
  if (!searchData.success || searchData.totalMatches === 0) {
    return "🔍 Không tìm thấy giao dịch nào phù hợp với tiêu chí tìm kiếm.";
  }

  const { results, totalMatches, searchParams } = searchData;
  const timezone = Session.getScriptTimeZone();

  let message = `🔍 *Kết quả tìm kiếm* \(${totalMatches} giao dịch\)\n`;
  message += "\=" .repeat(15) + "\n\n";

  // Add search criteria summary
  if (searchParams.startDate || searchParams.endDate) {
    message += "📅: ";
    if (searchParams.startDate && searchParams.endDate) {
      message += `${searchParams.startDate} - ${searchParams.endDate}\n`;
    } else if (searchParams.startDate) {
      message += `${searchParams.startDate}\n`;
    } else if (searchParams.endDate) {
      message += `-> ${searchParams.endDate}\n`;
    }
  }

  if (searchParams.groups && searchParams.groups.length > 0) {
    message += `${searchParams.groups.join(', ')}\n`;
  }

  if (searchParams.categories && searchParams.categories.length > 0) {
    message += `${searchParams.categories.join(', ')}\n`;
  }

  if (searchParams.keywords && searchParams.keywords.length > 0) {
    message += `🔎 *Từ khóa*\: "${searchParams.keywords.join(', ')}"\n`;
  }

  message += "\n" + "\=" .repeat(15) + "\n\n";

  // Format results by group > category > date
  results.forEach(groupResult => {
    message += `*${groupResult.groupName}*\n`;
    message += "\-" .repeat(15) + "\n";

    // Group transactions by category
    const categorizedTx = {};
    groupResult.transactions.forEach(tx => {
      const category = tx.category || 'Khác';
      if (!categorizedTx[category]) {
        categorizedTx[category] = [];
      }
      categorizedTx[category].push(tx);
    });

    // Sort and display by category
    Object.keys(categorizedTx).sort().forEach(category => {
      message += `\n*${category}*\n`;

      // Sort transactions by date (newest first)
      const sortedTx = categorizedTx[category].sort((a, b) => {
        try {
          return new Date(b.date) - new Date(a.date);
        } catch (e) {
          return 0;
        }
      });

      sortedTx.forEach(tx => {
        try {
          const formattedDate = Utilities.formatDate(new Date(tx.date), timezone, "dd/MM");
          const amount = typeof tx.amount === 'number' ? tx.amount.toFixed(2) : tx.amount;
          message += `  • *${formattedDate}*\: ${tx.description} \- *€${amount}*\n`;
        } catch (e) {
          // Fallback for invalid dates
          const amount = typeof tx.amount === 'number' ? tx.amount.toFixed(2) : tx.amount;
          message += `  • ${tx.date}\: ${tx.description} \- €${amount}\n`;
        }
      });
    });

    message += "\n";
  });

  return message.trim();
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
  promptParts.push("## Các nhóm/mục giao dịch");

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
      promptParts.push(`\n### ${groupName}:\n${items.join('\n')}`);
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
    parts.push("## Hoàn cảnh hộ gia đình");
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
    parts.push("## Hướng dẫn phân loại giao dịch:");
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
    parts.push("## Hướng dẫn dự toán:");
    parts.push(...contextMap.get("Chỉ dẫn dự toán"));
  }

  let contextPrompt = parts.join("\n");  
  return contextPrompt;
}