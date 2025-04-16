const { Telegraf } = require('telegraf');
const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN);

// Функция для получения адреса по координатам
async function getAddress(lat, lon) {
  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
      params: {
        lat: lat,
        lon: lon,
        format: 'json',
        'accept-language': 'ru',
        zoom: 16 // Уровень детализации (улица)
      },
      headers: {
        'User-Agent': 'YourWeatherBot/1.0' // Требуется Nominatim
      }
    });
    
    const address = response.data.address;
    let formattedAddress = '';
    
    // Форматируем адрес в читаемый вид
    if (address.road) formattedAddress += address.road;
    if (address.house_number) formattedAddress += `, ${address.house_number}`;
    if (!formattedAddress && address.city) formattedAddress = address.city;
    if (!formattedAddress && address.village) formattedAddress = address.village;
    
    return formattedAddress || response.data.display_name || 'Адрес не определён';
  } catch (error) {
    console.error('Ошибка геокодирования:', error);
    return 'Не удалось определить адрес';
  }
}

bot.on('location', async (ctx) => {
  const { latitude, longitude } = ctx.message.location;
  
  try {
    // Получаем адрес
    const address = await getAddress(latitude, longitude);
    
    // Получаем погоду
    const weatherUrl = 'https://api.weatherapi.com/v1/current.json';
    const weatherParams = {
      key: process.env.WEATHER_API_KEY,
      q: `${latitude},${longitude}`,
      lang: 'ru'
    };

    const response = await axios.get(weatherUrl, { params: weatherParams });
    const weatherData = response.data;
    
    // Формируем сообщение
    const message = `
📍 Адрес: ${address}
🌡 Температура: ${weatherData.current.temp_c}°C (ощущается как ${weatherData.current.feelslike_c}°C)
☁ Погода: ${weatherData.current.condition.text}
💨 Ветер: ${weatherData.current.wind_kph} км/ч
💧 Влажность: ${weatherData.current.humidity}%
    `;
    
    await ctx.reply(message);
  } catch (error) {
    console.error('Ошибка:', error);
    await ctx.reply('Произошла ошибка при запросе погоды. Попробуйте позже.');
  }
});

bot.launch({
  skipPendingUpdates: true // Пропустить накопившиеся апдейты
});
console.log('Бот запущен...');