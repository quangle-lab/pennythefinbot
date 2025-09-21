// Utility functions for Penny the Finance Bot
// Core utility functions for image processing, data formatting, and common operations

/**
 * Convert image blob to base64 string
 * @param {Blob} photoBlob - The image blob to convert
 * @returns {string} Base64 encoded string
 */
function convertImageToBase64(photoBlob) {
  try {
    const base64 = Utilities.base64Encode(photoBlob.getBytes());
    return base64;
  } catch (error) {
    Logger.log(`Error converting image to base64: ${error.toString()}`);
    throw new Error(`Failed to convert image to base64: ${error.toString()}`);
  }
}

/**
 * Validate image format before processing
 * @param {Blob} imageBlob - The image blob to validate
 * @returns {boolean} True if valid image format
 */
function validateImageFormat(imageBlob) {
  try {
    const contentType = imageBlob.getContentType();
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/octet-stream'];
    return validTypes.includes(contentType.toLowerCase());
  } catch (error) {
    Logger.log(`Error validating image format: ${error.toString()}`);
    return false;
  }
}

/**
 * Format currency amount based on locale
 * @param {number} amount - The amount to format
 * @param {string} locale - The locale (EUR, VND, etc.)
 * @returns {string} Formatted currency string
 */
function formatCurrency(amount, locale = 'EUR') {
  try {
    switch (locale.toUpperCase()) {
      case 'EUR':
        return `€${amount.toFixed(2)}`;
      case 'VND':
        return `${amount.toLocaleString('vi-VN')} VND`;
      default:
        return `${amount.toFixed(2)} ${locale}`;
    }
  } catch (error) {
    Logger.log(`Error formatting currency: ${error.toString()}`);
    return `${amount}`;
  }
}

/**
 * Generate unique transaction ID
 * @returns {string} Unique transaction ID
 */
function generateTransactionId() {
    const timestamp = new Date().getTime();
    const random = Math.floor(Math.random() * 1000);
    return `TX${timestamp}${random}`;
  }

/**
 * Download photo from Telegram API
 * @param {string} fileId - Telegram file ID
 * @returns {Blob} Downloaded photo blob
 */
function getTelegramPhoto(fileId) {
  try {
    const telegramToken = TELEGRAM_TOKEN;
    
    // Get file info from Telegram
    const fileInfoUrl = `https://api.telegram.org/bot${telegramToken}/getFile?file_id=${fileId}`;
    const fileInfoResponse = UrlFetchApp.fetch(fileInfoUrl);
    const fileInfo = JSON.parse(fileInfoResponse.getContentText());
    
    if (!fileInfo.ok) {
      throw new Error(`Failed to get file info: ${fileInfo.description}`);
    }
    
    // Download the file
    const fileUrl = `https://api.telegram.org/file/bot${telegramToken}/${fileInfo.result.file_path}`;
    const fileResponse = UrlFetchApp.fetch(fileUrl);
    
    return fileResponse.getBlob();
    
  } catch (error) {
    Logger.log(`Error downloading Telegram photo: ${error.toString()}`);
    throw new Error(`Failed to download photo: ${error.toString()}`);
  }
}

/**
 * Process receipt photo and extract transaction data
 * @param {string} fileId - Telegram file ID
 * @param {string} userMessage - Optional user message with the photo
 * @returns {Object} Result object with success status and data/error
 */
function processReceiptPhoto(fileId, userMessage = "") {
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
      data: transactionData
    };
    
  } catch (error) {
    Logger.log(`Error in handleReceiptPhoto: ${error.toString()}`);
    return {
      success: false,
      error: `Lỗi khi xử lý ảnh hóa đơn: ${error.toString()}`
    };
  }
}

//--------- TELEGRAM BUTTON UTILITIES --------------//

/**
 * Create a delete button for a transaction
 * @param {string} transactionId - The transaction ID
 * @param {string} sheetName - The sheet name where the transaction is stored
 * @returns {Object} Telegram inline keyboard button object
 */
function createDeleteButton(transactionId, sheetName) {
  return {
    text: "🗑️Xóa",
    callback_data: `delete_${transactionId}_${sheetName}`
  };
}

/**
 * Parse callback data from Telegram button clicks
 * @param {string} callbackData - The callback data from the button click
 * @returns {Object} Parsed data with action, transactionId, sheetName, and transactionData
 */
function parseCallbackData(callbackData) {
  try {
    const parts = callbackData.split('_');
    
    if (parts.length >= 3 && parts[0] === 'delete') {
      return {
        action: 'delete',
        transactionId: parts[1],
        sheetName: parts.slice(2).join('_'), // Handle sheet names with underscores
        transactionData: null,
        existingRows: null
      };
    } else if (parts.length >= 2 && parts[0] === 'keep') {
      return {
        action: 'keep',
        transactionId: parts[1],
        sheetName: null,
        transactionData: null,
        existingRows: null
      };
    } else if (parts.length >= 4 && parts[0] === 'del' && parts[1] === 'existing') {
      return {
        action: 'delete_existing',
        transactionId: parts[2],
        sheetName: parts[3],
        transactionData: null,
        existingRows: parts.slice(4).join('_') // Handle multiple row numbers
      };
    }
    
    return {
      action: 'unknown',
      transactionId: null,
      sheetName: null,
      transactionData: null
    };
  } catch (error) {
    Logger.log(`Error parsing callback data: ${error.toString()}`);
    return {
      action: 'error',
      transactionId: null,
      sheetName: null,
      transactionData: null
    };
  }
}

/**
 * Format inline keyboard for Telegram API
 * @param {Array} buttons - Array of button objects
 * @returns {Object} Telegram inline keyboard markup object
 */
function formatInlineKeyboard(buttons) {
  return {
    inline_keyboard: [buttons]
  };
}

/**
 * Create a single-row inline keyboard with delete button
 * @param {string} transactionId - The transaction ID
 * @param {string} sheetName - The sheet name
 * @returns {Object} Telegram inline keyboard markup object
 */
function createDeleteKeyboard(transactionId, sheetName) {
  const deleteButton = createDeleteButton(transactionId, sheetName);
  return formatInlineKeyboard([deleteButton]);
}

/**
 * Create a keep transaction button for keeping the new transaction
 * @param {string} transactionId - The transaction ID
 * @returns {Object} Telegram inline keyboard button object
 */
function createKeepButton(transactionId) {
  return {
    text: "✅Giữ",
    callback_data: `keep_${transactionId}`
  };
}

/**
 * Create a confirmation keyboard with Delete Existing and Keep buttons
 * @param {string} transactionId - The new transaction ID
 * @param {string} sheetName - The sheet name
 * @param {string} existingRows - Comma-separated existing row numbers
 * @returns {Object} Telegram inline keyboard markup object
 */
function createDuplicateConfirmationKeyboard(transactionId, sheetName) {
  const deleteExistingButton = createDeleteButton(transactionId, sheetName);
  const keepButton = createKeepButton(transactionId);
  return {
    inline_keyboard: [[deleteExistingButton, keepButton]]
  };
}
