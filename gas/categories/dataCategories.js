//Data controller for category management operations
//Manages categories and groups in the category configuration sheet

//---------------CATEGORY MANAGEMENT-------------------//

/**
 * Get the category sheet name from configuration
 * @returns {string} Sheet name for category configuration
 */
function getCategorySheetName() {
  const props = PropertiesService.getScriptProperties();
  return props.getProperty('sheet_txCatConfig') || '⚙️Groups - Categories';
}

/**
 * Get the category configuration sheet
 * @returns {Sheet} The category configuration sheet
 */
function getCategorySheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetName = getCategorySheetName();
  const sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    throw new Error(`❌ Không tìm thấy sheet '${sheetName}'`);
  }
  
  return sheet;
}

/**
 * Map group names to their named ranges
 * @returns {Object} Mapping of group names to named range names
 */
function getGroupToNamedRangeMap() {
  return {
    "💰Thu nhập": "ThuNhap",
    "🏡Chi phí cố định": "ChiPhiCoDinh",
    "🛒Chi phí biến đổi": "ChiPhiBienDoi",
    "🛟Quỹ gia đình": "QuyGiaDinh",
    "✈️Quỹ mục đích": "QuyMucDich",
    "🫙Tiết kiệm": "TietKiem"
  };
}

/**
 * Validate if a group name is valid
 * @param {string} group - Group name to validate
 * @returns {boolean} True if group is valid
 */
function isValidGroup(group) {
  const groupMap = getGroupToNamedRangeMap();
  return group in groupMap;
}

/**
 * Internal helper: Read and parse all categories from sheet
 * @param {boolean} includeInactive - Whether to include inactive categories (default: true)
 * @returns {Map} Map of group names to arrays of category objects, or null on error
 */
function getAllCategoriesList(includeInactive = true) {
  try {
    const sheet = getCategorySheet();
    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return null;
    }

    // Group data by group name
    const groupsMap = new Map();
    
    // Skip header row
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const group = row[0]; // Column A
      const category = row[1]; // Column B
      const description = row[2] || ''; // Column C
      const isActiveValue = row[3] || 0; // Column D: 1 = active, 0 = inactive
      
      // Skip empty rows
      if (!group || !category) continue;
      
      // Determine if category is active (isActiveValue > 0 or non-empty)
      const isActive = isActiveValue > 0 || (isActiveValue !== 0 && isActiveValue !== '' && isActiveValue !== null);
      
      // Filter inactive categories if requested
      if (!includeInactive && !isActive) continue;
      
      if (!groupsMap.has(group)) {
        groupsMap.set(group, []);
      }
      
      groupsMap.get(group).push({
        category: category,
        description: description,
        isActive: isActive
      });
    }

    return groupsMap;

  } catch (error) {
    Logger.log(`Error in getAllCategoriesList: ${error.toString()}`);
    return null;
  }
}

/**
 * Find a category in the sheet by group and category name
 * @param {string} group - Group name
 * @param {string} category - Category name
 * @returns {Object} Result with row index and data, or null if not found
 */
function findCategoryInSheet(group, category) {
  try {
    const sheet = getCategorySheet();
    const data = sheet.getDataRange().getValues();
    
    // Skip header row
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const rowGroup = row[0];
      const rowCategory = row[1];
      
      if (rowGroup === group && rowCategory === category) {
        const isActiveValue = row[3] || 0;
        return {
          rowIndex: i + 1, // 1-based index for sheet
          group: rowGroup,
          category: rowCategory,
          description: row[2] || '',
          isActiveValue: isActiveValue,
          isActive: isActiveValue > 0 || (isActiveValue !== 0 && isActiveValue !== '' && isActiveValue !== null)
        };
      }
    }
    
    return null;
  } catch (error) {
    Logger.log(`Error in findCategoryInSheet: ${error.toString()}`);
    return null;
  }
}

/**
 * Activate a category by setting its isActive to 1
 * @param {string} group - Group name
 * @param {string} category - Category name
 * @returns {Object} Result object
 */
function activateCategory(group, category) {
  try {
    // Validate group
    if (!isValidGroup(group)) {
      return {
        success: false,
        error: `❌ Nhóm "${group}" không hợp lệ`
      };
    }

    // Find category
    const categoryData = findCategoryInSheet(group, category);
    
    if (!categoryData) {
      return {
        success: false,
        error: `❌ Không tìm thấy mục "${category}" trong nhóm "${group}"`
      };
    }

    // Check if already active
    if (categoryData.isActive) {
      return {
        success: true,
        message: `✅ Mục "${category}" trong nhóm "${group}" đã được kích hoạt`,
        wasAlreadyActive: true
      };
    }

    // Activate by setting isActive to 1
    const sheet = getCategorySheet();
    const isActiveColumn = 4; // Column D
    sheet.getRange(categoryData.rowIndex, isActiveColumn).setValue(1);

    return {
      success: true,
      message: `✅ Đã kích hoạt mục "${category}" trong nhóm "${group}"`,
      wasAlreadyActive: false
    };

  } catch (error) {
    Logger.log(`Error in activateCategory: ${error.toString()}`);
    return {
      success: false,
      error: `❌ Lỗi khi kích hoạt mục: ${error.toString()}`
    };
  }
}

/**
 * Deactivate a category by setting its isActive to 0
 * @param {string} group - Group name
 * @param {string} category - Category name
 * @returns {Object} Result object
 */
function deactivateCategory(group, category) {
  try {
    // Validate group
    if (!isValidGroup(group)) {
      return {
        success: false,
        error: `❌ Nhóm "${group}" không hợp lệ`
      };
    }

    // Find category
    const categoryData = findCategoryInSheet(group, category);
    
    if (!categoryData) {
      return {
        success: false,
        error: `❌ Không tìm thấy mục "${category}" trong nhóm "${group}"`
      };
    }

    // Check if already inactive
    if (!categoryData.isActive) {
      return {
        success: true,
        message: `✅ Mục "${category}" trong nhóm "${group}" đã được vô hiệu hóa`,
        wasAlreadyInactive: true
      };
    }

    // Deactivate by setting isActive to 0
    const sheet = getCategorySheet();
    const isActiveColumn = 4; // Column D
    sheet.getRange(categoryData.rowIndex, isActiveColumn).setValue(0);

    return {
      success: true,
      message: `✅ Đã vô hiệu hóa mục "${category}" trong nhóm "${group}"`,
      wasAlreadyInactive: false
    };

  } catch (error) {
    Logger.log(`Error in deactivateCategory: ${error.toString()}`);
    return {
      success: false,
      error: `❌ Lỗi khi vô hiệu hóa mục: ${error.toString()}`
    };
  }
}

/**
 * Add a new category to a group
 * @param {string} group - Group name
 * @param {string} category - Category name
 * @param {string} description - Category description
 * @param {boolean} isActive - Whether category is active (defaults to true)
 * @returns {Object} Result object
 */
function addCategoryToGroup(group, category, description, isActive) {
  try {
    // Validate group
    if (!isValidGroup(group)) {
      return {
        success: false,
        error: `❌ Nhóm "${group}" không hợp lệ`
      };
    }

    // Check if category already exists
    const existingCategory = findCategoryInSheet(group, category);
    
    if (existingCategory) {
      return {
        success: false,
        error: `❌ Mục "${category}" đã tồn tại trong nhóm "${group}"`
      };
    }

    // Set default isActive to true (1) if not provided
    const isActiveValue = (isActive !== undefined && isActive !== null) ? (isActive ? 1 : 0) : 1;

    // Get the sheet and append the new row
    const sheet = getCategorySheet();
    
    // Prepare the new row data
    const newRow = [
      group,           // Column A: Group
      category,        // Column B: Category
      description || '', // Column C: Description
      isActiveValue    // Column D: isActive (1 = active, 0 = inactive)
    ];
    
    // Simply append the row to the end of the sheet
    sheet.appendRow(newRow);

    return {
      success: true,
      message: `✅ Đã thêm mục "${category}" vào nhóm "${group}"`,
      category: {
        group: group,
        category: category,
        description: description || '',
        isActive: isActiveValue > 0
      }
    };

  } catch (error) {
    Logger.log(`Error in addCategoryToGroup: ${error.toString()}`);
    return {
      success: false,
      error: `❌ Lỗi khi thêm mục: ${error.toString()}`
    };
  }
}

/**
 * Update the description of an existing category
 * @param {string} group - Group name
 * @param {string} category - Category name
 * @param {string} description - New category description
 * @returns {Object} Result object
 */
function updateCategoryDescription(group, category, description) {
  try {
    // Validate group
    if (!isValidGroup(group)) {
      return {
        success: false,
        error: `❌ Nhóm "${group}" không hợp lệ`
      };
    }

    // Find category
    const categoryData = findCategoryInSheet(group, category);
    
    if (!categoryData) {
      return {
        success: false,
        error: `❌ Không tìm thấy mục "${category}" trong nhóm "${group}"`
      };
    }

    // Update description (Column C)
    const sheet = getCategorySheet();
    const descriptionColumn = 3; // Column C
    const newDescription = description || '';
    
    // Update the description cell
    sheet.getRange(categoryData.rowIndex, descriptionColumn).setValue(newDescription);

    return {
      success: true,
      message: `✅ Đã cập nhật mô tả cho mục "${category}" trong nhóm "${group}" thành: "${newDescription}"`,
      category: {
        group: group,
        category: category,
        description: newDescription,
        isActive: categoryData.isActive
      }
    };

  } catch (error) {
    Logger.log(`Error in updateCategoryDescription: ${error.toString()}`);
    return {
      success: false,
      error: `❌ Lỗi khi cập nhật mô tả: ${error.toString()}`
    };
  }
}

//---------------CATEGORY LIST FOR PROMPTS-------------------//

/**
 * Get transaction categories formatted for prompts
 * Reads from named ranges where:
 * - Row 1: group name
 * - Row 2+: category names with descriptions
 * @returns {string} Formatted category list for prompts (only active categories)
 */
function getTxCat() {
  const groupsMap = getAllCategoriesList(true); // include inactive categories
  
  if (!groupsMap || groupsMap.size === 0) {
    return "## Các nhóm/mục giao dịch\n\nKhông có dữ liệu categories";
  }

  const promptParts = [];
  promptParts.push("## Các nhóm/mục giao dịch");

  // Format groups for prompt
  groupsMap.forEach((categories, groupName) => {
    const items = [];
    categories.forEach(cat => {
      if (cat.description) {
        items.push(`  ${cat.category}: ${cat.description}`);
      } else {
        items.push(`  ${cat.category}`);
      }
    });

    if (items.length > 0) {
      promptParts.push(`\n### ${groupName}:\n${items.join('\n')}`);
    }
  });
  
  const instructionCatPrompt = promptParts.join("\n");
  return instructionCatPrompt;
}

