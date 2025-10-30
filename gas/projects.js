//POC Project Mode - Isolated logic for project-based expense tracking
//This file contains all project-related functionality to minimize impact on existing code

//---------------PROJECT DETECTION AND VALIDATION-------------------//

/**
 * Get project sheet by hashtag - simplified version for unified intent system
 * @param {string} projectTag - The project hashtag (e.g., #vietnam0925)
 * @returns {Object} Result with sheet object
 */
function getProjectSheetByTag(projectTag) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheetName = projectTag.replace('#', ''); // Remove # from hashtag
    const sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      return {
        success: false,
        error: `Không tìm thấy sheet dự án '${sheetName}'`,
        sheet: null
      };
    }

    return {
      success: true,
      sheet: sheet,
      sheetName: sheetName,
      error: null
    };

  } catch (error) {
    Logger.log(`Error accessing project sheet: ${error.toString()}`);
    return {
      success: false,
      error: `Lỗi khi truy cập sheet dự án: ${error.toString()}`,
      sheet: null
    };
  }
}

/**
 * Add transaction to project sheet
 * @param {Sheet} sheet - The project sheet
 * @param {Object} transactionData - Transaction data
 * @param {string} projectTag - Project hashtag for confirmation message
 * @returns {Object} Result with success status and message
 */
function addProjectTransaction(sheet, transactionData, projectTag) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheetName = projectTag.replace('#', '');
    
    // Get the named range for transactions
    const txRangeName = `${sheetName}_tx`;
    const txRange = ss.getRangeByName(txRangeName);
    
    if (!txRange) {
      return {
        success: false,
        error: `Không tìm thấy named range '${txRangeName}' cho dự án ${projectTag}`,
        message: null
      };
    }

    // Generate unique transaction ID
    const transactionId = generateTransactionId();

    // Get the last row of the named range and add new transaction below it
    const lastRow = txRange.getLastRow();
    const newRow = lastRow + 1;
    
    // Add transaction to the row after the named range
    sheet.getRange(newRow, txRange.getColumn(), 1, 7).setValues([[
      transactionData.date,
      transactionData.description,
      transactionData.amount,
      transactionData.location,
      transactionData.category,
      transactionData.bankComment,
      transactionId
    ]]);

    // Get project name from project metadata for better confirmation message
    const projectInfo = validateProject(projectTag);
    const projectName = projectInfo.isValid ? projectInfo.project.name : projectTag;

    // Create success message
    const message = `${transactionData.type} *${formatCurrency(transactionData.amount)}* cho *${transactionData.description}*\n` +
                   `_✏️${projectName} (${projectTag}), mục ${transactionData.category}_\n` +
                   `_\(ID\: ${transactionId}\)_`;

    // Create reply markup with delete button
    const replyMarkup = {
      inline_keyboard: [[
        {
          text: "🗑️ Xóa giao dịch này",
          callback_data: `delete_tx_${transactionId}`
        }
      ]]
    };

    return {
      success: true,
      message: message,
      replyMarkup: replyMarkup,
      transactionId: transactionId
    };

  } catch (error) {
    Logger.log(`Error adding project transaction: ${error.toString()}`);
    return {
      success: false,
      error: `Lỗi khi thêm giao dịch dự án: ${error.toString()}`,
      message: null
    };
  }
}

/**
 * Find and get transaction from project sheet by ID
 * @param {string} projectTag - The project hashtag
 * @param {string} transactionId - Transaction ID to find
 * @returns {Object} Result with transaction data and row number
 */
function findProjectTransactionById(projectTag, transactionId) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheetName = projectTag.replace('#', '');
    
    // Get the named range for transactions
    const txRangeName = `${sheetName}_tx`;
    const txRange = ss.getRangeByName(txRangeName);
    
    if (!txRange) {
      return {
        success: false,
        error: `Không tìm thấy named range '${txRangeName}' cho dự án ${projectTag}`,
        rowData: null,
        rowNumber: null
      };
    }

    const sheetResult = getProjectSheetByTag(projectTag);
    if (!sheetResult.success) {
      return {
        success: false,
        error: sheetResult.error,
        rowData: null,
        rowNumber: null
      };
    }

    const sheet = sheetResult.sheet;
    
    // Get data from the named range and search for the transaction
    const startRow = txRange.getRow();
    const numRows = txRange.getNumRows();
    const startCol = txRange.getColumn();
    const numCols = txRange.getNumColumns();
    
    const data = sheet.getRange(startRow, startCol, numRows, numCols).getValues();

    // Search for transaction ID (assuming ID is in the last column of the range)
    const idColumnIndex = numCols - 1;
    
    for (let i = 0; i < data.length; i++) {
      if (data[i][idColumnIndex] === transactionId) {
        const actualRow = startRow + i;
        return {
          success: true,
          rowData: {
            date: data[i][0],
            description: data[i][1],
            amount: data[i][2],
            location: data[i][3],
            category: data[i][4],
            bankComment: data[i][5],
            id: data[i][idColumnIndex]
          },
          rowNumber: actualRow,
          error: null
        };
      }
    }

    return {
      success: false,
      error: `Không tìm thấy giao dịch ID ${transactionId} trong dự án ${projectTag}`,
      rowData: null,
      rowNumber: null
    };

  } catch (error) {
    Logger.log(`Error finding project transaction: ${error.toString()}`);
    return {
      success: false,
      error: `Lỗi khi tìm giao dịch: ${error.toString()}`,
      rowData: null,
      rowNumber: null
    };
  }
}

/**
 * Update project transaction by ID
 * @param {string} projectTag - The project hashtag
 * @param {string} transactionId - Transaction ID to update
 * @param {Object} updateData - Data to update
 * @returns {Object} Result with success status
 */
function updateProjectTransactionById(projectTag, transactionId, updateData) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheetName = projectTag.replace('#', '');
    
    // Get the named range for transactions
    const txRangeName = `${sheetName}_tx`;
    const txRange = ss.getRangeByName(txRangeName);
    
    if (!txRange) {
      return {
        success: false,
        error: `Không tìm thấy named range '${txRangeName}' cho dự án ${projectTag}`
      };
    }

    const findResult = findProjectTransactionById(projectTag, transactionId);
    if (!findResult.success) {
      return {
        success: false,
        error: findResult.error
      };
    }

    const sheetResult = getProjectSheetByTag(projectTag);
    if (!sheetResult.success) {
      return {
        success: false,
        error: sheetResult.error
      };
    }

    const sheet = sheetResult.sheet;
    const rowNumber = findResult.rowNumber;
    const startCol = txRange.getColumn();

    // Update the row with new data (columns relative to the named range)
    sheet.getRange(rowNumber, startCol).setValue(updateData.date);
    sheet.getRange(rowNumber, startCol + 1).setValue(updateData.description);
    sheet.getRange(rowNumber, startCol + 2).setValue(updateData.amount);
    sheet.getRange(rowNumber, startCol + 3).setValue(updateData.location);
    sheet.getRange(rowNumber, startCol + 4).setValue(updateData.category);
    sheet.getRange(rowNumber, startCol + 5).setValue(updateData.bankComment);

    return {
      success: true,
      error: null
    };

  } catch (error) {
    Logger.log(`Error updating project transaction: ${error.toString()}`);
    return {
      success: false,
      error: `Lỗi khi cập nhật giao dịch: ${error.toString()}`
    };
  }
}

/**
 * Delete project transaction by ID
 * @param {string} projectTag - The project hashtag
 * @param {string} transactionId - Transaction ID to delete
 * @returns {Object} Result with success status
 */
function deleteProjectTransactionById(projectTag, transactionId) {
  try {
    const findResult = findProjectTransactionById(projectTag, transactionId);
    if (!findResult.success) {
      return {
        success: false,
        error: findResult.error
      };
    }

    const sheetResult = getProjectSheetByTag(projectTag);
    if (!sheetResult.success) {
      return {
        success: false,
        error: sheetResult.error
      };
    }

    const sheet = sheetResult.sheet;
    const rowNumber = findResult.rowNumber;

    // Delete the row
    sheet.deleteRow(rowNumber);

    return {
      success: true,
      error: null
    };

  } catch (error) {
    Logger.log(`Error deleting project transaction: ${error.toString()}`);
    return {
      success: false,
      error: `Lỗi khi xóa giao dịch: ${error.toString()}`
    };
  }
}

//---------------PROJECT DETECTION AND VALIDATION-------------------//

/**
 * Detect hashtag in message text and extract project information
 * @param {string} messageText - The message text to analyze
 * @returns {Object} Project detection result
 */
function detectProjectHashtag(messageText) {
  try {
    if (!messageText || typeof messageText !== 'string') {
      return {
        hasProject: false,
        hashtag: null,
        cleanMessage: messageText || ''
      };
    }

    // Look for hashtag pattern: #word+numbers (e.g., #vietnam0925, #trip2024)
    const hashtagRegex = /#([a-zA-Z]+[0-9]+)/g;
    const matches = messageText.match(hashtagRegex);
    
    if (!matches || matches.length === 0) {
      return {
        hasProject: false,
        hashtag: null,
        cleanMessage: messageText
      };
    }

    // Take the first hashtag found
    const hashtag = matches[0].toLowerCase();
    const cleanMessage = messageText.replace(hashtagRegex, '').trim();

    return {
      hasProject: true,
      hashtag: hashtag,
      cleanMessage: cleanMessage,
      originalMessage: messageText
    };

  } catch (error) {
    Logger.log(`Error detecting project hashtag: ${error.toString()}`);
    return {
      hasProject: false,
      hashtag: null,
      cleanMessage: messageText || '',
      error: error.toString()
    };
  }
}

/**
 * Validate if a project exists and is currently active
 * @param {string} hashtag - The project hashtag to validate
 * @returns {Object} Project validation result
 */
function validateProject(hashtag) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const projectMetadataSheet = ss.getSheetByName('project_metadata');
    
    if (!projectMetadataSheet) {
      return {
        isValid: false,
        error: 'Project metadata sheet not found',
        project: null
      };
    }

    const data = projectMetadataSheet.getDataRange().getValues();
    if (data.length <= 1) {
      return {
        isValid: false,
        error: 'No project metadata found',
        project: null
      };
    }

    // Find project by hashtag (assuming hashtag is in column 5, index 4)
    const currentDate = new Date();
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const projectHashtag = row[4] ? row[4].toString().toLowerCase() : '';
      
      if (projectHashtag === hashtag) {
        const fromDate = row[5] ? new Date(row[5]) : null;
        const toDate = row[6] ? new Date(row[6]) : null;
        
        // Check if project is currently active
        const isActive = (!fromDate || currentDate >= fromDate) && 
                        (!toDate || currentDate <= toDate);
        
        const project = {
          id: row[0],
          name: row[1],
          description: row[2],
          type: row[3],
          hashtag: row[4],
          from: fromDate,
          to: toDate,
          note: row[7],
          isActive: isActive
        };

        return {
          isValid: true,
          project: project,
          error: null
        };
      }
    }

    return {
      isValid: false,
      error: `Project with hashtag ${hashtag} not found`,
      project: null
    };

  } catch (error) {
    Logger.log(`Error validating project: ${error.toString()}`);
    return {
      isValid: false,
      error: `Error validating project: ${error.toString()}`,
      project: null
    };
  }
}

/**
 * Get project sheet by hashtag
 * @param {string} hashtag - The project hashtag
 * @returns {Object} Project sheet access result
 */
function getProjectSheet(hashtag) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheetName = hashtag.replace('#', ''); // Remove # from hashtag
    const sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      return {
        success: false,
        error: `Project sheet '${sheetName}' not found`,
        sheet: null
      };
    }

    return {
      success: true,
      sheet: sheet,
      sheetName: sheetName,
      error: null
    };

  } catch (error) {
    Logger.log(`Error accessing project sheet: ${error.toString()}`);
    return {
      success: false,
      error: `Error accessing project sheet: ${error.toString()}`,
      sheet: null
    };
  }
}

/**
 * Get project named ranges
 * @param {string} hashtag - The project hashtag
 * @returns {Object} Project named ranges result
 */
function getProjectNamedRanges(hashtag) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheetName = hashtag.replace('#', '');
    
    // Define the named ranges for the project
    const namedRanges = [
      '_balances',
      '_budget', 
      '_categories',
      '_locations',
      '_tx'
    ];

    const ranges = {};
    const errors = [];

    namedRanges.forEach(rangeName => {
      try {
        const fullRangeName = `${sheetName}${rangeName}`;
        const range = ss.getRangeByName(fullRangeName);
        
        if (range) {
          ranges[rangeName] = {
            name: fullRangeName,
            range: range,
            values: range.getValues()
          };
        } else {
          errors.push(`Named range '${fullRangeName}' not found`);
        }
      } catch (error) {
        errors.push(`Error accessing range '${rangeName}': ${error.toString()}`);
      }
    });

    return {
      success: errors.length === 0,
      ranges: ranges,
      errors: errors,
      hashtag: hashtag
    };

  } catch (error) {
    Logger.log(`Error getting project named ranges: ${error.toString()}`);
    return {
      success: false,
      ranges: {},
      errors: [`Error getting project named ranges: ${error.toString()}`],
      hashtag: hashtag
    };
  }
}

//---------------PROJECT TRANSACTION HANDLING-------------------//

/**
 * Handle project transaction addition
 * @param {Object} intentObj - The intent object with transaction data
 * @param {Object} projectInfo - The project information
 * @returns {Object} Transaction result
 */
function handleProjectTransactionFromProjects(intentObj, projectInfo) {
  try {
    const { project, hashtag } = projectInfo;
    
    // Get project sheet
    const sheetResult = getProjectSheet(hashtag);
    if (!sheetResult.success) {
      return {
        success: false,
        messages: [sheetResult.error],
        logs: [`Error accessing project sheet: ${sheetResult.error}`]
      };
    }

    const { sheet } = sheetResult;
    
    // Prepare transaction data
    const transactionData = {
      type: intentObj.type || '💸Chi',
      date: intentObj.date || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy"),
      description: intentObj.desc || '',
      amount: intentObj.amount || 0,
      location: intentObj.location || 'N/A',
      category: intentObj.category || 'Khác',
      bankComment: intentObj.comment || 'thêm thủ công'
    };

    // Generate unique transaction ID
    const transactionId = generateTransactionId();

    // Add transaction to project sheet
    const lastRow = sheet.getLastRow();
    sheet.appendRow([
      transactionData.date,
      transactionData.description,
      transactionData.amount,
      transactionData.location,
      transactionData.category,
      transactionData.bankComment,
      transactionId
    ]);

    const newRowNumber = lastRow + 1;

    // Create success message
    const message = `${transactionData.type} *${transactionData.amount}* cho *${transactionData.description}*\n` +
                   `_✏️${project.name} (${hashtag}), mục ${transactionData.category}_\n` +
                   `_\(ID\: ${transactionId}\)_`;

    return {
      success: true,
      messages: [message],
      logs: [`Project transaction added: ${transactionId} to ${project.name}`],
      transactionId: transactionId,
      project: project
    };

  } catch (error) {
    Logger.log(`Error handling project transaction: ${error.toString()}`);
    return {
      success: false,
      messages: [`❌ Lỗi khi thêm giao dịch dự án: ${error.toString()}`],
      logs: [`Error in handleProjectTransaction: ${error.toString()}`]
    };
  }
}

/**
 * Get project categories for intent detection
 * @param {string} hashtag - The project hashtag
 * @returns {Object} Project categories result
 */
function getProjectCategories(hashtag) {
  try {
    const rangesResult = getProjectNamedRanges(hashtag);
    
    if (!rangesResult.success || !rangesResult.ranges._categories) {
      return {
        success: false,
        categories: [],
        error: 'Project categories not found'
      };
    }

    const categoriesData = rangesResult.ranges._categories.values;
    const categories = [];

    categoriesData.forEach(row => {
      if (row[0] && row[1]) { // Assuming category name in column 0, description in column 1
        categories.push({
          name: row[0],
          description: row[1] || ''
        });
      }
    });

    return {
      success: true,
      categories: categories,
      error: null
    };

  } catch (error) {
    Logger.log(`Error getting project categories: ${error.toString()}`);
    return {
      success: false,
      categories: [],
      error: `Error getting project categories: ${error.toString()}`
    };
  }
}

/**
 * Get project locations for intent detection
 * @param {string} hashtag - The project hashtag
 * @returns {Object} Project locations result
 */
function getProjectLocation(hashtag) {
  try {
    const rangesResult = getProjectNamedRanges(hashtag);
    
    if (!rangesResult.success || !rangesResult.ranges._locations) {
      return {
        success: false,
        locations: [],
        error: 'Project locations not found'
      };
    }

    const locationsData = rangesResult.ranges._locations.values;
    const locations = [];

    locationsData.forEach(row => {
      if (row[0] && row[1]) { // Assuming location name in column 0, description in column 1
        locations.push({
          name: row[0],
          description: row[1] || ''
        });
      }
    });

    return {
      success: true,
      locations: locations,
      error: null
    };

  } catch (error) {
    Logger.log(`Error getting project locations: ${error.toString()}`);
    return {
      success: false,
      locations: [],
      error: `Error getting project locations: ${error.toString()}`
    };
  }
}

/**
 * Get project budget information
 * @param {string} hashtag - The project hashtag
 * @returns {Object} Project budget result
 */
function getProjectBudget(hashtag) {
  try {
    const rangesResult = getProjectNamedRanges(hashtag);
    
    if (!rangesResult.success || !rangesResult.ranges._budget) {
      return {
        success: false,
        budget: [],
        error: 'Project budget not found'
      };
    }

    const budgetData = rangesResult.ranges._budget.values;
    const budget = [];

    budgetData.forEach(row => {
      if (row[0] && row[1]) { // Assuming category in column 0, amount in column 1
        budget.push({
          category: row[0],
          amount: parseFloat(row[1]) || 0
        });
      }
    });

    return {
      success: true,
      budget: budget,
      error: null
    };

  } catch (error) {
    Logger.log(`Error getting project budget: ${error.toString()}`);
    return {
      success: false,
      budget: [],
      error: `Error getting project budget: ${error.toString()}`
    };
  }
}

/**
 * Get project balance information
 * @param {string} hashtag - The project hashtag
 * @returns {Object} Project balance result
 */
function getProjectBalance(hashtag) {
  try {
    const rangesResult = getProjectNamedRanges(hashtag);
    
    if (!rangesResult.success || !rangesResult.ranges._balances) {
      return {
        success: false,
        balance: 0,
        error: 'Project balance not found'
      };
    }

    const balanceData = rangesResult.ranges._balances.values;
    let totalBalance = 0;

    balanceData.forEach(row => {
      if (row[0] && typeof row[0] === 'number') {
        totalBalance += parseFloat(row[0]) || 0;
      }
    });

    return {
      success: true,
      balance: totalBalance,
      error: null
    };

  } catch (error) {
    Logger.log(`Error getting project balance: ${error.toString()}`);
    return {
      success: false,
      balance: 0,
      error: `Error getting project balance: ${error.toString()}`
    };
  }
}

/**
 * Main function to process project mode messages
 * @param {string} messageText - The original message text
 * @param {string} originalText - The original text from reply
 * @param {string} replyText - The reply text
 * @returns {Object} Project processing result
 */
function processProjectMode(originalText, replyText) {
  try {
    // Step 1: Detect hashtag
    messageText = originalText + " " + replyText;
    const hashtagResult = detectProjectHashtag(messageText);
    
    if (!hashtagResult.hasProject) {
      return {
        isProjectMode: false,
        error: 'No project hashtag detected'
      };
    }

    // Step 2: Validate project
    const validationResult = validateProject(hashtagResult.hashtag);
    
    if (!validationResult.isValid) {
      return {
        isProjectMode: true,
        isProjectValid: false,
        error: validationResult.error,
        hashtag: hashtagResult.hashtag
      };
    }

    // Step 3: Check if project is active
    if (!validationResult.project.isActive) {
      return {
        isProjectMode: true,
        isProjectValid: true,
        isProjectActive: false,
        error: `Project '${validationResult.project.name}' is not currently active`,
        project: validationResult.project,
        hashtag: hashtagResult.hashtag
      };
    }

    // Step 4: Return project context for further processing
    return {
      isProjectMode: true,
      isProjectValid: true,
      isProjectActive: true,
      project: validationResult.project,
      hashtag: hashtagResult.hashtag,
      cleanMessage: hashtagResult.cleanMessage,
      originalMessage: hashtagResult.originalMessage,
      error: null
    };

  } catch (error) {
    Logger.log(`Error processing project mode: ${error.toString()}`);
    return {
      isProjectMode: false,
      error: `Error processing project mode: ${error.toString()}`
    };
  }
}
