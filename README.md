# 🤖 Penny — Telegram Finance Assistant Bot

**Penny** is a Telegram bot that helps families manage their household finances through a semi-automated system integrated with Google Sheets. It works via email notifications and manual input, using an LLM for smart classification and analysis.

---

## 🧰 Prerequisites

To use the bot, you’ll need:

* ✅ A Google Spreadsheet with the proper structure ([see template](#))
* ✅ A Telegram bot with **privacy mode turned off** to read group messages
* ✅ An OpenAI API key
* ✅ Apps Script project with the following configuration:

| Setting                 | Description                                                 |
| ----------------------- | ----------------------------------------------------------- |
| `debug_Mode`            | `on`: send replies to debug chat, `off`: send to main group |
| `sheet_ContextConfig`   | Name of the sheet storing prompt context/instructions       |
| `sheet_txCatConfig`     | Name of the sheet with transaction categories               |
| `telegram_DebugChat`    | Chat ID for debug messages                                  |
| `telegram_logsChat`     | Chat ID for system logs                                     |
| `telegram_lastUpdateId` | Tracks last Telegram message processed                      |

---

## ✨ Features

Interact with Penny directly in your Telegram group chat using natural language. Supported actions include:

* 📬 Get notified of new transactions via bank emails
* 📝 Add, modify, or delete transactions manually
* 📊 View overall or detailed spending reports (e.g., fixed, variable, savings, family fund)
* 📅 Receive weekly reports and monthly budget suggestions
* 🎯 Check affordability for purchases or short-term goals

---

## 🔐 Data Privacy

* Penny **does not store** user or transaction data.
* All data lives in your Google Spreadsheet.
* The bot only tracks the last Telegram update ID to avoid duplicate reads.
* You can turn off the bot anytime and continue using the spreadsheet manually.

---

## 🕒 Scheduled Jobs

| Task                                  | Frequency    |
| ------------------------------------- | ------------ |
| Check bank email for new transactions | Every hour   |
| Read Telegram group chat              | Every minute |
| Send weekly spending summary          | Every Monday |
| Generate monthly budget suggestion    | Every 27th   |

---

## 🧱 Codebase Overview

```text
.
├── botHandler.js             # Handles Telegram messages, detects intent, triggers logic
├── promptHandler.js          # Generates prompts for intent detection and financial reasoning
├── llmHandler.js             # Sends prompts to the LLM and parses responses
├── sheetHandler.js           # Reads/writes transaction, budget, and config data from Sheets
├── configuration_template.js # Sample config required to run the bot
```
