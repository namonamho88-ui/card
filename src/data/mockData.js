export const CARDS = [
  {
    id: 1,
    name: "Deep Dream Card",
    type: "Credit",
    brand: "Shinhan",
    color: "linear-gradient(135deg, #1a2a6c, #b21f1f, #fdbb2d)",
    benefits: [
      { category: "All", percentage: 0.7, minSpend: 0 },
      { category: "Mart", percentage: 2.1, minSpend: 0 },
      { category: "Convenience", percentage: 2.1, minSpend: 0 }
    ]
  },
  {
    id: 2,
    name: "Starbucks Master",
    type: "Credit",
    brand: "Hyundai",
    color: "linear-gradient(135deg, #00704A, #27251F)",
    benefits: [
      { merchant: "Starbucks", percentage: 50, minSpend: 0, maxReward: 10000 },
      { category: "Coffee", percentage: 10, minSpend: 0 }
    ]
  },
  {
    id: 3,
    name: "Mart King",
    type: "Credit",
    brand: "KB Kookmin",
    color: "linear-gradient(135deg, #ff9966, #ff5e62)",
    benefits: [
      { category: "Mart", merchant: "E-Mart", percentage: 15, minSpend: 300000 },
      { category: "Mart", merchant: "Lotte Mart", percentage: 15, minSpend: 300000 },
      { category: "Mart", merchant: "Homeplus", percentage: 15, minSpend: 300000 }
    ]
  },
  {
    id: 4,
    name: "Oil Pass",
    type: "Credit",
    brand: "Samsung",
    color: "linear-gradient(135deg, #FFD700, #DAA520)",
    benefits: [
      { category: "Oil", merchant: "GS Caltex", fixedReward: 100, unit: "liter", minSpend: 0 },
      { category: "Oil", merchant: "SK Energy", fixedReward: 100, unit: "liter", minSpend: 0 }
    ]
  },
  {
    id: 5,
    name: "Digital Nomad",
    type: "Check",
    brand: "Woori",
    color: "linear-gradient(135deg, #4facfe, #00f2fe)",
    benefits: [
      { category: "Streaming", merchant: "Netflix", percentage: 20, minSpend: 0 },
      { category: "Streaming", merchant: "YouTube", percentage: 20, minSpend: 0 },
      { category: "Online", percentage: 5, minSpend: 0 }
    ]
  },
  {
    id: 6,
    name: "K-Culture",
    type: "Credit",
    brand: "Hana",
    color: "linear-gradient(135deg, #667eea, #764ba2)",
    benefits: [
      { category: "Cinema", merchant: "CGV", fixedReward: 5000, minSpend: 10000 },
      { category: "Cinema", merchant: "Lotte Cinema", fixedReward: 5000, minSpend: 10000 },
      { category: "Concert", percentage: 10, minSpend: 0 }
    ]
  },
  {
    id: 7,
    name: "Global Rider",
    type: "Credit",
    brand: "Lotte",
    color: "linear-gradient(135deg, #ed213a, #93291e)",
    benefits: [
      { category: "Travel", merchant: "Korean Air", percentage: 2, minSpend: 0 },
      { category: "Travel", merchant: "Asiana", percentage: 2, minSpend: 0 },
      { category: "DutyFree", percentage: 10, minSpend: 0 }
    ]
  },
  {
    id: 8,
    name: "Healthy Life",
    type: "Credit",
    brand: "NH Nonghyup",
    color: "linear-gradient(135deg, #00b09b, #96c93d)",
    benefits: [
      { category: "Hospital", percentage: 10, minSpend: 0 },
      { category: "Pharmacy", percentage: 10, minSpend: 0 }
    ]
  },
  {
    id: 9,
    name: "Campus Life",
    type: "Check",
    brand: "IBK",
    color: "linear-gradient(135deg, #8e2de2, #4a00e0)",
    benefits: [
      { category: "Books", merchant: "Kyobo", percentage: 10, minSpend: 0 },
      { category: "Education", percentage: 5, minSpend: 0 },
      { category: "Cafe", percentage: 20, minSpend: 0 }
    ]
  },
  {
    id: 10,
    name: "Everyday Savings",
    type: "Credit",
    brand: "BC Card",
    color: "linear-gradient(135deg, #30cfd0, #330867)",
    benefits: [
      { category: "Convenience", percentage: 10, minSpend: 0 },
      { category: "Food", percentage: 5, minSpend: 0 },
      { category: "Transport", percentage: 10, minSpend: 0 }
    ]
  }
];

const MERCHANTS = [
  { name: "Starbucks", category: "Coffee" },
  { name: "E-Mart", category: "Mart" },
  { name: "Netflix", category: "Streaming" },
  { name: "CGV", category: "Cinema" },
  { name: "GS25", category: "Convenience" },
  { name: "Kyobo Books", category: "Books" },
  { name: "Paris Baguette", category: "Food" },
  { name: "Bus/Subway", category: "Transport" },
  { name: "GS Caltex", category: "Oil" },
  { name: "Pharmacy", category: "Pharmacy" }
];

export const TRANSACTIONS = Array.from({ length: 100 }, (_, i) => {
  const merchant = MERCHANTS[Math.floor(Math.random() * MERCHANTS.length)];
  const amount = Math.floor(Math.random() * 50000) + 5000;
  const date = new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000));
  const card = CARDS[Math.floor(Math.random() * CARDS.length)];
  
  return {
    id: i + 1,
    date: date.toISOString().split('T')[0],
    merchant: merchant.name,
    category: merchant.category,
    amount,
    cardName: card.name
  };
}).sort((a, b) => new Date(b.date) - new Date(a.date));
