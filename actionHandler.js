//xử lý các hành động cho từng intent
//mỗi hàm trả về object với structure: { success: boolean, messages: string[], logs: string[] }

//xử lý intent addTx - thêm giao dịch
function handleAddTransaction(intentObj) {
  try {
    const { tab } = intentObj;
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(tab);

    if (!sheet) {
      return {
        success: false,
        messages: [`❌ Không tìm thấy sheet "${tab}".`],
        logs: [`Sheet not found: ${tab}`]
      };
    }

    const dateTx = intentObj.date || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy");
    const lastRow = sheet.getLastRow();

    sheet.appendRow([
      dateTx,
      intentObj.desc,
      intentObj.amount,
      intentObj.location,
      intentObj.category,
      intentObj.comment,
      intentObj.suggestion
    ]);

    const rowID = lastRow + 1;
    const message = `✚${intentObj.confirmation}\n _(dòng ${rowID})_`;

    return {
      success: true,
      messages: [message],
      logs: [message]
    };

  } catch (error) {
    return {
      success: false,
      messages: [`❌ Lỗi khi thêm giao dịch: ${error.toString()}`],
      logs: [`Error in handleAddTransaction: ${error.toString()}`]
    };
  }
}

//xử lý intent modifyTx - chỉnh sửa giao dịch
function handleModifyTransaction(intentObj, originalText, replyText) {
  try {
    const { tab, newtab, row } = intentObj;
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(tab);

    if (!sheet) {
      return {
        success: false,
        messages: [`❌ Không tìm thấy sheet "${tab}".`],
        logs: [`Sheet not found: ${tab}`]
      };
    }

    // Get current transaction data
    const current = {
      date: sheet.getRange(row, 1).getValue(),
      desc: sheet.getRange(row, 2).getValue(),
      amount: sheet.getRange(row, 3).getValue(),
      location: sheet.getRange(row, 4).getValue(),
      category: sheet.getRange(row, 5).getValue(),
      comment: sheet.getRange(row, 6).getValue(),
    };

    let confirmation = `✅ ${intentObj.confirmation}`;

    // Update transaction
    if (!newtab) {
      // Update in same sheet
      sheet.getRange(row, 1).setValue(intentObj.date || current.date);
      sheet.getRange(row, 2).setValue(intentObj.desc || current.desc);
      sheet.getRange(row, 3).setValue(intentObj.amount || current.amount);
      sheet.getRange(row, 4).setValue(intentObj.location || current.location);
      sheet.getRange(row, 5).setValue(intentObj.category || current.category);
      sheet.getRange(row, 6).setValue(intentObj.comment || current.comment);

      confirmation = `✅ ${intentObj.confirmation}\n_(dòng ${row})_`
    } else {
      // Move to different sheet
      const newSheet = ss.getSheetByName(newtab);
      const lastRow = newSheet.getLastRow();
      newSheet.appendRow([
        current.date,
        current.desc,
        current.amount,
        current.location,
        intentObj.category,
        current.comment,
      ]);      

      sheet.deleteRow(row);

      confirmation = `✅ ${intentObj.confirmation}\n_(dòng ${lastRow})_`
    }

    // Detect new context for learning
    const props = PropertiesService.getScriptProperties();
    const promptsSettings = props.getProperty("sheet_ContextConfig") || '🤖Tùy chỉnh Prompts';
    const promptsSettingsTab = ss.getSheetByName(promptsSettings);

    if (promptsSettingsTab) {
      const instruction = detectNewContextWithOpenAI(current, originalText, replyText);

      if (instruction.instructionGroup && instruction.instructionName && instruction.instructionContent) {
        promptsSettingsTab.appendRow([
          instruction.instructionGroup,
          instruction.instructionName,
          instruction.instructionContent,
        ]);
      }
    }

    return {
      success: true,
      messages: confirmation,
      logs: [intentObj.confirmation || `Transaction updated in ${tab}, row ${row}`]
    };

  } catch (error) {
    return {
      success: false,
      messages: [`❌ Lỗi khi chỉnh sửa giao dịch: ${error.toString()}`],
      logs: [`Error in handleModifyTransaction: ${error.toString()}`]
    };
  }
}

//xử lý intent deleteTx - xóa giao dịch
function handleDeleteTransaction(intentObj) {
  try {
    const { tab, row } = intentObj;
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(tab);

    if (!sheet) {
      return {
        success: false,
        messages: [`❌ Không tìm thấy sheet "${tab}".`],
        logs: [`Sheet not found: ${tab}`]
      };
    }

    sheet.deleteRow(row);
    const message = intentObj.confirmation || `🗑️ Đã xoá giao dịch ở tab ${tab}, dòng ${row}`;

    return {
      success: true,
      messages: [message],
      logs: [message]
    };

  } catch (error) {
    return {
      success: false,
      messages: [`❌ Lỗi khi xóa giao dịch: ${error.toString()}`],
      logs: [`Error in handleDeleteTransaction: ${error.toString()}`]
    };
  }
}

//xử lý intent getMonthlyReport - lấy báo cáo tháng
function handleGetMonthlyReport(intentObj, originalText) {
  try {
    const { month, year } = intentObj;
    
    // Determine the month to analyze
    let monthToAnalyze;
    if (month && year) {
      monthToAnalyze = `${month.padStart(2, '0')}/${year}`;
    } else if (month) {
      const currentYear = new Date().getFullYear();
      monthToAnalyze = `${month.padStart(2, '0')}/${currentYear}`;
    } else {
      monthToAnalyze = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "MM/yyyy");
    }
    
    // Generate expense analytics prompt and get AI analysis
    const expensePrompt = generateExpenseAnalyticsPrompt(originalText, monthToAnalyze, "dashboard");
    const expenseAnalysis = analyseDataWithOpenAI(expensePrompt);
    
    return {
      success: true,
      messages: [expenseAnalysis],
      logs: [`Monthly report generated for ${monthToAnalyze}`]
    };
    
  } catch (error) {
    return {
      success: false,
      messages: [`❌ Lỗi khi tạo báo cáo: ${error.toString()}`],
      logs: [`Error in handleGetMonthlyReport: ${error.toString()}`]
    };
  }
}

//xử lý intent createBudget - tạo dự toán
function handleCreateBudget(intentObj) {
  try {
    const { sourceMonth, month } = intentObj;

    sendTelegramMessage (intentObj.confirmation);
    
    // Use the selective budget creation function
    const creationResult = createBudgetSelectively(month, sourceMonth);
    
    if (creationResult.error) {
      return {
        success: false,
        messages: [creationResult.error],
        logs: [`Error creating budget: ${creationResult.error}`]
      };
    }
    
    const messages = [creationResult.summary];
    
    // If there are existing budget lines, show them and ask for modification
    if (creationResult.existingLines && creationResult.existingLines.length > 0) {
      let existingMessage = "\n📋 **Các dự toán đã tồn tại:**\n\n";
      creationResult.existingLines.forEach((line, index) => {
        existingMessage += `${index + 1}. **${line.group}** / ${line.category} / €${line.amount}\n`;
      });
      existingMessage += "\n💬 Trả lời tin nhắn này nếu bạn muốn chỉnh sửa các dự toán đã tồn tại.";
      messages.push(existingMessage);
    }
    
    // Generate budget analysis
    const budgetPrompt = generateBudgetAnalyticsPrompt(month, sourceMonth);
    const budgetAnalysis = analyseDataWithOpenAI(budgetPrompt);
    messages.push(budgetAnalysis);
    
    return {
      success: true,
      messages: messages,
      logs: [intentObj.confirmation || `Budget created for ${month}`]
    };
    
  } catch (error) {
    return {
      success: false,
      messages: [`❌ Lỗi khi tạo dự toán: ${error.toString()}`],
      logs: [`Error in handleCreateBudget: ${error.toString()}`]
    };
  }
}

//xử lý intent modifyBudget - chỉnh sửa dự toán
function handleModifyBudget(intentObj) {
  try {
    const { month, changes } = intentObj;
    const results = [];
    
    changes.forEach(change => {
      const category = change.category;
      const group = change.group;
      const note = change["ghi chú"];
      const amount = parseFloat(change.amount.replace(/[€\s]/g, ""));
      const result = setBudgetChange(month, group, category, amount, note);
      results.push(result);
    });
    
    return {
      success: true,
      messages: [intentObj.confirmation || results.join("\n")],
      logs: [intentObj.confirmation || `Budget modified for ${month}`]
    };
    
  } catch (error) {
    return {
      success: false,
      messages: [`❌ Lỗi khi chỉnh sửa dự toán: ${error.toString()}`],
      logs: [`Error in handleModifyBudget: ${error.toString()}`]
    };
  }
}

//xử lý intent getFundBalance - lấy số dư quỹ
function handleGetFundBalance(intentObj) {
  try {
    const result = getFundBalances("all");
    const formattedResult = formatFundBalances(result);
    
    return {
      success: true,
      messages: [intentObj.confirmation || formattedResult],
      logs: ["Fund balance retrieved"]
    };
    
  } catch (error) {
    return {
      success: false,
      messages: [`❌ Lỗi khi lấy số dư quỹ: ${error.toString()}`],
      logs: [`Error in handleGetFundBalance: ${error.toString()}`]
    };
  }
}

//xử lý intent affordTest - kiểm tra khả năng chi trả
function handleAffordTest(intentObj, replyText) {
  try {
    const { item, amount, category, group, timeframe } = intentObj;

    sendTelegramMessage (intentObj.confirmation);
    
    // Get affordability analysis
    const affordabilityCheck = checkAffordabilityWithOpenAI(replyText, item, amount, category, group, timeframe);
    
    return {
      success: true,
      messages: [affordabilityCheck],
      logs: [`Affordability check completed for ${item}`]
    };
    
  } catch (error) {
    return {
      success: false,
      messages: [`❌ Lỗi khi kiểm tra khả năng chi trả: ${error.toString()}`],
      logs: [`Error in handleAffordTest: ${error.toString()}`]
    };
  }
}

//xử lý intent coaching - coaching tài chính
function handleCoaching(intentObj, replyText) {
  try {
    // Extract user question from the reply field or use replyText
    const userQuestion = intentObj.reply || replyText;

    sendTelegramMessage (intentObj.confirmation);
    
    // Get comprehensive financial coaching advice
    const coachingAdvice = handleFinancialCoachingWithAI(userQuestion);
    
    return {
      success: true,
      messages: [coachingAdvice],
      logs: [`Financial coaching provided for question: ${userQuestion}`]
    };
    
  } catch (error) {
    return {
      success: false,
      messages: [`❌ Lỗi khi cung cấp coaching: ${error.toString()}`],
      logs: [`Error in handleCoaching: ${error.toString()}`]
    };
  }
}

//xử lý intent others - các intent khác
function handleOthers(intentObj) {
  try {
    const reply = intentObj.reply || "Xin lỗi, tôi chưa hiểu yêu cầu của bạn. Bạn có thể nói rõ hơn không?";
    
    return {
      success: true,
      messages: [reply],
      logs: [`Other intent handled: ${intentObj.note || 'No note'}`]
    };
    
  } catch (error) {
    return {
      success: false,
      messages: [`❌ Lỗi khi xử lý yêu cầu: ${error.toString()}`],
      logs: [`Error in handleOthers: ${error.toString()}`]
    };
  }
}

//dispatcher chính để xử lý tất cả các intent
function handleIntent(intentObj, originalText, replyText) {
  const intent = intentObj.intent;

  try {
    switch (intent) {
      case "addTx":
        return handleAddTransaction(intentObj);

      case "modifyTx":
        return handleModifyTransaction(intentObj, originalText, replyText);

      case "deleteTx":
        return handleDeleteTransaction(intentObj);

      case "getMonthlyReport":
        return handleGetMonthlyReport(intentObj, replyText);

      case "createBudget":
        return handleCreateBudget(intentObj);

      case "modifyBudget":
        return handleModifyBudget(intentObj);

      case "getFundBalance":
        return handleGetFundBalance(intentObj);

      case "affordTest":
        return handleAffordTest(intentObj, replyText);

      case "coaching":
        return handleCoaching(intentObj, replyText);

      case "others":
      default:
        return handleOthers(intentObj);
    }

  } catch (error) {
    return {
      success: false,
      messages: [`❌ Lỗi không xác định khi xử lý intent "${intent}": ${error.toString()}`],
      logs: [`Unexpected error in handleIntent for ${intent}: ${error.toString()}`]
    };
  }
}
