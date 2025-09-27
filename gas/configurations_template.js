//OpenAI
const OPENAI_TOKEN = ''; //your OpenAI token here

//Telegram
const TELEGRAM_TOKEN = '';//your Telegram bot token here
const TELEGRAM_API_URL = ``;//your Telegram API URL here
const CHAT_ID = '';//your Telegram chat ID here
const THREAD_ID = '';//your Telegram thread ID here, if any
const BOT_USERNAME = '';//your Telegram bot username here

//GSheets
const SPREADSHEET_ID = '';//your Google Spreadsheet ID here

const LOCALE_CONFIG = {
    language: 'vi', // 'en' or 'vi'
    currency: 'CUSTOM', // 'EUR', 'VND', 'USD'
    currencyFormat: {
      CUSTOM: { 
        symbol: '€', 
        thousandsSeparator: ',', 
        decimalSeparator: '.', 
        decimals: 2,
        position: 'before', // 'before' or 'after'
        input_example: ['+2 355,47 EUR', '‑195,69 EUR'],
        output_example: '€20.00'
      },
      EUR: { 
        symbol: '€', 
        thousandsSeparator: '.', 
        decimalSeparator: ',', 
        decimals: 2,
        position: 'before', // 'before' or 'after'
        example: ['€20.00', '€20,00', '20,00 EUR']
      },
      USD: { 
        symbol: '$', 
        thousandsSeparator: ',', 
        decimalSeparator: '.', 
        decimals: 2,
        position: 'before',
        example: '$20.00'
      },
      VND: { 
        symbol: '₫', 
        thousandsSeparator: '.', 
        decimalSeparator: '', 
        decimals: 0,
        position: 'after',
        example: '20.000 ₫'
      }
    },
    languageConfig: {
      vi: {
        defaultLanguage: 'Vietnamese',
        languageInstruction: 'Sử dụng tiếng Việt làm ngôn ngữ mặc định. Nếu khách hàng hỏi bằng ngôn ngữ khác, hãy trả lời bằng cùng ngôn ngữ với khách hàng.',
        dateFormat: 'dd/MM/yyyy',
        timeFormat: 'HH:mm dd/MM/yyyy'
      },
      en: {
        defaultLanguage: 'English',
        languageInstruction: 'Use English as the default language. If the customer asks in another language, respond in the same language as the customer.',
        dateFormat: 'MM/dd/yyyy',
        timeFormat: 'HH:mm MM/dd/yyyy'
      }
    }
  };