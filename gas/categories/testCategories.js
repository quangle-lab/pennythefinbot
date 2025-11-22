//Test suite for category management functionality
//Following TDD approach - tests written before implementation

//run all category tests
function runAllCategoryTests() {
  console.log("🚀 Starting Category Management Test Suite");
  console.log("=".repeat(60));

  const results = {
    listAllCategoriesAndGroups: false,
    activateCategory: false,
    deactivateCategory: false,
    addCategoryToGroup: false
  };

  try {
    console.log("\n📋 CATEGORY MANAGEMENT TESTS");
    console.log("-".repeat(40));
    results.listAllCategoriesAndGroups = testListAllCategoriesAndGroups();
    results.activateCategory = testActivateCategory();
    results.deactivateCategory = testDeactivateCategory();
    results.addCategoryToGroup = testAddCategoryToGroup();

    console.log("\n" + "=".repeat(60));
    console.log("📊 CATEGORY TEST RESULTS SUMMARY");
    console.log("=".repeat(60));

    Object.keys(results).forEach(testName => {
      const status = results[testName] ? "✅ PASSED" : "❌ FAILED";
      console.log(`${testName}: ${status}`);
    });

    const allPassed = Object.values(results).every(result => result === true);
    console.log("\n" + (allPassed ? "🎉 ALL CATEGORY TESTS PASSED!" : "⚠️ SOME CATEGORY TESTS FAILED"));

    return allPassed;

  } catch (error) {
    console.error("❌ Critical error in category test suite:", error);
    return false;
  }
}

//test data setup for category sheet
function createCategoryTestData() {
  // Mock category sheet data structure
  // Columns: A=Group, B=Category, C=Description, D=isActive (1 = active, 0 = inactive)
  return [
    ["Group", "Category", "Description", "isActive"],
    ["💰Thu nhập", "Lương", "Lương hàng tháng", 1],
    ["💰Thu nhập", "Thưởng", "Thưởng dự án", 1],
    ["💰Thu nhập", "Đầu tư", "Thu nhập từ đầu tư", 0], // inactive
    ["🏡Chi phí cố định", "Thuê nhà", "Tiền thuê nhà hàng tháng", 1],
    ["🏡Chi phí cố định", "Điện nước", "Hóa đơn điện nước", 1],
    ["🏡Chi phí cố định", "Internet", "Hóa đơn internet", 0], // inactive
    ["🛒Chi phí biến đổi", "Chợ", "Mua sắm tại chợ", 1],
    ["🛒Chi phí biến đổi", "Ăn uống", "Chi phí ăn uống", 1],
    ["🛒Chi phí biến đổi", "Di chuyển", "Chi phí đi lại", 1],
    ["🛟Quỹ gia đình", "Quỹ khẩn cấp", "Quỹ dự phòng", 1],
    ["🎯Quỹ mục đích", "Du lịch", "Tiết kiệm du lịch", 1],
    ["🫙Tiết kiệm", "Tiết kiệm ngắn hạn", "Tiết kiệm 6 tháng", 1]
  ];
}

//mock SpreadsheetApp for category testing
function mockSpreadsheetAppForCategories(testData) {
  let sheetData = JSON.parse(JSON.stringify(testData));

  const mockSheet = {
    getDataRange: function() {
      return {
        getValues: function() {
          return sheetData;
        },
        getNumRows: function() {
          return sheetData.length;
        }
      };
    },
    getLastRow: function() {
      return sheetData.length;
    },
    appendRow: function(rowData) {
      sheetData.push(rowData);
      console.log(`📝 Mock: Added category row:`, rowData);
    },
    getRange: function(row, col, numRows = 1, numCols = 1) {
      return {
        getValue: function() {
          if (sheetData[row - 1]) {
            return sheetData[row - 1][col - 1];
          }
          return null;
        },
        setValue: function(value) {
          if (sheetData[row - 1]) {
            sheetData[row - 1][col - 1] = value;
            console.log(`📝 Mock: Updated row ${row}, col ${col} to:`, value);
          }
        },
        getValues: function() {
          const result = [];
          for (let i = 0; i < numRows; i++) {
            const rowData = [];
            for (let j = 0; j < numCols; j++) {
              if (sheetData[row - 1 + i]) {
                rowData.push(sheetData[row - 1 + i][col - 1 + j]);
              }
            }
            result.push(rowData);
          }
          return result;
        },
        setValues: function(values) {
          for (let i = 0; i < numRows; i++) {
            for (let j = 0; j < numCols; j++) {
              if (sheetData[row - 1 + i]) {
                sheetData[row - 1 + i][col - 1 + j] = values[i][j];
              }
            }
          }
          console.log(`📝 Mock: Updated range starting at row ${row}, col ${col}:`, values);
        }
      };
    }
  };

  const mockSpreadsheet = {
    getSheetByName: function(name) {
      if (name === "⚙️Tùy chỉnh Chi phí") {
        return mockSheet;
      }
      return null;
    },
    getRangeByName: function(rangeName) {
      // Mock named ranges - return appropriate range based on range name
      const rangeMap = {
        "ThuNhap": { startRow: 2, numRows: 3 }, // Rows 2-4
        "ChiPhiCoDinh": { startRow: 5, numRows: 3 }, // Rows 5-7
        "ChiPhiBienDoi": { startRow: 8, numRows: 3 }, // Rows 8-10
        "QuyGiaDinh": { startRow: 11, numRows: 1 }, // Row 11
        "QuyMucDich": { startRow: 12, numRows: 1 }, // Row 12
        "TietKiem": { startRow: 13, numRows: 1 } // Row 13
      };

      const rangeInfo = rangeMap[rangeName];
      if (!rangeInfo) return null;

      return {
        getSheet: function() {
          return mockSheet;
        },
        getRow: function() {
          return rangeInfo.startRow;
        },
        getNumRows: function() {
          return rangeInfo.numRows;
        }
      };
    }
  };

  return {
    getActiveSpreadsheet: function() {
      return mockSpreadsheet;
    },
    openById: function(id) {
      return mockSpreadsheet;
    }
  };
}

//test listAllCategoriesAndGroups function
function testListAllCategoriesAndGroups() {
  console.log("\n🧪 Testing listAllCategoriesAndGroups function...");

  const testData = createCategoryTestData();
  const originalSpreadsheetApp = SpreadsheetApp;
  const originalPropertiesService = PropertiesService;

  try {
    // Mock SpreadsheetApp
    SpreadsheetApp = mockSpreadsheetAppForCategories(testData);

    // Mock PropertiesService
    PropertiesService = {
      getScriptProperties: function() {
        return {
          getProperty: function(key) {
            if (key === 'sheet_txCatConfig') {
              return '⚙️Tùy chỉnh Chi phí';
            }
            return null;
          }
        };
      }
    };

    // Test 1: List all categories
    console.log("\n📋 Test 1: List all categories and groups");
    const result1 = listAllCategoriesAndGroups();
    
    if (!result1.success) {
      console.error("❌ Test 1 failed: Function returned error:", result1.error);
      return false;
    }

    if (!result1.groups || result1.groups.length === 0) {
      console.error("❌ Test 1 failed: No groups returned");
      return false;
    }

    console.log(`✅ Found ${result1.groups.length} groups`);
    
    // Verify structure
    result1.groups.forEach(group => {
      if (!group.groupName || !group.categories || !Array.isArray(group.categories)) {
        console.error("❌ Test 1 failed: Invalid group structure");
        return false;
      }
      console.log(`  - ${group.groupName}: ${group.categories.length} categories`);
    });

    // Test 2: Verify active/inactive status
    console.log("\n📋 Test 2: Verify active/inactive status");
    let hasActive = false;
    let hasInactive = false;
    
    result1.groups.forEach(group => {
      group.categories.forEach(cat => {
        if (cat.isActive) hasActive = true;
        if (!cat.isActive) hasInactive = true;
      });
    });

    if (!hasActive || !hasInactive) {
      console.error("❌ Test 2 failed: Missing active or inactive categories");
      return false;
    }

    console.log("✅ Active and inactive categories found");

    console.log("\n✅ All listAllCategoriesAndGroups tests passed!");
    return true;

  } catch (error) {
    console.error("❌ Error in listAllCategoriesAndGroups tests:", error);
    return false;
  } finally {
    SpreadsheetApp = originalSpreadsheetApp;
    PropertiesService = originalPropertiesService;
  }
}

//test activateCategory function
function testActivateCategory() {
  console.log("\n🧪 Testing activateCategory function...");

  const testData = createCategoryTestData();
  const originalSpreadsheetApp = SpreadsheetApp;
  const originalPropertiesService = PropertiesService;

  try {
    SpreadsheetApp = mockSpreadsheetAppForCategories(testData);
    PropertiesService = {
      getScriptProperties: function() {
        return {
          getProperty: function(key) {
            if (key === 'sheet_txCatConfig') {
              return '⚙️Tùy chỉnh Chi phí';
            }
            return null;
          }
        };
      }
    };

    // Test 1: Activate an inactive category
    console.log("\n📋 Test 1: Activate inactive category");
    const result1 = activateCategory("💰Thu nhập", "Đầu tư");
    
    if (!result1.success) {
      console.error("❌ Test 1 failed: Function returned error:", result1.error);
      return false;
    }

    console.log("✅ Category activated successfully");

    // Test 2: Activate already active category (should still succeed)
    console.log("\n📋 Test 2: Activate already active category");
    const result2 = activateCategory("💰Thu nhập", "Lương");
    
    if (!result2.success) {
      console.error("❌ Test 2 failed: Should succeed even if already active");
      return false;
    }

    console.log("✅ Already active category handled correctly");

    // Test 3: Activate non-existent category
    console.log("\n📋 Test 3: Activate non-existent category");
    const result3 = activateCategory("💰Thu nhập", "NonExistent");
    
    if (result3.success) {
      console.error("❌ Test 3 failed: Should fail for non-existent category");
      return false;
    }

    console.log("✅ Non-existent category correctly rejected");

    // Test 4: Activate category in non-existent group
    console.log("\n📋 Test 4: Activate category in invalid group");
    const result4 = activateCategory("Invalid Group", "Lương");
    
    if (result4.success) {
      console.error("❌ Test 4 failed: Should fail for invalid group");
      return false;
    }

    console.log("✅ Invalid group correctly rejected");

    console.log("\n✅ All activateCategory tests passed!");
    return true;

  } catch (error) {
    console.error("❌ Error in activateCategory tests:", error);
    return false;
  } finally {
    SpreadsheetApp = originalSpreadsheetApp;
    PropertiesService = originalPropertiesService;
  }
}

//test deactivateCategory function
function testDeactivateCategory() {
  console.log("\n🧪 Testing deactivateCategory function...");

  const testData = createCategoryTestData();
  const originalSpreadsheetApp = SpreadsheetApp;
  const originalPropertiesService = PropertiesService;

  try {
    SpreadsheetApp = mockSpreadsheetAppForCategories(testData);
    PropertiesService = {
      getScriptProperties: function() {
        return {
          getProperty: function(key) {
            if (key === 'sheet_txCatConfig') {
              return '⚙️Tùy chỉnh Chi phí';
            }
            return null;
          }
        };
      }
    };

    // Test 1: Deactivate an active category
    console.log("\n📋 Test 1: Deactivate active category");
    const result1 = deactivateCategory("💰Thu nhập", "Lương");
    
    if (!result1.success) {
      console.error("❌ Test 1 failed: Function returned error:", result1.error);
      return false;
    }

    console.log("✅ Category deactivated successfully");

    // Test 2: Deactivate already inactive category (should still succeed)
    console.log("\n📋 Test 2: Deactivate already inactive category");
    const result2 = deactivateCategory("💰Thu nhập", "Đầu tư");
    
    if (!result2.success) {
      console.error("❌ Test 2 failed: Should succeed even if already inactive");
      return false;
    }

    console.log("✅ Already inactive category handled correctly");

    // Test 3: Deactivate non-existent category
    console.log("\n📋 Test 3: Deactivate non-existent category");
    const result3 = deactivateCategory("💰Thu nhập", "NonExistent");
    
    if (result3.success) {
      console.error("❌ Test 3 failed: Should fail for non-existent category");
      return false;
    }

    console.log("✅ Non-existent category correctly rejected");

    console.log("\n✅ All deactivateCategory tests passed!");
    return true;

  } catch (error) {
    console.error("❌ Error in deactivateCategory tests:", error);
    return false;
  } finally {
    SpreadsheetApp = originalSpreadsheetApp;
    PropertiesService = originalPropertiesService;
  }
}

//test addCategoryToGroup function
function testAddCategoryToGroup() {
  console.log("\n🧪 Testing addCategoryToGroup function...");

  const testData = createCategoryTestData();
  const originalSpreadsheetApp = SpreadsheetApp;
  const originalPropertiesService = PropertiesService;

  try {
    SpreadsheetApp = mockSpreadsheetAppForCategories(testData);
    PropertiesService = {
      getScriptProperties: function() {
        return {
          getProperty: function(key) {
            if (key === 'sheet_txCatConfig') {
              return '⚙️Tùy chỉnh Chi phí';
            }
            return null;
          }
        };
      }
    };

    // Test 1: Add new category to group
    console.log("\n📋 Test 1: Add new category to group");
    const result1 = addCategoryToGroup("💰Thu nhập", "Lãi suất", "Thu nhập từ lãi suất", true);
    
    if (!result1.success) {
      console.error("❌ Test 1 failed: Function returned error:", result1.error);
      return false;
    }

    console.log("✅ New category added successfully");

    // Test 2: Add duplicate category (should fail)
    console.log("\n📋 Test 2: Add duplicate category");
    const result2 = addCategoryToGroup("💰Thu nhập", "Lương", "Duplicate", true);
    
    if (result2.success) {
      console.error("❌ Test 2 failed: Should fail for duplicate category");
      return false;
    }

    console.log("✅ Duplicate category correctly rejected");

    // Test 3: Add category to invalid group
    console.log("\n📋 Test 3: Add category to invalid group");
    const result3 = addCategoryToGroup("Invalid Group", "New Category", "Description", true);
    
    if (result3.success) {
      console.error("❌ Test 3 failed: Should fail for invalid group");
      return false;
    }

    console.log("✅ Invalid group correctly rejected");

    // Test 4: Add category with default isActive (active)
    console.log("\n📋 Test 4: Add category with default isActive");
    const result4 = addCategoryToGroup("🛒Chi phí biến đổi", "Giải trí", "Chi phí giải trí");
    
    if (!result4.success) {
      console.error("❌ Test 4 failed: Should succeed with default isActive");
      return false;
    }

    console.log("✅ Category added with default isActive");

    console.log("\n✅ All addCategoryToGroup tests passed!");
    return true;

  } catch (error) {
    console.error("❌ Error in addCategoryToGroup tests:", error);
    return false;
  } finally {
    SpreadsheetApp = originalSpreadsheetApp;
    PropertiesService = originalPropertiesService;
  }
}

