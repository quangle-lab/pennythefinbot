//Prompts for category management intent detection and responses

/**
 * Format category list for display in prompts
 * @param {Object} categoriesData - Result from listAllCategoriesAndGroups()
 * @returns {string} Formatted category list string
 */
function formatCategoryListForPrompt(categoriesData) {
  if (!categoriesData.success || !categoriesData.groups || categoriesData.groups.length === 0) {
    return "Không có categories nào được cấu hình.";
  }

  const parts = [];
  parts.push("## Danh sách các nhóm và mục:");
  
  categoriesData.groups.forEach(group => {
    const activeCategories = group.categories.filter(cat => cat.isActive);
    const inactiveCategories = group.categories.filter(cat => !cat.isActive);
    
    parts.push(`\n### ${group.groupName}:`);
    
    if (activeCategories.length > 0) {
      parts.push("**Đang hoạt động:**");
      activeCategories.forEach(cat => {
        const desc = cat.description ? ` - ${cat.description}` : '';
        parts.push(`  - ${cat.category}${desc}`);
      });
    }
    
    if (inactiveCategories.length > 0) {
      parts.push("**Đã vô hiệu hóa:**");
      inactiveCategories.forEach(cat => {
        const desc = cat.description ? ` - ${cat.description}` : '';
        parts.push(`  - ${cat.category}${desc} (vô hiệu hóa)`);
      });
    }
  });
  
  return parts.join("\n");
}

/**
 * Generate prompt section for category management intents
 * @returns {string} Prompt section for intent detection
 */
function generateCategoryManagementIntentSection() {
  return `
  ## Quản lý Categories (Nhóm và Mục)
  
  Bạn có thể giúp khách hàng quản lý các nhóm và mục trong dự toán:
  
  - **listCategories**: Liệt kê tất cả các nhóm và mục hiện có, bao gồm trạng thái hoạt động/vô hiệu hóa
    - Ví dụ: "Cho tôi xem tất cả các mục trong dự toán"
    - Ví dụ: "Liệt kê các nhóm và mục tôi có"
    - Ví dụ: "Hiển thị danh sách categories"
  
  - **activateCategory**: Kích hoạt một mục đã tồn tại để sử dụng trong dự toán
    - Ví dụ: "Kích hoạt mục Ăn uống trong nhóm Chi phí biến đổi"
    - Ví dụ: "Bật lại mục Internet"
    - Ví dụ: "Kích hoạt mục Du lịch"
  
  - **deactivateCategory**: Vô hiệu hóa một mục để không sử dụng trong dự toán
    - Ví dụ: "Vô hiệu hóa mục Ăn uống trong nhóm Chi phí biến đổi"
    - Ví dụ: "Tắt mục Internet"
    - Ví dụ: "Vô hiệu hóa mục Du lịch"
  
  - **addCategory**: Thêm một mục mới vào một nhóm
    - Ví dụ: "Thêm mục Cafe vào nhóm Chi phí biến đổi"
    - Ví dụ: "Tạo mục mới tên Giải trí trong nhóm Chi phí biến đổi với mô tả Chi phí giải trí"
    - Ví dụ: "Thêm mục Lãi suất vào nhóm Thu nhập, mô tả là Thu nhập từ lãi suất"
  
  - **updateCategoryDescription**: Cập nhật mô tả của một mục đã tồn tại
    - Ví dụ: "Cập nhật mô tả mục Ăn uống trong nhóm Chi phí biến đổi thành Chi phí ăn uống hàng ngày"
    - Ví dụ: "Thay đổi mô tả mục Internet thành Chi phí internet hàng tháng"
    - Ví dụ: "Sửa mô tả mục Du lịch trong nhóm Chi phí biến đổi thành Chi phí du lịch và nghỉ dưỡng"
  `;
}

/**
 * Generate intent structure for category management
 * @returns {string} JSON structure examples for category intents
 */
function generateCategoryIntentStructures() {
  return `
  ### Yêu cầu liệt kê categories
    {
      "intent": "listCategories",
      "confirmation": "tin nhắn xác nhận hiểu và đang thực hiện yêu cầu của khách hàng"
    }
  
  ### Yêu cầu kích hoạt mục
    {
      "intent": "activateCategory",
      "group": "tên nhóm, tuân thủ tuyệt đối tên nhóm trong danh sách, cả chữ lẫn emoji",
      "category": "tên mục cần kích hoạt, tuân thủ tuyệt đối tên mục trong danh sách",
      "confirmation": "tin nhắn xác nhận hiểu và đang thực hiện yêu cầu của khách hàng"
    }
  
  ### Yêu cầu vô hiệu hóa mục
    {
      "intent": "deactivateCategory",
      "group": "tên nhóm, tuân thủ tuyệt đối tên nhóm trong danh sách, cả chữ lẫn emoji",
      "category": "tên mục cần vô hiệu hóa, tuân thủ tuyệt đối tên mục trong danh sách",
      "confirmation": "tin nhắn xác nhận hiểu và đang thực hiện yêu cầu của khách hàng"
    }
  
  ### Yêu cầu thêm mục mới
    {
      "intent": "addCategory",
      "group": "tên nhóm, tuân thủ tuyệt đối tên nhóm trong danh sách, cả chữ lẫn emoji",
      "category": "tên mục mới cần thêm, suy xét emoji dựa trên miêu tả của mục mới",
      "description": "mô tả cho mục mới (tùy chọn, để trống nếu không có)",
      "isActive": 1, // Mặc định là 1 (active), hoặc 0 (inactive) nếu khách hàng yêu cầu
      "confirmation": "tin nhắn xác nhận hiểu và đang thực hiện yêu cầu của khách hàng"
    }
  
  ### Yêu cầu cập nhật mô tả mục
    {
      "intent": "updateCategoryDescription",
      "group": "tên nhóm, tuân thủ tuyệt đối tên nhóm trong danh sách, cả chữ lẫn emoji",
      "category": "tên mục cần cập nhật mô tả, tuân thủ tuyệt đối tên mục trong danh sách, cả chữ lẫn emoji",
      "description": "mô tả mới cho mục (có thể để trống nếu muốn xóa mô tả)",
      "confirmation": "tin nhắn xác nhận hiểu và đang thực hiện yêu cầu của khách hàng"
    }
  `;
}


