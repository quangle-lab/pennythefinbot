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
