## Pre-requistes:
- Google Spreadsheet with the correct structure (c.f. template)
- Telegram bot with the privacy turned off to read the group messages freely
- OpenAI account with the API key

## AppsScripts project setting
- debug_Mode: on to send replies to the main channel, off to the debug channel
- sheet_ContextConfig: the sheet name where the context and instruction are stored for prompts building
- sheet_txCatConfig: the sheet name where the transaction categories are stored
- telegram_DebugChat: the chat id where the debug messages are sent
- telegram_logsChat: the chat id where the log messages are sent
- telegram_lastUpdateId: the last update id read from Telegram, to avoid reading the same message twice


# Features
## Description
The Telegram bot enables a household to manage their budget semi-automatically through email synchronisation and manual input. 
By tagging or replying to the bot as if talking to an assistant, a user can
- add/modify/delete any spending transaction to change the amount, date or any description relevant to the family
- get the general monthly financial status of the family
- get the detailed monthly financial status for a group such as *fix expense, variable expense, saving, family fund, target fund*, etc.
- set up and adjust the budget for a new month based on an existing month
- sync up with a GMail inbox to read and add transaction based on the bank mail notifications

## Scheduled functions
- Read the mailbox every hour to add new transactions
- Read the group chat every minute to answer user queries

# Codebase
## botHandler
- Read Telegram message and call for intent detection
- Send the answer to a dedicated group chat (or channel) set in the configuration
- DEBUG MODE: on to send replies to the main channel, off to the debug channel

## promptHandler
- Build both user and system prompts before calling the llm
- Prompts are used for: transaction classification, intent detection, spending analytics (with sub-intent), budget analytics, monthly budget setup, enrich the context and instruction database

## llmHandler
- Build the prompts using available promptHanlder functions
- Call the LLM to get the results

## sheetHandler
- Functions to retrieve or update the sheet data
- Based on the sheets named ranges
- Including: get/set tx, get/set budget, get dashboard data, get/set classification instruction, context, budgeting instructions

## configuration_template
Configuration required for the bot to run properly
