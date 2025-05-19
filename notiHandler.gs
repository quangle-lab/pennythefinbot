function processBankAlerts() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet();
  //const threads = GmailApp.search('-is:starred subject:opération OR subject:mouvements');
  const threads = GmailApp.search('-is:starred');

  for (let thread of threads) {
    const messages = thread.getMessages();

    for (let message of messages) {
      const body = message.getPlainBody();
      Logger.log (body);

      // Trích xuất thông tin từ nhiều định dạng email CIC
      let rawDate, amount, tx;

      const cicPattern = body.match(/le (\d{2}\/\d{2}\/\d{4})/);
      const cicAmount = body.match(/‑([\d,.]+) EUR/);
      const cicTx = body.match(/: [‑-]?[\d,.]+ EUR \((.*?)\)/);

      const altPattern = body.match(/le (\d{2}\/\d{2}\/\d{4}) à \d{2}h\d{2}/);
      const altAmount = body.match(/Montant:\s*([\d,.]+) EUR/);
      const altTx = body.match(/Nature:\s*(.+)/);

      if (cicPattern && cicAmount && cicTx) {
        rawDate = cicPattern[1];
        amount = parseFloat(cicAmount[1].replace(',', '.'));
        tx = cicTx[1];
      } else if (altPattern && altAmount && altTx) {
        rawDate = altPattern[1];
        amount = parseFloat(altAmount[1].replace(',', '.'));
        tx = altTx[1];
      } else {
        continue; // Không khớp định dạng nào
      }

      const parsedDate = Utilities.formatDate(new Date(rawDate.split('/').reverse().join('/')), Session.getScriptTimeZone(), "dd/MM/yyyy");

      // Gọi OpenAI để phân loại thông minh
      const aiResult = classifyTransactionWithAI(tx, amount, parsedDate);
      const tabName = aiResult.tab || '🛒 Chi phí biến đổi';
      const category = aiResult.category || 'Khác';
      const location = aiResult.location || 'N/A';
      const note = aiResult.note || '';

      // Ghi vào tab tương ứng
      const targetSheet = sheet.getSheetByName(tabName);
      if (targetSheet) {
        targetSheet.appendRow([parsedDate, note, amount, location, category, tx]);
        
        //gửi thông báo Telegram
        reportTx (parsedDate, note, amount, location, category, tx, tabName);

        //xử lý trả lời Telegram nếu có
        //TODO
      }

      // Đánh dấu đã xử lý
      message.star();
      message.markRead();
    }
  }
}

function classifyTransactionWithAI(tx, amount, date) {
  const apiKey = 'n/a';

  const prompt = `Đây là thông tin giao dịch của 1 cặp vợ chồng sống ở Rennes và Nantes, Pháp, với 2 con mèo. Họ thuê nhà và có 1 chiếc xe hơi cỡ B.
  Các giao dịch tài chính được phân vào các tab: 🏡Chi phí cố định, 🛒Chi phí biến đổi, 🛟Quỹ gia đình, ✈️Quỹ mục đích, và 🫙Tiết kiệm. 
  Chi tiết các mục cho từng bảng tính như sau:
  1/ Chi phí cố định: chứa các giao dịch định kỳ hàng tháng như tiền thuê nhà, tiền bảo hiểm nhà, bảo hiểm xe, hóa đơn điện, nước, internet, tiền thẻ đi lại bus và metro, các khoản vay định kỳ, etc. Cụ thể các mục như sau: 
      🏠Thuê nhà: tiền thuê nhà ở Rennes và ở Nantes (chung cư Nexity)
      🏦BH vật chất: tiền bảo hiểm nhà cửa, tai nạn, bảo hiểm xe hơi
      ⚡️Điện: tiền hóa đơn điện
      🚰Nước: tiền hóa đơn nước
      🕸️Internet: tiền hóa đơn Internet
      🏦Dịch vụ: tiền dịch vụ và chi phí ngân hàng
      🚋Metro/Tram: tiền thuê bao tháng hoặc để đi lại trong thành phố bằng bus, tram hay metro
      📱Di động: tiền cước điện thoại đi động:
      🛍️Tiền túi: tiền chi tiêu cá nhân
      🩺BH Sức khỏe: tiền bảo hiểm sức khỏe
      🩷Chu cấp: tiền gửi cho ba mẹ 2 bên (2 khoản 100 EUR và 300 EUR mỗi tháng)
      💸Vay: tiền trả nợ những khoản vay tiêu dùng
      🛟Quỹ gia đình: tiền chuyển vào quỹ gia đình
      ✈️Quỹ mục đích: tiền chuyển vào quỹ mục đích
      🫙Tiết kiệm: tiền chuyển vào tiết kiệm  
      
  2/ Chi phí biến đổi: chứa các khoản tiền chi trả cho sinh hoạt hàng tuần như tiền đi chợ, tiền ăn nhà hàng, tiền nuôi mèo, tiền đi lại giữa các thành phố. Cụ thể các mục như sau
      ⛽️Xăng: tiền đổ xăng xe hơi ở siêu thị, trạm Total
      🅿️Đậu xe: tiền đậu xe ở Nantes, Rennes, hay các bãi đậu xe phổ biến ở Pháp
      🛒Chợ: tiền đi siêu thị, chợ trời, siêu thị châu á
      🍽️Ăn ngoài: tiền ăn nhà hàng
      🚌Đi lại: tiền vé xe lửa, bus đi lại giữa các thành phố
      😽Mèo: tiền mua thức ăn cho mèo, dịch vụ thú y, v.v..
      💸Vay trả góp: trả góp các khoảng vay tiêu dùng
      🚘Xe hơi(khác): các khoản chi để sửa chữa xe hơi, rửa xe
      💊Thuốc men: các khoản mua thuốc không được bảo hiểm hoàn tiền
      
  3/ Quỹ gia đình: chứa các khoản chi phát sinh, sức khỏe (tinh thần, thể chất) hay khẩn cấp
      😱Phát sinh: các khoản phát sinh ngoài dự kiến
      🩺Sức khỏe: các khoản khám bệnh, khám bác sĩ sẽ được bảo hiểm hoàn tiền
      🧠Tinh thần: tư vấn tâm lý
      
  4/ Quỹ mục đích: dành cho chắc khoản chi theo mục tiêu như du lịch, về Việt Nam thăm nhà
    🧳Du lịch
    🇻🇳Việt Nam

  5/ Tiết kiệm: tiền tiết kiệm hàng tháng

  Hãy phân loại giao dịch sau:
  - Tên giao dịch: ${tx}
  - Ngày: ${date}
  - Số tiền: ${amount} EUR

  Chỉ trả về kết quả dưới dạng JSON 3 khóa sau, không có dấu code block, không có lời giải thích: tab, category, location, note. 
    - Nơi chi: Rennes, Nantes, N/A
    - Note ngắn gọn, tối đa 30 ký tự.`;

  const response = UrlFetchApp.fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    payload: JSON.stringify({
      model: 'gpt-4.1',
      input: [{ role: 'user', content: prompt }],
      temperature: 0.2,
    }),
    muteHttpExceptions: true,
  });

  try {
    const json = JSON.parse(response.getContentText());
    const reply = JSON.parse(json.output[0].content[0].text);
    return reply;
  } catch (e) {
    Logger.log("Phân loại AI thất bại: " + e);
    return {
      tab: '🛒 Chi phí biến đổi',
      category: 'Khác',
      note: 'Không phân loại được với AI',
    };
  }
}
