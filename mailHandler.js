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


