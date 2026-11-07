// Original WAEC/NECO/JAMB-style Islamic Religious Studies questions. Correct answer first; options are shuffled on import.
// Have an IRS teacher review spellings and wording before wide use.
module.exports = {
  slug: 'irs',
  name: 'Islamic Religious Studies',
  sortOrder: 17,
  exams: ['waec', 'neco', 'jamb', 'post-utme'],
  topics: [
    { slug: 'quran-hadith', name: "Qur'an and Hadith" },
    { slug: 'tawhid-fiqh', name: 'Tawhid and Fiqh' },
    { slug: 'islamic-history', name: 'Islamic History' },
  ],
  questions: [
    ['quran-hadith', "The first surah of the Qur'an is", ['Al-Fatihah', 'Al-Baqarah', 'An-Nas', 'Al-Ikhlas'], 0, "Al-Fatihah (the Opening) is the first surah of the Qur'an."],
    ['quran-hadith', "The Qur'an was first revealed to Prophet Muhammad (SAW) in the cave of", ['Hira', 'Thawr', 'Uhud', 'Quba'], 0, 'The first revelation came in the cave of Hira on Jabal an-Nur near Makkah.'],
    ['quran-hadith', 'The angel who brought revelation to Prophet Muhammad (SAW) was', ['Jibril', "Mika'il", 'Israfil', 'Malik'], 0, 'Angel Jibril (Gabriel) delivered the revelation.'],
    ['quran-hadith', "The number of surahs in the Qur'an is", ['114', '99', '124', '40'], 0, "The Qur'an has 114 surahs."],
    ['quran-hadith', 'The hadith collection regarded by Sunni Muslims as the most authentic was compiled by', ['Imam al-Bukhari', 'Imam Malik', 'Ibn Ishaq', 'Imam Abu Hanifah'], 0, 'Sahih al-Bukhari is widely regarded as the most authentic hadith collection.'],
    ['tawhid-fiqh', 'Belief in the oneness of Allah is called', ['Tawhid', 'Shirk', 'Ihsan', 'Taqwa'], 0, 'Tawhid is the oneness of Allah; shirk is associating partners with Him.'],
    ['tawhid-fiqh', 'The pillar of Islam that requires fasting in the month of Ramadan is', ['Sawm', 'Zakah', 'Salah', 'Hajj'], 0, 'Sawm is fasting during Ramadan.'],
    ['tawhid-fiqh', 'The number of obligatory daily prayers is', ['five', 'three', 'seven', 'two'], 0, 'Fajr, Zuhr, Asr, Maghrib and Isha are the five daily prayers.'],
    ['tawhid-fiqh', 'The compulsory annual alms paid on eligible wealth is', ['Zakah', 'Sadaqah', 'Waqf', 'Jizyah'], 0, 'Zakah is obligatory alms; sadaqah is voluntary charity.'],
    ['islamic-history', 'The migration of the Prophet (SAW) from Makkah to Madinah is the', ['Hijrah', "Isra'", "Mi'raj", 'Fath'], 0, 'The Hijrah (622 CE) marks the start of the Islamic calendar.'],
    ['islamic-history', 'The first Caliph after the death of Prophet Muhammad (SAW) was', ['Abu Bakr', 'Umar', 'Uthman', 'Ali'], 0, 'Abu Bakr as-Siddiq was the first of the four rightly guided caliphs.'],
    ['islamic-history', 'The Battle of Badr took place in', ['2 AH', '8 AH', '1 AH', '10 AH'], 0, 'The Battle of Badr was fought in the second year after the Hijrah (624 CE).'],
  ],
};
