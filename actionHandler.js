//xử lý các hành động cho từng intent
//mỗi hàm trả về object với structure: { success: boolean, messages: string[], logs: string[] }

//xử lý intent addTx - thêm giao dịch
function handleAddTransaction(intentObj) {
  try {
    const { tab } = intentObj.tab;
    const dateTx = intentObj.date || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy");

    // Prepare transaction data for addConfirmedTransaction
    const transactionData = {
      type: intentObj.type,
      date: dateTx,
      description: intentObj.desc,
      amount: intentObj.amount,
      location: intentObj.location,
      category: intentObj.category,
      bankComment: intentObj.comment
    };

    // Use addConfirmedTransaction to handle the sheet operations
    const result = addConfirmedTransaction(tab, transactionData);

    if (!result.success) {
      return {
        success: false,
        messages: [result.error],
        logs: [`Error in addConfirmedTransaction: ${result.error}`]
      };
    }

    // Extract the remaining message from the result
    const remainingMessage = result.message.includes('-----') ? result.message.split('-----')[1] : '';
    
    // Format the message to match the original format
    const message = `${intentObj.confirmation}\n_(ID: ${result.transactionId})_\n-----remainingMessage}`;

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
    const { tab, newtab, transactionId } = intentObj;
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    if (!transactionId) {
      return {
        success: false,
        messages: [`❌ Thiếu ID giao dịch để thực hiện cập nhật.`],
        logs: [`Missing transaction ID for modification`]
      };
    }

    // Find the transaction by ID
    const findResult = findTransactionRowById(tab, transactionId);

    if (!findResult.success) {
      return {
        success: false,
        messages: [findResult.error],
        logs: [`Transaction not found: ${transactionId}`]
      };
    }

    const current = findResult.rowData;
    let confirmation = `✅ ${intentObj.confirmation}`;

    // Update transaction
    if (!newtab) {
      // Update in same sheet
      const updateResult = updateTransactionById(tab, transactionId, {
        date: intentObj.date || current.date,
        description: intentObj.desc || current.description,
        amount: intentObj.amount || current.amount,
        location: intentObj.location || current.location,
        category: intentObj.category || current.category,
        bankComment: intentObj.comment || current.bankComment
      });

      if (!updateResult.success) {
        return {
          success: false,
          messages: [updateResult.error],
          logs: [`Update failed: ${updateResult.error}`]
        };
      }

      confirmation = `✅ ${intentObj.confirmation}\n_(ID: ${transactionId})_`
    } else {
      // Move to different sheet
      const newSheet = ss.getSheetByName(newtab);
      if (!newSheet) {
        return {
          success: false,
          messages: [`❌ Không tìm thấy sheet "${newtab}".`],
          logs: [`Sheet not found: ${newtab}`]
        };
      }

      // Generate new ID for the moved transaction
      const newTransactionId = generateTransactionId();

      // Add to new sheet
      newSheet.appendRow([
        current.date,
        current.description,
        current.amount,
        current.location,
        intentObj.category,
        current.bankComment,
        newTransactionId
      ]);

      // Delete from old sheet
      const deleteResult = deleteTransactionById(tab, transactionId);
      if (!deleteResult.success) {
        return {
          success: false,
          messages: [deleteResult.error],
          logs: [`Delete failed: ${deleteResult.error}`]
        };
      }

      confirmation = `✅ ${intentObj.confirmation}\n_(ID mới: ${newTransactionId})_`
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
      logs: [intentObj.confirmation || `Transaction updated: ${transactionId}`]
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
    const { tab, transactionId } = intentObj;

    if (!transactionId) {
      return {
        success: false,
        messages: [`❌ Thiếu ID giao dịch để thực hiện xóa.`],
        logs: [`Missing transaction ID for deletion`]
      };
    }

    // Delete the transaction by ID
    const deleteResult = deleteTransactionById(tab, transactionId);

    if (!deleteResult.success) {
      return {
        success: false,
        messages: [deleteResult.error],
        logs: [`Delete failed: ${deleteResult.error}`]
      };
    }

    const message = intentObj.confirmation || `🗑️ Đã xoá giao dịch ID: ${transactionId}`;

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
function handleGetMonthlyReport(intentObj, replyText) {
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
    const expensePrompt = generateExpenseAnalyticsPrompt(replyText, monthToAnalyze, "dashboard");
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

//xử lý intent getBudget - lấy dự toán của tháng
function handleGetBudget(intentObj) {
  try {
    const { month } = intentObj;

    // If no month specified, use current month
    const targetMonth = month || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "MM/yyyy");

    // Use the existing getBudgetData function from sheetHandler
    const budgetData = getBudgetData(targetMonth);

    // Check if budget data was found
    if (!budgetData || budgetData.includes("Dự toán của tháng") && budgetData.split('\n').length <= 2) {
      return {
        success: true,
        messages: [intentObj.confirmation || `📊 Chưa có dự toán nào cho tháng ${targetMonth}.`],
        logs: [`No budget entries found for month: ${targetMonth}`]
      };
    }

    return {
      success: true,
      messages: [budgetData],
      logs: [`Budget retrieved for month: ${targetMonth}`]
    };

  } catch (error) {
    return {
      success: false,
      messages: [`❌ Lỗi khi lấy dự toán: ${error.toString()}`],
      logs: [`Error in handleGetBudget: ${error.toString()}`]
    };
  }
}

//xử lý intent consult - tư vấn tài chính thông qua agent handler
function handleConsult(intentObj, replyText) {
  try {
    // Extract user question and consultation type
    const userQuestion = intentObj.question || replyText;
    const consultType = intentObj.consultType || "general";

    sendTelegramMessage(intentObj.confirmation);

    // Prepare the question for the agent based on consultation type
    consultPrompts = generateConsultPrompt (userQuestion, consultType, intentObj);

    // Use the agent handler for comprehensive analysis
    const agentResult = consultDataAnalysticsAgent(consultPrompts);

    if (agentResult.success) {
      return {
        success: true,
        messages: [], // Agent already sends message via Telegram
        logs: [`Financial consultation completed for: ${userQuestion}`]
      };
    } else {
      return {
        success: false,
        messages: [`❌ Lỗi khi cung cấp tư vấn: ${agentResult.error}`],
        logs: [`Error in handleConsult: ${agentResult.error}`]
      };
    }

  } catch (error) {
    return {
      success: false,
      messages: [`❌ Lỗi khi cung cấp tư vấn: ${error.toString()}`],
      logs: [`Error in handleConsult: ${error.toString()}`]
    };
  }
}

//xử lý intent search - tìm kiếm giao dịch
function handleSearch(intentObj) {
  try {
    const { startDate, endDate, groups, categories, keywords } = intentObj;

    sendTelegramMessage(intentObj.confirmation);

    // Prepare search parameters
    const searchParams = {
      startDate: startDate || '',
      endDate: endDate || '',
      groups: groups || [],
      categories: categories || [],
      keywords: keywords || ''
    };

    // Perform search
    const searchResults = searchTx(searchParams);

    if (!searchResults.success) {
      return {
        success: false,
        messages: [`❌ Lỗi khi tìm kiếm: ${searchResults.error || 'Unknown error'}`],
        logs: [`Search failed: ${searchResults.error || 'Unknown error'}`]
      };
    }

    // Format and return results
    const formattedResults = formatSearchResults(searchResults);

    return {
      success: true,
      messages: [formattedResults],
      logs: [`Search completed: ${searchResults.totalMatches} transactions found`]
    };

  } catch (error) {
    return {
      success: false,
      messages: [`❌ Lỗi khi tìm kiếm giao dịch: ${error.toString()}`],
      logs: [`Error in handleSearch: ${error.toString()}`]
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

      case "getBudget":
        return handleGetBudget(intentObj);

      case "consult":
        return handleConsult(intentObj, replyText);

      case "affordTest":
        // DEPRECATED: Use "consult" intent instead
        return handleAffordTest(intentObj, replyText);

      case "coaching":
        // DEPRECATED: Use "consult" intent instead
        return handleCoaching(intentObj, replyText);

      case "search":
        return handleSearch(intentObj);

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
