import { BigNumber } from 'ethers'
import { writeFileSync, appendFileSync } from 'fs';

async function main() {
    const AGGREGATE_SUPPLY = BigNumber.from('1337069420000000000000000000000')
    const MARKET_SUPPLY = BigNumber.from('1069655536000000000000000000000')
    const CLAIM_REDUCTION = BigNumber.from('10000000000000000') // Represents 0.01%
    const CLAIM_DIVISOR = BigNumber.from('100000000000000000000') // Represents dividing by 100 as a percentage.
    const CSV_FILENAME = 'claim-simulation.csv'

    let airdropSupply = AGGREGATE_SUPPLY.sub(MARKET_SUPPLY)
    let claimRatio = BigNumber.from('1000000000000000000') // Represents 1% (these percentages will yield 9,813 claims above 0 $WOLF).
    let airdropClaim = BigNumber.from('1') // Initialize above 0
    let claimNumber = 0;

    writeFileSync(`${CSV_FILENAME}`, 'claim_number, claim_percent, claim_amount, remaining_supply\n')

    while (airdropSupply > BigNumber.from(0) && airdropClaim > BigNumber.from(0)) {
        // Get airdrop claim value and update the supply.
        airdropClaim = airdropSupply.mul(claimRatio).div(CLAIM_DIVISOR)
        airdropSupply = airdropSupply.sub(airdropClaim)
        // Append data to csv.
        appendFileSync(`${CSV_FILENAME}`, `${claimNumber+1}, ${claimRatio}, ${airdropClaim}, ${airdropSupply}\n`)
        // Update the airdrop claim percentage.
        claimRatio = claimRatio.sub(claimRatio.mul(CLAIM_REDUCTION).div(CLAIM_DIVISOR))
        claimNumber++
    }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
