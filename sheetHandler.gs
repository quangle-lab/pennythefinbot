function fundEdit(e) {
  const sourceSheetName = "🏡Chi phí cố định";
  const range = e.range;
  const editedSheet = range.getSheet();

  if (editedSheet.getName() !== sourceSheetName) return;

  const row = range.getRow();
  const category = editedSheet.getRange(row, 5).getValue();  // Cột "Mục"
  const amount = editedSheet.getRange(row, 3).getValue();    // Cột "Thực chi"
  const date = editedSheet.getRange(row, 1).getValue();      // Cột "Ngày"

  const mappings = {
    "🫙Tiết kiệm": "🫙Tiết kiệm",
    "🛟Quỹ gia đình": "🛟Quỹ gia đình",
    "✈️Quỹ mục đích": "✈️Quỹ mục đích"
  };

  if (category in mappings && amount > 0) {
    const targetSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(mappings[category]);
    if (!targetSheet) return;

    targetSheet.appendRow([
      date,
      "Nhận hàng tháng",
      amount,
      'N/A',
      "🚰Thu",
      "Tự động chuyển"
    ]);
  }
}