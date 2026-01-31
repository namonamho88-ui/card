import { CARDS } from '../data/mockData';

export const findBestCard = (merchantName, amount) => {
    const results = CARDS.map(card => {
        let bestBenefit = null;
        let expectedReward = 0;

        for (const benefit of card.benefits) {
            let isMatch = false;

            // Match by merchant name
            if (benefit.merchant && merchantName.toLowerCase().includes(benefit.merchant.toLowerCase())) {
                isMatch = true;
            }

            // Match by category (if possible, though this mock logic is simple)
            // For real world, we'd need a merchant -> category mapping

            if (isMatch) {
                let reward = 0;
                if (benefit.percentage) {
                    reward = (amount * benefit.percentage) / 100;
                    if (benefit.maxReward && reward > benefit.maxReward) {
                        reward = benefit.maxReward;
                    }
                } else if (benefit.fixedReward) {
                    reward = benefit.fixedReward;
                }

                if (reward > expectedReward) {
                    expectedReward = reward;
                    bestBenefit = benefit;
                }
            }
        }

        // Fallback: Check category level benefits
        // (Simplified: if merchant is "Starbucks", it's "Coffee" category)
        const categoryMapping = {
            "Starbucks": "Coffee",
            "E-Mart": "Mart",
            "GS25": "Convenience",
            "Netflix": "Streaming",
            "CGV": "Cinema"
        };

        const merchantCategory = categoryMapping[merchantName] || "All";

        for (const benefit of card.benefits) {
            if (benefit.category === merchantCategory || benefit.category === "All") {
                let reward = 0;
                if (benefit.percentage) {
                    reward = (amount * benefit.percentage) / 100;
                    if (benefit.maxReward && reward > benefit.maxReward) {
                        reward = benefit.maxReward;
                    }
                } else if (benefit.fixedReward) {
                    reward = benefit.fixedReward;
                }

                if (reward > expectedReward) {
                    expectedReward = reward;
                    bestBenefit = benefit;
                }
            }
        }

        return {
            ...card,
            expectedReward,
            benefitUsed: bestBenefit
        };
    });

    return results.sort((a, b) => b.expectedReward - a.expectedReward);
};
