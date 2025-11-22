//xử lý các hành động cho từng intent
//mỗi hàm trả về object với structure: { success: boolean, messages: string[], logs: string[] }

//dispatcher chính để xử lý tất cả các intent
function handleIntent(intentObj, originalText, replyText, projectContext = null) {
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
        return handleCreateBudget(intentObj, replyText);

      case "modifyBudget":
        return handleModifyBudget(intentObj);

      case "getFundBalance":
        return handleGetFundBalance(intentObj);

      case "getBudget":
        return handleGetBudget(intentObj);

      case "consult":
        return handleConsult(intentObj, replyText);

      case "search":
        return handleSearch(intentObj);

      case "projectBudget":
        return handleProjectBudget(intentObj);

      case "projectBalance":
        return handleProjectBalance(intentObj);

      case "projectReport":
        return handleProjectReport(intentObj);

      case "listCategories":
        return handleListCategories(intentObj);

      case "activateCategory":
        return handleActivateCategory(intentObj);

      case "deactivateCategory":
        return handleDeactivateCategory(intentObj);

      case "addCategory":
        return handleAddCategory(intentObj);

      case "updateCategoryDescription":
        return handleUpdateCategoryDescription(intentObj);

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

//xử lý intent addTx - thêm giao dịch
function handleAddTransaction(intentObj) {
  try {
    const dateTx = intentObj.date || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy");

    // Currency handling
    const defaultCurrency = (LOCALE_CONFIG.currency || 'EUR').toUpperCase();
    const inputCurrency = (intentObj.currency || defaultCurrency).toUpperCase();
    const originalAmount = intentObj.amount || 0;
    let amountForSheet = originalAmount;
    let descriptionWithOriginal = intentObj.desc;
    let conversionNotice = null;

    if (inputCurrency !== defaultCurrency && originalAmount) {
      amountForSheet = convertCurrency(originalAmount, inputCurrency, defaultCurrency);
      const originalText = `${formatNumber(originalAmount, inputCurrency)} ${inputCurrency}`;
      descriptionWithOriginal = `${intentObj.desc} (${originalText})`;
      conversionNotice = `💱 Đã quy đổi ${originalText} → ${formatCurrency(amountForSheet, defaultCurrency)}`;
    }

    // Prepare transaction data
    const transactionData = {
      type: intentObj.type,
      date: dateTx,
      description: descriptionWithOriginal,
      amount: amountForSheet,
      location: intentObj.location,
      category: intentObj.category,
      bankComment: intentObj.comment
    };

    // Check if this is a project transaction
    if (intentObj.project_tag) {
      // Handle project transaction
      const projectSheet = getProjectSheetByTag(intentObj.project_tag);
      if (!projectSheet.success) {
        return {
          success: false,
          messages: [`❌ ${projectSheet.error}`],
          logs: [`Project sheet error: ${projectSheet.error}`]
        };
      }

      // Add transaction to project sheet
      const result = addProjectTransaction(projectSheet.sheet, transactionData, intentObj.project_tag);
      
      if (!result.success) {
        return {
          success: false,
          messages: [result.error],
          logs: [`Error in addProjectTransaction: ${result.error}`]
        };
      }
      
      return {
        success: true,
        messages: conversionNotice ? [conversionNotice, result.message] : [result.message],
        logs: [result.message],
        replyMarkup: result.replyMarkup
      };
    }

    // Regular transaction - use tab
    const tab = intentObj.tab;
    if (!tab) {
      return {
        success: false,
        messages: [`❌ Thiếu thông tin nhóm giao dịch (tab).`],
        logs: [`Missing tab for regular transaction`]
      };
    }

    // Use addConfirmedTransaction to handle the sheet operations
    const result = addConfirmedTransaction(tab, transactionData);

    if (!result.success) {
      return {
        success: false,
        messages: [result.error],
        logs: [`Error in addConfirmedTransaction: ${result.error}`]
      };
    } else {    
      return {
        success: true,
        messages: conversionNotice ? [conversionNotice, result.message] : [result.message],
        logs: [result.message],
        replyMarkup: result.replyMarkup
      };
    }

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
    const { tab, newtab, transactionId, project_tag } = intentObj;
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    if (!transactionId) {
      return {
        success: false,
        messages: [`❌ Thiếu ID giao dịch để thực hiện cập nhật.`],
        logs: [`Missing transaction ID for modification`]
      };
    }

    // Check if this is a project transaction
    if (project_tag) {
      // Handle project transaction modification
      const findResult = findProjectTransactionById(project_tag, transactionId);

      if (!findResult.success) {
        return {
          success: false,
          messages: [`❌ ${findResult.error}`],
          logs: [`Project transaction not found: ${transactionId}`]
        };
      }

      const current = findResult.rowData;

      // Update project transaction
      const updateResult = updateProjectTransactionById(project_tag, transactionId, {
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
          messages: [`❌ ${updateResult.error}`],
          logs: [`Project update failed: ${updateResult.error}`]
        };
      }

      const confirmation = `✅ ${intentObj.confirmation}\n_\(ID\: ${transactionId}\)_`;

      return {
        success: true,
        messages: [confirmation],
        logs: [intentObj.confirmation || `Project transaction updated: ${transactionId}`]
      };
    }

    // Regular transaction modification
    if (!tab) {
      return {
        success: false,
        messages: [`❌ Thiếu thông tin nhóm giao dịch (tab).`],
        logs: [`Missing tab for regular transaction modification`]
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

      confirmation = `✅ ${intentObj.confirmation}\n_\(ID\: ${transactionId}\)_`
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
        intentObj.desc || current.description,
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

      confirmation = `✅ ${intentObj.confirmation}\n_\(ID mới\: ${newTransactionId}\)_`
    }

    // Detect new context for learning
    const props = PropertiesService.getScriptProperties();
    const promptsSettings = props.getProperty("sheet_ContextConfig") || '🤖Tùy chỉnh Prompts';
    const promptsSettingsTab = ss.getSheetByName(promptsSettings);

    if (promptsSettingsTab) {
      const instruction = detectNewContext(current, originalText, replyText);

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
      messages: [confirmation],
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
    const { tab, transactionId, project_tag } = intentObj;

    if (!transactionId) {
      return {
        success: false,
        messages: [`❌ Thiếu ID giao dịch để thực hiện xóa.`],
        logs: [`Missing transaction ID for deletion`]
      };
    }

    // Check if this is a project transaction
    if (project_tag) {
      // Handle project transaction deletion
      const deleteResult = deleteProjectTransactionById(project_tag, transactionId);

      if (!deleteResult.success) {
        return {
          success: false,
          messages: [`❌ ${deleteResult.error}`],
          logs: [`Project delete failed: ${deleteResult.error}`]
        };
      }

      const message = intentObj.confirmation || `🗑️ Đã xoá giao dịch dự án ID\: ${transactionId}`;

      return {
        success: true,
        messages: [message],
        logs: [message]
      };
    }

    // Regular transaction deletion
    if (!tab) {
      return {
        success: false,
        messages: [`❌ Thiếu thông tin nhóm giao dịch (tab).`],
        logs: [`Missing tab for regular transaction deletion`]
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

    const message = intentObj.confirmation || `🗑️ Đã xoá giao dịch ID\: ${transactionId}`;

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

//xử lý intent createBudget - tạo dự toán
function handleCreateBudget(intentObj, replyText) {
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
      let existingMessage = "\n📋 *Các dự toán đã tồn tại*\:\n\n";
      creationResult.existingLines.forEach((line, index) => {
        existingMessage += `${index + 1}\. *${line.group}* / ${line.category} / ${formatCurrency(line.amount)}\n`;
      });
      existingMessage += "\n💬 Trả lời tin nhắn này nếu bạn muốn chỉnh sửa các dự toán đã tồn tại.";
      messages.push(existingMessage);
    }
    
    // Generate budget analysis
    const budgetPrompt = generateBudgetAnalyticsPrompt(month, sourceMonth, replyText);
    const budgetAnalysis = analyseData(budgetPrompt);
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
      const amount = change.amount;
      const isActive = change.isActive;
      const result = setBudgetChange(month, group, category, amount, note, isActive);    
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
    var result = formatBankAccountBalances(getBankAccountBalances());    
    result += "\n" +formatFundBalances(getFundBalances("saving"));     

    return {
      success: true,
      messages: [intentObj.confirmation || result],
      logs: ["Balances retrieved"]
    };

  } catch (error) {
    return {
      success: false,
      messages: [`❌ Lỗi khi lấy số dư quỹ: ${error.toString()}`],
      logs: [`Error in handleGetFundBalance: ${error.toString()}`]
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
    const expenseAnalysis = analyseData(expensePrompt);
    
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

function handleReceiptPhoto(fileId, userMessage = "") {
  try {
    // Download the photo
    const photoBlob = getTelegramPhoto(fileId);
    
    // Validate image format
    if (!validateImageFormat(photoBlob)) {
      return {
        success: false,
        error: "Định dạng ảnh không được hỗ trợ. Vui lòng gửi ảnh JPG, PNG, GIF hoặc WebP."
      };
    }
    
    // Convert to base64
    const base64Image = convertImageToBase64(photoBlob);
    
    // Analyze the receipt using OpenAI Vision API
    const analysisResult = analyzeReceiptPhoto(base64Image, userMessage);
    
    if (!analysisResult.success) {
      return {
        success: false,
        error: analysisResult.error
      };
    }
    
    // Process the extracted transaction data
    const transactionData = analysisResult.data;
    const addResult = addConfirmedTransaction(transactionData.tab, {
      type: transactionData.type,
      date: transactionData.date,
      description: transactionData.desc,
      amount: transactionData.amount,
      location: transactionData.location,
      category: transactionData.category,
      bankComment: transactionData.comment || "từ ảnh hóa đơn"
    });
    
    if (!addResult.success) {
      return {
        success: false,
        error: addResult.error
      };
    }
    
    return {
      success: true,
      message: addResult.message,
      data: transactionData,
      replyMarkup: addResult.replyMarkup
    };
    
  } catch (error) {
    Logger.log(`Error in handleReceiptPhoto: ${error.toString()}`);
    return {
      success: false,
      error: `Lỗi khi xử lý ảnh hóa đơn: ${error.toString()}`
    };
  }
}

//---------------PROJECT MODE HANDLERS-------------------//

//xử lý intent projectBudget - xem dự toán dự án
function handleProjectBudget(intentObj) {
  try {
    return {
      success: false,
      messages: ["❌ Project budget not implemented yet."],
      logs: ["Project budget handler called but not implemented"]
    };

  } catch (error) {
    return {
      success: false,
      messages: [`❌ Lỗi khi xử lý dự toán dự án: ${error.toString()}`],
      logs: [`Error in handleProjectBudget: ${error.toString()}`]
    };
  }
}

//xử lý intent projectBalance - xem số dư dự án
function handleProjectBalance(intentObj) {
  try {
    return {
      success: false,
      messages: ["❌ Project balance not implemented yet."],
      logs: ["Project balance handler called but not implemented"]
    };

  } catch (error) {
    return {
      success: false,
      messages: [`❌ Lỗi khi xử lý số dư dự án: ${error.toString()}`],
      logs: [`Error in handleProjectBalance: ${error.toString()}`]
    };
  }
}

//xử lý intent projectReport - báo cáo dự án
function handleProjectReport(intentObj) {
  try {
    return {
      success: false,
      messages: ["❌ Project report not implemented yet."],
      logs: ["Project report handler called but not implemented"]
    };

  } catch (error) {
    return {
      success: false,
      messages: [`❌ Lỗi khi xử lý báo cáo dự án: ${error.toString()}`],
      logs: [`Error in handleProjectReport: ${error.toString()}`]
    };
  }
}

//---------------CATEGORY MANAGEMENT HANDLERS-------------------//

//xử lý intent listCategories - liệt kê tất cả categories và groups
function handleListCategories(intentObj) {
  try {
    const groupsMap = getAllCategoriesList(true); // Include inactive categories
    
    if (!groupsMap || groupsMap.size === 0) {
      return {
        success: true,
        messages: ["📋 **Danh sách các nhóm và mục trong dự toán:**\n\nHiện chưa có nhóm và mục nào được cấu hình."],
        logs: ["No categories found"]
      };
    }

    // Convert map to array format for processing
    const groups = [];
    let totalCategories = 0;
    
    groupsMap.forEach((categories, groupName) => {
      groups.push({
        groupName: groupName,
        categories: categories
      });
      totalCategories += categories.length;
    });

    // Format the message
    let message = "📋 **Danh sách các nhóm và mục trong dự toán:**\n\n";
    
    groups.forEach(group => {
      message += `\n**${group.groupName}**\n`;
      
      const activeCategories = group.categories.filter(cat => cat.isActive);
      const inactiveCategories = group.categories.filter(cat => !cat.isActive);
      
      if (activeCategories.length > 0) {
        message += "✅ *Đang hoạt động:*\n";
        activeCategories.forEach(cat => {
          const desc = cat.description ? ` - ${cat.description}` : '';
          message += `  • ${cat.category}${desc}\n`;
        });
      }
      
      if (inactiveCategories.length > 0) {
        message += "❌ *Đã vô hiệu hóa:*\n";
        inactiveCategories.forEach(cat => {
          const desc = cat.description ? ` - ${cat.description}` : '';
          message += `  • ${cat.category}${desc}\n`;
        });
      }
      
      message += "\n";
    });
    
    message += `\n_Tổng cộng: ${groups.length} nhóm, ${totalCategories} mục_`;

    return {
      success: true,
      messages: [message],
      logs: [`Listed ${groups.length} groups with ${totalCategories} categories`]
    };

  } catch (error) {
    return {
      success: false,
      messages: [`❌ Lỗi khi liệt kê categories: ${error.toString()}`],
      logs: [`Error in handleListCategories: ${error.toString()}`]
    };
  }
}

//xử lý intent activateCategory - kích hoạt một category
function handleActivateCategory(intentObj) {
  try {
    const group = intentObj.group;
    const category = intentObj.category;

    if (!group || !category) {
      return {
        success: false,
        messages: ["❌ Thiếu thông tin nhóm hoặc mục cần kích hoạt"],
        logs: ["Missing group or category in activateCategory intent"]
      };
    }

    const result = activateCategory(group, category);
    
    return {
      success: result.success,
      messages: [result.success ? result.message : result.error],
      logs: [result.success ? `Activated category: ${category} in group: ${group}` : `Failed to activate: ${result.error}`]
    };

  } catch (error) {
    return {
      success: false,
      messages: [`❌ Lỗi khi kích hoạt mục: ${error.toString()}`],
      logs: [`Error in handleActivateCategory: ${error.toString()}`]
    };
  }
}

//xử lý intent deactivateCategory - vô hiệu hóa một category
function handleDeactivateCategory(intentObj) {
  try {
    const group = intentObj.group;
    const category = intentObj.category;

    if (!group || !category) {
      return {
        success: false,
        messages: ["❌ Thiếu thông tin nhóm hoặc mục cần vô hiệu hóa"],
        logs: ["Missing group or category in deactivateCategory intent"]
      };
    }

    const result = deactivateCategory(group, category);
    
    return {
      success: result.success,
      messages: [result.success ? result.message : result.error],
      logs: [result.success ? `Deactivated category: ${category} in group: ${group}` : `Failed to deactivate: ${result.error}`]
    };

  } catch (error) {
    return {
      success: false,
      messages: [`❌ Lỗi khi vô hiệu hóa mục: ${error.toString()}`],
      logs: [`Error in handleDeactivateCategory: ${error.toString()}`]
    };
  }
}

//xử lý intent addCategory - thêm category mới vào group
function handleAddCategory(intentObj) {
  try {
    const group = intentObj.group;
    const category = intentObj.category;
    const description = intentObj.description || '';
    // Convert priority (1/0) to isActive (boolean) if provided, default to true
    const isActive = intentObj.isActive !== undefined ? intentObj.isActive : 
                     (intentObj.priority !== undefined ? (intentObj.priority > 0) : true);

    if (!group || !category) {
      return {
        success: false,
        messages: ["❌ Thiếu thông tin nhóm hoặc tên mục cần thêm"],
        logs: ["Missing group or category in addCategory intent"]
      };
    }

    const result = addCategoryToGroup(group, category, description, isActive);
    
    return {
      success: result.success,
      messages: [result.success ? result.message : result.error],
      logs: [result.success ? `Added category: ${category} to group: ${group}` : `Failed to add category: ${result.error}`]
    };

  } catch (error) {
    return {
      success: false,
      messages: [`❌ Lỗi khi thêm mục: ${error.toString()}`],
      logs: [`Error in handleAddCategory: ${error.toString()}`]
    };
  }
}

//xử lý intent updateCategoryDescription - cập nhật mô tả của category
function handleUpdateCategoryDescription(intentObj) {
  try {
    const group = intentObj.group;
    const category = intentObj.category;
    const description = intentObj.description || '';

    if (!group || !category) {
      return {
        success: false,
        messages: ["❌ Thiếu thông tin nhóm hoặc mục cần cập nhật mô tả"],
        logs: ["Missing group or category in updateCategoryDescription intent"]
      };
    }

    const result = updateCategoryDescription(group, category, description);
    
    return {
      success: result.success,
      messages: [result.success ? result.message : result.error],
      logs: [result.success ? `Updated description for category: ${category} in group: ${group}` : `Failed to update description: ${result.error}`]
    };

  } catch (error) {
    return {
      success: false,
      messages: [`❌ Lỗi khi cập nhật mô tả: ${error.toString()}`],
      logs: [`Error in handleUpdateCategoryDescription: ${error.toString()}`]
    };
  }
}