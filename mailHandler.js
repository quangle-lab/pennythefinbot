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
      const aiResult = classifyTransactionWithAI(subject, body);
      const tabName = aiResult.tab || '🛒 Chi phí biến đổi';
      const typeTx = aiResult.type || 'Thu'
      const dateTx = aiResult.date || '';
      const descTx = aiResult.desc || '';      
      const amountTx = aiResult.amount || '0';      
      const locationTx = aiResult.location || 'N/A';
      const categoryTx = aiResult.category || 'Khác';
      const bankcommentTx = aiResult.bankcomment || '';          

      // Ghi vào tab tương ứng
      const targetSheet = sheet.getSheetByName(tabName);
      if (targetSheet) {
        const lastRow = targetSheet.getLastRow();
        targetSheet.appendRow([dateTx, descTx, amountTx, locationTx, categoryTx, bankcommentTx]);        
        rowID = lastRow+1;
        
        //gửi thông báo Telegram
        const message = `${typeTx} *${amountTx} EUR* cho *${descTx}*\n✏️_Ghi vào ${tabName}, mục ${categoryTx}, dòng ${rowID}_\n`;
        sendTelegramMessage (message);
      }

      // Đánh dấu đã xử lý
      message.star();
      message.markRead();
    }
  }
}


