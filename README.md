# 🌍 Blockchain-Verified Humanitarian Needs Assessment

Welcome to a decentralized platform that revolutionizes humanitarian aid by enabling blockchain-verified needs assessments! This project uses the Stacks blockchain and Clarity smart contracts to allow field workers to submit real-time data on needs (e.g., food, shelter, medical supplies) during crises. The data is aggregated transparently, verified for authenticity, and used to guide targeted aid responses, solving issues like data tampering, lack of transparency, and inefficient resource allocation in disaster relief and humanitarian efforts.

## ✨ Features

🔒 Secure submission of needs assessment data by verified field workers  
📊 On-chain aggregation of data for regional or category-based insights  
✅ Multi-party verification to ensure data accuracy and prevent fraud  
🎯 Targeted aid proposals based on aggregated needs  
💰 Incentive tokens for field workers to encourage participation  
📈 Immutable reports and dashboards for donors and organizations  
⚖️ Dispute resolution for contested data  
🚀 Governance for system upgrades and parameter tuning  

## 🛠 How It Works

This system involves 8 smart contracts written in Clarity, each handling a specific aspect of the workflow. Field workers, verifiers, and aid organizations interact with the contracts to create a tamper-proof ecosystem for needs assessments.

### Key Smart Contracts

1. **UserRegistry.clar**: Manages registration and roles for users (field workers, verifiers, aid orgs). Stores user profiles, verifies identities via simple KYC hashes, and handles role assignments.  

2. **DataSubmission.clar**: Allows registered field workers to submit needs data (e.g., location, need type, quantity, urgency level). Each submission is timestamped and hashed for immutability.  

3. **Verification.clar**: Enables verifiers to review and approve/reject submissions. Uses multi-signature thresholds (e.g., 3/5 verifiers must approve) to confirm data authenticity.  

4. **Aggregation.clar**: Aggregates verified data by region, need type, or time period. Computes summaries like total food needs in a district using on-chain maps and lists.  

5. **IncentiveToken.clar**: A fungible token contract (STX-based or custom SIP-010) that rewards field workers with tokens upon successful verification of their submissions. Includes staking for long-term incentives.  

6. **AidAllocation.clar**: Allows aid organizations to propose and allocate resources based on aggregated data. Includes voting mechanisms for prioritizing responses.  

7. **DisputeResolution.clar**: Handles challenges to submitted or verified data. Uses time-locked escrows and arbitrator voting to resolve disputes fairly.  

8. **Governance.clar**: Manages system parameters (e.g., verification thresholds, reward rates) through DAO-style proposals and voting by token holders.  

**For Field Workers**  
- Register via UserRegistry.  
- Submit data using DataSubmission (include geohash, photos hashes if applicable).  
- Earn tokens from IncentiveToken after verification.  

**For Verifiers**  
- Review submissions in Verification.  
- Vote to approve or flag issues.  

**For Aid Organizations & Donors**  
- Query aggregated data via Aggregation.  
- Propose allocations in AidAllocation.  
- View immutable reports for transparency.  

**For Everyone**  
- Use Governance to suggest improvements.  
- Resolve issues via DisputeResolution.  

This setup ensures data integrity on the blockchain, reduces corruption in aid distribution, and enables faster, more targeted responses to real-world crises like natural disasters or refugee situations. Deploy on Stacks for Bitcoin-secured settlement!