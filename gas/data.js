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
    const isActive = row[5];

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
    const isActive = row[5];

    if (rowMonthText === sourceMonthText) {
      sourceMonthItems.push({
        group: group,
        category: category,
        amount: amount,
        note: note || '', 
        isActive: isActive
      });

      // Only add to creation list if category doesn't exist in new month
      if (!existingCategories.has(category)) {
        newItemsToCreate.push({
          group: group,
          category: category,
          amount: Math.round(amount*100)/100,  
          note: '', 
          isActive: isActive
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
      const newRow = [newMonthText, item.group, item.category, item.amount, item.note, item.isActive];
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
      groupedNewItems[item.group].push(`  • ${item.category}: ${formatCurrency(item.amount)}`);
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
function setBudgetChange(month, group, category, amount, note, isActive) {
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
      sheet.getRange(i + 1, 6).setValue(isActive); // Column F = isActive
      return `✅ Đã cập nhật dự toán tháng ${rowMonth} cho *${category}* \(${group}\)\: ${formatCurrency(amount)}`; // Stop after first match
    }
  }

  // Nếu chưa có, thêm mới  
  sheet.appendRow([month, group, category, amount, note, isActive]);
  return `➕ Đã thêm dự toán tháng ${month} cho *${category}* \(${group}\)\: ${formatCurrency(amount)}`;
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
    const isActive = row[5];
    if (!summary[tab]) summary[tab] = [];
    summary[tab].push(`- ${category}: ${formatCurrency(budget)}`);
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

  // Validate input date  
  try {
    // Handle different date formats
    if (typeof date === 'string') {
      const dateParts = date.split('/');
      if (dateParts.length === 3) {
        // DD/MM/YYYY format
        new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`);
      } else {
        new Date(date);
      }
    } else {
      new Date(date);
    }
  } catch (e) {
    return {
      exists: false,
      needsConfirmation: false,
      error: `❌ Định dạng ngày không hợp lệ: ${date}`
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

  // Check for existing transactions (skip header row)
  const existingRows = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const rowDate = row[0]; // Column A: Date
    const rowAmount = row[2]; // Column C: Amount
    const rowLocation = row[3]; // Column D: Location
    const rowCategory = row[4]; // Column E: Category
    const rowBankComment = row[5]; // Column F: Bank Comment    

    // Compare dates
    let rowDateFormatted;
    try {
      rowDateFormatted = Utilities.formatDate(new Date(rowDate), timezone, "dd/MM/yyyy");      

      // Check for potential duplicates based on multiple criteria
      const dateMatch = rowDateFormatted === date;
      const amountMatch = Math.abs(parseFloat(rowAmount) - parseFloat(amount)) < 0.01; // Allow small floating point differences
      const bankCommentMatch = bankComment && rowBankComment &&
        (rowBankComment.toLowerCase().includes(bankComment.toLowerCase()) ||
         bankComment.toLowerCase().includes(rowBankComment.toLowerCase()));

      // Consider it a potential duplicate if:
      // Same date AND same amount AND same bank comment
      if (dateMatch && amountMatch && bankCommentMatch) {
        existingRows.push({
          rowNumber: i + 1,
          date: rowDateFormatted,
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

  // Always add the transaction first
  const addResult = addConfirmedTransaction(group, transaction);
  
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
      message += `\- *Dòng ${row.rowNumber}*\: ${row.date} \- ${row.bankComment} \- ${formatCurrency(row.amount)}\n`;
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
          remainingMessage = `💶còn: ${formatCurrency(remaining)}`;
        } else {
          remainingMessage = `⚠️vượt: ${formatCurrency(Math.abs(remaining))}`;
        }
      }
    }

    // Create delete button for the transaction
    const deleteKeyboard = createDeleteKeyboard(transactionId, sheetName);
    
    return {
      success: true,
      message: `${type} *${formatCurrency(amount)}* cho *${description}*\n _✏️${sheetName}, mục ${category}, ${remainingMessage}_\n_\(ID\: ${transactionId}\)_`,
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

//lấy số dư hiện tại của Quỹ -- gia đình (rainy/family), mục tiêu (target) hoặc tiết kiệm (saving)
//Dữ liệu được lấy từ range tổng hợp stats_BalanceOverview (hoặc tên khác cấu hình trong bankAccountBalanceRange)
//Cấu trúc cột: 
// 1: Nhóm (Chi phí cố định, Chi phí biến đổi, Quỹ gia đình, Quỹ mục đích, Tiết kiệm)
// 2: Tiền mặt hiện có cho nhóm
// 3: Số tiền cần theo dự toán / số dư quỹ tính toán
// 4: Chênh lệch giữa (2) và (3)
// 5: Số tài khoản ngân hàng (nếu có)
// 6: Ngày cập nhật
// 7: Mục tiêu nếu có
// 8: Ghi chú
function getFundBalances(type) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const props = PropertiesService.getScriptProperties();
    const rangeName = props.getProperty('bankAccountBalanceRange') || 'stats_BalanceOverview';
    const namedRange = ss.getRangeByName(rangeName);

    if (!namedRange) {
      return {
        success: false,
        error: `❌ Không tìm thấy named range: "${rangeName}"`
      };
    }

    const values = namedRange.getValues();
    const timezone = Session.getScriptTimeZone();

    // Hỗ trợ cả "rainy" và "family" là Quỹ gia đình
    const normalizedType = (type || 'all').toLowerCase();

    const typeToGroupName = {
      rainy: 'Quỹ gia đình',
      family: 'Quỹ gia đình',
      target: 'Quỹ mục đích',
      saving: 'Tiết kiệm'
    };

    const resultBalances = {};
    let totalCash = 0;
    let totalPlanned = 0;
    let totalGap = 0;

    // Bỏ qua header nếu có
    const startRow = values[0][0] && values[0][0].toString().toLowerCase().includes('group') ? 1 : 0;

    for (let i = startRow; i < values.length; i++) {
      const row = values[i];
      const groupName = (row[0] || '').toString().trim();
      if (!groupName) continue;

      // Xác định type tương ứng cho dòng này (chỉ lấy các quỹ)
      let fundType = null;
      if (groupName.indexOf('Quỹ gia đình') !== -1) {
        fundType = 'rainy';
      } else if (groupName.indexOf('Quỹ mục đích') !== -1) {
        fundType = 'target';
      } else if (groupName.indexOf('Tiết kiệm') !== -1) {
        fundType = 'saving';
      }

      if (!fundType) {
        // Không phải dòng quỹ → bỏ qua
        continue;
      }

      // Nếu gọi với type cụ thể thì chỉ lấy đúng loại
      if (normalizedType !== 'all' && fundType !== normalizedType) {
        continue;
      }

      const cash = parseFloat(row[1]) || 0;
      const planned = parseFloat(row[2]) || 0;
      const gap = parseFloat(row[3]) || 0;
      const accountNumber = row[4] || '';
      const updateDateRaw = row[5] || '';
      const targetAmount = parseFloat(row[6]) || 0;
      const note = row[7] || '';

      let updateDate = '';
      if (updateDateRaw) {
        try {
          updateDate = Utilities.formatDate(updateDateRaw, timezone, 'dd/MM/yyyy');
        } catch (e) {
          updateDate = updateDateRaw.toString();
        }
      }

      resultBalances[fundType] = {
        groupName: groupName,
        cashAvailable: Math.round(cash * 100) / 100,
        plannedAmount: Math.round(planned * 100) / 100,
        gap: Math.round(gap * 100) / 100,
        accountNumber: accountNumber,
        updateDate: updateDate,
        targetAmount: Math.round(targetAmount * 100) / 100,
        note: note
      };

      totalCash += Math.round(cash * 100) / 100;
      totalPlanned += Math.round(planned * 100) / 100;
      totalGap += Math.round(gap * 100) / 100;
    }

    if (normalizedType !== 'all' && !resultBalances[normalizedType]) {
      return {
        success: false,
        error: `❌ Không tìm thấy dữ liệu cho loại quỹ "${type}". Các loại hợp lệ: rainy, target, saving, all`
      };
    }

    return {
      success: true,
      type: normalizedType,
      balances: resultBalances,
      totals: {
        cash: totalCash,
        planned: totalPlanned,
        gap: totalGap
      },
      grandTotal: totalCash, // giữ field cũ cho tương thích ngược
      rangeName: rangeName
    };

  } catch (error) {
    return {
      success: false,
      error: `❌ Lỗi khi lấy số dư quỹ: ${error.toString()}`
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
    message += "\\-" .repeat(15) + "\n";

    const fundNames = {
      "rainy": "🛟Quỹ Gia Đình",
      "target": "🎯Quỹ Mục Đích",
      "saving": "💎Tiết Kiệm"
    };

    ["rainy", "target", "saving"].forEach(fundType => {
      const fund = balanceData.balances[fundType];
      if (!fund) return;

      const fundName = fundNames[fundType] || fundType;

      message += `*${fundName}*\n`;
      message += `  • Số dư: ${formatCurrency(fund.cashAvailable)}\n`;
      message += `  • Mức tính toán: ${formatCurrency(fund.plannedAmount)}\n`;
      message += `  • Chênh lệch\ ${formatCurrency(fund.gap)}\n`;

      if (fund.targetAmount && fund.targetAmount !== 0) {
        message += `  • Mục tiêu: ${formatCurrency(fund.targetAmount)}\n`;
      }

      if (fund.accountNumber) {
        message += `  • TK: ${fund.accountNumber}`;
        if (fund.updateDate) {
          message += ` (_cập nhật: ${fund.updateDate}_)`;
        }
        message += `\n`;
      }

      if (fund.note) {
        message += `  • Ghi chú: ${fund.note}\n`;
      }

      message += `\n`;
    });

    const totalCash = balanceData.totals && typeof balanceData.totals.cash === 'number'
      ? balanceData.totals.cash
      : balanceData.grandTotal || 0;

    message += `🏦 *Tổng cộng tiền quỹ hiện có: ${formatCurrency(totalCash)}*`;
    return message;

  } else {
    // Single fund type (rainy / target / saving)
    const fundNames = {
      "rainy": "🛟Quỹ Gia Đình",
      "target": "🎯Quỹ Mục Đích",
      "saving": "💎Tiết Kiệm"
    };

    const fundType = balanceData.type;
    const fundName = fundNames[fundType] || fundType;
    let message = `💰*${fundName}*\n`;
    message += "\\-" .repeat(15) + "\n";

    const fund = balanceData.balances && balanceData.balances[fundType];

    if (!fund) {
      message += "_Không có dữ liệu_";
      return message;
    }

    message += `• Tiền hiện có: ${formatCurrency(fund.cashAvailable)}\n`;
    message += `• Mức cần theo kế hoạch: ${formatCurrency(fund.plannedAmount)}\n`;
    message += `• Chênh lệch: ${formatCurrency(fund.gap)}\n`;

    if (fund.targetAmount && fund.targetAmount !== 0) {
      message += `• Mục tiêu: ${formatCurrency(fund.targetAmount)}\n`;
    }

    if (fund.accountNumber) {
      message += `• TK: ${fund.accountNumber}`;
      if (fund.updateDate) {
        message += ` (_cập nhật: ${fund.updateDate}_)`;
      }
      message += `\n`;
    }

    if (fund.note) {
      message += `• Ghi chú: ${fund.note}\n`;
    }

    const totalCash = balanceData.totals && typeof balanceData.totals.cash === 'number'
      ? balanceData.totals.cash
      : fund.cashAvailable;

    message += `\n*Tổng: ${formatCurrency(totalCash)}*`;

    return message;
  }
}

//lấy dữ liệu chi tiết tiết kiệm từ stats_SavingBreakdown
//Cấu trúc cột:
// 1: Type (cash, forex, coin, etf, etc.)
// 2: Balance (số tiền hiện có)
// 3: Account number
// 4: Balance in forex (nếu có)
// 5: Update date
// 6: Note
function getSavingBreakdown() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const props = PropertiesService.getScriptProperties();
    
    // Get the named range from sheet settings
    const rangeName = props.getProperty('range_Savings') || 'stats_SavingBreakdown';
    
    const namedRange = ss.getRangeByName(rangeName);
    if (!namedRange) {
      return {
        success: false,
        error: `❌ Không tìm thấy named range: "${rangeName}"`
      };
    }

    const values = namedRange.getValues();
    const timezone = Session.getScriptTimeZone();
    
    const savingItems = [];
    let totalBalance = 0;

    // Skip header row if exists
    const startRow = values[0][0] && values[0][0].toString().toLowerCase().includes('type') ? 1 : 0;

    for (let i = startRow; i < values.length; i++) {
      const row = values[i];
      
      // Check if row has valid data
      if (row[0] && row[1] !== null && row[1] !== undefined) {
        const type = (row[0] || '').toString().trim();
        const balance = parseFloat(row[1]) || 0;
        const accountNumber = row[2] || '';
        const balanceForex = parseFloat(row[3]) || 0;
        const updateDateRaw = row[4] || '';
        const note = row[5] || '';

        let updateDate = '';
        if (updateDateRaw) {
          try {
            updateDate = Utilities.formatDate(updateDateRaw, timezone, "dd/MM/yyyy");
          } catch (e) {
            updateDate = updateDateRaw.toString();
          }
        }

        savingItems.push({
          type: type,
          balance: Math.round(balance * 100) / 100,
          accountNumber: accountNumber,
          balanceForex: balanceForex > 0 ? Math.round(balanceForex * 100) / 100 : null,
          updateDate: updateDate,
          note: note
        });

        totalBalance += Math.round(balance * 100) / 100;
      }
    }

    return {
      success: true,
      savingItems: savingItems,
      totalBalance: totalBalance,
      rangeName: rangeName,
      lastUpdated: new Date().toISOString()
    };

  } catch (error) {
    return {
      success: false,
      error: `❌ Lỗi khi lấy dữ liệu chi tiết tiết kiệm: ${error.toString()}`
    };
  }
}

//lấy dữ liệu số dư tài khoản ngân hàng từ bảng tổng hợp stats_BalanceOverview
//và tích hợp thêm dữ liệu chi tiết tiết kiệm từ stats_SavingBreakdown
function getBankAccountBalances() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const props = PropertiesService.getScriptProperties();
    
    // Get the named range from sheet settings
    const rangeName = props.getProperty('bankAccountBalanceRange') || 'stats_BalanceOverview';
    
    const namedRange = ss.getRangeByName(rangeName);
    if (!namedRange) {
      return {
        success: false,
        error: `❌ Không tìm thấy named range: "${rangeName}"`
      };
    }

    const values = namedRange.getValues();
    const timezone = Session.getScriptTimeZone();
    
    // Expected columns in overview range:
    // 1: Group Name (Chi phí cố định, Chi phí biến đổi, Quỹ gia đình, Quỹ mục đích, Tiết kiệm)
    // 2: Cash available / Bank Account Balance
    // 3: Remaining monthly budget or calculated fund balance
    // 4: Gap between (2) and (3)
    // 5: Bank Account Number
    // 6: Update Date
    // 7: Target amount (optional)
    // 8: Note (optional)
    const bankBalances = [];
    let totalBankBalance = 0;
    let totalDifference = 0;

    // Skip header row if exists
    const startRow = values[0][0] && values[0][0].toString().toLowerCase().includes('group') ? 1 : 0;

    for (let i = startRow; i < values.length; i++) {
      const row = values[i];
      
      // Check if row has valid data
      if (row[0] && row[1] !== null && row[1] !== undefined) {
        const groupName = row[0].toString().trim();

        // Chỉ lấy các nhóm chi tiêu có tài khoản ngân hàng thực tế (không lấy các quỹ)
        if (
          groupName.indexOf('Chi phí cố định') === -1 &&
          groupName.indexOf('Chi phí biến đổi') === -1 &&
          groupName.indexOf('Quỹ gia đình') === -1
        ) {
          continue;
        }

        const bankBalance = parseFloat(row[1]) || 0;
        const difference = parseFloat(row[3]) || 0; // cột 4: chênh lệch giữa số dư và dự toán
        const accountNumber = row[4] || '';
        const updateDateRaw = row[5] || '';      

        let updateDate = '';
        if (updateDateRaw) {
          try {
            updateDate = Utilities.formatDate(updateDateRaw, timezone, "dd/MM/yyyy");
          } catch (e) {
            updateDate = updateDateRaw.toString();
          }
        }
 
        bankBalances.push({
          groupName: groupName,
          bankBalance: Math.round(bankBalance * 100) / 100,
          difference: Math.round(difference * 100) / 100,          
          accountNumber: accountNumber,
          updateDate: updateDate
        });
 
        totalBankBalance += Math.round(bankBalance * 100) / 100;
        totalDifference += Math.round(difference * 100) / 100;
      }
    }

    // Get saving breakdown data
    const savingBreakdown = getSavingBreakdown();
 
    return {
      success: true,
      bankBalances: bankBalances,
      totalBankBalance: totalBankBalance,
      totalDifference: totalDifference,
      savingBreakdown: savingBreakdown.success ? savingBreakdown : null,
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

//định dạng chi tiết tiết kiệm để hiển thị
function formatSavingBreakdown(savingData) {
  if (!savingData || !savingData.success) {
    return savingData && savingData.error ? savingData.error : "";
  }

  if (!savingData.savingItems || savingData.savingItems.length === 0) {
    return "";
  }

  let message = "\n💎*Chi tiết tiết kiệm*\n";
  message += "\\-" .repeat(15) + "\n";

  // Group by type for better display
  const byType = {};
  savingData.savingItems.forEach(item => {
    if (!byType[item.type]) {
      byType[item.type] = [];
    }
    byType[item.type].push(item);
  });

  Object.keys(byType).sort().forEach(type => {
    const items = byType[type];
    message += `*${type.toUpperCase()}*\n`;
    
    items.forEach(item => {
      message += `  • ${formatCurrency(item.balance)}`;
      
      if (item.balanceForex) {
        message += ` (${formatCurrency(item.balanceForex)} forex)`;
      }
      
      if (item.accountNumber) {
        message += ` - TK: ${item.accountNumber}`;
      }
      
      if (item.updateDate) {
        message += ` (_${item.updateDate}_)`;
      }
      
      if (item.note) {
        message += `\n    _${item.note}_`;
      }
      
      message += `\n`;
    });
  });

  message += `\n*Tổng tiết kiệm\: ${formatCurrency(savingData.totalBalance)}*\n`;

  return message;
}

//định dạng số dư tài khoản ngân hàng để hiển thị
function formatBankAccountBalances(balanceData) {
  if (!balanceData.success) {
    return balanceData.error;
  }

  let message = "🏦*Số dư tài khoản ngân hàng*\n";
  message += "\\-" .repeat(15) + "\n";

  if (balanceData.bankBalances.length === 0) {
    message += "_Không có dữ liệu số dư tài khoản ngân hàng_\n";
  } else {
    // Group display names mapping, exclude "Quỹ mục tiêu" and "Tiết kiệm" as they do not have email notifications
    const groupDisplayNames = {
      "Chi phí cố định": "🏡Chi phí cố định",
      "Chi phí biến đổi": "🛒Chi phí biến đổi", 
      "Quỹ gia đình": "🛟Quỹ gia đình",
    };

    balanceData.bankBalances.forEach(account => {
      const displayName = groupDisplayNames[account.groupName] || account.groupName;
      
      message += `*${displayName}*: `;
      message += ` *${formatCurrency(account.bankBalance)}*`;  
      
      if (account.accountNumber) {
        message += ` trong TK số: ${account.accountNumber}.`;
      }
      
      if (account.updateDate) {
        message += ` _Cập nhật: ${account.updateDate}_\n\n`;
      }
    });
  }

  // Add saving breakdown if available
  if (balanceData.savingBreakdown && balanceData.savingBreakdown.success) {
    message += formatSavingBreakdown(balanceData.savingBreakdown);
  }

  return message;
}

//cập nhật số dư tài khoản ngân hàng
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
    
    // Parse the new balance using locale-aware parsing
    const balanceAmount = parseCurrency(newBalance) || 0;
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
      const rowAccountNumber = row[4] || ''; // Column I: Account Number
      
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
    sheet.getRange(namedRange.getRow()+foundRow, namedRange.getColumn()+5).setValue(formattedDate); // 5th column: Update Date

    // Calculate difference
    const difference = sheet.getRange(namedRange.getRow()+foundRow, namedRange.getColumn()+3).getValue();
    if (difference > 0) {
      warning = `👉 *Dư ${formatCurrency(difference)}* so với dự toán. Cân nhắc chuyển vào quỹ hay tiết kiệm.`;
    } else if (difference < 0) {
      warning = `⚠️ *Thiếu ${formatCurrency(Math.abs(difference))}* so với dự toán. Cân nhắc bổ sung thêm.`;
    } else {
      warning = `✅ Đủ với dự toán.`;
    }

    
    return {
      success: true,
      accountNumber: accountNumber,
      oldBalance: Math.round(currentBalance * 100) / 100,
      newBalance: formattedBalance,      
      difference: difference,
      groupName: groupName,
      updateDate: formattedDate,
      message: `✍️ Số dư TK dùng cho *${groupName}*\n💰 Từ: ${formatCurrency(currentBalance)} → ${formatCurrency(formattedBalance)}\n ${warning}`
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

  const availableGroups = [
    "💰Thu nhập",
    "🏡Chi phí cố định",
    "🛒Chi phí biến đổi",
    "🛟Quỹ gia đình",
    "✈️Quỹ mục đích",
    "🫙Tiết kiệm"
  ];

  const groupsToSearch = Array.isArray(groups) && groups.length > 0 ? groups : availableGroups;
  const startDateObj = parseDateInput(startDate);
  const endDateObj = parseDateInput(endDate);
  const normalizedCategories = normalizeArrayInput(categories);
  const normalizedKeywords = normalizeArrayInput(keywords);
  const keywordRegex = buildKeywordRegex(normalizedKeywords);

  const searchResults = [];
  let totalMatches = 0;

  groupsToSearch.forEach(groupName => {
    const sheet = ss.getSheetByName(groupName);
    if (!sheet) {
      Logger.log(`Sheet not found: ${groupName}`);
      return;
    }

    const dataRange = sheet.getDataRange();
    if (dataRange.getNumRows() <= 1) {
      return;
    }

    const values = dataRange.getValues();
    const existingFilter = sheet.getFilter();
    if (existingFilter) {
      existingFilter.remove();
    }

    const filter = dataRange.createFilter();
    const appliedColumns = [];

    try {
      if (startDateObj || endDateObj) {
        const dateCriteriaBuilder = SpreadsheetApp.newFilterCriteria();

        if (startDateObj && endDateObj) {
          var startDateNum = startDateObj.getTime()/1000/86400 + 25569;
          var endDateNum = endDateObj.getTime()/1000/86400 + 25569;
          dateCriteriaBuilder.whenNumberBetween(startDateNum, endDateNum); 
        } else if (startDateObj) {
          dateCriteriaBuilder.whenDateAfter(startDateObj);
        } else if (endDateObj) {
          dateCriteriaBuilder.whenDateBefore(endDateObj);
        }

        filter.setColumnFilterCriteria(1, dateCriteriaBuilder.build());
        appliedColumns.push(1);
      }

      if (normalizedCategories.length > 0) {
        const visibleCategories = resolveVisibleCategories(values, normalizedCategories);
        if (visibleCategories.length === 0) {
          return;
        }

        const categoryCriteria = SpreadsheetApp.newFilterCriteria()
          .whenTextEqualToAny(visibleCategories)
          .build();

        filter.setColumnFilterCriteria(5, categoryCriteria);
        appliedColumns.push(5);
      }

      if (keywordRegex) {
        const firstDataRow = dataRange.getRow() + 1;
        const keywordFormula = `=REGEXMATCH(LOWER($B${firstDataRow}&" "&$F${firstDataRow}), "${keywordRegex}")`;
        const keywordCriteria = SpreadsheetApp.newFilterCriteria()
          .whenFormulaSatisfied(keywordFormula)
          .build();

        //filter the description column
        filter.setColumnFilterCriteria(2, keywordCriteria);
        appliedColumns.push(2);

        //filter the bank comment column
        filter.setColumnFilterCriteria(5, keywordCriteria);
        appliedColumns.push(5);
      }

      const groupMatches = [];

      for (let i = 1; i < values.length; i++) {
        const sheetRow = dataRange.getRow() + i;
        if (appliedColumns.length > 0 && sheet.isRowHiddenByFilter(sheetRow)) {
          continue;
        }

        const row = values[i];
        const rowDate = row[0];
        const rowDesc = row[1] || '';
        const rowAmount = row[2];
        const rowLocation = row[3] || '';
        const rowCategory = row[4] || '';
        const rowBankComment = row[5] || '';
        const rowId = row[6] || '';

        groupMatches.push({
          date: rowDate,
          description: rowDesc,
          amount: rowAmount,
          location: rowLocation,
          category: rowCategory,
          bankComment: rowBankComment,
          id: rowId,
          rowNumber: sheetRow
        });
        totalMatches++;
      }

      if (groupMatches.length > 0) {
        searchResults.push({
          groupName: groupName,
          transactions: groupMatches
        });
      }
    } finally {
      filter.remove();
    }
  });

  return {
    success: true,
    results: searchResults,
    totalMatches: totalMatches,
    searchParams: searchParams
  };
}

  function parseDateInput(dateValue) {
    if (!dateValue) return null;

    if (Object.prototype.toString.call(dateValue) === '[object Date]' && !isNaN(dateValue)) {
      return new Date(dateValue);
    }

    if (typeof dateValue === 'string') {
      const dateParts = dateValue.split('/');
      if (dateParts.length === 3) {
        const [day, month, year] = dateParts;
        const parsed = new Date(`${year}-${month}-${day}`);
        if (!isNaN(parsed)) {
          return parsed;
        }
      }

      const parsed = new Date(dateValue);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }

    Logger.log(`Invalid date input for searchTx: ${dateValue}`);
    return null;
  }

  function normalizeArrayInput(values) {
    if (!Array.isArray(values)) {
      return [];
    }

    return values
      .map(value => (value || '').toString().trim())
      .filter(Boolean);
  }

  function resolveVisibleCategories(values, categoryFilters) {
    const matchedCategories = new Set();
    const lowerFilters = categoryFilters.map(cat => cat.toLowerCase());

    for (let i = 1; i < values.length; i++) {
      const rowCategory = values[i][4];
      if (!rowCategory) continue;

      const lowerCategory = rowCategory.toString().toLowerCase();
      if (lowerFilters.some(filterValue => lowerCategory.indexOf(filterValue) !== -1)) {
        matchedCategories.add(rowCategory);
      }
    }

    return Array.from(matchedCategories);
  }

  function buildKeywordRegex(keywordList) {
    if (!keywordList || keywordList.length === 0) {
      return '';
    }

    const sanitized = keywordList
      .map(keyword => keyword.toLowerCase())
      .filter(Boolean)
      .map(keyword => keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .map(keyword => keyword.replace(/"/g, '""'));

    if (sanitized.length === 0) {
      return '';
    }

    return sanitized.join('|');
  }

//định dạng kết quả tìm kiếm theo cấu trúc phân cấp
function formatSearchResults(searchData) {
  if (!searchData.success || searchData.totalMatches === 0) {
    return "🔍 Không tìm thấy giao dịch nào phù hợp với tiêu chí tìm kiếm.";
  }

  const { results, totalMatches, searchParams } = searchData;
  const timezone = Session.getScriptTimeZone();

  let message = `🔍 *Kết quả tìm kiếm* \(${totalMatches} giao dịch\)\n\n`;
  message += "\\=" .repeat(15) + "\n";

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

  message += "\\=" .repeat(15) + "\n\n";

  // Format results by group > category > date
  results.forEach(groupResult => {
    message += `*${groupResult.groupName}*\n`;
    message += "\\-" .repeat(15) + "\n";

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
          const amount = typeof tx.amount === 'number' ? tx.amount : parseFloat(tx.amount);
          message += `  • *${formattedDate}*\: ${tx.description} \- *${formatCurrency(amount)}* (${tx.id})\n`;
        } catch (e) {
          // Fallback for invalid dates
          const amount = typeof tx.amount === 'number' ? tx.amount : parseFloat(tx.amount);
          message += `  • ${tx.date}\: ${tx.description} \- ${formatCurrency(amount)}\n`;
        }
      });
    });

    message += "\n";
  });

  return message.trim();
}

//---------------CONTEXT-------------------//
//lấy danh sách các nhóm và mục giao dịch
//Function moved to gas/categories/dataCategories.js

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

//---------------PROJECT MODE SUPPORT-------------------//


function initializeProjectMetadataSheet() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let projectMetadataSheet = ss.getSheetByName('project_metadata');
    
    if (!projectMetadataSheet) {
      // Create the project metadata sheet
      projectMetadataSheet = ss.insertSheet('project_metadata');
      
      // Add headers
      const headers = [
        'ID',
        'Name', 
        'Description',
        'Type',
        'Hashtag',
        'From Date',
        'To Date',
        'Note'
      ];
      
      projectMetadataSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      
      // Format headers
      const headerRange = projectMetadataSheet.getRange(1, 1, 1, headers.length);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#f0f0f0');
      
      Logger.log('Project metadata sheet created successfully');
      
      return {
        success: true,
        message: 'Project metadata sheet created successfully',
        sheet: projectMetadataSheet
      };
    }
    
    return {
      success: true,
      message: 'Project metadata sheet already exists',
      sheet: projectMetadataSheet
    };
    
  } catch (error) {
    Logger.log(`Error initializing project metadata sheet: ${error.toString()}`);
    return {
      success: false,
      error: `Error initializing project metadata sheet: ${error.toString()}`,
      sheet: null
    };
  }
}

/**
 * Create a new project entry in the metadata sheet
 * @param {Object} projectData - Project data object
 * @returns {Object} Result of project creation
 */
function createProject(projectData) {
  try {
    const { name, description, type, hashtag, fromDate, toDate, note } = projectData;
    
    // Initialize sheet if needed
    const initResult = initializeProjectMetadataSheet();
    if (!initResult.success) {
      return initResult;
    }
    
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const projectMetadataSheet = ss.getSheetByName('project_metadata');
    
    // Generate project ID
    const projectId = generateProjectId();
    
    // Add project to metadata sheet
    projectMetadataSheet.appendRow([
      projectId,
      name,
      description || '',
      type || 'general',
      hashtag,
      fromDate || new Date(),
      toDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default to 30 days from now
      note || ''
    ]);
    
    Logger.log(`Project created: ${name} (${hashtag})`);
    
    return {
      success: true,
      message: `Project '${name}' created successfully`,
      projectId: projectId,
      projectData: projectData
    };
    
  } catch (error) {
    Logger.log(`Error creating project: ${error.toString()}`);
    return {
      success: false,
      error: `Error creating project: ${error.toString()}`
    };
  }
}

/**
 * Generate a unique project ID
 * @returns {string} Unique project ID
 */
function generateProjectId() {
  const timestamp = new Date().getTime().toString();
  const random = Math.random().toString(36).substr(2, 5);
  return `PROJ_${timestamp}_${random}`;
}

/**
 * Get all active projects
 * @returns {Object} Active projects result
 */
function getActiveProjects() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const projectMetadataSheet = ss.getSheetByName('project_metadata');
    
    if (!projectMetadataSheet) {
      return {
        success: false,
        error: 'Project metadata sheet not found',
        projects: []
      };
    }
    
    const data = projectMetadataSheet.getDataRange().getValues();
    if (data.length <= 1) {
      return {
        success: true,
        projects: [],
        message: 'No projects found'
      };
    }
    
    const currentDate = new Date();
    const activeProjects = [];
    
    // Skip header row
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const fromDate = row[5] ? new Date(row[5]) : null;
      const toDate = row[6] ? new Date(row[6]) : null;
      
      // Check if project is currently active
      const isActive = (!fromDate || currentDate >= fromDate) && 
                      (!toDate || currentDate <= toDate);
      
      if (isActive) {
        activeProjects.push({
          id: row[0],
          name: row[1],
          description: row[2],
          type: row[3],
          hashtag: row[4],
          from: fromDate,
          to: toDate,
          note: row[7]
        });
      }
    }
    
    return {
      success: true,
      projects: activeProjects,
      count: activeProjects.length
    };
    
  } catch (error) {
    Logger.log(`Error getting active projects: ${error.toString()}`);
    return {
      success: false,
      error: `Error getting active projects: ${error.toString()}`,
      projects: []
    };
  }
}