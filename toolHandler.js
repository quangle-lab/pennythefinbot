tools =[
  {
    "name": "getBudgetData",
    "description": "Retrieve budget data for a specific month",
    "strict": true,
    "parameters": {
      "type": "object",
      "properties": {
        "monthText": {
          "type": "string",
          "description": "Month in MM/yyyy format (e.g., '12/2024')"
        }
      },
      "additionalProperties": false,
      "required": [
        "monthText"
      ]
    }
  },
  {
    "name": "getDashboardData",
    "description": "Get dashboard spending data for a specific month",
    "strict": true,
    "parameters": {
      "type": "object",
      "properties": {
        "monthText": {
          "type": "string",
          "description": "Month in MM/yyyy format (e.g., '12/2024')"
        }
      },
      "additionalProperties": false,
      "required": [
        "monthText"
      ]
    }
  },
  {
    "name": "findTransactionRowById",
    "description": "Find a transaction by its unique ID",
    "strict": true,
    "parameters": {
      "type": "object",
      "properties": {
        "sheetName": {
          "type": "string",
          "description": "Name of the transaction group sheet"
        },
        "transactionId": {
          "type": "string",
          "description": "Unique transaction ID (e.g., 'TX_1699123456_789')"
        }
      },
      "additionalProperties": false,
      "required": [
        "sheetName",
        "transactionId"
      ]
    }
  },
  {
    "name": "getFundBalances",
    "description": "Get fund balances for specific fund types or all funds",
    "strict": true,
    "parameters": {
      "type": "object",
      "properties": {
        "type": {
          "type": "string",
          "enum": [
            "rainy",
            "target",
            "saving",
            "all"
          ],
          "description": "Fund type: 'rainy' for family fund, 'target' for purpose fund, 'saving' for savings, 'all' for all funds"
        }
      },
      "additionalProperties": false,
      "required": [
        "type"
      ]
    }
  },
  {
    "name": "getTxCat",
    "description": "Get list of transaction categories and groups with their descriptions",
    "strict": true,
    "parameters": {
      "type": "object",
      "properties": {},
      "additionalProperties": false,
      "required": []
    }
  },
  {
    "name": "getFamilyContext",
    "description": "Get family context information for financial planning",
    "strict": true,
    "parameters": {
      "type": "object",
      "properties": {},
      "additionalProperties": false,
      "required": []
    }
  },
  {
    "name": "getCategoriseInstructions",
    "description": "Get categorization instructions for transaction classification",
    "strict": true,
    "parameters": {
      "type": "object",
      "properties": {},
      "additionalProperties": false,
      "required": []
    }
  },
  {
    "name": "getBudgetInstructions",
    "description": "Get budget creation and management instructions that contains planned spending for the family",
    "strict": true,
    "parameters": {
      "type": "object",
      "properties": {},
      "additionalProperties": false,
      "required": []
    }
  },
  {
    "name": "searchTransactions",
    "description": "Search for transactions in spreadsheet based on date range, groups, categories, and keywords.",
    "strict": true,
    "parameters": {
      "type": "object",
      "properties": {
        "startDate": {
          "type": "string",
          "description": "Start date for filtering transactions in DD/MM/YYYY format."
        },
        "endDate": {
          "type": "string",
          "description": "End date for filtering transactions in DD/MM/YYYY format."
        },
        "groups": {
          "type": "array",
          "description": "List of transaction group names (sheet names) to search. If empty or not provided, all groups are searched.",
          "items": {
            "type": "string",
            "description": "Transaction group or sheet name."
          }
        },
        "categories": {
          "type": "array",
          "description": "List of categories to filter transactions.",
          "items": {
            "type": "string",
            "description": "Category name."
          }
        },
        "keywords": {
          "type": "array",
          "description": "Keywords to match in transaction description or bank comment.",
          "items": {
            "type": "string",
            "description": "Search keyword."
          }
        }
      },
      "required": [
        "startDate",
        "endDate",
        "groups",
        "categories",
        "keywords"
      ],
      "additionalProperties": false
    }
  }
]
