// Original WAEC/NECO/JAMB-style Christian Religious Studies questions. Correct answer first; options are shuffled on import.
module.exports = {
  slug: 'crs',
  name: 'Christian Religious Studies',
  sortOrder: 16,
  exams: ['waec', 'neco', 'jamb', 'post-utme'],
  topics: [
    { slug: 'old-testament', name: 'Old Testament' },
    { slug: 'gospels', name: 'The Gospels' },
    { slug: 'acts-epistles', name: 'Acts and the Epistles' },
  ],
  questions: [
    ['old-testament', 'Who led the Israelites out of Egypt?', ['Moses', 'Joshua', 'Abraham', 'Aaron'], 0, 'God called Moses to lead Israel out of slavery in Egypt (Exodus 3).'],
    ['old-testament', 'Who succeeded Moses as leader of Israel?', ['Joshua', 'Caleb', 'Samuel', 'Gideon'], 0, 'Joshua led Israel into Canaan after the death of Moses (Joshua 1).'],
    ['old-testament', 'The first king of Israel was', ['Saul', 'David', 'Solomon', 'Samuel'], 0, 'Samuel anointed Saul as the first king of Israel (1 Samuel 10).'],
    ['old-testament', 'Which prophet challenged the prophets of Baal on Mount Carmel?', ['Elijah', 'Elisha', 'Isaiah', 'Amos'], 0, 'Elijah confronted the prophets of Baal on Mount Carmel (1 Kings 18).'],
    ['old-testament', "Who interpreted Pharaoh's dreams in Egypt?", ['Joseph', 'Daniel', 'Moses', 'Jacob'], 0, "Joseph interpreted Pharaoh's dreams of the seven fat and seven lean cows (Genesis 41)."],
    ['gospels', 'Jesus was baptised in the River Jordan by', ['John the Baptist', 'Peter', 'Andrew', 'Zechariah'], 0, 'John the Baptist baptised Jesus in the Jordan (Matthew 3).'],
    ['gospels', 'In the parable of the Good Samaritan, the man who stopped and helped the wounded traveller was', ['a Samaritan', 'a priest', 'a Levite', 'a Pharisee'], 0, 'The priest and the Levite passed by; the Samaritan helped (Luke 10).'],
    ['gospels', 'Which disciple betrayed Jesus?', ['Judas Iscariot', 'Simon Peter', 'Thomas', 'Matthew'], 0, 'Judas Iscariot betrayed Jesus for thirty pieces of silver.'],
    ['gospels', 'Jesus turned water into wine at a wedding in', ['Cana in Galilee', 'Capernaum', 'Bethany', 'Jerusalem'], 0, 'This first sign took place at a wedding in Cana (John 2).'],
    ['acts-epistles', 'The Holy Spirit came upon the apostles on the day of', ['Pentecost', 'the Passover', 'Atonement', 'Tabernacles'], 0, 'The outpouring of the Holy Spirit happened at Pentecost (Acts 2).'],
    ['acts-epistles', 'Saul (Paul) was converted on the road to', ['Damascus', 'Jericho', 'Emmaus', 'Antioch'], 0, 'Saul met the risen Christ on the road to Damascus (Acts 9).'],
    ['acts-epistles', 'The first Christian martyr was', ['Stephen', 'James', 'Peter', 'Philip'], 0, 'Stephen was stoned to death after his speech before the council (Acts 7).'],
  ],
};
