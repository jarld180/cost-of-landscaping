#!/usr/bin/env node
/**
 * Fetches all concrete contractor datasets from Apify and merges them into one JSON file
 * Run with: node scripts/fetch-all-contractors.mjs
 */

import fs from 'fs/promises';
import path from 'path';

// All completed dataset IDs with their city info
const DATASETS = [
  { city: "Atlanta", state: "GA", datasetId: "BbIbRErLC5f74HZCl" },
  { city: "Nashville", state: "TN", datasetId: "a1FeO16DhzskoE5R7" },
  { city: "Cincinnati", state: "OH", datasetId: "kxFH6ibsvadg1MbDJ" },
  { city: "Memphis", state: "TN", datasetId: "tbfrDUVsXGGNzaeLa" },
  { city: "Columbus", state: "OH", datasetId: "OgSwBwqObZ7hhvZid" },
  { city: "Cleveland", state: "OH", datasetId: "LwJu4bYroDNNTPOIC" },
  { city: "Kansas City", state: "MO", datasetId: "waIPY7Ifbnvv6KHSg" },
  { city: "Indianapolis", state: "IN", datasetId: "36qAQXqnD22uq1XjL" },
  { city: "Lexington", state: "KY", datasetId: "JKKZtN1g8zagx70h6" },
  { city: "Louisville", state: "KY", datasetId: "flaBS0tsHUCj5hJgo" },
  { city: "Phoenix", state: "AZ", datasetId: "uyevPTkLVhrKlRho8" },
  { city: "St. Louis", state: "MO", datasetId: "pljC1iCFauBK00nhC" },
  { city: "Chicago", state: "IL", datasetId: "voSEcF2zSglRL2r2n" },
  { city: "Detroit", state: "MI", datasetId: "jaEPHfmE95kx1RCjV" },
  { city: "Milwaukee", state: "WI", datasetId: "stHVGOoyDjeoXqMPY" },
  { city: "Minneapolis", state: "MN", datasetId: "HHF4VhkXSV49MYl7R" },
  { city: "Houston", state: "TX", datasetId: "z85i1C9PgyVOh2vm3" },
  { city: "Dallas", state: "TX", datasetId: "zt7V7onbBCjs63ESN" },
  { city: "San Antonio", state: "TX", datasetId: "mTwATQXGZcgTjG1oh" },
  { city: "Austin", state: "TX", datasetId: "miMNTn42bQ9YxcBQn" },
  { city: "Fort Worth", state: "TX", datasetId: "5emeIB4MxFCN8MaPR" },
  { city: "Los Angeles", state: "CA", datasetId: "kh7WLftyosdryKbc6" },
  { city: "San Diego", state: "CA", datasetId: "OL8wNRy2zAgWDDXS3" },
  { city: "San Jose", state: "CA", datasetId: "kEg7JYrvGbDgzLIki" },
  { city: "San Francisco", state: "CA", datasetId: "UsXdV5NgAduwXkd9O" },
  { city: "Seattle", state: "WA", datasetId: "HZPTJOc2TefFyt5Bb" },
  { city: "Portland", state: "OR", datasetId: "CdN16D6CV871HtI03" },
  { city: "Denver", state: "CO", datasetId: "ix06QFjo2fDgoWcVF" },
  { city: "Las Vegas", state: "NV", datasetId: "CptTS6FBn2v416ILx" },
  { city: "Salt Lake City", state: "UT", datasetId: "AjTVNFvCrae94LXaQ" },
  { city: "Tucson", state: "AZ", datasetId: "KAmPn025vhd3w6ghB" },
  { city: "Miami", state: "FL", datasetId: "LUtj6Hlatjmy426Hi" },
  { city: "Tampa", state: "FL", datasetId: "weqQboNvcNaLgQ1gc" },
  { city: "Orlando", state: "FL", datasetId: "KnyIkZwLjjXZtZAD5" },
  { city: "Jacksonville", state: "FL", datasetId: "q9RHID7wk7mhHv9jt" },
  { city: "Fort Myers", state: "FL", datasetId: "EKJUSd7reZEmU3WFf" },
  { city: "St. Petersburg", state: "FL", datasetId: "Gdn1ldlluHKBJZEgw" },
  { city: "Tallahassee", state: "FL", datasetId: "huFsdrgnTorQi27J3" },
  { city: "Pensacola", state: "FL", datasetId: "xlUXL4SQ3qH0YTxy7" },
  { city: "Charlotte", state: "NC", datasetId: "Uk1gyWKmDW0NhENfk" },
  { city: "Raleigh", state: "NC", datasetId: "gqVAIHd5NFfVq1ii0" },
  { city: "Birmingham", state: "AL", datasetId: "z0nVoD0bZ39J1FSzV" },
  { city: "New Orleans", state: "LA", datasetId: "UKp0As8dlbfK5gfQZ" },
  { city: "Richmond", state: "VA", datasetId: "JM437u6frSkydbSth" },
  { city: "Virginia Beach", state: "VA", datasetId: "FoVzNdcyKOfxlmHYr" },
  { city: "Baton Rouge", state: "LA", datasetId: "sySfBGzTM9mrVM9n7" },
  { city: "Little Rock", state: "AR", datasetId: "MeEovyVyQS5jqXPlT" },
  { city: "Charleston", state: "SC", datasetId: "anPeKu6fjdrx9iptw" },
  { city: "Columbia", state: "SC", datasetId: "lUiCmDHM4RXUO5S6Q" },
  { city: "New York", state: "NY", datasetId: "P3Q0qETPJ0ZhQQ3eH" },
  { city: "Boston", state: "MA", datasetId: "VeXgEDYiXsaDJLNwp" },
  { city: "Philadelphia", state: "PA", datasetId: "pQLO5LzwgBcDdVK02" },
  { city: "Pittsburgh", state: "PA", datasetId: "29OgFl7a1Sjh5MBo7" },
  { city: "Baltimore", state: "MD", datasetId: "J3KCqljAF0KNlcbV6" },
  { city: "Washington", state: "DC", datasetId: "8R52RslRVcAomGZOU" },
  { city: "Newark", state: "NJ", datasetId: "B3hrqbqeWvfLn6cOw" },
  { city: "Buffalo", state: "NY", datasetId: "iUCgjO1JmZQJanjN7" },
  { city: "Hartford", state: "CT", datasetId: "6EGMajrmiyeH7u4QZ" },
  { city: "Providence", state: "RI", datasetId: "6yo0Fehol4Bej2p0g" },
  { city: "Bridgeport", state: "CT", datasetId: "E1SEeYOTblNgzmS2x" },
  { city: "Rochester", state: "NY", datasetId: "qGVuo3JZ5Ti91ySH2" },
  { city: "Manchester", state: "NH", datasetId: "Q3gWGBkPtAGHMFtI8" },
  { city: "Worcester", state: "MA", datasetId: "kWQmPeiuSRrKgP4ZQ" },
  { city: "Sacramento", state: "CA", datasetId: "JQEfyhrVpCfAXKh46" },
  { city: "Fresno", state: "CA", datasetId: "cKBy2q3ihCRCxaUva" },
  { city: "Bakersfield", state: "CA", datasetId: "J1glgSViCHZ91GgNY" },
  { city: "Stockton", state: "CA", datasetId: "yiLRoZfovKXxexsrF" },
  { city: "Modesto", state: "CA", datasetId: "igZOguW5MOO6iCVgP" },
  { city: "Riverside", state: "CA", datasetId: "jx6CJgmmNXzGdweDE" },
  { city: "Anaheim", state: "CA", datasetId: "F3h1kxXZFTCxy4fM4" },
  { city: "Long Beach", state: "CA", datasetId: "bV8n4cYdbHoQ6ugwy" },
  { city: "Oakland", state: "CA", datasetId: "KgJjR1FuICpaooAVs" },
  { city: "Santa Ana", state: "CA", datasetId: "Cf0onAoHdT1a1veQC" },
  { city: "Omaha", state: "NE", datasetId: "Jy4UmeSNXt9magkwz" },
  { city: "Des Moines", state: "IA", datasetId: "5wz2lxCVwqgbJdap9" },
  { city: "Wichita", state: "KS", datasetId: "7S6qvugJZ47eTOFZZ" },
  { city: "Madison", state: "WI", datasetId: "NNL2z099aHATlJbts" },
  { city: "Grand Rapids", state: "MI", datasetId: "KVuvC0y57y1zJJklk" },
  { city: "Dayton", state: "OH", datasetId: "umes2Wa5phTpdL387" },
  { city: "Toledo", state: "OH", datasetId: "bSsBbVDAa8Qrw67OI" },
  { city: "Akron", state: "OH", datasetId: "AnSTZ4xctHGH0aF5R" },
  { city: "Fort Wayne", state: "IN", datasetId: "3tbHXKy76EbK9ezCf" },
  { city: "Evansville", state: "IN", datasetId: "d94bbjFlKJcrQJtHD" },
  { city: "Peoria", state: "IL", datasetId: "Ye5rE32WKPaV9a70h" },
  { city: "Rockford", state: "IL", datasetId: "JnGI6C1OhTQM47Gh2" },
  { city: "Boise", state: "ID", datasetId: "bqymnWO5vULcYri1j" },
  { city: "Spokane", state: "WA", datasetId: "eCFr56W2kc8XzAqFI" },
  { city: "Albuquerque", state: "NM", datasetId: "h3ybmAtfIhmfuNsru" },
  { city: "Reno", state: "NV", datasetId: "GBtUEHKzk8VvFNFU3" },
  { city: "El Paso", state: "TX", datasetId: "5tnKs7KIKXGVAwaEy" },
  { city: "Corpus Christi", state: "TX", datasetId: "yljkw4cJzVbth4G6I" },
  { city: "Lubbock", state: "TX", datasetId: "RF9qNjJavqUMxAzGg" },
  { city: "Arlington", state: "TX", datasetId: "wIjS6yCRwo6xs3dVc" },
  { city: "Colorado Springs", state: "CO", datasetId: "JJdZ2Gn9MuSaNXwv9" },
  { city: "Fort Collins", state: "CO", datasetId: "6Tj3JrSFPe5KWiBPT" },
  { city: "Honolulu", state: "HI", datasetId: "yRw4kWJtnnmkkSphD" },
  { city: "Anchorage", state: "AK", datasetId: "ZGACXWdfYiXtyjS2J" },
  { city: "Gainesville", state: "FL", datasetId: "zjyKBiGgym7IjNMld" },
  { city: "Sarasota", state: "FL", datasetId: "8hShZliQNofgvftnb" },
  { city: "Cape Coral", state: "FL", datasetId: "ZLdGf2eklqtV10BwW" },
  { city: "Savannah", state: "GA", datasetId: "5eWSFS0Y3uuuGUJEk" },
  { city: "Knoxville", state: "TN", datasetId: "zU1r479zO8vu8ySXi" },
  { city: "Augusta", state: "GA", datasetId: "cgy1rEc33mPMSZDhj" },
  { city: "Syracuse", state: "NY", datasetId: "eN5GzrPfKumdpGQEr" },
  { city: "Albany", state: "NY", datasetId: "y6gPkaFSkEpTJYsY6" },
];

const APIFY_TOKEN = process.env.APIFY_TOKEN;
const OUTPUT_FILE = path.join(process.cwd(), 'app/mock-data/json/us-concrete-contractors.json');

async function fetchDataset(datasetId) {
  const url = `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch dataset ${datasetId}: ${response.statusText}`);
  }
  return response.json();
}

async function main() {
  console.log(`Fetching ${DATASETS.length} datasets...`);
  
  const allContractors = [];
  const cityStats = [];

  for (const { city, state, datasetId } of DATASETS) {
    try {
      console.log(`Fetching ${city}, ${state}...`);
      const data = await fetchDataset(datasetId);
      
      // Add source city/state to each record for reference
      const enrichedData = data.map(item => ({
        ...item,
        _sourceCity: city,
        _sourceState: state,
      }));
      
      allContractors.push(...enrichedData);
      cityStats.push({ city, state, count: data.length });
      console.log(`  ✓ ${data.length} contractors`);
    } catch (error) {
      console.error(`  ✗ Error fetching ${city}, ${state}: ${error.message}`);
      cityStats.push({ city, state, count: 0, error: error.message });
    }
  }

  // Write the combined data as a plain array (required format for upload)
  await fs.writeFile(OUTPUT_FILE, JSON.stringify(allContractors, null, 2));
  
  console.log(`\n✓ Saved ${allContractors.length} contractors to ${OUTPUT_FILE}`);
  console.log('\nCity breakdown:');
  cityStats.forEach(({ city, state, count }) => {
    console.log(`  ${city}, ${state}: ${count}`);
  });
}

main().catch(console.error);
