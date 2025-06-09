//xử lý các thông báo từ banks
function processBankAlerts() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet();
  const threads = GmailApp.search('-is:starred');

  for (let thread of threads) {
    const messages = thread.getMessages();

    for (let message of messages) {    
      // Trích xuất thông tin tựa và nội dung từ email
      const body = message.getPlainBody();
      const subject = message.getSubject();    

      // Gọi OpenAI để phân loại thông minh tab, mục, số tiền, nơi phát sinh giao dịch, ghi chú, ghi của ngân hàng, ngày giao dịch
      const aiResult = classifyTransactionWithOpenAI(subject, body);

      // Kiểm tra xem email có phải là giao dịch thực sự không
      if (!isValidTransaction(aiResult, subject, body, message)) {
        Logger.log(`Bỏ qua email không phải giao dịch: ${subject}`);
        // Đánh dấu đã xử lý nhưng không thêm vào sheet
        message.star();
        message.markRead();
        continue;
      }

      const groupTx = aiResult.group || '🛒 Chi phí biến đổi';
      const typeTx = aiResult.type || 'Thu'
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
      if (checkResult.exists) {
        //gửi thông báo Telegram để xác nhận
        sendTelegramMessage (checkResult.message);
      } else {
        //thêm mới giao dịch
        const addResult = addConfirmedTransaction(groupTx, tx);      
        sendTelegramMessage (addResult.message);  
        if (!addResult.success) {
          sendTelegramMessage (addResult.error);
          continue;
        }
      }

      // Đánh dấu đã xử lý
      message.star();
      message.markRead();
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

  // 2. Kiểm tra các trường quan trọng có giá trị "N/A" hoặc rỗng
  const invalidValues = ['N/A', '', null, undefined, '0', '€0.00', '0.00'];

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

  // 4. Kiểm tra body có chứa nội dung giao dịch thực sự
  const transactionKeywords = [
    'giao dịch', 'transaction', 'thanh toán', 'payment', 'chuyển khoản', 'transfer',
    'rút tiền', 'withdrawal', 'nạp tiền', 'deposit', 'số dư', 'balance',
    'thẻ', 'card', 'atm', 'pos', 'internet banking', 'mobile banking'
  ];

  const bodyLower = body.toLowerCase();
  let hasTransactionKeyword = false;
  for (const keyword of transactionKeywords) {
    if (bodyLower.includes(keyword.toLowerCase())) {
      hasTransactionKeyword = true;
      break;
    }
  }

  // Nếu không có từ khóa giao dịch nào thì có thể không phải email giao dịch
  if (!hasTransactionKeyword) {
    return false;
  }

  // 5. Kiểm tra định dạng số tiền có hợp lệ không
  if (aiResult.amount) {
    const amountStr = aiResult.amount.toString().replace(/[€\s,]/g, '');
    const amountNum = parseFloat(amountStr);

    // Nếu số tiền <= 0 hoặc không phải số thì không hợp lệ
    if (isNaN(amountNum) || amountNum <= 0) {
      return false;
    }

    // Nếu số tiền quá lớn (> 50,000 EUR) có thể là spam
    if (amountNum > 50000) {
      return false;
    }
  }

  // 6. Kiểm tra ngày có hợp lệ không
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

  // 7. Kiểm tra sender có phải từ ngân hàng không (optional)
  let sender = '';
  if (message && typeof message.getFrom === 'function') {
    try {
      sender = message.getFrom().toLowerCase();
    } catch (e) {
      sender = '';
    }
  }

  const bankDomains = [
    'techcombank', 'vietcombank', 'bidv', 'agribank', 'mbbank', 'acb',
    'sacombank', 'eximbank', 'hdbank', 'tpbank', 'vpbank', 'shb',
    'credit-agricole', 'bnpparibas', 'societegenerale', 'lcl'
  ];

  // Nếu có thông tin sender và không phải từ ngân hàng thì cần cẩn thận hơn
  if (sender) {
    let isFromBank = false;
    for (const domain of bankDomains) {
      if (sender.includes(domain)) {
        isFromBank = true;
        break;
      }
    }

    // Nếu không phải từ ngân hàng và có nhiều dấu hiệu spam thì bỏ qua
    if (!isFromBank && (
      invalidValues.includes(aiResult.category) ||
      invalidValues.includes(aiResult.desc) ||
      aiResult.desc === 'Thông báo lỗi script Penny'
    )) {
      return false;
    }
  }

  // Nếu vượt qua tất cả các kiểm tra thì coi là giao dịch hợp lệ
  return true;
}


