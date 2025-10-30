//xử lý các thông báo từ banks
function processBankAlerts() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet();
  const threads = GmailApp.search('-is:starred');

  for (let thread of threads) {
    const messages = thread.getMessages();

    for (let message of messages) {    
      // Trích xuất thông tin tựa và nội dung từ email nếu email chưa được xử lý (starred)
      if (!message.isStarred()) {
        let body = trimCICMailBody(message.getPlainBody());
        const subject = message.getSubject();    

        //xóa các ký tự đặc biệt
        body = body.replace(/[*&]/g, ' ');

        Logger.log (subject);
        Logger.log (body);

        // Gọi OpenAI để phân loại thông minh - có thể là giao dịch hoặc cập nhật số dư
        const aiResult = classifyBankBalance(subject, body);

        // Kiểm tra intent từ kết quả AI
        if (aiResult.intent === 'UpdateBankBalance') {
          // Xử lý cập nhật số dư tài khoản
          const { accountNumber, balance, date, group } = aiResult;
          
          if (!accountNumber || !balance) {
            Logger.log(`Thiếu thông tin số dư tài khoản: ${subject}`);
            message.star();
            message.markRead();
            continue;
          }

          // Cập nhật số dư tài khoản
          const updateResult = updateBankAccountBalance(accountNumber, balance, date);
          
          if (updateResult.success) {
            // Gửi thông báo cập nhật thành công
            sendTelegramMessage(updateResult.message);
            
          } else {
            // Gửi thông báo lỗi
            sendTelegramMessage(updateResult.error);
          }
          
        } else if (aiResult.intent === 'AddTx') {
          // Xử lý giao dịch thông thường (giữ nguyên logic cũ)
          if (!isValidTransaction(aiResult, subject, body, message)) {
            Logger.log(`Bỏ qua email không phải giao dịch: ${subject}`);
            // Đánh dấu đã xử lý nhưng không thêm vào sheet
            message.star();
            message.markRead();
            continue;
          }


          const groupTx = aiResult.group || '🛒Chi phí biến đổi';
          const typeTx = aiResult.type || '🛒Chợ';
          const dateTx = aiResult.date || '';
          const descTx = aiResult.desc || '';
          const amountTx = aiResult.amount || '0';
          const locationTx = aiResult.location || 'N/A';
          const categoryTx = aiResult.category || 'Khác';
          const bankcommentTx = aiResult.bankcomment || '';
          
          //kiếm tra xem giao dịch có tồn tại chưa
          const tx = {
            date: dateTx,
            amount: amountTx,
            description: descTx,
            bankComment: bankcommentTx,
            category: categoryTx,
            group: groupTx, 
            type: typeTx,
            location: locationTx
          };

          const checkResult = checkAndConfirmTransaction(tx);
          sendTelegramMessage (checkResult.message, checkResult.replyMarkup);

        } else {
          // Intent không xác định hoặc lỗi
          Logger.log(`Không xác định được loại thông báo: ${subject}`);
          sendLog (`❓ Không thể xác định loại thông báo từ email: ${subject}`);
        }

        // Đánh dấu đã xử lý
        message.star();
        message.markRead();
      }
    }
  }
}

//kiểm tra xem email có phải là giao dịch hợp lệ không
function isValidTransaction(aiResult, subject, body, message = null) {
  // Kiểm tra các dấu hiệu của email spam hoặc không phải giao dịch

  // 1. Kiểm tra kết quả AI có hợp lệ không
  if (!aiResult || typeof aiResult !== 'object') {
    return false;
  }

  // 2. Kiểm tra intent
  if (aiResult.intent === 'UpdateBankBalance') {
    // Kiểm tra thông tin số dư tài khoản
    const invalidValues = ['N/A', '', null, undefined];
    
    if (invalidValues.includes(aiResult.accountNumber) || 
        invalidValues.includes(aiResult.balance)) {
      return false;
    }
    
    // Kiểm tra định dạng số tiền
    if (aiResult.balance) {
      const balanceStr = parseCurrency(aiResult.balance.toString());
      const balanceNum = parseFloat(balanceStr);
      
      if (isNaN(balanceNum) || balanceNum < 0) {
        return false;
      }
    }
    
    return true;
  } else if (aiResult.intent === 'AddTx') {
    // Kiểm tra giao dịch thông thường
    const invalidValues = ['N/A', '', null, undefined, '0', `${getCurrencyFormat().symbol}0.00`, '0.00'];

    // Nếu group là N/A thì chắc chắn không phải giao dịch
    if (invalidValues.includes(aiResult.group)) {
      return false;
    }

    // Nếu amount là 0 hoặc N/A thì có thể không phải giao dịch thực
    if (invalidValues.includes(aiResult.amount)) {
      return false;
    }

    // 3. Kiểm tra subject có chứa từ khóa spam
    const spamKeywords = [
      'script', 'error', 'lỗi', 'thông báo lỗi', 'notification error',
      'spam', 'advertisement', 'quảng cáo', 'khuyến mãi', 'promotion',
      'newsletter', 'unsubscribe', 'marketing', 'survey', 'khảo sát'
    ];

    const subjectLower = subject.toLowerCase();
    for (const keyword of spamKeywords) {
      if (subjectLower.includes(keyword.toLowerCase())) {
        return false;
      }
    }  

    // 4. Kiểm tra định dạng số tiền có hợp lệ không
    if (aiResult.amount) {
      const amountStr = parseCurrency(aiResult.amount.toString());
      const amountNum = parseFloat(amountStr);

      // Nếu số tiền <= 0 hoặc không phải số thì không hợp lệ
      if (isNaN(amountNum) || amountNum <= 0) {
        return false;
      }

      // Nếu số tiền quá lớn (> 50,000) có thể là spam
      if (amountNum > 50000) {
        return false;
      }
    }

    // 5. Kiểm tra ngày có hợp lệ không
    if (aiResult.date) {
      try {
        const dateParts = aiResult.date.split('/');
        if (dateParts.length === 3) {
          const day = parseInt(dateParts[0]);
          const month = parseInt(dateParts[1]);
          const year = parseInt(dateParts[2]);

          // Kiểm tra ngày có hợp lệ không
          if (day < 1 || day > 31 || month < 1 || month > 12 || year < 2020 || year > 2030) {
            return false;
          }
        }
      } catch (e) {
        // Nếu không parse được ngày thì có thể không hợp lệ
        return false;
      }
    }

    return true;
  }

  // Nếu không có intent hoặc intent không hợp lệ
  return false;
}

//cắt gọn mail body
function trimCICMailBody(mailBody) {
  const startIndex = mailBody.indexOf("Monsieur,");
  const endIndex = mailBody.indexOf("Cordialement,");
  
  if (startIndex >= 0 && endIndex > startIndex) {
    return mailBody.substring(startIndex+10, endIndex).trim();
  } else {
    // fallback: return original body if pattern not found
    return mailBody;
  }
}
